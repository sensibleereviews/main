// Sensiblee seed — deterministic, realistic demo dataset
// Run: bun prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { seedCms } from "./cms-seed";

const db = new PrismaClient();
// deterministic RNG
let s = 42;
const rand = () => {
  s = (s * 1103515245 + 12345) % 2147483648;
  return s / 2147483648;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - days * 86400_000 - hours * 3600_000);
const ahead = (days: number) => new Date(now + days * 86400_000);

const DEMO_PW = "Demo@1234";

const KW_POS = [
  ["butter chicken", "staff", "ambience"], ["filter coffee", "dosa", "service"],
  ["biryani", "portions", "staff courtesy"], ["group dining", "platters", "service"],
  ["appam", "food quality", "coffee"], ["chicken 65", "mutton sukka", "valet"],
  ["ambience", "dessert", "celebration"], ["staff courtesy", "regulars", "filter coffee"],
];
const KW_NEU = [["portions", "pricing", "value"], ["crowded", "music", "biryani"], ["parking", "weekend", "service"]];
const KW_NEG = [["wait time", "reservation", "service"], ["delivery", "missing items", "packaging"], ["order mixup", "wait time", "counter"]];

// Staff mentioned in reviews — powers Location Intelligence "customer mentions"
// (coaching intelligence, doc §5/§7: "18 reviews mention Amit; 13 positive, 5 negative")
const STAFF_PRAISE = ["Amit", "Priya", "Rahul", "Sneha", "Vikram"];
const STAFF_FLAGS = ["Amit", "Rahul", "Vikram"];
function withStaff(text: string, keywords: string[], stars: number): { text: string; keywords: string[] } {
  const roll = rand();
  if (stars >= 4 && roll < 0.4) {
    const name = pick(STAFF_PRAISE);
    return { text: `${text} ${name} looked after our table and was exceptional throughout.`, keywords: [...keywords, name] };
  }
  if (stars <= 2 && roll < 0.4) {
    const name = pick(STAFF_FLAGS);
    return { text: `${text} We flagged it to ${name} at the counter but nothing moved for a while.`, keywords: [...keywords, name] };
  }
  return { text, keywords };
}

const NAMES = ["Ananya Sharma", "Rohit Menon", "Priya Nair", "Karthik Iyer", "Meera Krishnan", "Aditya Rao",
  "Sneha Kulkarni", "Vikram Desai", "Nikhil George", "Divya Suresh", "Arjun Prasad", "Fatima Rizvi",
  "Kavya Menon", "Rahul Verma", "Sana Sheikh", "Manoj Pillai", "Lakshmi Iyer", "Tarun Bhatia",
  "Pooja Hegde", "Imran Khan", "Shruti Balan", "Dev Patel", "Ritu Malhotra", "Gaurav Shetty"];

const POS_TEXT = [
  "Celebrated my parents' anniversary here. The staff arranged a surprise dessert plate without being asked — such a thoughtful touch. Butter chicken and malabar paratha were outstanding.",
  "The filter coffee and ghee roast dosa are the best in the area. Warm interiors, quick service, and the manager remembered our usual order!",
  "Hosted a team dinner of 14. The private dining area, the sampler platters and the service were all seamless. Everyone left happy.",
  "Great coastal flavors — the appam and stew were authentic. Service was prompt even on a busy evening.",
  "Solid neighbourhood option. Chicken 65 was crisp and the mutton sukka had proper heat. Valet tie-up on weekends is a nice touch.",
  "The biryani here is easily the best in the neighbourhood. Generous portions and genuinely courteous staff.",
  "Lovely ambience for a date night. The dessert platter was the highlight and the team sang along for our anniversary!",
];
const NEU_TEXT = [
  "Food is tasty but portion sizes have shrunk while prices went up. Hope the team reconsider the value equation.",
  "Decent spot for a work lunch, though the music was a bit loud to talk. Biryani was lovely, parking took a while.",
  "Good food overall. Weekend crowd makes service slightly slow, weekdays are much better.",
];
const NEG_TEXT = [
  "Waited 40 minutes despite a reservation. Food was good but the delay spoiled the evening. Expected better coordination on a Saturday.",
  "Order arrived cold and missing items on delivery. Packaging was leaking. Very disappointing experience overall.",
  "Order was mixed up twice at the counter and the wait crossed half an hour even with the place half empty.",
];

const REPLIES = [
  "Thank you so much! Delighted your visit hit the mark — your kind words are shared with the whole crew. See you again soon! — Anand, Spice Route Kitchen",
  "Thank you for the detailed note — we're on it. Hope to welcome you back for a noticeably better visit. — Anand, Spice Route Kitchen",
  "We're truly sorry about the wait — that is not the experience we intend. Saturday staffing has been corrected and our manager would love to make this right personally. — Anand, Spice Route Kitchen",
];

async function main() {
  console.log("Clearing existing data…");
  await db.systemEvent.deleteMany();
  await db.demoRequest.deleteMany();
  await db.syncLog.deleteMany();
  await db.activityLog.deleteMany();
  await db.aiUsageEvent.deleteMany();
  await db.tenantFlag.deleteMany();
  await db.featureFlag.deleteMany();
  await db.tenantGateway.deleteMany();
  await db.gatewayConfig.deleteMany();
  await db.invoice.deleteMany();
  await db.guestFeedback.deleteMany();
  await db.campaign.deleteMany();
  await db.aiDraft.deleteMany();
  await db.review.deleteMany();
  await db.location.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
  await db.plan.deleteMany();

  const pw = hashPassword(DEMO_PW);

  /* ---------------------------------- plans --------------------------------- */
  console.log("Plans…");
  await db.plan.createMany({
    data: [
      {
        // Doc Section 2 pricing: Starter ₹1,499 — 1 location · 2 users ·
        // "Target: single clinics, salons, restaurants, service businesses"
        id: "starter", name: "Starter", monthlyInr: 1499, halfYearlyInr: 7495, annualInr: 14990, locations: 1, seats: 2,
        aiDrafts: "50 / month", waQuota: 200, sortOrder: 1,
        blurb: "For single clinics, salons, restaurants and service businesses.",
        features: JSON.stringify([
          "1 Google Business Profile — full review monitoring", "AI replies in your brand voice",
          "Reputation Health Score", "Basic sentiment analysis",
          "WhatsApp review requests — 200 / month", "2 users",
        ]),
      },
      {
        // Doc Section 2: Growth ₹3,499 — up to 5 locations · 5 users · "This should be your main plan"
        id: "growth", name: "Growth", monthlyInr: 3499, halfYearlyInr: 17495, annualInr: 34990, locations: 5, seats: 5,
        aiDrafts: "300 / month", waQuota: 1000, sortOrder: 2, popular: true,
        blurb: "The main plan — multi-branch teams that run on their reputation.",
        features: JSON.stringify([
          "Up to 5 Google Business Profiles", "Everything in Starter",
          "Location comparison & benchmarking", "Staff mentions (coaching view)",
          "Issue detection & Action Center", "WhatsApp automation — 1,000 / month",
          "Weekly AI insights · manager dashboards", "5 users",
        ]),
      },
      {
        // Doc Section 2: Scale ₹5,999 — up to 10 locations · unlimited managers · priority support
        id: "multi", name: "Scale", monthlyInr: 5999, halfYearlyInr: 29995, annualInr: 59990, locations: 10, seats: 99,
        aiDrafts: "Unlimited · fair use", waQuota: 5000, sortOrder: 3,
        blurb: "Regional brands running reputation as a management program.",
        features: JSON.stringify([
          "Up to 10 Google Business Profiles", "Everything in Growth",
          "Regional dashboards & advanced drill-down", "Location benchmarking",
          "Issue & action tracking · automated reports", "Unlimited managers · priority support",
        ]),
      },
    ],
  });
  const plans = await db.plan.findMany();
  const planId = Object.fromEntries(plans.map((p) => [p.id, p.id])) as Record<string, string>;

  /* ------------------------------- platform admin ---------------------------- */
  console.log("Platform admin + staff…");
  await db.user.create({
    data: { email: "admin@sensiblee.in", passwordHash: pw, name: "Ops Console", phone: "+91 98450 00001", role: "platform_admin" },
  });
  // Platform admin team members — roles defined by the platform administrator
  await db.user.createMany({
    data: [
      { email: "meera@sensiblee.in", passwordHash: pw, name: "Meera Krishnan", phone: "+91 98450 00002", role: "platform_manager", lastLoginAt: ago(0, 9) },
      { email: "vikram@sensiblee.in", passwordHash: pw, name: "Vikram Desai", phone: "+91 98450 00003", role: "platform_observer", invitePending: true },
    ],
  });

  /* --------------------------------- tenants -------------------------------- */
  console.log("Tenants…");

  const defaultSettings = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      tone: "warm", autoApproveThreshold: 90, greeting: "Anand",
      signature: "— Anand, Spice Route Kitchen", category: "South Indian restaurant",
      website: "spiceroute.in", digestLanguage: "English (India)",
      notifs: { digest: true, negative: true, weekly: true, billing: false },
      onboarding: { done: true },
      ...over,
    });

  // --- 1. Spice Route Kitchen (flagship demo tenant) ---
  const spk = await db.tenant.create({
    data: {
      name: "Spice Route Kitchen", slug: "spice-route", planId: planId.multi, status: "active",
      mrrInr: 5999, gstin: "29ABCDE1234F1Z5", contactName: "Anand Menon",
      contactEmail: "anand@spiceroute.in", contactPhone: "+91 98450 11223",
      nextInvoiceAt: ahead(13), settings: defaultSettings(),
      whatsappName: "Spice Route Kitchen", whatsappPhone: "+91 98450 12345",
      createdAt: ago(220),
    },
  });
  await db.user.createMany({
    data: [
      { email: "anand@spiceroute.in", passwordHash: pw, name: "Anand Menon", phone: "+91 98450 11223", role: "owner", tenantId: spk.id, lastLoginAt: ago(0, 5) },
      { email: "divya@spiceroute.in", passwordHash: pw, name: "Divya Suresh", phone: "+91 98450 11224", role: "manager", tenantId: spk.id, lastLoginAt: ago(1, 2) },
      { email: "rahul@spiceroute.in", passwordHash: pw, name: "Rahul Prasad", phone: "+91 98450 11225", role: "observer", tenantId: spk.id, invitePending: true },
    ],
  });

  const spkLocs = await Promise.all(
    [
      { code: "spk-kor", name: "Spice Route Koramangala", area: "Koramangala 5th Block", rating: 4.7, delta: 0.2, reviews: 862, book: 640, resp: 96, avg: 100, health: [["Food quality", 95], ["Service", 96], ["Ambience", 94], ["Value", 82]] },
      { code: "spk-ind", name: "Spice Route Indiranagar", area: "100 Feet Road", rating: 4.5, delta: 0.1, reviews: 641, book: 520, resp: 91, avg: 125, health: [["Food quality", 92], ["Service", 88], ["Ambience", 84], ["Value", 80]] },
      { code: "spk-hsr", name: "Spice Route HSR Layout", area: "Sector 2", rating: 4.3, delta: -0.1, reviews: 418, book: 380, resp: 84, avg: 340, health: [["Food quality", 86], ["Service", 68], ["Ambience", 88], ["Value", 74]] },
    ].map((l) =>
      db.location.create({
        data: {
          tenantId: spk.id, code: l.code, name: l.name, area: l.area,
          address: `${l.area}, Bengaluru`, phone: "+91 98450 11223",
          googlePlaceId: `ChIJ${l.code.toUpperCase()}DEMO`, googleReviewUrl: `https://search.google.com/local/writereview?placeid=ChIJ${l.code.toUpperCase()}DEMO`,
          rating: l.rating, ratingDelta: l.delta, reviewCount: l.reviews,
          contactBookSize: l.book, responseRate: l.resp, avgResponseMins: l.avg,
          health: JSON.stringify(l.health.map(([label, score]) => ({ label, score }))),
          lastSyncAt: ago(0, 0.03), syncCount: 40 + Math.floor(rand() * 20),
        },
      })
    )
  );

  // --- 2..6 other tenants ---
  const others: { t: typeof spk; locs: { code: string; name: string; area: string; rating: number; reviews: number }[]; email: string; owner: string; mrr: number; plan: string; status: string; settings: string; created: number }[] = [];
  async function makeTenant(cfg: typeof others[number]) {
    const t = await db.tenant.create({
      data: {
        name: cfg.t.name, slug: cfg.t.slug, planId: planId[cfg.plan], status: cfg.status,
        mrrInr: cfg.mrr, contactName: cfg.owner, contactEmail: cfg.email,
        gstin: cfg.t.gstin, contactPhone: cfg.t.contactPhone, trialEndsAt: cfg.t.trialEndsAt,
        nextInvoiceAt: cfg.t.nextInvoiceAt, settings: cfg.settings, createdAt: ago(cfg.created),
        whatsappName: cfg.t.whatsappName, whatsappPhone: cfg.t.whatsappPhone,
      },
    });
    await db.user.create({ data: { email: cfg.email, passwordHash: pw, name: cfg.owner, phone: t.contactPhone, role: "owner", tenantId: t.id, lastLoginAt: ago(1) } });
    const locs = await Promise.all(
      cfg.locs.map((l) =>
        db.location.create({
          data: {
            tenantId: t.id, code: l.code, name: l.name, area: l.area,
            googlePlaceId: `ChIJ${l.code.toUpperCase()}DEMO`, googleReviewUrl: `https://search.google.com/local/writereview?placeid=ChIJ${l.code.toUpperCase()}DEMO`,
            rating: l.rating, ratingDelta: Number((rand() * 0.3 - 0.1).toFixed(1)), reviewCount: l.reviews,
            contactBookSize: Math.floor(l.reviews / 3), responseRate: 80 + Math.floor(rand() * 15),
            avgResponseMins: 100 + Math.floor(rand() * 200),
            health: JSON.stringify([{ label: "Service", score: 74 + Math.floor(rand() * 20) }, { label: "Quality", score: 80 + Math.floor(rand() * 15) }, { label: "Value", score: 70 + Math.floor(rand() * 20) }]),
            lastSyncAt: ago(0, rand() * 2), syncCount: 30 + Math.floor(rand() * 20),
          },
        })
      )
    );
    return { t, locs };
  }

  const lumiere = await makeTenant({
    t: { name: "Lumiere Dental Care", slug: "lumiere", gstin: "36AAHCL9021K1ZB", contactPhone: "+91 90000 44551", trialEndsAt: null, nextInvoiceAt: ahead(15), whatsappName: "Lumiere Dental", whatsappPhone: "+91 90000 44551" } as typeof spk,
    locs: [{ code: "lum-som", name: "Lumiere Dental — Somajiguda", area: "Somajiguda, Hyderabad", rating: 4.8, reviews: 640 }],
    email: "kavya@lumieredental.in", owner: "Dr. Kavya Reddy", mrr: 2499, plan: "growth", status: "active",
    settings: JSON.stringify({ tone: "formal", autoApproveThreshold: 85, greeting: "Dr. Kavya", signature: "— Dr. Kavya Reddy, Lumiere Dental Care", category: "Dental clinic", website: "lumieredental.in", notifs: { digest: true, negative: true, weekly: true, billing: true }, onboarding: { done: true }, staff: [] }),
    created: 190,
  });
  const iron = await makeTenant({
    t: { name: "Iron & Iris Fitness", slug: "iron-iris", gstin: "27AAFCI4488M1Z7", contactPhone: "+91 98220 77114", trialEndsAt: null, nextInvoiceAt: ahead(9), whatsappName: "Iron & Iris", whatsappPhone: "+91 98220 77114" } as typeof spk,
    locs: [{ code: "ii-kaly", name: "Iron & Iris Kalyaninagar", area: "Kalyani Nagar, Pune", rating: 4.4, reviews: 288 }],
    email: "sameer@ironandiris.fit", owner: "Sameer Shah", mrr: 999, plan: "starter", status: "active",
    settings: JSON.stringify({ tone: "playful", autoApproveThreshold: 80, greeting: "Sameer", signature: "— Sameer, Iron & Iris", category: "Fitness studio", website: "ironandiris.fit", notifs: { digest: true, negative: true, weekly: false, billing: false }, onboarding: { done: true }, staff: [] }),
    created: 150,
  });
  const bloom = await makeTenant({
    t: { name: "Bloom Florists", slug: "bloom", gstin: "29AAGFB7781P1Z2", contactPhone: "+91 98860 33447", trialEndsAt: ahead(12), nextInvoiceAt: null, whatsappName: "Bloom Florists", whatsappPhone: "+91 98860 33447" } as typeof spk,
    locs: [{ code: "bloom-jay", name: "Bloom Florists Jayanagar", area: "Jayanagar, Bengaluru", rating: 4.6, reviews: 154 }],
    email: "nandini@bloomflorists.in", owner: "Nandini Rao", mrr: 999, plan: "starter", status: "trial",
    settings: JSON.stringify({ tone: "warm", autoApproveThreshold: 90, greeting: "Nandini", signature: "— Nandini, Bloom Florists", category: "Florist", website: "bloomflorists.in", notifs: { digest: true, negative: true, weekly: false, billing: false }, onboarding: { done: true }, staff: [] }),
    created: 18,
  });
  const mandala = await makeTenant({
    t: { name: "Cafe Mandala", slug: "cafe-mandala", gstin: "29AAJCC1180Q1Z9", contactPhone: "+91 97400 55810", trialEndsAt: null, nextInvoiceAt: ago(9), whatsappName: "Cafe Mandala", whatsappPhone: "+91 97400 55810" } as typeof spk,
    locs: [{ code: "cm-fra", name: "Cafe Mandala Frazer Town", area: "Frazer Town, Bengaluru", rating: 4.2, reviews: 512 }],
    email: "tenzin@cafemandala.in", owner: "Tenzin W.", mrr: 2499, plan: "growth", status: "past_due",
    settings: JSON.stringify({ tone: "warm", autoApproveThreshold: 90, greeting: "Tenzin", signature: "— Tenzin, Cafe Mandala", category: "Cafe", website: "cafemandala.in", notifs: { digest: true, negative: true, weekly: true, billing: true }, onboarding: { done: true }, staff: [] }),
    created: 240,
  });
  const urban = await makeTenant({
    t: { name: "UrbanNest Realty", slug: "urbannest", gstin: "29AAECU6612R1ZK", contactPhone: "+91 99860 21009", trialEndsAt: null, nextInvoiceAt: ahead(21), whatsappName: "UrbanNest Realty", whatsappPhone: "+91 99860 21009" } as typeof spk,
    locs: [
      { code: "un-whf", name: "UrbanNest Whitefield", area: "Whitefield, Bengaluru", rating: 4.5, reviews: 240 },
      { code: "un-ind", name: "UrbanNest Indiranagar", area: "Indiranagar, Bengaluru", rating: 4.4, reviews: 137 },
    ],
    email: "farhan@urbannest.co.in", owner: "Farhan Ali", mrr: 3298, plan: "growth", status: "active",
    settings: JSON.stringify({ tone: "formal", autoApproveThreshold: 88, greeting: "Farhan", signature: "— Farhan, UrbanNest Realty", category: "Real estate", website: "urbannest.co.in", notifs: { digest: true, negative: true, weekly: true, billing: false }, onboarding: { done: true }, staff: [] }),
    created: 120,
  });

  /* --------------------------------- reviews --------------------------------- */
  console.log("Reviews…");
  type ReviewSpec = { locIdx: number; daysAgo: number; hoursAgo?: number; stars: number; status: string; source?: string };
  const spkSpecs: ReviewSpec[] = [
    { locIdx: 0, daysAgo: 0, hoursAgo: 2, stars: 5, status: "ai-draft" },            // Ananya 5★ draft
    { locIdx: 2, daysAgo: 0, hoursAgo: 5, stars: 2, status: "ai-draft" },            // Rohit 2★ urgent
    { locIdx: 1, daysAgo: 0, hoursAgo: 8, stars: 4, status: "replied" },
    { locIdx: 2, daysAgo: 1, hoursAgo: 4, stars: 1, status: "awaiting" },            // Karthik SLA
    { locIdx: 0, daysAgo: 1, hoursAgo: 10, stars: 5, status: "replied" },
    { locIdx: 1, daysAgo: 2, hoursAgo: 3, stars: 3, status: "ai-draft" },            // Aditya
    { locIdx: 0, daysAgo: 2, hoursAgo: 9, stars: 5, status: "replied" },
    { locIdx: 2, daysAgo: 3, hoursAgo: 1, stars: 4, status: "replied" },
    { locIdx: 0, daysAgo: 4, stars: 5, status: "replied" },
    { locIdx: 1, daysAgo: 5, stars: 2, status: "replied" },
    { locIdx: 2, daysAgo: 6, stars: 5, status: "replied" },
    { locIdx: 0, daysAgo: 7, stars: 4, status: "replied" },
    { locIdx: 1, daysAgo: 9, stars: 5, status: "replied" },
    { locIdx: 2, daysAgo: 10, stars: 3, status: "replied" },
    { locIdx: 0, daysAgo: 12, stars: 5, status: "replied", source: "request" },
    { locIdx: 1, daysAgo: 14, stars: 4, status: "replied", source: "request" },
    { locIdx: 2, daysAgo: 16, stars: 1, status: "replied" },
    { locIdx: 0, daysAgo: 18, stars: 5, status: "replied", source: "request" },
    { locIdx: 1, daysAgo: 21, stars: 5, status: "replied" },
    { locIdx: 2, daysAgo: 24, stars: 4, status: "replied", source: "request" },
    { locIdx: 0, daysAgo: 28, stars: 4, status: "replied" },
    { locIdx: 1, daysAgo: 33, stars: 5, status: "replied", source: "request" },
    { locIdx: 2, daysAgo: 38, stars: 2, status: "replied" },
    { locIdx: 0, daysAgo: 45, stars: 5, status: "replied" },
    { locIdx: 1, daysAgo: 52, stars: 4, status: "replied", source: "request" },
    { locIdx: 2, daysAgo: 60, stars: 5, status: "replied" },
  ];

  let nameIdx = 0;
  const nextName = () => NAMES[nameIdx++ % NAMES.length];

  for (const spec of spkSpecs) {
    const loc = spkLocs[spec.locIdx];
    const author = nextName();
    const baseText = spec.stars >= 4 ? pick(POS_TEXT) : spec.stars === 3 ? pick(NEU_TEXT) : pick(NEG_TEXT);
    const baseKw = spec.stars >= 4 ? pick(KW_POS) : spec.stars === 3 ? pick(KW_NEU) : pick(KW_NEG);
    const { text, keywords } = withStaff(baseText, baseKw, spec.stars);
    const sentiment = spec.stars >= 4 ? "positive" : spec.stars === 3 ? "neutral" : "negative";
    const createdAt = ago(spec.daysAgo, spec.hoursAgo || 0);
    const review = await db.review.create({
      data: {
        tenantId: spk.id, locationId: loc.id, author, stars: spec.stars, text,
        sentiment, keywords: JSON.stringify(keywords), status: spec.status,
        source: spec.source || "google",
        createdAt,
        replyText: spec.status === "replied" ? pick(REPLIES) : null,
        repliedAt: spec.status === "replied" ? new Date(createdAt.getTime() + (1 + rand() * 20) * 3600_000) : null,
        repliedBy: spec.status === "replied" ? "Anand Menon" : null,
      },
    });
    if (spec.status === "ai-draft") {
      const bodies: Record<number, string> = {
        5: `Thank you so much, ${author.split(" ")[0]}! We're delighted we could make the occasion special. A warm thank-you from the Spice Route family — we look forward to hosting you again soon! — Anand, Spice Route Kitchen`,
        3: `${author.split(" ")[0]}, thank you for the honest feedback — portions and value are something we actively review. We hope to welcome you back and change the math for you. — Anand, Spice Route Kitchen`,
        2: `${author.split(" ")[0]}, we're truly sorry about the wait on Saturday — that is not the experience we intend. We're reviewing our Saturday reservation staffing and our manager will reach out personally today. — Anand, Spice Route Kitchen`,
      };
      await db.aiDraft.create({
        data: {
          reviewId: review.id, body: bodies[spec.stars] || bodies[3],
          tone: spec.stars <= 2 ? "apologetic" : spec.stars === 3 ? "professional" : "warm",
          confidence: spec.stars === 5 ? 0.96 : spec.stars === 2 ? 0.91 : 0.84,
          createdAt: new Date(createdAt.getTime() + 9 * 60_000),
        },
      });
    }
  }

  async function seedReviewsFor(tenantId: string, locs: { id: string }[], count: number, baseDays: number) {
    for (let i = 0; i < count; i++) {
      const loc = locs[i % locs.length];
      const author = nextName();
      const stars = [5, 4, 5, 3, 4, 5, 2, 4][Math.floor(rand() * 8)];
      const baseText = stars >= 4 ? pick(POS_TEXT) : stars === 3 ? pick(NEU_TEXT) : pick(NEG_TEXT);
      const baseKw = stars >= 4 ? pick(KW_POS) : stars === 3 ? pick(KW_NEU) : pick(KW_NEG);
      const { text, keywords } = withStaff(baseText, baseKw, stars);
      const createdAt = ago(Math.floor(rand() * baseDays) + 1, Math.floor(rand() * 12));
      const status = rand() > 0.25 ? "replied" : rand() > 0.4 ? "awaiting" : "ai-draft";
      const review = await db.review.create({
        data: {
          tenantId, locationId: loc.id, author, stars, text,
          sentiment: stars >= 4 ? "positive" : stars === 3 ? "neutral" : "negative",
          keywords: JSON.stringify(keywords), status, source: rand() > 0.7 ? "request" : "google",
          createdAt,
          replyText: status === "replied" ? pick(REPLIES) : null,
          repliedAt: status === "replied" ? new Date(createdAt.getTime() + 5 * 3600_000) : null,
          repliedBy: status === "replied" ? "Owner" : null,
        },
      });
      if (status === "ai-draft") {
        await db.aiDraft.create({
          data: {
            reviewId: review.id,
            body: stars <= 2
              ? `${author.split(" ")[0]}, we're truly sorry about this experience. Our manager will reach out personally to make it right.`
              : `Thank you so much, ${author.split(" ")[0]}! Delighted your visit hit the mark — see you again soon!`,
            tone: stars <= 2 ? "apologetic" : "warm",
            confidence: 0.82 + rand() * 0.15,
            createdAt: new Date(createdAt.getTime() + 15 * 60_000),
          },
        });
      }
    }
  }
  await seedReviewsFor(lumiere.t.id, lumiere.locs, 14, 60);
  await seedReviewsFor(iron.t.id, iron.locs, 10, 50);
  await seedReviewsFor(bloom.t.id, bloom.locs, 6, 14);
  await seedReviewsFor(mandala.t.id, mandala.locs, 12, 70);
  await seedReviewsFor(urban.t.id, urban.locs, 10, 55);

  /* -------------------------------- campaigns -------------------------------- */
  console.log("Campaigns…");
  const campaignSeed = [
    { t: spk.id, loc: spkLocs[0].id, name: "Weekend Feast — Post-dining burst", channel: "whatsapp", tmpl: "Post-dining thank you", rec: 420, sent: 412, opened: 388, clicked: 148, gen: 57, status: "running", days: 6 },
    { t: spk.id, loc: null, name: "Table QR — ongoing rollout", channel: "qr", tmpl: null, rec: 1310, sent: 1310, opened: 1240, clicked: 476, gen: 96, status: "running", days: 48 },
    { t: spk.id, loc: spkLocs[1].id, name: "Loyal regulars — Thank-you note", channel: "whatsapp", tmpl: "Loyal regular note", rec: 236, sent: 236, opened: 221, clicked: 92, gen: 41, status: "completed", days: 29 },
    { t: spk.id, loc: spkLocs[2].id, name: "Delivery follow-up wave", channel: "whatsapp", tmpl: "Delivery follow-up", rec: 0, sent: 0, opened: 0, clicked: 0, gen: 0, status: "scheduled", days: -2 },
    { t: lumiere.t.id, loc: lumiere.locs[0].id, name: "Post-appointment follow-up", channel: "whatsapp", tmpl: "Post-visit thank you", rec: 48, sent: 48, opened: 44, clicked: 26, gen: 12, status: "completed", days: 8 },
    { t: mandala.t.id, loc: mandala.locs[0].id, name: "Sunday brunch crowd", channel: "whatsapp", tmpl: "Post-dining thank you", rec: 130, sent: 130, opened: 118, clicked: 41, gen: 9, status: "completed", days: 20 },
    { t: urban.t.id, loc: urban.locs[0].id, name: "Site-visit follow-up", channel: "whatsapp", tmpl: "Site visit thank you", rec: 64, sent: 64, opened: 59, clicked: 22, gen: 7, status: "completed", days: 12 },
  ];
  for (const c of campaignSeed) {
    await db.campaign.create({
      data: {
        tenantId: c.t, locationId: c.loc, name: c.name, channel: c.channel, template: c.tmpl,
        recipients: c.rec, sent: c.sent, opened: c.opened, clicked: c.clicked,
        reviewsGenerated: c.gen, status: c.status, createdAt: ago(Math.max(c.days, 1)),
      },
    });
  }

  /* ------------------------------ guest feedback ----------------------------- */
  console.log("Guest feedback…");
  const moods = ["smile", "smile", "smile", "meh", "frown", "smile", "meh", "smile"];
  for (const loc of [...spkLocs, ...lumiere.locs, ...mandala.locs]) {
    const n = loc.tenantId === spk.id ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const mood = moods[Math.floor(rand() * moods.length)];
      const isFrown = mood === "frown";
      await db.guestFeedback.create({
        data: {
          locationId: loc.id, tenantId: loc.tenantId, mood,
          rating: mood === "smile" ? 5 : mood === "meh" ? 3 : null,
          text: isFrown ? pick(["Waited too long for the order even though the cafe was empty.", "Music was too loud and the table wasn't cleaned for 15 minutes."]) : mood === "meh" ? pick(["Food took a while but tasted fine.", "Seating area felt cramped on Sunday evening."]) : null,
          optedIn: rand() > 0.5, phone: rand() > 0.6 ? "+91 98" + String(Math.floor(rand() * 100000000)).padStart(8, "0") : null,
          createdAt: ago(Math.floor(rand() * 20) + 1, Math.floor(rand() * 10)),
        },
      });
    }
  }

  /* --------------------------------- invoices -------------------------------- */
  console.log("Invoices…");
  let invNo = 1001;
  async function invoice(tenantId: string, amount: number, status: string, start: Date, method = "UPI · Razorpay") {
    await db.invoice.create({
      data: {
        tenantId, number: `SS-2026-${invNo++}`, amountInr: amount, method, status,
        periodStart: start, periodEnd: new Date(start.getTime() + 30 * 86400_000),
        dueAt: new Date(start.getTime() + 7 * 86400_000),
        paidAt: status === "paid" ? new Date(start.getTime() + 2 * 86400_000) : null,
      },
    });
  }
  for (let m = 5; m >= 1; m--) await invoice(spk.id, 4999, "paid", ago(m * 30));
  await invoice(spk.id, 4999, "paid", ago(17));
  for (let m = 5; m >= 1; m--) await invoice(mandala.t.id, 2499, "paid", ago((m + 1) * 30), "Auto-debit · Razorpay");
  await invoice(mandala.t.id, 2499, "overdue", ago(12), "Auto-debit · Razorpay");
  await invoice(lumiere.t.id, 2499, "paid", ago(15), "Card · Visa 4411");
  await invoice(iron.t.id, 999, "paid", ago(9));
  await invoice(bloom.t.id, 0, "pending", ago(17), "On conversion");
  await invoice(urban.t.id, 3298, "paid", ago(10), "NetBanking · HDFC");
  await invoice(urban.t.id, 2499, "paid", ago(40), "NetBanking · HDFC");

  /* ------------------------------ activity + syncs ---------------------------- */
  console.log("Activity & sync logs…");
  await db.activityLog.createMany({
    data: [
      { tenantId: spk.id, actor: "system", action: "google.sync.completed", detail: "3 profiles synced · 2 new reviews scored", createdAt: ago(0, 2) },
      { tenantId: spk.id, actor: "anand@spiceroute.in", action: "reply.approved", detail: "5★ reply published for Ananya S.", createdAt: ago(0, 3) },
      { tenantId: spk.id, actor: "system", action: "campaign.sent", detail: "Weekend Feast burst · 412 requests · 94% opened", createdAt: ago(6) },
      { tenantId: spk.id, actor: "system", action: "subscription.renewed", detail: "Scale plan · ₹5,999 via UPI auto-debit", createdAt: ago(17) },
      { tenantId: mandala.t.id, actor: "system", action: "dunning.retry_failed", detail: "Auto-debit returned 'insufficient funds' · retry 2/5", createdAt: ago(0, 7) },
      { tenantId: mandala.t.id, actor: "system", action: "invoice.failed", detail: "Invoice ₹2,499 failed · Razorpay event pay_fail", createdAt: ago(12) },
      { tenantId: bloom.t.id, actor: "nandini@bloomflorists.in", action: "reply.approved", detail: "First AI draft approved — 5★ reply published", createdAt: ago(2) },
      { tenantId: lumiere.t.id, actor: "system", action: "template.approved", detail: "'Post-visit thank you' cleared WhatsApp review", createdAt: ago(5) },
    ],
  });

  const syncLogRows: { locationId: string; state: string; message: string; newReviews: number; latencyMs: number; createdAt: Date }[] = [];
  for (const loc of [...spkLocs, ...lumiere.locs, ...iron.locs, ...mandala.locs, ...urban.locs]) {
    for (let i = 0; i < 5; i++) {
      const isNew = i === 1 && rand() > 0.4;
      const isHsr = loc.code === "spk-hsr";
      syncLogRows.push({
        locationId: loc.id,
        state: isHsr && i === 3 ? "error" : isHsr && i === 0 ? "warn" : i === 4 && rand() > 0.7 ? "warn" : "ok",
        message: isNew ? `${1 + Math.floor(rand() * 2)} new review${rand() > 0.5 ? "s" : ""} · sentiment scored` : isHsr && i === 3 ? "OAuth token expired · re-auth card shown" : isHsr && i === 0 ? "Google API latency 4.1 s · cursor saved" : `No new reviews · latency ${360 + Math.floor(rand() * 220)} ms`,
        newReviews: isNew ? 1 + Math.floor(rand() * 2) : 0,
        latencyMs: 360 + Math.floor(rand() * 400),
        createdAt: ago(0, 0.25 * (i + 1)),
      });
    }
  }
  await db.syncLog.createMany({ data: syncLogRows });

  /* -------------------------------- system events ---------------------------- */
  await db.systemEvent.createMany({
    data: [
      { type: "deploy", name: "app deploy v2.4.1", state: "ok", detail: "Rolled out to production · 0 errors", createdAt: ago(2, 4) },
      { type: "job", name: "google-sync", state: "ok", detail: "All 10 profiles healthy · avg latency 412 ms", createdAt: ago(0, 0.2) },
      { type: "job", name: "whatsapp-sender", state: "ok", detail: "14 messages queued · quality rating HIGH", createdAt: ago(0, 0.3) },
      { type: "job", name: "ai-worker", state: "ok", detail: "3 drafts queued · p95 2.8 s", createdAt: ago(0, 0.4) },
      { type: "job", name: "webhook-receiver", state: "warn", detail: "1 retrying · Razorpay callback backlog 6.4 s", createdAt: ago(0, 1) },
      { type: "signal", name: "Cafe Mandala dunning", state: "error", detail: "Auto-debit failed · day 9 of grace period", createdAt: ago(0, 8) },
    ],
  });

  /* -------------------------------- demo requests ---------------------------- */
  await db.demoRequest.createMany({
    data: [
      { name: "Preetham Gowda", email: "preetham@heritagecafes.in", company: "Heritage Cafes", phone: "+91 99000 12345", outlets: "4 outlets", message: "Looking for multi-location review management across our cafe brand.", createdAt: ago(1, 3) },
      { name: "Meenal Desai", email: "meenal@glowlabs.co", company: "Glow Labs", phone: "+91 98200 55443", outlets: "2 outlets", message: "Saw the QR flow at Spice Route — want the same for our clinics.", createdAt: ago(3) },
    ],
  });

  /* -------------------------------- feature flags ---------------------------- */
  // System master switches × tenant opt-ins = effective. Metering seeds make the
  // AI usage dashboard and monthly reports show real-looking data.
  const flagWa = await db.featureFlag.create({
    data: { key: "whatsapp_requests", label: "WhatsApp review requests", description: "Send review invitations over the WhatsApp Business Cloud API with pre-approved templates and per-guest opt-in records.", enabled: true },
  });
  const flagPdf = await db.featureFlag.create({
    data: { key: "monthly_pdf", label: "Monthly PDF report", description: "Automated month-in-review PDF: ratings, sentiment split, reply performance, WhatsApp funnel and AI usage — ready to forward to owners.", enabled: true },
  });
  const flagMeter = await db.featureFlag.create({
    data: { key: "ai_metering", label: "AI usage metering", description: "Meter every AI draft and classification against the plan quota, with a live usage dashboard and CSV export.", enabled: true },
  });

  const allTenants = await db.tenant.findMany({ select: { id: true, planId: true, createdAt: true } });
  const optIns: { tenantId: string; flagId: string; optedIn: boolean }[] = [];
  for (const t of allTenants) {
    if (t.planId !== "starter") optIns.push({ tenantId: t.id, flagId: flagWa.id, optedIn: true });
    if (["growth", "multi"].includes(t.planId)) optIns.push({ tenantId: t.id, flagId: flagPdf.id, optedIn: true });
    if (t.planId === "multi") optIns.push({ tenantId: t.id, flagId: flagMeter.id, optedIn: true });
  }
  await db.tenantFlag.createMany({ data: optIns });

  const aiEvents: { tenantId: string; kind: string; model: string; tokens: number; createdAt: Date }[] = [];
  for (const t of allTenants) {
    const n = t.planId === "multi" ? 64 : t.planId === "growth" ? 40 : 18;
    for (let i = 0; i < n; i++) {
      const kind = rand() < 0.62 ? "draft" : "classify";
      const daysBack = rand() * 38;
      aiEvents.push({
        tenantId: t.id, kind,
        model: rand() < 0.9 ? "glm" : "fallback",
        tokens: kind === "draft" ? 320 + Math.floor(rand() * 520) : 90 + Math.floor(rand() * 130),
        createdAt: ago(daysBack),
      });
    }
  }
  await db.aiUsageEvent.createMany({ data: aiEvents });

  /* ------------------------- payment gateways -------------------------- */
  // System registry (credentials stay empty in demo) × per-tenant provisioning.
  // Enterprise runs live auto-debit on Razorpay; growth/starter on test mode.
  const gwRazorpay = await db.gatewayConfig.create({
    data: { provider: "razorpay", label: "Razorpay", description: "UPI, cards, net-banking and auto-debit mandates — the primary collection rail for INR subscriptions.", enabled: true, keyId: "rzp_test_demo123" },
  });
  await db.gatewayConfig.create({
    data: { provider: "cashfree", label: "Cashfree", description: "Alternative INR collection with same-day settlements and UPI autopay support.", enabled: false },
  });
  await db.gatewayConfig.create({
    data: { provider: "stripe", label: "Stripe", description: "International cards for overseas franchises billing outside the INR rails.", enabled: false },
  });

  const namedTenants = await db.tenant.findMany({ where: { name: { in: ["Spice Route Kitchen", "Cafe Mandala", "Iron & Iris Fitness"] } }, select: { id: true, name: true } });
  const tn = (name: string) => namedTenants.find((t) => t.name === name)?.id;
  const gwProvisions = [
    { tenantId: tn("Spice Route Kitchen"), mode: "live", accountRef: "acct_spk_live_01" },
    { tenantId: tn("Cafe Mandala"), mode: "test", accountRef: "" },
    { tenantId: tn("Iron & Iris Fitness"), mode: "test", accountRef: "" },
  ].filter((p) => Boolean(p.tenantId));
  if (gwProvisions.length) {
    await db.tenantGateway.createMany({ data: gwProvisions.map((p) => ({ ...p, gatewayId: gwRazorpay.id, status: "active" })) });
  }

  const counts = {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    locations: await db.location.count(),
    reviews: await db.review.count(),
    drafts: await db.aiDraft.count(),
    campaigns: await db.campaign.count(),
    feedback: await db.guestFeedback.count(),
    invoices: await db.invoice.count(),
    aiEvents: aiEvents.length,
  };

  // Marketing CMS — pages, FAQs, blog posts, testimonials, settings
  const cms = await seedCms(db);

  // Demo custom roles — showcase the roles & permissions builders (unassigned, so
  // seeded user behaviour is unchanged until an owner assigns them)
  await db.user.updateMany({ where: { roleId: { not: null } }, data: { roleId: null } });
  await db.customRole.deleteMany({});
  await db.customRole.create({
    data: {
      scope: "tenant", tenantId: spk.id, name: "Front Desk Agent",
      description: "Handles review replies for front-desk shifts — no settings or campaigns",
      permissions: JSON.stringify(["reviews_view", "reviews_reply", "locations_view"]),
    },
  });
  await db.customRole.create({
    data: {
      scope: "platform", tenantId: null, name: "Content Editor",
      description: "Marketing site only — pages, blog, FAQs, media, demo requests",
      permissions: JSON.stringify(["website_manage", "leads_manage", "clients_view"]),
    },
  });

  const customRoles = await db.customRole.count();

  console.log("Seed complete:", { ...counts, cms, customRoles });
  console.log(`Logins — platform: admin@sensiblee.in · tenant: anand@spiceroute.in · password: ${DEMO_PW}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
