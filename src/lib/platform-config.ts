// Platform-level configuration storage — JSON blobs on CmsSetting (key/value).
// Admin console sections (AI admin, integrations, reputation controls, issue
// escalation) read/write through here; every getter takes a fallback so the
// product runs with sensible defaults before an admin touches anything.
import { db } from "@/lib/db";

export type AiAdminConfig = {
  model: string; // glm-4-flash | glm-4-plus | fallback-template
  temperature: number; // 0..1
  confidenceThreshold: number; // 0..1 — drafts below this are flagged for review
  brandVoiceDefault: string; // warm | formal | playful
  paused: boolean; // master kill switch — pauses draft generation platform-wide
  customSystemPrompt?: string; // tuned prompt instructions from browser UI
  safetyFilterEnabled: boolean; // safety & hallucination filter
  bannedPhrases: string[]; // phrases prohibited in AI replies
  fewShotExamples?: { stars: number; review: string; reply: string }[];
};

export const AI_ADMIN_DEFAULTS: AiAdminConfig = {
  model: "glm-4-flash",
  temperature: 0.6,
  confidenceThreshold: 0.75,
  brandVoiceDefault: "warm",
  paused: false,
  customSystemPrompt: "",
  safetyFilterEnabled: true,
  bannedPhrases: ["full refund", "100% refund", "refund your entire", "free meal", "free service", "compensate your entire", "cash refund", "money back"],
  fewShotExamples: [
    {
      stars: 5,
      review: "The butter chicken and garlic naan were heavenly! Great service by Anand.",
      reply: "Thank you for the wonderful feedback! Delighted you loved our butter chicken and garlic naan. Anand will be thrilled to hear his service made your meal memorable. Looking forward to hosting you again soon! — Management"
    },
    {
      stars: 1,
      review: "Waited 45 minutes for cold soup and nobody apologized. Terrible experience.",
      reply: "We are truly sorry for the unacceptable delay and cold soup during your visit. That falls short of the hospitality standards we uphold. Our branch manager is addressing this directly with the kitchen and service team, and we would welcome the opportunity to make this right offline. — Management"
    }
  ],
};

export type IntegrationsConfig = {
  google: {
    syncCadenceMins: number; // review pull cadence
    quotaDailyPct: number; // alert threshold for API quota usage
    accessToken?: string;
  };
  whatsapp: {
    provider: string; // gupshup | meta-cloud | aiSensy
    phoneId: string;
    wabaId: string;
    token: string;
    webhookVerifyToken: string;
    dailyLimit: number; // outbound messages/day cap
    quietStart: number; // hour 0-23 (IST)
    quietEnd: number; // hour 0-23 (IST)
    paused: boolean; // pause outbound messaging platform-wide
  };
};

export const INTEGRATIONS_DEFAULTS: IntegrationsConfig = {
  google: { syncCadenceMins: 15, quotaDailyPct: 80, accessToken: "" },
  whatsapp: {
    provider: "meta-cloud",
    phoneId: "",
    wabaId: "",
    token: "",
    webhookVerifyToken: "sensiblee_verify_token_2026",
    dailyLimit: 1000,
    quietStart: 21,
    quietEnd: 9,
    paused: false,
  },
};

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

export const SMTP_DEFAULTS: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromEmail: "notifications@sensiblee.in",
  fromName: "Sensiblee Reputation",
};

export type HealthConfig = {
  version: "v1" | "v2"; // scoring formula version
  minReviews: number; // below this in the 30d window the score is flagged "insufficient data"
  customWeights: Record<string, number> | null; // admin override — null = shipped weight set
};

export const HEALTH_DEFAULTS: HealthConfig = {
  version: "v2",
  minReviews: 10,
  customWeights: null,
};

export type EscalationConfig = {
  overdueDays: number; // issues open past dueDate + this many days escalate
  autoEscalate: boolean; // auto-raise severity to high when overdue
};

export const ESCALATION_DEFAULTS: EscalationConfig = {
  overdueDays: 3,
  autoEscalate: true,
};

export type BillingConfig = {
  trialDays: number; // default trial length for new organisations
};

export const BILLING_DEFAULTS: BillingConfig = {
  trialDays: 14,
};

// Admin → Reports & scheduled tasks → notification rules (doc §2K
// "Configure notification rules") — which platform alert classes email out.
export type NotificationsConfig = {
  negativeReview: boolean; // 1–2★ reviews landing
  unanswered: boolean; // 24h reply SLA breaches
  healthDrop: boolean; // Reputation Health Score falls a band
  syncFailures: boolean; // Google sync errors
  weeklyDigest: boolean; // platform weekly digest to admins
  recipients: string; // comma-separated admin emails
};

export const NOTIFICATIONS_DEFAULTS: NotificationsConfig = {
  negativeReview: true,
  unanswered: true,
  healthDrop: true,
  syncFailures: true,
  weeklyDigest: false,
  recipients: "",
};

// Security controls (doc §2C/§2L) — administrator MFA enforcement toggle.
export type SecurityConfig = {
  mfaRequiredForAdmins: boolean; // platform admins without MFA cannot sign in
};

export const SECURITY_DEFAULTS: SecurityConfig = {
  mfaRequiredForAdmins: false,
};

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const row = await db.cmsSetting.findUnique({ where: { key } });
  if (!row?.value) return fallback;
  try {
    const parsed = JSON.parse(row.value);
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  await db.cmsSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export const platformConfig = {
  ai: () => readKey<AiAdminConfig>("platform.ai", AI_ADMIN_DEFAULTS),
  integrations: () => readKey<IntegrationsConfig>("platform.integrations", INTEGRATIONS_DEFAULTS),
  health: () => readKey<HealthConfig>("platform.health", HEALTH_DEFAULTS),
  escalation: () => readKey<EscalationConfig>("platform.escalation", ESCALATION_DEFAULTS),
  billing: () => readKey<BillingConfig>("platform.billing", BILLING_DEFAULTS),
  saveAi: (v: AiAdminConfig) => writeKey("platform.ai", v),
  saveIntegrations: (v: IntegrationsConfig) => writeKey("platform.integrations", v),
  saveHealth: (v: HealthConfig) => writeKey("platform.health", v),
  saveEscalation: (v: EscalationConfig) => writeKey("platform.escalation", v),
  saveBilling: (v: BillingConfig) => writeKey("platform.billing", v),
  notifications: () => readKey<NotificationsConfig>("platform.notifications", NOTIFICATIONS_DEFAULTS),
  saveNotifications: (v: NotificationsConfig) => writeKey("platform.notifications", v),
  security: () => readKey<SecurityConfig>("platform.security", SECURITY_DEFAULTS),
  saveSecurity: (v: SecurityConfig) => writeKey("platform.security", v),
  smtp: () => readKey<SmtpConfig>("platform.smtp", SMTP_DEFAULTS),
  saveSmtp: (v: SmtpConfig) => writeKey("platform.smtp", v),
};
