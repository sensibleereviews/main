#!/bin/bash
# Targeted screenshots — scroll the new cards into view first
set -u
AB="agent-browser"
SHOTS=/home/z/my-project/scripts/shots
mkdir -p "$SHOTS"

login() {
  $AB open http://localhost:3000/login > /dev/null 2>&1
  $AB wait --load networkidle > /dev/null 2>&1
  sleep 1.5
  local refs=$($AB snapshot -i 2>/dev/null)
  local email_ref=$(echo "$refs" | grep -oE 'textbox "WORK EMAIL" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  local pw_ref=$(echo "$refs" | grep -oE 'textbox "PASSWORD" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  local btn_ref=$(echo "$refs" | grep -oE 'button "Sign in" \[ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  $AB fill "@$email_ref" "$1" > /dev/null 2>&1
  $AB fill "@$pw_ref" "$2" > /dev/null 2>&1
  $AB click "@$btn_ref" > /dev/null 2>&1
  sleep 3.5
  $AB wait --load networkidle > /dev/null 2>&1
}

goto_view() {
  local refs=$($AB snapshot -i 2>/dev/null)
  local ref=$(echo "$refs" | grep -oE "button \"$1[^\"]*\" \[ref=(e[0-9]+)\]" | grep -oE 'e[0-9]+' | head -1)
  if [ -n "$ref" ]; then $AB click "@$ref" > /dev/null 2>&1; else
    $AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>x.textContent.trim().startsWith('$1')); if(b)b.click(); return 1; })()" > /dev/null 2>&1
  fi
  sleep 2.5
  $AB wait --load networkidle > /dev/null 2>&1
}

# admin — gateways card
login "admin@sensiblee.in" "Demo@1234"
goto_view "System"
$AB eval "(() => { const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Payment gateways')); if(h){h.scrollIntoView({block:'start'}); window.scrollBy(0,-12);} return 1; })()" > /dev/null 2>&1
sleep 1
$AB screenshot "$SHOTS/t43-admin-gateways.png" > /dev/null 2>&1
# configure panel open state
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Configure')); b.click(); return 1; })()" > /dev/null 2>&1
sleep 1
$AB eval "(() => { const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.includes('Payment gateways')); if(h)h.scrollIntoView({block:'start'}); return 1; })()" > /dev/null 2>&1
sleep 0.5
$AB screenshot "$SHOTS/t43-admin-gateway-config.png" > /dev/null 2>&1
$AB eval "(() => { const b=document.querySelector('button[title=\"Sign out\"]'); if(b)b.click(); return 1; })()" > /dev/null 2>&1
sleep 2

# tenant — plan & billing card with payment method
login "anand@spiceroute.in" "Demo@1234"
goto_view "Settings"
$AB eval "(() => { const els=[...document.querySelectorAll('p,span')]; const el=els.find(x=>/payment method/i.test(x.textContent)); if(el){el.scrollIntoView({block:'center'});} return 1; })()" > /dev/null 2>&1
sleep 1
$AB screenshot "$SHOTS/t43-tenant-payment.png" > /dev/null 2>&1
$AB close > /dev/null 2>&1
echo "shots done"
