#!/bin/bash
# Task 50 — Part 2 refined-version E2E: API alert fields + browser renames,
# pricing Contact Us, Reputation alert card, reviews filters, issue outcome.
# One-invocation server pattern (sandbox reaps cross-call orphans).
set -u
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
if [ "$up" != "1" ]; then echo "SERVER FAILED"; tail -20 scripts/dev/next-dev.log; exit 1; fi
echo "== server ready (attempt $i) =="

AB="agent-browser"
mkdir -p scripts/shots
$AB set viewport 1440 900

echo "== API: /api/plans prices (public) =="
curl -s http://localhost:3000/api/plans | python3 -c "import json,sys; d=json.load(sys.stdin); print([(p['id'],p['monthlyInr'],p['seats'],p['popular']) for p in d['plans']])"

# fresh login via demo quick-login (owner prefill) — t48 pattern
$AB open "http://localhost:3000/login" > /dev/null
sleep 2
$AB snapshot -i > /tmp/t50-snap.txt 2>/dev/null
OWNER_REF=$(rg -o 'button "Business owner[^"]*" \[ref=(e\d+)\]' -r '$1' /tmp/t50-snap.txt | head -1)
if [ -n "$OWNER_REF" ]; then $AB click "@$OWNER_REF"; fi
SIGN_REF=$(rg -o 'button "Sign in" \[ref=(e\d+)\]' -r '$1' /tmp/t50-snap.txt | head -1)
if [ -n "$SIGN_REF" ]; then $AB click "@$SIGN_REF"; fi
sleep 5
echo "url-after-login: $($AB get url)"

echo "== API (in-app fetch): /api/issues alert fields =="
$AB eval "fetch('/api/issues').then(r=>r.json()).then(i => JSON.stringify(i.issues.slice(0,3).map(x => ({ t: x.title.slice(0,40), peak: x.peakWindow, emp: x.employeesMentioned, risk: x.revenueRisk, rH: x.resolvedHealth }))))"
echo "== API: /api/health alert + dims =="
$AB eval "fetch('/api/health').then(r=>r.json()).then(h => JSON.stringify({ alert: h.alert ? { loc: h.alert.location, neg: h.alert.negativeReviews, peak: h.alert.peakWindow, emp: h.alert.employeesMentioned, risk: h.alert.revenueRisk, issue: h.alert.topIssue, trend: h.alert.trendPct } : null, dims: h.dimensions.map(d => d.label + ' ' + d.max), roi: h.roi.requested + '/' + h.roi.generated + ' conv ' + h.roi.conversion + '% improved ' + h.roi.locationsImproved + '/' + h.roi.locationsTotal }))"
echo "== API: /api/reviews compound filter =="
$AB eval "fetch('/api/reviews?sentiment=negative&staff=any&category=waiting').then(r=>r.json()).then(d => 'filtered total: ' + d.total)"

echo "== BROWSER: home renames + pricing =="
$AB open "http://localhost:3000/" > /dev/null
sleep 2
$AB eval "(() => { const t = document.body.innerText; const names = ['Reputation Command Center','Reputation Health','AI Reputation Copilot','Review Growth Engine','Location Intelligence','Reputation Action Center']; return JSON.stringify({ found: names.filter(n => t.includes(n)).length + '/6', stale: ['AI Reputation Assistant','Staff & Location Drill-Down','Issue & Action Tracking'].filter(n => t.includes(n)) }); })()"
$AB open "http://localhost:3000/pricing" > /dev/null
sleep 2
$AB eval "(() => { const t = document.body.innerText; return JSON.stringify({ contact10: t.includes('Running more than 10 locations?') && t.includes('Contact Us'), wa: t.includes('billed separately'), prices: ['₹1,499','₹3,499','₹5,999'].filter(p => t.includes(p)), scale: t.includes('Scale') && !t.includes('Enterprise'), gst: t.includes('GST') }); })()"
$AB screenshot scripts/shots/t50-pricing.png > /dev/null

echo "== BROWSER: overview alert card + dims =="
$AB open "http://localhost:3000/app" > /dev/null
sleep 3
$AB eval "(() => { const t = document.body.innerText; return JSON.stringify({ alertCard: t.includes('Reputation alert'), revenueRisk: t.includes('Revenue risk:'), mostAffected: t.includes('Most affected:'), employees: t.includes('Employees mentioned:'), loop: t.includes('Analyze'), dims7: ['Rating quality','Rating trend','Review velocity','Sentiment','Response performance','Customer complaint trends','Location consistency'].filter(d => t.includes(d)).length + '/7' }); })()"
$AB screenshot scripts/shots/t50-overview.png > /dev/null

echo "== BROWSER: reviews filters =="
$AB eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim().startsWith('Reviews')); if(b){b.click(); return 'clicked';} return 'not-found'; })()"
sleep 2
$AB eval "(() => { const t = document.body.innerText; const sels=[...document.querySelectorAll('select')].map(s=>s.getAttribute('aria-label')); return JSON.stringify({ sels, unanswered: t.includes('Unanswered'), heading: t.includes('Reputation Command Center') }); })()"

echo "== BROWSER: action center alert + resolve outcome =="
$AB eval "(() => { const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim()==='Action Center'); if(b){b.click(); return 'clicked';} return 'not-found'; })()"
sleep 2
$AB eval "(() => { const t = document.body.innerText; return JSON.stringify({ risk: t.includes('Revenue risk:'), peak: t.includes('Most affected:'), emp: t.includes('Employees mentioned:'), themes: t.includes('Top negative themes') }); })()"
$AB screenshot scripts/shots/t50-actions.png > /dev/null

# resolve the first in_progress-or-open issue → outcome snapshot → verify strip
$AB eval "(async () => { const r = await fetch('/api/issues').then(x=>x.json()); const target = r.issues.find(i=>i.status!=='resolved'); if(!target) return 'no-open-issue'; await fetch('/api/issues', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: target.id, status: 'in_progress' }) }); await fetch('/api/issues', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: target.id, status: 'resolved', resolvedNote: 'E2E: staffing fix verified' }) }); const after = await fetch('/api/issues').then(x=>x.json()); const done = after.issues.find(i=>i.id===target.id); return JSON.stringify({ title: done.title.slice(0,36), resolvedHealth: done.resolvedHealth, resolvedRating: done.resolvedRating, resolvedMentions: done.resolvedMentions }); })()"
sleep 1
$AB eval "(() => { const t = document.body.innerText; return JSON.stringify({ outcomeStrip: /Complaints/.test(t) && /Health/.test(t), resolvedBadge: t.includes('Resolved') }); })()"
$AB screenshot scripts/shots/t50-outcome.png > /dev/null

echo "== DONE =="
