import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, verifyPassword } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { generateBase32Secret, generateOtpAuthUrl, verifyTotp } from "@/lib/mfa";

// Multi-Factor Authentication (TOTP 2FA) setup & verification endpoint
export async function GET() {
  try {
    const sess = await requireSession();
    const user = await db.user.findUnique({ where: { id: sess.uid } });
    if (!user) return fail(404, "User not found");

    const secret = generateBase32Secret(20);
    const otpauthUrl = generateOtpAuthUrl(user.email, secret, "Sensiblee");

    // Temporarily save pending setup secret
    await db.cmsSetting.upsert({
      where: { key: `auth.mfa.pending.${user.id}` },
      create: { key: `auth.mfa.pending.${user.id}`, value: JSON.stringify({ secret, createdAt: Date.now() }) },
      update: { value: JSON.stringify({ secret, createdAt: Date.now() }) },
    });

    return NextResponse.json({
      secret,
      otpauthUrl,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const sess = await requireSession();
    const body = await readJson<{ action?: string; code?: string; targetUserId?: string; password?: string }>(req);

    const targetId = body.targetUserId && sess.role === "platform_admin" ? body.targetUserId : sess.uid;
    const user = await db.user.findUnique({ where: { id: targetId } });
    if (!user) return fail(404, "User not found");

    if (body.action === "enable") {
      if (!body.code) return fail(400, "6-digit authentication code is required");

      const pendingRow = await db.cmsSetting.findUnique({ where: { key: `auth.mfa.pending.${user.id}` } });
      if (!pendingRow?.value) return fail(400, "MFA setup was not initiated. Please request a new setup QR.");

      const pending = JSON.parse(pendingRow.value) as { secret: string };
      const valid = verifyTotp(body.code, pending.secret);

      if (!valid) {
        return fail(400, "Invalid code. Please check your authenticator app and try again.");
      }

      // Save confirmed secret & activate
      await db.cmsSetting.upsert({
        where: { key: `auth.mfa.${user.id}` },
        create: { key: `auth.mfa.${user.id}`, value: JSON.stringify({ secret: pending.secret, enabledAt: new Date() }) },
        update: { value: JSON.stringify({ secret: pending.secret, enabledAt: new Date() }) },
      });

      await db.cmsSetting.delete({ where: { key: `auth.mfa.pending.${user.id}` } }).catch(() => {});

      await db.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });

      await db.activityLog.create({
        data: {
          tenantId: user.tenantId,
          actor: sess.email,
          action: "security.mfa_enabled",
          detail: `Two-factor authentication enabled for ${user.email}`,
        },
      }).catch(() => {});

      return NextResponse.json({ ok: true, mfaEnabled: true, message: "Two-factor authentication successfully enabled!" });
    }

    if (body.action === "disable") {
      const isSuper = sess.role === "platform_admin";
      if (!isSuper && body.password) {
        if (!verifyPassword(body.password, user.passwordHash)) {
          return fail(401, "Incorrect password.");
        }
      }

      await db.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false },
      });

      await db.cmsSetting.delete({ where: { key: `auth.mfa.${user.id}` } }).catch(() => {});

      await db.activityLog.create({
        data: {
          tenantId: user.tenantId,
          actor: sess.email,
          action: "security.mfa_disabled",
          detail: `Two-factor authentication disabled for ${user.email}`,
        },
      }).catch(() => {});

      return NextResponse.json({ ok: true, mfaEnabled: false, message: "Two-factor authentication disabled." });
    }

    return fail(400, "Invalid action");
  } catch (err) {
    return handleError(err);
  }
}
