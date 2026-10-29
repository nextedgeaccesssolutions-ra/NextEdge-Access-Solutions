export type Provider = "google" | "facebook";

export const PROVIDERS: Record<Provider, { authorize: string; token: string; scope: string; id: () => string | undefined; secret: () => string | undefined }> = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    id: () => process.env.GOOGLE_CLIENT_ID,
    secret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    authorize: "https://www.facebook.com/v19.0/dialog/oauth",
    token: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "email,public_profile",
    id: () => process.env.FACEBOOK_APP_ID,
    secret: () => process.env.FACEBOOK_APP_SECRET,
  },
};

export function isProvider(p: string): p is Provider { return p === "google" || p === "facebook"; }
export function enabled(p: Provider) { return Boolean(PROVIDERS[p].id() && PROVIDERS[p].secret()); }

export function baseUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
export const redirectUri = (req: Request, p: Provider) => `${baseUrl(req)}/api/auth/oauth/${p}/callback`;

/** Exchange the code and return a verified identity, or throw with a user-facing message. */
export async function fetchIdentity(req: Request, p: Provider, code: string): Promise<{ providerId: string; email: string; name: string }> {
  const cfg = PROVIDERS[p];
  const params = new URLSearchParams({ client_id: cfg.id()!, client_secret: cfg.secret()!, code, redirect_uri: redirectUri(req, p) });
  if (p === "google") {
    params.set("grant_type", "authorization_code");
    const t = await fetch(cfg.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
    const tok = await t.json();
    if (!t.ok || !tok.access_token) throw new Error("Google sign-in failed. Please try again.");
    const u = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tok.access_token}` } })).json();
    if (!u.sub || !u.email || u.email_verified !== true) throw new Error("Your Google account has no verified email.");
    return { providerId: String(u.sub), email: String(u.email).toLowerCase(), name: u.name || u.email };
  }
  const t = await fetch(`${cfg.token}?${params}`);
  const tok = await t.json();
  if (!t.ok || !tok.access_token) throw new Error("Facebook sign-in failed. Please try again.");
  const u = await (await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(tok.access_token)}`)).json();
  if (!u.id) throw new Error("Facebook sign-in failed. Please try again.");
  if (!u.email) throw new Error("Your Facebook account didn't share an email address. Please allow email access, or sign up with Google or email instead.");
  return { providerId: String(u.id), email: String(u.email).toLowerCase(), name: u.name || u.email };
}
