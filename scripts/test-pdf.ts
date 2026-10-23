// Smoke-test: build a report PDF + invoice PDF for the seeded Spice Route tenant
// and validate structure. Run: bun run scripts/test-pdf.ts
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { buildMonthlyReport, reportPdf, invoicePdf } from "../src/lib/reports";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findFirst({ where: { slug: "spice-route" }, include: { plan: true } });
  if (!tenant) throw new Error("tenant not found");

  const data = await buildMonthlyReport(tenant.id); // last full month
  const rpdf = reportPdf(data);
  writeFileSync("/tmp/report.pdf", rpdf);
  console.log("report tier:", data.tier, "kpis:", JSON.stringify(data.kpis), "bytes:", rpdf.length);

  const inv = await db.invoice.findFirst({ where: { tenantId: tenant.id }, orderBy: { periodStart: "desc" } });
  if (!inv) throw new Error("no invoice");
  const ipdf = invoicePdf({
    number: inv.number, status: inv.status, method: inv.method, amountInr: inv.amountInr,
    periodStart: inv.periodStart, periodEnd: inv.periodEnd, dueAt: inv.dueAt, paidAt: inv.paidAt,
    tenant: { name: tenant.name, gstin: tenant.gstin, contactEmail: tenant.contactEmail, contactPhone: tenant.contactPhone },
    planName: tenant.plan.name, billingCycle: tenant.billingCycle,
  });
  writeFileSync("/tmp/invoice.pdf", ipdf);
  console.log("invoice bytes:", ipdf.length);

  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
