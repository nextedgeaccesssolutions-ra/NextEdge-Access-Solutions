import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { publishTo } from "./social";
import { logActivity, inWs, memberLimit } from "./marketing";
import { notifyApproval } from "./notify";

export type PublishResult = { platform: string; name: string; ok: boolean; error?: string };
const AUTO = ["facebook", "instagram", "linkedin", "youtube", "tiktok", "google_business"];

let publishLockTableReady: Promise<void> | null = null;

/** Ensure the durable publishing lease table exists once per server instance.
 *  The main migration also creates it; this additive guard repairs older databases
 *  without issuing CREATE TABLE on every publication request. */
async function ensurePublishLockTable() {
  if (!publishLockTableReady) {
    publishLockTableReady = sql`create table if not exists mk_post_publish_locks (
      post_id int primary key references mk_posts(id) on delete cascade,
      lock_token uuid not null,
      locked_at timestamptz not null default now()
    )`.then(() => undefined).catch((error) => {
      publishLockTableReady = null;
      throw error;
    });
  }
  await publishLockTableReady;
}

/** Publishes one post to every connected account for its chosen platforms.
 *  Marked "published" only when every platform confirms; otherwise "failed" with reasons.
 *  Accounts that already succeeded for this post are skipped, so retries never double-post. */
export async function publishPost(id: number, userId: number | null, origin: string): Promise<{ allOk: boolean; results: PublishResult[] } | { error: string; retry?: boolean }> {
  const post = (await sql`select * from mk_posts where id = ${id}`)[0];
  if (!post) return { error: "Post not found." };
  if (!["approved", "scheduled", "failed"].includes(post.status)) return { error: "Only approved or scheduled posts can be published." };
  // A durable per-post lease prevents manual retries and overlapping cron runs from
  // sending the same post to a platform at the same time. Expired leases recover crashes.
  await ensurePublishLockTable();
  const lockToken = randomUUID();
  const claimed = await sql`insert into mk_post_publish_locks (post_id, lock_token, locked_at)
    values (${id}, ${lockToken}, now())
    on conflict (post_id) do update set lock_token = excluded.lock_token, locked_at = now()
    where mk_post_publish_locks.locked_at < now() - interval '10 minutes'
    returning post_id`;
  if (!claimed.length) return { error: "This post is already being published. Wait for the current attempt to finish before retrying.", retry: true };
  try {
  const wanted: string[] = (post.platforms ?? []).filter((x: string) => AUTO.includes(x));
  if (!wanted.length) return { error: "Pick at least one platform on this post first." };
  if (post.ws != null) {
    const n = (await sql`select count(distinct r.post_id)::int n from mk_post_results r join mk_posts p on p.id = r.post_id
      where p.ws = ${post.ws} and r.ok and r.post_id <> ${id} and r.created_at >= (date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila')`)[0].n;
    if (n >= memberLimit()) return { error: `Daily limit reached: ${memberLimit()} posts per day. Try again tomorrow (Philippine time).`, retry: true };
  }
  const accounts = await sql`select * from mk_social_accounts where platform in ${sql(wanted)} and status = 'ok' and ${inWs(post.ws)}`;
  const done = new Set((await sql`select account_id from mk_post_results where post_id = ${id} and ok`).map((r) => r.account_id));
  const out: PublishResult[] = [];
  for (const pl of wanted) if (!accounts.some((a) => a.platform === pl)) out.push({ platform: pl, name: "", ok: false, error: "No connected account" });
  const accountResults = await Promise.all(accounts.map(async (a) => {
    if (done.has(a.id)) return { platform: a.platform, name: a.name, ok: true } as PublishResult;
    const recovery = (await sql`select state, error_class, error_message from mk_post_recovery_queue where post_id = ${id} and account_id = ${a.id}`)[0];
    if (recovery && recovery.state !== "retry_ready") {
      return { platform: a.platform, name: a.name, ok: false, error: `Recovery blocked (${recovery.state}): ${recovery.error_message}. An administrator must verify the platform outcome before another attempt.` } as PublishResult;
    }
    try {
      const rid = await publishTo(a as unknown as { id: number; platform: string; external_id: string; token_enc: string }, String(post.body || post.title), String(post.media_url || ""), origin);
      await sql`insert into mk_post_results (post_id, account_id, platform, ok, remote_id) values (${id}, ${a.id}, ${a.platform}, true, ${rid})`;
      await sql`update mk_post_recovery_queue set state = 'resolved', error_message = '', resolution_note = coalesce(resolution_note, 'Confirmed successful platform response'), updated_at = now() where post_id = ${id} and account_id = ${a.id}`;
      return { platform: a.platform, name: a.name, ok: true } as PublishResult;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 400);
      await sql`insert into mk_post_results (post_id, account_id, platform, ok, error) values (${id}, ${a.id}, ${a.platform}, false, ${msg})`;
      // Be conservative: only an explicit provider rate-limit response is retryable.
      // Timeouts, network errors and server errors may happen after remote acceptance,
      // so they are held for reconciliation and are never resent automatically.
      const rateLimited = /(?:HTTP|answered)\\s*429|rate.?limit|too many requests/i.test(msg);
      const authFailure = /token|session|expired|OAuth|permission|unauthori[sz]ed/i.test(msg);
      const errorClass = rateLimited ? "rate_limited" : authFailure ? "authentication_or_permission" : /needs an image|isn't available|not available yet|unsupported/i.test(msg) ? "validation_or_unsupported" : "ambiguous";
      const state = rateLimited ? "retryable" : "needs_review";
      await sql`insert into mk_post_recovery_queue (post_id, account_id, platform, state, error_class, error_message, attempts, last_attempt_at, updated_at)
        values (${id}, ${a.id}, ${a.platform}, ${state}, ${errorClass}, ${msg}, 1, now(), now())
        on conflict (post_id, account_id) do update set state = excluded.state, error_class = excluded.error_class,
          error_message = excluded.error_message, attempts = mk_post_recovery_queue.attempts + 1,
          last_attempt_at = now(), updated_at = now(), resolution_note = null`;
      if (authFailure) await sql`update mk_social_accounts set status = 'error', last_error = ${msg} where id = ${a.id}`;
      return { platform: a.platform, name: a.name, ok: false, error: msg } as PublishResult;
    }
  }));
  out.push(...accountResults);
  const allOk = out.length > 0 && out.every((r) => r.ok);
  await sql`update mk_posts set status = ${allOk ? "published" : "failed"}, updated_at = now() where id = ${id}`;
  await logActivity(userId as number, (userId ? "" : "auto-") + (allOk ? "published" : "publish failed"), out.map((r) => `${r.platform}${r.name ? " (" + r.name + ")" : ""}: ${r.ok ? "ok" : r.error}`).join("; "), id, post.ws);
  if (!allOk && post.ws == null) await notifyApproval(id, "failed", out.filter((r) => !r.ok).map((r) => `${r.platform}: ${r.error}`).join("; ")).catch(() => {});
  return { allOk, results: out };
  } finally {
    // Token-checked release prevents an expired lease from deleting a newer worker's lock.
    await sql`delete from mk_post_publish_locks where post_id = ${id} and lock_token = ${lockToken}`.catch(() => {});
  }
}
