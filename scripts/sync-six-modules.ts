// Surgical CMS sync for the six-pillars update (Task 49 audit fix).
// Updates ONLY the affected keys on home/features/pricing rows — leaves every
// other admin-edited CMS key untouched. Run: bun scripts/sync-six-modules.ts
import { PrismaClient } from "@prisma/client";
import { HOME_DEFAULTS, FEATURES_DEFAULTS } from "../src/lib/cms-defaults";
import { CMS_DEFAULT_SEO } from "../src/lib/cms-defaults2";

const db = new PrismaClient();

async function main() {
  const home = await db.cmsPage.findUnique({ where: { slug: "home" } });
  if (home) {
    const c = JSON.parse(home.content);
    c.modulesSection = HOME_DEFAULTS.modulesSection;
    c.modules = HOME_DEFAULTS.modules;
    if (c.pricingSection) c.pricingSection.sub = HOME_DEFAULTS.pricingSection.sub;
    await db.cmsPage.update({
      where: { slug: "home" },
      data: { content: JSON.stringify(c) },
    });
    console.log("home: modulesSection + modules(6) + pricingSection.sub updated");
  }

  const features = await db.cmsPage.findUnique({ where: { slug: "features" } });
  if (features) {
    const c = JSON.parse(features.content);
    c.title = FEATURES_DEFAULTS.title;
    c.modules = FEATURES_DEFAULTS.modules;
    await db.cmsPage.update({
      where: { slug: "features" },
      data: {
        content: JSON.stringify(c),
        seoTitle: CMS_DEFAULT_SEO.features.title,
        seoDescription: CMS_DEFAULT_SEO.features.description,
      },
    });
    console.log("features: title + modules(6) + seoDescription updated");
  }

  const pricing = await db.cmsPage.findUnique({ where: { slug: "pricing" } });
  if (pricing) {
    await db.cmsPage.update({
      where: { slug: "pricing" },
      data: { seoDescription: CMS_DEFAULT_SEO.pricing.description },
    });
    console.log("pricing: seoDescription updated");
  }

  console.log("six-modules sync done");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
