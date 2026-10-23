// Admin — bulk remove platform team members. Mirrors the single-remove rules:
// super-admin accounts and the operator's own account are always protected.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const sess = await requirePlatformPerm("team_manage");
    const { ids } = await readJson<{ ids?: string[] }>(req);
    const list = (ids || []).filter((x) => typeof x === "string" && x);
    if (list.length === 0) return fail(400, "No team members selected");

    const users = await db.user.findMany({ where: { id: { in: list }, tenantId: null } });
    let deleted = 0;
    for (const u of users) {
      if (u.role === "platform_admin") continue; // protected
      if (u.id === sess.uid) continue; // protected
      await db.user.delete({ where: { id: u.id } });
      deleted += 1;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return handleError(err);
  }
}
