import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformConfig } from "@/lib/platform-config";

// Meta WhatsApp Cloud API Webhook
// GET: Webhook verification challenge during setup in Meta Developer Portal
// POST: Inbound notifications (status updates + customer messages / opt-outs)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const cfg = await platformConfig.integrations().catch(() => null);
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || cfg?.whatsapp.webhookVerifyToken || "sensiblee_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      object?: string;
      entry?: {
        id?: string;
        changes?: {
          value?: {
            messaging_product?: string;
            metadata?: { phone_number_id?: string; display_phone_number?: string };
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
            messages?: {
              from?: string;
              id?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
            }[];
            statuses?: {
              id?: string;
              status?: string;
              timestamp?: string;
              recipient_id?: string;
              errors?: { code?: number; title?: string }[];
            }[];
          };
          field?: string;
        }[];
      }[];
    };

    if (!body || body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const changes = body.entry?.flatMap((e) => e.changes || []) || [];

    for (const change of changes) {
      const val = change.value;
      if (!val) continue;

      // 1. Inbound messages (opt-out handling: STOP / UNSUBSCRIBE / CANCEL)
      if (Array.isArray(val.messages)) {
        for (const msg of val.messages) {
          const from = msg.from ? msg.from.replace(/\D/g, "") : "";
          const text = msg.text?.body?.trim().toUpperCase() || "";

          const isOptOut = ["STOP", "UNSUBSCRIBE", "OPTOUT", "OPT-OUT", "CANCEL", "REMOVE"].includes(text);
          if (isOptOut && from) {
            // Find all contacts matching this phone number across tenants
            const matchingContacts = await db.contact.findMany({
              where: { phone: { contains: from.slice(-10) } },
              select: { tenantId: true, phone: true },
            });

            const tenantIds = matchingContacts.length
              ? [...new Set(matchingContacts.map((c) => c.tenantId))]
              : (await db.tenant.findMany({ select: { id: true }, take: 5 })).map((t) => t.id);

            for (const tenantId of tenantIds) {
              await db.waOptOut.upsert({
                where: { tenantId_phone: { tenantId, phone: from } },
                create: { tenantId, phone: from, reason: "opted_out", note: `Inbound STOP message received via Meta webhook` },
                update: { reason: "opted_out", note: `Inbound STOP message re-confirmed via Meta webhook` },
              });
              await db.contact.updateMany({
                where: { tenantId, phone: { contains: from.slice(-10) } },
                data: { optedOut: true },
              });
              await db.activityLog.create({
                data: {
                  tenantId,
                  actor: "whatsapp-webhook",
                  action: "guest.opt_out",
                  detail: `Guest (+${from}) opted out of WhatsApp review requests (STOP received)`,
                },
              });
            }
          } else if (from) {
            // General inbound response from guest
            const matchedTenant = await db.contact.findFirst({
              where: { phone: { contains: from.slice(-10) } },
              select: { tenantId: true },
            });
            if (matchedTenant) {
              await db.activityLog.create({
                data: {
                  tenantId: matchedTenant.tenantId,
                  actor: "guest",
                  action: "whatsapp.reply",
                  detail: `Inbound WhatsApp response from +${from}: "${msg.text?.body?.slice(0, 100) || ""}"`,
                },
              });
            }
          }
        }
      }

      // 2. Status updates (sent, delivered, read, failed)
      if (Array.isArray(val.statuses)) {
        for (const st of val.statuses) {
          if (st.status === "failed") {
            const errDetail = st.errors?.[0]?.title || "WhatsApp message delivery failed";
            await db.systemEvent.create({
              data: {
                type: "signal",
                name: "whatsapp-delivery-failure",
                state: "warn",
                detail: `Message to ${st.recipient_id} failed: ${errDetail}`,
              },
            }).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ status: "processed" }, { status: 200 });
  } catch (err) {
    console.error("[whatsapp-webhook] error processing callback:", err);
    return NextResponse.json({ status: "error", message: err instanceof Error ? err.message : "unknown" }, { status: 200 });
  }
}
