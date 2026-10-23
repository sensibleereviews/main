// Sensiblee client dashboard — shell, sidebar, Overview + Reviews (live API backed)
"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData } from "@/lib/client";
import { useSession } from "@/lib/session";
import { useRouter } from "@/lib/router";
import type { ReviewVM, LocationVM } from "@/lib/viewmodels";
import {
  cn,
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquareText,
  Rocket,
  Search,
  Send,
  Settings,
  Sparkles,
  Star,
  Target,
  RefreshCw,
  Download,
} from "./deps";
import { GoogleG, BrandLogo, SentimentBadge, StarRating, StatusBadge, WhatsAppIcon } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { ChartCard, RatingTrendChart, SentimentDonut, StatCard } from "./widgets";
import { AiAssistantView, AnalyticsView, LocationsView, RequestsView } from "./client-views2";
import { OnboardingWizard, ReviewDrawer, SettingsView, LocationDrawer } from "./client-extras";
import { ActionsView } from "./client-actions";
import { relTime as relTimeStr } from "@/lib/viewmodels";
import { BAND_META, type HealthBand } from "@/lib/health-score";

export type Overview = {
  tenantName: string;
  planName: string;
  ownerName: string;
  kpis: { rating: number; ratingDelta: string; reviewsMonth: number; reviewsDelta: string; responseRate: number; responseDelta: string; pending: number; drafts: number; alerts: number };
  trend: { w: string; rating: number; volume: number }[];
  sentiment: { name: string; value: number; color: string }[];
  locations: LocationVM[];
  recent: ReviewVM[];
  urgent: ReviewVM[];
  whatsapp: { quality: string; queued: number; template: string };
  lastSync: string;
};

export type HealthPayload = {
  score: number;
  band: HealthBand;
  delta: number;
  prevScore: number;
  rating30: number;
  reviews30: number;
  responseRate: number;
  dimensions: { key: string; label: string; max: number; earned: number; observed: string }[];
  locations: { id: string; name: string; area: string; score: number; band: HealthBand; delta: number; reviews30: number; rating30: number; responseRate: number }[];
  explanations: string[];
  themes: { category: string; label: string; count: number; share: number }[];
  staff: { name: string; mentions: number; positive: number; negative: number; avgSentiment: number }[];
  roi: { requested: number; generated: number; conversion: number; avgRating: number; ratingImprovement: number; locationsImproved: number; locationsTotal: number };
  alert: {
    location: string; health: number; delta: number; negativeReviews: number;
    topIssue: string; mentions: number; trendPct: number; peakWindow: string | null;
    employeesMentioned: number; revenueRisk: "high" | "medium" | "low";
  } | null;
  drill: { id: string; name: string; area: string; themes: { category: string; label: string; count: number; share: number }[]; staff: { name: string; mentions: number; positive: number; negative: number; avgSentiment: number }[]; monthly: { label: string; score: number }[]; unanswered: number; avgResponseMins: number }[];
};

const NAV: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { key: "reviews", label: "Reviews", icon: <MessageSquareText size={16} /> },
  { key: "requests", label: "Requests", icon: <Send size={16} /> },
  { key: "ai", label: "AI Assistant", icon: <Sparkles size={16} /> },
  { key: "analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
  { key: "locations", label: "Locations", icon: <MapPin size={16} /> },
  { key: "actions", label: "Action Center", icon: <Target size={16} /> },
  { key: "settings", label: "Settings", icon: <Settings size={16} /> },
];

export function ClientDashboard() {
  const { user, refresh, logout } = useSession();
  const { route, navigate } = useRouter();
  const { toast } = useToast();
  // unknown views (e.g. /login landing here via rewrite) fall back to overview
  const view = NAV.some((n) => n.key === route.view) ? route.view! : "overview";
  const [navOpen, setNavOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewVM | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<LocationVM | null>(null);

  const overview = useApiData<Overview>(view === "overview" ? "/api/overview" : null);
  const health = useApiData<HealthPayload>(view === "overview" || view === "actions" ? "/api/health" : null);
  const badgeCounts = useApiData<Overview>("/api/overview");
  const onboardingDone = user?.tenant?.onboardingDone ?? true;

  // in-app notification feed (doc §1A/§1I) — computed live from workspace data
  type NotifItem = { id: string; kind: string; severity: "high" | "warn" | "info"; title: string; body: string; at: string; href: string };
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const notifications = useApiData<{ items: NotifItem[]; count: number }>(notifOpen ? "/api/notifications" : "/api/notifications");
  const notifItems = (notifications.data?.items || []).filter((n) => !readIds.includes(n.id));
  const notifCount = Math.max(0, (notifications.data?.count ?? 0) - readIds.length);
  const openNotif = (n: NotifItem) => {
    setReadIds((r) => [...r, n.id]);
    setNotifOpen(false);
    go(n.href);
  };

  // Auto-open the onboarding wizard until setup is complete
  useEffect(() => {
    if (user && !user.tenant?.onboardingDone) setSetupOpen(true);
  }, [user?.tenant?.onboardingDone]);

  const go = (v: string) => {
    navigate({ surface: "client", view: v });
    setNavOpen(false);
  };

  // shared review actions
  const [approving, setApproving] = useState<string | null>(null);
  const approveReply = async (r: ReviewVM, body: string) => {
    setApproving(r.id);
    try {
      await api.post(`/api/reviews/${r.id}/reply`, { body });
      toast({ title: "Reply posted", description: `Published to Google for ${r.author}.` });
      overview.reload();
      badgeCounts.reload();
      setSelectedReview(null);
    } catch (e) {
      toast({ title: "Could not post reply", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setApproving(null);
    }
  };
  const generateDraft = async (r: ReviewVM) => {
    setApproving(r.id);
    try {
      await api.post(`/api/reviews/${r.id}/draft`);
      toast({ title: "Draft ready", description: `AI reply drafted for ${r.author}.` });
      overview.reload();
      badgeCounts.reload();
    } catch (e) {
      toast({ title: "Draft failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setApproving(null);
    }
  };

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const k = overview.data?.kpis;

  return (
    <div className="skin skin-client flex h-screen bg-cream text-brand">
      {/* impersonation banner */}
      {user?.impersonatedBy && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-[12.5px] font-semibold text-brand-deep">
          <Shieldish /> Viewing {user?.tenant?.name || "client"} workspace as support — actions are audit-logged
          <button
            className="rounded-lg bg-brand-deep/10 px-2.5 py-1 font-bold hover:bg-brand-deep/20"
            onClick={async () => {
              await api.post("/api/auth/exit-impersonate");
              await refresh();
              navigate({ surface: "admin" });
            }}
          >
            Exit session <Xish />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-neutral-200/60 bg-white transition-transform lg:static lg:translate-x-0",
          user?.impersonatedBy ? "pt-9" : "",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 pb-4 pt-5">
          <BrandLogo height={32} />
        </div>
        <div className="mx-4 mb-4 rounded-xl bg-surface p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Workspace</p>
          <div className="mt-1 flex items-center justify-between text-left">
            <span className="truncate text-[13px] font-semibold">{user?.tenant?.name || "Workspace"}</span>
            <ChevronDown size={14} className="shrink-0 text-neutral-400" />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard sections">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                view === n.key ? "bg-brand text-white shadow-sm" : "text-neutral-500 hover:bg-surface hover:text-brand"
              )}
              aria-current={view === n.key ? "page" : undefined}
            >
              {n.icon}
              {n.label}
              {n.key === "ai" && (badgeCounts.data?.kpis.drafts ?? 0) > 0 && (
                <span className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[10.5px] font-bold",
                  view === n.key ? "bg-white/20 text-white" : "bg-amber-soft text-amber-deep"
                )}>
                  {badgeCounts.data?.kpis.drafts}
                </span>
              )}
              {n.key === "reviews" && (badgeCounts.data?.kpis.alerts ?? 0) > 0 && (
                <span className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[10.5px] font-bold",
                  view === n.key ? "bg-white/20 text-white" : "bg-red-50 text-red-500"
                )}>
                  {badgeCounts.data?.kpis.alerts}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-neutral-100 p-3">
          {!onboardingDone && (
            <button
              onClick={() => setSetupOpen(true)}
              className="mb-2 flex w-full items-center gap-2.5 rounded-xl bg-mint-soft/60 px-2 py-2 text-[12.5px] font-semibold text-mint-deep"
            >
              <Rocket size={14} /> Finish setup
            </button>
          )}
          <button
            onClick={() => setSetupOpen(true)}
            className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-neutral-500 transition-colors hover:bg-surface hover:text-brand"
          >
            <Rocket size={14} className="text-mint-deep" /> Replay onboarding
          </button>
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{initials}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12.5px] font-semibold">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-neutral-400">{user?.role} · {user?.tenant?.planName} plan</p>
            </div>
            <button
              onClick={async () => { await logout(); navigate({ surface: "login" }); }}
              title="Sign out"
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-surface hover:text-brand"
            >
              <LogOut size={14} />
            </button>
            <button
              onClick={() => navigate({ surface: "home" })}
              title="Back to website"
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-surface hover:text-brand"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </aside>
      {navOpen && <button className="fixed inset-0 z-30 bg-brand/30 lg:hidden" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200/60 bg-white/80 px-4 py-3 backdrop-blur lg:px-7">
          <button className="rounded-lg p-2 hover:bg-surface lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Search reviews, guests, keywords…"
              className="h-9 w-full rounded-xl border border-neutral-200 bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-neutral-400 focus:border-mint/60 focus:bg-white"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle chrome="light" />
            <div className="relative">
              <button
                className={cn("relative rounded-xl border bg-white p-2", notifOpen ? "border-mint/60 text-brand" : "border-neutral-200 text-neutral-500 hover:text-brand")}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Bell size={15} />
                {notifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white">{notifCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
                    <p className="text-[13px] font-bold text-brand">Notifications</p>
                    <button className="text-[11px] font-semibold text-neutral-400 hover:text-brand" onClick={() => setReadIds((r) => [...r, ...notifItems.map((n) => n.id)])}>Mark all read</button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifItems.map((n) => (
                      <button key={n.id} onClick={() => openNotif(n)} className="flex w-full items-start gap-2.5 border-b border-neutral-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface">
                        <span className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          n.severity === "high" ? "bg-red-500" : n.severity === "warn" ? "bg-amber-400" : "bg-mint-deep"
                        )} />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold leading-snug text-brand">{n.title}</span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-neutral-400">{n.body}</span>
                          <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-300">{n.kind} · {relTimeStr(n.at)}</span>
                        </span>
                      </button>
                    ))}
                    {!notifications.loading && notifItems.length === 0 && (
                      <p className="px-4 py-6 text-center text-[12.5px] text-neutral-400">You are all caught up — no new alerts.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button size="sm" className="h-9 rounded-xl bg-mint-deep text-[12.5px] text-white hover:bg-mint-deep/90" onClick={() => go("requests")}>
              <Send size={13} className="mr-1.5" /> New request
            </Button>
          </div>
        </header>

        <main className={cn("flex-1 overflow-y-auto px-4 py-5 lg:px-7 lg:py-6", user?.impersonatedBy && "pt-14")}>
          <div className="mx-auto max-w-[1200px]">
            {view === "overview" && (
              <OverviewView
                data={overview.data}
                health={health.data}
                loading={overview.loading}
                onGo={go}
                onSetup={() => setSetupOpen(true)}
                onOpenReview={setSelectedReview}
                onApprove={approveReply}
                approving={approving}
              />
            )}
            {view === "reviews" && (
              <ReviewsView onOpenReview={setSelectedReview} onApprove={approveReply} onDraft={generateDraft} busy={approving} locations={badgeCounts.data?.locations || []} />
            )}
            {view === "requests" && <RequestsView />}
            {view === "ai" && <AiAssistantView />}
            {view === "analytics" && <AnalyticsView />}
            {view === "locations" && <LocationsView onOpenLocation={setSelectedLoc} />}
            {view === "actions" && <ActionsView health={health.data} />}
            {view === "settings" && <SettingsView />}
          </div>
        </main>
      </div>

      {setupOpen && <OnboardingWizard onDone={() => { setSetupOpen(false); refresh(); }} />}
      <ReviewDrawer
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onApprove={approveReply}
        onDraft={generateDraft}
        busy={approving === selectedReview?.id}
      />
      <LocationDrawer location={selectedLoc} onClose={() => { setSelectedLoc(null); badgeCounts.reload(); }} />
    </div>
  );
}

function Shieldish() {
  return <ShieldIcon />;
}
function Xish() {
  return <span aria-hidden>→</span>;
}
function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/* ------------------------------- Overview ------------------------------- */

function OverviewView({ data, health, loading, onGo, onSetup, onOpenReview, onApprove, approving }: {
  data: Overview | null;
  health: HealthPayload | null;
  loading: boolean;
  onGo: (v: string) => void;
  onSetup: () => void;
  onOpenReview: (r: ReviewVM) => void;
  onApprove: (r: ReviewVM, body: string) => void;
  approving: string | null;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-5">
        <div className="h-9 w-72 animate-pulse rounded-xl bg-surface" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl bg-surface xl:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }
  const k = data.kpis;
  const firstName = data.ownerName.split(" ")[0];
  const h = health;
  const hBand = h ? BAND_META[h.band] : null;
  const weakest = h?.locations[0];
  const best = h && h.locations.length > 1 ? h.locations[h.locations.length - 1] : null;
  const weakestTheme = h?.drill.find((d) => d.id === weakest?.id)?.themes[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Good day, {firstName}</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            Monitor → Diagnose → Request → Respond → Improve — refreshed <span className="font-medium text-mint-deep">{data.lastSync}</span>.
          </p>
        </div>
        <Badge className="bg-mint-soft text-mint-deep hover:bg-mint-soft ring-1 ring-mint/40 gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-deep" /> Live · 15-min sync
        </Badge>
      </div>

      {/* Reputation Command Centre — the North-Star card (doc: killer dashboard) */}
      {h && hBand && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-brand shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
          <div className="grid gap-6 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-6">
            {/* score dial */}
            <div className="flex items-center gap-4">
              <div className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                <span className="text-[38px] font-bold leading-none text-white">{h.score}</span>
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/60">of 100</span>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  <Shieldish /> Reputation Health
                </p>
                <p className="mt-1 flex items-center gap-2 text-[16px] font-bold text-white">
                  {hBand.label}
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold", h.delta >= 0 ? "bg-mint text-brand-deep" : "bg-red-400 text-white")}>
                    {h.delta >= 0 ? "↑" : "↓"} {Math.abs(h.delta)}
                  </span>
                </p>
                <p className="mt-1 text-[12.5px] text-white/70">{h.rating30} ★ average · {h.reviews30.toLocaleString("en-IN")} reviews · {h.responseRate}% responded</p>
              </div>
            </div>

            {/* why — manager explanations */}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Why this score</p>
              <ul className="mt-2 space-y-1.5">
                {(h.explanations.length ? h.explanations.slice(0, 3) : ["All dimensions are healthy this month — keep the response streak going."]).map((e) => (
                  <li key={e} className="flex items-start gap-2 text-[12.5px] leading-snug text-white/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" /> {e}
                  </li>
                ))}
              </ul>
            </div>

            {/* dimension mini-bars — all seven weighted dimensions (doc Part 2: 20/15/15/15/10/15/10) */}
            <div className="hidden w-[210px] space-y-1.5 lg:block">
              {h.dimensions.filter((d) => d.max > 0).map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between text-[10.5px] font-medium text-white/70">
                    <span className="truncate pr-2">{d.label}</span>
                    <span className="shrink-0 tabular-nums">{Math.round(d.earned)}/{d.max}</span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(100, (d.earned / d.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* product loop strip */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/10 bg-brand-deep/40 px-5 py-2 text-[11px] font-semibold text-white/60 lg:px-6">
            {"Review → Analyze → Assign → Fix → Measure".split(" → ").map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className={cn(i === 0 && "text-mint")}>{step}</span>
                {i < arr.length - 1 && <span className="text-white/30">→</span>}
              </span>
            ))}
            <button onClick={() => onGo("actions")} className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-[10.5px] font-bold text-white transition-colors hover:bg-white/20">
              Open Action Center →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Average rating" value={String(k.rating)} delta={k.ratingDelta} hint="vs last month · all locations" icon={<Star size={15} />} accent="amber" />
        <StatCard label="New reviews (30d)" value={String(k.reviewsMonth)} delta={k.reviewsDelta} hint="Google · request campaigns" icon={<GoogleG size={15} />} />
        <StatCard label="Response rate" value={`${k.responseRate}%`} delta={k.responseDelta} hint="goal: 90% within 24h" icon={<Check size={15} />} />
        <StatCard label="Needs you now" value={String(k.pending)} hint={`${k.alerts} SLA alerts`} icon={<AlertTriangle size={15} />} accent="coral" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard
          title="Rating trend"
          subtitle="12 weeks · volume as bars"
          className="xl:col-span-2"
          right={
            <Button variant="ghost" size="sm" className="h-8 text-xs text-neutral-500" onClick={() => onGo("analytics")}>
              Full analytics <BarChart3 size={13} className="ml-1" />
            </Button>
          }
        >
          <RatingTrendChart data={data.trend} />
        </ChartCard>
        <ChartCard title="Sentiment" subtitle="this month · AI-classified">
          <SentimentDonut data={data.sentiment} avgRating={k.rating} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Latest reviews</h3>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-neutral-500" onClick={() => onGo("reviews")}>
              View all <MessageSquareText size={13} className="ml-1" />
            </Button>
          </div>
          {data.recent.map((r) => (
            <ReviewRow key={r.id} review={r} compact onOpen={onOpenReview} onApprove={onApprove} approving={approving} />
          ))}
        </div>

        <div className="space-y-5">
          {/* Reputation Alert — weakest branch, full doc spec (Part 2 example card) */}
          {h?.alert ? (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/50 p-4">
              <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-red-700">
                <AlertTriangle size={14} /> Reputation alert
              </h3>
              <p className="mt-2 text-[14px] font-bold text-brand">{h.alert.location.replace(/^Spice Route\s+/, "")}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-neutral-500">
                <span className="font-bold text-brand">Reputation Health: {h.alert.health}</span>
                <span className={cn("font-semibold", h.alert.delta >= 0 ? "text-mint-deep" : "text-red-500")}>
                  {h.alert.delta >= 0 ? "↑" : "↓"} {Math.abs(h.alert.delta)}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-500">
                {h.alert.negativeReviews} negative reviews this month · Top issue:{" "}
                <span className="font-semibold text-red-600">{h.alert.topIssue}</span> — {h.alert.mentions} mentions{" "}
                <span className={h.alert.trendPct > 0 ? "font-semibold text-red-500" : "font-semibold text-mint-deep"}>
                  {h.alert.trendPct > 0 ? "↑" : "↓"} {Math.abs(h.alert.trendPct)}%
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {h.alert.peakWindow && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                    Most affected: {h.alert.peakWindow}
                  </span>
                )}
                {h.alert.employeesMentioned > 0 && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                    Employees mentioned: {h.alert.employeesMentioned}
                  </span>
                )}
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1",
                  h.alert.revenueRisk === "high" ? "bg-red-500 text-white ring-red-500" : h.alert.revenueRisk === "medium" ? "bg-amber-soft text-amber-deep ring-amber-200" : "bg-mint-soft text-mint-deep ring-mint/40"
                )}>
                  Revenue risk: {h.alert.revenueRisk === "high" ? "High" : h.alert.revenueRisk === "medium" ? "Medium" : "Low"}
                </span>
              </div>
              <button onClick={() => onGo("actions")} className="mt-2.5 text-[12.5px] font-bold text-red-600 hover:underline">
                Recommended action →
              </button>
            </div>
          ) : weakest && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/50 p-4">
              <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-red-700">
                <AlertTriangle size={14} /> Needs attention
              </h3>
              <p className="mt-2 text-[14px] font-bold text-brand">{weakest.name.replace(/^Spice Route\s+/, "")}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-neutral-500">
                <span className="font-bold text-brand">Health: {weakest.score}</span>
                <span className={cn("font-semibold", weakest.delta >= 0 ? "text-mint-deep" : "text-red-500")}>
                  {weakest.delta >= 0 ? "↑" : "↓"} {Math.abs(weakest.delta)}
                </span>
                <span>· {weakest.rating30} ★</span>
              </div>
              {weakestTheme && (
                <p className="mt-1.5 text-[12px] text-neutral-500">
                  Top issue: <span className="font-semibold text-red-600">{weakestTheme.label} · {weakestTheme.share}%</span> of complaints
                </p>
              )}
              <button onClick={() => onGo("actions")} className="mt-2.5 text-[12.5px] font-bold text-red-600 hover:underline">
                Recommended action →
              </button>
            </div>
          )}

          {/* Best location (doc: 🏆 Best location card) */}
          {best && (
            <div className="rounded-2xl border border-mint/40 bg-mint-soft/40 p-4">
              <h3 className="text-[13.5px] font-semibold text-mint-deep">🏆 Best location</h3>
              <p className="mt-2 text-[14px] font-bold text-brand">{best.name.replace(/^Spice Route\s+/, "")}</p>
              <p className="mt-1 text-[12px] text-neutral-500">
                Health: <span className="font-bold text-mint-deep">{best.score} ↑ {Math.abs(best.delta)}</span> · {best.rating30} ★ · {best.responseRate}% response rate
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-red-700">
              <AlertTriangle size={15} /> Urgent reviews
            </h3>
            <div className="mt-3 space-y-2.5">
              {data.urgent.map((r) => (
                <div key={r.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onGo("ai"); }} onClick={() => onGo("ai")} className="w-full cursor-pointer rounded-xl bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-brand">{r.author}</span>
                    <StarRating value={r.stars} size={11} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-neutral-500">{r.text}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-red-500">{r.status === "awaiting" ? "No reply yet — 24h SLA breached" : "AI draft ready for approval"}</p>
                </div>
              ))}
              {data.urgent.length === 0 && (
                <p className="rounded-xl bg-white p-3 text-[12.5px] text-neutral-400">All clear — nothing breaching SLA.</p>
              )}
            </div>
          </div>

          <ChartCard title="Locations" subtitle="rating · last sync">
            <div className="space-y-2.5">
              {data.locations.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-semibold text-brand">{l.name.replace(/^Spice Route\s+/, "").replace(/^Lumiere Dental —\s+/, "")}</p>
                    <p className="text-[10.5px] text-neutral-400">{l.reviews.toLocaleString("en-IN")} reviews · {l.lastSync}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-brand">{l.rating}</p>
                    <StatusBadge status={l.syncState} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <div className="rounded-2xl bg-brand p-4 text-white">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold"><WhatsAppIcon size={15} className="text-mint" /> WhatsApp channel healthy</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/70">
              Quality rating: <span className="font-semibold text-mint">{data.whatsapp.quality}</span> · {data.whatsapp.queued} campaign{data.whatsapp.queued === 1 ? "" : "s"} scheduled · template approval intact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Reviews ------------------------------- */

type StatusFilter = "all" | "ai-draft" | "replied" | "awaiting" | "failed";

const ISSUE_CATEGORIES = [
  { k: "all", label: "All themes" },
  { k: "waiting", label: "Waiting time" },
  { k: "staff", label: "Staff behaviour" },
  { k: "order", label: "Order & delivery" },
  { k: "billing", label: "Billing" },
  { k: "cleanliness", label: "Cleanliness" },
];

// doc Part 2 inbox spec — filters: location · rating · sentiment · unanswered ·
// staff mention · issue category (status chip covers unanswered)
function ReviewsView({ onOpenReview, onApprove, onDraft, busy, locations }: {
  onOpenReview: (r: ReviewVM) => void;
  onApprove: (r: ReviewVM, body: string) => void;
  onDraft: (r: ReviewVM) => void;
  busy: string | null;
  locations: LocationVM[];
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minStars, setMinStars] = useState(0);
  const [locationId, setLocationId] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [staff, setStaff] = useState("all");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const reviews = useApiData<{ reviews: ReviewVM[]; total: number }>(
    `/api/reviews?status=${status}&minStars=${minStars}&locationId=${encodeURIComponent(locationId)}&sentiment=${sentiment}&staff=${encodeURIComponent(staff)}&category=${category}&days=${days}`
  );
  const filtered = useMemo(() => reviews.data?.reviews || [], [reviews.data]);

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter((r) =>
      r.author.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [filtered, searchQuery]);

  const pendingDraftReviews = useMemo(() => searched.filter((r) => r.status === "ai-draft" && r.draft), [searched]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDrafts = () => {
    if (selectedIds.size === pendingDraftReviews.length && pendingDraftReviews.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDraftReviews.map((r) => r.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.size) return;
    setBulkApproving(true);
    try {
      const res = await api.post<{ ok: boolean; approvedCount: number; failedCount: number }>("/api/reviews/bulk-approve", {
        reviewIds: Array.from(selectedIds),
      });
      toast({
        title: "Bulk approval complete",
        description: `Approved & published ${res.approvedCount} review replies.${res.failedCount ? ` ${res.failedCount} skipped or failed.` : ""}`,
      });
      setSelectedIds(new Set());
      reviews.reload();
    } catch (e) {
      toast({ title: "Bulk approve failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBulkApproving(false);
    }
  };

  const filtersDirty = locationId !== "all" || sentiment !== "all" || staff !== "all" || category !== "all" || searchQuery !== "";

  const syncAll = async () => {
    setSyncing(true);
    try {
      let created = 0;
      for (const loc of locations) {
        const res = await api.post<{ newReviews: number }>(`/api/locations/${loc.id}/sync`);
        created += res.newReviews;
      }
      toast({ title: "Sync complete", description: created ? `${created} new review${created > 1 ? "s" : ""} pulled and scored.` : "All profiles up to date — no new reviews." });
      reviews.reload();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Author", "Stars", "Location", "Sentiment", "Status", "Text", "Received"],
      ...filtered.map((r) => [r.author, String(r.stars), r.location, r.sentiment, r.status, `"${r.text.replace(/"/g, '""')}"`, r.createdAt]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensiblee-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded", description: `${filtered.length} reviews in the current filter.` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Review monitor</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">Reputation Command Center · every Google review across your locations, synced every 15 minutes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-[12.5px]" onClick={syncAll} disabled={syncing}>
            <RefreshCw size={13} className={cn("mr-1.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync all profiles"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-[12.5px]" onClick={exportCsv}>
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white p-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "ai-draft", "replied", "awaiting", "failed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                status === s ? "bg-brand text-white" : "bg-surface text-neutral-500 hover:text-brand"
              )}
            >
              {s === "all" ? "All" : s === "ai-draft" ? "AI drafts" : s === "replied" ? "Replied" : s === "failed" ? "Publish failed" : "Unanswered"}
            </button>
          ))}
        </div>

        {/* Review search input */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search author, text, keywords…"
            className="h-8 w-full rounded-xl border border-neutral-200 bg-surface pl-7 pr-7 text-[12px] text-brand outline-none focus:border-mint/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand text-[11px] font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* date-range filter (doc §1B) */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
            aria-label="Filter by date range"
          >
            <option value={0}>Any time</option>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {/* location filter */}
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
            aria-label="Filter by location"
          >
            <option value="all">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {/* sentiment filter */}
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
            aria-label="Filter by sentiment"
          >
            <option value="all">All sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          {/* staff mention filter */}
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
            aria-label="Filter by staff mention"
          >
            <option value="all">Any reviewer</option>
            <option value="any">Mentions staff</option>
            {["Amit", "Priya", "Rahul", "Vikram", "Sneha", "Arjun", "Meera", "Rohit", "Kavya"].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {/* issue category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
            aria-label="Filter by issue category"
          >
            {ISSUE_CATEGORIES.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
          </select>
          {filtersDirty && (
            <button
              onClick={() => { setLocationId("all"); setSentiment("all"); setStaff("all"); setCategory("all"); setSearchQuery(""); }}
              className="h-8 rounded-lg px-2 text-[12px] font-semibold text-mint-deep hover:underline"
            >
              Reset
            </button>
          )}
          <span className="text-[12px] text-neutral-400">Min stars</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setMinStars(n)}
              className={cn("h-7 min-w-7 rounded-lg px-1.5 text-[12px] font-semibold", minStars === n ? "bg-mint-soft text-mint-deep ring-1 ring-mint/50" : "text-neutral-400 hover:text-brand")}
            >
              {n === 0 ? "Any" : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {pendingDraftReviews.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint/40 bg-mint-soft/30 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="select-all-drafts"
              checked={selectedIds.size > 0 && selectedIds.size === pendingDraftReviews.length}
              onChange={selectAllDrafts}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-mint cursor-pointer"
            />
            <label htmlFor="select-all-drafts" className="text-[12px] font-semibold text-brand cursor-pointer">
              Select all pending drafts ({pendingDraftReviews.length})
            </label>
            {selectedIds.size > 0 && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold text-white">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 rounded-xl bg-brand text-[12px] font-semibold text-white hover:bg-brand-deep"
                disabled={bulkApproving}
                onClick={handleBulkApprove}
              >
                {bulkApproving ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Check size={12} className="mr-1.5 text-mint" />}
                Approve &amp; publish selected ({selectedIds.size})
              </Button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[11.5px] font-semibold text-neutral-500 hover:text-brand"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {reviews.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />)}</div>}
        {!reviews.loading && searched.map((r) => (
          <ReviewRow
            key={r.id}
            review={r}
            onOpen={onOpenReview}
            onApprove={onApprove}
            onDraft={onDraft}
            approving={busy}
            selectable={r.status === "ai-draft" && Boolean(r.draft)}
            selected={selectedIds.has(r.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
        {!reviews.loading && searched.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-[13.5px] text-neutral-400">
            {searchQuery ? `No reviews matching "${searchQuery}".` : "No reviews match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ review: r, compact = false, onOpen, onApprove, onDraft, approving, selectable = false, selected = false, onToggleSelect }: {
  review: ReviewVM;
  compact?: boolean;
  onOpen?: (r: ReviewVM) => void;
  onApprove?: (r: ReviewVM, body: string) => void;
  onDraft?: (r: ReviewVM) => void;
  approving?: string | null;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBusy = approving === r.id;
  return (
    <div
      onClick={() => onOpen?.(r)}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r); } } : undefined}
      className={cn(
        "relative rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:shadow-md",
        selected ? "border-brand ring-2 ring-brand/20 bg-mint-soft/10" : r.stars <= 2 ? "border-red-200/60" : "border-neutral-200/70",
        onOpen && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && onToggleSelect && (
          <div className="pt-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelect(r.id, e as unknown as React.MouseEvent)}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-mint cursor-pointer"
            />
          </div>
        )}
        <span className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold text-white",
          r.sentiment === "positive" ? "bg-mint-deep" : r.sentiment === "neutral" ? "bg-amber-500" : "bg-red-500"
        )}>
          {r.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13.5px] font-semibold text-brand">{r.author}</span>
            <StarRating value={r.stars} size={12} />
            <span className="text-[11.5px] text-neutral-400">{r.location} · {r.time}</span>
            <span className="ml-auto flex items-center gap-1.5">
              <GoogleG size={13} />
              <SentimentBadge sentiment={r.sentiment} />
              <StatusBadge status={r.status} />
            </span>
          </div>
          <p className={cn("mt-1.5 text-[13.5px] leading-relaxed text-neutral-600", compact && !expanded && "line-clamp-2")}>{r.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {r.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-neutral-500">{kw}</span>
            ))}
          </div>

          {(r.draft || r.reply) && (
            <div className={cn("mt-3 rounded-xl p-3", r.status === "ai-draft" ? "bg-mint-soft/40 ring-1 ring-mint/30" : "bg-surface")}>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {r.status === "ai-draft" ? <><Sparkles size={11} className="text-mint-deep" /> AI suggested reply · {Math.round((r.confidence ?? 0.9) * 100)}% confident</> : "Your reply"}
              </p>
              <p className={cn("mt-1 text-[13px] leading-relaxed text-neutral-600", compact && !expanded && "line-clamp-2")}>{r.draft ?? r.reply}</p>
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            {(r.draft || compact) && (
              <button
                className="text-[12px] font-semibold text-mint-deep hover:underline"
                onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
              >
                {expanded ? "Show less" : r.draft ? "Review draft" : "Show more"}
              </button>
            )}
            {r.status === "ai-draft" && onApprove && (
              <Button size="sm" className="h-7 rounded-lg bg-mint-deep px-2.5 text-[11.5px] text-white hover:bg-mint-deep/90" disabled={isBusy}
                onClick={(e) => { e.stopPropagation(); onApprove(r, r.draft || ""); }}>
                {isBusy ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
                {isBusy ? "Posting…" : "Approve"}
              </Button>
            )}
            {r.status === "awaiting" && onDraft && (
              <Button size="sm" variant="outline" className="h-7 rounded-lg px-2.5 text-[11.5px]" disabled={isBusy}
                onClick={(e) => { e.stopPropagation(); onDraft(r); }}>
                <Sparkles size={12} className="mr-1" /> {isBusy ? "Writing…" : "Draft a reply"}
              </Button>
            )}
            {onOpen && (
              <button
                className="text-[12px] font-semibold text-neutral-400 hover:text-brand"
                onClick={(e) => { e.stopPropagation(); onOpen(r); }}
              >
                Details
              </button>
            )}
            <span className="ml-auto text-[11px] text-neutral-300">via {r.source === "request" ? "request · Google" : "Google"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

void ChevronRight;
