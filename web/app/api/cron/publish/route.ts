import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { loadConfig } from "@/lib/config";
import { setSetting } from "@/lib/settings";
import { ok, bad } from "@/lib/http";
import { originOf } from "@/lib/reset";
import { cronToken, publishPost } from "@/lib/publish";
import { rateLimitRequest } from "@/lib/rate-limit";
import { autoSyncSheet } from "@/lib/sheet-source";
import { createDailyStorePosts } from "@/lib/store-marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Publishes every "scheduled" post whose time has come. Called by Vercel Cron (daily) or a free pinger (every 5–15 min).
 *  Auth: "Authorization: Bearer <token>" or "?token=<token>". */
async function run(req: Request) {
  const limited = rateLimitRequest(req, "cron-publish", 2, 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
  if (!given || !same(given, cronToken())) return bad("Not authorized.", 401);
  if (process.env.VERCEL_ENV !== "production") return bad("Scheduled social publishing is disabled outside Production.", 403);
  await loadConfig().catch(() => {});
  const origin = originOf(req);
  const sheetPromise = autoSyncSheet().catch((e) => ({ error: String(e) }));
  const store = await createDailyStorePosts(origin).catch((e) => ({ enabled: true, created: 0, error: String(e) }));
  // Retry failed store-promotion posts for seven days. Successful account results are skipped by publishPost.
  if (store.enabled) await sql`update mk_posts set status = 'scheduled', scheduled_at = now(), updated_at = now()
    where ws is null and campaign like 'NEAS Store Product Daily %' and status = 'failed'
      and updated_at > now() - interval '7 days'`;
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
  await setSetting("mk_cron_last", { at: new Date().toISOString(), published: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, store });
  return ok({ ran: new Date().toISOString(), checked: due.length, results, store, sheet });
}
export const GET = run;
export const POST = run;
