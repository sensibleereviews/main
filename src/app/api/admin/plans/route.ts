import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { safeJson } from "@/lib/viewmodels";
import { platformConfig } from "@/lib/platform-config";

// Plans & pricing editor — changes propagate to the public marketing page instantly
export async function GET() {
  try {
    await requirePlatformAdmin();
    const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
    const billing = await platformConfig.billing();
    return NextResponse.json({
      trialDays: billing.trialDays,
      plans: plans.map((p) => ({
        id: p.id, name: p.name, monthlyInr: p.monthlyInr, halfYearlyInr: p.halfYearlyInr, annualInr: p.annualInr,
        blurb: p.blurb, features: safeJson<string[]>(p.features, []), popular: p.popular,
        locations: p.locations, seats: p.seats, waQuota: p.waQuota, aiDrafts: p.aiDrafts,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requirePlatformPerm("plans_manage");
    const body = await readJson<{ id?: string; monthlyInr?: number; halfYearlyInr?: number; annualInr?: number; blurb?: string; locations?: number; seats?: number; waQuota?: number; aiDrafts?: string; trialDays?: number; features?: string[]; name?: string }>(req);

    // platform-level trial length (not tied to a single plan)
    if (body.id === undefined && body.trialDays !== undefined) {
      const billing = await platformConfig.billing();
      const next = { trialDays: Math.max(0, Math.min(90, body.trialDays)) };
      await platformConfig.saveBilling(next);
      await db.systemEvent.create({ data: { type: "signal", name: "Trial length updated", state: "ok", detail: `${next.trialDays} days — set by ${admin.email}` } });
      return NextResponse.json({ ok: true, trialDays: next.trialDays });
    }

    if (!body.id) return fail(400, "Plan id is required");
    const plan = await db.plan.findUnique({ where: { id: body.id } });
    if (!plan) return fail(404, "Plan not found");
    await db.plan.update({
      where: { id: plan.id },
      data: {
        name: body.name ?? plan.name,
        monthlyInr: body.monthlyInr ?? plan.monthlyInr,
        halfYearlyInr: body.halfYearlyInr ?? plan.halfYearlyInr,
        annualInr: body.annualInr ?? plan.annualInr,
        blurb: body.blurb ?? plan.blurb,
        locations: body.locations ?? plan.locations,
        seats: body.seats ?? plan.seats,
        waQuota: body.waQuota ?? plan.waQuota,
        aiDrafts: body.aiDrafts ?? plan.aiDrafts,
        // plan feature toggles (doc §2D "Enable or disable plan features")
        features: Array.isArray(body.features) ? JSON.stringify(body.features.slice(0, 12)) : plan.features,
      },
    });
    await db.systemEvent.create({
      data: { type: "signal", name: "Plan pricing updated", state: "ok", detail: `${plan.name} edited by ${admin.email}`, createdAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

// Create a new plan (doc §2D "Create and edit subscription plans")
export async function POST(req: Request) {
  try {
    const admin = await requirePlatformPerm("plans_manage");
    const body = await readJson<{
      id?: string; name?: string; monthlyInr?: number; annualInr?: number; halfYearlyInr?: number;
      blurb?: string; locations?: number; seats?: number; waQuota?: number; aiDrafts?: string; features?: string[];
    }>(req);
    if (!body.name?.trim()) return fail(400, "Plan name is required");
    const id = (body.id || body.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
    if (!id) return fail(400, "Could not derive a plan id");
    if (await db.plan.findUnique({ where: { id } })) return fail(409, `A plan with id "${id}" already exists`);
    const maxSort = await db.plan.aggregate({ _max: { sortOrder: true } });
    const plan = await db.plan.create({
      data: {
        id,
        name: body.name.trim().slice(0, 40),
        monthlyInr: Math.max(0, body.monthlyInr ?? 999),
        halfYearlyInr: Math.max(0, body.halfYearlyInr ?? Math.round((body.monthlyInr ?? 999) * 5)),
        annualInr: Math.max(0, body.annualInr ?? Math.round((body.monthlyInr ?? 999) * 10)),
        locations: Math.max(1, body.locations ?? 1),
        seats: Math.max(1, body.seats ?? 2),
        waQuota: Math.max(0, body.waQuota ?? 200),
        aiDrafts: body.aiDrafts || "50 / month",
        blurb: (body.blurb || "Custom plan").slice(0, 120),
        features: JSON.stringify((body.features || []).slice(0, 12)),
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
    await db.systemEvent.create({ data: { type: "signal", name: "Plan created", state: "ok", detail: `${plan.name} (₹${plan.monthlyInr}/mo) created by ${admin.email}` } });
    return NextResponse.json({ ok: true, id: plan.id });
  } catch (err) {
    return handleError(err);
  }
}
