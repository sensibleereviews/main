#!/bin/bash
# verify-contact-form.sh — E2E test of the functional forms in the static HTML export.
# Runs everything in one session (background procs die between Bash tool calls).
set -u
cd /home/z/my-project
PASS=0; FAIL=0
ok()   { echo "PASS: $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL: $1"; FAIL=$((FAIL+1)); }
assert() { if echo "$2" | grep -q "$1"; then ok "$3"; else bad "$3 — got: $(echo "$2" | head -c 200)"; fi; }

rm -f scripts/mock-formsubmit.log

# --- servers ---
python3 scripts/mock-formsubmit.py & MOCK=$!
python3 -m http.server 8021 --directory scripts/static-export/site >/dev/null 2>&1 & SRV=$!
sleep 1

agent-browser close >/dev/null 2>&1
agent-browser open "http://localhost:8021/contact-us.html" >/dev/null
agent-browser set viewport 1440 900 >/dev/null
agent-browser errors --clear >/dev/null 2>&1

# read the first result panel (plain string, no JSON wrapper)
RESULT="var p=document.querySelector('.form-result'); p ? p.textContent : 'NO-PANEL'"
# wait until a result panel exists (async submissions)
WAITPANEL="!!document.querySelector('.form-result')"

# ---------- 1. contact: validation error (empty form) ----------
agent-browser eval "window.SENSIBLEE_FORM_ENDPOINT='http://127.0.0.1:8799/ajax'" >/dev/null
agent-browser eval "document.querySelector('[data-inquiry-submit]').click()" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "Please add your name and a valid email" "$(cat /tmp/r.txt)" "contact validation error panel"

# ---------- 2. contact: invalid email ----------
agent-browser eval "document.querySelector('[data-inquiry=\"name\"]').value='Test User';document.querySelector('[data-inquiry=\"email\"]').value='not-an-email';document.querySelector('[data-inquiry-submit]').click()" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "a valid email" "$(cat /tmp/r.txt)" "contact invalid-email panel"

# ---------- 3. contact: chip select + successful submit ----------
agent-browser eval "var b=document.querySelector('[data-chip-group=\"Locations\"] button'); b.click(); b.getAttribute('aria-pressed') + '|' + b.style.backgroundColor" > /tmp/r.txt
assert "true|rgb(227, 245, 234)" "$(cat /tmp/r.txt)" "chip selects + mint-soft style"

agent-browser eval "var g=function(n){return document.querySelector('[data-inquiry=\"'+n+'\"]')}; g('name').value='Test User'; g('business').value='Spice Route Kitchen'; g('email').value='test@example.com'; g('phone').value='+91 90000 00000'; g('message').value='We run 3 outlets and reply late on weekends.'; document.querySelector('[data-inquiry-submit]').click(); 'submitted'" >/dev/null
agent-browser wait --fn "$WAITPANEL" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "Thank you, Test!" "$(cat /tmp/r.txt)" "contact success panel"
assert "sensibleereviews@gmail.com" "$(cat /tmp/r.txt)" "success panel shows recipient"

grep -q '"Name":"Test User"' scripts/mock-formsubmit.log && ok "email payload: Name" || bad "email payload: Name"
grep -q '"Business":"Spice Route Kitchen"' scripts/mock-formsubmit.log && ok "email payload: Business" || bad "email payload: Business"
grep -q '"Email":"test@example.com"' scripts/mock-formsubmit.log && ok "email payload: Email" || bad "email payload: Email"
grep -q '"Phone":"+91 90000 00000"' scripts/mock-formsubmit.log && ok "email payload: Phone" || bad "email payload: Phone"
grep -q '"Locations":"1 location"' scripts/mock-formsubmit.log && ok "email payload: selected chip (Locations)" || bad "email payload: selected chip (Locations)"
grep -q '"Message":"We run 3 outlets' scripts/mock-formsubmit.log && ok "email payload: Message" || bad "email payload: Message"
grep -q '"_subject":"New inquiry from the sensiblee website - Test User"' scripts/mock-formsubmit.log && ok "email payload: _subject" || bad "email payload: _subject"
grep -q '"_captcha":"false"' scripts/mock-formsubmit.log && ok "email payload: _captcha" || bad "email payload: _captcha"

# fields + chips reset after success?
agent-browser eval "document.querySelector('[data-inquiry=\"name\"]').value + '|' + (document.querySelector('[data-chip-group=\"Locations\"] button[aria-pressed=\"true\"]') ? 'chip-on' : 'chip-off')" > /tmp/r.txt
if grep -qF "|chip-off" /tmp/r.txt; then ok "contact fields reset + chips deselected after success"; else bad "contact fields reset — got: $(cat /tmp/r.txt)"; fi

agent-browser screenshot scripts/form-contact-success.png >/dev/null

# ---------- 4. contact: network failure -> mailto fallback ----------
agent-browser eval "window.SENSIBLEE_FORM_ENDPOINT='http://127.0.0.1:9/ajax'; document.querySelector('[data-inquiry=\"name\"]').value='Test User'; document.querySelector('[data-inquiry=\"email\"]').value='test@example.com'; document.querySelector('[data-inquiry-submit]').click(); 'submitted'" >/dev/null
agent-browser wait --fn "$WAITPANEL" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "couldn't send your message" "$(cat /tmp/r.txt)" "contact network-error panel"
assert "email us directly" "$(cat /tmp/r.txt)" "contact error has mailto fallback"

# ---------- 5. ticket: happy path ----------
agent-browser open "http://localhost:8021/submit-a-ticket.html" >/dev/null
agent-browser eval "window.SENSIBLEE_FORM_ENDPOINT='http://127.0.0.1:8799/ajax'" >/dev/null
agent-browser eval "var f=document.querySelector('form[data-email-form]'); f.querySelector('[name=\"name\"]').value='Priya Nair'; f.querySelector('[name=\"email\"]').value='priya@example.in'; f.querySelector('[name=\"business\"]').value='Cafe Nirvana'; f.querySelector('[name=\"topic\"]').value='Google sync'; f.querySelector('[name=\"message\"]').value='Google reviews stopped syncing since Friday.'; f.querySelector('[type=\"submit\"]').click(); 'submitted'" >/dev/null
agent-browser wait --fn "$WAITPANEL" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "Thank you, Priya!" "$(cat /tmp/r.txt)" "ticket success panel"

grep -q '"name":"Priya Nair"' scripts/mock-formsubmit.log && ok "ticket payload: name" || bad "ticket payload: name"
grep -q '"topic":"Google sync"' scripts/mock-formsubmit.log && ok "ticket payload: topic" || bad "ticket payload: topic"
grep -q '"Priority":"Normal"' scripts/mock-formsubmit.log && ok "ticket payload: priority mirror (default Normal)" || bad "ticket payload: priority mirror"
grep -q '"message":"Google reviews stopped syncing' scripts/mock-formsubmit.log && ok "ticket payload: message" || bad "ticket payload: message"
grep -q '"_subject":"Support ticket request' scripts/mock-formsubmit.log && ok "ticket payload: _subject" || bad "ticket payload: _subject"

agent-browser screenshot scripts/form-ticket-success.png >/dev/null

# ---------- 6. ticket: priority chip -> mirror sync ----------
agent-browser eval "var chips=document.querySelectorAll('[data-chip-group=\"Priority\"] button'); chips[2].click(); document.querySelector('[data-priority-mirror]').value + '|' + document.querySelectorAll('[data-chip-group=\"Priority\"] button[aria-pressed=\"true\"]').length" > /tmp/r.txt
assert "High|1" "$(cat /tmp/r.txt)" "priority chip -> mirror sync (High), single-select"

# ---------- 7. ticket: gateway failure (success:false) with filled form ----------
agent-browser eval "window.SENSIBLEE_FORM_ENDPOINT='http://127.0.0.1:8799/fail'; var f=document.querySelector('form[data-email-form]'); f.querySelector('[name=\"name\"]').value='Priya Nair'; f.querySelector('[name=\"email\"]').value='priya@example.in'; f.querySelector('[type=\"submit\"]').click(); 'submitted'" >/dev/null
agent-browser wait --fn "$WAITPANEL" >/dev/null
agent-browser eval "$RESULT" > /tmp/r.txt
assert "couldn't send your ticket" "$(cat /tmp/r.txt)" "ticket failure panel"
assert "email us directly" "$(cat /tmp/r.txt)" "ticket failure has mailto fallback"

# ---------- 8. page errors (uncaught exceptions) ----------
agent-browser errors > /tmp/r.txt 2>&1
if [ "$(grep -c "Error" /tmp/r.txt || true)" -le "1" ]; then ok "no uncaught page errors"; else bad "page errors: $(head -c 300 /tmp/r.txt)"; fi

echo "--- console tail (failed fetch probes are expected) ---"
agent-browser console 2>/dev/null | tail -4

# --- teardown ---
agent-browser close >/dev/null 2>&1
kill $MOCK $SRV 2>/dev/null
echo ""
echo "RESULT: $PASS passed, $FAIL failed"
exit $FAIL
