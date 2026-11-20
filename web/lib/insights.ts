import { sql } from "./db";
import { decrypt } from "./social";
import { getSetting, setSetting } from "./settings";

/** Real Facebook Page analytics from the Graph API. Each metric is requested on its own so a retired metric
 *  only blanks that one number (with its reason) instead of the whole report. Cached for 30 minutes. */
const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v25.0"}`;
const GRAPH_REQUEST_TIMEOUT_MS = 8_000;
type Day = { date: string; value: number };
export type PageInsights = {
  page: string; followers: number | null; views: number | null; reached: number | null; engagements: number | null;
  daily: Day[]; posts: { id: string; text: string; at: string; link: string; views: number | null; reactions: number; comments: number; shares: number }[]; errors: string[];
};
export type InsightsReport = { days: number; fetchedAt: string; pages: PageInsights[] };

async function g(path: string, token: string) {
  const r = await fetch(`${GRAPH()}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(GRAPH_REQUEST_TIMEOUT_MS) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Facebook answered ${r.status}`);
  return j;
}
const short = (e: unknown) => String((e as Error).message || e).replace(/\s*Refer to.*$/, "").slice(0, 160);

async function series(pageId: string, metric: string, token: string, since: number, until: number): Promise<Day[]> {
  const j = await g(`${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}`, token);
  const vals = j.data?.[0]?.values ?? [];
  return vals.map((v: { end_time: string; value: number | Record<string, number> }) => ({ date: v.end_time.slice(0, 10), value: typeof v.value === "number" ? v.value : Object.values(v.value ?? {}).reduce((a, b) => a + Number(b || 0), 0) }));
}

export async function loadInsights(days = 28, force = false, ws: number | null = null): Promise<InsightsReport> {
  const cacheKey = `mk_insights_${days}` + (ws == null ? "" : `_ws${ws}`);
  const cached = await getSetting<InsightsReport | { none: true }>(cacheKey, { none: true });
  if (!force && "fetchedAt" in cached && Date.now() - +new Date(cached.fetchedAt) < 30 * 60_000) return cached;
  const accounts = await sql`select external_id, name, token_enc from mk_social_accounts where platform = 'facebook' and status = 'ok' and ${ws == null ? sql`ws is null` : sql`ws = ${ws}`} order by name`;
  const until = Math.floor(Date.now() / 1000), since = until - days * 86400;
  const pages: PageInsights[] = await Promise.all(accounts.map(async (a) => {
    const errors: string[] = [];
    let token: string;
    try {
      token = decrypt(a.token_enc);
    } catch {
      return {
        page: a.name,
        followers: null,
        views: null,
        reached: null,
        engagements: null,
        daily: [],
        posts: [],
        errors: ["Saved Facebook token could not be decrypted. Reconnect this Page to restore analytics access."],
      };
    }

    const sum = (d: Day[]) => d.reduce((x, y) => x + y.value, 0);
    const [profileResult, viewsResult, reachedResult, engagementResult, feedResult] = await Promise.allSettled([
      g(a.external_id + "?fields=followers_count", token),
      series(a.external_id, "page_media_view", token, since, until),
      series(a.external_id, "page_total_media_view_unique", token, since, until),
      series(a.external_id, "page_post_engagements", token, since, until),
      g(a.external_id + "/posts?limit=10&fields=id,message,created_time,permalink_url,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)", token),
    ]);

    let followers: number | null = null;
    let views: number | null = null;
    let reached: number | null = null;
    let engagements: number | null = null;
    let daily: Day[] = [];

    if (profileResult.status === "fulfilled") followers = profileResult.value.followers_count ?? null;
    else errors.push("Followers: " + short(profileResult.reason));

    if (viewsResult.status === "fulfilled") {
      daily = viewsResult.value;
      views = sum(daily);
    } else errors.push("Views: " + short(viewsResult.reason));

    if (reachedResult.status === "fulfilled") reached = sum(reachedResult.value);
    else errors.push("People reached: " + short(reachedResult.reason));

    if (engagementResult.status === "fulfilled") engagements = sum(engagementResult.value);
    else errors.push("Engagements: " + short(engagementResult.reason));

    let feed: any[] = [];
    if (feedResult.status === "fulfilled") feed = feedResult.value.data ?? [];
    else errors.push("Posts: " + short(feedResult.reason));

    const posts: PageInsights["posts"] = await Promise.all(feed.map(async (p: any) => {
      let pv: number | null = null;
      try {
        const ins = await g(p.id + "/insights?metric=post_media_view", token);
        pv = Number(ins.data?.[0]?.values?.[0]?.value ?? 0);
      } catch {
        // Post views are optional; a missing metric must not fail the report.
      }
      return { id: p.id, text: (p.message ?? "(photo or video)").slice(0, 120), at: p.created_time, link: p.permalink_url ?? "", views: pv, reactions: p.reactions?.summary?.total_count ?? 0, comments: p.comments?.summary?.total_count ?? 0, shares: p.shares?.count ?? 0 };
    }));

    return { page: a.name, followers, views, reached, engagements, daily, posts, errors };
  }));
  const report = { days, fetchedAt: new Date().toISOString(), pages };
  if (pages.length) await setSetting(cacheKey, report);
  return report;
}
