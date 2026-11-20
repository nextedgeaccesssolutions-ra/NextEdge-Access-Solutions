import { describe, expect, it } from "vitest";
import { validateContactInput } from "./contact";

describe("website contact form validation", () => {
  it("accepts and normalizes a valid business enquiry", () => {
    const result = validateContactInput({
      name: "  Junrey Granaderos  ",
      company: "NEAS",
      email: "SALES@EXAMPLE.COM",
      phone: "+63 991 426 5886",
      service: "Rope Access",
      message: "Please send a quotation for our facade project.",
    });
    expect(result.data?.name).toBe("Junrey Granaderos");
    expect(result.data?.email).toBe("sales@example.com");
    expect(result.data?.service).toBe("Rope Access");
  });

  it("rejects missing fields, invalid email and short messages", () => {
    expect(validateContactInput({}).error).toContain("name, email");
    expect(validateContactInput({ name: "A", email: "not-an-email", message: "A sufficiently long message" }).error).toContain("valid email");
    expect(validateContactInput({ name: "A", email: "a@example.com", message: "short" }).error).toContain("10 characters");
  });

  it("rejects non-object payloads and strips control characters", () => {
    expect(validateContactInput(null).error).toBe("Invalid enquiry.");
    const result = validateContactInput({ name: "A\u0000B", email: "a@example.com", message: "This message is long enough." });
    expect(result.data?.name).toBe("A B");
  });
});
