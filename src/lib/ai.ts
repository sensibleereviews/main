// Sensiblee AI worker — review-reply drafting via z-ai-web-dev-sdk (backend only)
import ZAI from "z-ai-web-dev-sdk";
import { platformConfig, type AiAdminConfig } from "@/lib/platform-config";

export type Tone = "warm" | "formal" | "playful" | "apologetic";

const TONE_GUIDE: Record<string, string> = {
  warm: "Warm, professional and personal — like a grateful owner speaking to a regular guest. Friendly but never sloppy.",
  formal: "Formal, precise and courteous. Correct grammar, no emoji, measured gratitude or apology.",
  playful: "Playful, bold and high-energy. Light emoji allowed (at most one). Confident and fun while staying respectful.",
  apologetic: "Sincere, accountable and calm. Acknowledge the specific failure, take responsibility, state the concrete fix, offer to make it right offline.",
};

const DEFAULT_BANNED_PHRASES = [
  "full refund", "100% refund", "refund your entire", "free meal", "free service",
  "compensate your entire", "cash refund", "money back", "waive your entire bill",
  "we are suing", "you are a liar", "fake review", "shut up", "idiot"
];

// Toxicity & Hallucination Safety Check (P0 / Others 5.b)
export function checkToxicityAndHallucination(
  replyText: string,
  config?: AiAdminConfig | null
): { safe: boolean; reason?: string; flaggedPhrase?: string } {
  if (config && config.safetyFilterEnabled === false) {
    return { safe: true };
  }

  const textLower = replyText.toLowerCase();
  const banned = config?.bannedPhrases?.length ? config.bannedPhrases : DEFAULT_BANNED_PHRASES;

  for (const phrase of banned) {
    if (textLower.includes(phrase.toLowerCase())) {
      return {
        safe: false,
        reason: `Reply contains prohibited or unauthorized claim: "${phrase}". Unapproved refunds or monetary promises are restricted by safety policy.`,
        flaggedPhrase: phrase,
      };
    }
  }

  // Hostile / defensive tone check
  const hostilePatterns = [
    /\b(liar|lying|defamation|lawsuit|sue you)\b/i,
    /\b(shut up|get lost|get a life|nonsense)\b/i,
    /\b(never come back|banned from our)\b/i,
  ];

  for (const pattern of hostilePatterns) {
    const match = textLower.match(pattern);
    if (match) {
      return {
        safe: false,
        reason: `Reply contains hostile or confrontational phrasing ("${match[0]}"). Professional, calm tone is required.`,
        flaggedPhrase: match[0],
      };
    }
  }

  return { safe: true };
}

export type DraftInput = {
  business: string;
  signature: string; // e.g. "— Anand, Spice Route Kitchen"
  tone: string;
  author: string;
  stars: number;
  location: string;
  text: string;
  keywords?: string[];
  // Section 1 context-aware drafting (doc §3): the AI understands location,
  // staff member, complaint, brand tone, language, sentiment and severity.
  sentiment?: string; // positive | neutral | negative
  severity?: "high" | "medium" | "low";
  staffMentioned?: string[];
  language?: string; // e.g. "English" — match the reviewer's language
  previousNote?: string; // internal note / previous interaction hint
  // Part 2 AI inputs (doc: review, rating, location, brand voice, language, business type)
  brandVoice?: string; // e.g. "warm" | "professional" | custom description
  businessType?: string; // e.g. "Restaurant" — shapes examples and etiquette
};

export type DraftResult = { body: string; confidence: number; tokens: number; model: string };

function systemPrompt(input: DraftInput, aiCfg?: AiAdminConfig | null): string {
  // If platform admin tuned custom prompt template in UI (/admin/ai), interpolate variables
  if (aiCfg?.customSystemPrompt && aiCfg.customSystemPrompt.trim().length > 20) {
    let custom = aiCfg.customSystemPrompt
      .replace(/\{business\}/g, input.business)
      .replace(/\{businessType\}/g, input.businessType || "guest-facing")
      .replace(/\{location\}/g, input.location)
      .replace(/\{author\}/g, input.author)
      .replace(/\{stars\}/g, String(input.stars))
      .replace(/\{tone\}/g, input.tone)
      .replace(/\{signature\}/g, input.signature)
      .replace(/\{brandVoice\}/g, input.brandVoice || input.tone);

    // Append few-shot examples if present
    if (aiCfg.fewShotExamples?.length) {
      custom += "\n\nExamples:\n" + aiCfg.fewShotExamples.map((ex) => `Review (${ex.stars}★): "${ex.review}"\nReply: "${ex.reply}"`).join("\n\n");
    }
    return custom;
  }

  const severityLine = input.severity === "high"
    ? "Severity: HIGH — a manager-level failure; acknowledge it plainly and commit to a concrete next step."
    : input.severity === "medium"
      ? "Severity: medium — acknowledge the friction and share what is being tightened."
      : "Severity: low — keep it gracious and light.";

  const baseRules = [
    `You write public Google review replies for "${input.business}", a ${input.businessType || "guest-facing"} business in India.`,
    `Voice: ${TONE_GUIDE[input.tone] || TONE_GUIDE.warm}${input.brandVoice && input.brandVoice !== input.tone ? ` (brand voice preference: ${input.brandVoice})` : ""}`,
    `Context you already know: branch "${input.location}"${input.sentiment ? ` · reviewer sentiment ${input.sentiment}` : ""}${input.staffMentioned?.length ? ` · staff mentioned: ${input.staffMentioned.join(", ")}` : ""}${input.previousNote ? ` · previous internal note: "${input.previousNote}"` : ""}.`,
    severityLine,
    `Rules:`,
    `- Write in ${input.language || "English"} — match the reviewer's language if their review is in another language.`,
    `- 2 to 4 sentences, under 90 words. Address the guest by first name (${input.author}).`,
    `- Reference at least one specific detail from their review (dish, staff member, issue) and the location where relevant.`,
    `- ${input.staffMentioned?.length ? "When a staff member is praised, pass on the compliment to them by name; when complained about, never blame the individual — address the process." : "Never blame a named employee — address the process, not the person."}`,
    `- NEVER invent facts, full refunds, cash compensation or promises beyond "our manager will follow up".`,
    `- ${input.stars <= 2 ? "This is a negative review: apologise sincerely, be specific about remediation, invite them back offline." : input.stars === 3 ? "Balanced review: thank them, address the concern raised." : "Positive review: enthusiastic thanks, echo a highlight, invite them back."}`,
    `- End with the signature exactly as given: ${input.signature}`,
    `- Output ONLY the reply text. No quotes, no preamble, no markdown.`,
  ];

  if (aiCfg?.fewShotExamples?.length) {
    baseRules.push("\nFew-shot examples to match tone:");
    for (const ex of aiCfg.fewShotExamples) {
      baseRules.push(`Review (${ex.stars}★): "${ex.review}"\nReply: "${ex.reply}"`);
    }
  }

  return baseRules.join("\n");
}

// Deterministic heuristic confidence from draft shape (product metric, documented)
function estimateConfidence(body: string, stars: number): number {
  let c = 0.9;
  const words = body.split(/\s+/).length;
  if (words >= 30 && words <= 110) c += 0.04;
  if (words < 15) c -= 0.12;
  if (stars <= 2) c -= 0.05;
  if (/(sorry|apolog)/i.test(body) && stars <= 2) c += 0.03;
  if (body.includes("—")) c += 0.01;
  return Math.min(0.97, Math.max(0.72, Number(c.toFixed(2))));
}

export async function generateReplyDraft(input: DraftInput): Promise<DraftResult> {
  const aiCfg = await platformConfig.ai().catch(() => null);
  if (aiCfg?.paused) {
    return { ...fallbackDraft(input), model: "paused" };
  }

  const userMsg = [
    `Review by ${input.author} · ${input.stars}★ · at our ${input.location} location:`,
    `"${input.text}"`,
    input.keywords?.length ? `Detected themes: ${input.keywords.join(", ")}.` : "",
  ].join("\n");

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt(input, aiCfg) },
        { role: "user", content: userMsg },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("empty completion");
    let body = raw.replace(/^["“]|["”]$/g, "").slice(0, 900);

    // Run safety filter
    const safety = checkToxicityAndHallucination(body, aiCfg);
    if (!safety.safe && safety.flaggedPhrase) {
      console.warn(`[ai-safety] Draft flagged for "${safety.flaggedPhrase}". Falling back to safe template.`);
      return { ...fallbackDraft(input), model: "safe-fallback" };
    }

    const usage = (completion as { usage?: { total_tokens?: number } }).usage;
    return {
      body,
      confidence: estimateConfidence(body, input.stars),
      tokens: usage?.total_tokens ?? Math.ceil((userMsg.length + body.length) / 4),
      model: "glm",
    };
  } catch (err) {
    console.error("[ai] draft fallback:", err instanceof Error ? err.message : err);
    return { ...fallbackDraft(input), model: "fallback" };
  }
}

// Template-based fallback so the product keeps working if the LLM is unreachable
function fallbackDraft(input: DraftInput): DraftResult {
  const kw = input.keywords?.[0];
  let body: string;
  if (input.stars <= 2) {
    body = `${input.author}, we're truly sorry about your experience at our ${input.location} location${kw ? ` — especially regarding ${kw}` : ""}. That is not the standard we hold ourselves to. Our manager will reach out personally, and we'd welcome the chance to make this right.`;
  } else if (input.stars === 3) {
    body = `Thank you for the honest feedback, ${input.author}${kw ? ` — especially your note on ${kw}` : ""}. We're actively working on it and hope to welcome you back for a noticeably better visit.`;
  } else {
    body = `Thank you so much, ${input.author}! We're delighted your visit hit the mark${kw ? ` — ${kw} is a team favourite too` : ""}. Your kind words are shared with the whole crew. See you again soon!`;
  }
  body += ` ${input.signature}`;
  return { body, confidence: estimateConfidence(body, input.stars), tokens: Math.ceil(body.length / 4), model: "fallback" };
}

// Classify a new review's sentiment + extract keywords (used by the sync connector)
export async function classifyReview(text: string, stars: number): Promise<{ sentiment: string; keywords: string[] }> {
  const heuristic = {
    sentiment: stars >= 4 ? "positive" : stars === 3 ? "neutral" : "negative",
    keywords: [] as string[],
  };
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You classify restaurant/service reviews. Reply with ONLY compact JSON: {\"sentiment\":\"positive|neutral|negative\",\"keywords\":[\"max 4 short lowercase phrases\"]}. Keywords must be concrete themes (dish, staff role, wait time, packaging). No markdown.",
        },
        { role: "user", content: `${stars}★ review: "${text}"` },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return heuristic;
    const parsed = JSON.parse(m[0]) as { sentiment?: string; keywords?: string[] };
    return {
      sentiment: ["positive", "neutral", "negative"].includes(parsed.sentiment || "") ? parsed.sentiment! : heuristic.sentiment,
      keywords: (parsed.keywords || []).slice(0, 4).map((k) => String(k).toLowerCase().slice(0, 30)),
    };
  } catch {
    return heuristic;
  }
}
