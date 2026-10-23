import { NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { monthlyReportData } from "@/lib/reports";

// Tenant monthly report data (JSON preview of the PDF)
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const month = new URL(req.url).searchParams.get("month") || undefined;
    const report = await monthlyReportData(sess.tenantId!, month);
    return NextResponse.json(report);
  } catch (err) {
    return handleError(err);
  }
}
