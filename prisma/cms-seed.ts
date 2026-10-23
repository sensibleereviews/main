// Sensiblee CMS seed — bootstraps the marketing CMS tables with the built-in
// content (src/lib/cms-defaults*). Running the seed resets the CMS to pristine.
import { PrismaClient } from "@prisma/client";
import { CMS_PAGE_SLUGS, CMS_PAGE_TITLES } from "../src/lib/cms-defaults";
import { PAGE_CONTENT_DEFAULTS, CMS_DEFAULT_SEO } from "../src/lib/cms-defaults2";
import { FAQ_SEED, POST_SEED, TESTIMONIAL_SEED } from "../src/lib/cms-seed-data";

export async function seedCms(db: PrismaClient) {
  // Pages — one row per known slug with default copy + default SEO
  await db.cmsPage.deleteMany({});
  for (const slug of CMS_PAGE_SLUGS) {
    await db.cmsPage.create({
      data: {
        slug,
        title: CMS_PAGE_TITLES[slug],
        seoTitle: CMS_DEFAULT_SEO[slug].title,
        seoDescription: CMS_DEFAULT_SEO[slug].description,
        content: JSON.stringify(PAGE_CONTENT_DEFAULTS[slug]),
        published: true,
      },
    });
  }

  // FAQs — home / pricing / knowledge sections
  await db.cmsFaq.deleteMany({});
  const counters: Record<string, number> = {};
  for (const f of FAQ_SEED) {
    counters[f.section] = (counters[f.section] || 0) + 1;
    await db.cmsFaq.create({
      data: {
        section: f.section,
        category: f.category,
        question: f.question,
        answer: f.answer,
        sortOrder: counters[f.section],
      },
    });
  }

  // Blog posts
  await db.cmsPost.deleteMany({});
  for (const p of POST_SEED) {
    await db.cmsPost.create({
      data: {
        slug: p.slug, title: p.title, tag: p.tag, excerpt: p.excerpt, body: p.body,
        readTime: p.readTime, author: p.author, authorRole: p.authorRole,
        publishedAt: new Date(p.publishedAt),
        seoTitle: p.title, seoDescription: p.excerpt,
        published: true,
      },
    });
  }

  // Testimonials
  await db.cmsTestimonial.deleteMany({});
  let tOrder = 1;
  for (const t of TESTIMONIAL_SEED) {
    await db.cmsTestimonial.create({
      data: { quote: t.quote, name: t.name, role: t.role, stars: t.stars, section: "home", sortOrder: tOrder++ },
    });
  }

  // Settings — announcement banner starts disabled (site unchanged until switched on)
  await db.cmsSetting.upsert({ where: { key: "banner_enabled" }, update: { value: "false" }, create: { key: "banner_enabled", value: "false" } });
  await db.cmsSetting.upsert({ where: { key: "banner_text" }, update: {}, create: { key: "banner_text", value: "Now onboarding design partners for the June cohort — book a demo." } });
  await db.cmsSetting.upsert({ where: { key: "banner_link" }, update: {}, create: { key: "banner_link", value: "contact" } });

  const counts = {
    pages: await db.cmsPage.count(),
    faqs: await db.cmsFaq.count(),
    posts: await db.cmsPost.count(),
    testimonials: await db.cmsTestimonial.count(),
  };
  return counts;
}
