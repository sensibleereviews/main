// One-off repair: restore Task-29 pricing (999/2499/4999 excl. GST) in the live
// DB, swap WhatsApp line items to the Phase-1 (email + QR) wording, normalise
// CMS page titles to nav-quality, and retire the contact_address setting.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FEATURE_SWAPS: [RegExp, string][] = [
  [/^WhatsApp requests — 200 \/ month$/, "Review requests (email + QR) — 200 / month"],
  [/^WhatsApp requests — 1,000 \/ month$/, "Review requests (email + QR) — 1,000 / month"],
  [/^WhatsApp requests — 5,000 \/ month$/, "Review requests (email + QR) — 5,000 / month"],
];

const TITLES: Record<string, string> = {
  home: "Home",
  features: "Features",
  how: "How it works",
  pricing: "Pricing",
  stories: "Customer Stories",
  security: "Security & Trust",
  about: "About Us",
  contact: "Contact Us",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  knowledge: "FAQs",
  blog: "Blog",
  ticket: "Submit a Ticket",
};

async function main() {
  // 1. Plan prices — Starter back to 999 (Task 29 values), keep growth/multi.
  await db.plan.update({
    where: { id: "starter" },
    data: { monthlyInr: 999, halfYearlyInr: 4995, annualInr: 9990 },
  });

  // 2. Feature line items — Phase-1 channel wording (WhatsApp is Phase 2).
  const plans = await db.plan.findMany();
  for (const p of plans) {
    let features: string[] = [];
    try {
      features = typeof p.features === "string" ? (JSON.parse(p.features) as string[]) : [];
    } catch {
      features = [];
    }
    const next = features.map((f) => {
      for (const [re, to] of FEATURE_SWAPS) if (re.test(f)) return to;
      return f;
    });
    if (JSON.stringify(next) !== JSON.stringify(features)) {
      await db.plan.update({ where: { id: p.id }, data: { features: JSON.stringify(next) } });
      console.log(`plan ${p.id}: features updated`);
    }
  }

  // 3. CMS page titles — nav-quality (only normalises known defaults).
  for (const [slug, title] of Object.entries(TITLES)) {
    const row = await db.cmsPage.findUnique({ where: { slug } });
    if (!row) continue;
    const stale = row.title in TITLES || row.title === "Homepage" || row.title === "Free trial / Talk to us"
      || row.title === "Customer stories" || row.title === "Security & trust" || row.title === "About us"
      || row.title === "Submit a ticket";
    if (stale && row.title !== title) {
      await db.cmsPage.update({ where: { slug }, data: { title } });
      console.log(`page ${slug}: title ${row.title} -> ${title}`);
    }
  }

  // 4. Retire contact_address (address removed from site).
  const removed = await db.cmsSetting.deleteMany({ where: { key: "contact_address" } });
  console.log(`contact_address settings removed: ${removed.count}`);

  // 5. Tenant MRRs for starter tenants should read 999.
  const starter = await db.tenant.updateMany({ where: { planId: "starter", mrrInr: 1099 }, data: { mrrInr: 999 } });
  console.log(`starter tenant MRRs fixed: ${starter.count}`);

  console.log("done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
