// Client (tenant) Billing view — plan summary with GST-exclusive pricing, live
// usage meters, AI metering and the invoice history with view / print / save-PDF.
// Invoice document rendering is shared with the admin console (./invoice).
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData, inr } from "@/lib/client";
import { useSession } from "@/lib/session";
import { useRouter } from "@/lib/router";
import { cn, CreditCard, Printer, TrendingUp, Sparkles, Check, Wallet } from "./deps";
import { InvoiceModal } from "./invoice";

type BillingPayload = {
  plan: { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number } | null;
  billingCycle: string;
  status: string;
  nextInvoiceAt: string | null;
  usage: { l: string; u: string; p: number; warn: boolean }[];
  aiUsage: { drafts30d: number; tokens30d: number; approved30d: number; estCostInr: number; unlimited: boolean };
  invoices: { id: string; number: string; amount: number; method: string; status: string; date: string; dueAt: string }[];
};

const CYCLE_LABEL: Record<string, string> = { monthly: "Monthly", half_yearly: "Half-yearly", annual: "Annual" };

export function ClientBillingView() {
  const { toast } = useToast();
  const { user } = useSession();
  const { navigate } = useRouter();
  const data = useApiData<BillingPayload>("/api/billing");
  const plans = useApiData<{ plans: { id: string; name: string; monthlyInr: number; halfYearlyInr: number; annualInr: number }[] }>("/api/plans");
  const [viewId, setViewId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const d = data.data;

  const cycleTotal = (p: { monthlyInr: number; halfYearlyInr: number; annualInr: number }) =>
    d?.billingCycle === "annual" ? p.annualInr : d?.billingCycle === "half_yearly" ? p.halfYearlyInr : p.monthlyInr;

  const changePlan = async (planId: string) => {
    setBusy(true);
    try {
      await api.post("/api/billing/change-plan", { planId });
      toast({ title: "Plan updated", description: "A GST invoice for the new plan was created — billing reflects immediately." });
      setPicking(false);
      data.reload();
    } catch (e) {
      toast({ title: "Plan change failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (data.loading || !d) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  const statusTone =
    d.status === "active" ? "bg-mint-soft text-mint-deep" : d.status === "past_due" ? "bg-red-50 text-red-600" : "bg-amber-soft text-amber-deep";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Billing</h1>
        <p className="mt-0.5 text-[13.5px] text-neutral-500">
          Plan, usage and every invoice — readable, downloadable and printable anytime.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Current plan */}
        <div className="rounded-2xl bg-brand p-5 text-white xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Current plan</p>
              <p className="mt-1 text-[20px] font-bold">{d.plan?.name || "—"} · {CYCLE_LABEL[d.billingCycle] || "Monthly"}</p>
              <p className="mt-1 text-[12.5px] text-white/60">
                {d.plan ? `₹${(cycleTotal(d.plan) || d.plan.monthlyInr).toLocaleString("en-IN")} + 18% GST = ₹${Math.round((cycleTotal(d.plan) || d.plan.monthlyInr) * 1.18).toLocaleString("en-IN")} per ${d.billingCycle === "annual" ? "year" : d.billingCycle === "half_yearly" ? "6 months" : "month"}` : ""}
              </p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize", statusTone)}>{d.status}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.06] p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Next invoice</p>
              <p className="mt-0.5 text-[13px] font-semibold">
                {d.nextInvoiceAt ? new Date(d.nextInvoiceAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Billing contact</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {picking ? (
              (plans.data?.plans || []).map((p) => (
                <Button key={p.id} size="sm" variant="outline" disabled={busy || d.plan?.id === p.id}
                  className="h-9 rounded-xl border-white/20 bg-transparent px-3 text-[12px] text-white hover:bg-white/10"
                  onClick={() => changePlan(p.id)}>
                  {p.name} · ₹{p.monthlyInr.toLocaleString("en-IN")}{d.plan?.id === p.id ? " ✓" : " + GST"}
                </Button>
              ))
            ) : (
              <Button size="sm" className="h-9 rounded-xl bg-mint px-4 text-[12.5px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => setPicking(true)}>
                <TrendingUp size={13} className="mr-1.5" /> Change plan
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/20 bg-transparent px-4 text-[12.5px] text-white/80 hover:bg-white/10" onClick={() => navigate({ surface: "client", view: "settings" })}>
              <CreditCard size={13} className="mr-1.5" /> Billing settings
            </Button>
          </div>
        </div>

        {/* AI usage metering */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-5">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-brand"><Sparkles size={14} className="text-mint-deep" /> AI usage this month</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">AI drafts</p>
              <p className="mt-0.5 text-[18px] font-bold text-brand">{d.aiUsage.drafts30d.toLocaleString("en-IN")}</p>
              <p className="text-[10.5px] text-neutral-400">{d.aiUsage.unlimited ? "unlimited · fair use" : "vs plan quota"}</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">AI tokens</p>
              <p className="mt-0.5 text-[18px] font-bold text-brand">{(d.aiUsage.tokens30d / 1000).toFixed(1)}k</p>
              <p className="text-[10.5px] text-neutral-400">est. {inr(d.aiUsage.estCostInr)}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-neutral-500">Approval rate</span>
              <span className="font-semibold text-brand">
                {d.aiUsage.drafts30d ? Math.round((d.aiUsage.approved30d / d.aiUsage.drafts30d) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-mint-deep" style={{ width: `${d.aiUsage.drafts30d ? Math.round((d.aiUsage.approved30d / d.aiUsage.drafts30d) * 100) : 0}%` }} />
            </div>
            <p className="text-[10.5px] leading-relaxed text-neutral-400">
              Metering covers drafts generated, tokens consumed and estimated AI cost ({inr(d.aiUsage.estCostInr)} at ₹0.23 / 1k tokens).
            </p>
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {d.usage.map((m) => (
          <div key={m.l} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-neutral-500">{m.l}</span>
              <span className={cn("font-bold", m.warn ? "text-amber-deep" : "text-brand")}>{m.u}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className={cn("h-full rounded-full", m.warn ? "bg-amber-400" : "bg-mint-deep")} style={{ width: `${Math.min(100, m.p)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <div className="rounded-2xl border border-neutral-200/70 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-brand"><Wallet size={14} className="text-mint-deep" /> Invoices</p>
          <p className="text-[11.5px] text-neutral-400">GST invoices · CGST 9% + SGST 9%</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] uppercase tracking-wider text-neutral-400">
                <th className="px-5 py-2.5 font-medium">Invoice</th>
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 font-medium">Method</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {d.invoices.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[12.5px] text-neutral-400">No invoices yet — they appear here after your first billing cycle.</td></tr>
              )}
              {d.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-neutral-50 last:border-0 hover:bg-surface/60">
                  <td className="px-5 py-3 font-mono text-[12px] text-neutral-500">{inv.number}</td>
                  <td className="px-3 py-3 text-neutral-600">{inv.date} <span className="text-neutral-300">·</span> due {inv.dueAt}</td>
                  <td className="px-3 py-3 text-neutral-500">{inv.method}</td>
                  <td className="px-3 py-3 font-bold text-brand">{inr(inv.amount)}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      inv.status === "paid" ? "bg-mint-soft text-mint-deep" : inv.status === "overdue" ? "bg-red-50 text-red-600" : "bg-amber-soft text-amber-deep")}>
                      {inv.status === "paid" && <Check size={10} />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" className="h-7 rounded-lg px-2.5 text-[11.5px]" onClick={() => setViewId(inv.id)} title="View / download / print invoice">
                      <Printer size={12} className="mr-1" /> View / Print
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-neutral-100 px-5 py-3 text-[11px] leading-relaxed text-neutral-400">
          Tip — “Print / Save PDF” opens the official GST invoice; choose <b>Save as PDF</b> in the print dialog to download it.
        </p>
      </div>

      {viewId && <InvoiceModal id={viewId} endpoint="/api/billing/invoices" onClose={() => setViewId(null)} />}
    </div>
  );
}
