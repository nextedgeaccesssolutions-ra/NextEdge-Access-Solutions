import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  decrypt: vi.fn(),
  waThreads: vi.fn(),
}));

vi.mock("./db", () => ({ sql: mocks.sql }));
vi.mock("./social", () => ({ decrypt: mocks.decrypt }));
vi.mock("./whatsapp", () => ({ waReply: vi.fn(), waThreads: mocks.waThreads }));

import { loadInbox, sendReply } from "./inbox";

describe("loadInbox token decryption and Graph request deadlines", () => {
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

    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join("");
      if (query.includes("select id, external_id")) {
        return Promise.resolve([
          { id: 1, external_id: "page-bad", name: "Broken Page", token_enc: "bad-ciphertext" },
          { id: 2, external_id: "page-good", name: "Healthy Page", token_enc: "good-ciphertext" },
        ]);
      }
      return Promise.resolve([]);
    });
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

  it("sets an abort deadline on each Facebook Graph request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join("");
      if (query.includes("select id, external_id")) {
        return Promise.resolve([
          { id: 3, external_id: "page-timeout", name: "Timeout Test Page", token_enc: "valid-ciphertext" },
        ]);
      }
      return Promise.resolve([]);
    });
    mocks.decrypt.mockReturnValue("valid-page-token");

    const result = await loadInbox();

    expect(result.errors).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("sets an abort deadline on Facebook inbox replies", async () => {
    mocks.sql.mockResolvedValue([{ external_id: "page-1", token_enc: "valid-ciphertext" }]);
    mocks.decrypt.mockReturnValue("valid-page-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: "sent" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendReply(1, "message", "recipient-1", "Hello");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
