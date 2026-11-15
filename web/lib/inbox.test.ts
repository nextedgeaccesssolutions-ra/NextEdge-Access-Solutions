import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  decrypt: vi.fn(),
  waThreads: vi.fn(),
}));

vi.mock("./db", () => ({ sql: mocks.sql }));
vi.mock("./social", () => ({ decrypt: mocks.decrypt }));
vi.mock("./whatsapp", () => ({ waReply: vi.fn(), waThreads: mocks.waThreads }));

import { loadInbox } from "./inbox";

describe("loadInbox token decryption", () => {
  beforeEach(() => {
    mocks.sql.mockReset();
    mocks.decrypt.mockReset();
    mocks.waThreads.mockReset();
    mocks.waThreads.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("continues loading other Pages when one saved token cannot be decrypted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    mocks.sql
      .mockResolvedValueOnce([
        { id: 1, external_id: "page-bad", name: "Broken Page", token_enc: "bad-ciphertext" },
        { id: 2, external_id: "page-good", name: "Healthy Page", token_enc: "good-ciphertext" },
      ])
      .mockResolvedValueOnce([]);
    mocks.decrypt.mockImplementation((blob: string) => {
      if (blob === "bad-ciphertext") throw new Error("Unsupported state or unable to authenticate data");
      return "valid-page-token";
    });

    const result = await loadInbox();

    expect(result.errors).toEqual([
      "Broken Page token could not be decrypted. Reconnect this Facebook Page to restore inbox access.",
    ]);
    expect(result.threads).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
