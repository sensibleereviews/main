import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.cmsPage.findMany({ where: { slug: { in: ["privacy", "terms", "security", "home", "blog"] } }, select: { slug: true, content: true, seoTitle: true, published: true } });
for (const r of rows) console.log(r.slug, "| len:", r.content.length, "| published:", r.published, "| head:", r.content.slice(0, 100));
await db.$disconnect();
