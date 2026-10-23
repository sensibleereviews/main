// Sensiblee admin console — "Website" view: CMS for the marketing site.
// Tabs: Pages (copy + SEO per page) · Blog · FAQs · Testimonials · Media · Banner · Contact.
// Mutations require canOperate (super admin / manager); observers see read-only notes.
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api, useApiData } from "@/lib/client";
import { DEFAULT_URL_SLUGS, slugifyTitle } from "@/lib/route-shared";
import { cn, Globe, FileText, Newspaper, HelpCircle, Quote, Palette, Megaphone, Plus, Trash2, Save, ChevronUp, X, ImagePlus, RefreshCw, Phone, IndianRupee } from "./deps";

/* ------------------------------ shared bits ------------------------------ */

const inp = "h-9 w-full rounded-lg border border-white/10 bg-brand px-3 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-mint/50";
const inpArea = "w-full rounded-lg border border-white/10 bg-brand px-3 py-2 text-[12.5px] leading-relaxed text-white placeholder:text-white/30 outline-none focus:border-mint/50";
const lbl = "text-[10px] font-bold uppercase tracking-wider text-white/35";

function DarkCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-brand p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/15 text-mint">{icon}</span>
      <p className="mt-2.5 text-[13px] font-semibold text-white">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">{desc}</p>
    </div>
  );
}

function TabsBar({ tabs, active, onPick }: { tabs: { key: string; label: string; icon: React.ReactNode }[]; active: string; onPick: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onPick(t.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
            active === t.key ? "bg-mint text-brand-deep shadow-sm" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
          aria-pressed={active === t.key}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ bulk selection ------------------------------ */

// Multi-select state for CMS content tabs (blog posts, FAQs, testimonials,
// media). Row checkboxes toggle ids; BulkBar renders the bulk actions with a
// 4-second two-step delete confirm. Mutations loop the existing per-id APIs —
// list sizes here are small, so no dedicated bulk endpoint is needed.
function useBulkSelect() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[]) =>
    setSelected((prev) => (ids.length > 0 && prev.size === ids.length ? new Set() : new Set(ids)));
  const clear = () => setSelected(new Set());
  return { selected, count: selected.size, toggle, toggleAll, clear };
}

function BulkCheckbox({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-checked={checked}
      aria-label={label}
      role="checkbox"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked ? "border-mint bg-mint text-brand-deep" : "border-white/25 bg-white/5 hover:border-mint/60"
      )}
    >
      {checked && <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.2 4.8 9 10 3.2" /></svg>}
    </button>
  );
}

function BulkBar({ count, onDelete, extra, onDone }: { count: number; onDelete: () => Promise<void>; extra?: React.ReactNode; onDone: () => void }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setArmed(false); }, [count]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  if (count === 0) return null;
  const del = async () => {
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    try { await onDelete(); onDone(); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mint/25 bg-mint/10 px-3.5 py-2.5">
      <span className="text-[12px] font-bold text-mint">{count} selected</span>
      {extra}
      <div className="ml-auto flex items-center gap-2">
        <button disabled={busy} onClick={del}
          className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-bold transition-colors disabled:opacity-50",
            armed ? "bg-red-500 text-white hover:bg-red-400" : "bg-red-500/15 text-red-300 hover:bg-red-500/25")}>
          <Trash2 size={12} /> {busy ? "Deleting…" : armed ? `Really delete ${count}?` : "Delete selected"}
        </button>
        <button onClick={onDone} className="text-[11.5px] font-semibold text-white/40 hover:text-white">Clear</button>
      </div>
    </div>
  );
}

/* --------------------------- field-spec editor --------------------------- */

export type FieldSpec =
  | { key: string; label: string; type: "text" | "area"; hint?: string }
  | { key: string; label: string; type: "list"; itemLabel: string; fields: { key: string; label: string; type: "text" | "area" | "icon" }[] };

export const ICON_OPTIONS = ["hotel", "restaurant", "cafe", "clinic", "salon", "gym", "retail", "school"] as const;

function ListEditor({ spec, value, onChange, canEdit }: {
  spec: Extract<FieldSpec, { type: "list" }>;
  value: Record<string, unknown>[];
  onChange: (next: Record<string, unknown>[]) => void;
  canEdit: boolean;
}) {
  const items = Array.isArray(value) ? value : [];
  const update = (i: number, key: string, v: unknown) =>
    onChange(items.map((it, ix) => (ix === i ? { ...it, [key]: v } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-brand-deep/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40">{spec.itemLabel} {i + 1}</span>
            {canEdit && (
              <span className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white" aria-label="Move up"><ChevronUp size={13} className="rotate-0" /></button>
                <button onClick={() => move(i, 1)} className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white" aria-label="Move down"><ChevronUp size={13} className="rotate-180" /></button>
                <button onClick={() => onChange(items.filter((_, ix) => ix !== i))} className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label="Remove"><X size={13} /></button>
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {spec.fields.map((f) => (
              <label key={f.key} className={cn("block", f.type === "area" && "sm:col-span-2")}>
                <span className={lbl}>{f.label}</span>
                {f.type === "area" ? (
                  <textarea value={String(it[f.key] ?? "")} disabled={!canEdit} rows={2}
                    onChange={(e) => update(i, f.key, e.target.value)} className={cn(inpArea, "mt-1")} />
                ) : f.type === "icon" ? (
                  <select value={String(it[f.key] ?? "")} disabled={!canEdit}
                    onChange={(e) => update(i, f.key, e.target.value)} className={cn(inp, "mt-1 appearance-none")}>
                    {ICON_OPTIONS.map((o) => <option key={o} value={o} className="bg-brand">{o}</option>)}
                  </select>
                ) : (
                  <input value={String(it[f.key] ?? "")} disabled={!canEdit}
                    onChange={(e) => update(i, f.key, e.target.value)} className={cn(inp, "mt-1")} />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      {canEdit && (
        <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/15 bg-transparent text-[11.5px] text-white/70 hover:bg-white/5 hover:text-white"
          onClick={() => onChange([...items, Object.fromEntries(spec.fields.map((f) => [f.key, ""]))])}>
          <Plus size={12} className="mr-1" /> Add {spec.itemLabel.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ pages tab ------------------------------ */

type CmsPageRow = {
  id: string; slug: string; urlSlug: string; title: string; seoTitle: string; seoDescription: string;
  content: Record<string, unknown>; published: boolean; updatedAt: string;
};

// Effective public URL for a page row (custom override or built-in default).
const effectiveUrl = (p: { slug: string; urlSlug?: string | null }) =>
  p.slug === "home" ? "/" : `/${p.urlSlug || DEFAULT_URL_SLUGS[p.slug] || p.slug}`;

const PAGE_SPECS: Record<string, FieldSpec[]> = {
  home: [
    { key: "heroEyebrow", label: "Hero badge", type: "text" },
    { key: "heroTitleA", label: "Hero title — part 1", type: "text" },
    { key: "heroAccentA", label: "Hero title — accent 1 (green)", type: "text" },
    { key: "heroTitleB", label: "Hero title — part 2", type: "text" },
    { key: "heroAccentB", label: "Hero title — accent 2 (green, underlined)", type: "text" },
    { key: "heroSub", label: "Hero subtext", type: "area" },
    { key: "heroNote", label: "Hero note (under buttons)", type: "text" },
    { key: "trustedLabel", label: "Logo strip label", type: "text" },
    { key: "overviewSection", label: "Platform-in-a-nutshell header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "overview", label: "Platform overview paragraphs", type: "list", itemLabel: "Paragraph", fields: [{ key: "p", label: "Text", type: "area" }] },
    { key: "trialCard", label: "Free-trial card", type: "list", itemLabel: "Point", fields: [{ key: "title", label: "Card title", type: "text" }, { key: "sub", label: "Card subtext", type: "area" }, { key: "points", label: "Bullet points", type: "area" }] },
    { key: "stats", label: "Stats strip", type: "list", itemLabel: "Stat", fields: [{ key: "v", label: "Value", type: "text" }, { key: "l", label: "Label", type: "text" }] },
    { key: "modulesSection", label: "Modules section header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }, { key: "action", label: "Action link label", type: "text" }] },
    { key: "modules", label: "Module cards", type: "list", itemLabel: "Module", fields: [{ key: "title", label: "Title", type: "text" }, { key: "desc", label: "Description", type: "area" }] },
    { key: "howSection", label: "How-it-works header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }, { key: "action", label: "Action link label", type: "text" }] },
    { key: "steps", label: "Journey steps", type: "list", itemLabel: "Step", fields: [{ key: "t", label: "Title", type: "text" }, { key: "d", label: "Description", type: "area" }] },
    { key: "industriesSection", label: "Industries header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "industries", label: "Industry cards", type: "list", itemLabel: "Industry", fields: [{ key: "name", label: "Name", type: "text" }, { key: "ex", label: "Example line", type: "area" }, { key: "icon", label: "Icon", type: "icon" }] },
    { key: "testimonialsSection", label: "Testimonials header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "pricingSection", label: "Pricing header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }, { key: "action", label: "Action link label", type: "text" }] },
    { key: "faqSection", label: "FAQ header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }, { key: "action", label: "Action link label", type: "text" }] },
    { key: "blogsSection", label: "Recent blogs header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }, { key: "action", label: "Action link label", type: "text" }] },
    { key: "ctaNote", label: "Bottom CTA note", type: "text" },
  ],
  features: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "modules", label: "Feature modules", type: "list", itemLabel: "Module", fields: [{ key: "name", label: "Name", type: "text" }, { key: "headline", label: "Headline", type: "text" }, { key: "desc", label: "Description", type: "area" }, { key: "points", label: "Bullet points (one per line)", type: "area" }] },
  ],
  how: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "steps", label: "Journey steps", type: "list", itemLabel: "Step", fields: [{ key: "title", label: "Title", type: "text" }, { key: "time", label: "Time label", type: "text" }, { key: "desc", label: "Description", type: "area" }, { key: "points", label: "Chips (one per line)", type: "area" }] },
    { key: "pillars", label: "Bottom cards", type: "list", itemLabel: "Card", fields: [{ key: "t", label: "Title", type: "text" }, { key: "d", label: "Description", type: "area" }] },
  ],
  pricing: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "addOns", label: "Add-ons", type: "list", itemLabel: "Add-on", fields: [{ key: "name", label: "Name", type: "text" }, { key: "detail", label: "Detail", type: "text" }, { key: "price", label: "Price", type: "text" }] },
    { key: "compareTitle", label: "Comparison title", type: "text" },
    { key: "faqTitle", label: "FAQ title", type: "text" },
  ],
  stories: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "featured", label: "Featured case study", type: "list", itemLabel: "Field", fields: [{ key: "business", label: "Business", type: "text" }, { key: "place", label: "Place", type: "text" }, { key: "since", label: "Since line", type: "text" }, { key: "quote", label: "Quote", type: "area" }, { key: "person", label: "Person", type: "text" }, { key: "role", label: "Role", type: "text" }, { key: "challenge", label: "Challenge", type: "area" }, { key: "steps", label: "Steps (one per line)", type: "area" }] },
    { key: "stories", label: "Story cards", type: "list", itemLabel: "Story", fields: [{ key: "business", label: "Business", type: "text" }, { key: "place", label: "Place", type: "text" }, { key: "plan", label: "Plan chip", type: "text" }, { key: "quote", label: "Quote", type: "area" }, { key: "person", label: "Person", type: "text" }, { key: "role", label: "Role", type: "text" }, { key: "bullets", label: "Bullets (one per line)", type: "area" }] },
    { key: "aggregate", label: "Aggregate strip", type: "list", itemLabel: "Stat", fields: [{ key: "v", label: "Value", type: "text" }, { key: "l", label: "Label", type: "text" }] },
    { key: "ctaNote", label: "Bottom CTA note", type: "text" },
  ],
  security: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "pillars", label: "Pillars", type: "list", itemLabel: "Pillar", fields: [{ key: "title", label: "Title", type: "text" }, { key: "body", label: "Body", type: "area" }] },
    { key: "compliance", label: "Compliance cards", type: "list", itemLabel: "Card", fields: [{ key: "title", label: "Title", type: "text" }, { key: "body", label: "Body", type: "area" }] },
    { key: "subprocessors", label: "Subprocessor table", type: "list", itemLabel: "Row", fields: [{ key: "name", label: "Provider", type: "text" }, { key: "role", label: "Purpose", type: "text" }, { key: "data", label: "Data shared", type: "text" }, { key: "region", label: "Region", type: "text" }] },
    { key: "sla", label: "SLA strip", type: "list", itemLabel: "Commitment", fields: [{ key: "k", label: "Value", type: "text" }, { key: "v", label: "Label", type: "text" }] },
    { key: "practices", label: "Security practices", type: "list", itemLabel: "Practice", fields: [{ key: "p", label: "Practice", type: "area" }] },
    { key: "ctaNote", label: "Bottom CTA note", type: "text" },
  ],
  about: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "briefSection", label: "In-brief header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "brief", label: "In-brief paragraphs", type: "list", itemLabel: "Paragraph", fields: [{ key: "p", label: "Text", type: "area" }] },
    { key: "originKicker", label: "Origin kicker", type: "text" },
    { key: "originTitle", label: "Origin title", type: "text" },
    { key: "originBody", label: "Origin body", type: "area" },
    { key: "vision", label: "Vision card", type: "list", itemLabel: "Field", fields: [{ key: "kicker", label: "Kicker", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "body", label: "Body", type: "area" }] },
    { key: "mission", label: "Mission card", type: "list", itemLabel: "Field", fields: [{ key: "kicker", label: "Kicker", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "body", label: "Body", type: "area" }] },
    { key: "valuesSection", label: "Values header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "values", label: "Values", type: "list", itemLabel: "Value", fields: [{ key: "title", label: "Title", type: "text" }, { key: "desc", label: "Description", type: "area" }] },
    { key: "teamSection", label: "Team header", type: "list", itemLabel: "Header", fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "sub", label: "Subtext", type: "area" }] },
    { key: "team", label: "Team members", type: "list", itemLabel: "Member", fields: [{ key: "name", label: "Name", type: "text" }, { key: "role", label: "Role", type: "text" }, { key: "bio", label: "Bio", type: "area" }, { key: "photo", label: "Photo URL (e.g. /team/aarav-sharma.jpg)", type: "text" }] },
    { key: "storyKicker", label: "Story kicker", type: "text" },
    { key: "storyQuote", label: "Story quote", type: "text" },
    { key: "story", label: "Story columns", type: "list", itemLabel: "Column", fields: [{ key: "kicker", label: "Kicker", type: "text" }, { key: "text", label: "Text", type: "area" }] },
    { key: "ctaNote", label: "Bottom CTA note", type: "text" },
  ],
  contact: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "sideTitle", label: "Contact card title", type: "text" },
    { key: "sideSub", label: "Contact card subtext", type: "text" },
    { key: "whatsapp", label: "WhatsApp number", type: "text" },
    { key: "email", label: "Email address", type: "text" },
    { key: "nextTitle", label: "Next-steps title", type: "text" },
    { key: "nextSteps", label: "Next steps", type: "list", itemLabel: "Step", fields: [{ key: "s", label: "Text", type: "area" }] },
    { key: "inquiryNote", label: "Inquiry note (under form)", type: "area" },
    { key: "hoursTitle", label: "Support-hours card title", type: "text" },
    { key: "hoursLines", label: "Support hours — one line per row", type: "list", itemLabel: "Line", fields: [{ key: "s", label: "Text", type: "text" }] },
    { key: "locationOptions", label: "Location options", type: "list", itemLabel: "Option", fields: [{ key: "o", label: "Option", type: "text" }] },
    { key: "volumeOptions", label: "Volume options", type: "list", itemLabel: "Option", fields: [{ key: "o", label: "Option", type: "text" }] },
  ],
  privacy: [
    { key: "updated", label: "Last updated", type: "text" },
    { key: "sections", label: "Policy sections", type: "list", itemLabel: "Section", fields: [{ key: "h", label: "Heading", type: "text" }, { key: "body", label: "Paragraphs (one per line)", type: "area" }] },
  ],
  terms: [
    { key: "updated", label: "Last updated", type: "text" },
    { key: "sections", label: "Terms sections", type: "list", itemLabel: "Section", fields: [{ key: "h", label: "Heading", type: "text" }, { key: "body", label: "Paragraphs (one per line)", type: "area" }] },
  ],
  knowledge: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "categories", label: "Category headers", type: "list", itemLabel: "Category", fields: [{ key: "cat", label: "Category name (matches FAQs)", type: "text" }, { key: "blurb", label: "Blurb", type: "text" }] },
    { key: "searchPlaceholder", label: "Search placeholder", type: "text" },
    { key: "ctaTitle", label: "Bottom CTA title", type: "text" },
    { key: "ctaSub", label: "Bottom CTA subtext", type: "text" },
    { key: "ctaButton", label: "Bottom CTA button", type: "text" },
    { key: "noMatchTitle", label: "No-match title", type: "text" },
    { key: "noMatchSub", label: "No-match subtext", type: "text" },
  ],
  blog: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "footnote", label: "List footnote", type: "text" },
    { key: "ctaTitle", label: "Article CTA title", type: "text" },
    { key: "ctaSub", label: "Article CTA subtext", type: "text" },
  ],
  ticket: [
    { key: "eyebrow", label: "Hero badge", type: "text" },
    { key: "title", label: "Hero title", type: "text" },
    { key: "accent", label: "Hero accent (green)", type: "text" },
    { key: "description", label: "Hero subtext", type: "area" },
    { key: "topics", label: "Ticket topics", type: "list", itemLabel: "Topic", fields: [{ key: "t", label: "Topic", type: "text" }] },
  ],
};

const SINGLE_OBJECT_KEYS = new Set([
  "overviewSection", "trialCard", "modulesSection", "howSection",
  "industriesSection", "testimonialsSection", "pricingSection", "faqSection", "blogsSection",
  "briefSection", "vision", "mission", "valuesSection", "teamSection",
]);

const SCALAR_STRING_LIST_KEYS = new Set([
  "overview", "brief", "topics", "hoursLines", "nextSteps", "locationOptions", "volumeOptions",
]);

// Normalise array-ish content between editor shapes and renderer shapes.
function toEditorValue(key: string, v: unknown): unknown {
  if (SINGLE_OBJECT_KEYS.has(key)) {
    if (key === "trialCard") {
      const t = ((Array.isArray(v) ? v[0] : v) || {}) as { title?: string; sub?: string; points?: string[] | string };
      const pts = Array.isArray(t.points) ? t.points.join("\n") : String(t.points || "");
      return [{ title: t.title || "", sub: t.sub || "", points: pts }];
    }
    const t = ((Array.isArray(v) ? v[0] : v) || {}) as Record<string, unknown>;
    return [typeof t === "object" && t !== null ? { ...t } : {}];
  }
  if (Array.isArray(v)) {
    return v.map((item) => {
      if (item && typeof item === "object") {
        const rec = { ...(item as Record<string, unknown>) };
        for (const k of Object.keys(rec)) {
          if (Array.isArray(rec[k])) rec[k] = (rec[k] as unknown[]).join("\n");
        }
        return rec;
      }
      return { p: String(item) };
    });
  }
  return [{ p: String(v ?? "") }];
}

function fromEditorValue(key: string, items: Record<string, unknown>[], original: unknown): unknown {
  if (SINGLE_OBJECT_KEYS.has(key)) {
    const item = (items[0] || {}) as Record<string, unknown>;
    if (key === "trialCard") {
      return {
        title: String(item.title || ""),
        sub: String(item.sub || ""),
        points: String(item.points || "").split("\n").map((s) => s.trim()).filter(Boolean),
      };
    }
    const rec: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(item)) {
      rec[k] = typeof val === "string" ? val : String(val ?? "");
    }
    return rec;
  }
  // scalar-string lists (overview, brief, nextSteps, options, topics, etc.)
  if (SCALAR_STRING_LIST_KEYS.has(key) || (Array.isArray(original) && original.length > 0 && typeof original[0] === "string")) {
    return items.map((it) => String(it.p ?? it.s ?? it.o ?? it.t ?? "")).filter(Boolean);
  }
  return items.map((it) => {
    const rec: Record<string, unknown> = { ...it };
    for (const k of Object.keys(rec)) {
      if (typeof rec[k] === "string" && (rec[k] as string).includes("\n")) {
        rec[k] = (rec[k] as string).split("\n").map((s) => s.trimEnd()).filter((s, i, a) => !(i === a.length - 1 && s === ""));
      }
    }
    return rec;
  });
}

function PagesTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const pages = useApiData<{ pages: CmsPageRow[] }>("/api/cms/pages");
  const [slug, setSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<CmsPageRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = pages.data?.pages || [];
  const current = rows.find((p) => p.slug === slug) || null;

  const pick = (p: CmsPageRow) => {
    setSlug(p.slug);
    setDraft({ title: p.title, urlSlug: p.urlSlug || "", seoTitle: p.seoTitle, seoDescription: p.seoDescription, published: p.published, content: p.content });
  };

  const save = async () => {
    if (!current || !draft) return;
    setBusy(true);
    try {
      const nextUrl = effectiveUrl({ slug: current.slug, urlSlug: String(draft.urlSlug ?? "").trim() });
      await api.put(`/api/cms/pages/${current.slug}`, {
        title: draft.title, urlSlug: String(draft.urlSlug ?? "").trim(), seoTitle: draft.seoTitle, seoDescription: draft.seoDescription,
        published: draft.published, content: draft.content,
      });
      toast({ title: "Page saved", description: `${draft.title || current.title} is live at ${nextUrl} — reload the marketing site to see it.` });
      pages.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const setContent = (key: string, spec: FieldSpec, raw: unknown) => {
    if (!draft) return;
    const content = { ...(draft.content || {}) };
    if (spec.type === "list") {
      const items = (raw as Record<string, unknown>[]) || [];
      content[key] = fromEditorValue(key, items, (current?.content || {})[key]);
    } else {
      content[key] = raw;
    }
    setDraft({ ...draft, content });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="space-y-1.5">
        {rows.map((p) => (
          <button key={p.slug} onClick={() => pick(p)}
            className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
              slug === p.slug ? "bg-mint/15 text-mint ring-1 ring-mint/40" : "bg-brand-deep/40 text-white/70 hover:bg-white/5 hover:text-white")}>
            <FileText size={13} className="shrink-0 opacity-60" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">{p.title}</span>
              <span className="block truncate font-mono text-[10.5px] text-white/35">{effectiveUrl(p)}</span>
            </span>
            {!p.published && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">DEFAULTS</span>}
          </button>
        ))}
        {pages.loading && <div className="h-40 animate-pulse rounded-xl bg-brand-deep/40" />}
      </div>

      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        {!current || !draft ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center">
            <Globe size={22} className="text-white/20" />
            <p className="text-[13px] text-white/50">Pick a page to edit its copy, SEO and visibility.</p>
            <p className="max-w-sm text-[11.5px] text-white/30">Every page keeps built-in defaults — turning &ldquo;published&rdquo; off shows visitors the default copy instead of custom content, so the site never breaks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-white">{current.title} <span className="ml-1 font-mono text-[11px] text-white/30">{effectiveUrl(current)}</span></h3>
                <p className="text-[11px] text-white/35">Last saved {new Date(current.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canEdit}
                  onClick={() => setDraft({ ...draft, published: !draft.published })}
                  className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold",
                    draft.published ? "bg-mint/15 text-mint" : "bg-amber-400/15 text-amber-300")}
                >
                  {draft.published ? "Published — custom copy live" : "Unpublished — showing defaults"}
                </button>
                {canEdit ? (
                  <Button size="sm" className="h-8 rounded-xl bg-mint px-4 text-[12px] font-bold text-brand-deep hover:bg-mint/90" disabled={busy} onClick={save}>
                    <Save size={13} className="mr-1" /> {busy ? "Saving…" : "Save page"}
                  </Button>
                ) : (
                  <Badge className="border-white/10 bg-white/5 text-white/50">read-only</Badge>
                )}
              </div>
            </div>

            {/* Page identity — name + public URL (admin-editable) */}
            <div className="rounded-xl border border-white/10 bg-brand-deep/30 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mint">Page name &amp; URL</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block"><span className={lbl}>Page name</span>
                  <input value={String(draft.title ?? "")} disabled={!canEdit}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={cn(inp, "mt-1")} /></label>
                <label className="block"><span className={lbl}>URL path</span>
                  {current.slug === "home" ? (
                    <div className={cn(inp, "mt-1 flex items-center text-white/40")}>/ <span className="ml-1.5">homepage — fixed</span></div>
                  ) : (
                    <div className="mt-1 flex">
                      <span className="flex h-9 items-center rounded-l-lg border border-r-0 border-white/10 bg-brand-deep/60 px-2.5 font-mono text-[12px] text-white/40">/</span>
                      <input value={String(draft.urlSlug ?? "")} disabled={!canEdit}
                        placeholder={DEFAULT_URL_SLUGS[current.slug] || current.slug}
                        onChange={(e) => setDraft({ ...draft, urlSlug: e.target.value })} className={cn(inp, "rounded-l-none")} />
                    </div>
                  )}
                </label>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
                {current.slug === "home" ? "Every other page can be renamed and moved to a new URL here — lowercase letters, numbers and dashes."
                  : <>Leave empty for the built-in default <span className="font-mono text-white/50">/{DEFAULT_URL_SLUGS[current.slug] || current.slug}</span>. Saving renames the page{current.slug === "blog" ? " and its article links" : ""} at
                    <span className="ml-1 font-mono text-mint/70">{effectiveUrl({ slug: current.slug, urlSlug: slugifyTitle(String(draft.urlSlug ?? "")) })}</span> — the old address will stop working (no redirects).</>}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block"><span className={lbl}>SEO title</span>
                <input value={String(draft.seoTitle ?? "")} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })} className={cn(inp, "mt-1")} /></label>
              <label className="block"><span className={lbl}>SEO description</span>
                <input value={String(draft.seoDescription ?? "")} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })} className={cn(inp, "mt-1")} /></label>
            </div>

            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              {(PAGE_SPECS[current.slug] || []).map((spec) => {
                if (spec.type === "list") {
                  const original = (current.content || {})[spec.key];
                  const editorItems = toEditorValue(spec.key, draft.content?.[spec.key] ?? original);
                  return (
                    <div key={spec.key} className="rounded-xl border border-white/10 bg-brand-deep/30 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mint">{spec.label}</p>
                      <ListEditor spec={spec} canEdit={canEdit}
                        value={editorItems as Record<string, unknown>[]}
                        onChange={(next) => setContent(spec.key, spec, next)} />
                    </div>
                  );
                }
                const val = draft.content?.[spec.key] ?? "";
                return (
                  <label key={spec.key} className="block">
                    <span className={lbl}>{spec.label}</span>
                    {spec.type === "area" ? (
                      <textarea value={String(val)} disabled={!canEdit} rows={3} onChange={(e) => setContent(spec.key, spec, e.target.value)} className={cn(inpArea, "mt-1")} />
                    ) : (
                      <input value={String(val)} disabled={!canEdit} onChange={(e) => setContent(spec.key, spec, e.target.value)} className={cn(inp, "mt-1")} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ blog posts tab ------------------------------ */

type CmsPostRow = {
  id: string; slug: string; title: string; tag: string; excerpt: string; summary?: string; body: string;
  readTime: string; author: string; authorRole: string; featuredMediaId: string | null;
  seoTitle: string; seoDescription: string; published: boolean; publishedAt: string;
};

const emptyPost = { slug: "", title: "", tag: "Insights", excerpt: "", summary: "", body: "", readTime: "5 min read", author: "Admin", authorRole: "Sensiblee Team", seoTitle: "", seoDescription: "", published: true, publishedAt: new Date().toISOString(), featuredMediaId: null as string | null };

function PostsTab({ canEdit, media }: { canEdit: boolean; media: { id: string; filename: string }[] }) {
  const { toast } = useToast();
  const posts = useApiData<{ posts: CmsPostRow[] }>("/api/cms/posts");
  const [editing, setEditing] = useState<CmsPostRow | typeof emptyPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const bulk = useBulkSelect();

  const open = (p: CmsPostRow | typeof emptyPost, fresh = false) => { setEditing({ ...p }); setIsNew(fresh); };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if (isNew) await api.post("/api/cms/posts", editing);
      else await api.patch(`/api/cms/posts/${(editing as CmsPostRow).id}`, editing);
      toast({ title: isNew ? "Article created" : "Article saved", description: editing.title });
      setEditing(null);
      posts.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (p: CmsPostRow) => {
    try { await api.del(`/api/cms/posts/${p.id}`); posts.reload(); toast({ title: "Article deleted", description: p.title }); }
    catch (e) { toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
  };

  const set = (k: keyof CmsPostRow | keyof typeof emptyPost, v: unknown) => setEditing((p) => (p ? { ...p, [k]: v } : p));
  const rows = posts.data?.posts || [];
  const rowIds = rows.map((p) => p.id);

  const bulkDelete = async () => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.del(`/api/cms/posts/${id}`); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); posts.reload();
    toast({ title: `${ok} of ${ids.length} article${ids.length === 1 ? "" : "s"} deleted`, variant: ok === ids.length ? "default" : "destructive" });
  };
  const bulkPublish = async (published: boolean) => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.patch(`/api/cms/posts/${id}`, { published }); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); posts.reload();
    toast({ title: published ? `${ok} article${ok === 1 ? "" : "s"} published` : `${ok} article${ok === 1 ? "" : "s"} moved to drafts` });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">{rows.length} article{rows.length === 1 ? "" : "s"}</Badge>
          {canEdit && rows.length > 0 && !editing && (
            <BulkCheckbox checked={bulk.count === rows.length && rows.length > 0} onClick={() => bulk.toggleAll(rowIds)} label="Select all articles" />
          )}
        </div>
        {canEdit && <Button size="sm" className="h-8 rounded-xl bg-mint px-3.5 text-[12px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => open(emptyPost, true)}><Plus size={13} className="mr-1" /> New article</Button>}
      </div>

      {canEdit && (
        <BulkBar
          count={bulk.count}
          onDelete={bulkDelete}
          onDone={bulk.clear}
          extra={
            <>
              <button onClick={() => bulkPublish(true)} className="flex h-8 items-center rounded-lg bg-mint/15 px-3 text-[11.5px] font-bold text-mint hover:bg-mint/25">Publish selected</button>
              <button onClick={() => bulkPublish(false)} className="flex h-8 items-center rounded-lg bg-amber-400/15 px-3 text-[11.5px] font-bold text-amber-300 hover:bg-amber-400/25">Move to drafts</button>
            </>
          }
        />
      )}

      {editing ? (
        <div className="space-y-3 rounded-2xl border border-mint/25 bg-brand-deep/40 p-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block"><span className={lbl}>Title</span><input value={editing.title} disabled={!canEdit} onChange={(e) => set("title", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Slug (legacy — public URL always comes from the title)</span><input value={editing.slug} disabled={!canEdit} onChange={(e) => set("slug", e.target.value)} className={cn(inp, "mt-1")} placeholder="auto from title" /></label>
            <label className="block"><span className={lbl}>Category chip</span><input value={editing.tag} disabled={!canEdit} onChange={(e) => set("tag", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Read time</span><input value={editing.readTime} disabled={!canEdit} onChange={(e) => set("readTime", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Author</span><input value={editing.author} disabled={!canEdit} onChange={(e) => set("author", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Author role</span><input value={editing.authorRole} disabled={!canEdit} onChange={(e) => set("authorRole", e.target.value)} className={cn(inp, "mt-1")} /></label>
          </div>
          <label className="block"><span className={lbl}>Excerpt</span><textarea rows={2} value={editing.excerpt} disabled={!canEdit} onChange={(e) => set("excerpt", e.target.value)} className={cn(inpArea, "mt-1")} /></label>
          <label className="block"><span className={lbl}>Article summary — shown in the “In this article” panel</span><textarea rows={2} value={editing.summary || ""} disabled={!canEdit} onChange={(e) => set("summary", e.target.value)} className={cn(inpArea, "mt-1")} /></label>
          <label className="block"><span className={lbl}>Body — paragraphs separated by a blank line; start a line with “## ” for a heading or “### ” for a sub-heading</span><textarea rows={10} value={editing.body} disabled={!canEdit} onChange={(e) => set("body", e.target.value)} className={cn(inpArea, "mt-1 font-mono text-[11.5px]")} /></label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block"><span className={lbl}>SEO title</span><input value={editing.seoTitle} disabled={!canEdit} onChange={(e) => set("seoTitle", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>SEO description</span><input value={editing.seoDescription} disabled={!canEdit} onChange={(e) => set("seoDescription", e.target.value)} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Featured image (Media tab to upload)</span>
              <select value={editing.featuredMediaId || ""} disabled={!canEdit} onChange={(e) => set("featuredMediaId", e.target.value || null)} className={cn(inp, "mt-1 appearance-none")}>
                <option value="" className="bg-brand">— none —</option>
                {media.map((m) => <option key={m.id} value={m.id} className="bg-brand">{m.filename}</option>)}
              </select></label>
            <label className="block"><span className={lbl}>Publish date</span>
              <input type="date" value={String(editing.publishedAt).slice(0, 10)} disabled={!canEdit} onChange={(e) => set("publishedAt", e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())} className={cn(inp, "mt-1")} /></label>
          </div>
          <button disabled={!canEdit} onClick={() => set("published", !editing.published)}
            className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold", editing.published ? "bg-mint/15 text-mint" : "bg-amber-400/15 text-amber-300")}>
            {editing.published ? "Published" : "Draft — hidden from visitors"}
          </button>
          <div className="flex gap-2 pt-1">
            {canEdit && <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" disabled={busy || !editing.title.trim()} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : isNew ? "Create article" : "Save article"}</Button>}
            <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-3">
              {canEdit && <BulkCheckbox checked={bulk.selected.has(p.id)} onClick={() => bulk.toggle(p.id)} label={`Select ${p.title}`} />}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">{p.tag.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{p.title} {!p.published && <span className="text-[10.5px] font-bold uppercase text-amber-300">· draft</span>}</p>
                <p className="truncate text-[11px] text-white/40">/blog/{(p.title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || p.slug} · {new Date(p.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.author}</p>
              </div>
              {canEdit && (
                <>
                  <button onClick={() => open(p)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Edit ${p.title}`}><FileText size={14} /></button>
                  <button onClick={() => remove(p)} className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label={`Delete ${p.title}`}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
          {posts.loading && <div className="h-24 animate-pulse rounded-xl bg-brand-deep/50" />}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- faqs tab -------------------------------- */

type CmsFaqRow = { id: string; section: string; category: string; question: string; answer: string; sortOrder: number; published: boolean };
const emptyFaq = { section: "home", category: "General", question: "", answer: "", sortOrder: 99, published: true };

function FaqsTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const faqs = useApiData<{ faqs: CmsFaqRow[] }>("/api/cms/faqs");
  const [section, setSection] = useState("home");
  const [editing, setEditing] = useState<CmsFaqRow | typeof emptyFaq | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const bulk = useBulkSelect();

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if (isNew) await api.post("/api/cms/faqs", editing);
      else await api.patch(`/api/cms/faqs/${(editing as CmsFaqRow).id}`, editing);
      toast({ title: isNew ? "FAQ added" : "FAQ saved", description: editing.question });
      setEditing(null);
      faqs.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (f: CmsFaqRow) => {
    try { await api.del(`/api/cms/faqs/${f.id}`); faqs.reload(); toast({ title: "FAQ deleted" }); }
    catch (e) { toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
  };

  const rows = (faqs.data?.faqs || []).filter((f) => f.section === section);
  const rowIds = rows.map((f) => f.id);

  const bulkDelete = async () => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.del(`/api/cms/faqs/${id}`); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); faqs.reload();
    toast({ title: `${ok} of ${ids.length} FAQ${ids.length === 1 ? "" : "s"} deleted`, variant: ok === ids.length ? "default" : "destructive" });
  };
  const bulkPublish = async (published: boolean) => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.patch(`/api/cms/faqs/${id}`, { published }); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); faqs.reload();
    toast({ title: published ? `${ok} FAQ${ok === 1 ? "" : "s"} shown` : `${ok} FAQ${ok === 1 ? "" : "s"} hidden` });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex gap-1.5">
            {[["home", "Homepage FAQs"], ["pricing", "Pricing FAQs"], ["knowledge", "FAQs"]].map(([k, label]) => (
              <button key={k} onClick={() => { setSection(k); bulk.clear(); }}
                className={cn("rounded-xl px-3 py-1.5 text-[12px] font-semibold", section === k ? "bg-mint text-brand-deep" : "bg-white/5 text-white/60 hover:text-white")}>
                {label}
              </button>
            ))}
          </div>
          {canEdit && rows.length > 0 && !editing && (
            <BulkCheckbox checked={bulk.count === rows.length && rows.length > 0} onClick={() => bulk.toggleAll(rowIds)} label="Select all FAQs" />
          )}
        </div>
        {canEdit && <Button size="sm" className="h-8 rounded-xl bg-mint px-3.5 text-[12px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => { setEditing({ ...emptyFaq, section, category: section === "pricing" ? "Pricing" : "General" }); setIsNew(true); }}><Plus size={13} className="mr-1" /> Add FAQ</Button>}
      </div>

      {canEdit && (
        <BulkBar
          count={bulk.count}
          onDelete={bulkDelete}
          onDone={bulk.clear}
          extra={
            <>
              <button onClick={() => bulkPublish(true)} className="flex h-8 items-center rounded-lg bg-mint/15 px-3 text-[11.5px] font-bold text-mint hover:bg-mint/25">Show selected</button>
              <button onClick={() => bulkPublish(false)} className="flex h-8 items-center rounded-lg bg-amber-400/15 px-3 text-[11.5px] font-bold text-amber-300 hover:bg-amber-400/25">Hide selected</button>
            </>
          }
        />
      )}

      {editing ? (
        <div className="space-y-2.5 rounded-2xl border border-mint/25 bg-brand-deep/40 p-4">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="block"><span className={lbl}>Section</span>
              <select value={editing.section} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, section: e.target.value })} className={cn(inp, "mt-1 appearance-none")}>
                {["home", "pricing", "knowledge"].map((s) => <option key={s} value={s} className="bg-brand">{s}</option>)}
              </select></label>
            <label className="block sm:col-span-2"><span className={lbl}>Category (knowledge page groups by this)</span>
              <input value={editing.category} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={cn(inp, "mt-1")} /></label>
          </div>
          <label className="block"><span className={lbl}>Question</span><input value={editing.question} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, question: e.target.value })} className={cn(inp, "mt-1")} /></label>
          <label className="block"><span className={lbl}>Answer</span><textarea rows={4} value={editing.answer} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} className={cn(inpArea, "mt-1")} /></label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="block"><span className={lbl}>Sort order</span>
              <input type="number" value={editing.sortOrder} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} className={cn(inp, "mt-1 w-24")} /></label>
            <button disabled={!canEdit} onClick={() => setEditing({ ...editing, published: !editing.published })}
              className={cn("mt-4 flex h-8 items-center rounded-full px-3 text-[11px] font-bold", editing.published ? "bg-mint/15 text-mint" : "bg-amber-400/15 text-amber-300")}>
              {editing.published ? "Visible" : "Hidden"}
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            {canEdit && <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" disabled={busy || !editing.question.trim() || !editing.answer.trim()} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : "Save FAQ"}</Button>}
            <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-3">
              {canEdit && <span className="pt-0.5"><BulkCheckbox checked={bulk.selected.has(f.id)} onClick={() => bulk.toggle(f.id)} label={`Select ${f.question}`} /></span>}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">{f.question} {!f.published && <span className="text-[10.5px] font-bold uppercase text-amber-300">· hidden</span>}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-white/40">{f.answer}</p>
                <p className="mt-1 text-[10.5px] text-white/25">{f.category} · order {f.sortOrder}</p>
              </div>
              {canEdit && (
                <>
                  <button onClick={() => { setEditing(f); setIsNew(false); }} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Edit FAQ"><FileText size={14} /></button>
                  <button onClick={() => remove(f)} className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label="Delete FAQ"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
          {faqs.loading && <div className="h-24 animate-pulse rounded-xl bg-brand-deep/50" />}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- testimonials tab ---------------------------- */

type CmsTsmRow = { id: string; quote: string; name: string; role: string; stars: number; section: string; mediaId: string | null; sortOrder: number; published: boolean };
const emptyTsm = { quote: "", name: "", role: "", stars: 5, section: "home", mediaId: null as string | null, sortOrder: 99, published: true };

function TestimonialsTab({ canEdit, media }: { canEdit: boolean; media: { id: string; filename: string }[] }) {
  const { toast } = useToast();
  const tsms = useApiData<{ testimonials: CmsTsmRow[] }>("/api/cms/testimonials");
  const [editing, setEditing] = useState<CmsTsmRow | typeof emptyTsm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const bulk = useBulkSelect();

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if (isNew) await api.post("/api/cms/testimonials", editing);
      else await api.patch(`/api/cms/testimonials/${(editing as CmsTsmRow).id}`, editing);
      toast({ title: isNew ? "Testimonial added" : "Testimonial saved", description: editing.name });
      setEditing(null);
      tsms.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (t: CmsTsmRow) => {
    try { await api.del(`/api/cms/testimonials/${t.id}`); tsms.reload(); toast({ title: "Testimonial deleted" }); }
    catch (e) { toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
  };

  const rows = tsms.data?.testimonials || [];
  const rowIds = rows.map((t) => t.id);

  const bulkDelete = async () => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.del(`/api/cms/testimonials/${id}`); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); tsms.reload();
    toast({ title: `${ok} of ${ids.length} testimonial${ids.length === 1 ? "" : "s"} deleted`, variant: ok === ids.length ? "default" : "destructive" });
  };
  const bulkPublish = async (published: boolean) => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.patch(`/api/cms/testimonials/${id}`, { published }); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); tsms.reload();
    toast({ title: published ? `${ok} testimonial${ok === 1 ? "" : "s"} shown` : `${ok} testimonial${ok === 1 ? "" : "s"} hidden` });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">{rows.length} testimonial{rows.length === 1 ? "" : "s"}</Badge>
          {canEdit && rows.length > 0 && !editing && (
            <BulkCheckbox checked={bulk.count === rows.length && rows.length > 0} onClick={() => bulk.toggleAll(rowIds)} label="Select all testimonials" />
          )}
        </div>
        {canEdit && <Button size="sm" className="h-8 rounded-xl bg-mint px-3.5 text-[12px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => { setEditing({ ...emptyTsm }); setIsNew(true); }}><Plus size={13} className="mr-1" /> Add testimonial</Button>}
      </div>

      {canEdit && (
        <BulkBar
          count={bulk.count}
          onDelete={bulkDelete}
          onDone={bulk.clear}
          extra={
            <>
              <button onClick={() => bulkPublish(true)} className="flex h-8 items-center rounded-lg bg-mint/15 px-3 text-[11.5px] font-bold text-mint hover:bg-mint/25">Show selected</button>
              <button onClick={() => bulkPublish(false)} className="flex h-8 items-center rounded-lg bg-amber-400/15 px-3 text-[11.5px] font-bold text-amber-300 hover:bg-amber-400/25">Hide selected</button>
            </>
          }
        />
      )}

      {editing ? (
        <div className="space-y-2.5 rounded-2xl border border-mint/25 bg-brand-deep/40 p-4">
          <label className="block"><span className={lbl}>Quote</span><textarea rows={3} value={editing.quote} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} className={cn(inpArea, "mt-1")} /></label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block"><span className={lbl}>Customer name</span><input value={editing.name} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Role line (business · city)</span><input value={editing.role} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className={cn(inp, "mt-1")} /></label>
            <label className="block"><span className={lbl}>Stars</span>
              <select value={String(editing.stars)} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, stars: Number(e.target.value) })} className={cn(inp, "mt-1 appearance-none")}>
                {["5", "4.5", "4"].map((s) => <option key={s} value={s} className="bg-brand">{s} ★</option>)}
              </select></label>
            <label className="block"><span className={lbl}>Photo (Media tab to upload)</span>
              <select value={editing.mediaId || ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, mediaId: e.target.value || null })} className={cn(inp, "mt-1 appearance-none")}>
                <option value="" className="bg-brand">— initials avatar —</option>
                {media.map((m) => <option key={m.id} value={m.id} className="bg-brand">{m.filename}</option>)}
              </select></label>
          </div>
          <button disabled={!canEdit} onClick={() => setEditing({ ...editing, published: !editing.published })}
            className={cn("flex h-8 items-center rounded-full px-3 text-[11px] font-bold", editing.published ? "bg-mint/15 text-mint" : "bg-amber-400/15 text-amber-300")}>
            {editing.published ? "Visible" : "Hidden"}
          </button>
          <div className="flex gap-2 pt-1">
            {canEdit && <Button size="sm" className="h-9 flex-1 rounded-xl bg-mint text-[12.5px] font-semibold text-brand-deep hover:bg-mint/90" disabled={busy || !editing.quote.trim() || !editing.name.trim()} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : "Save testimonial"}</Button>}
            <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[12.5px] text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-xl bg-brand-deep/50 px-3.5 py-3">
              {canEdit && <span className="pt-0.5"><BulkCheckbox checked={bulk.selected.has(t.id)} onClick={() => bulk.toggle(t.id)} label={`Select ${t.name}`} /></span>}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">{t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">{t.name} <span className="text-[10.5px] font-bold text-mint">{t.stars}★</span>{!t.published && <span className="ml-1 text-[10.5px] font-bold uppercase text-amber-300">· hidden</span>}</p>
                <p className="text-[11px] text-white/40">{t.role}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-white/50">&ldquo;{t.quote}&rdquo;</p>
              </div>
              {canEdit && (
                <>
                  <button onClick={() => { setEditing(t); setIsNew(false); }} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Edit"><FileText size={14} /></button>
                  <button onClick={() => remove(t)} className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label="Delete"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
          {tsms.loading && <div className="h-24 animate-pulse rounded-xl bg-brand-deep/50" />}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- media tab -------------------------------- */

type CmsMediaRow = { id: string; filename: string; mime: string; size: number; alt: string; url: string; createdAt: string };

function MediaTab({ canEdit, onChanged }: { canEdit: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const media = useApiData<{ media: CmsMediaRow[] }>("/api/cms/media");
  const [busy, setBusy] = useState(false);
  const bulk = useBulkSelect();
  const rows = media.data?.media || [];

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cms/media", { method: "POST", body: fd, credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      toast({ title: "Image uploaded", description: data.media.filename });
      media.reload();
      onChanged();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (m: CmsMediaRow) => {
    try { await api.del(`/api/cms/media/${m.id}`); media.reload(); onChanged(); toast({ title: "Image deleted", description: m.filename }); }
    catch (e) { toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
  };

  const copyUrl = async (m: CmsMediaRow) => {
    try { await navigator.clipboard.writeText(m.url); toast({ title: "URL copied", description: m.url }); } catch { toast({ title: m.url }); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(bulk.selected);
    let ok = 0;
    for (const id of ids) { try { await api.del(`/api/cms/media/${id}`); ok += 1; } catch { /* keep going */ } }
    bulk.clear(); media.reload(); onChanged();
    toast({ title: `${ok} of ${ids.length} image${ids.length === 1 ? "" : "s"} deleted`, variant: ok === ids.length ? "default" : "destructive" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-white/40">Images usable across the CMS — testimonial photos, blog featured images. Max 2 MB, images only.</p>
        {canEdit && (
          <label className={cn("flex h-8 cursor-pointer items-center rounded-xl bg-mint px-3.5 text-[12px] font-bold text-brand-deep hover:bg-mint/90", busy && "opacity-50")}>
            <ImagePlus size={13} className="mr-1.5" /> {busy ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {canEdit && <BulkBar count={bulk.count} onDelete={bulkDelete} onDone={bulk.clear} />}
      {rows.length === 0 && !media.loading ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-brand-deep/30 p-8 text-center">
          <Palette size={22} className="mx-auto text-white/20" />
          <p className="mt-2 text-[12.5px] text-white/40">No images yet — upload the first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((m) => (
            <div key={m.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-deep/40">
              {canEdit && (
                <span className="absolute left-2 top-2 z-10 rounded-lg bg-brand-deep/80 p-1">
                  <BulkCheckbox checked={bulk.selected.has(m.id)} onClick={() => bulk.toggle(m.id)} label={`Select ${m.filename}`} />
                </span>
              )}
              <img src={m.url} alt={m.alt || m.filename} className="aspect-video w-full bg-white/5 object-cover" />
              <div className="p-2.5">
                <p className="truncate text-[11.5px] font-semibold text-white">{m.filename}</p>
                <p className="text-[10px] text-white/30">{Math.round(m.size / 1024)} KB · {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                <div className="mt-1.5 flex gap-1">
                  <button onClick={() => copyUrl(m)} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white">Copy URL</button>
                  {canEdit && <button onClick={() => remove(m)} className="rounded-lg p-1 text-white/30 hover:bg-white/5 hover:text-red-300" aria-label={`Delete ${m.filename}`}><Trash2 size={12} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- banner tab ------------------------------- */

function BannerTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const settings = useApiData<{ settings: { banner_enabled: string; banner_text: string; banner_link: string } }>("/api/cms/settings");
  const [draft, setDraft] = useState<{ banner_enabled: string; banner_text: string; banner_link: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = draft || settings.data?.settings || { banner_enabled: "false", banner_text: "", banner_link: "" };
  const set = (k: keyof typeof s, v: string) => setDraft({ ...s, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/api/cms/settings", s);
      toast({ title: "Banner saved", description: s.banner_enabled === "true" ? "The announcement bar is live on the website." : "Banner is switched off." });
      settings.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const NAV_TARGETS = [["", "— no link —"], ["features", "Features"], ["how", "How it works"], ["pricing", "Pricing"], ["stories", "Customer Stories"], ["about", "About Us"], ["contact", "Contact (Talk to us)"], ["knowledge", "FAQs"], ["blog", "Blog"]];

  return (
    <div className="max-w-2xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white"><Megaphone size={15} className="text-mint" /> Announcement banner</h3>
        <p className="mt-1 text-[12px] text-white/40">A slim bar above the website header — for launches, cohorts and offers. Off = invisible.</p>

        <div className="mt-4 space-y-2.5">
          <button disabled={!canEdit} onClick={() => set("banner_enabled", s.banner_enabled === "true" ? "false" : "true")}
            className={cn("flex h-9 items-center gap-2 rounded-full px-4 text-[12px] font-bold", s.banner_enabled === "true" ? "bg-mint/15 text-mint" : "bg-white/5 text-white/50")}>
            {s.banner_enabled === "true" ? "ON — showing on the site" : "OFF — hidden"}
          </button>
          <label className="block"><span className={lbl}>Text</span>
            <input value={s.banner_text} disabled={!canEdit} onChange={(e) => set("banner_text", e.target.value)} className={cn(inp, "mt-1")} placeholder="Now onboarding design partners for the June cohort." /></label>
          <label className="block"><span className={lbl}>Link</span>
            <select value={s.banner_link} disabled={!canEdit} onChange={(e) => set("banner_link", e.target.value)} className={cn(inp, "mt-1 appearance-none")}>
              {NAV_TARGETS.map(([v, label]) => <option key={v} value={v} className="bg-brand">{label}</option>)}
            </select></label>
          {s.banner_enabled === "true" && s.banner_text && (
            <div className="rounded-xl bg-white/5 p-3">
              <p className={lbl}>Preview</p>
              <div className="mt-2 rounded-lg bg-brand px-4 py-2 text-center text-[12.5px] font-medium text-white">
                ✦ {s.banner_text} {s.banner_link && <span className="font-bold text-mint">Learn more →</span>}
              </div>
            </div>
          )}
          {canEdit && <Button size="sm" className="h-9 w-full rounded-xl bg-mint text-[12.5px] font-bold text-brand-deep hover:bg-mint/90 sm:w-auto sm:px-5" disabled={busy} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : "Save banner"}</Button>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DarkCard icon={<RefreshCw size={15} />} title="Instant, cache-free" desc="Banner changes apply on the next page load — no deploy, no cache purge." />
        <DarkCard icon={<Globe size={15} />} title="One website, one source" desc="The same bar appears on www.sensiblee.in and any marketing deep link." />
      </div>
    </div>
  );
}

/* ------------------------------- contact tab ------------------------------- */

function ContactTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const settings = useApiData<{ settings: { contact_phone: string; contact_whatsapp: string; contact_email: string } }>("/api/cms/settings");
  const [draft, setDraft] = useState<{ contact_phone: string; contact_whatsapp: string; contact_email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = draft || settings.data?.settings || { contact_phone: "", contact_whatsapp: "", contact_email: "" };
  const set = (k: keyof typeof s, v: string) => setDraft({ ...s, [k]: v });

  // Derive the live footer rows exactly like the site does (src/lib/cms.ts).
  const digits = s.contact_phone.replace(/\D/g, "");
  const wa = s.contact_whatsapp.replace(/\D/g, "") || digits;
  const email = s.contact_email || "hello@sensiblee.in";

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/api/cms/settings", s);
      toast({ title: "Contact details saved", description: "The footer and legal pages now show the new details." });
      settings.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white"><Phone size={15} className="text-mint" /> Get in Touch — footer contact</h3>
        <p className="mt-1 text-[12px] text-white/40">Shown in the website footer on every page and in the legal-page contact line. Leave a field empty to keep the built-in default.</p>

        <div className="mt-4 space-y-2.5">
          <label className="block"><span className={lbl}>Phone (display)</span>
            <input value={s.contact_phone} disabled={!canEdit} onChange={(e) => set("contact_phone", e.target.value)} className={cn(inp, "mt-1")} placeholder="+91 93547 60585" />
            <span className="mt-1 block text-[10.5px] text-white/30">Tap-to-call and WhatsApp links are derived from this number automatically.</span></label>
          <label className="block"><span className={lbl}>WhatsApp number (optional)</span>
            <input value={s.contact_whatsapp} disabled={!canEdit} onChange={(e) => set("contact_whatsapp", e.target.value)} className={cn(inp, "mt-1")} placeholder="919354760585 — only if different from the phone above" /></label>
          <label className="block"><span className={lbl}>Email</span>
            <input value={s.contact_email} disabled={!canEdit} onChange={(e) => set("contact_email", e.target.value)} className={cn(inp, "mt-1")} placeholder="hello@sensiblee.in" /></label>

          {(s.contact_phone || s.contact_email) && (
            <div className="rounded-xl bg-white/5 p-3">
              <p className={lbl}>Preview — footer “Get in Touch”</p>
              <ul className="mt-2 space-y-1.5 text-[12.5px] text-white/70">
                {s.contact_phone && <li><span className="text-white/35">Phone ·</span> {s.contact_phone}</li>}
                {s.contact_phone && <li><span className="text-white/35">WhatsApp ·</span> {s.contact_phone} <span className="text-white/30">(wa.me/{wa})</span></li>}
                {s.contact_email && <li><span className="text-white/35">Email ·</span> {email}</li>}
              </ul>
            </div>
          )}
          {canEdit && <Button size="sm" className="h-9 w-full rounded-xl bg-mint text-[12.5px] font-bold text-brand-deep hover:bg-mint/90 sm:w-auto sm:px-5" disabled={busy} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : "Save contact details"}</Button>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DarkCard icon={<RefreshCw size={15} />} title="Live without a deploy" desc="Saved details appear in the footer on the very next page load — no rebuild needed." />
        <DarkCard icon={<Globe size={15} />} title="Everywhere at once" desc="Footer on all 13 pages plus the privacy/terms contact line update together." />
      </div>
    </div>
  );
}

/* --------------------------------- tax tab --------------------------------- */

function TaxTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const settings = useApiData<{ settings: { tax_percent: string } }>("/api/cms/settings");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const raw = draft ?? settings.data?.settings.tax_percent ?? "18";
  const n = Number(raw);
  const valid = raw !== "" && Number.isFinite(n) && n >= 0 && n <= 50;

  const save = async () => {
    if (!valid) {
      toast({ title: "Check the tax rate", description: "Enter a number between 0 and 50 — e.g. 18 or 5.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await api.put("/api/cms/settings", { tax_percent: raw });
      toast({ title: "Tax rate updated", description: `The website pricing now shows GST @ ${Math.round(Number(raw) * 100) / 100}%.` });
      setDraft(null);
      settings.reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const exampleInr = 999;
  const exampleGst = valid && Number.isFinite(n) ? Math.round(exampleInr * n) / 100 : 18;

  return (
    <div className="max-w-2xl space-y-3">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white"><IndianRupee size={15} className="text-mint" /> Tax rate — GST %</h3>
        <p className="mt-1 text-[12px] text-white/40">
          Single source of truth for every price shown on the marketing website. Plan and add-on prices are
          tax-exclusive; the GST % here is how they are presented. Invoices stay GST-compliant regardless.
        </p>

        <div className="mt-4 space-y-2.5">
          <label className="block">
            <span className={lbl}>GST rate (%)</span>
            <input
              value={raw}
              disabled={!canEdit}
              inputMode="decimal"
              onChange={(e) => setDraft(e.target.value)}
              className={cn(inp, "mt-1 max-w-[140px]")}
              placeholder="18"
            />
            <span className="mt-1 block text-[10.5px] text-white/30">0–50, decimals allowed. Default 18 (standard rate for restaurant &amp; SaaS services in India).</span>
          </label>

          <div className="rounded-xl bg-white/5 p-3">
            <p className={lbl}>Preview — a ₹999/month plan displays as</p>
            <p className="mt-2 text-[13px] font-semibold text-white">
              ₹999 + GST @ {valid ? Math.round(Number(raw) * 100) / 100 : "18"}%
              {valid && Number(raw) > 0 && Number(raw) !== 18 && (
                <span className="ml-2 font-normal text-white/40">(was 18% before this change)</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-white/35">≈ ₹{(exampleInr + exampleGst).toLocaleString("en-IN")} inclusive on the first invoice, itemised as ₹999 + ₹{exampleGst.toLocaleString("en-IN")} GST.</p>
          </div>

          {canEdit && <Button size="sm" className="h-9 w-full rounded-xl bg-mint text-[12.5px] font-bold text-brand-deep hover:bg-mint/90 sm:w-auto sm:px-5" disabled={busy} onClick={save}><Save size={13} className="mr-1.5" /> {busy ? "Saving…" : "Save tax rate"}</Button>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DarkCard icon={<RefreshCw size={15} />} title="Live on the pricing page" desc="The “+ GST @ …%” note on every plan card updates the moment you save." />
        <DarkCard icon={<Globe size={15} />} title="One number, everywhere" desc="Pricing display, plan footnotes and future billing math all read this single setting." />
      </div>
    </div>
  );
}

/* -------------------------------- view shell -------------------------------- */

export function WebsiteView({ canOperate }: { canOperate: boolean }) {
  const [tab, setTab] = useState("pages");
  const [mediaVersion, setMediaVersion] = useState(0);
  const media = useApiData<{ media: { id: string; filename: string }[] }>(mediaVersion >= 0 ? "/api/cms/media" : null);

  const TABS = [
    { key: "pages", label: "Pages", icon: <FileText size={13} /> },
    { key: "blog", label: "Blog", icon: <Newspaper size={13} /> },
    { key: "faqs", label: "FAQs", icon: <HelpCircle size={13} /> },
    { key: "testimonials", label: "Testimonials", icon: <Quote size={13} /> },
    { key: "media", label: "Media", icon: <Palette size={13} /> },
    { key: "banner", label: "Banner", icon: <Megaphone size={13} /> },
    { key: "contact", label: "Contact", icon: <Phone size={13} /> },
    { key: "tax", label: "Tax", icon: <IndianRupee size={13} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-brand p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">Marketing website CMS</h3>
            <p className="mt-0.5 text-[12px] text-white/40">Every word, article, FAQ, testimonial and image on sensiblee.in — editable here, live instantly.</p>
          </div>
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">13 pages managed</Badge>
        </div>
        <div className="mt-4"><TabsBar tabs={TABS} active={tab} onPick={setTab} /></div>
      </div>

      {!canOperate && (
        <p className="rounded-xl bg-brand-deep/50 px-3.5 py-3 text-[12px] text-white/40">Read-only access — observers can review content but not change it.</p>
      )}

      {tab === "pages" && <PagesTab canEdit={canOperate} />}
      {tab === "blog" && <PostsTab canEdit={canOperate} media={media.data?.media || []} />}
      {tab === "faqs" && <FaqsTab canEdit={canOperate} />}
      {tab === "testimonials" && <TestimonialsTab canEdit={canOperate} media={media.data?.media || []} />}
      {tab === "media" && <MediaTab canEdit={canOperate} onChanged={() => setMediaVersion((v) => v + 1)} />}
      {tab === "banner" && <BannerTab canEdit={canOperate} />}
      {tab === "contact" && <ContactTab canEdit={canOperate} />}
      {tab === "tax" && <TaxTab canEdit={canOperate} />}
    </div>
  );
}
