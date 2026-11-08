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

function setCors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

export async function receiveStoreRequest(req: Request, res: Response) {
  setCors(res);
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please review the required fields.", issues: parsed.error.flatten() });
  await createSubmission(`store_${parsed.data.type}`, JSON.stringify(parsed.data));
  return res.json({ success: true });
}

export function allowStoreRequestPreflight(_req: Request, res: Response) {
  setCors(res);
  return res.status(204).end();
}
