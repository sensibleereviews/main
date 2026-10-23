// @ts-nocheck — standalone maintenance script run via bun (bun:sqlite types not in tsconfig)
// 2026-09-28 content pass #3 (design + blog media pass):
//  1. CmsPost rows re-synced from POST_SEED: summaries added, author → "Admin",
//     bodies now carry "## " / "### " headings
//  2. CmsPage[about] team members get the mock portrait photo URLs
// Run:  bun scripts/sync-content-and-blogs-v3.ts
import { Database } from "bun:sqlite";
import { POST_SEED } from "../src/lib/cms-seed-data";
import { ABOUT_DEFAULTS } from "../src/lib/cms-defaults2";

const DB_PATH = new URL("../db/custom.db", import.meta.url).pathname;
const db = new Database(DB_PATH);
let changes = 0;

/* ---------------- 1. CmsPost — sync summary / author / heading bodies ---------------- */

for (const p of POST_SEED) {
  const existing = db
    .query(`SELECT id, slug FROM CmsPost WHERE slug = ? OR title = ?`)
    .get(p.slug, p.title);

  if (existing) {
    db.run(
      `UPDATE CmsPost SET slug = ?, title = ?, tag = ?, excerpt = ?, summary = ?, body = ?, readTime = ?,
         author = ?, authorRole = ?, seoTitle = ?, seoDescription = ?, updatedAt = ?
       WHERE id = ?`,
      [p.slug, p.title, p.tag, p.excerpt, p.summary, p.body, p.readTime,
       p.author, p.authorRole, p.title, p.excerpt, new Date().toISOString(), existing.id],
    );
    console.log(`CmsPost updated   → ${p.slug}`);
  } else {
    const id = "cmb" + crypto.randomUUID().replace(/-/g, "").slice(0, 22);
    const ts = new Date(p.publishedAt).getTime();
    db.run(
      `INSERT INTO CmsPost (id, slug, title, tag, excerpt, summary, body, readTime, author, authorRole,
         featuredMediaId, seoTitle, seoDescription, published, publishedAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)`,
      [id, p.slug, p.title, p.tag, p.excerpt, p.summary, p.body, p.readTime, p.author, p.authorRole,
       p.title, p.excerpt, ts, new Date().toISOString()],
    );
    console.log(`CmsPost inserted  → ${p.slug}`);
  }
  changes++;
}

/* ---------------- 2. CmsPage[about] — team mock photos ---------------- */

const aRow = db.query(`SELECT content FROM CmsPage WHERE slug = 'about'`).get();
if (aRow) {
  const content = JSON.parse(aRow.content);
  if (Array.isArray(content.team) && content.team.length > 0) {
    for (const member of content.team) {
      const def = ABOUT_DEFAULTS.team.find((t) => t.name === member.name);
      if (def) member.photo = def.photo;
    }
    db.run(`UPDATE CmsPage SET content = ?, updatedAt = ? WHERE slug = 'about'`,
      [JSON.stringify(content), new Date().toISOString()]);
    console.log(`CmsPage[about] team photos set (${content.team.length} members)`);
  } else {
    // team array missing entirely — seed it from defaults
    content.team = ABOUT_DEFAULTS.team;
    db.run(`UPDATE CmsPage SET content = ?, updatedAt = ? WHERE slug = 'about'`,
      [JSON.stringify(content), new Date().toISOString()]);
    console.log("CmsPage[about] team array seeded from defaults");
  }
  changes++;
} else {
  console.log("CmsPage[about] row not found — skipped");
}

/* ---------------- sanity report ---------------- */

const stats = db.query(`SELECT
    COUNT(*) total,
    SUM(author = 'Admin') adminCount,
    SUM(summary IS NOT NULL AND summary != '') summaryCount,
    SUM(body LIKE '%## %') headingCount
  FROM CmsPost`).get();
console.log(`\nCmsPost sanity: total=${stats.total} authorAdmin=${stats.adminCount} withSummary=${stats.summaryCount} withHeadings=${stats.headingCount}`);

const team = db.query(`SELECT content FROM CmsPage WHERE slug='about'`).get();
const teamPhotos = JSON.parse(team.content).team?.filter((m) => m.photo).length ?? 0;
console.log(`CmsPage[about] members with photos: ${teamPhotos}`);

db.close();
console.log(changes >= 0 ? "DONE" : "DONE");
