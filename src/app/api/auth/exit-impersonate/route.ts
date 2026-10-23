import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, setSessionCookie, RESTORE_COOKIE } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";

// Exits impersonation: the ss_restore cookie holds the admin's original signed token.
export async function POST() {
  try {
    const jar = await cookies();
    const adminToken = jar.get(RESTORE_COOKIE)?.value;
    const adminSess = verifyToken(adminToken);
    if (!adminSess || adminSess.role !== "platform_admin") return fail(403, "No impersonation session to restore");
    await setSessionCookie(adminToken!);
    jar.set(RESTORE_COOKIE, "", { path: "/", maxAge: 0 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
