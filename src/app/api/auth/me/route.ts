import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { safeJson } from "@/lib/viewmodels";
import { effectivePermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const sess = await getSession();
    if (!sess) return NextResponse.json({ user: null });
    const user = await db.user.findUnique({
      where: { id: sess.uid },
      include: { tenant: { include: { plan: true } }, roleRef: { select: { name: true, permissions: true } } },
    });
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        roleName: user.roleRef?.name || null,
        locationIds: (() => {
          try {
            return JSON.parse(user.locationIds || "[]") as string[];
          } catch {
            return [];
          }
        })(),
        permissions: effectivePermissions(user.role, user.roleRef),
        impersonatedBy: sess.imp || null,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
              status: user.tenant.status,
              planId: user.tenant.planId,
              planName: user.tenant.plan?.name || "—",
              mrrInr: user.tenant.mrrInr,
              billingCycle: user.tenant.billingCycle,
              settings: safeJson(user.tenant.settings, {}),
              onboardingDone: safeJson<{ onboarding?: { done?: boolean } }>(user.tenant.settings, {}).onboarding?.done ?? false,
              trialEndsAt: user.tenant.trialEndsAt,
            }
          : null,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
