// Server-side view-model mappers: Prisma rows → shapes the UI components consume
import { Review, Location, Campaign, AiDraft, Tenant, Invoice, User } from "@prisma/client";

export type ReviewVM = {
  id: string;
  author: string;
  initials: string;
  stars: number;
  location: string; // short area label e.g. "Koramangala"
  locationId: string;
  time: string; // relative
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  status: "replied" | "ai-draft" | "awaiting" | "failed";
  reply?: string;
  draft?: string;
  draftId?: string;
  confidence?: number; // 0..1
  urgent?: boolean;
  internalNote?: string | null;
  source: string;
  googleUrl?: string | null;
  createdAt: string;
  sensitive?: string; // reason when flagged for human handling (doc §1D)
  replyError?: string; // provider publish error (doc §1D failed replies)
};

export type LocationVM = {
  id: string;
  code: string;
  name: string;
  area: string;
  rating: number;
  reviews: number;
  delta: number;
  syncState: "live" | "syncing" | "attention";
  lastSync: string;
  responseRate: number;
  avgResponse: string;
  health: { label: string; score: number }[];
  contactBookSize: number;
  googleReviewUrl: string | null;
};

export function toLocationVM(l: Location): LocationVM {
  const mins = l.lastSyncAt
    ? Math.floor((Date.now() - new Date(l.lastSyncAt).getTime()) / 60000)
    : null;
  const syncState: LocationVM["syncState"] =
    mins === null ? "attention" : mins <= 20 ? "live" : mins <= 45 ? "syncing" : "attention";
  return {
    id: l.id,
    code: l.code,
    name: l.name,
    area: l.area,
    rating: l.rating,
    reviews: l.reviewCount,
    delta: l.ratingDelta,
    syncState,
    lastSync: l.lastSyncAt ? relTime(l.lastSyncAt) : "never",
    responseRate: l.responseRate,
    avgResponse: minsToHuman(l.avgResponseMins),
    health: safeJson<{ label: string; score: number }[]>(l.health, []),
    contactBookSize: l.contactBookSize,
    googleReviewUrl: l.googleReviewUrl,
  };
}

export function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function relTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function shortArea(locationName: string): string {
  return locationName.replace(/^Spice Route\s+/, "").replace(/^Lumiere\s+/, "").trim() || locationName;
}

export function minsToHuman(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function toReviewVM(
  r: Review & { location: Location; drafts?: AiDraft[] },
  viewerTone?: string
): ReviewVM {
  const pending = r.drafts?.find((d) => d.status === "pending");
  const status: ReviewVM["status"] =
    r.status === "replied" ? "replied" : r.status === "failed" ? "failed" : pending ? "ai-draft" : "awaiting";
  const hoursOld = (Date.now() - new Date(r.createdAt).getTime()) / 3600_000;
  return {
    id: r.id,
    author: r.author,
    initials: initialsOf(r.author),
    stars: r.stars,
    location: shortArea(r.location.name),
    locationId: r.locationId,
    time: relTime(r.createdAt),
    text: r.text,
    sentiment: r.sentiment as ReviewVM["sentiment"],
    keywords: safeJson<string[]>(r.keywords, []),
    status,
    reply: r.replyText || undefined,
    draft: pending?.body,
    draftId: pending?.id,
    confidence: pending?.confidence ?? undefined,
    urgent: (r.status === "awaiting" && hoursOld > 20) || (status === "ai-draft" && r.stars <= 2),
    internalNote: r.internalNote,
    source: r.source,
    googleUrl: r.location.googleReviewUrl,
    createdAt: new Date(r.createdAt).toISOString(),
    // sensitive-review flag (doc §1D) + failed-publish error (§1D lifecycle)
    sensitive: r.sensitive ? r.sensitiveReason || "Sensitive content" : undefined,
    replyError: r.replyError || undefined,
  };
}

export type CampaignVM = {
  id: string;
  name: string;
  channel: "WhatsApp" | "QR";
  location: string;
  status: "running" | "scheduled" | "completed" | "draft";
  sent: number;
  opened: number;
  reviews: number;
  date: string;
};

export function toCampaignVM(c: Campaign & { location?: Location | null }): CampaignVM {
  return {
    id: c.id,
    name: c.name,
    channel: c.channel === "qr" ? "QR" : "WhatsApp",
    location: c.location ? shortArea(c.location.name) : "All locations",
    status: c.status as CampaignVM["status"],
    sent: c.sent,
    opened: c.opened,
    reviews: c.reviewsGenerated,
    date: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  };
}

export type LocationDetailVM = LocationVM & {
  syncLog: { t: string; state: "ok" | "warn" | "error"; msg: string }[];
  recentReviews: ReviewVM[];
};

export type TenantVM = {
  id: string;
  business: string;
  owner: string;
  plan: string;
  locations: number;
  mrr: number;
  reviews: number;
  status: "active" | "trial" | "past_due" | "suspended";
  since: string;
};

export function toTenantVM(
  t: Tenant & { _count?: { locations: number; reviews: number }; plan?: { name: string } }
): TenantVM {
  return {
    id: t.id,
    business: t.name,
    owner: t.contactName,
    plan: t.plan?.name || "—",
    locations: t._count?.locations ?? 0,
    mrr: t.mrrInr,
    reviews: t._count?.reviews ?? 0,
    status: t.status as TenantVM["status"],
    since: new Date(t.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
  };
}

export type InvoiceVM = {
  id: string;
  number: string;
  tenant: string;
  tenantId: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  dueAt: string;
  remindersSent: number;
};

export function toInvoiceVM(i: Invoice & { tenant?: Tenant }): InvoiceVM {
  return {
    id: i.id,
    number: i.number,
    tenant: i.tenant?.name || "—",
    tenantId: i.tenantId,
    amount: i.amountInr,
    method: i.method,
    status: i.status,
    date: new Date(i.periodStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    dueAt: new Date(i.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    remindersSent: i.remindersSent,
  };
}

export function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
