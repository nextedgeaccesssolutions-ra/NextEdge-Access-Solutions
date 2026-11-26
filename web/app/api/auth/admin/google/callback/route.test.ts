import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The repo-root test runner has no `next` package installed; stub the one helper the routes use.
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL | string, status = 307) =>
      new Response(null, { status, headers: { location: String(url) } }),
  },
}));
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => jar.set(k, v),
    delete: (k: string) => jar.delete(k),
  }),
}));
vi.mock("@/lib/config", () => ({ loadConfig: async () => {} }));
vi.mock("@/lib/session-key", () => ({ hasStrongSessionSecret: () => true }));
vi.mock("@/lib/auth", () => ({ createSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ sql: vi.fn(async () => []) }));

const ORIGIN = "https://www.nextedge-access-solutions.com";

describe("admin Google sign-in", () => {
  beforeEach(() => {
    vi.resetModules();
    jar.clear();
    process.env.SITE_URL = ORIGIN;
    // Values as they often arrive when pasted into Vercel: with a trailing newline.
    process.env.GOOGLE_CLIENT_ID = "client-123.apps.googleusercontent.com\n";
    process.env.GOOGLE_CLIENT_SECRET = " secret-xyz\n";
    process.env.ADMIN_GOOGLE_EMAILS = "admin@example.com";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("start: sends Google the trimmed client id", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request(`${ORIGIN}/api/auth/admin/google`, { headers: { "x-forwarded-for": "198.51.100.1" } }));
    const auth = new URL(res.headers.get("location")!);
    expect(auth.hostname).toBe("accounts.google.com");
    expect(auth.searchParams.get("client_id")).toBe("client-123.apps.googleusercontent.com");
    expect(auth.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/admin/google/callback`);
  });

  it("callback: exchanges the code with trimmed credentials", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    jar.set("neas_admin_google_oauth", JSON.stringify({ state: "s1", nonce: "n1", verifier: "v1" }));
    const { GET } = await import("./route");
    await GET(new Request(`${ORIGIN}/api/auth/admin/google/callback?code=c1&state=s1`, { headers: { "x-forwarded-for": "198.51.100.2" } }));
    const body = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown[])[1] && ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body));
    expect(body.get("client_id")).toBe("client-123.apps.googleusercontent.com");
    expect(body.get("client_secret")).toBe("secret-xyz");
    expect(body.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/admin/google/callback`);
  });

  it("callback: logs Google's reason when the token exchange is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_client", error_description: "Unauthorized" }), { status: 401 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    jar.set("neas_admin_google_oauth", JSON.stringify({ state: "s1", nonce: "n1", verifier: "v1" }));
    const { GET } = await import("./route");
    const res = await GET(new Request(`${ORIGIN}/api/auth/admin/google/callback?code=c1&state=s1`, { headers: { "x-forwarded-for": "198.51.100.3" } }));
    expect(res.headers.get("location")).toContain("google_error=verification");
    const logged = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("invalid_client");
    expect(logged).not.toContain("secret-xyz");
    warn.mockRestore();
  });
});
