#!/usr/bin/env bash
# Sensiblee — one-shot Ubuntu VPS bootstrap.
# Run ON the VPS as root (or with sudo):  bash deploy/setup-vps.sh
#
# Installs: nginx, Node.js 20 LTS, bun (used by prisma seed), PM2.
# Enables the nginx site from deploy/nginx-sensiblee.conf.
set -euo pipefail

echo "==> Sensiblee VPS setup"
if [ "$(id -u)" -ne 0 ]; then echo "Run as root (sudo bash deploy/setup-vps.sh)"; exit 1; fi

APP_DIR="${APP_DIR:-/var/www/sensiblee}"

echo "==> 1/5 System packages"
apt-get update -y
apt-get install -y curl ca-certificates nginx git rsync

echo "==> 2/5 Node.js 20 LTS"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> 3/5 bun (needed by npm run db:seed)"
if ! command -v bun >/dev/null; then
  curl -fsSL https://bun.sh/install | bash
  ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
fi
bun -v

echo "==> 4/5 PM2"
if ! command -v pm2 >/dev/null; then npm i -g pm2; fi
mkdir -p /var/log/sensiblee
pm2 -v

echo "==> 5/5 nginx site"
cp "$APP_DIR/deploy/nginx-sensiblee.conf" /etc/nginx/sites-available/sensiblee 2>/dev/null || \
  echo "  (nginx conf not found yet — upload the release first, then re-run this step)"
[ -f /etc/nginx/sites-available/sensiblee ] && { ln -sf /etc/nginx/sites-available/sensiblee /etc/nginx/sites-enabled/sensiblee; rm -f /etc/nginx/sites-enabled/default; nginx -t && systemctl reload nginx; }

cat <<'EOF'

Setup complete. Next steps (see DEPLOYMENT.md):
  1. Point DNS A records (www/app/admin.sensiblee.in) at this server's IP
  2. Upload the release tarball and unpack to /var/www/sensiblee
  3. cd /var/www/sensiblee && cp deploy/.env.production.example .env  (edit values)
  4. bun install && npx prisma generate && npx prisma db push && npm run build
  5. set -a; source .env; set +a && pm2 start deploy/ecosystem.config.js && pm2 save
  6. certbot --nginx -d sensiblee.in -d www.sensiblee.in -d app.sensiblee.in -d admin.sensiblee.in
EOF
