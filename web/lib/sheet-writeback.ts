import { listProducts } from "./db";
import { getSetting, setSetting } from "./settings";

export const WEBSITE_CATALOG_TAB = "NEAS Website Catalog";
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nextedge-access-solutions.com").replace(/\/$/, "");

export type WebsiteCatalogSyncStatus = {
  lastAttempt: string; lastSync: string; lastResult: string; lastError: string;
  connectionStatus: "connected" | "error" | "not-configured";
};
type AppsScriptResponse = { ok?: boolean; error?: string; updated?: number; added?: number; total?: number };

function imageUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("/")) return SITE_ORIGIN + value;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : ""; }
  catch { return ""; }
}

export async function syncWebsiteCatalog(): Promise<{ skipped?: string; result?: string; error?: string }> {
  const endpoint = process.env.GOOGLE_SHEETS_WRITEBACK_URL || "";
  const secret = process.env.GOOGLE_SHEETS_WRITEBACK_SECRET || "";
  if (!endpoint || !secret) return { skipped: "Google Sheets writeback is not configured." };
  let parsed: URL;
  try { parsed = new URL(endpoint); } catch { return { error: "GOOGLE_SHEETS_WRITEBACK_URL must be a valid HTTPS Apps Script web-app URL." }; }
  if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.includes("/macros/s/") || !parsed.pathname.endsWith("/exec")) {
    return { error: "Writeback endpoint must be a deployed HTTPS Google Apps Script /macros/s/.../exec URL." };
  }
  if (secret.length < 32) return { error: "GOOGLE_SHEETS_WRITEBACK_SECRET must be at least 32 characters." };
  const attemptedAt = new Date().toISOString();
  try {
    const products = await listProducts(true);
    const rows = products.map((p) => ({
      productId: String(p.id), sku: String(p.code || ""), name: String(p.name || ""),
      category: String(p.category || ""), dealerPrice: Number(p.dealer_price || 0),
      sellingPrice: Number(p.price || 0), imageUrl: imageUrl(p.image || ""),
      description: String(p.description || ""), technicalSpecifications: String(p.features || ""),
      specsUrl: String(p.specs_url || ""), active: Boolean(p.active), lastSynced: attemptedAt,
    }));
    if (rows.length > 5000) throw new Error("Safety stop: catalog exceeds the 5,000-product writeback limit.");
    const response = await fetch(endpoint, {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ secret, rows }), cache: "no-store", signal: AbortSignal.timeout(25_000),
    });
    const responseText = await response.text();
    if (!response.ok) throw new Error("Google Apps Script returned HTTP " + response.status + ".");
    let data: AppsScriptResponse;
    try { data = JSON.parse(responseText) as AppsScriptResponse; }
    catch { throw new Error("Google Apps Script returned a non-JSON response. Check deployment access and execution logs."); }
    if (!data.ok) throw new Error(data.error || "Google Apps Script rejected the catalog update.");
    const result = (data.total ?? rows.length) + " products exported to " + WEBSITE_CATALOG_TAB + " (" + (data.added ?? 0) + " added, " + (data.updated ?? 0) + " updated).";
    await setSetting("sheet_writeback", { lastAttempt: attemptedAt, lastSync: attemptedAt, lastResult: result, lastError: "", connectionStatus: "connected" } satisfies WebsiteCatalogSyncStatus);
    return { result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Google Sheets writeback error.";
    await setSetting("sheet_writeback", { lastAttempt: attemptedAt, lastSync: "", lastResult: "", lastError: message, connectionStatus: "error" } satisfies WebsiteCatalogSyncStatus);
    return { error: message };
  }
}

/** The shared cron may be pinged every few minutes; throttle outbound writes to once per 24 hours. */
export async function autoSyncWebsiteCatalog() {
  if (!process.env.GOOGLE_SHEETS_WRITEBACK_URL || !process.env.GOOGLE_SHEETS_WRITEBACK_SECRET) return { skipped: "Google Sheets writeback is not configured." };
  const status = await getWebsiteCatalogSyncStatus();
  const lastAttempt = Date.parse(status.lastAttempt || "");
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 24 * 60 * 60 * 1000) {
    return { skipped: "Website catalog export already attempted within the last 24 hours." };
  }
  return syncWebsiteCatalog();
}

export async function getWebsiteCatalogSyncStatus(): Promise<WebsiteCatalogSyncStatus> {
  return getSetting<WebsiteCatalogSyncStatus>("sheet_writeback", {
    lastAttempt: "", lastSync: "", lastResult: "", lastError: "", connectionStatus: "not-configured",
  });
}
