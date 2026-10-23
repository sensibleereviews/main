// Tenant-scoped analytics computations (server-side)
import { db } from "./db";
import { Review, AiDraft, Location } from "@prisma/client";

export type ReviewWithDrafts = Review & { drafts: AiDraft[]; location: Location };

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#88d6a0", neutral: "#f59e0b", negative: "#e2654f",
};

export async function fetchTenantReviews(tenantId: string, locationIds?: string[] | null): Promise<ReviewWithDrafts[]> {
  return db.review.findMany({
    where: {
      tenantId,
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: { location: true, drafts: { where: { status: "pending" } } },
    orderBy: { createdAt: "desc" },
  });
}

// Weekly rating + volume for the last `weeks` weeks → [{w:"W1", rating, volume}]
export function computeTrend(reviews: (Review | ReviewWithDrafts)[], weeks = 12) {
  const buckets: { label: string; ratings: number[]; volume: number }[] = [];
  for (let i = 0; i < weeks; i++) buckets.push({ label: `W${i + 1}`, ratings: [], volume: 0 });
  const start = Date.now() - weeks * 7 * 86400_000;
  for (const r of reviews) {
    const t = new Date(r.createdAt).getTime();
    if (t < start) continue;
    const idx = Math.min(weeks - 1, Math.floor((t - start) / (7 * 86400_000)));
    buckets[idx].ratings.push(r.stars);
    buckets[idx].volume += 1;
  }
  return buckets.map((b) => ({
    w: b.label,
    rating: b.ratings.length ? Number((b.ratings.reduce((a, c) => a + c, 0) / b.ratings.length).toFixed(2)) : 4.2,
    volume: b.volume,
  }));
}

export function computeSentiment(reviews: (Review | ReviewWithDrafts)[], days = 30) {
  const cutoff = Date.now() - days * 86400_000;
  const recent = reviews.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  const pool = recent.length ? recent : reviews.slice(0, 30);
  const total = pool.length || 1;
  const count = (s: string) => pool.filter((r) => r.sentiment === s).length;
  const p = count("positive"), n = count("neutral"), g = count("negative");
  return [
    { name: "Positive", value: Math.round((p / total) * 100), color: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: Math.round((n / total) * 100), color: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: Math.round((g / total) * 100), color: SENTIMENT_COLORS.negative },
  ];
}

export function computeKeywords(reviews: (Review | ReviewWithDrafts)[]) {
  const map = new Map<string, { count: number; sentiment: string }>();
  for (const r of reviews.slice(0, 200)) {
    try {
      const kws = JSON.parse(r.keywords) as string[];
      for (const kw of kws) {
        const prev = map.get(kw);
        map.set(kw, { count: (prev?.count || 0) + 1, sentiment: r.sentiment });
      }
    } catch { /* ignore */ }
  }
  return [...map.entries()]
    .map(([word, v]) => ({ word, count: v.count, sentiment: v.sentiment }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export function computeKpis(reviews: ReviewWithDrafts[]) {
  const now = Date.now();
  const d30 = now - 30 * 86400_000;
  const d60 = now - 60 * 86400_000;
  const last30 = reviews.filter((r) => new Date(r.createdAt).getTime() >= d30);
  const prev30 = reviews.filter((r) => { const t = new Date(r.createdAt).getTime(); return t >= d60 && t < d30; });
  const avg = (arr: ReviewWithDrafts[]) => (arr.length ? arr.reduce((a, c) => a + c.stars, 0) / arr.length : 0);

  const rating = avg(last30) || avg(reviews.slice(0, 20));
  const ratingDelta = avg(last30) - avg(prev30);
  const reviewsDelta = prev30.length ? Math.round(((last30.length - prev30.length) / prev30.length) * 100) : 100;

  const answered = last30.filter((r) => r.status === "replied").length;
  const closable = last30.filter((r) => r.status !== "awaiting" || true).length || 1;
  const responseRate = Math.round((answered / closable) * 100);

  const pendingDrafts = reviews.filter((r) => r.drafts?.some((d) => d.status === "pending")).length;
  const awaiting = reviews.filter((r) => r.status === "awaiting").length;
  const urgent = reviews.filter((r) => {
    if (r.status !== "awaiting" && !(r.drafts?.some((d) => d.status === "pending") && r.stars <= 2)) return false;
    return now - new Date(r.createdAt).getTime() > 4 * 3600_000;
  }).length;

  // Real response-time KPI: median reply gap now vs the previous 30-day window
  const med = (arr: ReviewWithDrafts[]) => {
    const gaps = arr.filter((r) => r.repliedAt).map((r) => (new Date(r.repliedAt!).getTime() - new Date(r.createdAt).getTime()) / 60000).sort((a, b) => a - b);
    return gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null;
  };
  const respNow = med(last30);
  const respPrev = med(prev30);
  const responseDelta = respNow === null ? "—" : respPrev === null ? "new" : `${respNow <= respPrev ? "−" : "+"}${Math.abs(respNow - respPrev)} mins`;

  return {
    rating: Number(rating.toFixed(2)),
    ratingDelta: `${ratingDelta >= 0 ? "+" : ""}${ratingDelta.toFixed(2)}`,
    reviewsMonth: last30.length,
    reviewsDelta: `${reviewsDelta >= 0 ? "+" : ""}${reviewsDelta}%`,
    responseRate,
    responseDelta,
    responseMins: respNow,
    pending: pendingDrafts + awaiting,
    drafts: pendingDrafts,
    alerts: urgent,
  };
}

export function computeFunnel(reviews: (Review | ReviewWithDrafts)[], campaigns: { sent: number; opened: number; clicked: number }[]) {
  const d30 = Date.now() - 30 * 86400_000;
  const sent = campaigns.reduce((a, c) => a + c.sent, 0);
  const opened = campaigns.reduce((a, c) => a + c.opened, 0);
  const clicked = campaigns.reduce((a, c) => a + c.clicked, 0);
  const viaRequest = reviews.filter((r) => r.source === "request" && new Date(r.createdAt).getTime() >= d30).length;
  const pct = (n: number) => (sent ? Math.max(1, Math.round((n / sent) * 100)) : 0);
  return {
    funnel: [
      { stage: "Requests sent", value: sent, pct: 100 },
      { stage: "Opened / scanned", value: opened, pct: pct(opened) },
      { stage: "Tapped Rate us", value: clicked, pct: pct(clicked) },
      { stage: "Reviews posted (30d)", value: viaRequest, pct: pct(viaRequest) },
    ],
    stats: {
      sent, opened, generated: viaRequest,
      conversion: sent ? Number(((viaRequest / sent) * 100).toFixed(1)) : 0,
      openRate: sent ? Math.round((opened / sent) * 100) : 0,
    },
  };
}

export function healthScore(reviews: (Review | ReviewWithDrafts)[]): number {
  const d90 = Date.now() - 90 * 86400_000;
  const recent = reviews.filter((r) => new Date(r.createdAt).getTime() >= d90);
  if (!recent.length) return 80;
  const avg = recent.reduce((a, c) => a + c.stars, 0) / recent.length;
  const pos = recent.filter((r) => r.sentiment === "positive").length / recent.length;
  const answered = recent.filter((r) => r.status === "replied").length / recent.length;
  const freshness = Math.min(1, recent.length / 30);
  return Math.round((avg / 5) * 50 + pos * 20 + answered * 20 + freshness * 10);
}

export function medianResponseMins(reviews: (Review | ReviewWithDrafts)[]): number {
  const gaps = reviews
    .filter((r) => r.repliedAt)
    .map((r) => (new Date(r.repliedAt!).getTime() - new Date(r.createdAt).getTime()) / 60000)
    .sort((a, b) => a - b);
  if (!gaps.length) return 190;
  return Math.round(gaps[Math.floor(gaps.length / 2)]);
}
