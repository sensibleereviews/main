// Marketing CMS — media library: list + upload (operators only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function GET() {
  try {
    await requirePlatformPerm("website_manage");
    const items = await db.cmsMedia.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, mime: true, size: true, alt: true, createdAt: true },
    });
    return NextResponse.json({ media: items.map((m) => ({ ...m, url: `/api/cms/media/${m.id}` })) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "Attach an image file in the 'file' field");
    if (!file.type.startsWith("image/")) return fail(400, "Only image files are supported");
    if (file.size > MAX_BYTES) return fail(400, "Image is larger than 2 MB — compress it first");
    const bytes = Buffer.from(await file.arrayBuffer());
    const media = await db.cmsMedia.create({
      data: {
        filename: (file.name || "image").slice(0, 160),
        mime: file.type,
        size: bytes.length,
        alt: String(form?.get("alt") || "").slice(0, 200),
        data: bytes,
      },
    });
    return NextResponse.json({ ok: true, media: { id: media.id, filename: media.filename, mime: media.mime, size: media.size, alt: media.alt, url: `/api/cms/media/${media.id}` } });
  } catch (err) {
    return handleError(err);
  }
}
