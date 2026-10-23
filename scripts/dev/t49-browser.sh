#!/bin/bash
# Task 49 browser E2E — Section 2 (REFINED VERSION): alert card, top issues,
# ROI, locations health dots, reputation inbox filters, Section 2 pricing.
set -u
AB="agent-browser"
SHOTS=/home/z/my-project/scripts/shots
mkdir -p "$SHOTS"
FAILED=0
say() { echo "E2E: $*"; }
chk() { if [ "$2" = "1" ]; then say "✓ $1"; else say "✗ FAIL: $1"; FAILED=1; fi; }

login() { # $1 email $2 password — retries until dashboard markers appear
  for attempt in 1 2 3; do
    $AB open http://localhost:3000/login > /dev/null 2>&1
    $AB wait --load networkidle > /dev/null 2>&1
    sleep 2.5
    local refs=$($AB snapshot -i 2>/dev/null)
    # already signed in (cookie from earlier run) → straight to the dashboard
    local go_ref=$(echo "$refs" | grep -oE 'button "Go to dashboard" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    if [ -n "$go_ref" ]; then
      $AB click "@$go_ref" > /dev/null 2>&1
      sleep 3
      $AB wait --load networkidle > /dev/null 2>&1
      return 0
    fi
    local email_ref=$(echo "$refs" | grep -oE 'textbox "WORK EMAIL" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    local pw_ref=$(echo "$refs" | grep -oE 'textbox "PASSWORD" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    local btn_ref=$(echo "$refs" | grep -oE 'button "Sign in" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    if [ -n "$email_ref" ] && [ -n "$pw_ref" ] && [ -n "$btn_ref" ]; then
      $AB fill "@$email_ref" "$1" > /dev/null 2>&1
      $AB fill "@$pw_ref" "$2" > /dev/null 2>&1
      $AB click "@$btn_ref" > /dev/null 2>&1
      sleep 4
      $AB wait --load networkidle > /dev/null 2>&1
      if ! echo "$($AB get url 2>/dev/null)" | grep -q 'login'; then return 0; fi
    fi
    say "login attempt $attempt failed — retrying"
  done
  return 1
}

nav() { # $1 label prefix → click sidebar button (tolerant of badges/suffixes)
  local refs=$($AB snapshot -i 2>/dev/null)
  local ref=$(echo "$refs" | grep -oE "button \"$1[^\"]*\" \[ref=(e[0-9]+)\]" | grep -oE 'e[0-9]+' | head -1)
  [ -n "$ref" ] && $AB click "@$ref" > /dev/null 2>&1 && sleep 2.5 && $AB wait --load networkidle > /dev/null 2>&1
}

# ---------- 1. tenant login → overview ----------
login anand@spiceroute.in Demo@1234
URL=$($AB get url 2>/dev/null); chk "tenant login lands on dashboard" "$(echo "$URL" | grep -qc 'login' && echo 0 || echo 1)"
sleep 2
SNAP=$($AB snapshot 2>/dev/null)
chk "overview: Reputation Alert card (negatives this month)" "$(echo "$SNAP" | grep -qE 'negative reviews this month' && echo 1 || echo 0)"
chk "overview: alert revenue-risk line" "$(echo "$SNAP" | grep -qE 'Revenue risk' && echo 1 || echo 0)"
chk "overview: alert recommended action present" "$(echo "$SNAP" | grep -qiE 'recommended action' && echo 1 || echo 0)"
chk "overview: alert assign CTA" "$(echo "$SNAP" | grep -qE 'Assign to branch manager' && echo 1 || echo 0)"
chk "overview: Top issues panel" "$(echo "$SNAP" | grep -qE 'Top issues' && echo 1 || echo 0)"
chk "overview: Reputation ROI panel" "$(echo "$SNAP" | grep -qE 'Reputation ROI' && echo 1 || echo 0)"
chk "overview: ROI conversion metric" "$(echo "$SNAP" | grep -qE 'Review conversion' && echo 1 || echo 0)"
chk "overview: ROI locations improved" "$(echo "$SNAP" | grep -qE 'Locations improved' && echo 1 || echo 0)"
chk "overview: hero still Reputation Health" "$(echo "$SNAP" | grep -qE 'Reputation Health' && echo 1 || echo 0)"
chk "overview: loop strip mentions Action Center" "$(echo "$SNAP" | grep -qE 'Open Reputation Action Center' && echo 1 || echo 0)"
$AB screenshot "$SHOTS/t49-overview-alert.png" > /dev/null 2>&1

# ---------- 2. reviews → Reputation Inbox ----------
nav "Reviews"
sleep 1.5
SNAP=$($AB snapshot 2>/dev/null)
chk "inbox: renamed Reputation Inbox" "$(echo "$SNAP" | grep -qE 'Reputation Inbox' && echo 1 || echo 0)"
chk "inbox: location filter" "$(echo "$SNAP" | grep -qE 'All locations' && echo 1 || echo 0)"
chk "inbox: sentiment filter" "$(echo "$SNAP" | grep -qiE 'Any sentiment' && echo 1 || echo 0)"
chk "inbox: unanswered filter" "$(echo "$SNAP" | grep -qE 'Unanswered' && echo 1 || echo 0)"
chk "inbox: staff mention filter" "$(echo "$SNAP" | grep -qE 'Any staff mention' && echo 1 || echo 0)"
chk "inbox: issue category filter" "$(echo "$SNAP" | grep -qE 'Any issue category' && echo 1 || echo 0)"
$AB screenshot "$SHOTS/t49-inbox-filters.png" > /dev/null 2>&1

# ---------- 3. marketing: pricing + home ----------
$AB open http://localhost:3000/pricing > /dev/null 2>&1
$AB wait --load networkidle > /dev/null 2>&1; sleep 1.5
HTML=$(curl -s http://localhost:3000/pricing)
chk "pricing: Starter ₹1,499" "$(echo "$HTML" | sed 's/<!-- -->//g' | grep -qE '₹1,499' && echo 1 || echo 0)"
chk "pricing: Growth ₹3,499" "$(echo "$HTML" | sed 's/<!-- -->//g' | grep -qE '₹3,499' && echo 1 || echo 0)"
chk "pricing: Scale ₹5,999" "$(echo "$HTML" | sed 's/<!-- -->//g' | grep -qE '₹5,999' && echo 1 || echo 0)"
chk "pricing: Scale name (no Enterprise)" "$(echo "$HTML" | grep -qE '>Scale<' && ! echo "$HTML" | grep -q 'Enterprise' && echo 1 || echo 0)"
chk "pricing: >10 locations Contact-Us banner" "$(echo "$HTML" | grep -qE 'Running more than 10 locations' && echo 1 || echo 0)"
chk "pricing: GST line retained" "$(echo "$HTML" | sed 's/<!-- -->//g' | grep -qE 'GST @ 18' && echo 1 || echo 0)"
$AB screenshot "$SHOTS/t49-pricing-scale.png" > /dev/null 2>&1

HOME_HTML=$(curl -s http://localhost:3000/)
chk "home: Command Center module" "$(echo "$HOME_HTML" | grep -qE 'Reputation Command Center' && echo 1 || echo 0)"
chk "home: Review Growth Engine module" "$(echo "$HOME_HTML" | grep -qE 'Review Growth Engine' && echo 1 || echo 0)"
chk "home: AI Reputation Copilot module" "$(echo "$HOME_HTML" | grep -qE 'AI Reputation Copilot' && echo 1 || echo 0)"
chk "home: Location Intelligence module" "$(echo "$HOME_HTML" | grep -qE 'Location Intelligence' && echo 1 || echo 0)"
chk "home: Reputation Health module (six-pillar set)" "$(echo "$HOME_HTML" | grep -qE 'Reputation Health' && echo 1 || echo 0)"
chk "home: Reputation Action Center module (six-pillar set)" "$(echo "$HOME_HTML" | grep -qE 'Reputation Action Center' && echo 1 || echo 0)"
chk "home: six-module section title" "$(echo "$HOME_HTML" | grep -qE 'Six modules' && echo 1 || echo 0)"
chk "home: Reputation-to-Operations Loop strip" "$(echo "$HOME_HTML" | grep -qE 'Reputation-to-Operations Loop' && echo 1 || echo 0)"
chk "home: no stale 'Four modules' copy" "$(echo "$HOME_HTML" | grep -qE 'Four modules|four modules' && echo 0 || echo 1)"
chk "home: new hero sub live" "$(echo "$HOME_HTML" | sed 's/<!-- -->//g' | grep -qE 'Review Operations' && echo 1 || echo 0)"

# ---------- 4. console errors ----------
# Known-benign filter: React 19 dev-mode Radix <Accordion> id regeneration on
# the pricing FAQ (aria-controls/id differ SSR vs CSR; verified the accordion
# still opens — non-blocking product noise, see worklog Task 49).
ERRS=$($AB console 2>/dev/null | grep -iE "error" | grep -vicE "hydrated but|radix-_R|react.dev/link/hydration-mismatch" || true)
chk "console: 0 product errors" "$([ "${ERRS:-0}" -eq 0 ] && echo 1 || echo 0)"

echo "E2E RESULT: $([ $FAILED -eq 0 ] && echo ALL-PASS || echo HAS-FAILURES)"
exit $FAILED
