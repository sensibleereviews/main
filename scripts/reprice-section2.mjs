// Task 49: apply doc Section 2 pricing to the LIVE DB —
//   Starter ₹1,499 (1 loc · 2 users) · Growth ₹3,499 (5 loc · 5 users, main plan)
//   Scale ₹5,999 (10 loc · unlimited managers)  +  Enterprise→Scale rename
// Also refresh the home/features CMS rows (hero copy + six-component names)
// and align SPK's most recent invoice with the new Scale price.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const PLAN_FEATURES = {
  starter: [
    "1 Google Business Profile — full review monitoring", "AI replies in your brand voice",
    "Reputation Health Score", "Basic sentiment analysis",
    "WhatsApp review requests — 200 / month", "2 users",
  ],
  growth: [
    "Up to 5 Google Business Profiles", "Everything in Starter",
    "Location comparison & benchmarking", "Staff mentions (coaching view)",
    "Issue detection & Action Center", "WhatsApp automation — 1,000 / month",
    "Weekly AI insights · manager dashboards", "5 users",
  ],
  multi: [
    "Up to 10 Google Business Profiles", "Everything in Growth",
    "Regional dashboards & advanced drill-down", "Location benchmarking",
    "Issue & action tracking · automated reports", "Unlimited managers · priority support",
  ],
};

// ---- plans ------------------------------------------------------------------
await db.plan.update({
  where: { id: "starter" },
  data: {
    name: "Starter", monthlyInr: 1499, halfYearlyInr: 7495, annualInr: 14990,
    locations: 1, seats: 2, aiDrafts: "50 / month", waQuota: 200, sortOrder: 1, popular: false,
    blurb: "For single clinics, salons, restaurants and service businesses.",
    features: JSON.stringify(PLAN_FEATURES.starter),
  },
});
await db.plan.update({
  where: { id: "growth" },
  data: {
    name: "Growth", monthlyInr: 3499, halfYearlyInr: 17495, annualInr: 34990,
    locations: 5, seats: 5, aiDrafts: "300 / month", waQuota: 1000, sortOrder: 2, popular: true,
    blurb: "The main plan — multi-branch teams that run on their reputation.",
    features: JSON.stringify(PLAN_FEATURES.growth),
  },
});
await db.plan.update({
  where: { id: "multi" },
  data: {
    name: "Scale", monthlyInr: 5999, halfYearlyInr: 29995, annualInr: 59990,
    locations: 10, seats: 99, aiDrafts: "Unlimited · fair use", waQuota: 5000, sortOrder: 3, popular: false,
    blurb: "Regional brands running reputation as a management program.",
    features: JSON.stringify(PLAN_FEATURES.multi),
  },
});
console.log("plans: starter 1499 · growth 3499 · multi/Scale 5999 — done");

// ---- tenant MRRs follow the plan price --------------------------------------
for (const [planId, mrr] of [["starter", 1499], ["growth", 3499], ["multi", 5999]]) {
  const r = await db.tenant.updateMany({ where: { planId }, data: { mrrInr: mrr } });
  console.log(`tenants on ${planId} → mrr ${mrr}:`, r.count);
}

// ---- SPK most recent invoice follows the Scale price -------------------------
const spk = await db.tenant.findUnique({ where: { slug: "spice-route" } });
if (spk) {
  const inv = await db.invoice.findFirst({
    where: { tenantId: spk.id, amountInr: 4999 },
    orderBy: { periodStart: "desc" },
  });
  if (inv) {
    await db.invoice.update({ where: { id: inv.id }, data: { amountInr: 5999 } });
    console.log("SPK invoice", inv.number, "4999 → 5999");
  } else {
    console.log("SPK invoice: no 4999 row found (already aligned)");
  }
}

// ---- CMS rows: home hero + six-component module names ------------------------
const HOME_MODULES = [
  { title: "Reputation Command Center", desc: "Every Google Business Profile synced on a 15-minute cadence, with sentiment scored on arrival." },
  { title: "Review Growth Engine", desc: "WhatsApp campaigns and table QR kits turn happy guests into public proof." },
  { title: "AI Reputation Copilot", desc: "On-brand drafts in your voice — you approve, edit or regenerate every reply." },
  { title: "Location Intelligence", desc: "Ratings, sentiment, keywords, locations and staff — one reputation health score." },
];
const FEATURE_MODULES = [
  { name: "Reputation Command Center", headline: "Every review, sensed the moment it lands" },
  { name: "Review Growth Engine", headline: "Happy guests become public proof" },
  { name: "AI Reputation Copilot", headline: "Drafts in your voice — you stay in charge" },
  { name: "Location Intelligence", headline: "One health score for the whole brand" },
];
const HERO_SUB = "Reputation Intelligence & Review Operations for multi-location businesses — Sensiblee monitors every Google review, drafts replies in your voice, grows fresh reviews over WhatsApp & QR, and turns feedback into a Health Score with assigned fixes you can run the business by.";

const homeRow = await db.cmsPage.findUnique({ where: { slug: "home" } });
if (homeRow) {
  const c = JSON.parse(homeRow.content || "{}");
  c.heroSub = HERO_SUB;
  if (Array.isArray(c.modules)) c.modules = HOME_MODULES;
  await db.cmsPage.update({ where: { slug: "home" }, data: { content: JSON.stringify(c) } });
  console.log("cms home row: heroSub + modules refreshed");
}
const featRow = await db.cmsPage.findUnique({ where: { slug: "features" } });
if (featRow) {
  const c = JSON.parse(featRow.content || "{}");
  if (Array.isArray(c.modules)) {
    c.modules = c.modules.map((m, i) => ({ ...m, ...(FEATURE_MODULES[i] || {}) }));
    await db.cmsPage.update({ where: { slug: "features" }, data: { content: JSON.stringify(c) } });
    console.log("cms features row: module names refreshed");
  }
}

// ---- final state -------------------------------------------------------------
const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
plans.forEach((p) => console.log("final plan:", p.id, p.name, p.monthlyInr, "pop:" + p.popular));
const ts = await db.tenant.findMany({ select: { slug: true, planId: true, mrrInr: true } });
ts.forEach((t) => console.log("final tenant:", t.slug, t.planId, t.mrrInr));
await db.$disconnect();
