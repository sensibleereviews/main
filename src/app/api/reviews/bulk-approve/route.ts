import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";
import { googleConnector } from "@/lib/connectors";
import { checkToxicityAndHallucination } from "@/lib/ai";
import { platformConfig } from "@/lib/platform-config";

// Bulk approve AI drafts for multiple reviews at once
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("reviews_reply");
    const body = await readJson<{ reviewIds?: string[] }>(req);
    if (!Array.isArray(body.reviewIds) || !body.reviewIds.length) {
      return fail(400, "reviewIds array is required");
    }

    const reviews = await db.review.findMany({
      where: {
        id: { in: body.reviewIds },
        tenantId: sess.tenantId!,
      },
      include: {
        drafts: { where: { status: "pending" } },
        location: true,
      },
    });

    if (!reviews.length) return fail(404, "No matching reviews found");

    const aiCfg = await platformConfig.ai().catch(() => null);
    let approvedCount = 0;
    let failedCount = 0;

    for (const r of reviews) {
      const draft = r.drafts[0];
      const replyText = draft?.body || r.replyText;

      if (!replyText) continue;

      // Safety check
      const safety = checkToxicityAndHallucination(replyText, aiCfg);
      if (!safety.safe) {
        failedCount++;
        continue;
      }

      // Google post via connector
      const postResult = await googleConnector.postReviewReply({
        placeId: r.location.googlePlaceId,
        reviewId: r.id,
        replyText,
      });

      if (!postResult.ok) {
        await db.review.update({
          where: { id: r.id },
          data: { status: "failed", replyError: postResult.error || "Google post rejected" },
        });
        failedCount++;
      } else {
        await db.review.update({
          where: { id: r.id },
          data: { replyText, status: "replied", repliedAt: new Date(), repliedBy: sess.name, replyError: null },
        });
        if (draft) {
          await db.aiDraft.update({ where: { id: draft.id }, data: { status: "approved" } });
        }
        approvedCount++;
      }
    }

    await db.activityLog.create({
      data: {
        tenantId: sess.tenantId!,
        actor: sess.email,
        action: "reply.bulk_approved",
        detail: `Bulk approved and published ${approvedCount} review replies (${failedCount} skipped or failed)`,
      },
    });

    return NextResponse.json({
      ok: true,
      approvedCount,
      failedCount,
      totalRequested: body.reviewIds.length,
    });
  } catch (err) {
    return handleError(err);
  }
}
