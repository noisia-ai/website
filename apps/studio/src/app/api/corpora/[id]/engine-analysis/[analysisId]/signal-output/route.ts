import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { publishedOutputs } from "@noisia/db";
import { forbidden, unauthorized, validationError } from "@/lib/api/responses";
import { canManageCorpus } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { getCorpusForUser } from "@/lib/data/corpora";
import { db, pool } from "@/lib/db";
import {
  loadEngineLiveIntelligenceLinks,
  summarizeEngineLiveIntelligenceLinks,
  type EnginePublishedOutputLiveIntelligence
} from "@/lib/live-intelligence/engine-observations";
import { attachLiveIntelligenceLinksToPayload } from "@/lib/live-intelligence/published-output";
import { buildEngineOutputManifestForMethodology } from "@/lib/engine/methodology-options";
import { validateEnginePublishReadiness } from "@/lib/engine/publish-guards";
import { buildEngineSignalPayload, normalizeSignalManifest } from "@/lib/signal/build";
import { SIGNAL_PAYLOAD_VERSION, type CompetitiveOwnership, type TbConfidence } from "@/lib/signal/contracts";

const bodySchema = z.object({
  title: z.string().min(3).max(140),
  headline: z.string().min(3).max(220).optional().nullable(),
  summary: z.string().min(3).max(700).optional().nullable(),
  manifest: z.record(z.unknown()).optional(),
  action: z.enum(["save_draft", "publish"]).default("save_draft")
});

type EngineAnalysisRow = {
  id: string;
  study_corpus_id: string;
  methodology_slug: string;
  methodology_version: string;
  status: string;
  business_question: string | null;
  meta_json: Record<string, unknown> | null;
  limitations: unknown;
};

type EngineFindingRow = {
  id: string;
  finding_key: string;
  name: string;
  dimensions: Record<string, unknown> | null;
  frequency: number;
  intensity: string | null;
  sentiment: string | null;
  share_pct: string | null;
  composite_score: string | null;
  ownership: string | null;
  confidence: string | null;
  evidence_count: number;
  mention_ids: string[] | null;
  quote: string | null;
};

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
  if (!parsed.success) return validationError(parsed.error);

  const analysis = await loadEngineAnalysis(corpus.id, analysisId);
  if (!analysis) {
    return Response.json({ error: "not_found", message: "Engine analysis not found." }, { status: 404 });
  }

  if (analysis.status !== "needs_review" && analysis.status !== "approved") {
    return Response.json(
      {
        error: "analysis_not_reviewable",
        message: "El engine analysis debe llegar a needs_review antes de preparar Signal."
      },
      { status: 409 }
    );
  }

  const findings = await loadEngineFindings(analysis.id);
  const isPublish = parsed.data.action === "publish";
  if (isPublish) {
    if (await engineAnalysisUsedFixtureCoding(analysis.id, analysis.meta_json)) {
      return Response.json(
        {
          error: "fixture_coding_used",
          message: "Este output viene de fixture/no-cost QA y no puede publicarse como client-ready. Recorre el lente con Claude real.",
          failedChecks: [{ id: "fixture_coding", detail: "engine_cost_events.provider=fixture" }]
        },
        { status: 409 }
      );
    }
    const readiness = validateEnginePublishReadiness(analysis.meta_json);
    if (!readiness.ok) {
      return Response.json(
        {
          error: readiness.error,
          message: readiness.message,
          failedChecks: readiness.failedChecks
        },
        { status: 409 }
      );
    }
  }
  const manifest = normalizeSignalManifest({
    ...(parsed.data.manifest ?? {}),
    ...buildEngineOutputManifestForMethodology(analysis.methodology_slug)
  });
  const payload = buildEngineSignalPayload({
    corpus,
    analysis: {
      id: analysis.id,
      methodologySlug: analysis.methodology_slug,
      methodologyVersion: analysis.methodology_version,
      businessQuestion: analysis.business_question,
      metaJson: analysis.meta_json ?? {},
      limitations: analysis.limitations
    },
    findings: findings.map(normalizeEngineFinding),
    manifest,
    headline: parsed.data.headline,
    summary: parsed.data.summary
  });
  const output = await upsertEngineOutput({
    engineAnalysisId: analysis.id,
    studyCorpusId: corpus.id,
    brandId: corpus.brandId,
    themeId: corpus.themeId,
    methodologySlug: analysis.methodology_slug,
    status: isPublish ? "published" : "draft",
    title: parsed.data.title,
    headline: parsed.data.headline ?? null,
    summary: parsed.data.summary ?? null,
    manifest,
    payload,
    userId: session.appUser.id,
    publish: isPublish
  });

  let liveIntelligence: EnginePublishedOutputLiveIntelligence | null = null;
  if (isPublish && output?.id) {
    try {
      await pool.query(
        `UPDATE signal_observations
         SET published_output_id = $1
         WHERE engine_analysis_id = $2
           AND published_output_id IS NULL`,
        [output.id, analysis.id]
      );
      liveIntelligence = summarizeEngineLiveIntelligenceLinks(
        await loadEngineLiveIntelligenceLinks(analysis.id)
      );
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
        reason: error instanceof Error ? error.message : "unknown_engine_live_intelligence_error",
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
    .where(and(eq(publishedOutputs.engineAnalysisId, analysisId), eq(publishedOutputs.outputType, "narrative_dashboard")))
    .limit(1);

  return Response.json({ output: output ?? null });
}

async function loadEngineAnalysis(corpusId: string, analysisId: string) {
  const result = await pool.query<EngineAnalysisRow>(
    `SELECT id,
            study_corpus_id,
            methodology_slug,
            methodology_version,
            status,
            business_question,
            meta_json,
            limitations
     FROM engine_analyses
     WHERE id = $1
       AND study_corpus_id = $2
     LIMIT 1`,
    [analysisId, corpusId]
  );
  return result.rows[0] ?? null;
}

async function loadEngineFindings(engineAnalysisId: string) {
  const result = await pool.query<EngineFindingRow>(
    `SELECT
       f.id,
       f.finding_key,
       f.name,
       f.dimensions,
       f.frequency,
       f.intensity::text,
       f.sentiment::text,
       f.share_pct::text,
       f.composite_score::text,
       f.ownership,
       f.confidence,
       COUNT(c.id)::int AS evidence_count,
       COALESCE(array_remove(array_agg(c.mention_id::text ORDER BY c.position), NULL), ARRAY[]::text[]) AS mention_ids,
       (array_remove(array_agg(m.text_clean ORDER BY c.is_protagonist DESC, c.position ASC), NULL))[1] AS quote
     FROM engine_findings f
     LEFT JOIN engine_finding_citations c ON c.finding_id = f.id
     LEFT JOIN mentions m ON m.id = c.mention_id
     WHERE f.engine_analysis_id = $1
     GROUP BY f.id
     ORDER BY f.position ASC, f.composite_score DESC NULLS LAST`,
    [engineAnalysisId]
  );
  return result.rows;
}

function normalizeEngineFinding(row: EngineFindingRow) {
  return {
    id: row.id,
    findingKey: row.finding_key,
    name: row.name,
    dimensions: row.dimensions ?? {},
    frequency: Number(row.frequency ?? 0),
    intensity: numberOrNull(row.intensity),
    sentiment: numberOrNull(row.sentiment),
    sharePct: numberOrNull(row.share_pct),
    compositeScore: numberOrNull(row.composite_score),
    ownership: coerceOwnership(row.ownership),
    confidence: coerceConfidence(row.confidence),
    evidenceCount: Number(row.evidence_count ?? 0),
    mentionIds: row.mention_ids ?? [],
    quote: row.quote
  };
}

async function upsertEngineOutput(args: {
  engineAnalysisId: string;
  studyCorpusId: string;
  brandId: string | null;
  themeId: string | null;
  methodologySlug: string;
  status: "draft" | "published";
  title: string;
  headline: string | null;
  summary: string | null;
  manifest: unknown;
  payload: unknown;
  userId: string;
  publish: boolean;
}) {
  const result = await pool.query<{ id: string; status: string; title: string }>(
    `INSERT INTO published_outputs (
       engine_analysis_id, study_corpus_id, brand_id, theme_id, methodology_slug,
       output_type, status, title, headline, summary, manifest, payload, version,
       created_by_user_id, published_by_user_id, published_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, 'narrative_dashboard', $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12,
       $13, $14, CASE WHEN $15::boolean THEN NOW() ELSE NULL END, NOW())
     ON CONFLICT (engine_analysis_id, output_type)
       WHERE engine_analysis_id IS NOT NULL
     DO UPDATE SET
       status = EXCLUDED.status,
       title = EXCLUDED.title,
       headline = EXCLUDED.headline,
       summary = EXCLUDED.summary,
       manifest = EXCLUDED.manifest,
       payload = EXCLUDED.payload,
       version = EXCLUDED.version,
       published_by_user_id = EXCLUDED.published_by_user_id,
       published_at = CASE WHEN $15::boolean THEN NOW() ELSE published_outputs.published_at END,
       archived_at = NULL,
       updated_at = NOW()
     RETURNING id, status, title`,
    [
      args.engineAnalysisId,
      args.studyCorpusId,
      args.brandId,
      args.themeId,
      args.methodologySlug,
      args.status,
      args.title,
      args.headline,
      args.summary,
      JSON.stringify(args.manifest),
      JSON.stringify(args.payload),
      SIGNAL_PAYLOAD_VERSION,
      args.userId,
      args.publish ? args.userId : null,
      args.publish
    ]
  );
  return result.rows[0] ?? null;
}

async function engineAnalysisUsedFixtureCoding(engineAnalysisId: string, metaJson: unknown) {
  const meta = asRecord(metaJson);
  const engineCoding = asRecord(meta.engine_coding);
  if (engineCoding.fixture === true || engineCoding.provider === "fixture") return true;

  const result = await pool.query<{ used_fixture: boolean }>(
    `SELECT EXISTS(
       SELECT 1
       FROM engine_cost_events
       WHERE engine_analysis_id = $1
         AND provider = 'fixture'
     ) AS used_fixture`,
    [engineAnalysisId]
  );
  return result.rows[0]?.used_fixture === true;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coerceConfidence(value: unknown): TbConfidence {
  return value === "alta" || value === "media" || value === "baja_direccional" ? value : "baja_direccional";
}

function coerceOwnership(value: unknown): CompetitiveOwnership | null {
  if (
    value === "brand_owned" ||
    value === "competitor_owned" ||
    value === "category_wide" ||
    value === "shared" ||
    value === "insufficient_evidence"
  ) {
    return value;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
