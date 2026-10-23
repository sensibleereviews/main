// Marketing CMS — pages list (platform operators; observers read-only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { safeJson } from "@/lib/viewmodels";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const pages = await db.cmsPage.findMany({ orderBy: { slug: "asc" } });
    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id, slug: p.slug, urlSlug: p.urlSlug || "", title: p.title, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
        content: safeJson<Record<string, unknown>>(p.content, {}), published: p.published, updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
