// Sensiblee CMS — list content (FAQs, blog posts, testimonials) shared by the seed
// script and by marketing renderers as fallback when the CMS tables are empty.
// Blog post bodies use paragraphs separated by a blank line.

import { POST_SEED_EXTRA } from "./cms-post-seed-extra";

export type CmsFaqSeed = { section: "home" | "pricing" | "knowledge"; category: string; question: string; answer: string };
export type CmsPostSeed = {
  slug: string; tag: string; title: string; excerpt: string; readTime: string;
  author: string; authorRole: string; publishedAt: string; body: string; summary: string;
};
export type CmsTestimonialSeed = { quote: string; name: string; role: string; stars: number };

/* --------------------------------- FAQs --------------------------------- */

export const FAQ_SEED: CmsFaqSeed[] = [
  // Home FAQs (8)
  { section: "home", category: "General", question: "How does the 7-day free trial work?", answer: "Sign up with your Google account, pick your business profiles and Sensiblee starts working immediately — full features, no credit card. When the trial ends, choose a plan or your data stays safe in read-only mode." },
  { section: "home", category: "General", question: "Do I need to give Sensiblee access to my Google account?", answer: "You connect your Google Business Profiles through Google's official sign-in — we never see or store your password. You can revoke access at any time, from Google or from Settings." },
  { section: "home", category: "General", question: "How does the AI write replies in my voice?", answer: "The assistant learns from your past replies, tone presets you pick, and the review itself. Every draft lands in your approval queue — nothing is ever posted without a human pressing approve." },
  { section: "home", category: "General", question: "Are WhatsApp review requests compliant?", answer: "Yes. Requests go through WhatsApp Business templates with opt-out handling built in. Guests can stop receiving asks with one tap, and we rate-limit so you never spam your own customers." },
  { section: "home", category: "General", question: "Can I manage multiple locations or brands?", answer: "Every plan includes multi-location dashboards with per-branch health scores, staff attribution and comparison views. Multi-branch brands can group outlets under one organisation." },
  { section: "home", category: "General", question: "Is my guest and business data secure?", answer: "Data is encrypted in transit and at rest, hosted in-region, and never sold or shared. Private guest feedback is visible only to you — platform staff cannot read it." },
  { section: "home", category: "General", question: "What happens to my data if I cancel?", answer: "You can export everything — reviews, replies, feedback and analytics — as CSV at any time. After cancellation your account goes read-only for 90 days, then is permanently deleted." },
  { section: "home", category: "General", question: "Do you charge in rupees? What about GST?", answer: "Yes — pricing is in INR with GST invoices for Indian businesses. Pay monthly, save one month on half-yearly billing, or save two months on annual billing. Upgrade, downgrade or cancel from Settings whenever you like." },
  // Pricing FAQs (6)
  { section: "pricing", category: "Pricing", question: "Is there a setup fee or annual contract?", answer: "No. Pricing is monthly, per brand, and you can cancel from the dashboard with 15 days notice. Prefer to commit? Half-yearly billing saves 10% and annual billing saves 20%." },
  { section: "pricing", category: "Pricing", question: "Do I need WhatsApp Business API approval?", answer: "We handle it. Onboarding includes registering your number on the WhatsApp Cloud API and getting your request templates approved — usually inside 48 hours." },
  { section: "pricing", category: "Pricing", question: "Is it safe to let AI reply to my customers?", answer: "The AI only drafts — every reply needs a human click before it posts. You set the guardrails (tone, escalations, forbidden words) and can switch to draft-only mode anytime." },
  { section: "pricing", category: "Pricing", question: "Does this work with Google's policies?", answer: "Yes. We use the official Google Business Profile API for reading and replying, and review requests never incentivise ratings — that keeps you inside Google's review guidelines." },
  { section: "pricing", category: "Pricing", question: "What happens after my trial or if a payment fails?", answer: "You get a 7-day trial with full features. If a payment fails we retry on day 2 and 4, pause syncing on day 6, and keep your data safe for 90 days." },
  { section: "pricing", category: "Pricing", question: "Can I add more locations later?", answer: "Anytime. Extra locations are ₹799/month each on any plan, and upgrading between plans is prorated automatically." },
  // Knowledgebase (15, grouped by category)
  { section: "knowledge", category: "Getting started", question: "How do I connect my Google Business Profile?", answer: "Sign in, open Settings → Business profile, and click Connect Google. You'll approve read-only access on Google's own consent screen — we never ask for your Google password. Historical reviews import immediately; live syncing starts within 15 minutes." },
  { section: "knowledge", category: "Getting started", question: "How long does setup really take?", answer: "Most venues are live in under an hour: connect Google (2 min), confirm your AI tone (3 min), upload staff or locations if you have them (10 min), and print your first QR kit (5 min). The 5-step wizard inside the app walks you through each one." },
  { section: "knowledge", category: "Getting started", question: "Can I invite my team?", answer: "Yes — Settings → Team lets you invite managers (approve & reply), observers (read-only) and marketing seats (requests & campaigns, no replies). Invites arrive over WhatsApp with a temporary password." },
  { section: "knowledge", category: "Review monitoring & sync", question: "How often do reviews sync?", answer: "Every 15 minutes per connected profile. You can also trigger a manual sync from Locations → Sync now. If a review arrived on Google but hasn't appeared after 30 minutes, open the location's sync log — every poll and its result is recorded there." },
  { section: "knowledge", category: "Review monitoring & sync", question: "A sync shows a warning — what does that mean?", answer: "Warnings mean Google's API responded slowly or partially (often during their maintenance windows). Data self-heals on the next successful poll. An error entry means we skipped a cycle; three consecutive errors raise an alert to our on-call channel automatically." },
  { section: "knowledge", category: "Review monitoring & sync", question: "Do you support Facebook or Zomato reviews?", answer: "Google Business Profile is fully live today. Facebook Pages is in beta with design partners and Zomato/Swiggy are on the Phase 2 roadmap — sentiment tagging in the current build is already platform-neutral, so historical imports slot in when connectors ship." },
  { section: "knowledge", category: "AI drafts & replies", question: "How does the AI learn my voice?", answer: "You pick a base tone — warm, formal or playful — and Sensiblee studies your published replies and signature. Every draft shows its confidence score; below your chosen threshold it stays in the approval queue, above it you can enable autopilot for low-risk 5★ replies." },
  { section: "knowledge", category: "AI drafts & replies", question: "Can I edit a draft before it posts?", answer: "Always. Open the draft in the AI Assistant queue or the review drawer, edit inline, and approve — the edited text is what gets published and what the AI learns from next time. You can also regenerate for a different take in your tone." },
  { section: "knowledge", category: "AI drafts & replies", question: "What happens to a 1★ or 2★ review?", answer: "Low-star reviews are flagged urgent, get an apologetic-tone draft immediately, and never auto-post — a human approves every difficult reply. If the review came through your QR mood screen, the guest's private note is attached so you know what actually went wrong." },
  { section: "knowledge", category: "WhatsApp & QR requests", question: "Who receives WhatsApp review requests?", answer: "Only guests who opted in — via the QR mood screen switch, a checkbox on your booking flow, or your imported consent list. Every message carries an opt-out; Meta policy and DPDP consent rules are enforced in the product, not just the paperwork." },
  { section: "knowledge", category: "WhatsApp & QR requests", question: "What is included in my WhatsApp quota?", answer: "Quota is per plan (Starter 200/month, Growth 1,000/month, Enterprise 5,000/month) and counts delivered messages. The Settings → usage meter shows live consumption; we warn you at 85% and never silently bill overage." },
  { section: "knowledge", category: "WhatsApp & QR requests", question: "How do table QR kits work?", answer: "Each location gets a unique short code (like spk-hsr). The Requests page renders print-ready table tents with that code — scan, tap a mood, and the guest is routed to Google (delighted) or a private manager note (disappointed). Reprint as often as you like; the code never changes." },
  { section: "knowledge", category: "Billing & account", question: "How does the free trial work?", answer: "7 days, full features of your chosen plan, no card required. At day 5 we'll ask (gently, over WhatsApp) whether you'd like to continue — if you do nothing, the workspace pauses and your data waits for 90 days." },
  { section: "knowledge", category: "Billing & account", question: "Can I change plans or cancel?", answer: "Upgrade or downgrade anytime from Settings → Plan; changes prorate automatically. Cancel from the same page — no calls, no retention scripts. Invoices are GST-compliant and available in Billing → Invoices." },
  { section: "knowledge", category: "Billing & account", question: "Do you offer half-yearly or annual billing?", answer: "Yes — half-yearly billing saves 10% and annual saves 20% (the pricing page shows all three options). Teams on longer cycles also get a named success manager and a quarterly reputation review." },
];

/* ------------------------------- Blog posts ------------------------------ */
// Bodies support light structure: lines starting with "## " render as h2 and
// "### " as h3 on article pages; everything else is a paragraph.

export const POST_SEED: CmsPostSeed[] = [
  {
    slug: "response-rate-lever",
    tag: "Reputation playbook",
    title: "Response rate is the most underrated lever in hospitality reputation",
    excerpt: "Google's own data says 88% of guests would use a business that replies to reviews. Most Indian hospitality businesses reply to fewer than one in five. Here's why the gap is your cheapest growth channel.",
    readTime: "6 min read",
    author: "Admin",
    authorRole: "Sensiblee Team",
    publishedAt: "2026-09-12",
    summary: "Google's own data says 88% of guests choose businesses that reply to reviews — yet most Indian hospitality profiles answer fewer than one in five. This article walks through the three-way return on every reply, why response rate is an operations problem in disguise, and the negative-first sequencing that makes fast apologies read as culture instead of damage control.",
    body: [
      "Ask any hotelier or restaurateur what drives their Google rating and you'll hear about food, service and ambience. Ask them what drives their conversion from those ratings and the answers get vague — which is a problem, because the difference between a profile that wins the click and one that loses it is rarely the stars alone. It's what happens underneath them.",
      "Google has published that 88% of guests are likely to use a business that responds to all of its reviews, positive or negative. Compare that with what actually happens on the ground: across the hundreds of Indian hospitality profiles we analysed before building Sensiblee, fewer than one in five reviews received any reply at all. Five-star reviews — your best free marketing — sat unanswered. One-star reviews, the most urgent conversations you will ever have with a departing customer, sat even longer.",
      "## The maths of replying",
      "The maths of replying is startlingly favourable. A reply costs you three minutes; a drafted reply costs you thirty seconds of approval. What it buys is three separate things at once. First, the departing guest sees the reply — studies consistently show a thoughtful response recovers a meaningful share of complainants, and recovered complainants become your loudest advocates. Second, every future reader of that review sees the reply; you are not writing to one guest, you are auditioning for the next fifty who read it. Third, review activity itself is a freshness signal — profiles that engage rank and convert better over time.",
      "## Why it doesn't happen",
      "So why doesn't it happen? Because response rate is an operations problem disguised as a marketing one. The owner who could reply is running the floor. The manager who could reply doesn't have the voice signed off. The evening rush means the review from last Saturday gets seen on Thursday. This is exactly the gap a sensing-and-drafting system closes: every review arrives scored and triaged, a reply in your voice is already waiting, and the only human decision left is approve, edit or regenerate.",
      "## The target we set",
      "The operators we work with set a simple target: 100% response rate on negative reviews within 24 hours, and 90% on positive reviews within a week. Negative-first sequencing matters — an apology issued quickly reads as culture, while the same apology issued late reads as damage control. Positive replies matter almost as much: a specific, warm thank-you that names the dish or the staff member turns a one-time guest into a returning one, and quietly tells every reader what to order.",
      "## The lever that needs no new guests",
      "If you take one number from this post, take this one: none of this requires a single new guest. Response rate is the rare growth lever that works entirely on the reviews you already received. That is why we built Sensiblee around it — sensing every review the moment it lands, drafting the reply in your voice, and making the whole loop calm enough that it actually survives a Saturday night.",
    ].join("\n\n"),
  },
  {
    slug: "whatsapp-review-requests",
    tag: "Review requests",
    title: "WhatsApp review requests: the polite way to multiply your Google reviews",
    excerpt: "Email review requests get ignored; SMS feels invasive. In India, WhatsApp is where your guest already is. The craft is in the ask — here's the template, timing and consent playbook we see working.",
    readTime: "7 min read",
    author: "Admin",
    authorRole: "Sensiblee Team",
    publishedAt: "2026-09-02",
    summary: "Email requests get ignored and SMS feels invasive — WhatsApp is the one channel where Indian review requests reliably work, lifting monthly review volume 1.7–2.9× in our design-partner cohort. This piece covers the three decisions that make the ask land (who, when and what), the consent lines that keep you inside Meta and DPDP rules, and the one design mistake that teaches guests honesty has a cost.",
    body: [
      "Every operator knows the asymmetry: your happiest guests walk out glowing, and never write a line. Your unhappiest guests, meanwhile, need no invitation at all. The result is a Google profile that systematically under-represents your best days. Review requests exist to correct that imbalance — and in India, there is exactly one channel where they work.",
      "## Why WhatsApp works in India",
      "Email open rates for review requests hover in the low twenties, and SMS feels like a utility bill. WhatsApp is different: it is the inbox where family photos and the building society committee live. A well-crafted WhatsApp message to a guest who just paid the bill feels like a thank-you note, not a survey. In our design-partner cohort, a single well-timed WhatsApp burst lifted monthly review volume between 1.7x and 2.9x — with ratings intact, because the guests being asked were the ones already smiling.",
      "## Who, when and what",
      "The craft is in three decisions: who, when and what. Who: ask the guests your own data says were delighted — the tables that lingered, the patients who rebooked, the members who referred a friend. Sensiblee's mood screen exists precisely to sort delighted from disappointed before the ask is ever made. When: within two hours of the visit, while the feel-good is still chemically present, and never during the meal. A message that lands at the wrong moment is an interruption; the same message two hours later is a memory-jogger. What: short, personal, and honest. Name the dish if your POS knows it. Thank them for coming. One link, one ask, no nesting of surveys inside surveys.",
      "## Consent is the licence",
      "Consent is not a footnote here — it is the entire licence to operate. Meta's WhatsApp Business policy and India's DPDP Act both draw the same line: message people who agreed to be messaged, make opting out effortless, and never let the review ask masquerade as something else. Every template we ship carries an explicit opt-out and is sent only to guests who opted in, at the venue or afterwards. The counterintuitive truth we've learned: telling guests up front that you'll only message occasionally makes them more likely to engage, not less.",
      "## One warning from the field",
      "One warning from the field: never gate the ask on happiness in a way the guest can feel. If a guest taps \"not great\" and the request link vanishes, you've taught them that honesty has a cost — and some of them will head straight to Google to prove a point. The correct design offers every guest a voice: the delighted get a graceful path to Google, the disappointed get a private line to the manager's phone. Both feel respected; only one becomes public.",
      "Done this way, review requests stop being extraction and start being hospitality's last course — a warm message, a genuine thank-you, and an easy door for the guests who want the world to know what you did right.",
    ].join("\n\n"),
  },
  {
    slug: "qr-table-tent-playbook",
    tag: "Guest experience",
    title: "The QR on the table: turning dissent into private feedback and delight into public proof",
    excerpt: "A table-tent QR code is the fastest feedback loop in hospitality — if you design the two paths correctly. The mood-first flow that protects your rating and your guest's dignity, explained.",
    readTime: "5 min read",
    author: "Admin",
    authorRole: "Sensiblee Team",
    publishedAt: "2026-08-21",
    summary: "Most table-tent QR flows fail because they ask for effort before offering value. The mood-first design changes that: one tap routes the delighted guest to Google at the highest-intent moment, and the disappointed guest to a private note on the manager's phone — intercepting the public complaint without ever suppressing the guest. Includes the design rules and the shift-level operational dividend.",
    body: [
      "The table-tent QR code has a reputation problem, and it earned it. Most venues deployed a generic link to a feedback form, guests stopped scanning, and the industry concluded QR feedback was a fad. The failure wasn't the medium — it was the flow. A form asks for effort before it offers value. A well-designed flow asks one question first: how was it?",
      "## The tap that changes everything",
      "That single tap changes everything, because the two answers need opposite destinations. The guest who taps the smile is standing in your restaurant, pleasantly full, phone in hand. This is the highest-intent moment for a public Google review you will ever get — better than any WhatsApp follow-up, because the experience is not a memory, it is a present-tense fact. Hand that guest a graceful, one-tap path to your Google profile and a startling number of them finish the job before the plates are cleared.",
      "## Two guests, two destinations",
      "The guest who taps the frown needs the opposite: privacy. Research after research confirms the majority of unhappy guests who post publicly do so because no easier channel to be heard existed in the moment. Give them a private note that lands on the manager's phone — not the internet — and you have intercepted the review before it was written. Not suppressed it: intercepted. The difference matters. A guest who is heard privately still posts publicly when the recovery is genuine — and a public review that begins \"I had an issue, and the manager called me within the hour\" is worth more than a flawless five-star record, because it shows the reader how you behave when things go wrong.",
      "## The design rules",
      "The design rules fall out of that symmetry. One question before any form field. No personally identifiable information demanded up front — a guest who fears a follow-up call will censor themselves. An explicit, honest consent line if you want to message them later, unticked by default. And a thank-you screen that respects both outcomes: the delighted guest sees their review fly, the disappointed guest sees a promise with a name on it.",
      "## The operational dividend",
      "There is an operational dividend too. Private feedback arrives tagged by location and moment, which turns mood data into a shift-level instrument. When one outlet's frown rate doubles for two weekends, that is not noise — that is a staffing change, a supplier switch, or a menu experiment showing up in the data before it shows up in your rating. The venues that act on mood signals in days keep the dips minor; the ones that wait for the monthly rating average inherit the damage.",
      "None of this requires an app download, a loyalty program or a change in guest behaviour. It requires respecting the two guests in front of you: the one who wants to shout your name from a rooftop, and the one who wants to tell you, quietly, what went wrong. The QR code is simply the door — what matters is that both rooms are worth walking into.",
    ].join("\n\n"),
  },
  ...POST_SEED_EXTRA,
];

/* ------------------------------ Testimonials ----------------------------- */

export const TESTIMONIAL_SEED: CmsTestimonialSeed[] = [
  {
    quote: "The AI drafts sound like our floor manager on her best day. We answer every review now — even the Saturday-night ones.",
    name: "Anand Menon",
    role: "Spice Route Kitchen · 3 outlets, Bengaluru",
    stars: 5,
  },
  {
    quote: "WhatsApp requests after appointments nearly doubled our Google reviews in six weeks. Patients actually thank us for asking.",
    name: "Dr. Kavya Reddy",
    role: "Lumiere Dental Care · Hyderabad",
    stars: 5,
  },
  {
    quote: "One health score for both branches ended our Monday-morning arguments. The keyword radar caught a parking complaint trend early.",
    name: "Sameer Shah",
    role: "Iron & Iris Fitness · Pune",
    stars: 4.5,
  },
];
