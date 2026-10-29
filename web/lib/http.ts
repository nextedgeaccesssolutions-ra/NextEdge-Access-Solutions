import { NextResponse } from "next/server";
export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
export function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length && t.length <= max ? t : null;
}
export const BANK = {
  accountName: "NextEdge Access Solutions. NEAS OPC",
  accountNumber: "0000078251151",
  swift: "SETCPHMMXXX",
  bank: "Security Bank Corporation",
};
