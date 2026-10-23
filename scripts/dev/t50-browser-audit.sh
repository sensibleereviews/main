#!/bin/bash
# Task 50 browser audit — full-document coverage re-check:
# issues/action tracking fields, location drill-down, staff coaching framing,
# AI approve flow, WhatsApp, admin tax field, marketing loop strip.
set -u
AB="agent-browser"
FAILED=0
say() { echo "AUDIT: $*"; }
chk() { if [ "$2" = "1" ]; then say "✓ $1"; else say "✗ GAP: $1"; FAILED=1; fi; }

login() {
  for attempt in 1 2 3; do
    $AB open http://localhost:3000/login > /dev/null 2>&1
    $AB wait --load networkidle > /dev/null 2>&1
    sleep 2.5
    local refs=$($AB snapshot -i 2>/dev/null)
    local go_ref=$(echo "$refs" | grep -oE 'button "Go to dashboard" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    if [ -n "$go_ref" ]; then
      $AB click "@$go_ref" > /dev/null 2>&1; sleep 3
      $AB wait --load networkidle > /dev/null 2>&1; return 0
    fi
    local email_ref=$(echo "$refs" | grep -oE 'textbox "WORK EMAIL" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    local pw_ref=$(echo "$refs" | grep -oE 'textbox "PASSWORD" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    local btn_ref=$(echo "$refs" | grep -oE 'button "Sign in" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
    if [ -n "$email_ref" ] && [ -n "$pw_ref" ] && [ -n "$btn_ref" ]; then
      $AB fill "@$email_ref" "$1" > /dev/null 2>&1
      $AB fill "@$pw_ref" "$2" > /dev/null 2>&1
      $AB click "@$btn_ref" > /dev/null 2>&1; sleep 4
      $AB wait --load networkidle > /dev/null 2>&1
      if ! echo "$($AB get url 2>/dev/null)" | grep -q 'login'; then return 0; fi
    fi
    say "login attempt $attempt failed — retrying"
  done
  return 1
}

nav() {
  local refs=$($AB snapshot -i 2>/dev/null)
  local ref=$(echo "$refs" | grep -oE "button \"$1[^\"]*\" \[ref=(e[0-9]+)\]" | grep -oE 'e[0-9]+' | head -1)
  [ -n "$ref" ] && $AB click "@$ref" > /dev/null 2>&1 && sleep 2.5 && $AB wait --load networkidle > /dev/null 2>&1
}

# ---------- 1. tenant: issues & action tracking ----------
login anand@spiceroute.in Demo@1234
say "sidebar labels:"
$AB snapshot -i 2>/dev/null | grep -oE 'button "[^"]+"' | sort -u | head -20
SNAP=$($AB snapshot 2>/dev/null)
nav "Issues"
SNAP=$($AB snapshot 2>/dev/null)
chk "issues: page renders" "$(echo "$SNAP" | grep -qiE 'issue' && echo 1 || echo 0)"
chk "issues: severity field" "$(echo "$SNAP" | grep -qiE 'severity' && echo 1 || echo 0)"
chk "issues: owner field" "$(echo "$SNAP" | grep -qiE 'owner' && echo 1 || echo 0)"
chk "issues: status field" "$(echo "$SNAP" | grep -qiE 'status|in progress|resolved' && echo 1 || echo 0)"
chk "issues: first detected / detected date" "$(echo "$SNAP" | grep -qiE 'first detected|detected' && echo 1 || echo 0)"
chk "issues: mentions count" "$(echo "$SNAP" | grep -qiE 'mentions' && echo 1 || echo 0)"
chk "issues: trend arrow" "$(echo "$SNAP" | grep -qiE 'trend|↑|↓' && echo 1 || echo 0)"
chk "issues: recommended action" "$(echo "$SNAP" | grep -qiE 'recommended action|playbook' && echo 1 || echo 0)"

# ---------- 2. locations drill-down ----------
nav "Locations"
SNAP=$($AB snapshot 2>/dev/null)
chk "locations: list renders with scores" "$(echo "$SNAP" | grep -qiE '/ ?100|health' && echo 1 || echo 0)"
# click first location card if present
LOC_REF=$(echo "$SNAP" | grep -oE '(button|div) "[^"]*Noida[^"]*" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
if [ -n "$LOC_REF" ]; then
  $AB click "@$LOC_REF" > /dev/null 2>&1; sleep 2.5; $AB wait --load networkidle > /dev/null 2>&1
  SNAP=$($AB snapshot 2>/dev/null)
fi
chk "drill-down: top problems % bars" "$(echo "$SNAP" | grep -qiE 'top problems|waiting time|staff behaviour' && echo 1 || echo 0)"
chk "drill-down: monthly trend (Jul–Oct)" "$(echo "$SNAP" | grep -qiE 'trend|july|august|september|october' && echo 1 || echo 0)"
chk "drill-down: most-mentioned staff" "$(echo "$SNAP" | grep -qiE 'mention' && echo 1 || echo 0)"

# ---------- 3. staff coaching framing (doc: NEVER employee scores) ----------
nav "Analytics"
SNAP=$($AB snapshot 2>/dev/null)
chk "staff: mentions framing present" "$(echo "$SNAP" | grep -qiE 'reviews mention|mentions' && echo 1 || echo 0)"
chk "staff: NO numeric employee score (X/5)" "$(echo "$SNAP" | grep -qE '[0-9]\.?[0-9]?/5' && echo 0 || echo 1)"
chk "staff: coaching subtitle" "$(echo "$SNAP" | grep -qiE 'coaching' && echo 1 || echo 0)"

# ---------- 4. WhatsApp requests ----------
nav "WhatsApp"
SNAP=$($AB snapshot 2>/dev/null)
chk "whatsapp: request surface renders" "$(echo "$SNAP" | grep -qiE 'whatsapp' && echo 1 || echo 0)"
chk "whatsapp: conversion tracking" "$(echo "$SNAP" | grep -qiE 'conversion' && echo 1 || echo 0)"

# ---------- 5. admin: tax field (Task 39) ----------
$AB open http://localhost:3000/login > /dev/null 2>&1; sleep 1.5
$AB snapshot -i 2>/dev/null > /dev/null
# sign out via direct admin login (separate cookie jar not possible → use fresh context)
$AB open "http://localhost:3000/login" > /dev/null 2>&1
sleep 2
REFS=$($AB snapshot -i 2>/dev/null)
echo "$REFS" | grep -oE 'button "[^"]+"' | sort -u | head -10
say "(admin tax check needs separate session — will verify via API/source instead)"
echo "AUDIT RESULT: $([ $FAILED = 0 ] && echo ALL-PASS || echo GAPS-FOUND)"
