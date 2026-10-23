import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { fetchTenantReviews } from "@/lib/analytics";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import {
  computeHealthDelta,
  topNegativeThemes,
  staffMentions,
  peakWindowLabel,
  revenueRiskFor,
  safeKws,
  type HealthWeights,
} from "@/lib/health-score";
import { platformConfig } from "@/lib/platform-config";

// Reputation Health — North-Star score, per-location breakdown, "why"
// explanations, negative themes and staff mentions (coaching view).
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const [reviews, locations, campaigns, healthCfg] = await Promise.all([
      fetchTenantReviews(sess.tenantId!),
      db.location.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "asc" } }),
      db.campaign.findMany({ where: { tenantId: sess.tenantId! } }),
      platformConfig.health(),
    ]);

    // Admin-configurable formula: shipped v1/v2 weight set or the platform
    // override (admin → Reputation controls), plus the minimum-data threshold.
    const weightsOverride = healthCfg.customWeights && Object.keys(healthCfg.customWeights).length
      ? (healthCfg.customWeights as unknown as HealthWeights)
      : null;
    // Section 2 (REFINED VERSION): Health Score as North Star — v2 weights
    const { current, previous, delta } = computeHealthDelta(reviews, locations, healthCfg.version || "v2", {
      minReviews: healthCfg.minReviews,
      weightsOverride,
    });

    // Reputation ROI (doc: reviews requested vs generated, conversion, improvement)
    const requested = campaigns.reduce((a, c) => a + c.sent, 0);
    const generatedCampaign = campaigns.reduce((a, c) => a + c.reviewsGenerated, 0);
    const requestSourced = reviews.filter((r) => r.source === "request").length;
    const locationsImproved = current.locations.filter((l) => l.delta > 0).length;

    // Staff-intelligence gating (doc §1G): staff rows only for roles allowed to
    // coach (owners/managers) — observers receive empty staff arrays + a note.
    const me = await db.user.findUnique({ where: { id: sess.uid }, include: { roleRef: true } });
    const staffAllowed = hasPerm(effectivePermissions(me?.role || "observer", me?.roleRef), "reviews_reply");

    // per-location drill-down detail (themes + staff per branch)
    const drill = locations.map((l) => {
      const rs = reviews.filter((r) => r.locationId === l.id);
      const monthly: { label: string; score: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = Date.now() - (i + 1) * 30 * 86_400_000;
        const end = Date.now() - i * 30 * 86_400_000;
        const win = rs.filter((r) => {
          const t = new Date(r.createdAt).getTime();
          return t >= start && t < end;
        });
        const rating = win.length ? win.reduce((a, c) => a + c.stars, 0) / win.length : 0;
        // map a 0–5 rating onto the 0–100 band scale for a comparable trend line
        monthly.push({ label: new Date(end).toLocaleString("en-IN", { month: "short" }), score: rating ? Math.round((rating / 5) * 100) : 0 });
      }
      return {
        id: l.id,
        name: l.name,
        area: l.area,
        themes: topNegativeThemes(rs).slice(0, 4),
        staff: staffAllowed ? staffMentions(rs, 4) : [],
        monthly,
        unanswered: rs.filter((r) => r.status !== "replied" && !r.replyText).length,
        avgResponseMins: l.avgResponseMins,
      };
    });

    // Reputation Alert (doc Part 2): the weakest branch rendered as a full alert —
    // "31 negative reviews · Top issue 42 mentions ↑67% · Most affected 6–9 PM ·
    //  Employees mentioned: 8 · Revenue risk: High → Recommended action + Assign"
    const weakestLoc = current.locations[0] || null;
    const weakestDrill = drill.find((d) => d.id === weakestLoc?.id) || null;
    const weakestTheme = weakestDrill?.themes[0] || null;
    const negAtWeakest = reviews.filter(
      (r) => r.locationId === weakestLoc?.id && (r.stars <= 2 || r.sentiment === "negative") && new Date(r.createdAt).getTime() >= Date.now() - 30 * 86_400_000
    );
    const STAFF_RE = /\b(Amit|Priya|Rahul|Vikram|Sneha|Arjun|Anand|Meera|Rohit|Lakshmi|Manoj|Kavya|Deepak|Pooja|Rajesh|Sunil|Anita|Farah)\b/;
    const trendPct = weakestTheme && weakestTheme.count > 0
      ? (() => {
          const prev = reviews.filter(
            (r) => r.locationId === weakestLoc?.id && (r.stars <= 2 || r.sentiment === "negative") &&
              new Date(r.createdAt).getTime() >= Date.now() - 60 * 86_400_000 && new Date(r.createdAt).getTime() < Date.now() - 30 * 86_400_000
          ).filter((r) => (topNegativeThemes([r])[0]?.category || "other") === weakestTheme.category).length;
          return prev ? Math.round(((weakestTheme.count - prev) / prev) * 100) : 100;
        })()
      : 0;
    const alert = weakestLoc && weakestTheme ? {
      location: weakestLoc.name,
      health: weakestLoc.score,
      delta: weakestLoc.delta,
      negativeReviews: negAtWeakest.length,
      topIssue: weakestTheme.label,
      mentions: weakestTheme.count,
      trendPct,
      peakWindow: peakWindowLabel(negAtWeakest),
      employeesMentioned: new Set(negAtWeakest.map((r) => `${r.text} ${safeKws(r.keywords).join(" ")}`).flatMap((t) => (t.match(STAFF_RE) || []))).size,
      revenueRisk: revenueRiskFor(weakestTheme.count, trendPct, weakestTheme.share),
    } : null;

    return NextResponse.json({
      score: current.score,
      band: current.band,
      delta,
      prevScore: previous.score,
      rating30: current.rating30,
      reviews30: current.reviews30,
      responseRate: current.responseRate,
      dimensions: current.dimensions,
      locations: current.locations,
      explanations: current.explanations,
      insufficientData: current.insufficientData,
      dataNote: current.dataNote,
      themes: topNegativeThemes(reviews).slice(0, 5),
      staff: staffAllowed ? staffMentions(reviews, 5) : [],
      staffScope: staffAllowed ? "full" : "restricted",
      roi: {
        requested,
        generated: generatedCampaign + requestSourced,
        conversion: requested ? Math.round(((generatedCampaign + requestSourced) / requested) * 1000) / 10 : 0,
        avgRating: current.rating30,
        ratingImprovement: Math.round((current.rating30 - (previous.rating30 || current.rating30)) * 100) / 100,
        locationsImproved,
        locationsTotal: locations.length,
      },
      alert,
      drill,
    });
  } catch (err) {
    return handleError(err);
  }
}
