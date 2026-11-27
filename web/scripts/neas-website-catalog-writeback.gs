/**
 * NEAS Website Catalog writeback endpoint.
 * Script Properties required:
 *   NEAS_WRITEBACK_SECRET (40+ random characters)
 *   NEAS_SPREADSHEET_ID (existing spreadsheet ID)
 *   NEAS_CATALOG_TAB = NEAS Website Catalog
 * Deploy as a Web App executing as the script owner.
 */
const NEAS_HEADERS = [
  "Product ID", "SKU", "Product Name", "Category", "Dealer Price (PHP)",
  "Selling Price (PHP, VAT)", "Image URL", "Description",
  "Technical Specifications", "Specs URL", "Active", "Last Synced (UTC)"
];
const NEAS_TAB = "NEAS Website Catalog";
const NEAS_MAX_ROWS = 5000;

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function constantTimeEqual_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: "A catalog sync is already running. Retry shortly." });
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty("NEAS_WRITEBACK_SECRET") || "";
    const spreadsheetId = props.getProperty("NEAS_SPREADSHEET_ID") || "";
    const tabName = props.getProperty("NEAS_CATALOG_TAB") || NEAS_TAB;
    if (expectedSecret.length < 32 || !spreadsheetId) return json_({ ok: false, error: "Apps Script setup is incomplete." });
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!constantTimeEqual_(String(body.secret || ""), expectedSecret)) return json_({ ok: false, error: "Unauthorized." });
    if (tabName !== NEAS_TAB) return json_({ ok: false, error: "Configured tab name is not permitted." });
    if (!Array.isArray(body.rows) || body.rows.length > NEAS_MAX_ROWS) return json_({ ok: false, error: "Invalid catalog payload or row limit exceeded." });

    const rows = body.rows.map(function (r) {
      if (!r || typeof r.productId !== "string" || !r.productId || typeof r.name !== "string" || !r.name) throw new Error("Every product requires a Product ID and Product Name.");
      return [
        String(r.productId).slice(0, 120), String(r.sku || "").slice(0, 100),
        String(r.name).slice(0, 200), String(r.category || "").slice(0, 120),
        Number(r.dealerPrice) || 0, Number(r.sellingPrice) || 0,
        String(r.imageUrl || "").slice(0, 1000), String(r.description || "").slice(0, 5000),
        String(r.technicalSpecifications || "").slice(0, 5000), String(r.specsUrl || "").slice(0, 1000),
        Boolean(r.active), String(r.lastSynced || "")
      ];
    });
    const payloadKeys = {};
    rows.forEach(function (r) {
      const key = r[1] ? "sku:" + r[1].toLowerCase() : "id:" + r[0];
      if (payloadKeys[key]) throw new Error("Duplicate SKU/Product ID in website payload: " + key);
      payloadKeys[key] = true;
    });

    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) sheet = ss.insertSheet(tabName);
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) sheet.getRange(1, 1, 1, NEAS_HEADERS.length).setValues([NEAS_HEADERS]);
    else {
      const headers = sheet.getRange(1, 1, 1, NEAS_HEADERS.length).getDisplayValues()[0];
      for (let i = 0; i < NEAS_HEADERS.length; i++) {
        if (headers[i] !== NEAS_HEADERS[i]) throw new Error("NEAS Website Catalog headers do not match. No data was changed.");
      }
    }

    const count = Math.max(0, sheet.getLastRow() - 1);
    const existing = count ? sheet.getRange(2, 1, count, NEAS_HEADERS.length).getValues() : [];
    const index = {};
    existing.forEach(function (r, i) {
      const sku = String(r[1] || "").trim(), productId = String(r[0] || "").trim();
      if (!productId) return;
      const key = sku ? "sku:" + sku.toLowerCase() : "id:" + productId;
      if (index[key] !== undefined) throw new Error("Duplicate key already exists in NEAS Website Catalog: " + key);
      index[key] = i;
    });

    let updated = 0, added = 0;
    rows.forEach(function (r) {
      const key = r[1] ? "sku:" + r[1].toLowerCase() : "id:" + r[0];
      if (index[key] !== undefined) { existing[index[key]] = r; updated++; }
      else { index[key] = existing.length; existing.push(r); added++; }
    });
    if (existing.length) sheet.getRange(2, 1, existing.length, NEAS_HEADERS.length).setValues(existing);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, NEAS_HEADERS.length).setFontWeight("bold");
    return json_({ ok: true, tab: tabName, total: rows.length, added: added, updated: updated });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : "Unexpected writeback error." });
  } finally { lock.releaseLock(); }
}
