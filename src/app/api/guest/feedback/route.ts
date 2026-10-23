import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError, readJson, requireFields, fail } from "@/lib/api";

// Guest submits mood / rating / private note — no auth, rate-limited by honesty for demo
export async function POST(req: Request) {
  try {
    const body = await readJson<{ code?: string; mood?: string; rating?: number; text?: string; optedIn?: boolean; phone?: string }>(req);
    requireFields(body, ["code", "mood"]);
    if (!["smile", "meh", "frown"].includes(body.mood!)) return fail(400, "Invalid mood");

    const location = await db.location.findUnique({ where: { code: body.code! } });
    if (!location) return fail(404, "This QR code is not active");

    const feedback = await db.guestFeedback.create({
      data: {
        locationId: location.id, tenantId: location.tenantId,
        mood: body.mood!, rating: body.rating ?? null, text: body.text?.slice(0, 800) || null,
        optedIn: !!body.optedIn, phone: body.phone || null,
      },
    });

    if (body.mood !== "smile") {
      await db.activityLog.create({
        data: {
          tenantId: location.tenantId, actor: "guest", action: "feedback.private",
          detail: `${body.mood === "frown" ? "Low" : "Neutral"} feedback at ${location.name}${body.text ? ` — "${body.text.slice(0, 60)}"` : ""} · manager alerted`,
        },
      });
    }
    return NextResponse.json({ ok: true, id: feedback.id });
  } catch (err) {
    return handleError(err);
  }
}
