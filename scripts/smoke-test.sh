#!/bin/bash
# Sensiblee API smoke test — exercises every critical endpoint end-to-end
BASE="http://localhost:3000"
JAR_TENANT="/tmp/ss-tenant.jar"
JAR_ADMIN="/tmp/ss-admin.jar"
PASS=0; FAIL=0

check() { # name, expected, actual
  if [[ "$3" == *"$2"* ]]; then PASS=$((PASS+1)); echo "  ✓ $1";
  else FAIL=$((FAIL+1)); echo "  ✗ $1 — expected '$2', got: ${3:0:160}"; fi
}

echo "== AUTH =="
R=$(curl -s -c $JAR_TENANT -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"anand@spiceroute.in","password":"Demo@1234"}')
check "tenant login" '"ok":true' "$R"
R=$(curl -s -c $JAR_ADMIN -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@sensiblee.in","password":"Demo@1234"}')
check "admin login" '"role":"platform_admin"' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/auth/me)
check "me (tenant)" '"planName":"Scale"' "$R"
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"anand@spiceroute.in","password":"wrong"}')
check "bad login rejected" 'Incorrect email or password' "$R"

echo "== TENANT: OVERVIEW / REVIEWS =="
R=$(curl -s -b $JAR_TENANT $BASE/api/overview)
check "overview kpis" '"kpis"' "$R"
check "overview trend" '"trend"' "$R"
# Idempotent: draft a fresh 'new' review (fallback: any review) instead of a
# pre-seeded ai-draft one, so repeated runs never exhaust the queue.
REVIEW_ID=$(curl -s -b $JAR_TENANT "$BASE/api/reviews?status=new" | python3 -c "import sys,json; d=json.load(sys.stdin); rs=[r for r in d['reviews'] if r['status']=='new']; print(rs[0]['id'] if rs else '')")
if [ -z "$REVIEW_ID" ]; then
  REVIEW_ID=$(curl -s -b $JAR_TENANT "$BASE/api/reviews" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['reviews'][0]['id'] if d['reviews'] else '')")
  echo "  (no 'new' left — fallback review: $REVIEW_ID)"
else
  echo "  (new review: $REVIEW_ID)"
fi
if [ -z "$REVIEW_ID" ]; then FAIL=$((FAIL+1)); echo "  ✗ no review available for draft flow"; fi
R=$(curl -s -b $JAR_TENANT "$BASE/api/reviews?status=awaiting&minStars=0")
check "reviews filter awaiting" '"reviews"' "$R"

echo "== TENANT: AI DRAFT + REPLY =="
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/reviews/$REVIEW_ID/draft)
check "AI draft generated" '"draft"' "$R"
DRAFT=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['review']['draft'])" 2>/dev/null | tr -d '"' | head -c 60)
echo "  draft begins: $DRAFT..."
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/reviews/$REVIEW_ID/reply -H 'Content-Type: application/json' -d "{\"body\":\"$DRAFT [approved in smoke test]\"}")
check "reply approved" '"status":"replied"' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/reviews/$REVIEW_ID/note -H 'Content-Type: application/json' -d '{"note":"Smoke-test note"}')
check "note saved" '"ok":true' "$R"

echo "== TENANT: LOCATIONS + SYNC =="
LOC_ID=$(curl -s -b $JAR_TENANT $BASE/api/locations | python3 -c "import sys,json; print(json.load(sys.stdin)['locations'][0]['id'])")
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/locations/$LOC_ID/sync)
check "location sync" '"newReviews"' "$R"
LOC_CODE=$(curl -s -b $JAR_TENANT $BASE/api/locations | python3 -c "import sys,json; print(json.load(sys.stdin)['locations'][0]['code'])")
R=$(curl -s -b $JAR_TENANT "$BASE/api/qr?code=$LOC_CODE")
check "QR generated" 'data:image/png;base64' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/locations/$LOC_ID)
check "location detail" '"syncLog"' "$R"

echo "== TENANT: CAMPAIGNS =="
R=$(curl -s -b $JAR_TENANT $BASE/api/campaigns)
check "campaigns list" '"funnel"' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/campaigns -H 'Content-Type: application/json' -d '{"templateName":"Post-dining thank you","templateBody":"Hi {name}! ... {review_link}","locationIds":[],"sendNow":true}')
check "campaign launched" '"campaign"' "$R"

echo "== TENANT: AI QUEUE / ANALYTICS / SETTINGS / TEAM / BILLING =="
R=$(curl -s -b $JAR_TENANT $BASE/api/ai/queue)
check "ai queue" '"queue"' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/analytics)
check "analytics" '"health"' "$R"
R=$(curl -s -b $JAR_TENANT -X PATCH $BASE/api/settings -H 'Content-Type: application/json' -d '{"ai":{"threshold":90}}')
check "settings patch" '"ok":true' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/billing)
check "billing" '"invoices"' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/team -H 'Content-Type: application/json' -d '{"email":"smoke-test@spiceroute.in","role":"observer"}')
check "team invite" '"tempPassword"' "$R"
TEAM_ID=$(curl -s -b $JAR_TENANT $BASE/api/team | python3 -c "import sys,json; d=json.load(sys.stdin); print([u['id'] for u in d['team'] if u['email']=='smoke-test@spiceroute.in'][0])")
R=$(curl -s -b $JAR_TENANT -X DELETE $BASE/api/team/$TEAM_ID)
check "team remove" '"ok":true' "$R"

echo "== GUEST (public) =="
R=$(curl -s $BASE/api/guest/$LOC_CODE)
check "guest info" '"business":"Spice Route Kitchen"' "$R"
R=$(curl -s -X POST $BASE/api/guest/feedback -H 'Content-Type: application/json' -d "{\"code\":\"$LOC_CODE\",\"mood\":\"frown\",\"text\":\"Smoke test — wait was long\",\"optedIn\":false}")
check "guest feedback saved" '"ok":true' "$R"
R=$(curl -s $BASE/api/demo-requests -X POST -H 'Content-Type: application/json' -d '{"name":"Smoke Tester","email":"smoke@test.in","company":"Test Co"}')
check "demo request saved" '"ok":true' "$R"

echo "== ADMIN =="
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/overview)
check "admin overview" '"mrrSeries"' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/tenants)
check "admin tenants" '"tenants"' "$R"
TENANT_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print([t['id'] for t in d['tenants'] if t['status']=='past_due'][0])")
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/tenants/$TENANT_ID)
check "admin tenant detail" '"usage"' "$R"
R=$(curl -s -b $JAR_ADMIN -X PATCH $BASE/api/admin/tenants/$TENANT_ID -H 'Content-Type: application/json' -d '{"status":"active"}')
check "tenant activate" '"status":"active"' "$R"
R=$(curl -s -b $JAR_ADMIN -X PATCH $BASE/api/admin/tenants/$TENANT_ID -H 'Content-Type: application/json' -d '{"status":"past_due"}')
check "tenant back to past_due" '"status":"past_due"' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/invoices)
check "admin invoices" '"invoices"' "$R"
OVERDUE_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print([i['id'] for i in d['invoices'] if i['status']=='overdue'][0])")
# Idempotent: assert remindersSent increments from whatever it was before.
REM_BEFORE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((i['remindersSent'] for i in d['invoices'] if i['id']=='$OVERDUE_ID'), 0))")
R=$(curl -s -b $JAR_ADMIN -X PATCH $BASE/api/admin/invoices/$OVERDUE_ID -H 'Content-Type: application/json' -d '{"action":"remind"}')
check "invoice remind" "\"remindersSent\":$((REM_BEFORE+1))" "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/plans)
check "admin plans" '"plans"' "$R"
R=$(curl -s -b $JAR_ADMIN -X PATCH $BASE/api/admin/plans -H 'Content-Type: application/json' -d '{"id":"starter","monthlyInr":999,"halfYearlyInr":4995,"annualInr":9990}')
check "plan update" '"ok":true' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/system)
check "admin system" '"jobs"' "$R"
R=$(curl -s -b $JAR_ADMIN -X POST $BASE/api/admin/system -H 'Content-Type: application/json' -d '{"name":"google-sync"}')
check "manual job run" '"ok":true' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/demo-requests)
check "demo pipeline" '"items"' "$R"

echo "== ACCOUNT (profile + password) =="
R=$(curl -s -b $JAR_TENANT $BASE/api/account)
check "account get" '"role":"owner"' "$R"
check "account has phone" '"phone"' "$R"
R=$(curl -s -b $JAR_TENANT -X PATCH $BASE/api/account -H 'Content-Type: application/json' -d '{"phone":"+91 98450 11223"}')
check "account phone patch" '"phone":"+91 98450 11223"' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/account/password -H 'Content-Type: application/json' -d '{"currentPassword":"wrong","newPassword":"NewPass@1234"}')
check "password change rejects wrong current" 'Current password is incorrect' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/account/password -H 'Content-Type: application/json' -d '{"currentPassword":"Demo@1234","newPassword":"Demo@1234"}')
check "password change rejects same password" 'must be different' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/account/password -H 'Content-Type: application/json' -d '{"currentPassword":"Demo@1234","newPassword":"Smoke@12345"}')
check "password change ok" '"ok":true' "$R"
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"anand@spiceroute.in","password":"Smoke@12345"}')
check "login with new password" '"ok":true' "$R"
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"anand@spiceroute.in","password":"Demo@1234"}')
check "old password rejected" 'Incorrect email or password' "$R"
R=$(curl -s -b $JAR_TENANT -X POST $BASE/api/account/password -H 'Content-Type: application/json' -d '{"currentPassword":"Smoke@12345","newPassword":"Demo@1234"}')
check "password restored" '"ok":true' "$R"

echo "== PLATFORM TEAM (roles) =="
JAR_MGR="/tmp/ss-mgr.jar"; JAR_OBS="/tmp/ss-obs.jar"
R=$(curl -s -c $JAR_MGR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"meera@sensiblee.in","password":"Demo@1234"}')
check "platform manager login" '"role":"platform_manager"' "$R"
R=$(curl -s -c $JAR_OBS -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"vikram@sensiblee.in","password":"Demo@1234"}')
check "platform observer login" '"role":"platform_observer"' "$R"
R=$(curl -s -b $JAR_MGR $BASE/api/admin/tenants)
check "manager reads clients" '"tenants"' "$R"
R=$(curl -s -b $JAR_OBS $BASE/api/admin/overview)
check "observer reads overview" '"mrrSeries"' "$R"
TENANT_ID_RO=$(curl -s -b $JAR_ADMIN $BASE/api/admin/tenants | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tenants'][0]['id'])")
R=$(curl -s -b $JAR_OBS -X PATCH $BASE/api/admin/tenants/$TENANT_ID_RO -H 'Content-Type: application/json' -d '{"status":"active"}')
check "observer mutation blocked" 'Read-only access' "$R"
R=$(curl -s -b $JAR_MGR $BASE/api/admin/team)
check "manager reads platform team" '"platform_manager"' "$R"
R=$(curl -s -b $JAR_MGR -X POST $BASE/api/admin/team -H 'Content-Type: application/json' -d '{"email":"blocked@sensiblee.in","role":"platform_observer"}')
check "manager cannot invite staff" 'Missing permission: team manage' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/team)
check "super admin team list" '"platform_observer"' "$R"
R=$(curl -s -b $JAR_ADMIN -X POST $BASE/api/admin/team -H 'Content-Type: application/json' -d '{"name":"Smoke Staff","email":"smoke-staff@sensiblee.in","role":"platform_observer"}')
check "super admin invites staff" '"tempPassword"' "$R"
STAFF_ID=$(curl -s -b $JAR_ADMIN $BASE/api/admin/team | python3 -c "import sys,json; d=json.load(sys.stdin); print([u['id'] for u in d['team'] if u['email']=='smoke-staff@sensiblee.in'][0])")
R=$(curl -s -b $JAR_MGR -X DELETE $BASE/api/admin/team/$STAFF_ID)
check "manager cannot remove staff" 'Missing permission: team manage' "$R"
R=$(curl -s -b $JAR_ADMIN -X DELETE $BASE/api/admin/team/$STAFF_ID)
check "super admin removes staff" '"ok":true' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/admin/team)
check "platform team API blocked for tenant" 'Platform admin only' "$R"

echo "== IMPERSONATION =="
R=$(curl -s -b $JAR_ADMIN -c $JAR_ADMIN -X POST $BASE/api/admin/tenants/$TENANT_ID/impersonate)
check "impersonate start" '"ok":true' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/auth/me)
check "me as tenant owner" '"impersonatedBy"' "$R"
R=$(curl -s -b $JAR_ADMIN -c $JAR_ADMIN -X POST $BASE/api/auth/exit-impersonate)
check "exit impersonation" '"ok":true' "$R"
R=$(curl -s -b $JAR_ADMIN $BASE/api/auth/me)
check "back to admin" '"role":"platform_admin"' "$R"

echo "== GUARDS =="
R=$(curl -s $BASE/api/overview)
check "overview unauthorized" 'Not signed in' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/admin/tenants)
check "admin API blocked for tenant" 'Platform admin only' "$R"

echo "== CMS: GUARDS =="
JAR_CMS="/tmp/ss-cms.jar"; rm -f $JAR_CMS
R=$(curl -s -c $JAR_CMS -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@sensiblee.in","password":"Demo@1234"}')
check "cms admin login" '"role":"platform_admin"' "$R"
R=$(curl -s -b $JAR_TENANT $BASE/api/cms/pages)
check "cms pages blocked for tenant" 'Platform admin only' "$R"
R=$(curl -s $BASE/api/cms/faqs)
check "cms faqs unauthorized" 'Not signed in' "$R"

echo "== CMS: PAGES =="
R=$(curl -s -b $JAR_CMS $BASE/api/cms/pages)
check "cms pages list" '"slug":"home"' "$R"
HOME_CONTENT=$(curl -s -b $JAR_CMS $BASE/api/cms/pages | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({'content': [p for p in d['pages'] if p['slug']=='home'][0]['content']}))")
echo "$HOME_CONTENT" | python3 -c "import sys,json; c=json.loads(sys.stdin.read()); c['content']['heroEyebrow']='SMOKE CMS MARKER'; json.dump(c, open('/tmp/ss-cms-home.json','w'))"
R=$(curl -s -b $JAR_CMS -X PUT $BASE/api/cms/pages/home -H 'Content-Type: application/json' -d @/tmp/ss-cms-home.json)
check "cms page update" '"ok":true' "$R"
R=$(curl -s $BASE/ --max-time 30)
check "cms edit live on site" 'SMOKE CMS MARKER' "$R"
echo "$HOME_CONTENT" | python3 -c "import sys,json; c=json.loads(sys.stdin.read()); json.dump(c, open('/tmp/ss-cms-home.json','w'))"
R=$(curl -s -b $JAR_CMS -X PUT $BASE/api/cms/pages/home -H 'Content-Type: application/json' -d @/tmp/ss-cms-home.json)
check "cms page revert" '"ok":true' "$R"

echo "== CMS: SEO =="
R=$(curl -s $BASE/pricing --max-time 30)
check "cms seo title on pricing" 'Pricing' "$R"

echo "== CMS: FAQ CRUD =="
R=$(curl -s -b $JAR_CMS -X POST $BASE/api/cms/faqs -H 'Content-Type: application/json' -d '{"section":"home","category":"General","question":"SMOKE FAQ?","answer":"SMOKE ANSWER — CMS CRUD works.","sortOrder":99}')
check "cms faq create" '"SMOKE FAQ?"' "$R"
FAQ_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['faq']['id'])")
R=$(curl -s -b $JAR_CMS -X PATCH $BASE/api/cms/faqs/$FAQ_ID -H 'Content-Type: application/json' -d '{"published":false}')
check "cms faq hide" '"published":false' "$R"
R=$(curl -s -b $JAR_CMS -X DELETE $BASE/api/cms/faqs/$FAQ_ID)
check "cms faq delete" '"ok":true' "$R"

echo "== CMS: POSTS =="
R=$(curl -s -b $JAR_CMS -X POST $BASE/api/cms/posts -H 'Content-Type: application/json' -d '{"title":"SMOKE CMS Post","tag":"QA","excerpt":"Smoke post excerpt.","body":"Para one.\n\nPara two.","readTime":"2 min read","author":"QA Bot"}')
check "cms post create" '"SMOKE CMS Post"' "$R"
POST_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['post']['id'])")
POST_SLUG=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['post']['slug'])")
R=$(curl -s -b $JAR_CMS -X PATCH $BASE/api/cms/posts/$POST_ID -H 'Content-Type: application/json' -d '{"published":true}')
check "cms post patch" '"ok":true' "$R"
R=$(curl -s $BASE/blog/$POST_SLUG --max-time 30)
check "cms post live at /blog/slug" 'Smoke post excerpt' "$R"
R=$(curl -s -b $JAR_CMS -X DELETE $BASE/api/cms/posts/$POST_ID)
check "cms post delete" '"ok":true' "$R"

echo "== CMS: TESTIMONIALS =="
R=$(curl -s -b $JAR_CMS -X POST $BASE/api/cms/testimonials -H 'Content-Type: application/json' -d '{"quote":"SMOKE TESTIMONIAL QUOTE","name":"QA Bot","role":"QA · Sensiblee","stars":5}')
check "cms testimonial create" '"SMOKE TESTIMONIAL QUOTE"' "$R"
TSM_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['testimonial']['id'])")
R=$(curl -s -b $JAR_CMS -X DELETE $BASE/api/cms/testimonials/$TSM_ID)
check "cms testimonial delete" '"ok":true' "$R"

echo "== CMS: MEDIA =="
python3 -c "
import base64, zlib, struct
def chunk(t, d):
    c = struct.pack('>I', len(d)) + t + d
    return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
idat = chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00'))
png = b'\x89PNG\r\n\x1a\n' + ihdr + idat + chunk(b'IEND', b'')
open('/tmp/ss-cms-pixel.png', 'wb').write(png)
"
R=$(curl -s -b $JAR_CMS -F "file=@/tmp/ss-cms-pixel.png;type=image/png" $BASE/api/cms/media)
check "cms media upload" '"ok":true' "$R"
MEDIA_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['media']['id'])")
R=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/cms/media/$MEDIA_ID)
check "cms media public serve" '200' "$R"
R=$(curl -s -b $JAR_TENANT -X DELETE $BASE/api/cms/media/$MEDIA_ID)
check "cms media delete blocked for tenant" 'Platform admin only' "$R"
R=$(curl -s -b $JAR_CMS -X DELETE $BASE/api/cms/media/$MEDIA_ID)
check "cms media delete" '"ok":true' "$R"

echo "== CMS: BANNER =="
R=$(curl -s -b $JAR_CMS -X PUT $BASE/api/cms/settings -H 'Content-Type: application/json' -d '{"banner_enabled":"true","banner_text":"SMOKE BANNER","banner_link":"pricing"}')
check "cms banner on" '"ok":true' "$R"
R=$(curl -s $BASE/ --max-time 30)
check "cms banner live" 'SMOKE BANNER' "$R"
R=$(curl -s -b $JAR_CMS -X PUT $BASE/api/cms/settings -H 'Content-Type: application/json' -d '{"banner_enabled":"false","banner_text":"","banner_link":""}')
check "cms banner off" '"ok":true' "$R"

echo ""
echo "== ROLES & PERMISSIONS (tenant) =="
R=$(curl -s -b $JAR_TENANT $BASE/api/team/roles)
check "tenant roles list has seed" 'Front Desk Agent' "$R"
ROLE_ID=$(curl -s -b $JAR_TENANT -X POST $BASE/api/team/roles -H 'Content-Type: application/json' -d '{"name":"Smoke QA","description":"smoke","permissions":["reviews_view","campaigns_manage"]}' | python3 -c "import sys,json; print(json.load(sys.stdin)['role']['id'])")
check "tenant role created" 'cm' "$ROLE_ID"
R=$(curl -s -b $JAR_TENANT -X PUT $BASE/api/team/roles/$ROLE_ID -H 'Content-Type: application/json' -d '{"name":"Smoke QA v2","permissions":["reviews_view"]}')
check "tenant role updated" '"ok":true' "$R"
INVITE_OUT=$(curl -s -b $JAR_TENANT -X POST $BASE/api/team -H 'Content-Type: application/json' -d '{"email":"smoke-member@spiceroute.in","roleId":"'$ROLE_ID'"}')
MEMBER_ID=$(echo "$INVITE_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['invite']['id'])")
MEMBER_TP=$(echo "$INVITE_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['invite']['tempPassword'])")
R=$(curl -s -b $JAR_TENANT $BASE/api/team)
check "member shows custom role" 'Smoke QA v2' "$R"
rm -f /tmp/ss-member.jar
R=$(curl -s -c /tmp/ss-member.jar -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"smoke-member@spiceroute.in","password":"'$MEMBER_TP'"}')
check "custom member login" '"role":"member"' "$R"
R=$(curl -s -b /tmp/ss-member.jar $BASE/api/auth/me)
check "custom member effective perms" '"permissions":["reviews_view"]' "$R"
R=$(curl -s -b /tmp/ss-member.jar -X PATCH $BASE/api/settings -H 'Content-Type: application/json' -d '{"ai":{"threshold":50}}')
check "custom member settings blocked" 'Missing permission' "$R"
R=$(curl -s -b /tmp/ss-member.jar -X POST $BASE/api/campaigns -H 'Content-Type: application/json' -d '{"templateName":"x","templateBody":"y","locationIds":[]}')
check "custom member campaigns blocked" 'Missing permission' "$R"
R=$(curl -s -b /tmp/ss-member.jar -X DELETE $BASE/api/team/$MEMBER_ID)
check "custom member self-delete blocked" 'team manage' "$R"
R=$(curl -s -b $JAR_TENANT -X DELETE $BASE/api/team/$MEMBER_ID)
check "member removed" '"ok":true' "$R"
R=$(curl -s -b $JAR_TENANT -X DELETE $BASE/api/team/roles/$ROLE_ID)
check "tenant role deleted" '"ok":true' "$R"
TENANT_OBS_JAR=/tmp/ss-tobs.jar; curl -s -c $TENANT_OBS_JAR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"rahul@spiceroute.in","password":"Demo@1234"}' > /dev/null
R=$(curl -s -b $TENANT_OBS_JAR -X POST $BASE/api/team/roles -H 'Content-Type: application/json' -d '{"name":"Nope"}')
check "tenant observer role create blocked" 'Read-only access' "$R"
R=$(curl -s -b $JAR_TENANT -X PATCH $BASE/api/team/doesnotexist -H 'Content-Type: application/json' -d '{}')
check "member patch 404 guard" 'Team member not found' "$R"

echo ""
echo "== ROLES & PERMISSIONS (platform) =="
R=$(curl -s -b $JAR_ADMIN $BASE/api/admin/team/roles)
check "platform roles list has seed" 'Content Editor' "$R"
PR_ID=$(curl -s -b $JAR_ADMIN -X POST $BASE/api/admin/team/roles -H 'Content-Type: application/json' -d '{"name":"Smoke Editor","permissions":["website_manage"]}' | python3 -c "import sys,json; print(json.load(sys.stdin)['role']['id'])")
check "platform role created" 'cm' "$PR_ID"
R=$(curl -s -b $JAR_ADMIN -X POST $BASE/api/admin/team -H 'Content-Type: application/json' -d '{"name":"Smoke Editor Staff","email":"smoke-editor@sensiblee.in","roleId":"'$PR_ID'"}')
check "platform invite with custom role" 'Smoke Editor' "$R"
EDITOR_ID=$(curl -s -b $JAR_ADMIN $BASE/api/admin/team | python3 -c "import sys,json; print([u['id'] for u in json.load(sys.stdin)['team'] if u['email']=='smoke-editor@sensiblee.in'][0])")
R=$(curl -s -b $JAR_ADMIN -X DELETE $BASE/api/admin/team/roles/$PR_ID)
check "platform role delete blocked while assigned" 'still on this role' "$R"
R=$(curl -s -b $JAR_ADMIN -X PATCH $BASE/api/admin/team/$EDITOR_ID -H 'Content-Type: application/json' -d '{"role":"platform_observer"}')
check "member moved to preset" '"ok":true' "$R"
R=$(curl -s -b $JAR_MGR -X POST $BASE/api/admin/team/roles -H 'Content-Type: application/json' -d '{"name":"X"}')
check "platform manager role create blocked" 'Missing permission: team manage' "$R"
R=$(curl -s -b $JAR_MGR -X PUT $BASE/api/cms/pages/home -H 'Content-Type: application/json' -d '{"content":{"seoTitle":"Smoke CMS check"}}')
check "platform manager still edits CMS" '"ok":true' "$R"
R=$(curl -s -b $JAR_ADMIN -X DELETE $BASE/api/admin/team/$EDITOR_ID)
check "platform member removed" '"ok":true' "$R"
R=$(curl -s -b $JAR_MGR -X PUT $BASE/api/admin/team/roles/$PR_ID -H 'Content-Type: application/json' -d '{"name":"Y"}')
check "platform manager role edit blocked" 'Missing permission' "$R"
R=$(curl -s -b $JAR_ADMIN -X DELETE $BASE/api/admin/team/roles/$PR_ID)
check "platform role deleted" '"ok":true' "$R"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
