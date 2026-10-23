import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";

// Real, scannable QR for a location's guest flow (encodes the absolute /g/<code> URL)
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return fail(400, "code is required");
    const location = await db.location.findFirst({ where: { code, tenantId: sess.tenantId! } });
    if (!location) return fail(404, "Location not found");

    const base = process.env.NEXT_PUBLIC_GUEST_URL || url.origin;
    const guestUrl = `${base.replace(/\/$/, "")}/g/${location.code}`;
    const dataUrl = await QRCode.toDataURL(guestUrl, {
      width: 480, margin: 2,
      color: { dark: "#1f2937", light: "#fefcf5" },
      errorCorrectionLevel: "M",
    });
    return NextResponse.json({ dataUrl, url: guestUrl });
  } catch (err) {
    return handleError(err);
  }
}
