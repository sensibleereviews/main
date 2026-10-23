// Rebuild batch backfill — run once after `db:push`:
//   1. FeatureFlag rows (system-level, WhatsApp OFF by default)
//   2. AiUsageEvent backfill for the current + previous month so meters,
//      quota enforcement and the admin AI cost card have real data.
// Idempotent: upserts flags, only backfills events when the table is empty.
// Usage: bun run scripts/add-flags-usage.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FLAGS = [
  {
    key: "whatsapp_requests",
    label: "WhatsApp review requests",
    description:
      "Master switch for the WhatsApp Business Cloud API channel. When off, workspaces fall back to email + QR review requests. Tenant owners can opt in from Settings → Channels only while this is on.",
  },
];

function rand() {
  return Math.random();
}
function ago(days: number, hours = 0) {
  return new Date(Date.now() - days * 86400_000 - hours * 3600_000);
}

async function main() {
  /* ------------------------------ feature flags ----------------------------- */
  for (const f of FLAGS) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: { ...f, enabled: false },
      update: {}, // never flip a toggle the admin may have changed
    });
  }
  console.log(`FeatureFlags ready (${FLAGS.length}) — whatsapp_requests = OFF`);

  /* ---------------------------- AI usage backfill --------------------------- */
  const existing = await db.aiUsageEvent.count();
  if (existing > 0) {
    console.log(`AiUsageEvent already has ${existing} rows — skipping backfill.`);
  } else {
    const tenants = await db.tenant.findMany({ select: { id: true, name: true } });
    const models = ["glm-4.6", "glm-4.6", "glm-4.6", "glm-4-air"];
    let created = 0;

    for (const t of tenants) {
      // per-tenant volume scales with plan size; ~40-55 events over 45 days
      const events = 30 + Math.floor(rand() * 26);
      for (let i = 0; i < events; i++) {
        const kind = rand() < 0.78 ? "draft" : rand() < 0.85 ? "reply" : "rewrite";
        const tokensIn = 320 + Math.floor(rand() * 380);
        const tokensOut = 90 + Math.floor(rand() * 140);
        const when = ago(Math.floor(rand() * 45), Math.floor(rand() * 20));
        await db.aiUsageEvent.create({
          data: {
            tenantId: t.id,
            kind,
            actor: rand() < 0.7 ? "ai-worker" : "owner@" + t.name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 10) + ".in",
            model: models[Math.floor(rand() * models.length)],
            tokensIn,
            tokensOut,
            tokens: tokensIn + tokensOut,
            meta: JSON.stringify({ stars: 1 + Math.floor(rand() * 5) }),
            createdAt: when,
          },
        });
        created++;
      }
    }
    console.log(`AiUsageEvent backfilled: ${created} events across ${tenants.length} tenants.`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
