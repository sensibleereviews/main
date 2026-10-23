import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";

// Admin → Audit log: immutable trail of admin actions, logins, impersonation
// events, permission/config changes and customer-data access. CSV-exportable.
export async function GET(req: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const action = url.searchParams.get("action") || "";
    const format = url.searchParams.get("format");

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { tenant: { select: { name: true } } },
    });

    const rows = logs.map((l) => ({
      id: l.id,
      at: new Date(l.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      ts: new Date(l.createdAt).toISOString(),
      actor: l.actor,
      tenant: l.tenant?.name || "—",
      action: l.action,
      detail: l.detail || "",
    }));

    // categorise for the filter chips
    const categoryOf = (a: string) =>
      a.startsWith("auth.") ? "auth" : a.startsWith("tenant.") ? "clients" : a.startsWith("issue.") ? "issues" : a.includes("impersonat") ? "support" : a.startsWith("plan.") || a.includes("config") || a.includes("flag") ? "config" : "other";

    let filtered = rows;
    if (q) filtered = filtered.filter((r) => `${r.actor} ${r.tenant} ${r.action} ${r.detail}`.toLowerCase().includes(q));
    if (action) filtered = filtered.filter((r) => categoryOf(r.action) === action);

    if (format === "csv") {
      const header = "timestamp,actor,tenant,action,detail";
      const csv = [header, ...filtered.map((r) => [r.ts, r.actor, r.tenant, r.action, `"${r.detail.replace(/"/g, '""')}"`].join(","))].join("\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="sensiblee-audit-${new Date().toISOString().slice(0, 10)}.csv"` },
      });
    }

    const counts = {
      auth: rows.filter((r) => categoryOf(r.action) === "auth").length,
      clients: rows.filter((r) => categoryOf(r.action) === "clients").length,
      support: rows.filter((r) => categoryOf(r.action) === "support").length,
      config: rows.filter((r) => categoryOf(r.action) === "config").length,
      issues: rows.filter((r) => categoryOf(r.action) === "issues").length,
    };

    return NextResponse.json({ rows: filtered.slice(0, 200), counts, total: rows.length });
  } catch (err) {
    return handleError(err);
  }
}
