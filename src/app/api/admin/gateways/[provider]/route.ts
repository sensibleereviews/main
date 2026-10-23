import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { maskGateway } from "@/lib/gateways";

// Configure one gateway: master enable/disable + credentials.
// Empty secret fields mean "keep the stored value" — secrets are write-only
// and always masked in responses.
export async function PATCH(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    await requirePlatformAdmin();
    const { provider } = await params;
    const body = await readJson<{
      enabled?: boolean;
      keyId?: string;
      keySecret?: string; // "" = keep stored, undefined = keep stored
      webhookSecret?: string;
    }>(req);

    const gateway = await db.gatewayConfig.findUnique({ where: { provider } });
    if (!gateway) return fail(404, "Unknown gateway provider");

    const data: { enabled?: boolean; keyId?: string; keySecret?: string; webhookSecret?: string } = {};
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (typeof body.keyId === "string") data.keyId = body.keyId.trim();
    if (typeof body.keySecret === "string" && body.keySecret !== "") data.keySecret = body.keySecret.trim();
    if (typeof body.webhookSecret === "string" && body.webhookSecret !== "") data.webhookSecret = body.webhookSecret.trim();

    if (data.keyId === "" && gateway.keyId && typeof body.keyId === "string") {
      return fail(400, "Key ID cannot be cleared — overwrite it with the new value instead");
    }

    const updated = await db.gatewayConfig.update({ where: { provider }, data });

    if (typeof body.enabled === "boolean") {
      const provisioned = await db.tenantGateway.count({ where: { gatewayId: updated.id } });
      await db.activityLog.create({
        data: {
          actor: "platform",
          action: body.enabled ? "gateway.enabled" : "gateway.disabled",
          detail: `Payment gateway ${updated.label} turned ${body.enabled ? "on" : "off"} platform-wide — ${provisioned} provisioned workspace${provisioned === 1 ? "" : "s"} ${body.enabled ? "collecting" : "suspended"}`,
        },
      });
    } else if (data.keyId || data.keySecret || data.webhookSecret) {
      await db.activityLog.create({
        data: { actor: "platform", action: "gateway.credentials_updated", detail: `Credentials rotated for payment gateway ${updated.label}` },
      });
    }

    return NextResponse.json({ gateway: maskGateway(updated) });
  } catch (err) {
    return handleError(err);
  }
}
