import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { googleConnector } from "@/lib/connectors";
import { classifyReview, generateReplyDraft } from "@/lib/ai";
import { assertAiQuota, recordAiUsage } from "@/lib/ai-metering";
import { safeJson, toLocationVM } from "@/lib/viewmodels";
import { platformConfig } from "@/lib/platform-config";
import { detectSensitive } from "@/lib/sensitive";

// Manual / scheduled sync — pulls new reviews through the Google connector.
// Every AI operation here is metered (classify + draft); quota-guarded per batch.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantUser();
    const { id } = await params;
    const location = await db.location.findUnique({ where: { id } });
    if (!location || location.tenantId !== sess.tenantId) return fail(404, "Location not found");

    const started = Date.now();
    const incoming = await googleConnector.fetchNewReviews({ id: location.id, name: location.name, syncCount: location.syncCount });
    const aiCfg = await platformConfig.ai();
    const aiPaused = aiCfg.paused; // kill switch: sync still runs, drafts pause
    if (incoming.length && !aiPaused) await assertAiQuota(sess.tenantId!); // 429 before burning tokens on a batch
    const tenant = await db.tenant.findUnique({ where: { id: sess.tenantId! } });
    const settings = safeJson<{ tone?: string; signature?: string }>(tenant?.settings || "{}", {});

    let created = 0;
    for (const r of incoming) {
      const cls = aiPaused
        ? { sentiment: r.stars <= 2 ? "negative" : r.stars === 3 ? "neutral" : "positive", keywords: [] as string[] }
        : await classifyReview(r.text, r.stars);
      if (!aiPaused) await recordAiUsage(sess.tenantId!, "classify", "glm", Math.ceil((r.text.length + 40) / 4));
      const sensitive = detectSensitive(r.text, cls.keywords);
      const review = await db.review.create({
        data: {
          tenantId: location.tenantId, locationId: location.id, author: r.author, stars: r.stars,
          text: r.text, sentiment: cls.sentiment, keywords: JSON.stringify(cls.keywords),
          status: "awaiting", source: "google", createdAt: r.createdAt,
          ...(sensitive.sensitive ? { sensitive: true, sensitiveReason: sensitive.reason } : {}),
        },
      });
      created++;
      // auto-draft in the tenant's voice (the "AI worker") — skipped while the
      // platform admin has AI paused; reviews still sync and wait for a human.
      if (!aiPaused && sess.tenantId) {
        const draft = await generateReplyDraft({
          business: tenant?.name || "our business",
          signature: settings.signature || `— Team, ${tenant?.name || ""}`,
          tone: r.stars <= 2 ? "apologetic" : settings.tone || "warm",
          author: r.author, stars: r.stars, location: location.name, text: r.text, keywords: cls.keywords,
        });
        await db.aiDraft.create({
          data: { reviewId: review.id, body: draft.body, tone: settings.tone || "warm", confidence: draft.confidence, tokens: draft.tokens },
        });
        await recordAiUsage(sess.tenantId!, "draft", draft.model, draft.tokens);
        await db.review.update({ where: { id: review.id }, data: { status: "ai-draft" } });
      }
    }

    const latency = Date.now() - started + 320;
    const state = latency > 3000 ? "warn" : "ok";
    await db.syncLog.create({
      data: {
        locationId: location.id, state,
        message: created ? `${created} new review${created > 1 ? "s" : ""} pulled${aiPaused ? " · AI paused — no drafts" : " · sentiment scored · draft" + (created > 1 ? "s" : "") + " queued"}` : `No new reviews · latency ${latency} ms`,
        newReviews: created, latencyMs: latency,
      },
    });
    const updated = await db.location.update({
      where: { id: location.id },
      data: { lastSyncAt: new Date(), syncCount: { increment: 1 }, reviewCount: { increment: created } },
    });
    return NextResponse.json({
      location: toLocationVM(updated),
      newReviews: created,
      mode: googleConnector.mode(),
    });
  } catch (err) {
    return handleError(err);
  }
}
