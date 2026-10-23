#!/bin/bash
# Task 42 browser E2E — settings cards, invoices dialog (GST+PDF), admin flags, admin billing PDF
set -u
AB="agent-browser"
SHOT=/home/z/my-project/scripts/shots
mkdir -p "$SHOT"

ev() { $AB eval "$1" 2>&1; }
click_text() {
  ev "(() => { const els = [...document.querySelectorAll('button, a, [role=button]')]; const el = els.find(b => b.textContent.trim().includes('$1')); if (el) { el.click(); return 'clicked: $1'; } return 'NOT FOUND: $1'; })()"
}
check_text() {
  ev "(() => { const t = document.body.innerText; const missing = '$1'.split('|').filter(x => !t.includes(x)); return missing.length === 0 ? 'OK: $2' : 'MISSING: ' + missing.join('|'); })()"
}

echo "=== tenant flow ==="
$AB open http://localhost:3000/login > /dev/null 2>&1
sleep 4
click_text "Business owner"
sleep 5
$AB get url
check_text "Spice Route" tenant-dashboard
click_text "Settings"
sleep 3
check_text "Monthly PDF report|AI usage|Channels & features" settings-cards
$AB scroll down 1200
sleep 1
$AB screenshot "$SHOT/t42-settings-cards.png" > /dev/null 2>&1
check_text "Live for your workspace" flag-effective
check_text "Export usage CSV|tokens" ai-usage-card

echo "=== invoices dialog ==="
click_text "View invoices"
sleep 3
check_text "Billing & invoices|Every payment carries a GST invoice" invoice-dialog-open
$AB screenshot "$SHOT/t42-invoices-dialog.png" > /dev/null 2>&1
click_text "SS-2026"
sleep 3
check_text "GST @ 18%|Download invoice PDF|Total" invoice-gst-detail
$AB screenshot "$SHOT/t42-invoice-gst.png" > /dev/null 2>&1
$AB press Escape
sleep 1

echo "=== admin flow ==="
$AB cookies clear > /dev/null 2>&1
$AB open http://localhost:3000/login > /dev/null 2>&1
sleep 4
ev "(() => { const set = (sel, val) => { const el = document.querySelector(sel); const p = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; p.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); }; set('input[type=\"email\"]', 'admin@sensiblee.in'); set('input[type=\"password\"]', 'Demo@1234'); return 'filled'; })()"
click_text "Sign in"
sleep 5
$AB get url
click_text "System"
sleep 3
check_text "Feature flags|WhatsApp review requests|AI usage metering" admin-flags-card
$AB screenshot "$SHOT/t42-admin-flags.png" > /dev/null 2>&1
click_text "Billing"
sleep 3
check_text "PDF" admin-billing-pdf-btn
$AB screenshot "$SHOT/t42-admin-billing-pdf.png" > /dev/null 2>&1

$AB close --all > /dev/null 2>&1
echo "E2E DONE"
