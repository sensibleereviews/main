// Sensiblee tax helpers — shared by server libs (cms.ts, reports.ts, API routes)
// and client components. Kept dependency-free so both bundles can import it.
// The rate itself is CMS-editable (CmsSetting key "tax_percent", admin console →
// Website → Tax); everything here just normalizes + formats it.

export const DEFAULT_TAX_PERCENT = 18;
export const MAX_TAX_PERCENT = 40;

// Parse arbitrary input (DB string, form field) into a safe rate: a finite
// number clamped to 0..MAX, rounded to 1 decimal. Returns null when unusable.
export function sanitizeTaxPercent(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).trim().replace("%", ""));
  if (!Number.isFinite(n) || n < 0 || n > MAX_TAX_PERCENT) return null;
  return Math.round(n * 10) / 10;
}

// "18" | "12.5" | "5" — no trailing .0, matches how Indian GST slabs are written.
export function taxLabel(p: number): string {
  return Number.isInteger(p) ? String(p) : String(Math.round(p * 10) / 10);
}

// CGST/SGST split — each half of the headline rate (18% → CGST 9% + SGST 9%).
export function taxHalfLabel(p: number): string {
  return taxLabel(Math.round((p / 2) * 100) / 100);
}

// GST amount on an invoice, rounded to whole rupees (the convention every
// invoice surface already uses: 4999 @ 18% → 900).
export function gstOf(amountInr: number, percent: number): number {
  return Math.round((amountInr * percent) / 100);
}
