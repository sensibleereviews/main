// Marketing CMS — site settings (banner + contact details): read (operators) + update
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin, requirePlatformPerm } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { TAX_KEY, TAX_PERCENT_DEFAULT } from "@/lib/settings";

const ALLOWED = ["banner_enabled", "banner_text", "banner_link", "contact_phone", "contact_whatsapp", "contact_email", TAX_KEY];

export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.cmsSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return NextResponse.json({
      settings: {
        banner_enabled: map.banner_enabled === "true" ? "true" : "false",
        banner_text: map.banner_text || "",
        banner_link: map.banner_link || "",
        contact_phone: map.contact_phone || "",
        contact_whatsapp: map.contact_whatsapp || "",
        contact_email: map.contact_email || "",
        tax_percent: map.tax_percent ?? String(TAX_PERCENT_DEFAULT),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request) {
  try {
    await requirePlatformPerm("website_manage");
    const body = await readJson<Record<string, string>>(req);
    for (const key of ALLOWED) {
      if (body[key] === undefined) continue;
      let value = key === "banner_enabled" ? (body[key] === "true" ? "true" : "false") : String(body[key]).slice(0, 300);
      if (key === TAX_KEY) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 50) {
          return NextResponse.json({ error: "Tax rate must be a number between 0 and 50." }, { status: 400 });
        }
        value = String(Math.round(n * 100) / 100);
      }
      await db.cmsSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
