import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ sql: { begin: vi.fn() } }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-password") } }));

import { sql } from "./db";
import { useResetToken } from "./reset";

const beginMock = vi.mocked(sql.begin);

describe("password reset token consumption", () => {
  beforeEach(() => {
    beginMock.mockReset();
  });

  it("claims and consumes a valid token in one transaction", async () => {
    const tx = vi.fn(async (parts: TemplateStringsArray) => {
      const query = parts.join(" ");
      if (query.includes("update password_resets")) return [{ user_id: 7 }];
      if (query.includes("select role from users")) return [{ role: "customer" }];
      return [];
    });
    beginMock.mockImplementation(((callback: (tx: unknown) => Promise<unknown>) =>
      Promise.resolve(callback(tx as unknown))) as never);

    const result = await useResetToken("A".repeat(43), "StrongPassword123");
    expect(result).toEqual({ ok: true, role: "customer" });
    expect(beginMock).toHaveBeenCalledTimes(1);
    expect(tx).toHaveBeenCalledTimes(4);
    expect(tx.mock.calls[0][0].join(" ")).toContain("expires_at > now()");
  });

  it("rejects a token that another request already consumed", async () => {
    const tx = vi.fn(async () => []);
    beginMock.mockImplementation(((callback: (tx: unknown) => Promise<unknown>) =>
      Promise.resolve(callback(tx as unknown))) as never);

    const result = await useResetToken("B".repeat(43), "StrongPassword123");
    expect(result).toEqual({ error: "This reset link is invalid, expired or already used. Request a new one." });
    expect(tx).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed tokens before starting a transaction", async () => {
    const result = await useResetToken("bad", "StrongPassword123");
    expect(result).toEqual({ error: "This reset link is invalid." });
    expect(beginMock).not.toHaveBeenCalled();
  });
});
