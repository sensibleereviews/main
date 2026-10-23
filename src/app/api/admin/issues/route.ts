import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { platformConfig, ESCALATION_DEFAULTS, type EscalationConfig } from "@/lib/platform-config";

// Admin → Issues: cross-organisation issue oversight — unresolved high-priority,
// overdue tracking, escalation rules and the assignment audit trail.
export async function GET() {
  try {
    await requirePlatformAdmin();
    const cfg = await platformConfig.escalation();
    const issues = await db.issue.findMany({
      include: { tenant: { select: { name: true } }, location: { select: { name: true, area: true } } },
      orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    });

    const overdueFor = (i: { dueDate: Date | null; status: string }) =>
      i.status !== "resolved" && i.dueDate && new Date(i.dueDate).getTime() < Date.now();

    const rows = issues.map((i) => ({
      id: i.id,
      tenant: i.tenant.name,
      location: i.location ? `${i.location.name} · ${i.location.area}` : "—",
      title: i.title,
      category: i.category,
      severity: i.severity,
      status: i.status,
      mentions: i.mentions,
      trendPct: i.prevMentions ? Math.round(((i.mentions - i.prevMentions) / i.prevMentions) * 100) : null,
      owner: i.owner,
      dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null,
      overdue: overdueFor(i),
      escalated: i.escalated,
      ageDays: Math.max(0, Math.round((Date.now() - new Date(i.createdAt).getTime()) / 86_400_000)),
    }));

    const stats = {
      total: rows.length,
      open: rows.filter((r) => r.status === "open").length,
      highPriority: rows.filter((r) => r.severity === "high" && r.status !== "resolved").length,
      overdue: rows.filter((r) => r.overdue).length,
      escalated: rows.filter((r) => r.escalated).length,
    };

    // assignment/status audit trail — most recent 20 issue events
    const audit = await db.activityLog.findMany({
      where: { action: { startsWith: "issue." } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      config: cfg,
      stats,
      issues: rows,
      audit: audit.map((a) => ({
        id: a.id, actor: a.actor, action: a.action, detail: a.detail,
        at: new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH — escalate an issue (severity → high + flag) or push a due date
export async function PATCH(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const body = await readJson<{ id: string; action: "escalate" | "set-due"; dueDate?: string }>(req);
    const issue = await db.issue.findUnique({ where: { id: body.id }, include: { tenant: { select: { name: true } } } });
    if (!issue) return fail(404, "Issue not found");

    if (body.action === "escalate") {
      const updated = await db.issue.update({
        where: { id: issue.id },
        data: { severity: "high", escalated: true },
      });
      await db.activityLog.create({
        data: { tenantId: issue.tenantId, actor: `admin:${admin.email}`, action: "issue.escalated", detail: `${issue.title} @ ${issue.tenant.name} escalated to high` },
      });
      await db.systemEvent.create({
        data: { type: "signal", name: "Issue escalated", state: "warn", detail: `${issue.tenant.name}: ${issue.title}` },
      });
      return NextResponse.json({ issue: { id: updated.id, severity: updated.severity, escalated: updated.escalated } });
    }

    if (body.action === "set-due") {
      const due = body.dueDate ? new Date(body.dueDate) : null;
      const updated = await db.issue.update({ where: { id: issue.id }, data: { dueDate: due } });
      await db.activityLog.create({
        data: { tenantId: issue.tenantId, actor: `admin:${admin.email}`, action: "issue.due_set", detail: `${issue.title} due ${due ? due.toLocaleDateString("en-IN") : "cleared"}` },
      });
      return NextResponse.json({ issue: { id: updated.id, dueDate: updated.dueDate } });
    }

    return fail(400, "Unknown action");
  } catch (err) {
    return handleError(err);
  }
}

// PUT — save escalation rules (overdue days, auto-escalate)
export async function PUT(req: Request) {
  try {
    await requirePlatformAdmin();
    const body = await readJson<Partial<EscalationConfig>>(req);
    const cfg = await platformConfig.escalation();
    const next: EscalationConfig = {
      overdueDays: Math.max(0, body.overdueDays ?? cfg.overdueDays),
      autoEscalate: body.autoEscalate ?? cfg.autoEscalate,
    };
    await platformConfig.saveEscalation(next);
    return NextResponse.json({ config: next });
  } catch (err) {
    return handleError(err);
  }
}
