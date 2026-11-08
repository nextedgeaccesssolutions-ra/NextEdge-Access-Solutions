import type { Request, Response } from "express";
import { z } from "zod";
import { createSubmission } from "./db";

const requestSchema = z.object({
  type: z.enum(["service_booking", "meeting_request", "equipment_quote"]),
  name: z.string().min(1).max(160),
  email: z.string().email().max(320),
  telephone: z.string().max(80).optional(),
  company: z.string().max(180).optional(),
  service: z.string().max(160).optional(),
  location: z.string().max(500).optional(),
  preferredDate: z.string().max(40).optional(),
  preferredTime: z.string().max(40).optional(),
  details: z.string().min(1).max(5000),
  items: z.array(z.object({ name: z.string().max(180), quantity: z.number().int().positive().max(1000) })).max(50).optional(),
  consent: z.literal(true),
});

// Public intake endpoint throttle. This bounded in-process guard limits bursts
// on each serverless instance; configure the edge/shared limit in production
// for a globally consistent quota across instances.
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 5;
const MAX_CLIENTS = 10_000;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const address = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : "";
  return address || req.ip || req.socket.remoteAddress || "unknown";
}

function isRateLimited(req: Request, res: Response): boolean {
  const now = Date.now();
  const key = getClientKey(req);
  const current = requestWindows.get(key);
  const configuredLimit = Number(process.env.STORE_REQUEST_RATE_LIMIT);
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.min(100, Math.floor(configuredLimit))
    : DEFAULT_LIMIT;

  if (!current || current.resetAt <= now) {
    if (requestWindows.size >= MAX_CLIENTS) {
      for (const [client, entry] of requestWindows) {
        if (entry.resetAt <= now) requestWindows.delete(client);
        if (requestWindows.size < MAX_CLIENTS) break;
      }
      if (requestWindows.size >= MAX_CLIENTS) requestWindows.clear();
    }
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(limit - 1));
    return false;
  }

  current.count += 1;
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - current.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
  if (current.count <= limit) return false;

  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
  res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  return true;
}

function setCors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

export async function receiveStoreRequest(req: Request, res: Response) {
  setCors(res);
  if (isRateLimited(req, res)) return;
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please review the required fields.", issues: parsed.error.flatten() });
  await createSubmission(`store_${parsed.data.type}`, JSON.stringify(parsed.data));
  return res.json({ success: true });
}

export function allowStoreRequestPreflight(_req: Request, res: Response) {
  setCors(res);
  return res.status(204).end();
}
