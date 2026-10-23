import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { fetchTenantReviews, computeTrend, computeSentiment, computeKeywords, computeKpis, computeFunnel, healthScore, medianResponseMins } from "@/lib/analytics";
import { safeJson } from "@/lib/viewmodels";

// Reporting engine — powers the user-dashboard Reports view (PDF downloads).
// Report availability follows the subscription plan:
//   Starter (999)  → basic    tier: reputation summary, location performance
//   Growth (2,499) → standard tier: + sentiment & keywords, campaign performance
//   Multi  (4,999) → advanced tier: + staff performance, AI performance, business review
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const url = new URL(req.url);
    const days = url.searchParams.get("days") === "90" ? 90 : 30;

    const [tenant, reviews, locations, campaigns, drafts] = await Promise.all([
      db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true } }),
      fetchTenantReviews(sess.tenantId!),
      db.location.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { rating: "desc" } }),
      db.campaign.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.aiDraft.findMany({
        where: { review: { tenantId: sess.tenantId! }, createdAt: { gte: new Date(Date.now() - days * 86400_000) } },
        select: { tokens: true, status: true, confidence: true, createdAt: true },
      }),
    ]);
    const settings = safeJson<{ staff?: { name: string; score: number; mentions: number; trend: string }[] }>(tenant?.settings || "{}", {});

    const plan = tenant?.plan;
    const tier = plan?.id === "multi" ? "advanced" : plan?.id === "growth" ? "standard" : "basic";
    const windowStart = Date.now() - days * 86400_000;

    const tokens = drafts.reduce((a, d) => a + d.tokens, 0);
    const approved = drafts.filter((d) => d.status === "approved").length;
    const avgConfidence = drafts.length
      ? Number((drafts.reduce((a, d) => a + d.confidence, 0) / drafts.length).toFixed(3))
      : 0;

    const kpis = computeKpis(reviews);
    const { funnel, stats } = computeFunnel(reviews, campaigns.filter((c) => new Date(c.createdAt).getTime() >= windowStart));

    // channel mix for the period
    const channelMap = new Map<string, { channel: string; sent: number; opened: number; reviews: number }>();
    for (const c of campaigns.filter((c) => new Date(c.createdAt).getTime() >= windowStart)) {
      const label = c.channel === "qr" ? "QR" : c.channel === "email" ? "Email" : "WhatsApp";
      const row = channelMap.get(label) || { channel: label, sent: 0, opened: 0, reviews: 0 };
      row.sent += c.sent; row.opened += c.opened; row.reviews += c.reviewsGenerated;
      channelMap.set(label, row);
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      days,
      tenant: {
        name: tenant?.name || "Workspace",
        category: safeJson<Record<string, unknown>>(tenant?.settings || "{}", {}).category as string || "Business",
        plan: { id: plan?.id || "starter", name: plan?.name || "Starter", tier },
      },
      kpis: {
        ...kpis,
        health: healthScore(reviews),
        medianResponse: minsToHumanSafe(medianResponseMins(reviews)),
      },
      trend: computeTrend(reviews),
      sentiment: computeSentiment(reviews, days),
      keywords: computeKeywords(reviews),
      locations: locations.map((l) => ({
        name: l.name, area: l.area, rating: l.rating, delta: l.ratingDelta,
        reviews: l.reviewCount, responseRate: l.responseRate,
        avgResponse: minsToHumanSafe(l.avgResponseMins),
      })),
      staff: settings.staff || [],
      requests: {
        funnel,
        stats,
        byChannel: [...channelMap.values()].sort((a, b) => b.sent - a.sent),
        campaigns: campaigns.map((c) => ({
          name: c.name,
          channel: c.channel === "qr" ? "QR" : c.channel === "email" ? "Email" : "WhatsApp",
          status: c.status,
          sent: c.sent, opened: c.opened, clicked: c.clicked, reviews: c.reviewsGenerated,
          date: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        })),
      },
      ai: {
        drafts: drafts.length,
        approved,
        approvalRate: drafts.length ? Math.round((approved / drafts.length) * 100) : 0,
        avgConfidence,
        tokens,
        estCostInr: Math.round(tokens * 0.00023), // ₹0.23 / 1k tokens (documented estimate)
        quota: plan?.aiDrafts || "50 / month",
        repliesPosted: reviews.filter((r) => r.status === "replied" && r.repliedAt && new Date(r.repliedAt).getTime() >= windowStart).length,
        pending: reviews.filter((r) => r.drafts?.some((d) => d.status === "pending")).length,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

function minsToHumanSafe(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
