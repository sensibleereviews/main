// Audit: dump CMS DB rows for home + features modules; check six-component coverage
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const SIX = ["Reputation Command Center", "Reputation Health", "AI Reputation Copilot", "Review Growth Engine", "Location Intelligence", "Reputation Action Center"];

for (const slug of ["home", "features"]) {
  const row = await db.cmsPage.findUnique({ where: { slug } });
  if (!row) { console.log(`${slug}: NO DB ROW (defaults used)`); continue; }
  const c = JSON.parse(row.content);
  console.log(`\n=== ${slug} (updated ${row.updatedAt?.toISOString?.()}) ===`);
  console.log("keys:", Object.keys(c).join(", "));
  if (c.modules) {
    console.log(`modulesSection.title: ${JSON.stringify(c.modulesSection?.title ?? c.title ?? "")}`);
    console.log(`modules count: ${c.modules.length}`);
    for (const m of c.modules) console.log(`  - ${m.title ?? m.name}: ${(m.desc ?? "").slice(0, 80)}`);
  }
  const flat = JSON.stringify(c);
  for (const n of SIX) console.log(`  has "${n}": ${flat.includes(n)}`);
}
await db.$disconnect();
