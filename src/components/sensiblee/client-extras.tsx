// Sensiblee client dashboard extras — Onboarding wizard, Settings, Review drawer,
// Location drawer. All state persists to the real backend.
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData, inr } from "@/lib/client";
import { useSession } from "@/lib/session";
import { hasPerm } from "@/lib/permissions";
import { RolesPanel, MemberEditor, type RoleRow, type PermissionDef, type MemberRow } from "./team-roles";
import type { ReviewVM, LocationVM, LocationDetailVM, ReviewVM as RVM } from "@/lib/viewmodels";
import {
  cn,
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  KeyRound,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "./deps";
import { GoogleG, SentimentBadge, StarRating, StatusBadge, WhatsAppIcon } from "./brand";

/* =============================== Onboarding =============================== */

const STEPS = [
  { title: "Connect Google", hint: "OAuth, read-only" },
  { title: "Locations", hint: "profiles found" },
  { title: "WhatsApp sender", hint: "template + opt-in" },
  { title: "Brand voice", hint: "how you reply" },
  { title: "Invite team", hint: "roles & digest" },
];

const TONES = [
  { key: "warm", label: "Warm professional", sample: "Thank you so much, Meera! We're delighted the dosa hit the mark — the whole team will be thrilled. See you tomorrow, coffee's on us ☕" },
  { key: "formal", label: "Formal & precise", sample: "Dear Meera, thank you for your kind words regarding our filter coffee and service. We greatly value your patronage and look forward to welcoming you again." },
  { key: "playful", label: "Playful & bold", sample: "Meera!! You just made our week 🎉 Next ghee roast is on the house — we're holding your usual corner. Bring the whole crew." },
];

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { refresh, user } = useSession();
  const [step, setStep] = useState(0);
  const [tone, setTone] = useState("warm");
  const [greeting, setGreeting] = useState(user?.tenant?.settings.greeting || "");
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [waName, setWaName] = useState(user?.tenant?.name || "");
  const [waPhone, setWaPhone] = useState("+91 ");
  const [tempPasswords, setTempPasswords] = useState<{ email: string; tempPassword: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const locations = useApiData<{ locations: LocationVM[] }>("/api/locations");

  const addInvite = () => {
    const e = email.trim().toLowerCase();
    if (e && e.includes("@") && !invites.includes(e)) setInvites((v) => [...v, e]);
    setEmail("");
  };

  const finish = async () => {
    setSaving(true);
    try {
      for (const inv of invites) {
        const res = await api.post<{ invite: { email: string; tempPassword: string } }>("/api/team", { email: inv, role: "observer" });
        setTempPasswords((t) => [...t, res.invite]);
      }
      await api.patch("/api/settings", {
        profile: { greeting: greeting || undefined },
        ai: { tone },
        whatsapp: { name: waName || undefined, phone: waPhone || undefined },
        onboardingDone: true,
      });
      await refresh();
      toast({ title: "Workspace ready", description: "Your 15-minute sync is running — drafts land within the hour." });
      setStep(5);
    } catch (e) {
      toast({ title: "Setup incomplete", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-cream shadow-2xl">
        {/* Rail */}
        <div className="hidden w-56 shrink-0 flex-col border-r border-neutral-200/70 bg-white p-6 sm:flex">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">First-run setup</p>
          <p className="mt-1 text-[15px] font-bold">Sensiblee onboarding</p>
          <div className="mt-6 space-y-1">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex items-start gap-2.5 rounded-xl px-2 py-2">
                <span className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold",
                  i < step ? "bg-mint-deep text-white" : i === step ? "bg-brand text-white" : "bg-neutral-100 text-neutral-400"
                )}>
                  {i < step ? <Check size={11} /> : i + 1}
                </span>
                <div>
                  <p className={cn("text-[12.5px] font-semibold leading-tight", i === step ? "text-brand" : i < step ? "text-neutral-500" : "text-neutral-400")}>{s.title}</p>
                  <p className="text-[10.5px] text-neutral-400">{s.hint}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-xl bg-surface p-3">
            <p className="text-[11px] leading-relaxed text-neutral-400">Takes about 4 minutes. Everything here can be changed later in Settings.</p>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* close / skip — returns to the dashboard without saving */}
          <button
            onClick={onDone}
            aria-label="Close setup — you can finish it later from Settings"
            title="Close — finish later from Settings"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm ring-1 ring-neutral-200/70 transition-colors hover:bg-surface hover:text-brand"
          >
            <X size={16} />
          </button>

          {/* mobile progress */}
          {step < STEPS.length && (
            <div className="border-b border-neutral-200/70 px-5 py-3 sm:hidden">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                <span>Step {step + 1} of {STEPS.length}</span><span className="font-bold text-brand">{STEPS[step].title}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-mint-deep transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            {step === 0 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft text-mint-deep"><GoogleG size={22} /></span>
                <h2 className="mt-4 text-[20px] font-bold tracking-tight">Welcome to Sensiblee 👋</h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                  Let&apos;s connect your Google Business Profiles. We request <span className="font-semibold text-brand">read-only access</span> to
                  reviews and locations — we can never post without your approval, and you can revoke access at any time.
                </p>
                <div className="mt-5 space-y-2.5">
                  {["Read reviews & ratings", "Read location profiles & hours", "Post replies only after your approval"].map((p) => (
                    <div key={p} className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-neutral-200/70">
                      <CheckCircle2 size={15} className="text-mint-deep" />
                      <span className="text-[12.5px] text-neutral-600">{p}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-6 h-11 rounded-2xl bg-brand px-5 text-[13px] text-white hover:bg-brand-deep" onClick={() => setStep(1)}>
                  Continue with Google <ChevronRight size={15} className="ml-1" />
                </Button>
                <p className="mt-2.5 text-[11px] text-neutral-400">Demo OAuth — production uses live Google Business Profile OAuth.</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Your locations</h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                  {locations.data?.locations.length
                    ? "These profiles sync every 15 minutes. Historical reviews import immediately and are scored overnight."
                    : "Add the Google Business Profiles Sensiblee should monitor — historical reviews import immediately."}
                </p>
                <div className="mt-5 space-y-2.5">
                  {(locations.data?.locations || []).map((l) => (
                    <div key={l.id} className="flex w-full items-center gap-3 rounded-2xl border border-mint/60 bg-mint-soft/40 p-4 ring-1 ring-mint/40">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-mint-deep bg-mint-deep text-white">
                        <Check size={12} />
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface"><MapPin size={15} className="text-neutral-400" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-brand">{l.name}</p>
                        <p className="text-[11.5px] text-neutral-400">{l.area} · {l.reviews.toLocaleString("en-IN")} reviews · {l.rating}★ now</p>
                      </div>
                      <GoogleG size={15} className="shrink-0 opacity-50" />
                    </div>
                  ))}
                </div>
                <AddLocationInline onAdded={() => locations.reload()} />
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Set up your WhatsApp sender</h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                  Review requests go out on the WhatsApp Business Cloud API with pre-approved templates, quality throttling and per-guest opt-in records.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Business display name</span>
                    <input value={waName} onChange={(e) => setWaName(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none focus:border-mint/60" />
                  </label>
                  <label className="block">
                    <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Sender number</span>
                    <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none focus:border-mint/60" />
                  </label>
                </div>
                <div className="mt-4 rounded-2xl border border-mint/40 bg-mint-soft/30 p-4">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-mint-deep"><WhatsAppIcon size={14} /> Template preview · category MARKETING · auto-approved</p>
                  <div className="mt-2.5 rounded-xl bg-white p-3.5 text-[12.5px] leading-relaxed text-neutral-600 shadow-sm">
                    Hi {"{name}"}! Thank you for dining with us at {waName || "our business"} tonight. If you enjoyed your meal, a quick Google review means the world to our team — {"{review_link}"}
                  </div>
                  <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-mint-deep">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                    Guests can opt out by replying STOP — we record consent per contact and exclude opted-out numbers automatically.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">How should your replies sound?</h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                  The AI learns this voice from your past replies plus these choices. You can refine it any time in Settings → AI &amp; brand voice.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTone(t.key)}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                        tone === t.key ? "bg-brand text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200/80 hover:text-brand"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <label className="mt-5 block max-w-xs">
                  <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Sign replies as</span>
                  <input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder={user?.name.split(" ")[0] || "Your name"} className="mt-1.5 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none focus:border-mint/60" />
                </label>
                <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-soft/40 p-4">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-amber-deep"><Sparkles size={13} /> Sample reply in this voice</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-600">“{TONES.find((t) => t.key === tone)?.sample}” — {greeting || user?.name.split(" ")[0] || "Your name"}, {user?.tenant?.name}</p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Invite your team</h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                  Managers can draft and send; observers get the weekly digest only. Owners approve everything that touches Google.
                </p>
                <div className="mt-5 flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addInvite()}
                    placeholder="teammate@yourbusiness.in"
                    className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none focus:border-mint/60"
                  />
                  <Button variant="outline" className="h-10 rounded-xl px-3.5 text-[12.5px]" onClick={addInvite}>
                    <Plus size={14} className="mr-1" /> Add
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {invites.map((v) => (
                    <span key={v} className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3 pr-2 text-[12px] font-medium text-neutral-600 ring-1 ring-neutral-200/80">
                      {v}
                      <button onClick={() => setInvites((list) => list.filter((x) => x !== v))} className="rounded-full p-0.5 text-neutral-400 hover:bg-surface hover:text-brand" aria-label={`Remove ${v}`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {invites.length === 0 && <span className="text-[12px] text-neutral-400">No invites yet — you can add people later.</span>}
                </div>
                <div className="mt-5 rounded-2xl bg-brand p-4 text-white">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-white/40">Ready to go</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">
                    {locations.data?.locations.length || 0} location{(locations.data?.locations.length || 0) === 1 ? "" : "s"} · WhatsApp sender verified · {TONES.find((t) => t.key === tone)?.label} voice · {invites.length} teammate{invites.length === 1 ? "" : "s"} invited.
                  </p>
                </div>
              </div>
            )}

            {/* success */}
            {step === 5 && (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-mint-soft">
                  <Rocket size={26} className="text-mint-deep" />
                  <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-soft ring-2 ring-white" />
                  <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-mint ring-2 ring-white" />
                </span>
                <h2 className="mt-5 text-[22px] font-bold tracking-tight">You&apos;re live, {greeting || user?.name.split(" ")[0]} 🎉</h2>
                <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">
                  Your first 15-minute sync is running. Historical reviews will finish scoring within the hour, and the AI queue is already warming up.
                </p>
                {tempPasswords.length > 0 && (
                  <div className="mt-4 w-full max-w-sm rounded-2xl border border-amber-200/70 bg-amber-soft/40 p-3.5 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-deep">Teammate temp passwords — share privately</p>
                    {tempPasswords.map((t) => (
                      <p key={t.email} className="mt-1.5 font-mono text-[11.5px] text-brand">{t.email} · {t.tempPassword}</p>
                    ))}
                  </div>
                )}
                <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2.5">
                  {[
                    { v: String(locations.data?.locations.length || 0), l: "profiles live" },
                    { v: String((locations.data?.locations || []).reduce((a, l) => a + l.reviews, 0).toLocaleString("en-IN")), l: "reviews importing" },
                    { v: "48h", l: "to first campaign" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-white p-3.5 ring-1 ring-neutral-200/70">
                      <p className="text-[18px] font-bold text-brand">{s.v}</p>
                      <p className="mt-0.5 text-[10.5px] text-neutral-400">{s.l}</p>
                    </div>
                  ))}
                </div>
                <Button className="mt-6 h-11 rounded-2xl bg-mint-deep px-6 text-[13px] text-white hover:bg-mint-deep/90" onClick={onDone}>
                  Go to dashboard <ChevronRight size={15} className="ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* footer nav */}
          {step < 5 && (
            <div className="flex items-center justify-between border-t border-neutral-200/70 bg-white px-5 py-3.5 sm:px-7">
              <Button variant="ghost" className="h-9 rounded-xl text-[12.5px] text-neutral-500" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <span className="hidden text-[11.5px] text-neutral-400 sm:inline">{step + 1} / {STEPS.length}</span>
                <Button variant="ghost" className="h-9 rounded-xl text-[12.5px] text-neutral-500 hover:bg-surface" onClick={onDone} disabled={saving}>
                  Skip for now
                </Button>
                <Button className="h-9 rounded-xl bg-brand px-4.5 text-[12.5px] text-white hover:bg-brand-deep" onClick={() => (step === 4 ? finish() : setStep((s) => s + 1))} disabled={saving}>
                  {saving ? "Saving…" : step === 4 ? "Finish setup" : "Continue"} <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLocationInline({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", area: "" });
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/locations", form);
      toast({ title: "Profile connected", description: `${form.name} will sync within 15 minutes.` });
      setForm({ name: "", area: "" });
      setOpen(false);
      onAdded();
    } catch (e) {
      toast({ title: "Could not connect", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-3 text-[12px] font-semibold text-neutral-400 transition-colors hover:border-mint/60 hover:text-mint-deep">
        <Plus size={13} /> Connect another profile
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-mint/40 bg-white p-3.5">
      <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Profile name — e.g. Spice Route Whitefield" className="h-10 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3 text-[13px] outline-none focus:border-mint/60" />
      <input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="Area — e.g. Whitefield, Bengaluru" className="h-10 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3 text-[13px] outline-none focus:border-mint/60" />
      <div className="flex gap-2">
        <Button size="sm" className="h-9 flex-1 rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand-deep" onClick={add} disabled={busy}>
          {busy ? "Connecting…" : <><Check size={13} className="mr-1" /> Connect</>}
        </Button>
        <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px]" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ================================ Settings ================================ */

type SettingsPayload = {
  profile: { name: string; category: string; website: string; signature: string; greeting: string; whatsappName: string; whatsappPhone: string };
  ai: { tone: string; threshold: number; digestLanguage: string; brandVoice: string };
  notifs: { digest: boolean; negative: boolean; weekly: boolean; billing: boolean };
  locations: LocationVM[];
  team: { id: string; name: string; email: string; role: string; roleName: string | null; invitePending: boolean; initials: string }[];
  plan: { id?: string; name: string; monthlyInr: number; halfYearlyInr?: number; annualInr?: number; waQuota: number; locations: number; seats: number } | null;
  usage: { l: string; u: string; p: number; warn: boolean }[];
  billingCycle: string;
  payment: { provider: string; label: string; mode: string; status: string; accountRef: string; methodLabel: string } | null;
};

const PLAN_NAMES: Record<string, string> = { starter: "Starter", growth: "Growth", multi: "Scale" };

function cycleLabel(cycle: string): string {
  return cycle === "annual" ? "Annual" : cycle === "half_yearly" ? "Half-yearly" : "Monthly";
}

function cyclePrice(plan: SettingsPayload["plan"], cycle: string): string {
  if (!plan) return "—";
  const inrFmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (cycle === "annual") return `${inrFmt(plan.annualInr ?? 0)}/year`;
  if (cycle === "half_yearly") return `${inrFmt(plan.halfYearlyInr ?? 0)} / 6 months`;
  return `${inrFmt(plan.monthlyInr)}/month`;
}

function SectionCard({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white">
      <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-mint-deep">{icon}</span>
        <div>
          <h2 className="text-[14.5px] font-bold">{title}</h2>
          <p className="mt-0.5 text-[12px] text-neutral-400">{sub}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls = "h-10 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3 text-[13px] outline-none transition-colors focus:border-mint/60 focus:bg-white";

type AccountPayload = { account: { name: string; email: string; phone: string; role: string; lastLoginAt: string | null } };

// Personal profile + password — visible to every role (owner, managers, observers).
// Team members only see this block: their role governs everything else.
export function AccountSections() {
  const { toast } = useToast();
  const { user, refresh } = useSession();
  const account = useApiData<AccountPayload>("/api/account");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (account.data && !loaded) {
      const a = account.data.account;
      setProfile({ name: a.name, email: a.email, phone: a.phone });
      setLoaded(true);
    }
  }, [account.data, loaded]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/api/account", profile);
      await refresh();
      account.reload();
      toast({ title: "Profile updated", description: "Your name, email and mobile number are saved." });
    } catch (e) {
      toast({ title: "Could not update profile", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (pw.next.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (pw.next !== pw.confirm) {
      toast({ title: "Passwords don’t match", description: "Re-enter the new password confirmation.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/api/account/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed", description: "Use the new password at your next sign-in." });
    } catch (e) {
      toast({ title: "Could not change password", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const roleLabel = user?.role === "owner" ? "Business owner" : user?.role === "manager" ? "Manager" : user?.role === "observer" ? "Observer" : user?.role === "platform_admin" ? "Super admin" : user?.role?.replace("platform_", "Platform ") || "Member";

  return (
    <>
      <SectionCard icon={<Users size={16} />} title="Your profile" sub={`${roleLabel} · visible only to your team and Sensiblee support`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Mobile number"><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98xxx xxxxx" className={inputCls} /></Field>
          <Field label="Email (used for sign-in)"><input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="h-9 rounded-xl bg-brand px-4 text-[12.5px] text-white hover:bg-brand-deep" onClick={saveProfile} disabled={savingProfile || !loaded}>
            {savingProfile ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Check size={13} className="mr-1.5" />}
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={<KeyRound size={16} />} title="Sign-in & security" sub="Change your own password — other logins are unaffected">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" className={inputCls} /></Field>
          <Field label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="8+ characters" autoComplete="new-password" className={inputCls} /></Field>
          <Field label="Confirm new password"><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" className={inputCls} /></Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400"><ShieldCheck size={13} className="text-mint-deep" /> Passwords are stored salted &amp; hashed — never in plain text.</p>
          <Button size="sm" className="h-9 shrink-0 rounded-xl bg-brand px-4 text-[12.5px] text-white hover:bg-brand-deep" onClick={changePassword} disabled={savingPw || !pw.current || !pw.next || !pw.confirm}>
            {savingPw ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <ShieldCheck size={13} className="mr-1.5" />}
            {savingPw ? "Updating…" : "Update password"}
          </Button>
        </div>
      </SectionCard>
    </>
  );
}

export function SettingsView() {
  const { toast } = useToast();
  const { refresh, user } = useSession();
  const isOwner = (user?.role || "owner") === "owner";
  const settings = useApiData<SettingsPayload>("/api/settings");
  const billing = useApiData<{ plan: { id: string; name: string; monthlyInr: number } | null; invoices: { id: string; number: string; amount: number; status: string; date: string }[] }>("/api/billing");
  const rolesData = useApiData<{ roles: RoleRow[]; catalog: PermissionDef[] }>("/api/team/roles");
  const [form, setForm] = useState<SettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<{ email: string; role: string; roleId: string }>({ email: "", role: "observer", roleId: "" });
  const [planPicking, setPlanPicking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [busyMember, setBusyMember] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
  }, [settings.data, form]);

  if (settings.loading || !form) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface" />)}
      </div>
    );
  }

  // Team members (manager / observer) get a limited settings page: they can manage
  // their own personal info and password — everything else is governed by the owner.
  if (!isOwner) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            Your personal profile and sign-in. Workspace settings, team and billing are managed by the business owner.
          </p>
        </div>
        <div className="max-w-2xl space-y-5">
          <AccountSections />
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/api/settings", {
        profile: { name: form.profile.name, category: form.profile.category, website: form.profile.website, signature: form.profile.signature, greeting: form.profile.greeting },
        ai: { tone: form.ai.tone, threshold: form.ai.threshold, digestLanguage: form.ai.digestLanguage, brandVoice: form.ai.brandVoice },
        notifs: form.notifs,
      });
      await refresh();
      settings.reload();
      toast({ title: "Settings saved", description: "Voice, notifications and profile updated across the workspace." });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: string, role: string) => {
    try {
      await api.del(`/api/team/${id}`);
      const fresh = await api.get<SettingsPayload>("/api/settings");
      setForm((prev) => (prev ? { ...prev, team: fresh.team } : prev));
      settings.reload();
      toast({ title: "Seat removed" });
    } catch (e) {
      toast({ title: "Could not remove", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
    void role;
  };

  const canManageTeam = isOwner || hasPerm(user?.permissions, "team_manage");
  const customRoles = rolesData.data?.roles || [];
  const roleCatalog = rolesData.data?.catalog || [];

  const toMemberRow = (m: SettingsPayload["team"][number]): MemberRow => ({ id: m.id, name: m.name, email: m.email, role: m.role, roleName: m.roleName ?? null, invitePending: m.invitePending, initials: m.initials, locationIds: (m as { locationIds?: string[] }).locationIds || [] });

  const saveMember = async (id: string, payload: { name?: string; role?: string; roleId?: string | null; locationIds?: string[] }) => {
    setBusyMember(true);
    try {
      await api.patch(`/api/team/${id}`, payload);
      const fresh = await api.get<SettingsPayload>("/api/settings");
      setForm((prev) => (prev ? { ...prev, team: fresh.team } : prev));
      settings.reload();
      rolesData.reload();
      toast({ title: "Team member updated", description: "Name and role saved — their access changes immediately." });
      setEditingId(null);
    } catch (e) {
      toast({ title: "Could not update member", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyMember(false);
    }
  };

  const reinviteMember = async (id: string) => {
    try {
      const res = await api.post<{ invite: { email: string; tempPassword: string } }>(`/api/team/${id}`);
      toast({ title: "New invite generated", description: `${res.invite.email} · temp password: ${res.invite.tempPassword}` });
      settings.reload();
    } catch (e) {
      toast({ title: "Could not re-invite", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const sendInvite = async () => {
    setBusyMember(true);
    try {
      const res = await api.post<{ invite: { email: string; tempPassword: string } }>("/api/team", {
        email: invite.email,
        ...(invite.roleId ? { roleId: invite.roleId } : { role: invite.role }),
      });
      toast({ title: "Invite created", description: `${res.invite.email} · temp password: ${res.invite.tempPassword}` });
      setInvite({ email: "", role: "observer", roleId: "" });
      setInviteOpen(false);
      const fresh = await api.get<SettingsPayload>("/api/settings");
      setForm((prev) => (prev ? { ...prev, team: fresh.team } : prev));
      settings.reload();
      rolesData.reload();
    } catch (e) {
      toast({ title: "Invite failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyMember(false);
    }
  };

  const createRole = async (payload: { name: string; description: string; permissions: string[] }) => {
    try {
      await api.post("/api/team/roles", payload);
      rolesData.reload();
      toast({ title: "Role created", description: `${payload.name} is now available when you invite or edit teammates.` });
    } catch (e) {
      toast({ title: "Could not create role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const updateRole = async (id: string, payload: { name: string; description: string; permissions: string[] }) => {
    try {
      await api.put(`/api/team/roles/${id}`, payload);
      rolesData.reload();
      settings.reload();
      toast({ title: "Role updated", description: "Everyone on this role gets the new permissions immediately." });
    } catch (e) {
      toast({ title: "Could not update role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const deleteRole = async (role: RoleRow) => {
    try {
      await api.del(`/api/team/roles/${role.id}`);
      rolesData.reload();
      toast({ title: "Role deleted", description: `${role.name} removed.` });
    } catch (e) {
      toast({ title: "Could not delete role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const changePlan = async (planId: string) => {
    try {
      await api.post("/api/billing/change-plan", { planId });
      toast({ title: "Plan updated", description: "Prorated invoice created — billing reflects immediately." });
      setPlanPicking(false);
      settings.reload();
      billing.reload();
    } catch (e) {
      toast({ title: "Plan change failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13.5px] text-neutral-500">Your profile, business profile, brand voice, team and billing — everything in one place.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <AccountSections />

          <SectionCard icon={<Building2 size={16} />} title="Business profile" sub="Shown in replies, templates and the WhatsApp sender">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name"><input value={form.profile.name} onChange={(e) => setForm({ ...form, profile: { ...form.profile, name: e.target.value } })} className={inputCls} /></Field>
              <Field label="Category"><input value={form.profile.category} onChange={(e) => setForm({ ...form, profile: { ...form.profile, category: e.target.value } })} className={inputCls} /></Field>
              <Field label="Website"><input value={form.profile.website} onChange={(e) => setForm({ ...form, profile: { ...form.profile, website: e.target.value } })} className={inputCls} /></Field>
              <Field label="Reply signature">
                <input value={form.profile.signature} onChange={(e) => setForm({ ...form, profile: { ...form.profile, signature: e.target.value } })} className={inputCls} />
              </Field>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Connected Google profiles</p>
              {form.locations.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <GoogleG size={14} className="opacity-60" />
                    <div>
                      <p className="text-[12.5px] font-semibold text-brand">{l.name}</p>
                      <p className="text-[10.5px] text-neutral-400">{l.area}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={l.syncState} />
                    <span className="text-[11.5px] font-semibold text-neutral-500">{l.rating}★</span>
                  </div>
                </div>
              ))}
              <AddLocationInline onAdded={() => settings.reload()} />
            </div>
          </SectionCard>

          <SectionCard icon={<Sparkles size={16} />} title="AI & brand voice" sub="How drafts read before you ever see them">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Default tone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[["warm", "Warm professional"], ["formal", "Formal & precise"], ["playful", "Playful & bold"]].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, ai: { ...form.ai, tone: k } })}
                  className={cn("rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors", form.ai.tone === k ? "bg-brand text-white" : "bg-surface text-neutral-500 hover:text-brand")}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Field label="Brand voice notes">
                <input
                  value={form.ai.brandVoice || ""}
                  onChange={(e) => setForm({ ...form, ai: { ...form.ai, brandVoice: e.target.value } })}
                  placeholder="e.g. friendly but never slangy; always mention the dish; no exclamation marks"
                  className={inputCls}
                />
              </Field>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
                The AI drafts every reply in this voice — review, rating, location, brand voice, language and business type all shape the draft. You approve before anything posts.
              </p>
            </div>
            <div className="mt-5 rounded-xl bg-surface p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold">Auto-approve drafts at ≥ {form.ai.threshold}% confidence</p>
                <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[10px] font-bold text-mint-deep">{form.ai.threshold >= 90 ? "Safe" : form.ai.threshold >= 75 ? "Balanced" : "Aggressive"}</span>
              </div>
              <input
                type="range" min={50} max={100} step={5} value={form.ai.threshold}
                onChange={(e) => setForm({ ...form, ai: { ...form.ai, threshold: Number(e.target.value) } })}
                className="mt-2 w-full"
                style={{ accentColor: "#3f9163" }}
                aria-label="Auto-approval confidence threshold"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
                Drafts below this threshold always wait in your queue. 1–2★ reviews never auto-approve, regardless of confidence.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Digest language"><input value={form.ai.digestLanguage} onChange={(e) => setForm({ ...form, ai: { ...form.ai, digestLanguage: e.target.value } })} className={inputCls} /></Field>
              <Field label="AI draft budget">
                <input defaultValue={form.plan?.name === "Enterprise" ? "Unlimited · fair use" : `${form.plan?.name || "Plan"} quota`} readOnly className={cn(inputCls, "text-neutral-400")} />
              </Field>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard icon={<Bell size={16} />} title="Notifications" sub="Where Sensiblee finds you — WhatsApp and email only">
            <div className="space-y-1">
              {([
                ["digest", "Daily digest · 9:00 AM", "Health score, overnight reviews and queue status on WhatsApp"],
                ["negative", "Instant negative-review alert", "1–3★ reviews ping the owner group within 2 minutes"],
                ["weekly", "Weekly leadership summary", "Monday 10 AM — trends, staff mentions, keyword radar"],
                ["billing", "Billing & invoice emails", "Invoices, receipts and payment reminders"],
              ] as const).map(([key, title, desc]) => (
                <div key={key} className="flex items-start justify-between gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-surface">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-brand">{title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-neutral-400">{desc}</p>
                  </div>
                  <Switch checked={form.notifs[key]} onCheckedChange={(v) => setForm({ ...form, notifs: { ...form.notifs, [key]: v } })} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={<Users size={16} />} title="Team" sub={`${form.team.length} seat${form.team.length === 1 ? "" : "s"} used · ${form.plan?.name || ""} plan includes ${form.plan?.seats || 2}`}>
            <div className="space-y-2">
              {form.team.map((m) => {
                const roleText = m.role === "owner" ? "Owner" : m.roleName || (m.invitePending ? `${m.role} · invite sent` : m.role);
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3">
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[11.5px] font-bold text-white", m.invitePending ? "bg-neutral-300" : "bg-brand")}>{m.initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-brand">{m.name}</p>
                        <p className="truncate text-[11px] text-neutral-400">{m.email}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                        m.role === "owner" ? "bg-brand/5 text-brand" : m.roleName ? "bg-brand text-white" : m.invitePending ? "bg-amber-soft text-amber-deep" : "bg-mint-soft text-mint-deep"
                      )}>
                        {roleText}
                      </span>
                      {canManageTeam && m.role !== "owner" && (
                        <>
                          <button onClick={() => setEditingId(editingId === m.id ? null : m.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white hover:text-brand" aria-label={`Edit ${m.name}`}>
                            <Pencil size={13} />
                          </button>
                          {editingId !== m.id && (
                            <button onClick={() => removeMember(m.id, m.role)} className="rounded-lg p-1.5 text-neutral-300 hover:bg-white hover:text-red-500" aria-label={`Remove ${m.name}`}>
                              <X size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {canManageTeam && editingId === m.id && (
                      <MemberEditor
                        member={toMemberRow(m)}
                        presets={[["manager", "Manager — operate the workspace"], ["observer", "Observer — read-only"]]}
                        customRoles={customRoles}
                        locations={(form?.locations || []).map((l) => ({ id: l.id, name: l.name }))}
                        dark={false}
                        onSave={(payload) => saveMember(m.id, payload)}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {canManageTeam && (inviteOpen ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-mint/40 bg-white p-3.5">
                <input value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} placeholder="teammate@yourbusiness.in" className={inputCls} />
                <div className="flex flex-wrap gap-1.5">
                  {(["manager", "observer"] as const).map((r) => (
                    <button key={r} onClick={() => setInvite((i) => ({ ...i, role: r, roleId: "" }))}
                      className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize", !invite.roleId && invite.role === r ? "bg-brand text-white" : "bg-surface text-neutral-500", invite.roleId && "opacity-40")}>
                      {r}
                    </button>
                  ))}
                  {customRoles.map((r) => (
                    <button key={r.id} onClick={() => setInvite((i) => ({ ...i, roleId: i.roleId === r.id ? "" : r.id }))}
                      className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold", invite.roleId === r.id ? "bg-brand text-white" : "bg-mint-soft text-mint-deep hover:bg-mint-soft/70")}>
                      {r.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint-deep text-[12.5px] text-white hover:bg-mint-deep/90" onClick={sendInvite} disabled={busyMember || !invite.email.includes("@")}>
                    <UserPlus size={13} className="mr-1" /> Create invite
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px]" onClick={() => setInviteOpen(false)}>Cancel</Button>
                </div>
                <p className="text-[10.5px] leading-relaxed text-neutral-400">Production sends the invite over WhatsApp + email. Here you get a one-time temp password.</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-3 h-9 w-full rounded-xl text-[12.5px]" onClick={() => setInviteOpen(true)}>
                <UserPlus size={14} className="mr-1.5" /> Invite teammate
              </Button>
            ))}
            {canManageTeam && (
              <div className="mt-3">
                <button onClick={() => setRolesOpen(!rolesOpen)} className="flex w-full items-center justify-between rounded-xl bg-brand/5 px-3.5 py-2.5 text-left transition-colors hover:bg-brand/10">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-brand">
                    <ShieldCheck size={14} className="text-mint-deep" /> Roles &amp; permissions
                    <span className="text-[10.5px] font-bold text-neutral-400">{customRoles.length} custom role{customRoles.length === 1 ? "" : "s"}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400">{rolesOpen ? "Hide" : "Manage"}</span>
                </button>
                {rolesOpen && (
                  <div className="mt-2">
                    <RolesPanel
                      dark={false}
                      roles={customRoles}
                      catalog={roleCatalog}
                      onCreate={createRole}
                      onUpdate={updateRole}
                      onDelete={deleteRole}
                    />
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={<CreditCard size={16} />} title="Plan & billing" sub={`Billed ${cycleLabel(form.billingCycle)} · live usage meters`}>
            <div className="rounded-2xl bg-brand p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Current plan</p>
                  <p className="mt-0.5 text-[16px] font-bold">{form.plan?.name} · {cyclePrice(form.plan, form.billingCycle)}</p>
                </div>
                <span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-brand-deep">{cycleLabel(form.billingCycle)}</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {form.usage.map((b) => (
                  <div key={b.l}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/60">{b.l}</span>
                      <span className={cn("font-semibold", b.warn ? "text-amber-300" : "text-white/80")}>{b.u}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={cn("h-full rounded-full", b.warn ? "bg-amber-300" : "bg-mint")} style={{ width: `${b.p}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {form.usage.some((b) => b.warn) && (
                <p className="mt-3 text-[11px] leading-relaxed text-white/50">
                  A meter is above 85% — upgrade or add the pack to prevent throttling mid-campaign.
                </p>
              )}
              <div className="mt-3 flex items-start justify-between gap-3 border-t border-white/10 pt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Payment method</p>
                  {form.payment ? (
                    <>
                      <p className="mt-0.5 text-[12.5px] font-semibold text-white/85">
                        {form.payment.methodLabel} · {form.payment.mode.toUpperCase()} mode
                      </p>
                      {form.payment.accountRef && <p className="mt-0.5 font-mono text-[10.5px] text-white/40">{form.payment.accountRef}</p>}
                    </>
                  ) : (
                    <p className="mt-0.5 text-[12.5px] font-semibold text-white/70">No gateway provisioned yet</p>
                  )}
                </div>
                {form.payment && (
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", form.payment.status === "active" ? "bg-mint/20 text-mint" : "bg-amber-soft/20 text-amber-300")}>
                    {form.payment.status}
                  </span>
                )}
              </div>
              {!form.payment && (
                <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                  Your platform admin provisions a payment gateway from the System view — until then invoices are settled manually.
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2.5">
              {planPicking ? (
                <div className="flex w-full gap-2">
                  {(["starter", "growth", "multi"] as const).map((pid) => (
                    <Button key={pid} size="sm" variant="outline" className="h-9 flex-1 rounded-xl text-[11.5px]"
                      disabled={form.plan?.id === pid}
                      onClick={() => changePlan(pid)}>
                      {PLAN_NAMES[pid]}{form.plan?.id === pid ? " ✓" : ""}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button size="sm" className="h-9 flex-1 rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand-deep" onClick={() => setPlanPicking(true)}>
                  <TrendingUp size={13} className="mr-1.5" /> Manage plan
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl text-[12.5px]" onClick={() => setBillingOpen(true)}>
                <FileText size={13} className="mr-1.5" /> View invoices
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Owner extras — invoices, monthly report, weekly digest, AI metering, feature flags */}
      <div className="grid gap-5 lg:grid-cols-3">
        <MonthlyReportCard />
        <WeeklyDigestCard />
        <AiUsageCard />
        <ChannelsFlagsCard />
      </div>

      <BillingDialog open={billingOpen} onOpenChange={setBillingOpen} />

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" className="h-10 rounded-xl text-[12.5px] text-neutral-500" onClick={() => { setForm(null); settings.reload(); }}>
          Discard
        </Button>
        <Button className="h-10 rounded-xl bg-mint-deep px-5 text-[12.5px] text-white hover:bg-mint-deep/90" onClick={save} disabled={saving}>
          {saving ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Check size={14} className="mr-1.5" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ==================== Billing · reports · AI metering · flags ==================== */

type InvoiceListRow = { id: string; number: string; amount: number; status: string; date: string };
type InvoiceDetailPayload = {
  invoice: {
    id: string; number: string; status: string; method: string;
    periodStart: string; periodEnd: string; dueAt: string; paidAt: string | null;
    amountInr: number; taxPercent: number; gst: number; total: number;
  };
  plan: { id: string; billingCycle: string };
  business: { name: string; gstin: string | null; contactName: string; contactEmail: string };
};
type ReportPayload = {
  label: string;
  reviews: { total: number; avgRating: number; prevAvgRating: number | null; replyRate: number; replied: number; bySentiment: { positive: number; neutral: number; negative: number } };
  whatsapp: { sent: number; reviewsGenerated: number };
  ai: { drafts: number; tokens: number };
  invoice: { number: string; amountInr: number; taxPercent: number; gst: number; total: number; status: string } | null;
};
type AiUsagePayload = {
  usage: { month: string; events: number; tokens: number; byKind: { kind: string; events: number; tokens: number }[] };
  limit: number | null;
  limitLabel: string;
  usedDrafts: number;
  percent: number | null;
  blocked: boolean;
};
type FlagRow = { key: string; label: string; description: string; systemEnabled: boolean; optedIn: boolean; effective: boolean };

// Same-origin authenticated download — the session cookie rides along
function downloadFile(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function BillingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const billing = useApiData<{ invoices: InvoiceListRow[] }>(open ? "/api/billing" : null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useApiData<InvoiceDetailPayload>(detailId ? `/api/billing/invoices/${detailId}` : null);

  // Reset back to the list whenever the dialog closes
  const handleChange = (v: boolean) => {
    if (!v) setDetailId(null);
    onOpenChange(v);
  };

  const statusChip = (s: string) =>
    cn("inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize",
      s === "paid" ? "bg-mint-soft text-mint-deep" : s === "overdue" ? "bg-red-100 text-red-600" : s === "failed" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700");

  return (
    <Dialog open={open} onOpenChange={handleChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-neutral-200/70 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <FileText size={16} className="text-mint-deep" /> Billing &amp; invoices
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Every payment carries a GST invoice — open one for the tax breakup and PDF.
          </DialogDescription>
        </DialogHeader>

        {detailId && detail.data ? (
          <div className="space-y-4">
            <button onClick={() => setDetailId(null)} className="text-[12px] font-semibold text-mint-deep hover:underline">
              ← All invoices
            </button>
            <div className="rounded-2xl border border-neutral-200/70 bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[12px] font-semibold text-brand">{detail.data.invoice.number}</p>
                <span className={statusChip(detail.data.invoice.status)}>{detail.data.invoice.status}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-neutral-400">
                {new Date(detail.data.invoice.periodStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(detail.data.invoice.periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {detail.data.invoice.method}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-neutral-200/70 pt-3 text-[12.5px]">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal (exclusive of GST)</span>
                  <span>₹{detail.data.invoice.amountInr.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>GST @ {detail.data.invoice.taxPercent}%</span>
                  <span>₹{detail.data.invoice.gst.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-brand">
                  <span>Total</span>
                  <span>₹{detail.data.invoice.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
              {detail.data.business.gstin && (
                <p className="mt-2 text-[11px] text-neutral-400">Customer GSTIN {detail.data.business.gstin} · input credit eligible</p>
              )}
            </div>
            <Button
              className="h-10 w-full rounded-xl bg-mint-deep text-[12.5px] text-white hover:bg-mint-deep/90"
              onClick={() => {
                downloadFile(`/api/billing/invoices/${detail.data!.invoice.id}/pdf`);
                toast({ title: "Invoice PDF downloading", description: `${detail.data!.invoice.number} — GST breakup included.` });
              }}
            >
              <Download size={14} className="mr-1.5" /> Download invoice PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(billing.data?.invoices || []).map((inv) => (
              <button
                key={inv.id}
                onClick={() => setDetailId(inv.id)}
                className="flex w-full items-center justify-between rounded-xl bg-surface px-3.5 py-3 text-left transition-colors hover:bg-mint-soft/50"
              >
                <div>
                  <p className="font-mono text-[12px] font-semibold text-brand">{inv.number}</p>
                  <p className="text-[11px] text-neutral-400">{inv.date}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold">₹{inv.amount.toLocaleString("en-IN")}</span>
                  <span className={statusChip(inv.status)}>{inv.status}</span>
                  <ChevronRight size={14} className="text-neutral-300" />
                </div>
              </button>
            ))}
            {billing.data && billing.data.invoices.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-neutral-400">No invoices yet — your first one lands at the end of the billing period.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Weekly digest (doc §1I "Weekly and monthly reports") — 7-day rolling snapshot
// with the AI management summary.
function WeeklyDigestCard() {
  const weekly = useApiData<{
    label: string;
    reviews: { total: number; avgRating: number; negative: number; unanswered: number; replyRate: number };
    topComplaint: { keyword: string; count: number } | null;
    summary: string;
  }>("/api/reports/weekly");
  if (weekly.loading || !weekly.data) return <div className="h-72 animate-pulse rounded-2xl bg-surface" />;
  const w = weekly.data;
  return (
    <SectionCard icon={<CalendarDays size={16} />} title="Weekly digest" sub={w.label}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{w.reviews.total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">reviews</p>
        </div>
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{w.reviews.avgRating || "—"}<span className="text-[11px]">★</span></p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">avg rating</p>
        </div>
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{w.reviews.negative}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">negative</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-brand p-3.5 text-white">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-mint">AI management summary</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/80">{w.summary}</p>
      </div>
      {w.topComplaint && (
        <p className="mt-2.5 text-[11.5px] text-neutral-400">
          Top complaint this week: <span className="font-semibold text-red-500">{w.topComplaint.keyword}</span> ({w.topComplaint.count} mention{w.topComplaint.count === 1 ? "" : "s"})
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
        {w.reviews.unanswered} still unanswered · {w.reviews.replyRate}% reply rate — schedule this digest to email weekly from Settings → Notifications.
      </p>
    </SectionCard>
  );
}

function MonthlyReportCard() {
  const { toast } = useToast();
  const report = useApiData<ReportPayload>("/api/reports/monthly");
  if (report.loading || !report.data) return <div className="h-72 animate-pulse rounded-2xl bg-surface" />;
  const r = report.data;
  return (
    <SectionCard icon={<FileText size={16} />} title="Monthly PDF report" sub={`${r.label} · month in review`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{r.reviews.total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">reviews</p>
        </div>
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{r.reviews.avgRating || "—"}<span className="text-[11px]">★</span></p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">avg rating</p>
        </div>
        <div className="rounded-xl bg-surface px-2 py-3">
          <p className="text-[17px] font-bold text-brand">{r.reviews.replyRate}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">replied</p>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-neutral-400">
        {r.whatsapp.sent} WhatsApp requests sent · {r.whatsapp.reviewsGenerated} reviews generated · {r.ai.drafts} AI drafts
        {r.invoice ? ` · invoiced ₹${r.invoice.total.toLocaleString("en-IN")} incl. GST` : ""}
      </p>
      <Button
        className="mt-3 h-9 w-full rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand-deep"
        onClick={() => {
          downloadFile("/api/reports/monthly/pdf");
          toast({ title: "Monthly report downloading", description: `${r.label} — ratings, sentiment, WhatsApp funnel and AI usage as a PDF.` });
        }}
      >
        <Download size={13} className="mr-1.5" /> Download PDF
      </Button>
    </SectionCard>
  );
}

function AiUsageCard() {
  const { toast } = useToast();
  const usage = useApiData<AiUsagePayload>("/api/ai/usage");
  if (usage.loading || !usage.data) return <div className="h-72 animate-pulse rounded-2xl bg-surface" />;
  const u = usage.data;
  const pct = u.percent ?? 0;
  return (
    <SectionCard icon={<Sparkles size={16} />} title="AI usage" sub={`${u.usage.month} · quota ${u.limitLabel}`}>
      <div className="rounded-2xl bg-brand p-4 text-white">
        <div className="flex items-baseline justify-between">
          <p className="text-[20px] font-bold">{u.usedDrafts}<span className="text-[12px] font-semibold text-white/50"> / {u.limit === null ? "unlimited" : u.limit} drafts</span></p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", u.blocked ? "bg-red-400/20 text-red-300" : pct > 85 ? "bg-amber-300/20 text-amber-300" : "bg-mint/15 text-mint")}>
            {u.blocked ? "quota reached" : pct > 85 ? "near limit" : "healthy"}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={cn("h-full rounded-full", u.blocked ? "bg-red-400" : pct > 85 ? "bg-amber-300" : "bg-mint")} style={{ width: `${u.limit === null ? 0 : Math.max(3, pct)}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          {u.usage.events} metered events · {u.usage.tokens.toLocaleString("en-IN")} tokens this month
        </p>
      </div>
      <div className="mt-3 space-y-1.5">
        {u.usage.byKind.map((k) => (
          <div key={k.kind} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[12px]">
            <span className="font-semibold capitalize text-neutral-600">{k.kind === "draft" ? "AI drafts" : k.kind === "classify" ? "Sentiment triage" : k.kind}</span>
            <span className="text-neutral-400">{k.events} events · {k.tokens.toLocaleString("en-IN")} tok</span>
          </div>
        ))}
        {u.usage.byKind.length === 0 && <p className="py-2 text-[12px] text-neutral-400">No AI activity yet this month — drafts and classifications appear here.</p>}
      </div>
      <Button
        variant="outline"
        className="mt-3 h-9 w-full rounded-xl text-[12.5px]"
        onClick={() => {
          downloadFile("/api/ai/usage?format=csv");
          toast({ title: "CSV export downloading", description: "Raw metering events — import into Sheets or Excel." });
        }}
      >
        <FileSpreadsheet size={13} className="mr-1.5" /> Export usage CSV
      </Button>
    </SectionCard>
  );
}

function ChannelsFlagsCard() {
  const { toast } = useToast();
  const flags = useApiData<{ flags: FlagRow[] }>("/api/flags");
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (key: string, optedIn: boolean) => {
    setBusy(key);
    try {
      await api.patch("/api/flags", { key, optedIn });
      flags.reload();
      toast({
        title: optedIn ? "Feature switched on" : "Feature switched off",
        description: optedIn ? "Live for your workspace immediately." : "You can opt back in any time.",
      });
    } catch (e) {
      toast({ title: "Could not update", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (flags.loading || !flags.data) return <div className="h-72 animate-pulse rounded-2xl bg-surface" />;

  return (
    <SectionCard icon={<MessageCircle size={16} />} title="Channels &amp; features" sub="Opt in to features Sensiblee has switched on platform-wide">
      <div className="space-y-2.5">
        {flags.data.flags.map((f) => (
          <div key={f.key} className="rounded-xl border border-neutral-200/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-brand">
                  {f.key === "whatsapp_requests" && <WhatsAppIcon size={13} className="text-mint-deep" />}
                  {f.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">{f.description}</p>
              </div>
              <Switch
                checked={f.optedIn}
                disabled={!f.systemEnabled || busy === f.key}
                onCheckedChange={(v) => toggle(f.key, v)}
              />
            </div>
            {!f.systemEnabled && (
              <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-amber-600">
                <AlertTriangle size={11} /> Switched off by Sensiblee — contact support to join the waitlist
              </p>
            )}
            {f.systemEnabled && f.optedIn && (
              <p className="mt-1.5 text-[10.5px] font-semibold text-mint-deep">Live for your workspace</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-neutral-400">
        <ToggleLeft size={12} /> Platform switches live in the Sensiblee admin console — your opt-in is preserved when a feature is temporarily off.
      </p>
    </SectionCard>
  );
}

/* ============================== Review drawer ============================== */

function buildTimeline(r: ReviewVM) {
  return [
    { t: r.time, label: "Review received", desc: `Google · ${r.location} · ${r.stars}★`, icon: <GoogleG size={11} /> },
    { t: "moments later", label: "Classified", desc: `Sentiment: ${r.sentiment} · keywords extracted`, icon: <Sparkles size={11} /> },
    ...(r.status === "ai-draft"
      ? [{ t: "draft ready", label: "AI draft prepared", desc: `${Math.round((r.confidence ?? 0.9) * 100)}% confidence · awaiting approval`, icon: <Sparkles size={11} /> }]
      : []),
    ...(r.status === "replied"
      ? [{ t: "replied", label: "Reply published", desc: `Approved · visible on Google`, icon: <Check size={11} /> }]
      : []),
    ...(r.status === "awaiting"
      ? [{ t: "now", label: "Awaiting reply", desc: "24h SLA clock running — request a draft or reply manually", icon: <Bell size={11} /> }]
      : []),
  ];
}

export function ReviewDrawer({ review, onClose, onApprove, onDraft, busy }: {
  review: ReviewVM | null;
  onClose: () => void;
  onApprove: (r: ReviewVM, body: string) => void;
  onDraft: (r: ReviewVM) => void;
  busy: boolean;
}) {
  const { toast } = useToast();
  const open = review !== null;
  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        onClick={onClose}
        aria-label="Close review details"
        tabIndex={open ? 0 : -1}
        className={cn("absolute inset-0 bg-brand/40 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Review details"
      >
        {review && (
          <DrawerBody
            key={review.id}
            review={review}
            onClose={onClose}
            toast={toast}
            onApprove={onApprove}
            onDraft={onDraft}
            busy={busy}
          />
        )}
      </aside>
    </div>
  );
}

function DrawerBody({ review: r, onClose, toast, onApprove, onDraft, busy }: {
  review: ReviewVM;
  onClose: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  onApprove: (r: ReviewVM, body: string) => void;
  onDraft: (r: ReviewVM) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(r.internalNote || "");
  const [draftText, setDraftText] = useState(r.draft || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const timeline = buildTimeline(r);

  const saveNote = async () => {
    setNoteSaving(true);
    try {
      await api.post(`/api/reviews/${r.id}/note`, { note });
      toast({ title: "Note saved", description: "Attached to this review for the whole team." });
    } catch (e) {
      toast({ title: "Could not save note", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-neutral-200/60 bg-white px-5 py-3.5">
        <div>
          <p className="text-[13.5px] font-bold text-brand">Review details</p>
          <p className="font-mono text-[10.5px] text-neutral-400">{r.id.slice(0, 14)}… · via Google</p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-neutral-400 transition-colors hover:bg-surface hover:text-brand" aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* author card */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
              r.sentiment === "positive" ? "bg-mint-deep" : r.sentiment === "neutral" ? "bg-amber-500" : "bg-red-500"
            )}>{r.initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-bold text-brand">{r.author}</p>
                <StarRating value={r.stars} size={13} />
              </div>
              <p className="mt-0.5 text-[11.5px] text-neutral-400">{r.location} · {r.time} · Google review</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SentimentBadge sentiment={r.sentiment} />
                <StatusBadge status={r.status} />
              </div>
            </div>
          </div>
          <p className="mt-3.5 border-t border-neutral-100 pt-3.5 text-[13.5px] leading-relaxed text-neutral-600">{r.text}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-neutral-500">#{kw}</span>
            ))}
          </div>
        </div>

        {/* draft / reply */}
        {r.status === "ai-draft" && (
          <div className="rounded-2xl border border-mint/40 bg-mint-soft/30 p-4">
            <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-mint-deep">
              <span className="flex items-center gap-1.5"><Sparkles size={12} /> AI suggested reply</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px]">{Math.round((r.confidence ?? 0.9) * 100)}% confident</span>
            </p>
            <Textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} className="mt-2 min-h-[92px] rounded-xl border-mint/40 bg-white/80 text-[13px] leading-relaxed focus-visible:ring-mint/50" aria-label="AI draft reply" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="h-8 rounded-lg bg-mint-deep px-3 text-[11.5px] text-white hover:bg-mint-deep/90" disabled={busy} onClick={() => onApprove(r, draftText)}>
                {busy ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
                {busy ? "Posting…" : "Approve & post"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-[11.5px]" disabled={busy} onClick={() => onDraft(r)}>
                <Sparkles size={12} className="mr-1" /> {busy ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>
          </div>
        )}
        {r.reply && (
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Your published reply</p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">{r.reply}</p>
          </div>
        )}
        {r.status === "awaiting" && (
          <div className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4">
            <p className="text-[12.5px] font-semibold text-red-700">No reply yet — SLA breached soon</p>
            <Button size="sm" variant="outline" className="mt-2.5 h-8 rounded-lg bg-white px-3 text-[11.5px]" disabled={busy} onClick={() => onDraft(r)}>
              <Sparkles size={12} className="mr-1" /> {busy ? "Writing…" : "Draft a reply with AI"}
            </Button>
          </div>
        )}

        {/* internal note */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
          <p className="text-[12.5px] font-bold text-brand">Internal note</p>
          <p className="mt-0.5 text-[11px] text-neutral-400">Visible to your team only — never shown on Google.</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Spoke to the floor captain — Saturday staffing fix scheduled…"
            className="mt-2.5 min-h-[72px] rounded-xl border-neutral-200 bg-cream/60 text-[12.5px] focus-visible:ring-mint/50"
          />
          <Button size="sm" variant="outline" className="mt-2.5 h-8 rounded-lg px-3 text-[11.5px]" onClick={saveNote} disabled={noteSaving}>
            {noteSaving ? "Saving…" : "Save note"}
          </Button>
        </div>

        {/* timeline */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
          <p className="text-[12.5px] font-bold text-brand">Activity</p>
          <div className="mt-3 space-y-3.5">
            {timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint-soft text-mint-deep">{e.icon}</span>
                  {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                </div>
                <div className="pb-0.5">
                  <p className="text-[12.5px] font-semibold text-brand">{e.label}</p>
                  <p className="text-[11.5px] leading-relaxed text-neutral-400">{e.desc} · {e.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-2.5 border-t border-neutral-200/60 bg-white px-5 py-3.5">
        <Button variant="outline" size="sm" className="h-9 flex-1 rounded-xl text-[12px]"
          onClick={() => { if (r.googleUrl) window.open(r.googleUrl, "_blank"); else toast({ title: "Opening Google", description: "The original review opens in a new tab." }); }}>
          Open on Google
        </Button>
        <Button size="sm" className="h-9 flex-1 rounded-xl bg-brand text-[12px] text-white hover:bg-brand-deep" onClick={onClose}>
          Done
        </Button>
      </footer>
    </>
  );
}

/* ============================ Location drawer ============================= */

export function LocationDrawer({ location, onClose }: { location: LocationVM | null; onClose: () => void }) {
  const { toast } = useToast();
  const open = location !== null;
  const detail = useApiData<{ location: LocationVM; detail: { syncLog: { t: string; state: "ok" | "warn" | "error"; msg: string }[]; recentReviews: RVM[]; totalAtLocation: number } }>(
    location ? `/api/locations/${location.id}` : null
  );
  // branch drill-down (negative themes + staff mentions + monthly trend) — doc §5
  const health = useApiData<{ drill: { id: string; themes: { label: string; count: number; share: number }[]; staff: { name: string; mentions: number; positive: number; negative: number; avgSentiment: number }[]; monthly: { label: string; score: number }[] }[] }>(
    location ? "/api/health" : null
  );
  const [syncing, setSyncing] = useState(false);

  const syncNow = async () => {
    if (!location) return;
    setSyncing(true);
    try {
      const res = await api.post<{ newReviews: number }>(`/api/locations/${location.id}/sync`);
      toast({
        title: res.newReviews ? `${res.newReviews} new review${res.newReviews > 1 ? "s" : ""} pulled` : "Up to date",
        description: `${location.name} — ${res.newReviews ? "scored, drafts queued." : "no new reviews since the last cursor."}`,
      });
      detail.reload();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const l = detail.data?.location || location;
  const d = detail.data?.detail;
  const drill = health.data?.drill.find((x) => x.id === location?.id);

  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        onClick={onClose}
        aria-label="Close location details"
        tabIndex={open ? 0 : -1}
        className={cn("absolute inset-0 bg-brand/40 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Location details"
      >
        {l && (
          <>
            <header className="flex items-center justify-between border-b border-neutral-200/60 bg-white px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><GoogleG size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-brand">{l.name}</p>
                  <p className="truncate font-mono text-[10px] text-neutral-400">google.business/{l.code}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-neutral-400 transition-colors hover:bg-surface hover:text-brand" aria-label="Close">
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* hero stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-neutral-200/70 bg-white p-3.5 text-center">
                  <p className="text-[24px] font-bold leading-none text-brand">{l.rating}</p>
                  <StarRating value={l.rating} size={11} className="mt-1.5 justify-center" />
                  <p className={cn("mt-1 text-[10.5px] font-semibold", l.delta >= 0 ? "text-mint-deep" : "text-red-500")}>
                    {l.delta >= 0 ? "+" : ""}{l.delta} · 90d
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white p-3.5 text-center">
                  <p className="text-[24px] font-bold leading-none text-brand">{l.reviews.toLocaleString("en-IN")}</p>
                  <p className="mt-1.5 text-[10.5px] text-neutral-400">total reviews</p>
                  <p className="text-[10.5px] text-neutral-300">all time</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white p-3.5 text-center">
                  <p className="text-[24px] font-bold leading-none text-brand">{l.responseRate}%</p>
                  <p className="mt-1.5 text-[10.5px] text-neutral-400">response rate</p>
                  <p className="text-[10.5px] text-neutral-300">{l.avgResponse} avg</p>
                </div>
              </div>

              {/* health breakdown */}
              <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                <p className="text-[12.5px] font-bold text-brand">What guests talk about</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">Keyword-clustered health scores · trailing 90 days</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {l.health.map((h) => (
                    <div key={h.label}>
                      <div className="flex items-baseline justify-between text-[11.5px]">
                        <span className="truncate text-neutral-500">{h.label}</span>
                        <span className="font-bold text-brand">{h.score}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                        <div className={cn("h-full rounded-full", h.score >= 85 ? "bg-mint-deep" : h.score >= 70 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${h.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {l.health.some((h) => h.score < 70) && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-soft/50 p-2.5 text-[11px] leading-relaxed text-amber-deep">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    Scores below 70 feed the weekly digest — flagged for Saturday staffing review.
                  </p>
                )}
              </div>

              {/* branch drill-down: top problems + monthly trend (doc §5/§6 location screen) */}
              {drill && (
                <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                  <p className="text-[12.5px] font-bold text-brand">Top problems</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">share of complaints at this branch</p>
                  <div className="mt-3 space-y-2">
                    {drill.themes.length ? drill.themes.map((t) => (
                      <div key={t.label}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="text-neutral-500">{t.label}</span>
                          <span className="font-bold text-brand">{t.share}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                          <div className={cn("h-full rounded-full", t.share >= 30 ? "bg-red-400" : t.share >= 15 ? "bg-amber-400" : "bg-mint-deep/60")} style={{ width: `${t.share}%` }} />
                        </div>
                      </div>
                    )) : <p className="text-[11.5px] text-neutral-400">No complaint themes this period.</p>}
                  </div>

                  <p className="mt-4 text-[12.5px] font-bold text-brand">4-month trend</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    {drill.monthly.map((m) => (
                      <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10.5px] font-bold text-brand">{m.score || "–"}</span>
                        <div className="flex h-16 w-full items-end overflow-hidden rounded-lg bg-neutral-100">
                          <div className={cn("w-full rounded-lg", m.score >= 84 ? "bg-mint-deep" : m.score >= 70 ? "bg-amber-400" : m.score > 0 ? "bg-red-400" : "bg-neutral-200")} style={{ height: `${Math.max(6, m.score)}%` }} />
                        </div>
                        <span className="text-[10px] text-neutral-400">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* staff mentions — coaching intelligence, not employee scores (doc §7) */}
              {drill && drill.staff.length > 0 && (
                <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                  <p className="text-[12.5px] font-bold text-brand">Customer mentions</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">Coaching context — never an employee score</p>
                  <div className="mt-3 space-y-2">
                    {drill.staff.map((s) => (
                      <div key={s.name} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                        <div>
                          <p className="text-[12.5px] font-semibold text-brand">{s.name}</p>
                          <p className="text-[11px] text-neutral-400">{s.mentions} review{s.mentions === 1 ? "" : "s"} mention {s.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11.5px] font-semibold text-mint-deep">{s.positive} positive</p>
                          <p className="text-[11.5px] font-semibold text-red-500">{s.negative} negative</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* recent reviews */}
              <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-brand">Recent at this location</p>
                  <span className="text-[10.5px] font-semibold text-neutral-400">{d?.recentReviews.length ?? 0} of {d?.totalAtLocation ?? 0}</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {(d?.recentReviews || []).map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5 rounded-xl bg-cream/70 p-2.5">
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                        r.sentiment === "positive" ? "bg-mint-deep" : r.sentiment === "neutral" ? "bg-amber-500" : "bg-red-500"
                      )}>{r.initials}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[11.5px] font-semibold text-brand">{r.author}</p>
                          <StarRating value={r.stars} size={9} />
                        </div>
                        <p className="truncate text-[11px] text-neutral-400">{r.text}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                  {d && d.recentReviews.length === 0 && (
                    <p className="text-[11.5px] text-neutral-400">No reviews yet — connect the profile and sync to pull history.</p>
                  )}
                </div>
              </div>

              {/* sync log */}
              <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                <p className="text-[12.5px] font-bold text-brand">Sync log</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">Every pull from Google · newest first</p>
                <div className="mt-2.5 space-y-1.5">
                  {(d?.syncLog || []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl bg-surface px-3 py-2">
                      <span className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        s.state === "ok" ? "bg-mint-soft text-mint-deep" : s.state === "warn" ? "bg-amber-soft text-amber-deep" : "bg-red-50 text-red-500"
                      )}>
                        {s.state === "ok" ? <Check size={11} /> : <AlertTriangle size={11} />}
                      </span>
                      <p className="flex-1 text-[11.5px] leading-snug text-neutral-500">{s.msg}</p>
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-neutral-300">{s.t}</span>
                    </div>
                  ))}
                  {detail.loading && <div className="h-16 animate-pulse rounded-xl bg-surface" />}
                </div>
              </div>
            </div>

            <footer className="flex items-center gap-2.5 border-t border-neutral-200/60 bg-white px-5 py-3.5">
              <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint-deep text-[12px] text-white hover:bg-mint-deep/90" onClick={syncNow} disabled={syncing}>
                <RefreshCw size={12} className={cn("mr-1", syncing && "animate-spin")} /> {syncing ? "Syncing…" : "Sync now"}
              </Button>
              <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl text-[12px]"
                onClick={() => toast({ title: "Alert rules", description: `${l.name}: WhatsApp alerts on 1–2★, digest at 9 AM.` })}>
                <Bell size={12} className="mr-1" /> Alert rules
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

void Send;
