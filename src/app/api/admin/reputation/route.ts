import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { platformConfig, HEALTH_DEFAULTS, type HealthConfig } from "@/lib/platform-config";
import { HEALTH_WEIGHTS_V1, HEALTH_WEIGHTS_V2, type HealthWeights } from "@/lib/health-score";

// Admin → Reputation controls: score formula versioning, weight overrides,
// minimum-data thresholds, data-completeness monitor and duplicate-location
// resolution (doc §2H).
export async function GET() {
  try {
    await requirePlatformAdmin();
    const cfg = await platformConfig.health();

    const [tenants, locations, reviews] = await Promise.all([
      db.tenant.findMany({ select: { name: true, _count: { select: { locations: true, reviews: true } } } }),
      db.location.findMany({ select: { id: true, tenantId: true, name: true, area: true, reviewCount: true, lastSyncAt: true, tenant: { select: { name: true } } } }),
      db.review.findMany({ select: { locationId: true, createdAt: true } }),
    ]);

    // data completeness: tenants without locations, locations without reviews,
    // locations never synced, locations with no reviews in 30d
    const monthAgo = Date.now() - 30 * 86_400_000;
    const completeness = {
      tenantsNoLocations: tenants.filter((t) => t._count.locations === 0).map((t) => t.name),
      locationsTotal: locations.length,
      locationsNoReviews: locations.filter((l) => l.reviewCount === 0).map((l) => l.name),
      locationsNeverSynced: locations.filter((l) => !l.lastSyncAt).map((l) => l.name),
      locationsStale30d: locations.filter((l) => !reviews.some((r) => r.locationId === l.id && new Date(r.createdAt).getTime() >= monthAgo)).map((l) => l.name),
    };

    // duplicate / mismatched locations (doc §2H): same workspace, similar name or
    // identical area — candidates for merging or renaming.
    const norm = (s: string) => s.toLowerCase().replace(/^spice route\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
    const reviewedPairs = safeKeys(await platformConfigResolved());
    const duplicates: { key: string; tenant: string; a: { id: string; name: string; area: string }; b: { id: string; name: string; area: string }; basis: string }[] = [];
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const a = locations[i], b = locations[j];
        if (a.tenantId !== b.tenantId) continue;
        const basis =
          norm(a.name) === norm(b.name) && a.area.trim().toLowerCase() === b.area.trim().toLowerCase() ? "identical name and area"
          : norm(a.name) === norm(b.name) ? "same name, different area"
          : a.area.trim().toLowerCase() === b.area.trim().toLowerCase() && norm(a.name).split(" ")[0] === norm(b.name).split(" ")[0] ? "same area, similar name"
          : null;
        if (!basis) continue;
        const key = [a.id, b.id].sort().join("~");
        if (reviewedPairs.has(key)) continue;
        duplicates.push({ key, tenant: a.tenant.name, a: { id: a.id, name: a.name, area: a.area }, b: { id: b.id, name: b.name, area: b.area }, basis });
      }
    }

    return NextResponse.json({
      config: cfg,
      shipped: { v1: HEALTH_WEIGHTS_V1, v2: HEALTH_WEIGHTS_V2 },
      completeness,
      duplicates,
      duplicatesReviewed: reviewedPairs.size,
    });
  } catch (err) {
    return handleError(err);
  }
}

// reviewed duplicate pairs live in the platform config blob
async function platformConfigResolved(): Promise<{ reviewedDuplicates?: string[] }> {
  const row = await db.cmsSetting.findUnique({ where: { key: "platform.reputation.reviewedDuplicates" } });
  try { return row?.value ? JSON.parse(row.value) : {}; } catch { return {}; }
}

function safeKeys(cfg: { reviewedDuplicates?: string[] }): Set<string> {
  return new Set(Array.isArray(cfg.reviewedDuplicates) ? cfg.reviewedDuplicates : []);
}

// Save the scoring configuration — formula version + weight override + threshold
export async function PATCH(req: Request) {
  try {
    await requirePlatformAdmin();
    const body = await readJson<{ version?: "v1" | "v2"; minReviews?: number; customWeights?: HealthWeights | null; reviewDuplicate?: string }>(req);

    // mark a duplicate pair as reviewed/resolved (doc §2H "Resolve duplicate or mismatched locations")
    if (body.reviewDuplicate) {
      const cfgPrev = await platformConfigResolved();
      const keys = new Set(Array.isArray(cfgPrev.reviewedDuplicates) ? cfgPrev.reviewedDuplicates : []);
      keys.add(body.reviewDuplicate);
      await db.cmsSetting.upsert({
        where: { key: "platform.reputation.reviewedDuplicates" },
        create: { key: "platform.reputation.reviewedDuplicates", value: JSON.stringify({ reviewedDuplicates: [...keys] }) },
        update: { value: JSON.stringify({ reviewedDuplicates: [...keys] }) },
      });
      await db.systemEvent.create({ data: { type: "signal", name: "Duplicate location reviewed", state: "ok", detail: "Pair marked as intentionally separate" } });
      return NextResponse.json({ ok: true });
    }

    const cfg = await platformConfig.health();
    const next: HealthConfig = {
      version: body.version ?? cfg.version,
      minReviews: Math.max(0, Math.min(100, body.minReviews ?? cfg.minReviews)),
      customWeights: body.customWeights === undefined ? cfg.customWeights : (body.customWeights as unknown as Record<string, number> | null),
    };
    await platformConfig.saveHealth(next);
    await db.systemEvent.create({
      data: { type: "signal", name: "Scoring formula updated", state: "ok", detail: `version=${next.version} minReviews=${next.minReviews} weights=${next.customWeights ? "custom" : "shipped"}` },
    });
    return NextResponse.json({ config: next });
  } catch (err) {
    return handleError(err);
  }
}
