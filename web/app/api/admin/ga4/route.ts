import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
import {
  ga4Config,
  ga4Summary,
  searchConsoleSummary,
  Ga4Error,
} from "@/lib/ga4";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const cfg = ga4Config();
  if (!cfg)
    return bad(
      "Google Analytics is not connected. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and either GA4_WIF_AUDIENCE (keyless) or GA4_PRIVATE_KEY in the server environment.",
      503
    );
  const requested = Number(new URL(req.url).searchParams.get("days"));
  const days = [7, 28, 90].includes(requested) ? requested : 28;
  try {
    const oidc =
      req.headers.get("x-vercel-oidc-token") ||
      process.env.VERCEL_OIDC_TOKEN ||
      undefined;
    const analytics = await ga4Summary(cfg, days, fetch, oidc);
    const siteUrl = (process.env.GSC_SITE_URL || "").trim();
    let searchConsole: Record<string, unknown> = { configured: false };
    if (siteUrl) {
      try {
        searchConsole = {
          configured: true,
          ...(await searchConsoleSummary(cfg, siteUrl, days, fetch, oidc)),
        };
      } catch (error) {
        searchConsole = {
          configured: true,
          error:
            error instanceof Error
              ? error.message
              : "Search Console data unavailable.",
        };
      }
    }
    return ok({
      connected: true,
      ...analytics,
      searchConsole,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Ga4Error) return bad(error.message, 502);
    console.error("[admin/ga4] request failed", {
      errorName: (error as Error)?.name || "UnknownError",
    });
    return bad("Could not reach Google Analytics. Please try again.", 502);
  }
}
