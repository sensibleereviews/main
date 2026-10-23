// Marketing CMS — FAQ update / delete (operators only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    const body = await readJson<{ section?: string; category?: string; question?: string; answer?: string; sortOrder?: number; published?: boolean }>(req);
    const data: Record<string, unknown> = {};
    if (body.section && ["home", "pricing", "knowledge"].includes(body.section)) data.section = body.section;
    if (body.category !== undefined) data.category = body.category.trim().slice(0, 80) || "General";
    if (body.question !== undefined) data.question = body.question.trim().slice(0, 300);
    if (body.answer !== undefined) data.answer = body.answer.trim().slice(0, 3000);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.published !== undefined) data.published = !!body.published;
    const faq = await db.cmsFaq.update({ where: { id }, data }).catch(() => null);
    if (!faq) return fail(404, "FAQ not found");
    return NextResponse.json({ ok: true, faq });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformPerm("website_manage");
    const { id } = await params;
    await db.cmsFaq.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
