import { describe, expect, it } from "vitest";
import { quoteNotificationCopy } from "../client/src/components/siteNotificationCopy";

describe("quote notification copy", () => {
  it("provides an explicit success message", () => {
    expect(quoteNotificationCopy.success.tone).toBe("success");
    expect(quoteNotificationCopy.success.title).toBe("Enquiry received");
    expect(quoteNotificationCopy.success.message).toContain("contact you shortly");
  });

  it("provides an actionable error message", () => {
    expect(quoteNotificationCopy.error.tone).toBe("error");
    expect(quoteNotificationCopy.error.title).toBe("Could not send enquiry");
    expect(quoteNotificationCopy.error.message).toContain("try again");
  });
});
