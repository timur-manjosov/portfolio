#!/usr/bin/env bash
# Runs ON THE VPS, from the repo root (/var/www/timurmanjosov.com). Invoked
# by ship.sh over SSH, or manually. See CLAUDE.md "Build & deploy".
#
# git pull -> containerized eleventy build into a fresh, currently-unused
# "slot" directory -> verify -> atomic symlink swap. A failed build never
# takes the live site down: Caddy's root stays a symlink ("current")
# pointing at whichever slot last built successfully, and that slot is
# only repointed after the new one is verified good.
set -euo pipefail

# No Node/npm is installed on this host on purpose (see CLAUDE.md) — the
# build runs in a disposable container instead. Bump this if @11ty/
# eleventy's required Node version changes (check package.json/engines).
NODE_IMAGE="node:22-alpine"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_LINK="$REPO_DIR/current"
SLOT_A="$REPO_DIR/_site.a"
SLOT_B="$REPO_DIR/_site.b"

cd "$REPO_DIR"

echo "==> git pull"
git pull --ff-only

# Build into whichever slot ISN'T currently live, so the live slot is
# never touched until the new build is verified good. Alternating slots
# also makes repeat runs idempotent — nothing to clean up beforehand.
if [ -L "$CURRENT_LINK" ] && [ "$(readlink -f "$CURRENT_LINK")" = "$SLOT_A" ]; then
  BUILD_DIR="$SLOT_B"
else
  BUILD_DIR="$SLOT_A"
fi
BUILD_DIR_NAME="$(basename "$BUILD_DIR")"

echo "==> building into $BUILD_DIR_NAME via a disposable $NODE_IMAGE container"
rm -rf "$BUILD_DIR"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "$REPO_DIR:/app" \
  -w /app \
  "$NODE_IMAGE" \
  sh -c "npm ci && npx eleventy --output=$BUILD_DIR_NAME"

echo "==> verifying build output"
if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR")" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "ERROR: build produced no usable output in $BUILD_DIR_NAME — aborting swap, previous build stays live." >&2
  exit 1
fi

echo "==> fixing permissions (Caddy runs as its own 'caddy' user, not $(id -un))"
chmod -R a+rX "$BUILD_DIR"

echo "==> atomic swap: pointing 'current' at $BUILD_DIR_NAME"
ln -sfn "$BUILD_DIR_NAME" "$REPO_DIR/current.tmp"
mv -T "$REPO_DIR/current.tmp" "$CURRENT_LINK"

echo "==> deploy complete — live at $(readlink -f "$CURRENT_LINK")"
