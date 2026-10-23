import { db } from "@/lib/db";

// Payment gateway management plane: system-level registry (admin configures
// credentials + master enable) × per-tenant provisioning = how a workspace's
// billing is collected. This build manages provisioning only — actual charge
// capture stays behind the simulated checkout until real keys are wired.

export type GatewayDef = { provider: string; label: string; description: string; enabledByDefault: boolean };

export const GATEWAY_CATALOG: GatewayDef[] = [
  {
    provider: "razorpay",
    label: "Razorpay",
    description: "UPI, cards, net-banking and auto-debit mandates — the primary collection rail for INR subscriptions.",
    enabledByDefault: true,
  },
  {
    provider: "cashfree",
    label: "Cashfree",
    description: "Alternative INR collection with same-day settlements and UPI autopay support.",
    enabledByDefault: false,
  },
  {
    provider: "stripe",
    label: "Stripe",
    description: "International cards for overseas franchises billing outside the INR rails.",
    enabledByDefault: false,
  },
];

// Idempotent catalog seeding — safe to call on every request path
export async function ensureGatewaySeeds(): Promise<void> {
  await Promise.all(
    GATEWAY_CATALOG.map((g) =>
      db.gatewayConfig.upsert({
        where: { provider: g.provider },
        update: {},
        create: { provider: g.provider, label: g.label, description: g.description, enabled: g.enabledByDefault },
      }),
    ),
  );
}

export type MaskedGateway = {
  provider: string;
  label: string;
  description: string;
  enabled: boolean;
  keyId: string;
  keySecretMasked: string; // "" when unset; last-4 when set
  webhookSecretMasked: string;
  hasCredentials: boolean;
  updatedAt: string;
};

// Never return raw secrets — mask to last 4 characters
export function maskSecret(value: string): string {
  if (!value) return "";
  const tail = value.slice(-4);
  return `••••••••${tail}`;
}

export function maskGateway(g: {
  provider: string; label: string; description: string; enabled: boolean;
  keyId: string; keySecret: string; webhookSecret: string; updatedAt: Date;
}): MaskedGateway {
  return {
    provider: g.provider,
    label: g.label,
    description: g.description,
    enabled: g.enabled,
    keyId: g.keyId,
    keySecretMasked: maskSecret(g.keySecret),
    webhookSecretMasked: maskSecret(g.webhookSecret),
    hasCredentials: Boolean(g.keyId && g.keySecret),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export type ActiveGateway = {
  provider: string;
  label: string;
  mode: string; // test | live
  status: string; // active | paused
  accountRef: string;
  methodLabel: string; // e.g. "Auto-debit · Razorpay"
};

// The provisioned gateway for one tenant (system-enabled + link active)
export async function activeGatewayFor(tenantId: string): Promise<ActiveGateway | null> {
  const links = await db.tenantGateway.findMany({
    where: { tenantId },
    include: { gateway: true },
    orderBy: { provisionedAt: "asc" },
  });
  const link = links.find((l) => l.gateway.enabled && l.status === "active");
  if (!link) return null;
  return {
    provider: link.gateway.provider,
    label: link.gateway.label,
    mode: link.mode,
    status: link.status,
    accountRef: link.accountRef,
    methodLabel: methodLabelFor(link.gateway.label),
  };
}

export function methodLabelFor(gatewayLabel: string): string {
  return `Auto-debit · ${gatewayLabel}`;
}
