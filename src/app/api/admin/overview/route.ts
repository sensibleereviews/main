import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { toTenantVM, toInvoiceVM } from "@/lib/viewmodels";

// Platform overview — MRR, collections watchlist, AI cost, demo pipeline
export async function GET() {
  try {
    await requirePlatformAdmin();
    const [tenants, reviews, campaigns, drafts, invoices, demoRequests, syncStates, locationsAgg, failedSyncs24h, overdueIssues] = await Promise.all([
      db.tenant.findMany({ include: { plan: true, _count: { select: { locations: true, reviews: true } } } }),
      db.review.count(),
      db.campaign.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
      db.aiDraft.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
      db.invoice.findMany({ orderBy: { periodStart: "asc" }, include: { tenant: true } }),
      db.demoRequest.findMany({ orderBy: { createdAt: "desc" } }),
      db.location.groupBy({ by: ["lastSyncAt"], _count: true }),
      db.location.aggregate({ _count: true, _max: { lastSyncAt: true } }),
      db.syncLog.count({ where: { state: "error", createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
      db.issue.count({ where: { status: { not: "resolved" }, severity: "high" } }),
    ]);

    const billable = tenants.filter((t) => t.status === "active" || t.status === "past_due");
    const mrr = billable.reduce((a, t) => a + t.mrrInr, 0);
    const totalLocations = locationsAgg._count;
    const syncedLocations = syncStates.filter((s) => s.lastSyncAt !== null).reduce((a, s) => a + s._count, 0);

    // MRR series (₹ lakh) — settled invoices by month, last 6 months
    const series: { m: string; mrr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(); start.setMonth(start.getMonth() - i, 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      const paid = invoices.filter((inv) => inv.status === "paid" && inv.paidAt && inv.paidAt >= start && inv.paidAt < end);
      const sum = paid.reduce((a, inv) => a + inv.amountInr, 0);
      series.push({ m: start.toLocaleDateString("en-IN", { month: "short" }), mrr: Number((sum / 100000).toFixed(2)) });
    }
    if (series.every((p) => p.mrr === 0)) series[series.length - 1] = { m: series[series.length - 1].m, mrr: Number((mrr / 100000).toFixed(2)) };

    const tokens = drafts.reduce((a, d) => a + d.tokens, 0);
    const costInr = Math.round(tokens * 0.00023); // documented estimate: ₹0.23 / 1k tokens
    const waMessages = campaigns.reduce((a, c) => a + c.sent, 0);

    return NextResponse.json({
      kpis: {
        mrr: `₹${(mrr / 100000).toFixed(2)}L`,
        mrrRaw: mrr,
        tenants: tenants.length,
        active: tenants.filter((t) => t.status === "active").length,
        trial: tenants.filter((t) => t.status === "trial").length,
        suspended: tenants.filter((t) => t.status === "suspended").length,
        locations: totalLocations,
        reviewsProcessed: reviews.toLocaleString("en-IN"),
        waMessages: waMessages.toLocaleString("en-IN"),
      },
      // doc §2A: Google integration health + review sync status + critical alerts
      syncStatus: {
        total: totalLocations,
        synced: syncedLocations,
        pending: totalLocations - syncedLocations,
        lastSyncAt: locationsAgg._max.lastSyncAt ? new Date(locationsAgg._max.lastSyncAt).toISOString() : null,
        failed24h: failedSyncs24h,
      },
      criticalAlerts: [
        ...(overdueIssues > 0 ? [{ id: "issues", label: `${overdueIssues} unresolved high-severity issues`, href: "issues" }] : []),
        ...(failedSyncs24h > 0 ? [{ id: "sync", label: `${failedSyncs24h} failed Google syncs (24h)`, href: "integrations" }] : []),
        ...(invoices.filter((i) => i.status === "overdue").length > 0 ? [{ id: "billing", label: `${invoices.filter((i) => i.status === "overdue").length} overdue invoices`, href: "billing" }] : []),
      ],
      mrrSeries: series,
      watchlist: {
        due: tenants.filter((t) => t.status === "past_due").map(toTenantVM),
        trials: tenants.filter((t) => t.status === "trial").map((t) => ({
          ...toTenantVM(t),
          trialEndsIn: t.trialEndsAt ? Math.max(0, Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400_000)) : null,
        })),
      },
      aiUsage: {
        tokens, drafts: drafts.length, costInr, budgetInr: 15000,
      },
      topTenants: [...tenants].sort((a, b) => b._count.reviews - a._count.reviews).slice(0, 4).map(toTenantVM),
      payments: invoices.slice(-6).reverse().map(toInvoiceVM),
      demoRequests: {
        newCount: demoRequests.filter((d) => d.status === "new").length,
        items: demoRequests.slice(0, 5).map((d) => ({
          id: d.id, name: d.name, company: d.company, email: d.email,
          outlets: d.outlets, status: d.status,
          date: new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        })),
      },
      tenantsAll: tenants.map(toTenantVM),
    });
  } catch (err) {
    return handleError(err);
  }
}
