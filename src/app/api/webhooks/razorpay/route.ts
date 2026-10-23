import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";

// Razorpay Webhook Callback
// Verifies HMAC SHA-256 signature and automates invoice marking & subscription status
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const gateway = await db.gatewayConfig.findUnique({ where: { provider: "razorpay" } });
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || gateway?.webhookSecret || "sensiblee_razorpay_secret_2026";

    // Signature verification
    if (webhookSecret && signature) {
      const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      const valid = a.length === b.length && timingSafeEqual(a, b);

      if (!valid) {
        console.warn("[razorpay-webhook] invalid signature received");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            amount?: number; // in paise
            status?: string;
            method?: string;
            notes?: Record<string, string>;
            description?: string;
          };
        };
        order?: {
          entity?: {
            id?: string;
            receipt?: string;
            notes?: Record<string, string>;
          };
        };
      };
    };

    const event = payload.event || "";
    const payment = payload.payload?.payment?.entity;
    const notes = payment?.notes || payload.payload?.order?.entity?.notes || {};
    const invoiceNumber = notes.invoiceNumber || payload.payload?.order?.entity?.receipt;
    const invoiceId = notes.invoiceId;
    const tenantId = notes.tenantId;

    if (event === "payment.captured" || event === "order.paid") {
      let targetInvoice = null;
      if (invoiceId) {
        targetInvoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { tenant: true } });
      } else if (invoiceNumber) {
        targetInvoice = await db.invoice.findFirst({ where: { number: invoiceNumber }, include: { tenant: true } });
      } else if (tenantId) {
        targetInvoice = await db.invoice.findFirst({
          where: { tenantId, status: { in: ["pending", "overdue"] } },
          orderBy: { periodStart: "desc" },
          include: { tenant: true },
        });
      }

      if (targetInvoice) {
        const amountInr = payment?.amount ? Math.round(payment.amount / 100) : targetInvoice.amountInr;
        const method = payment?.method ? `Razorpay (${payment.method.toUpperCase()})` : "Razorpay · UPI/Card";

        await db.invoice.update({
          where: { id: targetInvoice.id },
          data: {
            status: "paid",
            paidAt: new Date(),
            method,
          },
        });

        // Activate workspace subscription and advance next invoice date
        const nextMonth = new Date(Date.now() + 30 * 86400_000);
        await db.tenant.update({
          where: { id: targetInvoice.tenantId },
          data: {
            status: "active",
            nextInvoiceAt: nextMonth,
          },
        });

        await db.activityLog.create({
          data: {
            tenantId: targetInvoice.tenantId,
            actor: "razorpay-webhook",
            action: "payment.captured",
            detail: `Payment of ₹${amountInr.toLocaleString("en-IN")} received online via ${method} for invoice ${targetInvoice.number}`,
          },
        });
      }
    } else if (event === "payment.failed") {
      if (invoiceId || invoiceNumber) {
        const inv = await db.invoice.findFirst({
          where: { OR: [{ id: invoiceId || "" }, { number: invoiceNumber || "" }] },
        });
        if (inv) {
          await db.invoice.update({ where: { id: inv.id }, data: { status: "overdue" } });
          await db.activityLog.create({
            data: {
              tenantId: inv.tenantId,
              actor: "razorpay-webhook",
              action: "payment.failed",
              detail: `Payment failed for invoice ${inv.number}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ status: "ok", processedEvent: event });
  } catch (err) {
    console.error("[razorpay-webhook] error processing:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
