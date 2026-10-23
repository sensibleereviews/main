import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { platformConfig, INTEGRATIONS_DEFAULTS } from "@/lib/platform-config";

// Admin → Integrations: Google Business Profile + WhatsApp Business administration.
// GET  — connection/sync monitor, reply-publishing funnel, WA delivery + costs
// PATCH— provider configuration (sync cadence, WA provider/limits/quiet hours)
// POST — operational actions: retry a failed location sync
export async function GET() {
  try {
    await requirePlatformAdmin();
    const cfg = await platformConfig.integrations();

    const [locations, syncLogs, drafts, campaigns, optOuts, tenants] = await Promise.all([
      db.location.findMany({ include: { tenant: { select: { name: true, status: true } }, syncLogs: { orderBy: { createdAt: "desc" }, take: 3 } } }),
      db.syncLog.findMany({ where: { state: { in: ["warn", "error"] } }, orderBy: { createdAt: "desc" }, take: 12, include: { location: { include: { tenant: { select: { name: true } } } } } }),
      db.aiDraft.findMany({ select: { status: true, createdAt: true } }),
      db.campaign.findMany({ include: { tenant: { select: { name: true, planId: true } }, location: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
      db.waOptOut.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { tenant: { select: { name: true } } } }),
      db.tenant.findMany({ select: { id: true, name: true, plan: { select: { waQuota: true } }, _count: { select: { campaigns: true } } } }),
    ]);

    // ---- Google: connection monitor per location --------------------------
    // OAuth lifecycle (doc §2E "Identify expired or revoked authorization"):
    // status derives from the newest sync log + sync freshness.
    const STALE_MS = 24 * 86_400_000;
    const EXPIRED_MS = 7 * 86_400_000;
    const connections = locations.map((l) => {
      const lastErr = l.syncLogs.find((s) => s.state === "error") || null;
      const stale = !l.lastSyncAt || Date.now() - new Date(l.lastSyncAt).getTime() > STALE_MS;
      const expired = l.lastSyncAt && Date.now() - new Date(l.lastSyncAt).getTime() > EXPIRED_MS;
      const errMsg = lastErr?.message || "";
      let status: string;
      if (lastErr && /token|auth|permission|revoked|401|403/i.test(errMsg)) status = "revoked";
      else if (expired) status = "expired";
      else if (stale) status = l.lastSyncAt ? "stale" : "pending";
      else if (lastErr) status = "error";
      else status = "connected";
      return {
        id: l.id,
        tenant: l.tenant.name,
        name: l.name,
        area: l.area,
        placeId: l.googlePlaceId,
        lastSyncAt: l.lastSyncAt ? new Date(l.lastSyncAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null,
        syncCount: l.syncCount,
        reviews: l.reviewCount,
        status,
        statusLabel: status === "revoked" ? "Authorization revoked" : status === "expired" ? "Token expired — reconnect" : status === "stale" ? "Stale — sync overdue" : status === "pending" ? "Pending first sync" : status === "error" ? "Sync error" : "Connected",
        lastError: lastErr?.message || null,
      };
    });

    // OAuth/account rollup per tenant
    const accounts = [...new Set(locations.map((l) => l.tenant.name))].map((name) => {
      const locs = connections.filter((c) => c.tenant === name);
      return {
        tenant: name,
        locations: locs.length,
        connected: locs.filter((c) => c.status === "connected").length,
        issues: locs.filter((c) => c.status !== "connected").length,
      };
    });

    // Reply publishing funnel (approve-before-publish compliance)
    const now30 = new Date(Date.now() - 30 * 86_400_000);
    const recent = drafts.filter((d) => d.createdAt >= now30);
    const replyStats = {
      pending: recent.filter((d) => d.status === "pending").length,
      published: recent.filter((d) => d.status === "approved").length,
      edited: recent.filter((d) => d.status === "superseded").length,
      total: recent.length,
    };

    // ---- WhatsApp: delivery monitor + per-tenant usage/cost ---------------
    const waPerTenant = tenants.map((t) => {
      const cs = campaigns.filter((c) => c.tenant.name === t.name);
      const sent = cs.reduce((a, c) => a + c.sent, 0);
      const recipients = cs.reduce((a, c) => a + c.recipients, 0);
      const optedOut = optOuts.filter((o) => o.tenant.name === t.name).length;
      // Meta utility-template pricing benchmark: ₹0.35 per delivered message
      const costInr = Math.round(sent * 0.35);
      const usagePct = t.plan.waQuota ? Math.round((sent / t.plan.waQuota) * 100) : 0;
      return {
        tenant: t.name,
        quota: t.plan.waQuota,
        sent,
        failed: Math.max(0, recipients - sent),
        reviewsGenerated: cs.reduce((a, c) => a + c.reviewsGenerated, 0),
        optOuts: optedOut,
        costInr,
        campaigns: cs.length,
        usagePct,
        // usage alert (doc §2G "Configure usage alerts") — amber ≥85%, red ≥100%
        alert: usagePct >= 100 ? "exceeded" : usagePct >= 85 ? "warning" : null,
      };
    });

    const waTotals = {
      sent: waPerTenant.reduce((a, t) => a + t.sent, 0),
      failed: waPerTenant.reduce((a, t) => a + t.failed, 0),
      reviewsGenerated: waPerTenant.reduce((a, t) => a + t.reviewsGenerated, 0),
      costInr: waPerTenant.reduce((a, t) => a + t.costInr, 0),
      optOuts: optOuts.length,
    };

    const templates = [...new Set(campaigns.map((c) => c.template).filter(Boolean))].map((t) => ({
      name: t as string,
      uses: campaigns.filter((c) => c.template === t).length,
      status: "approved", // HSM templates only send after Meta approval — simulated until live creds
    }));

    // Quota utilization (doc §2E "Monitor quotas and rate limits") — actual 24h
    // sync-call volume vs the theoretical cadence capacity across all locations.
    const cadenceMins = Math.max(5, cfg.google.syncCadenceMins);
    const dailyCapacity = Math.max(1, locations.length * Math.floor((24 * 60) / cadenceMins));
    const syncs24h = await db.syncLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    const usedPct = Math.min(100, Math.round((syncs24h / dailyCapacity) * 100));

    return NextResponse.json({
      config: cfg,
      google: {
        accounts,
        connections,
        syncIssues: syncLogs.map((s) => ({
          id: s.id, tenant: s.location.tenant.name, location: s.location.name,
          state: s.state, message: s.message,
          at: new Date(s.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        })),
        replyStats: { ...replyStats, failed: await db.review.count({ where: { status: "failed", createdAt: { gte: now30 } } }) },
        quota: { cadenceMins, quotaAlertPct: cfg.google.quotaDailyPct, usedPct, syncs24h, dailyCapacity },
      },
      whatsapp: {
        config: cfg.whatsapp,
        totals: waTotals,
        perTenant: waPerTenant,
        templates,
        optOuts: optOuts.map((o) => ({
          id: o.id, tenant: o.tenant.name, phone: o.phone, reason: o.reason,
          note: o.note, at: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        })),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Save provider configuration
export async function PATCH(req: Request) {
  try {
    await requirePlatformAdmin();
    const body = await readJson<{
      google?: { syncCadenceMins?: number; quotaDailyPct?: number };
      whatsapp?: {
        provider?: string;
        phoneId?: string;
        wabaId?: string;
        token?: string;
        webhookVerifyToken?: string;
        dailyLimit?: number;
        quietStart?: number;
        quietEnd?: number;
        paused?: boolean;
      };
    }>(req);
    const cfg = await platformConfig.integrations();
    const next: typeof INTEGRATIONS_DEFAULTS = {
      google: { ...cfg.google, ...(body.google || {}) },
      whatsapp: { ...cfg.whatsapp, ...(body.whatsapp || {}) },
    };
    await platformConfig.saveIntegrations(next);
    if (body.whatsapp?.paused !== undefined) {
      await db.systemEvent.create({
        data: { type: "signal", name: body.whatsapp.paused ? "WhatsApp outbound paused" : "WhatsApp outbound resumed", state: body.whatsapp.paused ? "warn" : "ok", detail: "Platform-wide pause from admin → Integrations." },
      });
    }
    return NextResponse.json({ config: next });
  } catch (err) {
    return handleError(err);
  }
}

// Operational actions — retry a location sync
export async function POST(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const body = await readJson<{ action: "retry-sync"; locationId: string }>(req);
    if (body.action !== "retry-sync" || !body.locationId) return fail(400, "action and locationId required");
    const loc = await db.location.findUnique({ where: { id: body.locationId } });
    if (!loc) return fail(404, "Location not found");
    const newReviews = Math.floor(Math.random() * 3); // simulated pull until live API creds
    await db.syncLog.create({ data: { locationId: loc.id, state: "ok", message: `Manual retry by ${admin.email} — pull succeeded`, newReviews, latencyMs: 380 + Math.floor(Math.random() * 300) } });
    await db.location.update({ where: { id: loc.id }, data: { lastSyncAt: new Date(), syncCount: { increment: 1 }, reviewCount: { increment: newReviews } } });
    await db.systemEvent.create({ data: { type: "job", name: "google-sync retry", state: "ok", detail: `${loc.name} — ${newReviews} new reviews` } });
    return NextResponse.json({ ok: true, newReviews });
  } catch (err) {
    return handleError(err);
  }
}
