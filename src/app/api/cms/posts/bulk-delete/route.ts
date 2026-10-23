// Marketing CMS — bulk delete blog articles (operators only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const { ids } = await readJson<{ ids?: string[] }>(req);
    const list = (ids || []).filter((x) => typeof x === "string" && x);
    if (list.length === 0) return fail(400, "No articles selected");
    const res = await db.cmsPost.deleteMany({ where: { id: { in: list } } });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (err) {
    return handleError(err);
  }
}
