import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// Initiate an online payment order (Razorpay)
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("settings_manage");
    const body = await readJson<{ invoiceId?: string; planId?: string; cycle?: string }>(req);

    let amountInr = 0;
    let description = "Sensiblee Subscription";
    let invoiceNumber = "";
    let targetInvoiceId = body.invoiceId;

    if (body.invoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: body.invoiceId } });
      if (!invoice || invoice.tenantId !== sess.tenantId) return fail(404, "Invoice not found");
      amountInr = invoice.amountInr;
      description = `Invoice ${invoice.number} Payment`;
      invoiceNumber = invoice.number;
    } else if (body.planId) {
      const plan = await db.plan.findUnique({ where: { id: body.planId } });
      if (!plan) return fail(404, "Plan not found");
      const cycle = body.cycle || "monthly";
      amountInr = cycle === "annual" ? plan.annualInr : cycle === "half_yearly" ? plan.halfYearlyInr : plan.monthlyInr;
      description = `Sensiblee ${plan.name} Plan (${cycle})`;
    } else {
      return fail(400, "invoiceId or planId required");
    }

    // Read configured Razorpay gateway credentials from the DB
    const gateway = await db.gatewayConfig.findUnique({ where: { provider: "razorpay" } });
    const keyId = process.env.RAZORPAY_KEY_ID || gateway?.keyId || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || gateway?.keySecret || "";

    const hasLiveKeys = Boolean(keyId && keySecret && gateway?.enabled);

    if (hasLiveKeys) {
      try {
        const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInr * 100, // paise
            currency: "INR",
            receipt: invoiceNumber || `rcpt_${Date.now()}`,
            notes: {
              tenantId: sess.tenantId!,
              invoiceId: targetInvoiceId || "",
              invoiceNumber,
            },
          }),
        });

        if (orderRes.ok) {
          const orderData = (await orderRes.json()) as { id: string; amount: number; currency: string };
          return NextResponse.json({
            orderId: orderData.id,
            amount: amountInr,
            currency: "INR",
            keyId,
            description,
            live: true,
          });
        }
      } catch (err) {
        console.warn("[razorpay-checkout] online order creation failed, falling back to simulation:", err);
      }
    }

    // Simulation / demo checkout order
    const simOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return NextResponse.json({
      orderId: simOrderId,
      amount: amountInr,
      currency: "INR",
      keyId: keyId || "rzp_test_placeholder",
      description,
      live: false,
    });
  } catch (err) {
    return handleError(err);
  }
}
