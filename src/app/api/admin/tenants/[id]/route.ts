import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { toTenantVM } from "@/lib/viewmodels";

// Tenant detail for the admin drawer
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        plan: true, _count: { select: { locations: true, reviews: true } },
        locations: { include: { _count: { select: { reviews: true } } } },
        invoices: { orderBy: { periodStart: "desc" }, take: 6 },
        campaigns: true,
        users: true,
      },
    });
    if (!tenant) return fail(404, "Tenant not found");

    const activities = await db.activityLog.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 6 });
    const reviews = await db.review.findMany({ where: { tenantId: id }, include: { location: true } });

    // usage vs plan quota (current month)
    const monthAgo = new Date(Date.now() - 30 * 86400_000);
    const draftsUsed = await db.aiDraft.count({ where: { review: { tenantId: id }, createdAt: { gte: monthAgo } } });
    const waUsed = tenant.campaigns.filter((c) => c.createdAt >= monthAgo).reduce((a, c) => a + c.sent, 0);
    const plan = tenant.plan;
    const aiCap = plan.aiDrafts.includes("Unlimited") ? 1500 : parseInt(plan.aiDrafts.replace(/\D+/g, "")) || 300;

    const nextInv = tenant.invoices[0];
    const usage = [
      { label: "AI drafts", used: draftsUsed, quota: aiCap, unit: plan.aiDrafts.includes("Unlimited") ? "fair use" : "this month", warn: draftsUsed / aiCap > 0.85 },
      { label: "WhatsApp messages", used: waUsed, quota: plan.waQuota, unit: "this month", warn: waUsed / plan.waQuota > 0.85 },
      { label: "Locations", used: tenant._count.locations, quota: plan.locations, unit: "of plan", warn: false },
    ];

    // health grid from location health JSON (averaged)
    const healthMap = new Map<string, number[]>();
    for (const loc of tenant.locations) {
      try {
        for (const h of JSON.parse(loc.health) as { label: string; score: number }[]) {
          healthMap.set(h.label, [...(healthMap.get(h.label) || []), h.score]);
        }
      } catch { /* ignore */ }
    }
    const health = [...healthMap.entries()].map(([label, scores]) => ({
      label, score: Math.round(scores.reduce((a, c) => a + c, 0) / scores.length),
    }));

    const mrrSeries: { m: string; mrr: number }[] = tenant.invoices
      .filter((i) => i.status === "paid")
      .slice(0, 6)
      .reverse()
      .map((i) => ({ m: new Date(i.periodStart).toLocaleDateString("en-IN", { month: "short" }), mrr: Number((i.amountInr / 100000).toFixed(2)) }));
    if (mrrSeries.length < 2) mrrSeries.unshift({ m: "start", mrr: 0 });

    const owner = tenant.users.find((u) => u.role === "owner");

    // Onboarding progress (admin → Clients → drawer)
    let onboarding: { done: boolean; locations: number; reviews: number; firstSync: boolean } = { done: true, locations: 0, reviews: 0, firstSync: false };
    try {
      const s = JSON.parse(tenant.settings) as { onboarding?: { done?: boolean } };
      onboarding = {
        done: s.onboarding?.done ?? true,
        locations: tenant._count.locations,
        reviews: tenant._count.reviews,
        firstSync: tenant.locations.some((l) => l.lastSyncAt !== null),
      };
    } catch { /* keep defaults */ }

    return NextResponse.json({
      tenant: toTenantVM(tenant),
      detail: {
        onboarding,
        mrrSeries,
        usage,
        health,
        activity: activities.map((a) => ({
          t: new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          label: a.action.replace(/[._]/g, " "),
          desc: a.detail || "",
        })),
        contact: {
          person: tenant.contactName, role: owner ? "Owner" : "Primary",
          phone: tenant.contactPhone || "—", email: tenant.contactEmail,
        },
        gstin: tenant.gstin || "—",
        nextInvoice: tenant.status === "past_due"
          ? `Blocked — ₹${(nextInv?.amountInr || tenant.mrrInr).toLocaleString("en-IN")} overdue`
          : nextInv?.dueAt
            ? `${new Date(nextInv.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ₹${nextInv.amountInr.toLocaleString("en-IN")}`
            : "On conversion",
        trialDaysLeft: tenant.trialEndsAt ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400_000)) : null,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Update tenant — status / plan changes / support notes / data requests
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformPerm("clients_manage");
    const { id } = await params;
    const body = await readJson<{ status?: string; planId?: string; note?: string; dataRequest?: "export" | "delete" }>(req);
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) return fail(404, "Tenant not found");

    // Support note — appended to the client's activity trail (was a fake toast before)
    if (body.note?.trim()) {
      await db.activityLog.create({
        data: { tenantId: id, actor: `admin:${admin.email}`, action: "support.note", detail: body.note.trim().slice(0, 500) },
      });
      return NextResponse.json({ ok: true, note: true });
    }

    // Data export / deletion requests (DPDP Act workflow).
    // export → the drawer offers a real download via GET /api/admin/tenants/[id]/export;
    // delete → anonymise the workspace NOW (scrub PII, deactivate users, suspend) and
    // keep an audit trail — the honest processing step the doc requires.
    if (body.dataRequest) {
      if (body.dataRequest === "export") {
        await db.activityLog.create({
          data: { tenantId: id, actor: `admin:${admin.email}`, action: "data.export_requested", detail: "Data export prepared — download from the client drawer" },
        });
        return NextResponse.json({ ok: true, dataRequest: "export", exportUrl: `/api/admin/tenants/${id}/export` });
      }
      // deletion processing (doc §2L "Process data export and deletion requests")
      const anonName = `Deleted workspace ${tenant.slug}`;
      await db.$transaction([
        db.tenant.update({
          where: { id },
          data: {
            name: anonName, contactName: "Erased", contactEmail: `erased+${tenant.slug}@deleted.sensiblee.in`,
            contactPhone: null, gstin: null, website: null, status: "suspended", mrrInr: 0,
          },
        }),
        db.user.updateMany({ where: { tenantId: id }, data: { active: false, name: "Erased user", phone: null } }),
        db.contact.deleteMany({ where: { tenantId: id } }),
        db.waOptOut.deleteMany({ where: { tenantId: id } }),
      ]);
      await db.activityLog.create({
        data: { tenantId: id, actor: `admin:${admin.email}`, action: "data.deleted", detail: "Workspace anonymised per deletion request — PII scrubbed, users deactivated, billing stopped" },
      });
      await db.systemEvent.create({
        data: { type: "incident", name: "Data deletion completed", state: "ok", detail: `${tenant.name} anonymised by ${admin.email}` },
      });
      return NextResponse.json({ ok: true, dataRequest: "delete" });
    }

    const data: { status?: string; planId?: string; mrrInr?: number } = {};
    if (body.status && ["active", "trial", "past_due", "suspended"].includes(body.status)) data.status = body.status;
    if (body.planId) {
      const plan = await db.plan.findUnique({ where: { id: body.planId } });
      if (!plan) return fail(404, "Plan not found");
      data.planId = plan.id;
      data.mrrInr = tenant.billingCycle === "annual"
        ? Math.round(plan.annualInr / 12)
        : tenant.billingCycle === "half_yearly"
          ? Math.round(plan.halfYearlyInr / 6)
          : plan.monthlyInr;
    }
    const updated = await db.tenant.update({ where: { id }, data, include: { plan: true, _count: { select: { locations: true, reviews: true } } } });
    await db.activityLog.create({
      data: { tenantId: id, actor: `admin:${admin.email}`, action: "tenant.updated", detail: `status=${data.status || "unchanged"} plan=${data.planId || "unchanged"}` },
    });
    return NextResponse.json({ tenant: toTenantVM(updated) });
  } catch (err) {
    return handleError(err);
  }
}
