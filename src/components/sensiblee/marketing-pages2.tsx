// Sensiblee marketing pages — About, Contact (inquiry / talk to us), Privacy, Terms
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCmsPage, useCmsContact } from "@/lib/cms-context";
import type { AboutContent, ContactContent, LegalContent } from "@/lib/cms-defaults2";
import { BrandLogo, StarRating, WhatsAppIcon } from "./brand";
import {
  cn, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Clock,
  Mail, BadgeCheck, Eye, Target, Phone, Check, Globe,
} from "./deps";
import { CtaBand } from "./marketing-pages";

type NavFn = (v: "home" | "features" | "how" | "pricing" | "about" | "contact" | "privacy" | "terms") => void;
type PageProps = { onNavigate: NavFn };

/* -------------------------------- About -------------------------------- */

// Live product snapshot card — static mock of the operator dashboard (brand illustration).
function HealthScoreCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/85 p-5 shadow-[0_24px_60px_-24px_rgba(16,24,40,0.35)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-400">Reputation health</p>
        <span className="flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-[10px] font-bold text-mint-deep">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-deep" /> LIVE
        </span>
      </div>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#E7E5DF" strokeWidth="11" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#88D6A0" strokeWidth="11" strokeLinecap="round" strokeDasharray="258 314" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[27px] font-bold leading-none text-brand">82</span>
            <span className="mt-0.5 text-[9.5px] font-bold uppercase tracking-wider text-neutral-400">/ 100</span>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-brand">Strong &amp; climbing</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-mint-deep">
            <ArrowRight size={11} className="-rotate-45" /> +6 points this quarter
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">3 locations · synced 4 min ago</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3.5">
        {[
          { l: "Average rating", v: "4.65", d: "+0.15" },
          { l: "Response rate", v: "92%", d: "+7 pts" },
          { l: "Reviews this month", v: "128", d: "+22%" },
          { l: "Urgent drafts waiting", v: "2", d: "replied < 1 hr" },
        ].map((r) => (
          <div key={r.l} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
            <span className="text-[11.5px] font-medium text-neutral-500">{r.l}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-bold text-brand">{r.v}</span>
              <span className="text-[10px] font-semibold text-mint-deep">{r.d}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutPage({ onNavigate }: PageProps) {
  const c = useCmsPage<AboutContent>("about");
  const VALUE_ICONS = [
    <Sparkles key="v-a" size={16} className="text-mint-deep" />,
    <CheckCircle2 key="v-b" size={16} className="text-mint-deep" />,
    <StarRating key="v-c" value={5} size={13} />,
  ];
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
        <div className="mx-auto max-w-3xl px-5 pb-8 pt-14 text-center lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            {c.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[52px]">
            {c.title} <span className="text-mint-deep">{c.accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">
            {c.description}
          </p>
        </div>
      </section>

      {/* Sensiblee, in brief — split copy + live product snapshot */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-[28px] border border-mint/30 bg-gradient-to-br from-mint-soft via-white to-amber-soft/50 p-6 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">
                <span className="h-1 w-1 rounded-full bg-mint-deep" /> {c.briefSection.eyebrow} <span className="h-1 w-1 rounded-full bg-mint-deep" />
              </span>
              <h2 className="mt-3.5 text-[24px] font-extrabold leading-[1.16] tracking-tight text-brand lg:text-[27px]">
                {c.briefSection.title}
              </h2>
              <div className="mt-4 max-w-xl space-y-3.5 text-[13.5px] leading-relaxed text-neutral-500">
                {c.brief.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
            <HealthScoreCard />
          </div>
        </div>
      </section>

      {/* Origin + Vision + Mission */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 lg:row-span-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-mint-deep">{c.originKicker}</span>
            <h3 className="mt-2 text-[17px] font-bold leading-snug tracking-tight text-brand">{c.originTitle}</h3>
            <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-500">{c.originBody}</p>
          </div>
          {[c.vision, c.mission].map((m) => (
            <div key={m.kicker} className="rounded-3xl border border-neutral-200/70 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-mint-deep">{m.kicker}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-soft text-mint-deep">
                  {m.kicker === "Our vision" ? <Eye size={16} /> : <Target size={16} />}
                </span>
              </div>
              <h3 className="mt-2 text-[16.5px] font-bold leading-snug tracking-tight text-brand">{m.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values — own section */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">
            <span className="h-1 w-1 rounded-full bg-mint-deep" /> {c.valuesSection.eyebrow} <span className="h-1 w-1 rounded-full bg-mint-deep" />
          </span>
          <h2 className="mt-3.5 text-[22px] font-extrabold leading-[1.16] tracking-tight text-brand lg:text-[25px]">{c.valuesSection.title}</h2>
          <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-neutral-500">{c.valuesSection.sub}</p>
        </div>
        <div className="mt-6 grid gap-3.5 sm:grid-cols-3">
          {c.values.map((v, i) => (
            <div key={v.title} className="rounded-2xl border border-neutral-200/70 bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-soft">{VALUE_ICONS[i % VALUE_ICONS.length]}</span>
              <p className="mt-3 text-[14.5px] font-bold">{v.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team — photo grid */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">
            <span className="h-1 w-1 rounded-full bg-mint-deep" /> {c.teamSection.eyebrow} <span className="h-1 w-1 rounded-full bg-mint-deep" />
          </span>
          <h2 className="mt-3.5 text-[22px] font-extrabold leading-[1.16] tracking-tight text-brand lg:text-[25px]">{c.teamSection.title}</h2>
          <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-neutral-500">{c.teamSection.sub}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.team.map((m) => (
            <div key={m.name} className="group overflow-hidden rounded-3xl border border-neutral-200/70 bg-white text-center">
              <span className="block aspect-[4/5] overflow-hidden bg-surface">
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mint-soft to-amber-soft/60 text-[38px] font-bold text-mint-deep">
                    {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                )}
              </span>
              <span className="block p-4">
                <span className="block text-[14.5px] font-bold text-brand">{m.name}</span>
                <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-wider text-mint-deep">{m.role}</span>
                <span className="mt-2 block text-[12px] leading-relaxed text-neutral-500">{m.bio}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Our story — dark editorial panel */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="relative overflow-hidden rounded-[28px] bg-brand px-6 py-10 text-white lg:px-12">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-mint/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-mint/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-mint/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint">{c.storyKicker}</span>
            </div>
            <p className="mt-6 max-w-3xl text-[26px] font-bold leading-[1.2] tracking-tight lg:text-[34px]">
              “{c.storyQuote}”
            </p>
            <div className="mt-8 grid gap-7 border-t border-white/10 pt-7 lg:grid-cols-3">
              {c.story.map((s) => (
                <div key={s.kicker}>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-mint">
                    <Check size={12} /> {s.kicker}
                  </p>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-white/65">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand note={c.ctaNote} />
    </main>
  );
}

/* ------------------------------- Contact ------------------------------- */

export function ContactPage({ onNavigate }: PageProps) {
  const c = useCmsPage<ContactContent>("contact");
  const contact = useCmsContact();
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", locations: "", volume: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please tell us your name";
    if (!form.business.trim()) e.business = "Business name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!/^[+\d][\d\s-]{8,14}$/.test(form.phone.trim())) e.phone = "Enter a valid phone (WhatsApp preferred)";
    if (!form.locations) e.locations = "Pick a location count";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    setApiError(null);
    try {
      const { api } = await import("@/lib/client");
      await api.post("/api/demo-requests", {
        name: form.name,
        company: form.business,
        email: form.email,
        phone: form.phone,
        outlets: form.locations,
        message: [form.volume && `Volume: ${form.volume}`, form.message].filter(Boolean).join(" · "),
      });
      setSent(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Could not submit — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-amber-soft/60 blur-3xl" />
        <div className="mx-auto max-w-3xl px-5 pb-6 pt-14 text-center lg:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
            {c.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[52px]">
            {c.title} <span className="text-mint-deep">{c.accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">
            {c.description}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-5 pb-12 lg:grid-cols-[1.5fr_1fr]">
        {/* form / success */}
        <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 lg:p-7">
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft">
                <CheckCircle2 size={32} className="text-mint-deep" />
              </span>
              <h2 className="mt-4 text-[20px] font-bold">Inquiry received, {form.name.split(" ")[0]}!</h2>
              <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">
                Thanks for reaching out — we&apos;ll WhatsApp you within one business day. For anything
                urgent, email <span className="font-semibold text-brand">hello@sensiblee.in</span> or message us on WhatsApp.
              </p>
              <div className="mt-6 flex gap-3">
                <Button className="h-11 rounded-2xl bg-brand text-[13px] text-white hover:bg-brand-deep" onClick={() => onNavigate("home")}>
                  Back to home
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl border-brand/20 text-[13px]" onClick={() => onNavigate("pricing")}>
                  View pricing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  <Input className="h-11 rounded-xl" placeholder="Anand Menon" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Business name" error={errors.business}>
                  <Input className="h-11 rounded-xl" placeholder="Spice Route Kitchen" value={form.business} onChange={(e) => set("business", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" error={errors.email}>
                  <Input className="h-11 rounded-xl" type="email" placeholder="you@business.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone (WhatsApp preferred)" error={errors.phone}>
                  <Input className="h-11 rounded-xl" placeholder="+91 93547 60585" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Locations" error={errors.locations}>
                  <div className="flex flex-wrap gap-1.5">
                    {c.locationOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => set("locations", o)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                          form.locations === o ? "border-mint bg-mint-soft text-mint-deep" : "border-neutral-200 text-neutral-500 hover:border-mint/50"
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Monthly review volume (optional)">
                  <div className="flex flex-wrap gap-1.5">
                    {c.volumeOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => set("volume", o)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                          form.volume === o ? "border-mint bg-mint-soft text-mint-deep" : "border-neutral-200 text-neutral-500 hover:border-mint/50"
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Anything specific you want to see? (optional)">
                <Textarea
                  className="min-h-[88px] rounded-xl"
                  placeholder="e.g. We run 3 outlets and reply late on weekends. Show us the AI drafts and WhatsApp bursts."
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </Field>
              {apiError && (
                <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">{apiError}</p>
              )}
              <Button className="h-12 w-full rounded-2xl bg-brand text-[14px] text-white hover:bg-brand-deep" onClick={submit} disabled={busy}>
                {busy ? "Sending…" : <>Send inquiry <ArrowRight size={15} className="ml-1.5" /></>}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-neutral-400">
                <ShieldCheck size={13} /> Your details stay private — see our privacy policy. We only reach out on WhatsApp or email.
              </p>
            </div>
          )}
        </div>

        {/* side info */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-brand p-6 text-white">
            <h3 className="text-[15px] font-bold">{c.sideTitle}</h3>
            <p className="mt-1 text-[12.5px] text-white/55">{c.sideSub}</p>
            <div className="mt-4 space-y-3">
              <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10">
                <WhatsAppIcon size={20} className="shrink-0 text-mint" />
                <div>
                  <p className="text-[12px] text-white/50">WhatsApp</p>
                  <p className="text-[13.5px] font-semibold">{c.whatsapp}</p>
                </div>
              </a>
              <a href={`mailto:${c.email}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10">
                <Mail size={20} className="shrink-0 text-mint" />
                <div>
                  <p className="text-[12px] text-white/50">Email</p>
                  <p className="text-[13.5px] font-semibold">{c.email}</p>
                </div>
              </a>
              <a href={contact.phoneHref} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10">
                <Phone size={20} className="shrink-0 text-mint" />
                <div>
                  <p className="text-[12px] text-white/50">Call</p>
                  <p className="text-[13.5px] font-semibold">{contact.phoneDisplay}</p>
                </div>
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200/70 bg-white p-6">
            <h3 className="flex items-center gap-2 text-[14.5px] font-bold">
              <Clock size={15} className="text-mint-deep" /> {c.nextTitle}
            </h3>
            <ol className="mt-3.5 space-y-3">
              {c.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-neutral-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-[10.5px] font-bold text-mint-deep">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-center gap-3 rounded-3xl border border-mint/30 bg-mint-soft p-5">
            <BadgeCheck size={22} className="shrink-0 text-mint-deep" />
            <p className="text-[12px] leading-relaxed text-mint-deep">
              {c.inquiryNote}
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-200/70 bg-white p-6">
            <h3 className="flex items-center gap-2 text-[14.5px] font-bold">
              <Clock size={15} className="text-mint-deep" /> {c.hoursTitle}
            </h3>
            <ul className="mt-3 space-y-2">
              {c.hoursLines.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-neutral-500">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-mint-deep" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] font-semibold text-neutral-600">{label}</Label>
      {children}
      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

/* ------------------------------- Legal shell ------------------------------- */

function LegalPage({ title, updated, sections, onNavigate }: {
  title: string; updated: string;
  sections: { h: string; body: string[] }[];
  onNavigate: NavFn;
}) {
  const contact = useCmsContact();
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-5 pb-14 pt-12">
        <h1 className="text-[36px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-neutral-400">
          <Globe size={13} /> Last updated: {updated} · Sensiblee Technologies Pvt. Ltd., Bengaluru
        </p>
        <div className="mt-8 space-y-7">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[18.5px] font-bold">{s.h}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2.5 text-[13.5px] leading-relaxed text-neutral-500">{p}</p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-surface p-5 text-[12.5px] text-neutral-500">
          Questions about this document? WhatsApp <span className="font-semibold text-brand">{contact.phoneDisplay}</span> or
          email <span className="font-semibold text-brand">{contact.email}</span> — we reply within one business day.
        </div>
      </div>
    </main>
  );
}

export function PrivacyPage({ onNavigate }: PageProps) {
  const c = useCmsPage<LegalContent>("privacy");
  return <LegalPage title="Privacy Policy" updated={c.updated} sections={c.sections} onNavigate={onNavigate} />;
}

export function TermsPage({ onNavigate }: PageProps) {
  const c = useCmsPage<LegalContent>("terms");
  return <LegalPage title="Terms of Service" updated={c.updated} sections={c.sections} onNavigate={onNavigate} />;
}
