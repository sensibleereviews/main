import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJson, handleError } from "@/lib/api";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

// Self-service password reset request (email dispatch)
export async function POST(req: Request) {
  try {
    const { email } = await readJson<{ email?: string }>(req);
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email: cleanEmail } });

    // Always respond with success to prevent user enumeration
    if (!user || !user.active) {
      return NextResponse.json({
        ok: true,
        message: "If an account exists with this email, a password reset link has been dispatched.",
      });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 3600_000; // 1 hour

    // Store token securely in cmsSetting
    await db.cmsSetting.upsert({
      where: { key: `auth.reset.${token}` },
      create: {
        key: `auth.reset.${token}`,
        value: JSON.stringify({ userId: user.id, email: user.email, expiresAt }),
      },
      update: {
        value: JSON.stringify({ userId: user.id, email: user.email, expiresAt }),
      },
    });

    const origin = req.headers.get("origin") || req.headers.get("host") || "http://localhost:3000";
    const baseUrl = origin.startsWith("http") ? origin : `http://${origin}`;
    const resetUrl = `${baseUrl}/login?resetToken=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({
      ok: true,
      message: "If an account exists with this email, a password reset link has been dispatched.",
    });
  } catch (err) {
    return handleError(err);
  }
}
