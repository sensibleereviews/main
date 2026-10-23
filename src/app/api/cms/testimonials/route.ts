// Marketing CMS — testimonials: list (operators) + create
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function GET() {
  try {
    await requirePlatformPerm("website_manage");
    const items = await db.cmsTestimonial.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ testimonials: items });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const body = await readJson<{ quote?: string; name?: string; role?: string; stars?: number; section?: string; mediaId?: string | null; sortOrder?: number }>(req);
    if (!body.quote?.trim() || !body.name?.trim()) return fail(400, "Quote and name are required");
    const t = await db.cmsTestimonial.create({
      data: {
        quote: body.quote.trim().slice(0, 600),
        name: body.name.trim().slice(0, 120),
        role: body.role?.trim().slice(0, 160) || "",
        stars: Math.min(5, Math.max(1, Number(body.stars) || 5)),
        section: body.section === "stories" ? "stories" : "home",
        mediaId: body.mediaId || null,
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 99,
      },
    });
    return NextResponse.json({ ok: true, testimonial: t });
  } catch (err) {
    return handleError(err);
  }
}
