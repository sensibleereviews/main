import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformPerm } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";

// Admin → Clients → data subject requests (doc §2B "Process customer export and
// deletion requests" + §2L). GET streams the full tenant bundle as a downloadable
// JSON file and audits the access.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformPerm("clients_manage");
    const { id } = await params;
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        plan: true, locations: true, reviews: { include: { location: true } },
        campaigns: true, invoices: true, users: true, issues: true, contacts: true,
        waOptOuts: true, feedback: true, activities: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!tenant) return fail(404, "Tenant not found");

    const bundle = {
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      tenant: {
        id: tenant.id, name: tenant.name, slug: tenant.slug, category: tenant.category,
        plan: tenant.plan?.name, billingCycle: tenant.billingCycle, status: tenant.status,
        mrrInr: tenant.mrrInr, gstin: tenant.gstin,
        contact: { name: tenant.contactName, email: tenant.contactEmail, phone: tenant.contactPhone },
        createdAt: tenant.createdAt,
      },
      locations: tenant.locations,
      reviews: tenant.reviews.map((r) => ({
        id: r.id, author: r.author, stars: r.stars, text: r.text, sentiment: r.sentiment,
        status: r.status, reply: r.replyText, location: r.location.name, createdAt: r.createdAt,
      })),
      campaigns: tenant.campaigns,
      invoices: tenant.invoices,
      users: tenant.users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active })),
      issues: tenant.issues,
      contacts: tenant.contacts.map((c) => ({ name: c.name, phone: c.phone, consent: c.consent, source: c.source })),
      guestFeedback: tenant.feedback,
      auditTrail: tenant.activities.map((a) => ({ actor: a.actor, action: a.action, detail: a.detail, at: a.createdAt })),
    };

    await db.activityLog.create({
      data: { tenantId: id, actor: `admin:${admin.email}`, action: "data.exported", detail: "Full workspace data exported (DPDP subject-access request)" },
    });

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sensiblee-export-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
