#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/theinktrap
REPO=git@github.com-theinktrap:aremais/TheInkTrap.git
BRANCH=main
PUBLIC_DIR="$APP_DIR/public"
SSL_SITE=/etc/apache2/sites-available/000-default-le-ssl.conf
DIR_CONF=/etc/apache2/conf-available/theinktrap-dir.conf

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

if [ -f "$APP_DIR/package.json" ]; then
  if [ -f "$APP_DIR/package-lock.json" ]; then
    npm --prefix "$APP_DIR" ci
  else
    npm --prefix "$APP_DIR" install
  fi
  if node -e "const p=require(process.argv[1]); process.exit(p.scripts && p.scripts.build ? 0 : 1)" "$APP_DIR/package.json"; then
    npm --prefix "$APP_DIR" run build
  fi
fi

sudo mkdir -p "$PUBLIC_DIR"
sudo chown -R ubuntu:www-data "$APP_DIR"
sudo find "$APP_DIR" -type d -exec chmod 755 {} \;
sudo find "$APP_DIR" -type f -exec chmod 644 {} \;

sudo tee "$DIR_CONF" >/dev/null <<'EOF'
<Directory /var/www/theinktrap/public>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
EOF
sudo a2enconf theinktrap-dir >/dev/null

if [ -f "$SSL_SITE" ]; then
  sudo sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/theinktrap/public|' "$SSL_SITE"
fi

sudo apache2ctl configtest
sudo systemctl reload apache2

echo "Deployed $BRANCH to $APP_DIR"
