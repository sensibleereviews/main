#!/bin/bash
# Task 21 — export hydrated static HTML for every marketing route
set -u
SRC=http://localhost:3200
OUT=/home/z/my-project/sensiblee-static
mkdir -p "$OUT"

ROUTES=(
  ""
  "features"
  "how"
  "pricing"
  "stories"
  "security"
  "about"
  "contact"
  "privacy"
  "terms"
  "sitemap"
  "blog"
  "blog/response-rate-lever"
  "blog/whatsapp-review-requests"
  "blog/qr-table-tent-playbook"
  "knowledge"
  "ticket"
  "login"
  "signup"
  "app"
  "app/overview"
)

for r in "${ROUTES[@]}"; do
  url="$SRC/$r"
  dir="$OUT/$r"
  if [ -z "$r" ]; then dir="$OUT"; fi
  mkdir -p "$dir"
  raw="/tmp/snap-raw.txt"
  agent-browser open "$url" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  agent-browser wait 1200 >/dev/null 2>&1
  # trigger scroll-reveal animations + lazy loads, then return to top
  agent-browser eval "(() => { const h=document.body.scrollHeight; for(let y=0;y<=h;y+=700){window.scrollTo(0,y);} window.scrollTo(0,0); return h; })()" >/dev/null 2>&1
  agent-browser wait 900 >/dev/null 2>&1
  agent-browser eval "document.documentElement.outerHTML" > "$raw" 2>/dev/null
  python3 - "$raw" "$dir/index.html" <<'PY'
import json, sys
raw, out = sys.argv[1], sys.argv[2]
s = open(raw, encoding="utf-8").read().strip()
html = json.loads(s)  # agent-browser prints a JSON-quoted string
if not html.lstrip().lower().startswith("<html"):
    print(f"  !! {out}: does not look like HTML (len={len(html)})", file=sys.stderr)
    sys.exit(2)
open(out, "w", encoding="utf-8").write("<!DOCTYPE html>\n" + html)
print(f"  ok {out.replace('/home/z/my-project/sensiblee-static','')} ({len(html)//1024}KB)")
PY
  if [ $? -ne 0 ]; then echo "FAILED on route: /$r"; exit 1; fi
done
echo "=== all routes exported ==="
find "$OUT" -name index.html | wc -l
