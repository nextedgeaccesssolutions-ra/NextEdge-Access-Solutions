# OmniRoute @ omniroute.nextedge-access-solutions.com — exact setup

## 0. Values (final)
- Gateway public URL: `https://omniroute.nextedge-access-solutions.com`
- Website env (Vercel): `OMNIROUTE_BASE_URL=https://omniroute.nextedge-access-solutions.com/v1`
- Dashboard: `https://omniroute.nextedge-access-solutions.com` (admin login)
- Health: `https://omniroute.nextedge-access-solutions.com/api/health`

## 1. DNS (Namecheap → Advanced DNS, keep MX/TXT email records untouched)
Add ONE record:
```
Type: A | Host: omniroute | Value: 1.2.3.4 | TTL: Automatic
```
Verify (wait 5–30 min):
```bash
dig +short omniroute.nextedge-access-solutions.com
# must print 1.2.3.4
```

## 2. VPS — Node 22 + OmniRoute + Caddy
```bash
# Node 22 (OmniRoute requires >=18 <24)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs && node -v  # expect v22.x

# OmniRoute
git clone https://github.com/nextedgeaccesssolutions-ra/omniroute omniroute
cd omniroute
cp ../deliver/omniroute.vps.env.example .env
# edit .env: fill JWT_SECRET / API_KEY_SECRET / STORAGE_ENCRYPTION_KEY / INITIAL_PASSWORD
#   openssl rand -base64 48   (JWT)
#   openssl rand -hex 32      (API + storage keys)
docker compose --profile base up -d --build
docker logs -f omniroute
curl -s http://localhost:20128/api/health || curl -s http://localhost:20128/ | head -c 300

# Caddy (TLS auto)
sudo apt install -y caddy
sudo cp ../deliver/Caddyfile.omniroute /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -s https://omniroute.nextedge-access-solutions.com/api/health | head -c 300
```
Caddy must reach the VPS on ports 80 + 443 (security group / firewall allow).

## 3. Vercel — paste exactly (Production + Preview, server-only)
```
OMNIROUTE_BASE_URL=https://omniroute.nextedge-access-solutions.com/v1
OMNIROUTE_MODEL=openai/gpt-4o-mini
# OMNIROUTE_API_KEY=<only if OmniRoute .env has REQUIRE_API_KEY=true>
```
Then: Deployments → Redeploy (or merge `feat/omniroute-workforce`).

## 4. Verify on the live site
1. `https://www.nextedge-access-solutions.com/admin/ai-workforce` → header badge:
   `AI GATEWAY: OMNIROUTE READY`
2. Performance tab → **Test live OmniRoute** → `Verified · openai/gpt-4o-mini`
3. Create one specialist work order (e.g. JARVIS, "Summarize today's pipeline") →
   appears in work queue as `needs_review` with OmniRoute-generated deliverable.

## 5. Rollback
Vercel → delete `OMNIROUTE_BASE_URL` → Redeploy → badge returns to
`AI GATEWAY: VERCEL-AI-GATEWAY READY`. VPS can stay running.

## 6. Still red: Supabase block (unrelated to OmniRoute)
`SUPABASE_SECRET_KEY is not configured` → Vercel → Settings → Environment Variables →
add `SUPABASE_SECRET_KEY=<Supabase project secret>` to Production + Preview (never
NEXT_PUBLIC_) → Redeploy → Refresh live data.
