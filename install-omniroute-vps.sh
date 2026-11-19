#!/usr/bin/env bash
# OmniRoute VPS installer — Ubuntu 22.04/24.04
# Domain: omniroute.nextedge-access-solutions.com
# Run as a sudo user over SSH. Safe to re-run.
set -euo pipefail
DOMAIN="omniroute.nextedge-access-solutions.com"

echo "=== 1/6 system ==="
sudo apt update && sudo apt install -y ca-certificates curl gnupg ufw git openssl
sudo ufw allow 22/tcp; sudo ufw allow 80/tcp; sudo ufw allow 443/tcp
sudo ufw --force enable || true

echo "=== 2/6 Node 22 (OmniRoute requires >=18 <24) ==="
if ! command -v node >/dev/null || ! node -v | grep -q "v22\."; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
node -v; npm -v

echo "=== 3/6 Docker ==="
if ! command -v docker >/dev/null; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
  sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER" || true
fi
docker --version; docker compose version

echo "=== 4/6 public IP ==="
PUBLIC_IP="$(curl -s --max-time 10 ifconfig.me || true)"
echo "PUBLIC_IP=${PUBLIC_IP}"
echo "Make sure DNS is:  A  omniroute  ->  ${PUBLIC_IP}  (Namecheap Advanced DNS)"

echo "=== 5/6 OmniRoute ==="
cd "$HOME"
if [ ! -d omniroute ]; then
  git clone https://github.com/nextedgeaccesssolutions-ra/omniroute omniroute
fi
cd omniroute
[ -f .env ] || cp .env.example .env
# Fill secrets only if empty; never overwrite existing values.
grep -q "^JWT_SECRET=$" .env && sed -i "s|^JWT_SECRET=$|JWT_SECRET=$(openssl rand -base64 48)|" .env || true
grep -q "^API_KEY_SECRET=$" .env && sed -i "s|^API_KEY_SECRET=$|API_KEY_SECRET=$(openssl rand -hex 32)|" .env || true
grep -q "^STORAGE_ENCRYPTION_KEY=$" .env && sed -i "s|^STORAGE_ENCRYPTION_KEY=$|STORAGE_ENCRYPTION_KEY=$(openssl rand -hex 32)|" .env || true
grep -q "^INITIAL_PASSWORD=CHANGEME" .env && sed -i "s|^INITIAL_PASSWORD=.*|INITIAL_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)|" .env || true
# Domain wiring (idempotent)
for k in "BASE_URL=https://${DOMAIN}" "NEXT_PUBLIC_BASE_URL=https://${DOMAIN}" "NODE_ENV=production" "PORT=20128" "DASHBOARD_PORT=20128" "AUTH_COOKIE_SECURE=true"; do
  key="${k%%=*}"; grep -q "^${key}=" .env && sed -i "s|^${key}=.*|${k}|" .env || echo "$k" >> .env
done
echo "--- .env identity (secrets hidden) ---"
grep -E "^(BASE_URL|NEXT_PUBLIC_BASE_URL|NODE_ENV|PORT|DASHBOARD_PORT|REQUIRE_API_KEY)" .env || true
docker compose --profile base up -d --build
sleep 8
docker logs --tail 30 omniroute || true
curl -s -o /dev/null -w "local health HTTP %{http_code}\n" http://localhost:20128/api/health || curl -s http://localhost:20128/ | head -c 200; echo

echo "=== 6/6 Caddy (TLS) ==="
if ! command -v caddy >/dev/null; then
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update && sudo apt install -y caddy
fi
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${DOMAIN} {
	reverse_proxy 127.0.0.1:20128
	header {
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
	}
	log {
		output stdout
	}
}
EOF
sudo systemctl reload caddy
sleep 5
curl -s -o /dev/null -w "public TLS HTTP %{http_code}\n" "https://${DOMAIN}/api/health" || true

echo ""
echo "=== DONE ==="
echo "Dashboard: https://${DOMAIN}  (login with INITIAL_PASSWORD from ~/omniroute/.env)"
echo "Vercel: OMNIROUTE_BASE_URL=https://${DOMAIN}/v1"
echo "If public TLS is not 200: check 'dig +short ${DOMAIN}' prints ${PUBLIC_IP}, ports 80/443 open, and 'sudo journalctl -u caddy --no-pager | tail -30'."
