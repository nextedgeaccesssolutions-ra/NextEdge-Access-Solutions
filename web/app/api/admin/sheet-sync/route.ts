import { requireAdmin } from "@/lib/admin";
import { applyRows, fingerprintCsv, rowsFromCsv } from "@/lib/sheet";
import { DEF, MAX_CSV_BYTES, readSheet, type SheetCfg } from "@/lib/sheet-source";
import { getSetting, setSetting } from "@/lib/settings";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const cfg = await getSetting<SheetCfg>("sheet", DEF);
  if (typeof body.url === "string") cfg.url = body.url.trim().slice(0, 500);
  if (body.priceSource === "markup" || body.priceSource === "sheet") cfg.priceSource = body.priceSource;
  if (typeof body.hideMissing === "boolean") cfg.hideMissing = body.hideMissing;
  if (typeof body.autoSync === "boolean") cfg.autoSync = body.autoSync;

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
