import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { platformConfig, AI_ADMIN_DEFAULTS, type AiAdminConfig } from "@/lib/platform-config";

// Admin → AI engine: per-customer usage/costs, draft quality outcomes and the
// platform model configuration (model, temperature, confidence threshold,
// brand-voice default, master pause).
export async function GET() {
  try {
    await requirePlatformAdmin();
    const [cfg, tenants, events, drafts] = await Promise.all([
      platformConfig.ai(),
      db.tenant.findMany({ include: { plan: true } }),
      db.aiUsageEvent.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
      db.aiDraft.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { id: true, status: true, confidence: true, tokens: true, reviewId: true } }),
    ]);

    const perTenant = tenants.map((t) => {
      const evts = events.filter((e) => e.tenantId === t.id);
      const tokens = evts.reduce((a, e) => a + e.tokens, 0);
      const tenantDrafts = drafts.filter((d) => d.reviewId && evts.length >= 0); // drafts are per review; usage events per tenant
      const costInr = Math.round(tokens * 0.00023); // ₹0.23 / 1k tokens (documented estimate)
      const aiCap = t.plan.aiDrafts.includes("Unlimited") ? 1500 : parseInt(t.plan.aiDrafts.replace(/\D+/g, "")) || 300;
      return {
        tenant: t.name,
        plan: t.plan.name,
        drafts: evts.filter((e) => e.kind === "draft").length,
        classifications: evts.filter((e) => e.kind === "classify").length,
        tokens,
        costInr,
        quota: aiCap,
        overQuota: evts.filter((e) => e.kind === "draft").length > aiCap,
      };
    });

    // Quality signals: approved-first-time vs edited vs low-confidence
    const lowConf = drafts.filter((d) => d.confidence < cfg.confidenceThreshold).length;
    const quality = {
      drafts30d: drafts.length,
      published: drafts.filter((d) => d.status === "approved").length,
      edited: drafts.filter((d) => d.status === "superseded").length,
      pending: drafts.filter((d) => d.status === "pending").length,
      lowConfidence: lowConf,
      editRatePct: drafts.length ? Math.round((drafts.filter((d) => d.status === "superseded").length / drafts.length) * 100) : 0,
    };

    return NextResponse.json({
      config: cfg,
      perTenant,
      quality,
      totals: {
        tokens: perTenant.reduce((a, t) => a + t.tokens, 0),
        costInr: perTenant.reduce((a, t) => a + t.costInr, 0),
        budgetInr: 15000,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Save AI platform configuration (model settings, threshold, pause)
export async function PATCH(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const body = await readJson<Partial<AiAdminConfig>>(req);
    const cfg = await platformConfig.ai();
    const next: AiAdminConfig = {
      model: body.model ?? cfg.model,
      temperature: Math.min(1, Math.max(0, body.temperature ?? cfg.temperature)),
      confidenceThreshold: Math.min(1, Math.max(0, body.confidenceThreshold ?? cfg.confidenceThreshold)),
      brandVoiceDefault: body.brandVoiceDefault ?? cfg.brandVoiceDefault,
      paused: body.paused ?? cfg.paused,
      customSystemPrompt: body.customSystemPrompt !== undefined ? body.customSystemPrompt : (cfg.customSystemPrompt ?? ""),
      safetyFilterEnabled: body.safetyFilterEnabled !== undefined ? body.safetyFilterEnabled : (cfg.safetyFilterEnabled ?? true),
      bannedPhrases: Array.isArray(body.bannedPhrases) ? body.bannedPhrases : (cfg.bannedPhrases ?? AI_ADMIN_DEFAULTS.bannedPhrases),
      fewShotExamples: Array.isArray(body.fewShotExamples) ? body.fewShotExamples : (cfg.fewShotExamples ?? AI_ADMIN_DEFAULTS.fewShotExamples),
    };
    await platformConfig.saveAi(next);
    if (body.paused !== undefined && body.paused !== cfg.paused) {
      await db.systemEvent.create({
        data: { type: "signal", name: body.paused ? "AI generation paused" : "AI generation resumed", state: body.paused ? "warn" : "ok", detail: `Platform-wide pause toggled by ${admin.email}.` },
      });
    }
    return NextResponse.json({ config: next });
  } catch (err) {
    return handleError(err);
  }
}
