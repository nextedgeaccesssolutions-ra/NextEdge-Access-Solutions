import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { pages } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";

export async function publishScheduledPage(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database-unavailable" });
    const page = (await db.select().from(pages).where(eq(pages.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
    if (!page) return res.json({ ok: true, skipped: "orphan" });
    if (page.status !== "scheduled") return res.json({ ok: true, skipped: "already-processed" });
    await db.update(pages).set({ status: "published", publishedAt: new Date(), scheduledAt: null }).where(eq(pages.id, page.id));
    return res.json({ ok: true, pageId: page.id });
  } catch (error) {
    return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
  }
}
