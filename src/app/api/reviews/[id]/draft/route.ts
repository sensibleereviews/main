import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { generateReplyDraft } from "@/lib/ai";
import { assertAiQuota, recordAiUsage } from "@/lib/ai-metering";
import { safeJson, toReviewVM } from "@/lib/viewmodels";
import { platformConfig } from "@/lib/platform-config";
import { detectSensitive } from "@/lib/sensitive";

const STAFF_NAME_RE = /\b(Amit|Priya|Rahul|Vikram|Sneha|Arjun|Anand|Meera|Rohit|Lakshmi|Manoj|Kavya|Deepak|Pooja|Rajesh|Sunil|Anita|Farah)\b/g;

// staff names surfaced from keywords + review text (coaching context for the AI)
function staffNamesIn(keywords: string[], text: string): string[] {
  const hay = `${keywords.join(" ")} ${text}`;
  const found = new Set<string>();
  for (const m of hay.matchAll(STAFF_NAME_RE)) found.add(m[1]);
  return [...found];
}

// Generate (or regenerate) an AI draft reply — live LLM call with graceful fallback.
// Metered: quota-checked before the call (429 when over) and recorded after.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("ai_drafts");
    const { id } = await params;
    const review = await db.review.findUnique({
      where: { id },
      include: { location: true, drafts: { where: { status: "pending" } } },
    });
    if (!review || review.tenantId !== sess.tenantId) return fail(404, "Review not found");

    // Kill switch (doc §2F "Disable or pause AI features when necessary") — the
    // platform admin can pause drafting; tenants get a clear, honest error.
    const aiCfg = await platformConfig.ai();
    if (aiCfg.paused) return fail(503, "AI drafting is temporarily paused by the platform administrator. Your queue is safe — try again after it resumes.");

    await assertAiQuota(sess.tenantId!); // throws ApiError 429 over plan quota
    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! } });
    const settings = safeJson<{ tone?: string; signature?: string; brandVoice?: string }>(tenant?.settings || "{}", {});

    const result = await generateReplyDraft({
      business: tenant?.name || "our business",
      signature: settings.signature || `— Team, ${tenant?.name || ""}`,
      tone: review.stars <= 2 ? "apologetic" : settings.tone || "warm",
      author: review.author,
      stars: review.stars,
      location: review.location.name,
      text: review.text,
      keywords: safeJson<string[]>(review.keywords, []),
      // Section 1 context: sentiment, severity, staff mentions, language, history
      sentiment: review.sentiment,
      severity: review.stars <= 2 ? "high" : review.stars === 3 ? "medium" : "low",
      staffMentioned: staffNamesIn(safeJson<string[]>(review.keywords, []), review.text),
      previousNote: review.internalNote || undefined,
      // Part 2 inputs: brand voice + business type (doc: review, rating, location,
      // brand voice, language, business type → draft → approve → publish)
      brandVoice: settings.brandVoice || settings.tone,
      businessType: tenant?.category || undefined,
    });

    // supersede older pending drafts
    await Promise.all(review.drafts.map((d) => db.aiDraft.update({ where: { id: d.id }, data: { status: "superseded" } })));
    await db.aiDraft.create({
      data: { reviewId: review.id, body: result.body, tone: settings.tone || "warm", confidence: result.confidence, tokens: result.tokens },
    });
    await recordAiUsage(sess.tenantId!, "draft", result.model, result.tokens);

    // Sensitive-review flagging (doc §1D) — legal/safety/health allegations are
    // marked for human handling and never eligible for auto-posting.
    const sensitive = detectSensitive(review.text, safeJson<string[]>(review.keywords, []));

    const updated = await db.review.update({
      where: { id },
      data: {
        status: "ai-draft",
        ...(sensitive.sensitive ? { sensitive: true, sensitiveReason: sensitive.reason } : {}),
      },
      include: { location: true, drafts: { where: { status: "pending" }, orderBy: { createdAt: "desc" } } },
    });
    if (sensitive.sensitive && !review.sensitive) {
      await db.activityLog.create({
        data: { tenantId: sess.tenantId, actor: "ai-worker", action: "review.flagged", detail: `Sensitive (${sensitive.reason}) — flagged for human handling: ${review.author}` },
      });
    }
    await db.activityLog.create({
      data: { tenantId: sess.tenantId, actor: "ai-worker", action: "draft.generated", detail: `${result.model} · ${result.tokens} tokens · ${Math.round(result.confidence * 100)}% confidence` },
    });
    return NextResponse.json({ review: toReviewVM(updated), model: result.model, sensitive: sensitive.sensitive ? sensitive.reason : null });
  } catch (err) {
    return handleError(err);
  }
}
