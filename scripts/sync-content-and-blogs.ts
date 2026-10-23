// Sync CMS content + 10 blog posts into the SQLite DB (rebuild pass).
// Run: npx tsx scripts/sync-content-and-blogs.ts   (or bun — uses @prisma/client)
import { PrismaClient } from "@prisma/client";
import {
  HOME_DEFAULTS, type CmsSlug,
} from "../src/lib/cms-defaults";
import {
  ABOUT_DEFAULTS, CONTACT_DEFAULTS, KNOWLEDGE_DEFAULTS, CMS_DEFAULT_SEO, PAGE_CONTENT_DEFAULTS,
} from "../src/lib/cms-defaults2";
import { CMS_PAGE_TITLES } from "../src/lib/cms-defaults";
import { POST_SEED } from "../src/lib/cms-seed-data";
import { slugifyTitle } from "../src/lib/route-shared";

const db = new PrismaClient();

async function upsertPage(slug: CmsSlug, content: Record<string, unknown>, seoOverride?: { title?: string; description?: string }) {
  const data = {
    title: CMS_PAGE_TITLES[slug],
    seoTitle: seoOverride?.title || CMS_DEFAULT_SEO[slug].title,
    seoDescription: seoOverride?.description || CMS_DEFAULT_SEO[slug].description,
    content: JSON.stringify(content),
    published: true,
  };
  await db.cmsPage.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  console.log(`page ${slug} synced`);
}

async function main() {
  // 1. Pages whose defaults changed (about rebuilt, contact inquiry-first, home overview+blogs, knowledge → FAQs)
  await upsertPage("home", { ...HOME_DEFAULTS } as unknown as Record<string, unknown>);
  await upsertPage("about", { ...ABOUT_DEFAULTS } as unknown as Record<string, unknown>);
  await upsertPage("contact", { ...CONTACT_DEFAULTS } as unknown as Record<string, unknown>);
  await upsertPage("knowledge", { ...KNOWLEDGE_DEFAULTS } as unknown as Record<string, unknown>);

  // 2. Privacy body: legal@ → hello@ (DB copy, if a custom one exists)
  const privacy = await db.cmsPage.findUnique({ where: { slug: "privacy" } });
  if (privacy) {
    const next = privacy.content.replace(/legal@sensiblee\.in/g, "hello@sensiblee.in");
    if (next !== privacy.content) {
      await db.cmsPage.update({ where: { slug: "privacy" }, data: { content: next } });
      console.log("privacy content: legal@ → hello@ applied");
    }
  }

  // 3. Posts — reslug legacy rows / insert new; author Admin, summaries + headings
  for (const p of POST_SEED) {
    const slug = slugifyTitle(p.title) || p.slug;
    const data = {
      slug,
      title: p.title,
      tag: p.tag,
      excerpt: p.excerpt,
      summary: p.summary,
      body: p.body,
      readTime: p.readTime,
      author: p.author,
      authorRole: p.authorRole,
      published: true,
      publishedAt: new Date(p.publishedAt),
    };
    const existing = await db.cmsPost.findUnique({ where: { slug } })
      || await db.cmsPost.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await db.cmsPost.update({ where: { id: existing.id }, data });
      console.log(`post updated: ${slug}`);
    } else {
      await db.cmsPost.create({ data });
      console.log(`post created: ${slug}`);
    }
  }

  // 4. Settings: contact_address (CmsSetting has key as @id — no id column)
  await db.cmsSetting.upsert({
    where: { key: "contact_address" },
    update: { value: "Sensiblee by Naqsh Digital Technologies\nBengaluru, Karnataka, India" },
    create: { key: "contact_address", value: "Sensiblee by Naqsh Digital Technologies\nBengaluru, Karnataka, India" },
  });
  console.log("setting contact_address synced");

  // 5. Sanity checks
  const posts = await db.cmsPost.findMany();
  const withSummary = posts.filter((p) => p.summary && p.summary.length > 40).length;
  const admin = posts.filter((p) => p.author === "Admin").length;
  const headed = posts.filter((p) => p.body.includes("\n## ") || p.body.startsWith("## ")).length;
  const dupes = posts.length - new Set(posts.map((p) => p.slug)).size;
  console.log(`SANITY posts=${posts.length} summary=${withSummary} admin=${admin} headings=${headed} dupes=${dupes}`);
  if (posts.length !== 10 || admin !== posts.length || withSummary !== posts.length || headed !== posts.length || dupes !== 0) {
    console.error("SANITY CHECK FAILED");
    process.exit(1);
  }
  const stale = await db.cmsSetting.findFirst({ where: { key: { in: ["contact_address_old"] } } });
  void stale;
  console.log("ALL OK");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
