import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { toReviewVM } from "@/lib/viewmodels";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const review = await db.review.findUnique({
      where: { id },
      include: { location: true, drafts: { where: { status: "pending" } } },
    });
    if (!review || review.tenantId !== sess.tenantId) return fail(404, "Review not found");
    return NextResponse.json({ review: toReviewVM(review) });
  } catch (err) {
    return handleError(err);
  }
}
