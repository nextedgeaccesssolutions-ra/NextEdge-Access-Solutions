/**
 * The site's canonical public origin, e.g. `https://www.nextedge-access-solutions.com`.
 *
 * Both OAuth flows build their `redirect_uri` from this value: website login at
 * `/api/auth/oauth/<provider>/callback` and the admin social connectors at
 * `/api/admin/social/callback/<platform>`. Google, LinkedIn, Facebook and TikTok
 * all reject a `redirect_uri` that is not registered character-for-character, so
 * the two flows have to agree on the origin. They used to read two different
 * variables -- `APP_URL` for login and `SITE_URL` for the connectors -- and so
 * disagreed silently whenever only one of them was set.
 *
 * `SITE_URL` is the canonical setting. `APP_URL` stays supported as a legacy
 * alias so a deployment that sets only `APP_URL` keeps working.
 */

/** Proxies may append to these headers, so only the first value is ours. */
const first = (value: string | null) => value?.split(",")[0]?.trim() || "";

const isLocal = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/**
 * An explicitly configured origin, or `null` when neither variable holds a
 * usable absolute URL. Plain http is accepted only for local development; a
 * production origin must be https, as the providers require.
 */
function configuredOrigin(): string | null {
  for (const raw of [process.env.SITE_URL, process.env.APP_URL]) {
    const value = raw?.trim();
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue; // not an absolute URL -- e.g. a bare "www.example.com"
    }
    if (url.protocol === "https:" || (url.protocol === "http:" && isLocal(url.hostname))) {
      return url.origin; // drops any trailing slash, port and path for us
    }
  }
  return null;
}

/** The origin the request arrived on, honouring the hosting proxy's headers. */
function requestOrigin(req: Request): string {
  const host = first(req.headers.get("x-forwarded-host")) || first(req.headers.get("host"));
  if (!host) return new URL(req.url).origin;
  const proto = first(req.headers.get("x-forwarded-proto")) || (isLocal(host.replace(/:\d+$/, "")) ? "http" : "https");
  return `${proto}://${host}`;
}

/** Canonical public origin, with no trailing slash. */
export function publicOrigin(req: Request): string {
  return configuredOrigin() ?? requestOrigin(req);
}
