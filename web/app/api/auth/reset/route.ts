import { bad, ok } from "@/lib/http";
import { useResetToken } from "@/lib/reset";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ipLimit = await consumeRateLimit("auth-reset-ip", clientIp(req), 10, 15 * 60_000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  const b = await req.json().catch(() => ({}));
  const token = String(b.token ?? "");
  if (token) {
    const tokenLimit = await consumeRateLimit("auth-reset-token", token, 5, 60 * 60_000);
    if (!tokenLimit.allowed) return rateLimitResponse(tokenLimit);
  }
  const r = await useResetToken(token, typeof b.password === "string" ? b.password : "");
  return "error" in r ? bad(r.error) : ok({ ok: true, role: r.role });
}
