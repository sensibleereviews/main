#!/usr/bin/env bash
# verify-domains.sh — live E2E proof that the three production domains route
# to the right surface. Runs against any base (default http://localhost:3000)
# by overriding the Host header exactly like nginx does in production.
#
# Usage: bash scripts/dev/verify-domains.sh [BASE_URL]
set -u
BASE="${1:-http://localhost:3000}"
pass=0; fail=0
ok()   { echo "PASS | $1"; pass=$((pass+1)); }
bad()  { echo "FAIL | $1"; fail=$((fail+1)); }

fetch() { curl -s --max-time 25 -H "Host: $1" "$BASE$2"; }

echo "=== Domain → surface routing matrix ($BASE) ==="

# 1. www root → marketing home (hero tagline)
fetch www.sensiblee.in / | grep -q "sensed sensibly" \
  && ok "www.sensiblee.in / → marketing home" || bad "www.sensiblee.in / → marketing home"

# 2. www pricing → marketing pricing (₹ plans, Starter ₹1,499)
p="$(fetch www.sensiblee.in /pricing)"
echo "$p" | grep -q "honest plans in" && echo "$p" | grep -q "1,499" \
  && ok "www.sensiblee.in /pricing → pricing page (₹1,499 Starter)" || bad "www.sensiblee.in /pricing → pricing page"

# 3. apex sensiblee.in → marketing (canonical content served, same as www)
fetch sensiblee.in / | grep -q "sensed sensibly" \
  && ok "sensiblee.in (apex) → marketing home" || bad "sensiblee.in (apex) → marketing home"

# 4. app root → workspace shell
fetch app.sensiblee.in / | grep -q "Loading your workspace" \
  && ok "app.sensiblee.in / → client workspace" || bad "app.sensiblee.in / → client workspace"

# 5. app deep path → client surface with client payload
r="$(fetch app.sensiblee.in /reviews)"
echo "$r" | grep -q "Loading your workspace" && echo "$r" | grep -q 'surface\\":\\"client\\"' \
  && ok "app.sensiblee.in /reviews → client surface (payload)" || bad "app.sensiblee.in /reviews → client surface"

# 6. admin root → platform admin shell
fetch admin.sensiblee.in / | grep -q "Loading platform console" \
  && ok "admin.sensiblee.in / → admin console" || bad "admin.sensiblee.in / → admin console"

# 7. admin deep path → admin surface with admin payload
t="$(fetch admin.sensiblee.in /tenants)"
echo "$t" | grep -q "Loading platform console" && echo "$t" | grep -q 'surface\\":\\"admin\\"' \
  && ok "admin.sensiblee.in /tenants → admin surface (payload)" || bad "admin.sensiblee.in /tenants → admin surface"

# 8. guest QR deep link on www (RSC payload carries the code)
fetch www.sensiblee.in /g/spk-kor | grep -q "spk-kor" \
  && ok "www.sensiblee.in /g/spk-kor → guest feedback flow" || bad "www.sensiblee.in /g/spk-kor → guest feedback flow"

# 9. /app/* path fallback on www → workspace
fetch www.sensiblee.in /app/reviews | grep -q "Loading your workspace" \
  && ok "www.sensiblee.in /app/reviews → workspace via path fallback" || bad "www /app/reviews path fallback"

# 10. unknown page → branded 404
fetch www.sensiblee.in /no-such-page | grep -q "404" \
  && ok "www.sensiblee.in /no-such-page → branded 404" || bad "www /no-such-page → branded 404"

# 11. API routes work under all three hosts
for hp in "www.sensiblee.in" "app.sensiblee.in" "admin.sensiblee.in"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -H "Host: $hp" "$BASE/api/plans")"
  [ "$code" = "200" ] && ok "$hp/api/plans → 200" || bad "$hp/api/plans → $code"
done

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
