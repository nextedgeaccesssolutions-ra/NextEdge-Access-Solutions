import { describe, expect, it } from "vitest";
import { isPaymentSlipSizeValid, isValidPaymentSlip, PAYMENT_SLIP_MAX_BYTES } from "./payment-slip";

describe("payment slip validation", () => {
  it("accepts JPEG, PNG, WebP and PDF signatures", () => {
    expect(isValidPaymentSlip("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe(true);
    expect(isValidPaymentSlip("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isValidPaymentSlip("image/webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe(true);
    expect(isValidPaymentSlip("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
  });

  it("rejects MIME spoofing and active SVG uploads", () => {
    expect(isValidPaymentSlip("image/png", new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(false);
    expect(isValidPaymentSlip("image/svg+xml", new TextEncoder().encode("<svg/>"))).toBe(false);
    expect(isValidPaymentSlip("application/pdf", new TextEncoder().encode("not a PDF"))).toBe(false);
  });

  it("enforces a 4 MB file cap below Vercel's 4.5 MB function payload ceiling", () => {
    expect(isPaymentSlipSizeValid(1)).toBe(true);
    expect(isPaymentSlipSizeValid(PAYMENT_SLIP_MAX_BYTES)).toBe(true);
    expect(isPaymentSlipSizeValid(PAYMENT_SLIP_MAX_BYTES + 1)).toBe(false);
    expect(isPaymentSlipSizeValid(0)).toBe(false);
    expect(isPaymentSlipSizeValid(-1)).toBe(false);
    expect(isPaymentSlipSizeValid(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
