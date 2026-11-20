import { applyRows, csvUrl, rowsFromCsv } from "./sheet";
import { getSetting, setSetting } from "./settings";
import { sql } from "./db";

export type SheetCfg = {
  url: string;
  priceSource: "markup" | "sheet";
  hideMissing: boolean;
  lastSync: string;
  lastResult: string;
  lastAttempt?: string;
  lastError?: string;
  connectionStatus?: "connected" | "error" | "not-tested";
  /** Re-read the sheet automatically once a day (default on). */
  autoSync?: boolean;
  lastAuto?: string;
};
export const DEF: SheetCfg = { url: "", priceSource: "markup", hideMissing: true, lastSync: "", lastResult: "", connectionStatus: "not-tested" };
export const MAX_CSV_BYTES = 2_000_000;

export async function readSheet(url: string) {
  const endpoint = csvUrl(url);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.1" },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Google Sheets did not respond within 15 seconds. Try again."
      : "Could not reach Google Sheets. Check the connection and try again.";
    throw new Error(message);
  }
  if (!response.ok) throw new Error("Google Sheets returned HTTP " + response.status + ". Check that the spreadsheet is shared with the required access and that the selected tab still exists.");
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const text = await response.text();
  if (contentType.includes("text/html") || /<!doctype html|<html[\s>]/i.test(text.slice(0, 500))) {
    throw new Error("Google returned a sign-in or access page instead of CSV. Set General access to Anyone with the link – Viewer, or upload a CSV export.");
  }
  if (!text.trim()) throw new Error("Google returned an empty worksheet. Confirm the selected tab (gid) contains data.");
  if (new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES) throw new Error("The worksheet export exceeds the 2 MB import limit. Reduce the exported data or use a smaller worksheet.");
  return text;
}


/** Daily automatic import from the saved Google Sheet. Keeps admin overrides (handled in applyRows).
 *  Never hides products when the sheet comes back with far fewer rows than the store has (likely a bad export). */
export async function autoSyncSheet(): Promise<{ skipped?: string; result?: string; error?: string }> {
  const cfg = await getSetting<SheetCfg>("sheet", DEF);
  if (!cfg.url) return { skipped: "no sheet link saved" };
  if (cfg.autoSync === false) return { skipped: "auto-update turned off" };
  cfg.lastAttempt = new Date().toISOString();
  try {
    const rows = rowsFromCsv(await readSheet(cfg.url));
    if (!rows.length) throw new Error("The sheet returned no product rows.");
    const [{ active }] = await sql`select count(*)::int as active from products where active`;
    const safeHide = cfg.hideMissing && rows.length >= active * 0.5;
    const r = await applyRows(rows, safeHide);
    cfg.lastSync = cfg.lastAuto = new Date().toISOString();
    cfg.lastResult = "Auto: " + r.total + " products: " + r.added + " new, " + r.updated + " updated, " + r.hidden + " hidden"
      + (cfg.hideMissing && !safeHide ? " (hiding skipped: sheet had far fewer rows than the store)" : "");
    cfg.lastError = "";
    cfg.connectionStatus = "connected";
    await setSetting("sheet", cfg);
    return { result: cfg.lastResult };
  } catch (e) {
    cfg.lastError = "Auto-update: " + (e instanceof Error ? e.message : String(e));
    cfg.connectionStatus = "error";
    await setSetting("sheet", cfg);
    return { error: cfg.lastError };
  }
}
