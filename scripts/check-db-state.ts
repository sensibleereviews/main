import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const plans = await p.plan.findMany({ select: { name: true, monthlyInr: true, annualInr: true, popular: true }, orderBy: { monthlyInr: "asc" } });
  console.log(JSON.stringify(plans, null, 1));
  const cms = await p.cmsBlock.count();
  console.log("cmsBlocks:", cms);
}
main().finally(() => p.$disconnect());
