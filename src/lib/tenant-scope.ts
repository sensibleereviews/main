// Tenant location scope helper — enforces branch-level access control (doc §1F)
import { db } from "./db";
import { SessionPayload } from "./auth";

/**
 * Returns:
 * - null: if the user has unrestricted workspace access (owner, platform staff, or no restrictions)
 * - string[]: if the user is a manager or teammate assigned to specific location IDs.
 */
export async function getScopedLocationIds(sess: SessionPayload): Promise<string[] | null> {
  if (!sess.tenantId) return null;

  // Platform admin/manager inspecting workspace has full visibility
  if (["platform_admin", "platform_manager"].includes(sess.role)) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: sess.uid },
    select: { role: true, locationIds: true },
  });

  if (!user) return null;

  // Workspace owner always sees all locations
  if (user.role === "owner") {
    return null;
  }

  // Branch managers & teammates: restrict to assigned locations if specified
  try {
    const raw = user.locationIds || "[]";
    const ids = JSON.parse(raw) as string[];
    if (Array.isArray(ids) && ids.length > 0) {
      return ids;
    }
  } catch {
    // If parse fails, fall through
  }

  return null;
}
