// DB self-heal guard — db/custom.db is git-tracked, so platform checkpoint
// restores keep rolling it back to old states (it happened after Task 52 and
// again after Task 54: Starter plan reverted ₹1,499 → ₹999 and Task 49–52 CMS
// content reverted). This guard verifies the invariants users actually see and
// repairs them in place. It is cheap (one plan query + a few CmsPage rows) and
// safe to run at server boot and before every /api/plans response.
//
// Repairs mirror the idempotent patch scripts:
//   plans      → scripts/patch-plans-part2.ts   (Task 50 pricing)
//   cms rows   → scripts/patch-legal-cms.ts     (Task 52 legal defaults)
//   six modules→ scripts/cms-part2-renames.ts   (Task 50 renames)
// Content rows are refreshed from PAGE_CONTENT_DEFAULTS (stored JSON only
// overrides defaults at merge time — defaults are always current).
import { db } from "@/lib/db";
import { PAGE_CONTENT_DEFAULTS, CMS_DEFAULT_SEO } from "@/lib/cms-defaults2";

const PLAN_EXPECTED = [
  {
    id: "starter", name: "Starter", locations: 1, seats: 2, monthlyInr: 1499, halfYearlyInr: 8095, annualInr: 14390,
    aiDrafts: "200 / month", waQuota: 50, sortOrder: 1,
    blurb: "For single clinics, salons, restaurants and service businesses.",
    features: JSON.stringify([
      "1 Google Business Profile — full review monitoring", "AI replies in your brand voice — 200 / month",
      "Reputation Health", "Basic sentiment analysis",
      "WhatsApp review requests — 50 / month", "2 users",
    ]),
  },
  {
    id: "growth", name: "Growth", locations: 5, seats: 5, monthlyInr: 3499, halfYearlyInr: 18895, annualInr: 33590,
    aiDrafts: "500 / month", waQuota: 100, popular: true, sortOrder: 2,
    blurb: "The main plan — multi-branch teams that run on their reputation.",
    features: JSON.stringify([
      "Up to 5 Google Business Profiles", "Everything in Starter",
      "Location comparison & benchmarking", "Staff mentions (coaching view)",
      "Issue detection & Action Center", "AI replies — 500 / month",
      "WhatsApp automation — 100 / month",
      "Weekly AI insights · manager dashboards", "5 users",
    ]),
  },
  {
    id: "multi", name: "Scale", locations: 10, seats: 10, monthlyInr: 5999, halfYearlyInr: 32395, annualInr: 57590,
    aiDrafts: "1,000 / month", waQuota: 250, sortOrder: 3,
    blurb: "Regional brands running reputation as a management program.",
    features: JSON.stringify([
      "Up to 10 Google Business Profiles", "Everything in Growth",
      "Regional dashboards & advanced drill-down", "Location benchmarking",
      "Issue & action tracking · automated reports", "AI replies — 1,000 / month",
      "10 manager seats · priority support",
    ]),
  },
];

/** Re-applies Task-50 pricing when plan rows are stale. Returns true if repaired. */
export async function ensurePlanInvariants(): Promise<boolean> {
  const plans = await db.plan.findMany({ where: { id: { in: ["starter", "growth", "multi"] } } });
  const byId = new Map(plans.map((p) => [p.id, p]));
  const stale = PLAN_EXPECTED.some((e) => {
    const row = byId.get(e.id);
    return !row || row.monthlyInr !== e.monthlyInr || row.name !== e.name || row.locations !== e.locations || row.seats !== e.seats;
  });
  if (!stale) return false;
  for (const { id, ...data } of PLAN_EXPECTED) {
    await db.plan.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  console.warn("[db-guard] Plan rows stale (checkpoint rollback?) — re-applied Task-50 pricing (₹1,499 / ₹3,499 / ₹5,999)");
  return true;
}

// Stored CmsPage.content JSON overrides PAGE_CONTENT_DEFAULTS at merge time, so
// a stale row must be detected and refreshed. Freshness markers match the
// current shipped content (Task 49/50/52).
const CONTENT_FRESHNESS: { slug: keyof typeof PAGE_CONTENT_DEFAULTS; title: string; ok: (c: string) => boolean }[] = [
  { slug: "home", title: "Homepage", ok: (c) => c.includes("Reputation Command Center") },
  { slug: "features", title: "Features", ok: (c) => c.includes("Reputation Command Center") },
  { slug: "privacy", title: "Privacy Policy", ok: (c) => c.length >= 9000 },
  { slug: "terms", title: "Terms of Service", ok: (c) => c.length >= 9000 },
  { slug: "security", title: "Security & trust", ok: (c) => c.length >= 5000 },
];

/** Re-applies current CMS defaults when stored rows are stale. Returns repaired slugs. */
export async function ensureContentInvariants(): Promise<string[]> {
  const repaired: string[] = [];
  for (const { slug, title, ok } of CONTENT_FRESHNESS) {
    try {
      const row = await db.cmsPage.findUnique({ where: { slug } });
      if (row && ok(row.content || "")) continue;
      const content = PAGE_CONTENT_DEFAULTS[slug];
      if (!content) continue;
      const seo = CMS_DEFAULT_SEO[slug];
      const data = {
        content: JSON.stringify(content),
        seoTitle: seo?.title,
        seoDescription: seo?.description,
        published: true,
      };
      if (row) await db.cmsPage.update({ where: { slug }, data });
      else await db.cmsPage.create({ data: { slug, title, ...data } });
      repaired.push(slug);
    } catch (err) {
      console.error(`[db-guard] failed to repair CMS row "${slug}":`, err);
    }
  }
  if (repaired.length) {
    console.warn("[db-guard] stale CMS rows repaired (checkpoint rollback?):", repaired.join(", "));
  }
  return repaired;
}

/** Boot-time belt: plans + content. Never throws. */
export async function ensureDbInvariants(): Promise<void> {
  try {
    await ensurePlanInvariants();
    await ensureContentInvariants();
  } catch (err) {
    console.error("[db-guard] boot check failed:", err);
  }
}
