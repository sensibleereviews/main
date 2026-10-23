import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id }, include: { roleRef: { select: { name: true } } },
    });
    if (!user || user.tenantId !== sess.tenantId) return fail(404, "Team member not found");
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

// Edit a teammate — name, preset role (manager / observer) or custom role assignment
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== sess.tenantId) return fail(404, "Team member not found");
    if (user.role === "owner" && user.id !== sess.uid) return fail(400, "The workspace owner cannot be edited here");
    if (user.id === sess.uid) return fail(400, "Use Settings → Account to edit your own profile");

    const body = await readJson<{ name?: string; role?: string; roleId?: string | null; locationIds?: string[] }>(req);
    const data: { name?: string; role?: string; roleId?: string | null; locationIds?: string } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return fail(400, "Name cannot be empty");
      data.name = name;
    }

    if (body.roleId !== undefined) {
      if (body.roleId === null || body.roleId === "") {
        // clearing a custom role — fall back to the preset in body.role or observer
        const preset = ["manager", "observer"].includes(body.role || "") ? body.role! : "observer";
        data.role = preset;
        data.roleId = null;
      } else {
        const custom = await db.customRole.findFirst({ where: { id: body.roleId, scope: "tenant", tenantId: sess.tenantId! } });
        if (!custom) return fail(400, "That custom role does not exist in this workspace");
        data.role = "member";
        data.roleId = custom.id;
      }
    } else if (body.role !== undefined) {
      if (!["manager", "observer"].includes(body.role)) return fail(400, "Unknown role");
      data.role = body.role;
      data.roleId = null;
    }

    // Location assignment (doc §1F "Assign managers to locations" / §2C
    // "Assign users to locations") — stored as a JSON array of location ids.
    if (body.locationIds !== undefined) {
      const owned = await db.location.findMany({ where: { tenantId: sess.tenantId!, id: { in: body.locationIds } }, select: { id: true } });
      data.locationIds = JSON.stringify(owned.map((l) => l.id));
    }

    const updated = await db.user.update({ where: { id }, data, include: { roleRef: { select: { name: true } } } });
    await db.activityLog.create({
      data: { tenantId: sess.tenantId, actor: sess.email, action: "team.updated", detail: `${updated.email} is now ${updated.roleRef?.name || updated.role}${data.locationIds ? ` · locations: ${JSON.parse(data.locationIds).length}` : ""}` },
    });
    return NextResponse.json({ ok: true, member: { id: updated.id, role: updated.role, roleName: updated.roleRef?.name || null, locationIds: updated.locationIds } });
  } catch (err) {
    return handleError(err);
  }
}

// Re-invite — generates a fresh temp password (invite pending stays until they sign in)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== sess.tenantId) return fail(404, "Team member not found");
    if (user.role === "owner") return fail(400, "The workspace owner cannot be re-invited");
    const tempPassword = `Ss-${Math.random().toString(36).slice(2, 10)}`;
    await db.user.update({ where: { id }, data: { passwordHash: hashPassword(tempPassword), invitePending: true } });
    return NextResponse.json({ ok: true, invite: { email: user.email, tempPassword } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("team_manage");
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== sess.tenantId) return fail(404, "Team member not found");
    if (user.role === "owner") return fail(400, "The workspace owner cannot be removed");
    if (user.id === sess.uid) return fail(400, "You cannot remove your own account");
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
