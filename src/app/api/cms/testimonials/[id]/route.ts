// Marketing CMS — testimonial update / delete (operators only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    const body = await readJson<{ quote?: string; name?: string; role?: string; stars?: number; section?: string; mediaId?: string | null; sortOrder?: number; published?: boolean }>(req);
    const data: Record<string, unknown> = {};
    if (body.quote !== undefined) data.quote = body.quote.trim().slice(0, 600);
    if (body.name !== undefined) data.name = body.name.trim().slice(0, 120);
    if (body.role !== undefined) data.role = body.role.trim().slice(0, 160);
    if (body.stars !== undefined) data.stars = Math.min(5, Math.max(1, Number(body.stars) || 5));
    if (body.section !== undefined) data.section = body.section === "stories" ? "stories" : "home";
    if (body.mediaId !== undefined) data.mediaId = body.mediaId || null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.published !== undefined) data.published = !!body.published;
    const t = await db.cmsTestimonial.update({ where: { id }, data }).catch(() => null);
    if (!t) return fail(404, "Testimonial not found");
    return NextResponse.json({ ok: true, testimonial: t });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    await db.cmsTestimonial.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
