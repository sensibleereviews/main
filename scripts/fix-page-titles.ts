// One-time DB fix — align existing CmsPage titles with the CMS-driven page-name
// layer (header / footer / sitemap labels come from these titles now):
//   contact "Free trial / Talk to us" → "Contact Us"  (was unrecognisable in the
//     admin Pages list, which is why name/URL editing seemed missing for it)
//   stories / security / ticket → the same nav-quality casing as the old hardcoded links
// Also removes the obsolete contact_address setting (address card removed).
// Run: bun scripts/fix-page-titles.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const RENAMES: Record<string, string> = {
  contact: "Contact Us",
  stories: "Customer Stories",
  security: "Security & Trust",
  ticket: "Submit a Ticket",
};

async function main() {
  for (const [slug, title] of Object.entries(RENAMES)) {
    const row = await db.cmsPage.findUnique({ where: { slug } });
    if (!row) { console.log(`page ${slug}: not in DB — skipped`); continue; }
    if (row.title === title) { console.log(`page ${slug}: already "${title}"`); continue; }
    // Don't clobber a custom admin rename — only normalise known built-ins.
    const builtins = ["Free trial / Talk to us", "Customer stories", "Security & trust", "Submit a ticket"];
    if (!builtins.includes(row.title)) { console.log(`page ${slug}: custom name "${row.title}" kept`); continue; }
    await db.cmsPage.update({ where: { slug }, data: { title } });
    console.log(`page ${slug}: "${row.title}" → "${title}"`);
  }

  const gone = await db.cmsSetting.deleteMany({ where: { key: "contact_address" } });
  console.log(`contact_address settings removed: ${gone.count}`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); process.exit(1); });
