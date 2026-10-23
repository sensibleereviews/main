// Batch: reprice Starter to ₹999 (tax-exclusive) + sync tenant MRRs and invoices
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const plans = await db.plan.update({
  where: { id: "starter" },
  data: { monthlyInr: 999, halfYearlyInr: 4995, annualInr: 9990 },
});
console.log("plan:", plans.id, plans.monthlyInr, plans.halfYearlyInr, plans.annualInr);

const tenants = await db.tenant.updateMany({
  where: { planId: "starter", mrrInr: 1099 },
  data: { mrrInr: 999 },
});
console.log("tenants mrr 1099→999:", tenants.count);

const invoices = await db.invoice.updateMany({
  where: { amountInr: 1099 },
  data: { amountInr: 999 },
});
console.log("invoices 1099→999:", invoices.count);

const check = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
check.forEach((p) => console.log("final:", p.id, p.monthlyInr, p.halfYearlyInr, p.annualInr));
await db.$disconnect();
