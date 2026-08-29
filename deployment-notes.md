# NEAS deployment and DNS notes

## Vercel production deployments

- Main NEAS frontend: `https://neas-content-platform.vercel.app/`
- Main legacy Vercel project updated with the new build: `https://neas-three.vercel.app/`
- Standalone store and booking site: `https://neas-store-booking.vercel.app/`
- Vercel team scope: `neas1` (display name `neas`)

The Vercel main frontend proxies `/api/*` and `/manus-storage/*` to the managed backend at `https://neascontent-bhnm8kjp.manus.space/`, preserving the secure CMS, database, OAuth, AI drafting, scheduled publishing, form submissions, and S3-backed media services.

## Namecheap domain state before migration

Domain: `nextedge-access-solutions.com`; nameservers: Namecheap BasicDNS (`dns1.registrar-servers.com`, `dns2.registrar-servers.com`).

Legacy web-host records found:

- A `@` → `166.117.120.15`
- A `@` → `162.159.143.30`
- A `@` → `172.66.3.26`
- A `www` → `104.18.26.246`
- A `www` → `104.18.27.246`

Email records preserved and not modified:

- MX `@` → `mx1-hosting.jellyfish.systems.` priority 5
- MX `@` → `mx2-hosting.jellyfish.systems.` priority 10
- MX `@` → `mx3-hosting.jellyfish.systems.` priority 20

Vercel recommends A `@` → `76.76.21.21`. The intended subdomain records are CNAME `www` → `cname.vercel-dns.com` and CNAME `store` → `cname.vercel-dns.com`.

## Namecheap DNS migration completed

The user confirmed replacing only web-host records and preserving MX/email. The legacy apex and `www` web-host A/CNAME records and the delegated `www` NS records were removed. The final web routing records are:

- A `@` → `76.76.21.21`
- CNAME `www` → `cname.vercel-dns.com.`
- CNAME `store` → `cname.vercel-dns.com.`

The `webmail` CNAME was preserved. All three MX records and existing SPF, DKIM, DMARC, verification, and other TXT records were preserved without modification.

## Vercel custom-domain status

- `nextedge-access-solutions.com` resolves to Vercel and redirects to `https://www.nextedge-access-solutions.com/`.
- `www.nextedge-access-solutions.com` resolves to Vercel and serves the main NEAS frontend.
- `store.nextedge-access-solutions.com` was added to the `neas-store-booking` Vercel production project after the Namecheap CNAME was created. TLS provisioning completed and the custom subdomain now serves the standalone NEAS Store & Booking experience over HTTPS.
- Browser verification confirmed `https://www.nextedge-access-solutions.com/` serves the CMS-backed NEAS public homepage and `https://store.nextedge-access-solutions.com/` serves the equipment quotation, service booking, and meeting-request application.
