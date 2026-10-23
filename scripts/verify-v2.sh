#!/bin/bash
# verify-v2.sh — E2E verification of the v2 static export changes.
set -u
cd /home/z/my-project
PASS=0; FAIL=0
ok()   { echo "PASS: $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

rm -f scripts/mock-formsubmit.log
python3 scripts/mock-formsubmit.py & MOCK=$!
python3 -m http.server 8021 --directory scripts/static-export/site >/dev/null 2>&1 & SRV=$!
sleep 1

# --- static asset checks ---
for u in assets/blog/ai-learns-your-restaurants-voice-mid.jpg assets/demo/demo-poster.png assets/demo/sensiblee-demo.mp4; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8021/$u)
  [ "$code" = "200" ] && ok "asset 200: $u" || bad "asset $code: $u"
done
n_mid=$(ls scripts/static-export/site/assets/blog/*-mid.jpg 2>/dev/null | wc -l)
[ "$n_mid" -ge 10 ] && ok "10 mid images present" || bad "only $n_mid mid images"
[ ! -f scripts/static-export/site/demo.html ] && ok "demo.html removed" || bad "demo.html still exists"
grep -rq 'href="demo.html"' scripts/static-export/site --include="*.html" && bad "demo.html still referenced" || ok "no demo.html references"
grep -q 'data-email-form\|formsubmit' scripts/static-export/site/submit-a-ticket.html && bad "ticket form still wired" || ok "ticket form inert (no formsubmit refs)"

agent-browser close >/dev/null 2>&1
agent-browser errors --clear >/dev/null 2>&1

# --- 1. contact form still emails ---
agent-browser open "http://localhost:8021/contact-us.html" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1; agent-browser wait 500 >/dev/null
agent-browser eval "window.SENSIBLEE_FORM_ENDPOINT='http://127.0.0.1:8799/ajax'" >/dev/null
agent-browser eval "var g=function(n){return document.querySelector('[data-inquiry=\"'+n+'\"]')}; g('name').value='Ravi Kumar'; g('email').value='ravi@x.in'; document.querySelector('[data-inquiry-submit]').click(); 'sent'" >/dev/null
agent-browser wait --fn "!!document.querySelector('.form-result')" >/dev/null 2>&1
r=$(agent-browser eval "document.querySelector('.form-result').textContent")
echo "$r" | grep -q "Thank you, Ravi!" && ok "contact form still emails (success panel)" || bad "contact form: $r"
grep -q '"Name":"Ravi Kumar"' scripts/mock-formsubmit.log && ok "contact payload reached gateway" || bad "contact payload missing"

# --- 2. ticket form inert ---
agent-browser open "http://localhost:8021/submit-a-ticket.html" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1; agent-browser wait 500 >/dev/null
agent-browser eval "var f=document.querySelector('form'); f.querySelector('[name=\"name\"]').value='X'; f.querySelector('[name=\"email\"]').value='x@x.in'; f.querySelector('[type=\"submit\"]').click(); 'clicked'" >/dev/null
agent-browser wait 600 >/dev/null
url=$(agent-browser get url)
r=$(agent-browser eval "document.querySelector('.form-result') ? 'panel' : 'no-panel'")
echo "$url" | grep -q "submit-a-ticket.html" && ok "ticket submit: no navigation" || bad "ticket navigated to $url"
echo "$r" | grep -q "no-panel" && ok "ticket submit: no email panel (inert)" || bad "ticket showed panel: $r"
lines=$(grep -c "=====" scripts/mock-formsubmit.log || true)
[ "$lines" = "1" ] && ok "ticket submit sent nothing to gateway" || bad "gateway got $lines requests"

# --- 3. auth screens ---
agent-browser open "http://localhost:8021/signin.html" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1; agent-browser wait 900 >/dev/null
agent-browser set viewport 1280 800 >/dev/null
agent-browser screenshot scripts/static-export/dev/signin-static.png >/dev/null
r=$(agent-browser eval "document.querySelector('form') ? 'form-present' : 'no-form'")
echo "$r" | grep -q "form-present" && ok "signin: real app form present" || bad "signin: $r"
agent-browser eval "document.querySelector('form').querySelector('button[type=\"submit\"], button').click(); 'clicked'" >/dev/null 2>&1
agent-browser wait 500 >/dev/null
url=$(agent-browser get url)
echo "$url" | grep -q "signin.html" && ok "signin submit: inert (no navigation)" || bad "signin navigated to $url"
agent-browser find text "Start your free trial" click >/dev/null 2>&1
agent-browser wait 600 >/dev/null
url=$(agent-browser get url)
echo "$url" | grep -q "signup.html" && ok "signin -> signup cross-link works" || bad "cross-link failed: $url"
agent-browser screenshot scripts/static-export/dev/signup-static.png >/dev/null

# --- 4. Watch Demo -> home demo section ---
agent-browser open "http://localhost:8021/features.html" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1; agent-browser wait 600 >/dev/null
agent-browser eval "document.querySelector('a[href\$=\"#demo-video\"]').click(); 'clicked'" >/dev/null 2>&1
agent-browser wait 900 >/dev/null
url=$(agent-browser get url)
echo "$url" | grep -q "index.html#demo-video" && ok "Watch Demo -> home demo section" || bad "watch demo: $url"
r=$(agent-browser eval "var v=document.querySelector('#demo-video video'); v ? v.querySelectorAll('source').length + '-sources' : 'no-video'")
echo "$r" | grep -q "2-sources" && ok "demo video element with 2 sources" || bad "video: $r"

# --- 5. blog article: mid image loads + logo goes home ---
agent-browser open "http://localhost:8021/blog/how-an-ai-learns-your-restaurants-voice-without-sounding-like-a-robot.html" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1; agent-browser wait 700 >/dev/null
r=$(agent-browser eval "var i=document.querySelector('img[src*=\"-mid\"]'); i ? i.naturalWidth + 'x' + i.naturalHeight : 'no-mid-img'")
echo "$r" | grep -qv "0x0" && echo "$r" | grep -qv "no-mid" && ok "blog mid image loads ($r)" || bad "mid image broken: $r"
agent-browser eval "document.querySelector('a[aria-label=\"Sensiblee home\"]').href" > /tmp/logo.txt
grep -q "index.html" /tmp/logo.txt && ok "article header logo -> home" || bad "article logo: $(cat /tmp/logo.txt)"
agent-browser find text "Sensiblee" click >/dev/null 2>&1 || true

# --- 6. errors sweep ---
agent-browser errors > /tmp/r.txt 2>&1
[ "$(grep -c "Error" /tmp/r.txt || true)" -le "1" ] && ok "no uncaught page errors" || bad "page errors: $(head -c 300 /tmp/r.txt)"

agent-browser close >/dev/null 2>&1
kill $MOCK $SRV 2>/dev/null
echo ""
echo "RESULT: $PASS passed, $FAIL failed"
exit $FAIL
