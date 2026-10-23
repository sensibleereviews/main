import { NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { effectiveFlagsFor, setTenantOptIn } from "@/lib/flags";

// Tenant view of feature flags — system master × tenant opt-in = effective
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const flags = await effectiveFlagsFor(sess.tenantId!);
    return NextResponse.json({ flags });
  } catch (err) {
    return handleError(err);
  }
}

// Opt in / out of a flag — refused while the platform master switch is off
export async function PATCH(req: Request) {
  try {
    const sess = await requireTenantUser();
    const body = await readJson<{ key?: string; optedIn?: boolean }>(req);
    if (!body.key || typeof body.optedIn !== "boolean") {
      return NextResponse.json({ error: "key and optedIn are required" }, { status: 400 });
    }
    try {
      const flags = await setTenantOptIn(sess.tenantId!, body.key, body.optedIn);
      return NextResponse.json({ flags });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update flag" }, { status: 400 });
    }
  } catch (err) {
    return handleError(err);
  }
}
