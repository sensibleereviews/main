// Reputation Health Score engine — the product's North Star metric.
//
// Implements the scoring model from "Product Design - final.docx":
//   §2 (Section 1) weighted dimensions: Rating trend 25 · Review velocity 20 ·
//   Recent sentiment 20 · Negative-review rate 15 · Response rate 10 ·
//   Response speed 5 · Location consistency 5
//   §"Our Health Score should become the company's North Star" (Section 2):
//   bands 84–100 Excellent 🟢 · 70–83 Healthy 🟡 · 50–69 At Risk 🟠 · <50 Critical 🔴
//   and score explanations ("Score dropped 8 points because: …").
//
// Task 48 ships the v1 weight set; Task 49 (REFINED VERSION) switches to the
// North-Star weight set via HEALTH_WEIGHTS_V2 — both live here so the API/UI
// stay stable across the two rollouts.
import type { Review, Location, AiDraft } from "@prisma/client";

export type HealthReview = Review & { drafts: AiDraft[]; location: Location };

export type HealthBand = "excellent" | "healthy" | "at-risk" | "critical";

export type HealthDimension = {
  key: string;
  label: string;
  max: number;
  earned: number; // rounded to 1 decimal
  observed: string; // human-readable measurement behind the points
};

export type HealthLocationScore = {
  id: string;
  name: string;
  area: string;
  score: number;
  band: HealthBand;
  delta: number; // vs previous 30d window
  reviews30: number;
  rating30: number;
  responseRate: number;
};

export type HealthScore = {
  score: number; // 0..100
  band: HealthBand;
  delta: number;
  rating30: number;
  reviews30: number;
  responseRate: number;
  dimensions: HealthDimension[];
  locations: HealthLocationScore[];
  explanations: string[]; // "why" — biggest point losses first
  insufficientData: boolean; // true when the 30d window is below the configured minimum
  dataNote: string | null; // human-readable explanation of missing inputs
};

// ---- weight sets -----------------------------------------------------------
// v1: Section 1 "Reputation Health =" list. v2: Section 2 "North Star" list.
// Unused dimensions are 0 so both share one type (TS-safe access).
export type HealthWeights = {
  ratingQuality: number;
  ratingTrend: number;
  velocity: number;
  sentiment: number;
  negativeRate: number;
  responseRate: number;
  responseSpeed: number;
  complaintTrends: number;
  responsePerformance: number;
  locationConsistency: number;
};

export const HEALTH_WEIGHTS_V1: HealthWeights = {
  ratingQuality: 0,
  ratingTrend: 25,
  velocity: 20,
  sentiment: 20,
  negativeRate: 15,
  responseRate: 10,
  responseSpeed: 5,
  complaintTrends: 0,
  responsePerformance: 0,
  locationConsistency: 5,
};

export const HEALTH_WEIGHTS_V2: HealthWeights = {
  ratingQuality: 20,
  ratingTrend: 15,
  velocity: 15,
  sentiment: 15,
  negativeRate: 0,
  responseRate: 0,
  responseSpeed: 0,
  complaintTrends: 15,
  responsePerformance: 10,
  locationConsistency: 10,
};

export const DAY = 86_400_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export function bandFor(score: number): HealthBand {
  if (score >= 84) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "at-risk";
  return "critical";
}

export const BAND_META: Record<HealthBand, { label: string; dot: string; text: string; ring: string; bg: string }> = {
  excellent: { label: "Excellent", dot: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-500/30", bg: "bg-emerald-50" },
  healthy: { label: "Healthy", dot: "bg-amber-400", text: "text-amber-600", ring: "ring-amber-400/30", bg: "bg-amber-50" },
  "at-risk": { label: "At Risk", dot: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-500/30", bg: "bg-orange-50" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-600", ring: "ring-red-500/30", bg: "bg-red-50" },
};

// ---- issue categories (doc §5 top negative themes / §6 issues) -------------
export const CATEGORY_LABELS: Record<string, string> = {
  waiting: "Waiting time",
  staff: "Staff behaviour",
  order: "Order & delivery",
  billing: "Billing",
  cleanliness: "Cleanliness",
  other: "Other",
};

const CATEGORY_RULES: [RegExp, string][] = [
  [/wait|reserv|counter|queue|delay|slow/i, "waiting"],
  [/staff|service|courtesy|manager|rude|behavio/i, "staff"],
  [/order|deliver|missing|packag|mixup|mix-up|cold/i, "order"],
  [/bill|charg|price|overpric|refund/i, "billing"],
  [/clean|hygiene|dirty|pest|smell/i, "cleanliness"],
];

export function categoryForKeywords(keywords: string[], text: string): string {
  const joined = `${keywords.join(" ")} ${text}`;
  for (const [re, cat] of CATEGORY_RULES) if (re.test(joined)) return cat;
  return "other";
}

// ---- staff mention extraction (coaching intelligence, not surveillance) ----
const STAFF_NAMES = [
  "Amit", "Priya", "Rahul", "Vikram", "Sneha", "Arjun", "Anand", "Meera", "Rohit",
  "Lakshmi", "Manoj", "Kavya", "Deepak", "Pooja", "Rajesh", "Sunil", "Anita", "Farah",
];

export function staffMentions(reviews: HealthReview[], limit = 5): { name: string; mentions: number; positive: number; negative: number; avgSentiment: number }[] {
  const map = new Map<string, { mentions: number; stars: number[]; positive: number; negative: number }>();
  for (const r of reviews) {
    const haystack = `${r.text} ${safeKws(r.keywords).join(" ")}`;
    for (const name of STAFF_NAMES) {
      if (new RegExp(`\\b${name}\\b`).test(haystack)) {
        const e = map.get(name) || { mentions: 0, stars: [], positive: 0, negative: 0 };
        e.mentions += 1;
        e.stars.push(r.stars);
        if (r.stars >= 4) e.positive += 1;
        if (r.stars <= 2) e.negative += 1;
        map.set(name, e);
      }
    }
  }
  return [...map.entries()]
    .map(([name, e]) => ({ name, mentions: e.mentions, positive: e.positive, negative: e.negative, avgSentiment: e.stars.length ? r1(e.stars.reduce((a, c) => a + c, 0) / e.stars.length) : 0 }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, limit);
}

export function safeKws(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// ---- Reputation Alert spec (Part 2 doc: alert card fields) -----------------
// "Most affected: 6–9 PM" — peak hour bucket across a review set
export function peakWindowLabel(reviews: HealthReview[]): string | null {
  const hours = reviews
    .map((r) => new Date(r.createdAt).getHours())
    .filter((h) => Number.isFinite(h));
  if (hours.length < 3) return null;
  // 2-hour buckets, find the densest start hour (0..22)
  const buckets = new Array(24).fill(0);
  for (const h of hours) buckets[h] += 1;
  let best = 0, bestCount = -1;
  for (let start = 0; start < 24; start++) {
    const c = buckets[start] + buckets[(start + 1) % 24];
    if (c > bestCount) { bestCount = c; best = start; }
  }
  if (bestCount < Math.max(3, Math.ceil(hours.length * 0.4))) return null;
  const fmt = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);
  return `${fmt(best % 24)}–${fmt((best + 2) % 24)}`;
}

// "Revenue risk: High" — issue momentum × negative concentration heuristic
export function revenueRiskFor(mentions: number, trendPct: number, shareOfComplaints: number): "high" | "medium" | "low" {
  if (trendPct >= 40 && (mentions >= 8 || shareOfComplaints >= 30)) return "high";
  if (trendPct >= 20 || mentions >= 5 || shareOfComplaints >= 25) return "medium";
  return "low";
}

export const REVENUE_RISK_META: Record<"high" | "medium" | "low", { label: string; cls: string }> = {
  high: { label: "Revenue risk: High", cls: "bg-red-50 text-red-600 ring-red-200" },
  medium: { label: "Revenue risk: Medium", cls: "bg-amber-soft text-amber-deep ring-amber-200" },
  low: { label: "Revenue risk: Low", cls: "bg-mint-soft text-mint-deep ring-mint/40" },
};

// ---- negative theme clusters (doc §5 "Top negative themes") ----------------
export function topNegativeThemes(reviews: HealthReview[], days = 60): { category: string; label: string; count: number; share: number }[] {
  const cutoff = Date.now() - days * DAY;
  const neg = reviews.filter((r) => r.stars <= 2 || r.sentiment === "negative");
  const inWindow = neg.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  const pool = inWindow.length ? inWindow : neg;
  if (!pool.length) return [];
  const counts = new Map<string, number>();
  for (const r of pool) {
    const cat = categoryForKeywords(safeKws(r.keywords), r.text);
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const total = pool.length;
  return [...counts.entries()]
    .map(([category, count]) => ({ category, label: CATEGORY_LABELS[category] || category, count, share: Math.round((count / total) * 100) }))
    .sort((a, b) => b.share - a.share);
}

// ---- the engine ------------------------------------------------------------
type WindowStats = {
  count: number;
  avgRating: number;
  positiveShare: number;
  negativeShare: number;
  repliedShare: number;
  avgReplyMins: number | null;
};

function windowStats(reviews: HealthReview[], from: number, to: number): WindowStats {
  const win = reviews.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= from && t < to;
  });
  const n = win.length;
  const replied = win.filter((r) => r.status === "replied" || !!r.replyText || r.repliedAt);
  const replyMins = replied
    .map((r) => (r.repliedAt ? (new Date(r.repliedAt).getTime() - new Date(r.createdAt).getTime()) / 60_000 : null))
    .filter((v): v is number => v !== null && v >= 0);
  return {
    count: n,
    avgRating: n ? win.reduce((a, c) => a + c.stars, 0) / n : 0,
    positiveShare: n ? win.filter((r) => r.sentiment === "positive").length / n : 0,
    negativeShare: n ? win.filter((r) => r.sentiment === "negative" || r.stars <= 2).length / n : 0,
    repliedShare: n ? replied.length / n : 0,
    avgReplyMins: replyMins.length ? replyMins.reduce((a, c) => a + c, 0) / replyMins.length : null,
  };
}

function speedPoints(mins: number | null, max: number): number {
  if (mins === null) return max * 0.3; // unmeasured — gentle floor
  if (mins <= 60) return max;
  if (mins <= 240) return max * 0.8;
  if (mins <= 24 * 60) return max * 0.6;
  if (mins <= 72 * 60) return max * 0.35;
  return max * 0.15;
}

/**
 * Compute the Reputation Health Score.
 * @param version "v1" (Section 1 weights, Task 48) | "v2" (North-Star weights, Task 49)
 * @param refDate stats window anchor (defaults to now; shift back for deltas)
 * @param opts.minReviews — flag insufficient data below this review count (0 disables)
 * @param opts.weightsOverride — admin-configured weights (Reputation controls)
 */
export function computeHealthScore(
  reviews: HealthReview[],
  locations: Location[],
  version: "v1" | "v2" = "v1",
  refDate: Date = new Date(),
  opts: { minReviews?: number; weightsOverride?: HealthWeights | null } = {}
): HealthScore {
  const now = refDate.getTime();
  const W: HealthWeights =
    opts.weightsOverride && Object.keys(opts.weightsOverride).length
      ? { ...(version === "v2" ? HEALTH_WEIGHTS_V2 : HEALTH_WEIGHTS_V1), ...opts.weightsOverride }
      : version === "v2"
        ? HEALTH_WEIGHTS_V2
        : HEALTH_WEIGHTS_V1;
  const cur = windowStats(reviews, now - 30 * DAY, now + DAY);
  const prev = windowStats(reviews, now - 60 * DAY, now - 30 * DAY);

  // Insufficient / missing data flag (admin-configurable minimum, doc §C "Flag insufficient or missing data")
  const minReviews = opts.minReviews ?? 0;
  const missingLocations = locations.length === 0;
  const insufficientData = minReviews > 0 && (cur.count < minReviews || missingLocations);
  const dataNote = missingLocations
    ? "No Google locations connected yet — connect a profile to start scoring."
    : insufficientData && cur.count < minReviews
      ? `Only ${cur.count} reviews in the last 30 days (minimum ${minReviews}) — score is directional until more feedback arrives.`
      : null;

  const dims: HealthDimension[] = [];
  const explanations: string[] = [];

  const push = (key: string, label: string, max: number, earned: number, observed: string, lossNote?: string) => {
    dims.push({ key, label, max, earned: r1(clamp(earned, 0, max)), observed });
    if (lossNote && earned < max * 0.7) explanations.push(lossNote);
  };

  // Rating quality (v2) / folded into trend for v1
  if (version === "v2") {
    const pts = clamp(((cur.avgRating || 0) / 5) * W.ratingQuality, 0, W.ratingQuality);
    push(
      "ratingQuality",
      "Rating quality",
      W.ratingQuality,
      pts,
      `${r1(cur.avgRating || 0)} ★ average across ${cur.count} recent reviews`,
      cur.avgRating < 4.3 ? `Average rating is ${r1(cur.avgRating || 0)} ★ — below the 4.3 target, costing ${r1(W.ratingQuality - pts)} of ${W.ratingQuality} pts` : undefined
    );
  }

  // Rating trend
  const trendDelta = prev.count && cur.count ? cur.avgRating - prev.avgRating : 0;
  if (version === "v2") {
    const pts = clamp(7.5 + trendDelta * 15, 0, W.ratingTrend);
    push(
      "ratingTrend",
      "Rating trend",
      W.ratingTrend,
      pts,
      `${trendDelta >= 0 ? "+" : ""}${r1(trendDelta)} ★ vs previous month`,
      trendDelta < -0.05 ? `Rating fell ${r1(Math.abs(trendDelta))} ★ month-over-month → −${r1(W.ratingTrend - pts)} pts` : undefined
    );
  } else {
    const pts = clamp(12.5 + trendDelta * 25, 0, W.ratingTrend);
    push(
      "ratingTrend",
      "Rating trend",
      W.ratingTrend,
      pts,
      `${trendDelta >= 0 ? "+" : ""}${r1(trendDelta)} ★ vs previous 30 days`,
      trendDelta < -0.05 ? `Rating slipped ${r1(Math.abs(trendDelta))} ★ vs last month → −${r1(W.ratingTrend - pts)} of ${W.ratingTrend} pts` : undefined
    );
  }

  // Review velocity
  const growth = prev.count ? (cur.count - prev.count) / prev.count : cur.count > 0 ? 0.5 : 0;
  const velPts = clamp(10 + growth * 20, 0, W.velocity);
  push(
    "velocity",
    "Review velocity",
    W.velocity,
    velPts,
    `${cur.count} new reviews (prev 30d: ${prev.count}) · ${growth >= 0 ? "+" : ""}${Math.round(growth * 100)}%`,
    growth < -0.15 ? `Review volume dropped ${Math.round(Math.abs(growth) * 100)}% — −${r1(W.velocity - velPts)} pts (requests not converting?)` : undefined
  );

  // Sentiment
  const sentPts = cur.positiveShare * W.sentiment;
  push(
    "sentiment",
    version === "v2" ? "Sentiment" : "Recent sentiment",
    W.sentiment,
    sentPts,
    `${Math.round(cur.positiveShare * 100)}% of recent reviews read positive`,
    cur.positiveShare < 0.6 ? `Only ${Math.round(cur.positiveShare * 100)}% positive sentiment → −${r1(W.sentiment - sentPts)} pts` : undefined
  );

  // Negative-review rate (v1) / Customer complaint trends (v2)
  if (version === "v2") {
    const negGrowth = prev.negativeShare ? (cur.negativeShare - prev.negativeShare) / prev.negativeShare : 0;
    const basePts = (1 - cur.negativeShare) * (W.complaintTrends * 0.6);
    const trendPts = negGrowth <= 0 ? W.complaintTrends * 0.4 : W.complaintTrends * 0.4 * clamp(1 - negGrowth, 0, 1);
    const pts = basePts + trendPts;
    push(
      "complaintTrends",
      "Customer complaint trends",
      W.complaintTrends,
      pts,
      `${Math.round(cur.negativeShare * 100)}% complaint rate (${negGrowth >= 0 ? "+" : ""}${Math.round(negGrowth * 100)}% vs prev)`,
      negGrowth > 0.1 ? `Complaints up ${Math.round(negGrowth * 100)}% vs last month → −${r1(W.complaintTrends - pts)} pts` : undefined
    );
  } else {
    const pts = (1 - cur.negativeShare) * W.negativeRate;
    push(
      "negativeRate",
      "Negative-review rate",
      W.negativeRate,
      pts,
      `${Math.round(cur.negativeShare * 100)}% of recent reviews are 1–2 ★`,
      cur.negativeShare > 0.2 ? `${Math.round(cur.negativeShare * 100)}% negative rate → −${r1(W.negativeRate - pts)} of ${W.negativeRate} pts` : undefined
    );
  }

  // Response performance (v2 merges rate+speed) / separate in v1
  if (version === "v2") {
    const ratePts = cur.repliedShare * (W.responsePerformance * 0.7);
    const spdPts = speedPoints(cur.avgReplyMins, W.responsePerformance * 0.3);
    const pts = ratePts + spdPts;
    push(
      "responsePerformance",
      "Response performance",
      W.responsePerformance,
      pts,
      `${Math.round(cur.repliedShare * 100)}% replied${cur.avgReplyMins !== null ? ` · ~${Math.round(cur.avgReplyMins / 60)}h median` : ""}`,
      cur.repliedShare < 0.9 ? `Response rate ${Math.round(cur.repliedShare * 100)}% (goal 90%) → −${r1(W.responsePerformance - pts)} pts` : undefined
    );
  } else {
    const pts = cur.repliedShare * W.responseRate;
    push(
      "responseRate",
      "Response rate",
      W.responseRate,
      pts,
      `${Math.round(cur.repliedShare * 100)}% of recent reviews answered`,
      cur.repliedShare < 0.9 ? `Response rate ${Math.round(cur.repliedShare * 100)}% — below 90% goal → −${r1(W.responseRate - pts)} pts` : undefined
    );
    const spd = speedPoints(cur.avgReplyMins, W.responseSpeed);
    push(
      "responseSpeed",
      "Response speed",
      W.responseSpeed,
      spd,
      cur.avgReplyMins !== null ? `~${Math.round(cur.avgReplyMins / 60)}h average first reply` : "No replies measured yet",
      cur.avgReplyMins !== null && cur.avgReplyMins > 24 * 60 ? `Replies average ${Math.round(cur.avgReplyMins / 60)}h — slow replies cost ${r1(W.responseSpeed - spd)} pts` : undefined
    );
  }

  // Location consistency (spread across branches)
  const perLoc = locations.map((l) => {
    const rs = reviews.filter((r) => r.locationId === l.id);
    const locCur = windowStats(rs, now - 30 * DAY, now + DAY);
    const locPrev = windowStats(rs, now - 60 * DAY, now - 30 * DAY);
    const locTrend = locPrev.count && locCur.count ? locCur.avgRating - locPrev.avgRating : 0;
    const dimsLoc: number[] = [];
    if (version === "v2") {
      dimsLoc.push(clamp(((locCur.avgRating || 0) / 5) * W.ratingQuality, 0, W.ratingQuality));
      dimsLoc.push(clamp(7.5 + locTrend * 15, 0, W.ratingTrend));
      dimsLoc.push(clamp(10 + (locPrev.count ? (locCur.count - locPrev.count) / locPrev.count : locCur.count ? 0.5 : 0) * 20, 0, W.velocity) * (W.velocity / 20));
      dimsLoc.push(locCur.positiveShare * W.sentiment);
      const ng = locPrev.negativeShare ? (locCur.negativeShare - locPrev.negativeShare) / locPrev.negativeShare : 0;
      dimsLoc.push((1 - locCur.negativeShare) * (W.complaintTrends * 0.6) + (ng <= 0 ? W.complaintTrends * 0.4 : W.complaintTrends * 0.4 * clamp(1 - ng, 0, 1)));
      dimsLoc.push(locCur.repliedShare * (W.responsePerformance * 0.7) + speedPoints(locCur.avgReplyMins, W.responsePerformance * 0.3));
    } else {
      dimsLoc.push(clamp(12.5 + locTrend * 25, 0, W.ratingTrend));
      dimsLoc.push(clamp(10 + (locPrev.count ? (locCur.count - locPrev.count) / locPrev.count : locCur.count ? 0.5 : 0) * 20, 0, W.velocity));
      dimsLoc.push(locCur.positiveShare * W.sentiment);
      dimsLoc.push((1 - locCur.negativeShare) * W.negativeRate);
      dimsLoc.push(locCur.repliedShare * W.responseRate);
      dimsLoc.push(speedPoints(locCur.avgReplyMins, W.responseSpeed));
    }
    const score = clamp(dimsLoc.reduce((a, c) => a + c, 0), 0, 100 - W.locationConsistency);
    const prevScore = score; // per-location historical delta approximated by rating trend direction
    void prevScore;
    return {
      id: l.id,
      name: l.name,
      area: l.area,
      score: Math.round(score),
      band: bandFor(score),
      delta: Number((locTrend * 10).toFixed(1)), // scaled proxy for month delta
      reviews30: locCur.count,
      rating30: r1(locCur.avgRating || 0),
      responseRate: Math.round(locCur.repliedShare * 100),
    } satisfies HealthLocationScore;
  });

  if (perLoc.length > 1) {
    const scores = perLoc.map((l) => l.score);
    const spread = Math.max(...scores) - Math.min(...scores);
    const consPts = spread <= 5 ? W.locationConsistency : spread <= 10 ? W.locationConsistency * 0.8 : spread <= 20 ? W.locationConsistency * 0.5 : W.locationConsistency * 0.2;
    push(
      "locationConsistency",
      "Location consistency",
      W.locationConsistency,
      consPts,
      `${spread}-pt spread across ${perLoc.length} branches`,
      spread > 10 ? `${spread}-pt gap between best and weakest branch → −${r1(W.locationConsistency - consPts)} pts` : undefined
    );
  } else {
    push("locationConsistency", "Location consistency", W.locationConsistency, W.locationConsistency, perLoc.length <= 1 ? "Single location — fully consistent" : "");
  }

  const raw = dims.reduce((a, d) => a + d.earned, 0);
  const score = Math.round(clamp(raw, 0, 100));

  // explanations: convert the biggest point losses into manager language
  explanations.sort((a, b) => b.length && a.length ? 0 : 0); // keep generation order (already severity-ordered)
  const topLosses = dims
    .filter((d) => d.max > 0 && d.earned < d.max * 0.7)
    .sort((a, b) => a.earned / a.max - b.earned / b.max)
    .slice(0, 3);
  for (const d of topLosses) {
    const lost = r1(d.max - d.earned);
    const line = `${d.label}: −${lost} pts — ${d.observed}`;
    if (!explanations.some((e) => e.startsWith(d.label))) explanations.unshift(line);
  }

  return {
    score,
    band: bandFor(score),
    delta: 0, // filled by caller via computeHealthDelta
    rating30: r1(cur.avgRating || 0),
    reviews30: cur.count,
    responseRate: Math.round(cur.repliedShare * 100),
    dimensions: dims,
    locations: perLoc.sort((a, b) => a.score - b.score), // weakest first
    explanations: explanations.slice(0, 4),
    insufficientData,
    dataNote,
  };
}

/** Overall score delta = current window vs previous window (shifted 30d). */
export function computeHealthDelta(
  reviews: HealthReview[],
  locations: Location[],
  version: "v1" | "v2" = "v1",
  opts: { minReviews?: number; weightsOverride?: HealthWeights | null } = {}
): { current: HealthScore; previous: HealthScore; delta: number } {
  const current = computeHealthScore(reviews, locations, version, new Date(), opts);
  const previous = computeHealthScore(reviews, locations, version, new Date(Date.now() - 30 * DAY), opts);
  return { current, previous, delta: current.score - previous.score };
}
