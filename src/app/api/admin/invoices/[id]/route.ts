import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformOperator } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { toInvoiceVM } from "@/lib/viewmodels";

// Dunning actions on a single invoice
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformOperator();
    const { id } = await params;
    const body = await readJson<{ action?: "remind" | "mark-paid" }>(req);
    const invoice = await db.invoice.findUnique({ where: { id }, include: { tenant: true } });
    if (!invoice) return fail(404, "Invoice not found");

    if (body.action === "remind") {
      const updated = await db.invoice.update({
        where: { id }, data: { remindersSent: { increment: 1 } }, include: { tenant: true },
      });
      await db.activityLog.create({
        data: { tenantId: invoice.tenantId, actor: `admin:${admin.email}`, action: "billing.reminder", detail: `WhatsApp payment link dispatched to ${invoice.tenant.contactName}` },
      });
      return NextResponse.json({ invoice: toInvoiceVM(updated), provider: "sim" });
    }

    if (body.action === "mark-paid") {
      const updated = await db.invoice.update({
        where: { id }, data: { status: "paid", paidAt: new Date() }, include: { tenant: true },
      });
      if (invoice.tenant.status === "past_due") {
        await db.tenant.update({ where: { id: invoice.tenantId }, data: { status: "active", nextInvoiceAt: new Date(Date.now() + 30 * 86400_000) } });
      }
      await db.activityLog.create({
        data: { tenantId: invoice.tenantId, actor: `admin:${admin.email}`, action: "billing.paid", detail: `Invoice ${invoice.number} marked paid` },
      });
      return NextResponse.json({ invoice: toInvoiceVM(updated) });
    }

    return fail(400, "action must be 'remind' or 'mark-paid'");
  } catch (err) {
    return handleError(err);
  }
}
