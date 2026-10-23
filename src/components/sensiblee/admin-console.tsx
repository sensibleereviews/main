// Sensiblee platform admin console — dark slate surface, live platform data
// Views: Platform overview, Clients (+drawer, impersonation), Billing, Plans, Platform team, System, My account
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData, inr } from "@/lib/client";
import { useSession } from "@/lib/session";
import { useRouter } from "@/lib/router";
import { hasPerm } from "@/lib/permissions";
import { WebsiteView } from "./admin-cms";
import { RolesPanel, MemberEditor, type RoleRow, type PermissionDef } from "./team-roles";
import { IntegrationsView, AiAdminView, IssuesAdminView, ReputationControlsView, ReportsAdminView, AuditView } from "./admin-ops";
import { ThemeToggle } from "./theme-toggle";
import type { TenantVM, InvoiceVM } from "@/lib/viewmodels";
import {
  cn,
  Mail,
  Copy,
  Activity,
  AlertTriangle,
  Building2,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  Pencil,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  ToggleLeft,
  Users,
  Wallet,
  Webhook,
  X,
  Zap,
  UserCog,
  UserPlus,
  Pause,
  Play,
  Trash2,
  Plug,
  Bot,
  Target,
  SlidersHorizontal,
  ScrollText,
} from "./deps";
import { BrandLogo, StatusBadge } from "./brand";
import { MrrChart, StatCard } from "./widgets";

type AdminOverview = {
  kpis: { mrr: string; mrrRaw: number; tenants: number; active: number; trial?: number; suspended?: number; locations: number; reviewsProcessed: string; waMessages: string };
  syncStatus?: { total: number; synced: number; pending: number; lastSyncAt: string | null; failed24h: number };
  criticalAlerts?: { id: string; label: string; href: string }[];
  mrrSeries: { m: string; mrr: number }[];
  watchlist: { due: TenantVM[]; trials: (TenantVM & { trialEndsIn: number | null })[] };
  aiUsage: { tokens: number; drafts: number; costInr: number; budgetInr: number };
  topTenants: TenantVM[];
  payments: InvoiceVM[];
  demoRequests: { newCount: number; items: { id: string; name: string; company: string; email: string; outlets: string | null; status: string; date: string }[] };
};

type ViewKey = "platform" | "tenants" | "billing" | "plans" | "integrations" | "ai" | "issues" | "reputation" | "reports" | "audit" | "website" | "team" | "system" | "account";

const NAV: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
  { key: "platform", label: "Platform", icon: <LayoutDashboard size={16} /> },
  { key: "tenants", label: "Clients", icon: <Building2 size={16} /> },
  { key: "billing", label: "Billing", icon: <CreditCard size={16} /> },
  { key: "plans", label: "Plans & pricing", icon: <Layers size={16} /> },
  { key: "integrations", label: "Integrations", icon: <Plug size={16} /> },
  { key: "ai", label: "AI engine", icon: <Bot size={16} /> },
  { key: "issues", label: "Issue oversight", icon: <Target size={16} /> },
  { key: "reputation", label: "Reputation controls", icon: <SlidersHorizontal size={16} /> },
  { key: "reports", label: "Reports & jobs", icon: <FileText size={16} /> },
  { key: "website", label: "Website", icon: <Globe size={16} /> },
  { key: "team", label: "Platform team", icon: <Users size={16} /> },
  { key: "audit", label: "Audit log", icon: <ScrollText size={16} /> },
  { key: "system", label: "System", icon: <Server size={16} /> },
  { key: "account", label: "My account", icon: <UserCog size={16} /> },
];

export function roleLabel(role?: string | null): string {
  if (!role) return "Team";
  if (role === "platform_admin") return "Super admin";
  if (role === "platform_manager") return "Manager";
  if (role === "platform_observer") return "Observer";
  if (role === "owner") return "Business owner";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// Computed service status — drives the header pill from real job health
function ServiceStatusBadge() {
  const data = useApiData<SystemPayload>("/api/admin/system");
  const jobs = data.data?.jobs || [];
  const degraded = jobs.filter((j) => j.state !== "healthy").length;
  return (
    <Badge className={cn("ml-auto", degraded ? "border-amber-300/30 bg-amber-soft/10 text-amber-300" : "border-mint/30 bg-mint/10 text-mint hover:bg-mint/10")}>
      {degraded ? `${degraded} service${degraded === 1 ? "" : "s"} degraded` : "All systems operational"}
    </Badge>
  );
}

export function AdminConsole() {
  const { user, logout, refresh } = useSession();
  const { route, navigate } = useRouter();
  const view = (NAV.some((n) => n.key === route.view) ? route.view : "platform") as ViewKey;
  const setView = (v: ViewKey) => navigate({ surface: "admin", view: v });
  const [navOpen, setNavOpen] = useState(false);
  const isSuper = user?.role === "platform_admin";
  const canManageTeam = isSuper || hasPerm(user?.permissions, "team_manage");
  const canOperate = isSuper || user?.role === "platform_manager" || (user?.role === "member" && (user?.permissions?.length || 0) > 0);
  const initials = (user?.name || "OP").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="skin skin-admin flex h-screen bg-brand-deep text-white">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-white/10 bg-brand transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 pb-5 pt-6">
          <BrandLogo height={30} plate />
        </div>
        <div className="mx-4 mb-5 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mint">Platform operator</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">Sensiblee HQ</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin sections">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => { setView(n.key); setNavOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                view === n.key ? "bg-mint text-brand-deep shadow-sm" : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
              aria-current={view === n.key ? "page" : undefined}
            >
              {n.icon}
              {n.label}
              {n.key === "tenants" && <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/70">live</span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint text-[11px] font-bold text-brand-deep">{initials}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12.5px] font-semibold">{user?.name || "Ops Console"}</p>
              <p className="truncate text-[11px] text-white/40">{user?.email || "ops@sensiblee.in"}</p>
            </div>
            <button onClick={async () => { await logout(); navigate({ surface: "admin" }); }} title="Sign out" className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <LogOut size={14} />
            </button>
            <button onClick={() => navigate({ surface: "home" })} title="Back to website" className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </aside>
      {navOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 bg-brand-deep/80 px-4 py-3 backdrop-blur lg:px-7">
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/5 lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div>
            <h2 className="text-[14.5px] font-semibold">
              {view === "platform" && "Platform overview"}
              {view === "tenants" && "Client management"}
              {view === "billing" && "Subscriptions & billing"}
              {view === "plans" && "Plans & pricing"}
              {view === "integrations" && "Integrations administration"}
              {view === "ai" && "AI engine administration"}
              {view === "issues" && "Issue oversight"}
              {view === "reputation" && "Reputation controls"}
              {view === "reports" && "Reports & scheduled tasks"}
              {view === "audit" && "Security & audit log"}
              {view === "website" && "Website content (CMS)"}
              {view === "team" && "Platform team"}
              {view === "system" && "System health"}
              {view === "account" && "My account"}
            </h2>
            <p className="text-[11.5px] text-white/40">Sensiblee operations · {roleLabel(user?.role)}{!canOperate && " · read-only"}</p>
          </div>
          <ServiceStatusBadge />
          <ThemeToggle chrome="dark" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-7 lg:py-6">
          <div className="mx-auto max-w-[1200px]">
            {view === "platform" && <PlatformView onGo={setView} canOperate={canOperate} />}
            {view === "tenants" && <TenantsView canOperate={canOperate} isSuper={isSuper} />}
            {view === "billing" && <BillingView canOperate={canOperate} />}
            {view === "plans" && <PlansView canOperate={canOperate} />}
            {view === "integrations" && <IntegrationsView canOperate={canOperate} />}
            {view === "ai" && <AiAdminView canOperate={canOperate} />}
            {view === "issues" && <IssuesAdminView canOperate={canOperate} />}
            {view === "reputation" && <ReputationControlsView canOperate={canOperate} />}
            {view === "reports" && <ReportsAdminView canOperate={canOperate} />}
            {view === "audit" && <AuditView canOperate={canOperate} />}
            {view === "website" && <WebsiteView canOperate={canOperate} />}
            {view === "team" && <TeamView canManage={canManageTeam} />}
            {view === "system" && <SystemView canOperate={canOperate} />}
            {view === "account" && <AccountView onRefresh={refresh} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* --------------------------- Platform overview --------------------------- */

function PlatformView({ onGo, canOperate }: { onGo: (v: ViewKey) => void; canOperate: boolean }) {
  const data = useApiData<AdminOverview>("/api/admin/overview");
  if (data.loading || !data.data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-brand" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-brand" />
      </div>
    );
  }
  const d = data.data;
  const k = d.kpis;
  const maxMrr = Math.max(...d.topTenants.map((t) => t.reviews), 1);
  const costPct = Math.min(100, Math.round((d.aiUsage.costInr / d.aiUsage.budgetInr) * 100));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DarkStat label="MRR" value={k.mrr} delta="+23%" hint={`${k.active} active${k.suspended ? ` · ${k.suspended} suspended` : ""} of ${k.tenants} clients`} />
        <DarkStat label="Active clients" value={`${k.active} / ${k.tenants}`} hint={`${d.watchlist.trials.length} trials in flight${k.trial ? ` · ${k.trial} trial` : ""}`} icon={<Building2 size={15} />} />
        <DarkStat label="Connected locations" value={String(k.locations)} hint={d.syncStatus ? `${d.syncStatus.synced} synced · ${d.syncStatus.pending} pending${d.syncStatus.failed24h ? ` · ${d.syncStatus.failed24h} failed 24h` : ""}` : "Google profiles across all clients"} icon={<Globe size={15} />} />
        <DarkStat label="Reviews processed" value={k.reviewsProcessed} hint="lifetime across all clients" icon={<Zap size={15} />} />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DarkStat label="WhatsApp messages" value={k.waMessages} hint="30d · quality rating high" icon={<Send size={15} />} />
        <DarkStat label="AI drafts (30d)" value={d.aiUsage.drafts.toLocaleString("en-IN")} hint={`${(d.aiUsage.tokens / 1000).toFixed(1)}k tokens metered`} icon={<Bot size={15} />} />
        <DarkStat label="AI spend (30d)" value={inr(d.aiUsage.costInr)} hint={`budget ${inr(d.aiUsage.budgetInr)} · guardrail armed`} icon={<Bot size={15} />} />
        <DarkStat label="Failed payments" value={String(d.watchlist.due.length)} hint={d.watchlist.due.length ? "dunning in progress" : "collections clean"} icon={<Wallet size={15} />} />
      </div>

      {/* critical alerts + service status (doc §2A) */}
      {(d.criticalAlerts || []).length > 0 && (
        <div className="rounded-2xl border border-red-400/25 bg-red-400/[0.06] p-4">
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-red-300">
            <AlertTriangle size={15} /> Critical alerts — needs a look
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(d.criticalAlerts || []).map((a) => (
              <button key={a.id} onClick={() => onGo(a.href as ViewKey)} className="rounded-full bg-brand-deep/60 px-3 py-1.5 text-[12px] font-semibold text-red-200 transition-colors hover:bg-brand-deep">
                {a.label} →
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-brand p-5 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Momentum — settled invoices by month</h3>
              <p className="mt-0.5 text-xs text-white/40">₹ lakh per month · Razorpay settled</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 border-white/15 bg-transparent text-[12px] text-white/70 hover:bg-white/5 hover:text-white" onClick={() => onGo("billing")}>
              Open billing <Wallet size={13} className="ml-1" />
            </Button>
          </div>
          <MrrChart data={d.mrrSeries} />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-soft/10 p-4">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-300">
              <Gauge size={15} /> Collections watchlist
            </h3>
            <div className="mt-3 space-y-2">
              {d.watchlist.due.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl bg-brand-deep/60 px-3 py-2.5 text-[12.5px]">
                  <div>
                    <p className="font-semibold text-white">{t.business}</p>
                    <p className="text-[11px] text-white/40">auto-debit failed · in dunning</p>
                  </div>
                  <span className="font-bold text-amber-300">{inr(t.mrr)}</span>
                </div>
              ))}
              {d.watchlist.trials.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl bg-brand-deep/60 px-3 py-2.5 text-[12.5px]">
                  <div>
                    <p className="font-semibold text-white">{t.business}</p>
                    <p className="text-[11px] text-white/40">trial ends in {t.trialEndsIn ?? "—"} days</p>
                  </div>
                  <span className="font-semibold text-mint">convert?</span>
                </div>
              ))}
              {d.watchlist.due.length === 0 && d.watchlist.trials.length === 0 && (
                <p className="rounded-xl bg-brand-deep/60 px-3 py-2.5 text-[12.5px] text-white/40">Nothing overdue — collections clean.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-brand p-4">
            <h3 className="text-[13.5px] font-semibold">AI cost control</h3>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[12px] text-white/50">
                <span>{inr(d.aiUsage.costInr)} of {inr(d.aiUsage.budgetInr)}</span>
                <span className="text-mint">{costPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-brand-deep"><div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(costPct, 2)}%` }} /></div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-white/40">
                {(d.aiUsage.tokens / 1000).toFixed(1)}k tokens · {d.aiUsage.drafts.toLocaleString("en-IN")} drafts this month across clients. Budget guardrail pauses batch jobs, never live replies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* demo pipeline */}
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Demo pipeline</h3>
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">{d.demoRequests.newCount} new</Badge>
        </div>
        <div className="space-y-2">
          {d.demoRequests.items.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-3 text-[12.5px]">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{r.company} <span className="font-normal text-white/40">· {r.name}</span></p>
                <p className="truncate text-[11px] text-white/40">{r.email} {r.outlets ? `· ${r.outlets}` : ""} · {r.date}</p>
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize",
                r.status === "new" ? "bg-mint/15 text-mint" : r.status === "contacted" ? "bg-amber-soft/20 text-amber-300" : "bg-white/10 text-white/60"
              )}>{r.status}</span>
              {r.status === "new" && (
                <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2.5 text-[11px] text-white/70 hover:bg-white/5 hover:text-white" disabled={!canOperate}
                  onClick={async () => { await api.patch(`/api/demo-requests/${r.id}`, { status: "contacted" }); data.reload(); }}>
                  Mark contacted
                </Button>
              )}
            </div>
          ))}
          {d.demoRequests.items.length === 0 && (
            <p className="rounded-xl bg-brand-deep/50 px-3.5 py-3 text-[12.5px] text-white/40">No demo requests yet — the contact form feeds this pipeline.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Top clients by reviews processed</h3>
          <Button size="sm" variant="outline" className="h-8 border-white/15 bg-transparent text-[12px] text-white/70 hover:bg-white/5 hover:text-white" onClick={() => onGo("tenants")}>
            Manage clients <Users size={13} className="ml-1" />
          </Button>
        </div>
        <div className="space-y-2.5">
          {d.topTenants.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-[12.5px] font-medium text-white/80">{t.business}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-brand-deep">
                <div className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-mint-deep to-mint pr-2 text-[10px] font-bold text-brand-deep" style={{ width: `${(t.reviews / maxMrr) * 100}%` }}>
                  {t.reviews.toLocaleString("en-IN")}
                </div>
              </div>
              <Badge variant="outline" className="border-white/15 text-white/50">{t.plan}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DarkStat({ label, value, delta, hint, icon }: { label: string; value: string; delta?: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-brand p-4 transition-colors hover:border-mint/30">
      <div className="flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-[12.5px] font-medium">{label}</span>
        {delta && <span className="ml-auto rounded-full bg-mint/15 px-1.5 py-0.5 text-[11px] font-semibold text-mint">{delta}</span>}
      </div>
      <div className="mt-3 text-[24px] font-bold leading-none">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] text-white/35">{hint}</div>}
    </div>
  );
}

/* -------------------------------- Tenants -------------------------------- */

type TenantDetail = {
  tenant: TenantVM;
  detail: {
    mrrSeries: { m: string; mrr: number }[];
    usage: { label: string; used: number; quota: number; unit: string; warn?: boolean }[];
    health: { label: string; score: number }[];
    activity: { t: string; label: string; desc: string }[];
    contact: { person: string; role: string; phone: string; email: string };
    gstin: string;
    nextInvoice: string;
    trialDaysLeft: number | null;
  };
};

function TenantsView({ canOperate, isSuper }: { canOperate: boolean; isSuper: boolean }) {
  const { toast } = useToast();
  const tenants = useApiData<{ tenants: TenantVM[] }>("/api/admin/tenants");
  const [selected, setSelected] = useState<TenantVM | null>(null);
  const [query, setQuery] = useState("");
  const filtered = (tenants.data?.tenants || []).filter(
    (t) => t.business.toLowerCase().includes(query.toLowerCase()) || t.owner.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          placeholder="Search clients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-64 rounded-xl border border-white/10 bg-brand px-3.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-mint/50"
        />
        <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">{filtered.length} clients</Badge>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-brand">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/35">
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Locations</th>
              <th className="px-3 py-3 font-medium">MRR</th>
              <th className="px-3 py-3 font-medium">Reviews</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-white">{t.business}</p>
                  <p className="text-[11.5px] text-white/40">{t.owner} · since {t.since}</p>
                </td>
                <td className="px-3 py-3.5"><Badge variant="outline" className="border-white/15 text-white/70">{t.plan}</Badge></td>
                <td className="px-3 py-3.5 text-white/60">{t.locations}</td>
                <td className="px-3 py-3.5 font-semibold text-mint">{inr(t.mrr)}</td>
                <td className="px-3 py-3.5 text-white/60">{t.reviews.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3.5"><AdminStatus status={t.status} /></td>
                <td className="px-5 py-3.5 text-right">
                  <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2.5 text-[11.5px] text-white/60 hover:bg-white/5 hover:text-white"
                    onClick={() => setSelected(t)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DarkCard icon={<Users size={16} />} title="Roles & access" desc="Super admin, platform managers and read-only observers — plus owner-defined roles inside each client workspace. Every action audit-logged." />
        <DarkCard icon={<KeyRound size={16} />} title="Impersonation" desc={isSuper ? "Support can enter a client workspace with a consent banner + time-boxed session." : "Time-boxed support sessions — super admin only."} />
        <DarkCard icon={<Activity size={16} />} title="Client health" desc="Sync failures, low adoption, quota warnings — surfaced before churn calls." />
      </div>

      <TenantDrawer tenant={selected} onClose={() => setSelected(null)} onChanged={() => tenants.reload()} toast={toast} canOperate={canOperate} isSuper={isSuper} />
    </div>
  );
}

function AdminStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-mint/15 text-mint",
    trial: "bg-amber-soft/15 text-amber-300",
    past_due: "bg-red-400/15 text-red-300",
    suspended: "bg-white/10 text-white/50",
  };
  const label = status === "past_due" ? "Past due" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", map[status])}>{label}</span>;
}

export function DarkCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-brand p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint/15 text-mint">{icon}</span>
      <h4 className="mt-3 text-[13.5px] font-semibold">{title}</h4>
      <p className="mt-1 text-[12px] leading-relaxed text-white/40">{desc}</p>
    </div>
  );
}

/* -------------------------------- Billing -------------------------------- */

type BillingPayload = { invoices: InvoiceVM[]; stats: { settledMonth: number; failed: number; overdueAmount: number; annualContracts: number } };

function BillingView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<BillingPayload>("/api/admin/invoices");
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, action: "remind" | "mark-paid", tenant: string) => {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/invoices/${id}`, { action });
      toast({
        title: action === "remind" ? "Payment link sent" : "Invoice settled",
        description: action === "remind" ? `WhatsApp link dispatched to ${tenant}'s billing contact.` : `${tenant} — subscription reactivated if it was paused.`,
      });
      data.reload();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DarkStat label="Settled (this month)" value={inr(d.stats.settledMonth)} hint="Razorpay · T+2 settlement" icon={<Landmark size={15} />} />
        <DarkStat label="Failed payments" value={String(d.stats.failed)} hint={d.stats.failed ? `${inr(d.stats.overdueAmount)} overdue` : "all clean"} icon={<Wallet size={15} />} />
        <DarkStat label="Invoices issued" value={String(d.invoices.length)} hint="lifetime" icon={<Layers size={15} />} />
        <DarkStat label="Dunning ladder" value={d.stats.failed ? "active" : "idle"} hint="retry 1/3/5/7 · WhatsApp links" icon={<RefreshCw size={15} />} />
      </div>

      {d.invoices.filter((p) => p.status === "overdue").map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <div className="text-[13px]">
            <p className="font-semibold text-red-300">Auto-debit failed — {p.tenant}</p>
            <p className="mt-0.5 text-[12px] text-white/50">{p.method} · {p.date} · {p.remindersSent} reminder{p.remindersSent === 1 ? "" : "s"} sent · smart dunning armed</p>
          </div>
          <Button size="sm" className="h-8 rounded-xl bg-mint text-[12px] text-brand-deep hover:bg-mint/90" disabled={busyId === p.id || !canOperate} onClick={() => act(p.id, "remind", p.tenant)}>
            Send WhatsApp payment link
          </Button>
        </div>
      ))}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-brand">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/35">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Amount</th>
              <th className="px-3 py-3 font-medium">Method</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {d.invoices.map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="px-5 py-3 font-mono text-[11.5px] text-white/50">{p.number}</td>
                <td className="px-3 py-3 font-medium text-white/85">{p.tenant}</td>
                <td className="px-3 py-3 font-semibold">{inr(p.amount)}</td>
                <td className="px-3 py-3 text-white/50">{p.method}</td>
                <td className="px-3 py-3">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                    p.status === "paid" ? "bg-mint/15 text-mint" : p.status === "overdue" ? "bg-red-400/15 text-red-300" : "bg-white/10 text-white/60")}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = `/api/admin/invoices/${p.id}/pdf`;
                        a.download = `sensiblee-invoice-${p.number}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}>
                      <Download size={11} className="mr-1" /> PDF
                    </Button>
                    {p.status !== "paid" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white"
                          disabled={busyId === p.id || !canOperate} onClick={() => act(p.id, "remind", p.tenant)}>
                          Remind
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 border-mint/30 bg-transparent px-2 text-[11px] text-mint hover:bg-mint/10"
                          disabled={busyId === p.id || !canOperate} onClick={() => act(p.id, "mark-paid", p.tenant)}>
                          Mark paid
                        </Button>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DarkCard icon={<RefreshCw size={16} />} title="Proration engine" desc="Mid-cycle upgrades bill per day immediately; downgrades become invoice credit." />
        <DarkCard icon={<Wallet size={16} />} title="Dunning ladder" desc="Retries day 1/3/5/7, WhatsApp payment links, auto-downgrade before suspension." />
        <DarkCard icon={<Webhook size={16} />} title="Razorpay events" desc="Signature-verified webhooks reconcile invoices within 30 seconds." />
      </div>
    </div>
  );
}

/* ----------------------------- Plans & pricing ---------------------------- */

type PlanRow = { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number; blurb: string; features: string[]; popular: boolean };

function PlansView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<{ plans: PlanRow[] }>("/api/admin/plans");
  const [edits, setEdits] = useState<Record<string, { monthlyInr: number; halfYearlyInr: number; annualInr: number; features: string; name: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", monthlyInr: 1499, locations: 1, seats: 2, waQuota: 50, aiDrafts: "200 / month", blurb: "", features: "" });

  const save = async (p: PlanRow) => {
    const e = edits[p.id];
    if (!e) return;
    setSavingId(p.id);
    try {
      await api.patch("/api/admin/plans", {
        id: p.id, monthlyInr: e.monthlyInr, halfYearlyInr: e.halfYearlyInr, annualInr: e.annualInr,
        name: e.name !== p.name ? e.name : undefined,
        features: e.features !== p.features.join(", ") ? e.features.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : undefined,
      });
      toast({ title: `${p.name} updated`, description: "Public pricing page reflects instantly." });
      data.reload();
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const createPlan = async () => {
    setSavingId("create");
    try {
      await api.post("/api/admin/plans", {
        ...newPlan,
        features: newPlan.features.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      });
      toast({ title: "Plan created", description: `${newPlan.name} is live on the pricing pipeline.` });
      setCreating(false);
      setNewPlan({ name: "", monthlyInr: 1499, locations: 1, seats: 2, waQuota: 50, aiDrafts: "200 / month", blurb: "", features: "" });
      data.reload();
    } catch (err) {
      toast({ title: "Could not create", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={!canOperate} onClick={() => setCreating((v) => !v)}>
          + New plan
        </Button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-mint/25 bg-mint/[0.04] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-mint">Create subscription plan</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="block">
              <span className="text-[10.5px] text-white/40">Plan name</span>
              <input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="e.g. Enterprise" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block">
              <span className="text-[10.5px] text-white/40">Monthly ₹</span>
              <input type="number" value={newPlan.monthlyInr} onChange={(e) => setNewPlan({ ...newPlan, monthlyInr: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block">
              <span className="text-[10.5px] text-white/40">Locations</span>
              <input type="number" min={1} value={newPlan.locations} onChange={(e) => setNewPlan({ ...newPlan, locations: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block">
              <span className="text-[10.5px] text-white/40">Seats</span>
              <input type="number" min={1} value={newPlan.seats} onChange={(e) => setNewPlan({ ...newPlan, seats: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block">
              <span className="text-[10.5px] text-white/40">WhatsApp quota</span>
              <input type="number" min={0} value={newPlan.waQuota} onChange={(e) => setNewPlan({ ...newPlan, waQuota: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block">
              <span className="text-[10.5px] text-white/40">AI drafts label</span>
              <input value={newPlan.aiDrafts} onChange={(e) => setNewPlan({ ...newPlan, aiDrafts: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-[10.5px] text-white/40">Blurb</span>
              <input value={newPlan.blurb} onChange={(e) => setNewPlan({ ...newPlan, blurb: e.target.value })} placeholder="One line shown under the price" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
            <label className="block md:col-span-4">
              <span className="text-[10.5px] text-white/40">Features (comma or newline separated)</span>
              <textarea value={newPlan.features} onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })} rows={2} placeholder="Up to 3 locations, WhatsApp review requests, Monthly PDF report" className="mt-1 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 py-2 text-[12.5px] text-white outline-none focus:border-mint/50" />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 text-[11.5px] text-white/60" onClick={() => setCreating(false)}>Cancel</Button>
            <Button size="sm" className="h-8 rounded-lg bg-mint px-3.5 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={savingId === "create" || !newPlan.name.trim()} onClick={createPlan}>Create plan</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {data.data.plans.map((p) => {
          const e = edits[p.id] || { monthlyInr: p.monthlyInr, halfYearlyInr: p.halfYearlyInr, annualInr: p.annualInr, features: p.features.join(", "), name: p.name };
          const dirty = e.monthlyInr !== p.monthlyInr || e.halfYearlyInr !== p.halfYearlyInr || e.annualInr !== p.annualInr || e.features !== p.features.join(", ") || e.name !== p.name;
          return (
            <div key={p.id} className={cn("relative rounded-2xl border p-5", p.popular ? "border-mint/60 bg-brand ring-1 ring-mint/30" : "border-white/10 bg-brand")}>
              {p.popular && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-mint px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">Most popular</span>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="text-[16px] font-bold">{p.name}</h3>
                <p className="text-[22px] font-bold text-mint">
                  ₹{e.monthlyInr.toLocaleString("en-IN")}<span className="text-[12px] font-medium text-white/40">/mo</span>
                </p>
              </div>
              <p className="mt-1 text-[12.5px] text-white/45">{p.blurb}</p>
              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Plan features (editable — shown on the public pricing page)</span>
                <textarea value={e.features} rows={Math.min(6, Math.max(3, e.features.split(/[,\n]/).length))}
                  onChange={(ev) => setEdits((m) => ({ ...m, [p.id]: { ...e, features: ev.target.value } }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 py-2 text-[12px] leading-relaxed text-white/85 outline-none focus:border-mint/50" />
              </label>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Monthly ₹</span>
                  <input type="number" value={e.monthlyInr} onChange={(ev) => setEdits((m) => ({ ...m, [p.id]: { ...e, monthlyInr: Number(ev.target.value) } }))}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Half-yr ₹</span>
                  <input type="number" value={e.halfYearlyInr} onChange={(ev) => setEdits((m) => ({ ...m, [p.id]: { ...e, halfYearlyInr: Number(ev.target.value) } }))}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Annual ₹</span>
                  <input type="number" value={e.annualInr} onChange={(ev) => setEdits((m) => ({ ...m, [p.id]: { ...e, annualInr: Number(ev.target.value) } }))}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12.5px] text-white outline-none focus:border-mint/50" />
                </label>
              </div>
              <Button size="sm" className={cn("mt-3 h-9 w-full rounded-xl text-[12.5px]", p.popular ? "bg-mint text-brand-deep hover:bg-mint/90" : "border border-white/15 bg-transparent text-white hover:bg-white/5")}
                disabled={!canOperate || !dirty || savingId === p.id} onClick={() => save(p)}>
                {!canOperate ? "Read-only" : savingId === p.id ? "Saving…" : dirty ? "Save pricing" : "Saved"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DarkCard icon={<CreditCard size={16} />} title="Checkout" desc="Razorpay subscription sessions created from the admin or public pricing page; GST invoices auto-issued." />
        <DarkCard icon={<Gauge size={16} />} title="Quota display" desc="Clients see live meters for drafts, WhatsApp messages and locations — no surprise overage." />
      </div>
    </div>
  );
}

/* --------------------------------- System -------------------------------- */

type SystemPayload = {
  jobs: { name: string; desc: string; state: string; queue: string; latency: string }[];
  events: { id: string; type: string; name: string; state: string; detail: string | null; t: string }[];
  connectors: { google: string; whatsapp: string };
  security?: { mfaRequiredForAdmins: boolean };
  smtp?: { host: string; port: number; secure: boolean; user: string; pass: string; from: string };
};

type FlagsPayload = {
  tenantTotal: number;
  flags: { key: string; label: string; description: string; enabled: boolean; optIns: number }[];
};

type GatewaysPayload = {
  gateways: {
    provider: string;
    label: string;
    description: string;
    enabled: boolean;
    keyId: string;
    keySecretMasked: string;
    webhookSecretMasked: string;
    hasCredentials: boolean;
    provisioned: { tenantId: string; tenantName: string; mode: string; status: string; accountRef: string }[];
  }[];
  tenants: { id: string; name: string; planId: string; mrrInr: number }[];
};

function SystemView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<SystemPayload>("/api/admin/system");
  const flagsData = useApiData<FlagsPayload>("/api/admin/flags");
  const gatewaysData = useApiData<GatewaysPayload>("/api/admin/gateways");
  const [running, setRunning] = useState<string | null>(null);
  const [flagBusy, setFlagBusy] = useState<string | null>(null);
  const [gwBusy, setGwBusy] = useState<string | null>(null);
  const [cfgOpen, setCfgOpen] = useState<string | null>(null);
  const [cfgDraft, setCfgDraft] = useState<Record<string, { keyId: string; keySecret: string; webhookSecret: string }>>({});
  const [provDraft, setProvDraft] = useState<Record<string, { tenantId: string; mode: string; accountRef: string }>>({});
  const [smtpDraft, setSmtpDraft] = useState<{ host: string; port: number; secure: boolean; user: string; pass: string; from: string } | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState("admin@sensiblee.in");
  const [sendingTest, setSendingTest] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const gwInput = "h-8 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 text-[12px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-mint/50";

  const toggleGateway = async (provider: string, enabled: boolean, label: string) => {
    setGwBusy(provider);
    try {
      await api.patch(`/api/admin/gateways/${provider}`, { enabled });
      toast({
        title: `${label} turned ${enabled ? "on" : "off"}`,
        description: enabled
          ? "Workspaces can now be provisioned on this gateway."
          : "Collection is suspended for provisioned workspaces — links are preserved.",
      });
      gatewaysData.reload();
    } catch (e) {
      toast({ title: "Could not update gateway", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGwBusy(null);
    }
  };

  const saveGatewayCreds = async (provider: string) => {
    setGwBusy(provider);
    try {
      const d = cfgDraft[provider] || { keyId: "", keySecret: "", webhookSecret: "" };
      await api.patch(`/api/admin/gateways/${provider}`, { keyId: d.keyId, keySecret: d.keySecret, webhookSecret: d.webhookSecret });
      toast({ title: "Credentials saved", description: "Secrets are stored write-only — every read shows only the masked tail." });
      gatewaysData.reload();
    } catch (e) {
      toast({ title: "Could not save credentials", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGwBusy(null);
    }
  };

  const provisionTenant = async (provider: string) => {
    setGwBusy(provider);
    try {
      const p = provDraft[provider] || { tenantId: "", mode: "test", accountRef: "" };
      await api.post(`/api/admin/gateways/${provider}/provision`, p);
      toast({ title: "Workspace provisioned", description: "Billing for this workspace now flows through the gateway." });
      setProvDraft((m) => ({ ...m, [provider]: { tenantId: "", mode: "test", accountRef: "" } }));
      gatewaysData.reload();
    } catch (e) {
      toast({ title: "Could not provision workspace", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGwBusy(null);
    }
  };

  const updateProvision = async (provider: string, tenantId: string, patch: { status?: string; mode?: string }) => {
    setGwBusy(provider);
    try {
      await api.patch(`/api/admin/gateways/${provider}/provision`, { tenantId, ...patch });
      gatewaysData.reload();
    } catch (e) {
      toast({ title: "Could not update provisioning", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGwBusy(null);
    }
  };

  const unprovisionTenant = async (provider: string, tenantId: string, tenantName: string) => {
    setGwBusy(provider);
    try {
      await api.del(`/api/admin/gateways/${provider}/provision?tenantId=${tenantId}`);
      toast({ title: `${tenantName} unprovisioned`, description: "The workspace falls back to manual invoicing until a gateway is provisioned again." });
      gatewaysData.reload();
    } catch (e) {
      toast({ title: "Could not unprovision workspace", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGwBusy(null);
    }
  };

  const runJob = async (name: string) => {
    setRunning(name);
    try {
      await api.post("/api/admin/system", { name });
      toast({ title: `${name} completed`, description: "Event recorded in the system log." });
      data.reload();
    } finally {
      setRunning(null);
    }
  };

  const toggleFlag = async (key: string, enabled: boolean, label: string) => {
    setFlagBusy(key);
    try {
      const res = await api.patch<{ flag: { optIns: number; effectiveCount: number } }>(`/api/admin/flags/${key}`, { enabled });
      toast({
        title: `${label} turned ${enabled ? "on" : "off"} platform-wide`,
        description: `${res.flag.effectiveCount} of ${res.flag.optIns} opted-in tenant${res.flag.optIns === 1 ? "" : "s"} effectively ${enabled ? "live" : "suspended"}. Opt-ins are preserved.`,
      });
      flagsData.reload();
    } catch (e) {
      toast({ title: "Could not update flag", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setFlagBusy(null);
    }
  };

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("capitalize", d.connectors.google === "live" ? "border-mint/30 bg-mint/10 text-mint" : "border-amber-300/30 bg-amber-soft/10 text-amber-300")}>
          Google connector: {d.connectors.google}
        </Badge>
        <Badge className={cn("capitalize", d.connectors.whatsapp === "live" ? "border-mint/30 bg-mint/10 text-mint" : "border-amber-300/30 bg-amber-soft/10 text-amber-300")}>
          WhatsApp connector: {d.connectors.whatsapp}
        </Badge>
        <span className="text-[11.5px] text-white/40">simulated mode keeps the loop alive until API credentials are set (README-DEPLOY).</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {d.jobs.map((j) => (
          <div key={j.name} className={cn("rounded-2xl border p-4", j.state === "healthy" ? "border-white/10 bg-brand" : "border-amber-300/25 bg-amber-soft/5")}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[13px] font-semibold text-white">{j.name}</p>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", j.state === "healthy" ? "bg-mint/15 text-mint" : "bg-amber-soft/15 text-amber-300")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", j.state === "healthy" ? "animate-pulse bg-mint" : "bg-amber-300")} />
                {j.state}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-white/45">{j.desc}</p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11.5px] text-white/40">
              <span>{j.queue}</span>
              <span>{j.latency}</span>
            </div>
            <Button size="sm" variant="outline" className="mt-3 h-7 w-full border-white/15 bg-transparent text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
              disabled={!canOperate || running === j.name} onClick={() => runJob(j.name)}>
              {!canOperate ? "Read-only" : running === j.name ? "Running…" : "Run manual cycle"}
            </Button>
          </div>
        ))}
      </div>

      {/* Feature flags — system master switches */}
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ToggleLeft size={16} className="text-mint" /> Feature flags</h3>
            <p className="mt-0.5 text-xs text-white/40">Master switches per capability — tenants opt in from their Settings; opt-ins are preserved when a flag is off</p>
          </div>
          <Badge className="shrink-0 border-white/10 bg-white/5 text-[10.5px] text-white/60">{flagsData.data?.tenantTotal ?? "—"} tenants</Badge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(flagsData.data?.flags || []).map((f) => (
            <div key={f.key} className={cn("rounded-xl border p-3.5", f.enabled ? "border-mint/25 bg-mint/[0.04]" : "border-white/10 bg-brand-deep/40")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-white/85">{f.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/40">{f.description}</p>
                </div>
                <Switch
                  checked={f.enabled}
                  disabled={!canOperate || flagBusy === f.key}
                  onCheckedChange={(v) => toggleFlag(f.key, v, f.label)}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[10.5px]">
                <span className={cn("font-semibold", f.enabled ? "text-mint" : "text-amber-300")}>{f.enabled ? "ON" : "OFF"} platform-wide</span>
                <span className="text-white/40">{f.optIns} opt-in{f.optIns === 1 ? "" : "s"}</span>
              </div>
            </div>
          ))}
          {flagsData.data && flagsData.data.flags.length === 0 && (
            <p className="text-[12px] text-white/40">No flags defined yet.</p>
          )}
        </div>
      </div>

      {/* Security controls — administrator MFA enforcement (doc §2C) */}
      <div className={cn("rounded-2xl border p-5", data.data?.security?.mfaRequiredForAdmins ? "border-amber-300/30 bg-amber-soft/[0.06]" : "border-white/10 bg-brand")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ShieldCheck size={16} className="text-mint" /> Security controls</h3>
            <p className="mt-0.5 text-xs text-white/40">Administrator MFA enforcement — when on, platform admins without MFA cannot sign in until a super admin enables it for them</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={cn("text-[11.5px] font-bold", data.data?.security?.mfaRequiredForAdmins ? "text-amber-300" : "text-white/45")}>
              {data.data?.security?.mfaRequiredForAdmins ? "ENFORCED" : "OFF"}
            </span>
            <Switch
              checked={Boolean(data.data?.security?.mfaRequiredForAdmins)}
              disabled={!canOperate || running === "mfa"}
              onCheckedChange={async (v) => {
                setRunning("mfa");
                try {
                  await api.post("/api/admin/system", { security: { mfaRequiredForAdmins: v } });
                  toast({
                    title: v ? "Administrator MFA enforcement enabled" : "Administrator MFA enforcement disabled",
                    description: v ? "Platform admins without MFA are locked out until MFA is enabled on their account." : "Platform admins can sign in without MFA again.",
                  });
                  data.reload();
                } catch (e) {
                  toast({ title: "Could not update", description: e instanceof Error ? e.message : "", variant: "destructive" });
                } finally {
                  setRunning(null);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Outbound Email — SMTP relay configuration & test dispatch */}
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Mail size={16} className="text-mint" /> Outbound Email (SMTP Relay)</h3>
            <p className="mt-0.5 text-xs text-white/40">Transport for self-service password reset emails, weekly executive digests, and critical system alerts</p>
          </div>
          <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-[10.5px] font-bold text-mint">RFC 5321 Transport Ready</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">SMTP Host</span>
            <input
              value={smtpDraft?.host ?? data.data?.smtp?.host ?? "smtp.gmail.com"}
              onChange={(e) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), host: e.target.value })}
              className={gwInput}
            />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Port</span>
            <input
              type="number"
              value={smtpDraft?.port ?? data.data?.smtp?.port ?? 587}
              onChange={(e) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), port: Number(e.target.value) })}
              className={gwInput}
            />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Sender (From Header)</span>
            <input
              value={smtpDraft?.from ?? data.data?.smtp?.from ?? "Sensiblee <noreply@sensiblee.in>"}
              onChange={(e) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), from: e.target.value })}
              className={gwInput}
            />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">SMTP Username</span>
            <input
              value={smtpDraft?.user ?? data.data?.smtp?.user ?? ""}
              onChange={(e) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), user: e.target.value })}
              placeholder="e.g. alerts@sensiblee.in"
              className={gwInput}
            />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">SMTP Password / App Key</span>
            <input
              type="password"
              value={smtpDraft?.pass ?? (data.data?.smtp?.pass ? "••••••••••••" : "")}
              onChange={(e) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), pass: e.target.value })}
              placeholder="App password or secret"
              className={gwInput}
            />
          </label>
          <div className="flex items-center gap-3 pt-5">
            <span className="text-[11.5px] text-white/60">TLS / SSL Secure</span>
            <Switch
              checked={smtpDraft?.secure ?? data.data?.smtp?.secure ?? false}
              disabled={!canOperate}
              onCheckedChange={(v) => setSmtpDraft({ ...(smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" }), secure: v })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
              disabled={!canOperate || savingSmtp}
              onClick={async () => {
                setSavingSmtp(true);
                try {
                  const payload = smtpDraft || data.data?.smtp || { host: "smtp.gmail.com", port: 587, secure: false, user: "", pass: "", from: "Sensiblee <noreply@sensiblee.in>" };
                  await api.post("/api/admin/system", { smtp: payload });
                  toast({ title: "SMTP Settings Saved", description: "Outbound relay credentials updated." });
                  data.reload();
                } catch (e) {
                  toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
                } finally {
                  setSavingSmtp(false);
                }
              }}
            >
              Save SMTP settings
            </Button>
            <span className="text-[10.5px] text-white/30">If live credentials are unconfigured or fail, emails safely log to system events in simulation mode.</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={testEmailAddr}
              onChange={(e) => setTestEmailAddr(e.target.value)}
              placeholder="test@domain.com"
              className={cn(gwInput, "h-8 w-44")}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white"
              disabled={!canOperate || sendingTest}
              onClick={async () => {
                setSendingTest(true);
                try {
                  const res = await api.post<{ ok: boolean }>("/api/admin/system", { action: "test-email", recipient: testEmailAddr });
                  toast({ title: res.ok ? "Test Email Sent" : "Test Dispatched", description: `Dispatched test email to ${testEmailAddr}.` });
                } catch (e) {
                  toast({ title: "Send failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
                } finally {
                  setSendingTest(false);
                }
              }}
            >
              {sendingTest ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Send size={12} className="mr-1" />}
              Send Test Email
            </Button>
          </div>
        </div>
      </div>

      {/* Payment gateways — registry + per-workspace provisioning */}
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><CreditCard size={16} className="text-mint" /> Payment gateways</h3>
            <p className="mt-0.5 text-xs text-white/40">Collection rails for subscription billing — credentials are write-only and shown masked; provisioning a workspace links its invoices to the gateway</p>
          </div>
          <Badge className="shrink-0 border-white/10 bg-white/5 text-[10.5px] text-white/60">{gatewaysData.data?.gateways.length ?? "—"} gateways</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {(gatewaysData.data?.gateways || []).map((g) => {
            const expanded = cfgOpen === g.provider;
            const draft = cfgDraft[g.provider] || { keyId: "", keySecret: "", webhookSecret: "" };
            const prov = provDraft[g.provider] || { tenantId: "", mode: "test", accountRef: "" };
            const busyKey = gwBusy === g.provider;
            return (
              <div key={g.provider} className={cn("rounded-xl border p-4", g.enabled ? "border-mint/25 bg-mint/[0.04]" : "border-white/10 bg-brand-deep/40")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-bold text-white/85">{g.label}</p>
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white/40">{g.provider}</span>
                      {g.provisioned.length > 0 && (
                        <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10.5px] font-semibold text-mint">{g.provisioned.length} provisioned</span>
                      )}
                    </div>
                    <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-white/40">{g.description}</p>
                    <p className="mt-1.5 text-[11px] text-white/50">
                      {g.hasCredentials ? (
                        <>
                          Key ID <span className="font-mono text-white/70">{g.keyId}</span>
                          {" · "}Secret <span className="font-mono text-white/70">{g.keySecretMasked}</span>
                          {g.webhookSecretMasked && (<>{" · "}Webhook <span className="font-mono text-white/70">{g.webhookSecretMasked}</span></>)}
                        </>
                      ) : g.keyId ? (
                        <span className="text-amber-300">Key ID saved — add the key secret to start collecting</span>
                      ) : (
                        <span className="text-amber-300">No credentials set — configure before going live</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2.5 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
                      onClick={() => {
                        if (expanded) { setCfgOpen(null); return; }
                        setCfgOpen(g.provider);
                        setCfgDraft((m) => ({ ...m, [g.provider]: { keyId: g.keyId, keySecret: "", webhookSecret: "" } }));
                      }}>
                      {expanded ? "Close" : (<><KeyRound size={12} className="mr-1.5" /> Configure</>)}
                    </Button>
                    <Switch checked={g.enabled} disabled={!canOperate || busyKey} onCheckedChange={(v) => toggleGateway(g.provider, v, g.label)} />
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-brand-deep/60 p-3.5">
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Key ID</span>
                        <input value={draft.keyId} onChange={(e) => setCfgDraft((m) => ({ ...m, [g.provider]: { ...draft, keyId: e.target.value } }))} placeholder="rzp_test_xxxxxxxx" className={cn(gwInput, "mt-1")} />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                          Key secret{g.keySecretMasked ? <span className="ml-1 normal-case text-white/30">saved {g.keySecretMasked}</span> : <span className="ml-1 normal-case text-white/30">not set</span>}
                        </span>
                        <input type="password" value={draft.keySecret} onChange={(e) => setCfgDraft((m) => ({ ...m, [g.provider]: { ...draft, keySecret: e.target.value } }))} placeholder={g.keySecretMasked ? "Leave empty to keep" : "Paste secret"} className={cn(gwInput, "mt-1")} />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                          Webhook secret{g.webhookSecretMasked ? <span className="ml-1 normal-case text-white/30">saved {g.webhookSecretMasked}</span> : <span className="ml-1 normal-case text-white/30">not set</span>}
                        </span>
                        <input type="password" value={draft.webhookSecret} onChange={(e) => setCfgDraft((m) => ({ ...m, [g.provider]: { ...draft, webhookSecret: e.target.value } }))} placeholder={g.webhookSecretMasked ? "Leave empty to keep" : "Paste secret"} className={cn(gwInput, "mt-1")} />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
                        disabled={!canOperate || busyKey} onClick={() => saveGatewayCreds(g.provider)}>
                        Save credentials
                      </Button>
                      <span className="text-[10.5px] text-white/35">Secrets are stored server-side and never returned by the API — only the last 4 characters are ever shown.</span>
                    </div>
                  </div>
                )}

                {g.provisioned.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {g.provisioned.map((p) => (
                      <div key={p.tenantId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-deep/50 px-3 py-2 text-[11.5px]">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-semibold text-white/85">{p.tenantName}</span>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9.5px] font-bold", p.mode === "live" ? "bg-mint text-brand-deep" : "bg-white/10 text-white/60")}>{p.mode.toUpperCase()}</span>
                          <span className={cn("text-[10.5px] font-semibold", p.status === "active" ? "text-mint" : "text-amber-300")}>{p.status}</span>
                          {p.accountRef && <span className="font-mono text-[10px] text-white/35">{p.accountRef}</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[10.5px] text-white/60 hover:bg-white/5 hover:text-white"
                            disabled={!canOperate || busyKey}
                            onClick={() => updateProvision(g.provider, p.tenantId, { status: p.status === "active" ? "paused" : "active" })}>
                            {p.status === "active" ? (<><Pause size={11} className="mr-1" /> Pause</>) : (<><Play size={11} className="mr-1" /> Resume</>)}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[10.5px] text-red-300 hover:bg-red-400/10 hover:text-red-200"
                            disabled={!canOperate || busyKey}
                            onClick={() => unprovisionTenant(g.provider, p.tenantId, p.tenantName)}>
                            <Trash2 size={11} className="mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                  <select value={prov.tenantId} disabled={!g.enabled}
                    onChange={(e) => setProvDraft((m) => ({ ...m, [g.provider]: { ...prov, tenantId: e.target.value } }))}
                    className={cn(gwInput, "h-8 w-48 disabled:opacity-40")}>
                    <option value="">Select workspace…</option>
                    {(gatewaysData.data?.tenants || [])
                      .filter((t) => !g.provisioned.some((p) => p.tenantId === t.id))
                      .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select value={prov.mode} disabled={!g.enabled}
                    onChange={(e) => setProvDraft((m) => ({ ...m, [g.provider]: { ...prov, mode: e.target.value } }))}
                    className={cn(gwInput, "h-8 w-32 disabled:opacity-40")}>
                    <option value="test">Test mode</option>
                    <option value="live">Live mode</option>
                  </select>
                  <input value={prov.accountRef} disabled={!g.enabled}
                    onChange={(e) => setProvDraft((m) => ({ ...m, [g.provider]: { ...prov, accountRef: e.target.value } }))}
                    placeholder="Account ref (merchant ID)" className={cn(gwInput, "h-8 w-52 disabled:opacity-40")} />
                  <Button size="sm" className="h-8 rounded-lg border border-mint/40 bg-mint/10 px-3 text-[11.5px] font-semibold text-mint hover:bg-mint/20"
                    disabled={!canOperate || busyKey || !g.enabled || !prov.tenantId} onClick={() => provisionTenant(g.provider)}>
                    Provision workspace
                  </Button>
                  {!g.enabled && <span className="text-[10.5px] text-amber-300">Switch {g.label} on to provision workspaces</span>}
                </div>
              </div>
            );
          })}
          {gatewaysData.data && gatewaysData.data.gateways.length === 0 && (
            <p className="text-[12px] text-white/40">No gateways registered yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <h3 className="text-[15px] font-semibold">Event log</h3>
        <p className="mt-0.5 text-xs text-white/40">Deploys, job cycles, billing signals and incidents — newest first</p>
        <div className="mt-4 space-y-2">
          {d.events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-2.5 text-[12.5px]">
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full",
                e.state === "ok" ? "bg-mint" : e.state === "warn" ? "bg-amber-300" : "bg-red-400")} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/85">{e.name} <span className="font-normal uppercase text-white/30">· {e.type}</span></p>
                {e.detail && <p className="truncate text-[11.5px] text-white/40">{e.detail}</p>}
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-white/25">{e.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DarkCard icon={<Server size={16} />} title="Single-VPS deployment" desc="Docker Compose on Hostinger: nginx, app, worker, Postgres, Redis. Nightly encrypted backups, 2-hour restore target." />
        <DarkCard icon={<KeyRound size={16} />} title="Secrets & keys" desc="Google OAuth, WhatsApp HSM templates, Razorpay webhooks — rotated quarterly, least-privilege scopes." />
        <DarkCard icon={<Activity size={16} />} title="Audit trail" desc="Every admin action, login and impersonation event is immutable-logged and exportable." />
      </div>
    </div>
  );
}

/* ----------------------------- Tenant drawer ----------------------------- */

function TenantDrawer({ tenant, onClose, onChanged, toast, canOperate, isSuper }: {
  tenant: TenantVM | null;
  onClose: () => void;
  onChanged: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  canOperate: boolean;
  isSuper: boolean;
}) {
  const { navigate } = useRouter();
  const { refresh } = useSession();
  const open = tenant !== null;
  const [busy, setBusy] = useState(false);
  const [planPicking, setPlanPicking] = useState(false);
  const detail = useApiData<TenantDetail>(tenant ? `/api/admin/tenants/${tenant.id}` : null);

  const patchTenant = async (data: { status?: string; planId?: string; note?: string; dataRequest?: "export" | "delete" }, label: string) => {
    if (!tenant) return;
    setBusy(true);
    try {
      const res = await api.patch<{ ok: boolean; dataRequest?: string; exportUrl?: string }>(`/api/admin/tenants/${tenant.id}`, data);
      if (data.dataRequest === "export") {
        toast({ title: "Export ready", description: "The full workspace data bundle is downloading (DPDP subject-access request)." });
        if (res.exportUrl) window.open(res.exportUrl, "_blank");
      } else {
        toast({ title: label, description: `${tenant.business} updated.` });
      }
      detail.reload();
      onChanged();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    if (!tenant) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/tenants/${tenant.id}/impersonate`);
      await refresh();
      toast({ title: "Impersonation started", description: `Time-boxed 30-min session into ${tenant.business}. Audit-logged.` });
      onClose();
      navigate({ surface: "client" });
    } catch (e) {
      toast({ title: "Could not start session", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const t = detail.data?.tenant || tenant;
  const d = detail.data?.detail;

  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        onClick={onClose}
        aria-label="Close client details"
        tabIndex={open ? 0 : -1}
        className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-brand shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Client details"
      >
        {t && d && (
          <TenantDrawerBody
            tenant={t}
            detail={d}
            busy={busy}
            planPicking={planPicking}
            setPlanPicking={setPlanPicking}
            onPatch={patchTenant}
            onImpersonate={impersonate}
            onClose={onClose}
            toast={toast}
            canOperate={canOperate}
            isSuper={isSuper}
          />
        )}
        {tenant && detail.loading && (
          <div className="flex flex-1 items-center justify-center">
            <RefreshCw size={22} className="animate-spin text-mint" />
          </div>
        )}
      </aside>
    </div>
  );
}

function TenantDrawerBody({ tenant: t, detail: d, busy, planPicking, setPlanPicking, onPatch, onImpersonate, onClose, toast, canOperate, isSuper }: {
  tenant: TenantVM;
  detail: TenantDetail["detail"];
  busy: boolean;
  planPicking: boolean;
  setPlanPicking: (v: boolean) => void;
  onPatch: (data: { status?: string; planId?: string; note?: string; dataRequest?: "export" | "delete" }, label: string) => void;
  onImpersonate: () => void;
  onClose: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  canOperate: boolean;
  isSuper: boolean;
}) {
  const maxMrr = Math.max(...d.mrrSeries.map((p) => p.mrr), 0.01);
  const points = d.mrrSeries.map((p, i) => `${(i / Math.max(d.mrrSeries.length - 1, 1)) * 264},${54 - (p.mrr / maxMrr) * 44}`).join(" ");
  const plans = ["starter", "growth", "multi"];
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);

  return (
    <>
      <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-[13px] font-bold text-mint">
            {t.business.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <div>
            <p className="text-[14.5px] font-bold text-white">{t.business}</p>
            <p className="text-[11.5px] text-white/40">{t.owner} · since {t.since}</p>
          </div>
          <AdminStatus status={t.status} />
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white" aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* plan + mrr */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Plan · MRR</p>
              <p className="mt-1 text-[22px] font-bold text-mint">{inr(t.mrr)}<span className="ml-1.5 text-[11.5px] font-medium text-white/40">/ month</span></p>
            </div>
            <Badge variant="outline" className="border-mint/40 bg-mint/10 text-mint hover:bg-mint/10">{t.plan} plan</Badge>
          </div>
          <svg viewBox="0 0 264 58" className="mt-3 w-full" aria-hidden>
            <polyline points={points} fill="none" stroke="#88d6a0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {d.mrrSeries.length > 0 && (
              <circle cx="264" cy={54 - (d.mrrSeries[d.mrrSeries.length - 1].mrr / maxMrr) * 44} r="3.5" fill="#88d6a0" />
            )}
          </svg>
          <div className="flex justify-between font-mono text-[9.5px] text-white/25">
            <span>{d.mrrSeries[0]?.m || "—"}</span>
            <span>latest</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11.5px]">
            <span className="text-white/40">Next invoice</span>
            <span className={cn("font-semibold", t.status === "past_due" ? "text-amber-300" : "text-white/80")}>{d.nextInvoice}</span>
          </div>
        </div>

        {/* status banners + controls */}
        {t.status === "past_due" && (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-3.5 text-[12px]">
            <p className="font-semibold text-red-300">Dunning in progress</p>
            <p className="mt-0.5 text-white/50">AI generation and WhatsApp sending are paused. Suspension auto-scheduled unless a retry succeeds.</p>
            <Button size="sm" className="mt-2.5 h-7 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/90"
              onClick={() => toast({ title: "Payment link sent", description: `Fresh Razorpay link dispatched to ${d.contact.person} on WhatsApp.` })}>
              Send payment link
            </Button>
          </div>
        )}
        {t.status === "trial" && (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-soft/10 p-3.5 text-[12px]">
            <p className="font-semibold text-amber-300">Trial · {d.trialDaysLeft ?? "—"} days left</p>
            <p className="mt-0.5 text-white/50">Conversion nudge is armed for day −3. Usage is tracked against the Starter quota.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {t.status !== "active" && (
            <Button size="sm" variant="outline" className="h-8 rounded-xl border-mint/30 bg-transparent px-3 text-[11.5px] text-mint hover:bg-mint/10" disabled={busy || !canOperate}
              onClick={() => onPatch({ status: "active" }, "Client activated")}>
              <Check size={12} className="mr-1" /> Activate
            </Button>
          )}
          {t.status !== "suspended" && (
            <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white" disabled={busy || !canOperate}
              onClick={() => onPatch({ status: "suspended" }, "Client suspended")}>
              Suspend
            </Button>
          )}
          {planPicking ? (
            <span className="flex gap-1.5">
              {plans.map((pid) => (
                <Button key={pid} size="sm" variant="outline" className="h-8 rounded-xl border-white/15 bg-transparent px-2.5 text-[11px] capitalize text-white/70 hover:bg-white/5 hover:text-white"
                  disabled={busy || !canOperate || t.plan.toLowerCase() === pid}
                  onClick={() => { onPatch({ planId: pid }, "Plan changed"); setPlanPicking(false); }}>
                  {pid}{t.plan.toLowerCase() === pid ? " ✓" : ""}
                </Button>
              ))}
            </span>
          ) : (
            <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white" disabled={!canOperate} onClick={() => setPlanPicking(true)}>
              <Layers size={12} className="mr-1" /> Change plan
            </Button>
          )}
        </div>

        {/* usage */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Usage this month</p>
          <div className="mt-3 space-y-3">
            {d.usage.map((u) => {
              const pct = Math.min(100, Math.round((u.used / Math.max(u.quota, 1)) * 100));
              return (
                <div key={u.label}>
                  <div className="flex items-baseline justify-between text-[11.5px]">
                    <span className="font-medium text-white/70">{u.label}</span>
                    <span className={cn("font-mono", u.warn ? "text-amber-300" : "text-white/40")}>
                      {u.used.toLocaleString("en-IN")} / {u.quota.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div className={cn("h-full rounded-full", u.warn ? "bg-amber-300" : "bg-mint")} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/30">{u.unit}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* reputation health */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Reputation health</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {d.health.map((h) => (
              <div key={h.label}>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="truncate text-white/60">{h.label}</span>
                  <span className="font-bold text-white">{h.score}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full", h.score >= 85 ? "bg-mint" : h.score >= 70 ? "bg-amber-300" : "bg-red-400")} style={{ width: `${h.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          {d.health.length > 0 && (
            <p className="mt-3 text-[10.5px] text-white/30">Composite health score: {Math.round(d.health.reduce((s, h) => s + h.score, 0) / d.health.length)}/100</p>
          )}
        </div>

        {/* activity */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Recent activity</p>
          <div className="mt-3 space-y-3.5">
            {d.activity.map((a, i) => (
              <div key={i} className="relative flex gap-3 pl-1">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mint ring-4 ring-mint/10" />
                {i < d.activity.length - 1 && <span className="absolute left-[4.5px] top-5 h-full w-px bg-white/10" />}
                <div className="pb-0.5">
                  <p className="text-[12px] font-semibold capitalize text-white/85">{a.label}</p>
                  <p className="text-[11px] leading-snug text-white/40">{a.desc}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-white/25">{a.t}</p>
                </div>
              </div>
            ))}
            {d.activity.length === 0 && <p className="text-[12px] text-white/40">No activity recorded yet.</p>}
          </div>
        </div>

        {/* contact + compliance */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4 text-[12px]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Account</p>
          <div className="mt-2.5 space-y-1.5 text-white/60">
            <p>{d.contact.person} · {d.contact.role}</p>
            <p className="font-mono text-[11.5px]">{d.contact.phone} · {d.contact.email}</p>
            <p className="text-white/40">GSTIN {d.gstin} · invoices auto-issued with GST breakup</p>
          </div>
        </div>

        {/* data & compliance — DPDP export / deletion (doc §2B/§2L) */}
        <div className="rounded-2xl border border-white/10 bg-brand-deep/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Data &amp; compliance</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">Process subject-access and erasure requests: export the full workspace bundle as JSON, or anonymise the workspace permanently.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white" disabled={busy || !canOperate}
              onClick={() => onPatch({ dataRequest: "export" }, "Export")}>
              <Download size={12} className="mr-1" /> Export data
            </Button>
            {!deleteArmed ? (
              <Button size="sm" variant="outline" className="h-8 rounded-xl border-red-400/30 bg-transparent px-3 text-[11.5px] text-red-300 hover:bg-red-400/10" disabled={busy || !canOperate}
                onClick={() => setDeleteArmed(true)}>
                <Trash2 size={12} className="mr-1" /> Deletion request
              </Button>
            ) : (
              <span className="flex flex-wrap items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/[0.06] px-3 py-1.5 text-[11px] text-red-200">
                Anonymise {t.business} permanently?
                <button className="font-bold text-red-300 hover:underline" disabled={busy}
                  onClick={() => { onPatch({ dataRequest: "delete" }, "Data deletion processed"); setDeleteArmed(false); }}>
                  Confirm
                </button>
                <button className="text-white/50 hover:underline" onClick={() => setDeleteArmed(false)}>Cancel</button>
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/30">Deletion scrubs PII (name, contacts, GSTIN, contact book), deactivates users, stops billing — reviews stay as anonymous aggregate. Every step is audit-logged.</p>
        </div>

        {/* actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" className="h-9 rounded-xl bg-mint text-[11.5px] font-semibold text-brand-deep hover:bg-mint/90" disabled={busy || !isSuper} title={isSuper ? "Start a time-boxed support session" : "Super admin only"} onClick={onImpersonate}>
            <UserPlus size={12} className="mr-1" /> Impersonate
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/15 bg-transparent text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white"
            onClick={() => toast({ title: "Billing view", description: `Invoices and dunning for ${t.business} — see the Billing tab.` })}>
            <Wallet size={12} className="mr-1" /> Billing
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/15 bg-transparent text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white"
            onClick={() => { setNoteOpen((v) => !v); setNoteText(""); }}>
            <Activity size={12} className="mr-1" /> Note
          </Button>
        </div>

        {/* support note input (doc §2B "Record support notes") */}
        {noteOpen && (
          <div className="rounded-2xl border border-mint/25 bg-mint/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mint">Support note — appended to the client activity trail</p>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2}
              placeholder="e.g. Called owner about sync failures — advised reconnecting the profile Friday."
              className="mt-2 w-full rounded-lg border border-white/10 bg-brand-deep/60 px-2.5 py-2 text-[12px] text-white outline-none focus:border-mint/50" />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-8 text-[11px] text-white/60" onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11px] font-semibold text-brand-deep hover:bg-mint/85" disabled={busy || !noteText.trim()}
                onClick={() => { onPatch({ note: noteText }, "Support note recorded"); setNoteText(""); setNoteOpen(false); }}>
                Save note
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ----------------------------- Platform team ----------------------------- */

type StaffMember = { id: string; name: string; email: string; role: string; invitePending: boolean; lastLoginAt: string | null; initials: string };

// Platform admin team — roles defined by the platform administrator (super admin).
// Managers operate the console; observers are read-only.
function TeamView({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const team = useApiData<{ team: (StaffMember & { roleName?: string | null })[] }>("/api/admin/team");
  const rolesData = useApiData<{ roles: RoleRow[]; catalog: PermissionDef[] }>("/api/admin/team/roles");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<{ name: string; email: string; role: string; roleId: string }>({ name: "", email: "", role: "platform_manager", roleId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const customRoles = rolesData.data?.roles || [];
  const roleCatalog = rolesData.data?.catalog || [];

  const sendInvite = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ invite: { email: string; tempPassword: string } }>("/api/admin/team", {
        name: invite.name,
        email: invite.email,
        ...(invite.roleId ? { roleId: invite.roleId } : { role: invite.role }),
      });
      toast({ title: "Invite created", description: `${res.invite.email} · temp password: ${res.invite.tempPassword}` });
      setInvite({ name: "", email: "", role: "platform_manager", roleId: "" });
      setInviteOpen(false);
      team.reload();
      rolesData.reload();
    } catch (e) {
      toast({ title: "Invite failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveMember = async (id: string, payload: { name?: string; email?: string; role?: string; roleId?: string | null }) => {
    try {
      await api.patch(`/api/admin/team/${id}`, payload);
      team.reload();
      toast({ title: "Team member updated", description: "Their role and access change immediately." });
      setEditingId(null);
    } catch (e) {
      toast({ title: "Could not update member", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const removeMember = async (m: { id: string; name: string }) => {
    try {
      await api.del(`/api/admin/team/${m.id}`);
      team.reload();
      toast({ title: "Team member removed", description: `${m.name} no longer has platform access.` });
    } catch (e) {
      toast({ title: "Could not remove", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const createRole = async (payload: { name: string; description: string; permissions: string[] }) => {
    try {
      await api.post("/api/admin/team/roles", payload);
      rolesData.reload();
      toast({ title: "Role created", description: `${payload.name} is now available on invites and member editing.` });
    } catch (e) {
      toast({ title: "Could not create role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const updateRole = async (id: string, payload: { name: string; description: string; permissions: string[] }) => {
    try {
      await api.put(`/api/admin/team/roles/${id}`, payload);
      rolesData.reload();
      team.reload();
      toast({ title: "Role updated", description: "Everyone on this role gets the new permissions immediately." });
    } catch (e) {
      toast({ title: "Could not update role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const deleteRole = async (role: RoleRow) => {
    try {
      await api.del(`/api/admin/team/roles/${role.id}`);
      rolesData.reload();
      toast({ title: "Role deleted", description: `${role.name} removed.` });
    } catch (e) {
      toast({ title: "Could not delete role", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const staff = team.data?.team || [];
  const memberLabel = (m: { role: string; roleName?: string | null }) => m.roleName || roleLabel(m.role);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">Admin team members</h3>
            <p className="mt-0.5 text-[12px] text-white/40">
              Roles are defined here by the platform administrator — presets or custom permission sets.
            </p>
          </div>
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">{staff.length} account{staff.length === 1 ? "" : "s"}</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {staff.map((m) => (
            <div key={m.id}>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold", m.role === "platform_admin" ? "bg-mint text-brand-deep" : m.roleName ? "bg-mint/20 text-mint" : m.invitePending ? "bg-white/15 text-white/60" : "bg-white/10 text-white")}>{m.initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {m.name} {m.invitePending && <span className="text-[10.5px] font-bold uppercase text-amber-300">· invite pending</span>}
                  </p>
                  <p className="truncate text-[11px] text-white/40">{m.email}{m.lastLoginAt ? ` · last sign-in ${new Date(m.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                  m.role === "platform_admin" ? "bg-mint/15 text-mint" : m.roleName ? "bg-mint/15 text-mint" : m.role === "platform_manager" ? "bg-white/10 text-white/80" : "bg-white/5 text-white/50"
                )}>
                  {memberLabel(m)}
                </span>
                {canManage && m.role !== "platform_admin" && (
                  <>
                    <button onClick={() => setEditingId(editingId === m.id ? null : m.id)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Edit ${m.name}`}>
                      <Pencil size={13} />
                    </button>
                    {editingId !== m.id && (
                      <button onClick={() => removeMember(m)} className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label={`Remove ${m.name}`}>
                        <X size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
              {canManage && editingId === m.id && (
                <MemberEditor
                  dark
                  member={{ id: m.id, name: m.name, email: m.email, role: m.role, roleName: m.roleName || null, invitePending: m.invitePending, initials: m.initials }}
                  presets={[["platform_manager", "Manager — operate the console"], ["platform_observer", "Observer — read-only"]]}
                  customRoles={customRoles}
                  onSave={(payload) => saveMember(m.id, payload)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}
          {team.loading && <div className="h-24 animate-pulse rounded-xl bg-brand-deep/50" />}
        </div>

        {canManage ? (
          inviteOpen ? (
            <div className="mt-4 space-y-2.5 rounded-2xl border border-mint/25 bg-brand-deep/60 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Name</span>
                  <input value={invite.name} onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))} placeholder="Meera Krishnan"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand px-3 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-mint/50" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Work email</span>
                  <input value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} placeholder="teammate@sensiblee.in"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-brand px-3 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-mint/50" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Role</span>
                {[["platform_manager", "Manager — operate the console"], ["platform_observer", "Observer — read-only"]].map(([r, label]) => (
                  <button key={r} onClick={() => setInvite((i) => ({ ...i, role: r, roleId: "" }))}
                    className={cn("rounded-full px-3 py-1.5 text-[11.5px] font-semibold", !invite.roleId && invite.role === r ? "bg-mint text-brand-deep" : "bg-white/5 text-white/60 hover:text-white", invite.roleId && "opacity-40")}>
                    {label}
                  </button>
                ))}
                {customRoles.map((r) => (
                  <button key={r.id} onClick={() => setInvite((i) => ({ ...i, roleId: i.roleId === r.id ? "" : r.id }))}
                    className={cn("rounded-full px-3 py-1.5 text-[11.5px] font-semibold", invite.roleId === r.id ? "bg-mint text-brand-deep" : "bg-mint/10 text-mint hover:bg-mint/20")}>
                    {r.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" disabled={busy || !invite.email.includes("@")} onClick={sendInvite}>
                  <UserPlus size={13} className="mr-1.5" /> Create invite
                </Button>
                <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setInviteOpen(false)}>Cancel</Button>
              </div>
              <p className="text-[10.5px] leading-relaxed text-white/30">Production emails the invite; here you get a one-time temp password to share privately.</p>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-4 h-9 w-full rounded-xl border-white/15 bg-transparent text-[12.5px] text-white/70 hover:bg-white/5 hover:text-white sm:w-auto sm:px-5" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} className="mr-1.5" /> Invite team member
            </Button>
          )
        ) : (
          <p className="mt-4 rounded-xl bg-brand-deep/50 px-3.5 py-3 text-[12px] text-white/40">
            Your role does not include team management — ask a super admin for changes.
          </p>
        )}

        {canManage && (
          <div className="mt-4">
            <button onClick={() => setRolesOpen(!rolesOpen)} className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/10">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white">
                <ShieldCheck size={14} className="text-mint" /> Roles &amp; permissions
                <span className="text-[10.5px] font-bold text-white/40">{customRoles.length} custom role{customRoles.length === 1 ? "" : "s"}</span>
              </span>
              <span className="text-[11px] text-white/40">{rolesOpen ? "Hide" : "Manage"}</span>
            </button>
            {rolesOpen && (
              <div className="mt-2">
                <RolesPanel
                  dark
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DarkCard icon={<ShieldCheck size={16} />} title="Role model" desc="Super admin → everything incl. this team. Presets: manager (operate) and observer (read-only) — or build custom roles with exact permissions." />
        <DarkCard icon={<KeyRound size={16} />} title="Private by default" desc="This console and its URL are known only to Sensiblee platform staff — never advertised." />
        <DarkCard icon={<Activity size={16} />} title="Audited" desc="Invites, role changes, removals and every console mutation land in the audit trail." />
      </div>
    </div>
  );
}

/* ------------------------------ My account ------------------------------ */

type AccountPayload = { account: { name: string; email: string; phone: string; role: string; lastLoginAt: string | null } };

// Personal profile + password for platform staff (super admin, managers, observers)
function AccountView({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const { toast } = useToast();
  const { user } = useSession();
  const account = useApiData<AccountPayload>("/api/account");
  const mfaData = useApiData<{ enabled: boolean; secret?: string; otpauthUrl?: string }>("/api/auth/mfa");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);

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
      await onRefresh();
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

  const darkInput = "h-10 w-full rounded-xl border border-white/10 bg-brand-deep/60 px-3 text-[13px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-mint/50";
  const DarkField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/35">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint"><UserCog size={17} /></span>
          <div>
            <h3 className="text-[14.5px] font-semibold">Your profile</h3>
            <p className="text-[11.5px] text-white/40">{roleLabel(user?.role)} · last sign-in {user ? "tracked" : "—"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DarkField label="Full name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={darkInput} /></DarkField>
          <DarkField label="Mobile number"><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98xxx xxxxx" className={darkInput} /></DarkField>
          <div className="sm:col-span-2">
            <DarkField label="Email (used for sign-in)"><input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={darkInput} /></DarkField>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="h-9 rounded-xl bg-mint px-4 text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" onClick={saveProfile} disabled={savingProfile || !loaded}>
            {savingProfile ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Check size={13} className="mr-1.5" />}
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint"><KeyRound size={17} /></span>
          <div>
            <h3 className="text-[14.5px] font-semibold">Sign-in & security</h3>
            <p className="text-[11.5px] text-white/40">Change your own password — other logins are unaffected</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <DarkField label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" className={darkInput} /></DarkField>
          <DarkField label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="8+ characters" autoComplete="new-password" className={darkInput} /></DarkField>
          <DarkField label="Confirm"><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" className={darkInput} /></DarkField>
        </div>
        <div className="mt-4 flex items-center justify-end">
          <Button size="sm" className="h-9 rounded-xl bg-mint px-4 text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" onClick={changePassword} disabled={savingPw || !pw.current || !pw.next || !pw.confirm}>
            {savingPw ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <ShieldCheck size={13} className="mr-1.5" />}
            {savingPw ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication (MFA / TOTP) Card */}
      <div className="rounded-2xl border border-white/10 bg-brand p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", mfaData.data?.enabled ? "bg-mint/15 text-mint" : "bg-amber-300/15 text-amber-300")}>
              <ShieldCheck size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14.5px] font-semibold">Two-Factor Authentication (MFA)</h3>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", mfaData.data?.enabled ? "bg-mint/15 text-mint" : "bg-white/10 text-white/50")}>
                  {mfaData.data?.enabled ? "Active" : "Not configured"}
                </span>
              </div>
              <p className="text-[11.5px] text-white/40">
                Protect your platform super admin privileges with time-based 6-digit codes (RFC 6238 TOTP).
              </p>
            </div>
          </div>

          {!mfaData.data?.enabled ? (
            <Button
              size="sm"
              className="h-8 rounded-xl bg-mint px-3.5 text-[12px] font-semibold text-brand-deep hover:bg-mint/90"
              onClick={() => setMfaSetupOpen(!mfaSetupOpen)}
            >
              {mfaSetupOpen ? "Close setup" : "Setup Authenticator App"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl border-red-500/30 bg-transparent px-3 text-[12px] text-red-300 hover:bg-red-500/10"
              onClick={() => setMfaSetupOpen(!mfaSetupOpen)}
            >
              {mfaSetupOpen ? "Close" : "Disable 2FA"}
            </Button>
          )}
        </div>

        {mfaSetupOpen && !mfaData.data?.enabled && (
          <div className="mt-4 rounded-xl border border-mint/20 bg-brand-deep/50 p-4">
            <p className="text-[12px] font-semibold text-mint">Step 1: Enter this Secret Key in your Authenticator app</p>
            <p className="mt-1 text-[11px] text-white/50">Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password.</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] font-bold tracking-widest text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                {mfaData.data?.secret || "GENERATING..."}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (mfaData.data?.secret) {
                    navigator.clipboard.writeText(mfaData.data.secret);
                    toast({ title: "Secret copied", description: mfaData.data.secret });
                  }
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-mint hover:underline"
              >
                <Copy size={12} /> Copy Key
              </button>
            </div>

            <p className="mt-4 text-[12px] font-semibold text-white/80">Step 2: Enter the 6-digit code shown in your app to activate</p>
            <div className="mt-2 flex max-w-xs gap-2">
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-9 w-32 rounded-lg border border-white/10 bg-brand-deep px-3 text-center font-mono text-[14px] tracking-widest text-white outline-none focus:border-mint"
              />
              <Button
                size="sm"
                className="h-9 rounded-lg bg-mint px-4 text-[12px] font-semibold text-brand-deep hover:bg-mint/90"
                disabled={totpCode.length !== 6 || mfaBusy}
                onClick={async () => {
                  setMfaBusy(true);
                  try {
                    await api.post("/api/auth/mfa", { action: "enable", code: totpCode });
                    toast({ title: "MFA Activated", description: "Two-factor authentication is now required on every sign-in." });
                    setMfaSetupOpen(false);
                    setTotpCode("");
                    mfaData.reload();
                  } catch (e) {
                    toast({ title: "Verification failed", description: e instanceof Error ? e.message : "Invalid code", variant: "destructive" });
                  } finally {
                    setMfaBusy(false);
                  }
                }}
              >
                Verify &amp; Activate
              </Button>
            </div>
          </div>
        )}

        {mfaSetupOpen && mfaData.data?.enabled && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
            <p className="text-[12px] font-semibold text-red-300">Disable Two-Factor Authentication</p>
            <p className="mt-1 text-[11px] text-white/50">Enter your current 6-digit authenticator code to confirm deactivation.</p>
            <div className="mt-2.5 flex max-w-xs gap-2">
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-9 w-32 rounded-lg border border-white/10 bg-brand-deep px-3 text-center font-mono text-[14px] tracking-widest text-white outline-none focus:border-mint"
              />
              <Button
                size="sm"
                className="h-9 rounded-lg bg-red-500 px-4 text-[12px] font-semibold text-white hover:bg-red-600"
                disabled={totpCode.length !== 6 || mfaBusy}
                onClick={async () => {
                  setMfaBusy(true);
                  try {
                    await api.post("/api/auth/mfa", { action: "disable", code: totpCode });
                    toast({ title: "MFA Disabled", description: "Two-factor authentication has been turned off." });
                    setMfaSetupOpen(false);
                    setTotpCode("");
                    mfaData.reload();
                  } catch (e) {
                    toast({ title: "Deactivation failed", description: e instanceof Error ? e.message : "Invalid code", variant: "destructive" });
                  } finally {
                    setMfaBusy(false);
                  }
                }}
              >
                Confirm Disable
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

void StatCard;
