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
   branch `main`, **Root Directory `web`**. Framework: Next.js (auto).
2. **Storage → Create Database → Neon (Postgres)**, connect it to the project. This sets `DATABASE_URL`.
3. **Settings → Environment Variables**: `SESSION_SECRET` (random, 32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. Review the SQL in `scripts/migrate.mjs` and take a verified database backup before any schema operation.
   Run `npm run migrate` only as a separate, explicitly approved maintenance step. Never run migrations as part
   of a Vercel deployment. The `npm run build` command now runs only `next build` and does not write to the database.
5. **Settings → Domains**: add `nextedge-access-solutions.com` and `www.nextedge-access-solutions.com`.
6. **Namecheap → Advanced DNS** (web records only — leave MX/email/TXT records untouched):
   `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`.

## Notes

- Default markup is 20% on dealer price, rounded up to the nearest ₱5; change it in `/admin`.
- Payment is manual bank transfer (Security Bank). Mark orders **Paid** in `/admin` after checking the deposit.
- Dealer prices are never sent to the browser for non-admins.
- Local dev: `cp .env.example .env.local`, fill it, `npm install`, then run `npm run migrate` only for an approved local database setup before `npm run dev`.
