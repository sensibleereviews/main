// Shared GST invoice viewer — used by the admin Billing view and the client
// (tenant) Billing view. Contains the amount-in-words helpers, the GST split,
// the self-contained printable HTML document and the on-screen paper preview.
// The modal fetches {endpoint}/{id}; admins use /api/admin/invoices, tenants
// use /api/billing/invoices (tenant-scoped server-side).
"use client";

import { Button } from "@/components/ui/button";
import { useApiData } from "@/lib/client";
import { Printer } from "./deps";

export type InvoiceDetail = {
  invoice: {
    id: string; number: string; status: string; method: string; amountInr: number;
    periodStart: string; periodEnd: string; dueAt: string; paidAt: string | null;
    remindersSent: number; createdAt: string;
  };
  tenant: {
    name: string; gstin: string | null; contactName: string; contactEmail: string;
    contactPhone: string | null; plan: string; billingCycle: string;
  };
};

const ONES = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnder100(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
}

function wordsUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${h ? `${ONES[h]} Hundred${r ? " " : ""}` : ""}${r ? wordsUnder100(r) : ""}`;
}

// Amount in words (Indian numbering) — standard on GST invoices
export function inrWords(n: number): string {
  if (n === 0) return "Zero Rupees Only";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${wordsUnder1000(crore)} Crore`);
  if (lakh) parts.push(`${wordsUnder100(lakh)} Lakh`);
  if (thousand) parts.push(`${wordsUnder100(thousand)} Thousand`);
  if (rest) parts.push(wordsUnder1000(rest));
  return `${parts.join(" ")} Rupees Only`;
}

export const invDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const invoiceCycleLabel = (c: string) => (c === "annual" ? "Annual" : c === "half_yearly" ? "Half-yearly" : "Monthly");

// GST split — Sensiblee supplies from Karnataka (29).
// If customer GSTIN is outside Karnataka (state code != 29), IGST 18% applies.
// Intra-state supply applies CGST 9% + SGST 9%.
export function gstSplit(amountInr: number, gstin?: string | null) {
  const base = Math.round(amountInr / 1.18);
  const gst = amountInr - base;
  const isInterState = Boolean(gstin && gstin.trim().length >= 2 && !gstin.trim().startsWith("29"));
  if (isInterState) {
    return { base, cgst: 0, sgst: 0, igst: gst, total: amountInr, isInterState: true };
  }
  const cgst = Math.round(gst / 2);
  return { base, cgst, sgst: gst - cgst, igst: 0, total: amountInr, isInterState: false };
}

// Self-contained printable A4 invoice document (opens in a print window)
export function invoiceHtml(d: InvoiceDetail): string {
  const inv = d.invoice;
  const t = d.tenant;
  const g = gstSplit(inv.amountInr, t.gstin);
  const statusColor = inv.status === "paid" ? "#3f9163" : inv.status === "overdue" ? "#dc2626" : "#6b7280";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pos = g.isInterState ? `${t.gstin?.slice(0, 2) || "—"} - Inter-State Supply` : "29 - Karnataka (Intra-State Supply)";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.number)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #f3f4f6; padding: 24px; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; padding: 44px 48px; border-radius: 10px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #12203a; }
  .brand span { color: #3f9163; }
  .muted { color: #6b7280; font-size: 11.5px; line-height: 1.55; }
  .doc-title { font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #3f9163; text-transform: uppercase; }
  .stamp { display: inline-block; margin-top: 10px; padding: 4px 14px; border: 2px solid ${statusColor}; color: ${statusColor}; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
  .grid { display: flex; justify-content: space-between; gap: 40px; margin-top: 34px; }
  .grid h4 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 8px; }
  .grid p { font-size: 13px; line-height: 1.65; }
  .meta td { padding: 3px 0; font-size: 12.5px; }
  .meta td:first-child { color: #6b7280; padding-right: 22px; }
  .meta td:last-child { font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 34px; }
  table.items th { background: #12203a; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 11px 14px; text-align: left; }
  table.items th:nth-child(2), table.items td:nth-child(2) { text-align: center; width: 110px; }
  table.items th:last-child, table.items td:last-child { text-align: right; width: 130px; }
  table.items td { padding: 13px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  table.totals { width: 48%; margin-left: auto; margin-top: 22px; border-collapse: collapse; }
  table.totals td { padding: 7px 14px; font-size: 13px; }
  table.totals td:last-child { text-align: right; font-weight: 600; }
  table.totals tr.grand td { border-top: 2px solid #12203a; font-size: 15px; font-weight: 800; color: #12203a; padding-top: 11px; }
  .words { margin-top: 18px; font-size: 12px; color: #4b5563; }
  .words b { color: #12203a; }
  .foot { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; line-height: 1.7; }
  @media print { body { background: #fff; padding: 0; } .sheet { border-radius: 0; padding: 24px 8px; } }
</style></head><body>
<div class="sheet">
  <div class="head">
    <div>
      <div class="brand">Sensiblee<span>.</span></div>
      <p class="muted"><b>Sensiblee Technologies Pvt. Ltd.</b><br/>4th Floor, Workamp HSR, Bengaluru 560102, Karnataka, India<br/><b>Sensiblee GSTIN:</b> 29AAGCS2026F1Z8 · <b>State:</b> 29 (Karnataka)<br/>billing@sensiblee.in</p>
    </div>
    <div style="text-align:right">
      <p class="doc-title">Tax Invoice</p>
      <p class="stamp">${esc(inv.status)}</p>
    </div>
  </div>
  <div class="grid">
    <div>
      <h4>Billed to</h4>
      <p><b>${esc(t.name)}</b><br/>Attn: ${esc(t.contactName)}<br/>${esc(t.contactEmail)}${t.contactPhone ? ` · ${esc(t.contactPhone)}` : ""}<br/><b>Customer GSTIN:</b> ${esc(t.gstin || "Unregistered (B2C)")}<br/><b>Place of Supply:</b> ${esc(pos)}</p>
    </div>
    <div>
      <h4>Invoice details</h4>
      <table class="meta">
        <tr><td>Invoice no.</td><td>${esc(inv.number)}</td></tr>
        <tr><td>Issue date</td><td>${invDate(inv.createdAt)}</td></tr>
        <tr><td>Billing period</td><td>${invDate(inv.periodStart)} – ${invDate(inv.periodEnd)}</td></tr>
        <tr><td>Due date</td><td>${invDate(inv.dueAt)}</td></tr>
        <tr><td>Payment method</td><td>${esc(inv.method)}</td></tr>
        ${inv.paidAt ? `<tr><td>Paid on</td><td>${invDate(inv.paidAt)}</td></tr>` : ""}
      </table>
    </div>
  </div>
  <table class="items">
    <tr><th>Description</th><th>SAC Code</th><th>Amount</th></tr>
    <tr>
      <td><b>${esc(t.plan)} plan</b> · ${invoiceCycleLabel(t.billingCycle)} subscription<br/><span style="color:#6b7280;font-size:12px">AI-powered reputation management — review monitoring, review requests, AI reply assistant and analytics.</span></td>
      <td style="font-weight:600;font-family:monospace;color:#4b5563">998314</td>
      <td>₹${g.base.toLocaleString("en-IN")}</td>
    </tr>
  </table>
  <table class="totals">
    <tr><td>Taxable value</td><td>₹${g.base.toLocaleString("en-IN")}</td></tr>
    ${g.isInterState ? `<tr><td>IGST @ 18% (Inter-State)</td><td>₹${g.igst.toLocaleString("en-IN")}</td></tr>` : `<tr><td>CGST @ 9%</td><td>₹${g.cgst.toLocaleString("en-IN")}</td></tr><tr><td>SGST @ 9%</td><td>₹${g.sgst.toLocaleString("en-IN")}</td></tr>`}
    <tr class="grand"><td>Total</td><td>₹${g.total.toLocaleString("en-IN")}</td></tr>
  </table>
  <p class="words"><b>Amount in words:</b> ${inrWords(inv.amountInr)}</p>
  <div class="foot">
    <b>SAC 998314:</b> Information Technology Software Services (SaaS). This is a legally compliant Indian B2B tax invoice under CGST Act.
    Payments are collected via Razorpay (UPI / cards / netbanking) and reconciled automatically. Questions? Write to billing@sensiblee.in.
  </div>
</div>
</body></html>`;
}
    This is a computer-generated invoice. Payments are collected via Razorpay (UPI / cards / netbanking) and reconciled automatically.
    Questions? Write to hello@sensiblee.in — Sensiblee by Naqsh Digital Technologies, Bengaluru.
  </div>
</div>
</body></html>`;
}

export function InvoiceModal({ id, onClose, endpoint = "/api/admin/invoices" }: { id: string; onClose: () => void; endpoint?: string }) {
  const detail = useApiData<InvoiceDetail>(`${endpoint}/${id}`);
  const d = detail.data;

  const print = () => {
    if (!d) return;
    const w = window.open("", "_blank", "width=940,height=1100");
    if (!w) return;
    w.document.write(invoiceHtml(d));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-deep/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Invoice preview">
      <div className="mx-auto my-4 flex max-w-3xl items-center justify-between gap-3 pb-3">
        <p className="text-[13px] font-semibold text-white">{d ? `Invoice ${d.invoice.number}` : "Loading invoice…"}</p>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 rounded-xl bg-mint px-4 text-[12.5px] font-bold text-brand-deep hover:bg-mint/90" disabled={!d} onClick={print}>
            <Printer size={13} className="mr-1.5" /> Print / Save PDF
          </Button>
          <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/15 bg-transparent px-4 text-[12.5px] text-white/70 hover:bg-white/5 hover:text-white" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      {!d ? (
        <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-brand" />
      ) : (
        <InvoicePaper d={d} />
      )}
    </div>
  );
}

// On-screen paper preview — mirrors the printed document
export function InvoicePaper({ d }: { d: InvoiceDetail }) {
  const inv = d.invoice;
  const t = d.tenant;
  const g = gstSplit(inv.amountInr, t.gstin);
  const statusColor = inv.status === "paid" ? "text-emerald-600 border-emerald-600" : inv.status === "overdue" ? "text-red-600 border-red-600" : "text-neutral-500 border-neutral-400";
  const pos = g.isInterState ? `${t.gstin?.slice(0, 2) || "—"} - Inter-State Supply` : "29 - Karnataka (Intra-State Supply)";
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-neutral-900 shadow-2xl lg:p-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[26px] font-extrabold tracking-tight text-[#12203a]">Sensiblee<span className="text-emerald-600">.</span></p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-neutral-500">
            <b className="text-neutral-700">Sensiblee Technologies Pvt. Ltd.</b><br />
            4th Floor, Workamp HSR, Bengaluru 560102, Karnataka, India<br />
            <b>Sensiblee GSTIN:</b> 29AAGCS2026F1Z8 · <b>State:</b> 29 (Karnataka)<br />
            billing@sensiblee.in
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold uppercase tracking-[3px] text-emerald-600">Tax Invoice</p>
          <span className={`mt-2 inline-flex rounded-full border-2 px-3.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[1.5px] ${statusColor}`}>
            {inv.status}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-10">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-neutral-400">Billed to</p>
          <p className="mt-2 text-[13px] leading-relaxed">
            <b>{t.name}</b><br />
            Attn: {t.contactName}<br />
            {t.contactEmail}{t.contactPhone ? ` · ${t.contactPhone}` : ""}<br />
            <b>Customer GSTIN:</b> {t.gstin || "Unregistered (B2C)"}<br />
            <b>Place of Supply:</b> {pos}
          </p>
        </div>
        <table className="text-[12.5px]">
          <tbody>
            <tr><td className="pr-6 py-[3px] text-neutral-500">Invoice no.</td><td className="py-[3px] font-semibold">{inv.number}</td></tr>
            <tr><td className="pr-6 py-[3px] text-neutral-500">Issue date</td><td className="py-[3px] font-semibold">{invDate(inv.createdAt)}</td></tr>
            <tr><td className="pr-6 py-[3px] text-neutral-500">Billing period</td><td className="py-[3px] font-semibold">{invDate(inv.periodStart)} – {invDate(inv.periodEnd)}</td></tr>
            <tr><td className="pr-6 py-[3px] text-neutral-500">Due date</td><td className="py-[3px] font-semibold">{invDate(inv.dueAt)}</td></tr>
            <tr><td className="pr-6 py-[3px] text-neutral-500">Payment method</td><td className="py-[3px] font-semibold">{inv.method}</td></tr>
            {inv.paidAt && <tr><td className="pr-6 py-[3px] text-neutral-500">Paid on</td><td className="py-[3px] font-semibold">{invDate(inv.paidAt)}</td></tr>}
          </tbody>
        </table>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="bg-[#12203a] text-white">
            <th className="rounded-l-lg px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">Description</th>
            <th className="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider">SAC Code</th>
            <th className="rounded-r-lg px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="px-3.5 py-3.5 text-[13px]">
              <b>{t.plan} plan</b> · {invoiceCycleLabel(t.billingCycle)} subscription
              <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">
                AI-powered reputation management — review monitoring, review requests, AI reply assistant and analytics.
              </p>
            </td>
            <td className="px-3.5 py-3.5 text-center font-mono text-[12.5px] font-semibold text-neutral-600">998314</td>
            <td className="px-3.5 py-3.5 text-right text-[13px] font-semibold">₹{g.base.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>

      <table className="ml-auto mt-5 w-[48%] min-w-[280px] border-collapse text-[13px]">
        <tbody>
          <tr><td className="px-3.5 py-1.5 text-neutral-500">Taxable value</td><td className="px-3.5 py-1.5 text-right font-semibold">₹{g.base.toLocaleString("en-IN")}</td></tr>
          {g.isInterState ? (
            <tr><td className="px-3.5 py-1.5 text-neutral-500">IGST @ 18% (Inter-State)</td><td className="px-3.5 py-1.5 text-right font-semibold">₹{g.igst.toLocaleString("en-IN")}</td></tr>
          ) : (
            <>
              <tr><td className="px-3.5 py-1.5 text-neutral-500">CGST @ 9%</td><td className="px-3.5 py-1.5 text-right font-semibold">₹{g.cgst.toLocaleString("en-IN")}</td></tr>
              <tr><td className="px-3.5 py-1.5 text-neutral-500">SGST @ 9%</td><td className="px-3.5 py-1.5 text-right font-semibold">₹{g.sgst.toLocaleString("en-IN")}</td></tr>
            </>
          )}
          <tr className="border-t-2 border-[#12203a]">
            <td className="px-3.5 pt-2.5 text-[15px] font-extrabold text-[#12203a]">Total</td>
            <td className="px-3.5 pt-2.5 text-right text-[15px] font-extrabold text-[#12203a]">₹{g.total.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-5 text-[12px] text-neutral-600"><b className="text-[#12203a]">Amount in words:</b> {inrWords(inv.amountInr)}</p>

      <div className="mt-9 border-t border-neutral-200 pt-4 text-[11px] leading-relaxed text-neutral-400">
        <b>SAC 998314:</b> Information Technology Software Services (SaaS). This is a legally compliant Indian B2B tax invoice under CGST Act.
        Payments are collected via Razorpay (UPI / cards / netbanking) and reconciled automatically. Questions? Write to billing@sensiblee.in.
      </div>
    </div>
  );
}
