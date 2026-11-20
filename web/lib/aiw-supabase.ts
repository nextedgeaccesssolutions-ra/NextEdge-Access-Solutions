/** Shared server-side Supabase REST client for the AI Workforce control plane.
 *
 *  Extracted from app/api/admin/ai-workforce/control-plane/route.ts so the
 *  scheduler tick route uses exactly the same credentials, error handling and
 *  audit-event shape. The secret key is server-only and must never be exposed
 *  through a NEXT_PUBLIC variable.
 */

export type AiwRow = Record<string, unknown>;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://smlxekhbaefbvdbfxpew.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const AIW_SUPABASE_NOT_CONFIGURED =
  "SUPABASE_SECRET_KEY is not configured in the Vercel server environment. Add the Supabase project secret key to Production and Preview; never expose it as NEXT_PUBLIC.";

export function aiwSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_KEY);
}

export async function aiwSupabase(path: string, init: RequestInit = {}) {
  if (!SUPABASE_KEY) throw new Error(AIW_SUPABASE_NOT_CONFIGURED);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Supabase request failed (${res.status}): ${raw.slice(0, 300)}`);
  return raw ? JSON.parse(raw) : null;
}

/** Appends an immutable governance record. Every state change in the control
 *  plane writes one, including denied and failed attempts. */
export async function aiwAudit(
  actorType: "human" | "system",
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  outcome: "success" | "denied" | "failure" | "pending",
  details: AiwRow = {},
) {
  await aiwSupabase("aiw_audit_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_type: actorType,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      outcome,
      details,
    }),
  });
}

/** Next run time for a stored cadence. Keeps the common cadences explicit
 *  rather than pulling in a cron parser; an unrecognized cadence falls back to
 *  daily so a schedule can never silently stop advancing. */
export function aiwNextRunAt(cadence: string, from: Date = new Date()): string {
  const next = new Date(from.getTime());
  const key = String(cadence || "").toLowerCase();
  if (key.includes("15") && key.includes("min")) next.setMinutes(next.getMinutes() + 15);
  else if (key.includes("30") && key.includes("min")) next.setMinutes(next.getMinutes() + 30);
  else if (key.includes("hour")) next.setHours(next.getHours() + 1);
  else if (key.includes("week")) next.setDate(next.getDate() + 7);
  else if (key.includes("month")) next.setMonth(next.getMonth() + 1);
  else if (key.includes("quarter")) next.setMonth(next.getMonth() + 3);
  else next.setDate(next.getDate() + 1);
  return next.toISOString();
}
