import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { loadConfig } from "@/lib/config";
import { setSetting } from "@/lib/settings";
import { ok, bad } from "@/lib/http";
import { originOf } from "@/lib/reset";
import { cronToken } from "@/lib/cron-token";
import { publishPost } from "@/lib/publish";
import { rateLimitRequest } from "@/lib/rate-limit";
import { autoSyncSheet } from "@/lib/sheet-source";
import { autoSyncWebsiteCatalog } from "@/lib/sheet-writeback";
import { createDailyStorePosts, type StoreDailyPostsResult } from "@/lib/store-marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Publishes due scheduled posts and runs the daily supplier-sheet and website-catalog sync.
 * Auth: "Authorization: Bearer <token>" or "?token=<token>". */
async function run(req: Request) {
  const limited = rateLimitRequest(req, "cron-publish", 2, 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
  const expected = cronToken();
  if (!expected) return bad("Scheduled publishing is not configured.", 503);
  if (!given || !same(given, expected)) return bad("Not authorized.", 401);
  if (process.env.VERCEL_ENV !== "production") return bad("Scheduled social publishing is disabled outside Production.", 403);
  await loadConfig().catch(() => {});
  const origin = originOf(req);
  const sheetPromise = autoSyncSheet().catch((e) => ({ error: String(e) }));
  const store: StoreDailyPostsResult = await createDailyStorePosts(origin).catch((e): StoreDailyPostsResult => ({ enabled: true, created: 0, error: String(e) }));
  // Failed posts are deliberately not re-queued here. Recovery must first classify the
  // provider error and prove the underlying issue is resolved; blind daily retries can duplicate posts.
  // Claim due posts atomically so overlapping cron calls cannot claim the same scheduled row.
  const due = await sql`update mk_posts set status = 'approved', updated_at = now()
    where id in (select id from mk_posts where status = 'scheduled' and scheduled_at <= now() order by scheduled_at limit 20 for update skip locked)
    returning id`;
  const results: { id: number; ok: boolean; detail: string }[] = [];
  for (const p of due) {
    const r = await publishPost(p.id, null, origin);
    results.push("error" in r ? { id: p.id, ok: false, detail: r.error } : { id: p.id, ok: r.allOk, detail: r.results.map((x) => `${x.platform}: ${x.ok ? "ok" : x.error}`).join("; ") });
    if ("error" in r && r.retry) await sql`update mk_posts set status = 'scheduled', scheduled_at = (date_trunc('day', now() at time zone 'Asia/Manila') + interval '1 day 20 hours') at time zone 'Asia/Manila' where id = ${p.id}`;
    else if ("error" in r) await sql`update mk_posts set status = 'failed', notes = coalesce(notes,'') || ${"\\nAuto-publish: " + r.error} where id = ${p.id}`;
  }
  const sheet = await sheetPromise;
  // Export only after the supplier import has completed, so the destination reflects the latest catalog.
  const websiteCatalog = await autoSyncWebsiteCatalog().catch((e) => ({ error: String(e) }));
  await setSetting("mk_cron_last", { at: new Date().toISOString(), published: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, store });
  return ok({ ran: new Date().toISOString(), checked: due.length, results, store, sheet, websiteCatalog });
}
export const GET = run;
export const POST = run;
