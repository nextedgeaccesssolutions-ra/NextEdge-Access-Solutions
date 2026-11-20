export const PAYMENT_SLIP_MAX_BYTES = 4 * 1024 * 1024;

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);

export function isPaymentSlipSizeValid(size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= PAYMENT_SLIP_MAX_BYTES;
}

/** Validate the declared MIME type against the file's actual signature. */
export function isValidPaymentSlip(type: string, bytes: Uint8Array): boolean {
  if (!bytes.length) return false;
  switch (type.toLowerCase()) {
    case "image/jpeg":
      return bytes.length >= 3 && startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return bytes.length >= 8 && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return bytes.length >= 12
        && startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
        && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case "application/pdf":
      return bytes.length >= 5 && startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    default:
      return false;
  }
}
