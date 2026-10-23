// Marketing CMS — bulk delete media assets (image bytes live in the DB row)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const { ids } = await readJson<{ ids?: string[] }>(req);
    const list = (ids || []).filter((x) => typeof x === "string" && x);
    if (list.length === 0) return fail(400, "No images selected");
    const res = await db.cmsMedia.deleteMany({ where: { id: { in: list } } });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (err) {
    return handleError(err);
  }
}
