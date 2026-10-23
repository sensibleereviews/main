import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// WhatsApp suppression list — opted-out / ineligible guest numbers.
// GET    — list entries (newest first)
// POST   — add a number (manual opt-out or imported suppression)
// DELETE — remove (only when the guest re-consents)
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const rows = await db.waOptOut.findMany({
      where: { tenantId: sess.tenantId! },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      optOuts: rows.map((r) => ({
        id: r.id, phone: r.phone, reason: r.reason, note: r.note,
        at: new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const sess = await requireTenantUser();
    const body = await readJson<{ phone?: string; reason?: string; note?: string; bulk?: string }>(req);

    // bulk import — one number per line / comma separated
    if (body.bulk?.trim()) {
      const phones = body.bulk.split(/[\n,;]+/).map((p) => p.replace(/[^\d+]/g, "")).filter((p) => p.length >= 8).slice(0, 500);
      if (!phones.length) return fail(400, "No valid phone numbers found in the import");
      const created = await Promise.all(phones.map((phone) =>
        db.waOptOut.upsert({
          where: { tenantId_phone: { tenantId: sess.tenantId!, phone } },
          create: { tenantId: sess.tenantId!, phone, reason: "imported_suppression", note: "Imported suppression list" },
          update: { reason: "imported_suppression", note: "Imported suppression list" },
        })
      ));
      return NextResponse.json({ ok: true, imported: created.length });
    }

    const phone = (body.phone || "").replace(/[^\d+]/g, "");
    if (phone.length < 8) return fail(400, "A valid phone number is required");
    const row = await db.waOptOut.upsert({
      where: { tenantId_phone: { tenantId: sess.tenantId!, phone } },
      create: { tenantId: sess.tenantId!, phone, reason: body.reason || "opted_out", note: body.note || null },
      update: { reason: body.reason || "opted_out", note: body.note || null },
    });
    return NextResponse.json({ ok: true, optOut: { id: row.id, phone: row.phone } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const sess = await requireTenantUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail(400, "id required");
    await db.waOptOut.deleteMany({ where: { id, tenantId: sess.tenantId! } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
