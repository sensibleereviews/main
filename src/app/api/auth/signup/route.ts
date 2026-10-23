import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken, setSessionCookie, ApiError } from "@/lib/auth";
import { handleError, readJson, requireFields, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ business?: string; name?: string; email?: string; phone?: string; password?: string }>(req);
    requireFields(body, ["business", "name", "email", "password"]);
    if (body.password!.length < 8) throw new ApiError(400, "Password must be at least 8 characters");
    const email = body.email!.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail(409, "An account with this email already exists");

    const slugBase = body.business!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "workspace";
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    // 7-day full-feature trial — no card required; MRR follows the Starter plan price
    const starter = await db.plan.findUnique({ where: { id: "starter" } });
    const trialEnds = new Date(Date.now() + 7 * 86400_000);
    const firstName = body.name!.trim().split(" ")[0];

    const tenant = await db.tenant.create({
      data: {
        name: body.business!.trim(), slug, planId: "starter", status: "trial", mrrInr: starter?.monthlyInr ?? 1499,
        contactName: body.name!.trim(), contactEmail: email, contactPhone: body.phone || null,
        trialEndsAt: trialEnds, nextInvoiceAt: trialEnds,
        settings: JSON.stringify({
          tone: "warm", autoApproveThreshold: 90, greeting: firstName,
          signature: `— ${firstName}, ${body.business!.trim()}`, category: "Business",
          notifs: { digest: true, negative: true, weekly: false, billing: false },
          onboarding: { done: false },
        }),
      },
    });
    const user = await db.user.create({
      data: { email, passwordHash: hashPassword(body.password!), name: body.name!.trim(), phone: body.phone?.trim() || null, role: "owner", tenantId: tenant.id },
    });
    await db.activityLog.create({
      data: { tenantId: tenant.id, actor: email, action: "tenant.created", detail: `Trial started on the Starter plan` },
    });
    await db.systemEvent.create({
      data: { type: "signal", name: "New trial signup", state: "ok", detail: `${tenant.name} · ${email}`, createdAt: new Date() },
    });

    const token = signToken({ uid: user.id, role: user.role, name: user.name, email: user.email, tenantId: tenant.id });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, tenantId: tenant.id, role: user.role });
  } catch (err) {
    return handleError(err);
  }
}
