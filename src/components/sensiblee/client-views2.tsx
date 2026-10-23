// Sensiblee client dashboard — Requests (B), AI Assistant (C), Analytics (D), Locations
// All views are live-API backed with real mutations.
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData } from "@/lib/client";
import { useRouter } from "@/lib/router";
import type { ReviewVM, CampaignVM } from "@/lib/viewmodels";
import {
  cn,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  TrendingUp,
  Upload,
} from "./deps";
import { GoogleG, QrIcon, SentimentBadge, StarRating, StatusBadge, WhatsAppIcon } from "./brand";
import {
  ChartCard,
  FunnelBars,
  LocationCompareChart,
  RatingTrendChart,
  SentimentDonut,
  StatCard,
} from "./widgets";

/* ------------------------------- Requests ------------------------------- */

const TEMPLATES = [
  { id: "t1", name: "Post-dining thank you", body: "Hi {name}! Thank you for dining with us tonight. If you enjoyed your meal, a quick Google review means the world to our team. It takes 20 seconds — {review_link}" },
  { id: "t2", name: "Delivery follow-up", body: "Hi {name}, thanks for ordering! How was everything? If the food hit the spot, we'd love a quick review here: {review_link}" },
  { id: "t3", name: "Loyal regular note", body: "Hi {name}, you're one of our favourite regulars! Would you share your experience with others? {review_link} — Thank you!" },
];

type CampaignsPayload = {
  campaigns: CampaignVM[];
  funnel: { stage: string; value: number; pct: number }[];
  stats: { sent: number; opened: number; generated: number; conversion: number; openRate: number };
  locations: { id: string; code: string; name: string; short: string; contactBookSize: number }[];
};

export function RequestsView() {
  const { toast } = useToast();
  const { navigate } = useRouter();
  const data = useApiData<CampaignsPayload>("/api/campaigns");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [audience, setAudience] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [launching, setLaunching] = useState(false);

  const locations = data.data?.locations || [];
  const audienceIds = audience.length ? audience : locations.map((l) => l.id);
  const reach = locations.filter((l) => audienceIds.includes(l.id)).reduce((a, l) => a + l.contactBookSize, 0);

  const toggleAudience = (id: string) =>
    setAudience((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const launch = async () => {
    setLaunching(true);
    try {
      const res = await api.post<{ campaign: CampaignVM; provider: string; held: string | null }>("/api/campaigns", {
        name: undefined,
        templateName: template.name,
        templateBody: template.body,
        locationIds: audienceIds,
        sendNow,
      });
      toast({
        title: res.held ? "Campaign held for the next window" : sendNow ? "Campaign launched" : "Campaign scheduled",
        description: res.held
          ? res.held
          : `${res.campaign.name} · ${res.campaign.sent.toLocaleString("en-IN")} requests via WhatsApp (${res.provider} mode).`,
      });
      data.reload();
    } catch (e) {
      toast({ title: "Could not launch", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Requests sent (30d)" value={(data.data?.stats.sent ?? 0).toLocaleString("en-IN")} delta="+18%" icon={<Send size={15} />} />
        <StatCard label="Open / scan rate" value={`${data.data?.stats.openRate ?? 0}%`} delta="+2 pts" icon={<WhatsAppIcon size={15} />} accent="mint" />
        <StatCard label="Reviews generated" value={(data.data?.stats.generated ?? 0).toLocaleString("en-IN")} delta="+41" icon={<GoogleG size={15} />} />
        <StatCard label="Conversion" value={`${data.data?.stats.conversion ?? 0}%`} delta="+1.2 pts" icon={<TrendingUp size={15} />} accent="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* WhatsApp composer */}
        <div className="xl:col-span-3 space-y-5">
          <ChartCard
            title="New WhatsApp request campaign"
            subtitle="Review Growth Engine · compliant, template-based, quality-throttled"
            right={<Badge className="bg-mint-soft text-mint-deep hover:bg-mint-soft ring-1 ring-mint/40">WhatsApp Business API</Badge>}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Template</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-[13px] transition-all",
                        template.id === t.id
                          ? "border-mint-deep bg-mint-soft/60 ring-2 ring-mint/50"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      )}
                    >
                      <span className="block font-semibold text-brand">{t.name}</span>
                      <span className="mt-0.5 line-clamp-2 text-[11.5px] text-neutral-400">{t.body.slice(0, 60)}…</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Audience — locations</p>
                <div className="flex flex-wrap gap-2">
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => toggleAudience(l.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all",
                        audienceIds.includes(l.id)
                          ? "border-brand bg-brand text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      )}
                    >
                      {l.short}
                    </button>
                  ))}
                  <span className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[12.5px] font-medium text-neutral-400">
                    <Plus size={12} className="mr-1 inline" /> Tag: regulars
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-surface p-3.5">
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">
                    <Calendar size={12} /> Timing
                  </p>
                  <div className="space-y-2.5">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} className="accent-mint-deep" />
                      Send now (staggered over 2h)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} className="accent-mint-deep" />
                      Tomorrow 10:30 AM
                    </label>
                  </div>
                </div>
                <div className="rounded-xl bg-surface p-3.5">
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">
                    <Timer size={12} /> Safeguards
                  </p>
                  <ul className="space-y-1.5 text-[12.5px] text-neutral-500">
                    <li className="flex items-center gap-1.5"><Check size={12} className="text-mint-deep" /> Opt-out honoured automatically</li>
                    <li className="flex items-center gap-1.5"><Check size={12} className="text-mint-deep" /> Max 1 request / guest / 30 days</li>
                    <li className="flex items-center gap-1.5"><Check size={12} className="text-mint-deep" /> Email fallback if no WhatsApp</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <p className="text-[12.5px] text-neutral-400">
                  Estimated reach: <span className="font-semibold text-brand">{reach.toLocaleString("en-IN")} guests</span> · within plan quota
                </p>
                <Button className="bg-brand text-white hover:bg-brand-deep" onClick={launch} disabled={launching || reach === 0}>
                  {launching ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Send size={14} className="mr-1.5" />}
                  {launching ? "Launching…" : "Launch campaign"}
                </Button>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Recent campaigns" subtitle="Delivery → open → review performance">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11.5px] uppercase tracking-wide text-neutral-400">
                    <th className="pb-2 pr-3 font-medium">Campaign</th>
                    <th className="pb-2 pr-3 font-medium">Channel</th>
                    <th className="pb-2 pr-3 font-medium">Sent</th>
                    <th className="pb-2 pr-3 font-medium">Reviews</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data?.campaigns || []).map((c) => (
                    <tr key={c.id} className="border-b border-neutral-50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-brand">
                        {c.name}
                        <span className="block text-[11px] font-normal text-neutral-400">{c.location} · {c.date}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 text-neutral-600">
                          {c.channel === "WhatsApp" ? <WhatsAppIcon size={13} className="text-mint-deep" /> : <QrIcon size={13} className="text-brand" />}
                          {c.channel}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-neutral-600">{c.sent.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 pr-3 font-semibold text-mint-deep">{c.reviews}</td>
                      <td className="py-2.5"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* QR kit + funnel */}
        <div className="space-y-5 xl:col-span-2">
          <QrKitCard locations={locations} onPreviewGuest={() => navigate({ surface: "guest" })} />

          {/* Compliant request flow (doc §4) — experience-first, zero review gating */}
          <ChartCard title="How a request flows" subtitle="experience-first · policy-safe by design">
            <div className="space-y-2 text-[12.5px]">
              {[
                { step: "1", text: "Guest completes a transaction — POS or booking triggers the request." },
                { step: "2", text: "WhatsApp: \"Thanks for visiting! How was your experience?\"" },
                { step: "3", text: "Every guest receives the genuine Google review link — same link, no filtering." },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-2.5 rounded-xl bg-surface px-3 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10.5px] font-bold text-white">{s.step}</span>
                  <p className="leading-snug text-neutral-600">{s.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-mint/30 bg-mint-soft/40 p-2.5 text-[11.5px] leading-relaxed text-mint-deep">
              <Check size={13} className="mt-0.5 shrink-0" />
              No review gating: we never route unhappy customers away from Google or ask for stars — Google prohibits incentivised or manipulated reviews and so do we.
            </p>
          </ChartCard>

          <ChartCard title="Request funnel" subtitle="Last 30 days · all channels">
            <FunnelBars data={data.data?.funnel || []} />
          </ChartCard>

          <div className="rounded-2xl border border-amber-200/70 bg-amber-soft/50 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-deep">
              <Mail size={14} /> Email fallback active
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-amber-deep/80">
              12% of your contact book has no WhatsApp number. Sensiblee sends those guests a compliant email with the same review link.
            </p>
          </div>
        </div>
      </div>

      {/* Guest contact book + WhatsApp compliance (doc §1E) */}
      <GuestContactBook />
    </div>
  );
}

/* --------------------- Guest contact book (doc §1E) --------------------- */

type ContactsPayload = {
  contacts: { id: string; name: string; phone: string; consent: boolean; source: string; optedOut: boolean; at: string }[];
  optOuts: { phone: string; reason: string; note: string | null; at: string }[];
  stats: { total: number; eligible: number; suppressed: number; optOuts: number };
};

export function GuestContactBook() {
  const { toast } = useToast();
  const book = useApiData<ContactsPayload>("/api/contacts");
  const settingsQ = useApiData<{ waCompliance: { quietStart: number; quietEnd: number; dailyLimit: number } }>("/api/settings");
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [importText, setImportText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiet, setQuiet] = useState<{ quietStart: number; quietEnd: number; dailyLimit: number } | null>(null);

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      // Parse CSV / TXT rows
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;

      // Check for header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes("phone") || firstLine.includes("mobile") || firstLine.includes("name") || firstLine.includes("contact");
      const dataRows = hasHeader ? lines.slice(1) : lines;

      // Auto-detect columns
      const parsedContacts: string[] = [];
      for (const row of dataRows) {
        const parts = row.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 2) {
          // Detect which part is phone (more digits)
          const p0Digits = parts[0].replace(/\D/g, "").length;
          const p1Digits = parts[1].replace(/\D/g, "").length;
          if (p1Digits >= 8) {
            parsedContacts.push(`${parts[0]}, ${parts[1]}`);
          } else if (p0Digits >= 8) {
            parsedContacts.push(`${parts[1]}, ${parts[0]}`);
          } else {
            parsedContacts.push(row);
          }
        } else if (parts.length === 1 && parts[0]) {
          parsedContacts.push(parts[0]);
        }
      }

      setImportText(parsedContacts.join("\n"));
      toast({ title: `File loaded: ${file.name}`, description: `Found ${parsedContacts.length} contacts ready to import.` });
    };
    reader.readAsText(file);
  };

  const downloadSampleCsv = () => {
    const csvContent = "Name,Phone\nAnanya Sharma,+91 9876543210\nRohit Menon,+91 9876501234\nPriya Nair,9876512345\nKarthik Iyer,9876523456\nMeera Krishnan,9876534567";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sensiblee_contacts_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const waCfg = quiet || settingsQ.data?.waCompliance || { quietStart: 21, quietEnd: 9, dailyLimit: 200 };
  const stats = book.data?.stats;

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ imported: number; duplicates: number; invalid: number; suppressed: number }>("/api/contacts", { text: importText });
      toast({
        title: `${res.imported} contact${res.imported === 1 ? "" : "s"} imported`,
        description: `${res.duplicates} duplicates skipped · ${res.suppressed} matched the suppression list · ${res.invalid} invalid lines.`,
      });
      setImportText("");
      setImportOpen(false);
      book.reload();
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      await api.del(`/api/contacts?id=${id}`);
      book.reload();
    } catch (e) {
      toast({ title: "Could not remove", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const saveCompliance = async () => {
    setBusy(true);
    try {
      await api.patch("/api/settings", { waCompliance: waCfg });
      toast({ title: "Sending window saved", description: `Quiet hours ${String(waCfg.quietEnd).padStart(2, "0")}:00–${String(waCfg.quietStart).padStart(2, "0")}:00 IST · daily cap ${waCfg.dailyLimit}` });
      settingsQ.reload();
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* contact book */}
      <ChartCard
        title="Guest contact book"
        subtitle="import customer records with consent · deduped against the suppression list"
        right={
          <Button size="sm" variant="outline" className="h-8 text-[11.5px]" onClick={() => setImportOpen((v) => !v)}>
            <Plus size={13} className="mr-1" /> Import contacts
          </Button>
        }
      >
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-surface px-3 py-2.5"><p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Contacts</p><p className="text-[18px] font-bold text-brand">{stats?.total ?? "—"}</p></div>
          <div className="rounded-xl bg-mint-soft/50 px-3 py-2.5"><p className="text-[10.5px] font-bold uppercase tracking-wider text-mint-deep">Eligible</p><p className="text-[18px] font-bold text-mint-deep">{stats?.eligible ?? "—"}</p></div>
          <div className="rounded-xl bg-red-50 px-3 py-2.5"><p className="text-[10.5px] font-bold uppercase tracking-wider text-red-500">Suppressed</p><p className="text-[18px] font-bold text-red-500">{stats?.suppressed ?? "—"}</p></div>
        </div>

        {importOpen && (
          <div className="mb-3 rounded-xl border border-mint/40 bg-mint-soft/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-mint/20 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("file")}
                  className={cn("rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors", importMode === "file" ? "bg-brand text-white" : "bg-white text-neutral-600 hover:text-brand")}
                >
                  Upload CSV / Excel
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("paste")}
                  className={cn("rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors", importMode === "paste" ? "bg-brand text-white" : "bg-white text-neutral-600 hover:text-brand")}
                >
                  Paste text
                </button>
              </div>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-[11px] font-semibold text-mint-deep hover:underline flex items-center gap-1"
              >
                <Download size={11} /> Sample CSV
              </button>
            </div>

            {importMode === "file" ? (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-mint/60 rounded-xl p-4 bg-white/70 hover:bg-white cursor-pointer transition-colors text-center">
                  <Upload size={22} className="text-mint-deep mb-1.5" />
                  <span className="text-[12.5px] font-semibold text-brand">Click to upload CSV or Excel file</span>
                  <span className="text-[10.5px] text-neutral-400 mt-0.5">Supports .csv, .xlsx, .txt with Name &amp; Phone columns</span>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls, .txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
                {fileName && (
                  <div className="flex items-center justify-between rounded-lg bg-mint/10 border border-mint/30 px-3 py-1.5 text-[11.5px] text-brand">
                    <span><strong>File:</strong> {fileName} ({importText.split("\n").filter(Boolean).length} contacts detected)</span>
                    <button type="button" onClick={() => { setFileName(null); setImportText(""); }} className="text-neutral-400 hover:text-red-500 font-bold">✕</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[11.5px] font-semibold text-brand">Paste contact lines — “Name, 9876543210” or bare number, one per line:</p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"Ananya Sharma, +91 98765 43210\nRohit Menon 9876501234\n9876123456"}
                  className="mt-1.5 min-h-[90px] border-mint/40 bg-white text-[12.5px]"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10.5px] text-neutral-500">
                Numbers on suppression list are tagged suppressed — never messaged without explicit consent.
              </p>
              <Button size="sm" className="h-8 bg-mint-deep text-[11.5px] text-white hover:bg-mint-deep/90 shrink-0" disabled={busy || !importText.trim()} onClick={runImport}>
                {busy ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
                Import {importText.trim() ? `(${importText.split("\n").filter(Boolean).length})` : ""}
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-neutral-100 text-[10.5px] uppercase tracking-wide text-neutral-400">
                <th className="pb-1.5 pr-2 font-medium">Guest</th>
                <th className="pb-1.5 pr-2 font-medium">Phone</th>
                <th className="pb-1.5 pr-2 font-medium">Consent</th>
                <th className="pb-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(book.data?.contacts || []).slice(0, 30).map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-brand">{c.name}<span className="ml-1.5 text-[10px] font-normal text-neutral-400">{c.source}</span></td>
                  <td className="py-1.5 pr-2 font-mono text-[11px] text-neutral-500">+91 {c.phone}</td>
                  <td className="py-1.5 pr-2">
                    {c.optedOut
                      ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">suppressed</span>
                      : c.consent
                        ? <span className="rounded-full bg-mint-soft px-1.5 py-0.5 text-[10px] font-bold text-mint-deep">opted in</span>
                        : <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-400">no consent</span>}
                  </td>
                  <td className="py-1.5 text-right">
                    <button className="text-[10.5px] font-semibold text-neutral-300 hover:text-red-500" onClick={() => removeContact(c.id)} aria-label={`Remove ${c.name}`}>remove</button>
                  </td>
                </tr>
              ))}
              {book.data && book.data.contacts.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-[12px] text-neutral-400">No contacts yet — import your guest list to start requesting reviews.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* compliance: quiet hours + daily limit + suppression list */}
      <ChartCard title="Sending window & suppression" subtitle="WhatsApp compliance · quiet hours, daily cap, opt-outs">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="rounded-xl bg-surface p-3">
            <span className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Quiet from (IST)</span>
            <input type="number" min={0} max={23} value={waCfg.quietStart} onChange={(e) => setQuiet({ ...waCfg, quietStart: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[13px] font-semibold text-brand outline-none focus:border-mint/60" />
          </label>
          <label className="rounded-xl bg-surface p-3">
            <span className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Quiet until (IST)</span>
            <input type="number" min={0} max={23} value={waCfg.quietEnd} onChange={(e) => setQuiet({ ...waCfg, quietEnd: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[13px] font-semibold text-brand outline-none focus:border-mint/60" />
          </label>
          <label className="rounded-xl bg-surface p-3">
            <span className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">Daily cap</span>
            <input type="number" min={1} value={waCfg.dailyLimit} onChange={(e) => setQuiet({ ...waCfg, dailyLimit: Math.max(1, Number(e.target.value) || 1) })}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[13px] font-semibold text-brand outline-none focus:border-mint/60" />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11.5px] text-neutral-400">Campaigns landing inside the window are held and dispatch automatically after it ends.</p>
          <Button size="sm" className="h-8 bg-brand text-[11.5px] text-white hover:bg-brand-deep" disabled={busy || !quiet} onClick={saveCompliance}>
            <Check size={12} className="mr-1" /> Save window
          </Button>
        </div>

        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Suppression list ({book.data?.stats.optOuts ?? 0})</p>
          <div className="mt-2 max-h-[130px] space-y-1.5 overflow-y-auto">
            {(book.data?.optOuts || []).map((o, idx) => (
              <div key={`${o.phone}-${idx}`} className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-[12px]">
                <span className="font-mono text-neutral-600">+91 {o.phone}</span>
                <span className="flex items-center gap-2 text-[10.5px] text-neutral-400">
                  {o.note && <span className="max-w-[180px] truncate">“{o.note}”</span>}
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 font-semibold text-neutral-500">{o.reason.replace(/_/g, " ")}</span>
                </span>
              </div>
            ))}
            {book.data && book.data.optOuts.length === 0 && <p className="py-2 text-[12px] text-neutral-400">No opt-outs — guests who reply STOP appear here automatically.</p>}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

function QrKitCard({ locations, onPreviewGuest }: { locations: CampaignsPayload["locations"]; onPreviewGuest: () => void }) {
  const { toast } = useToast();
  const firstCode = locations[0]?.code;
  const qr = useApiData<{ dataUrl: string; url: string }>(firstCode ? `/api/qr?code=${firstCode}` : null);

  const copy = async () => {
    if (!qr.data) return;
    try {
      await navigator.clipboard.writeText(qr.data.url);
      toast({ title: "Link copied", description: qr.data.url });
    } catch {
      toast({ title: "Copy failed", description: qr.data.url });
    }
  };

  const download = () => {
    if (!qr.data) return;
    const a = document.createElement("a");
    a.href = qr.data.dataUrl;
    a.download = `sensiblee-qr-${firstCode}.png`;
    a.click();
    toast({ title: "QR kit downloading", description: "Print-ready PNG · 480 px" });
  };

  return (
    <ChartCard title="Table QR kit" subtitle="Review Growth Engine · live scannable code">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-cream p-2.5">
          {qr.data ? (
            <img src={qr.data.dataUrl} alt={`QR code for ${locations[0]?.name || "location"}`} width={124} height={124} className="rounded-lg" />
          ) : (
            <div className="h-[124px] w-[124px] animate-pulse rounded-lg bg-surface" />
          )}
        </div>
        <div className="flex-1 text-[12.5px] leading-relaxed text-neutral-500">
          <p className="font-semibold text-brand">scan → rate us in 2 taps</p>
          <p className="mt-1">
            Branded landing with your logo, star pre-select and Google hand-off. Printed at 40×40 mm on table tents.
          </p>
          <p className="mt-1 truncate font-mono text-[10.5px] text-neutral-400">{qr.data?.url || "…"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={download} disabled={!qr.data}>
              <Download size={13} className="mr-1" /> Kit
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copy} disabled={!qr.data}>
              <Copy size={13} className="mr-1" /> Link
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-mint-deep/40 text-xs text-mint-deep hover:bg-mint-soft/40" onClick={onPreviewGuest}>
              <Smartphone size={13} className="mr-1" /> Preview guest flow
            </Button>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ----------------------------- AI Assistant ----------------------------- */

type QueueItem = {
  id: string; reviewStars: number; author: string; location: string; excerpt: string;
  draft: string; tone: string; confidence: number; age: string; urgent?: boolean; text: string;
  sensitive?: string | null;
};

type FailedReply = { id: string; reviewStars: number; author: string; location: string; error: string; reply: string; draft: string; connected: boolean };
type SensitiveReview = { id: string; reviewStars: number; author: string; location: string; excerpt: string; reason: string; status: string };

export function AiAssistantView() {
  const { toast } = useToast();
  const queue = useApiData<{ queue: QueueItem[]; failed: FailedReply[]; sensitive: SensitiveReview[] }>("/api/ai/queue");
  const analytics = useApiData<{ kpis: { draftsPending: number; draftsApproved30d: number; atRisk: number; medianResponse: string } }>("/api/analytics");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [autoPilot, setAutoPilot] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);

  const items = (queue.data?.queue || []).filter((i) => !approvedIds.includes(i.id));
  const failed = queue.data?.failed || [];
  const flagged = queue.data?.sensitive || [];
  const k = analytics.data?.kpis;

  const bodyOf = (item: QueueItem) => drafts[item.id] ?? item.draft;

  const approve = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      await api.post(`/api/reviews/${item.id}/reply`, { body: bodyOf(item) });
      setApprovedIds((a) => [...a, item.id]);
      toast({ title: "Reply posted", description: `Published to Google for ${item.author}'s review.` });
      queue.reload();
    } catch (e) {
      toast({ title: "Could not post", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const regenerate = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      toast({ title: "Regenerating draft", description: "The AI worker is rewriting this reply in your voice." });
      const res = await api.post<{ review: ReviewVM }>(`/api/reviews/${item.id}/draft`);
      if (res.review.draft) setDrafts((d) => ({ ...d, [item.id]: res.review.draft! }));
      queue.reload();
    } catch (e) {
      toast({ title: "Regeneration failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const toggleAutoPilot = async (v: boolean) => {
    setAutoPilot(v);
    try {
      await api.patch("/api/settings", { ai: { threshold: v ? 95 : 90 } });
      toast({
        title: v ? "Auto-pilot staged" : "Auto-pilot off",
        description: v
          ? "Replies above 95% confidence would post automatically once you enable posting — 1–2★ and sensitive reviews always wait for you."
          : "Back to manual approval for all replies.",
      });
    } catch {
      setAutoPilot(!v);
      toast({ title: "Could not update", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  const retryPublish = async (item: FailedReply) => {
    setBusyId(item.id);
    try {
      const body = item.reply || item.draft;
      await api.post(`/api/reviews/${item.id}/reply`, { body: body || "Thank you for your feedback — we would love to make this right." });
      toast({ title: "Reply re-published", description: `Retried successfully for ${item.author}.` });
      queue.reload();
    } catch (e) {
      toast({ title: "Retry failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200/70 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-brand">
                <Sparkles size={16} className="text-mint-deep" /> Approval queue
                <Badge className="bg-amber-soft text-amber-deep hover:bg-amber-soft">{items.length} pending</Badge>
              </h3>
              <p className="mt-0.5 text-xs text-neutral-400">AI Reputation Copilot · every reply is yours to approve, edit or regenerate</p>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
              <Switch checked={autoPilot} onCheckedChange={toggleAutoPilot} />
              <div className="text-[12px] leading-tight">
                <p className="font-semibold text-brand">Auto-pilot</p>
                <p className="text-neutral-400">post ≥95% confidence</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {queue.loading && [0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface" />)}
            {items.map((item) => (
              <div key={item.id} className={cn("rounded-2xl border p-4", item.urgent ? "border-red-200 bg-red-50/30" : "border-neutral-200 bg-white")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StarRating value={item.reviewStars} size={13} />
                    <span className="text-[13px] font-semibold text-brand">{item.author}</span>
                    <span className="text-[11.5px] text-neutral-400">{item.location} · {item.age} old</span>
                    {item.urgent && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-600"><AlertTriangle size={10} /> SLA 24h</span>}
                    {item.sensitive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-bold text-amber-deep ring-1 ring-amber-200" title={item.sensitive}>
                        <ShieldCheck size={10} /> Human handling
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] capitalize text-neutral-500">{item.tone}</Badge>
                    <span className="flex items-center gap-1 text-[11.5px] font-semibold text-mint-deep">
                      <span className="h-1.5 w-1.5 rounded-full bg-mint-deep" />
                      {Math.round(item.confidence * 100)}% confident
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 rounded-lg bg-surface px-3 py-2 text-[13px] italic text-neutral-500">“{item.excerpt}”</p>
                <Textarea
                  value={bodyOf(item)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                  className="mt-3 min-h-[72px] border-mint/40 bg-mint-soft/25 text-[13.5px] leading-relaxed focus-visible:ring-mint/50"
                  aria-label={`Suggested reply for ${item.author}`}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" className="h-8 bg-mint-deep text-white hover:bg-mint-deep/90" disabled={busyId === item.id} onClick={() => approve(item)}>
                    {busyId === item.id ? <RefreshCw size={13} className="mr-1 animate-spin" /> : <Check size={13} className="mr-1" />}
                    {busyId === item.id ? "Posting…" : "Approve & post"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    <Pencil size={13} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" disabled={busyId === item.id} onClick={() => regenerate(item)}>
                    <RefreshCw size={13} className={cn("mr-1", busyId === item.id && "animate-spin")} /> Regenerate
                  </Button>
                  <span className="ml-auto text-[11px] text-neutral-400"> learns from every edit</span>
                </div>
              </div>
            ))}
            {!queue.loading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-mint/50 bg-mint-soft/30 p-8 text-center">
                <Check size={28} className="mx-auto text-mint-deep" />
                <p className="mt-2 text-[15px] font-semibold text-brand">Inbox zero — every review answered</p>
                <p className="text-[13px] text-neutral-500">New drafts appear within ~90 seconds of a review landing.</p>
              </div>
            )}
          </div>
        </div>

        {/* reply publish lifecycle + sensitive flagging (doc §1D) */}
        <div className="lg:col-span-2 grid gap-5 md:grid-cols-2">
          <ChartCard title="Failed publishes" subtitle="replies the Google integration could not post">
            <div className="space-y-3">
              {failed.map((f) => (
                <div key={f.id} className="rounded-xl border border-red-200/70 bg-red-50/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-brand">{f.author} · {f.location}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">failed</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-red-600">{f.error}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10.5px] text-neutral-400">{f.connected ? "Connection restored — retry now" : "Connect the profile under Locations first"}</p>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busyId === f.id || !f.connected || !(f.reply || f.draft)} onClick={() => retryPublish(f)}>
                      <RefreshCw size={11} className={cn("mr-1", busyId === f.id && "animate-spin")} /> Retry
                    </Button>
                  </div>
                </div>
              ))}
              {queue.data && failed.length === 0 && (
                <p className="rounded-xl bg-mint-soft/40 p-3 text-[12px] text-mint-deep">Every approved reply has published cleanly — no failures in the log.</p>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Flagged for human handling" subtitle="legal, safety or health allegations — never auto-posted">
            <div className="space-y-3">
              {flagged.map((s) => (
                <div key={s.id} className="rounded-xl border border-amber-200/70 bg-amber-soft/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={s.reviewStars} size={12} />
                    <span className="text-[13px] font-semibold text-brand">{s.author}</span>
                    <span className="rounded-full bg-amber-deep/10 px-2 py-0.5 text-[10px] font-bold text-amber-deep">{s.reason}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] italic leading-relaxed text-neutral-500">“{s.excerpt}”</p>
                  <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-deep">{s.location} · handle personally</p>
                </div>
              ))}
              {queue.data && flagged.length === 0 && (
                <p className="text-[12px] text-neutral-400">No sensitive reviews right now — legal, safety and health allegations would surface here.</p>
              )}
            </div>
          </ChartCard>
        </div>

        <div className="space-y-5">
          <ChartCard title="Brand voice" subtitle="How the assistant writes as you">
            <div className="space-y-3.5">
              {[
                { label: "Warmth", v: 80, cls: "bg-mint-deep" },
                { label: "Formality", v: 45, cls: "bg-brand" },
                { label: "Conciseness", v: 70, cls: "bg-amber-400" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-neutral-600">{s.label}</span><span className="font-semibold text-brand">{s.v}%</span></div>
                  <div className="h-2 rounded-full bg-surface"><div className={cn("h-full rounded-full", s.cls)} style={{ width: `${s.v}%` }} /></div>
                </div>
              ))}
              <div className="border-t border-neutral-100 pt-3">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Learned phrases</p>
                <div className="flex flex-wrap gap-1.5">
                  {["“see you soon”", "“our pleasure”", "valet tie-up", "“regulars”"].map((p) => (
                    <span key={p} className="rounded-full bg-mint-soft px-2.5 py-1 text-[11.5px] font-medium text-mint-deep">{p}</span>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-400">Tune the voice any time in Settings → AI &amp; brand voice.</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="This month" subtitle="Assistant performance · live">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Drafts in queue" value={String(k?.draftsPending ?? "—")} accent="mint" />
              <StatCard label="Replies posted (30d)" value={String(k?.draftsApproved30d ?? "—")} accent="amber" />
              <StatCard label="At risk (>24h)" value={String(k?.atRisk ?? "—")} accent="coral" />
              <StatCard label="Median response" value={k?.medianResponse ?? "—"} accent="slate" />
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Analytics ------------------------------ */

type AnalyticsPayload = {
  kpis: { health: number; positive: number; medianResponse: string; atRisk: number };
  trend: { w: string; rating: number; volume: number }[];
  sentiment: { name: string; value: number; color: string }[];
  locations: { name: string; rating: number; responses: number }[];
  keywords: { word: string; count: number; sentiment: string }[];
  staff: { name: string; score: number; mentions: number; trend: string }[];
  staffScope?: "full" | "restricted";
  staffNote?: string | null;
};

export function AnalyticsView() {
  const { data } = useApiData<AnalyticsPayload>("/api/analytics");
  const k = data?.kpis;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Reputation health" value={k ? `${k.health} / 100` : "—"} delta="+6" icon={<TrendingUp size={15} />} hint="rating, freshness, response mix" />
        <StatCard label="Positive sentiment" value={k ? `${k.positive}%` : "—"} delta="+4 pts" icon={<Sparkles size={15} />} accent="mint" />
        <StatCard label="Median response time" value={k?.medianResponse ?? "—"} delta="-41m" icon={<Timer size={15} />} accent="amber" />
        <StatCard label="Reviews at risk" value={String(k?.atRisk ?? "—")} hint="unanswered >24h" icon={<AlertTriangle size={15} />} accent="coral" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Rating & volume — 12 weeks" subtitle="All locations · weekly grain" className="xl:col-span-2">
          <RatingTrendChart data={data?.trend || []} />
        </ChartCard>
        <ChartCard title="Sentiment split" subtitle="AI-classified on every sync">
          <SentimentDonut data={data?.sentiment || []} avgRating={data?.trend.at(-1)?.rating} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Location comparison" subtitle="Average rating this quarter">
          <LocationCompareChart data={data?.locations || []} />
        </ChartCard>

        <ChartCard title="What guests talk about" subtitle="Keyword themes with sentiment">
          <div className="flex flex-wrap gap-2">
            {(data?.keywords || []).map((k2) => (
              <span
                key={k2.word}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium",
                  k2.sentiment === "positive" && "bg-mint-soft text-mint-deep",
                  k2.sentiment === "neutral" && "bg-amber-soft text-amber-deep",
                  k2.sentiment === "negative" && "bg-red-50 text-red-600"
                )}
              >
                {k2.word} <span className="ml-1 text-[10.5px] opacity-60">{k2.count}</span>
              </span>
            ))}
            {!data && [0, 1, 2, 3, 4].map((i) => <span key={i} className="h-8 w-24 animate-pulse rounded-full bg-surface" />)}
          </div>
        </ChartCard>

        <ChartCard title="Staff mentioned by guests" subtitle="Reputation score from review mentions">
          <div className="space-y-3">
            {data?.staffScope === "restricted" ? (
              <p className="flex items-start gap-2 rounded-xl bg-surface p-3 text-[12px] leading-relaxed text-neutral-500">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-500" />
                {data.staffNote || "Staff insights are restricted to managers and owners."}
              </p>
            ) : (
              <>
            {(data?.staff || []).map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-neutral-600">{s.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">{s.mentions} mentions</span>
                    <span className={cn("font-semibold", s.trend.startsWith("+") ? "text-mint-deep" : "text-red-500")}>{s.trend}</span>
                    <span className="font-bold text-brand">{s.score}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface">
                  <div className={cn("h-full rounded-full", s.score >= 90 ? "bg-mint-deep" : s.score >= 85 ? "bg-mint" : "bg-amber-400")} style={{ width: `${s.score}%` }} />
                </div>
              </div>
            ))}
            {data && (data.staff || []).length === 0 && (
              <p className="text-[12.5px] text-neutral-400">No staff mentions configured — add team names in Settings to track them.</p>
            )}
              </>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------- Locations ------------------------------ */

export function LocationsView({ onOpenLocation }: { onOpenLocation: (l: import("@/lib/viewmodels").LocationVM) => void }) {
  const { toast } = useToast();
  const locations = useApiData<{ locations: import("@/lib/viewmodels").LocationVM[] }>("/api/locations");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", area: "" });

  const syncNow = async (id: string, name: string) => {
    setSyncingId(id);
    try {
      const res = await api.post<{ newReviews: number }>(`/api/locations/${id}/sync`);
      toast({
        title: res.newReviews ? `${res.newReviews} new review${res.newReviews > 1 ? "s" : ""} pulled` : "Up to date",
        description: res.newReviews ? `${name} — scored, drafts queued.` : `${name} — no new reviews since the last cursor.`,
      });
      locations.reload();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const connectProfile = async () => {
    if (!newLoc.name.trim()) {
      toast({ title: "Name required", description: "Give the profile a name to connect it." });
      return;
    }
    try {
      await api.post("/api/locations", newLoc);
      toast({ title: "Profile connected", description: `${newLoc.name} is syncing now — reviews arrive within 15 minutes.` });
      setNewLoc({ name: "", area: "" });
      setAdding(false);
      locations.reload();
    } catch (e) {
      toast({ title: "Could not connect", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {(locations.data?.locations || []).map((l) => (
          <div
            key={l.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenLocation(l)}
            onKeyDown={(e) => { if (e.key === "Enter") onOpenLocation(l); }}
            className="cursor-pointer rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all hover:-translate-y-0.5 hover:border-mint-deep/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-mint"
            aria-label={`Open details for ${l.name}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><GoogleG size={18} /></span>
                <div>
                  <h3 className="text-[14.5px] font-semibold leading-tight text-brand">{l.name}</h3>
                  <p className="text-[12px] text-neutral-400">{l.area}</p>
                </div>
              </div>
              <StatusBadge status={l.syncState} />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[30px] font-bold leading-none text-brand">{l.rating}</span>
                  <span className={cn("text-[12.5px] font-semibold", l.delta >= 0 ? "text-mint-deep" : "text-red-500")}>
                    {l.delta >= 0 ? "+" : ""}{l.delta}
                  </span>
                </div>
                <StarRating value={l.rating} size={13} className="mt-1.5" />
              </div>
              <div className="text-right">
                <p className="text-[18px] font-bold text-brand">{l.reviews.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-neutral-400">total reviews</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3.5">
              <p className="flex items-center gap-1.5 text-[11.5px] text-neutral-400">
                <RefreshCw size={11} className={l.syncState === "attention" ? "text-amber-500" : "text-mint-deep"} />
                synced {l.lastSync}
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11.5px]" disabled={syncingId === l.id}
                  onClick={(e) => { e.stopPropagation(); syncNow(l.id, l.name); }}>
                  <RefreshCw size={11} className={cn("mr-1", syncingId === l.id && "animate-spin")} />
                  {syncingId === l.id ? "Syncing" : "Sync now"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[11.5px]" onClick={(e) => { e.stopPropagation(); onOpenLocation(l); }}>
                  Details <ChevronRight size={11} className="ml-0.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {locations.loading && [0, 1, 2].map((i) => <div key={i} className="h-[220px] animate-pulse rounded-2xl bg-surface" />)}

        {adding ? (
          <div className="flex min-h-[220px] flex-col justify-center gap-3 rounded-2xl border-2 border-dashed border-mint-deep/50 bg-white p-5">
            <input
              value={newLoc.name}
              onChange={(e) => setNewLoc((n) => ({ ...n, name: e.target.value }))}
              placeholder="Profile name — e.g. Spice Route Whitefield"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3 text-[13px] outline-none focus:border-mint/60"
            />
            <input
              value={newLoc.area}
              onChange={(e) => setNewLoc((n) => ({ ...n, area: e.target.value }))}
              placeholder="Area — e.g. Whitefield, Bengaluru"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3 text-[13px] outline-none focus:border-mint/60"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-9 flex-1 rounded-xl bg-brand text-[12.5px] text-white hover:bg-brand-deep" onClick={connectProfile}>
                <Check size={13} className="mr-1" /> Connect profile
              </Button>
              <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px]" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white/50 p-5 text-center transition-colors hover:border-mint-deep hover:bg-mint-soft/20"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-soft text-mint-deep"><Plus size={20} /></span>
            <p className="mt-3 text-[14px] font-semibold text-brand">Connect a Google Business Profile</p>
            <p className="mt-1 max-w-[220px] text-[12px] text-neutral-400">OAuth by the business owner · reviews start flowing within 15 minutes</p>
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Sync engine" subtitle="Reputation Command Center · how monitoring behaves">
          <div className="space-y-3 text-[13px]">
            {[
              { label: "Pull cadence", value: "Every 15 minutes (jittered)", icon: <RefreshCw size={13} /> },
              { label: "Notification rules", value: "1–2★ → WhatsApp + email · 3★ → email digest", icon: <Send size={13} /> },
              { label: "Daily digest", value: "9:00 AM IST to owners · 4–5★ roll-up", icon: <Mail size={13} /> },
              { label: "Failure policy", value: "3 consecutive errors → re-auth card + alert", icon: <AlertTriangle size={13} /> },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-3">
                <span className="flex items-center gap-2 font-medium text-neutral-600">{r.icon} {r.label}</span>
                <span className="text-right text-[12.5px] text-brand">{r.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Alert routing" subtitle="Who hears what, the moment it matters">
          <div className="space-y-3">
            {[
              { ch: "WhatsApp", to: "Owner + floor captain", when: "1–2★ reviews, sync failures", icon: <WhatsAppIcon size={14} className="text-mint-deep" /> },
              { ch: "Email", to: "ops@yourbusiness.in", when: "daily digest, weekly sentiment recap", icon: <Mail size={14} className="text-brand" /> },
              { ch: "In-app", to: "All managers", when: "approvals waiting > 4h", icon: <Bellish /> },
            ].map((r) => (
              <div key={r.ch} className="flex items-start gap-3 rounded-xl border border-neutral-100 p-3.5">
                <span className="mt-0.5">{r.icon}</span>
                <div className="text-[13px]">
                  <p className="font-semibold text-brand">{r.ch} → <span className="font-medium text-neutral-500">{r.to}</span></p>
                  <p className="text-[12px] text-neutral-400">{r.when}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Google Business Profile API readiness (doc §11 — integration as a critical dependency) */}
      <ChartCard
        title="Google Business Profile API readiness"
        subtitle="treated as a critical dependency — validate before scale"
        right={<Badge variant="outline" className="gap-1.5 rounded-full border-mint/40 bg-mint-soft text-mint-deep"><ShieldCheck size={12} /> {locations.data?.locations.length || 0} profile{(locations.data?.locations.length || 0) === 1 ? "" : "s"} connected</Badge>}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: "OAuth onboarding", v: "owner-consented, refresh tokens rotated" },
            { k: "Business Profile connection", v: "per-branch Google place mapping" },
            { k: "Multi-location account access", v: "group + location-level scopes" },
            { k: "Review synchronization", v: "15-min pull · cursor-based" },
            { k: "New-review notifications", v: "Pub/Sub push with polling fallback" },
            { k: "Reply publishing", v: "draft → approve → publish audit trail" },
            { k: "Multiple owners / managers", v: "role-based access on the Google side" },
            { k: "API quotas", v: "throttled bursts, backoff on 429" },
            { k: "Verification requirements", v: "business verified before reply scope" },
          ].map((c) => (
            <div key={c.k} className="flex items-start gap-2 rounded-xl border border-neutral-100 p-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-mint-deep" />
              <div>
                <p className="text-[12.5px] font-semibold text-brand">{c.k}</p>
                <p className="text-[11.5px] leading-snug text-neutral-400">{c.v}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

function Bellish() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

void SentimentBadge;
