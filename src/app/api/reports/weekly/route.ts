import { NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { weeklyReportData } from "@/lib/reports";

// Tenant weekly digest (doc §1I "Weekly and monthly reports") — 7-day rolling
// window with the same AI management summary the monthly report carries.
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const report = await weeklyReportData(sess.tenantId!);
    return NextResponse.json(report);
  } catch (err) {
    return handleError(err);
  }
}
