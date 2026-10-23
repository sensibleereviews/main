// Marketing CMS — blog post update / delete (operators only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { slugifyTitle } from "@/lib/route-shared";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    const body = await readJson<{
      slug?: string; title?: string; tag?: string; excerpt?: string; summary?: string; body?: string; readTime?: string;
      author?: string; authorRole?: string; featuredMediaId?: string | null;
      seoTitle?: string; seoDescription?: string; published?: boolean; publishedAt?: string;
    }>(req);
    const data: Record<string, unknown> = {};
    if (body.slug !== undefined) data.slug = slugifyTitle(body.slug) || undefined;
    if (body.title !== undefined) data.title = body.title.trim().slice(0, 200);
    if (body.tag !== undefined) data.tag = body.tag.trim().slice(0, 60);
    if (body.excerpt !== undefined) data.excerpt = body.excerpt.trim().slice(0, 500);
    if (body.summary !== undefined) data.summary = body.summary.trim().slice(0, 800);
    if (body.body !== undefined) data.body = body.body;
    if (body.readTime !== undefined) data.readTime = body.readTime.trim().slice(0, 40);
    if (body.author !== undefined) data.author = body.author.trim().slice(0, 100);
    if (body.authorRole !== undefined) data.authorRole = body.authorRole.trim().slice(0, 120);
    if (body.featuredMediaId !== undefined) data.featuredMediaId = body.featuredMediaId || null;
    if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle.trim().slice(0, 200);
    if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription.trim().slice(0, 400);
    if (body.published !== undefined) data.published = !!body.published;
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    const post = await db.cmsPost.update({ where: { id }, data }).catch(() => null);
    if (!post) return fail(404, "Post not found");
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    await db.cmsPost.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
