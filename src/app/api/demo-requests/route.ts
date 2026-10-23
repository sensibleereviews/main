import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, requireFields } from "@/lib/api";

// Public: book a demo → lands in the platform pipeline
export async function POST(req: Request) {
  try {
    const body = await readJson<{ name?: string; email?: string; company?: string; phone?: string; outlets?: string; message?: string }>(req);
    requireFields(body, ["name", "email", "company"]);
    const demo = await db.demoRequest.create({
      data: {
        name: body.name!.trim(), email: body.email!.trim().toLowerCase(),
        company: body.company!.trim(), phone: body.phone || null,
        outlets: body.outlets || null, message: body.message || null,
      },
    });
    await db.systemEvent.create({
      data: { type: "signal", name: "New demo request", state: "ok", detail: `${demo.company} · ${demo.email}`, createdAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

// Admin: pipeline list (all platform staff roles)
export async function GET() {
  try {
    await requirePlatformAdmin();
    const items = await db.demoRequest.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      items: items.map((d) => ({
        id: d.id, name: d.name, email: d.email, company: d.company, phone: d.phone,
        outlets: d.outlets, message: d.message, status: d.status,
        date: new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
