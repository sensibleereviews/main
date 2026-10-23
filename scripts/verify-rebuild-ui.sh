#!/bin/bash
# Browser E2E for rebuilt dashboard features UI
P=0; F=0
ab() { timeout 45 /usr/local/bin/agent-browser "$@"; }
ok() { if [ "$1" = "1" ]; then echo "PASS | $2"; P=$((P+1)); else echo "FAIL | $2"; F=$((F+1)); fi }

ab open http://localhost:3000/login >/dev/null 2>&1
ab wait --load networkidle >/dev/null 2>&1; sleep 800
ab fill 'input[type="email"]' "anand@spiceroute.in" >/dev/null 2>&1
ab fill 'input[type="password"]' "Demo@1234" >/dev/null 2>&1
ab click 'button[type="submit"]' >/dev/null 2>&1
sleep 2500
ab eval "location.pathname" > /tmp/path.txt 2>&1
ok "$(grep -q 'admin\|overview\|app\|dashboard' /tmp/path.txt && echo 1 || echo 0)" "owner logged in ($(cat /tmp/path.txt | head -1))"

# ---- AI Assistant usage card ----
ab eval "location.hash = ''; void 0" >/dev/null 2>&1
ab eval "window.__nav && window.__nav('ai'); true" >/dev/null 2>&1
ab open "http://localhost:3000/app/ai" >/dev/null 2>&1
ab wait --load networkidle >/dev/null 2>&1; sleep 1500
ab eval "!!Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('AI usage this month'))" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "AI Assistant shows 'AI usage this month' card"
ab eval "(document.body.innerText.match(/Drafts used/) || [null])[0] !== null" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "usage card shows drafts meter"
ab eval "/Tokens metered/.test(document.body.innerText) && /Estimated cost/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "usage card shows tokens + cost tiles"

# ---- Analytics report card ----
ab open "http://localhost:3000/app/analytics" >/dev/null 2>&1
ab wait --load networkidle >/dev/null 2>&1; sleep 1500
ab eval "/Monthly PDF report/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "Analytics shows Monthly PDF report card"
ab eval "/tier/.test(document.body.innerText) && /Download PDF/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "report card shows tier badge + download button"

# ---- Settings channels + invoices ----
ab open "http://localhost:3000/app/settings" >/dev/null 2>&1
ab wait --load networkidle >/dev/null 2>&1; sleep 1800
ab eval "/Review request channels/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "Settings shows Review request channels card"
ab eval "/ALWAYS ON/.test(document.body.innerText) && /Not enabled platform-wide yet/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "channels card: email+QR always on, WhatsApp locked note (system off)"
ab eval "Array.from(document.querySelectorAll('button[data-slot=\"switch-slot\"], button[role=\"switch\"]')).some(b => b.disabled)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "WhatsApp switch disabled while system flag off"

# invoices dialog
ab eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /View invoices/.test(x.textContent)); if (b) { b.click(); return 'clicked'; } return 'notfound'; })()" > /tmp/r.txt 2>&1
ok "$(grep -q clicked /tmp/r.txt && echo 1 || echo 0)" "View invoices button opens dialog"
sleep 800
ab eval "/Billing & invoices/.test(document.body.innerText) && /SS-2026/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "invoices dialog lists GST invoices"
ab eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'View'); if (b) { b.click(); return 'clicked'; } return 'notfound'; })()" > /tmp/r.txt 2>&1
sleep 900
ab eval "/GST @ 18%/.test(document.body.innerText) && /Total payable/.test(document.body.innerText) && /Download PDF/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "invoice detail modal shows GST breakup + PDF/print actions"
ab screenshot /home/z/my-project/scripts/dev/inv-detail.png >/dev/null 2>&1
ab press Escape >/dev/null 2>&1; ab press Escape >/dev/null 2>&1

# ---- Requests gating ----
ab open "http://localhost:3000/app/requests" >/dev/null 2>&1
ab wait --load networkidle >/dev/null 2>&1; sleep 1500
ab eval "/WhatsApp requests are switched off for your workspace/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "Requests shows WhatsApp locked banner (system off)"
ab eval "/Email \\+ QR · always on/.test(document.body.innerText) || /email \\+ QR request campaign/.test(document.body.innerText)" > /tmp/r.txt 2>&1
ok "$(grep -q true /tmp/r.txt && echo 1 || echo 0)" "composer falls back to email + QR mode"
ab screenshot /home/z/my-project/scripts/dev/req-gated.png >/dev/null 2>&1

echo ""
echo "UI RESULTS: $P pass, $F fail"
exit $F
