// Sensiblee CMS — built-in content defaults (part 2: stories, security, about, contact, legal, knowledge, blog, ticket)
import type { PageHeroContent, SectionHead } from "./cms-defaults";

export type StoryCard = {
  business: string; place: string; plan: string; quote: string; person: string; role: string;
  bullets: string[]; results: { metric: string; label: string }[];
};

export type StoriesContent = PageHeroContent & {
  featured: {
    business: string; place: string; since: string; quote: string; person: string; role: string;
    challenge: string; steps: string[]; results: { metric: string; label: string }[];
  };
  stories: StoryCard[];
  aggregate: { v: string; l: string }[];
  ctaNote: string;
};

export const STORIES_DEFAULTS: StoriesContent = {
  eyebrow: "Customer stories", title: "Proof, not", accent: "promises.",
  description: "Restaurants, clinics and studios across India run their reputation on Sensiblee. Here is what changed for the operators who let us share their numbers.",
  featured: {
    business: "Spice Route Kitchen",
    place: "South Indian restaurant group · 3 outlets, Bengaluru",
    since: "Customer since Feb 2026 · Enterprise plan",
    quote: "One health score for three outlets ended our Monday-morning arguments. The AI drafts sound like our floor manager on her best day — we answer every review now, even the Saturday-night ones.",
    person: "Anand Menon",
    role: "Founder & CEO, Spice Route Kitchen",
    challenge:
      "Three outlets meant three different standards of review handling. Koramangala replied within hours; HSR often went two weeks silent. Owner meetings were spent disputing whose branch was slipping instead of fixing what guests actually complained about.",
    steps: [
      "Connected all 3 Google Business Profiles in one afternoon; 1,700 historical reviews imported and scored overnight.",
      "WhatsApp post-dining bursts at Koramangala and Indiranagar; table QR kits at every HSR table by week two.",
      "AI reply queue with owner approval only for 1–2★ reviews — everything else goes out in the brand voice automatically.",
      "Weekly WhatsApp digest to the leadership group: health score, keyword radar and staff mentions.",
    ],
    results: [
      { metric: "4.1 → 4.65", label: "average rating in 12 weeks" },
      { metric: "+38%", label: "monthly review volume" },
      { metric: "92%", label: "response rate (from 54%)" },
      { metric: "-71%", label: "negative-review reply time" },
    ],
  },
  stories: [
    {
      business: "Lumiere Dental Care",
      place: "Dental clinic · Hyderabad",
      plan: "Growth plan",
      quote: "WhatsApp requests after appointments nearly doubled our Google reviews in six weeks. Patients actually thank us for asking — it feels like care, not marketing.",
      person: "Dr. Kavya Reddy",
      role: "Chief Dentist",
      bullets: [
        "Post-appointment WhatsApp requests via the practice-management export",
        "AI drafts tuned to a calm, clinical-but-warm voice",
        "Keyword radar surfaced 'wait time' complaints before they became trends",
      ],
      results: [
        { metric: "2.1×", label: "reviews per month" },
        { metric: "4.8★", label: "clinic rating, up from 4.5" },
        { metric: "6 wks", label: "to visible lift" },
      ],
    },
    {
      business: "Iron & Iris Fitness",
      place: "Fitness studio · Pune",
      plan: "Starter plan",
      quote: "We are a two-branch studio, not a tech company. Sensiblee just runs in the background — the weekly digest is the only report I actually read.",
      person: "Sameer Shah",
      role: "Co-founder",
      bullets: [
        "QR codes on the check-in desk and locker rooms",
        "Trial-class follow-ups converted quiet members into public advocates",
        "Parking complaint trend caught early and fixed with valet tie-up",
      ],
      results: [
        { metric: "+64", label: "new reviews in 90 days" },
        { metric: "9.4%", label: "request-to-review conversion" },
        { metric: "0", label: "unanswered reviews since April" },
      ],
    },
  ],
  aggregate: [
    { v: "+0.15★", l: "typical rating lift in 90 days" },
    { v: "2.1×", l: "median review volume growth" },
    { v: "92%", l: "average response rate" },
    { v: "48 hrs", l: "median time to first request sent" },
  ],
  ctaNote: "Bring your Google profile to the call — we will show your own numbers, not ours.",
};

export type SecurityContent = PageHeroContent & {
  pillars: { title: string; body: string }[];
  compliance: { title: string; body: string }[];
  subprocessors: { name: string; role: string; data: string; region: string }[];
  sla: { k: string; v: string }[];
  practices: string[];
  ctaNote: string;
};

export const SECURITY_DEFAULTS: SecurityContent = {
  eyebrow: "Security & trust", title: "Your guests' data,", accent: "guarded.",
  description: "Sensiblee sits between your Google profile, your guests' WhatsApp and your team. Here is exactly how that data is handled, protected and governed — under India's DPDP Act, CERT-In directives, and the Google and Meta rulebooks.",
  pillars: [
    {
      title: "Encrypted in transit & at rest",
      body: "TLS 1.3 for every connection, AES-256 for stored data. Review content, guest phone numbers and reply drafts never travel unencrypted — internally or to your browser.",
    },
    {
      title: "Minimal, purpose-bound data",
      body: "We hold only what reputation work needs: Google review content, the guest phone numbers your team explicitly uploads for requests, and product telemetry. Nothing scraped, nothing bought.",
    },
    {
      title: "Role-based access & audit trail",
      body: "Owner, Manager and Observer roles with least-privilege defaults. Every reply approval, campaign send and settings change is written to an immutable audit log you can export.",
    },
    {
      title: "Hosted in India, backed up daily",
      body: "Workloads run on isolated VPS infrastructure in Mumbai with daily encrypted backups and 30-day retention, aligned to CERT-In's logging directives. Restores are tested quarterly — not assumed.",
    },
  ],
  compliance: [
    {
      title: "Google Business Profile API terms",
      body: "Sensiblee accesses reviews exclusively through the official Google Business Profile API with your explicit OAuth consent, and our use of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements. We never scrape, and you can revoke access from your Google account at any time.",
    },
    {
      title: "WhatsApp Business policy compliance",
      body: "Every campaign runs on pre-approved message templates through the WhatsApp Business Cloud API under Meta's Business Solution Terms. Consent is recorded per contact, opt-outs are honoured immediately, and template quality ratings are monitored continuously with automatic throttling to protect your number standing.",
    },
    {
      title: "DPDP Act 2023 aligned",
      body: "Our notice, consent, erasure and grievance workflows are built for India's Digital Personal Data Protection Act — Section 5 itemised notices, Section 6 clear-affirmative consent, Section 8(7) erasure, and Section 13 grievance redressal. We cooperate with the Data Protection Board of India and commit to breach intimation within 72 hours, aware of the Act's penalty framework that runs to ₹250 crore for security-safeguard failures.",
    },
    {
      title: "IT Act 2000 & CERT-In directives",
      body: "We maintain reasonable security practices under the Information Technology Act and its rules, and comply with CERT-In's 2022 cyber-security directives — 180-day traffic-log retention, synchronised time sources and incident reporting to CERT-In within the mandated six-hour window, coordinated with our own 72-hour DPDP breach commitments.",
    },
    {
      title: "AI with guardrails",
      body: "Our AI provider operates under a zero-retention agreement; guest phone numbers and direct identifiers never reach a model. Every public word is human-approved before posting, and our deployment follows MeitY's advisories on responsible AI — including labelling of AI-generated or synthetic content where applicable and a full opt-out from AI features.",
    },
    {
      title: "Payments & data residency",
      body: "Payments run through Razorpay under RBI's payment and e-mandate frameworks — card and UPI credentials never touch our servers. Application data, database and encrypted backups stay in India (Mumbai); any cross-border processing follows Section 16 of the DPDP Act with equivalent contractual safeguards.",
    },
  ],
  subprocessors: [
    { name: "Google Business Profile API", role: "Review source (read-only)", data: "Reviews, ratings, replies", region: "Global (Google)" },
    { name: "WhatsApp Business Cloud API", role: "Request delivery", data: "Opted-in phone numbers, template status", region: "Meta (EU/IN)" },
    { name: "Razorpay", role: "Payments & auto-debit (RBI-regulated)", data: "Billing contact, invoice history — never card data", region: "India" },
    { name: "LLM inference provider", role: "Draft & sentiment engine (zero-retention)", data: "Review text (no guest PII)", region: "India / EU endpoints" },
    { name: "VPS provider (Hostinger)", role: "Application & database hosting", data: "All stored data (encrypted)", region: "India (Mumbai)" },
  ],
  sla: [
    { k: "99.9%", v: "monthly uptime target" },
    { k: "15 min", v: "review sync cadence" },
    { k: "24 h", v: "support response, WhatsApp & email" },
    { k: "RPO 24h", v: "backup point · RTO under 4h" },
  ],
  practices: [
    "Two-factor authentication enforced for all owner and admin roles",
    "OAuth tokens stored with per-client encryption; revocable in one click",
    "Quarterly access reviews and least-privilege audits",
    "Documented incident-response runbook — 72-hour DPDP breach notification plus CERT-In six-hour incident reporting",
    "Annual penetration test before each major release train",
    "Quarterly backup-restore drills with results recorded in the audit log",
    "Immutable, exportable audit trail behind every approval, send and setting change",
  ],
  ctaNote: "Happy to walk your IT or legal team through our architecture — just ask.",
};

export type AboutTeamMember = { name: string; role: string; bio: string; photo: string };

export type AboutContent = PageHeroContent & {
  briefSection: { eyebrow: string; title: string; sub: string };
  brief: string[];
  originKicker: string; originTitle: string; originBody: string;
  vision: { kicker: string; title: string; body: string };
  mission: { kicker: string; title: string; body: string };
  valuesSection: SectionHead;
  values: { title: string; desc: string }[];
  teamSection: SectionHead;
  team: AboutTeamMember[];
  storyKicker: string; storyQuote: string;
  story: { kicker: string; text: string }[];
  ctaNote: string;
};

export const ABOUT_DEFAULTS: AboutContent = {
  eyebrow: "About us", title: "Reputation deserves", accent: "a calmer engine.",
  description: "Sensiblee exists for the millions of restaurants, clinics, salons and studios that run brilliant businesses — and lose customers to a single unanswered review.",
  briefSection: {
    eyebrow: "Sensiblee, in brief",
    title: "One calm engine for every review your business earns",
    sub: "What we do, said plainly — no jargon, no slideware.",
  },
  brief: [
    "Sensiblee watches every Google review across every location you run, scores it the moment it lands, and drafts the reply in your voice. It asks your happiest guests — over WhatsApp and table QR kits — to say publicly what they told you privately. And it rolls all of it into one Reputation Health Score you can run the business by.",
    "The word that keeps coming up is calm. No dashboard sprawl, no scraping grey routes, no incentives for reviews — official Google APIs, consent-first WhatsApp messaging, and a human approving every public word. You keep owning your brand; the machine does the watching, the drafting and the asking.",
  ],
  originKicker: "Where we started",
  originTitle: "Built after watching a good business lose the plot online",
  originBody: "Sensiblee began after a beloved Bengaluru café slid from 4.6 to 4.1 stars in a single season — not because the food changed, but because twelve reviews went unanswered and three weekend surges went unmanaged. The owner had no idea until a regular mentioned it. That information gap — the space between what guests say and what owners know — is exactly what we built against.",
  vision: {
    kicker: "Our vision",
    title: "Every guest-facing business heard",
    body: "A market where the size of your marketing budget no longer decides whether your reputation is managed — where the family-run café and the 40-outlet chain both know what their guests think, the moment they think it, and can answer like owners, not marketers.",
  },
  mission: {
    kicker: "Our mission",
    title: "Close the loop between guest and owner",
    body: "Sense every review within fifteen minutes, draft the reply in the owner's voice, ask happy guests while the meal is still warm, and turn the whole conversation into one honest health score. Practical tools, priced in rupees, that a busy operator actually uses.",
  },
  valuesSection: {
    eyebrow: "Our values", title: "What we optimise for",
    sub: "Three principles every feature, reply and price is tested against.",
  },
  values: [
    { title: "Sense sensibly", desc: "Data is only useful when it is calm and honest. We surface what changed, what it means and what to do — not vanity dashboards." },
    { title: "Act intelligently", desc: "AI does the heavy lifting; humans keep the judgement. Every public word passes through a person who owns the brand." },
    { title: "Earn every star", desc: "We never incentivise or filter reviews. Great service, asked for at the right moment, is the only sustainable way up." },
  ],
  teamSection: {
    eyebrow: "The team", title: "Small team, strong opinions about reputation",
    sub: "The people building — and personally answering — Sensiblee.",
  },
  team: [
    { name: "Aarav Sharma", role: "Co-founder & CEO", bio: "Fifteen years running F&B operations across Bengaluru and Dubai. Owns the product vision and the weekly owner digest.", photo: "/team/aarav-sharma.jpg" },
    { name: "Priya Nair", role: "Co-founder & CTO", bio: "Former payments infrastructure engineer. Builds the sensing pipeline and the official-API-only integrations.", photo: "/team/priya-nair.jpg" },
    { name: "Rohan Mehta", role: "Head of Customer Success", bio: "Onboards every design partner personally and runs the brand-voice tuning sessions behind the AI drafts.", photo: "/team/rohan-mehta.jpg" },
    { name: "Ananya Iyer", role: "Head of AI & Analytics", bio: "Tunes the draft models, the sentiment scoring and the keyword radar — and the confidence thresholds that keep humans in charge.", photo: "/team/ananya-iyer.jpg" },
  ],
  storyKicker: "Our story",
  storyQuote: "Sensing Sensibly. Acting Intelligently.",
  story: [
    { kicker: "Where we started", text: "In 2025 we watched good businesses — a café, a dental practice, a CrossFit box — lose ground to unanswered reviews while their operations stayed excellent. The tools that existed were dashboards: they showed the problem and left the work to you." },
    { kicker: "What we built", text: "Sensiblee is the work, not another chart. It senses every review in minutes, drafts the answer in your voice, asks your happiest guests for public proof, and hands you one score that tells you how the brand is really doing." },
    { kicker: "Who we build for", text: "The operator behind the counter — the one with a phone in one hand and a bill in the other. Pricing in rupees, requests on WhatsApp, a dashboard that works on that phone. Sensible tools for sensible operators." },
  ],
  ctaNote: "Meet the team behind the platform — 20 minutes, no slideware.",
};

export type ContactContent = PageHeroContent & {
  sideTitle: string; sideSub: string; whatsapp: string; email: string;
  nextTitle: string; nextSteps: string[];
  inquiryNote: string;
  hoursTitle: string; hoursLines: string[];
  locationOptions: string[];
  volumeOptions: string[];
};

export const CONTACT_DEFAULTS: ContactContent = {
  eyebrow: "Contact us", title: "Send an inquiry,", accent: "get a real answer.",
  description: "Tell us about your business and what you need — a demo, pricing, onboarding or a quick question. A human from the Sensiblee team replies within one business day.",
  sideTitle: "Reach us directly",
  sideSub: "WhatsApp, email or phone — the channels we actually run the product on.",
  whatsapp: "+91 93547 60585",
  email: "hello@sensiblee.in",
  nextTitle: "What happens next",
  nextSteps: [
    "We WhatsApp you within one business day.",
    "A 20-minute call, screensharing your live Google profile.",
    "A 7-day sandbox with your own reviews syncing.",
    "Go live the same week — first AI drafts on day one.",
  ],
  inquiryNote: "Every inquiry lands directly in our pipeline — you'll hear from us within one business day, usually much faster.",
  hoursTitle: "Support hours",
  hoursLines: [
    "Monday–Saturday · 9:30 am – 7:00 pm IST",
    "WhatsApp replies within a few hours during business hours",
    "Email answered within one working day",
  ],
  locationOptions: ["1 location", "2 locations", "3–5 locations", "6+ locations"],
  volumeOptions: ["< 50 reviews / month", "50–200 reviews / month", "200–500 reviews / month", "500+ reviews / month"],
};

export type LegalContent = {
  updated: string;
  sections: { h: string; body: string[] }[];
};

export const PRIVACY_DEFAULTS: LegalContent = {
  updated: "14 October 2026",
  sections: [
    {
      h: "1. About this policy",
      body: [
        "This Privacy Policy explains how Sensiblee Technologies Private Limited (“Sensiblee”, “we”, “us”), a company registered in Bengaluru, Karnataka, collects, uses, stores and protects personal data when you use our platform at sensiblee.in, the client application at app.sensiblee.in, our guest touchpoints (QR landing pages and WhatsApp flows), and any related support and billing channels.",
        "It is written to comply with India's Digital Personal Data Protection Act, 2023 (“DPDP Act”) and the rules framed under it, together with the Information Technology Act, 2000 and its applicable rules. Where guests or business users outside India interact with the platform, we apply GDPR-aligned practices on top of these commitments.",
      ],
    },
    {
      h: "2. Our roles under the DPDP Act",
      body: [
        "For our subscribers' account data (owner and team profiles, billing contacts, login and audit records) and for usage telemetry, Sensiblee acts as the Data Fiduciary — the entity that determines the purpose and means of processing.",
        "For the data our subscribers process through the platform — Google review content, guest phone numbers uploaded for review requests, and guest feedback captured via QR or WhatsApp — our subscriber (the business) is the Data Fiduciary and Sensiblee acts as its Data Processor, handling that data only on the subscriber's documented instructions. Guests who tap a QR code, send a WhatsApp reply or leave feedback are Data Principals with the rights described in section 11, and we enable those rights on the subscriber's behalf.",
      ],
    },
    {
      h: "3. What we collect",
      body: [
        "Business data you give us: your name, business name, contact details, Google Business Profile locations you connect, brand-voice samples, reply templates you approve, and billing records.",
        "Review data we receive through the official Google Business Profile API: review text, star rating, reviewer display name and profile photo (as exposed by Google), timestamps, and your published responses.",
        "Guest contact data for review requests: names and phone numbers supplied by you or your POS/PMS integrations, strictly to send review invitations you have authorised. We record the consent basis for every contact you upload.",
        "Guest feedback data: mood taps, star selections and private notes submitted through QR landing pages or WhatsApp flows, together with the optional phone number a guest chooses to leave for a follow-up.",
        "Usage and technical data: product interaction events, device type, approximate city derived from IP, and server logs — used to keep the service fast, secure and audit-ready.",
      ],
    },
    {
      h: "4. Notice and consent",
      body: [
        "Before or at the time of collecting any personal data, we provide an itemised notice stating what is collected, the specific purpose, the rights available and how to exercise them, and how to withdraw consent or reach our Grievance Officer — as required by Section 5 of the DPDP Act.",
        "We process personal data on the basis of free, specific, informed, unconditional and unambiguous consent given by a clear affirmative action, in line with Section 6 of the DPDP Act. Guests give consent when they opt in to WhatsApp follow-ups or marketing circles; subscribers give consent when they connect Google profiles, upload guest lists or enable AI features. Consent managers registered under the DPDP framework can be used to manage permissions.",
        "Withdrawing consent is as easy as giving it: a guest replies “STOP” (or unsubscribes in one tap), a subscriber disconnects Google or disables AI from the dashboard, and either may write to our Grievance Officer. We honour withdrawal without penalty, though it does not affect processing already carried out.",
      ],
    },
    {
      h: "5. How we use data",
      body: [
        "We use personal data only for the purposes we stated: monitoring and scoring reviews (sentiment, keywords, urgency), drafting replies in your brand voice, dispatching WhatsApp review requests and QR flows, computing the Reputation Health Score, producing analytics and monthly reports, billing, and securing the platform.",
        "We never sell personal data, never rent contact lists, never use guest phone numbers for unsolicited marketing beyond the consent recorded, and never run behavioural or targeted advertising at Data Principals — including children. We do not use dark patterns to obtain consent.",
      ],
    },
    {
      h: "6. AI processing",
      body: [
        "Review text and approved brand-voice samples are processed by our AI provider under a zero-retention agreement to generate reply drafts, sentiment and keyword insights. Guest phone numbers and other direct identifiers are never sent to AI models. Drafts are suggestions only — nothing is published to Google until a human on your team approves it.",
        "You may opt out of AI features at any time from Reputation controls; monitoring and request modules remain fully functional. Our AI use follows the Government of India's advisories on artificial intelligence, including responsible deployment, labelling of AI-generated or synthetically produced content where applicable, and prohibitions on unlawful or harmful synthetic media.",
      ],
    },
    {
      h: "7. Google and WhatsApp platform terms",
      body: [
        "Google: Sensiblee's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements. We access reviews only through the official Business Profile API with your explicit OAuth consent, never scrape, and you can revoke access at any time from your Google account or our dashboard.",
        "WhatsApp: every request campaign runs on pre-approved message templates through the WhatsApp Business Cloud API under Meta's Business Solution Terms. Messages go only to guests whose opt-in we hold on record; opt-outs are honoured immediately; and template quality ratings are monitored with automatic throttling to protect number standing.",
      ],
    },
    {
      h: "8. Children's data",
      body: [
        "The platform is directed at business users, not children. Consistent with Section 9 of the DPDP Act, we do not knowingly process a child's personal data without verifiable consent from the child's parent or lawful guardian, and we do not undertake tracking, behavioural monitoring or targeted advertising directed at children.",
        "Guest touchpoints are anonymous by design and collect nothing beyond what a guest voluntarily types. If we learn that a child's data has been collected without the required consent, we delete it and notify the subscriber to correct the underlying flow.",
      ],
    },
    {
      h: "9. Sub-processors and cross-border transfers",
      body: [
        "We share personal data only with the sub-processors listed on our Security & Trust page: Google (Business Profile API) for review sync and posting, Meta (WhatsApp Cloud API) for message delivery, Razorpay for subscription payments, our AI provider for draft generation under zero-retention terms, and our hosting provider for application and database infrastructure in India. Each is bound by contractual confidentiality and security obligations, and we give advance notice of any new or replacement sub-processor.",
        "Under Section 16 of the DPDP Act, personal data may be transferred outside India except to countries restricted by the Central Government. Where any processing occurs outside India, we apply equivalent contractual safeguards. Our primary hosting, database and encrypted backups remain in India (Mumbai).",
      ],
    },
    {
      h: "10. Retention and erasure",
      body: [
        "We retain personal data only as long as the consented purpose lasts, and erase it when consent is withdrawn or the purpose is fulfilled, in line with Section 8(7) of the DPDP Act. Concretely: business and review data are retained while your subscription is active and for 90 days after cancellation, then permanently deleted; guest phone numbers are deleted 120 days after their last campaign activity; private guest feedback is retained per your configured schedule; and audit logs are kept for the statutory period applicable to them.",
        "Encrypted backups roll off on a 30-day cycle, so residual copies age out of backups within one month of deletion. On written request we provide confirmation of erasure.",
      ],
    },
    {
      h: "11. Your rights as a Data Principal",
      body: [
        "Under the DPDP Act you may: request a summary of the personal data we hold about you and the processing activities (Section 11); request correction, completion, updating or erasure of your personal data (Section 12); register a grievance (Section 13); and nominate another individual to exercise your rights in specified circumstances (Section 14).",
        "Subscribers can exercise most rights directly from the dashboard (export, correction, deletion). Guests and other individuals can write to our Grievance Officer — we respond within 30 days as required under the DPDP framework, and usually within 7 working days. If you are unsatisfied with our response, you may escalate to the Data Protection Board of India.",
      ],
    },
    {
      h: "12. Security safeguards and breach notification",
      body: [
        "We take reasonable security safeguards to prevent personal data breaches, as required by Section 8(5) of the DPDP Act: TLS 1.3 in transit, AES-256 at rest, role-based least-privilege access, enforced two-factor authentication for privileged roles, per-client encryption of OAuth tokens, immutable audit logs, and annual penetration testing. The full list lives on our Security & Trust page.",
        "If a personal data breach occurs, we intimate affected Data Principals and the Data Protection Board of India without delay in the form and manner the DPDP framework requires, and no later than 72 hours from our own confirmation of the breach — alongside the CERT-In incident reporting obligations that apply to us as an Indian service provider.",
      ],
    },
    {
      h: "13. Grievance redressal and Data Protection Officer",
      body: [
        "Our Grievance Officer and Data Protection Officer is the Head of Trust & Safety, Sensiblee Technologies Private Limited, Bengaluru, Karnataka. Write to dpo@sensiblee.in (or WhatsApp +91 93547 60585) with the subject “Data grievance”.",
        "Please describe what data and which processing your grievance concerns. We acknowledge within 2 working days and respond within 30 days as required under the DPDP framework — usually much sooner. You are not required to pay any fee to file a grievance.",
      ],
    },
    {
      h: "14. Changes to this policy",
      body: [
        "We may update this policy as the product, the DPDP rules or platform terms evolve. Material changes are announced in-app and on this page with a new “last updated” date at least 30 days before they take effect. Where a change requires fresh consent, we will ask for it rather than assume it.",
      ],
    },
  ],
};

export const TERMS_DEFAULTS: LegalContent = {
  updated: "14 October 2026",
  sections: [
    {
      h: "1. The agreement",
      body: [
        "These Terms of Service (“Terms”) form a binding agreement between you and Sensiblee Technologies Private Limited (“Sensiblee”), registered in Bengaluru, Karnataka, and govern your use of the Sensiblee platform — the marketing site at sensiblee.in, the client application at app.sensiblee.in, guest touchpoints (QR landing pages and WhatsApp flows), and related APIs, support and billing channels.",
        "By creating a workspace, connecting a Google Business Profile, sending a WhatsApp campaign or otherwise using the platform, you accept these Terms, our Privacy Policy and the Data Processing Addendum incorporated into them. If you accept on behalf of a company, you confirm you are authorised to bind it.",
      ],
    },
    {
      h: "2. The service",
      body: [
        "Sensiblee is a subscription software service that monitors Google reviews across your connected Google Business Profiles on a 15-minute cadence, drafts AI-assisted replies for human approval, sends review requests via the WhatsApp Business Cloud API and branded QR landing pages, captures private guest feedback, computes the Reputation Health Score, and reports reputation analytics across locations.",
        "We access Google data solely through Google's official Business Profile API and comply with the Google API Services User Data Policy, including its Limited Use requirements. We do not scrape, buy or exchange reviews, and we never auto-publish replies without a human approval.",
      ],
    },
    {
      h: "3. Accounts, roles and acceptable use",
      body: [
        "Keep your account information accurate, safeguard your credentials, and enable two-factor authentication for owner roles. Owner, Manager and Observer roles carry the permissions described in our documentation; you are responsible for actions taken under your accounts.",
        "You agree not to: use the platform for any unlawful purpose; upload guest data you are not permitted to process; send messages that violate Meta's WhatsApp Business policies; attempt to scrape, reverse-engineer, overload or gain unauthorised access to the platform; or represent Sensiblee as endorsing your business.",
      ],
    },
    {
      h: "4. Google Business Profile compliance",
      body: [
        "You confirm that you own or are authorised to manage every Google Business Profile you connect, and that your use of the platform complies with Google's terms, including the Google Business Profile API terms and Google's policies on user contributions.",
        "Google controls its APIs and policies and may change or revoke access independently of us. Where Google's requirements impose technical or procedural obligations on integrations (scopes, rate limits, branding, disclosure text), we implement them; you agree to cooperate where an obligation sits on your side of the integration.",
      ],
    },
    {
      h: "5. WhatsApp messaging rules",
      body: [
        "You agree to send review requests and follow-ups only to guests who have consented to be contacted, to maintain the accuracy of the consent record, and to honour opt-outs (including “STOP” replies) immediately — our platform enforces suppression automatically, but the underlying obligation is yours.",
        "All outbound messages run on pre-approved WhatsApp templates under Meta's Business Solution Terms and Commerce Policy. We monitor template quality ratings and may pause or throttle campaigns that risk your number standing. You are responsible for the content and lawfulness of the messages you configure and approve.",
      ],
    },
    {
      h: "6. Review authenticity and consumer-protection compliance",
      body: [
        "You must not offer incentives, payments, discounts or preferential treatment in exchange for reviews, and must not generate, buy or publish fake or misleading reviews. These obligations reflect Google's review policies, the Central Consumer Protection Authority's guidelines against misleading advertisements and endorsements, and the quality expectations for online consumer reviews set out in BIS Standard IS 19000:2022.",
        "Sensiblee's guest flow routes feedback without review gating: guests who indicate a poor experience are never blocked from leaving a public review, and the private-feedback route is presented as an option, not a filter. You agree not to reconfigure or use the platform to suppress negative reviews.",
      ],
    },
    {
      h: "7. Data protection responsibilities",
      body: [
        "For guest personal data processed through the platform — phone numbers, feedback and related records — you act as the Data Fiduciary under India's Digital Personal Data Protection Act, 2023 and Sensiblee acts as your Data Processor. You are responsible for having a lawful basis (typically consent) for the guest data you upload and for the notice you present to your guests.",
        "Our Data Processing Addendum forms part of these Terms: we process guest data only on your instructions, assist with data-principal requests (access, correction, erasure), cooperate on breach notification to the Data Protection Board of India and affected individuals, and delete or return guest data on termination as described in our Privacy Policy.",
      ],
    },
    {
      h: "8. Subscriptions, billing and taxes",
      body: [
        "Plans are billed in advance in Indian Rupees through Razorpay (UPI, cards, net-banking, auto-debit). Where you enable auto-debit, the mandate is registered and operated under the Reserve Bank of India's e-mandate framework, and you will receive advance intimation of each debit as RBI rules require.",
        "Prices and inclusions are those published on our pricing page for your plan at the time of renewal. Displayed prices are exclusive of GST; where applicable GST is charged at the prevailing statutory rate (currently 18% for such services) and shown separately on every tax invoice, which you can download from the billing section at any time.",
        "Failed payments are retried on days 2 and 4. If a payment remains unsuccessful, review syncing and campaigns pause on day 6 while your data is preserved for 90 days; statutory dues and dispute-resolution rights are unaffected.",
      ],
    },
    {
      h: "9. Trials, renewal and cancellation",
      body: [
        "Trials last 7 days with full features and no card required. Paid plans renew automatically at the end of each billing cycle (monthly, half-yearly or annually as you selected) until cancelled.",
        "You may cancel anytime with 15 days' notice; access continues until the paid period ends. On request within 90 days of cancellation we provide your reviews, replies, guest lists and reports in open formats (CSV/PDF), after which data is deleted per our retention schedule.",
      ],
    },
    {
      h: "10. Intellectual property and confidentiality",
      body: [
        "You own your business data, review content, guest lists and brand materials. Sensiblee owns the platform, its software, AI model configurations, scoring methodology and analytics IP. You grant us a limited licence to process these materials solely to provide the service.",
        "Suggestions you send may be used to improve the platform without obligation. Each party will keep the other's non-public information confidential and use it only for these Terms.",
      ],
    },
    {
      h: "11. Disclaimers and limitation of liability",
      body: [
        "The service is provided with reasonable skill and care but not on a guarantee of uninterrupted operation; third-party platforms (Google, Meta, payment gateways) may change or fail independently of us. Nothing in these Terms excludes liability that cannot be excluded under Indian law.",
        "To the extent permitted by law, each party's aggregate liability is limited to the fees paid in the preceding three months, and neither party is liable for indirect or consequential damages, lost profits or lost goodwill. You remain solely responsible for replies you approve and messages you send through the platform.",
      ],
    },
    {
      h: "12. Term, suspension and termination",
      body: [
        "These Terms apply while you use the service. We may suspend the service for materially overdue payments, security incidents or serious breaches of these Terms (including WhatsApp policy abuse) with notice where practicable, and terminate for material breach that remains uncured 15 days after notice.",
        "On termination, your workspace is closed, guest data is deleted per the retention schedule, and the sections that should survive (billing for amounts due, IP, confidentiality, limitation of liability, governing law) continue to apply.",
      ],
    },
    {
      h: "13. Governing law, jurisdiction and grievances",
      body: [
        "These Terms are governed by the laws of India, including the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the Consumer Protection Act, 2019. The courts at Bengaluru, Karnataka have exclusive jurisdiction.",
        "For service or billing grievances, contact our support desk first (WhatsApp +91 93547 60585 or the in-app ticket form) — one ticket, one owner, one business day. Data-protection grievances go to our Grievance Officer at dpo@sensiblee.in and follow the process in our Privacy Policy.",
      ],
    },
    {
      h: "14. Changes to these terms",
      body: [
        "We may update these Terms as the product or law requires. Material changes are announced in-app and on this page at least 30 days before they take effect; continued use after that date constitutes acceptance. If a change is unacceptable, you may cancel before it takes effect and receive a pro-rata refund of the unused prepaid period.",
      ],
    },
  ],
};

export type KnowledgeContent = PageHeroContent & {
  categories: { cat: string; blurb: string }[];
  searchPlaceholder: string;
  ctaTitle: string; ctaSub: string; ctaButton: string;
  noMatchTitle: string; noMatchSub: string;
};

export const KNOWLEDGE_DEFAULTS: KnowledgeContent = {
  eyebrow: "FAQs", title: "Answers, before you", accent: "need them.",
  description: "How Sensiblee behaves in the real world — sync cadence, AI approvals, WhatsApp consent, billing. Short answers, no support ticket required.",
  categories: [
    { cat: "Getting started", blurb: "From signup to your first AI-approved reply." },
    { cat: "Review monitoring & sync", blurb: "Google sync health, cadence and troubleshooting." },
    { cat: "AI drafts & replies", blurb: "Tone, approval thresholds and autopilot." },
    { cat: "WhatsApp & QR requests", blurb: "Campaigns, templates, consent and quotas." },
    { cat: "Billing & account", blurb: "Plans, invoices, trials and cancellations." },
  ],
  searchPlaceholder: "Search the FAQs — try “sync”, “tone”, “quota”, “trial”…",
  ctaTitle: "Didn't find it here?",
  ctaSub: "Our support desk answers within one business day — usually much faster.",
  ctaButton: "Submit a Ticket",
  noMatchTitle: "No match",
  noMatchSub: "Try a broader word — or send us a ticket and we'll answer within one business day.",
};

export type BlogContent = PageHeroContent & {
  footnote: string;
  ctaTitle: string; ctaSub: string;
};

export const BLOG_DEFAULTS: BlogContent = {
  eyebrow: "Sensiblee blog", title: "Reputation, sized for", accent: "operators.",
  description: "Field notes on review response, WhatsApp requests, guest experience and the calm operations behind a five-star profile.",
  footnote: "New articles every fortnight — written by the operators, for the operators.",
  ctaTitle: "See it working on your own reviews",
  ctaSub: "A 4-minute narrated tour, then a free 7-day trial on your live Google profile.",
};

export type TicketContent = PageHeroContent & {
  topics: string[];
};

export const TICKET_DEFAULTS: TicketContent = {
  eyebrow: "Support", title: "Submit a", accent: "ticket.",
  description: "One ticket, one owner, one business day. Technical issues, sync questions, billing — it all lands with a human who can actually fix it.",
  topics: ["Technical issue", "Google sync", "WhatsApp campaigns", "AI drafts & replies", "Billing & plans", "Feature request"],
};

/* --------------------------- registry + default SEO --------------------------- */

import { HOME_DEFAULTS, FEATURES_DEFAULTS, HOW_DEFAULTS, PRICING_DEFAULTS, type CmsSlug } from "./cms-defaults";

export const PAGE_CONTENT_DEFAULTS: Record<CmsSlug, Record<string, unknown>> = {
  home: HOME_DEFAULTS as unknown as Record<string, unknown>,
  features: FEATURES_DEFAULTS as unknown as Record<string, unknown>,
  how: HOW_DEFAULTS as unknown as Record<string, unknown>,
  pricing: PRICING_DEFAULTS as unknown as Record<string, unknown>,
  stories: STORIES_DEFAULTS as unknown as Record<string, unknown>,
  security: SECURITY_DEFAULTS as unknown as Record<string, unknown>,
  about: ABOUT_DEFAULTS as unknown as Record<string, unknown>,
  contact: CONTACT_DEFAULTS as unknown as Record<string, unknown>,
  privacy: PRIVACY_DEFAULTS as unknown as Record<string, unknown>,
  terms: TERMS_DEFAULTS as unknown as Record<string, unknown>,
  knowledge: KNOWLEDGE_DEFAULTS as unknown as Record<string, unknown>,
  blog: BLOG_DEFAULTS as unknown as Record<string, unknown>,
  ticket: TICKET_DEFAULTS as unknown as Record<string, unknown>,
};

export const CMS_DEFAULT_SEO: Record<CmsSlug, { title: string; description: string }> = {
  home: { title: "Sensiblee — AI powered Customer Experience Intelligence", description: "Get more genuine customer feedback and act on it. Sensiblee turns your Google reviews into reputation growth — the Reputation Command Center, WhatsApp & QR growth engine, AI Reputation Copilot drafts you approve, and one Reputation Health score." },
  features: { title: "Features — six modules, one reputation engine | Sensiblee", description: "Reputation Command Center, Reputation Health score + trends + benchmarks, AI Reputation Copilot, Review Growth Engine (WhatsApp + QR), Location Intelligence and the Reputation Action Center — one calm platform for guest-facing businesses." },
  how: { title: "How it works — live in a day, working in a week | Sensiblee", description: "Connect your Google Business Profiles, sense every review on a 15-minute cadence, act with AI drafts and WhatsApp requests, learn from one health score." },
  pricing: { title: "Pricing — honest plans in ₹ | Sensiblee", description: "Plans from ₹1,499/month with all six modules included. Billed monthly, half-yearly (10% off) or annually (20% off). 7-day trial, no card required. Running more than 10 locations? Contact us for a tailor-made plan." },
  stories: { title: "Customer stories — proof, not promises | Sensiblee", description: "How restaurants, clinics and studios across India turned Google reviews into reputation growth with Sensiblee." },
  security: { title: "Security & trust | Sensiblee", description: "Encryption, role-based access, official APIs only, DPDP Act 2023 and CERT-In aligned workflows, India hosting — exactly how Sensiblee handles your guests' data." },
  about: { title: "About us — sensing sensibly, acting intelligently | Sensiblee", description: "Why we built a calmer reputation engine for the millions of Indian businesses that run brilliant operations but lose guests to unanswered reviews." },
  contact: { title: "Free trial & demo — talk to us | Sensiblee", description: "Book a 20-minute walkthrough with your live Google profile, or start a 7-day free trial — no card required." },
  privacy: { title: "Privacy Policy | Sensiblee", description: "How Sensiblee handles personal data under India's DPDP Act 2023 — what we collect, notice and consent, AI processing, Google Limited Use, WhatsApp terms, retention, your rights as a Data Principal and grievance redressal." },
  terms: { title: "Terms of Service | Sensiblee", description: "The agreement for Sensiblee under Indian law — the service, Google and WhatsApp compliance, review authenticity, DPDP responsibilities, GST billing, liability and grievance redressal." },
  knowledge: { title: "FAQs — answers before you need them | Sensiblee", description: "Sync cadence, AI approvals, WhatsApp consent, billing — short answers to the questions operators ask most." },
  blog: { title: "Blog — reputation, sized for operators | Sensiblee", description: "Field notes on review response, WhatsApp requests, guest experience and the calm operations behind a five-star profile." },
  ticket: { title: "Submit a ticket | Sensiblee", description: "One ticket, one owner, one business day — technical issues, sync questions and billing, answered by a human." },
};
