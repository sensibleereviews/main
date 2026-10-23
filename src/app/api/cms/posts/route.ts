// Marketing CMS — blog posts: list (operators) + create
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { slugifyTitle } from "@/lib/route-shared";

export async function GET() {
  try {
    await requirePlatformPerm("website_manage");
    const posts = await db.cmsPost.findMany({ orderBy: { publishedAt: "desc" } });
    return NextResponse.json({ posts });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const body = await readJson<{ title?: string; slug?: string; tag?: string; excerpt?: string; summary?: string; body?: string; readTime?: string; author?: string; authorRole?: string; seoTitle?: string; seoDescription?: string; published?: boolean; publishedAt?: string }>(req);
    if (!body.title?.trim()) return fail(400, "Title is required");
    // Public URLs derive from the full title (dash-case, diacritics folded); stored slug is legacy.
    let slug = slugifyTitle(body.slug?.trim() || body.title) || `post-${Date.now().toString(36)}`;
    if (await db.cmsPost.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const post = await db.cmsPost.create({
      data: {
        slug,
        title: body.title.trim().slice(0, 200),
        tag: body.tag?.trim().slice(0, 60) || "Insights",
        excerpt: body.excerpt?.trim().slice(0, 500) || "",
        summary: body.summary?.trim().slice(0, 800) || "",
        body: body.body || "",
        readTime: body.readTime?.trim().slice(0, 40) || "",
        author: body.author?.trim().slice(0, 100) || "Admin",
        authorRole: body.authorRole?.trim().slice(0, 120) || "",
        seoTitle: body.seoTitle?.trim().slice(0, 200) || "",
        seoDescription: body.seoDescription?.trim().slice(0, 400) || "",
        published: body.published !== false,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      },
    });
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return handleError(err);
  }
}
