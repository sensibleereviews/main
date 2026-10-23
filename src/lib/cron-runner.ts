import { db } from "@/lib/db";
import { googleConnector, whatsappConnector } from "@/lib/connectors";
import { classifyReview, generateReplyDraft } from "@/lib/ai";
import { platformConfig } from "@/lib/platform-config";
import { sendEmail } from "@/lib/email";

export type CronRunSummary = {
  timestamp: string;
  syncedLocations: number;
  newReviewsCount: number;
  dispatchedCampaigns: number;
  generatedReports: number;
  errors: string[];
};

let isRunning = false;
let timerInitialized = false;

export async function runCronTasks(): Promise<CronRunSummary> {
  if (isRunning) {
    return {
      timestamp: new Date().toISOString(),
      syncedLocations: 0,
      newReviewsCount: 0,
      dispatchedCampaigns: 0,
      generatedReports: 0,
      errors: ["Job is already running. Concurrency lock active."],
    };
  }

  isRunning = true;
  const errors: string[] = [];
  let syncedLocations = 0;
  let newReviewsCount = 0;
  let dispatchedCampaigns = 0;
  let generatedReports = 0;

  try {
    const integrations = await platformConfig.integrations().catch(() => null);
    const notifications = await platformConfig.notifications().catch(() => null);
    const cadenceMins = Math.max(5, integrations?.google.syncCadenceMins ?? 15);
    const cutoffDate = new Date(Date.now() - cadenceMins * 60 * 1000);

    // =========================================================================
    // 1. Review Sync (15-minute monitoring cadence across all Google profiles)
    // =========================================================================
    const dueLocations = await db.location.findMany({
      where: {
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lte: cutoffDate } }],
      },
      include: { tenant: { include: { plan: true } } },
      take: 20,
    });

    for (const loc of dueLocations) {
      try {
        const startMs = Date.now();
        const incoming = await googleConnector.fetchNewReviews({
          id: loc.id,
          name: loc.name,
          syncCount: loc.syncCount,
          googlePlaceId: loc.googlePlaceId,
        });

        for (const r of incoming) {
          const classified = await classifyReview(r.text, r.stars);
          const review = await db.review.create({
            data: {
              tenantId: loc.tenantId,
              locationId: loc.id,
              author: r.author,
              stars: r.stars,
              text: r.text,
              sentiment: classified.sentiment,
              keywords: JSON.stringify(classified.keywords),
              status: "pending",
              createdAt: r.createdAt,
            },
          });

          newReviewsCount++;

          // Auto-draft AI reply
          try {
            const draft = await generateReplyDraft({
              business: loc.tenant.name,
              signature: `— Management, ${loc.name}`,
              tone: "warm",
              author: r.author,
              stars: r.stars,
              location: loc.name,
              text: r.text,
              keywords: classified.keywords,
              sentiment: classified.sentiment,
            });

            await db.aiDraft.create({
              data: {
                reviewId: review.id,
                body: draft.body,
                tone: "warm",
                confidence: draft.confidence,
                tokens: draft.tokens,
                status: "pending",
              },
            });
          } catch (e) {
            console.error("[cron-runner] ai draft creation failed:", e);
          }

          // Trigger alert if negative review lands
          if (r.stars <= 2 && notifications?.negativeReview && notifications.recipients) {
            await sendEmail({
              to: notifications.recipients,
              subject: `[Alert] ${r.stars}★ Review received for ${loc.name}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                  <h2 style="color: #e11d48; margin-top: 0;">Negative Review Alert</h2>
                  <p><strong>${r.author}</strong> left a <strong>${r.stars}★ review</strong> for <em>${loc.name}</em>:</p>
                  <blockquote style="background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 12px 16px; margin: 16px 0;">
                    "${r.text}"
                  </blockquote>
                  <p><a href="http://localhost:3000/app/reviews" style="color: #2563eb; font-weight: 600;">Open Sensiblee Review Queue to respond &rarr;</a></p>
                </div>
              `,
            }).catch(() => {});
          }
        }

        const latencyMs = Date.now() - startMs;
        await db.syncLog.create({
          data: {
            locationId: loc.id,
            state: "ok",
            message: `Background review pull completed — ${incoming.length} new reviews`,
            newReviews: incoming.length,
            latencyMs,
          },
        });

        await db.location.update({
          where: { id: loc.id },
          data: {
            lastSyncAt: new Date(),
            syncCount: { increment: 1 },
            reviewCount: { increment: incoming.length },
          },
        });

        syncedLocations++;
      } catch (locErr) {
        errors.push(`Location ${loc.name} sync failed: ${locErr instanceof Error ? locErr.message : String(locErr)}`);
      }
    }

    // =========================================================================
    // 2. Scheduled Campaigns Dispatch (evaluate quiet hours + daily caps)
    // =========================================================================
    const scheduledCampaigns = await db.campaign.findMany({
      where: { status: "scheduled" },
      include: { tenant: true },
    });

    const istHour = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
    const quietStart = integrations?.whatsapp.quietStart ?? 21;
    const quietEnd = integrations?.whatsapp.quietEnd ?? 9;
    const inQuietHours = quietStart > quietEnd
      ? istHour >= quietStart || istHour < quietEnd
      : istHour >= quietStart && istHour < quietEnd;

    if (!inQuietHours && !integrations?.whatsapp.paused) {
      for (const camp of scheduledCampaigns) {
        try {
          const result = await whatsappConnector.sendBurst({
            recipients: camp.recipients,
            templateName: camp.template || camp.name,
            tenantName: camp.tenant.name,
          });

          await db.campaign.update({
            where: { id: camp.id },
            data: {
              status: "running",
              sent: result.sent,
              opened: result.opened,
              clicked: result.clicked,
            },
          });

          await db.activityLog.create({
            data: {
              tenantId: camp.tenantId,
              actor: "cron-runner",
              action: "campaign.dispatched",
              detail: `Campaign "${camp.name}" released from scheduled hold (${result.sent} recipients)`,
            },
          });

          dispatchedCampaigns++;
        } catch (cErr) {
          errors.push(`Campaign ${camp.name} dispatch failed: ${cErr instanceof Error ? cErr.message : String(cErr)}`);
        }
      }
    }

    // =========================================================================
    // 3. Weekly Digest Reports & Report Schedules
    // =========================================================================
    const dueSchedules = await db.reportSchedule.findMany({
      where: {
        OR: [
          { lastRunAt: null },
          { lastRunAt: { lte: new Date(Date.now() - 24 * 3600_000) } }, // at most once per 24 hours
        ],
      },
      include: { tenant: true },
    });

    for (const sched of dueSchedules) {
      try {
        const isWeekly = sched.frequency === "weekly";
        const dayMatch = isWeekly
          ? new Date().getUTCDay() === sched.dayOfWeek
          : new Date().getUTCDate() === sched.dayOfMonth;

        if (dayMatch || !sched.lastRunAt) {
          // Calculate tenant performance summary
          const targetTenantId = sched.tenantId;
          const tenantFilter = targetTenantId ? { tenantId: targetTenantId } : {};

          const [reviewStats, openIssues] = await Promise.all([
            db.review.aggregate({
              where: { ...tenantFilter, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
              _count: true,
              _avg: { stars: true },
            }),
            db.issue.count({
              where: { ...tenantFilter, status: "open" },
            }),
          ]);

          const count = reviewStats._count || 0;
          const avgStars = reviewStats._avg.stars ? Number(reviewStats._avg.stars.toFixed(2)) : 4.5;
          const tenantName = sched.tenant?.name || "All Organisations";

          const delivery = await db.reportDelivery.create({
            data: {
              scheduleId: sched.id,
              scheduleName: sched.name,
              template: sched.template,
              tenantName,
              status: "sent",
              detail: `Generated digest: ${count} reviews this week, avg ${avgStars}★, ${openIssues} open issues`,
            },
          });

          if (sched.recipients) {
            await sendEmail({
              to: sched.recipients,
              subject: `[Digest] ${sched.name} — ${tenantName}`,
              html: `
                <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px;">
                  <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
                    <h2 style="color: #0f172a; margin: 0;">${sched.name}</h2>
                    <p style="color: #64748b; margin: 4px 0 0 0;">${tenantName} &middot; Weekly Performance Summary</p>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center;">
                      <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${count}</div>
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">New Reviews (7d)</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 16px; border-radius: 12px; text-align: center;">
                      <div style="font-size: 24px; font-weight: bold; color: #059669;">${avgStars}★</div>
                      <div style="font-size: 11px; color: #059669; text-transform: uppercase;">Average Rating</div>
                    </div>
                    <div style="background: #fff1f2; padding: 16px; border-radius: 12px; text-align: center;">
                      <div style="font-size: 24px; font-weight: bold; color: #e11d48;">${openIssues}</div>
                      <div style="font-size: 11px; color: #e11d48; text-transform: uppercase;">Open Issues</div>
                    </div>
                  </div>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    ${delivery.detail}
                  </p>
                  <p style="margin-top: 24px; font-size: 13px;">
                    <a href="http://localhost:3000/app" style="color: #059669; font-weight: bold; text-decoration: none;">View full Reputation Health breakdown &rarr;</a>
                  </p>
                </div>
              `,
            }).catch(() => {});
          }

          await db.reportSchedule.update({
            where: { id: sched.id },
            data: { lastRunAt: new Date(), lastStatus: "ok" },
          });

          generatedReports++;
        }
      } catch (rErr) {
        errors.push(`Report schedule ${sched.name} failed: ${rErr instanceof Error ? rErr.message : String(rErr)}`);
      }
    }
  } catch (globalErr) {
    errors.push(`Global cron runner exception: ${globalErr instanceof Error ? globalErr.message : String(globalErr)}`);
  } finally {
    isRunning = false;
  }

  return {
    timestamp: new Date().toISOString(),
    syncedLocations,
    newReviewsCount,
    dispatchedCampaigns,
    generatedReports,
    errors,
  };
}

// Background in-process timer initialization
export function initBackgroundCron() {
  if (timerInitialized || typeof setInterval === "undefined") return;
  timerInitialized = true;
  // Run every 60 seconds
  setInterval(() => {
    runCronTasks().catch((e) => console.error("[cron-runner] scheduled tick failed:", e));
  }, 60_000);
}
