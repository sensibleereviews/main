// Marketing CMS — serve a media asset publicly (marketing pages reference these URLs)
// DELETE is operator-only.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const media = await db.cmsMedia.findUnique({ where: { id } }).catch(() => null);
    if (!media) return fail(404, "Media not found");
    const body = new Uint8Array(media.data);
    return new NextResponse(body, {
      headers: {
        "Content-Type": media.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    await db.cmsMedia.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
