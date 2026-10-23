// Task 50 — patch stored Plan rows to the Part 2 pricing (doc "Pricing"):
//   Starter ₹1,499 · 1 location · 2 users
//   Growth  ₹3,499 · up to 5 locations · 5 users · main plan (popular)
//   Scale   ₹5,999 · up to 10 locations · 10 manager seats · priority support
// Task 56 — billing cycles now discount-based (10% off half-yearly, 20% off annual):
//   halfYearly = round(monthly*6*0.9) · annual = round(monthly*12*0.8)
//   WhatsApp requests 50/100/250 · AI replies 200/500/1,000
// The seed has these values but the live DB was seeded before Part 2 landed.
// Idempotent — safe to re-run.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PLANS = [
  {
    id: "starter", name: "Starter", locations: 1, seats: 2, monthlyInr: 1499, halfYearlyInr: 8095, annualInr: 14390,
    aiDrafts: "200 / month", waQuota: 50,
    blurb: "For single clinics, salons, restaurants and service businesses.",
    features: JSON.stringify([
      "1 Google Business Profile — full review monitoring", "AI replies in your brand voice — 200 / month",
      "Reputation Health", "Basic sentiment analysis",
      "WhatsApp review requests — 50 / month", "2 users",
    ]),
  },
  {
    id: "growth", name: "Growth", locations: 5, seats: 5, monthlyInr: 3499, halfYearlyInr: 18895, annualInr: 33590,
    aiDrafts: "500 / month", waQuota: 100,
    blurb: "The main plan — multi-branch teams that run on their reputation.",
    features: JSON.stringify([
      "Up to 5 Google Business Profiles", "Everything in Starter",
      "Location comparison & benchmarking", "Staff mentions (coaching view)",
      "Issue detection & Action Center", "AI replies — 500 / month",
      "WhatsApp automation — 100 / month",
      "Weekly AI insights · manager dashboards", "5 users",
    ]),
  },
  {
    id: "multi", name: "Scale", locations: 10, seats: 10, monthlyInr: 5999, halfYearlyInr: 32395, annualInr: 57590,
    aiDrafts: "1,000 / month", waQuota: 250,
    blurb: "Regional brands running reputation as a management program.",
    features: JSON.stringify([
      "Up to 10 Google Business Profiles", "Everything in Growth",
      "Regional dashboards & advanced drill-down", "Location benchmarking",
      "Issue & action tracking · automated reports", "AI replies — 1,000 / month",
      "10 manager seats · priority support",
    ]),
  },
];

async function main() {
  for (const p of PLANS) {
    const row = await db.plan.findUnique({ where: { id: p.id } });
    if (!row) { console.log(`plan ${p.id}: NOT FOUND, skipped`); continue; }
    const { id, ...data } = p;
    await db.plan.update({ where: { id }, data });
    console.log(`plan ${id}: ${data.name} ₹${data.monthlyInr}/mo · ${data.locations} locs · ${data.seats} seats`);
  }
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
  console.log(plans.map((p) => `${p.id}:₹${p.monthlyInr}${p.popular ? "★" : ""}`).join(" · "));
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
