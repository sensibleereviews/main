import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { toInvoiceVM } from "@/lib/viewmodels";

// Tenant billing: current plan, live quota meters, invoice history
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const [tenant, invoices, locations, users, campaigns] = await Promise.all([
      db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true } }),
      db.invoice.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { periodStart: "desc" }, include: { tenant: true } }),
      db.location.count({ where: { tenantId: sess.tenantId! } }),
      db.user.count({ where: { tenantId: sess.tenantId! } }),
      db.campaign.findMany({ where: { tenantId: sess.tenantId!, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    ]);
    const waUsed = campaigns.reduce((a, c) => a + c.sent, 0);
    const plan = tenant?.plan;
    return NextResponse.json({
      plan: plan ? { id: plan.id, name: plan.name, monthlyInr: plan.monthlyInr, halfYearlyInr: plan.halfYearlyInr, annualInr: plan.annualInr } : null,
      billingCycle: tenant?.billingCycle || "monthly",
      status: tenant?.status,
      nextInvoiceAt: tenant?.nextInvoiceAt,
      usage: [
        { l: "Google profiles", u: `${locations} of ${plan?.locations ?? 1}`, p: Math.min(100, Math.round((locations / (plan?.locations || 1)) * 100)), warn: false },
        { l: "WhatsApp requests", u: `${waUsed.toLocaleString("en-IN")} of ${(plan?.waQuota || 200).toLocaleString("en-IN")}`, p: Math.min(100, Math.round((waUsed / (plan?.waQuota || 1)) * 100)), warn: waUsed / (plan?.waQuota || 1) > 0.85 },
        { l: "Team seats", u: `${users} of ${plan?.seats ?? 2}`, p: Math.min(100, Math.round((users / (plan?.seats || 1)) * 100)), warn: false },
      ],
      invoices: invoices.map(toInvoiceVM),
    });
  } catch (err) {
    return handleError(err);
  }
}
