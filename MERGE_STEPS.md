# Merge OmniRoute into NextEdge-Access-Solutions + VPS deploy
# You chose: merge into website repo (submodule) + VPS Docker + push yourself.

### A. Add OmniRoute as a submodule (keeps both Next.js apps from colliding)

```bash
cd NextEdge-Access-Solutions
git checkout -b feat/omniroute-integration
git submodule add https://github.com/nextedgeaccesssolutions-ra/omniroute vendor/omniroute
git commit -m "Add OmniRoute as vendor submodule (AI gateway reference)"
```

Why submodule and not copy/paste: OmniRoute is a full Next.js app (~750k lockfile,
its own `app/`, `.next`, SQLite data dir). Copying it into `web/` would break both
builds. Submodule pins a version (v3.6.1 tested) while keeping deploys independent:
`web/` stays on Vercel, OmniRoute runs on your VPS.

### B. Apply the website patch (OmniRoute support in web/lib/ai-gateway.ts)

The patch adds an OmniRoute path alongside the existing Vercel OIDC path.
Vercel behavior is unchanged when `OMNIROUTE_BASE_URL` is unset (all 18 existing
tests still pass).

```bash
# from repo root:
git apply deliver/neas-omniroute.patch
# or: patch -p1 < deliver/neas-omniroute.patch

node --experimental-strip-types --test web/scripts/test-ai-gateway.mjs
```

Add to `web/.env.example` (and Vercel env vars):

```bash
# Self-hosted OmniRoute (your VPS). Empty = use Vercel AI Gateway w/ OIDC budget.
OMNIROUTE_BASE_URL=
# e.g. local: http://localhost:20128/v1
# e.g. prod:  https://omniroute.yourdomain.com/v1
OMNIROUTE_API_KEY=
OMNIROUTE_MODEL=openai/gpt-4o-mini
```

Local check:

```bash
# 1) start OmniRoute (Node 22) somewhere:
#    npm install -g omniroute && omniroute --no-open
# 2) in another terminal:
cd web
OMNIROUTE_BASE_URL=http://localhost:20128/v1 npm run dev
```

### C. VPS deploy (Docker, your server)

On the VPS (Ubuntu, Docker installed):

```bash
git clone https://github.com/nextedgeaccesssolutions-ra/omniroute omniroute
cd omniroute
cp .env.example .env
# --- edit .env (required) ---
# JWT_SECRET=$(openssl rand -base64 48)
# API_KEY_SECRET=$(openssl rand -hex 32)
# STORAGE_ENCRYPTION_KEY=$(openssl rand -hex 32)
# INITIAL_PASSWORD=<strong-password>
# PORT=20128 / NODE_ENV=production / BASE_URL=https://omniroute.yourdomain.com
docker compose --profile base up -d --build
docker logs -f omniroute
curl -s http://localhost:20128/api/health || curl -s http://localhost:20128/ | head -5
```

Reverse proxy (Caddy, simplest):

```
omniroute.yourdomain.com {
    reverse_proxy 127.0.0.1:20128
}
```

Then in Vercel → project → Settings → Environment Variables (Production):

```
OMNIROUTE_BASE_URL=https://omniroute.yourdomain.com/v1
OMNIROUTE_API_KEY=<only if REQUIRE_API_KEY=true>
```

Redeploy `web`. Test one specialist/outreach call in `/admin` and watch the
OmniRoute dashboard → Usage Logs.

### D. Commit + push + PR

```bash
git add web/lib/ai-gateway.ts web/.env.example vendor/omniroute .gitmodules
git commit -m "feat(web): route AI gateway via self-hosted OmniRoute when configured"
git push -u origin feat/omniroute-integration
# GitHub → Compare & pull request → merge to main
# Vercel auto-deploys `web/` from main (Root Directory: web)
```

### E. Rollback

Unset `OMNIROUTE_BASE_URL` in Vercel → redeploy → site returns to Vercel OIDC path.
No data migration involved.
