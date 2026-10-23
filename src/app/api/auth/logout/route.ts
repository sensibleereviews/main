import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { handleError } from "@/lib/api";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
