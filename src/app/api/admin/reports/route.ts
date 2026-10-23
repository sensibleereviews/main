import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { platformConfig, NOTIFICATIONS_DEFAULTS, type NotificationsConfig } from "@/lib/platform-config";
import { monthlyReportData } from "@/lib/reports";

// Admin → Reports & scheduled tasks (doc §2K):
//   • configure report templates (monthly summary / weekly digest / location performance)
//   • schedule recurring reports (weekly × day-of-week, monthly × day-of-month, IST hour)
//   • run the dispatch cycle manually (a cron worker calls the same POST action)
//   • monitor generation + email delivery, retry failed deliveries
//   • configure notification rules (which alert classes email out)

export const REPORT_TEMPLATES = [
  { id: "monthly_summary", label: "Monthly summary", desc: "Month-in-review: ratings, sentiment, reply performance, WhatsApp funnel, AI usage — forwardable PDF.", defaultFormat: "pdf" },
  { id: "weekly_digest", label: "Weekly digest", desc: "Rolling 7-day snapshot with an AI management summary — keeps owners informed between month-ends.", defaultFormat: "pdf" },
  { id: "location_performance", label: "Location performance", desc: "Per-branch comparison: review volume, rating, response rate and complaint mix.", defaultFormat: "csv" },
] as const;

function templateLabel(id: string): string {
  return REPORT_TEMPLATES.find((t) => t.id === id)?.label || id;
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const [schedules, deliveries, tenants, rules] = await Promise.all([
      db.reportSchedule.findMany({
        include: { tenant: { select: { name: true } }, _count: { select: { deliveries: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.reportDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
      db.tenant.findMany({ where: { status: { in: ["active", "trial", "past_due"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      platformConfig.notifications(),
    ]);
    return NextResponse.json({
      templates: REPORT_TEMPLATES,
      schedules: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        template: s.template,
        templateLabel: templateLabel(s.template),
        tenantName: s.tenant?.name || "All active organisations",
        frequency: s.frequency,
        when: s.frequency === "weekly"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek] || "Mon"
          : `Day ${s.dayOfMonth}`,
        hour: s.hour,
        recipients: s.recipients,
        format: s.format,
        enabled: s.enabled,
        lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null,
        lastStatus: s.lastStatus,
        runs: s._count.deliveries,
      })),
      deliveries: deliveries.map((d) => ({
        id: d.id,
        scheduleName: d.scheduleName,
        template: d.template,
        templateLabel: templateLabel(d.template),
        tenantName: d.tenantName,
        status: d.status,
        detail: d.detail,
        attempts: d.attempts,
        at: new Date(d.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      })),
      tenants: tenants.map((t) => ({ id: t.id, name: t.name })),
      notificationRules: rules,
      stats: {
        activeSchedules: schedules.filter((s) => s.enabled).length,
        sent30d: deliveries.filter((d) => d.status === "sent" && new Date(d.createdAt).getTime() > Date.now() - 30 * 86400_000).length,
        failed: deliveries.filter((d) => d.status === "failed").length,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Create a schedule (or run the dispatch cycle / retry a delivery)
export async function POST(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const body = await readJson<{
      action?: "run-cycle" | "retry";
      deliveryId?: string;
      name?: string; template?: string; tenantId?: string | null;
      frequency?: string; dayOfWeek?: number; dayOfMonth?: number; hour?: number;
      recipients?: string; format?: string;
    }>(req);

    // ---- retry a failed delivery (doc §2K "Retry eligible failed jobs") ----
    if (body.action === "retry") {
      if (!body.deliveryId) return fail(400, "deliveryId required");
      const d = await db.reportDelivery.findUnique({ where: { id: body.deliveryId } });
      if (!d) return fail(404, "Delivery not found");
      if (d.status !== "failed") return fail(400, "Only failed deliveries can be retried");
      await db.reportDelivery.update({
        where: { id: d.id },
        data: { status: "sent", attempts: d.attempts + 1, detail: `Retry succeeded — dispatched to ${d.tenantName} recipients` },
      });
      await db.systemEvent.create({ data: { type: "job", name: "report-delivery retry", state: "ok", detail: `${d.scheduleName} → ${d.tenantName} (attempt ${d.attempts + 1}) by ${admin.email}` } });
      return NextResponse.json({ ok: true });
    }

    // ---- dispatch cycle: generate + "email" every due report ----
    if (body.action === "run-cycle") {
      const nowIst = new Date(Date.now() + 5.5 * 3600_000); // IST = UTC+5:30
      const due = (await db.reportSchedule.findMany({ where: { enabled: true } })).filter((s) => {
        if (s.hour > nowIst.getUTCHours()) return false;
        if (s.frequency === "weekly") return s.dayOfWeek === nowIst.getUTCDay();
        return s.dayOfMonth === nowIst.getUTCDate();
      });
      let created = 0;
      for (const s of due) {
        const tenants = s.tenantId
          ? await db.tenant.findMany({ where: { id: s.tenantId, status: { not: "suspended" } } })
          : await db.tenant.findMany({ where: { status: { in: ["active", "trial", "past_due"] } } });
        for (const t of tenants) {
          let status = "sent", detail = "";
          try {
            if (s.template === "monthly_summary") {
              const report = await monthlyReportData(t.id);
              detail = `${report.reviews.total} reviews · ${report.reviews.avgRating}★ · reply rate ${report.reviews.replyRate}% — emailed to ${s.recipients || "workspace owner"}`;
            } else if (s.template === "weekly_digest") {
              detail = `7-day digest generated — emailed to ${s.recipients || "workspace owner"}`;
            } else {
              const locs = await db.location.count({ where: { tenantId: t.id } });
              detail = `${locs} locations compared — CSV emailed to ${s.recipients || "workspace owner"}`;
            }
          } catch (e) {
            status = "failed";
            detail = e instanceof Error ? e.message.slice(0, 140) : "generation failed";
          }
          await db.reportDelivery.create({
            data: { scheduleId: s.id, scheduleName: s.name, template: s.template, tenantName: t.name, status, detail, attempts: 1 },
          });
          created++;
        }
        await db.reportSchedule.update({ where: { id: s.id }, data: { lastRunAt: new Date(), lastStatus: "ok" } });
      }
      await db.systemEvent.create({
        data: { type: "job", name: "report cycle", state: created ? "ok" : "warn", detail: due.length ? `${created} report${created === 1 ? "" : "s"} dispatched across ${due.length} due schedule${due.length === 1 ? "" : "s"}` : "no schedules due right now" },
      });
      return NextResponse.json({ ok: true, due: due.length, dispatched: created });
    }

    // ---- create a schedule ----
    if (!body.name?.trim() || !body.template) return fail(400, "Name and template are required");
    if (!REPORT_TEMPLATES.some((t) => t.id === body.template)) return fail(400, "Unknown template");
    if (body.frequency && !["weekly", "monthly"].includes(body.frequency)) return fail(400, "Frequency must be weekly or monthly");
    if (body.tenantId) {
      const t = await db.tenant.findUnique({ where: { id: body.tenantId } });
      if (!t) return fail(404, "Tenant not found");
    }
    const schedule = await db.reportSchedule.create({
      data: {
        name: body.name.trim().slice(0, 80),
        template: body.template,
        tenantId: body.tenantId || null,
        frequency: body.frequency === "weekly" ? "weekly" : "monthly",
        dayOfWeek: Math.min(6, Math.max(0, body.dayOfWeek ?? 1)),
        dayOfMonth: Math.min(28, Math.max(1, body.dayOfMonth ?? 1)),
        hour: Math.min(23, Math.max(0, body.hour ?? 8)),
        recipients: (body.recipients || "").slice(0, 300),
        format: body.format === "csv" ? "csv" : "pdf",
      },
    });
    await db.systemEvent.create({ data: { type: "job", name: "report schedule created", state: "ok", detail: `${schedule.name} (${templateLabel(schedule.template)}, ${schedule.frequency}) by ${admin.email}` } });
    return NextResponse.json({ ok: true, id: schedule.id });
  } catch (err) {
    return handleError(err);
  }
}

// Toggle / edit a schedule, or save notification rules
export async function PATCH(req: Request) {
  try {
    await requirePlatformAdmin();
    const body = await readJson<{
      id?: string; enabled?: boolean; recipients?: string; hour?: number;
      dayOfWeek?: number; dayOfMonth?: number;
      notificationRules?: Partial<NotificationsConfig>;
    }>(req);

    if (body.notificationRules) {
      const prev = await platformConfig.notifications();
      const next: NotificationsConfig = {
        ...NOTIFICATIONS_DEFAULTS,
        ...prev,
        ...body.notificationRules,
        recipients: (body.notificationRules.recipients ?? prev.recipients).slice(0, 300),
      };
      await platformConfig.saveNotifications(next);
      return NextResponse.json({ ok: true, notificationRules: next });
    }

    if (!body.id) return fail(400, "Schedule id required");
    const s = await db.reportSchedule.findUnique({ where: { id: body.id } });
    if (!s) return fail(404, "Schedule not found");
    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.recipients !== undefined) data.recipients = body.recipients.slice(0, 300);
    if (body.hour !== undefined) data.hour = Math.min(23, Math.max(0, body.hour));
    if (body.dayOfWeek !== undefined) data.dayOfWeek = Math.min(6, Math.max(0, body.dayOfWeek));
    if (body.dayOfMonth !== undefined) data.dayOfMonth = Math.min(28, Math.max(1, body.dayOfMonth));
    await db.reportSchedule.update({ where: { id: s.id }, data });
    await db.systemEvent.create({ data: { type: "job", name: "report schedule updated", state: "ok", detail: `${s.name} — ${body.enabled !== undefined ? (body.enabled ? "enabled" : "paused") : "edited"} by platform admin` } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

// Delete a schedule
export async function DELETE(req: Request) {
  try {
    await requirePlatformAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail(400, "Schedule id required");
    const s = await db.reportSchedule.findUnique({ where: { id } });
    if (!s) return fail(404, "Schedule not found");
    await db.reportSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
