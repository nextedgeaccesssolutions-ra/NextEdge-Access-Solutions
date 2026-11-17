import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn(async () => ({ id: "admin", role: "admin" }));
const originalToken = process.env.CLOUDFLARE_API_TOKEN;
const originalZoneId = process.env.CLOUDFLARE_ZONE_ID;

vi.mock("@/lib/admin", () => ({ requireAdmin }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      }),
  },
}));

describe("Cloudflare Analytics API metric semantics", () => {
  beforeEach(() => {
    vi.resetModules();
    requireAdmin.mockClear();
    process.env.CLOUDFLARE_API_TOKEN = "test-cloudflare-token";
    process.env.CLOUDFLARE_ZONE_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = originalToken;
    if (originalZoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID;
    else process.env.CLOUDFLARE_ZONE_ID = originalZoneId;
    vi.unstubAllGlobals();
  });

  it("exposes Cloudflare visits as visits, not page views", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  httpRequestsAdaptiveGroups: [
                    {
                      count: 7,
                      dimensions: { datetimeHour: "2026-11-17T06:00:00Z" },
                      sum: { edgeResponseBytes: 1024, visits: 3 },
                    },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totals).toMatchObject({ requests: 7, bytes: 1024, visits: 3 });
    expect(body.totals).not.toHaveProperty("pageViews");
    expect(body.series[0]).toMatchObject({ visits: 3 });
    expect(body.series[0]).not.toHaveProperty("pageViews");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});