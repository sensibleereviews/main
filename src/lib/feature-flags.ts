// Feature-flag helpers — system-level FeatureFlag rows + tenant-level opt-in
// stored in Tenant.settings.channels. A channel is usable only when BOTH allow it.
import { db } from "@/lib/db";
import { safeJson } from "@/lib/viewmodels";

export const WHATSAPP_FLAG = "whatsapp_requests";

export type TenantChannels = { whatsapp: boolean };
export type EffectiveFlags = {
  whatsapp: {
    key: string;
    label: string;
    description: string;
    system: boolean;
    tenant: boolean;
    effective: boolean;
    updatedAt: string | null;
  };
};

export function tenantChannels(settings: string | null | undefined): TenantChannels {
  const s = safeJson<Record<string, unknown>>(settings || "{}", {});
  const ch = s.channels && typeof s.channels === "object" ? (s.channels as Record<string, unknown>) : {};
  return { whatsapp: ch.whatsapp === true };
}

export async function getSystemFlag(key: string) {
  return db.featureFlag.findUnique({ where: { key } });
}

export async function effectiveFlags(tenantSettings: string | null | undefined): Promise<EffectiveFlags> {
  const flag = await getSystemFlag(WHATSAPP_FLAG);
  const tenantOn = tenantChannels(tenantSettings).whatsapp;
  const systemOn = flag?.enabled ?? false;
  return {
    whatsapp: {
      key: WHATSAPP_FLAG,
      label: flag?.label || "WhatsApp review requests",
      description: flag?.description || "",
      system: systemOn,
      tenant: tenantOn,
      effective: systemOn && tenantOn,
      updatedAt: flag?.updatedAt ? flag.updatedAt.toISOString() : null,
    },
  };
}
