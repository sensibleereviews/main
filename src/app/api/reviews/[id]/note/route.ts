import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// Internal team-only note on a review
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("reviews_reply");
    const { id } = await params;
    const { note } = await readJson<{ note?: string }>(req);
    if (note === undefined) return fail(400, "Note is required");
    const review = await db.review.findUnique({ where: { id } });
    if (!review || review.tenantId !== sess.tenantId) return fail(404, "Review not found");
    await db.review.update({ where: { id }, data: { internalNote: note } });
    await db.activityLog.create({
      data: { tenantId: sess.tenantId, actor: sess.email, action: "review.note", detail: `Internal note added on ${review.author}'s review` },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
