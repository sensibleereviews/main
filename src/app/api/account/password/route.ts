import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, verifyPassword, hashPassword, ApiError } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";

// Change my own password — requires the current password
export async function POST(req: Request) {
  try {
    const sess = await requireSession();
    const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req);
    if (!body.currentPassword || !body.newPassword) throw new ApiError(400, "Current and new password are required");
    if (body.newPassword.length < 8) throw new ApiError(400, "New password must be at least 8 characters");

    const user = await db.user.findUnique({ where: { id: sess.uid } });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      throw new ApiError(400, "Current password is incorrect");
    }
    if (verifyPassword(body.newPassword, user.passwordHash)) {
      throw new ApiError(400, "New password must be different from the current one");
    }

    await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.newPassword) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
