import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie, RESTORE_COOKIE } from "@/lib/auth";
import { handleError, readJson, requireFields, fail } from "@/lib/api";
import { platformConfig } from "@/lib/platform-config";
import { verifyTotp } from "@/lib/mfa";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: string; password?: string; mfaCode?: string }>(req);
    requireFields(body, ["email", "password"]);
    const email = body.email!.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(body.password!, user.passwordHash)) return fail(401, "Incorrect email or password");
    // Deactivated accounts are locked out (admin → Team → deactivate)
    if (!user.active) return fail(403, "This account has been deactivated — contact Sensiblee support");
    // Administrator MFA enforcement (doc §2C "Enforce administrator MFA") — when
    // the platform security toggle is on, platform admins without MFA cannot sign in.
    const security = await platformConfig.security();
    if (security.mfaRequiredForAdmins && user.role.startsWith("platform_") && !user.mfaEnabled) {
      return fail(403, "Administrator MFA is required. Ask a super admin to enable MFA for your account (Admin → Platform team → MFA) and try again.");
    }

    // 2FA Verification Gate
    if (user.mfaEnabled) {
      if (!body.mfaCode) {
        return NextResponse.json({
          mfaRequired: true,
          email: user.email,
          name: user.name,
        });
      }

      const mfaRow = await db.cmsSetting.findUnique({ where: { key: `auth.mfa.${user.id}` } });
      const secret = mfaRow?.value ? (JSON.parse(mfaRow.value) as { secret: string }).secret : null;

      if (!secret || !verifyTotp(body.mfaCode, secret)) {
        return fail(401, "Invalid two-factor authentication code. Please check your authenticator app.");
      }
    }

    const token = signToken({
      uid: user.id, role: user.role, name: user.name, email: user.email,
      tenantId: user.tenantId || undefined,
    });
    const jar = await cookies();
    jar.set(RESTORE_COOKIE, "", { path: "/", maxAge: 0 });
    await setSessionCookie(token);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await db.activityLog
      .create({ data: { tenantId: user.tenantId, actor: user.email, action: "auth.login", detail: `${user.name} signed in${user.mfaEnabled ? " (2FA verified)" : ""}` } })
      .catch(() => {});
    return NextResponse.json({ ok: true, role: user.role, tenantId: user.tenantId });
  } catch (err) {
    return handleError(err);
  }
}
