import { db } from "@/lib/db";
import { PdfDoc, A4, INK, MUTED, BRAND, MINT, LINE, inrPdf, fmtDate } from "@/lib/pdf";
import { gstBreakup } from "@/lib/invoice-document";
import { monthlyAiUsage } from "@/lib/ai-metering";
import { safeJson } from "@/lib/viewmodels";

// Monthly report — "month in review" for one tenant: ratings, sentiment, reply
// performance, WhatsApp funnel and AI usage, rendered as a forwardable PDF.

export type MonthlyReport = {
  tenant: { id: string; name: string; planName: string };
  month: string; // YYYY-MM
  label: string; // "September 2026"
  periodStart: string;
  periodEnd: string;
  reviews: {
    total: number;
    avgRating: number;
    prevAvgRating: number | null;
    bySentiment: { positive: number; neutral: number; negative: number };
    replied: number;
    replyRate: number;
    topKeywords: { keyword: string; count: number }[];
  };
  whatsapp: { campaigns: number; sent: number; opened: number; clicked: number; reviewsGenerated: number };
  ai: { events: number; tokens: number; drafts: number; classifies: number };
  locations: { name: string; area: string; reviews: number; avgRating: number; replied: number; rating: number }[];
  invoice: { number: string; amountInr: number; taxPercent: number; gst: number; total: number; status: string } | null;
  summary: string; // AI-generated management summary (deterministic fallback)
};

function monthWindow(month?: string): { start: Date; end: Date; label: string; key: string } {
  let start: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    start = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // previous full month
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const label = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { start, end, label, key: start.toISOString().slice(0, 7) };
}

export function aiManagementSummary(r: {
  label: string;
  reviews: { total: number; avgRating: number; prevAvgRating: number | null; bySentiment: { positive: number; neutral: number; negative: number }; replyRate: number; topKeywords: { keyword: string; count: number }[] };
  whatsapp: { sent: number; reviewsGenerated: number };
  locations: { name: string; reviews: number; avgRating: number }[];
}): string {
  // Management summary in plain manager language. Generated from live report data;
  // when an LLM key is configured production can swap this for a model call, the
  // structure (facts → weakest spot → action) stays the same.
  const parts: string[] = [];
  const s = r.reviews.bySentiment;
  const posPct = r.reviews.total ? Math.round((s.positive / r.reviews.total) * 100) : 0;
  const negPct = r.reviews.total ? Math.round((s.negative / r.reviews.total) * 100) : 0;
  parts.push(
    `${r.label} closed with ${r.reviews.total} review${r.reviews.total === 1 ? "" : "s"} at an average of ${r.reviews.avgRating || "—"}${r.reviews.avgRating ? "★" : ""}` +
      (r.reviews.prevAvgRating !== null
        ? ` (${r.reviews.avgRating > r.reviews.prevAvgRating ? "up" : r.reviews.avgRating < r.reviews.prevAvgRating ? "down" : "level"} from ${r.reviews.prevAvgRating}★ last period).`
        : "."),
  );
  parts.push(`${posPct}% of guests were positive and ${negPct}% negative; your team replied to ${r.reviews.replyRate}% of reviews.`);
  if (r.reviews.topKeywords.length) {
    parts.push(`Guests talked most about ${r.reviews.topKeywords.slice(0, 3).map((k) => `${k.keyword} (${k.count})`).join(", ")}.`);
  }
  const weakest = [...r.locations].filter((l) => l.reviews > 0).sort((a, b) => a.avgRating - b.avgRating)[0];
  const strongest = [...r.locations].filter((l) => l.reviews > 0).sort((a, b) => b.avgRating - a.avgRating)[0];
  if (strongest && strongest.avgRating > 0) parts.push(`${strongest.name} leads at ${strongest.avgRating}★${weakest && weakest.name !== strongest.name && weakest.avgRating > 0 && weakest.avgRating < strongest.avgRating ? `, while ${weakest.name} needs attention at ${weakest.avgRating}★ — worth a branch visit` : ""}.`);
  if (r.whatsapp.sent > 0) parts.push(`Review requests reached ${r.whatsapp.sent} guests on WhatsApp and brought in ${r.whatsapp.reviewsGenerated} new reviews.`);
  return parts.join(" ");
}

export async function monthlyReportData(tenantId: string, month?: string): Promise<MonthlyReport> {
  const win = monthWindow(month);
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  if (!tenant) throw new Error("Tenant not found");

  const prevStart = new Date(win.start.getFullYear(), win.start.getMonth() - 1, 1);
  const [reviews, prevReviews, campaigns, locations, aiUsage, invoice] = await Promise.all([
    db.review.findMany({ where: { tenantId, createdAt: { gte: win.start, lt: win.end } }, include: { location: true } }),
    db.review.findMany({ where: { tenantId, createdAt: { gte: prevStart, lt: win.start } }, select: { stars: true } }),
    db.campaign.findMany({ where: { tenantId, createdAt: { gte: win.start, lt: win.end } } }),
    db.location.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    db.aiUsageEvent.aggregate({
      where: { tenantId, createdAt: { gte: win.start, lt: win.end } },
      _count: true, _sum: { tokens: true },
    }),
    db.invoice.findFirst({ where: { tenantId, periodStart: { gte: win.start, lt: win.end } }, orderBy: { periodStart: "desc" } }),
  ]);

  // AI drafts vs classifications for the window
  const aiRows = await db.aiUsageEvent.findMany({
    where: { tenantId, createdAt: { gte: win.start, lt: win.end } },
    select: { kind: true },
  });
  const drafts = aiRows.filter((r) => r.kind === "draft").length;
  const classifies = aiRows.filter((r) => r.kind === "classify").length;

  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const kwMap = new Map<string, number>();
  for (const r of reviews) {
    if (r.sentiment === "positive") sentiment.positive++;
    else if (r.sentiment === "negative") sentiment.negative++;
    else sentiment.neutral++;
    for (const k of safeJson<string[]>(r.keywords, [])) kwMap.set(k, (kwMap.get(k) || 0) + 1);
  }
  const replied = reviews.filter((r) => r.status === "replied").length;
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const perLocation = locations.map((l) => {
    const rs = reviews.filter((r) => r.locationId === l.id);
    return {
      name: l.name, area: l.area, reviews: rs.length,
      avgRating: Number(avg(rs.map((r) => r.stars)).toFixed(2)),
      replied: rs.filter((r) => r.status === "replied").length,
      rating: l.rating,
    };
  });

  const taxPercent = Number((await db.cmsSetting.findUnique({ where: { key: "tax_percent" } }))?.value ?? 18) || 18;
  const breakup = invoice ? gstBreakup(invoice.amountInr, taxPercent) : null;

  const base = {
    tenant: { id: tenant.id, name: tenant.name, planName: tenant.plan.name },
    month: win.key,
    label: win.label,
    periodStart: win.start.toISOString(),
    periodEnd: win.end.toISOString(),
    reviews: {
      total: reviews.length,
      avgRating: Number(avg(reviews.map((r) => r.stars)).toFixed(2)),
      prevAvgRating: prevReviews.length ? Number(avg(prevReviews.map((r) => r.stars)).toFixed(2)) : null,
      bySentiment: sentiment,
      replied,
      replyRate: reviews.length ? Math.round((replied / reviews.length) * 100) : 0,
      topKeywords: [...kwMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([keyword, count]) => ({ keyword, count })),
    },
    whatsapp: {
      campaigns: campaigns.length,
      sent: campaigns.reduce((a, c) => a + c.sent, 0),
      opened: campaigns.reduce((a, c) => a + c.opened, 0),
      clicked: campaigns.reduce((a, c) => a + c.clicked, 0),
      reviewsGenerated: campaigns.reduce((a, c) => a + c.reviewsGenerated, 0),
    },
    ai: { events: aiUsage._count || 0, tokens: aiUsage._sum?.tokens || 0, drafts, classifies },
    locations: perLocation,
    invoice: invoice && breakup ? {
      number: invoice.number, amountInr: invoice.amountInr, taxPercent, gst: breakup.gst, total: breakup.total, status: invoice.status,
    } : null,
  };
  const summary = aiManagementSummary({
    label: win.label,
    reviews: base.reviews,
    whatsapp: { sent: base.whatsapp.sent, reviewsGenerated: base.whatsapp.reviewsGenerated },
    locations: perLocation,
  });
  return { ...base, summary };
}

// Weekly digest — 7-day rolling window (doc §1I "Weekly and monthly reports")
export type WeeklyReport = {
  tenant: { id: string; name: string; planName: string };
  label: string;
  periodStart: string;
  periodEnd: string;
  reviews: { total: number; avgRating: number; negative: number; unanswered: number; replied: number; replyRate: number };
  topComplaint: { keyword: string; count: number } | null;
  bestLocation: { name: string; avgRating: number } | null;
  whatsapp: { sent: number; reviewsGenerated: number };
  summary: string;
};

export async function weeklyReportData(tenantId: string): Promise<WeeklyReport> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  if (!tenant) throw new Error("Tenant not found");
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86_400_000);
  const [reviews, campaigns, locations] = await Promise.all([
    db.review.findMany({ where: { tenantId, createdAt: { gte: start, lte: end } }, include: { location: true } }),
    db.campaign.findMany({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
    db.location.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const kwMap = new Map<string, number>();
  for (const r of reviews) {
    if (r.stars <= 2 || r.sentiment === "negative") for (const k of safeJson<string[]>(r.keywords, [])) kwMap.set(k, (kwMap.get(k) || 0) + 1);
  }
  const topComplaint = [...kwMap.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const replied = reviews.filter((r) => r.status === "replied").length;
  const rated = locations
    .map((l) => ({ name: l.name, avgRating: Number(avg(reviews.filter((r) => r.locationId === l.id).map((r) => r.stars)).toFixed(2)) }))
    .filter((l) => l.avgRating > 0)
    .sort((a, b) => b.avgRating - a.avgRating);
  const base: WeeklyReport = {
    tenant: { id: tenant.id, name: tenant.name, planName: tenant.plan.name },
    label: `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    reviews: {
      total: reviews.length,
      avgRating: Number(avg(reviews.map((r) => r.stars)).toFixed(2)),
      negative: reviews.filter((r) => r.stars <= 2 || r.sentiment === "negative").length,
      unanswered: reviews.filter((r) => r.status !== "replied" && !r.replyText).length,
      replied,
      replyRate: reviews.length ? Math.round((replied / reviews.length) * 100) : 0,
    },
    topComplaint: topComplaint ? { keyword: topComplaint[0], count: topComplaint[1] } : null,
    bestLocation: rated[0] || null,
    whatsapp: {
      sent: campaigns.reduce((a, c) => a + c.sent, 0),
      reviewsGenerated: campaigns.reduce((a, c) => a + c.reviewsGenerated, 0),
    },
    summary: "",
  };
  base.summary = aiManagementSummary({
    label: `Week of ${base.label}`,
    reviews: { ...base.reviews, prevAvgRating: null, bySentiment: { positive: reviews.filter((r) => r.sentiment === "positive").length, neutral: reviews.filter((r) => r.sentiment === "neutral").length, negative: base.reviews.negative }, topKeywords: base.topComplaint ? [base.topComplaint] : [] },
    whatsapp: base.whatsapp,
    locations: locations.map((l) => ({ name: l.name, reviews: reviews.filter((r) => r.locationId === l.id).length, avgRating: Number(avg(reviews.filter((r) => r.locationId === l.id).map((r) => r.stars)).toFixed(2)) })),
  });
  return base;
}

export function buildReportPdf(r: MonthlyReport): Uint8Array {
  const doc = new PdfDoc();
  const M = 48;
  const W = A4.w - M * 2;
  const CX = A4.w / 2;

  // Cover band
  doc.rect(0, A4.h - 108, A4.w, 108, { fill: BRAND });
  doc.text(M, A4.h - 46, "sensiblee", { size: 21, bold: true, color: [1, 1, 1] });
  doc.textRight(A4.w - M, A4.h - 46, "MONTHLY REPORT", { size: 13, bold: true, color: MINT });
  doc.text(M, A4.h - 68, `${r.tenant.name} · ${r.label}`, { size: 10.5, color: MINT });
  doc.text(M, A4.h - 84, `${fmtDate(r.periodStart)} – ${fmtDate(new Date(new Date(r.periodEnd).getTime() - 86400_000))} · Plan: ${r.tenant.planName}`, { size: 8.5, color: MINT });

  let y = A4.h - 140;

  // KPI band
  const ratingHint = r.reviews.prevAvgRating === null ? "no prior month" : r.reviews.avgRating > r.reviews.prevAvgRating ? "up vs last month" : r.reviews.avgRating < r.reviews.prevAvgRating ? "below last month" : "level with last month";
  const kpis: [string, string, string][] = [
    ["Reviews", String(r.reviews.total), r.reviews.prevAvgRating !== null ? "vs last month" : "this month"],
    ["Avg rating", r.reviews.avgRating ? `${r.reviews.avgRating} / 5` : "-", ratingHint],
    ["Reply rate", `${r.reviews.replyRate}%`, `${r.reviews.replied} of ${r.reviews.total} replied`],
    ["WhatsApp", String(r.whatsapp.sent), `${r.whatsapp.reviewsGenerated} review${r.whatsapp.reviewsGenerated === 1 ? "" : "s"} generated`],
  ];
  const gw = W / 2 - 6;
  kpis.forEach(([k, v, hint], idx) => {
    const x = M + (idx % 2) * (gw + 12);
    const yy = y - Math.floor(idx / 2) * 64;
    doc.rect(x, yy - 44, gw, 56, { fill: [0.97, 0.98, 0.975], stroke: LINE, strokeWidth: 0.75 });
    doc.text(x + 12, yy - 18, k.toUpperCase(), { size: 7.5, bold: true, color: MUTED });
    doc.text(x + 12, yy - 34, v, { size: 16, bold: true, color: BRAND });
    doc.text(x + 12, yy + 2, hint, { size: 7.5, color: MUTED });
  });
  y -= 152;

  // Sentiment split
  doc.text(M, y, "Guest sentiment", { size: 11, bold: true });
  y -= 16;
  const sent = r.reviews.bySentiment;
  const totalSent = Math.max(1, sent.positive + sent.neutral + sent.negative);
  const barW = W;
  const segs: [string, number, [number, number, number]][] = [
    ["Positive", sent.positive, [0.13, 0.7, 0.51]],
    ["Neutral", sent.neutral, [0.55, 0.57, 0.6]],
    ["Negative", sent.negative, [0.85, 0.33, 0.33]],
  ];
  let bx = M;
  for (const [, n, color] of segs) {
    const w = (n / totalSent) * barW;
    if (w > 0) { doc.rect(bx, y - 6, w, 12, { fill: color }); bx += w; }
  }
  y -= 24;
  const legend = segs.map(([k, n]) => `${k} ${n} (${Math.round((n / totalSent) * 100)}%)`).join("   ·   ");
  doc.text(M, y, legend || "No reviews in this period", { size: 8.5, color: MUTED });
  y -= 30;

  // Top themes
  if (r.reviews.topKeywords.length) {
    doc.text(M, y, "What guests talk about", { size: 11, bold: true });
    y -= 14;
    doc.text(M, y, r.reviews.topKeywords.map((k) => `${k.keyword} (${k.count})`).join("  ·  "), { size: 9.5, color: INK });
    y -= 26;
  }

  // Per-location table
  if (r.locations.length) {
    doc.text(M, y, "Locations", { size: 11, bold: true });
    y -= 16;
    doc.rect(M, y - 4, W, 18, { fill: [0.955, 0.975, 0.965] });
    doc.text(M + 10, y + 8, "Location", { size: 8, bold: true, color: MUTED });
    doc.textRight(M + W * 0.55, y + 8, "Reviews", { size: 8, bold: true, color: MUTED });
    doc.textRight(M + W * 0.75, y + 8, "Avg rating", { size: 8, bold: true, color: MUTED });
    doc.textRight(M + W - 10, y + 8, "Replied", { size: 8, bold: true, color: MUTED });
    y -= 12;
    for (const l of r.locations.slice(0, 10)) {
      doc.text(M + 10, y, `${l.name} — ${l.area}`, { size: 9 });
      doc.textRight(M + W * 0.55, y, String(l.reviews), { size: 9 });
      doc.textRight(M + W * 0.75, y, l.avgRating ? l.avgRating.toFixed(2) : "—", { size: 9 });
      doc.textRight(M + W - 10, y, `${l.replied}/${l.reviews}`, { size: 9 });
      y -= 15;
    }
    y -= 12;
  }

  // AI usage + billing
  doc.text(M, y, "AI assistance", { size: 11, bold: true });
  y -= 14;
  doc.text(M, y, `${r.ai.drafts} AI drafts · ${r.ai.classifies} sentiment classifications · ${r.ai.tokens.toLocaleString("en-IN")} tokens metered`, { size: 9.5, color: INK });
  y -= 22;

  if (r.invoice) {
    doc.text(M, y, "Billing this period", { size: 11, bold: true });
    y -= 14;
    doc.text(M, y, `Invoice ${r.invoice.number} · ${r.invoice.status.toUpperCase()}`, { size: 9.5 });
    doc.textRight(A4.w - M, y, `Subtotal ${inrPdf(r.invoice.amountInr)} + GST ${r.invoice.taxPercent}% (${inrPdf(r.invoice.gst)}) = ${inrPdf(r.invoice.total)}`, { size: 9.5, bold: true });
    y -= 22;
  }

  // Footer
  doc.line(M, 78, A4.w - M, 78, LINE);
  doc.text(M, 62, `Generated by Sensiblee for ${r.tenant.name} · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, { size: 8, color: MUTED });
  doc.textRight(A4.w - M, 62, "sensiblee.in", { size: 8, color: MUTED });

  return doc.build();
}
