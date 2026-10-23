import { NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { aiUsageWithQuota } from "@/lib/ai-metering";
import { db } from "@/lib/db";

// AI usage metering for the tenant — month totals, per-kind split, daily trend, quota.
// ?format=csv downloads the raw event log.
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const format = new URL(req.url).searchParams.get("format");

    if (format === "csv") {
      const events = await db.aiUsageEvent.findMany({
        where: { tenantId: sess.tenantId! },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      const rows = [
        "event_id,kind,model,tokens,created_at",
        ...events.map((e) => `${e.id},${e.kind},${e.model},${e.tokens},${e.createdAt.toISOString()}`),
      ];
      return new Response(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sensiblee-ai-usage-${sess.tenantId!.slice(0, 8)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const data = await aiUsageWithQuota(sess.tenantId!);
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}
