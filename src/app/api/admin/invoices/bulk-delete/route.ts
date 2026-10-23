// Admin — bulk delete invoices (operators). Each removal is audit-logged.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformOperator } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const admin = await requirePlatformOperator();
    const { ids } = await readJson<{ ids?: string[] }>(req);
    const list = (ids || []).filter((x) => typeof x === "string" && x);
    if (list.length === 0) return fail(400, "No invoices selected");

    const rows = await db.invoice.findMany({ where: { id: { in: list } } });
    await db.$transaction([
      db.invoice.deleteMany({ where: { id: { in: list } } }),
      ...rows.map((r) => db.activityLog.create({
        data: { tenantId: r.tenantId, actor: `admin:${admin.email}`, action: "billing.deleted", detail: `Invoice ${r.number} (${r.status}) deleted from the console` },
      })),
    ]);
    return NextResponse.json({ ok: true, deleted: rows.length });
  } catch (err) {
    return handleError(err);
  }
}
