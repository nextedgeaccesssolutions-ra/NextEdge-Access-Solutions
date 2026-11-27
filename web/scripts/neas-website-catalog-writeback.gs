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
// Prevent product text from being interpreted as a spreadsheet formula.
function safeCell_(value, maxLength) {
  const text = String(value == null ? "" : value).slice(0, maxLength);
  const first = text.charAt(0);
  return ["=", "+", "-", "@", "\t", "\r"].indexOf(first) >= 0 ? "'" + text : text;
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
        safeCell_(r.productId, 120), safeCell_(r.sku || "", 100),
        safeCell_(r.name, 200), safeCell_(r.category || "", 120),
        Number(r.dealerPrice) || 0, Number(r.sellingPrice) || 0,
        safeCell_(r.imageUrl || "", 1000), safeCell_(r.description || "", 5000),
        safeCell_(r.technicalSpecifications || "", 5000), safeCell_(r.specsUrl || "", 1000),
        Boolean(r.active), safeCell_(r.lastSynced || "", 80)
      ];
    });
    const payloadKeys = {};
    rows.forEach(function (r) {
      const key = r[1] ? "sku:" + String(r[1]).replace(/^'/, "").toLowerCase() : "id:" + String(r[0]).replace(/^'/, "");
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
      const sku = String(r[1] || "").replace(/^'/, "").trim();
      const productId = String(r[0] || "").replace(/^'/, "").trim();
      if (!productId) return;
      const key = sku ? "sku:" + sku.toLowerCase() : "id:" + productId;
      if (index[key] !== undefined) throw new Error("Duplicate key already exists in NEAS Website Catalog: " + key);
      index[key] = i;
    });

    let updated = 0, added = 0;
    rows.forEach(function (r) {
      const sku = String(r[1]).replace(/^'/, "");
      const productId = String(r[0]).replace(/^'/, "");
      const key = sku ? "sku:" + sku.toLowerCase() : "id:" + productId;
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
