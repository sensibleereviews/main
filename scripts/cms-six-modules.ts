// Task 49 — patch stored CMS rows: 4 modules → 6 core pillars (doc Part 1).
// Stored CmsPage.content JSON overrides PAGE_CONTENT_DEFAULTS at merge time
// (src/lib/cms.ts line ~95), so both defaults AND stored rows must carry the
// six-module content. Also fixes stored seoTitle/seoDescription columns that
// still say "four". Idempotent — safe to re-run after workspace rollbacks.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const HOME_MODULES = [
  { title: "Review Monitoring", desc: "Every Google Business Profile synced on a 15-minute cadence, with sentiment scored on arrival." },
  { title: "Review Requests", desc: "WhatsApp campaigns and table QR kits turn happy guests into public proof." },
  { title: "AI Reputation Assistant", desc: "On-brand drafts in your voice — you approve, edit or regenerate every reply." },
  { title: "Reputation Health Score", desc: "Rating trend, velocity, sentiment, response discipline — one 0–100 score with the why built in." },
  { title: "Staff & Location Drill-Down", desc: "Branch-by-branch Health Scores, negative themes and staff mentions — weakest first." },
  { title: "Issue & Action Tracking", desc: "Recurring complaints become owned issues with recommended actions and measurable outcomes." },
];

const FEATURE_MODULES = [
  {
    name: "Review Monitoring", headline: "Every review, sensed the moment it lands",
    desc: "All your Google Business Profiles sync on a 15-minute cadence. Sentiment, keywords and urgency are scored on arrival, so a 2-star Saturday night never waits until Monday.",
    points: ["15-minute sync across every location", "Sentiment + keyword scoring on arrival", "Urgency alerts for negative reviews (WhatsApp + email)", "Reply SLA tracker — every review answered on time"],
  },
  {
    name: "Review Requests", headline: "Happy guests become public proof",
    desc: "WhatsApp campaigns and table-tent QR kits ask at exactly the right moment — after the compliment, before the bill is forgotten. Consent-first, template-approved, quality-safe.",
    points: ["WhatsApp bursts timed to your service rhythm", "Branded QR kits for tables, bills and takeaways", "Direct deep-link to your Google review form", "Open, scan and posted-review funnel tracking"],
  },
  {
    name: "AI Reputation Assistant", headline: "Drafts in your voice — you stay in charge",
    desc: "Every review gets an on-brand draft within minutes — warm for the fans, composed and accountable for the critics. You approve, edit or regenerate. Nothing posts without a human click.",
    points: ["Brand-voice tuned drafts (warm, professional, apologetic)", "Confidence score on every suggestion", "One-click approve, edit or regenerate", "Human approval required — always"],
  },
  {
    name: "Reputation Health Score", headline: "One health score for the whole brand",
    desc: "Ratings, sentiment, keywords, locations and staff roll up into a single Reputation Health Score — so owners see the trend and managers see exactly what to fix.",
    points: ["Rating trend & review volume, week by week", "Keyword radar — what guests praise or flag", "Why-this-score breakdown, dimension by dimension", "Weekly WhatsApp digest for owners"],
  },
  {
    name: "Staff & Location Drill-Down", headline: "From brand-level scores to branch-level truth",
    desc: "Click any location to see its own Health Score, the negative themes dragging it down and the staff behind the mentions — operational intelligence your managers can act on the same week.",
    points: ["Per-location Health Scores, weakest first", "Top negative themes per branch — wait times, staff, billing", "Most-mentioned staff with sentiment trends", "Coaching intelligence — never public employee scores"],
  },
  {
    name: "Issue & Action Tracking", headline: "Complaints become owned, measured fixes",
    desc: "When recurring complaints cluster — waiting times at one branch, billing at another — Sensiblee raises an issue with an owner, severity and recommended action, then shows the before-and-after.",
    points: ["Auto-detected issue clusters across locations", "Owner, severity and status on every issue", "Recommended actions from proven playbooks", "Before/after impact — mentions down, score up"],
  },
];

async function main() {
  const home = await db.cmsPage.findUnique({ where: { slug: "home" } });
  if (home) {
    const c = JSON.parse(home.content || "{}");
    c.modules = HOME_MODULES;
    if (c.modulesSection) {
      c.modulesSection.title = "Six modules, one calm engine";
      c.modulesSection.sub = "Everything your reputation needs — sensing, asking, answering, scoring, drilling down and fixing — designed to work as one.";
    }
    if (c.pricingSection) {
      c.pricingSection.sub = "Every plan includes all six modules — billed monthly, half-yearly (10% off) or annually (20% off).";
    }
    await db.cmsPage.update({ where: { slug: "home" }, data: { content: JSON.stringify(c) } });
    console.log("home: modules→6, modulesSection/pricingSection patched");
  }

  const features = await db.cmsPage.findUnique({ where: { slug: "features" } });
  if (features) {
    const c = JSON.parse(features.content || "{}");
    c.modules = FEATURE_MODULES;
    if (typeof c.title === "string") c.title = "Six modules.";
    await db.cmsPage.update({ where: { slug: "features" }, data: { content: JSON.stringify(c) } });
    console.log("features: modules→6, title patched");
  }

  const seoFixes: { slug: string; seoTitle?: string; seoDescription?: string }[] = [
    {
      slug: "features",
      seoTitle: "Features — six modules, one reputation engine | Sensiblee",
      seoDescription: "Review monitoring, WhatsApp & QR review requests, AI-drafted replies you approve, a self-explaining Reputation Health Score, staff & location drill-down and issue & action tracking — one calm platform for guest-facing businesses.",
    },
    {
      slug: "pricing",
      seoDescription: "Plans from ₹1,499/month with all six modules included. Billed monthly, half-yearly (10% off) or annually (20% off). 7-day trial, no card required.",
    },
  ];
  for (const f of seoFixes) {
    const row = await db.cmsPage.findUnique({ where: { slug: f.slug } });
    if (!row) continue;
    const data: Record<string, string> = {};
    if (row.seoTitle && /four/i.test(row.seoTitle) && f.seoTitle) data.seoTitle = f.seoTitle;
    if (row.seoDescription && /four/i.test(row.seoDescription) && f.seoDescription) data.seoDescription = f.seoDescription;
    if (Object.keys(data).length) {
      await db.cmsPage.update({ where: { slug: f.slug }, data });
      console.log(`${f.slug}: SEO columns patched (${Object.keys(data).join(", ")})`);
    }
  }

  // Final proof: no "four" left anywhere in CMS pages (content JSON or SEO columns).
  const rows = await db.cmsPage.findMany();
  let leftovers = 0;
  for (const r of rows) {
    if (/four/i.test(r.content || "")) { console.log(`LEFTOVER content ${r.slug}`); leftovers++; }
    if (/four/i.test(r.seoTitle || "")) { console.log(`LEFTOVER seoTitle ${r.slug}`); leftovers++; }
    if (/four/i.test(r.seoDescription || "")) { console.log(`LEFTOVER seoDescription ${r.slug}`); leftovers++; }
  }
  console.log(leftovers === 0 ? "PROOF: zero 'four' references remain in CMS" : `FAIL: ${leftovers} leftovers`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
