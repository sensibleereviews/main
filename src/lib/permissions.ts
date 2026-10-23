// Permission catalog + role resolution — single source of truth for both dashboards.
// Owners (tenant) and super admins (platform) implicitly hold every permission ("*").
// Legacy string roles map to fixed presets; CustomRole rows carry their own JSON sets.

export type PermissionDef = {
  id: string;
  group: string;
  label: string;
  desc: string;
};

/* ------------------------------- tenant ---------------------------------- */

export const TENANT_PERMISSIONS: PermissionDef[] = [
  { id: "reviews_view", group: "Reviews & feedback", label: "View reviews & guest feedback", desc: "See the review inbox, ratings and guest submissions across all locations" },
  { id: "reviews_reply", group: "Reviews & feedback", label: "Reply to reviews", desc: "Approve and publish replies to Google reviews, add internal notes" },
  { id: "ai_drafts", group: "Reviews & feedback", label: "Edit & regenerate AI drafts", desc: "Rework, regenerate and manage AI-suggested replies before approval" },
  { id: "locations_view", group: "Locations & campaigns", label: "View locations & QR codes", desc: "Browse branches, their QR guests flows and connection status" },
  { id: "locations_manage", group: "Locations & campaigns", label: "Add & edit locations", desc: "Create branches, edit details, regenerate QR guest links" },
  { id: "campaigns_manage", group: "Locations & campaigns", label: "Run review-request campaigns", desc: "Send WhatsApp / SMS review requests and manage templates" },
  { id: "analytics_view", group: "Insights & billing", label: "View analytics & reports", desc: "Dashboards, trends, staff mentions and keyword radar" },
  { id: "billing_view", group: "Insights & billing", label: "View plan & billing", desc: "See the current plan, usage meters and invoices" },
  { id: "settings_manage", group: "Administration", label: "Edit workspace settings", desc: "Brand profile, AI voice, notifications and WhatsApp sender identity" },
  { id: "team_manage", group: "Administration", label: "Manage team & roles", desc: "Invite teammates, edit their roles and build custom roles" },
];

export const TENANT_PRESETS: Record<string, string[]> = {
  manager: ["reviews_view", "reviews_reply", "ai_drafts", "locations_view", "locations_manage", "campaigns_manage", "analytics_view", "billing_view"],
  observer: ["reviews_view", "locations_view", "analytics_view"],
};

/* ------------------------------ platform ---------------------------------- */

export const PLATFORM_PERMISSIONS: PermissionDef[] = [
  { id: "clients_view", group: "Clients", label: "View clients", desc: "Browse client workspaces, their plans, usage and health" },
  { id: "clients_manage", group: "Clients", label: "Create & edit clients", desc: "Onboard clients, change plans, billing status and trials" },
  { id: "plans_manage", group: "Clients", label: "Edit pricing plans", desc: "Change plan pricing, limits and features shown on the site" },
  { id: "website_manage", group: "Website & content", label: "Edit marketing website (CMS)", desc: "Pages, blog, FAQs, testimonials, media and the announcement banner" },
  { id: "leads_manage", group: "Website & content", label: "Handle demo requests", desc: "Triage and update inbound demo / contact requests" },
  { id: "team_manage", group: "Platform administration", label: "Manage platform team & roles", desc: "Invite admin teammates, edit their roles and build custom roles" },
];

export const PLATFORM_PRESETS: Record<string, string[]> = {
  platform_manager: ["clients_view", "clients_manage", "plans_manage", "website_manage", "leads_manage"],
  platform_observer: ["clients_view"],
};

/* ------------------------------ resolution -------------------------------- */

export const ALL_PERMISSIONS = "*";

export function parseRolePermissions(role: { permissions: string }): string[] {
  try {
    const parsed = JSON.parse(role.permissions);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

// Effective permission ids for a user, given their role string and optional CustomRole.
export function effectivePermissions(
  role: string,
  roleRef?: { permissions: string } | null,
): string[] {
  if (role === "owner" || role === "platform_admin") return [ALL_PERMISSIONS];
  if (roleRef) return parseRolePermissions(roleRef);
  if (role in TENANT_PRESETS) return TENANT_PRESETS[role];
  if (role in PLATFORM_PRESETS) return PLATFORM_PRESETS[role];
  return [];
}

export function hasPerm(perms: string[] | undefined | null, perm: string): boolean {
  if (!perms) return false;
  return perms.includes(ALL_PERMISSIONS) || perms.includes(perm);
}

export function permissionCatalog(scope: "tenant" | "platform"): PermissionDef[] {
  return scope === "tenant" ? TENANT_PERMISSIONS : PLATFORM_PERMISSIONS;
}
