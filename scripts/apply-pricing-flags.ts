// One-off data migration — aligns the live demo DB with the new pricing &
// feature-flag model:
//   1. Plans: Starter 1099 → 999 (prices are GST-EXCLUSIVE; GST 18% added at billing)
//   2. Feature flags: seed catalog (whatsapp_channel OFF = Phase 2)
//   3. Tenant mrrInr: recompute from plan + cycle (+₹799 add-on location for UrbanNest)
//   4. Invoices: amountInr becomes the GST-INCLUSIVE total charged (round(base*1.18))
// Run once: bun scripts/apply-pricing-flags.ts
import { PrismaClient } from "@prisma/client";
import { FLAG_CATALOG } from "../src/lib/features";

const db = new PrismaClient();
const withGst = (base: number) => Math.round(base * 1.18);

async function main() {
  console.log("— plans —");
  await db.plan.update({ where: { id: "starter" }, data: { monthlyInr: 999, halfYearlyInr: 4995, annualInr: 9990 } });
  // growth (2499) and multi (4999) already match the target pricing
  for (const id of ["growth", "multi"]) {
    const p = await db.plan.findUnique({ where: { id } });
    const target = id === "growth" ? 2499 : 4999;
    if (p && p.monthlyInr !== target) {
      await db.plan.update({ where: { id }, data: { monthlyInr: target, halfYearlyInr: target * 5, annualInr: target * 10 } });
    }
  }

  console.log("— feature flags —");
  for (const f of FLAG_CATALOG) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      update: { label: f.label, description: f.description, category: f.category, phase: f.phase },
      create: { key: f.key, label: f.label, description: f.description, category: f.category, phase: f.phase, systemEnabled: f.defaultEnabled },
    });
  }

  console.log("— tenant MRR (base, excl. GST) —");
  const tenants = await db.tenant.findMany({ include: { plan: true, locations: true } });
  for (const t of tenants) {
    const cycle = t.billingCycle;
    const base =
      cycle === "annual" ? Math.round((t.plan.annualInr || t.plan.monthlyInr * 10) / 12)
      : cycle === "half_yearly" ? Math.round((t.plan.halfYearlyInr || t.plan.monthlyInr * 5) / 6)
      : t.plan.monthlyInr;
    const extraLocs = Math.max(0, t.locations.length - t.plan.locations);
    const mrr = base + extraLocs * 799;
    if (t.mrrInr !== mrr) {
      await db.tenant.update({ where: { id: t.id }, data: { mrrInr: mrr } });
      console.log(`  ${t.name}: ${t.mrrInr} → ${mrr}`);
    }
  }

  console.log("— invoices → GST-inclusive totals —");
  const invoices = await db.invoice.findMany({ include: { tenant: { include: { plan: true, locations: true } } } });
  for (const inv of invoices) {
    if (inv.amountInr === 0) continue; // "On conversion" placeholder stays ₹0
    const t = inv.tenant;
    const cycle = t.billingCycle;
    const periodMonths = cycle === "annual" ? 12 : cycle === "half_yearly" ? 6 : 1;
    // infer the period base from the invoice span (fallback: one cycle of the plan)
    const spanDays = Math.max(1, Math.round((new Date(inv.periodEnd).getTime() - new Date(inv.periodStart).getTime()) / 86400_000));
    const months = Math.max(1, Math.round(spanDays / 30));
    const cycleBase =
      cycle === "annual" ? (t.plan.annualInr || t.plan.monthlyInr * 10)
      : cycle === "half_yearly" ? (t.plan.halfYearlyInr || t.plan.monthlyInr * 5)
      : t.plan.monthlyInr;
    const extraLocs = Math.max(0, t.locations.length - t.plan.locations);
    const base = months === periodMonths ? cycleBase + extraLocs * 799 : t.plan.monthlyInr * months + extraLocs * 799;
    const total = withGst(base);
    if (inv.amountInr !== total) {
      await db.invoice.update({ where: { id: inv.id }, data: { amountInr: total } });
      console.log(`  ${inv.number}: ₹${inv.amountInr} → ₹${total}`);
    }
  }

  console.log("done.");
}

main().finally(() => db.$disconnect());
