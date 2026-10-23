import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm, hashPassword } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// Platform team — super admin + admin team members (managers / observers / custom roles)
export async function GET() {
  try {
    await requirePlatformAdmin();
    const staff = await db.user.findMany({
      where: { tenantId: null, role: { in: ["platform_admin", "platform_manager", "platform_observer", "member"] } },
      orderBy: { createdAt: "asc" },
      include: { roleRef: { select: { name: true } } },
    });
    return NextResponse.json({
      team: staff.map((u) => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        roleName: u.roleRef?.name || null,
        invitePending: u.invitePending,
        lastLoginAt: u.lastLoginAt,
        active: u.active,
        mfaEnabled: u.mfaEnabled,
        initials: u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// Invite a platform team member — needs team_manage, returns a one-time temp password
export async function POST(req: Request) {
  try {
    await requirePlatformPerm("team_manage");
    const body = await readJson<{ name?: string; email?: string; role?: string; roleId?: string }>(req);
    if (!body.email?.includes("@")) return fail(400, "A valid email is required");
    const email = body.email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail(409, "That email already has a Sensiblee account");

    let roleId: string | null = null;
    let roleLabel: string = ["platform_manager", "platform_observer"].includes(body.role || "") ? body.role! : "platform_observer";
    if (body.roleId) {
      const custom = await db.customRole.findFirst({ where: { id: body.roleId, scope: "platform", tenantId: null } });
      if (!custom) return fail(400, "That custom role does not exist");
      roleId = custom.id;
      roleLabel = custom.name;
    }

    const tempPassword = `Ss-${Math.random().toString(36).slice(2, 10)}`;
    const user = await db.user.create({
      data: {
        email, name: body.name?.trim() || email.split("@")[0],
        role: roleId ? "member" : roleLabel,
        roleId, passwordHash: hashPassword(tempPassword), invitePending: true,
      },
    });
    await db.systemEvent.create({
      data: { type: "signal", name: "Platform team invite", state: "ok", detail: `${email} invited as ${roleLabel.replace("platform_", "")}` },
    });
    return NextResponse.json({
      ok: true,
      invite: { id: user.id, email, role: roleLabel, tempPassword },
      note: "Production sends this over email; shown once here.",
    });
  } catch (err) {
    return handleError(err);
  }
}
