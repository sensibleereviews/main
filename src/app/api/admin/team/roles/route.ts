import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { permissionCatalog } from "@/lib/permissions";

// Platform custom roles — list (any platform staff, for pickers) + create (team_manage)
export async function GET() {
  try {
    await requirePlatformAdmin();
    const roles = await db.customRole.findMany({
      where: { scope: "platform", tenantId: null },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id, name: r.name, description: r.description || "",
        permissions: JSON.parse(r.permissions) as string[],
        members: r._count.users,
        system: false,
      })),
      catalog: permissionCatalog("platform"),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("team_manage");
    const body = await readJson<{ name?: string; description?: string; permissions?: string[] }>(req);
    const name = body.name?.trim();
    if (!name) return fail(400, "A role name is required");
    const catalog = new Set(permissionCatalog("platform").map((p) => p.id));
    const perms = [...new Set((body.permissions || []).filter((p) => catalog.has(p)))];
    const existing = await db.customRole.findFirst({ where: { scope: "platform", tenantId: null, name } });
    if (existing) return fail(409, "A role with that name already exists");
    const role = await db.customRole.create({
      data: {
        scope: "platform", tenantId: null, name,
        description: body.description?.trim() || null,
        permissions: JSON.stringify(perms),
      },
    });
    return NextResponse.json({ ok: true, role: { id: role.id, name: role.name } });
  } catch (err) {
    return handleError(err);
  }
}
