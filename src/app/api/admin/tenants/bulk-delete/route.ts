// Admin — bulk delete clients with full cascade (super admin only).
// A tenant owns users, roles, locations, reviews, AI drafts, campaigns, guest
// feedback, sync logs, invoices and activity — everything goes with it.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { ids } = await readJson<{ ids?: string[] }>(req);
    const list = (ids || []).filter((x) => typeof x === "string" && x);
    if (list.length === 0) return fail(400, "No clients selected");

    const deleted = await db.$transaction(async (tx) => {
      let count = 0;
      for (const id of list) {
        const tenant = await tx.tenant.findUnique({ where: { id } });
        if (!tenant) continue;
        await tx.aiDraft.deleteMany({ where: { review: { tenantId: id } } });
        await tx.guestFeedback.deleteMany({ where: { tenantId: id } });
        await tx.syncLog.deleteMany({ where: { location: { tenantId: id } } });
        await tx.review.deleteMany({ where: { tenantId: id } });
        await tx.campaign.deleteMany({ where: { tenantId: id } });
        await tx.location.deleteMany({ where: { tenantId: id } });
        await tx.invoice.deleteMany({ where: { tenantId: id } });
        await tx.activityLog.deleteMany({ where: { tenantId: id } });
        await tx.user.deleteMany({ where: { tenantId: id } });
        await tx.customRole.deleteMany({ where: { tenantId: id } });
        await tx.tenant.delete({ where: { id } });
        await tx.activityLog.create({
          data: { actor: `admin:${admin.email}`, action: "tenant.deleted", detail: `${tenant.name} and all related data removed` },
        });
        count += 1;
      }
      return count;
    });

    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return handleError(err);
  }
}
