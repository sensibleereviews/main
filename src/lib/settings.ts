import { db } from "@/lib/db";

// GST rate — single editable source (CmsSetting "tax_percent", 0–50, default 18).
// Read by the public plans API (pricing display), billing surfaces and invoices.
export const TAX_KEY = "tax_percent";
export const TAX_PERCENT_DEFAULT = 18;

export async function readTaxPercent(): Promise<number> {
  try {
    const row = await db.cmsSetting.findUnique({ where: { key: TAX_KEY } });
    const n = Number(row?.value);
    if (!Number.isFinite(n)) return TAX_PERCENT_DEFAULT;
    return Math.min(50, Math.max(0, Math.round(n * 100) / 100));
  } catch {
    return TAX_PERCENT_DEFAULT;
  }
}
