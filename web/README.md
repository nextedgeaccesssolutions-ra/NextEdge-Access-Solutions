# NEAS website + Online Store (Vercel)

Standalone Next.js app: the public NEAS homepage (`public/home.html`), Online Store with cart and
bank-transfer checkout, customer accounts, and an admin control panel. Independent of the Manus app
in the repository root — nothing here changes it.

| URL | Who | What |
| --- | --- | --- |
| `/` | everyone | Homepage |
| `/store` | everyone | Catalog, cart, Buy Now, wishlist, product specs; checkout needs a customer login |
| `/login` | customers | Log in or create an account |
| `/account` | customers | Own orders and status, bank details |
| `/admin/login` | staff | Admin-only login (customer accounts are refused) |
| `/admin` | admins | Orders (change status), markup %, per-item prices, hide items, customer list |

## Go live

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
