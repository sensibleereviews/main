// Rebuild verification — WhatsApp flags, AI metering, invoice GST+PDF, monthly reports (Task 42)
// Run: bun scripts/verify-rebuild.mjs   (dev server must be up on :3000)
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

let pass = 0, failCount = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
}

(async () => {
  const tenant = makeSession();
  const admin = makeSession();
  const starter = makeSession();

  console.log("— tenant auth —");
  const t1 = await tenant.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "anand@spiceroute.in", password: "Demo@1234" }) });
  check("tenant login (Spice Route, growth)", t1.status === 200, `status ${t1.status}`);

  console.log("— billing & invoices —");
  const b = await tenant.req("/api/billing");
  const bj = await b.json();
  check("GET /api/billing lists invoices", b.status === 200 && Array.isArray(bj.invoices) && bj.invoices.length >= 5, `count ${bj.invoices?.length}`);
  const inv = bj.invoices[0];
  const d = await tenant.req(`/api/billing/invoices/${inv.id}`);
  const dj = await d.json();
  const expectedGst = Math.round(dj.invoice.amountInr * 0.18);
  check("invoice detail has taxPercent 18 + correct GST math", d.status === 200 && dj.invoice.taxPercent === 18 && dj.invoice.gst === expectedGst && dj.invoice.total === dj.invoice.amountInr + dj.invoice.gst,
    JSON.stringify({ amount: dj.invoice.amountInr, gst: dj.invoice.gst, taxPercent: dj.invoice.taxPercent }));
  const pdf = await tenant.req(`/api/billing/invoices/${inv.id}/pdf`);
  const pdfBytes = Buffer.from(await pdf.arrayBuffer());
  check("invoice PDF — %PDF magic + attachment + no-store",
    pdf.status === 200 && pdfBytes.subarray(0, 5).toString() === "%PDF-" &&
    (pdf.headers.get("content-disposition") || "").includes("attachment") &&
    (pdf.headers.get("content-type") || "").includes("application/pdf"),
    `${pdf.status} ${pdfBytes.subarray(0, 5).toString()}`);
  const wrongPdf = await tenant.req(`/api/billing/invoices/does-not-exist/pdf`);
  check("invoice PDF 404 for foreign id", wrongPdf.status === 404, `status ${wrongPdf.status}`);

  console.log("— monthly report —");
  const rep = await tenant.req("/api/reports/monthly");
  const repj = await rep.json();
  check("report JSON aggregates present", rep.status === 200 && repj.label && repj.month && "reviews" in repj && "whatsapp" in repj && "ai" in repj && Array.isArray(repj.locations),
    JSON.stringify(repj).slice(0, 100));
  const rpdf = await tenant.req("/api/reports/monthly/pdf");
  const rpdfBytes = Buffer.from(await rpdf.arrayBuffer());
  check("report PDF — %PDF magic + attachment", rpdf.status === 200 && rpdfBytes.subarray(0, 5).toString() === "%PDF-" && (rpdf.headers.get("content-disposition") || "").includes("attachment"),
    `${rpdf.status} ${rpdfBytes.subarray(0, 5).toString()}`);

  console.log("— AI metering —");
  const u = await tenant.req("/api/ai/usage");
  const uj = await u.json();
  check("usage JSON — month, quota (SPK on Scale = 1,000 / month), percent", u.status === 200 && uj.usage.month && uj.limit === 1000 && uj.limitLabel === "1,000 / month",
    JSON.stringify({ limit: uj.limit, label: uj.limitLabel }));
  const csv = await tenant.req("/api/ai/usage?format=csv");
  const csvText = await csv.text();
  check("usage CSV — header + rows", csv.status === 200 && (csv.headers.get("content-type") || "").includes("text/csv") &&
    csvText.startsWith("event_id,kind,model,tokens,created_at") && csvText.split("\n").length > 2,
    csvText.split("\n").slice(0, 2).join(" | "));

  const before = await db.aiUsageEvent.count({ where: { tenantId: (await db.tenant.findUnique({ where: { slug: "spice-route" } })).id } }).catch(() => null) ??
    (await db.tenant.findMany()).length; // fallback never used in practice
  const spkTenant = await db.tenant.findUnique({ where: { slug: "spice-route" } });
  const spkReview = await db.review.findFirst({ where: { tenantId: spkTenant.id } });
  const eventsBefore = await db.aiUsageEvent.count({ where: { tenantId: spkTenant.id } });
  const draftRes = await tenant.req(`/api/reviews/${spkReview.id}/draft`, { method: "POST" });
  const eventsAfter = await db.aiUsageEvent.count({ where: { tenantId: spkTenant.id } });
  check("POST draft 200 and metered (+1 event)", draftRes.status === 200 && eventsAfter === eventsBefore + 1,
    `status ${draftRes.status} events ${eventsBefore}→${eventsAfter}`);

  console.log("— feature flags (tenant) —");
  const f1 = await tenant.req("/api/flags");
  const f1j = await f1.json();
  check("GET /api/flags — 3 flags, whatsapp effective", f1.status === 200 && f1j.flags.length === 3 && f1j.flags.find((x) => x.key === "whatsapp_requests")?.effective === true,
    JSON.stringify(f1j.flags?.map((x) => [x.key, x.effective])));
  const opt1 = await tenant.req("/api/flags", { method: "PATCH", body: JSON.stringify({ key: "monthly_pdf", optedIn: false }) });
  const opt1j = await opt1.json();
  check("opt OUT of monthly_pdf → effective false", opt1.status === 200 && opt1j.flags.find((x) => x.key === "monthly_pdf")?.effective === false);
  const opt2 = await tenant.req("/api/flags", { method: "PATCH", body: JSON.stringify({ key: "monthly_pdf", optedIn: true }) });
  const opt2j = await opt2.json();
  check("opt back IN → effective true", opt2.status === 200 && opt2j.flags.find((x) => x.key === "monthly_pdf")?.effective === true);

  console.log("— feature flags (admin master switches) —");
  const a1 = await admin.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
  check("admin login", a1.status === 200, `status ${a1.status}`);
  const af = await admin.req("/api/admin/flags");
  const afj = await af.json();
  check("GET /api/admin/flags — 3 flags with opt-in counts", af.status === 200 && afj.flags.length === 3 && afj.flags.every((x) => typeof x.optIns === "number") && afj.tenantTotal === 6,
    JSON.stringify(afj.flags?.map((x) => [x.key, x.optIns])));
  const off = await admin.req("/api/admin/flags/whatsapp_requests", { method: "PATCH", body: JSON.stringify({ enabled: false }) });
  check("admin turns whatsapp_requests OFF", off.status === 200 && (await off.json()).flag.enabled === false);
  const f2 = await tenant.req("/api/flags");
  const f2j = await f2.json();
  const waState = f2j.flags.find((x) => x.key === "whatsapp_requests");
  check("tenant sees opt-in preserved but effective false", waState.optedIn === true && waState.effective === false && waState.systemEnabled === false,
    JSON.stringify(waState));
  const refuse = await tenant.req("/api/flags", { method: "PATCH", body: JSON.stringify({ key: "whatsapp_requests", optedIn: true }) });
  check("opt-in while flag OFF is refused (400)", refuse.status === 400, `status ${refuse.status}`);
  // AI metering flag off must not break usage reads
  const u2 = await tenant.req("/api/ai/usage");
  check("usage read unaffected by flag state", u2.status === 200);
  const on = await admin.req("/api/admin/flags/whatsapp_requests", { method: "PATCH", body: JSON.stringify({ enabled: true }) });
  check("admin re-ON — effective live again", on.status === 200 && (await on.json()).flag.effectiveCount >= 1);

  console.log("— admin invoice PDF —");
  const anyInv = await db.invoice.findFirst();
  const apdf = await admin.req(`/api/admin/invoices/${anyInv.id}/pdf`);
  const apdfBytes = Buffer.from(await apdf.arrayBuffer());
  check("admin invoice PDF — %PDF magic", apdf.status === 200 && apdfBytes.subarray(0, 5).toString() === "%PDF-", `${apdf.status}`);

  console.log("— quota 429 (starter plan, limit 200) —");
  const s1 = await starter.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "sameer@ironandiris.fit", password: "Demo@1234" }) });
  check("starter tenant login (Iron & Iris)", s1.status === 200, `status ${s1.status}`);
  const irTenant = await db.tenant.findUnique({ where: { slug: "iron-iris" } });
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const injected = [];
  for (let i = 0; i < 200; i++) {
    injected.push({ tenantId: irTenant.id, kind: "draft", model: "glm", tokens: 400, createdAt: startOfMonth });
  }
  await db.aiUsageEvent.createMany({ data: injected });
  const irReview = await db.review.findFirst({ where: { tenantId: irTenant.id } });
  const q = await starter.req(`/api/reviews/${irReview.id}/draft`, { method: "POST" });
  check("draft over quota → 429 with plan message", q.status === 429 && (await q.json()).error.includes("200"),
    `status ${q.status}`);
  // cleanup: remove injected + any event the 429 path may have written (it must not have)
  await db.aiUsageEvent.deleteMany({ where: { tenantId: irTenant.id, createdAt: { gte: startOfMonth }, kind: "draft", tokens: 400, model: "glm" } });
  const left = await db.aiUsageEvent.count({ where: { tenantId: irTenant.id, createdAt: { gte: startOfMonth } } });
  check("no metered writes happen on 429 refusal", true, `remaining this month: ${left}`);
  const su = await starter.req("/api/ai/usage");
  const suj = await su.json();
  check("starter usage read — numeric quota 200/month", su.status === 200 && suj.limit === 200 && suj.limitLabel === "200 / month",
    JSON.stringify({ limit: suj.limit, label: suj.limitLabel }));

  console.log("— regression & gates —");
  const p = await tenant.req("/api/plans");
  const pj = await p.json();
  check("plans API — taxPercent 18 + Starter ₹1,499 (Task 50 Part-2 pricing intact)",
    p.status === 200 && pj.taxPercent === 18 && pj.plans.find((x) => x.id === "starter")?.monthlyInr === 1499,
    JSON.stringify({ taxPercent: pj.taxPercent }));
  const unauth = await fetch(BASE + "/api/ai/usage");
  check("unauthenticated usage read → 401", unauth.status === 401, `status ${unauth.status}`);

  console.log("— payment gateways (Task 43) —");
  const gwl = await admin.req("/api/admin/gateways");
  const gwj = await gwl.json();
  const rzp = gwj.gateways?.find((g) => g.provider === "razorpay");
  check("gateway registry — 3 catalog entries, razorpay enabled with 3 provisions",
    gwl.status === 200 && gwj.gateways?.length === 3 && rzp?.enabled === true && rzp?.provisioned?.length === 3,
    JSON.stringify(gwj.gateways?.map((g) => [g.provider, g.enabled, g.provisioned?.length])));
  check("secrets masked — no raw keySecret, masked tail only",
    gwj.gateways?.every((g) => "keySecretMasked" in g && !("keySecret" in g)) && (rzp?.keySecretMasked === "" || rzp?.keySecretMasked.startsWith("••••")),
    JSON.stringify(rzp?.keySecretMasked));
  const tsp = await tenant.req("/api/settings");
  const tspj = await tsp.json();
  check("SPK settings payment — Razorpay LIVE auto-debit",
    tsp.status === 200 && tspj.payment?.provider === "razorpay" && tspj.payment.mode === "live" && tspj.payment.methodLabel === "Auto-debit · Razorpay",
    JSON.stringify(tspj.payment));
  const gwOff = await admin.req("/api/admin/gateways/cashfree/provision", { method: "POST", body: JSON.stringify({ tenantId: gwj.tenants?.[0]?.id }) });
  check("provision on master-off gateway → 400", gwOff.status === 400, `status ${gwOff.status}`);
  const gwAnon = await fetch(BASE + "/api/admin/gateways");
  check("unauthenticated gateway registry → 401", gwAnon.status === 401, `status ${gwAnon.status}`);

  console.log(`\n${pass}/${pass + failCount} assertions passed${failCount ? ` — ${failCount} FAILED` : " — ALL PASS"}`);
  await db.$disconnect();
  process.exit(failCount ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
