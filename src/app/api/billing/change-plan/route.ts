import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { activeGatewayFor, methodLabelFor } from "@/lib/gateways";

// Change plan — immediate in this build; Razorpay proration hooks documented in README
const CYCLES: Record<string, { total: (p: { monthlyInr: number; halfYearlyInr: number; annualInr: number }) => number; months: number }> = {
  monthly: { total: (p) => p.monthlyInr, months: 1 },
  half_yearly: { total: (p) => p.halfYearlyInr, months: 6 },
  annual: { total: (p) => p.annualInr, months: 12 },
};

export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("settings_manage");
    const body = await readJson<{ planId?: string; cycle?: string }>(req);
    if (!body.planId) return fail(400, "planId is required");
    const plan = await db.plan.findUnique({ where: { id: body.planId } });
    if (!plan) return fail(404, "Plan not found");
    const cycle = body.cycle && body.cycle in CYCLES ? body.cycle : "monthly";
    const spec = CYCLES[cycle];
    const price = spec.total(plan); // amount billed for the full period
    const mrr = Math.round(price / spec.months); // per-month equivalent

    const tenant = await db.tenant.update({
      where: { id: sess.tenantId! },
      data: { planId: plan.id, billingCycle: cycle, mrrInr: mrr },
    });
    const lastInv = await db.invoice.findFirst({ where: { tenantId: sess.tenantId! }, orderBy: { periodStart: "desc" } });
    const seq = (await db.invoice.count({ where: { tenantId: sess.tenantId! } })) + 1;
    // Method label follows the provisioned gateway (single source with admin System view)
    const gw = await activeGatewayFor(sess.tenantId!);
    await db.invoice.create({
      data: {
        tenantId: sess.tenantId!, number: `SS-2026-${2000 + seq}`, amountInr: price,
        method: gw ? methodLabelFor(gw.label) : (lastInv?.method || "UPI · Razorpay"), status: "pending",
        periodStart: new Date(), periodEnd: new Date(Date.now() + spec.months * 30 * 86400_000),
        dueAt: new Date(Date.now() + 7 * 86400_000),
      },
    });
    await db.activityLog.create({
      data: { tenantId: sess.tenantId!, actor: sess.email, action: "plan.changed", detail: `${plan.name} plan · ${cycle} · ₹${price.toLocaleString("en-IN")}` },
    });
    return NextResponse.json({ ok: true, plan: { id: plan.id, name: plan.name }, mrrInr: tenant.mrrInr, status: tenant.status });
  } catch (err) {
    return handleError(err);
  }
}
