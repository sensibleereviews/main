import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { monthlyReportData, buildReportPdf } from "@/lib/reports";

// Tenant monthly report PDF — previous calendar month by default (?month=YYYY-MM to override)
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const month = new URL(req.url).searchParams.get("month") || undefined;
    const report = await monthlyReportData(sess.tenantId!, month);
    const pdf = buildReportPdf(report);
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sensiblee-monthly-report-${report.tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${report.month}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
