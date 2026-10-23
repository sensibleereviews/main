// @ts-nocheck — standalone maintenance script run via bun (bun:sqlite types not in tsconfig)
// One-shot CMS content sync for the 2025-09-27 content pass:
//  - About page  → "About Us" (intro, vision, mission, values, team, no brand section)
//  - Contact page → "Contact Us" (inquiry-first copy, address, call number)
//  - CmsSetting  → contact_address
// Run:  bun scripts/update-cms-content.ts
import { Database } from "bun:sqlite";
import { ABOUT_DEFAULTS, CONTACT_DEFAULTS, CMS_DEFAULT_SEO } from "../src/lib/cms-defaults2";
import { CMS_PAGE_TITLES } from "../src/lib/cms-defaults";

const DB_PATH = new URL("../db/custom.db", import.meta.url).pathname;
const db = new Database(DB_PATH);

const updates: { slug: string; title: string; content: unknown }[] = [
  { slug: "about", title: CMS_PAGE_TITLES.about, content: ABOUT_DEFAULTS },
  { slug: "contact", title: CMS_PAGE_TITLES.contact, content: CONTACT_DEFAULTS },
];

for (const u of updates) {
  const seo = CMS_DEFAULT_SEO[u.slug as keyof typeof CMS_DEFAULT_SEO];
  const content = JSON.stringify(u.content);
  const res = db.run(
    `UPDATE CmsPage SET title = ?, seoTitle = ?, seoDescription = ?, content = ?, updatedAt = ? WHERE slug = ?`,
    [u.title, seo.title, seo.description, content, new Date().toISOString(), u.slug],
  );
  console.log(`CmsPage[${u.slug}] title="${u.title}" changes=${res.changes} contentBytes=${content.length}`);
}

// contact_address setting (site-wide footer + contact page)
const existing = db.query(`SELECT key FROM CmsSetting WHERE key = 'contact_address'`).get();
const address = "105, Ground Floor, Narmada Apartments, Alaknanda,\nNew Delhi - 110019";
if (existing) {
  db.run(`UPDATE CmsSetting SET value = ? WHERE key = 'contact_address'`, [address]);
  console.log("CmsSetting contact_address updated");
} else {
  db.run(`INSERT INTO CmsSetting (key, value, updatedAt) VALUES (?, ?, ?)`, ["contact_address", address, new Date().toISOString()]);
  console.log("CmsSetting contact_address created");
}

// sanity: show the rows back
for (const row of db.query(`SELECT slug, title, seoTitle FROM CmsPage WHERE slug IN ('about','contact')`).all()) {
  console.log("→", row);
}
db.close();
console.log("DONE");
