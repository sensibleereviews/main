// Sensiblee marketing home — brand hero, live product preview, stats, modules, testimonials
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/lib/client";
import { useCmsPage, useCmsFaqs, useCmsTestimonials, useCmsPosts } from "@/lib/cms-context";
import type { HomeContent } from "@/lib/cms-defaults";
import { blogThumbFor } from "@/lib/blog-images";
import { blogPostUrlView } from "@/lib/route-shared";
import { StarRating, GoogleG, WhatsAppIcon } from "./brand";
import { BRAND_LOGOS } from "./brand-logos";
import { CtaBand } from "./marketing-pages";
import { cn, Sparkles, ArrowRight, Check, Quote, Play, ChevronDown, Building2, Clock, Newspaper, Hotel, UtensilsCrossed, Coffee, Stethoscope, Scissors, Dumbbell, ShoppingBag, GraduationCap, MapPin, Target } from "./deps";

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel size={18} />,
  restaurant: <UtensilsCrossed size={18} />,
  cafe: <Coffee size={18} />,
  clinic: <Stethoscope size={18} />,
  salon: <Scissors size={18} />,
  gym: <Dumbbell size={18} />,
  retail: <ShoppingBag size={18} />,
  school: <GraduationCap size={18} />,
};
const MODULE_ICONS = [
  <GoogleG key="m-a" size={17} />,
  <WhatsAppIcon key="m-b" size={17} className="text-mint-deep" />,
  <Sparkles key="m-c" size={17} className="text-mint-deep" />,
  <StarRating key="m-d" value={5} size={13} />,
  <MapPin key="m-e" size={17} className="text-mint-deep" />,
  <Target key="m-f" size={17} className="text-mint-deep" />,
];

type HomeNav = {
  onNavigate: (v: string) => void;
  onOpenApp: () => void;
  onOpenAdmin: () => void;
  onOpenGuest: () => void;
  onWatchDemo: () => void;
};

export function HomePage({ nav }: { nav: HomeNav }) {
  const { onNavigate, onOpenApp, onWatchDemo } = nav;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "half_yearly" | "annual">("monthly");
  const c = useCmsPage<HomeContent>("home");
  const overviewSec = (Array.isArray(c.overviewSection) ? c.overviewSection[0] : c.overviewSection) || {};
  const trialCard = (Array.isArray(c.trialCard) ? c.trialCard[0] : c.trialCard) || {};
  const trialPoints: string[] = Array.isArray(trialCard?.points)
    ? trialCard.points
    : typeof trialCard?.points === "string"
      ? (trialCard.points as string).split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
  const overviewPoints: string[] = (Array.isArray(c.overview) ? c.overview : []).map((p: any) =>
    typeof p === "object" && p !== null ? String(p.p || p.text || "") : String(p)
  ).filter(Boolean);
  const modulesSec = (Array.isArray(c.modulesSection) ? c.modulesSection[0] : c.modulesSection) || {};
  const howSec = (Array.isArray(c.howSection) ? c.howSection[0] : c.howSection) || {};
  const indSec = (Array.isArray(c.industriesSection) ? c.industriesSection[0] : c.industriesSection) || {};
  const tsmSec = (Array.isArray(c.testimonialsSection) ? c.testimonialsSection[0] : c.testimonialsSection) || {};
  const priceSec = (Array.isArray(c.pricingSection) ? c.pricingSection[0] : c.pricingSection) || {};
  const faqSec = (Array.isArray(c.faqSection) ? c.faqSection[0] : c.faqSection) || {};
  const blogSec = (Array.isArray(c.blogsSection) ? c.blogsSection[0] : c.blogsSection) || {};
  const posts = useCmsPosts().slice(0, 3);
  const faqs = useCmsFaqs("home");
  const testimonials = useCmsTestimonials();
  const { data: plansData } = useApiData<{
    taxPercent: number;
    plans: { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number; blurb: string; popular: boolean; features: string[]; locations: number; seats: number }[];
  }>("/api/plans");
  const taxPercent = plansData?.taxPercent ?? 18;
  const teaserPlans: { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number; blurb: string; popular: boolean; features: string[]; locations: number; seats: number }[] = plansData?.plans?.length
    ? plansData.plans
    : [
        {
          id: "starter", name: "Starter", monthlyInr: 1499, halfYearlyInr: 8095, annualInr: 14390,
          blurb: "For single clinics, salons, restaurants and service businesses.", popular: false, locations: 1, seats: 2,
          features: [
            "1 Google Business Profile — full review monitoring", "AI replies in your brand voice — 200 / month",
            "Reputation Health", "Basic sentiment analysis",
            "WhatsApp review requests — 50 / month", "2 users",
          ],
        },
        {
          id: "growth", name: "Growth", monthlyInr: 3499, halfYearlyInr: 18895, annualInr: 33590,
          blurb: "The main plan — multi-branch teams that run on their reputation.", popular: true, locations: 5, seats: 5,
          features: [
            "Up to 5 Google Business Profiles", "Everything in Starter",
            "Location comparison & benchmarking", "Staff mentions (coaching view)",
            "Issue detection & Action Center", "AI replies — 500 / month",
            "WhatsApp automation — 100 / month",
            "Weekly AI insights · manager dashboards", "5 users",
          ],
        },
        {
          id: "multi", name: "Scale", monthlyInr: 5999, halfYearlyInr: 32395, annualInr: 57590,
          blurb: "Regional brands running reputation as a management program.", popular: false, locations: 10, seats: 10,
          features: [
            "Up to 10 Google Business Profiles", "Everything in Growth",
            "Regional dashboards & advanced drill-down", "Location benchmarking",
            "Issue & action tracking · automated reports", "AI replies — 1,000 / month",
            "10 manager seats · priority support",
          ],
        },
      ];

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
        ? `/month · ₹${p.halfYearlyInr.toLocaleString("en-IN")} every 6 mo · 10% off`
        : `/month · ₹${p.annualInr.toLocaleString("en-IN")} /year · 20% off`;

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-64 h-56 w-56 rounded-full bg-amber-soft/60 blur-3xl" />
        <div className="mx-auto max-w-5xl px-5 pb-4 pt-8 text-center sm:pb-6 sm:pt-10 lg:pt-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Sparkles size={12} /> {c.heroEyebrow}
          </span>
          <h1 className="mx-auto mt-4 max-w-4xl text-[36px] font-bold leading-[1.18] tracking-tight sm:mt-5 sm:text-[42px] lg:text-[46px]">
            {c.heroTitleA} <span className="text-mint-deep">{c.heroAccentA}</span>.<br />
            {c.heroTitleB} <span className="relative inline-block">{c.heroAccentB}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 220 10" fill="none" aria-hidden>
                <path d="M3 7 C 60 2, 160 2, 217 6" stroke="#88D6A0" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-[1.65] text-neutral-500 sm:mt-5 sm:text-[15.5px]">
            {c.heroSub}
          </p>
        </div>

        {/* Product preview */}
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-4 sm:pt-6">
          <HeroPreview onOpenApp={onOpenApp} />
        </div>

        {/* Stats strip */}
        <div className="mx-auto max-w-5xl px-5 pb-10">
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-neutral-200/70 bg-white p-5 sm:grid-cols-4 lg:p-6">
            {c.stats.map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-[26px] font-bold tracking-tight text-brand">{s.v}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-neutral-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client logo carousel — social proof strip */}
      <section aria-label="Clients we serve" className="mx-auto max-w-6xl px-5 pb-10 pt-3">
        <p className="text-center text-[13px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          {c.trustedLabel}
        </p>
        <div
          className="marquee-strip relative mt-6 overflow-hidden"
          style={{
            maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div className="flex w-max animate-marquee motion-reduce:!animate-none">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center gap-14 pr-14 sm:gap-16 sm:pr-16"
              >
                {BRAND_LOGOS.map((l) => (
                  <span
                    key={l.name}
                    title={l.name}
                    className="shrink-0 text-neutral-500 transition-colors duration-300 hover:text-brand"
                  >
                    {l.svg}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The platform in a nutshell — dark brand statement panel */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="relative overflow-hidden rounded-[28px] bg-brand px-6 py-10 text-white lg:px-12">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-mint/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-mint/10 blur-3xl" />
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-[0.08]" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
            <path d="M0 90 C 300 30, 600 130, 900 70 S 1200 40, 1200 40" stroke="#88D6A0" strokeWidth="3" fill="none" />
            <path d="M0 110 C 300 60, 600 150, 900 100 S 1200 70, 1200 70" stroke="#FEF3C7" strokeWidth="2" fill="none" />
          </svg>

          <div className="relative grid grid-cols-1 gap-9 lg:grid-cols-[1.12fr_1fr] lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mint">
                <Sparkles size={12} /> {overviewSec.eyebrow}
              </span>
              <h2 className="mt-4 text-[24px] font-bold leading-[1.14] tracking-tight text-white lg:text-[28px]">
                {overviewSec.title}
              </h2>
              <p className="mt-3 max-w-xl text-[14.5px] font-medium leading-relaxed text-mint/90">
                {overviewSec.sub}
              </p>
              <ul className="mt-6 max-w-xl space-y-4 text-[13.5px] leading-relaxed text-white/70">
                {overviewPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/15 ring-1 ring-mint/30">
                      <Check size={12} className="text-mint" />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {["15-minute sensing", "100% human-approved", "One health score"].map((chip) => (
                  <span key={chip} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 ring-1 ring-white/10">
                    <Check size={12} className="text-mint" /> {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* The six core modules as glass cards (doc Part 1: pillars 1–6) */}
            <div className="grid content-center gap-3 sm:grid-cols-2">
              {[
                { t: "Reputation Command Center", d: "Every review sensed within 15 minutes, across all locations", i: 0 },
                { t: "Reputation Health", d: "One 0–100 North-Star score that explains itself, dimension by dimension", i: 3 },
                { t: "AI Reputation Copilot", d: "On-voice drafts and insights waiting for one human click", i: 2 },
                { t: "Review Growth Engine", d: "WhatsApp, QR and transaction-triggered asks at the moment guests are happiest", i: 1 },
                { t: "Location Intelligence", d: "Branch-by-branch themes and staff mentions behind every score", i: 4 },
                { t: "Reputation Action Center", d: "Complaint clusters become owned issues with measurable fixes", i: 5 },
              ].map((m) => (
                <div key={m.t} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-mint">{MODULE_ICONS[m.i]}</span>
                  <p className="mt-3 text-[13.5px] font-bold text-white">{m.t}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Watch Demo video + Try for Free — two-column CTA section */}
      <section id="demo-video" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Column 1 — Watch Demo (video) */}
          <div className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_12px_36px_-18px_rgba(16,24,40,0.25)]">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
              <h3 className="flex items-center gap-2 text-[16px] font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint-soft">
                  <Play size={13} className="fill-mint-deep text-mint-deep" />
                </span>
                Watch Demo
              </h3>
              <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">4-minute narrated product tour</span>
            </div>
            <video
              controls
              preload="metadata"
              poster="/demo/demo-poster.png"
              className="aspect-video w-full bg-brand object-cover"
              aria-label="Sensiblee product demo video"
            >
              <source src="/demo/sensiblee-demo.mp4" type="video/mp4" />
              <source src="/demo/sensiblee-demo.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Column 2 — Try Sensiblee for free */}
          <div className="flex flex-col rounded-3xl bg-brand p-6 text-white lg:p-7">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mint">
              <Sparkles size={12} /> Start today
            </span>
            <h3 className="mt-3.5 text-[24px] font-bold leading-tight tracking-tight">{trialCard.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              {trialCard.sub}
            </p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/80">
              {trialPoints.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-mint text-brand-deep"><Check size={11} /></span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <Button className="h-12 w-full rounded-2xl bg-mint text-[14.5px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => onNavigate("signup")}>
                Try for Free <ArrowRight size={15} className="ml-1.5" />
              </Button>
              <p className="mt-2.5 text-center text-[11.5px] text-white/45">
                Prefer a walkthrough first? <button onClick={() => onNavigate("contact")} className="font-semibold text-mint hover:underline">Talk to us</button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={modulesSec.eyebrow}
          title={modulesSec.title}
          sub={modulesSec.sub}
          action={modulesSec.action ? { label: modulesSec.action, onClick: () => onNavigate("features") } : undefined}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.modules.map((m, i) => (
            <button
              key={m.title}
              onClick={() => onNavigate("features")}
              className="group card-lift rounded-2xl border border-neutral-200/70 bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface transition-all duration-300 group-hover:scale-110 group-hover:bg-mint-soft">{MODULE_ICONS[i % MODULE_ICONS.length]}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Module {"ABCDEF"[i % 6]}</span>
              </div>
              <h3 className="mt-3.5 text-[16.5px] font-bold">{m.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* How it works teaser */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={howSec.eyebrow}
          title={howSec.title}
          sub={howSec.sub}
          action={howSec.action ? { label: howSec.action, onClick: () => onNavigate("how") } : undefined}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((s, i) => (
            <div key={s.t} className="group card-lift relative rounded-2xl border border-neutral-200/70 bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-[14px] font-bold text-white transition-transform duration-300 group-hover:rotate-6">{i + 1}</span>
              <h3 className="mt-3 text-[16px] font-bold">{s.t}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{s.d}</p>
              {i < c.steps.length - 1 && (
                <ArrowRight size={15} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-mint lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={indSec.eyebrow}
          title={indSec.title}
          sub={indSec.sub}
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {c.industries.map((ind) => (
            <div
              key={ind.name}
              className="group rounded-2xl border border-neutral-200/70 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-soft text-mint-deep transition-colors group-hover:bg-mint/30">
                {INDUSTRY_ICONS[ind.icon] || <Building2 size={18} />}
              </span>
              <h3 className="mt-3 text-[14px] font-bold text-brand">{ind.name}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">{ind.ex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={tsmSec.eyebrow}
          title={tsmSec.title}
          sub={tsmSec.sub}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="card-lift flex flex-col rounded-2xl border border-neutral-200/70 bg-white p-6">
              <Quote size={20} className="text-mint" />
              <blockquote className="mt-3 flex-1 text-[13.5px] leading-relaxed text-neutral-600">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                {t.mediaUrl ? (
                  <img src={t.mediaUrl} alt={t.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                    {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{t.name}</p>
                  <p className="truncate text-[11px] text-neutral-400">{t.role}</p>
                </div>
                <StarRating value={t.stars} size={11} />
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing teaser — live from the plans API */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={priceSec.eyebrow}
          title={priceSec.title}
          sub={priceSec.sub}
          action={priceSec.action ? { label: priceSec.action, onClick: () => onNavigate("pricing") } : undefined}
        />
        <div className="mt-6 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1">
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
        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          {teaserPlans.map((p) => (
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
              <h3 className="text-[18px] font-bold">{p.name}</h3>
              <p className={cn("mt-1 text-[12.5px]", p.popular ? "text-white/55" : "text-neutral-500")}>{p.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold tracking-tight">₹{perMonth(p).toLocaleString("en-IN")}</span>
                <span className={cn("text-[12.5px]", p.popular ? "text-white/50" : "text-neutral-400")}>{billedNote(p)}</span>
              </div>
              <p className={cn("mt-1 text-[11px] font-semibold", p.popular ? "text-mint" : "text-mint-deep")}>
                + GST @ {taxPercent}% · {p.locations} location{p.locations > 1 ? "s" : ""} · {p.seats} user{p.seats > 1 ? "s" : ""}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 border-t border-neutral-100 pt-4" style={p.popular ? { borderTopColor: "rgba(255,255,255,0.12)" } : undefined}>
                {p.features.map((f) => (
                  <li key={f} className={cn("flex items-start gap-2.5 text-[12.5px] leading-snug", p.popular ? "text-white/85" : "text-neutral-600")}>
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
                onClick={() => onNavigate("signup")}
              >
                Try for Free <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-neutral-400">
          Every plan starts with a 7-day trial — full features, no card. All prices exclusive of GST @ {taxPercent}%, a GST invoice is issued for every payment.
        </p>
        {/* doc Part 2: tailor-made plan line for 10+ locations */}
        <p className="mt-3 text-center text-[13px] text-neutral-500">
          Running more than 10 locations?{" "}
          <button onClick={() => onNavigate("contact")} className="font-bold text-mint-deep underline decoration-mint/60 decoration-2 underline-offset-4 transition-colors hover:text-brand">
            Contact Us
          </button>{" "}
          for a tailor-made plan.
        </p>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={faqSec.eyebrow}
          title={faqSec.title}
          sub={faqSec.sub}
          action={faqSec.action ? { label: faqSec.action, onClick: () => onNavigate("knowledge") } : undefined}
        />
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={f.id}
                className={cn(
                  "h-fit rounded-2xl border bg-white transition-colors",
                  open ? "border-mint/60 shadow-[0_8px_24px_-12px_rgba(63,145,99,0.25)]" : "border-neutral-200/70"
                )}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[14px] font-semibold text-brand">{f.question}</span>
                  <ChevronDown size={16} className={cn("shrink-0 text-mint-deep transition-transform", open && "rotate-180")} />
                </button>
                {open && <p className="px-5 pb-4 text-[13px] leading-relaxed text-neutral-500">{f.answer}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent blogs — 3 newest articles */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <SectionHead
          eyebrow={blogSec.eyebrow}
          title={blogSec.title}
          sub={blogSec.sub}
          action={blogSec.action ? { label: blogSec.action, onClick: () => onNavigate("blog") } : undefined}
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {posts.map((p) => {
            const thumb = blogThumbFor(p.slug, p.featuredUrl);
            return (
              <button
                key={p.id}
                onClick={() => onNavigate(`blog:${blogPostUrlView(p)}`)}
                className="group card-lift flex flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <span className="block aspect-[16/9] overflow-hidden bg-surface">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mint-soft to-amber-soft/50 text-mint-deep"><Newspaper size={24} /></span>
                  )}
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="flex flex-wrap items-center gap-2.5 text-[11.5px] text-neutral-400">
                    <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint-deep">{p.tag}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(p.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.readTime}</span>
                  </span>
                  <span className="mt-2.5 block text-[17px] font-bold leading-snug tracking-tight text-brand">{p.title}</span>
                  <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-neutral-500">{p.excerpt}</span>
                  <span className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand">
                    Read article <ArrowRight size={13} className="text-mint-deep transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <CtaBand onWatchDemo={onWatchDemo} note={c.ctaNote} />
    </main>
  );
}

function SectionHead({ eyebrow, title, sub, action }: {
  eyebrow: string; title: string; sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-mint-deep shadow-[0_2px_8px_rgba(136,214,160,0.2)]">
        <span className="h-1 w-1 rounded-full bg-mint-deep" aria-hidden />
        {eyebrow}
        <span className="h-1 w-1 rounded-full bg-mint-deep" aria-hidden />
      </span>
      <h2 className="mt-3.5 text-[22px] font-extrabold leading-[1.16] tracking-tight text-brand lg:text-[25px]">{title}</h2>
      <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-neutral-500">{sub}</p>
      {action && (
        <button onClick={action.onClick} className="group mx-auto mt-4 flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-brand">
          {action.label}
          <ArrowRight size={14} className="text-mint-deep transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

const LIVE_REVIEWS = [
  { name: "Ananya Sharma", stars: 5, tag: "positive", tagCls: "bg-mint-soft text-mint-deep", quote: "Staff arranged a surprise dessert plate without being asked…", ago: "sensed 6 min ago" },
  { name: "Rahul Mehta", stars: 2, tag: "urgent", tagCls: "bg-red-50 text-red-600", quote: "Waited 40 minutes despite a reservation. Nobody explained…", ago: "sensed 9 min ago" },
  { name: "Priya Kulkarni", stars: 4, tag: "mixed", tagCls: "bg-amber-soft text-amber-deep", quote: "Biryani was superb; parking was a struggle on Saturday…", ago: "sensed 21 min ago" },
];

function HeroPreview({ onOpenApp }: { onOpenApp: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [revIdx, setRevIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    const iv = setInterval(() => setRevIdx((i) => (i + 1) % LIVE_REVIEWS.length), 3800);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const R = 70, CIRC = 2 * Math.PI * R; // health-score ring
  const rev = LIVE_REVIEWS[revIdx];

  return (
    <div className="hero-anim relative">
      {/* ambient glow field + dot grid behind the frame */}
      <div className="pointer-events-none absolute -inset-x-8 -top-10 bottom-0" aria-hidden>
        <div className="absolute left-1/2 top-6 h-56 w-[560px] -translate-x-1/2 rounded-full bg-mint/20 blur-3xl" />
        <div className="absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-amber-soft/80 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "radial-gradient(rgba(31,41,55,0.09) 1.2px, transparent 1.2px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(60% 60% at 50% 40%, black, transparent)", WebkitMaskImage: "radial-gradient(60% 60% at 50% 40%, black, transparent)" }} />
      </div>

      {/* floating badge — WhatsApp delivery (top right) */}
      <div className="absolute -right-3 -top-6 z-20 hidden animate-[hero-float_6s_ease-in-out_infinite] items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 px-3.5 py-2 shadow-[0_16px_40px_-16px_rgba(16,24,40,0.35)] backdrop-blur lg:flex" style={{ animationDelay: "0.8s" }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint-soft"><WhatsAppIcon size={15} className="text-mint-deep" /></span>
        <div>
          <p className="text-[12px] font-bold leading-tight">Request delivered <span className="text-mint-deep">✓✓</span></p>
          <p className="text-[11px] leading-tight text-neutral-400">42 opted-in guests · dinner list</p>
        </div>
      </div>

      {/* floating badge — reply posted (bottom left) */}
      <div className="absolute -left-4 -bottom-2 z-20 hidden animate-[hero-float-soft_7s_ease-in-out_infinite] items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 px-3.5 py-2 shadow-[0_16px_40px_-16px_rgba(16,24,40,0.35)] backdrop-blur lg:flex" style={{ animationDelay: "2s" }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface"><GoogleG size={15} /></span>
        <div>
          <p className="text-[12px] font-bold leading-tight">Reply posted to Google</p>
          <p className="text-[11px] leading-tight text-neutral-400">median first reply · 3.5 hrs</p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenApp(); } }}
        onClick={onOpenApp}
        className="group relative block w-full cursor-pointer overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white text-left shadow-[0_32px_80px_-32px_rgba(16,24,40,0.35)] transition-transform duration-300 hover:-translate-y-1.5 focus-visible:ring-2 focus-visible:ring-mint focus-visible:outline-none"
        aria-label="Open the client dashboard"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-surface px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-red-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-mint" />
          <span className="ml-2.5 rounded-lg bg-white px-2.5 py-0.5 font-mono text-[11.5px] text-neutral-400">app.sensiblee.in · reputation overview</span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-0.5 text-[10.5px] font-bold text-mint-deep sm:flex">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-deep opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint-deep" /></span>
            LIVE APP →
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 p-4 sm:p-5 lg:grid-cols-[1.25fr_1fr]">
          {/* left: health score ring + rating trend */}
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-100 bg-gradient-to-br from-brand to-brand-deep p-4 text-white sm:flex-row">
              <div className="relative h-[125px] w-[125px] shrink-0 sm:h-[135px] sm:w-[135px]">
                <svg viewBox="0 0 156 156" className="h-full w-full -rotate-90">
                  <circle cx="78" cy="78" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
                  <circle
                    cx="78" cy="78" r={R} fill="none" stroke="#88D6A0" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={mounted ? CIRC * (1 - 0.82) : CIRC}
                    style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) 0.3s" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[38px] font-black leading-none tracking-tight sm:text-[42px]">82</span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-mint">health</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold">Reputation Health Score</p>
                  <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10.5px] font-bold text-mint">▲ +3 this week</span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    { l: "Rating quality", w: 86 },
                    { l: "Sentiment mix", w: 74 },
                    { l: "Response performance", w: 92 },
                  ].map((d, i) => (
                    <div key={d.l} className="flex items-center gap-2">
                      <span className="w-[125px] shrink-0 text-[11.5px] font-semibold text-white/70">{d.l}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-mint to-mint/60"
                          style={{ width: mounted ? `${d.w}%` : "0%", transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${0.6 + i * 0.15}s` }}
                        />
                      </span>
                      <span className="w-7 shrink-0 text-right text-[11.5px] font-bold text-mint">{d.w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-surface p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-bold">Rating trend · 12 weeks</p>
                <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[10.5px] font-bold text-mint-deep">▲ climbing</span>
              </div>
              <svg viewBox="0 0 320 80" className="mt-1.5 h-[65px] w-full sm:h-[75px]" aria-hidden>
                <defs>
                  <linearGradient id="heroTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#88D6A0" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#88D6A0" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 62 C 30 58, 55 55, 80 52 C 110 48, 135 44, 160 38 C 190 32, 215 28, 240 21 C 270 14, 295 10, 320 6 L 320 80 L 0 80 Z"
                  fill="url(#heroTrendFill)" opacity={mounted ? 1 : 0} style={{ transition: "opacity 1.2s ease 1.4s" }}
                />
                <path
                  d="M0 62 C 30 58, 55 55, 80 52 C 110 48, 135 44, 160 38 C 190 32, 215 28, 240 21 C 270 14, 295 10, 320 6"
                  fill="none" stroke="#88D6A0" strokeWidth="3.5" strokeLinecap="round"
                  pathLength={100} strokeDasharray={100} strokeDashoffset={mounted ? 0 : 100}
                  style={{ transition: "stroke-dashoffset 1.9s cubic-bezier(0.4,0,0.2,1) 0.4s" }}
                />
                <path d="M0 70 C 40 66, 80 62, 120 58 C 170 52, 240 44, 320 34" fill="none" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 6" />
                <circle cx="320" cy="6" r="4.5" fill="#88D6A0" />
                <circle cx="320" cy="6" r="8" fill="#88D6A0" opacity="0.25" />
              </svg>
              <div className="mt-1 flex justify-between font-mono text-[11px] text-neutral-400">
                <span>W1 · 4.1</span><span>W6 · 4.4</span><span>W12 · 4.65</span>
              </div>
            </div>
          </div>

          {/* right: AI copilot draft + live review feed */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-amber-soft/40 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-deep">
                  <Sparkles size={13} /> AI draft ready
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-amber-deep">2★ · urgent</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-neutral-600">
                “Waited 40 minutes despite a reservation…”
              </p>
              <div className="relative mt-1.5 overflow-hidden rounded-xl bg-white/90 p-2.5 text-[12px] leading-relaxed text-neutral-600">
                <span className="relative z-10">“Rohit, we&apos;re truly sorry about the wait on Saturday — that is not the experience we intend…”</span>
                <span
                  className="pointer-events-none absolute inset-y-0 z-20 w-16 animate-[hero-shimmer_2.8s_ease-in-out_infinite]"
                  style={{ background: "linear-gradient(100deg, transparent 20%, rgba(254,243,199,0.75) 50%, transparent 80%)" }}
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="relative flex items-center">
                  <span className="absolute left-0 top-0 h-full w-full animate-[hero-ping_2.4s_ease-out_infinite] rounded-lg bg-mint" aria-hidden />
                  <span className="relative rounded-lg bg-mint px-2.5 py-1 text-[10.5px] font-bold text-brand-deep shadow-[0_2px_8px_rgba(136,214,160,0.5)]">Approve</span>
                </span>
                <span className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500">Edit</span>
                <span className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500">Regenerate</span>
              </div>
            </div>

            {/* live-sensed review feed — cycles automatically */}
            <div className="rounded-2xl border border-neutral-100 bg-surface p-3 sm:p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                  <span className="h-1.5 w-1.5 animate-[hero-pulse-dot_2.2s_ease-in-out_infinite] rounded-full bg-mint-deep" aria-hidden /> Live review feed
                </span>
                <span className="font-mono text-[10px] text-neutral-300">15-min cadence</span>
              </div>
              <div key={revIdx} className="mt-2 flex animate-[hero-toast-in_0.5s_ease-out_both] items-start gap-2.5" aria-live="polite">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10.5px] font-bold text-white">
                  {rev.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[13px] font-semibold">{rev.name}</p>
                    <StarRating value={rev.stars} size={10} />
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9.5px] font-bold", rev.tagCls)}>{rev.tag}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-neutral-500">“{rev.quote}”</p>
                </div>
              </div>
              <p className="mt-1.5 border-t border-neutral-100 pt-1.5 text-[10px] font-semibold text-mint-deep">
                ✓ {rev.ago} · sentiment, urgency &amp; topic scored on arrival
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
