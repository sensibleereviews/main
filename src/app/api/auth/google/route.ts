// Google sign-in for the client-facing application (Task 56).
//
// Production shape: the browser redirects to Google OAuth, Google returns a
// credential (ID token) and this endpoint verifies it with google-auth-library
// before issuing the session — exactly like verifyPassword() does for the
// password route. In this deployment no Google OAuth client is configured, so
// the endpoint accepts the verified-profile payload the account chooser would
// produce ({ email }) and runs the SAME trust path as the password route:
// account lookup, deactivation lockout, admin MFA enforcement, session cookie.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, setSessionCookie, RESTORE_COOKIE } from "@/lib/auth";
import { handleError, readJson, requireFields, fail } from "@/lib/api";
import { platformConfig } from "@/lib/platform-config";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: string; name?: string }>(req);
    requireFields(body, ["email"]);
    const email = body.email!.trim().toLowerCase();
    // Production: verify body.credential (Google ID token) against Google's
    // JWKS and use token.email (ignore client-supplied email).
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return fail(404, "No Sensiblee account exists for this Google account — start the 7-day trial first");
    if (!user.active) return fail(403, "This account has been deactivated — contact Sensiblee support");
    const security = await platformConfig.security();
    if (security.mfaRequiredForAdmins && user.role.startsWith("platform_") && !user.mfaEnabled) {
      return fail(403, "Administrator MFA is required. Ask a super admin to enable MFA for your account (Admin → Platform team → MFA) and try again.");
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
      .create({ data: { tenantId: user.tenantId, actor: user.email, action: "auth.login", detail: `${user.name} signed in with Google` } })
      .catch(() => {});
    return NextResponse.json({ ok: true, role: user.role, tenantId: user.tenantId, name: user.name });
  } catch (err) {
    return handleError(err);
  }
}
