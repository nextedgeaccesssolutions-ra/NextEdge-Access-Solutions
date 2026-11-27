import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { pages, revisions, users } from "../../drizzle/schema";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const POLICY_VERSION = "neas-giie-commercial-v1";

const sourceSchema = z.object({
  title: z.string().trim().min(3).max(180),
  publisher: z.string().trim().min(2).max(120),
  url: z.string().url().max(2048),
  official: z.literal(true),
}).strict();

export const commercialBriefSchema = z.object({
  signalId: z.string().trim().min(8).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
  title: z.string().trim().min(12).max(180),
  industry: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(80).max(1400),
  body: z.string().trim().min(120).max(6000),
  seoDescription: z.string().trim().min(40).max(160),
  sources: z.array(sourceSchema).min(2).max(8),
  verification: z.object({
    status: z.literal("verified"),
    independentSourceCount: z.number().int().min(2).max(8),
    policyVersion: z.literal(POLICY_VERSION),
  }).strict(),
}).strict();

export type CommercialBrief = z.infer<typeof commercialBriefSchema>;

const integrationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function allowedSourceHosts(): Set<string> {
  return new Set((process.env.NEAS_GIIE_ALLOWED_SOURCE_HOSTS ?? "")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

export function validateCommercialBrief(input: unknown, allowlist: Set<string>) {
  const parsed = commercialBriefSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, reason: "Invalid brief schema." };
  const hosts = new Set<string>();
  for (const source of parsed.data.sources) {
    let url: URL;
    try { url = new URL(source.url); } catch { return { success: false as const, reason: "Invalid source URL." }; }
    if (url.protocol !== "https:" || url.username || url.password) {
      return { success: false as const, reason: "Sources must use HTTPS without embedded credentials." };
    }
    const host = url.hostname.toLowerCase();
    if (!allowlist.has(host)) return { success: false as const, reason: "A source host is not allowlisted." };
    hosts.add(host);
  }
  if (hosts.size < 2 || parsed.data.verification.independentSourceCount < 2) {
    return { success: false as const, reason: "Two independent allowlisted sources are required." };
  }
  return { success: true as const, data: parsed.data };
}

export function signCommercialRequest(secret: string, timestamp: string, requestId: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${requestId}.${body}`).digest("hex");
}

export function verifyCommercialRequest(secret: string, timestamp: string, requestId: string, body: string, signature: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!/^\d{10}$/.test(timestamp) || !/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(nowSeconds - issuedAt) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = Buffer.from(signCommercialRequest(secret, timestamp, requestId, body), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function responseError(res: Response, status: number, error: string) {
  res.status(status).json({ success: false, error });
}

export function registerGiieCmsIntegration(app: Express) {
  app.post("/api/integrations/giie/commercial-briefs", integrationRateLimit, async (req: Request, res: Response) => {
    const secret = process.env.NEAS_GIIE_CMS_HMAC_SECRET ?? "";
    const editorOpenId = process.env.NEAS_GIIE_CMS_EDITOR_OPEN_ID ?? "";
    const allowlist = allowedSourceHosts();
    if (secret.length < 32 || !editorOpenId || allowlist.size < 2) {
      responseError(res, 503, "Commercial CMS integration is not configured.");
      return;
    }

    const timestamp = req.header("x-neas-timestamp") ?? "";
    const requestId = req.header("x-neas-request-id") ?? "";
    const signature = req.header("x-neas-signature") ?? "";
    const body = JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(body, "utf8") > 32 * 1024) {
      responseError(res, 413, "Brief exceeds the 32 KB limit.");
      return;
    }
    if (!verifyCommercialRequest(secret, timestamp, requestId, body, signature)) {
      responseError(res, 401, "Invalid or expired integration signature.");
      return;
    }

    const validated = validateCommercialBrief(req.body, allowlist);
    if (!validated.success) {
      responseError(res, 422, validated.reason);
      return;
    }

    const db = await getDb();
    if (!db) {
      responseError(res, 503, "CMS database is unavailable.");
      return;
    }

    try {
      const actor = (await db.select().from(users).where(eq(users.openId, editorOpenId)).limit(1))[0];
      if (!actor || !["editor", "admin"].includes(actor.role)) {
        responseError(res, 503, "Configured integration author must be an active CMS editor.");
        return;
      }

      const brief = validated.data;
      const slug = `market-intel-${createHash("sha256").update(brief.signalId).digest("hex").slice(0, 24)}`;
      const existing = (await db.select().from(pages).where(eq(pages.slug, slug)).limit(1))[0];
      if (existing) {
        res.status(200).json({ success: true, duplicate: true, pageId: existing.id, status: existing.status, slug });
        return;
      }

      const sourceText = brief.sources.map((source, index) => `Source ${index + 1}: ${source.title} — ${source.publisher} — ${source.url}`).join("\n");
      const layout = JSON.stringify([{
        id: `giie-${slug}`,
        type: "market_intelligence_brief",
        content: {
          title: brief.title,
          body: `${brief.summary}\n\n${brief.body}\n\nIndustry: ${brief.industry}\n\nEvidence and sources\n${sourceText}`,
          tone: "mint",
        },
        order: 0,
        visible: true,
      }]);
      const seo = JSON.stringify({
        title: brief.title.slice(0, 70),
        description: brief.seoDescription,
        slug,
        canonical: `https://www.nextedge-access-solutions.com/page/${slug}`,
        noIndex: false,
      });

      const result = await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(pages).values({
          title: brief.title.slice(0, 255),
          slug,
          status: "pending_review",
          layout,
          seo,
          updatedBy: actor.id,
        });
        const pageId = Number(inserted.insertId);
        await tx.insert(revisions).values({
          pageId,
          authorId: actor.id,
          summary: `NEAS APEX verified commercial brief submitted for review. Signal: ${brief.signalId}`,
          previousContent: null,
          updatedContent: layout,
          status: "pending_review",
          reviewComment: `Automated intake. Verify the original sources and factual claims before approval. Request: ${requestId}`,
        });
        return pageId;
      });

      res.status(201).json({ success: true, duplicate: false, pageId: result, status: "pending_review", slug });
    } catch (error) {
      // A concurrent retry can race on the unique slug; return the existing item without mutating it.
      const brief = validated.data;
      const slug = `market-intel-${createHash("sha256").update(brief.signalId).digest("hex").slice(0, 24)}`;
      const existing = (await db.select().from(pages).where(and(eq(pages.slug, slug))).limit(1).catch(() => []))[0];
      if (existing) {
        res.status(200).json({ success: true, duplicate: true, pageId: existing.id, status: existing.status, slug });
        return;
      }
      console.error("[GIIE CMS] Intake failed", error);
      responseError(res, 500, "Commercial brief could not be saved.");
    }
  });
}
