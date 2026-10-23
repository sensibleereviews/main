// Sensiblee guest touchpoint — the page a guest lands on after scanning a table-tent QR
// or tapping a WhatsApp link. Standalone when opened via /g/<code> (real guests);
// prototype mode (explainer rail) when previewed from the marketing site.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, useApiData } from "@/lib/client";
import {
  cn,
  Check,
  CheckCircle2,
  ChevronLeft,
  Fingerprint,
  Frown,
  Meh,
  ShieldCheck,
  Smile,
  Smartphone,
  Star,
} from "./deps";
import { GoogleG, BrandMark, WhatsAppIcon } from "./brand";
import { QrPattern } from "./widgets";

type Step = "mood" | "rate" | "feedback" | "thanks";
type GuestInfo = { code: string; name: string; area: string; business: string; initials: string; googleReviewUrl: string | null };

export function GuestSurface({ code, standalone }: { code: string; standalone: boolean }) {
  const info = useApiData<{ location: GuestInfo }>(`/api/guest/${code}`);
  const loc = info.data?.location;
  const [protoKey, setProtoKey] = useState(0); // remount flow on replay

  if (info.loading || (!loc && !info.error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mint border-t-transparent" />
      </div>
    );
  }

  if (info.error || !loc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream px-5 text-center text-brand">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-soft text-amber-deep"><Frown size={26} /></span>
        <h1 className="text-[20px] font-bold">This QR code isn&apos;t active</h1>
        <p className="max-w-xs text-[13px] text-neutral-500">
          The link may have expired or the location may have been moved. Please ask the staff for help.
        </p>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="rounded-[44px] border-[10px] border-brand bg-brand p-0 shadow-[0_32px_80px_-28px_rgba(16,24,40,0.55)]">
            <div className="relative overflow-hidden rounded-[34px] bg-white">
              <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-brand/90" />
              <GuestFlow key={protoKey} location={loc} onReplay={() => setProtoKey((k) => k + 1)} />
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-neutral-300">
            Powered by <BrandMark size={14} />
          </p>
        </div>
      </div>
    );
  }

  // Prototype mode — explainer rail + phone frame (opened from the marketing site)
  return (
    <div className="min-h-screen bg-cream text-brand">
      <div className="flex items-center justify-between border-b border-neutral-200/60 bg-white/70 px-4 py-2.5 backdrop-blur">
        <a
          href="/"
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold text-neutral-500 transition-colors hover:bg-surface hover:text-brand"
        >
          <ChevronLeft size={14} /> Back to site
        </a>
        <span className="rounded-lg bg-surface px-3 py-1 font-mono text-[11px] text-neutral-400">/g/{loc.code}</span>
        <span className="hidden rounded-full bg-mint-soft px-2.5 py-1 text-[10.5px] font-bold text-mint-deep sm:inline">GUEST SURFACE</span>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-5 py-8 lg:grid-cols-[1fr_420px] lg:py-12">
        <ExplainerRail code={loc.code} />
        <div className="mx-auto w-full max-w-[400px]">
          <div className="rounded-[44px] border-[10px] border-brand bg-brand p-0 shadow-[0_32px_80px_-28px_rgba(16,24,40,0.55)]">
            <div className="relative overflow-hidden rounded-[34px] bg-white">
              <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-brand/90" />
              <GuestFlow key={protoKey} location={loc} onReplay={() => setProtoKey((k) => k + 1)} />
            </div>
          </div>
          <p className="mt-3 text-center text-[11.5px] text-neutral-400">
            Interactive — tap a mood, pick stars, submit the private note. Feedback lands in the live database.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- explainer rail ----------------------------- */

function ExplainerRail({ code }: { code: string }) {
  return (
    <div className="hidden lg:block">
      <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
        <Smartphone size={13} /> The guest never sees a login
      </span>
      <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight">
        One scan between a happy guest<br />and a <span className="text-mint-deep">five-star public proof</span>.
      </h1>
      <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-neutral-500">
        Table tents carry a branded QR. Guests tap a mood, and Sensiblee routes them in
        two taps — delighted guests to Google, disappointed guests to a private note that
        reaches the manager before they reach a review site.
      </p>

      <div className="mt-8 grid max-w-lg gap-3">
        {[
          { n: "1", t: "Scan the table tent", d: "No app install, no signup — opens instantly in the phone's browser." },
          { n: "2", t: "Tap a mood", d: "One honest tap. The flow adapts: praise goes public, problems go private." },
          { n: "3", t: "Done in under 20 seconds", d: "Google hand-off with the star pre-selected, or a private note to the owner." },
        ].map((s) => (
          <div key={s.n} className="flex gap-3.5 rounded-2xl border border-neutral-200/70 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-[13px] font-bold text-white">{s.n}</span>
            <div>
              <p className="text-[13.5px] font-bold">{s.t}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* table tent mock */}
      <div className="mt-8 flex max-w-lg items-center gap-5 rounded-3xl border border-neutral-200/70 bg-surface p-5">
        <div className="relative flex h-[150px] w-[128px] shrink-0 items-center justify-center rounded-b-xl rounded-t-[42px] border border-neutral-200 bg-white shadow-[0_18px_40px_-18px_rgba(16,24,40,0.35)]">
          <div className="absolute left-1/2 top-[7px] h-1 w-10 -translate-x-1/2 rounded-full bg-neutral-200" />
          <div className="text-center">
            <QrPattern size={86} seed={11} />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">rate us</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold">Table tent · 40×40 mm print</p>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
            Each location gets its own QR so every request and review maps to the right branch automatically.
            Live code: <span className="font-mono text-[11px] text-mint-deep">/g/{code}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500 ring-1 ring-neutral-200"><ShieldCheck size={11} className="text-mint-deep" /> no PII on QR</span>
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500 ring-1 ring-neutral-200"><Fingerprint size={11} className="text-mint-deep" /> consent-first</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- flow ---------------------------------- */

function GuestFlow({ location, onReplay }: { location: GuestInfo; onReplay: () => void }) {
  const [step, setStep] = useState<Step>("mood");
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendFeedback = async (mood: "smile" | "meh" | "frown", rating?: number, text?: string) => {
    setSending(true);
    setErr(null);
    try {
      await api.post("/api/guest/feedback", {
        code: location.code, mood, rating, text,
        optedIn: optIn && !!phone.trim() ? true : optIn && mood !== "frown",
        phone: phone.trim() || undefined,
      });
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send — please try again.");
      return false;
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setStep("mood"); setStars(5); setNote(""); setPhone(""); setOptIn(true); onReplay(); };

  return (
    <div className="flex min-h-[640px] flex-col">
      {/* business header */}
      <div className="bg-brand px-6 pb-5 pt-9 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-[17px] font-black text-brand-deep">{location.initials}</div>
        <p className="mt-2.5 text-[15.5px] font-bold">{location.business}</p>
        <p className="text-[11px] text-white/50">{location.area}</p>
      </div>

      <div className="flex flex-1 flex-col px-6 py-6">
        {step === "mood" && <MoodStep onPick={(mood) => setStep(mood === "happy" ? "rate" : "feedback")} />}
        {step === "rate" && (
          <RateStep
            stars={stars} setStars={setStars}
            onBack={() => setStep("mood")}
            onPosted={async () => {
              const okDone = await sendFeedback("smile", stars);
              if (okDone && location.googleReviewUrl) window.open(location.googleReviewUrl, "_blank");
              if (okDone) setStep("thanks");
            }}
            onDirectGoogle={async () => {
              const okDone = await sendFeedback("meh", stars);
              if (okDone && location.googleReviewUrl) window.open(location.googleReviewUrl, "_blank");
              if (okDone) setStep("thanks");
            }}
            onFeedbackRoute={() => setStep("feedback")}
            sending={sending}
          />
        )}
        {step === "feedback" && (
          <FeedbackStep
            note={note} setNote={setNote} phone={phone} setPhone={setPhone}
            googleReviewUrl={location.googleReviewUrl}
            onSent={async () => {
              const okDone = await sendFeedback(stars <= 2 ? "frown" : "meh", stars, note);
              if (okDone) setStep("thanks");
            }}
            onBack={() => setStep("mood")}
            sending={sending}
          />
        )}
        {step === "thanks" && <ThanksStep optIn={optIn} setOptIn={setOptIn} onAgain={reset} business={location.business} />}
        {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-[12px] font-medium text-red-600">{err}</p>}
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-neutral-100 py-3 text-[10px] font-semibold text-neutral-300">
        Powered by <BrandMark size={14} />
      </div>
    </div>
  );
}

/* --------------------------------- steps --------------------------------- */

function MoodStep({ onPick }: { onPick: (mood: "happy" | "unhappy") => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (mood: "happy" | "unhappy", id: string) => {
    setPicked(id);
    setTimeout(() => onPick(mood), 380);
  };
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="text-[20px] font-bold leading-snug">How was your visit tonight?</h2>
      <p className="mt-1.5 text-[12.5px] text-neutral-400">One honest tap — takes 20 seconds.</p>
      <div className="mt-7 grid w-full grid-cols-3 gap-3">
        {[
          { id: "sad", icon: <Frown size={30} />, label: "Not great", mood: "unhappy" as const, cls: "text-red-400 hover:border-red-300 hover:bg-red-50/50" },
          { id: "ok", icon: <Meh size={30} />, label: "It was okay", mood: "unhappy" as const, cls: "text-amber-500 hover:border-amber-300 hover:bg-amber-soft/40" },
          { id: "loved", icon: <Smile size={30} />, label: "Loved it!", mood: "happy" as const, cls: "text-mint-deep hover:border-mint hover:bg-mint-soft/40" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => pick(m.mood, m.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-3xl border-2 border-neutral-100 px-2 py-5 transition-all active:scale-95",
              picked === m.id ? "border-mint bg-mint-soft/40" : m.cls
            )}
          >
            {m.icon}
            <span className="text-[11px] font-bold text-neutral-500">{m.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-7 flex items-center gap-1.5 text-[10.5px] text-neutral-300">
        <ShieldCheck size={12} /> Your tap is anonymous unless you choose to share.
      </p>
    </div>
  );
}

function RateStep({ stars, setStars, onPosted, onDirectGoogle, onFeedbackRoute, onBack, sending }: {
  stars: number; setStars: (n: number) => void; onPosted: () => void; onDirectGoogle: () => void; onFeedbackRoute: () => void; onBack: () => void; sending: boolean;
}) {
  const isHighRating = stars >= 4;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors", isHighRating ? "bg-mint-soft text-mint-deep" : "bg-amber-soft text-amber-deep")}>
        {isHighRating ? <Smile size={24} /> : <Meh size={24} />}
      </span>
      <h2 className="mt-3 text-[20px] font-bold leading-snug">
        {isHighRating ? "Wonderful! Mind telling Google?" : "How can we make this better?"}
      </h2>
      <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-neutral-400">
        {isHighRating
          ? "Public reviews keep our team smiling. We'll take you straight to our Google profile."
          : "We take customer experience seriously. Tell our branch manager privately so we can resolve this right away."}
      </p>
      <div className="mt-5 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="rounded-lg p-1 transition-transform active:scale-90">
            <Star size={30} className={n <= stars ? "fill-amber-400 text-amber-400" : "text-neutral-200"} />
          </button>
        ))}
      </div>
      {isHighRating ? (
        <Button className="mt-6 h-12 w-full rounded-2xl bg-brand text-[13.5px] font-semibold text-white hover:bg-brand-deep" onClick={onPosted} disabled={sending}>
          {sending ? "Sending…" : <><GoogleG size={15} className="mr-2" /> Post {stars}-star review on Google</>}
        </Button>
      ) : (
        <div className="mt-6 w-full space-y-2">
          <Button className="h-12 w-full rounded-2xl bg-amber-500 text-[13.5px] font-semibold text-white hover:bg-amber-600" onClick={onFeedbackRoute}>
            Send Private Feedback to Manager &rarr;
          </Button>
          <button type="button" onClick={onDirectGoogle} className="text-[11.5px] text-neutral-400 hover:text-neutral-600 underline">
            I still want to post publicly on Google
          </button>
        </div>
      )}
      <button onClick={onBack} className="mt-3 text-[11.5px] font-semibold text-neutral-400 hover:text-neutral-600">
        Back
      </button>
    </div>
  );
}

function FeedbackStep({ note, setNote, phone, setPhone, googleReviewUrl, onSent, onBack, sending }: {
  note: string; setNote: (v: string) => void; phone: string; setPhone: (v: string) => void;
  googleReviewUrl?: string | null; onSent: () => void; onBack: () => void; sending: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-soft text-amber-deep"><Meh size={24} /></span>
      <h2 className="mt-3 text-center text-[20px] font-bold leading-snug">Tell us what went wrong</h2>
      <p className="mx-auto mt-1.5 max-w-[250px] text-center text-[12.5px] leading-relaxed text-neutral-400">
        This goes <span className="font-semibold text-amber-deep">straight to the manager&apos;s phone</span> — not to the internet.
      </p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What happened? Which dish, which moment…"
        className="mt-4 min-h-[96px] resize-none rounded-2xl border-neutral-200 bg-surface text-[13px] focus-visible:ring-mint"
      />
      <div className="mt-3 rounded-2xl bg-surface p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-mint-deep ring-1 ring-neutral-200"><WhatsAppIcon size={14} /></span>
          <div className="flex-1">
            <p className="text-[11.5px] font-bold">Get a follow-up</p>
            <p className="text-[10px] text-neutral-400">optional · manager replies within 24h</p>
          </div>
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91"
          inputMode="tel"
          className="mt-2.5 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none focus:border-mint/60"
        />
      </div>
      <Button
        className="mt-4 h-12 w-full rounded-2xl bg-brand text-[13.5px] font-semibold text-white hover:bg-brand-deep"
        onClick={onSent}
        disabled={note.trim().length < 3 || sending}
      >
        {sending ? "Sending…" : "Send private note"}
      </Button>
      {googleReviewUrl && (
        <p className="mt-2 text-center text-[11px] text-neutral-400">
          Prefer to post publicly?{" "}
          <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-mint-deep hover:underline">
            Open Google Maps
          </a>
        </p>
      )}
      <button onClick={onBack} className="mt-2 text-center text-[11.5px] font-semibold text-neutral-400 hover:text-neutral-600">
        Back
      </button>
    </div>
  );
}

function ThanksStep({ optIn, setOptIn, onAgain, business }: { optIn: boolean; setOptIn: (v: boolean) => void; onAgain: () => void; business: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft text-mint-deep">
        <CheckCircle2 size={34} />
      </span>
      <h2 className="mt-4 text-[21px] font-bold">Thank you!</h2>
      <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-relaxed text-neutral-400">
        Your feedback reached the {business} team. Guests like you keep our kitchens honest.
      </p>
      <div className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-surface p-4 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-mint-deep ring-1 ring-neutral-200"><WhatsAppIcon size={15} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold">Join the {business.split(" ")[0]} circle</p>
          <p className="text-[10.5px] leading-snug text-neutral-400">Monthly offers on WhatsApp · unsubscribe anytime</p>
        </div>
        <Switch checked={optIn} onCheckedChange={setOptIn} aria-label="WhatsApp opt-in" />
      </div>
      {optIn && (
        <p className="mt-2.5 flex items-center gap-1 text-[10.5px] font-semibold text-mint-deep">
          <Check size={12} /> You&apos;re on the list — welcome!
        </p>
      )}
      <button onClick={onAgain} className="mt-6 text-[11.5px] font-semibold text-neutral-400 hover:text-neutral-600">
        Replay the flow
      </button>
    </div>
  );
}
