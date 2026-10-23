import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { toLocationVM } from "@/lib/viewmodels";
import { getScopedLocationIds } from "@/lib/tenant-scope";

export async function GET() {
  try {
    const sess = await requireTenantUser();
    const scopedIds = await getScopedLocationIds(sess);
    const locations = await db.location.findMany({
      where: {
        tenantId: sess.tenantId,
        ...(scopedIds ? { id: { in: scopedIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ locations: locations.map((l) => toLocationVM(l)) });
  } catch (err) {
    return handleError(err);
  }
}

// Connect a new Google Business Profile (simulated OAuth in demo mode)
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("locations_manage");
    const body = await readJson<{ name?: string; area?: string }>(req);
    if (!body.name) return NextResponse.json({ error: "Location name is required" }, { status: 400 });
    const plan = await db.tenant.findUnique({ where: { id: sess.tenantId! }, include: { plan: true, _count: { select: { locations: true } } } });
    if (plan && plan._count.locations >= plan.plan.locations) {
      return NextResponse.json({ error: `Plan includes ${plan.plan.locations} profile${plan.plan.locations > 1 ? "s" : ""} — upgrade to add more.` }, { status: 402 });
    }
    const code = `${sess.email.slice(0, 2)}${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 12)}-${Math.random().toString(36).slice(2, 5)}`;
    const location = await db.location.create({
      data: {
        tenantId: sess.tenantId!, code, name: body.name, area: body.area || "—",
        googlePlaceId: `ChIJ${code.toUpperCase()}SIM`, googleReviewUrl: `https://search.google.com/local/writereview?placeid=ChIJ${code.toUpperCase()}SIM`,
        rating: 0, reviewCount: 0, contactBookSize: 0,
        health: JSON.stringify([{ label: "Service", score: 80 }, { label: "Quality", score: 80 }]),
        lastSyncAt: new Date(), syncCount: 0,
      },
    });
    await db.syncLog.create({ data: { locationId: location.id, state: "ok", message: "Profile connected · first sync scheduled", latencyMs: 280 } });
    await db.activityLog.create({ data: { tenantId: sess.tenantId, actor: sess.email, action: "location.connected", detail: `${body.name} connected via Google OAuth` } });
    return NextResponse.json({ location: toLocationVM(location) });
  } catch (err) {
    return handleError(err);
  }
}
