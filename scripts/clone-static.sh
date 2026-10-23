#!/bin/bash
# Task 21 — side-by-side clone for the static marketing-site export
set -e
SRC=/home/z/my-project
DST=/home/z/my-project/sensiblee-static-build

mkdir -p "$DST"
rsync -a \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude db --exclude tool-results --exclude download \
  --exclude scripts --exclude skills --exclude examples \
  --exclude "*.png" --exclude worklog.md --exclude sensiblee-static \
  "$SRC/" "$DST/"

mkdir -p "$DST/db"
cp "$SRC/db/custom.db" "$DST/db/custom.db"

cat > "$DST/.env" <<EOF
DATABASE_URL=file:$DST/db/custom.db
EOF

cd "$DST"
bun install 2>&1 | tail -3
npx prisma generate 2>&1 | tail -2
echo "=== clone ready ==="
du -sh "$DST" && ls "$DST"
