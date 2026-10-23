// Task 51 E2E — features-list completion sprint assertions (run against :3000)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const BASE = "http://127.0.0.1:3000";

function makeSession() {
  let cookie = "";
  const req = async (path, opts = {}) => {
    const res = await fetch(BASE + path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
      redirect: "manual",
    });
    const jar = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (!cookie) {
      const sess = jar.find((c) => c.startsWith("ss_session="));
      if (sess) cookie = sess.split(";")[0];
    }
    return res;
  };
  return { req, get cookie() { return cookie; } };
}

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
}

// ---------- tenant session ----------
const t = makeSession();
let r = await t.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "anand@spiceroute.in", password: "Demo@1234" }) });
check("tenant login", r.status === 200, String(r.status));

// 1A/1I — notifications feed wired
r = await t.req("/api/notifications");
let j = await r.json();
check("notifications feed has items + count", r.status === 200 && Array.isArray(j.items) && typeof j.count === "number", JSON.stringify(j).slice(0, 120));
check("notifications include health-change alert (score delta ≠ 0)", j.items.some((i) => i.kind === "health"), `kinds: ${j.items.map((i) => i.kind).join(",")}`);

// 1E — contacts
r = await t.req("/api/contacts");
j = await r.json();
check("contact book GET — 8 seeded contacts + stats", r.status === 200 && j.stats.total === 8 && j.stats.eligible === 8, JSON.stringify(j.stats));
r = await t.req("/api/contacts", { method: "POST", body: JSON.stringify({ text: "Test Guest A, 9812345670\n9812345671\n9876543210\nnot-a-number" }) });
j = await r.json();
check("contact import — 2 new, 1 dup, 1 invalid", r.status === 200 && j.imported === 2 && j.duplicates === 1 && j.invalid === 1, JSON.stringify(j));
const importedContact = await db.contact.findFirst({ where: { tenantId: (await db.user.findUnique({ where: { email: "anand@spiceroute.in" } })).tenantId, phone: "9812345670" } });
r = await t.req(`/api/contacts?id=${importedContact.id}`, { method: "DELETE" });
check("contact delete works", r.status === 200);
await db.contact.deleteMany({ where: { tenantId: importedContact.tenantId, phone: "9812345671" } });

// 1D — AI queue shape (queue + failed + sensitive)
r = await t.req("/api/ai/queue");
j = await r.json();
check("ai queue exposes failed[] + sensitive[] lifecycle", r.status === 200 && Array.isArray(j.failed) && Array.isArray(j.sensitive), Object.keys(j).join(","));

// 1D — sensitive detection + failed publish lifecycle (deterministic, via test location)
const tenantId = (await db.user.findUnique({ where: { email: "anand@spiceroute.in" } })).tenantId;
const testLoc = await db.location.create({
  data: { tenantId, code: "t51-e2e", name: "Spice Route E2E Test", area: "Testville", rating: 3.5, reviewCount: 0 },
});
const testReview = await db.review.create({
  data: { tenantId, locationId: testLoc.id, author: "E2E Tester", stars: 1, text: "Found a cockroach in the curry and my son had food poisoning. We are calling a lawyer.", sentiment: "negative", keywords: JSON.stringify(["hygiene"]), status: "new" },
});
r = await t.req(`/api/reviews/${testReview.id}/draft`, { method: "POST" });
j = await r.json();
check("draft flags sensitive review for human handling", r.status === 200 && typeof j.sensitive === "string" && j.sensitive.length > 3, JSON.stringify(j.sensitive));
r = await t.req(`/api/reviews/${testReview.id}/reply`, { method: "POST", body: JSON.stringify({ body: "We are deeply sorry — our manager will contact you personally today." }) });
j = await r.json();
check("publish to unconnected location → tracked as FAILED", j.failed === true, JSON.stringify(j).slice(0, 140));
r = await t.req("/api/ai/queue");
j = await r.json();
check("failed publish visible in queue lifecycle + sensitive list", j.failed.length >= 1 && j.sensitive.some((s) => s.id === testReview.id), `failed=${j.failed.length} sensitive=${j.sensitive.length}`);
// connect the profile, retry succeeds
await db.location.update({ where: { id: testLoc.id }, data: { googlePlaceId: "ChIJe2e-test" } });
r = await t.req(`/api/reviews/${testReview.id}/reply`, { method: "POST", body: JSON.stringify({ body: "We are deeply sorry — our manager will contact you personally today." }) });
j = await r.json();
check("retry after connect → published (replied)", j.failed === undefined && j.review?.status === "replied", JSON.stringify(j).slice(0, 120));
// cleanup test rows (review FK first)
await db.aiDraft.deleteMany({ where: { reviewId: testReview.id } });
await db.review.delete({ where: { id: testReview.id } });
await db.location.delete({ where: { id: testLoc.id } });
check("e2e test rows cleaned up", (await db.location.count({ where: { code: "t51-e2e" } })) === 0);

// 1I — weekly report with AI summary
r = await t.req("/api/reports/weekly");
j = await r.json();
check("weekly digest generated with AI management summary", r.status === 200 && typeof j.summary === "string" && j.summary.length > 40, JSON.stringify(j.summary || "").slice(0, 80));
r = await t.req("/api/reports/monthly");
j = await r.json();
check("monthly report now carries the AI summary", r.status === 200 && typeof j.summary === "string" && j.summary.length > 40);

// 1B — reviews date filter
r = await t.req("/api/reviews?days=1");
j = await r.json();
const totalAll = (await (await t.req("/api/reviews")).json()).total;
check("reviews date filter accepts days param", r.status === 200 && j.total <= totalAll, `7d=${j.total} all=${totalAll}`);

// 1H — issue escalate + dueDate + resolvedNote via API
r = await t.req("/api/issues");
j = await r.json();
const anyIssue = j.issues?.[0];
if (anyIssue) {
  r = await t.req("/api/issues", { method: "POST", body: JSON.stringify({ id: anyIssue.id, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }) });
  check("issue dueDate set from tenant Action Center", r.status === 200);
  r = await t.req("/api/issues", { method: "POST", body: JSON.stringify({ id: anyIssue.id, escalate: true }) });
  check("issue escalate → severity high + flagged", r.status === 200);
  j = await (await t.req("/api/issues")).json();
  const updated = j.issues.find((x) => x.id === anyIssue.id);
  check("escalated + dueDate visible on issue card payload", updated.escalated === true && updated.dueDate !== null, JSON.stringify({ escalated: updated.escalated, dueDate: updated.dueDate }));
}

// 1G — staff gating (owner = full access; observer would be restricted)
r = await t.req("/api/analytics");
j = await r.json();
check("analytics exposes staffScope (owner=full)", j.staffScope === "full", String(j.staffScope));
r = await t.req("/api/health");
j = await r.json();
check("health payload carries staffScope", j.staffScope === "full", String(j.staffScope));

// 2C/1F — team location assignment
const manager = await db.user.findFirst({ where: { tenantId, role: "manager" } });
const loc = await db.location.findFirst({ where: { tenantId } });
if (manager && loc) {
  r = await t.req(`/api/team/${manager.id}`, { method: "PATCH", body: JSON.stringify({ locationIds: [loc.id] }) });
  j = await r.json();
  check("manager assigned to a location", r.status === 200 && j.member.locationIds.includes(loc.id));
  // restore
  await t.req(`/api/team/${manager.id}`, { method: "PATCH", body: JSON.stringify({ locationIds: [] }) });
} else {
  check("manager exists for location-assignment test", false, "no manager user");
}

// 1E — campaign with flag opt-in works and can be held by quiet hours
r = await t.req("/api/campaigns", { method: "POST", body: JSON.stringify({ templateName: "E2E template", templateBody: "Hi {name} — rate us {review_link}", sendNow: true }) });
j = await r.json();
check("campaign launches (flag opted-in) — held or running", r.status === 200 && j.campaign, JSON.stringify(j).slice(0, 140));
const e2eCampaign = j.campaign?.id;
if (e2eCampaign) await db.campaign.delete({ where: { id: e2eCampaign } });

// ---------- admin session ----------
const a = makeSession();
r = await a.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
check("admin login", r.status === 200, String(r.status));

// 2K — reports & scheduled tasks
r = await a.req("/api/admin/reports");
j = await r.json();
check("admin reports — 3 templates + starter schedule + rules", r.status === 200 && j.templates.length === 3 && j.schedules.length >= 1 && j.notificationRules, JSON.stringify({ t: j.templates?.length, s: j.schedules?.length }));
r = await a.req("/api/admin/reports", { method: "PATCH", body: JSON.stringify({ notificationRules: { negativeReview: true, unanswered: true, healthDrop: true, syncFailures: true, weeklyDigest: true, recipients: "ops@sensiblee.in" } }) });
j = await r.json();
check("notification rules saved (2K)", r.status === 200 && j.notificationRules?.weeklyDigest === true);
r = await a.req("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "run-cycle" }) });
j = await r.json();
check("report dispatch cycle runs", r.status === 200 && typeof j.dispatched === "number", JSON.stringify(j));
// make a schedule due NOW (today's date, hour 0) so the cycle actually dispatches
const todayIst = new Date(Date.now() + 5.5 * 3600_000);
r = await a.req("/api/admin/reports", { method: "POST", body: JSON.stringify({ name: "E2E due-now digest", template: "weekly_digest", frequency: "weekly", dayOfWeek: todayIst.getUTCDay(), hour: 0, recipients: "e2e@sensiblee.in", format: "pdf" }) });
const schedId = (await r.json()).id;
r = await a.req("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "run-cycle" }) });
j = await r.json();
check("due schedule dispatches deliveries", r.status === 200 && j.dispatched >= 1, JSON.stringify(j));
r = await a.req("/api/admin/reports");
j = await r.json();
const e2eDelivery = j.deliveries.find((d) => d.scheduleName === "E2E due-now digest");
check("delivery log records sent instances", e2eDelivery && e2eDelivery.status === "sent", JSON.stringify(j.deliveries?.[0] || {}).slice(0, 120));
await a.req(`/api/admin/reports?id=${schedId}`, { method: "DELETE" });
await db.reportDelivery.deleteMany({ where: { scheduleName: "E2E due-now digest" } });

// 2A — admin overview additions
r = await a.req("/api/admin/overview");
j = await r.json();
check("overview exposes suspended/trial counts + syncStatus + criticalAlerts", r.status === 200 && typeof j.kpis.suspended === "number" && j.syncStatus && Array.isArray(j.criticalAlerts), JSON.stringify(j.syncStatus || {}).slice(0, 100));

// 2E — integrations lifecycle
r = await a.req("/api/admin/integrations");
j = await r.json();
check("integrations — statusLabel + computed quota (not hardcoded 34)", r.status === 200 && j.google.connections.every((c) => typeof c.statusLabel === "string") && typeof j.google.quota.usedPct === "number", `usedPct=${j.google?.quota?.usedPct}`);
check("WA per-tenant usage alerts computed", Array.isArray(j.whatsapp.perTenant) && j.whatsapp.perTenant.every((x) => "alert" in x), "");

// 2H — duplicates monitor
r = await a.req("/api/admin/reputation");
j = await r.json();
check("reputation controls expose duplicate-location monitor", r.status === 200 && Array.isArray(j.duplicates) && typeof j.duplicatesReviewed === "number", `dups=${j.duplicates?.length}`);

// 2B/2L — data export bundle
const someTenant = await db.tenant.findFirst({ where: { slug: "spice-route" } });
r = await a.req(`/api/admin/tenants/${someTenant.id}/export`);
const exportBody = await r.text();
check("tenant data export — JSON bundle download with audit", r.status === 200 && exportBody.includes("exportedBy") && (r.headers.get("content-disposition") || "").includes("sensiblee-export"), String(r.status));

// 2C — MFA enforcement toggle round-trip
r = await a.req("/api/admin/system", { method: "POST", body: JSON.stringify({ security: { mfaRequiredForAdmins: true } }) });
check("MFA enforcement toggled ON", r.status === 200);
const fresh = makeSession();
r = await fresh.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
check("fresh admin login blocked without MFA (403)", r.status === 403, String(r.status));
r = await a.req("/api/admin/system", { method: "POST", body: JSON.stringify({ security: { mfaRequiredForAdmins: false } }) });
check("MFA enforcement toggled back OFF", r.status === 200);
r = await fresh.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
check("admin login works again after toggle-off", r.status === 200, String(r.status));

// 2M — kill switches enforced
r = await a.req("/api/admin/ai", { method: "PATCH", body: JSON.stringify({ paused: true }) });
const t2 = makeSession();
await t2.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "anand@spiceroute.in", password: "Demo@1234" }) });
const anyReview = await db.review.findFirst({ where: { tenantId }, select: { id: true } });
r = await t2.req(`/api/reviews/${anyReview.id}/draft`, { method: "POST" });
check("AI pause kill-switch blocks draft generation (503)", r.status === 503, String(r.status));
r = await a.req("/api/admin/ai", { method: "PATCH", body: JSON.stringify({ paused: false }) });
check("AI pause reverted", r.status === 200);

console.log(`\n${pass}/${pass + fail} Task-51 E2E assertions passed — ${fail === 0 ? "ALL PASS" : `${fail} FAILURES`}`);
process.exit(fail === 0 ? 0 : 1);
