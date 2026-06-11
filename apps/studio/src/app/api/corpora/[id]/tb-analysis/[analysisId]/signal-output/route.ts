import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { publishedOutputs } from "@noisia/db";
import { forbidden, unauthorized, validationError } from "@/lib/api/responses";
import { canManageCorpus } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { getCorpusForUser, getTbAnalysisForCorpus } from "@/lib/data/corpora";
import { db, pool } from "@/lib/db";
import {
  explicitCompositeEngineLensesFromPlan,
  validateCompositeEnginePublishReadiness,
  type CompositeEngineLensAnalysis
} from "@/lib/engine/composite-publish-guards";
import { attachLiveIntelligenceLinksToPayload } from "@/lib/live-intelligence/published-output";
import { persistTbSignalObservations } from "@/lib/live-intelligence/tb-observations";
import { buildSignalPayload, normalizeSignalManifest } from "@/lib/signal/build";
import { SIGNAL_PAYLOAD_VERSION } from "@/lib/signal/contracts";

const bodySchema = z.object({
  title: z.string().min(3).max(140),
  headline: z.string().min(3).max(220).optional().nullable(),
  summary: z.string().min(3).max(700).optional().nullable(),
  manifest: z.record(z.unknown()).optional(),
  action: z.enum(["save_draft", "publish"]).default("save_draft")
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; analysisId: string }> }
) {
  const session = await getAuthenticatedAppUser();
  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id, analysisId } = await context.params;
  const corpus = await getCorpusForUser(session.appUser, id);
  if (!corpus) {
    return Response.json({ error: "not_found", message: "Corpus not found." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const state = await getTbAnalysisForCorpus(corpus.id, analysisId, { includeAggregates: true });
  if (!state) {
    return Response.json({ error: "not_found", message: "Analysis not found." }, { status: 404 });
  }

  if (!["approved_by_im", "approved_by_kam"].includes(state.analysis.status)) {
    return Response.json(
      {
        error: "analysis_not_approved",
        message: "Primero aprueba la síntesis antes de preparar Signal."
      },
      { status: 409 }
    );
  }

  const manifest = normalizeSignalManifest(parsed.data.manifest);
  const payload = buildSignalPayload({
    state,
    corpus,
    manifest,
    headline: parsed.data.headline,
    summary: parsed.data.summary
  });
  const isPublish = parsed.data.action === "publish";
  if (isPublish) {
    const selectedEngineLenses = explicitCompositeEngineLensesFromPlan(corpus.analysisPlan);
    const compositeReadiness = validateCompositeEnginePublishReadiness({
      analysisPlan: corpus.analysisPlan,
      manifest,
      latestAnalyses: selectedEngineLenses.length > 0
        ? await loadLatestCompositeEngineAnalyses(corpus.id, selectedEngineLenses)
        : []
    });
    if (!compositeReadiness.ok) {
      return Response.json(
        {
          error: compositeReadiness.error,
          message: compositeReadiness.message,
          required_lenses: compositeReadiness.required_lenses,
          failed_lenses: compositeReadiness.failed_lenses
        },
        { status: 409 }
      );
    }
  }

  // TODO mejora-futura: versionar cada publish como snapshot inmutable.
  // MVP mantiene un output narrativo por analisis y actualiza el payload.
  const [output] = await db
    .insert(publishedOutputs)
    .values({
      tbAnalysisId: state.analysis.id,
      studyCorpusId: corpus.id,
      brandId: corpus.brandId,
      themeId: corpus.themeId,
      methodologySlug: corpus.methodologySlug ?? "triggers-barriers",
      outputType: "narrative_dashboard",
      status: isPublish ? "published" : "draft",
      title: parsed.data.title,
      headline: parsed.data.headline,
      summary: parsed.data.summary,
      manifest,
      payload,
      version: SIGNAL_PAYLOAD_VERSION,
      createdByUserId: session.appUser.id,
      publishedByUserId: isPublish ? session.appUser.id : null,
      publishedAt: isPublish ? new Date() : null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [publishedOutputs.tbAnalysisId, publishedOutputs.outputType],
      set: {
        status: isPublish ? "published" : "draft",
        title: parsed.data.title,
        headline: parsed.data.headline,
        summary: parsed.data.summary,
        manifest,
        payload,
        version: SIGNAL_PAYLOAD_VERSION,
        publishedByUserId: isPublish ? session.appUser.id : null,
        publishedAt: isPublish ? new Date() : null,
        archivedAt: null,
        updatedAt: new Date()
      }
    })
    .returning({
      id: publishedOutputs.id,
      status: publishedOutputs.status,
      title: publishedOutputs.title
    });

  let liveIntelligence: Awaited<ReturnType<typeof persistTbSignalObservations>> | null = null;
  if (isPublish && output?.id) {
    try {
      liveIntelligence = await persistTbSignalObservations({
        tbAnalysisId: state.analysis.id,
        publishedOutputId: output.id
      });
      if (liveIntelligence.status === "ok" && liveIntelligence.mappings.length > 0) {
        await db
          .update(publishedOutputs)
          .set({
            payload: attachLiveIntelligenceLinksToPayload(payload, liveIntelligence),
            updatedAt: new Date()
          })
          .where(eq(publishedOutputs.id, output.id));
      }
    } catch (error) {
      liveIntelligence = {
        status: "skipped",
        reason: error instanceof Error ? error.message : "unknown_live_intelligence_error",
        signals: 0,
        observations: 0,
        evidence: 0,
        mappings: []
      };
    }
  }

  return Response.json({ ok: true, output, liveIntelligence });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; analysisId: string }> }
) {
  const session = await getAuthenticatedAppUser();
  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id, analysisId } = await context.params;
  const corpus = await getCorpusForUser(session.appUser, id);
  if (!corpus) {
    return Response.json({ error: "not_found", message: "Corpus not found." }, { status: 404 });
  }

  const [output] = await db
    .select({
      id: publishedOutputs.id,
      title: publishedOutputs.title,
      headline: publishedOutputs.headline,
      summary: publishedOutputs.summary,
      status: publishedOutputs.status,
      manifest: publishedOutputs.manifest,
      publishedAt: publishedOutputs.publishedAt
    })
    .from(publishedOutputs)
    .where(and(eq(publishedOutputs.tbAnalysisId, analysisId), eq(publishedOutputs.outputType, "narrative_dashboard")))
    .limit(1);

  return Response.json({ output: output ?? null });
}

async function loadLatestCompositeEngineAnalyses(
  corpusId: string,
  methodologySlugs: string[]
): Promise<CompositeEngineLensAnalysis[]> {
  if (methodologySlugs.length === 0) return [];
  const result = await pool.query<{
    methodology_slug: string;
    engine_analysis_id: string;
    status: string | null;
    current_step: string | null;
    meta_json: unknown;
    used_fixture_coding: boolean;
  }>(
    `
      SELECT DISTINCT ON (ea.methodology_slug)
        ea.methodology_slug,
        ea.id::text AS engine_analysis_id,
        ea.status,
        ea.current_step,
        ea.meta_json,
        EXISTS (
          SELECT 1
          FROM engine_cost_events ece
          WHERE ece.engine_analysis_id = ea.id
            AND ece.provider = 'fixture'
        ) AS used_fixture_coding
      FROM engine_analyses ea
      WHERE ea.study_corpus_id = $1
        AND ea.methodology_slug = ANY($2::text[])
      ORDER BY ea.methodology_slug, ea.created_at DESC
    `,
    [corpusId, methodologySlugs]
  );

  return result.rows.map((row) => ({
    methodologySlug: row.methodology_slug,
    engineAnalysisId: row.engine_analysis_id,
    status: row.status,
    currentStep: row.current_step,
    metaJson: row.meta_json,
    usedFixtureCoding: row.used_fixture_coding
  }));
}
