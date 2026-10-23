import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, signToken, setSessionCookie, ApiError } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// Personal account — every signed-in user (owner, team member, platform staff)
export async function GET() {
  try {
    const sess = await requireSession();
    const user = await db.user.findUnique({ where: { id: sess.uid } });
    if (!user) return fail(404, "Account not found");
    return NextResponse.json({
      account: {
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Editable personal info: full name, email, mobile number
export async function PATCH(req: Request) {
  try {
    const sess = await requireSession();
    const body = await readJson<{ name?: string; email?: string; phone?: string }>(req);
    const user = await db.user.findUnique({ where: { id: sess.uid } });
    if (!user) return fail(404, "Account not found");

    const data: { name?: string; email?: string; phone?: string | null } = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) throw new ApiError(400, "Name cannot be empty");
      data.name = body.name.trim();
    }
    let emailChanged = false;
    if (body.email !== undefined && body.email.trim().toLowerCase() !== user.email) {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@")) throw new ApiError(400, "Enter a valid email address");
      const clash = await db.user.findUnique({ where: { email } });
      if (clash) return fail(409, "That email already has a Sensiblee account");
      data.email = email;
      emailChanged = true;
    }
    if (body.phone !== undefined) data.phone = body.phone.trim() || null;

    const updated = await db.user.update({ where: { id: user.id }, data });

    // name/email live in the session token — re-issue it so the UI stays in sync
    if (emailChanged || data.name !== undefined) {
      const token = signToken({
        uid: updated.id, role: updated.role, name: updated.name, email: updated.email,
        tenantId: updated.tenantId || undefined,
      });
      await setSessionCookie(token);
    }
    return NextResponse.json({
      ok: true,
      account: { name: updated.name, email: updated.email, phone: updated.phone || "", role: updated.role },
    });
  } catch (err) {
    return handleError(err);
  }
}
