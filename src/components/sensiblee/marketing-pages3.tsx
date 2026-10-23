// Sensiblee marketing site — Customer stories + Security & trust pages
"use client";

import { Button } from "@/components/ui/button";
import { PageHero } from "./marketing-chrome";
import { CtaBand } from "./marketing-pages";
import { useCmsPage, useCmsPageTitle } from "@/lib/cms-context";
import type { StoriesContent, SecurityContent } from "@/lib/cms-defaults2";
import { GoogleG, StarRating, WhatsAppIcon } from "./brand";
import {
  cn,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Database,
  Eye,
  Fingerprint,
  Globe,
  Landmark,
  Lock,
  MapPin,
  Quote,
  ScrollText,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
} from "./deps";

type NavFn = (v: "home" | "features" | "how" | "pricing" | "stories" | "security" | "about" | "contact" | "privacy" | "terms") => void;

/* ------------------------------- Sitemap ------------------------------- */

const SITEMAP_GROUPS: { title: string; links: { label: string; desc: string; view: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", desc: "Monitor, request, reply and analyze — the full platform", view: "features" },
      { label: "How it works", desc: "From Google reviews to growth, in four calm steps", view: "how" },
      { label: "Pricing", desc: "Plans for single locations to multi-brand groups", view: "pricing" },
      { label: "Customer Stories", desc: "How teams turn feedback into a growth engine", view: "stories" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", desc: "Why we built Sensiblee — and what we believe", view: "about" },
      { label: "Blog", desc: "Guides and notes on reputation and guest experience", view: "blog" },
      { label: "Contact", desc: "Talk to the team — demos, questions, onboarding", view: "contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQs", desc: "Answers to the questions we hear most", view: "knowledge" },
      { label: "Submit a Ticket", desc: "Reach support — a human replies within a business day", view: "ticket" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", desc: "What we collect and how we protect it", view: "privacy" },
      { label: "Terms of service", desc: "The agreement between you and Sensiblee", view: "terms" },
      { label: "Security & Trust", desc: "Infrastructure, compliance and data practices", view: "security" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", desc: "Access your workspace dashboard", view: "login" },
      { label: "Try for Free", desc: "Start a 14-day trial — no card required", view: "signup" },
    ],
  },
];

export function SitemapPage({ onNavigate }: { onNavigate: (v: string) => void }) {
  const pageTitle = useCmsPageTitle();
  const groups = SITEMAP_GROUPS.map((g) => ({
    ...g,
    links: g.links.map((l) => ({ ...l, label: pageTitle(l.view, l.label) })),
  }));
  return (
    <main className="flex-1">
      <PageHero
        eyebrow="Sitemap"
        title="Every page on"
        accent="Sensiblee"
        description="A quiet index of everything on this site — product, company, support, legal and your account. Pick a destination and we'll take you straight there."
      />

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.title}
              className="flex flex-col rounded-3xl border border-neutral-200/70 bg-white p-6 transition-colors hover:border-mint/60"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">{g.title}</p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {g.links.map((l) => (
                  <li key={`${g.title}-${l.label}`}>
                    <button
                      onClick={() => onNavigate(l.view)}
                      className="group flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <span>
                        <span className="block text-[13.5px] font-semibold text-brand group-hover:text-mint-deep">
                          {l.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-neutral-500">{l.desc}</span>
                      </span>
                      <ArrowRight
                        size={15}
                        className="mt-1 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-mint-deep"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col justify-center rounded-3xl bg-brand p-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Ready when you are</p>
            <p className="mt-2 text-[15px] font-bold leading-snug">
              See how Sensiblee turns Google reviews into your most reliable growth engine.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button
                size="sm"
                className="h-10 rounded-xl bg-mint px-4 text-[13px] font-bold text-brand-deep hover:bg-mint/90"
                onClick={() => onNavigate("signup")}
              >
                Try for Free <ArrowRight size={14} className="ml-1" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-xl border-white/25 bg-transparent px-4 text-[13px] font-semibold text-white hover:bg-white/10 hover:text-white"
                onClick={() => onNavigate("contact")}
              >
                Talk to us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------------------------- Customer stories ---------------------------- */

export function StoriesPage({ onNavigate }: { onNavigate: NavFn }) {
  const c = useCmsPage<StoriesContent>("stories");
  const STORY_ICONS = [<StarRating key="s-a" value={5} size={12} />, <GoogleG key="s-b" size={14} />, <WhatsAppIcon key="s-c" size={14} className="text-mint-deep" />, <TrendingUp key="s-d" size={14} />];
  return (
    <main className="flex-1">
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.accent} description={c.description} />

      {/* Featured case study */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <article className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_10px_40px_-18px_rgba(16,24,40,0.18)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
            <div className="p-6 lg:p-9">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">Featured study</span>
                <span className="flex items-center gap-1 text-[11.5px] font-medium text-neutral-400"><MapPin size={12} /> {c.featured.since}</span>
              </div>
              <h2 className="mt-4 text-[28px] font-bold tracking-tight lg:text-[32px]">{c.featured.business}</h2>
              <p className="mt-1 text-[13px] text-neutral-400">{c.featured.place}</p>
              <Quote size={22} className="mt-5 text-mint" />
              <blockquote className="mt-2 text-[15px] leading-relaxed text-neutral-600">“{c.featured.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                  {c.featured.person.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <p className="text-[13px] font-bold">{c.featured.person}</p>
                  <p className="text-[11.5px] text-neutral-400">{c.featured.role}</p>
                </div>
              </figcaption>
            </div>
            <div className="border-t border-neutral-100 bg-surface p-6 lg:border-l lg:border-t-0 lg:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">The results · 90 days</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {c.featured.results.map((r, ri) => (
                  <div key={r.label} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                    <span className="text-mint-deep">{STORY_ICONS[ri % STORY_ICONS.length]}</span>
                    <p className="mt-2 text-[20px] font-bold tracking-tight text-brand">{r.metric}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-neutral-400">{r.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-brand p-4 text-white">
                <p className="text-[12px] font-bold uppercase tracking-wider text-white/40">Net effect</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">
                  Higher rating and fresher reviews pushed all three profiles into the top map-pack
                  results for their micro-markets — organic discovery the group used to pay ads for.
                </p>
              </div>
            </div>
          </div>

          {/* Challenge + steps */}
          <div className="grid border-t border-neutral-100 lg:grid-cols-2">
            <div className="p-6 lg:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">The challenge</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-600">{c.featured.challenge}</p>
            </div>
            <div className="border-t border-neutral-100 p-6 lg:border-l lg:border-t-0 lg:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">What they did</p>
              <ol className="mt-3 space-y-2.5">
                {c.featured.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-neutral-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-[10.5px] font-bold text-mint-deep">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </section>

      {/* Secondary stories */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {c.stories.map((s) => (
            <article key={s.business} className="flex flex-col rounded-3xl border border-neutral-200/70 bg-white p-6 lg:p-7">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-[17px] font-bold tracking-tight">{s.business}</h3>
                  <p className="mt-0.5 text-[12px] text-neutral-400">{s.place}</p>
                </div>
                <span className="shrink-0 rounded-full border border-mint/40 bg-mint-soft px-2.5 py-1 text-[10.5px] font-bold text-mint-deep">{s.plan}</span>
              </div>
              <blockquote className="mt-4 text-[13.5px] leading-relaxed text-neutral-600">“{s.quote}”</blockquote>
              <p className="mt-2.5 text-[12px] font-semibold text-neutral-500">{s.person} · {s.role}</p>
              <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-[12.5px] leading-relaxed text-neutral-500">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint-deep" /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-neutral-100 pt-4">
                {s.results.map((r) => (
                  <div key={r.label}>
                    <p className="text-[17px] font-bold tracking-tight text-brand">{r.metric}</p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-neutral-400">{r.label}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Aggregate strip */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-neutral-200/70 bg-white p-5 sm:grid-cols-4 lg:p-6">
          {c.aggregate.map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-[26px] font-bold tracking-tight text-brand">{s.v}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-neutral-400">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand note={c.ctaNote} />
    </main>
  );
}

/* ---------------------------- Security & trust ---------------------------- */

export function SecurityPage({ onNavigate }: { onNavigate: NavFn }) {
  const c = useCmsPage<SecurityContent>("security");
  const PILLAR_ICONS = [<Lock key="w-a" size={17} />, <Database key="w-b" size={17} />, <Fingerprint key="w-c" size={17} />, <Server key="w-d" size={17} />];
  const COMPLIANCE_ICONS = [<GoogleG key="c-a" size={16} />, <WhatsAppIcon key="c-b" size={16} className="text-mint-deep" />, <Landmark key="c-c" size={16} />, <ScrollText key="c-d" size={16} />, <Eye key="c-e" size={16} />, <Globe key="c-f" size={16} />];
  return (
    <main className="flex-1">
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.accent} description={c.description} />

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {c.pillars.map((p, i) => (
            <div key={p.title} className="card-lift rounded-2xl border border-neutral-200/70 bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-soft text-mint-deep">{PILLAR_ICONS[i % PILLAR_ICONS.length]}</span>
              <h3 className="mt-3.5 text-[15px] font-bold">{p.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 lg:p-8">
          <h2 className="text-[24px] font-bold tracking-tight">Platform compliance, in plain language</h2>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-neutral-500">
            Three rulebooks govern what we do — India's Digital Personal Data Protection Act and CERT-In directives, Google's review APIs, and Meta's WhatsApp policies, with responsible-AI guardrails on top.
            We treat all of them as product requirements, not legal fine print.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {c.compliance.map((cm, i) => (
              <div key={cm.title} className="rounded-2xl border border-neutral-200/70 bg-surface p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">{COMPLIANCE_ICONS[i % COMPLIANCE_ICONS.length]}</span>
                  <h3 className="text-[14px] font-bold">{cm.title}</h3>
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-500">{cm.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subprocessors */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-6 py-5">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">Subprocessors</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-400">Every third party that touches your data, and why.</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-[11px] font-bold text-mint-deep">
              <ShieldCheck size={13} /> {c.subprocessors.length} subprocessors · notified changes
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-surface/60 text-[11px] uppercase tracking-wider text-neutral-400">
                  <th className="px-6 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Data shared</th>
                  <th className="px-6 py-3 font-semibold">Region</th>
                </tr>
              </thead>
              <tbody>
                {c.subprocessors.map((s) => (
                  <tr key={s.name} className="border-b border-neutral-50 last:border-0">
                    <td className="px-6 py-3.5 font-semibold text-brand">{s.name}</td>
                    <td className="px-4 py-3.5 text-neutral-500">{s.role}</td>
                    <td className="px-4 py-3.5 text-neutral-500">{s.data}</td>
                    <td className="px-6 py-3.5 text-neutral-400">{s.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SLA + practices */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl bg-brand p-6 text-white lg:p-8">
            <h2 className="text-[20px] font-bold tracking-tight">Operational commitments</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {c.sla.map((s) => (
                <div key={s.v} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-[22px] font-bold tracking-tight text-mint">{s.k}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-white/60">{s.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-white/45">
              Status page with incident history ships with Phase 2. In the meantime, incidents are
              announced on your WhatsApp digest within 30 minutes of confirmation.
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 lg:p-8">
            <h2 className="flex items-center gap-2 text-[20px] font-bold tracking-tight">
              <Users size={17} className="text-mint-deep" /> Security practices
            </h2>
            <ul className="mt-4 space-y-3">
              {c.practices.map((p) => (
                <li key={p} className="flex gap-2.5 text-[13px] leading-relaxed text-neutral-600">
                  <BadgeCheck size={15} className="mt-0.5 shrink-0 text-mint-deep" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-soft/50 p-3.5 text-[12px] leading-relaxed text-amber-deep ring-1 ring-amber-200/70">
              <Globe size={15} className="shrink-0" />
              Questions about data handling? Write to security@sensiblee.in — a human replies within one business day.
            </div>
          </div>
        </div>
      </section>

      <CtaBand note={c.ctaNote} />
    </main>
  );
}
