import { db } from "@/lib/db";

// Feature-flag lifecycle: system-level master switch (admin → System) × tenant opt-in = effective.
// A flag that is system-disabled is effectively OFF for every tenant, and tenants cannot opt in.

export type FlagDef = { key: string; label: string; description: string };

export const FLAG_DEFAULTS: FlagDef[] = [
  {
    key: "whatsapp_requests",
    label: "WhatsApp review requests",
    description: "Send review invitations over the WhatsApp Business Cloud API with pre-approved templates and per-guest opt-in records.",
  },
  {
    key: "monthly_pdf",
    label: "Monthly PDF report",
    description: "Automated month-in-review PDF: ratings, sentiment split, reply performance, WhatsApp funnel and AI usage — ready to forward to owners.",
  },
  {
    key: "ai_metering",
    label: "AI usage metering",
    description: "Meter every AI draft and classification against the plan quota, with a live usage dashboard and CSV export.",
  },
];

// Create any missing flag rows (idempotent, safe to call on every request path)
export async function ensureFlagSeeds(): Promise<void> {
  await Promise.all(
    FLAG_DEFAULTS.map((f) =>
      db.featureFlag.upsert({
        where: { key: f.key },
        update: {},
        create: { key: f.key, label: f.label, description: f.description, enabled: f.key === "whatsapp_requests" },
      }),
    ),
  );
}

export type FlagState = {
  key: string;
  label: string;
  description: string;
  systemEnabled: boolean;
  optedIn: boolean;
  effective: boolean; // systemEnabled && optedIn
};

// Effective flags for one tenant — system master × tenant opt-in
export async function effectiveFlagsFor(tenantId: string): Promise<FlagState[]> {
  await ensureFlagSeeds();
  const [flags, optIns] = await Promise.all([
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
    db.tenantFlag.findMany({ where: { tenantId } }),
  ]);
  const opted = new Map(optIns.map((o) => [o.flagId, o.optedIn]));
  return flags.map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
    systemEnabled: f.enabled,
    optedIn: opted.get(f.id) ?? false,
    effective: f.enabled && (opted.get(f.id) ?? false),
  }));
}

export async function isFlagEffective(tenantId: string, key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key }, include: { optIns: { where: { tenantId } } } });
  return Boolean(flag?.enabled && flag.optIns[0]?.optedIn);
}

// Tenant opt-in / opt-out — refused while the system master is off
export async function setTenantOptIn(tenantId: string, key: string, optedIn: boolean): Promise<FlagState[]> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  if (!flag) throw new Error(`Unknown flag: ${key}`);
  if (optedIn && !flag.enabled) throw new Error("This feature is not currently available — contact Sensiblee support.");
  const existing = await db.tenantFlag.findUnique({
    where: { tenantId_flagId: { tenantId, flagId: flag.id } },
  });
  if (existing) {
    await db.tenantFlag.update({ where: { id: existing.id }, data: { optedIn, optedAt: new Date() } });
  } else {
    await db.tenantFlag.create({ data: { tenantId, flagId: flag.id, optedIn } });
  }
  return effectiveFlagsFor(tenantId);
}
