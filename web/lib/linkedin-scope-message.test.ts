import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ sql: async () => [] }));
vi.mock("./social-video", () => ({
  googleAuthUrl: () => "", tiktokAuthUrl: () => "", connectGoogle: async () => ({}),
  connectTikTok: async () => ({}), publishVideoPlatform: async () => ({}),
}));

const { linkedinScopeErrorMessage } = await import("./social");

const PAGES_ID = "LINKEDIN_PAGES_CLIENT_ID";
afterEach(() => { delete process.env[PAGES_ID]; });

describe("LinkedIn Company Page scope refusal message", () => {
  it("tells an operator who has not set the Pages app up to create it", () => {
    const msg = linkedinScopeErrorMessage();
    expect(msg).toContain("create a second app");
    expect(msg).toContain(PAGES_ID);
  });

  it("stops telling them to create it once the Pages app is configured", () => {
    process.env[PAGES_ID] = "781b51dxbkm1q4";
    const msg = linkedinScopeErrorMessage();
    expect(msg).not.toContain("create a second app");
    expect(msg).not.toContain("LINKEDIN_PAGES_CLIENT_SECRET");
    expect(msg).toMatch(/nothing further to add/i);
  });

  it("names the app that was actually refused, so it can be found in the portal", () => {
    process.env[PAGES_ID] = "781b51dxbkm1q4";
    expect(linkedinScopeErrorMessage()).toContain("781b51dxbkm1q4");
  });

  it("points at the two real causes: product approval and the redirect URL", () => {
    process.env[PAGES_ID] = "781b51dxbkm1q4";
    const msg = linkedinScopeErrorMessage();
    expect(msg).toMatch(/Community Management API/);
    expect(msg).toMatch(/redirect/i);
  });

  it("reassures that the profile connection is unaffected either way", () => {
    expect(linkedinScopeErrorMessage()).toContain("profile connection still works");
    process.env[PAGES_ID] = "781b51dxbkm1q4";
    expect(linkedinScopeErrorMessage()).toContain("profile connection still works");
  });

  it("treats a quoted or padded env value as configured, matching env() elsewhere", () => {
    process.env[PAGES_ID] = '  "781b51dxbkm1q4"  ';
    const msg = linkedinScopeErrorMessage();
    expect(msg).toContain("781b51dxbkm1q4");
    expect(msg).not.toContain('"781b51dxbkm1q4"');
    expect(msg).not.toContain("create a second app");
  });

  it("treats an empty or whitespace value as not configured", () => {
    process.env[PAGES_ID] = "   ";
    expect(linkedinScopeErrorMessage()).toContain("create a second app");
  });
});
