import { bad, ok } from "@/lib/http";
import { useResetToken } from "@/lib/reset";
import { rateLimitRequest } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const limited = rateLimitRequest(req, "auth-reset", 10, 15 * 60_000);
  if (limited) return limited;
  const rawBody = await req.json().catch(() => ({}));
  const b: Record<string, unknown> = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody as Record<string, unknown> : {};
  const r = await useResetToken(String(b.token ?? ""), typeof b.password === "string" ? b.password : "");
  return "error" in r ? bad(r.error) : ok({ ok: true, role: r.role });
}
