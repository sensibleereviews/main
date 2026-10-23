// Gateway provisioning smoke test — run with dev server up on :3000
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
  return { req };
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
};

(async () => {
  // idempotent reset — clear provisioning state so repeated runs start from catalog defaults
  await db.tenantGateway.deleteMany();
  await db.gatewayConfig.update({ where: { provider: "razorpay" }, data: { enabled: true, keyId: "", keySecret: "", webhookSecret: "" } });
  await db.gatewayConfig.updateMany({ where: { provider: { not: "razorpay" } }, data: { enabled: false } });

  const admin = makeSession();
  const tenantSess = makeSession();

  const a1 = await admin.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
  check("admin login", a1.status === 200, `status ${a1.status}`);

  console.log("— registry read —");
  const l1 = await admin.req("/api/admin/gateways");
  const lj = await l1.json();
  check("GET gateways — 3 catalog entries, razorpay enabled by default",
    l1.status === 200 && lj.gateways.length === 3 && lj.gateways.find((g) => g.provider === "razorpay")?.enabled === true,
    JSON.stringify(lj.gateways?.map((g) => [g.provider, g.enabled])));
  check("no secret material in list response", !JSON.stringify(lj).includes("keySecret") || lj.gateways.every((g) => !("keySecret" in g)));

  console.log("— credentials write-only —");
  const c1 = await admin.req("/api/admin/gateways/razorpay", { method: "PATCH", body: JSON.stringify({ keyId: "rzp_test_demo123", keySecret: "secret_demo_9999", webhookSecret: "whsec_demo_42" }) });
  const c1j = await c1.json();
  check("credentials saved — secret masked to last 4", c1.status === 200 && c1j.gateway.keySecretMasked === "••••••••9999" && c1j.gateway.keyId === "rzp_test_demo123",
    JSON.stringify(c1j));
  check("raw secret never returned", !JSON.stringify(c1j).includes("secret_demo_9999"));
  const keep = await admin.req("/api/admin/gateways/razorpay", { method: "PATCH", body: JSON.stringify({ keySecret: "" }) });
  const keepj = await keep.json();
  check("empty secret field keeps stored value", keep.status === 200 && keepj.gateway.keySecretMasked === "••••••••9999", JSON.stringify(keepj));

  console.log("— provisioning rules —");
  const spk = await db.tenant.findFirst({ where: { name: "Spice Route Kitchen" } });
  const pOff = await admin.req("/api/admin/gateways/cashfree/provision", { method: "POST", body: JSON.stringify({ tenantId: spk.id }) });
  check("provision while master OFF → 400", pOff.status === 400, `status ${pOff.status}`);
  const enCf = await admin.req("/api/admin/gateways/cashfree", { method: "PATCH", body: JSON.stringify({ enabled: true }) });
  check("enable cashfree", enCf.status === 200 && enCf.json && JSON.parse(JSON.stringify(enCf)).ok !== false, `status ${enCf.status}`);
  const pLive = await admin.req("/api/admin/gateways/cashfree/provision", { method: "POST", body: JSON.stringify({ tenantId: spk.id, mode: "live" }) });
  check("live mode without accountRef → 400", pLive.status === 400, `status ${pLive.status}`);
  const p1 = await admin.req("/api/admin/gateways/cashfree/provision", { method: "POST", body: JSON.stringify({ tenantId: spk.id, mode: "test" }) });
  check("provision SPK on cashfree (test)", p1.status === 200, `status ${p1.status}`);
  const p2 = await admin.req("/api/admin/gateways/cashfree/provision", { method: "POST", body: JSON.stringify({ tenantId: spk.id, mode: "test" }) });
  check("duplicate provision → 409", p2.status === 409, `status ${p2.status}`);

  console.log("— tenant visibility —");
  const t1 = await tenantSess.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "anand@spiceroute.in", password: "Demo@1234" }) });
  check("tenant login", t1.status === 200, `status ${t1.status}`);
  const s1 = await tenantSess.req("/api/settings");
  const s1j = await s1.json();
  check("tenant settings shows provisioned gateway (Cashfree TEST)",
    s1.status === 200 && s1j.payment?.provider === "cashfree" && s1j.payment.mode === "test" && s1j.payment.methodLabel === "Auto-debit · Cashfree",
    JSON.stringify(s1j.payment));

  console.log("— pause / resume / unprovision —");
  const pa = await admin.req("/api/admin/gateways/cashfree/provision", { method: "PATCH", body: JSON.stringify({ tenantId: spk.id, status: "paused" }) });
  const s2 = await tenantSess.req("/api/settings");
  const s2j = await s2.json();
  check("paused provisioning → tenant payment null", pa.status === 200 && s2j.payment === null, JSON.stringify({ pa: pa.status, pay: s2j.payment }));
  const re = await admin.req("/api/admin/gateways/cashfree/provision", { method: "PATCH", body: JSON.stringify({ tenantId: spk.id, status: "active" }) });
  const s3 = await tenantSess.req("/api/settings");
  const s3j = await s3.json();
  check("resumed → tenant payment back", re.status === 200 && s3j.payment?.provider === "cashfree", JSON.stringify(s3j.payment));
  const un = await admin.req(`/api/admin/gateways/cashfree/provision?tenantId=${spk.id}`, { method: "DELETE" });
  const s4 = await tenantSess.req("/api/settings");
  const s4j = await s4.json();
  check("unprovisioned → tenant payment null", un.status === 200 && s4j.payment === null, JSON.stringify({ un: un.status, pay: s4j.payment }));

  console.log("— master switch lifecycle —");
  const dis = await admin.req("/api/admin/gateways/razorpay", { method: "PATCH", body: JSON.stringify({ enabled: false }) });
  check("razorpay disabled", dis.status === 200);
  const en2 = await admin.req("/api/admin/gateways/razorpay", { method: "PATCH", body: JSON.stringify({ enabled: true }) });
  check("razorpay re-enabled", en2.status === 200);

  console.log("— gates —");
  const anon = await fetch(BASE + "/api/admin/gateways");
  check("unauthenticated gateway list → 401", anon.status === 401, `status ${anon.status}`);
  const asTenant = await tenantSess.req("/api/admin/gateways");
  check("tenant calling admin gateways → 403", asTenant.status === 403, `status ${asTenant.status}`);

  console.log("— change-plan method label —");
  // Provision razorpay on SPK, change plan to same plan (no plan drift), then clean the invoice
  await admin.req("/api/admin/gateways/razorpay/provision", { method: "POST", body: JSON.stringify({ tenantId: spk.id, mode: "test", accountRef: "acct_demo_spk" }) });
  const tenantSess2 = makeSession();
  await tenantSess2.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "anand@spiceroute.in", password: "Demo@1234" }) });
  const s5 = await tenantSess2.req("/api/settings");
  const s5j = await s5.json();
  check("SPK now shows Razorpay with accountRef", s5j.payment?.provider === "razorpay" && s5j.payment.accountRef === "acct_demo_spk", JSON.stringify(s5j.payment));
  const invBefore = await db.invoice.count({ where: { tenantId: spk.id } });
  const cp = await tenantSess2.req("/api/billing/change-plan", { method: "POST", body: JSON.stringify({ planId: "multi", cycle: "monthly" }) });
  check("change-plan ok", cp.status === 200, `status ${cp.status}`);
  const lastInv = await db.invoice.findFirst({ where: { tenantId: spk.id }, orderBy: { periodStart: "desc" } });
  check("new invoice method = Auto-debit · Razorpay", lastInv?.method === "Auto-debit · Razorpay", `method: ${lastInv?.method}`);
  // restore pristine demo state: remove test invoice + all provisions, reset catalog defaults
  if ((await db.invoice.count({ where: { tenantId: spk.id } })) > invBefore) {
    await db.invoice.delete({ where: { id: lastInv.id } });
  }
  await db.tenantGateway.deleteMany();
  await db.gatewayConfig.update({ where: { provider: "razorpay" }, data: { enabled: true, keyId: "", keySecret: "", webhookSecret: "" } });
  await db.gatewayConfig.updateMany({ where: { provider: { not: "razorpay" } }, data: { enabled: false } });

  console.log(`\n${pass}/${pass + fail} gateway assertions${fail ? ` — ${fail} FAILED` : " — ALL PASS"}`);
  await db.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
