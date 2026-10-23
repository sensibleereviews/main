// Sensiblee auth — login & signup (real credential auth against the API)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/client";
import { useSession } from "@/lib/session";
import { BrandLogo, GoogleG, WhatsAppIcon } from "./brand";
import { cn, ArrowRight, Check, ShieldCheck, Sparkles, Building2, X } from "./deps";

const DEMO_PW = "Demo@1234";

type AuthKind = "login" | "signup";

export function LoginPage({ onNavigate, onAuthed }: { onNavigate: (v: string) => void; onAuthed: (role: string) => void }) {
  return (
    <AuthShell onNavigate={onNavigate} kind="login">
      <LoginForm onNavigate={onNavigate} onAuthed={onAuthed} />
    </AuthShell>
  );
}

export function SignupPage({ onNavigate, onAuthed }: { onNavigate: (v: string) => void; onAuthed: (role: string) => void }) {
  return (
    <AuthShell onNavigate={onNavigate} kind="signup">
      <SignupForm onNavigate={onNavigate} onAuthed={onAuthed} />
    </AuthShell>
  );
}

function AuthShell({ kind, onNavigate, children }: { kind: AuthKind; onNavigate: (v: string) => void; children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-amber-soft/60 blur-3xl" />
      <div className="relative w-full max-w-[980px] overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_24px_60px_-24px_rgba(16,24,40,0.25)] lg:grid lg:grid-cols-[1fr_1.1fr]">
        {/* close — back to the website */}
        <button
          onClick={() => onNavigate("home")}
          aria-label="Close and go back to the website"
          title="Back to the website"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand"
        >
          <X size={16} />
        </button>
        {/* brand rail */}
        <div className="hidden flex-col justify-between bg-brand p-8 text-white lg:flex">
          <BrandLogo height={30} plate />
          <div>
            <h2 className="text-[22px] font-bold leading-snug">
              Every review sensed.<br />Every reply <span className="text-mint">intelligent</span>.
            </h2>
            <div className="mt-6 space-y-2.5">
              {[
                "15-minute Google sync across all locations",
                "AI drafts in your voice — you approve",
                "WhatsApp & QR review requests built-in",
              ].map((f) => (
                <p key={f} className="flex items-center gap-2 text-[13px] text-white/70">
                  <Check size={14} className="text-mint" /> {f}
                </p>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed text-white/40">
            {kind === "login" ? "New to Sensiblee? Start the 7-day trial — no card needed." : "Join 25+ brands running reputation as a program."}
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

function LoginForm({ onNavigate, onAuthed }: { onNavigate: (v: string) => void; onAuthed: (role: string) => void }) {
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  // Forgot password & reset password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const [resetToken, setResetToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("resetToken") || p.get("token") || null;
    }
    return null;
  });
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const submit = async (e?: React.FormEvent, creds?: { email: string; pw: string }) => {
    e?.preventDefault();
    const em = creds?.email ?? email;
    const password = creds?.pw ?? pw;
    if (!em || !password) return setErr("Enter your email and password.");
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ role?: string; mfaRequired?: boolean }>("/api/auth/login", {
        email: em,
        password,
        ...(mfaRequired && mfaCode ? { mfaCode } : {}),
      });

      if (res.mfaRequired) {
        setMfaRequired(true);
        setBusy(false);
        return;
      }

      await refresh();
      onAuthed(res.role || "owner");
    } catch (e2) {
      setErr(e2 instanceof ApiClientError ? e2.message : "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) {
      return setErr("Please provide a valid work email.");
    }
    setForgotBusy(true);
    setErr(null);
    try {
      await api.post("/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send reset link");
    } finally {
      setForgotBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      return setErr("Password must be at least 8 characters long.");
    }
    if (newPw !== confirmPw) {
      return setErr("Passwords do not match.");
    }
    setResetBusy(true);
    setErr(null);
    try {
      await api.post("/api/auth/reset-password", { token: resetToken, password: newPw });
      setResetSuccess(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not reset password.");
    } finally {
      setResetBusy(false);
    }
  };

  // View: Reset Password with token
  if (resetToken) {
    return (
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <div className="lg:hidden"><BrandLogo height={28} /></div>
        <h1 className="mt-6 text-[24px] font-bold tracking-tight lg:mt-0">Set new password</h1>
        <p className="mt-1 text-[13.5px] text-neutral-500">Choose a secure password for your account.</p>

        {resetSuccess ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-mint/40 bg-mint-soft/40 p-4 text-[13px] text-brand">
              <p className="font-bold text-mint-deep">Password updated successfully!</p>
              <p className="mt-1 text-neutral-600">You can now sign in with your new credentials.</p>
            </div>
            <Button
              className="h-11 w-full rounded-2xl bg-brand text-[13.5px] text-white hover:bg-brand-deep"
              onClick={() => {
                setResetToken(null);
                setResetSuccess(false);
                if (typeof window !== "undefined") window.history.replaceState({}, "", "/login");
              }}
            >
              Sign in now &rarr;
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-3.5">
            <label className="block">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">New Password</span>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                required
                className={cn(fieldCls, "mt-1.5")}
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Confirm Password</span>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                required
                className={cn(fieldCls, "mt-1.5")}
              />
            </label>
            {err && (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">{err}</p>
            )}
            <Button type="submit" disabled={resetBusy} className="h-11 w-full rounded-2xl bg-brand text-[13.5px] text-white hover:bg-brand-deep">
              {resetBusy ? "Updating password…" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    );
  }

  // View: Forgot Password request modal
  if (forgotOpen) {
    return (
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <div className="lg:hidden"><BrandLogo height={28} /></div>
        <h1 className="mt-6 text-[24px] font-bold tracking-tight lg:mt-0">Reset password</h1>
        <p className="mt-1 text-[13.5px] text-neutral-500">Enter your email and we will send you a secure password reset link.</p>

        {forgotSent ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-mint/40 bg-mint-soft/40 p-4 text-[13px] text-brand">
              <p className="font-bold text-mint-deep">Reset link dispatched!</p>
              <p className="mt-1 text-neutral-600">If an account exists for <strong>{forgotEmail}</strong>, an email has been sent with instructions.</p>
            </div>
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl text-[13px]"
              onClick={() => { setForgotOpen(false); setForgotSent(false); }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-3.5">
            <label className="block">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Work email</span>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@business.in"
                required
                className={cn(fieldCls, "mt-1.5")}
              />
            </label>
            {err && (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">{err}</p>
            )}
            <Button type="submit" disabled={forgotBusy} className="h-11 w-full rounded-2xl bg-brand text-[13.5px] text-white hover:bg-brand-deep">
              {forgotBusy ? "Sending link…" : "Send Reset Link"}
            </Button>
            <button
              type="button"
              onClick={() => { setForgotOpen(false); setErr(null); }}
              className="mt-2 text-center text-[12px] font-semibold text-neutral-400 hover:text-brand w-full"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center p-7 sm:p-10">
      <div className="lg:hidden"><BrandLogo height={28} /></div>
      <h1 className="mt-6 text-[24px] font-bold tracking-tight lg:mt-0">
        {mfaRequired ? "Two-factor verification" : "Welcome back"}
      </h1>
      <p className="mt-1 text-[13.5px] text-neutral-500">
        {mfaRequired
          ? "Enter the 6-digit code from your authenticator app (Google Authenticator, 1Password, Authy)."
          : "Sign in to your reputation workspace."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        {!mfaRequired ? (
          <>
            <label className="block">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Work email</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.in" autoComplete="email"
                className={cn(fieldCls, "mt-1.5")}
              />
            </label>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Password</span>
                <button
                  type="button"
                  onClick={() => { setForgotOpen(true); setForgotEmail(email); setErr(null); }}
                  className="text-[11.5px] font-semibold text-mint-deep hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className={cn(fieldCls, "mt-1.5")}
              />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">6-Digit 2FA Code</span>
            <input
              type="text"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
              className={cn(fieldCls, "mt-1.5 text-center text-[22px] tracking-[0.25em] font-mono")}
            />
          </label>
        )}

        {err && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">{err}</p>
        )}

        <Button type="submit" disabled={busy} className="h-11 w-full rounded-2xl bg-brand text-[13.5px] text-white hover:bg-brand-deep">
          {busy ? "Verifying…" : mfaRequired ? "Verify 2FA & Sign in" : <>Sign in <ArrowRight size={15} className="ml-1.5" /></>}
        </Button>

        {mfaRequired && (
          <button
            type="button"
            onClick={() => { setMfaRequired(false); setMfaCode(""); setErr(null); }}
            className="text-[11.5px] font-semibold text-neutral-400 hover:text-brand w-full text-center mt-2"
          >
            &larr; Back to password login
          </button>
        )}
      </form>

      {!mfaRequired && (
        <>
          {/* Google sign-in */}
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">or</span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <button
            type="button"
            onClick={() => setGoogleOpen(true)}
            disabled={busy}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl border border-neutral-300 bg-white text-[13.5px] font-semibold text-neutral-700 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-px hover:border-neutral-400 hover:shadow-md active:translate-y-0"
          >
            <GoogleG size={17} /> Continue with Google
          </button>
          {googleOpen && <GoogleAccountChooser onClose={() => setGoogleOpen(false)} onAuthed={onAuthed} refresh={refresh} />}

          {/* demo credentials */}
          <div className="mt-5 rounded-2xl border border-mint/40 bg-mint-soft/30 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-mint-deep">
              <Sparkles size={12} /> Demo account — tap to fill
            </p>
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => submit(undefined, { email: "anand@spiceroute.in", pw: DEMO_PW })}
                className="w-full rounded-xl bg-white p-2.5 text-left ring-1 ring-neutral-200/80 transition-shadow hover:shadow-md"
              >
                <p className="text-[12px] font-bold text-brand">Business owner</p>
                <p className="font-mono text-[10.5px] text-neutral-400">anand@spiceroute.in</p>
              </button>
            </div>
            <p className="mt-2 font-mono text-[10.5px] text-mint-deep">password: {DEMO_PW}</p>
          </div>

          <p className="mt-5 text-center text-[12.5px] text-neutral-400">
            New to Sensiblee?{" "}
            <button onClick={() => onNavigate("signup")} className="font-semibold text-mint-deep hover:underline">Start your free trial</button>
          </p>
        </>
      )}
    </div>
  );
}

// Task 56 — Google account chooser (the sheet Google's GIS flow shows before
// consent). Lists the workspace demo account plus "Use another account".
function GoogleAccountChooser({
  onClose, onAuthed, refresh,
}: { onClose: () => void; onAuthed: (role: string) => void; refresh: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const signIn = async (em: string) => {
    if (!em) return setErr("Enter the email you use for Sensiblee.");
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ role: string }>("/api/auth/google", { email: em });
      await refresh();
      onAuthed(res.role);
    } catch (e2) {
      setErr(e2 instanceof ApiClientError ? e2.message : "Google sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-deep/45 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label="Sign in with Google">
      <div className="w-full max-w-[380px] rounded-[28px] border border-neutral-200 bg-white p-7 shadow-[0_32px_80px_-24px_rgba(16,24,40,0.45)]">
        <div className="flex items-start justify-between">
          <GoogleG size={22} />
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
            <X size={16} />
          </button>
        </div>
        <h2 className="mt-4 text-[20px] font-medium tracking-tight text-neutral-800">Choose an account</h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">to continue to <span className="font-semibold text-brand">Sensiblee</span></p>

        {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[12px] font-medium text-red-600">{err}</p>}

        <div className="mt-5 space-y-1">
          <button
            type="button" disabled={busy}
            onClick={() => signIn("anand@spiceroute.in")}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[12.5px] font-bold text-white">AM</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-neutral-800">Anand Menon</span>
              <span className="block truncate text-[11.5px] text-neutral-400">anand@spiceroute.in</span>
            </span>
          </button>
          {!custom ? (
            <button
              type="button" disabled={busy}
              onClick={() => setCustom(true)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><Building2 size={15} /></span>
              <span className="text-[13px] font-medium text-neutral-700">Use another account</span>
            </button>
          ) : (
            <div className="rounded-2xl px-3 py-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Email</span>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.in" autoFocus disabled={busy}
                  className="mt-1 h-10 w-full rounded-xl border border-neutral-300 px-3 text-[13px] outline-none transition-colors focus:border-mint focus:ring-2 focus:ring-mint/30"
                />
              </label>
              <button
                type="button" disabled={busy}
                onClick={() => signIn(email)}
                className="mt-2.5 h-9 w-full rounded-xl bg-brand text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
              >
                {busy ? "Signing you in…" : "Continue"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-5 border-t border-neutral-100 pt-3.5 text-[11px] leading-relaxed text-neutral-400">
          To continue, Google will share your name, email address and profile picture with Sensiblee. This workspace follows Google&apos;s API Services User Data Policy, including the Limited Use requirements.
        </p>
      </div>
    </div>
  );
}

function SignupForm({ onNavigate, onAuthed }: { onNavigate: (v: string) => void; onAuthed: (role: string) => void }) {
  const { refresh } = useSession();
  const [form, setForm] = useState({ business: "", name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/auth/signup", form);
      await refresh();
      onAuthed("owner");
    } catch (e2) {
      setErr(e2 instanceof ApiClientError ? e2.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col justify-center p-7 sm:p-10">
      <div className="lg:hidden"><BrandLogo height={28} /></div>
      <h1 className="mt-6 text-[24px] font-bold tracking-tight lg:mt-0">Start your 7-day trial</h1>
      <p className="mt-1 text-[13.5px] text-neutral-500">No card required · Starter plan features included.</p>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Business name</span>
            <input value={form.business} onChange={set("business")} placeholder="Spice Route Kitchen" className={cn(fieldCls, "mt-1.5")} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Your name</span>
            <input value={form.name} onChange={set("name")} placeholder="Anand Menon" className={cn(fieldCls, "mt-1.5")} />
          </label>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Work email</span>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@business.in" className={cn(fieldCls, "mt-1.5")} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Phone (optional)</span>
            <input value={form.phone} onChange={set("phone")} placeholder="+91 98xxx xxxxx" className={cn(fieldCls, "mt-1.5")} />
          </label>
        </div>
        <label className="block">
          <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">Password (8+ characters)</span>
          <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={cn(fieldCls, "mt-1.5")} />
        </label>
        {err && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">{err}</p>
        )}
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-2xl bg-brand text-[13.5px] text-white hover:bg-brand-deep">
          {busy ? "Creating workspace…" : <>Create my workspace <ArrowRight size={15} className="ml-1.5" /></>}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck size={12} className="text-mint-deep" /> DPDP-compliant · your data stays in India
        </p>
      </form>

      <p className="mt-5 text-center text-[12.5px] text-neutral-400">
        Already have a workspace?{" "}
        <button onClick={() => onNavigate("login")} className="font-semibold text-mint-deep hover:underline">Sign in</button>
      </p>
    </div>
  );
}

const fieldCls = "h-11 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3.5 text-[13.5px] outline-none transition-colors focus:border-mint/60 focus:bg-white";

// referenced so tree-shaking keeps the icons in one place
void GoogleG; void WhatsAppIcon; void Building2;
