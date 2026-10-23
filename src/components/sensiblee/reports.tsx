// Client (tenant) Reports view — basic → advanced reporting gated by the
// subscription plan. Reports download as branded A4 PDFs via the print dialog
// (Save as PDF) — the same dependable path the GST invoices use.
//
// Plan tiers (server-enforced in /api/reports):
//   Starter (₹999)   → basic    : Reputation summary, Location performance
//   Growth (₹2,499)  → standard : + Sentiment & keywords, Campaign performance
//   Multi (₹4,999)   → advanced : + Staff performance, AI performance, Business review
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/lib/client";
import { cn, Download, FileText, Lock, Sparkles, TrendingUp } from "./deps";

type Tier = "basic" | "standard" | "advanced";

type ReportsPayload = {
  generatedAt: string;
  days: number;
  tenant: { name: string; category: string; plan: { id: string; name: string; tier: Tier } };
  kpis: { health: number; rating: number; ratingDelta: string; reviewsMonth: number; reviewsDelta: string; responseRate: number; responseDelta: string; pending: number; drafts: number; alerts: number; medianResponse: string };
  trend: { w: string; rating: number; volume: number }[];
  sentiment: { name: string; value: number; color: string }[];
  keywords: { word: string; count: number; sentiment: string }[];
  locations: { name: string; area: string; rating: number; delta: number; reviews: number; responseRate: number; avgResponse: string }[];
  staff: { name: string; score: number; mentions: number; trend: string }[];
  requests: {
    funnel: { stage: string; value: number; pct: number }[];
    stats: { sent: number; opened: number; generated: number; conversion: number; openRate: number };
    byChannel: { channel: string; sent: number; opened: number; reviews: number }[];
    campaigns: { name: string; channel: string; status: string; sent: number; opened: number; clicked: number; reviews: number; date: string }[];
  };
  ai: { drafts: number; approved: number; approvalRate: number; avgConfidence: number; tokens: number; estCostInr: number; quota: string; repliesPosted: number; pending: number };
};

type ReportKind = "reputation-summary" | "location-performance" | "sentiment-keywords" | "campaign-performance" | "staff-performance" | "ai-performance" | "business-review";

const CATALOG: { kind: ReportKind; tier: Tier; tierLabel: string; title: string; desc: string; includes: string[] }[] = [
  {
    kind: "reputation-summary", tier: "basic", tierLabel: "Basic",
    title: "Reputation Summary",
    desc: "The one-page health check of your online reputation.",
    includes: ["Health score & rating trend", "Review volume & response rate", "Sentiment split", "Location scoreboard"],
  },
  {
    kind: "location-performance", tier: "basic", tierLabel: "Basic",
    title: "Location Performance",
    desc: "Branch-by-branch comparison for owners and area managers.",
    includes: ["Rating & delta per location", "Review volume & response rate", "Average response time", "Attention flags"],
  },
  {
    kind: "sentiment-keywords", tier: "standard", tierLabel: "Standard",
    title: "Sentiment & Keywords",
    desc: "What guests praise and complain about, ranked by mentions.",
    includes: ["Sentiment distribution", "Top positive themes", "Pain-point radar", "Mention counts per keyword"],
  },
  {
    kind: "campaign-performance", tier: "standard", tierLabel: "Standard",
    title: "Campaign Performance",
    desc: "How review requests convert — channel by channel.",
    includes: ["Request funnel", "Open & conversion rates", "Channel mix (email / QR)", "Per-campaign results"],
  },
  {
    kind: "staff-performance", tier: "advanced", tierLabel: "Advanced",
    title: "Staff & Service Performance",
    desc: "Service scores from guest mentions, ready for appraisals.",
    includes: ["Staff service scores", "Mention volume & trend", "Recognition candidates", "Coaching flags"],
  },
  {
    kind: "ai-performance", tier: "advanced", tierLabel: "Advanced",
    title: "AI Performance & Usage",
    desc: "Metering and quality of the AI layer — transparency by design.",
    includes: ["Drafts & approval rate", "Average AI confidence", "Tokens & estimated cost", "Quota utilisation"],
  },
  {
    kind: "business-review", tier: "advanced", tierLabel: "Advanced",
    title: "Full Business Review",
    desc: "The executive pack — everything above in one board-ready document.",
    includes: ["Executive summary", "All Basic + Standard sections", "Staff & AI performance", "Recommended actions"],
  },
];

const TIER_RANK: Record<Tier, number> = { basic: 0, standard: 1, advanced: 2 };

export function ReportsView() {
  const [days, setDays] = useState<30 | 90>(30);
  const data = useApiData<ReportsPayload>(`/api/reports?days=${days}`);
  const d = data.data;
  const tier = d?.tenant.plan.tier ?? "basic";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Reports</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            Board-ready PDF reports — download, share or file them for reviews.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1">
          {([30, 90] as const).map((v) => (
            <button key={v} onClick={() => setDays(v)}
              className={cn("rounded-xl px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors", days === v ? "bg-brand text-white" : "text-neutral-500 hover:text-brand")}>
              Last {v} days
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-mint/40 bg-mint-soft/40 px-4 py-3">
        <Sparkles size={14} className="text-mint-deep" />
        <p className="text-[12.5px] font-semibold text-brand">
          {d ? `${d.tenant.plan.name} plan — ${tier === "advanced" ? "all Basic, Standard and Advanced" : tier === "standard" ? "Basic and Standard" : "Basic"} reports unlocked` : "Loading your plan…"}
        </p>
        <span className="text-[11.5px] text-neutral-400">Reports update live from your workspace data.</span>
      </div>

      {data.loading || !d ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATALOG.map((r) => {
            const unlocked = TIER_RANK[tier] >= TIER_RANK[r.tier];
            return (
              <div key={r.kind} className={cn("flex flex-col rounded-2xl border p-5 transition-all", unlocked ? "border-neutral-200/70 bg-white" : "border-dashed border-neutral-300 bg-surface/60")}>
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider",
                    r.tier === "basic" ? "bg-brand/5 text-brand" : r.tier === "standard" ? "bg-mint-soft text-mint-deep" : "bg-amber-soft text-amber-deep")}>
                    {r.tierLabel}
                  </span>
                  {!unlocked && <Lock size={13} className="text-neutral-400" />}
                </div>
                <p className="mt-3 flex items-center gap-2 text-[15px] font-bold text-brand">
                  <FileText size={15} className="text-mint-deep" /> {r.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{r.desc}</p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {r.includes.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-[12px] text-neutral-500">
                      <span className={cn("h-1.5 w-1.5 rounded-full", unlocked ? "bg-mint-deep" : "bg-neutral-300")} /> {i}
                    </li>
                  ))}
                </ul>
                {unlocked ? (
                  <Button size="sm" className="mt-4 h-9 w-full rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand-deep"
                    onClick={() => downloadReport(d, r.kind)}>
                    <Download size={13} className="mr-1.5" /> Download PDF
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="mt-4 h-9 w-full rounded-xl border-dashed text-[12.5px] text-neutral-400" disabled>
                    <Lock size={12} className="mr-1.5" /> {r.tier === "standard" ? "Growth" : "Scale"} plan
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------- PDF document builder ------------------------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function downloadReport(d: ReportsPayload, kind: ReportKind) {
  const meta = CATALOG.find((r) => r.kind === kind)!;
  const w = window.open("", "_blank", "width=980,height=1180");
  if (!w) return;
  w.document.write(reportHtml(d, kind, meta.title));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

function reportHtml(d: ReportsPayload, kind: ReportKind, title: string): string {
  const period = `Last ${d.days} days · ${new Date(Date.now() - d.days * 86400_000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  const sections = REPORT_SECTIONS[kind](d);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(d.tenant.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #f3f4f6; padding: 24px; font-size: 13px; }
  .sheet { max-width: 860px; margin: 0 auto; background: #fff; padding: 44px 48px; border-radius: 10px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #12203a; padding-bottom: 18px; }
  .brand { font-size: 25px; font-weight: 800; letter-spacing: -0.5px; color: #12203a; }
  .brand span { color: #3f9163; }
  .muted { color: #6b7280; font-size: 11.5px; line-height: 1.55; }
  .doc-title { font-size: 19px; font-weight: 800; color: #12203a; margin-top: 24px; }
  .doc-sub { color: #6b7280; font-size: 12px; margin-top: 3px; }
  .kpis { display: flex; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 130px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .kpi .v { font-size: 21px; font-weight: 800; color: #12203a; }
  .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 3px; }
  .kpi .d { font-size: 11px; color: #3f9163; font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.6px; color: #3f9163; margin: 30px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #12203a; color: #fff; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.8px; padding: 9px 12px; text-align: left; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #eef1f4; font-size: 12.5px; }
  tr:nth-child(even) td { background: #f8faf9; }
  .bars { display: flex; align-items: flex-end; gap: 7px; height: 120px; margin-top: 14px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
  .bar { width: 70%; background: #3f9163; border-radius: 4px 4px 0 0; }
  .bar-col .x { font-size: 9.5px; color: #9ca3af; margin-top: 5px; }
  .split { display: flex; height: 26px; border-radius: 999px; overflow: hidden; margin-top: 12px; }
  .split div { height: 100%; }
  .legend { display: flex; gap: 16px; margin-top: 9px; font-size: 11.5px; color: #6b7280; flex-wrap: wrap; }
  .legend b { color: #12203a; }
  .note { margin-top: 14px; border-left: 3px solid #3f9163; background: #f2f8f4; padding: 11px 14px; font-size: 12px; color: #374151; line-height: 1.6; }
  .foot { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10.5px; color: #9ca3af; line-height: 1.7; }
  @media print { body { background: #fff; padding: 0; } .sheet { border-radius: 0; padding: 24px 8px; } }
</style></head><body>
<div class="sheet">
  <div class="head">
    <div>
      <div class="brand">Sensiblee<span>.</span></div>
      <p class="muted">Reputation report · generated ${new Date(d.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
    </div>
    <div style="text-align:right">
      <p style="font-weight:800;color:#12203a;font-size:14px">${esc(d.tenant.name)}</p>
      <p class="muted">${esc(d.tenant.category)} · ${esc(d.tenant.plan.name)} plan</p>
    </div>
  </div>
  <p class="doc-title">${esc(title)}</p>
  <p class="doc-sub">${esc(period)}</p>
  ${sections}
  <div class="foot">
    Confidential — prepared by Sensiblee for ${esc(d.tenant.name)}. Data sourced from Google Business Profile APIs and in-platform activity.
    Questions? Write to hello@sensiblee.in — Sensiblee by Naqsh Digital Technologies, Bengaluru.
  </div>
</div>
</body></html>`;
}

function kpiStrip(items: { v: string; l: string; d?: string }[]): string {
  return `<div class="kpis">${items.map((i) => `<div class="kpi"><div class="l">${esc(i.l)}</div><div class="v">${esc(i.v)}</div>${i.d ? `<div class="d">${esc(i.d)}</div>` : ""}</div>`).join("")}</div>`;
}

function trendBars(trend: ReportsPayload["trend"]): string {
  const max = Math.max(...trend.map((t) => t.volume), 1);
  return `<div class="bars">${trend.map((t) => `<div class="bar-col"><div class="bar" style="height:${Math.max(6, Math.round((t.volume / max) * 100))}%"></div><span class="x">${esc(t.w)}</span></div>`).join("")}</div>
<p class="doc-sub" style="margin-top:6px">Weekly review volume · latest average rating ${[...trend].reverse().find((t) => t.volume > 0)?.rating ?? "—"}★</p>`;
}

function sentimentSplit(d: ReportsPayload): string {
  const total = Math.max(1, d.sentiment.reduce((a, s) => a + s.value, 0));
  return `<div class="split">${d.sentiment.map((s) => `<div style="width:${Math.round((s.value / total) * 100)}%;background:${s.color}"></div>`).join("")}</div>
<div class="legend">${d.sentiment.map((s) => `<span><b>${s.value}%</b> ${esc(s.name)}</span>`).join("")}</div>`;
}

function table(headers: string[], rows: (string | number)[][]): string {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

const REPORT_SECTIONS: Record<ReportKind, (d: ReportsPayload) => string> = {
  "reputation-summary": (d) => `
    ${kpiStrip([
      { v: `${d.kpis.health}/100`, l: "Health score" },
      { v: `${d.kpis.rating}★`, l: "Avg rating", d: d.kpis.ratingDelta },
      { v: String(d.kpis.reviewsMonth), l: "Reviews", d: d.kpis.reviewsDelta },
      { v: `${d.kpis.responseRate}%`, l: "Response rate" },
    ])}
    <h2>Review volume trend</h2>${trendBars(d.trend)}
    <h2>Sentiment</h2>${sentimentSplit(d)}
    <h2>Locations</h2>${table(["Location", "Rating", "Δ 30d", "Reviews", "Response rate"],
      d.locations.map((l) => [l.name, `${l.rating}★`, `${l.delta >= 0 ? "+" : ""}${l.delta}`, l.reviews, `${l.responseRate}%`]))}
    <div class="note">Response pace: median first reply ${esc(d.kpis.medianResponse)} · ${d.kpis.pending} items still awaiting action · ${d.kpis.alerts} urgent alerts.</div>`,

  "location-performance": (d) => `
    ${kpiStrip([
      { v: String(d.locations.length), l: "Locations" },
      { v: `${d.kpis.rating}★`, l: "Brand avg", d: d.kpis.ratingDelta },
      { v: String(d.kpis.reviewsMonth), l: "Reviews (30d)" },
      { v: `${d.kpis.responseRate}%`, l: "Response rate" },
    ])}
    <h2>Branch scoreboard</h2>${table(["Location", "Area", "Rating", "Δ", "Reviews", "Response %", "Avg response"],
      d.locations.map((l) => [l.name, l.area, `${l.rating}★`, `${l.delta >= 0 ? "+" : ""}${l.delta}`, l.reviews, `${l.responseRate}%`, l.avgResponse]))}
    <div class="note">Lowest performer gets attention first — bring every branch above ${Math.max(...d.locations.map((l) => l.rating), 0) - 0.3 || "4.0"}★ to lift the brand average.</div>`,

  "sentiment-keywords": (d) => `
    ${kpiStrip([
      { v: `${d.sentiment[0]?.value ?? 0}%`, l: "Positive" },
      { v: `${d.sentiment[1]?.value ?? 0}%`, l: "Neutral" },
      { v: `${d.sentiment[2]?.value ?? 0}%`, l: "Negative" },
      { v: String(d.keywords.length), l: "Themes tracked" },
    ])}
    <h2>Sentiment distribution</h2>${sentimentSplit(d)}
    <h2>Guest themes (mentions)</h2>${table(["Keyword", "Mentions", "Tone"],
      d.keywords.map((k) => [k.word, k.count, k.sentiment === "positive" ? "Praise" : k.sentiment === "negative" ? "Pain point" : "Neutral"]))}
    <div class="note">Top pain point: ${esc(d.keywords.find((k) => k.sentiment === "negative")?.word || "none in period")} — assign an owner and re-measure next cycle.</div>`,

  "campaign-performance": (d) => `
    ${kpiStrip([
      { v: d.requests.stats.sent.toLocaleString("en-IN"), l: "Requests sent" },
      { v: `${d.requests.stats.openRate}%`, l: "Open / scan rate" },
      { v: String(d.requests.stats.generated), l: "Reviews generated" },
      { v: `${d.requests.stats.conversion}%`, l: "Conversion" },
    ])}
    <h2>Request funnel</h2>${table(["Stage", "Guests", "% of sent"], d.requests.funnel.map((f) => [f.stage, f.value.toLocaleString("en-IN"), `${f.pct}%`]))}
    <h2>Channel mix</h2>${table(["Channel", "Sent", "Opened", "Reviews"], d.requests.byChannel.map((c) => [c.channel, c.sent.toLocaleString("en-IN"), c.opened.toLocaleString("en-IN"), c.reviews]))}
    <h2>Campaign results</h2>${table(["Campaign", "Channel", "Sent", "Opened", "Reviews", "Status"],
      d.requests.campaigns.slice(0, 8).map((c) => [c.name, c.channel, c.sent, c.opened, c.reviews, c.status]))}`,

  "staff-performance": (d) => `
    ${kpiStrip([
      { v: String(d.staff.length), l: "Team members tracked" },
      { v: d.staff.length ? `${Math.round(d.staff.reduce((a, s) => a + s.score, 0) / d.staff.length)}/100` : "—", l: "Avg service score" },
      { v: d.staff.length ? `${d.staff.reduce((a, s) => a + s.mentions, 0)}` : "0", l: "Guest mentions" },
      { v: `${d.kpis.responseRate}%`, l: "Response rate" },
    ])}
    <h2>Service scoreboard</h2>${table(["Team member", "Score", "Mentions", "Trend"],
      d.staff.map((s) => [s.name, `${s.score}/100`, s.mentions, s.trend.startsWith("-") ? `▼ ${s.trend.replace("-", "")}` : `▲ ${s.trend}`]))}
    <div class="note">Recognition candidate: ${esc(d.staff[0]?.name || "—")} — highest guest-mention score this period. Coaching flag: ${esc(d.staff[d.staff.length - 1]?.name || "—")}.</div>`,

  "ai-performance": (d) => `
    ${kpiStrip([
      { v: String(d.ai.drafts), l: "AI drafts", d: `${d.ai.quota} quota` },
      { v: `${d.ai.approvalRate}%`, l: "Approval rate" },
      { v: d.ai.avgConfidence ? `${Math.round(d.ai.avgConfidence * 100)}%` : "—", l: "Avg confidence" },
      { v: `${(d.ai.tokens / 1000).toFixed(1)}k`, l: "Tokens", d: `est. ${inr(d.ai.estCostInr)}` },
    ])}
    <h2>AI layer detail</h2>${table(["Metric", "Value"], [
      ["Drafts generated", d.ai.drafts],
      ["Approved & posted", d.ai.approved],
      ["Replies posted overall", d.ai.repliesPosted],
      ["Awaiting approval", d.ai.pending],
      ["Average confidence", d.ai.avgConfidence ? `${Math.round(d.ai.avgConfidence * 100)}%` : "—"],
      ["Tokens consumed", d.ai.tokens.toLocaleString("en-IN")],
      ["Estimated AI cost", inr(d.ai.estCostInr)],
      ["Plan quota", d.ai.quota],
    ])}
    <div class="note">Metering is transparent: cost estimated at ₹0.23 per 1,000 tokens. Drafts below your auto-approve threshold always wait for a human decision.</div>`,

  "business-review": (d) => `
    ${kpiStrip([
      { v: `${d.kpis.health}/100`, l: "Health score" },
      { v: `${d.kpis.rating}★`, l: "Avg rating", d: d.kpis.ratingDelta },
      { v: String(d.kpis.reviewsMonth), l: "Reviews", d: d.kpis.reviewsDelta },
      { v: `${d.requests.stats.conversion}%`, l: "Request conversion" },
    ])}
    <h2>Executive summary</h2>
    <div class="note">
      ${esc(d.tenant.name)} processed ${d.kpis.reviewsMonth} reviews in the last ${d.days} days at ${d.kpis.rating}★ average (Δ ${d.kpis.ratingDelta}).
      ${d.requests.stats.sent.toLocaleString("en-IN")} review requests were sent with a ${d.requests.stats.openRate}% open rate, generating ${d.requests.stats.generated} reviews.
      The AI layer drafted ${d.ai.drafts} replies (${d.ai.approvalRate}% approved); median first-reply time is ${esc(d.kpis.medianResponse)}.
      Recommended focus: ${esc(d.keywords.find((k) => k.sentiment === "negative")?.word || "service consistency")} — the most repeated pain point this period.
    </div>
    <h2>Rating & volume trend</h2>${trendBars(d.trend)}
    <h2>Sentiment</h2>${sentimentSplit(d)}
    <h2>Locations</h2>${table(["Location", "Rating", "Δ", "Reviews", "Response %"],
      d.locations.map((l) => [l.name, `${l.rating}★`, `${l.delta >= 0 ? "+" : ""}${l.delta}`, l.reviews, `${l.responseRate}%`]))}
    <h2>Guest themes</h2>${table(["Keyword", "Mentions", "Tone"],
      d.keywords.slice(0, 8).map((k) => [k.word, k.count, k.sentiment === "positive" ? "Praise" : k.sentiment === "negative" ? "Pain point" : "Neutral"]))}
    <h2>AI usage</h2>${table(["Metric", "Value"], [
      ["Drafts / approval rate", `${d.ai.drafts} · ${d.ai.approvalRate}%`],
      ["Tokens & est. cost", `${(d.ai.tokens / 1000).toFixed(1)}k · ${inr(d.ai.estCostInr)}`],
      ["Pending approvals", d.ai.pending],
    ])}`,
};
