// Reputation Action Center — Issue & Action Tracking (doc §6, Section 1):
// detect clusters → assign owner → apply recommended fix → measure impact.
// Live-API backed: GET /api/issues (auto-detects), POST status/owner updates.
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData } from "@/lib/client";
import { cn, AlertTriangle, Check, CheckCircle2, Clock, Target, TrendingUp, Users, Zap } from "./deps";
import type { HealthPayload } from "./client-dashboard";

type IssueVM = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  severity: string;
  location: string;
  mentions: number;
  prevMentions: number;
  trendPct: number;
  firstDetected: string;
  owner: string;
  status: string;
  dueDate: string | null;
  overdue: boolean;
  escalated: boolean;
  recommendedAction: string | null;
  resolvedNote: string | null;
  resolvedAt: string | null;
  // "two weeks later" outcome snapshot (doc Part 2: 42 → 17 · 62 → 78 · 3.9 → 4.3)
  openedMentions: number | null;
  resolvedMentions: number | null;
  resolvedHealth: number | null;
  resolvedRating: number | null;
  // Reputation Alert spec fields (doc Part 2 example card)
  peakWindow: string | null;
  employeesMentioned: number;
  revenueRisk: "high" | "medium" | "low";
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-red-50 text-red-600 ring-red-200" },
  in_progress: { label: "In progress", cls: "bg-amber-soft text-amber-deep ring-amber-200" },
  resolved: { label: "Resolved", cls: "bg-mint-soft text-mint-deep ring-mint/40" },
};

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-mint-deep",
};

const OWNERS = ["Location Manager", "Floor Captain", "Branch Manager", "Ops Lead"];

export function ActionsView({ health }: { health: HealthPayload | null }) {
  const { toast } = useToast();
  const issues = useApiData<{ issues: IssueVM[] }>("/api/issues");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const update = async (id: string, patch: { status?: string; owner?: string; dueDate?: string | null; escalate?: boolean; resolvedNote?: string }) => {
    setBusyId(id);
    try {
      await api.post("/api/issues", { id, ...patch });
      toast({
        title: patch.escalate ? "Issue escalated" : patch.dueDate !== undefined ? "Due date updated" : patch.status === "resolved" ? "Issue resolved" : patch.owner ? "Owner assigned" : "Status updated",
        description: patch.escalate
          ? "Severity raised to high — the platform oversight board is watching this one."
          : patch.status === "resolved"
            ? "Impact will show up in the next Reputation Health cycle."
            : "The team can see this in their next sync.",
      });
      issues.reload();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const confirmResolve = async (id: string) => {
    await update(id, { status: "resolved", resolvedNote: resolveNote.trim() || undefined });
    setResolvingId(null);
    setResolveNote("");
  };

  const list = issues.data?.issues || [];
  const open = list.filter((i) => i.status !== "resolved");
  const highSev = open.filter((i) => i.severity === "high").length;
  const rising = open.filter((i) => i.trendPct > 0).length;
  const resolved = list.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Action Center</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            Issues detected from review themes — assign an owner, apply the fix, measure the improvement.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full border-neutral-200 bg-white text-neutral-500">
          <Zap size={12} className="text-amber-500" /> auto-detected every sync
        </Badge>
      </div>

      {/* summary chips */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open issues", value: String(open.length), icon: <AlertTriangle size={15} />, accent: open.length ? "coral" : undefined },
          { label: "High severity", value: String(highSev), icon: <Zap size={15} /> },
          { label: "Trending up", value: String(rising), icon: <TrendingUp size={15} /> },
          { label: "Resolved", value: String(resolved.length), icon: <CheckCircle2 size={15} />, accent: resolved.length ? ("mint" as const) : undefined },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">{s.label}</p>
              <span className="text-neutral-300">{s.icon}</span>
            </div>
            <p className={cn(
              "mt-1.5 text-[26px] font-bold leading-none",
              s.label === "Open issues" && open.length > 0 ? "text-red-600" : s.label === "Resolved" && resolved.length > 0 ? "text-mint-deep" : "text-brand"
            )}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* issue list */}
        <div className="space-y-3 xl:col-span-2">
          {issues.loading && [0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />)}
          {!issues.loading && list.map((i) => (
            <div key={i.id} className={cn(
              "rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
              i.status === "resolved" ? "border-mint/30" : i.severity === "high" ? "border-red-200/70" : "border-neutral-200/70"
            )}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[i.severity] || "bg-neutral-300")} />
                    <h3 className="text-[14.5px] font-bold text-brand">{i.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1", (STATUS_META[i.status] || STATUS_META.open).cls)}>
                      {(STATUS_META[i.status] || STATUS_META.open).label}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-400">
                    {i.location} · first detected {new Date(i.firstDetected).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-bold leading-none text-brand">{i.mentions}<span className="ml-1 text-[11px] font-medium text-neutral-400">mentions</span></p>
                  {i.prevMentions > 0 && (
                    <p className={cn("mt-1 text-[11.5px] font-semibold", i.trendPct > 0 ? "text-red-500" : "text-mint-deep")}>
                      {i.trendPct > 0 ? "↑" : "↓"} {Math.abs(i.trendPct)}% vs last month
                    </p>
                  )}
                </div>
              </div>

              {i.recommendedAction && i.status !== "resolved" && (
                <div className="mt-3 rounded-xl bg-mint-soft/40 p-3 ring-1 ring-mint/25">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">Recommended action</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">{i.recommendedAction}</p>
                </div>
              )}

              {/* Reputation Alert spec (doc Part 2): Most affected · Employees mentioned · Revenue risk */}
              {i.status !== "resolved" && (i.peakWindow || i.employeesMentioned > 0) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {i.peakWindow && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                      Most affected: {i.peakWindow}
                    </span>
                  )}
                  {i.employeesMentioned > 0 && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                      Employees mentioned: {i.employeesMentioned}
                    </span>
                  )}
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1",
                    i.revenueRisk === "high" ? "bg-red-500 text-white ring-red-500" : i.revenueRisk === "medium" ? "bg-amber-soft text-amber-deep ring-amber-200" : "bg-mint-soft text-mint-deep ring-mint/40"
                  )}>
                    Revenue risk: {i.revenueRisk === "high" ? "High" : i.revenueRisk === "medium" ? "Medium" : "Low"}
                  </span>
                </div>
              )}

              {i.status === "resolved" && (
                <div className="mt-3 rounded-xl bg-mint-soft/40 p-3 ring-1 ring-mint/25">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">
                    <CheckCircle2 size={12} /> Resolved{i.resolvedAt ? ` · ${new Date(i.resolvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">{i.resolvedNote || "Closed after the recommended action was applied."}</p>
                  {/* before → after — the doc's "two weeks later" measurement */}
                  {i.resolvedHealth !== null && (
                    <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-mint/20 pt-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Complaints</p>
                        <p className="text-[12.5px] font-bold text-brand">
                          {i.openedMentions ?? i.mentions} → <span className="text-mint-deep">{i.resolvedMentions ?? i.mentions}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Health</p>
                        <p className="text-[12.5px] font-bold text-brand">
                          {i.resolvedHealth}{health?.score ? ` → ${health.score}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Rating</p>
                        <p className="text-[12.5px] font-bold text-brand">
                          {i.resolvedRating ? `${i.resolvedRating}` : "—"}{health?.roi.avgRating ? ` → ${health.roi.avgRating} ★` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <Users size={13} className="text-neutral-300" />
                <select
                  value={i.owner}
                  onChange={(e) => update(i.id, { owner: e.target.value })}
                  disabled={busyId === i.id}
                  className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[12px] font-medium text-brand outline-none focus:border-mint/60"
                  aria-label={`Owner for ${i.title}`}
                >
                  {[...new Set([i.owner, ...OWNERS])].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {/* due date (doc §1H "Set priority and due date") */}
                {i.status !== "resolved" && (
                  <input
                    type="date"
                    aria-label={`Due date for ${i.title}`}
                    disabled={busyId === i.id}
                    onChange={(e) => e.target.value && update(i.id, { dueDate: e.target.value })}
                    className="h-8 rounded-lg border border-neutral-200 bg-surface px-2 text-[11.5px] text-brand outline-none focus:border-mint/60"
                  />
                )}
                {i.dueDate && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", i.overdue ? "bg-red-500 text-white" : "bg-surface text-neutral-500 ring-1 ring-neutral-200")}>
                    {i.overdue ? "Overdue " : "Due "}{i.dueDate}
                  </span>
                )}
                {i.escalated && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-500">escalated</span>}
                <div className="ml-auto flex gap-1.5">
                  {i.status === "open" && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-[11.5px]" disabled={busyId === i.id} onClick={() => update(i.id, { status: "in_progress" })}>
                      <Clock size={12} className="mr-1" /> Start fixing
                    </Button>
                  )}
                  {i.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-[11.5px] text-red-600 hover:bg-red-50" disabled={busyId === i.id || i.escalated} onClick={() => update(i.id, { escalate: true })}>
                      <Zap size={12} className="mr-1" /> Escalate
                    </Button>
                  )}
                  {i.status === "in_progress" && resolvingId !== i.id && (
                    <Button size="sm" className="h-8 rounded-lg bg-mint-deep px-3 text-[11.5px] text-white hover:bg-mint-deep/90" disabled={busyId === i.id} onClick={() => { setResolvingId(i.id); setResolveNote(i.recommendedAction || ""); }}>
                      <Check size={12} className="mr-1" /> Mark resolved
                    </Button>
                  )}
                  {i.status === "resolved" && (
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg px-3 text-[11.5px]" disabled={busyId === i.id} onClick={() => update(i.id, { status: "open" })}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              {/* resolution note input (doc §1H "Add action notes") */}
              {resolvingId === i.id && (
                <div className="mt-3 rounded-xl border border-mint/40 bg-mint-soft/30 p-3">
                  <p className="text-[12px] font-semibold text-brand">What fixed it? This note becomes the resolved-story on the card.</p>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-mint/40 bg-white px-3 py-2 text-[12.5px] text-brand outline-none focus:border-mint-deep"
                    placeholder="e.g. Added one more floor staff from 6–9 PM for two weeks; complaints stopped."
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-[11.5px]" onClick={() => setResolvingId(null)}>Cancel</Button>
                    <Button size="sm" className="h-8 bg-mint-deep text-[11.5px] text-white hover:bg-mint-deep/90" disabled={busyId === i.id} onClick={() => confirmResolve(i.id)}>
                      {busyId === i.id ? "Resolving…" : "Confirm resolve"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!issues.loading && list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
              <Target size={22} className="mx-auto text-neutral-300" />
              <p className="mt-2 text-[13.5px] font-semibold text-brand">No open issues detected</p>
              <p className="mt-1 text-[12.5px] text-neutral-400">When negative reviews cluster around a theme — waiting time, staff behaviour, billing — an issue is opened here automatically.</p>
            </div>
          )}
        </div>

        {/* context column: themes + impact */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-4">
            <h3 className="text-[14px] font-semibold text-brand">Top negative themes</h3>
            <p className="text-[11.5px] text-neutral-400">share of complaints · last 60 days</p>
            <div className="mt-3 space-y-2.5">
              {(health?.themes || []).map((t) => (
                <div key={t.category}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-neutral-600">{t.label}</span>
                    <span className="font-bold text-brand">{t.share}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className={cn("h-full rounded-full", t.share >= 30 ? "bg-red-400" : t.share >= 15 ? "bg-amber-400" : "bg-mint-deep/60")} style={{ width: `${t.share}%` }} />
                  </div>
                </div>
              ))}
              {(!health || health.themes.length === 0) && <p className="text-[12.5px] text-neutral-400">No complaint clusters — clean month.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-brand p-4 text-white">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Target size={15} className="text-mint" /> Why this matters</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">
              When an issue is fixed, mention counts fall and the Reputation Health Score recovers — the Overview card shows the before/after. That is business impact, not just review management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
