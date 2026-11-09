import { requireAdmin } from "@/lib/admin";
import { applyRows, csvUrl, fingerprintCsv, rowsFromCsv } from "@/lib/sheet";
import { getSetting, setSetting } from "@/lib/settings";
import { bad, ok } from "@/lib/http";

type SheetCfg = {
  url: string;
  priceSource: "markup" | "sheet";
  hideMissing: boolean;
  lastSync: string;
  lastResult: string;
  lastAttempt?: string;
  lastError?: string;
  connectionStatus?: "connected" | "error" | "not-tested";
};
const DEF: SheetCfg = { url: "", priceSource: "markup", hideMissing: true, lastSync: "", lastResult: "", connectionStatus: "not-tested" };
const MAX_CSV_BYTES = 2_000_000;

async function readSheet(url: string) {
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

export async function POST(req: Request) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const cfg = await getSetting<SheetCfg>("sheet", DEF);
  if (typeof body.url === "string") cfg.url = body.url.trim().slice(0, 500);
  if (body.priceSource === "markup" || body.priceSource === "sheet") cfg.priceSource = body.priceSource;
  if (typeof body.hideMissing === "boolean") cfg.hideMissing = body.hideMissing;

  if (body.action === "save") {
    await setSetting("sheet", cfg);
    return ok(cfg);
  }
  if (body.action !== "preview" && body.action !== "sync") return bad("Choose Preview or Update store.");
  cfg.lastAttempt = new Date().toISOString();

  try {
    let csv: string;
    if (typeof body.csv === "string" && body.csv.trim()) {
      csv = body.csv;
      if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) return bad("Pasted CSV exceeds the 2 MB import limit.");
    } else {
      if (!cfg.url) return bad("Add your Google Sheet link first.");
      csv = await readSheet(cfg.url);
    }

    const sourceHash = fingerprintCsv(csv);
    const rows = rowsFromCsv(csv);
    if (body.action === "preview") {
      cfg.connectionStatus = "connected";
      cfg.lastError = "";
      await setSetting("sheet", cfg);
      return ok({ preview: rows.slice(0, 15), total: rows.length, sourceHash, checkedAt: cfg.lastAttempt });
    }

    if (typeof body.sourceHash !== "string" || body.sourceHash !== sourceHash) {
      return bad("The spreadsheet changed after your preview. Run Preview again and review the updated products before synchronizing.", 409);
    }

    const result = await applyRows(rows, cfg.hideMissing);
    cfg.lastSync = new Date().toISOString();
    cfg.lastResult = result.total + " products: " + result.added + " new, " + result.updated + " updated, " + result.hidden + " hidden";
    cfg.lastError = "";
    cfg.connectionStatus = "connected";
    await setSetting("sheet", cfg);
    return ok({ ...result, cfg });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Google Sheets synchronization error.";
    cfg.lastError = message;
    cfg.connectionStatus = "error";
    await setSetting("sheet", cfg);
    return bad(message, 400);
  }
}
