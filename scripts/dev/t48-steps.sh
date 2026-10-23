#!/bin/bash
# Task 48 E2E sweep — server lives inside this single invocation.
# Verifies: Command Centre overview, Action Center, location drill-down, GBP readiness.
cd /home/z/my-project || exit 1

setsid node node_modules/.bin/next dev -p 3000 > scripts/dev/next-dev.log 2>&1 &
SERVER_PID=$!
PGID=$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')
cleanup() {
  if [ -n "$PGID" ]; then
    kill -TERM -- -"$PGID" 2>/dev/null
    sleep 1
    kill -KILL -- -"$PGID" 2>/dev/null
  fi
}
trap cleanup EXIT

up=0
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then up=1; break; fi
  sleep 1
done
if [ "$up" != "1" ]; then echo "SERVER FAILED TO START"; tail -20 scripts/dev/next-dev.log; exit 1; fi
echo "server ready (attempt $i)"

AB="agent-browser"
mkdir -p scripts/shots
$AB set viewport 1440 900

# fresh login (demo quick-login button pre-fills owner creds, then Sign in)
$AB open "http://localhost:3000/login" > /dev/null
sleep 2
$AB snapshot -i > /tmp/t48-snap.txt 2>/dev/null
OWNER_REF=$(rg -o 'button "Business owner[^"]*" \[ref=(e\d+)\]' -r '$1' /tmp/t48-snap.txt | head -1)
if [ -n "$OWNER_REF" ]; then $AB click "@$OWNER_REF"; fi
SIGN_REF=$(rg -o 'button "Sign in" \[ref=(e\d+)\]' -r '$1' /tmp/t48-snap.txt | head -1)
if [ -n "$SIGN_REF" ]; then $AB click "@$SIGN_REF"; fi
sleep 5
echo "url-after-login: $($AB get url)"

echo "=== API sanity: /api/issues + /api/health ==="
$AB eval "Promise.all([fetch('/api/issues').then(r=>r.json()), fetch('/api/health').then(r=>r.json())]).then(([i,h]) => JSON.stringify({ issues: i.issues ? i.issues.length : ('ERR:'+(i.error||'').slice(0,60)), issueTitles: i.issues ? i.issues.slice(0,3).map(x=>x.title+' ('+x.mentions+')') : [], healthScore: h.score, band: h.band, delta: h.delta, dims: h.dimensions ? h.dimensions.length : 0, themes: h.themes ? h.themes.slice(0,2).map(t=>t.label+' '+t.share+'%') : [], staff: h.staff ? h.staff.slice(0,2).map(s=>s.name+' '+s.mentions) : [], roi: h.roi ? h.roi.requested+'/'+h.roi.generated : null }))"

echo "=== OVERVIEW hero ==="
sleep 1
$AB eval "(() => { const t = document.body.innerText.toLowerCase(); return JSON.stringify({ hero: t.includes('reputation health'), why: t.includes('why this score'), loop: t.includes('analyze'), attention: t.includes('needs attention'), best: t.includes('best location') }); })()"
$AB screenshot scripts/shots/t48-overview.png > /dev/null

echo "=== ACTION CENTER ==="
$AB eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim()==='Action Center'); if(b){b.click(); return 'clicked';} return 'nav-not-found'; })()"
sleep 3
$AB eval "(() => { const t = document.body.innerText.toLowerCase(); return JSON.stringify({ title: t.includes('action center'), openIssues: t.includes('open issues'), recommended: t.includes('recommended action'), themes: t.includes('top negative themes'), owner: t.includes('location manager'), startBtn: t.includes('start fixing') }); })()"
$AB screenshot scripts/shots/t48-actions.png > /dev/null

echo "=== LOCATIONS DRILL-DOWN ==="
$AB eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim()==='Locations'); if(b){b.click(); return 'clicked';} return 'nav-not-found'; })()"
sleep 3
$AB eval "(() => { const cards=[...document.querySelectorAll('[role=button]')]; const c=cards.find(x=>/Spice Route/.test(x.textContent||'')); if(c){c.click(); return 'card-clicked';} return 'no-card'; })()"
sleep 3
$AB eval "(() => { const t = document.body.innerText.toLowerCase(); return JSON.stringify({ problems: t.includes('top problems'), trend: t.includes('4-month trend'), staffMentions: t.includes('customer mentions'), coaching: t.includes('coaching context'), amit: t.includes('amit') }); })()"
$AB screenshot scripts/shots/t48-drawer.png > /dev/null
$AB eval "(() => { const x=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Close'); if(x){x.click();} return 'closed'; })()" > /dev/null
sleep 1.5
echo "=== GBP READINESS (locations page bottom) ==="
$AB eval "(() => { const t = document.body.innerText.toLowerCase(); return JSON.stringify({ gbpReadiness: t.includes('google business profile api readiness'), oauth: t.includes('oauth onboarding'), pubsub: t.includes('pub/sub'), quotas: t.includes('api quotas') }); })()"

echo "sweep-done"
