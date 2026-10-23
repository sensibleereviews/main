// Apply gateway demo provisioning to the live DB (idempotent) — mirrors prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

(async () => {
  const cat = [
    { provider: "razorpay", label: "Razorpay", description: "UPI, cards, net-banking and auto-debit mandates — the primary collection rail for INR subscriptions.", enabled: true, keyId: "rzp_test_demo123" },
    { provider: "cashfree", label: "Cashfree", description: "Alternative INR collection with same-day settlements and UPI autopay support.", enabled: false },
    { provider: "stripe", label: "Stripe", description: "International cards for overseas franchises billing outside the INR rails.", enabled: false },
  ];
  for (const g of cat) {
    await db.gatewayConfig.upsert({ where: { provider: g.provider }, update: g, create: g });
  }
  const razorpay = await db.gatewayConfig.findUnique({ where: { provider: "razorpay" } });

  const names = ["Spice Route Kitchen", "Cafe Mandala", "Iron & Iris Fitness"];
  const tenants = await db.tenant.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
  const tn = (name) => tenants.find((t) => t.name === name)?.id;
  const provisions = [
    { tenantId: tn("Spice Route Kitchen"), mode: "live", accountRef: "acct_spk_live_01" },
    { tenantId: tn("Cafe Mandala"), mode: "test", accountRef: "" },
    { tenantId: tn("Iron & Iris Fitness"), mode: "test", accountRef: "" },
  ].filter((p) => Boolean(p.tenantId));

  await db.tenantGateway.deleteMany(); // reseed provisions idempotently
  for (const p of provisions) {
    await db.tenantGateway.create({ data: { ...p, gatewayId: razorpay.id, status: "active" } });
  }
  console.log(`gateways: ${await db.gatewayConfig.count()}, provisions: ${await db.tenantGateway.count()}`);
  await db.$disconnect();
})();
