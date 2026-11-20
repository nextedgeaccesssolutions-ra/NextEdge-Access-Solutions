import { describe, expect, it } from "vitest";
import { inboxMetaKey } from "./inbox-meta";

describe("workspace-scoped inbox metadata keys", () => {
  it("preserves the NEAS team key namespace", () => {
    expect(inboxMetaKey(null, "m:thread-1")).toBe("m:thread-1");
  });

  it("isolates tenant metadata by workspace ID", () => {
    expect(inboxMetaKey(42, "m:thread-1")).toBe("ws42:m:thread-1");
    expect(inboxMetaKey(43, "m:thread-1")).not.toBe(inboxMetaKey(42, "m:thread-1"));
  });
});
