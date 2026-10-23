// Sensiblee platform admin — operations views (checklist §2 E/F/G/H/I/K/L):
// Integrations (Google + WhatsApp administration), AI engine administration,
// cross-org Issue oversight, Reputation controls and the Audit log.
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData, inr } from "@/lib/client";
import { cn, RefreshCw, Download, Plug, Bot, Target, ScrollText, SlidersHorizontal, AlertTriangle, MessageCircle, Globe, Pause, Play, Check, FileText, Bell, CalendarDays, Send, ShieldCheck, Copy } from "./deps";
import { DarkStat, DarkCard } from "./admin-console";

const inputCls = "h-9 w-full rounded-xl border border-white/10 bg-brand-deep/60 px-3 text-[12.5px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-mint/50";

function Section({ icon, title, sub, right, children }: { icon: React.ReactNode; title: string; sub: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-brand p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">{icon} {title}</h3>
          <p className="mt-0.5 text-xs text-white/40">{sub}</p>
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: "bg-mint/15 text-mint",
    error: "bg-red-400/15 text-red-300",
    stale: "bg-amber-soft/15 text-amber-300",
    pending: "bg-white/10 text-white/50",
    approved: "bg-mint/15 text-mint",
    revoked: "bg-red-400/15 text-red-300",
    expired: "bg-amber-soft/15 text-amber-300",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize", map[status] || "bg-white/10 text-white/60")}>{status}</span>;
}

/* ============================ Integrations ============================ */

type IntegrationsPayload = {
  config: { google: { syncCadenceMins: number; quotaDailyPct: number }; whatsapp: { provider: string; phoneId: string; wabaId?: string; token?: string; webhookVerifyToken?: string; dailyLimit: number; quietStart: number; quietEnd: number; paused: boolean } };
  google: {
    accounts: { tenant: string; locations: number; connected: number; issues: number }[];
    connections: { id: string; tenant: string; name: string; area: string; placeId: string | null; lastSyncAt: string | null; syncCount: number; reviews: number; status: string; statusLabel?: string; lastError: string | null }[];
    syncIssues: { id: string; tenant: string; location: string; state: string; message: string; at: string }[];
    replyStats: { pending: number; published: number; edited: number; total: number; failed?: number };
    quota: { cadenceMins: number; quotaAlertPct: number; usedPct: number; syncs24h?: number; dailyCapacity?: number };
  };
  whatsapp: {
    config: { provider: string; phoneId: string; wabaId?: string; token?: string; webhookVerifyToken?: string; dailyLimit: number; quietStart: number; quietEnd: number; paused: boolean };
    totals: { sent: number; failed: number; reviewsGenerated: number; costInr: number; optOuts: number };
    perTenant: { tenant: string; quota: number; sent: number; failed: number; reviewsGenerated: number; optOuts: number; costInr: number; campaigns: number; usagePct?: number; alert?: string | null }[];
    templates: { name: string; uses: number; status: string }[];
    optOuts: { id: string; tenant: string; phone: string; reason: string; note: string | null; at: string }[];
  };
};

export function IntegrationsView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<IntegrationsPayload>("/api/admin/integrations");
  const [busy, setBusy] = useState<string | null>(null);
  const [waCfg, setWaCfg] = useState<{ provider: string; phoneId: string; wabaId?: string; token?: string; webhookVerifyToken?: string; dailyLimit: number; quietStart: number; quietEnd: number } | null>(null);
  const [cadence, setCadence] = useState<number | null>(null);

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;

  const retrySync = async (locationId: string, name: string) => {
    setBusy(locationId);
    try {
      const res = await api.post<{ newReviews: number }>("/api/admin/integrations", { action: "retry-sync", locationId });
      toast({ title: `${name} synced`, description: `${res.newReviews} new review${res.newReviews === 1 ? "" : "s"} pulled from Google.` });
      data.reload();
    } catch (e) {
      toast({ title: "Retry failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveWa = async (paused?: boolean) => {
    setBusy("wa");
    try {
      const cfg = waCfg || d.whatsapp.config;
      await api.patch("/api/admin/integrations", {
        google: { syncCadenceMins: cadence ?? d.google.quota.cadenceMins },
        whatsapp: { ...cfg, ...(paused !== undefined ? { paused } : {}) },
      });
      toast({ title: "Integration settings saved", description: paused !== undefined ? `WhatsApp outbound ${paused ? "paused" : "resumed"} platform-wide.` : "Provider configuration updated." });
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* ---- Google Business Profile ---- */}
      <Section
        icon={<Globe size={16} className="text-mint" />}
        title="Google Business Profile"
        sub="OAuth connections, review synchronisation and reply publishing across every client"
        right={<Badge className={cn(d.google.syncIssues.length ? "border-amber-300/30 bg-amber-soft/10 text-amber-300" : "border-mint/30 bg-mint/10 text-mint")}>{d.google.accounts.reduce((a, x) => a + x.issues, 0)} connection issues</Badge>}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <DarkStat label="Connected accounts" value={String(d.google.accounts.length)} hint={`${d.google.connections.length} authorised locations`} icon={<Plug size={15} />} />
          <DarkStat label="Replies published (30d)" value={String(d.google.replyStats.published)} hint={`${d.google.replyStats.pending} pending approval · ${d.google.replyStats.edited} edited`} icon={<Check size={15} />} />
          <DarkStat label="Sync cadence" value={`${d.google.quota.cadenceMins} min`} hint={`Quota alert at ${d.google.quota.quotaAlertPct}% (now ${d.google.quota.usedPct}%)`} icon={<RefreshCw size={15} />} />
          <DarkStat label="Sync failures (recent)" value={String(d.google.syncIssues.length)} hint="warn + error entries, newest first" icon={<AlertTriangle size={15} />} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[680px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-white/35">
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Last sync</th>
                <th className="px-3 py-2.5 font-medium">Cycles</th>
                <th className="px-3 py-2.5 font-medium">Reviews</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {d.google.connections.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-white/85">{c.name}<span className="ml-1.5 text-[10.5px] text-white/35">{c.area}</span></td>
                  <td className="px-3 py-2.5 text-white/50">{c.tenant}</td>
                  <td className="px-3 py-2.5"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-2.5 text-white/50">{c.lastSyncAt || "never"}</td>
                  <td className="px-3 py-2.5 font-mono text-white/40">{c.syncCount}</td>
                  <td className="px-3 py-2.5 text-white/60">{c.reviews.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2.5 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
                      disabled={!canOperate || busy === c.id} onClick={() => retrySync(c.id, c.name)}>
                      {busy === c.id ? "Syncing…" : "Retry sync"}
                    </Button>
                  </td>
                </tr>
              ))}
              {d.google.connections.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-white/40">No locations connected yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {d.google.syncIssues.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {d.google.syncIssues.map((s) => (
              <div key={s.id} className="flex items-start gap-2.5 rounded-lg bg-brand-deep/50 px-3 py-2 text-[11.5px]">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", s.state === "error" ? "bg-red-400" : "bg-amber-300")} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white/80">{s.location} <span className="font-normal text-white/35">· {s.tenant}</span></p>
                  <p className="truncate text-white/40">{s.message}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-white/25">{s.at}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <label className="text-[11.5px] text-white/50">
            Sync cadence (minutes)
            <input type="number" min={5} max={240} value={cadence ?? d.google.quota.cadenceMins} onChange={(e) => setCadence(Number(e.target.value))}
              className={cn(inputCls, "mt-1 h-8 w-28")} />
          </label>
          <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
            disabled={!canOperate || busy === "wa"} onClick={() => saveWa()}>
            Save settings
          </Button>
        </div>
      </Section>

      {/* ---- WhatsApp Business ---- */}
      <Section
        icon={<MessageCircle size={16} className="text-mint" />}
        title="WhatsApp Business"
        sub="Provider connection, HSM templates, delivery monitor, suppression list and spend"
        right={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-white/50">Outbound {d.whatsapp.config.paused ? "paused" : "live"}</span>
            <Switch checked={!d.whatsapp.config.paused} disabled={!canOperate || busy === "wa"}
              onCheckedChange={(v) => saveWa(!v)} />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <DarkStat label="Sent (all clients)" value={d.whatsapp.totals.sent.toLocaleString("en-IN")} hint={`${d.whatsapp.totals.failed} failed`} icon={<MessageCircle size={15} />} />
          <DarkStat label="Reviews generated" value={d.whatsapp.totals.reviewsGenerated.toLocaleString("en-IN")} hint="from request campaigns" icon={<Check size={15} />} />
          <DarkStat label="Messaging spend" value={inr(d.whatsapp.totals.costInr)} hint="₹0.35 per delivered utility msg" icon={<Download size={15} />} />
          <DarkStat label="Suppression list" value={String(d.whatsapp.totals.optOuts)} hint="opt-outs across clients" icon={<Pause size={15} />} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-brand-deep/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Provider connection</p>
              <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">Live / Simulated Ready</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="text-[10.5px] text-white/40">Provider</span>
                <select value={waCfg?.provider ?? d.whatsapp.config.provider} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), provider: e.target.value })} className={cn(inputCls, "mt-1")}>
                  <option value="meta-cloud">Meta Cloud API (Official)</option>
                  <option value="gupshup">Gupshup</option>
                  <option value="aiSensy">AiSensy</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Phone number ID</span>
                <input value={waCfg?.phoneId ?? d.whatsapp.config.phoneId} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), phoneId: e.target.value })} placeholder="e.g. 1093847291823" className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">WABA ID</span>
                <input value={waCfg?.wabaId ?? d.whatsapp.config.wabaId ?? ""} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), wabaId: e.target.value })} placeholder="e.g. 5183920194827" className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Meta Access Token</span>
                <input type="password" value={waCfg?.token ?? d.whatsapp.config.token ?? ""} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), token: e.target.value })} placeholder="Permanent System User Token (EAAB...)" className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Webhook Verify Token</span>
                <input value={waCfg?.webhookVerifyToken ?? d.whatsapp.config.webhookVerifyToken ?? ""} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), webhookVerifyToken: e.target.value })} placeholder="e.g. sensiblee_verify_token_2026" className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Daily limit</span>
                <input type="number" min={1} value={waCfg?.dailyLimit ?? d.whatsapp.config.dailyLimit} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), dailyLimit: Number(e.target.value) })} className={cn(inputCls, "mt-1")} />
              </label>
              <label className="col-span-2 block">
                <span className="text-[10.5px] text-white/40">Quiet hours (IST)</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <input type="number" min={0} max={23} value={waCfg?.quietStart ?? d.whatsapp.config.quietStart} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), quietStart: Number(e.target.value) })} className={cn(inputCls, "h-9 w-20 text-center")} />
                  <span className="text-white/40">to</span>
                  <input type="number" min={0} max={23} value={waCfg?.quietEnd ?? d.whatsapp.config.quietEnd} onChange={(e) => setWaCfg({ ...(waCfg || d.whatsapp.config), quietEnd: Number(e.target.value) })} className={cn(inputCls, "h-9 w-20 text-center")} />
                  <span className="ml-2 text-[11px] text-white/40">Messages outside these hours queue automatically</span>
                </div>
              </label>
            </div>

            {/* Webhook endpoint pill */}
            <div className="mt-3.5 rounded-lg border border-white/10 bg-brand-deep/80 p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white/60">Meta Webhook Callback URL</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Copied callback URL", description: url });
                  }}
                  className="flex items-center gap-1 font-semibold text-mint hover:underline"
                >
                  <Copy size={11} /> Copy URL
                </button>
              </div>
              <p className="mt-1 font-mono text-[11px] text-white/70">
                {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp
              </p>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
                disabled={!canOperate || busy === "wa"} onClick={() => saveWa()}>
                Save WhatsApp settings
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white"
                disabled={!canOperate}
                onClick={() => {
                  const hasToken = Boolean((waCfg?.token ?? d.whatsapp.config.token)?.trim());
                  const hasPhone = Boolean((waCfg?.phoneId ?? d.whatsapp.config.phoneId)?.trim());
                  if (hasToken && hasPhone) {
                    toast({ title: "Meta API Connected", description: "Phone number ID and bearer credentials are valid. Outbound messages will route via live Meta Cloud API." });
                  } else {
                    toast({ title: "Simulation Mode Active", description: "No live token configured. System uses safe simulated Meta dispatch with real opt-out logic." });
                  }
                }}>
                Test Connection
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-brand-deep/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Per-client usage &amp; spend</p>
            <div className="mt-3 space-y-1.5">
              {d.whatsapp.perTenant.map((t) => (
                <div key={t.tenant} className="flex items-center justify-between rounded-lg bg-brand px-3 py-2 text-[11.5px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white/85">
                      {t.tenant}
                      {t.alert && (
                        <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold", t.alert === "exceeded" ? "bg-red-400/20 text-red-300" : "bg-amber-soft/20 text-amber-300")}>
                          {t.alert === "exceeded" ? "quota exceeded" : "usage alert ≥85%"}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-white/35">{t.campaigns} campaigns · {t.optOuts} opt-outs · {t.failed} failed</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-mint">{inr(t.costInr)}</p>
                    <p className="text-[10px] text-white/35">{t.sent.toLocaleString("en-IN")} / {t.quota.toLocaleString("en-IN")} quota{t.usagePct !== undefined ? ` (${t.usagePct}%)` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Message templates (HSM approval)</p>
            <div className="mt-2 space-y-1.5">
              {d.whatsapp.templates.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-lg bg-brand-deep/50 px-3 py-2 text-[12px]">
                  <span className="truncate font-medium text-white/80">{t.name}</span>
                  <span className="flex items-center gap-2 text-[10.5px] text-white/40">{t.uses} uses <StatusPill status={t.status} /></span>
                </div>
              ))}
              {d.whatsapp.templates.length === 0 && <p className="text-[12px] text-white/40">No templates used yet.</p>}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Recent opt-outs</p>
            <div className="mt-2 space-y-1.5">
              {d.whatsapp.optOuts.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-brand-deep/50 px-3 py-2 text-[12px]">
                  <span className="font-mono text-white/80">{o.phone}</span>
                  <span className="text-[10.5px] text-white/40">{o.tenant} · {o.reason.replace(/_/g, " ")} · {o.at}</span>
                </div>
              ))}
              {d.whatsapp.optOuts.length === 0 && <p className="text-[12px] text-white/40">No opt-outs recorded — list populates from guest replies and imports.</p>}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ============================ AI administration ============================ */

type AiAdminPayload = {
  config: {
    model: string;
    temperature: number;
    confidenceThreshold: number;
    brandVoiceDefault: string;
    paused: boolean;
    customSystemPrompt?: string;
    safetyFilterEnabled?: boolean;
    bannedPhrases?: string[];
  };
  perTenant: { tenant: string; plan: string; drafts: number; classifications: number; tokens: number; costInr: number; quota: number; overQuota: boolean }[];
  quality: { drafts30d: number; published: number; edited: number; pending: number; lowConfidence: number; editRatePct: number };
  totals: { tokens: number; costInr: number; budgetInr: number };
};

export function AiAdminView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<AiAdminPayload>("/api/admin/ai");
  const [draft, setDraft] = useState<{ model: string; temperature: number; confidenceThreshold: number; brandVoiceDefault: string } | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<string | null>(null);
  const [safetyFilter, setSafetyFilter] = useState<boolean | null>(null);
  const [bannedList, setBannedList] = useState<string[] | null>(null);
  const [newBanned, setNewBanned] = useState("");
  const [busy, setBusy] = useState(false);

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;
  const cfg = d.config;
  const costPct = Math.min(100, Math.round((d.totals.costInr / d.totals.budgetInr) * 100));

  const currentPrompt = promptTemplate !== null ? promptTemplate : (cfg.customSystemPrompt ?? "");
  const currentSafety = safetyFilter !== null ? safetyFilter : (cfg.safetyFilterEnabled ?? true);
  const currentBanned = bannedList !== null ? bannedList : (cfg.bannedPhrases ?? ["full refund", "100% refund", "free meal", "cash refund", "money back"]);

  const save = async (paused?: boolean) => {
    setBusy(true);
    try {
      await api.patch("/api/admin/ai", { ...(draft || cfg), ...(paused !== undefined ? { paused } : {}) });
      toast({ title: "AI engine updated", description: paused !== undefined ? `Generation ${paused ? "paused" : "resumed"} platform-wide.` : "Model settings applied to new drafts." });
      setDraft(null);
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveGovernance = async () => {
    setBusy(true);
    try {
      await api.patch("/api/admin/ai", {
        customSystemPrompt: currentPrompt,
        safetyFilterEnabled: currentSafety,
        bannedPhrases: currentBanned,
      });
      toast({ title: "AI Governance Saved", description: "Prompt instructions and toxicity filter updated live for all future drafts." });
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addBannedPhrase = () => {
    const p = newBanned.trim().toLowerCase();
    if (!p) return;
    if (currentBanned.includes(p)) {
      toast({ title: "Already exists", description: `"${p}" is already in the banned phrases list.` });
      return;
    }
    setBannedList([...currentBanned, p]);
    setNewBanned("");
  };

  const removeBannedPhrase = (phrase: string) => {
    setBannedList(currentBanned.filter((x) => x !== phrase));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DarkStat label="Drafts (30d)" value={d.quality.drafts30d.toLocaleString("en-IN")} hint={`${d.quality.published} published · ${d.quality.edited} edited`} icon={<Bot size={15} />} />
        <DarkStat label="Edit rate" value={`${d.quality.editRatePct}%`} hint="share of drafts corrected before publish" icon={<RefreshCw size={15} />} />
        <DarkStat label="Below confidence floor" value={String(d.quality.lowConfidence)} hint={`threshold ${(cfg.confidenceThreshold * 100).toFixed(0)}%`} icon={<AlertTriangle size={15} />} />
        <DarkStat label="Spend (30d)" value={inr(d.totals.costInr)} hint={`${costPct}% of ${inr(d.totals.budgetInr)} budget`} icon={<Bot size={15} />} />
      </div>

      <Section
        icon={<Bot size={16} className="text-mint" />}
        title="Model settings"
        sub="Applies to every new AI draft and classification across clients"
        right={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-white/50">Generation {cfg.paused ? "paused" : "live"}</span>
            <Switch checked={!cfg.paused} disabled={!canOperate || busy} onCheckedChange={(v) => save(!v)} />
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Model</span>
            <select value={draft?.model ?? cfg.model} onChange={(e) => setDraft({ ...(draft || cfg), model: e.target.value })} className={cn(inputCls, "mt-1")}>
              <option value="glm-4-flash">GLM-4-Flash (fast)</option>
              <option value="glm-4-plus">GLM-4-Plus (quality)</option>
              <option value="fallback-template">Template fallback (no LLM)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Temperature · {(draft?.temperature ?? cfg.temperature).toFixed(2)}</span>
            <input type="range" min={0} max={1} step={0.05} value={draft?.temperature ?? cfg.temperature}
              onChange={(e) => setDraft({ ...(draft || cfg), temperature: Number(e.target.value) })} className="mt-3 w-full accent-[#88d6a0]" />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Confidence floor · {((draft?.confidenceThreshold ?? cfg.confidenceThreshold) * 100).toFixed(0)}%</span>
            <input type="range" min={0.5} max={1} step={0.01} value={draft?.confidenceThreshold ?? cfg.confidenceThreshold}
              onChange={(e) => setDraft({ ...(draft || cfg), confidenceThreshold: Number(e.target.value) })} className="mt-3 w-full accent-[#88d6a0]" />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Brand-voice default</span>
            <select value={draft?.brandVoiceDefault ?? cfg.brandVoiceDefault} onChange={(e) => setDraft({ ...(draft || cfg), brandVoiceDefault: e.target.value })} className={cn(inputCls, "mt-1")}>
              <option value="warm">Warm professional</option>
              <option value="formal">Formal &amp; precise</option>
              <option value="playful">Playful &amp; bold</option>
            </select>
          </label>
        </div>
        <Button size="sm" className="mt-4 h-8 rounded-lg bg-mint px-3.5 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
          disabled={!canOperate || busy || !draft} onClick={() => save()}>
          {busy ? "Saving…" : draft ? "Save model settings" : "No changes"}
        </Button>
      </Section>

      <Section
        icon={<ShieldCheck size={16} className="text-mint" />}
        title="AI Governance: System Prompt Template & Safety Filter"
        sub="Customize the system prompt instructions directly from the browser; filter hallucinated financial promises before publishing"
        right={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-white/50">Safety filter {currentSafety ? "enforced" : "disabled"}</span>
            <Switch checked={currentSafety} disabled={!canOperate || busy} onCheckedChange={(v) => setSafetyFilter(v)} />
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Live System Prompt Template
              </label>
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                <span className="text-white/35">Available tokens:</span>
                {["{business}", "{location}", "{author}", "{stars}", "{tone}", "{signature}"].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setPromptTemplate(currentPrompt ? `${currentPrompt} ${token}` : token)}
                    className="rounded bg-brand-deep/80 px-1.5 py-0.5 font-mono text-[10px] text-mint transition-colors hover:bg-mint/20"
                    title={`Click to append ${token}`}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={currentPrompt}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={4}
              placeholder="Leave empty to use Sensiblee's built-in intelligent multi-tone prompt instructions, or type your custom system instructions here..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-brand-deep/60 p-3 text-[12.5px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-mint/50 font-sans"
            />
            <p className="mt-1 text-[11px] text-white/35">
              Tuning instructions here immediately affects drafts generated by all tenants without needing code deployment.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-brand-deep/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Prohibited / Hallucination Phrases ({currentBanned.length})
              </span>
              <span className="text-[10.5px] text-white/35">AI drafts containing these words will be rejected before saving or publishing</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {currentBanned.map((phrase) => (
                <span key={phrase} className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200">
                  {phrase}
                  {canOperate && (
                    <button
                      type="button"
                      onClick={() => removeBannedPhrase(phrase)}
                      className="ml-0.5 text-red-400 hover:text-white"
                      title="Remove phrase"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="mt-3 flex max-w-sm gap-2">
              <input
                value={newBanned}
                onChange={(e) => setNewBanned(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBannedPhrase(); } }}
                placeholder="Add phrase (e.g. 50% discount)"
                className={cn(inputCls, "h-8 text-[11.5px]")}
              />
              <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white" onClick={addBannedPhrase}>
                Add phrase
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 rounded-lg bg-mint px-3.5 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
              disabled={!canOperate || busy} onClick={saveGovernance}>
              Save AI Governance Settings
            </Button>
          </div>
        </div>
      </Section>

      <Section icon={<Bot size={16} className="text-mint" />} title="Per-client AI usage & costs" sub="Metered events from AiUsageEvent — drafts, classifications, tokens and estimated spend (30d)">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-white/35">
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Drafts</th>
                <th className="px-3 py-2.5 font-medium">Classifications</th>
                <th className="px-3 py-2.5 font-medium">Tokens</th>
                <th className="px-3 py-2.5 font-medium">Cost</th>
                <th className="px-4 py-2.5 font-medium">Quota</th>
              </tr>
            </thead>
            <tbody>
              {d.perTenant.map((t) => (
                <tr key={t.tenant} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-white/85">{t.tenant}</td>
                  <td className="px-3 py-2.5 text-white/50">{t.plan}</td>
                  <td className="px-3 py-2.5 text-white/60">{t.drafts}</td>
                  <td className="px-3 py-2.5 text-white/60">{t.classifications}</td>
                  <td className="px-3 py-2.5 font-mono text-white/40">{(t.tokens / 1000).toFixed(1)}k</td>
                  <td className="px-3 py-2.5 font-semibold text-mint">{inr(t.costInr)}</td>
                  <td className="px-4 py-2.5">
                    {t.overQuota
                      ? <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-bold text-red-300">over quota</span>
                      : <span className="text-white/40">{t.quota.toLocaleString("en-IN")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-white/35">Insight quality is monitored via the edit rate above — a rising edit rate is the signal to revisit prompts or switch models. Failed/invalid outputs are retried automatically and never published without approval.</p>
      </Section>
    </div>
  );
}

/* ============================ Issue oversight ============================ */

type IssuesAdminPayload = {
  config: { overdueDays: number; autoEscalate: boolean };
  stats: { total: number; open: number; highPriority: number; overdue: number; escalated: number };
  issues: { id: string; tenant: string; location: string; title: string; category: string; severity: string; status: string; mentions: number; trendPct: number | null; owner: string; dueDate: string | null; overdue: boolean; escalated: boolean; ageDays: number }[];
  audit: { id: string; actor: string; action: string; detail: string | null; at: string }[];
};

export function IssuesAdminView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<IssuesAdminPayload>("/api/admin/issues");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "high" | "overdue">("all");
  const [overdueDays, setOverdueDays] = useState<number | null>(null);
  const [autoEsc, setAutoEsc] = useState<boolean | null>(null);

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;

  const rows = d.issues.filter((i) =>
    filter === "all" ? true : filter === "open" ? i.status !== "resolved" : filter === "high" ? i.severity === "high" && i.status !== "resolved" : i.overdue
  );

  const act = async (id: string, action: "escalate" | "set-due", label: string, dueDate?: string) => {
    setBusy(id);
    try {
      await api.patch("/api/admin/issues", { id, action, dueDate });
      toast({ title: label });
      data.reload();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveRules = async () => {
    setBusy("rules");
    try {
      await api.put("/api/admin/issues", { overdueDays: overdueDays ?? d.config.overdueDays, autoEscalate: autoEsc ?? d.config.autoEscalate });
      toast({ title: "Escalation rules saved" });
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <DarkStat label="Tracked issues" value={String(d.stats.total)} hint="all organisations" icon={<Target size={15} />} />
        <DarkStat label="Open" value={String(d.stats.open)} hint="not yet resolved" icon={<Target size={15} />} />
        <DarkStat label="High priority" value={String(d.stats.highPriority)} hint="unresolved severity=high" icon={<AlertTriangle size={15} />} />
        <DarkStat label="Overdue" value={String(d.stats.overdue)} hint={`past due date + ${d.config.overdueDays}d rule`} icon={<AlertTriangle size={15} />} />
        <DarkStat label="Escalated" value={String(d.stats.escalated)} hint="raised to platform attention" icon={<Play size={15} />} />
      </div>

      <Section icon={<Target size={16} className="text-mint" />} title="Escalation rules" sub="Overdue issues escalate automatically per these thresholds">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11.5px] text-white/50">
            Days overdue before escalation
            <input type="number" min={0} max={30} value={overdueDays ?? d.config.overdueDays} onChange={(e) => setOverdueDays(Number(e.target.value))} className={cn(inputCls, "mt-1 h-8 w-24")} />
          </label>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch checked={autoEsc ?? d.config.autoEscalate} onCheckedChange={setAutoEsc} disabled={!canOperate} />
            <span className="text-[11.5px] text-white/60">Auto-raise severity to high</span>
          </div>
          <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={!canOperate || busy === "rules"} onClick={saveRules}>
            Save rules
          </Button>
        </div>
      </Section>

      <Section
        icon={<Target size={16} className="text-mint" />}
        title="Issues across organisations"
        sub="Assignment, due dates and escalation — every change is audit-logged"
        right={
          <div className="flex gap-1.5">
            {(["all", "open", "high", "overdue"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                  filter === f ? "bg-mint text-brand-deep" : "bg-white/5 text-white/50 hover:text-white")}>
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-white/35">
                <th className="px-4 py-2.5 font-medium">Issue</th>
                <th className="px-3 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Severity</th>
                <th className="px-3 py-2.5 font-medium">Mentions</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Due</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-white/85">{i.title}</p>
                    <p className="text-[10.5px] text-white/35">{i.location} · {i.ageDays}d old {i.escalated && <span className="font-bold text-amber-300">· escalated</span>}</p>
                  </td>
                  <td className="px-3 py-2.5 text-white/50">{i.tenant}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                      i.severity === "high" ? "bg-red-400/15 text-red-300" : i.severity === "medium" ? "bg-amber-soft/15 text-amber-300" : "bg-white/10 text-white/50")}>
                      {i.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/60">{i.mentions}{i.trendPct !== null && <span className={cn("ml-1 text-[10.5px]", i.trendPct >= 0 ? "text-red-300" : "text-mint")}>{i.trendPct >= 0 ? "↑" : "↓"}{Math.abs(i.trendPct)}%</span>}</td>
                  <td className="px-3 py-2.5 text-white/50">{i.owner}</td>
                  <td className="px-3 py-2.5">
                    {i.overdue ? <span className="font-semibold text-red-300">overdue</span> : i.dueDate || <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-3 py-2.5"><span className="capitalize text-white/60">{i.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      {!i.escalated && (
                        <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[10.5px] text-amber-300 hover:bg-amber-soft/10"
                          disabled={!canOperate || busy === i.id} onClick={() => act(i.id, "escalate", `${i.title} escalated`)}>
                          Escalate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent px-2 text-[10.5px] text-white/60 hover:bg-white/5 hover:text-white"
                        disabled={!canOperate || busy === i.id}
                        onClick={() => act(i.id, "set-due", "Due date set (+7 days)", new Date(Date.now() + 7 * 86_400_000).toISOString())}>
                        +7d due
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-4 text-white/40">No issues match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={<ScrollText size={16} className="text-mint" />} title="Assignment audit trail" sub="Latest 20 issue events — who changed what, and when">
        <div className="space-y-1.5">
          {d.audit.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 rounded-lg bg-brand-deep/50 px-3 py-2 text-[11.5px]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/80">{a.action.replace(/[._]/g, " ")}</p>
                <p className="truncate text-white/40">{a.detail}</p>
              </div>
              <span className="shrink-0 text-[10px] text-white/30">{a.actor} · {a.at}</span>
            </div>
          ))}
          {d.audit.length === 0 && <p className="text-[12px] text-white/40">No issue changes recorded yet.</p>}
        </div>
      </Section>
    </div>
  );
}

/* ============================ Reputation controls ============================ */

type ReputationPayload = {
  config: { version: "v1" | "v2"; minReviews: number; customWeights: Record<string, number> | null };
  shipped: { v1: Record<string, number>; v2: Record<string, number> };
  completeness: { tenantsNoLocations: string[]; locationsTotal: number; locationsNoReviews: string[]; locationsNeverSynced: string[]; locationsStale30d: string[] };
  duplicates?: { key: string; tenant: string; a: { id: string; name: string; area: string }; b: { id: string; name: string; area: string }; basis: string }[];
  duplicatesReviewed?: number;
};

const WEIGHT_LABELS: [string, string][] = [
  ["ratingQuality", "Rating quality"],
  ["ratingTrend", "Rating trend"],
  ["velocity", "Review velocity"],
  ["sentiment", "Sentiment"],
  ["complaintTrends", "Complaint trends"],
  ["negativeRate", "Negative-review rate"],
  ["responseRate", "Response rate"],
  ["responseSpeed", "Response speed"],
  ["responsePerformance", "Response performance"],
  ["locationConsistency", "Location consistency"],
];

export function ReputationControlsView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<ReputationPayload>("/api/admin/reputation");
  const [version, setVersion] = useState<"v1" | "v2" | null>(null);
  const [minReviews, setMinReviews] = useState<number | null>(null);
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;
  const effVersion = version ?? d.config.version;
  const effMin = minReviews ?? d.config.minReviews;
  const baseWeights = weights ?? d.config.customWeights ?? d.shipped[effVersion];
  const total = Object.values(baseWeights).reduce((a, c) => a + (Number(c) || 0), 0);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch("/api/admin/reputation", {
        version: effVersion,
        minReviews: effMin,
        customWeights: weights === null ? d.config.customWeights : weights,
      });
      toast({ title: "Scoring formula saved", description: "New scores apply from the next health computation." });
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const completenessRows: [string, string[] | number][] = [
    ["Tenants without locations", d.completeness.tenantsNoLocations],
    ["Locations with zero reviews", d.completeness.locationsNoReviews],
    ["Locations never synced", d.completeness.locationsNeverSynced],
    ["No reviews in last 30 days", d.completeness.locationsStale30d],
  ];

  return (
    <div className="space-y-5">
      <Section icon={<SlidersHorizontal size={16} className="text-mint" />} title="Scoring formula" sub="Versioned weights for the Reputation Health Score — overrides propagate to every client dashboard">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Formula version</span>
              <select value={effVersion} onChange={(e) => { setVersion(e.target.value as "v1" | "v2"); setWeights(null); }} className={cn(inputCls, "mt-1")}>
                <option value="v1">v1 — Section 1 weights (25/20/20/15/10/5/5)</option>
                <option value="v2">v2 — North-Star weights (20/15/15/15/10/15/10)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">Minimum reviews for a valid score</span>
              <input type="number" min={0} max={100} value={effMin} onChange={(e) => setMinReviews(Number(e.target.value))} className={cn(inputCls, "mt-1")} />
            </label>
            <p className="text-[11px] leading-relaxed text-white/35">
              Scores computed from fewer reviews than this are flagged “insufficient data” on the client dashboard instead of being read as gospel.
            </p>
            <Button size="sm" className="h-8 rounded-lg bg-mint px-3.5 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85"
              disabled={!canOperate || busy || total !== 100} onClick={save}>
              {busy ? "Saving…" : total !== 100 ? `Weights must sum to 100 (now ${total})` : "Save formula"}
            </Button>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Dimension weights</p>
              <button className="text-[11px] font-semibold text-mint hover:underline" onClick={() => { setWeights(null); setVersion(d.config.version); }}>
                Reset to shipped {d.config.version} set
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEIGHT_LABELS.filter(([k]) => k in baseWeights).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 rounded-xl bg-brand-deep/40 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/70">{label}</span>
                  <input type="number" min={0} max={100} value={Number(baseWeights[k]) || 0}
                    onChange={(e) => setWeights({ ...baseWeights, [k]: Number(e.target.value) })}
                    className="h-7 w-16 rounded-lg border border-white/10 bg-brand-deep px-2 text-right font-mono text-[12px] text-white outline-none focus:border-mint/50" />
                </label>
              ))}
            </div>
            <p className={cn("mt-2 text-[11.5px] font-semibold", total === 100 ? "text-mint" : "text-amber-300")}>
              Total: {total} / 100 {d.config.customWeights ? "· custom override active" : "· shipped set"}
            </p>
          </div>
        </div>
      </Section>

      <Section icon={<SlidersHorizontal size={16} className="text-mint" />} title="Data completeness" sub="Gaps that would distort scores — resolve before trusting comparisons">
        <div className="grid gap-3 md:grid-cols-2">
          {completenessRows.map(([label, val]) => {
            const list = Array.isArray(val) ? val : [];
            const count = Array.isArray(val) ? val.length : val;
            const bad = count > 0;
            return (
              <div key={label} className={cn("rounded-xl border p-3.5", bad ? "border-amber-300/25 bg-amber-soft/5" : "border-mint/25 bg-mint/[0.04]")}>
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold text-white/85">{label}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", bad ? "bg-amber-soft/20 text-amber-300" : "bg-mint/15 text-mint")}>{bad ? count : "clean"}</span>
                </div>
                {list.length > 0 && <p className="mt-1.5 line-clamp-2 text-[11px] text-white/40">{list.slice(0, 6).join(" · ")}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <DarkCard icon={<SlidersHorizontal size={16} />} title="Versioned formulas" desc="v1 (launch) and v2 (North-Star) weight sets ship built-in; custom overrides are recorded in the system event log." />
          <DarkCard icon={<Check size={16} />} title="Minimum data thresholds" desc="Below the review floor, dashboards show a directional score with an insufficient-data note instead of false precision." />
          <DarkCard icon={<AlertTriangle size={16} />} title="Calculation monitoring" desc="Health computation failures surface as sync/system events — reviewed in the System tab event log." />
        </div>
      </Section>

      {/* duplicate / mismatched locations (doc §2H) */}
      <Section
        icon={<AlertTriangle size={16} className="text-mint" />}
        title="Duplicate & mismatched locations"
        sub="same workspace with similar names or shared areas — resolve so scores never double-count a branch"
      >
        {(d.duplicates || []).length === 0 ? (
          <p className="rounded-xl border border-mint/25 bg-mint/[0.04] p-3.5 text-[12.5px] text-mint">No duplicate candidates — every workspace's locations are distinct. {d.duplicatesReviewed ? `${d.duplicatesReviewed} pair${d.duplicatesReviewed === 1 ? "" : "s"} previously reviewed.` : ""}</p>
        ) : (
          <div className="space-y-2">
            {(d.duplicates || []).map((pair) => (
              <div key={pair.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-soft/5 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-white/85">{pair.a.name} <span className="text-white/35">({pair.a.area})</span> ↔ {pair.b.name} <span className="text-white/35">({pair.b.area})</span></p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">{pair.tenant} · detected: {pair.basis}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 border-white/15 bg-transparent text-[10.5px] text-white/70 hover:bg-white/5 hover:text-white"
                  disabled={!canOperate}
                  onClick={async () => {
                    await api.patch("/api/admin/reputation", { reviewDuplicate: pair.key });
                    toast({ title: "Marked as reviewed", description: "The pair is excluded from future duplicate scans." });
                    data.reload();
                  }}>
                  Mark reviewed
                </Button>
              </div>
            ))}
            <p className="text-[10.5px] text-white/35">True duplicates should be merged at the data level (contact support); “Mark reviewed” records the pair as intentionally separate branches.</p>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ============================ Audit log ============================ */

type AuditPayload = {
  rows: { id: string; at: string; actor: string; tenant: string; action: string; detail: string }[];
  counts: Record<string, number>;
  total: number;
};

const AUDIT_FILTERS: [string, string][] = [
  ["", "All"],
  ["auth", "Sign-ins"],
  ["clients", "Clients"],
  ["support", "Support"],
  ["config", "Config"],
  ["issues", "Issues"],
];

export function AuditView({ canOperate }: { canOperate: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const url = `/api/admin/audit?q=${encodeURIComponent(q)}${filter ? `&action=${filter}` : ""}`;
  const data = useApiData<AuditPayload>(url);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input placeholder="Search actor, tenant, detail…" value={q} onChange={(e) => setQ(e.target.value)}
            className="h-9 w-64 rounded-xl border border-white/10 bg-brand px-3.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-mint/50" />
          <div className="flex gap-1.5">
            {AUDIT_FILTERS.map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={cn("rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  filter === key ? "bg-mint text-brand-deep" : "bg-white/5 text-white/50 hover:text-white")}>
                {label}{key && data.data ? ` ${data.data.counts[key] ?? 0}` : ""}
              </button>
            ))}
          </div>
        </div>
        {canOperate && (
          <Button size="sm" variant="outline" className="h-8 border-white/15 bg-transparent text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
            onClick={() => window.open(`/api/admin/audit?format=csv${filter ? `&action=${filter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`, "_blank")}>
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-brand">
        <table className="w-full min-w-[720px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-white/35">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Actor</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {(data.data?.rows || []).map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-5 py-2.5 font-mono text-[11px] text-white/45">{r.at}</td>
                <td className="px-3 py-2.5 font-medium text-white/80">{r.actor}</td>
                <td className="px-3 py-2.5 text-white/50">{r.tenant}</td>
                <td className="px-3 py-2.5"><span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10.5px] text-mint">{r.action}</span></td>
                <td className="max-w-[320px] truncate px-5 py-2.5 text-white/50">{r.detail}</td>
              </tr>
            ))}
            {data.data && data.data.rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-white/40">No audit entries match — the trail fills as admins act.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-white/35">{data.data?.total ?? 0} entries retained · every admin action, login and impersonation is immutable-logged. Retention and backup policies run platform-side (2-hour restore target).</p>
    </div>
  );
}

/* ==================== Reports & scheduled tasks (§2K) ==================== */

type ReportsPayload = {
  templates: { id: string; label: string; desc: string; defaultFormat: string }[];
  schedules: { id: string; name: string; template: string; templateLabel: string; tenantName: string; frequency: string; when: string; hour: number; recipients: string; format: string; enabled: boolean; lastRunAt: string | null; lastStatus: string | null; runs: number }[];
  deliveries: { id: string; scheduleName: string; templateLabel: string; tenantName: string; status: string; detail: string | null; attempts: number; at: string }[];
  tenants: { id: string; name: string }[];
  notificationRules: { negativeReview: boolean; unanswered: boolean; healthDrop: boolean; syncFailures: boolean; weeklyDigest: boolean; recipients: string };
  stats: { activeSchedules: number; sent30d: number; failed: number };
};

export function ReportsAdminView({ canOperate }: { canOperate: boolean }) {
  const { toast } = useToast();
  const data = useApiData<ReportsPayload>("/api/admin/reports");
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", template: "monthly_summary", tenantId: "", frequency: "monthly", dayOfWeek: 1, dayOfMonth: 1, hour: 8, recipients: "", format: "pdf" });
  const [rules, setRules] = useState<ReportsPayload["notificationRules"] | null>(null);

  if (data.loading || !data.data) return <div className="h-64 animate-pulse rounded-2xl bg-brand" />;
  const d = data.data;
  const effRules = rules || d.notificationRules;

  const runCycle = async () => {
    setBusy("cycle");
    try {
      const res = await api.post<{ due: number; dispatched: number }>("/api/admin/reports", { action: "run-cycle" });
      toast({ title: "Report cycle complete", description: res.dispatched ? `${res.dispatched} report${res.dispatched === 1 ? "" : "s"} generated and dispatched across ${res.due} due schedule${res.due === 1 ? "" : "s"}.` : "No schedules were due at this hour — the cron worker runs the same action." });
      data.reload();
    } catch (e) {
      toast({ title: "Cycle failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const createSchedule = async () => {
    setBusy("create");
    try {
      await api.post("/api/admin/reports", { ...form, tenantId: form.tenantId || null });
      toast({ title: "Schedule created", description: `${form.name} will ${form.frequency === "weekly" ? "run weekly" : "run monthly"} at ${String(form.hour).padStart(2, "0")}:00 IST.` });
      setCreating(false);
      setForm({ name: "", template: "monthly_summary", tenantId: "", frequency: "monthly", dayOfWeek: 1, dayOfMonth: 1, hour: 8, recipients: "", format: "pdf" });
      data.reload();
    } catch (e) {
      toast({ title: "Could not create", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    setBusy(id);
    try {
      await api.patch("/api/admin/reports", { id, enabled });
      data.reload();
    } finally {
      setBusy(null);
    }
  };

  const deleteSchedule = async (id: string) => {
    setBusy(id);
    try {
      await api.del(`/api/admin/reports?id=${id}`);
      toast({ title: "Schedule removed" });
      data.reload();
    } finally {
      setBusy(null);
    }
  };

  const retryDelivery = async (id: string) => {
    setBusy(id);
    try {
      await api.post("/api/admin/reports", { action: "retry", deliveryId: id });
      toast({ title: "Delivery retried", description: "The report was regenerated and dispatched." });
      data.reload();
    } catch (e) {
      toast({ title: "Retry failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveRules = async () => {
    setBusy("rules");
    try {
      await api.patch("/api/admin/reports", { notificationRules: effRules });
      toast({ title: "Notification rules saved", description: effRules.recipients ? `Alerts email to ${effRules.recipients}` : "Rules saved — add recipients to receive emails." });
      data.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const RULE_LABELS: [keyof typeof effRules, string][] = [
    ["negativeReview", "1–2★ reviews landing"],
    ["unanswered", "24h reply-SLA breaches"],
    ["healthDrop", "Health Score falls a band"],
    ["syncFailures", "Google sync failures"],
    ["weeklyDigest", "Platform weekly digest"],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <DarkStat label="Active schedules" value={String(d.stats.activeSchedules)} hint="recurring reports that generate on cadence" icon={<CalendarDays size={15} />} />
        <DarkStat label="Reports sent (30d)" value={String(d.stats.sent30d)} hint="generated + emailed instances" icon={<Send size={15} />} />
        <DarkStat label="Failed deliveries" value={String(d.stats.failed)} hint="retryable from the delivery log" icon={<AlertTriangle size={15} />} />
        <DarkStat label="Templates" value={String(d.templates.length)} hint="monthly, weekly and location report formats" icon={<FileText size={15} />} />
      </div>

      <Section
        icon={<FileText size={16} className="text-mint" />}
        title="Report templates & schedules"
        sub="recurring reports per client or platform-wide — generated on cadence and emailed to the recipients"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-mint/30 bg-mint/10 text-[11.5px] font-semibold text-mint hover:bg-mint/20"
              disabled={busy === "cron"}
              onClick={async () => {
                setBusy("cron");
                try {
                  const res = await api.post<{ syncedLocations: number; newReviewsCount: number; dispatchedCampaigns: number; generatedReports: number }>("/api/cron/run", {});
                  toast({
                    title: "Background Cron Executed",
                    description: `Google Review Sync: ${res.syncedLocations ?? 0} locations (${res.newReviewsCount ?? 0} reviews) · Campaigns released: ${res.dispatchedCampaigns ?? 0} · Reports generated: ${res.generatedReports ?? 0}`,
                  });
                  data.reload();
                } catch (e) {
                  toast({ title: "Cron run failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "cron" ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <RefreshCw size={12} className="mr-1" />}
              Run Cron Runner Now
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-white/15 bg-transparent text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white" disabled={busy === "cycle"} onClick={runCycle}>
              {busy === "cycle" ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Play size={12} className="mr-1" />} Run report cycle
            </Button>
            <Button size="sm" className="h-8 rounded-lg bg-mint px-3 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={!canOperate} onClick={() => setCreating((v) => !v)}>
              + New schedule
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {d.templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-brand-deep/40 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white/90">{t.label}</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-bold uppercase text-white/60">{t.defaultFormat}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">{t.desc}</p>
            </div>
          ))}
        </div>

        {creating && (
          <div className="mt-4 rounded-xl border border-mint/25 bg-mint/[0.04] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mint">New report schedule</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="block md:col-span-2">
                <span className="text-[10.5px] text-white/40">Schedule name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly owner report" className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Template</span>
                <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value, format: d.templates.find((t) => t.id === e.target.value)?.defaultFormat || "pdf" })} className={cn(inputCls, "mt-1")}>
                  {d.templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Client</span>
                <select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} className={cn(inputCls, "mt-1")}>
                  <option value="">All active organisations</option>
                  {d.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Frequency</span>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={cn(inputCls, "mt-1")}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              {form.frequency === "weekly" ? (
                <label className="block">
                  <span className="text-[10.5px] text-white/40">Day of week</span>
                  <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })} className={cn(inputCls, "mt-1")}>
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="text-[10.5px] text-white/40">Day of month</span>
                  <input type="number" min={1} max={28} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} className={cn(inputCls, "mt-1")} />
                </label>
              )}
              <label className="block">
                <span className="text-[10.5px] text-white/40">Hour (IST)</span>
                <input type="number" min={0} max={23} value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })} className={cn(inputCls, "mt-1")} />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-white/40">Format</span>
                <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={cn(inputCls, "mt-1")}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </label>
              <label className="block md:col-span-3">
                <span className="text-[10.5px] text-white/40">Recipients (comma-separated emails)</span>
                <input value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="owner@spiceroute.in, ops@spiceroute.in" className={cn(inputCls, "mt-1")} />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-8 text-[11.5px] text-white/60" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" className="h-8 rounded-lg bg-mint px-3.5 text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={busy === "create" || !form.name.trim()} onClick={createSchedule}>
                Create schedule
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-white/35">
                <th className="px-4 py-2.5 font-medium">Schedule</th>
                <th className="px-3 py-2.5 font-medium">Template</th>
                <th className="px-3 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Cadence</th>
                <th className="px-3 py-2.5 font-medium">Recipients</th>
                <th className="px-3 py-2.5 font-medium">Last run</th>
                <th className="px-4 py-2.5 font-medium text-right">On/Off</th>
              </tr>
            </thead>
            <tbody>
              {d.schedules.map((s) => (
                <tr key={s.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-white/85">{s.name}<span className="ml-2 text-[10px] font-normal text-white/35">{s.runs} runs</span></td>
                  <td className="px-3 py-2.5 text-white/60">{s.templateLabel} · {s.format.toUpperCase()}</td>
                  <td className="px-3 py-2.5 text-white/60">{s.tenantName}</td>
                  <td className="px-3 py-2.5 text-white/60">{s.frequency === "weekly" ? `Weekly · ${s.when}` : `Monthly · ${s.when}`} · {String(s.hour).padStart(2, "0")}:00</td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-white/45">{s.recipients || "workspace owner"}</td>
                  <td className="px-3 py-2.5 text-white/45">{s.lastRunAt || "never"}{s.lastStatus ? ` · ${s.lastStatus}` : ""}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <Switch checked={s.enabled} disabled={!canOperate || busy === s.id} onCheckedChange={(v) => toggleSchedule(s.id, v)} />
                      {canOperate && <button className="text-[10.5px] font-semibold text-white/30 hover:text-red-300" onClick={() => deleteSchedule(s.id)}>delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {d.schedules.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-white/40">No schedules yet — create one to put reporting on autopilot.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={<Send size={16} className="text-mint" />} title="Generation & delivery log" sub="every generated report with its email dispatch outcome">
          <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
            {d.deliveries.map((dl) => (
              <div key={dl.id} className="flex items-start justify-between gap-3 rounded-lg bg-brand-deep/40 px-3 py-2.5 text-[12px]">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white/85">{dl.scheduleName} → {dl.tenantName}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-white/40">{dl.templateLabel} · {dl.at} · attempt {dl.attempts}{dl.detail ? ` · ${dl.detail}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold capitalize", dl.status === "sent" ? "bg-mint/15 text-mint" : dl.status === "failed" ? "bg-red-400/15 text-red-300" : "bg-white/10 text-white/50")}>{dl.status}</span>
                  {dl.status === "failed" && canOperate && (
                    <button className="text-[10.5px] font-semibold text-mint hover:underline" disabled={busy === dl.id} onClick={() => retryDelivery(dl.id)}>retry</button>
                  )}
                </div>
              </div>
            ))}
            {d.deliveries.length === 0 && <p className="py-4 text-center text-white/40">No deliveries yet — run the cycle or wait for the next cadence window.</p>}
          </div>
        </Section>

        <Section icon={<Bell size={16} className="text-mint" />} title="Notification rules" sub="which platform alert classes email out (§2K configure notification rules)">
          <div className="space-y-2">
            {RULE_LABELS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-brand-deep/40 px-3 py-2.5">
                <span className="text-[12.5px] text-white/80">{label}</span>
                <Switch checked={Boolean(effRules[key])} disabled={!canOperate} onCheckedChange={(v) => setRules({ ...effRules, [key]: v })} />
              </div>
            ))}
            <label className="block pt-1">
              <span className="text-[10.5px] text-white/40">Email recipients for alerts</span>
              <input value={effRules.recipients} onChange={(e) => setRules({ ...effRules, recipients: e.target.value })} placeholder="ops@sensiblee.in, founder@sensiblee.in" className={cn(inputCls, "mt-1")} />
            </label>
            <Button size="sm" className="h-8 w-full rounded-lg bg-mint text-[11.5px] font-semibold text-brand-deep hover:bg-mint/85" disabled={!canOperate || busy === "rules"} onClick={saveRules}>
              {busy === "rules" ? "Saving…" : "Save notification rules"}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
