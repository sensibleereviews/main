import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// System-level feature flags — platform admin toggles (default: all OFF)
export async function GET() {
  try {
    await requirePlatformAdmin();
    const flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
    // how many tenants opted in per flag (only counts when system flag exists)
    const tenants = await db.tenant.findMany({ select: { settings: true } });
    const optedIn: Record<string, number> = {};
    for (const t of tenants) {
      try {
        const s = JSON.parse(t.settings || "{}") as { channels?: Record<string, unknown> };
        for (const f of flags) {
          if (s.channels && s.channels[f.key.replace("_requests", "")] === true) optedIn[f.key] = (optedIn[f.key] || 0) + 1;
        }
      } catch { /* ignore malformed settings */ }
    }
    return NextResponse.json({
      flags: flags.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString(), tenantsOptedIn: optedIn[f.key] || 0 })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// Toggle a system flag
export async function PUT(req: Request) {
  try {
    await requirePlatformAdmin();
    const body = await readJson<{ key?: string; enabled?: boolean }>(req);
    if (!body.key || typeof body.enabled !== "boolean") return fail(400, "key and enabled are required");
    const existing = await db.featureFlag.findUnique({ where: { key: body.key } });
    if (!existing) return fail(404, "Unknown feature flag");

    // When switching WhatsApp off at system level, queued campaigns stay paused —
    // documented behaviour: drafts keep working, new WhatsApp sends are rejected.
    const flag = await db.featureFlag.update({ where: { key: body.key }, data: { enabled: body.enabled } });
    return NextResponse.json({ flag: { ...flag, updatedAt: flag.updatedAt.toISOString() } });
  } catch (err) {
    return handleError(err);
  }
}
