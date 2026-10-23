import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { fetchTenantReviews, computeTrend, computeSentiment, computeKeywords, computeKpis, healthScore, medianResponseMins } from "@/lib/analytics";
import { safeJson, minsToHuman } from "@/lib/viewmodels";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import { getScopedLocationIds } from "@/lib/tenant-scope";

// Module D — reputation analytics
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const scopedIds = await getScopedLocationIds(sess);
    const [tenant, reviews, locations] = await Promise.all([
      db.tenant.findUnique({ where: { id: sess.tenantId! } }),
      fetchTenantReviews(sess.tenantId!, scopedIds),
      db.location.findMany({
        where: {
          tenantId: sess.tenantId!,
          ...(scopedIds ? { id: { in: scopedIds } } : {}),
        },
        include: { _count: { select: { reviews: true } } },
      }),
    ]);
    const settings = safeJson<{ staff?: { name: string; score: number; mentions: number; trend: string }[] }>(tenant?.settings || "{}", {});

    // Staff-intelligence gating (doc §1G "Restrict staff data to authorized managers"):
    // only roles that can reply/coach (owners, managers) see staff rows — observers
    // get a restricted note instead.
    const me = await db.user.findUnique({ where: { id: sess.uid }, include: { roleRef: true } });
    const staffScope = hasPerm(effectivePermissions(me?.role || "observer", me?.roleRef), "reviews_reply") ? "full" : "restricted";

    const d30 = Date.now() - 30 * 86400_000;
    const last30 = reviews.filter((r) => new Date(r.createdAt).getTime() >= d30);
    const atRisk = reviews.filter((r) => r.status === "awaiting" && Date.now() - new Date(r.createdAt).getTime() > 24 * 3600_000).length;

    return NextResponse.json({
      kpis: {
        health: healthScore(reviews),
        positive: computeSentiment(reviews)[0].value,
        medianResponse: minsToHuman(medianResponseMins(reviews)),
        atRisk,
        draftsPending: reviews.filter((r) => r.drafts?.some((d) => d.status === "pending")).length,
        draftsApproved30d: last30.filter((r) => r.status === "replied" && r.repliedBy?.toLowerCase().includes("anand") === false).length,
      },
      trend: computeTrend(reviews),
      sentiment: computeSentiment(reviews),
      locations: locations.map((l) => ({
        name: l.name.replace(/^Spice Route\s+/, "").replace(/^Lumiere Dental —\s+/, ""),
        rating: l.rating,
        responses: Math.round((l.responseRate / 100) * (l._count.reviews || l.reviewCount * 0.05)),
      })),
      keywords: computeKeywords(reviews),
      staff: staffScope === "full" ? settings.staff || [] : [],
      staffScope,
      staffNote: staffScope === "restricted" ? "Staff insights are restricted to managers and owners." : null,
    });
  } catch (err) {
    return handleError(err);
  }
}
