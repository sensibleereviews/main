// Reputation Action Center — detect → assign → fix → measure.
// Issue cards derived from negative-review themes (GET /api/issues), with
// owner assignment and lifecycle transitions (POST /api/issues).
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData } from "@/lib/client";
import { cn, AlertTriangle, ArrowRight, Check, ClipboardCheck, Clock, RefreshCw, TrendingDown, TrendingUp, UserPlus } from "./deps";

export type IssueRow = {
  id: string;
  locationId: string | null;
  locationName: string;
  category: string;
  title: string;
  severity: string;
  status: "detected" | "assigned" | "in_progress" | "fixed";
  owner: string | null;
  recommendedAction: string | null;
  firstDetected: string;
  lastMention: string;
  mentions: number;
  prevMentions: number;
  trendPct: number;
  peakWindow: string;
  staffMentioned: string[];
  trend: { label: string; score: number }[];
  impact: { mentionsBefore: number; mentionsAfter: number; healthBefore: number; healthNow: number } | null;
};

const STATUS_META: Record<IssueRow["status"], { label: string; chip: string; step: number }> = {
  detected: { label: "Detected", chip: "bg-red-50 text-red-600 ring-red-300", step: 0 },
  assigned: { label: "Assigned", chip: "bg-amber-soft text-amber-deep ring-amber-400/50", step: 1 },
  in_progress: { label: "In progress", chip: "bg-surface text-brand ring-neutral-300", step: 2 },
  fixed: { label: "Fixed", chip: "bg-mint-soft text-mint-deep ring-mint/50", step: 3 },
};

const LOOP = ["Review", "Analyze", "Assign", "Fix", "Measure"];

export function ActionCenterView() {
  const { toast } = useToast();
  const issues = useApiData<{ issues: IssueRow[] }>("/api/issues");
  const team = useApiData<{ team: { id: string; name: string }[] }>("/api/team");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = issues.data?.issues || [];
  const open = rows.filter((r) => r.status !== "fixed");
  const fixed = rows.filter((r) => r.status === "fixed");

  const patch = async (id: string, body: { status?: string; owner?: string }, okMsg: string) => {
    setBusyId(id);
    try {
      await api.post("/api/issues", { id, ...body });
      toast({ title: okMsg, description: "The Action Center re-measures impact automatically." });
      issues.reload();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Reputation Action Center</h1>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            The loop that turns feedback into operations — detect an issue, assign an owner, fix it, and measure the reputation impact.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 rounded-xl text-[12.5px]" onClick={() => issues.reload()} disabled={issues.loading}>
          <RefreshCw size={13} className={cn("mr-1.5", issues.loading && "animate-spin")} /> Re-detect issues
        </Button>
      </div>

      {/* Reputation-to-Operations loop */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-neutral-200/70 bg-white px-4 py-3">
        {LOOP.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={12} className="text-neutral-300" />}
            <span className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] font-bold",
              i <= 1 ? "bg-mint-soft text-mint-deep" : i === 2 ? "bg-amber-soft text-amber-deep" : i === 3 ? "bg-brand/10 text-brand" : "bg-surface text-neutral-500"
            )}>
              {step}
            </span>
          </span>
        ))}
        <span className="ml-auto text-[11.5px] text-neutral-400">{open.length} open · {fixed.length} resolved</span>
      </div>

      {/* Open issues */}
      <div className="space-y-4">
        {issues.loading && [0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface" />)}
        {!issues.loading && open.map((issue) => {
          const meta = STATUS_META[issue.status];
          return (
            <div key={issue.id} className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold ring-1",
                      issue.severity === "high" ? "bg-red-50 text-red-600 ring-red-300" : issue.severity === "medium" ? "bg-amber-soft text-amber-deep ring-amber-400/50" : "bg-surface text-neutral-500 ring-neutral-300"
                    )}>
                      {issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟠" : "🟡"} {issue.severity} severity
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", meta.chip)}>{meta.label}</span>
                  </div>
                  <h3 className="mt-2 text-[16.5px] font-bold text-brand">{issue.title}</h3>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">
                    {issue.locationName} · first detected {new Date(issue.firstDetected).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · peak window {issue.peakWindow}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[26px] font-bold leading-none text-brand">{issue.mentions}</p>
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[11.5px] text-neutral-400">
                    mentions (30d)
                    {issue.trendPct !== 0 && (
                      <span className={cn("flex items-center font-bold", issue.trendPct > 0 ? "text-red-500" : "text-mint-deep")}>
                        {issue.trendPct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(issue.trendPct)}%
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* lifecycle rail */}
              <div className="mt-4 flex items-center gap-0">
                {(["detected", "assigned", "in_progress", "fixed"] as IssueRow["status"][]).map((s, i) => (
                  <div key={s} className="flex flex-1 items-center">
                    <div className={cn("h-1.5 flex-1 rounded-full", meta.step >= i ? "bg-mint-deep" : "bg-surface")} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {(["detected", "assigned", "in_progress", "fixed"] as IssueRow["status"][]).map((s) => (
                  <span key={s}>{STATUS_META[s].label}</span>
                ))}
              </div>

              {/* recommended action */}
              {issue.recommendedAction && issue.status !== "fixed" && (
                <div className="mt-4 rounded-xl bg-amber-soft/50 px-4 py-3 ring-1 ring-amber-400/30">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-deep">Recommended action</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{issue.recommendedAction}</p>
                </div>
              )}

              {/* staff mentioned */}
              {issue.staffMentioned.length > 0 && (
                <p className="mt-3 text-[12px] text-neutral-500">
                  Employees mentioned: <span className="font-semibold text-brand">{issue.staffMentioned.join(", ")}</span> — coach with context, never score.
                </p>
              )}

              {/* owner + actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                {issue.owner ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-[12.5px] font-semibold text-brand">
                    <UserPlus size={13} /> Owner: {issue.owner}
                  </span>
                ) : (
                  <select
                    aria-label="Assign owner"
                    defaultValue=""
                    onChange={(e) => e.target.value && patch(issue.id, { owner: e.target.value }, "Issue assigned")}
                    className="h-9 rounded-xl border border-neutral-200 bg-surface px-2.5 text-[12.5px] font-medium text-neutral-600 outline-none focus:border-mint/60"
                  >
                    <option value="" disabled>Assign → branch manager</option>
                    <option value="Location Manager">Location Manager</option>
                    {(team.data?.team || []).map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                )}
                {issue.status === "assigned" && (
                  <Button size="sm" className="h-9 rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand/90" disabled={busyId === issue.id}
                    onClick={() => patch(issue.id, { status: "in_progress" }, "Marked in progress")}>
                    <Clock size={13} className="mr-1.5" /> Start work
                  </Button>
                )}
                {(issue.status === "assigned" || issue.status === "in_progress") && (
                  <Button size="sm" className="h-9 rounded-xl bg-mint-deep text-[12.5px] text-white hover:bg-mint-deep/90" disabled={busyId === issue.id}
                    onClick={() => patch(issue.id, { status: "fixed" }, "Marked fixed — measuring impact")}>
                    <Check size={13} className="mr-1.5" /> {busyId === issue.id ? <RefreshCw size={12} className="animate-spin" /> : "Mark fixed & measure"}
                  </Button>
                )}
                {issue.status === "detected" && !issue.owner && (
                  <span className="text-[12px] text-neutral-400">Assign an owner to start the loop.</span>
                )}
                <span className="ml-auto text-[11.5px] text-neutral-400">
                  Trend: {issue.trend.map((t) => `${t.label} ${t.score}`).join(" → ")}
                </span>
              </div>
            </div>
          );
        })}
        {!issues.loading && open.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
            <p className="text-[14px] font-semibold text-brand">No open issues</p>
            <p className="mt-1 text-[13px] text-neutral-400">Every negative theme is either resolved or below threshold. The detector re-runs on every sync.</p>
          </div>
        )}
      </div>

      {/* Resolved + measured */}
      {fixed.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ClipboardCheck size={15} className="text-mint-deep" /> Fixed & measured</h3>
          {fixed.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-mint/30 bg-mint-soft/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-brand">{issue.title} <span className="font-medium text-neutral-400">· {issue.locationName}</span></p>
                  <p className="text-[12px] text-neutral-500">Owner: {issue.owner || "—"} · resolved {issue.impact ? new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</p>
                </div>
                {issue.impact && (
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-[17px] font-bold text-mint-deep">
                        {issue.impact.mentionsBefore} → {issue.impact.mentionsAfter}
                      </p>
                      <p className="text-[10.5px] uppercase tracking-wide text-neutral-400">monthly mentions</p>
                    </div>
                    <div>
                      <p className="text-[17px] font-bold text-mint-deep">
                        {issue.impact.healthBefore} → {issue.impact.healthNow}
                      </p>
                      <p className="text-[10.5px] uppercase tracking-wide text-neutral-400">reputation health</p>
                    </div>
                  </div>
                )}
              </div>
              {issue.impact && issue.impact.mentionsAfter < issue.impact.mentionsBefore && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-mint-deep">
                  <TrendingDown size={12} /> Complaints down {Math.round(((issue.impact.mentionsBefore - issue.impact.mentionsAfter) / Math.max(1, issue.impact.mentionsBefore)) * 100)}% since the fix — this is the ROI story.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

void AlertTriangle;
