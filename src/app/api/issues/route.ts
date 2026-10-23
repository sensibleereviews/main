import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { fetchTenantReviews } from "@/lib/analytics";
import { categoryForKeywords, safeKws, CATEGORY_LABELS, peakWindowLabel, revenueRiskFor, computeHealthScore } from "@/lib/health-score";
import { getScopedLocationIds } from "@/lib/tenant-scope";

// Playbook recommended actions per issue category (doc §6 example:
// "Recommended action: Increase evening front-desk staffing from 6–9 PM.")
const PLAYBOOK: Record<string, string> = {
  waiting: "Increase evening front-desk staffing from 6–9 PM and stagger kitchen handoff during peak hours.",
  staff: "Run a 20-minute service refresher with the floor team and add a pre-shift briefing for the next two weeks.",
  order: "Introduce a handover checklist — items, packaging, seal — verified before every dispatch.",
  billing: "Audit this week's bills against the POS menu and retrain staff on price changes.",
  cleanliness: "Schedule a deep-clean this week and add hourly lobby checks during peak hours.",
  other: "Review the raw feedback with the branch manager and agree a corrective step.",
};

type Cluster = { tenantId: string; locationId: string | null; category: string; mentions: number; prevMentions: number; lastSeen: Date };

// Reputation Action Center — GET issues (auto-detecting clusters from negative
// review themes when missing), POST assignment / status updates.
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const tenantId = sess.tenantId!;
    const scopedIds = await getScopedLocationIds(sess);
    const [reviews, locations] = await Promise.all([
      fetchTenantReviews(tenantId, scopedIds),
      db.location.findMany({
        where: {
          tenantId,
          ...(scopedIds ? { id: { in: scopedIds } } : {}),
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ---- auto-detect: cluster negative reviews (60d) by category × location
    const now = Date.now();
    const clusters = new Map<string, Cluster>();
    for (const r of reviews) {
      const t = new Date(r.createdAt).getTime();
      if (t < now - 60 * 86_400_000) continue;
      if (r.stars > 2 && r.sentiment !== "negative") continue;
      const cat = categoryForKeywords(safeKws(r.keywords), r.text);
      if (cat === "other") continue; // only actionable themes become issues
      const key = `${cat}:${r.locationId}`;
      const c = clusters.get(key) || { tenantId, locationId: r.locationId, category: cat, mentions: 0, prevMentions: 0, lastSeen: new Date(t) };
      if (t >= now - 30 * 86_400_000) c.mentions += 1;
      else c.prevMentions += 1;
      if (t > c.lastSeen.getTime()) c.lastSeen = new Date(t);
      clusters.set(key, c);
    }

    for (const c of clusters.values()) {
      const existing = await db.issue.findFirst({
        where: { tenantId, category: c.category, locationId: c.locationId, status: { not: "resolved" } },
      });
      if (existing) {
        await db.issue.update({ where: { id: existing.id }, data: { mentions: c.mentions, prevMentions: c.prevMentions } });
      } else {
        const loc = locations.find((l) => l.id === c.locationId);
        const trendPct = c.prevMentions ? Math.round(((c.mentions - c.prevMentions) / c.prevMentions) * 100) : c.mentions > 0 ? 100 : 0;
        const severity = c.mentions >= 10 || trendPct >= 40 ? "high" : c.mentions >= 5 ? "medium" : "low";
        await db.issue.create({
          data: {
            tenantId,
            locationId: c.locationId,
            title: `${CATEGORY_LABELS[c.category]} complaints${loc ? ` — ${loc.name.replace(/^Spice Route\s+/, "")}` : ""}`,
            category: c.category,
            severity,
            mentions: c.mentions,
            prevMentions: c.prevMentions,
            openedMentions: c.mentions, // "before" snapshot for the outcome strip
            firstDetected: c.lastSeen,
            recommendedAction: PLAYBOOK[c.category] || PLAYBOOK.other,
          },
        });
      }
    }

    const issues = await db.issue.findMany({
      where: {
        tenantId,
        ...(scopedIds ? { locationId: { in: scopedIds } } : {}),
      },
      include: { location: true },
      orderBy: [{ status: "asc" }, { mentions: "desc" }],
    });

    // Reputation Alert fields (doc: "Most affected: 6–9 PM · Employees mentioned: 8 · Revenue risk: High")
    // computed from the underlying negative reviews per category × location cluster
    const STAFF_RE = /\b(Amit|Priya|Rahul|Vikram|Sneha|Arjun|Anand|Meera|Rohit|Lakshmi|Manoj|Kavya|Deepak|Pooja|Rajesh|Sunil|Anita|Farah)\b/;
    const totalNeg = reviews.filter((r) => r.stars <= 2 || r.sentiment === "negative").length;

    return NextResponse.json({
      issues: issues.map((i) => {
        const clusterReviews = reviews.filter((r) => {
          if (r.locationId !== i.locationId) return false;
          if (r.stars <= 2 || r.sentiment === "negative") return categoryForKeywords(safeKws(r.keywords), r.text) === i.category;
          return false;
        });
        const trendPct = i.prevMentions ? Math.round(((i.mentions - i.prevMentions) / i.prevMentions) * 100) : i.mentions > 0 ? 100 : 0;
        const share = totalNeg ? Math.round((i.mentions / totalNeg) * 100) : 0;
        const overdue = i.status !== "resolved" && i.dueDate && new Date(i.dueDate).getTime() < Date.now();
        return {
          id: i.id,
          title: i.title,
          category: i.category,
          categoryLabel: CATEGORY_LABELS[i.category] || i.category,
          severity: i.severity,
          location: i.location?.name || "All locations",
          mentions: i.mentions,
          prevMentions: i.prevMentions,
          trendPct,
          firstDetected: i.firstDetected,
          owner: i.owner,
          status: i.status,
          dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null,
          overdue: !!overdue,
          escalated: i.escalated,
          recommendedAction: i.recommendedAction,
          resolvedNote: i.resolvedNote,
          resolvedAt: i.resolvedAt,
          // resolved outcome snapshot ("two weeks later: 42 → 17 · 62 → 78 · 3.9 → 4.3")
          openedMentions: i.openedMentions,
          resolvedMentions: i.resolvedMentions,
          resolvedHealth: i.resolvedHealth,
          resolvedRating: i.resolvedRating,
          // Reputation Alert spec fields
          peakWindow: peakWindowLabel(clusterReviews),
          employeesMentioned: new Set(clusterReviews.map((r) => `${r.text} ${safeKws(r.keywords).join(" ")}`).flatMap((t) => (t.match(STAFF_RE) || []))).size,
          revenueRisk: revenueRiskFor(i.mentions, trendPct, share),
        };
      }),
    });
  } catch (err) {
    return handleError(err);
  }
}

// Assign an owner / move status (open → in_progress → resolved).
// Resolving snapshots the "two weeks later" outcome: mentions now, Health Score
// and average rating — so the card can show 42 → 17 · 62 → 78 · 3.9 → 4.3.
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("reviews_reply");
    const body = await readJson<{ id?: string; status?: string; owner?: string; resolvedNote?: string; dueDate?: string; escalate?: boolean }>(req);
    if (!body.id) return fail(400, "Issue id required");
    const issue = await db.issue.findUnique({ where: { id: body.id } });
    if (!issue || issue.tenantId !== sess.tenantId) return fail(404, "Issue not found");

    const data: { status?: string; owner?: string; resolvedNote?: string; resolvedAt?: Date; resolvedMentions?: number; resolvedHealth?: number; resolvedRating?: number; dueDate?: Date | null; escalated?: boolean; severity?: string } = {};

    // Set / clear a due date (doc §H "Set priority and due date")
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    // Escalate — raise severity to high and flag for the admin oversight board
    if (body.escalate) {
      data.severity = "high";
      data.escalated = true;
    }
    if (body.status && ["open", "in_progress", "resolved"].includes(body.status)) {
      data.status = body.status;
      if (body.status === "resolved") {
        data.resolvedAt = new Date();
        data.resolvedNote = body.resolvedNote || "Closed after the recommended action was applied.";
        // outcome snapshot — current reputation metrics at resolve time
        const [reviews, locations] = await Promise.all([
          fetchTenantReviews(sess.tenantId!),
          db.location.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "asc" } }),
        ]);
        const health = computeHealthScore(reviews, locations, "v2");
        data.resolvedMentions = issue.mentions;
        data.resolvedHealth = health.score;
        data.resolvedRating = health.rating30;
      }
    }
    if (body.owner) data.owner = body.owner;

    const updated = await db.issue.update({ where: { id: body.id }, data, include: { location: true } });
    await db.activityLog.create({
      data: {
        tenantId: sess.tenantId!,
        actor: sess.name,
        action: body.status === "resolved" ? "issue.resolved" : "issue.updated",
        detail: `${updated.title} · ${data.status || updated.status}${data.owner ? ` · owner ${data.owner}` : ""}`,
      },
    });
    return NextResponse.json({ ok: true, issue: { id: updated.id, status: updated.status, owner: updated.owner } });
  } catch (err) {
    return handleError(err);
  }
}
