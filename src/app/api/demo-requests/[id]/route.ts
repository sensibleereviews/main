import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("leads_manage");
    const { id } = await params;
    const body = await readJson<{ status?: string }>(req);
    if (!body.status || !["new", "contacted", "converted"].includes(body.status)) return fail(400, "Invalid status");
    await db.demoRequest.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
