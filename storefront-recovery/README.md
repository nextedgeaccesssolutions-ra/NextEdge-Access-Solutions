# NEAS Open Store & Booking

Standalone storefront for equipment quotation requests, site-service booking, and browser meetings. It is intentionally separate from the NEAS CMS and the existing `neas-online-store` project.

## Included

- `#quote` deep link that opens the quotation workflow directly
- Persistent browser-local quote cart with product quantities in the submitted request
- Service and meeting request modes, optional browser geo-coordinates, input validation, consent, and a bot honeypot
- Server-side proxy to the existing Manus CMS submission inbox; no CMS credential is stored here
- CMS catalog override through the published **Store Catalog** global section, with a verified local fallback catalog
- Theme toggle, accessible controls, responsive mobile layout, PWA shell, service worker, sitemap, robots file, and security headers

## Local checks

```powershell
npm run lint
npm run check
npm test
npm run build
npm run dev
```

The local server uses a safe stub for form submissions. A Vercel deployment uses `/api/store-request` and delivers requests to the existing NEAS CMS inbox.

## Deployment

Deploy this directory as its own Vercel project. Keep it separate from `neas-online-store`; only assign a production domain after verifying the preview. The canonical URL is currently set to the user-supplied standalone site URL and should be updated if the final production domain differs.
