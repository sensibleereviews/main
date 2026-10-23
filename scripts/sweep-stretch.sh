#!/bin/bash
# Layout stretch sweep: 390px overflow + 1440px page errors across all marketing routes
ROUTES=("" "features" "how-it-works" "pricing" "customer-stories" "about-us" "contact-us" "blog" "faqs" "security-trust" "sitemap" "privacy-policy" "terms-of-service" "submit-a-ticket")
agent-browser set viewport 1440 900 >/dev/null
for r in "${ROUTES[@]}"; do
  agent-browser open "http://localhost:3000/$r" >/dev/null 2>&1
  sleep 0.6
  err=$(agent-browser errors 2>/dev/null | grep -c "error" || true)
  echo "1440 /$r errors=$err"
done
agent-browser errors --clear >/dev/null 2>&1
agent-browser set viewport 390 844 >/dev/null
for r in "${ROUTES[@]}"; do
  agent-browser open "http://localhost:3000/$r" >/dev/null 2>&1
  sleep 0.6
  w=$(agent-browser eval "document.documentElement.scrollWidth" 2>/dev/null)
  echo "390 /$r scrollWidth=$w"
done
