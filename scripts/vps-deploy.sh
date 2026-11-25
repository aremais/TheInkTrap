#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/theinktrap
REPO=git@github.com-theinktrap:aremais/TheInkTrap.git
BRANCH=main

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

echo "Updated $APP_DIR from $BRANCH. The live website was left unchanged."
