// Sensiblee marketing pages — Features, How it works, Pricing
"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useApiData } from "@/lib/client";
import { useRouter } from "@/lib/router";
import { useCmsPage, useCmsFaqs } from "@/lib/cms-context";
import type { FeaturesContent, HowContent, PricingContent } from "@/lib/cms-defaults";
import { GoogleG, WhatsAppIcon, QrIcon, StarRating } from "./brand";
import { demoVideoHandler } from "./marketing-chrome";
import {
  cn, Check, Sparkles, ArrowRight, BarChart3, ShieldCheck, Zap, Clock,
  Bell, Link2, Rocket, Play, MapPin, Target, QrCode, Timer, CalendarDays,
  CheckCircle2, MessageSquareText, FileText, TrendingUp, Users,
} from "./deps";

type NavFn = (v: "home" | "features" | "how" | "pricing" | "about" | "contact" | "privacy" | "terms") => void;
type PageProps = { onNavigate: NavFn };

/* ------------------------------ Features ------------------------------ */

const MODULES = [
  {
    tag: "A" as const,
    name: "Reputation Command Center",
    headline: "Every review, sensed the moment it lands",
    icon: <GoogleG size={18} />,
    tint: "bg-surface",
    desc: "All your Google Business Profiles sync on a 15-minute cadence. Sentiment, keywords and urgency are scored on arrival, so a 2-star Saturday night never waits until Monday.",
    points: [
      "15-minute sync across every location",
      "Sentiment + keyword scoring on arrival",
      "Urgency alerts for negative reviews (WhatsApp + email)",
      "Reply SLA tracker — every review answered on time",
    ],
  },
  {
    tag: "B" as const,
    name: "Reputation Health",
    headline: "One North-Star score — score, trends, benchmarks",
    icon: <BarChart3 size={18} className="text-brand" />,
    tint: "bg-surface",
    desc: "Seven weighted dimensions — rating quality, rating trend, velocity, sentiment, response performance, complaint trends, location consistency — roll up into a single 0–100 score with the why built in.",
    points: [
      "0–100 score with Excellent / Healthy / At Risk / Critical bands",
      "Why-this-score breakdown — dimension losses, point by point",
      "Per-location scores with month-over-month deltas",
      "Reputation ROI — requests, conversion, rating lift, locations improved",
    ],
  },
  {
    tag: "C" as const,
    name: "AI Reputation Copilot",
    headline: "Replies, insights and recommendations — you stay in charge",
    icon: <Sparkles size={18} className="text-mint-deep" />,
    tint: "bg-amber-soft",
    desc: "Every review gets an on-brand draft within minutes — shaped by the review, rating, location, brand voice, language and business type. You approve, edit or regenerate. Nothing posts without a human click.",
    points: [
      "Drafts tuned to your brand voice and business type",
      "Insights and recommended actions, not just replies",
      "Confidence score on every suggestion",
      "Human approval required — always",
    ],
  },
  {
    tag: "D" as const,
    name: "Review Growth Engine",
    headline: "Happy guests become public proof",
    icon: <WhatsAppIcon size={18} className="text-mint-deep" />,
    tint: "bg-mint-soft",
    desc: "WhatsApp, table QR and transaction-triggered requests ask at exactly the right moment — after the compliment, before the bill is forgotten. Consent-first, template-approved, quality-safe.",
    points: [
      "WhatsApp bursts timed to your service rhythm",
      "Branded QR kits for tables, bills and takeaways",
      "Transaction-triggered asks — every guest gets the genuine Google link",
      "Open, scan and posted-review funnel tracking",
    ],
  },
  {
    tag: "E" as const,
    name: "Location Intelligence",
    headline: "From brand-level scores to branch-level truth",
    icon: <MapPin size={18} className="text-mint-deep" />,
    tint: "bg-mint-soft",
    desc: "Click any location to see its own Health Score, the negative themes dragging it down and the staff behind the mentions — coaching intelligence your managers can act on the same week.",
    points: [
      "Per-location Health Scores, weakest first",
      "Top problems per branch with complaint shares",
      "Most-mentioned staff — positive vs negative context",
      "Coaching intelligence — never public employee scores",
    ],
  },
  {
    tag: "F" as const,
    name: "Reputation Action Center",
    headline: "Detect → assign → fix → measure",
    icon: <Target size={18} className="text-brand" />,
    tint: "bg-amber-soft",
    desc: "When recurring complaints cluster — waiting times at one branch, billing at another — Sensiblee raises an issue with an owner, severity, peak window and recommended action, then shows the before-and-after.",
    points: [
      "Auto-detected issue clusters across locations",
      "Owner, severity and revenue-risk flag on every issue",
      "Recommended actions from proven playbooks",
      "Before/after impact — complaints down, score up",
    ],
  },
];

export function FeaturesPage({ onNavigate }: PageProps) {
  const c = useCmsPage<FeaturesContent>("features");
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
        <div className="mx-auto max-w-3xl px-5 pb-6 pt-14 text-center lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            {c.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[52px]">
            {c.title} <span className="text-mint-deep">{c.accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-neutral-500">
            {c.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-5 pb-8">
        {MODULES.map((m, i) => {
          const cm = c.modules[i] ?? { name: m.name, headline: m.headline, desc: m.desc, points: m.points };
          return (
          <div
            key={m.tag}
            className="grid items-center gap-6 overflow-hidden rounded-3xl border border-neutral-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:grid-cols-2 lg:p-8"
          >
            <div className={cn(i % 2 === 1 && "lg:order-2")}>
              <div className="flex items-center gap-3">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", m.tint)}>{m.icon}</span>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-neutral-400">Module {m.tag}</p>
                  <h2 className="text-[19px] font-bold leading-tight">{cm.name}</h2>
                </div>
              </div>
              <h3 className="mt-4 text-[19px] font-bold leading-snug">{cm.headline}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">{cm.desc}</p>
              <ul className="mt-4 grid grid-cols-1 gap-2">
                {cm.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[13px] text-neutral-600">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-mint-soft">
                      <Check size={11} className="text-mint-deep" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn("rounded-2xl border border-neutral-200/70 p-5", m.tint)}>
              <ModuleVisual tag={m.tag} />
            </div>
          </div>
          );
        })}
      </section>

      <CtaBand note="See all six modules running on live demo data." />
    </main>
  );
}

function ModuleVisual({ tag }: { tag: "A" | "B" | "C" | "D" | "E" | "F" }) {
  if (tag === "A")
    return (
      <div className="space-y-2.5">
        {[
          { n: "Ananya S.", s: 5, t: "Staff arranged a surprise dessert…", sent: "positive", time: "2h" },
          { n: "Rohit M.", s: 2, t: "Waited 40 minutes despite a reservation…", sent: "negative", time: "5h" },
          { n: "Priya N.", s: 4, t: "Great coastal flavors, authentic appam…", sent: "positive", time: "8h" },
        ].map((r) => (
          <div key={r.n} className="flex items-center gap-3 rounded-xl bg-white/90 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {r.n.slice(0, 1)}{r.n.split(" ")[1]?.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold">{r.n}</p>
                <StarRating value={r.s} size={10} />
              </div>
              <p className="truncate text-[11.5px] text-neutral-500">{r.t}</p>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              r.sent === "positive" ? "bg-mint-soft text-mint-deep" : "bg-red-50 text-red-600"
            )}>
              {r.sent}
            </span>
          </div>
        ))}
        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-medium text-neutral-500">
          <Clock size={12} /> Next sync in 7 min · 3 locations live
        </p>
      </div>
    );
  if (tag === "B")
    return (
      <div className="space-y-3">
        <div className="max-w-[280px] rounded-2xl rounded-tl-sm bg-white/95 p-3.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">
            <WhatsAppIcon size={11} /> WhatsApp · template
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-700">
            Namaste! So glad you enjoyed dinner at Spice Route. Would you spare 30 seconds to share it on Google? 🌟
          </p>
          <div className="mt-2.5 rounded-lg bg-mint-soft px-3 py-2 text-center text-[11.5px] font-semibold text-mint-deep">
            Rate us on Google →
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-3.5">
          <QrIcon size={30} className="text-brand" />
          <div>
            <p className="text-[12px] font-semibold">Table QR kit</p>
            <p className="text-[11px] text-neutral-500">1,310 scans · 96 reviews posted</p>
          </div>
        </div>
      </div>
    );
  if (tag === "C")
    return (
      <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-mint-deep">
            <Sparkles size={12} /> AI draft · Apologetic tone
          </span>
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber-deep">91% confident</span>
        </div>
        <p className="mt-2.5 border-l-2 border-mint/60 pl-3 text-[12.5px] leading-relaxed text-neutral-700">
          “Rohit, we&apos;re truly sorry about the wait on Saturday — that is not the experience we intend…”
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white">Approve</span>
          <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600">Edit</span>
          <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-600">Regenerate</span>
        </div>
      </div>
    );
  if (tag === "D")
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-white/95 p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Health score</p>
            <p className="text-[26px] font-bold leading-tight text-brand">86<span className="text-[14px] text-neutral-400">/100</span></p>
          </div>
          <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10.5px] font-bold text-mint-deep">▲ 4 pts this month</span>
        </div>
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Why this score</p>
          {[
            { w: "Rating trend", v: 78, l: "19/25" },
            { w: "Review velocity", v: 84, l: "17/20" },
            { w: "Recent sentiment", v: 70, l: "14/20" },
            { w: "Response rate", v: 90, l: "9/10" },
          ].map((l) => (
            <div key={l.w} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between text-[11px] font-medium">
                <span>{l.w}</span><span className="text-neutral-400">{l.l}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-mint" style={{ width: `${l.v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  if (tag === "E")
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Locations · weakest first</p>
          {[
            { w: "Noida Sec. 18", v: 61 },
            { w: "Lucknow", v: 72 },
            { w: "Gurugram", v: 88 },
          ].map((l) => (
            <div key={l.w} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between text-[11px] font-medium">
                <span>{l.w}</span><span className="text-neutral-400">{l.v}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-mint" style={{ width: `${l.v}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/95 p-3.5 shadow-sm">
          <div>
            <p className="text-[11.5px] font-semibold">Top theme: Waiting time · 42%</p>
            <p className="text-[11px] text-neutral-500">Most mentioned: Amit — 17 mentions · 2.8★ sentiment</p>
          </div>
          <MapPin size={18} className="shrink-0 text-mint-deep" />
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-bold">Long waiting times</p>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">High severity</span>
        </div>
        <p className="mt-0.5 text-[11px] text-neutral-500">Noida Sec. 18 · First detected Sept 12</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600">23 mentions</span>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">↑ 41% trend</span>
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-semibold text-amber-deep">In progress</span>
        </div>
        <p className="mt-2.5 rounded-lg bg-surface px-3 py-2 text-[11.5px] leading-relaxed text-neutral-600">
          Recommended: increase evening front-desk staffing 6–9 PM.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/95 p-3.5 shadow-sm">
        <div>
          <p className="text-[11.5px] font-semibold text-mint-deep">Two weeks later</p>
          <p className="text-[11px] text-neutral-500">Mentions ↓ 63% · Health score +11</p>
        </div>
        <Target size={18} className="shrink-0 text-mint-deep" />
      </div>
    </div>
  );
}

/* ----------------------------- How it works ----------------------------- */

const STEPS = [
  {
    n: 1, icon: <Link2 size={18} />, title: "Connect",
    time: "Day 0 · 15 minutes",
    desc: "Sign in with Google and pick the Business Profiles you own. Sensiblee starts pulling every review, photo and response through the official Google Business Profile API.",
    points: ["OAuth — no password sharing", "Multi-location aware from day one", "Historical reviews imported"],
  },
  {
    n: 2, icon: <Bell size={18} />, title: "Sense",
    time: "Every 15 minutes",
    desc: "Each new review is scored for sentiment, keywords and urgency. Critical ones trigger a WhatsApp alert to the owner; the rest queue calmly for the morning digest.",
    points: ["Sentiment + keyword scoring", "Urgent alerts within minutes", "Response SLA tracking begins"],
  },
  {
    n: 3, icon: <Sparkles size={18} />, title: "Act",
    time: "Minutes after arrival",
    desc: "The AI drafts a reply in your brand voice and queues it for approval. Meanwhile, request campaigns turn today’s happy guests into tomorrow’s five-star reviews.",
    points: ["Approve, edit or regenerate drafts", "WhatsApp bursts + QR kits", "Nothing posts without you"],
  },
  {
    n: 4, icon: <BarChart3 size={18} />, title: "Learn",
    time: "Every week",
    desc: "Ratings, themes, locations and staff roll into the Reputation Health Score. The weekly digest says what improved, what needs attention, and where to act next.",
    points: ["Reputation Health Score", "Location & staff breakdowns", "Owner digest on WhatsApp"],
  },
];

// Task 56 — how-it-works enrichment: first-week timeline, weekly rhythm, start requirements
const FIRST_WEEK = [
  {
    day: "Day 0", icon: <Link2 size={16} />, chip: "15 minutes of setup",
    title: "Connected & already sensing",
    desc: "Your profiles link through Google's official API and every historical review is imported. The response-SLA clock starts and your baseline Reputation Health Score is computed from the last 90 days of feedback.",
  },
  {
    day: "Day 1", icon: <Sparkles size={16} />, chip: "first AI drafts",
    title: "Drafts waiting for one click",
    desc: "The AI Copilot has studied your tone overnight and queued on-voice replies for every review that arrived. Approve with one click, edit freely or regenerate — nothing ever posts without a human saying yes.",
  },
  {
    day: "Days 2–3", icon: <QrCode size={16} />, chip: "fresh reviews start",
    title: "First requests go out",
    desc: "Table QR kits go live and your first WhatsApp burst reaches guests who just had a great experience. Every guest carries an opt-in record and a one-word STOP opt-out — consent-first by design, DPDP compliant.",
  },
  {
    day: "Day 7", icon: <BarChart3 size={16} />, chip: "baseline + digest",
    title: "Your first owner digest",
    desc: "Reputation Health explained dimension by dimension, location by location. The Action Center has already claimed its first complaint cluster with a severity, a peak window and a recommended fix.",
  },
];

const WEEKLY_RHYTHM = [
  { when: "Every 15 minutes", icon: <Timer size={15} />, what: "New reviews sensed, scored for sentiment, keywords and urgency — critical ones ping the owner's WhatsApp within minutes." },
  { when: "Every morning", icon: <Bell size={15} />, what: "A calm digest of the overnight queue: drafts to approve, rating movement, and staff mentions worth a coaching word." },
  { when: "Every Friday", icon: <TrendingUp size={15} />, what: "The weekly AI insight: what improved, what slipped, and the single action that moves your Health Score the most." },
  { when: "Every month", icon: <FileText size={15} />, what: "Location benchmark report — branch rankings, response-SLA trends, theme drift and competitor movement, exportable for leadership reviews." },
  { when: "Every quarter", icon: <Users size={15} />, what: "A reputation review with your named success manager (half-yearly & annual plans): goals, gaps and the next quarter's plan." },
];

const START_REQUIREMENTS = [
  { icon: <Link2 size={17} />, title: "Google Business Profile access", desc: "Owner or manager access to the profiles you want to connect. OAuth sign-in — we never see or store your Google password." },
  { icon: <MessageSquareText size={17} />, title: "A WhatsApp business number", desc: "For owner alerts and guest review requests. Guests opt out with one word — STOP — and we honour it instantly across every campaign." },
  { icon: <Clock size={17} />, title: "15 minutes", desc: "Pick profiles, set your brand voice with a few sample replies, approve your first draft. That is the entire onboarding." },
];

export function HowPage({ onNavigate }: PageProps) {
  const c = useCmsPage<HowContent>("how");
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-amber-soft/60 blur-3xl" />
        <div className="mx-auto max-w-3xl px-5 pb-8 pt-14 text-center lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            {c.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[52px]">
            {c.title} <span className="text-mint-deep">{c.accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-neutral-500">
            {c.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-6">
        <div className="relative space-y-4">
          <div className="absolute bottom-8 left-[27px] top-8 w-px bg-gradient-to-b from-mint/60 via-neutral-200 to-transparent" aria-hidden />
          {c.steps.map((s, i) => {
            const sd = STEPS[i];
            return (
            <div key={s.title} className="relative flex gap-4">
              <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand text-white shadow-md">
                {sd ? sd.icon : <Link2 size={18} />}
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mint text-[10.5px] font-bold text-brand-deep">
                  {i + 1}
                </span>
              </div>
              <div className="card-lift flex-1 rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[18.5px] font-bold">{s.title}</h2>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500">{s.time}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{s.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.points.map((p) => (
                    <span key={p} className="rounded-full bg-mint-soft px-2.5 py-1 text-[11px] font-medium text-mint-deep">{p}</span>
                  ))}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {c.pillars.map((pc, pi) => (
            <div key={pc.t} className="card-lift rounded-2xl border border-neutral-200/70 bg-white p-5">
              {[<ShieldCheck key="p-a" size={17} className="text-mint-deep" />, <Zap key="p-b" size={17} className="text-mint-deep" />, <Rocket key="p-c" size={17} className="text-mint-deep" />][pi % 3]}
              <p className="mt-2.5 text-[14px] font-bold">{pc.t}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{pc.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Task 56 — your first week, day by day */}
      <section className="mx-auto max-w-4xl px-5 pb-4 pt-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            <CalendarDays size={12} /> Your first week
          </span>
          <h2 className="mt-3 text-[26px] font-bold tracking-tight lg:text-[30px]">
            From signup to a running reputation engine — <span className="text-mint-deep">in seven days</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[13.5px] leading-relaxed text-neutral-500">
            No implementation project, no consultant, no data migration. Here is exactly what happens after you connect your Google profiles.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIRST_WEEK.map((d) => (
            <div key={d.day} className="card-lift relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
                  {d.icon} {d.day}
                </span>
                <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10.5px] font-semibold text-mint-deep">{d.chip}</span>
              </div>
              <h3 className="mt-3 text-[16px] font-bold">{d.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Task 56 — the weekly rhythm once live */}
      <section className="mx-auto max-w-4xl px-5 py-6">
        <div className="rounded-[28px] bg-brand px-6 py-8 text-white lg:px-10">
          <h2 className="text-[22px] font-bold tracking-tight lg:text-[26px]">
            The weekly rhythm, <span className="text-mint">once you&apos;re live</span>
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/60">
            Sensiblee is not another dashboard you have to remember to open. The platform runs a fixed operating rhythm and surfaces itself to you.
          </p>
          <ul className="mt-6 space-y-4">
            {WEEKLY_RHYTHM.map((r) => (
              <li key={r.when} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint">{r.icon}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-mint">{r.when}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/65">{r.what}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Task 56 — all you need to start */}
      <section className="mx-auto max-w-4xl px-5 pb-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            <CheckCircle2 size={12} /> Checklist
          </span>
          <h2 className="mt-3 text-[24px] font-bold tracking-tight lg:text-[28px]">
            All you need to <span className="text-mint-deep">start today</span>
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {START_REQUIREMENTS.map((r) => (
            <div key={r.title} className="card-lift rounded-2xl border border-neutral-200/70 bg-white p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-soft text-mint-deep">{r.icon}</span>
              <h3 className="mt-3 text-[14.5px] font-bold">{r.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand note="The demo workspace runs this exact journey on live data — no slideware." />
    </main>
  );
}

/* ------------------------------- Pricing ------------------------------- */

type CmpVal = string | boolean; // true = included ✓ · false = not included —
const COMPARISON_GROUPS: { group: string; rows: { row: string; vals: [CmpVal, CmpVal, CmpVal] }[] }[] = [
  {
    group: "Reviews & monitoring",
    rows: [
      { row: "Google Business Profiles", vals: ["1", "Up to 5", "Up to 10"] },
      { row: "Review sync cadence", vals: ["Every 15 minutes", "Every 15 minutes", "Every 15 minutes"] },
      { row: "Historical review import", vals: [true, true, true] },
      { row: "Review health scores", vals: [true, true, true] },
      { row: "Competitor benchmark set", vals: [false, false, "Add-on"] },
    ],
  },
  {
    group: "Review requests",
    rows: [
      { row: "WhatsApp review requests", vals: ["50 / month", "100 / month", "250 / month"] },
      { row: "QR table kits", vals: ["Add-on", "Included", "Included"] },
      { row: "Transaction-triggered requests", vals: [true, true, true] },
      { row: "Request templates & scheduling", vals: [true, true, true] },
      { row: "Per-guest opt-in & STOP records", vals: [true, true, true] },
      { row: "WhatsApp automation & cross-location campaigns", vals: [false, true, true] },
    ],
  },
  {
    group: "AI assistance",
    rows: [
      { row: "AI-drafted replies", vals: ["200 / month", "500 / month", "1,000 / month"] },
      { row: "Brand-voice learning", vals: [true, true, true] },
      { row: "Basic sentiment analysis", vals: [true, false, false] },
      { row: "Weekly AI insights", vals: [false, true, true] },
      { row: "Auto-approve threshold", vals: [true, true, true] },
      { row: "Extra AI credit packs", vals: ["Add-on", "Add-on", "Add-on"] },
    ],
  },
  {
    group: "Location & staff intelligence",
    rows: [
      { row: "Location comparison", vals: [false, true, true] },
      { row: "Staff mentions (coaching view)", vals: [false, true, true] },
      { row: "Issue detection", vals: [false, true, true] },
      { row: "Issue & action tracking", vals: [false, false, true] },
      { row: "Regional dashboards & advanced drill-down", vals: [false, false, true] },
      { row: "Location benchmarking", vals: [false, false, true] },
    ],
  },
  {
    group: "Team & governance",
    rows: [
      { row: "Team seats included", vals: ["2", "5", "10"] },
      { row: "Manager dashboards", vals: [false, true, true] },
      { row: "Custom roles & permissions", vals: [false, false, true] },
      { row: "Owner approval workflow", vals: [false, false, true] },
      { row: "Activity audit trail", vals: [true, true, true] },
    ],
  },
  {
    group: "Reports & support",
    rows: [
      { row: "Automated reports", vals: [false, false, true] },
      { row: "Support", vals: ["Email", "WhatsApp + email", "Priority WhatsApp"] },
      { row: "Onboarding help", vals: ["Self-serve guides", "Guided setup", "White-glove"] },
      { row: "GST invoices for every payment", vals: [true, true, true] },
      { row: "Change or cancel anytime", vals: [true, true, true] },
    ],
  },
];

export function PricingPage({ onNavigate }: PageProps) {
  const [cycle, setCycle] = useState<"monthly" | "half_yearly" | "annual">("monthly");
  const pc = useCmsPage<PricingContent>("pricing");
  const pricingFaqs = useCmsFaqs("pricing");
  const { data } = useApiData<{ taxPercent?: number; plans: { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number; blurb: string; features: string[]; popular: boolean }[] }>("/api/plans");

  const plans = (data?.plans || [
    { id: "starter", name: "Starter", monthlyInr: 1499, halfYearlyInr: 8095, annualInr: 14390, blurb: "For single clinics, salons, restaurants and service businesses.", features: ["1 Google Business Profile — full review monitoring", "AI replies in your brand voice — 200 / month", "Reputation Health", "Basic sentiment analysis", "WhatsApp review requests — 50 / month", "2 users"], popular: false },
    { id: "growth", name: "Growth", monthlyInr: 3499, halfYearlyInr: 18895, annualInr: 33590, blurb: "The main plan — multi-branch teams that run on their reputation.", features: ["Up to 5 Google Business Profiles", "Everything in Starter", "Location comparison & benchmarking", "Staff mentions (coaching view)", "Issue detection & Action Center", "AI replies — 500 / month", "WhatsApp automation — 100 / month", "Weekly AI insights · manager dashboards", "5 users"], popular: true },
    { id: "multi", name: "Scale", monthlyInr: 5999, halfYearlyInr: 32395, annualInr: 57590, blurb: "Regional brands running reputation as a management program.", features: ["Up to 10 Google Business Profiles", "Everything in Growth", "Regional dashboards & advanced drill-down", "Location benchmarking", "Issue & action tracking · automated reports", "AI replies — 1,000 / month", "10 manager seats · priority support"], popular: false },
  ]).sort((a, b) => a.monthlyInr - b.monthlyInr);
  const taxPercent = data?.taxPercent ?? 18;

  const CYCLES = [
    { k: "monthly", label: "Monthly" },
    { k: "half_yearly", label: "Half-yearly · 10% off" },
    { k: "annual", label: "Annual · 20% off" },
  ] as const;
  const monthsOf = { monthly: 1, half_yearly: 6, annual: 12 } as const;
  const totalOf = (p: { monthlyInr: number; halfYearlyInr: number; annualInr: number }) =>
    cycle === "monthly" ? p.monthlyInr : cycle === "half_yearly" ? p.halfYearlyInr : p.annualInr;
  const perMonth = (p: { monthlyInr: number; halfYearlyInr: number; annualInr: number }) =>
    Math.round(totalOf(p) / monthsOf[cycle]);
  const billedNote = (p: { monthlyInr: number; halfYearlyInr: number; annualInr: number }) =>
    cycle === "monthly"
      ? "/month"
      : cycle === "half_yearly"
        ? `/month · ₹${p.halfYearlyInr.toLocaleString("en-IN")} billed every 6 months · 10% off`
        : `/month · ₹${p.annualInr.toLocaleString("en-IN")} billed yearly · 20% off`;

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
        <div className="mx-auto max-w-3xl px-5 pb-6 pt-14 text-center lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            {pc.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[52px]">
            {pc.title} <span className="text-mint-deep">{pc.accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-neutral-500">
            {pc.description}
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1">
            {CYCLES.map((o) => (
              <button
                key={o.k}
                onClick={() => setCycle(o.k)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all",
                  cycle === o.k ? "bg-brand text-white shadow-sm" : "text-neutral-500 hover:text-brand"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6",
                p.popular
                  ? "card-lift-dark border-mint/50 bg-brand text-white shadow-xl lg:-translate-y-2 lg:hover:translate-y-0"
                  : "card-lift border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              )}
            >
              {p.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-mint px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-brand-deep">
                  Most popular
                </span>
              )}
              <h2 className="text-[18px] font-bold">{p.name}</h2>
              <p className={cn("mt-1 text-[12.5px]", p.popular ? "text-white/55" : "text-neutral-500")}>{p.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold tracking-tight">₹{perMonth(p).toLocaleString("en-IN")}</span>
                <span className={cn("text-[12.5px]", p.popular ? "text-white/50" : "text-neutral-400")}>{billedNote(p)}</span>
              </div>
              <p className={cn("mt-1 text-[11px] font-semibold", p.popular ? "text-mint" : "text-mint-deep")}>
                + GST @ {taxPercent}%
              </p>
              {cycle !== "monthly" && (
                <p className={cn("mt-1 text-[11px] font-semibold", p.popular ? "text-mint" : "text-mint-deep")}>
                  {cycle === "half_yearly" ? "10% off vs monthly" : "20% off vs monthly"}
                </p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2.5 text-[12.5px]", p.popular ? "text-white/85" : "text-neutral-600")}>
                    <span className={cn(
                      "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full",
                      p.popular ? "bg-mint text-brand-deep" : "bg-mint-soft text-mint-deep"
                    )}>
                      <Check size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "mt-6 h-11 w-full rounded-2xl text-[13px] font-semibold",
                  p.popular ? "bg-mint text-brand-deep hover:bg-mint/90" : "bg-brand text-white hover:bg-brand-deep"
                )}
                onClick={() => onNavigate("contact")}
              >
                Try for Free <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-neutral-400">
          All prices are exclusive of GST @ {taxPercent}% — a GST invoice is issued for every payment.
          Prices follow the plan you pick in Settings → Plan after signup.
        </p>

        {/* doc Part 2: tailor-made plan line for 10+ locations — placed beautifully, linked to contact */}
        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-2 rounded-3xl border border-mint/40 bg-mint-soft/50 px-6 py-5 text-center">
          <p className="text-[15px] font-semibold text-brand">
            Running more than 10 locations?
          </p>
          <p className="text-[13px] leading-relaxed text-neutral-500">
            For a tailor-made plan to manage more than 10 locations,{" "}
            <button onClick={() => onNavigate("contact")} className="font-bold text-mint-deep underline decoration-mint/60 decoration-2 underline-offset-4 transition-colors hover:text-brand">
              Contact Us
            </button>{" "}
            — custom location bundles, regional rollouts and dedicated support.
          </p>
        </div>

        {/* doc Risk 3 solution: platform subscription separated from messaging usage */}
        <p className="mx-auto mt-4 max-w-2xl text-center text-[11.5px] leading-relaxed text-neutral-400">
          Platform subscription and WhatsApp messaging usage are billed separately — Meta's per-conversation rates pass through at cost, keeping plans simple and margins healthy.
        </p>

        <div className="mt-6 grid gap-3 rounded-3xl border border-neutral-200/70 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          {pc.addOns.map((a) => (
            <div key={a.name} className="rounded-2xl bg-surface p-4">
              <p className="text-[13px] font-bold">{a.name}</p>
              <p className="text-[11.5px] text-neutral-400">{a.detail}</p>
              <p className="mt-1.5 text-[15px] font-bold text-mint-deep">{a.price}<span className="text-[11px] font-medium text-neutral-400">/month</span></p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-8">
        <h2 className="text-center text-[28px] font-bold tracking-tight text-brand">{pc.compareTitle}</h2>
        <div className="mt-5 overflow-x-auto rounded-3xl border border-neutral-200/70 bg-white">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-neutral-200/70 bg-surface">
                <th className="px-5 py-3.5 font-semibold text-neutral-500">What you get</th>
                { ["Starter", "Growth", "Scale"].map((h, i) => (
                  <th key={h} className={cn("px-4 py-3.5 font-bold", i === 1 && "bg-mint-soft/60 text-mint-deep")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_GROUPS.map((g) => (
                <Fragment key={g.group}>
                  <tr className="border-b border-neutral-100 bg-surface">
                    <td colSpan={4} className="px-5 py-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                      {g.group}
                    </td>
                  </tr>
                  {g.rows.map((r, ri) => (
                    <tr key={r.row} className={cn("border-b border-neutral-100", ri % 2 === 1 && "bg-surface/60", ri === g.rows.length - 1 && "border-b-0")}>
                      <td className="px-5 py-3 font-medium text-neutral-600">{r.row}</td>
                      {r.vals.map((v, i) => (
                        <td key={i} className={cn("px-4 py-3", i === 1 ? "bg-mint-soft/40 font-semibold text-brand" : "text-neutral-600")}>
                          {v === true ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-soft"><Check size={11} className="text-mint-deep" /></span>
                          ) : v === false ? (
                            <span className="text-neutral-300">—</span>
                          ) : (
                            v
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-[11.5px] text-neutral-400">Add-ons are billed on the same cycle as your plan and appear as separate line items on the GST invoice.</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-8">
        <h2 className="text-center text-[28px] font-bold tracking-tight text-brand">{pc.faqTitle}</h2>
        <Accordion type="single" collapsible className="mt-5">
          {pricingFaqs.map((f, i) => (
            <AccordionItem key={f.id} value={`faq-${i}`} className="border-neutral-200/70">
              <AccordionTrigger className="px-5 text-left text-[13.5px] font-semibold hover:no-underline">
                {f.question}
              </AccordionTrigger>
              <AccordionContent className="px-5 text-[13px] leading-relaxed text-neutral-500">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <CtaBand note="Every plan starts with a 7-day trial — full features, no card." />
    </main>
  );
}

/* ------------------------------- CTA band ------------------------------- */

export function CtaBand({ onWatchDemo, note }: { onWatchDemo?: () => void; note: string }) {
  const { route, navigate } = useRouter();
  const watch = onWatchDemo ?? demoVideoHandler(() => navigate({ surface: "home" }), route.surface === "home");
  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 pt-6">
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-brand px-8 py-9 text-center sm:flex-row sm:text-left">
        <div>
          <h3 className="text-[24px] font-bold tracking-tight text-white">See it on your own reviews</h3>
          <p className="mt-1.5 text-[13.5px] text-white/55">{note}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="h-12 rounded-2xl bg-mint px-6 text-[14px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => navigate({ surface: "signup" })}>
            Try for Free
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl border-white/20 bg-transparent px-6 text-[14px] font-semibold text-white hover:bg-white/10" onClick={watch}>
            <Play size={15} className="mr-2 fill-mint text-mint" /> Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
