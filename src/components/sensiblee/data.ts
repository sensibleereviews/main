// Sensiblee design prototype — mock data layer
// All figures are illustrative, aligned with the Phase 1 spec (Spice Route Kitchen demo tenant)

export const BRAND = {
  name: "Sensiblee",
  tagline: "Sensing Sensibly. Acting Intelligently",
  descriptor: "AI powered Customer Experience Intelligence",
};

export type Location = {
  id: string;
  name: string;
  area: string;
  rating: number;
  reviews: number;
  delta: number;
  syncState: "live" | "syncing" | "attention";
  lastSync: string;
};

export const LOCATIONS: Location[] = [
  { id: "loc-1", name: "Spice Route Koramangala", area: "Koramangala 5th Block", rating: 4.7, reviews: 862, delta: +0.2, syncState: "live", lastSync: "2 min ago" },
  { id: "loc-2", name: "Spice Route Indiranagar", area: "100 Feet Road", rating: 4.5, reviews: 641, delta: +0.1, syncState: "live", lastSync: "6 min ago" },
  { id: "loc-3", name: "Spice Route HSR Layout", area: "Sector 2", rating: 4.3, reviews: 418, delta: -0.1, syncState: "attention", lastSync: "31 min ago" },
];

export type Review = {
  id: string;
  author: string;
  initials: string;
  stars: number;
  location: string;
  time: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  status: "replied" | "ai-draft" | "awaiting";
  reply?: string;
  draft?: string;
  confidence?: number;
};

export const REVIEWS: Review[] = [
  {
    id: "r-1", author: "Ananya Sharma", initials: "AS", stars: 5, location: "Koramangala", time: "2h ago",
    text: "Celebrated my parents' anniversary here. The staff arranged a surprise dessert plate without being asked — such a thoughtful touch. Butter chicken and malabar paratha were outstanding.",
    sentiment: "positive", keywords: ["staff", "butter chicken", "ambience"], status: "ai-draft",
    draft: "Thank you so much, Ananya! We're delighted the team could make your parents' anniversary special. A warm thank-you from the Spice Route family — we look forward to hosting you again soon!",
    confidence: 0.96,
  },
  {
    id: "r-2", author: "Rohit Menon", initials: "RM", stars: 2, location: "HSR Layout", time: "5h ago",
    text: "Waited 40 minutes despite a reservation. Food was good but the delay spoiled the evening. Expected better coordination on a Saturday.",
    sentiment: "negative", keywords: ["wait time", "reservation", "service"], status: "ai-draft",
    draft: "Rohit, we're truly sorry about the wait on Saturday — that is not the experience we intend. We're reviewing our Saturday reservation staffing and would love to make this right. Our manager will reach out personally today.",
    confidence: 0.91,
  },
  {
    id: "r-3", author: "Priya Nair", initials: "PN", stars: 4, location: "Indiranagar", time: "8h ago",
    text: "Great coastal flavors — the appam and stew were authentic. Slightly crowded on weekends, so book ahead. Service was prompt otherwise.",
    sentiment: "positive", keywords: ["appam", "food quality", "crowded"], status: "replied",
    reply: "Thank you Priya! Authenticity is our pride — glad the appam-stew combo hit the mark. See you on your next visit!",
  },
  {
    id: "r-4", author: "Karthik Iyer", initials: "KI", stars: 1, location: "HSR Layout", time: "1d ago",
    text: "Order arrived cold and missing items on delivery. Zomato support was unhelpful. Very disappointing experience overall.",
    sentiment: "negative", keywords: ["delivery", "missing items", "packaging"], status: "awaiting",
  },
  {
    id: "r-5", author: "Meera Krishnan", initials: "MK", stars: 5, location: "Koramangala", time: "1d ago",
    text: "The filter coffee and ghee roast dosa are the best in the area. Warm interiors, quick service, and the manager remembered our usual order!",
    sentiment: "positive", keywords: ["coffee", "dosa", "service"], status: "replied",
    reply: "Meera, you made our day! Remembering our regulars is the least we can do. See you tomorrow for the usual ☕",
  },
  {
    id: "r-6", author: "Aditya Rao", initials: "AR", stars: 3, location: "Indiranagar", time: "2d ago",
    text: "Food is tasty but portion sizes have shrunk while prices went up. Hope the team reconsider the value equation.",
    sentiment: "neutral", keywords: ["portions", "pricing", "value"], status: "ai-draft",
    draft: "Aditya, thank you for the honest feedback — pricing and portions are something we actively review. I've shared your note with our culinary head. We hope to welcome you back and change the math for you.",
    confidence: 0.84,
  },
  {
    id: "r-7", author: "Sneha Kulkarni", initials: "SK", stars: 5, location: "Koramangala", time: "2d ago",
    text: "Hosted a team dinner of 14. The private dining area, the sampler platters and the service were all seamless. Everyone left happy.",
    sentiment: "positive", keywords: ["group dining", "platters", "private area"], status: "replied",
    reply: "Thank you Sneha! Team dinners are our favourite kind. Book the same corner next time — it's yours.",
  },
  {
    id: "r-8", author: "Vikram Desai", initials: "VD", stars: 4, location: "HSR Layout", time: "3d ago",
    text: "Solid neighbourhood option. Chicken 65 was crisp and the mutton sukka had proper heat. Parking can be tricky at peak hours.",
    sentiment: "positive", keywords: ["chicken 65", "mutton sukka", "parking"], status: "replied",
    reply: "Thanks Vikram! We now have valet tie-up on weekends — hope that eases the parking hunt.",
  },
];

export type Campaign = {
  id: string;
  name: string;
  channel: "WhatsApp" | "QR";
  location: string;
  status: "running" | "scheduled" | "completed" | "draft";
  sent: number;
  opened: number;
  reviews: number;
  date: string;
};

export const CAMPAIGNS: Campaign[] = [
  { id: "c-1", name: "Weekend Feast — Post-dining burst", channel: "WhatsApp", location: "Koramangala", status: "running", sent: 412, opened: 388, reviews: 57, date: "Sep 12" },
  { id: "c-2", name: "Table QR — August rollout", channel: "QR", location: "All locations", status: "running", sent: 1310, opened: 1240, reviews: 96, date: "Aug 01" },
  { id: "c-3", name: "Loyal regulars — Thank-you note", channel: "WhatsApp", location: "Indiranagar", status: "completed", sent: 236, opened: 221, reviews: 41, date: "Aug 20" },
  { id: "c-4", name: "Delivery follow-up wave", channel: "WhatsApp", location: "HSR Layout", status: "scheduled", sent: 0, opened: 0, reviews: 0, date: "Sep 24" },
];

export const FUNNEL = [
  { stage: "Requests sent", value: 1958, pct: 100 },
  { stage: "Opened / scanned", value: 1849, pct: 94 },
  { stage: "Tapped Rate us", value: 733, pct: 37 },
  { stage: "Reviews posted", value: 194, pct: 10 },
];

export type AiItem = {
  id: string;
  reviewStars: number;
  author: string;
  location: string;
  excerpt: string;
  draft: string;
  tone: "Warm" | "Professional" | "Apologetic";
  confidence: number;
  age: string;
  urgent?: boolean;
};

export const AI_QUEUE: AiItem[] = [
  {
    id: "a-1", reviewStars: 2, author: "Rohit Menon", location: "HSR Layout",
    excerpt: "Waited 40 minutes despite a reservation…",
    draft: "Rohit, we're truly sorry about the wait on Saturday — that is not the experience we intend. We're reviewing our Saturday reservation staffing and would love to make this right. Our manager will reach out personally today.",
    tone: "Apologetic", confidence: 0.91, age: "5h", urgent: true,
  },
  {
    id: "a-2", reviewStars: 1, author: "Karthik Iyer", location: "HSR Layout",
    excerpt: "Order arrived cold and missing items on delivery…",
    draft: "Karthik, we apologise for the cold delivery and the missing items — that falls short of our standard. We're refunding the difference and have flagged the packaging issue with the delivery partner. Please expect a call from us today.",
    tone: "Apologetic", confidence: 0.88, age: "1d", urgent: true,
  },
  {
    id: "a-3", reviewStars: 5, author: "Ananya Sharma", location: "Koramangala",
    excerpt: "Celebrated my parents' anniversary here…",
    draft: "Thank you so much, Ananya! We're delighted the team could make your parents' anniversary special. A warm thank-you from the Spice Route family — we look forward to hosting you again soon!",
    tone: "Warm", confidence: 0.96, age: "2h",
  },
  {
    id: "a-4", reviewStars: 3, author: "Aditya Rao", location: "Indiranagar",
    excerpt: "Food is tasty but portion sizes have shrunk…",
    draft: "Aditya, thank you for the honest feedback — pricing and portions are something we actively review. I've shared your note with our culinary head. We hope to welcome you back and change the math for you.",
    tone: "Professional", confidence: 0.84, age: "2d",
  },
  {
    id: "a-5", reviewStars: 4, author: "Nikhil George", location: "Indiranagar",
    excerpt: "Lovely biryani, but the music was a bit loud for a work lunch…",
    draft: "Thank you, Nikhil! We're glad the biryani won you over. We've shared the playlist volume note with the Indiranagar floor team — lunch hours are now set to a softer mix. See you soon!",
    tone: "Professional", confidence: 0.9, age: "3d",
  },
];

export const RATING_TREND = [
  { w: "W1", rating: 4.1, volume: 58 }, { w: "W2", rating: 4.2, volume: 64 },
  { w: "W3", rating: 4.1, volume: 71 }, { w: "W4", rating: 4.3, volume: 66 },
  { w: "W5", rating: 4.2, volume: 82 }, { w: "W6", rating: 4.4, volume: 77 },
  { w: "W7", rating: 4.4, volume: 88 }, { w: "W8", rating: 4.5, volume: 95 },
  { w: "W9", rating: 4.4, volume: 91 }, { w: "W10", rating: 4.6, volume: 104 },
  { w: "W11", rating: 4.6, volume: 112 }, { w: "W12", rating: 4.65, volume: 128 },
];

export const SENTIMENT = [
  { name: "Positive", value: 68, color: "#88d6a0" },
  { name: "Neutral", value: 19, color: "#f59e0b" },
  { name: "Negative", value: 13, color: "#e2654f" },
];

export const KEYWORDS = [
  { word: "butter chicken", count: 46, sentiment: "positive" }, { word: "wait time", count: 31, sentiment: "negative" },
  { word: "staff courtesy", count: 52, sentiment: "positive" }, { word: "portions", count: 24, sentiment: "neutral" },
  { word: "filter coffee", count: 38, sentiment: "positive" }, { word: "delivery packaging", count: 19, sentiment: "negative" },
  { word: "ambience", count: 44, sentiment: "positive" }, { word: "pricing", count: 27, sentiment: "neutral" },
  { word: "reservation", count: 22, sentiment: "negative" }, { word: "ghee roast dosa", count: 33, sentiment: "positive" },
  { word: "biryani", count: 29, sentiment: "positive" }, { word: "parking", count: 16, sentiment: "neutral" },
];

export const STAFF = [
  { name: "Ravi K. — Floor Captain", score: 96, mentions: 38, trend: "+6" },
  { name: "Divya S. — Host", score: 92, mentions: 29, trend: "+3" },
  { name: "Arjun P. — Kitchen", score: 89, mentions: 51, trend: "+9" },
  { name: "Fatima R. — Service", score: 84, mentions: 22, trend: "-2" },
];

export type Tenant = {
  id: string; business: string; owner: string; plan: "Starter" | "Growth" | "Multi";
  locations: number; mrr: number; reviews: number; status: "active" | "trial" | "past_due"; since: string;
};

export const TENANTS: Tenant[] = [
  { id: "t-1", business: "Spice Route Kitchen", owner: "Anand Menon", plan: "Multi", locations: 3, mrr: 6999, reviews: 1921, status: "active", since: "Feb 2026" },
  { id: "t-2", business: "Lumiere Dental Care", owner: "Dr. Kavya Reddy", plan: "Growth", locations: 1, mrr: 3499, reviews: 640, status: "active", since: "Mar 2026" },
  { id: "t-3", business: "Iron & Iris Fitness", owner: "Sameer Shah", plan: "Starter", locations: 1, mrr: 1499, reviews: 288, status: "active", since: "Apr 2026" },
  { id: "t-4", business: "Bloom Florists", owner: "Nandini Rao", plan: "Starter", locations: 1, mrr: 1499, reviews: 154, status: "trial", since: "Sep 2026" },
  { id: "t-5", business: "Cafe Mandala", owner: "Tenzin W.", plan: "Growth", locations: 1, mrr: 3499, reviews: 512, status: "past_due", since: "Jan 2026" },
  { id: "t-6", business: "UrbanNest Realty", owner: "Farhan Ali", plan: "Growth", locations: 2, mrr: 4298, reviews: 377, status: "active", since: "May 2026" },
];

export const MRR_SERIES = [
  { m: "Apr", mrr: 4.2 }, { m: "May", mrr: 5.8 }, { m: "Jun", mrr: 7.4 },
  { m: "Jul", mrr: 8.9 }, { m: "Aug", mrr: 11.6 }, { m: "Sep", mrr: 14.3 },
];

export const PAYMENTS = [
  { id: "pay_9f2k", tenant: "Spice Route Kitchen", amount: "₹6,999", method: "UPI · Razorpay", status: "captured", date: "Sep 01" },
  { id: "pay_8d1m", tenant: "Lumiere Dental Care", amount: "₹3,499", method: "Card · Visa 4411", status: "captured", date: "Sep 03" },
  { id: "pay_7c0n", tenant: "Cafe Mandala", amount: "₹3,499", method: "Auto-debit · Razorpay", status: "failed", date: "Sep 05" },
  { id: "pay_6b9p", tenant: "Iron & Iris Fitness", amount: "₹1,499", method: "UPI · Razorpay", status: "captured", date: "Sep 07" },
  { id: "pay_5a8q", tenant: "UrbanNest Realty", amount: "₹4,298", method: "NetBanking · HDFC", status: "captured", date: "Sep 09" },
];

export const PLANS = [
  {
    name: "Starter", price: "₹1,499", period: "/month", blurb: "Single location getting its Google presence in order.",
    features: ["1 Google Business Profile", "Daily review sync", "AI drafts — 50 / month", "WhatsApp requests — 200 / month", "Core analytics dashboard"],
    highlight: false,
  },
  {
    name: "Growth", price: "₹3,499", period: "/month", blurb: "Busy single site that lives on its reputation.",
    features: ["1 Google Business Profile", "15-minute review sync", "AI drafts — 300 / month", "WhatsApp requests — 1,000 / month", "Sentiment + keyword analytics", "QR table kits included"],
    highlight: true,
  },
  {
    name: "Multi", price: "₹6,999", period: "/month", blurb: "Multi-branch brands running reputation as a program.",
    features: ["Up to 5 Google Business Profiles", "15-minute review sync", "AI drafts — unlimited fair use", "WhatsApp requests — 5,000 / month", "Location & staff analytics", "Approval workflow + roles", "Priority support"],
    highlight: false,
  },
];

export const ADDONS = [
  { name: "Extra location", detail: "beyond plan", price: "₹799" },
  { name: "AI credit pack", detail: "+500 drafts", price: "₹999" },
  { name: "Survey responses", detail: "next 2,000 / month", price: "₹1,499" },
  { name: "Competitor set", detail: "+5 tracked rivals", price: "₹699" },
];

export const SYSTEM_JOBS = [
  { name: "google-sync", desc: "Per-location review pull (15-min cadence)", state: "healthy", queue: "0 queued", latency: "412 ms avg" },
  { name: "whatsapp-sender", desc: "Template queue with quality-based throttle", state: "healthy", queue: "14 queued", latency: "1.2 s avg" },
  { name: "ai-worker", desc: "Draft generation + sentiment classification", state: "healthy", queue: "3 queued", latency: "2.8 s avg" },
  { name: "webhook-receiver", desc: "Razorpay + WhatsApp status callbacks", state: "degraded", queue: "1 retrying", latency: "6.4 s avg" },
  { name: "email-fallback", desc: "SMTP relay for non-WhatsApp contacts", state: "healthy", queue: "0 queued", latency: "980 ms avg" },
];

export const LLM_USAGE = { tokens: "48.2M", cost: "₹11,240", budget: "₹15,000", drafts: 3120 };

export const KPIS = {
  client: {
    rating: 4.65, ratingDelta: "+0.15",
    reviewsMonth: 128, reviewsDelta: "+22%",
    responseRate: 92, responseDelta: "+7 pts",
    pending: 5, alerts: 2,
  },
  admin: {
    mrr: "₹2.13L", mrrDelta: "+23%",
    tenants: 27, active: 24,
    reviewsProcessed: "38.4k", waMessages: "21.7k",
  },
};

/* ------------------------- Drill-down detail data ------------------------- */

export type TenantDetail = {
  mrrSeries: { m: string; mrr: number }[];
  usage: { label: string; used: number; quota: number; unit: string; warn?: boolean }[];
  health: { label: string; score: number }[];
  activity: { t: string; label: string; desc: string }[];
  contact: { person: string; role: string; phone: string; email: string };
  gstin: string;
  nextInvoice: string;
};

export const TENANT_DETAILS: Record<string, TenantDetail> = {
  "t-1": {
    mrrSeries: [{ m: "Mar", mrr: 3.5 }, { m: "Apr", mrr: 4.2 }, { m: "May", mrr: 5.0 }, { m: "Jun", mrr: 5.8 }, { m: "Jul", mrr: 6.5 }, { m: "Aug", mrr: 6.99 }],
    usage: [
      { label: "AI drafts", used: 842, quota: 1500, unit: "fair use" },
      { label: "WhatsApp messages", used: 3260, quota: 5000, unit: "this month" },
      { label: "Locations", used: 3, quota: 5, unit: "of plan" },
    ],
    health: [
      { label: "Food quality", score: 95 }, { label: "Service", score: 88 },
      { label: "Ambience", score: 91 }, { label: "Value for money", score: 79 },
    ],
    activity: [
      { t: "Today 09:12", label: "Google sync completed", desc: "3 profiles synced · 2 new reviews scored" },
      { t: "Yesterday", label: "AI reply approved", desc: "Anand M. approved 5★ reply to Ananya S." },
      { t: "Sep 14", label: "WhatsApp burst sent", desc: "412 requests · 94% opened · 57 reviews" },
      { t: "Sep 12", label: "Subscription renewed", desc: "Multi plan · ₹6,999 via UPI auto-debit" },
    ],
    contact: { person: "Anand Menon", role: "Owner", phone: "+91 98450 11223", email: "anand@spiceroute.in" },
    gstin: "29ABCDE1234F1Z5",
    nextInvoice: "Oct 01 · ₹6,999",
  },
  "t-2": {
    mrrSeries: [{ m: "Apr", mrr: 1.7 }, { m: "May", mrr: 2.4 }, { m: "Jun", mrr: 2.8 }, { m: "Jul", mrr: 3.1 }, { m: "Aug", mrr: 3.3 }, { m: "Sep", mrr: 3.49 }],
    usage: [
      { label: "AI drafts", used: 210, quota: 300, unit: "this month" },
      { label: "WhatsApp messages", used: 640, quota: 1000, unit: "this month" },
      { label: "Locations", used: 1, quota: 1, unit: "of plan" },
    ],
    health: [
      { label: "Care quality", score: 95 }, { label: "Punctuality", score: 88 },
      { label: "Front desk", score: 90 }, { label: "Billing clarity", score: 82 },
    ],
    activity: [
      { t: "Sep 15", label: "Google sync completed", desc: "6 new reviews · 5 positive, 1 neutral" },
      { t: "Sep 14", label: "Post-appointment burst", desc: "48 WhatsApp requests · 41 opened" },
      { t: "Sep 10", label: "Template v2 approved", desc: "'Post-visit thank you' cleared WhatsApp review" },
    ],
    contact: { person: "Dr. Kavya Reddy", role: "Owner & principal dentist", phone: "+91 90000 44551", email: "kavya@lumieredental.in" },
    gstin: "36AAHCL9021K1ZB",
    nextInvoice: "Oct 03 · ₹3,499",
  },
  "t-3": {
    mrrSeries: [{ m: "May", mrr: 1.2 }, { m: "Jun", mrr: 1.3 }, { m: "Jul", mrr: 1.35 }, { m: "Aug", mrr: 1.4 }, { m: "Aug 31", mrr: 1.45 }, { m: "Sep", mrr: 1.49 }],
    usage: [
      { label: "AI drafts", used: 46, quota: 50, unit: "92% of cap", warn: true },
      { label: "WhatsApp messages", used: 180, quota: 200, unit: "90% of cap", warn: true },
      { label: "Locations", used: 1, quota: 1, unit: "of plan" },
    ],
    health: [
      { label: "Trainers", score: 91 }, { label: "Equipment", score: 86 },
      { label: "Cleanliness", score: 84 }, { label: "Peak-hour crowding", score: 68 },
    ],
    activity: [
      { t: "Sep 15", label: "Quota warning raised", desc: "AI drafts at 92% of Starter cap · upgrade prompt shown" },
      { t: "Sep 13", label: "Weekly digest emailed", desc: "Health 84 · 9 new reviews · 2 low-star alerts" },
      { t: "Sep 11", label: "Keyword trend flagged", desc: "'evening crowd' mentioned 6× in 2 weeks" },
    ],
    contact: { person: "Sameer Shah", role: "Founder", phone: "+91 98220 77114", email: "sameer@ironandiris.fit" },
    gstin: "27AAFCI4488M1Z7",
    nextInvoice: "Oct 07 · ₹1,499",
  },
  "t-4": {
    mrrSeries: [{ m: "Sep 10", mrr: 0 }, { m: "Sep 13", mrr: 0 }, { m: "Sep 16", mrr: 0 }, { m: "Sep 19", mrr: 0 }, { m: "Sep 22", mrr: 0 }, { m: "Sep 25", mrr: 0 }],
    usage: [
      { label: "AI drafts", used: 18, quota: 50, unit: "trial" },
      { label: "WhatsApp messages", used: 44, quota: 200, unit: "trial" },
      { label: "Locations", used: 1, quota: 1, unit: "trial" },
    ],
    health: [
      { label: "Freshness", score: 92 }, { label: "Delivery packaging", score: 85 },
      { label: "Photo quality", score: 74 },
    ],
    activity: [
      { t: "Trial · 12 days left", label: "Trial ends Oct 01", desc: "Conversion nudges armed for day -3 and day 0" },
      { t: "Sep 16", label: "Google Business Profile connected", desc: "Bloom Florists · Jayanagar, Bengaluru" },
      { t: "Sep 15", label: "First AI draft approved", desc: "5★ reply published by Nandini R." },
    ],
    contact: { person: "Nandini Rao", role: "Owner", phone: "+91 98860 33447", email: "nandini@bloomflorists.in" },
    gstin: "29AAGFB7781P1Z2",
    nextInvoice: "On conversion · ₹1,499",
  },
  "t-5": {
    mrrSeries: [{ m: "Apr", mrr: 2.9 }, { m: "May", mrr: 3.1 }, { m: "Jun", mrr: 3.3 }, { m: "Jul", mrr: 3.4 }, { m: "Aug", mrr: 3.49 }, { m: "Sep", mrr: 3.49 }],
    usage: [
      { label: "AI drafts", used: 150, quota: 300, unit: "generation paused", warn: true },
      { label: "WhatsApp messages", used: 380, quota: 1000, unit: "sending paused", warn: true },
      { label: "Locations", used: 1, quota: 1, unit: "of plan" },
    ],
    health: [
      { label: "Coffee & food", score: 90 }, { label: "Service", score: 72 },
      { label: "Wait time", score: 65 },
    ],
    activity: [
      { t: "Today 07:30", label: "Dunning retry 2/5 failed", desc: "Auto-debit returned 'insufficient funds'" },
      { t: "Sep 12", label: "WhatsApp payment link", desc: "Delivered · opened once · not completed" },
      { t: "Sep 05", label: "Invoice ₹3,499 failed", desc: "Auto-debit · Razorpay event pay_fail" },
      { t: "Sep 05", label: "Grace period started", desc: "Day 9 of 14 · suspension auto-scheduled" },
    ],
    contact: { person: "Tenzin W.", role: "Owner", phone: "+91 97400 55810", email: "tenzin@cafemandala.in" },
    gstin: "29AAJCC1180Q1Z9",
    nextInvoice: "Blocked — ₹3,499 overdue",
  },
  "t-6": {
    mrrSeries: [{ m: "Jun", mrr: 3.5 }, { m: "Jul", mrr: 3.8 }, { m: "Aug", mrr: 4.1 }, { m: "Aug 20", mrr: 4.29 }, { m: "Sep 01", mrr: 4.29 }, { m: "Sep", mrr: 4.29 }],
    usage: [
      { label: "AI drafts", used: 240, quota: 300, unit: "80% used", warn: true },
      { label: "WhatsApp messages", used: 910, quota: 1000, unit: "91% used", warn: true },
      { label: "Locations", used: 2, quota: 1, unit: "+1 add-on ₹799" },
    ],
    health: [
      { label: "Agent responsiveness", score: 88 }, { label: "Listing accuracy", score: 82 },
      { label: "Site-visit experience", score: 90 },
    ],
    activity: [
      { t: "Sep 15", label: "Add-on billed", desc: "2nd location (Indiranagar) · ₹799 prorated" },
      { t: "Sep 14", label: "Weekly digest delivered", desc: "Health 87 across 2 branches · 11 new reviews" },
      { t: "Sep 09", label: "Invoice captured", desc: "₹4,298 via NetBanking · HDFC" },
    ],
    contact: { person: "Farhan Ali", role: "Sales director", phone: "+91 99860 21009", email: "farhan@urbannest.co.in" },
    gstin: "29AAECU6612R1ZK",
    nextInvoice: "Oct 09 · ₹4,298",
  },
};

export type LocationDetail = {
  responseRate: number;
  avgResponse: string;
  health: { label: string; score: number }[];
  syncLog: { t: string; state: "ok" | "warn" | "error"; msg: string }[];
};

export const LOCATION_DETAILS: Record<string, LocationDetail> = {
  "loc-1": {
    responseRate: 96,
    avgResponse: "1h 40m",
    health: [
      { label: "Food quality", score: 95 }, { label: "Service", score: 96 },
      { label: "Ambience", score: 94 }, { label: "Value", score: 82 },
    ],
    syncLog: [
      { t: "09:00", state: "ok", msg: "Cursor advanced · 12 reviews pulled" },
      { t: "08:45", state: "ok", msg: "No new reviews · latency 380 ms" },
      { t: "08:30", state: "ok", msg: "No new reviews · latency 401 ms" },
      { t: "08:15", state: "ok", msg: "1 new review · sentiment scored" },
      { t: "08:00", state: "ok", msg: "No new reviews · latency 396 ms" },
    ],
  },
  "loc-2": {
    responseRate: 91,
    avgResponse: "2h 05m",
    health: [
      { label: "Food quality", score: 92 }, { label: "Service", score: 88 },
      { label: "Ambience", score: 84 }, { label: "Value", score: 80 },
    ],
    syncLog: [
      { t: "09:00", state: "ok", msg: "Cursor advanced · 4 reviews pulled" },
      { t: "08:45", state: "ok", msg: "No new reviews · latency 422 ms" },
      { t: "08:30", state: "ok", msg: "2 new reviews · sentiment scored" },
      { t: "08:15", state: "ok", msg: "No new reviews · latency 455 ms" },
      { t: "08:00", state: "warn", msg: "Google API slow (3.1 s) · retried once" },
    ],
  },
  "loc-3": {
    responseRate: 84,
    avgResponse: "5h 40m",
    health: [
      { label: "Food quality", score: 86 }, { label: "Service", score: 68 },
      { label: "Ambience", score: 88 }, { label: "Value", score: 74 },
    ],
    syncLog: [
      { t: "09:00", state: "warn", msg: "Google API latency 4.1 s · cursor saved" },
      { t: "08:45", state: "ok", msg: "1 new review · 2★ flagged urgent" },
      { t: "08:30", state: "ok", msg: "No new reviews · latency 512 ms" },
      { t: "Yesterday", state: "error", msg: "OAuth token expired · re-auth card shown" },
      { t: "Yesterday", state: "ok", msg: "Re-auth completed in 22 min · sync resumed" },
    ],
  },
};
