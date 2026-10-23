import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.cmsTestimonial.findMany({ select: { name: true, role: true, quote: true } });
for (const r of rows) {
  const longWords = [...r.quote.split(/\s+/), ...r.role.split(/\s+/)].filter((w) => w.length > 18);
  console.log(r.name, "| role:", r.role, "| longTokens:", JSON.stringify(longWords));
}
await p.$disconnect();
