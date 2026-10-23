import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { toLocationVM, toReviewVM, relTime } from "@/lib/viewmodels";

// Location detail for the drawer
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const location = await db.location.findUnique({
      where: { id },
      include: {
        syncLogs: { orderBy: { createdAt: "desc" }, take: 5 },
        reviews: { orderBy: { createdAt: "desc" }, include: { location: true, drafts: { where: { status: "pending" } } } },
      },
    });
    if (!location || location.tenantId !== sess.tenantId) return fail(404, "Location not found");
    const totalAtLocation = await db.review.count({ where: { locationId: location.id } });
    return NextResponse.json({
      location: toLocationVM(location),
      detail: {
        syncLog: location.syncLogs.map((s) => ({ t: relTime(s.createdAt), state: s.state as "ok" | "warn" | "error", msg: s.message })),
        recentReviews: location.reviews.slice(0, 3).map((r) => toReviewVM(r)),
        totalAtLocation,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("locations_manage");
    const { id } = await params;
    const body = await new Response(req.body).json().catch(() => ({}));
    const location = await db.location.findUnique({ where: { id } });
    if (!location || location.tenantId !== sess.tenantId) return fail(404, "Location not found");
    const updated = await db.location.update({
      where: { id },
      data: { name: body.name ?? location.name, area: body.area ?? location.area },
    });
    return NextResponse.json({ location: toLocationVM(updated) });
  } catch (err) {
    return handleError(err);
  }
}
