import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { ensureGatewaySeeds, maskGateway } from "@/lib/gateways";

// Platform payment gateways — registry with masked credentials and provisioned tenants
export async function GET() {
  try {
    await requirePlatformAdmin();
    await ensureGatewaySeeds();
    const [gateways, provisions, tenants] = await Promise.all([
      db.gatewayConfig.findMany({ orderBy: { provider: "asc" } }),
      db.tenantGateway.findMany({ include: { tenant: { select: { name: true } } }, orderBy: { provisionedAt: "desc" } }),
      db.tenant.findMany({ select: { id: true, name: true, planId: true, mrrInr: true }, orderBy: { name: "asc" } }),
    ]);
    return NextResponse.json({
      gateways: gateways.map((g) => ({
        ...maskGateway(g),
        provisioned: provisions
          .filter((p) => p.gatewayId === g.id)
          .map((p) => ({
            tenantId: p.tenantId,
            tenantName: p.tenant.name,
            mode: p.mode,
            status: p.status,
            accountRef: p.accountRef,
            provisionedAt: p.provisionedAt.toISOString(),
          })),
      })),
      tenants: tenants.map((t) => ({ id: t.id, name: t.name, planId: t.planId, mrrInr: t.mrrInr })),
    });
  } catch (err) {
    return handleError(err);
  }
}
