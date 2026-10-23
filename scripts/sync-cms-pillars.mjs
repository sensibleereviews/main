// Task 48 — re-sync CMS page content for home/features from the new six-pillar
// defaults (the DB rows predate the pillar rename). Other slugs untouched.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const { PAGE_CONTENT_DEFAULTS } = await import("../src/lib/cms-defaults2.ts").catch(() => ({ PAGE_CONTENT_DEFAULTS: null }));
  if (!PAGE_CONTENT_DEFAULTS) { console.log("no defaults"); return; }
  for (const slug of ["home", "features", "pricing"]) {
    const content = PAGE_CONTENT_DEFAULTS[slug];
    if (!content) continue;
    const row = await db.cmsPage.findUnique({ where: { slug } });
    if (!row) {
      await db.cmsPage.create({ data: { slug, title: slug, content: JSON.stringify(content) } });
      console.log(`created ${slug}`);
    } else {
      await db.cmsPage.update({ where: { slug }, data: { content: JSON.stringify(content) } });
      console.log(`updated ${slug}`);
    }
  }
}

main().then(() => process.exit(0));
