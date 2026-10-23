import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { readTaxPercent } from "@/lib/settings";
import { gstBreakup } from "@/lib/invoice-document";

// Tenant invoice detail — with GST breakup from the editable tax setting
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const invoice = await db.invoice.findUnique({ where: { id }, include: { tenant: true } });
    if (!invoice || invoice.tenantId !== sess.tenantId) return fail(404, "Invoice not found");
    const taxPercent = await readTaxPercent();
    const { subtotal, gst, total } = gstBreakup(invoice.amountInr, taxPercent);
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        method: invoice.method,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        dueAt: invoice.dueAt,
        paidAt: invoice.paidAt,
        amountInr: invoice.amountInr,
        taxPercent,
        gst,
        total,
      },
      plan: { id: invoice.tenant.planId, billingCycle: invoice.tenant.billingCycle },
      business: { name: invoice.tenant.name, gstin: invoice.tenant.gstin, contactName: invoice.tenant.contactName, contactEmail: invoice.tenant.contactEmail },
    });
  } catch (err) {
    return handleError(err);
  }
}
