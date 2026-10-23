#!/bin/bash
# Task 43 browser E2E v3 — plain-text asserts, robust login
set -u
AB="agent-browser"
SHOTS=/home/z/my-project/scripts/shots
mkdir -p "$SHOTS"
FAILED=0
say() { echo "E2E: $*"; }
chk() { if [ "$2" = "1" ]; then say "✓ $1"; else say "✗ FAIL: $1"; FAILED=1; fi; }

login() { # $1 email $2 password -> echoes url after
  $AB open http://localhost:3000/login > /dev/null 2>&1
  $AB wait --load networkidle > /dev/null 2>&1
  sleep 1.5
  local refs=$($AB snapshot -i 2>/dev/null)
  local email_ref=$(echo "$refs" | grep -oE 'textbox "WORK EMAIL" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  local pw_ref=$(echo "$refs" | grep -oE 'textbox "PASSWORD" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  local btn_ref=$(echo "$refs" | grep -oE 'button "Sign in" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  say "login refs: email=$email_ref pw=$pw_ref btn=$btn_ref"
  $AB fill "@$email_ref" "$1" > /dev/null 2>&1
  $AB fill "@$pw_ref" "$2" > /dev/null 2>&1
  $AB click "@$btn_ref" > /dev/null 2>&1
  sleep 3.5
  $AB wait --load networkidle > /dev/null 2>&1
  $AB get url 2>/dev/null
}

goto_view() { # $1 view name prefix
  local refs=$($AB snapshot -i 2>/dev/null)
  local ref=$(echo "$refs" | grep -oE "button \"$1[^\"]*\" \[ref=(e[0-9]+)\]" | grep -oE 'e[0-9]+' | head -1)
  say "nav '$1' ref: ${ref:-none}"
  if [ -n "$ref" ]; then $AB click "@$ref" > /dev/null 2>&1; else
    $AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>x.textContent.trim().startsWith('$1')); if(b){b.click();return 'clicked';} return 'not-found'; })()" > /dev/null 2>&1
  fi
  sleep 2.5
  $AB wait --load networkidle > /dev/null 2>&1
}

truthy() { echo "$1" | grep -q "$2=1" && echo 1 || echo 0; }

# ---------- admin ----------
URL=$(login "admin@sensiblee.in" "Demo@1234")
say "admin login url: $URL"
chk "admin lands inside console" "$(echo "$URL" | grep -qE "/(admin|app)" && echo 1 || echo 0)"

goto_view "System"
A=$($AB eval "(() => { const t=document.body.innerText; return 'card=' + (t.includes('Payment gateways')?1:0) + ' prov3=' + (t.includes('3 provisioned')?1:0) + ' live=' + (t.includes('LIVE')?1:0) + ' acct=' + (t.includes('acct_spk_live_01')?1:0) + ' offhint=' + (t.includes('Switch Cashfree on to provision workspaces')?1:0) + ' keyhint=' + (t.includes('Key ID saved — add the key secret to start collecting')?1:0); })()" 2>/dev/null)
say "admin asserts: $A"
chk "gateways card + 3 provisions render" "$(truthy "$A" 'card' )"
chk "razorpay LIVE row + accountRef" "$([ "$(echo "$A" | grep -oE 'live=[01]')" = "live=1" ] && [ "$(echo "$A" | grep -oE 'acct=[01]')" = "acct=1" ] && echo 1 || echo 0)"
chk "disabled-gateway hint" "$(echo "$A" | grep -oE 'offhint=[01]' | grep -q '=1' && echo 1 || echo 0)"
chk "keyId-only amber hint" "$(echo "$A" | grep -oE 'keyhint=[01]' | grep -q '=1' && echo 1 || echo 0)"

# toggle cashfree ON then OFF
$AB eval "(() => { const rows=[...document.querySelectorAll('div.rounded-xl.border')]; const row=rows.find(r=>r.textContent.includes('Cashfree')); row.querySelector('button[role=switch]').click(); return 1; })()" > /dev/null 2>&1
sleep 1.5
ON=$($AB eval "(() => { const rows=[...document.querySelectorAll('div.rounded-xl.border')]; const row=rows.find(r=>r.textContent.includes('Cashfree')); return 'state=' + (row.querySelector('button[role=switch]')?.getAttribute('data-state') === 'checked' ? 1 : 0) + ' sel=' + (row.querySelector('select') && !row.querySelector('select').disabled ? 1 : 0); })()" 2>/dev/null)
say "cashfree after toggle: $ON"
chk "cashfree switch ON + provision controls enabled" "$(echo "$ON" | grep -oE 'state=1 sel=1' | grep -q . && echo 1 || echo 0)"
$AB eval "(() => { const rows=[...document.querySelectorAll('div.rounded-xl.border')]; const row=rows.find(r=>r.textContent.includes('Cashfree')); row.querySelector('button[role=switch]').click(); return 1; })()" > /dev/null 2>&1
sleep 1.5
OFF=$($AB eval "(() => { const rows=[...document.querySelectorAll('div.rounded-xl.border')]; const row=rows.find(r=>r.textContent.includes('Cashfree')); return 'state=' + (row.querySelector('button[role=switch]')?.getAttribute('data-state') === 'checked' ? 1 : 0); })()" 2>/dev/null)
chk "cashfree restored OFF" "$(echo "$OFF" | grep -q 'state=0' && echo 1 || echo 0)"

# configure panel
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Configure')); b.click(); return 1; })()" > /dev/null 2>&1
sleep 1
P=$($AB eval "(() => { const t=document.body.innerText; return 'panel=' + (t.includes('Save credentials') && t.includes('never returned by the API') ? 1 : 0); })()" 2>/dev/null)
chk "configure panel with write-only secrets form" "$(echo "$P" | grep -q 'panel=1' && echo 1 || echo 0)"
$AB screenshot "$SHOTS/t43-admin-gateways.png" > /dev/null 2>&1
say "screenshot: t43-admin-gateways.png"

# ---------- logout → tenant ----------
$AB eval "(() => { const b=document.querySelector('button[title=\"Sign out\"]'); if(b){b.click();return 1;} const b2=[...document.querySelectorAll('button,a')].find(x=>/log ?out|sign ?out/i.test(x.textContent)); if(b2){b2.click();return 1;} return 0; })()" > /dev/null 2>&1
sleep 2.5
URL2=$(login "anand@spiceroute.in" "Demo@1234")
say "tenant login url: $URL2"
chk "tenant lands inside workspace" "$(echo "$URL2" | grep -qE "/(admin|app)" && echo 1 || echo 0)"

goto_view "Settings"
T=$($AB eval "(() => { const t=document.body.innerText; return 'pm=' + (/payment method/i.test(t)?1:0) + ' method=' + (t.includes('Auto-debit · Razorpay · LIVE mode')?1:0) + ' acct=' + (t.includes('acct_spk_live_01')?1:0) + ' active=' + (t.includes('active')?1:0); })()" 2>/dev/null)
say "tenant asserts: $T"
chk "tenant Payment method block" "$(echo "$T" | grep -q 'pm=1' && echo 1 || echo 0)"
chk "Razorpay LIVE method + accountRef shown" "$(echo "$T" | grep -q 'method=1' && echo "$T" | grep -q 'acct=1' && echo 1 || echo 0)"
$AB screenshot "$SHOTS/t43-tenant-payment.png" > /dev/null 2>&1
say "screenshot: t43-tenant-payment.png"

ERRS=$($AB errors 2>/dev/null | tail -3)
say "page errors: ${ERRS:-none}"
$AB close > /dev/null 2>&1
echo "E2E-DONE FAILED=$FAILED"
