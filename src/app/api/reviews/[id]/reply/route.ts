import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { toReviewVM } from "@/lib/viewmodels";
import { googleConnector } from "@/lib/connectors";
import { checkToxicityAndHallucination } from "@/lib/ai";
import { platformConfig } from "@/lib/platform-config";

// Approve & post a reply (optionally edited inline first).
// Publish lifecycle:
// 1. Safety & Toxicity check prevents unauthorized refund claims or hostile phrasing
// 2. Google Business Profile API call posts reply live to Google Maps when credentials exist
// 3. Fallback to honest simulation when in demo mode, ensuring determinism
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireTenantPerm("reviews_reply");
    const { id } = await params;
    const { body } = await readJson<{ body?: string }>(req);
    if (!body || body.trim().length < 4) return fail(400, "Reply text is required");

    const replyText = body.trim();

    // 1. Toxicity & Hallucination Filter Check
    const aiCfg = await platformConfig.ai().catch(() => null);
    const safetyCheck = checkToxicityAndHallucination(replyText, aiCfg);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { error: safetyCheck.reason, flaggedPhrase: safetyCheck.flaggedPhrase, safetyViolation: true },
        { status: 422 }
      );
    }

    const review = await db.review.findUnique({ where: { id }, include: { drafts: { where: { status: "pending" } }, location: true } });
    if (!review || review.tenantId !== sess.tenantId) return fail(404, "Review not found");

    // 2. Post reply live to Google via Connector
    const postResult = await googleConnector.postReviewReply({
      placeId: review.location.googlePlaceId,
      reviewId: review.id,
      replyText,
    });

    if (!postResult.ok) {
      const [failedReview] = await Promise.all([
        db.review.update({
          where: { id },
          data: { status: "failed", replyError: postResult.error || "Google post rejected" },
          include: { location: true, drafts: { where: { status: "pending" } } },
        }),
      ]);
      await db.activityLog.create({
        data: { tenantId: sess.tenantId, actor: sess.email, action: "reply.failed", detail: `Publish failed for ${review.author}: ${postResult.error}` },
      });
      return NextResponse.json({ review: toReviewVM(failedReview), failed: true, error: postResult.error }, { status: 200 });
    }

    const [updated] = await Promise.all([
      db.review.update({
        where: { id },
        data: { replyText, status: "replied", repliedAt: new Date(), repliedBy: sess.name, replyError: null },
        include: { location: true, drafts: { where: { status: "pending" } } },
      }),
      ...review.drafts.map((d) => db.aiDraft.update({ where: { id: d.id }, data: { status: "approved" } })),
    ]);

    await db.activityLog.create({
      data: {
        tenantId: sess.tenantId,
        actor: sess.email,
        action: "reply.approved",
        detail: `${review.stars}★ reply published ${postResult.live ? "live to Google Maps" : "to Google profile"} for ${review.author}${review.sensitive ? " (sensitive — handled by human)" : ""}`,
      },
    });

    return NextResponse.json({ review: toReviewVM(updated), live: postResult.live });
  } catch (err) {
    return handleError(err);
  }
}
