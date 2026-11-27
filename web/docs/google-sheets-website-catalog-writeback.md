# NEAS Website Catalog — Google Sheets writeback

This additive export does not change the existing supplier worksheet or supplier-sheet-to-website importer.

## Destination schema

The integration creates/uses a separate **NEAS Website Catalog** tab with Product ID, SKU, Product Name, Category, Dealer Price (PHP), Selling Price (PHP, VAT), Image URL, Description, Technical Specifications, Specs URL, Active, and Last Synced (UTC).

Products are upserted by SKU; Product ID is the fallback when SKU is blank. Existing rows absent from a payload are retained. Inactive products are exported with Active = FALSE. No rows are deleted. Duplicate keys or mismatched headers stop the export.

## One-time Apps Script setup

1. Open the existing spreadsheet using an account with edit access.
2. Open Extensions → Apps Script and create a dedicated project.
3. Copy `web/scripts/neas-website-catalog-writeback.gs` into Code.gs.
4. In Project Settings → Script Properties, add:
   - `NEAS_SPREADSHEET_ID`: spreadsheet ID from the URL (between /d/ and /edit).
   - `NEAS_CATALOG_TAB`: `NEAS Website Catalog`.
   - `NEAS_WRITEBACK_SECRET`: a newly generated random secret of at least 40 characters. Do not reuse a password or API key.
5. Save, then Deploy → New deployment → Web app.
6. Set Execute as to the script owner. Choose the narrowest access compatible with server-to-server requests. If anonymous access is required, the high-entropy secret remains mandatory on every request.
7. Authorize the requested Sheets permissions as the spreadsheet owner and deploy. Copy the /exec Web App URL.

## Vercel environment variables

Add these to the existing NEAS website project:
- `GOOGLE_SHEETS_WRITEBACK_URL`: deployed Apps Script /exec URL.
- `GOOGLE_SHEETS_WRITEBACK_SECRET`: the exact same secret stored in Script Properties.

Keep both values server-side. Never use a NEXT_PUBLIC_ prefix, commit the values, or put them in browser code. Redeploy after adding them.

## Operation

- Admin → Google Sheet updater → Sync website catalog now performs an authenticated export.
- The existing daily production cron exports automatically after the supplier-sheet import, but only when both environment variables are present.
- The supplier importer continues using its existing configured worksheet and existing admin-override rules.
- Verify the first export by checking sample SKUs, prices, image URLs, descriptions, specifications, and Active status in the destination tab.

## Security and operational notes

The Apps Script runs with the script owner's Google permissions. The shared secret is required for every request and stored only in Script Properties and Vercel server environment variables. The script is restricted to the configured spreadsheet ID and exact destination tab name. It validates payload shape, row count, duplicate keys, and destination headers before writing. A script lock prevents overlapping exports. Initial deployment and Google authorization must be completed by an account authorized to edit the spreadsheet.
