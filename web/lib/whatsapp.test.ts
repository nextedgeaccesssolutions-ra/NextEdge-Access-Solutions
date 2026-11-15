import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));

vi.mock("./db", () => ({ sql: mocks.sql }));

import { waReply } from "./whatsapp";

const saved = { ...process.env };

describe("WhatsApp Cloud API request timeout", () => {
  beforeEach(() => {
    process.env = {
      ...saved,
      WHATSAPP_TOKEN: "test-token",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
    };
    mocks.sql.mockReset();
  });

  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("sets an abort deadline on WhatsApp replies", async () => {
    mocks.sql.mockResolvedValueOnce([{ t: new Date() }]).mockResolvedValueOnce([]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await waReply("639123456789", "Hello");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
