import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { activeGatewayFor } from "@/lib/gateways";

// Provision a gateway to a tenant — refused while the gateway master is off
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    await requirePlatformAdmin();
    const { provider } = await params;
    const body = await readJson<{ tenantId?: string; mode?: string; accountRef?: string }>(req);
    if (!body.tenantId) return fail(400, "tenantId is required");
    const mode = body.mode === "live" ? "live" : "test";
    if (mode === "live" && !body.accountRef?.trim()) {
      return fail(400, "Live mode requires an account reference (verified merchant ID)");
    }

    const gateway = await db.gatewayConfig.findUnique({ where: { provider } });
    if (!gateway) return fail(404, "Unknown gateway provider");
    if (!gateway.enabled) return fail(400, `${gateway.label} is switched off platform-wide — enable it before provisioning`);

    const tenant = await db.tenant.findUnique({ where: { id: body.tenantId } });
    if (!tenant) return fail(404, "Workspace not found");

    const existing = await db.tenantGateway.findUnique({
      where: { tenantId_gatewayId: { tenantId: body.tenantId, gatewayId: gateway.id } },
    });
    if (existing) return fail(409, `${tenant.name} is already provisioned on ${gateway.label}`);

    await db.tenantGateway.create({
      data: {
        tenantId: body.tenantId,
        gatewayId: gateway.id,
        mode,
        accountRef: body.accountRef?.trim() || "",
        status: "active",
      },
    });

    const active = await activeGatewayFor(body.tenantId);
    await db.activityLog.create({
      data: {
        tenantId: tenant.id,
        actor: "platform",
        action: "gateway.provisioned",
        detail: `${gateway.label} provisioned in ${mode.toUpperCase()} mode${active ? ` — now collecting via ${active.methodLabel}` : ""}`,
      },
    });

    return NextResponse.json({ ok: true, provisioned: { provider, tenantId: body.tenantId, mode }, tenantActive: active });
  } catch (err) {
    return handleError(err);
  }
}

// Update a provisioning — switch mode, pause/resume collection, set account ref
export async function PATCH(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    await requirePlatformAdmin();
    const { provider } = await params;
    const body = await readJson<{ tenantId?: string; mode?: string; status?: string; accountRef?: string }>(req);
    if (!body.tenantId) return fail(400, "tenantId is required");

    const gateway = await db.gatewayConfig.findUnique({ where: { provider } });
    if (!gateway) return fail(404, "Unknown gateway provider");

    const link = await db.tenantGateway.findUnique({
      where: { tenantId_gatewayId: { tenantId: body.tenantId, gatewayId: gateway.id } },
    });
    if (!link) return fail(404, "Workspace is not provisioned on this gateway");

    const data: { mode?: string; status?: string; accountRef?: string } = {};
    if (body.mode === "test" || body.mode === "live") data.mode = body.mode;
    if (body.status === "active" || body.status === "paused") data.status = body.status;
    if (typeof body.accountRef === "string") data.accountRef = body.accountRef.trim();
    if (data.mode === "live" && (data.accountRef ?? link.accountRef) === "") {
      return fail(400, "Live mode requires an account reference first");
    }

    const updated = await db.tenantGateway.update({ where: { id: link.id }, data });
    const active = await activeGatewayFor(body.tenantId);

    await db.activityLog.create({
      data: {
        tenantId: body.tenantId,
        actor: "platform",
        action: "gateway.provision_updated",
        detail: `${gateway.label} provisioning updated — mode ${updated.mode.toUpperCase()}, ${updated.status}`,
      },
    });

    return NextResponse.json({
      ok: true,
      provisioned: { provider, tenantId: body.tenantId, mode: updated.mode, status: updated.status, accountRef: updated.accountRef },
      tenantActive: active,
    });
  } catch (err) {
    return handleError(err);
  }
}

// Unprovision a gateway from a tenant
export async function DELETE(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    await requirePlatformAdmin();
    const { provider } = await params;
    const tenantId = new URL(req.url).searchParams.get("tenantId");
    if (!tenantId) return fail(400, "tenantId query parameter is required");

    const gateway = await db.gatewayConfig.findUnique({ where: { provider } });
    if (!gateway) return fail(404, "Unknown gateway provider");

    const link = await db.tenantGateway.findUnique({
      where: { tenantId_gatewayId: { tenantId, gatewayId: gateway.id } },
    });
    if (!link) return fail(404, "Workspace is not provisioned on this gateway");

    await db.tenantGateway.delete({ where: { id: link.id } });
    await db.activityLog.create({
      data: {
        tenantId,
        actor: "platform",
        action: "gateway.unprovisioned",
        detail: `${gateway.label} unprovisioned — workspace falls back to manual invoicing`,
      },
    });

    return NextResponse.json({ ok: true, unprovisioned: { provider, tenantId } });
  } catch (err) {
    return handleError(err);
  }
}
