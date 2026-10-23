import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { fetchTenantReviews, computeTrend, computeSentiment, computeKpis } from "@/lib/analytics";
import { toReviewVM, toLocationVM, relTime } from "@/lib/viewmodels";

// Client dashboard overview — everything the Overview view renders
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const [tenant, reviews, locations, campaigns] = await Promise.all([
      db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true } }),
      fetchTenantReviews(sess.tenantId!),
      db.location.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "asc" } }),
      db.campaign.findMany({ where: { tenantId: sess.tenantId! } }),
    ]);

    const kpis = computeKpis(reviews);
    const synced = locations.filter((l) => l.lastSyncAt).sort((a, b) => new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime());
    const lastSync = synced.length ? relTime(synced[0].lastSyncAt!) : "pending first sync";

    return NextResponse.json({
      tenantName: tenant?.name || "Workspace",
      planName: tenant?.plan?.name || "—",
      ownerName: sess.name,
      kpis,
      trend: computeTrend(reviews),
      sentiment: computeSentiment(reviews),
      locations: locations.map((l) => toLocationVM(l)),
      recent: reviews.slice(0, 4).map((r) => toReviewVM(r)),
      urgent: reviews
        .filter((r) => r.status === "awaiting" || (r.drafts.length > 0 && r.stars <= 2))
        .slice(0, 2)
        .map((r) => toReviewVM(r)),
      whatsapp: {
        quality: "High",
        queued: campaigns.filter((c) => c.status === "scheduled").length,
        template: "ok",
      },
      lastSync,
    });
  } catch (err) {
    return handleError(err);
  }
}
