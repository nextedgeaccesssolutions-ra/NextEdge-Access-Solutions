import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  decrypt: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

vi.mock("./db", () => ({ sql: mocks.sql }));
vi.mock("./social", () => ({ decrypt: mocks.decrypt }));
vi.mock("./settings", () => ({ getSetting: mocks.getSetting, setSetting: mocks.setSetting }));

import { loadInsights } from "./insights";

describe("loadInsights token decryption", () => {
  beforeEach(() => {
    mocks.sql.mockReset();
    mocks.decrypt.mockReset();
    mocks.getSetting.mockReset();
    mocks.setSetting.mockReset();
    mocks.getSetting.mockResolvedValue({ none: true });
    mocks.setSetting.mockResolvedValue(undefined);
  });

  it("returns a page-level error instead of failing the whole report for an unreadable token", async () => {
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join("");
      if (query.includes("select external_id, name, token_enc")) {
        return Promise.resolve([
          { external_id: "page-bad", name: "Broken Page", token_enc: "bad-ciphertext" },
        ]);
      }
      return Promise.resolve([]);
    });
    mocks.decrypt.mockImplementation(() => {
      throw new Error("Unsupported state or unable to authenticate data");
    });

    const result = await loadInsights(28, true);

    expect(result.pages).toEqual([
      {
        page: "Broken Page",
        followers: null,
        views: null,
        reached: null,
        engagements: null,
        daily: [],
        posts: [],
        errors: ["Saved Facebook token could not be decrypted. Reconnect this Page to restore analytics access."],
      },
    ]);
    expect(mocks.setSetting).toHaveBeenCalledOnce();
  });
});
