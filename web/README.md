# NEAS website + Online Store (Vercel)

Standalone Next.js app for the NEAS homepage, online store, customer accounts and admin panel.

## Rybbit analytics integration

The Admin panel includes a server-side Rybbit analytics proxy. The browser calls only `/api/admin/rybbit`; the route verifies the existing NEAS admin session and calls Rybbit with a server-side Bearer token. The API key is never returned to the browser.

Set these Vercel environment variables for Production (and Preview only if required):

- `RYBBIT_BASE_URL`: `https://analytics.nextedge-access-solutions.com`
- `RYBBIT_SITE_ID`: Site ID from the Rybbit site dashboard/API Playground.
- `RYBBIT_API_KEY`: Organization API key with only `analytics:read` scope. Create under Rybbit Settings → Organization → Organization API Keys.

Mark the key as Sensitive in Vercel and redeploy. Then open NEAS Admin → Analytics → Connect to Rybbit. It loads the last 30 days of overview metrics.

Never prefix the key with `NEXT_PUBLIC_`, commit it to Git, or place it in client-side code. Rybbit API documentation: https://rybbit.com/docs/api/getting-started and https://rybbit.com/docs/api/overview/overview.

## Setup

1. **Vercel → Add New → Project**, import `nextedgeaccesssolutions-ra/NextEdge-Access-Solutions`,
   branch `vercel-rebuild`, **Root Directory `web`**. Framework: Next.js (auto).
2. **Storage → Create Database → Neon (Postgres)**, connect it to the project. This sets `DATABASE_URL`.
3. **Settings → Environment Variables**: `SESSION_SECRET` (random, 32+ chars), `CRON_SECRET` (a separate random 32+ character secret for scheduled publishing), `CONFIG_ENCRYPTION_KEY` (a separate 32-byte key encoded as 64 hex characters; generate with `openssl rand -hex 32`), `TOKEN_ENCRYPTION_KEY` (another separate 32-byte key for social OAuth tokens; generate with `openssl rand -hex 32`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. **Redeploy.** The build creates the tables, loads the 99-item KH Trading catalog (once), and creates the admin.
5. **Settings → Domains**: add `nextedge-access-solutions.com` and `www.nextedge-access-solutions.com`.
6. **Namecheap → Advanced DNS** (web records only — leave MX/email/TXT records untouched):
   `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`.

## Notes
- Admin-managed integration credentials are encrypted with AES-256-GCM using the dedicated `CONFIG_ENCRYPTION_KEY`; do not reuse the database, session, or cron secret. Existing legacy ciphertext remains readable during migration only when the original database, Postgres, or session credential used to encrypt it is still available. The historical hardcoded `neas` fallback is deliberately rejected because it is not a secret; any settings encrypted with that fallback must be re-entered after the dedicated key is configured. After adding the new key, save any integration setting once in the Marketing Command Center; the full saved integration bundle is then re-encrypted with the dedicated key. If legacy decryption fails, the save is rejected and the existing settings row is left untouched. Keep the prior database URL available until this migration save succeeds.
- Social OAuth tokens (Facebook, Instagram, LinkedIn, Google/YouTube, and TikTok) use a separate AES-256-GCM `TOKEN_ENCRYPTION_KEY` (64 hex characters). New token writes and refreshes fail closed until this key is configured. Existing legacy ciphertext is decrypt-only and remains readable only while the original database, Postgres, session, or previous token credential used to encrypt it is still available. Google/TikTok refreshes re-encrypt tokens automatically; reconnect Facebook/Instagram and LinkedIn accounts to re-encrypt them. Keep the original credential available until all accounts are migrated; this change does not run a database migration.
- Default markup is 20% on dealer price, rounded up to the nearest ₱5; change it in `/admin`.
- Payment is manual bank transfer (Security Bank). Mark orders **Paid** in `/admin` after checking the deposit.
- Dealer prices are never sent to the browser for non-admins.
- Local dev: `cp .env.example .env.local`, fill it, `npm install`, `npm run migrate`, `npm run dev`.
