import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser, requireTenantPerm } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { whatsappConnector } from "@/lib/connectors";
import { computeFunnel } from "@/lib/analytics";
import { toCampaignVM } from "@/lib/viewmodels";
import { platformConfig } from "@/lib/platform-config";
import { isFlagEffective } from "@/lib/flags";
import { safeJson } from "@/lib/viewmodels";
import { getScopedLocationIds } from "@/lib/tenant-scope";

export async function GET() {
  try {
    const sess = await requireTenantUser();
    const scopedIds = await getScopedLocationIds(sess);
    const [campaigns, reviews, locations] = await Promise.all([
      db.campaign.findMany({
        where: {
          tenantId: sess.tenantId!,
          ...(scopedIds ? { locationId: { in: scopedIds } } : {}),
        },
        include: { location: true },
        orderBy: { createdAt: "desc" },
      }),
      db.review.findMany({
        where: {
          tenantId: sess.tenantId!,
          ...(scopedIds ? { locationId: { in: scopedIds } } : {}),
        },
        select: { source: true, createdAt: true },
      }),
      db.location.findMany({
        where: {
          tenantId: sess.tenantId!,
          ...(scopedIds ? { id: { in: scopedIds } } : {}),
        },
      }),
    ]);
    const { funnel, stats } = computeFunnel(reviews as never, campaigns);
    return NextResponse.json({
      campaigns: campaigns.map(toCampaignVM),
      funnel,
      stats,
      locations: locations.map((l) => ({ id: l.id, code: l.code, name: l.name, short: l.name.replace(/^Spice Route\s+/, ""), contactBookSize: l.contactBookSize })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// Create & launch a WhatsApp / QR campaign.
// Compliance gates (doc §1E/§2G): system flag × tenant opt-in, platform pause,
// quiet hours and the daily sending limit — plus consent-aware recipients from
// the guest contact book when contacts exist.
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("campaigns_manage");
    const body = await readJson<{ name?: string; templateName?: string; templateBody?: string; locationIds?: string[]; sendNow?: boolean }>(req);
    if (!body.templateName) return NextResponse.json({ error: "Pick a template first" }, { status: 400 });

    // Feature-flag gate — system master × workspace opt-in
    if (!(await isFlagEffective(sess.tenantId!, "whatsapp_requests"))) {
      return NextResponse.json({ error: "WhatsApp review requests are not enabled for this workspace — turn the feature on under Settings → Feature flags." }, { status: 403 });
    }
    // Platform-wide pause (admin → Integrations)
    const integrations = await platformConfig.integrations();
    if (integrations.whatsapp.paused) {
      return NextResponse.json({ error: "Outbound WhatsApp is paused by the platform administrator. Campaigns are saved as scheduled and will not dispatch until it resumes." }, { status: 503 });
    }

    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! } });
    const settings = safeJson<{ waCompliance?: { quietStart?: number; quietEnd?: number; dailyLimit?: number } }>(tenant?.settings || "{}", {});
    const waCfg = {
      quietStart: settings.waCompliance?.quietStart ?? integrations.whatsapp.quietStart,
      quietEnd: settings.waCompliance?.quietEnd ?? integrations.whatsapp.quietEnd,
      dailyLimit: settings.waCompliance?.dailyLimit ?? integrations.whatsapp.dailyLimit,
    };

    const locationIds = body.locationIds?.length ? body.locationIds : [];
    const locations = await db.location.findMany({
      where: { tenantId: sess.tenantId!, ...(locationIds.length ? { id: { in: locationIds } } : {}) },
    });
    if (!locations.length) return NextResponse.json({ error: "Select at least one audience location" }, { status: 400 });

    // Recipients: consent-aware contact book when populated, legacy book size otherwise
    const eligibleContacts = await db.contact.count({ where: { tenantId: sess.tenantId!, consent: true, optedOut: false } });
    const recipients = eligibleContacts > 0 ? eligibleContacts : locations.reduce((a, l) => a + l.contactBookSize, 0);
    if (!recipients) return NextResponse.json({ error: "No eligible guests yet — import contacts with consent under Requests → Guest contacts" }, { status: 400 });

    // Quiet hours + daily sending limit (IST)
    const istHour = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
    const inQuietHours = waCfg.quietStart > waCfg.quietEnd
      ? istHour >= waCfg.quietStart || istHour < waCfg.quietEnd
      : istHour >= waCfg.quietStart && istHour < waCfg.quietEnd;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await db.campaign.aggregate({ where: { tenantId: sess.tenantId!, createdAt: { gte: startOfDay } }, _sum: { sent: true } });
    const sentTodayN = sentToday._sum.sent || 0;
    const overLimit = sentTodayN + recipients > waCfg.dailyLimit;

    const primary = locations[0];
    let result = { recipients, sent: 0, opened: 0, clicked: 0 };
    let status = body.sendNow === false ? "scheduled" : "running";
    let heldReason: string | null = null;
    if (inQuietHours || overLimit) {
      // Hold rather than hard-fail: the campaign is queued for the next window
      status = "scheduled";
      heldReason = inQuietHours
        ? `Quiet hours (${String(waCfg.quietEnd).padStart(2, "0")}:00–${String(waCfg.quietStart).padStart(2, "0")}:00 IST) — dispatches automatically after ${String(waCfg.quietEnd).padStart(2, "0")}:00`
        : `Daily limit reached (${sentTodayN}/${waCfg.dailyLimit} sent today) — queued for tomorrow`;
    } else {
      result = await whatsappConnector.sendBurst({ recipients, templateName: body.templateName, tenantName: tenant?.name || "Tenant" });
    }

    const campaign = await db.campaign.create({
      data: {
        tenantId: sess.tenantId!,
        locationId: locations.length === 1 ? primary.id : null,
        name: body.name || `${body.templateName} — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        channel: "whatsapp", template: body.templateBody || body.templateName,
        recipients: result.recipients, sent: result.sent, opened: result.opened, clicked: result.clicked,
        reviewsGenerated: 0, status,
      },
      include: { location: true },
    });
    await db.activityLog.create({
      data: {
        tenantId: sess.tenantId!, actor: sess.email, action: "campaign.sent",
        detail: heldReason
          ? `${campaign.name} · ${recipients} recipients held — ${heldReason}`
          : `${campaign.name} · ${result.sent} requests · ${result.opened} opened (${whatsappConnector.mode()} mode)`,
      },
    });
    return NextResponse.json({ campaign: toCampaignVM(campaign), provider: whatsappConnector.mode(), held: heldReason });
  } catch (err) {
    return handleError(err);
  }
}
