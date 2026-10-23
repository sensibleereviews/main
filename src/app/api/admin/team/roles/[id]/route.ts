import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { permissionCatalog } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

async function scopedRole(id: string) {
  const role = await db.customRole.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role || role.scope !== "platform" || role.tenantId !== null) return null;
  return role;
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requirePlatformPerm("team_manage");
    const { id } = await params;
    const role = await scopedRole(id);
    if (!role) return fail(404, "Role not found");
    const body = await readJson<{ name?: string; description?: string; permissions?: string[] }>(req);
    const catalog = new Set(permissionCatalog("platform").map((p) => p.id));
    const data: { name?: string; description?: string | null; permissions?: string } = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return fail(400, "A role name is required");
      const clash = await db.customRole.findFirst({ where: { scope: "platform", tenantId: null, name, id: { not: id } } });
      if (clash) return fail(409, "A role with that name already exists");
      data.name = name;
    }
    if (body.description !== undefined) data.description = body.description.trim() || null;
    if (body.permissions !== undefined) {
      data.permissions = JSON.stringify([...new Set(body.permissions.filter((p) => catalog.has(p)))]);
    }
    await db.customRole.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requirePlatformPerm("team_manage");
    const { id } = await params;
    const role = await scopedRole(id);
    if (!role) return fail(404, "Role not found");
    if (role._count.users > 0) {
      return fail(400, `${role._count.users} teammate${role._count.users === 1 ? "" : "s"} still on this role — move them first`);
    }
    await db.customRole.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
