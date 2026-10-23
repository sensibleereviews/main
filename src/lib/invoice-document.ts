import { PdfDoc, A4, INK, MUTED, BRAND, MINT, LINE, inrPdf2, fmtDate } from "@/lib/pdf";

// GST tax invoice — taxes are computed from the single editable tax_percent setting,
// the same source that drives the public pricing page (round(amount × rate) rounding).

export type InvoicePdfInput = {
  number: string;
  status: string;
  method: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  dueAt: Date | string;
  paidAt?: Date | string | null;
  amountInr: number;
  taxPercent: number;
  tenant: {
    name: string;
    contactName: string;
    contactEmail: string;
    gstin?: string | null;
    planName: string;
    billingCycle: string;
  };
};

export function gstBreakup(amountInr: number, taxPercent: number) {
  const gst = Math.round((amountInr * taxPercent) / 100);
  return { subtotal: amountInr, gst, total: amountInr + gst };
}

const CYCLE_LABEL: Record<string, string> = { monthly: "Monthly", half_yearly: "Half-yearly", annual: "Annual" };

export function buildInvoicePdf(i: InvoicePdfInput): Uint8Array {
  const doc = new PdfDoc();
  const M = 48; // margin
  const W = A4.w - M * 2;
  const { subtotal, gst, total } = gstBreakup(i.amountInr, i.taxPercent);

  // Header band
  doc.rect(0, A4.h - 92, A4.w, 92, { fill: BRAND });
  doc.text(M, A4.h - 44, "sensiblee", { size: 21, bold: true, color: [1, 1, 1] });
  doc.text(M, A4.h - 62, "AI reputation management for restaurants & service brands", { size: 8.5, color: MINT });
  doc.textRight(A4.w - M, A4.h - 44, "TAX INVOICE", { size: 14, bold: true, color: [1, 1, 1] });
  doc.textRight(A4.w - M, A4.h - 62, i.number, { size: 9, color: MINT });

  let y = A4.h - 122;

  // Parties
  const colW = W / 2 - 10;
  doc.text(M, y, "Billed by", { size: 8, bold: true, color: MUTED });
  doc.text(M + colW + 20, y, "Billed to", { size: 8, bold: true, color: MUTED });
  y -= 15;
  doc.text(M, y, "Sensiblee Technologies Pvt. Ltd.", { size: 10.5, bold: true });
  doc.text(M + colW + 20, y, i.tenant.name, { size: 10.5, bold: true });
  y -= 13.5;
  doc.paragraph(M, y, colW, "4th Floor, Workamp HSR, Bengaluru 560102, Karnataka, India", { size: 8.5, color: MUTED, leading: 11 });
  const rightY0 = y;
  doc.paragraph(M + colW + 20, rightY0, colW, `Attn: ${i.tenant.contactName} · ${i.tenant.contactEmail}`, { size: 8.5, color: MUTED, leading: 11 });
  y -= 26;
  doc.text(M, y, "GSTIN: 29AAGCS2026F1Z8 · State: 29 Karnataka", { size: 8.5, color: MUTED });
  doc.text(M + colW + 20, y, i.tenant.gstin ? `Customer GSTIN: ${i.tenant.gstin}` : "Customer GSTIN: Unregistered (B2C)", { size: 8.5, color: MUTED });

  y -= 24;
  doc.line(M, y, A4.w - M, y, LINE);

  // Meta grid
  y -= 18;
  const isIntraState = !i.tenant.gstin || i.tenant.gstin.startsWith("29");
  const pos = isIntraState ? "29 - Karnataka" : `${i.tenant.gstin?.slice(0, 2) || "29"} - Inter-State`;
  const meta: [string, string][] = [
    ["Invoice date", fmtDate(i.periodStart)],
    ["Billing period", `${fmtDate(i.periodStart)} – ${fmtDate(i.periodEnd)}`],
    ["Payment method", i.method],
    ["Payment status", i.status.toUpperCase() + (i.paidAt ? ` · ${fmtDate(i.paidAt)}` : i.status !== "paid" ? ` · due ${fmtDate(i.dueAt)}` : "")],
  ];
  const col = W / 2;
  meta.forEach(([k, v], idx) => {
    const x = M + (idx % 2) * col;
    const yy = y - Math.floor(idx / 2) * 26;
    doc.text(x, yy, k, { size: 7.5, bold: true, color: MUTED });
    doc.text(x, yy - 12, v, { size: 9.5 });
  });
  y -= 62;

  // Line items table
  doc.rect(M, y - 4, W, 20, { fill: [0.955, 0.975, 0.965] });
  doc.text(M + 10, y + 9, "Description", { size: 8.5, bold: true, color: MUTED });
  doc.text(A4.w - M - 120, y + 9, "SAC Code", { size: 8.5, bold: true, color: MUTED });
  doc.textRight(A4.w - M - 10, y + 9, "Amount", { size: 8.5, bold: true, color: MUTED });
  y -= 8;

  const desc = `Sensiblee ${i.tenant.planName} subscription — ${CYCLE_LABEL[i.tenant.billingCycle] || i.tenant.billingCycle} · monitoring, review requests, AI assistance & analytics`;
  doc.paragraph(M + 10, y - 14, W - 180, desc, { size: 9.5, leading: 13 });
  doc.text(A4.w - M - 120, y - 14, "998314", { size: 9.5 });
  doc.textRight(A4.w - M - 10, y - 14, inrPdf2(subtotal), { size: 9.5 });
  y -= 44;
  doc.line(M, y, A4.w - M, y, LINE);

  // Totals
  y -= 22;
  doc.textRight(A4.w - M - 150, y, "Subtotal (exclusive of GST)", { size: 9.5, color: MUTED });
  doc.textRight(A4.w - M - 10, y, inrPdf2(subtotal), { size: 9.5 });
  y -= 17;
  const gstLabel = isIntraState ? "GST @ 18% (CGST 9% + SGST 9%)" : "IGST @ 18% (Inter-State Supply)";
  doc.textRight(A4.w - M - 150, y, gstLabel, { size: 9.5, color: MUTED });
  doc.textRight(A4.w - M - 10, y, inrPdf2(gst), { size: 9.5 });

  y -= 14;
  doc.rect(A4.w - M - 170, y - 26, 170, 28, { fill: MINT });
  doc.textRight(A4.w - M - 12, y - 7, "Total payable", { size: 10.5, bold: true, color: BRAND });
  doc.textRight(A4.w - M - 12, y - 20, inrPdf2(total), { size: 11.5, bold: true, color: BRAND });
  y -= 46;

  // Notes
  doc.paragraph(M, y, W, `SAC 998314: Information Technology Software Services (SaaS). Place of supply: ${pos}. Legally compliant Indian B2B tax invoice under CGST Act. This is a computer-generated invoice and does not require a physical signature.`, { size: 8, color: MUTED, leading: 11 });

  // Footer
  doc.line(M, 84, A4.w - M, 84, LINE);
  doc.text(M, 68, "Thank you for building your reputation with Sensiblee.", { size: 8.5, color: MUTED });
  doc.textRight(A4.w - M, 68, "billing@sensiblee.in · sensiblee.in", { size: 8.5, color: MUTED });
  doc.text(M, 56, `Questions about this invoice? Reply to billing@sensiblee.in quoting ${i.number}.`, { size: 7.5, color: MUTED });

  return doc.build();
}
