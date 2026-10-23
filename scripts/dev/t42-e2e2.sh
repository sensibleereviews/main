#!/bin/bash
# Task 42 E2E part 2 — scroll captures + flags toggle + PDF text extraction
set -u
AB="agent-browser"
SHOT=/home/z/my-project/scripts/shots
TEN=/tmp/t42-tenant.pdf
REP=/tmp/t42-report.pdf

ev() { $AB eval "$1" 2>&1; }
click_text() {
  ev "(() => { const els = [...document.querySelectorAll('button, a, [role=button]')]; const el = els.find(b => b.textContent.trim().includes('$1')); if (el) { el.click(); return 'clicked: $1'; } return 'NOT FOUND: $1'; })()"
}
check_text() {
  ev "(() => { const t = document.body.innerText; const missing = '$1'.split('|').filter(x => !t.includes(x)); return missing.length === 0 ? 'OK: $2' : 'MISSING: ' + missing.join('|'); })()"
}

echo "=== tenant: scroll to new cards ==="
$AB open http://localhost:3000/login > /dev/null 2>&1
sleep 4
click_text "Business owner"
sleep 5
click_text "Settings"
sleep 3
$AB eval "(() => { const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Monthly PDF report')); if (el) { el.scrollIntoView({ block: 'center' }); return 'scrolled'; } return 'NOT FOUND'; })()"
sleep 1
$AB screenshot "$SHOT/t42-settings-cards.png" > /dev/null 2>&1
$AB eval "(() => { const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Channels')); if (el) { el.scrollIntoView({ block: 'center' }); return 'scrolled'; } return 'NOT FOUND'; })()"
sleep 1
$AB screenshot "$SHOT/t42-settings-flags.png" > /dev/null 2>&1

echo "=== toggle monthly_pdf off/on ==="
click_text "Download PDF"
sleep 2
$AB eval "(() => { const cards = [...document.querySelectorAll('section')]; const card = cards.find(c => c.textContent.includes('Channels & features')); if (!card) return 'no card'; const sw = card.querySelector('button[role=switch]'); const row = [...card.querySelectorAll('.rounded-xl.border')].find(d => d.textContent.includes('Monthly PDF report')); const s = row && row.querySelector('button[role=switch]'); if (s) { s.click(); return 'toggled off'; } return 'no switch'; })()"
sleep 2
check_text "not currently available|switched off by Sensiblee|switched off" flag-off-note
$AB eval "(() => { const cards = [...document.querySelectorAll('section')]; const card = cards.find(c => c.textContent.includes('Channels & features')); const row = [...card.querySelectorAll('.rounded-xl.border')].find(d => d.textContent.includes('Monthly PDF report')); const s = row.querySelector('button[role=switch]'); s.click(); return 'toggled back on'; })()"
sleep 2
check_text "Live for your workspace" flag-back-on

echo "=== admin: flags toggle + billing ==="
$AB cookies clear > /dev/null 2>&1
$AB open http://localhost:3000/login > /dev/null 2>&1
sleep 4
ev "(() => { const set = (sel, val) => { const el = document.querySelector(sel); const p = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; p.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); }; set('input[type=\"email\"]', 'admin@sensiblee.in'); set('input[type=\"password\"]', 'Demo@1234'); return 'filled'; })()"
click_text "Sign in"
sleep 5
click_text "System"
sleep 3
$AB eval "(() => { const h = [...document.querySelectorAll('h3')].find(x => x.textContent.includes('Feature flags')); if (h) { h.scrollIntoView({ block: 'start' }); return 'scrolled'; } return 'NOT FOUND'; })()"
sleep 1
$AB screenshot "$SHOT/t42-admin-flags.png" > /dev/null 2>&1
click_text "Billing"
sleep 3
$AB screenshot "$SHOT/t42-admin-billing-pdf.png" > /dev/null 2>&1

$AB close --all > /dev/null 2>&1
echo "E2E-2 DONE"
