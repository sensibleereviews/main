import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { toReviewVM } from "@/lib/viewmodels";

// Module C — AI approval queue (reviews with a pending draft) + reply publish
// outcomes (doc §1D: track published, pending and failed replies) + sensitive
// reviews flagged for human handling.
export async function GET() {
  try {
    const sess = await requireTenantUser();
    const [reviews, failed, sensitiveReviews] = await Promise.all([
      db.review.findMany({
        where: { tenantId: sess.tenantId!, drafts: { some: { status: "pending" } } },
        include: { location: true, drafts: { where: { status: "pending" } } },
        orderBy: { createdAt: "desc" },
      }),
      db.review.findMany({
        where: { tenantId: sess.tenantId!, status: "failed" },
        include: { location: true, drafts: { where: { status: "pending" } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.review.findMany({
        where: { tenantId: sess.tenantId!, sensitive: true, status: { not: "replied" } },
        include: { location: true, drafts: { where: { status: "pending" } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    const queue = reviews.map((r) => {
      const vm = toReviewVM(r);
      const hours = (Date.now() - new Date(r.createdAt).getTime()) / 3600_000;
      return {
        id: vm.id,
        reviewStars: vm.stars,
        author: vm.author,
        location: vm.location,
        excerpt: vm.text.length > 90 ? `${vm.text.slice(0, 90)}…` : vm.text,
        draft: vm.draft || "",
        draftId: vm.draftId,
        tone: r.drafts.find((d) => d.status === "pending")?.tone === "apologetic" ? "Apologetic" : r.drafts.find((d) => d.status === "pending")?.tone === "formal" ? "Formal" : r.drafts.find((d) => d.status === "pending")?.tone === "playful" ? "Playful" : "Warm",
        confidence: vm.confidence ?? 0.9,
        age: hours < 1 ? `${Math.max(1, Math.round(hours * 60))}m` : `${Math.round(hours)}h`,
        urgent: vm.stars <= 2 || hours > 20,
        text: vm.text,
        sensitive: r.sensitive ? r.sensitiveReason : null,
      };
    });
    const failedItem = (r: (typeof failed)[number]) => ({
      id: r.id,
      reviewStars: r.stars,
      author: r.author,
      location: r.location.name,
      error: r.replyError || "Publishing failed at the provider",
      reply: r.replyText || "",
      draft: r.drafts.find((d) => d.status === "pending")?.body || "",
      connected: !!r.location.googlePlaceId,
    });
    const sensitiveItem = (r: (typeof sensitiveReviews)[number]) => ({
      id: r.id,
      reviewStars: r.stars,
      author: r.author,
      location: r.location.name,
      excerpt: r.text.length > 110 ? `${r.text.slice(0, 110)}…` : r.text,
      reason: r.sensitiveReason || "Sensitive content",
      status: r.status,
    });
    return NextResponse.json({
      queue,
      failed: failed.map(failedItem),
      sensitive: sensitiveReviews.map(sensitiveItem),
    });
  } catch (err) {
    return handleError(err);
  }
}
