import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json" } }) },
}));
const admin = vi.fn();
vi.mock("@/lib/admin", () => ({ requireAdmin: () => admin() }));
const sql = vi.fn();
vi.mock("@/lib/db", () => ({ sql: (...a: unknown[]) => sql(...a) }));

const call = async (id: string) => {
  const { GET } = await import("./route");
  return GET(new Request("https://x/api/admin/photos/" + id), { params: Promise.resolve({ id }) });
};

describe("admin photo backup download", () => {
  beforeEach(() => { vi.resetModules(); admin.mockReset(); sql.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("refuses non-admins", async () => {
    admin.mockResolvedValue(null);
    expect((await call("p1")).status).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  });

  it("returns stored upload bytes", async () => {
    admin.mockResolvedValue({ role: "admin" });
    sql.mockResolvedValueOnce([{ image_url: "/api/img/0123456789abcdef" }]).mockResolvedValueOnce([{ mime: "image/png", data: Buffer.from([1, 2, 3]) }]);
    const r = await call("p1");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("downloads an external photo link", async () => {
    admin.mockResolvedValue({ role: "admin" });
    sql.mockResolvedValueOnce([{ image_url: "https://brand.example/a.jpg" }]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([9]), { headers: { "content-type": "image/jpeg" } })));
    const r = await call("p1");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
  });

  it("rejects links that are not images", async () => {
    admin.mockResolvedValue({ role: "admin" });
    sql.mockResolvedValueOnce([{ image_url: "https://brand.example/page" }]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } })));
    expect((await call("p1")).status).toBe(502);
  });

  it("rejects non-http links and missing photos", async () => {
    admin.mockResolvedValue({ role: "admin" });
    sql.mockResolvedValueOnce([{ image_url: "file:///etc/passwd" }]);
    expect((await call("p1")).status).toBe(422);
    sql.mockResolvedValueOnce([{ image_url: null }]);
    expect((await call("p2")).status).toBe(404);
  });
});
