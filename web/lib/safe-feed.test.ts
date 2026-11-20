import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { validatePublicFeedUrl } from "./safe-feed";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

const mockedLookup = vi.mocked(lookup);

describe("public RSS feed URL validation", () => {
  beforeEach(() => mockedLookup.mockReset());

  it("accepts a public HTTPS hostname with globally routable DNS", async () => {
    mockedLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never);
    const result = await validatePublicFeedUrl("https://feeds.example.org/rss.xml");
    expect(result.url.hostname).toBe("feeds.example.org");
    expect(result.address).toBe("8.8.8.8");
  });

  it("rejects HTTP, credentials and non-standard ports", async () => {
    await expect(validatePublicFeedUrl("http://feeds.example.org/rss")).rejects.toThrow("public HTTPS");
    await expect(validatePublicFeedUrl("https://user:pass@feeds.example.org/rss")).rejects.toThrow("public HTTPS");
    await expect(validatePublicFeedUrl("https://feeds.example.org:8443/rss")).rejects.toThrow("public HTTPS");
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects localhost, private suffixes and IP-literal hosts", async () => {
    await expect(validatePublicFeedUrl("https://localhost/rss")).rejects.toThrow("Private, local");
    await expect(validatePublicFeedUrl("https://service.internal/rss")).rejects.toThrow("Private, local");
    await expect(validatePublicFeedUrl("https://127.0.0.1/rss")).rejects.toThrow("Private, local");
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects hostnames that resolve to private, loopback or reserved addresses", async () => {
    mockedLookup.mockResolvedValue([{ address: "10.0.0.12", family: 4 }] as never);
    await expect(validatePublicFeedUrl("https://feeds.example.org/rss")).rejects.toThrow("private or reserved");
    mockedLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }, { address: "169.254.169.254", family: 4 }] as never);
    await expect(validatePublicFeedUrl("https://feeds.example.org/rss")).rejects.toThrow("private or reserved");
  });
});
