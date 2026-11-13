import { beforeEach, describe, expect, it, vi } from "vitest";

// Admin-saved integration keys live encrypted in the database and are pushed into
// process.env by loadConfig(). This stands in for that hydration.
const loadConfig = vi.fn(async () => {
  process.env.GOOGLE_CLIENT_ID = "admin-saved-id";
  process.env.GOOGLE_CLIENT_SECRET = "admin-saved-secret";
});
vi.mock("@/lib/config", () => ({ loadConfig }));

// CI's root job does not install web/ dependencies, so stand in for next/server and next/headers.
vi.mock("next/server", () => ({
  NextResponse: { redirect: (url: URL | string) => new Response(null, { status: 307, headers: { location: String(url) } }) },
}));
const jar = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string) => jar.set(name, { value }),
    get: (name: string) => jar.get(name),
    delete: (name: string) => jar.delete(name),
  }),
}));
vi.mock("@/lib/db", () => ({ sql: Object.assign(async () => [], { }) }));
vi.mock("@/lib/auth", () => ({ createSession: async () => {} }));

const start = (provider: string) =>
  [new Request(`https://www.nextedge-access-solutions.com/api/auth/oauth/${provider}?next=%2Fstore`),
   { params: Promise.resolve({ provider }) }] as const;

describe("OAuth start reads admin-saved credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    jar.clear();
    loadConfig.mockClear();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it("redirects to Google when the keys come from the admin config store, not the hosting env", async () => {
    const { GET } = await import("./route");
    const res = await GET(...(start("google") as never as [Request, { params: Promise<{ provider: string }> }]));
    expect(loadConfig).toHaveBeenCalled();
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("accounts.google.com");
    expect(location).toContain("client_id=admin-saved-id");
    expect(location).not.toContain("error=unavailable");
  });

  it("still reports unavailable when no credentials exist anywhere", async () => {
    loadConfig.mockImplementationOnce(async () => {});
    const { GET } = await import("./route");
    const res = await GET(...(start("google") as never as [Request, { params: Promise<{ provider: string }> }]));
    expect(res.headers.get("location")).toContain("error=unavailable");
  });

  it("rejects an unknown provider without touching the config store", async () => {
    const { GET } = await import("./route");
    const res = await GET(...(start("myspace") as never as [Request, { params: Promise<{ provider: string }> }]));
    expect(res.headers.get("location")).toContain("error=unavailable");
    expect(loadConfig).not.toHaveBeenCalled();
  });
});
