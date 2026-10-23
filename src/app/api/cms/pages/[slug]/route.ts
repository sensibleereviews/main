// Marketing CMS — update one page (name, public URL, copy, SEO, published). Operators only.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { CMS_PAGE_SLUGS } from "@/lib/cms-defaults";
import { defaultUrlSlugFor, RESERVED_URL_SLUGS, slugifyTitle, type Surface } from "@/lib/route-shared";

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { slug } = await params;
    if (!(CMS_PAGE_SLUGS as readonly string[]).includes(slug)) return fail(404, "Unknown page");
    const body = await readJson<{
      title?: string; urlSlug?: string; seoTitle?: string; seoDescription?: string;
      content?: Record<string, unknown>; published?: boolean;
    }>(req);

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).slice(0, 200);
    if (body.seoTitle !== undefined) data.seoTitle = String(body.seoTitle).slice(0, 200);
    if (body.seoDescription !== undefined) data.seoDescription = String(body.seoDescription).slice(0, 400);
    if (body.published !== undefined) data.published = !!body.published;
    if (body.content !== undefined) data.content = JSON.stringify(body.content ?? {});

    // Public URL segment — empty string resets to the built-in default.
    if (body.urlSlug !== undefined) {
      const raw = String(body.urlSlug).trim().toLowerCase();
      if (raw === "") {
        data.urlSlug = null;
      } else if (slug === "home") {
        return fail(400, "The homepage always lives at / — its URL cannot be changed.");
      } else {
        const urlSlug = slugifyTitle(raw).slice(0, 80);
        if (!urlSlug) return fail(400, "That URL isn't usable — use letters, numbers and dashes.");
        if (RESERVED_URL_SLUGS.has(urlSlug)) return fail(400, `/${urlSlug} is reserved by the platform and can't be used for a page.`);
        // Collision check against every other page's effective URL (defaults + customs).
        const others = await db.cmsPage.findMany({
          where: { slug: { not: slug } },
          select: { slug: true, title: true, urlSlug: true },
        });
        for (const o of others) {
          const eff = o.urlSlug?.trim() || defaultUrlSlugFor(o.slug as Surface);
          if (eff === urlSlug) return fail(400, `/${urlSlug} is already the address of “${o.title}”. Pick a different URL.`);
        }
        data.urlSlug = urlSlug;
      }
    }

    const page = await db.cmsPage.upsert({
      where: { slug },
      update: data,
      create: { slug, title: String(body.title ?? slug), ...(data as object) },
    });
    return NextResponse.json({ ok: true, page: { slug: page.slug, urlSlug: page.urlSlug || "", updatedAt: page.updatedAt } });
  } catch (err) {
    return handleError(err);
  }
}
