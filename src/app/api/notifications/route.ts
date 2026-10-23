import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { computeHealthScore, type HealthWeights } from "@/lib/health-score";
import { platformConfig } from "@/lib/platform-config";
import { fetchTenantReviews } from "@/lib/analytics";

// In-app notification feed — computed live from real workspace data:
// negative unanswered reviews, 24h-SLA breaches, health-score drops,
// overdue issues and fresh reviews. Read-state is kept client-side.
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const tenantId = sess.tenantId!;
    const dayAgo = new Date(Date.now() - 86_400_000);

    const [reviews, issues, locations] = await Promise.all([
      db.review.findMany({
        where: { tenantId },
        include: { location: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.issue.findMany({ where: { tenantId, status: { not: "resolved" } }, include: { location: { select: { name: true } } } }),
      db.location.findMany({ where: { tenantId }, select: { name: true, lastSyncAt: true } }),
    ]);

    type Notif = { id: string; kind: string; severity: "high" | "warn" | "info"; title: string; body: string; at: string; href: string };
    const items: Notif[] = [];

    // negative unanswered — highest priority
    for (const r of reviews.filter((x) => (x.stars <= 2 || x.sentiment === "negative") && x.status !== "replied" && !x.replyText).slice(0, 5)) {
      items.push({
        id: `neg-${r.id}`, kind: "negative", severity: "high",
        title: `${r.stars}★ review unanswered — ${r.location.name}`,
        body: (r.text || "No text provided").slice(0, 90),
        at: new Date(r.createdAt).toISOString(), href: "reviews",
      });
    }

    // 24h SLA breaches
    const stale = reviews.filter((x) => x.status !== "replied" && !x.replyText && new Date(x.createdAt) < dayAgo);
    if (stale.length) {
      items.push({
        id: "sla", kind: "sla", severity: "warn",
        title: `${stale.length} review${stale.length === 1 ? "" : "s"} past the 24h reply window`,
        body: `Oldest: ${new Date(stale[stale.length - 1].createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${stale[stale.length - 1].location.name}`,
        at: new Date(stale[stale.length - 1].createdAt).toISOString(), href: "reviews",
      });
    }

    // overdue issues
    for (const i of issues.filter((x) => x.dueDate && new Date(x.dueDate) < new Date()).slice(0, 3)) {
      items.push({
        id: `issue-${i.id}`, kind: "issue", severity: "warn",
        title: `Overdue: ${i.title}`,
        body: `${i.location?.name || "All locations"} · was due ${new Date(i.dueDate!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        at: new Date(i.dueDate!).toISOString(), href: "actions",
      });
    }

    // fresh reviews (24h)
    const fresh = reviews.filter((x) => new Date(x.createdAt) >= dayAgo);
    if (fresh.length) {
      items.push({
        id: "fresh", kind: "review", severity: "info",
        title: `${fresh.length} new review${fresh.length === 1 ? "" : "s"} synced from Google`,
        body: fresh[0].location ? `${fresh[0].location.name} · latest ${fresh[0].stars}★` : "Multiple locations",
        at: new Date(fresh[0].createdAt).toISOString(), href: "reviews",
      });
    }

    // sync staleness
    const neverSynced = locations.filter((l) => !l.lastSyncAt);
    if (neverSynced.length) {
      items.push({
        id: "sync", kind: "sync", severity: "warn",
        title: `${neverSynced.length} location${neverSynced.length === 1 ? "" : "s"} not synced yet`,
        body: neverSynced.map((l) => l.name).join(", ").slice(0, 80),
        at: new Date().toISOString(), href: "locations",
      });
    }

    // sensitive reviews flagged for human handling (doc §1D)
    const flagged = reviews.filter((x) => x.sensitive && x.status !== "replied").slice(0, 3);
    for (const r of flagged) {
      items.push({
        id: `sensitive-${r.id}`, kind: "sensitive", severity: "high",
        title: `Sensitive review needs a human — ${r.location.name}`,
        body: `${r.sensitiveReason || "Sensitive content"} · handle personally, never auto-post`,
        at: new Date(r.createdAt).toISOString(), href: "reviews",
      });
    }

    // health-score change alert (doc §1I) — score vs previous 30-day window
    try {
      const [allReviews, locs, hCfg] = await Promise.all([
        fetchTenantReviews(tenantId),
        db.location.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
        platformConfig.health(),
      ]);
      const weights = (hCfg.customWeights && Object.keys(hCfg.customWeights).length ? hCfg.customWeights : null) as unknown as HealthWeights | null;
      const cur = computeHealthScore(allReviews, locs, hCfg.version, new Date(), { weightsOverride: weights, minReviews: hCfg.minReviews });
      const prev = computeHealthScore(allReviews, locs, hCfg.version, new Date(Date.now() - 30 * 86_400_000), { weightsOverride: weights, minReviews: hCfg.minReviews });
      if (cur.score !== prev.score) {
        const dropped = cur.score < prev.score;
        items.push({
          id: "health-change", kind: "health", severity: dropped && cur.score < prev.score - 3 ? "warn" : "info",
          title: `Health Score ${dropped ? "down" : "up"} ${Math.abs(cur.score - prev.score)} points this month`,
          body: `${prev.score} → ${cur.score} (${cur.band.replace("-", " ")}) · open Overview for the why`,
          at: new Date().toISOString(), href: "overview",
        });
      }
    } catch { /* health alert is best-effort */ }

    const unreadEstimate = items.filter((i) => i.severity !== "info").length;
    return NextResponse.json({ items: items.slice(0, 12), count: unreadEstimate });
  } catch (err) {
    return handleError(err);
  }
}
