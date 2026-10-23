// Feature flags — single source of truth for optional platform capabilities.
// Two levels:
//   1. System level  → FeatureFlag table (platform admin toggles in Admin → System)
//   2. Tenant level  → Tenant.settings JSON `flags` (owner toggles in Settings → Channels)
// Effective availability = systemEnabled AND tenant override !== false.
// Flags are consumed by marketing pricing (plan line items), requests/campaigns,
// onboarding, notifications copy and the client Settings channels card.
import { db } from "./db";
import { safeJson } from "./viewmodels";

export type FlagKey = "whatsapp_channel" | "email_channel" | "in_app_notifications" | "ai_assistant";

export type FlagMeta = {
  key: FlagKey;
  label: string;
  description: string;
  category: "communication" | "intelligence" | "delivery";
  phase: string;
  defaultEnabled: boolean;
};

// Catalog is code-owned so the UI can render stable copy even if the DB row is
// missing (fresh installs before seeding, read-only replicas, etc.).
export const FLAG_CATALOG: FlagMeta[] = [
  {
    key: "whatsapp_channel",
    label: "WhatsApp channel",
    description:
      "WhatsApp Cloud API as a communication layer — review requests, digests, alerts and payment links. Planned for the Phase 2 platform augmentation; while off, requests run over email + QR and notifications fall back to email / in-app.",
    category: "communication",
    phase: "Phase 2",
    defaultEnabled: false,
  },
  {
    key: "email_channel",
    label: "Email channel",
    description:
      "Transactional email — review requests without WhatsApp, daily digests, instant alerts, invoices and receipts.",
    category: "communication",
    phase: "Phase 1",
    defaultEnabled: true,
  },
  {
    key: "in_app_notifications",
    label: "In-app notifications",
    description:
      "Dashboard alert centre — urgent reviews, sync failures and billing events surfaced inside the workspace.",
    category: "communication",
    phase: "Phase 1",
    defaultEnabled: true,
  },
  {
    key: "ai_assistant",
    label: "AI assistant",
    description:
      "AI reply drafting, sentiment classification, keyword radar and usage metering. Core Phase 1 intelligence layer.",
    category: "intelligence",
    phase: "Phase 1",
    defaultEnabled: true,
  },
];

export type SystemFlags = Record<FlagKey, boolean>;

export function defaultFlags(): SystemFlags {
  return Object.fromEntries(FLAG_CATALOG.map((f) => [f.key, f.defaultEnabled])) as SystemFlags;
}

// System-level map — resilient: falls back to catalog defaults on any DB error
// so pricing/marketing surfaces never break because of a flags hiccup.
export async function getSystemFlags(): Promise<SystemFlags> {
  const flags = defaultFlags();
  try {
    const rows = await db.featureFlag.findMany();
    for (const row of rows) {
      if (row.key in flags) flags[row.key as FlagKey] = row.systemEnabled;
    }
  } catch {
    // keep defaults
  }
  return flags;
}

export type TenantChannels = {
  whatsapp: { system: boolean; tenant: boolean; effective: boolean; phase: string };
  email: { system: boolean; tenant: boolean; effective: boolean; phase: string };
  inApp: { system: boolean; tenant: boolean; effective: boolean; phase: string };
  ai: { system: boolean; tenant: boolean; effective: boolean; phase: string };
};

// Tenant-level override lives in Tenant.settings.flags as { [flagKey]: boolean }.
// Absent = opted in. WhatsApp phase label is surfaced so the UI can explain why
// the channel is unavailable ("ships in Phase 2").
export function tenantChannels(system: SystemFlags, settingsJson: string | null | undefined): TenantChannels {
  const overrides: Record<FlagKey, boolean | undefined> = {
    whatsapp_channel: undefined, email_channel: undefined,
    in_app_notifications: undefined, ai_assistant: undefined,
    ...safeJson<{ flags?: Record<string, boolean> }>(settingsJson || "{}", {}).flags,
  };
  const eff = (key: FlagKey) => system[key] && overrides[key] !== false;
  return {
    whatsapp: { system: system.whatsapp_channel, tenant: overrides.whatsapp_channel !== false, effective: eff("whatsapp_channel"), phase: "Phase 2" },
    email: { system: system.email_channel, tenant: overrides.email_channel !== false, effective: eff("email_channel"), phase: "Phase 1" },
    inApp: { system: system.in_app_notifications, tenant: overrides.in_app_notifications !== false, effective: eff("in_app_notifications"), phase: "Phase 1" },
    ai: { system: system.ai_assistant, tenant: overrides.ai_assistant !== false, effective: eff("ai_assistant"), phase: "Phase 1" },
  };
}

export async function tenantChannelsFor(tenantId: string): Promise<TenantChannels> {
  const [system, tenant] = await Promise.all([
    getSystemFlags(),
    db.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }),
  ]);
  return tenantChannels(system, tenant?.settings ?? null);
}

export function setFlagInSettings(settingsJson: string, key: FlagKey, enabled: boolean): string {
  const s = safeJson<Record<string, unknown>>(settingsJson, {});
  const flags = { ...((s.flags as Record<string, boolean>) || {}), [key]: enabled };
  return JSON.stringify({ ...s, flags });
}
