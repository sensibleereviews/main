// Marketing CMS — FAQs: list (operators) + create
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

export async function GET() {
  try {
    await requirePlatformPerm("website_manage");
    const faqs = await db.cmsFaq.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }] });
    return NextResponse.json({ faqs });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const body = await readJson<{ section?: string; category?: string; question?: string; answer?: string; sortOrder?: number }>(req);
    if (!body.question?.trim() || !body.answer?.trim()) return fail(400, "Question and answer are required");
    const section = ["home", "pricing", "knowledge"].includes(body.section || "") ? body.section! : "home";
    const faq = await db.cmsFaq.create({
      data: {
        section,
        category: body.category?.trim() || (section === "pricing" ? "Pricing" : "General"),
        question: body.question.trim().slice(0, 300),
        answer: body.answer.trim().slice(0, 3000),
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 99,
      },
    });
    return NextResponse.json({ ok: true, faq });
  } catch (err) {
    return handleError(err);
  }
}
