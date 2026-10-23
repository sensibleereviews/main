// Task 50: sync home + features CMS DB rows to the six-module document model.
// Mirrors cms-defaults.ts HOME_DEFAULTS.modules/modulesSection/pricingSection.sub
// and FEATURES_DEFAULTS; also refreshes stale SEO columns if they mention "four" or ₹999.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const SIX_MODULES_HOME = [
  { title: "Reputation Command Center", desc: "Every Google Business Profile synced on a 15-minute cadence, with sentiment scored on arrival." },
  { title: "Reputation Health", desc: "One North-Star score out of 100 — banded, benchmarked across branches and explained point by point." },
  { title: "AI Reputation Copilot", desc: "On-brand drafts in your voice — you approve, edit or regenerate every reply." },
  { title: "Review Growth Engine", desc: "WhatsApp campaigns and table QR kits turn happy guests into public proof." },
  { title: "Location Intelligence", desc: "Branch, staff and issue drill-down — see exactly what to fix, and who can fix it." },
  { title: "Reputation Action Center", desc: "Detect → assign → fix → measure. Recurring complaints become owned actions with measured results." },
];

const SIX_MODULES_FEATURES = [
  {
    name: "Reputation Command Center", headline: "Every review, sensed the moment it lands",
    desc: "All your Google Business Profiles sync on a 15-minute cadence. Sentiment, keywords and urgency are scored on arrival, so a 2-star Saturday night never waits until Monday.",
    points: ["15-minute sync across every location", "Sentiment + keyword scoring on arrival", "Urgency alerts for negative reviews (WhatsApp + email)", "Reply SLA tracker — every review answered on time"],
  },
  {
    name: "Reputation Health", headline: "One North-Star score your management runs on",
    desc: "Seven weighted dimensions — rating quality, trend, velocity, sentiment, response performance, complaint trends and location consistency — roll into one 100-point score with bands and point-by-point explanations.",
    points: ["100-point North-Star score from seven weighted dimensions", "Bands from Excellent to Critical, per brand and per branch", "Every point loss explained: cause → impact → fix", "Location-consistency benchmarks across branches"],
  },
  {
    name: "AI Reputation Copilot", headline: "Drafts in your voice — you stay in charge",
    desc: "Every review gets an on-brand draft within minutes — warm for the fans, composed and accountable for the critics. You approve, edit or regenerate. Nothing posts without a human click.",
    points: ["Brand-voice tuned drafts (warm, professional, apologetic)", "Confidence score on every suggestion", "One-click approve, edit or regenerate", "Human approval required — always"],
  },
  {
    name: "Review Growth Engine", headline: "Happy guests become public proof",
    desc: "WhatsApp campaigns and table-tent QR kits ask at exactly the right moment — after the compliment, before the bill is forgotten. Consent-first, template-approved, quality-safe.",
    points: ["WhatsApp bursts timed to your service rhythm", "Branded QR kits for tables, bills and takeaways", "Direct deep-link to your Google review form", "Open, scan and posted-review funnel tracking"],
  },
  {
    name: "Location Intelligence", headline: "Every branch, down to the staff mention",
    desc: "Click any branch for its health, top problems, month-by-month trend and the staff guests mention — operational intelligence derived from customer feedback.",
    points: ["Per-branch health with band dots and 90-day context", "Top complaint themes with share bars", "4-month trend per location", "Customer mentions — coaching context, never employee scores"],
  },
  {
    name: "Reputation Action Center", headline: "From recurring complaint to measured fix",
    desc: "The loop-closer: recurring complaints become issues with severity, owner and trend. Managers get recommended actions — and the dashboard shows the reputation points you won back.",
    points: ["Issues auto-detected with severity, owner and trend", "Recommended actions assigned to branch managers", "Before/after impact — mentions down, score up", "Revenue-risk framing on every alert"],
  },
];

// ---- home row ----
const home = await db.cmsPage.findUnique({ where: { slug: "home" } });
if (home) {
  const c = JSON.parse(home.content);
  c.modules = SIX_MODULES_HOME;
  if (c.modulesSection) {
    c.modulesSection.title = "Six modules, one calm engine";
    c.modulesSection.sub = "Everything your reputation needs — sensing, scoring, asking, answering, drilling down and closing the loop — designed to work as one.";
  }
  if (c.pricingSection?.sub) {
    c.pricingSection.sub = "Every plan includes all six modules — billed monthly, half-yearly (1 month free) or annually (2 months free).";
  }
  const seoTitle = home.seoTitle?.replace(/four modules/gi, "six modules") ?? home.seoTitle;
  const seoDesc = (home.seoDescription ?? "").replace(/all four modules/gi, "all six modules");
  await db.cmsPage.update({
    where: { slug: "home" },
    data: { content: JSON.stringify(c), seoTitle, seoDescription: seoDesc || home.seoDescription },
  });
  console.log("home row updated: modules=6, title set");
} else console.log("home row: none (defaults will be used)");

// ---- features row ----
const features = await db.cmsPage.findUnique({ where: { slug: "features" } });
if (features) {
  const c = JSON.parse(features.content);
  c.modules = SIX_MODULES_FEATURES;
  if (typeof c.title === "string") c.title = c.title.replace(/^Four modules\.$/, "Six modules.");
  const seoTitle = (features.seoTitle ?? "").replace(/four modules/gi, "six modules") || features.seoTitle;
  await db.cmsPage.update({
    where: { slug: "features" },
    data: { content: JSON.stringify(c), seoTitle },
  });
  console.log("features row updated: modules=6, title set");
} else console.log("features row: none (defaults will be used)");

// ---- pricing row SEO (stale ₹999) ----
const pricing = await db.cmsPage.findUnique({ where: { slug: "pricing" } });
if (pricing) {
  const t = (pricing.seoTitle ?? "").replace(/₹999/g, "₹1,499");
  const d = (pricing.seoDescription ?? "").replace(/₹999/g, "₹1,499").replace(/all four modules/gi, "all six modules");
  if (t !== pricing.seoTitle || d !== pricing.seoDescription) {
    await db.cmsPage.update({ where: { slug: "pricing" }, data: { seoTitle: t, seoDescription: d } });
    console.log("pricing SEO refreshed");
  } else console.log("pricing SEO: already current");
}

// ---- verify ----
for (const slug of ["home", "features"]) {
  const row = await db.cmsPage.findUnique({ where: { slug } });
  const c = JSON.parse(row.content);
  const n = c.modules?.length ?? 0;
  const hasAction = JSON.stringify(c).includes("Reputation Action Center");
  const hasHealth = JSON.stringify(c).includes("Reputation Health");
  console.log(`${slug}: modules=${n} health=${hasHealth} action=${hasAction} sectionTitle=${c.modulesSection?.title ?? c.title ?? "-"}`);
}
await db.$disconnect();
