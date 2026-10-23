// Verification — Task 32 batch: contact address removal, CMS-driven page names,
// contact page name/URL editing, invoice detail API, bulk-delete endpoints.
// Run: bun scripts/verify-ops-batch.mjs  (dev server on :3000)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let pass = 0, failCount = 0;

function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.log(`  ✗ ${name} ${extra}`); }
}

async function main() {
  /* 1. login */
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }),
  });
  const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  check("platform admin login", login.ok && cookie.length > 10);
  const H = { "Content-Type": "application/json", Cookie: cookie };

  /* 2. CMS page names sync (header/footer/sitemap read these) */
  console.log("\n— CMS page names —");
  const pagesRes = await fetch(`${BASE}/api/cms/pages`, { headers: H });
  const pages = (await pagesRes.json()).pages;
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  check("contact page present in CMS Pages list", bySlug.contact?.title === "Contact Us", `got "${bySlug.contact?.title}"`);
  check("about page keeps the admin rename", bySlug.about?.title === "About Us", `got "${bySlug.about?.title}"`);

  // round-trip: rename contact → "Get in Touch", verify site-wide label, then restore
  const putName = await fetch(`${BASE}/api/cms/pages/contact`, {
    method: "PUT", headers: H, body: JSON.stringify({ title: "Get in Touch" }),
  });
  check("rename contact page via API", putName.ok);
  const homeHtml = await (await fetch(`${BASE}/`, { headers: { Cookie: cookie } })).text();
  check("footer + nav reflect renamed label on home", homeHtml.includes(">Get in Touch</button>"));
  check("old label gone from home", !homeHtml.includes(">Contact Us<"));
  await fetch(`${BASE}/api/cms/pages/contact`, { method: "PUT", headers: H, body: JSON.stringify({ title: "Contact Us" }) });
  const homeHtml2 = await (await fetch(`${BASE}/`, { headers: { Cookie: cookie } })).text();
  check("restore contact name → footer/nav labels follow", homeHtml2.includes(">Contact Us</button>") && !homeHtml2.includes(">Get in Touch</button>"));

  /* 3. Contact page URL editing round-trip */
  console.log("\n— Contact URL editing —");
  const putUrl = await fetch(`${BASE}/api/cms/pages/contact`, {
    method: "PUT", headers: H, body: JSON.stringify({ urlSlug: "talk-to-us" }),
  });
  check("move contact page to /talk-to-us", putUrl.ok);
  const moved = await fetch(`${BASE}/talk-to-us`, { headers: { Cookie: cookie } });
  const movedHtml = await moved.text();
  check("/talk-to-us renders the contact page (SSR)", moved.ok && movedHtml.includes("Send inquiry"), `status ${moved.status}`);
  check("quick-answers card present (address replaced)", movedHtml.includes("Quick answers"));
  check("address card removed", !movedHtml.includes("Where we are") && !movedHtml.includes("addressLines"));
  const oldUrl = await fetch(`${BASE}/contact-us`, { headers: { Cookie: cookie } });
  const oldHtml = await oldUrl.text();
  check("old /contact-us → branded 404 view (no redirects)", oldHtml.includes("page not found"), `status ${oldUrl.status}`);
  // restore
  await fetch(`${BASE}/api/cms/pages/contact`, { method: "PUT", headers: H, body: JSON.stringify({ urlSlug: "" }) });
  const restored = await fetch(`${BASE}/contact-us`, { headers: { Cookie: cookie } });
  check("URL reset → /contact-us live again", restored.ok);
  const collision = await fetch(`${BASE}/api/cms/pages/privacy`, {
    method: "PUT", headers: H, body: JSON.stringify({ urlSlug: "contact-us" }),
  });
  check("collision with another page's URL rejected", collision.status === 400);

  /* 4. Invoice detail API (view/print source) */
  console.log("\n— Invoice detail —");
  const invRes = await fetch(`${BASE}/api/admin/invoices`, { headers: H });
  const invoices = (await invRes.json()).invoices;
  check("invoices list loads", invoices.length > 0);
  if (invoices.length > 0) {
    const det = await fetch(`${BASE}/api/admin/invoices/${invoices[0].id}`, { headers: H });
    const d = await det.json();
    check("invoice detail returns invoice + tenant", det.ok && d.invoice?.number && d.tenant?.name);
    check("detail carries GST fields (plan, billingCycle, amount)", !!d.tenant?.plan && typeof d.invoice?.amountInr === "number");
  }

  /* 5. Bulk deletes on scratch data */
  console.log("\n— Bulk deletes —");
  // 5a. demo requests
  await fetch(`${BASE}/api/demo-requests`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Scratch A", email: "a@x.test", company: "Scratch Co A" }),
  });
  await fetch(`${BASE}/api/demo-requests`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Scratch B", email: "b@x.test", company: "Scratch Co B" }),
  });
  const scratchDemos = await db.demoRequest.findMany({ where: { email: { in: ["a@x.test", "b@x.test"] } } });
  const demoBulk = await fetch(`${BASE}/api/demo-requests/bulk-delete`, {
    method: "POST", headers: H, body: JSON.stringify({ ids: scratchDemos.map((d) => d.id) }),
  });
  const demoRes = await demoBulk.json();
  check("bulk delete demo requests", demoBulk.ok && demoRes.deleted === 2, JSON.stringify(demoRes));
  check("scratch demos gone", (await db.demoRequest.count({ where: { email: { in: ["a@x.test", "b@x.test"] } } })) === 0);

  // 5b. CMS FAQs
  const faq1 = await fetch(`${BASE}/api/cms/faqs`, {
    method: "POST", headers: H, body: JSON.stringify({ section: "home", category: "Scratch", question: "Scratch Q1?", answer: "A1", sortOrder: 999, published: true }),
  }).then((r) => r.json());
  const faq2 = await fetch(`${BASE}/api/cms/faqs`, {
    method: "POST", headers: H, body: JSON.stringify({ section: "home", category: "Scratch", question: "Scratch Q2?", answer: "A2", sortOrder: 999, published: true }),
  }).then((r) => r.json());
  const faqBulk = await fetch(`${BASE}/api/cms/faqs/bulk-delete`, {
    method: "POST", headers: H, body: JSON.stringify({ ids: [faq1.faq.id, faq2.faq.id] }),
  });
  check("bulk delete CMS FAQs", faqBulk.ok && (await faqBulk.json()).deleted === 2);
  check("scratch FAQs gone", (await db.cmsFaq.count({ where: { category: "Scratch" } })) === 0);

  // 5c. tenant cascade
  const plan = await db.plan.findFirst();
  const scratchTenant = await db.tenant.create({
    data: { name: "Scratch Cascade Co", slug: `scratch-${Date.now()}`, planId: plan.id, status: "trial", contactName: "Scratch Owner", contactEmail: "scratch@x.test", mrrInr: 999 },
  });
  await db.location.create({ data: { tenantId: scratchTenant.id, code: `scr-${Date.now()}`, name: "Scratch Loc", area: "Test" } });
  await db.invoice.create({
    data: { tenantId: scratchTenant.id, number: `SCRATCH-${Date.now()}`, amountInr: 999, status: "pending", periodStart: new Date(), periodEnd: new Date(), dueAt: new Date() },
  });
  const tBulk = await fetch(`${BASE}/api/admin/tenants/bulk-delete`, {
    method: "POST", headers: H, body: JSON.stringify({ ids: [scratchTenant.id] }),
  });
  check("bulk delete tenant (cascade)", tBulk.ok && (await tBulk.json()).deleted === 1);
  check("tenant gone", (await db.tenant.count({ where: { id: scratchTenant.id } })) === 0);
  check("cascade: locations gone", (await db.location.count({ where: { tenantId: scratchTenant.id } })) === 0);
  check("cascade: invoices gone", (await db.invoice.count({ where: { tenantId: scratchTenant.id } })) === 0);

  // 5d. invoice bulk delete (create scratch rows first)
  const inv1 = await db.invoice.create({
    data: { tenantId: (await db.tenant.findFirst()).id, number: `SCRATCH-INV-${Date.now()}`, amountInr: 100, status: "pending", periodStart: new Date(), periodEnd: new Date(), dueAt: new Date() },
  });
  const invBulk = await fetch(`${BASE}/api/admin/invoices/bulk-delete`, {
    method: "POST", headers: H, body: JSON.stringify({ ids: [inv1.id] }),
  });
  check("bulk delete invoices", invBulk.ok && (await invBulk.json()).deleted === 1);
  check("scratch invoice gone", (await db.invoice.count({ where: { id: inv1.id } })) === 0);

  // 5e. team bulk delete — create a scratch member, ensure super admin protected
  const u1 = await fetch(`${BASE}/api/admin/team`, {
    method: "POST", headers: H, body: JSON.stringify({ name: "Scratch Member", email: `scratch-${Date.now()}@sensiblee.in`, role: "platform_observer" }),
  }).then((r) => r.json());
  const scratchUser = await db.user.findUnique({ where: { email: u1.invite.email } });
  const me = await db.user.findUnique({ where: { email: "admin@sensiblee.in" } });
  const teamBulk = await fetch(`${BASE}/api/admin/team/bulk-delete`, {
    method: "POST", headers: H, body: JSON.stringify({ ids: [scratchUser.id, me.id] }),
  });
  const teamRes = await teamBulk.json();
  check("team bulk delete removes member, protects super admin", teamBulk.ok && teamRes.deleted === 1, JSON.stringify(teamRes));
  check("super admin still present", (await db.user.count({ where: { email: "admin@sensiblee.in" } })) === 1);

  /* 6. marketing pages still healthy */
  console.log("\n— Marketing route sweep —");
  for (const p of ["/", "/features", "/pricing", "/about-us", "/contact-us", "/customer-stories", "/blog", "/faqs", "/submit-a-ticket", "/privacy-policy", "/sitemap", "/security-trust"]) {
    const r = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie } });
    check(`GET ${p} → 200`, r.status === 200, `got ${r.status}`);
  }
  const sitemapHtml = await (await fetch(`${BASE}/sitemap`, { headers: { Cookie: cookie } })).text();
  check("sitemap labels follow CMS titles", sitemapHtml.includes("About Us") && sitemapHtml.includes("Contact Us"));

  console.log(`\n=== ${pass} passed, ${failCount} failed ===`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
