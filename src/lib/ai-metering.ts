import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";

// AI metering — every billable AI operation lands in AiUsageEvent; quota comes from the
// tenant's plan (plan.aiDrafts, e.g. "50 / month" | "Unlimited · fair use"). Over quota = 429.

export type AiKind = "draft" | "classify";

function parseMonthlyLimit(aiDrafts: string | undefined | null): number | null {
  if (!aiDrafts) return 50;
  if (/unlimited/i.test(aiDrafts)) return null; // fair-use only
  const m = aiDrafts.match(/([\d,]+)\s*\/\s*month/i) || aiDrafts.match(/^([\d,]+)$/);
  if (!m) return 50;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 50;
}

export function quotaLabel(aiDrafts: string | undefined | null): string {
  return aiDrafts || "50 / month";
}

function monthWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function recordAiUsage(tenantId: string, kind: AiKind, model: string, tokens: number): Promise<void> {
  await db.aiUsageEvent.create({ data: { tenantId, kind, model, tokens: Math.max(0, Math.round(tokens)) } });
}

export async function monthlyAiUsage(tenantId: string, now = new Date()): Promise<{
  month: string;
  events: number;
  tokens: number;
  byKind: { kind: string; events: number; tokens: number }[];
  daily: { day: string; events: number; tokens: number }[];
}> {
  const { start, end } = monthWindow(now);
  const events = await db.aiUsageEvent.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
  });
  const byKindMap = new Map<string, { events: number; tokens: number }>();
  const dayMap = new Map<string, { events: number; tokens: number }>();
  for (const e of events) {
    const k = byKindMap.get(e.kind) || { events: 0, tokens: 0 };
    k.events++; k.tokens += e.tokens;
    byKindMap.set(e.kind, k);
    const day = e.createdAt.toISOString().slice(0, 10);
    const d = dayMap.get(day) || { events: 0, tokens: 0 };
    d.events++; d.tokens += e.tokens;
    dayMap.set(day, d);
  }
  return {
    month: start.toISOString().slice(0, 7),
    events: events.length,
    tokens: events.reduce((a, e) => a + e.tokens, 0),
    byKind: [...byKindMap.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.events - a.events),
    daily: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, ...v })),
  };
}

// Throws ApiError(429) when the tenant has consumed the plan's monthly AI allowance
export async function assertAiQuota(tenantId: string): Promise<{ used: number; limit: number | null }> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  const limit = parseMonthlyLimit(tenant?.plan.aiDrafts);
  if (limit === null) return { used: 0, limit: null };
  const { start, end } = monthWindow();
  const used = await db.aiUsageEvent.count({
    where: { tenantId, kind: "draft", createdAt: { gte: start, lt: end } },
  });
  if (used >= limit) {
    throw new ApiError(429, `Monthly AI draft quota reached (${used} of ${limit}). Upgrade your plan or add an AI credit pack to continue.`);
  }
  return { used, limit };
}

export async function aiUsageWithQuota(tenantId: string): Promise<{
  usage: Awaited<ReturnType<typeof monthlyAiUsage>>;
  limit: number | null;
  limitLabel: string;
  usedDrafts: number;
  percent: number | null;
  blocked: boolean;
}> {
  const [tenant, usage] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } }),
    monthlyAiUsage(tenantId),
  ]);
  const limit = parseMonthlyLimit(tenant?.plan.aiDrafts);
  const usedDrafts = usage.byKind.find((k) => k.kind === "draft")?.events ?? 0;
  return {
    usage,
    limit,
    limitLabel: quotaLabel(tenant?.plan.aiDrafts),
    usedDrafts,
    percent: limit === null ? null : Math.min(100, Math.round((usedDrafts / limit) * 100)),
    blocked: limit !== null && usedDrafts >= limit,
  };
}
