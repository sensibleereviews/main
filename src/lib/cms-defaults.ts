// Sensiblee CMS — built-in content defaults.
// Single source of truth shared by: marketing renderers (fallback when CMS empty),
// the seed script (bootstraps the CMS tables) and the admin editor (field specs).
// Content lives in the DB once seeded; these defaults only guarantee the site never breaks.

export const CMS_PAGE_SLUGS = [
  "home", "features", "how", "pricing", "stories", "security", "about",
  "contact", "privacy", "terms", "knowledge", "blog", "ticket",
] as const;
export type CmsSlug = (typeof CMS_PAGE_SLUGS)[number];

export const CMS_PAGE_TITLES: Record<CmsSlug, string> = {
  home: "Homepage", features: "Features", how: "How it works", pricing: "Pricing",
  stories: "Customer stories", security: "Security & trust", about: "About us",
  contact: "Free trial / Talk to us", privacy: "Privacy Policy", terms: "Terms of Service",
  knowledge: "FAQs", blog: "Blog", ticket: "Submit a ticket",
};

export type SectionHead = { eyebrow: string; title: string; sub: string; action?: string };
export type PageHeroContent = { eyebrow: string; title: string; accent: string; description: string };

export type HomeContent = {
  heroEyebrow: string; heroTitleA: string; heroAccentA: string; heroTitleB: string; heroAccentB: string;
  heroSub: string; heroNote: string;
  stats: { v: string; l: string }[];
  trustedLabel: string;
  overviewSection: { eyebrow: string; title: string; sub: string };
  overview: string[];
  trialCard: { title: string; sub: string; points: string[] };
  modulesSection: SectionHead;
  modules: { title: string; desc: string }[];
  howSection: SectionHead;
  steps: { t: string; d: string }[];
  industriesSection: SectionHead;
  industries: { name: string; ex: string; icon: string }[];
  testimonialsSection: SectionHead;
  pricingSection: SectionHead;
  faqSection: SectionHead;
  blogsSection: SectionHead;
  ctaNote: string;
};

export const HOME_DEFAULTS: HomeContent = {
  heroEyebrow: "AI powered Customer Experience Intelligence",
  heroTitleA: "Reputation,", heroAccentA: "sensed sensibly", heroTitleB: "Acted on", heroAccentB: "intelligently.",
  heroSub:
    "Reputation Intelligence & Review Operations for multi-location businesses — Sensiblee monitors every Google review, drafts replies in your voice, grows fresh reviews over WhatsApp & QR, and turns feedback into a Health Score with assigned fixes you can run the business by.",
  heroNote: "7-day trial · No card required · Pricing in ₹",
  stats: [
    { v: "38.4k", l: "reviews processed monthly" },
    { v: "92%", l: "average response rate" },
    { v: "+0.15★", l: "typical rating lift in 90 days" },
    { v: "48 hrs", l: "from signup to first request sent" },
  ],
  trustedLabel: "Trusted by guest-facing teams across India",
  overviewSection: {
    eyebrow: "The platform in a nutshell",
    title: "What Sensiblee actually does",
    sub: "One sentence: it watches every Google review you earn, answers it in your voice, asks your happiest guests for more — and shows you one honest score for the whole brand.",
  },
  overview: [
    "Connects to the Google Business Profiles you already own through Google's official API — every review, every location, sensed the moment it lands.",
    "Each review is scored for sentiment, keywords and urgency — a two-star Saturday-night review reaches the owner's WhatsApp within minutes.",
    "The AI Reputation Copilot drafts on-brand replies your team approves with one click — 100% human-approved, always.",
    "WhatsApp campaigns and table QR kits invite genuinely happy guests to say it publicly — consent-first, no incentives.",
    "Ratings, themes, locations and staff mentions roll up into one Reputation Health score with a weekly digest you can run the business by.",
    "No scraping, no grey routes — just official APIs, DPDP-compliant consent records and a full audit trail.",
  ],
  trialCard: {
    title: "Try Sensiblee for free",
    sub: "Connect your Google profile and watch Sensiblee sense, draft and ask — on your own reviews — within the first hour.",
    points: [
      "7-day full-feature trial · no card required",
      "Live Google sync + AI drafts in your voice",
      "WhatsApp requests & QR kits included",
    ],
  },
  modulesSection: {
    eyebrow: "The platform", title: "Six modules, one calm engine",
    sub: "Everything your reputation needs — sensing, asking, answering, scoring, drilling down and fixing — designed to work as one.",
    action: "Explore features",
  },
  modules: [
    { title: "Reputation Command Center", desc: "Google review monitoring — every Business Profile synced in minutes, sentiment scored on arrival." },
    { title: "Reputation Health", desc: "Score + trends + benchmarks — one 0–100 North-Star score with the why built in." },
    { title: "AI Reputation Copilot", desc: "Replies + insights + recommendations — on-brand drafts you approve, edit or regenerate." },
    { title: "Review Growth Engine", desc: "WhatsApp + QR + transaction-triggered requests turn happy guests into public proof." },
    { title: "Location Intelligence", desc: "Branch + staff + issue drill-down — scores, themes and coaching context, weakest first." },
    { title: "Reputation Action Center", desc: "Detect → assign → fix → measure — complaints become owned, outcome-tracked fixes." },
  ],
  howSection: {
    eyebrow: "How it works", title: "Live in a day, working in a week",
    sub: "No new app for your staff. Sensiblee wraps around the Google profile you already own and the WhatsApp your guests already use.",
    action: "See the journey",
  },
  steps: [
    { t: "Connect", d: "Sign in with Google, pick your profiles. Historical reviews import immediately." },
    { t: "Sense", d: "15-minute sync scores every review for sentiment, keywords and urgency." },
    { t: "Act", d: "AI drafts replies in your voice; WhatsApp bursts ask your happiest guests." },
    { t: "Learn", d: "Health score, keyword radar and staff trends in a weekly WhatsApp digest." },
  ],
  industriesSection: {
    eyebrow: "Industries", title: "Built for every guest-facing business",
    sub: "If your customers visit, book or review you, Sensiblee senses every signal, asks at the right moment and answers in your voice.",
  },
  industries: [
    { name: "Hotels & Resorts", ex: "Stays, F&B and spa reviews in one health score.", icon: "hotel" },
    { name: "Restaurants & Bars", ex: "Service and dining feedback, table QR kits.", icon: "restaurant" },
    { name: "Cafés & Bakeries", ex: "Turn morning regulars into public proof.", icon: "cafe" },
    { name: "Clinics & Healthcare", ex: "Patient trust with private feedback built in.", icon: "clinic" },
    { name: "Salons & Spas", ex: "Appointment follow-ups that convert.", icon: "salon" },
    { name: "Fitness & Wellness", ex: "Class and trainer feedback loops.", icon: "gym" },
    { name: "Retail & Boutiques", ex: "In-store experience signals, store by store.", icon: "retail" },
    { name: "Education & Coaching", ex: "Parent and student sentiment, term on term.", icon: "school" },
  ],
  testimonialsSection: {
    eyebrow: "Early operators", title: "Built with owners, not just for them",
    sub: "Design-partner feedback from our pilot cohort across restaurants, clinics and fitness studios.",
  },
  pricingSection: {
    eyebrow: "Pricing", title: "Honest pricing",
    sub: "Every plan includes all six modules — billed monthly, half-yearly (10% off) or annually (20% off).",
    action: "Full comparison",
  },
  faqSection: {
    eyebrow: "FAQs", title: "Questions, answered sensibly",
    sub: "Everything operators ask us before switching on — trials, Google access, WhatsApp, data and billing.",
    action: "More answers",
  },
  blogsSection: {
    eyebrow: "From the blog", title: "Reputation, in plain words",
    sub: "Field notes on review response, WhatsApp requests and the calm operations behind a five-star profile.",
    action: "All articles",
  },
  ctaNote: "Free 7-day trial on your live Google profile — no card, no slideware.",
};

export type FeaturesContent = PageHeroContent & {
  modules: { name: string; headline: string; desc: string; points: string[] }[];
};

export const FEATURES_DEFAULTS: FeaturesContent = {
  eyebrow: "Features", title: "Six modules.", accent: "One reputation engine.",
  description: "Get more genuine customer feedback and act on it — Sensiblee senses what guests feel, acts on it intelligently, and shows you the result in one calm, connected platform.",
  modules: [
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
  ],
};

export type HowContent = PageHeroContent & {
  steps: { title: string; time: string; desc: string; points: string[] }[];
  pillars: { t: string; d: string }[];
};

export const HOW_DEFAULTS: HowContent = {
  eyebrow: "How it works", title: "Live in a day.", accent: "Working in a week.",
  description: "No new app for your staff, no scripts to install. Sensiblee wraps around the Google profile you already own and the WhatsApp your guests already use.",
  steps: [
    {
      title: "Connect", time: "Day 0 · 15 minutes",
      desc: "Sign in with Google and pick the Business Profiles you own. Sensiblee starts pulling every review, photo and response through the official Google Business Profile API.",
      points: ["OAuth — no password sharing", "Multi-location aware from day one", "Historical reviews imported"],
    },
    {
      title: "Sense", time: "Every 15 minutes",
      desc: "Each new review is scored for sentiment, keywords and urgency. Critical ones trigger a WhatsApp alert to the owner; the rest queue calmly for the morning digest.",
      points: ["Sentiment + keyword scoring", "Urgent alerts within minutes", "Response SLA tracking begins"],
    },
    {
      title: "Act", time: "Minutes after arrival",
      desc: "The AI drafts a reply in your brand voice and queues it for approval. Meanwhile, request campaigns turn today's happy guests into tomorrow's five-star reviews.",
      points: ["Approve, edit or regenerate drafts", "WhatsApp bursts + QR kits", "Nothing posts without you"],
    },
    {
      title: "Learn", time: "Every week",
      desc: "Ratings, themes, locations and staff roll into the Reputation Health Score. The weekly digest says what improved, what needs attention, and where to act next.",
      points: ["Reputation Health Score", "Location & staff breakdowns", "Owner digest on WhatsApp"],
    },
  ],
  pillars: [
    { t: "Official APIs only", d: "Google Business Profile API, WhatsApp Cloud API — no scraping, no grey routes." },
    { t: "15-minute onboarding", d: "A single call with your Google account and menu of brand-voice samples." },
    { t: "Same-week go-live", d: "First AI drafts and first WhatsApp burst out within 48 hours of connecting." },
  ],
};

export type PricingContent = PageHeroContent & {
  addOns: { name: string; detail: string; price: string }[];
  compareTitle: string; faqTitle: string;
};

export const PRICING_DEFAULTS: PricingContent = {
  eyebrow: "Pricing", title: "Honest pricing,", accent: "built to scale.",
  description: "One brand, one price. Every plan includes monitoring, requests, AI assistance and analytics — they differ only in depth and volume.",
  addOns: [
    { name: "Extra location", detail: "beyond plan", price: "₹799" },
    { name: "AI credit pack", detail: "+500 drafts", price: "₹999" },
    { name: "Survey responses", detail: "next 2,000 / month", price: "₹1,499" },
    { name: "Competitor set", detail: "+5 tracked rivals", price: "₹699" },
  ],
  compareTitle: "Compare plans, line by line",
  faqTitle: "Questions, answered sensibly",
};
