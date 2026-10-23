import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm, hashPassword } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id }, include: { roleRef: { select: { name: true } } } });
    if (!user || user.tenantId !== null) return fail(404, "Team member not found");
    return NextResponse.json({
      member: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        roleName: user.roleRef?.name || null, invitePending: user.invitePending,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Edit a platform teammate — name, email, preset role or custom role assignment
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requirePlatformPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== null) return fail(404, "Team member not found");
    if (user.role === "platform_admin") return fail(400, "Super admin accounts cannot be edited here");

    const body = await readJson<{ name?: string; email?: string; role?: string; roleId?: string | null; active?: boolean; mfaEnabled?: boolean }>(req);
    const data: { name?: string; email?: string; role?: string; roleId?: string | null; active?: boolean; mfaEnabled?: boolean } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return fail(400, "Name cannot be empty");
      data.name = name;
    }
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@")) return fail(400, "A valid email is required");
      const clash = await db.user.findFirst({ where: { email, id: { not: id } } });
      if (clash) return fail(409, "That email already has a Sensiblee account");
      data.email = email;
    }

    if (body.roleId !== undefined) {
      if (body.roleId === null || body.roleId === "") {
        const preset = ["platform_manager", "platform_observer"].includes(body.role || "") ? body.role! : "platform_observer";
        data.role = preset;
        data.roleId = null;
      } else {
        const custom = await db.customRole.findFirst({ where: { id: body.roleId, scope: "platform", tenantId: null } });
        if (!custom) return fail(400, "That custom role does not exist");
        data.role = "member";
        data.roleId = custom.id;
      }
    } else if (body.role !== undefined) {
      if (!["platform_manager", "platform_observer"].includes(body.role)) return fail(400, "Unknown role");
      data.role = body.role;
      data.roleId = null;
    }

    // Deactivate / reactivate — blocked users cannot sign in (checked in /api/auth/login)
    if (body.active !== undefined) {
      data.active = body.active;
    }
    // Administrator MFA enforcement
    if (body.mfaEnabled !== undefined) {
      data.mfaEnabled = body.mfaEnabled;
    }

    const updated = await db.user.update({ where: { id }, data, include: { roleRef: { select: { name: true } } } });
    if (body.active !== undefined || body.mfaEnabled !== undefined) {
      await db.systemEvent.create({
        data: { type: "signal", name: "Access control updated", state: "ok", detail: `${updated.email}: ${body.active !== undefined ? (body.active ? "reactivated" : "deactivated") : ""}${body.mfaEnabled !== undefined ? ` MFA ${body.mfaEnabled ? "on" : "off"}` : ""}`.trim() },
      });
      return NextResponse.json({ ok: true, member: { id: updated.id, active: updated.active, mfaEnabled: updated.mfaEnabled } });
    }
    await db.systemEvent.create({
      data: { type: "signal", name: "Platform team updated", state: "ok", detail: `${updated.email} is now ${updated.roleRef?.name || updated.role.replace("platform_", "")}` },
    });
    return NextResponse.json({ ok: true, member: { id: updated.id, role: updated.role, roleName: updated.roleRef?.name || null } });
  } catch (err) {
    return handleError(err);
  }
}

// Re-invite — generates a fresh temp password
export async function POST(_req: Request, { params }: Ctx) {
  try {
    await requirePlatformPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== null) return fail(404, "Team member not found");
    if (user.role === "platform_admin") return fail(400, "Super admin accounts cannot be re-invited");
    const tempPassword = `Ss-${Math.random().toString(36).slice(2, 10)}`;
    await db.user.update({ where: { id }, data: { passwordHash: hashPassword(tempPassword), invitePending: true } });
    return NextResponse.json({ ok: true, invite: { email: user.email, tempPassword } });
  } catch (err) {
    return handleError(err);
  }
}

// Remove a platform team member; super-admin accounts are protected
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const sess = await requirePlatformPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== null) return fail(404, "Team member not found");
    if (user.role === "platform_admin") return fail(400, "Super admin accounts cannot be removed");
    if (user.id === sess.uid) return fail(400, "You cannot remove your own account");
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
