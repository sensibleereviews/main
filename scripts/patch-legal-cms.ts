// Sync legal/security/blog CMS rows in the DB to the new (DPDP / Indian-law) defaults.
// Run from project root: bun scripts/patch-legal-cms.ts
import { PrismaClient } from "@prisma/client";
import { PAGE_CONTENT_DEFAULTS, CMS_DEFAULT_SEO } from "../src/lib/cms-defaults2";

const db = new PrismaClient();

const TITLES: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  security: "Security & trust",
  blog: "Blog",
};

// 1) Replace privacy / terms / security content wholesale + refresh SEO fields.
for (const slug of ["privacy", "terms", "security"] as const) {
  const content = PAGE_CONTENT_DEFAULTS[slug];
  const json = JSON.stringify(content);
  const seo = CMS_DEFAULT_SEO[slug];
  const existing = await db.cmsPage.findUnique({ where: { slug } });
  if (existing) {
    await db.cmsPage.update({
      where: { slug },
      data: { content: json, seoTitle: seo.title, seoDescription: seo.description, title: TITLES[slug], published: true },
    });
    console.log(`updated ${slug}: ${json.length} chars`);
  } else {
    await db.cmsPage.create({
      data: { slug, title: TITLES[slug], seoTitle: seo.title, seoDescription: seo.description, content: json, published: true },
    });
    console.log(`created ${slug}: ${json.length} chars`);
  }
}

// 2) Blog CTA line — swap the old "2-minute demo" wording if present in the stored row.
const blog = await db.cmsPage.findUnique({ where: { slug: "blog" } });
if (blog) {
  let content: Record<string, unknown> = {};
  try { content = JSON.parse(blog.content); } catch { content = {}; }
  if (typeof content.ctaSub === "string" && content.ctaSub.includes("2-minute")) {
    content.ctaSub = (PAGE_CONTENT_DEFAULTS.blog as Record<string, unknown>).ctaSub;
    await db.cmsPage.update({ where: { slug: "blog" }, data: { content: JSON.stringify(content) } });
    console.log(`updated blog.ctaSub -> ${content.ctaSub}`);
  } else {
    console.log("blog.ctaSub already clean:", content.ctaSub ?? "(absent)");
  }
}

// 3) Sweep every page row for stale "2-minute"/"2 minute" demo references.
const rows = await db.cmsPage.findMany();
for (const row of rows) {
  if ((row.content || "").includes("2-minute")) {
    console.log(`WARN stale 2-minute in ${row.slug} (row kept, inspect manually)`);
  }
}

await db.$disconnect();
console.log("legal CMS sync complete");
