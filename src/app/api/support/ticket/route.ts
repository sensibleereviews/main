import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError, readJson, fail } from "@/lib/api";

// Public: submit a support ticket → lands in the support desk queue
export async function POST(req: Request) {
  try {
    const body = await readJson<{
      name?: string;
      email?: string;
      business?: string;
      topic?: string;
      priority?: string;
      message?: string;
    }>(req);

    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const message = body.message?.trim() || "";
    if (name.length < 2) return fail(400, "Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "A valid email is required");
    if (message.length < 15) return fail(400, "Please describe the issue (min 15 characters)");

    const priority = ["low", "normal", "high"].includes(body.priority || "") ? body.priority! : "normal";
    const topic = body.topic?.trim() || "Technical issue";

    // Human-friendly ticket number, unique per millis
    const number = `SS-T-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const ticket = await db.supportTicket.create({
      data: { number, name, email, business: body.business?.trim() || null, topic, priority, message },
    });

    return NextResponse.json({ ok: true, ticket: { number: ticket.number, id: ticket.id } });
  } catch (err) {
    return handleError(err);
  }
}
