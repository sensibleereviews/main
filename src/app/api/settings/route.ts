import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { safeJson, toLocationVM } from "@/lib/viewmodels";
import { activeGatewayFor } from "@/lib/gateways";

export async function GET() {
  try {
    const sess = await requireTenantUser();
    const [tenant, users, locations, campaigns, payment] = await Promise.all([
      db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true } }),
      db.user.findMany({ where: { tenantId: sess.tenantId }, include: { roleRef: { select: { name: true } } } }),
      db.location.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "asc" } }),
      db.campaign.findMany({ where: { tenantId: sess.tenantId!, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
      activeGatewayFor(sess.tenantId!),
    ]);
    const s = safeJson<Record<string, unknown>>(tenant?.settings || "{}", {});
    const waUsed = campaigns.reduce((a, c) => a + c.sent, 0);
    const plan = tenant?.plan;
    return NextResponse.json({
      profile: {
        name: tenant?.name, category: s.category || "Business", website: s.website || "",
        signature: s.signature || "", greeting: s.greeting || "",
        whatsappName: tenant?.whatsappName || "", whatsappPhone: tenant?.whatsappPhone || "",
      },
      ai: { tone: s.tone || "warm", threshold: s.autoApproveThreshold ?? 90, digestLanguage: s.digestLanguage || "English (India)", brandVoice: (s.brandVoice as string) || "" },
      waCompliance: s.waCompliance || { quietStart: 21, quietEnd: 9, dailyLimit: 200 },
      notifs: s.notifs || { digest: true, negative: true, weekly: true, billing: false },
      onboardingDone: (s.onboarding as { done?: boolean } | undefined)?.done ?? false,
      locations: locations.map((l) => toLocationVM(l)),
      team: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, roleName: u.roleRef?.name || null, invitePending: u.invitePending, initials: u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(), locationIds: (() => { try { return JSON.parse(u.locationIds || "[]") as string[]; } catch { return []; } })() })),
      plan: plan ? {
        name: plan.name, monthlyInr: plan.monthlyInr, waQuota: plan.waQuota,
        locations: plan.locations, seats: plan.seats,
      } : null,
      usage: [
        { l: "Google profiles", u: `${locations.length} of ${plan?.locations ?? 1}`, p: Math.min(100, Math.round((locations.length / (plan?.locations || 1)) * 100)), warn: false },
        { l: "WhatsApp requests", u: `${waUsed.toLocaleString("en-IN")} of ${(plan?.waQuota || 200).toLocaleString("en-IN")}`, p: Math.min(100, Math.round((waUsed / (plan?.waQuota || 1)) * 100)), warn: waUsed / (plan?.waQuota || 1) > 0.85 },
        { l: "Team seats", u: `${users.length} of ${plan?.seats || 2}`, p: Math.min(100, Math.round((users.length / (plan?.seats || 1)) * 100)), warn: false },
      ],
      billingCycle: tenant?.billingCycle || "monthly",
      payment: payment
        ? { provider: payment.provider, label: payment.label, mode: payment.mode, status: payment.status, accountRef: payment.accountRef, methodLabel: payment.methodLabel }
        : null,
    });
  } catch (err) {
    return handleError(err);
  }
}

// Save settings — profile, AI voice, notifications, WhatsApp sender, onboarding
export async function PATCH(req: Request) {
  try {
    const sess = await requireTenantPerm("settings_manage");
    const body = await readJson<{
      profile?: { name?: string; category?: string; website?: string; signature?: string; greeting?: string };
      ai?: { tone?: string; threshold?: number; digestLanguage?: string; brandVoice?: string };
      notifs?: Record<string, boolean>;
      whatsapp?: { name?: string; phone?: string };
      waCompliance?: { quietStart?: number; quietEnd?: number; dailyLimit?: number };
      onboardingDone?: boolean;
    }>(req);

    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! } });
    if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    const s = safeJson<Record<string, unknown>>(tenant.settings, {});

    if (body.profile?.name) await db.tenant.update({ where: { id: tenant.id }, data: { name: body.profile.name } });
    if (body.profile?.category !== undefined) s.category = body.profile.category;
    if (body.profile?.website !== undefined) s.website = body.profile.website;
    if (body.profile?.signature !== undefined) s.signature = body.profile.signature;
    if (body.profile?.greeting !== undefined) s.greeting = body.profile.greeting;
    if (body.ai?.tone) s.tone = body.ai.tone;
    if (body.ai?.brandVoice !== undefined) s.brandVoice = body.ai.brandVoice;
    if (body.ai?.threshold !== undefined) s.autoApproveThreshold = body.ai.threshold;
    if (body.ai?.digestLanguage !== undefined) s.digestLanguage = body.ai.digestLanguage;
    if (body.notifs) s.notifs = { ...(s.notifs as object || {}), ...body.notifs };
    if (body.waCompliance) {
      const prev = (s.waCompliance as { quietStart?: number; quietEnd?: number; dailyLimit?: number } | undefined) || { quietStart: 21, quietEnd: 9, dailyLimit: 200 };
      const qs = Math.min(23, Math.max(0, body.waCompliance.quietStart ?? prev.quietStart ?? 21));
      const qe = Math.min(23, Math.max(0, body.waCompliance.quietEnd ?? prev.quietEnd ?? 9));
      const dl = Math.max(1, body.waCompliance.dailyLimit ?? prev.dailyLimit ?? 200);
      s.waCompliance = { quietStart: qs, quietEnd: qe, dailyLimit: dl };
    }
    if (body.onboardingDone) s.onboarding = { ...(s.onboarding as object || {}), done: true };

    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: JSON.stringify(s),
        whatsappName: body.whatsapp?.name ?? tenant.whatsappName,
        whatsappPhone: body.whatsapp?.phone ?? tenant.whatsappPhone,
      },
    });
    await db.activityLog.create({
      data: { tenantId: tenant.id, actor: sess.email, action: "settings.updated", detail: "Workspace settings saved" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
