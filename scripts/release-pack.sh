#!/usr/bin/env bash
# Sensiblee — pack a release tarball for upload to the VPS.
# Usage:  bash scripts/release-pack.sh            # include current SQLite DB
#         bash scripts/release-pack.sh --no-db    # code only (fresh DB via seed)
#
# Output: /home/z/my-project/download/sensiblee-release.tar.gz
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/download"
OUT="$OUT_DIR/sensiblee-release.tar.gz"
mkdir -p "$OUT_DIR"

WITH_DB=1
[ "${1:-}" = "--no-db" ] && WITH_DB=0

EXCLUDES=(
  --exclude='node_modules'
  --exclude='.next'
  --exclude='.git'
  --exclude='dev.log'
  --exclude='server.log'
  --exclude='sensiblee-static'
  --exclude='sensiblee-static-build'
  --exclude='download'
  --exclude='tool-results'
  --exclude='scripts/prod-verify.log'
  --exclude='scripts/static-*.log'
  --exclude='examples'
  --exclude='.agent*'
  --exclude='scripts/pg'
  --exclude='scripts/shots'
  --exclude='scripts/graveyard'
  --exclude='scripts/static-export'
  --exclude='scripts/demo-v2'
  --exclude='scripts/sensiblee'
  --exclude='scripts/localstage'
  --exclude='.zscripts'
  --exclude='skills'
  --exclude='tsconfig.tsbuildinfo'
  --exclude='.turbo'
)

cd "$ROOT"
if [ "$WITH_DB" -eq 1 ]; then
  echo "Packing release WITH current database (db/custom.db)…"
  tar -czf "$OUT" "${EXCLUDES[@]}" .
else
  echo "Packing code-only release (fresh DB will be seeded on the VPS)…"
  tar -czf "$OUT" "${EXCLUDES[@]}" --exclude='db/custom.db' --exclude='db/custom.db-journal' .
fi

echo
echo "Release ready: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Upload it:     scp $OUT root@YOUR_VPS_IP:/tmp/ && mkdir -p /var/www/sensiblee && tar -xzf /tmp/sensiblee-release.tar.gz -C /var/www/sensiblee"
