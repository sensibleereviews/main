import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJson, handleError, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

// Complete password reset using token
export async function POST(req: Request) {
  try {
    const { token, password } = await readJson<{ token?: string; password?: string }>(req);

    if (!token || typeof token !== "string") {
      return fail(400, "Reset token is required.");
    }
    if (!password || password.length < 8) {
      return fail(400, "Password must be at least 8 characters long.");
    }

    const row = await db.cmsSetting.findUnique({ where: { key: `auth.reset.${token}` } });
    if (!row?.value) {
      return fail(400, "Invalid or expired password reset link. Please request a new one.");
    }

    let payload: { userId: string; email: string; expiresAt: number };
    try {
      payload = JSON.parse(row.value);
    } catch {
      return fail(400, "Corrupt reset token.");
    }

    if (Date.now() > payload.expiresAt) {
      await db.cmsSetting.delete({ where: { key: `auth.reset.${token}` } }).catch(() => {});
      return fail(400, "Password reset link has expired. Please request a new one.");
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return fail(404, "User account no longer exists.");
    }

    const newHash = hashPassword(password);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Invalidate token
    await db.cmsSetting.delete({ where: { key: `auth.reset.${token}` } }).catch(() => {});

    await db.activityLog.create({
      data: {
        tenantId: user.tenantId,
        actor: user.email,
        action: "auth.password_reset",
        detail: `Password reset successfully completed for ${user.email}`,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (err) {
    return handleError(err);
  }
}
