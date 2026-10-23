// Task 49b: sweep remaining "Enterprise" copy out of live CMS rows
// (stories/FAQs/posts carried the old plan name; defaults were already fixed).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const pages = await db.cmsPage.findMany();
for (const p of pages) {
  if (p.content && p.content.includes("Enterprise")) {
    const next = p.content.replace(/Enterprise/g, "Scale");
    await db.cmsPage.update({ where: { id: p.id }, data: { content: next } });
    console.log(`cmsPage ${p.slug}: Enterprise → Scale`);
  }
  if (p.seoDescription?.includes("Enterprise")) {
    await db.cmsPage.update({ where: { id: p.id }, data: { seoDescription: p.seoDescription.replace(/Enterprise/g, "Scale") } });
    console.log(`cmsPage ${p.slug} seoDescription fixed`);
  }
}

const posts = await db.cmsPost.findMany();
for (const post of posts) {
  const fields = {};
  for (const f of ["title", "excerpt", "summary", "body"]) {
    if (post[f] && typeof post[f] === "string" && post[f].includes("Enterprise")) fields[f] = post[f].replace(/Enterprise/g, "Scale");
  }
  if (Object.keys(fields).length) {
    await db.cmsPost.update({ where: { id: post.id }, data: fields });
    console.log(`cmsPost ${post.slug}: ${Object.keys(fields).join(",")} fixed`);
  }
}

// FAQs live in their own table? try both shapes defensively
try {
  const faqs = await db.cmsFaq.findMany();
  for (const f of faqs) {
    const fields = {};
    for (const f2 of ["question", "answer"]) {
      if (f[f2] && f[f2].includes("Enterprise")) fields[f2] = f[f2].replace(/Enterprise/g, "Scale");
    }
    if (Object.keys(fields).length) {
      await db.cmsFaq.update({ where: { id: f.id }, data: fields });
      console.log(`cmsFaq ${f.id.slice(-5)}: fixed`);
    }
  }
} catch { console.log("no cmsFaq table — FAQs live inside page content"); }

const left = await db.cmsPage.findMany();
const remaining = left.filter((p) => (p.content || "").includes("Enterprise")).map((p) => p.slug);
console.log("remaining pages with Enterprise:", remaining.length ? remaining.join(",") : "none");
await db.$disconnect();
