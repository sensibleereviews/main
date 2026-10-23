import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { effectiveFlagsFor } from "@/lib/flags";

// Toggle a flag's system-level master switch. Turning a flag off does NOT delete
// tenant opt-ins — it suspends them; re-enabling restores every opt-in instantly.
export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requirePlatformAdmin();
    const { key } = await params;
    const body = await readJson<{ enabled?: boolean }>(req);
    if (typeof body.enabled !== "boolean") return fail(400, "enabled (boolean) is required");
    const flag = await db.featureFlag.findUnique({ where: { key } });
    if (!flag) return fail(404, "Unknown flag");
    const updated = await db.featureFlag.update({ where: { key }, data: { enabled: body.enabled } });
    await db.activityLog.create({
      data: { actor: "platform", action: body.enabled ? "flag.enabled" : "flag.disabled", detail: `Feature flag "${flag.label}" (${key}) turned ${body.enabled ? "on" : "off"} platform-wide` },
    });
    // Report how many tenants are now (or remain) effectively on
    const optIns = await db.tenantFlag.findMany({ where: { flagId: updated.id, optedIn: true } });
    const affected = await Promise.all(optIns.map((o) => effectiveFlagsFor(o.tenantId)));
    const effectiveCount = affected.filter((flags) => flags.find((f) => f.key === key)?.effective).length;
    return NextResponse.json({
      flag: { key: updated.key, label: updated.label, enabled: updated.enabled, optIns: optIns.length, effectiveCount },
    });
  } catch (err) {
    return handleError(err);
  }
}
