#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/theinktrap
PUBLIC_DIR="$APP_DIR/public"
DATA_DIR="$APP_DIR/data"
REPO=git@github.com-theinktrap:aremais/TheInkTrap.git
BRANCH=main
NODE_VERSION=v24.22.3
SSL_SITE=/etc/apache2/sites-available/000-default-le-ssl.conf
DIR_CONF=/etc/apache2/conf-available/theinktrap-dir.conf
PROXY_CONF=/etc/apache2/conf-available/theinktrap-proxy.conf
SERVICE=/etc/systemd/system/theinktrap.service

export PATH="/usr/local/bin:$PATH"

sudo mkdir -p "$APP_DIR"
sudo chown ubuntu:ubuntu "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" remote set-url origin "$REPO"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

if ! command -v curl >/dev/null 2>&1 || ! command -v xz >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y curl xz-utils
fi

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v24\.'; then
  arch=$(uname -m)
  case "$arch" in
    x86_64) node_arch=linux-x64 ;;
    aarch64) node_arch=linux-arm64 ;;
    *)
      echo "Unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  tmp=$(mktemp -d)
  tarball="node-${NODE_VERSION}-${node_arch}.tar.xz"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/${tarball}" -o "$tmp/$tarball"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  (
    cd "$tmp"
    grep "$tarball" SHASUMS256.txt | sha256sum -c -
  )
  sudo tar -xJf "$tmp/$tarball" -C /usr/local --strip-components=1
  rm -rf "$tmp"
  hash -r
fi

cd "$APP_DIR"
npm ci --omit=dev

mkdir -p "$DATA_DIR"
sudo chown -R ubuntu:ubuntu "$DATA_DIR"

NODE_BIN=$(command -v node)
sudo tee "$SERVICE" >/dev/null <<EOF
[Unit]
Description=The Ink Trap bookstore app
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=DB_PATH=$DATA_DIR/bookstore.sqlite
ExecStart=$NODE_BIN src/server.js
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable theinktrap
sudo systemctl restart theinktrap

healthy=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done

if [ "$healthy" -ne 1 ]; then
  sudo systemctl status theinktrap --no-pager || true
  sudo journalctl -u theinktrap -n 80 --no-pager || true
  echo "The app did not become healthy on http://127.0.0.1:3000/health" >&2
  exit 1
fi

sudo mkdir -p "$PUBLIC_DIR"
sudo chown -R ubuntu:www-data "$PUBLIC_DIR"
sudo find "$PUBLIC_DIR" -type d -exec chmod 755 {} \;
sudo find "$PUBLIC_DIR" -type f -exec chmod 644 {} \;

sudo tee "$DIR_CONF" >/dev/null <<'EOF'
<Directory /var/www/theinktrap/public>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
EOF
sudo a2enconf theinktrap-dir >/dev/null

sudo tee "$PROXY_CONF" >/dev/null <<'EOF'
ProxyPreserveHost On
ProxyRequests Off
ProxyTimeout 30
ProxyPass /.well-known !
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
EOF

sudo a2enmod proxy proxy_http >/dev/null
sudo a2enconf theinktrap-proxy >/dev/null

if [ -f "$SSL_SITE" ]; then
  sudo sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/theinktrap/public|' "$SSL_SITE"
fi

sudo apache2ctl configtest
sudo systemctl reload apache2

echo "Published The Ink Trap from $BRANCH"
