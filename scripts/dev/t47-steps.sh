#!/bin/bash
# Task 47 browser sweep v2 — client-dashboard pass (admin shots already captured).
# Runs INSIDE run-with-server.sh.
AB="agent-browser"
SHOTS=/home/z/my-project/scripts/shots
say() { echo; echo "== $*"; }
js_click() { # js_click <text-regex>
  $AB eval "(() => { const b=[...document.querySelectorAll('button, a')].find(x => ($1).test((x.textContent||'') + ' ' + (x.title||''))); if(b){b.click(); return 'clicked:'+(b.textContent||b.title).trim().slice(0,40);} return 'NOT FOUND'; })()"
}

$AB set viewport 1440 900
$AB errors --clear >/dev/null

say "A1. admin light — fresh CSS + placeholder/mint fixes"
$AB open http://localhost:3000/admin/tenants
$AB wait --load networkidle; $AB wait 1500
HREF=$($AB eval "document.querySelector('link[rel=stylesheet]').href" | tr -d '"')
echo "css-fresh-count:$(curl -s "$HREF" | rg -c 'hover:bg-mint-soft')"
$AB eval "localStorage.setItem('sensiblee-theme','light'); 'ok'"
$AB reload; $AB wait --load networkidle; $AB wait 1500
$AB eval "(() => { const i=document.querySelector('.skin-admin input[placeholder]'); return 'phColor:' + getComputedStyle(i,'::placeholder').color; })()"

say "S1. sign out of admin (DOM click)"
js_click "/sign out/i"
$AB wait 1500
$AB eval "(() => 'signin-form:' + !!document.querySelector('input'))"

say "C1. client login"
$AB open http://localhost:3000/app
$AB wait --load networkidle; $AB wait 1200
SNAP=$($AB snapshot -i -c)
REFS=$(echo "$SNAP" | rg -o 'textbox "[^"]+" \[ref=(e\d+)\]' | rg -o 'e\d+')
R1=$(echo "$REFS" | sed -n 1p); R2=$(echo "$REFS" | sed -n 2p)
echo "login refs: $R1 $R2"
$AB fill "@$R1" "anand@spiceroute.in"
$AB fill "@$R2" "Demo@1234"
SIGNIN=$(echo "$SNAP" | rg -o 'button "Sign in" \[ref=(e\d+)\]' | rg -o 'e\d+' | head -1)
$AB click "@$SIGNIN"
$AB wait --load networkidle; $AB wait 2000
$AB eval "(() => 'skin-client:' + !!document.querySelector('.skin-client') + ' wizard:' + (!!document.querySelector('[role=dialog]')))"

say "C2. ensure dark theme, overview shot"
$AB eval "localStorage.setItem('sensiblee-theme','dark'); 'ok'"
$AB reload; $AB wait --load networkidle; $AB wait 1800
$AB snapshot -i -c | rg -o 'button "[^"]+"' | sort -u | head -24
$AB screenshot $SHOTS/t47-client-overview-dark.png

say "C4. client dark views"
click_view() { js_click "/$1/i"; $AB wait 1100; $AB screenshot "$SHOTS/$2" && echo "shot ok: $2" || echo "shot FAIL: $2"; }
click_view "Reviews"   t47-client-reviews-dark.png
click_view "Locations" t47-client-locations-dark.png
click_view "assistant|AI" t47-client-ai-dark.png
click_view "Analytics" t47-client-analytics-dark.png
click_view "Settings"  t47-client-settings-dark.png

say "C5. client light — overview + settings"
$AB eval "localStorage.setItem('sensiblee-theme','light'); 'ok'"
$AB reload; $AB wait --load networkidle; $AB wait 1800
$AB screenshot $SHOTS/t47-client-overview-light.png
js_click "/settings/i"; $AB wait 1100
$AB screenshot $SHOTS/t47-client-settings-light.png

say "G2. guest page dark"
$AB eval "localStorage.setItem('sensiblee-theme','dark'); 'ok'"
$AB open http://localhost:3000/g/spk-kor
$AB wait --load networkidle; $AB wait 1500
$AB screenshot $SHOTS/t47-guest-dark.png

say "Z. page errors since clear"
$AB errors
echo; echo "SWEEP V2 DONE"
