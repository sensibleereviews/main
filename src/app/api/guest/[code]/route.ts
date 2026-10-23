import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError } from "@/lib/api";

// Public guest endpoint — the table-tent QR lands here
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const location = await db.location.findUnique({
      where: { code },
      include: { tenant: { select: { name: true, whatsappName: true } } },
    });
    if (!location) return NextResponse.json({ error: "This QR code is not active" }, { status: 404 });
    return NextResponse.json({
      location: {
        code: location.code,
        name: location.name,
        area: location.area,
        business: location.tenant.whatsappName || location.tenant.name,
        initials: location.tenant.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
        googleReviewUrl: location.googleReviewUrl,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
