import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

const memberVM = (u: { id: string; name: string; email: string; role: string; invitePending: boolean; locationIds?: string; roleRef?: { name: string } | null }) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  roleName: u.roleRef?.name || null,
  roleId: u.roleRef ? u.roleRef.name : null,
  invitePending: u.invitePending,
  locationIds: (() => { try { return JSON.parse(u.locationIds || "[]") as string[]; } catch { return []; } })(),
  initials: u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
});

export async function GET() {
  try {
    const sess = await requireTenantUser();
    const users = await db.user.findMany({
      where: { tenantId: sess.tenantId },
      orderBy: { createdAt: "asc" },
      include: { roleRef: { select: { name: true } } },
    });
    return NextResponse.json({ team: users.map(memberVM) });
  } catch (err) {
    return handleError(err);
  }
}

// Invite a teammate — creates the seat and returns a one-time temp password
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("team_manage");
    const body = await readJson<{ name?: string; email?: string; role?: string; roleId?: string }>(req);
    if (!body.email?.includes("@")) return fail(400, "A valid email is required");
    const email = body.email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail(409, "That email already has a Sensiblee account");

    // Either a preset role (manager / observer) or a custom role owned by this workspace
    let roleId: string | null = null;
    let roleLabel: string = ["manager", "observer"].includes(body.role || "") ? body.role! : "observer";
    if (body.roleId) {
      const custom = await db.customRole.findFirst({ where: { id: body.roleId, scope: "tenant", tenantId: sess.tenantId! } });
      if (!custom) return fail(400, "That custom role does not exist in this workspace");
      roleId = custom.id;
      roleLabel = custom.name;
    }

    const tempPassword = `Ss-${Math.random().toString(36).slice(2, 10)}`;
    const user = await db.user.create({
      data: {
        email, name: body.name?.trim() || email.split("@")[0],
        role: roleId ? "member" : roleLabel,
        roleId, tenantId: sess.tenantId, passwordHash: hashPassword(tempPassword), invitePending: true,
      },
    });
    await db.activityLog.create({
      data: { tenantId: sess.tenantId, actor: sess.email, action: "team.invited", detail: `${email} invited as ${roleLabel}` },
    });
    return NextResponse.json({
      ok: true,
      invite: { id: user.id, email, role: roleLabel, tempPassword },
      note: "Production sends this over WhatsApp + email; shown once here.",
    });
  } catch (err) {
    return handleError(err);
  }
}
