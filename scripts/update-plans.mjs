// Task 49 — apply the refined pricing (₹1,499 / ₹3,499 / ₹5,999) to the live
// DB Plan rows. Idempotent. Mirrors prisma/seed.ts; keeps plan ids stable
// (starter/growth/multi) so tenant.planId references stay valid.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const PLANS = [
  {
    id: "starter", name: "Starter", monthlyInr: 1499, halfYearlyInr: 7495, annualInr: 14990, locations: 1, seats: 2,
    aiDrafts: "50 / month", waQuota: 200, sortOrder: 1,
    blurb: "Single clinics, salons, restaurants and service businesses getting their Google reputation in order.",
    features: [
      "1 Google Business Profile", "Google monitoring — 15-minute sync", "AI replies in your brand voice",
      "Reputation Health score", "Basic sentiment analysis", "WhatsApp review requests — 200 / month", "2 users",
    ],
  },
  {
    id: "growth", name: "Growth", monthlyInr: 3499, halfYearlyInr: 17495, annualInr: 34990, locations: 5, seats: 5,
    aiDrafts: "300 / month", waQuota: 1000, sortOrder: 2, popular: true,
    blurb: "Multi-branch brands that run reputation as a management program — our main plan.",
    features: [
      "Up to 5 locations", "Everything in Starter", "Location comparison & benchmarking",
      "Staff mention intelligence", "Issue detection & action tracking", "WhatsApp automation",
      "Weekly AI insights", "Manager dashboards — 5 users",
    ],
  },
  {
    id: "multi", name: "Scale", monthlyInr: 5999, halfYearlyInr: 29995, annualInr: 59990, locations: 10, seats: 999,
    aiDrafts: "Unlimited · fair use", waQuota: 5000, sortOrder: 3,
    blurb: "Regional brands running reputation as an operating system across every branch.",
    features: [
      "Up to 10 locations", "Everything in Growth", "Regional dashboards", "Advanced drill-down",
      "Location benchmarking", "Issue & action tracking", "Automated reports",
      "Unlimited managers", "Priority support",
    ],
  },
];

async function main() {
  for (const p of PLANS) {
    const { id, features, ...data } = p;
    const row = await db.plan.findUnique({ where: { id } });
    if (!row) {
      await db.plan.create({ data: { id, ...data, features: JSON.stringify(features) } });
      console.log(`created plan ${id}`);
    } else {
      await db.plan.update({ where: { id }, data: { ...data, features: JSON.stringify(features) } });
      console.log(`updated plan ${id} → ₹${data.monthlyInr}/mo, ${data.locations} locations, ${data.seats >= 999 ? "unlimited" : data.seats} seats`);
    }
  }
  // SPK mrr should track the plan price (billed monthly) for admin-consistency
  const spk = await db.tenant.findUnique({ where: { slug: "spice-route" }, include: { plan: true } });
  if (spk && spk.billingCycle === "monthly" && spk.mrrInr !== spk.plan.monthlyInr) {
    await db.tenant.update({ where: { id: spk.id }, data: { mrrInr: spk.plan.monthlyInr } });
    console.log(`SPK mrr → ₹${spk.plan.monthlyInr}`);
  }
}

main().then(() => process.exit(0));
