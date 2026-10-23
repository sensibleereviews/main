import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, signToken, setSessionCookie, RESTORE_COOKIE, getSession } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { cookies } from "next/headers";

// Start a time-boxed impersonation session as the tenant's owner.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const tenant = await db.tenant.findUnique({ where: { id }, include: { users: true } });
    if (!tenant) return fail(404, "Tenant not found");
    const owner = tenant.users.find((u) => u.role === "owner") || tenant.users[0];
    if (!owner) return fail(400, "Tenant has no users to impersonate");

    const jar = await cookies();
    const adminToken = jar.get("ss_session")?.value; // preserve for restore
    const impToken = signToken(
      { uid: owner.id, role: owner.role, name: owner.name, email: owner.email, tenantId: tenant.id, imp: admin.uid },
      0.02 // ~30 minutes
    );
    if (adminToken) jar.set(RESTORE_COOKIE, adminToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 1800 });
    await setSessionCookie(impToken);
    await db.activityLog.create({
      data: { tenantId: tenant.id, actor: `admin:${admin.email}`, action: "impersonation.start", detail: `Session started as ${owner.name} · 30 min time-box` },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

void getSession;
