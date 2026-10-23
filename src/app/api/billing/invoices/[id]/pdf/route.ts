import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { readTaxPercent } from "@/lib/settings";
import { buildInvoicePdf } from "@/lib/invoice-document";

// Tenant invoice PDF — application/pdf, forced download attachment
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const invoice = await db.invoice.findUnique({ where: { id }, include: { tenant: true } });
    if (!invoice || invoice.tenantId !== sess.tenantId) return fail(404, "Invoice not found");
    const taxPercent = await readTaxPercent();
    const plan = await db.plan.findUnique({ where: { id: invoice.tenant.planId } });
    const pdf = buildInvoicePdf({
      number: invoice.number,
      status: invoice.status,
      method: invoice.method,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueAt: invoice.dueAt,
      paidAt: invoice.paidAt,
      amountInr: invoice.amountInr,
      taxPercent,
      tenant: {
        name: invoice.tenant.name,
        contactName: invoice.tenant.contactName,
        contactEmail: invoice.tenant.contactEmail,
        gstin: invoice.tenant.gstin,
        planName: plan?.name || "Sensiblee",
        billingCycle: invoice.tenant.billingCycle,
      },
    });
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sensiblee-invoice-${invoice.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
