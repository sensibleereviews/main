import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { ensureFlagSeeds } from "@/lib/flags";

// Platform feature flags — system master switches with tenant opt-in counts
export async function GET() {
  try {
    await requirePlatformAdmin();
    await ensureFlagSeeds();
    const flags = await db.featureFlag.findMany({
      orderBy: { key: "asc" },
      include: { optIns: { where: { optedIn: true } } },
    });
    const tenantTotal = await db.tenant.count();
    return NextResponse.json({
      tenantTotal,
      flags: flags.map((f) => ({
        key: f.key, label: f.label, description: f.description, enabled: f.enabled,
        optIns: f.optIns.length,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
