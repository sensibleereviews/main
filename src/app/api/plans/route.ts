import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError } from "@/lib/api";
import { safeJson } from "@/lib/viewmodels";
import { readTaxPercent } from "@/lib/settings";
import { ensurePlanInvariants } from "@/lib/db-guard";

// Public pricing — single source of truth shared by marketing site and billing
export async function GET() {
  try {
    let [plans, taxPercent] = await Promise.all([
      db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
      readTaxPercent(),
    ]);
    // self-heal: checkpoint rollbacks have twice reverted Starter to ₹999 —
    // repair before serving (no-op when rows are current)
    const starter = plans.find((p) => p.id === "starter");
    if (!starter || starter.monthlyInr !== 1499) {
      await ensurePlanInvariants();
      plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
    }
    return NextResponse.json({
      taxPercent,
      plans: plans.map((p) => ({
        id: p.id, name: p.name, monthlyInr: p.monthlyInr, halfYearlyInr: p.halfYearlyInr, annualInr: p.annualInr,
        blurb: p.blurb, features: safeJson<string[]>(p.features, []), popular: p.popular,
        locations: p.locations, seats: p.seats, aiDrafts: p.aiDrafts, waQuota: p.waQuota,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
