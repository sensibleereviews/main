// Task 50 — patch stored CMS rows: six modules → REFINED renames (doc Part 2).
// Part 1 named the pillars; Part 2 ("FINAL VERSION - REFINED / IMPROVISED")
// renames and reorders all six:
//   1 Reputation Command Center  2 Reputation Health  3 AI Reputation Copilot
//   4 Review Growth Engine       5 Location Intelligence  6 Reputation Action Center
// Stored CmsPage.content JSON overrides PAGE_CONTENT_DEFAULTS at merge time,
// so both defaults AND stored rows must carry the new names. Also refreshes
// stored seoDescription columns (brand line + ₹1,499). Idempotent.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const HOME_MODULES = [
  { title: "Reputation Command Center", desc: "Google review monitoring — every Business Profile synced in minutes, sentiment scored on arrival." },
  { title: "Reputation Health", desc: "Score + trends + benchmarks — one 0–100 North-Star score with the why built in." },
  { title: "AI Reputation Copilot", desc: "Replies + insights + recommendations — on-brand drafts you approve, edit or regenerate." },
  { title: "Review Growth Engine", desc: "WhatsApp + QR + transaction-triggered requests turn happy guests into public proof." },
  { title: "Location Intelligence", desc: "Branch + staff + issue drill-down — scores, themes and coaching context, weakest first." },
  { title: "Reputation Action Center", desc: "Detect → assign → fix → measure — complaints become owned, outcome-tracked fixes." },
];

const FEATURE_MODULES = [
  {
    name: "Reputation Command Center", headline: "Every review, sensed the moment it lands",
    desc: "All your Google Business Profiles sync on a 15-minute cadence. Sentiment, keywords and urgency are scored on arrival, so a 2-star Saturday night never waits until Monday.",
    points: ["15-minute sync across every location", "Sentiment + keyword scoring on arrival", "Urgency alerts for negative reviews (WhatsApp + email)", "Reply SLA tracker — every review answered on time"],
  },
  {
    name: "Reputation Health", headline: "One North-Star score — score, trends, benchmarks",
    desc: "Seven weighted dimensions — rating quality, rating trend, velocity, sentiment, response performance, complaint trends, location consistency — roll up into a single 0–100 score with the why built in, so owners see the trend and managers see exactly what to fix.",
    points: ["0–100 score with Excellent / Healthy / At Risk / Critical bands", "Why-this-score breakdown — dimension losses, point by point", "Per-location scores with month-over-month deltas", "Reputation ROI — requests, conversion, rating lift, locations improved"],
  },
  {
    name: "AI Reputation Copilot", headline: "Replies, insights and recommendations — you stay in charge",
    desc: "Every review gets an on-brand draft within minutes — shaped by the review, rating, location, brand voice, language and business type. You approve, edit or regenerate. Nothing posts without a human click.",
    points: ["Drafts tuned to your brand voice and business type", "Insights and recommended actions, not just replies", "Confidence score on every suggestion", "Human approval required — always"],
  },
  {
    name: "Review Growth Engine", headline: "Happy guests become public proof",
    desc: "WhatsApp, table QR and transaction-triggered requests ask at exactly the right moment — after the compliment, before the bill is forgotten. Consent-first, template-approved, quality-safe.",
    points: ["WhatsApp bursts timed to your service rhythm", "Branded QR kits for tables, bills and takeaways", "Transaction-triggered asks — every guest gets the genuine Google link", "Open, scan and posted-review funnel tracking"],
  },
  {
    name: "Location Intelligence", headline: "From brand-level scores to branch-level truth",
    desc: "Click any location to see its own Health Score, the negative themes dragging it down and the staff behind the mentions — coaching intelligence your managers can act on the same week.",
    points: ["Per-location Health Scores, weakest first", "Top problems per branch with complaint shares", "Most-mentioned staff — positive vs negative context", "Coaching intelligence — never public employee scores"],
  },
  {
    name: "Reputation Action Center", headline: "Detect → assign → fix → measure",
    desc: "When recurring complaints cluster — waiting times at one branch, billing at another — Sensiblee raises an issue with an owner, severity, peak window and recommended action, then shows the before-and-after.",
    points: ["Auto-detected issue clusters across locations", "Owner, severity and revenue-risk flag on every issue", "Recommended actions from proven playbooks", "Before/after impact — complaints down, score up"],
  },
];

// old Part-1 names → must not remain in stored CMS JSON
const STALE = /AI Reputation Assistant|Staff & Location Drill-Down|Issue & Action Tracking|Review Monitoring|Review Requests(?! kit)|₹999\/month/i;

async function main() {
  const home = await db.cmsPage.findUnique({ where: { slug: "home" } });
  if (home) {
    const c = JSON.parse(home.content || "{}");
    c.modules = HOME_MODULES;
    if (c.overview && Array.isArray(c.overview) && c.overview[1]) {
      c.overview[1] = String(c.overview[1]).replace("AI Reputation Assistant", "AI Reputation Copilot");
    }
    await db.cmsPage.update({ where: { slug: "home" }, data: { content: JSON.stringify(c) } });
    console.log("home: modules→refined renames, overview Copilot");
  }

  const features = await db.cmsPage.findUnique({ where: { slug: "features" } });
  if (features) {
    const c = JSON.parse(features.content || "{}");
    c.modules = FEATURE_MODULES;
    if (typeof c.description === "string") {
      c.description = "Get more genuine customer feedback and act on it — Sensiblee senses what guests feel, acts on it intelligently, and shows you the result in one calm, connected platform.";
    }
    await db.cmsPage.update({ where: { slug: "features" }, data: { content: JSON.stringify(c) } });
    console.log("features: modules→refined renames, brand-line description");
  }

  const seoFixes: { slug: string; seoDescription: string }[] = [
    {
      slug: "home",
      seoDescription: "Get more genuine customer feedback and act on it. Sensiblee turns your Google reviews into reputation growth — the Reputation Command Center, WhatsApp & QR growth engine, AI Reputation Copilot drafts you approve, and one Reputation Health score.",
    },
    {
      slug: "features",
      seoDescription: "Reputation Command Center, Reputation Health score + trends + benchmarks, AI Reputation Copilot, Review Growth Engine (WhatsApp + QR), Location Intelligence and the Reputation Action Center — one calm platform for guest-facing businesses.",
    },
    {
      slug: "pricing",
      seoDescription: "Plans from ₹1,499/month with all six modules included. Billed monthly, half-yearly (10% off) or annually (20% off). 7-day trial, no card required. Running more than 10 locations? Contact us for a tailor-made plan.",
    },
  ];
  for (const f of seoFixes) {
    await db.cmsPage.update({ where: { slug: f.slug }, data: { seoDescription: f.seoDescription } });
    console.log(`${f.slug}: seoDescription patched`);
  }

  // Proof: no stale Part-1 module names left in any stored CMS row
  const rows = await db.cmsPage.findMany();
  let leftovers = 0;
  for (const r of rows) {
    if (STALE.test(r.content || "")) { console.log(`LEFTOVER content ${r.slug}`); leftovers++; }
    if (STALE.test(r.seoTitle || "")) { console.log(`LEFTOVER seoTitle ${r.slug}`); leftovers++; }
    if (STALE.test(r.seoDescription || "")) { console.log(`LEFTOVER seoDescription ${r.slug}`); leftovers++; }
  }
  console.log(leftovers === 0 ? "PROOF: zero stale module names remain in CMS" : `FAIL: ${leftovers} leftovers`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
