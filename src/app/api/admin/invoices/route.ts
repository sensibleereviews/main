import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { toInvoiceVM } from "@/lib/viewmodels";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const invoices = await db.invoice.findMany({ orderBy: { periodStart: "desc" }, include: { tenant: true } });
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const settled = invoices.filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= monthStart);
    return NextResponse.json({
      invoices: invoices.map(toInvoiceVM),
      stats: {
        settledMonth: settled.reduce((a, i) => a + i.amountInr, 0),
        failed: invoices.filter((i) => i.status === "overdue").length,
        overdueAmount: invoices.filter((i) => i.status === "overdue").reduce((a, i) => a + i.amountInr, 0),
        annualContracts: 0, // annual invoices would be tagged; documented in README
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
