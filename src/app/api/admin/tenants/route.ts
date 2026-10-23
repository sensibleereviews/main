import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm, hashPassword } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { toTenantVM } from "@/lib/viewmodels";
import { platformConfig } from "@/lib/platform-config";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const tenants = await db.tenant.findMany({
      include: { plan: true, _count: { select: { locations: true, reviews: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ tenants: tenants.map(toTenantVM) });
  } catch (err) {
    return handleError(err);
  }
}

// Create a customer organisation (admin-side onboarding) — provisions the
// workspace, the owner login (temp password) and the trial window.
export async function POST(req: Request) {
  try {
    const admin = await requirePlatformPerm("clients_manage");
    const body = await readJson<{ business?: string; ownerName?: string; ownerEmail?: string; ownerPhone?: string; planId?: string }>(req);
    if (!body.business?.trim() || !body.ownerEmail?.trim() || !body.ownerName?.trim()) {
      return fail(400, "Business name, owner name and owner email are required");
    }
    const email = body.ownerEmail.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail(409, "A user with this email already exists");

    const plan = await db.plan.findUnique({ where: { id: body.planId || "starter" } });
    if (!plan) return fail(404, "Plan not found");
    const billing = await platformConfig.billing();

    const slugBase = body.business.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "workspace";
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const firstName = body.ownerName.trim().split(" ")[0];
    const trialEnds = new Date(Date.now() + billing.trialDays * 86_400_000);
    const tempPassword = `Se-${Math.random().toString(36).slice(2, 10)}`;

    const tenant = await db.tenant.create({
      data: {
        name: body.business.trim(), slug, planId: plan.id, status: "trial", mrrInr: plan.monthlyInr,
        contactName: body.ownerName.trim(), contactEmail: email, contactPhone: body.ownerPhone?.trim() || null,
        trialEndsAt: trialEnds, nextInvoiceAt: trialEnds,
        settings: JSON.stringify({
          tone: "warm", autoApproveThreshold: 90, greeting: firstName,
          signature: `— ${firstName}, ${body.business.trim()}`, category: "Restaurant",
          notifs: { digest: true, negative: true, weekly: false, billing: false },
          onboarding: { done: false },
        }),
      },
    });
    const user = await db.user.create({
      data: { email, passwordHash: hashPassword(tempPassword), name: body.ownerName.trim(), phone: body.ownerPhone?.trim() || null, role: "owner", tenantId: tenant.id, invitePending: true },
    });
    await db.activityLog.create({
      data: { tenantId: tenant.id, actor: `admin:${admin.email}`, action: "tenant.created", detail: `Created from admin console · ${plan.name} plan · ${billing.trialDays}-day trial` },
    });
    await db.systemEvent.create({
      data: { type: "signal", name: "Organisation created", state: "ok", detail: `${tenant.name} · ${email} (${plan.name})` },
    });
    return NextResponse.json({ tenant: toTenantVM({ ...tenant, plan: { name: plan.name }, _count: { locations: 0, reviews: 0 } }), owner: { id: user.id, email }, tempPassword });
  } catch (err) {
    return handleError(err);
  }
}
