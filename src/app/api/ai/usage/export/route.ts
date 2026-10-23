import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError } from "@/lib/api";

// Full per-event AI usage export — Enterprise plan entitlement
// ("AI usage metering: Full metering + exports" on the pricing table)
export async function GET() {
  try {
    const sess = await requireTenantPerm("analytics_view");
    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true } });
    if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (tenant.plan.id !== "multi") {
      return NextResponse.json({ error: "CSV export is available on the Enterprise plan.", upgrade: true }, { status: 403 });
    }

    const events = await db.aiUsageEvent.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" }, take: 5000 });
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "timestamp,kind,actor,model,tokens_in,tokens_out,tokens";
    const lines = events.map((e) => [e.createdAt.toISOString(), e.kind, e.actor, e.model, e.tokensIn, e.tokensOut, e.tokens].map(esc).join(","));
    const csv = [header, ...lines].join("\n");
    const slug = tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sensiblee-ai-usage-${slug}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
