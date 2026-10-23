import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { effectiveFlags } from "@/lib/feature-flags";

// Effective feature flags for the signed-in workspace:
// system master switch × tenant opt-in (Settings → Channels)
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! }, select: { settings: true, whatsappName: true, whatsappPhone: true } });
    const flags = await effectiveFlags(tenant?.settings);
    return NextResponse.json({
      flags,
      sender: { name: tenant?.whatsappName || "", phone: tenant?.whatsappPhone || "", configured: Boolean(tenant?.whatsappName && tenant?.whatsappPhone) },
    });
  } catch (err) {
    return handleError(err);
  }
}
