import type { Job } from "bullmq";

import { buildMonthlyReportPeriods } from "@noisia/query-engine";
import { pool } from "../db/client";
import {
  enqueueEngineStep,
  markEngineStepCompleted,
  markEngineStepFailed,
  markEngineStepRunning,
  recordEngineCostEvent,
  releaseEngineCorpusLock
} from "./engine-shared";
import { safeJsonStringifyForPostgres } from "./postgres-json";

type SignalPulseStepJobData = {
  engineAnalysisId: string;
  pipelineStepId: string;
};

type AnalysisContext = {
  study_corpus_id: string;
  methodology_slug: string;
  params: Record<string, unknown> | null;
  analysis_plan: Record<string, unknown> | null;
  target_window_months: number | null;
};

type TermCluster = {
  term: string;
  mention_count: number;
  platforms: string[];
  sample_mention_ids: string[];
};

const STOPWORDS_ES_MX = new Set([
  "para", "pero", "como", "con", "que", "por", "una", "uno", "los", "las", "del", "este", "esta",
  "esto", "muy", "mas", "menos", "porque", "cuando", "todo", "toda", "todos", "todas", "solo", "bien",
  "mal", "sin", "hay", "son", "soy", "fue", "ser", "mis", "sus", "me", "mi", "ya", "no", "si"
]);

export async function signalPulseReadinessJob(job: Job<SignalPulseStepJobData>) {
  return runSignalPulseStep(job, async ({ engineAnalysisId, pipelineStepId }) => {
    const ctx = await loadSignalPulseContext(engineAnalysisId);
    assertSignalPulse(ctx);
    const budgetCapUsd = readBudgetCapUsd(ctx);
    const [coverage] = (await pool.query<{
      conversation_mentions: number;
      signal_pulse_mentions: number;
      performance_records: number;
      query_packs: number;
    }>(
      `
        SELECT
          COUNT(DISTINCT m.id)::int AS conversation_mentions,
          COUNT(DISTINCT m.id) FILTER (WHERE mqs.lens_slug = 'signal-pulse')::int AS signal_pulse_mentions,
          (SELECT COUNT(*)::int FROM performance_records pr WHERE pr.study_corpus_id = $1) AS performance_records,
          (SELECT COUNT(*)::int FROM query_packs qp WHERE qp.study_corpus_id = $1 AND qp.lens_slug = 'signal-pulse') AS query_packs
        FROM mentions m
        LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
        WHERE m.study_corpus_id = $1
          AND m.inclusion_status = 'included'
      `,
      [ctx.study_corpus_id]
    )).rows;

    const readiness = {
      conversation_mentions: Number(coverage?.conversation_mentions ?? 0),
      signal_pulse_mentions: Number(coverage?.signal_pulse_mentions ?? 0),
      performance_records: Number(coverage?.performance_records ?? 0),
      query_packs: Number(coverage?.query_packs ?? 0),
      budget_cap_usd: budgetCapUsd,
      estimated_cost_usd: 0,
      cluster_first: true,
      status: Number(coverage?.conversation_mentions ?? 0) > 0 ? "ready" : "blocked"
    };

    await mergeMeta(engineAnalysisId, { signal_pulse: { readiness } });
    await recordEngineCostEvent({
      engineAnalysisId,
      pipelineStepId,
      provider: "system",
      model: null,
      operation: "sp_readiness_estimate",
      estimatedCostUsd: 0,
      metadata: readiness
    });
    await markEngineStepCompleted({ pipelineStepId, resultSummary: readiness });
    const next = await enqueueEngineStep({ engineAnalysisId, step: "sp_periods" });
    return { ...readiness, next_step_job_id: next.jobId };
  });
}

export async function signalPulsePeriodsJob(job: Job<SignalPulseStepJobData>) {
  return runSignalPulseStep(job, async ({ engineAnalysisId, pipelineStepId }) => {
    const ctx = await loadSignalPulseContext(engineAnalysisId);
    assertSignalPulse(ctx);
    const bounds = (await pool.query<{ max_date: string | null }>(
      `SELECT max(published_at)::date::text AS max_date
       FROM mentions
       WHERE study_corpus_id = $1 AND inclusion_status = 'included'`,
      [ctx.study_corpus_id]
    )).rows[0];
    const periods = buildMonthlyReportPeriods({
      windowEnd: bounds?.max_date ?? new Date(),
      months: readWindowMonths(ctx)
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '120s'");
      for (const period of periods) {
        const coverage = (await client.query<{
          conversation: number;
          performance: number;
          by_source: Record<string, number> | null;
        }>(
          `
            WITH conversation AS (
              SELECT
                COUNT(DISTINCT m.id)::int AS conversation,
                jsonb_object_agg(platform, count) AS by_source
              FROM (
                SELECT COALESCE(NULLIF(m.resolved_platform, ''), m.platform, 'unknown') AS platform,
                       COUNT(DISTINCT m.id)::int AS count
                FROM mentions m
                WHERE m.study_corpus_id = $1
                  AND m.inclusion_status = 'included'
                  AND m.published_at >= $2::date
                  AND m.published_at < ($3::date + interval '1 day')
                GROUP BY 1
              ) source_counts
            ),
            performance AS (
              SELECT COUNT(*)::int AS performance
              FROM performance_records pr
              WHERE pr.study_corpus_id = $1
                AND pr.record_date >= $2::date
                AND pr.record_date <= $3::date
            )
            SELECT conversation.conversation, performance.performance, conversation.by_source
            FROM conversation, performance
          `,
          [ctx.study_corpus_id, period.periodStart, period.periodEnd]
        )).rows[0];
        const coveragePayload = {
          conversation: Number(coverage?.conversation ?? 0),
          performance: Number(coverage?.performance ?? 0),
          by_source: coverage?.by_source ?? {}
        };
        await client.query(
          `
            INSERT INTO report_periods (
              study_corpus_id, granularity, period_start, period_end, label,
              coverage, comparable, comparability_reasons, confidence, known_gaps, computed_at
            )
            VALUES ($1, 'month', $2::date, $3::date, $4, $5::jsonb, $6, $7::jsonb, $8, $9::jsonb, NOW())
            ON CONFLICT (study_corpus_id, granularity, period_start)
            DO UPDATE SET
              period_end = EXCLUDED.period_end,
              label = EXCLUDED.label,
              coverage = EXCLUDED.coverage,
              comparable = EXCLUDED.comparable,
              comparability_reasons = EXCLUDED.comparability_reasons,
              confidence = EXCLUDED.confidence,
              known_gaps = EXCLUDED.known_gaps,
              computed_at = NOW()
          `,
          [
            ctx.study_corpus_id,
            period.periodStart,
            period.periodEnd,
            period.label,
            JSON.stringify(coveragePayload),
            coveragePayload.conversation > 0,
            JSON.stringify(coveragePayload.conversation > 0 ? [] : ["sin conversation evidence en el periodo"]),
            coveragePayload.conversation >= 150 ? "alta" : coveragePayload.conversation >= 30 ? "media" : "baja",
            JSON.stringify(coveragePayload.performance > 0 ? [] : ["sin performance estructurada"])
          ]
        );
      }
      await client.query("ANALYZE report_periods");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    await mergeMeta(engineAnalysisId, { signal_pulse: { periods: { count: periods.length, labels: periods.map((period) => period.label) } } });
    await markEngineStepCompleted({ pipelineStepId, resultSummary: { periods: periods.length } });
    const next = await enqueueEngineStep({ engineAnalysisId, step: "sp_cluster" });
    return { periods: periods.length, next_step_job_id: next.jobId };
  });
}

export async function signalPulseClusterJob(job: Job<SignalPulseStepJobData>) {
  return runSignalPulseStep(job, async ({ engineAnalysisId, pipelineStepId }) => {
    const ctx = await loadSignalPulseContext(engineAnalysisId);
    assertSignalPulse(ctx);
    const rows = (await pool.query<{ id: string; text_clean: string; platform: string | null }>(
      `
        SELECT m.id::text, m.text_clean, COALESCE(m.resolved_platform, m.platform) AS platform
        FROM mentions m
        WHERE m.study_corpus_id = $1
          AND m.inclusion_status = 'included'
          AND length(m.text_clean) >= 24
        ORDER BY m.published_at DESC
        LIMIT 2000
      `,
      [ctx.study_corpus_id]
    )).rows;
    const clusters = buildCheapTermClusters(rows);
    await mergeMeta(engineAnalysisId, { signal_pulse: { cluster: { algorithm: "term_cluster_v1", clusters } } });
    await markEngineStepCompleted({ pipelineStepId, resultSummary: { clusters: clusters.length, mentions_sampled: rows.length } });
    const next = await enqueueEngineStep({ engineAnalysisId, step: "sp_name_signals" });
    return { clusters: clusters.length, next_step_job_id: next.jobId };
  });
}

export async function signalPulseNameSignalsJob(job: Job<SignalPulseStepJobData>) {
  return runSignalPulseStep(job, async ({ engineAnalysisId, pipelineStepId }) => {
    await recordEngineCostEvent({
      engineAnalysisId,
      pipelineStepId,
      provider: "system",
      model: null,
      operation: "sp_name_signals_deferred",
      estimatedCostUsd: 0,
      metadata: {
        reason: "PR-1 registers the step contract; PR-2 wires resilient Claude cluster naming under budget cap."
      }
    });
    await mergeMeta(engineAnalysisId, {
      signal_pulse: {
        naming: {
          status: "deferred",
          cluster_first: true,
          per_mention_coding: false
        }
      }
    });
    await markEngineStepCompleted({ pipelineStepId, resultSummary: { status: "deferred", per_mention_coding: false } });
    const next = await enqueueEngineStep({ engineAnalysisId, step: "sp_metrics" });
    return { status: "deferred", next_step_job_id: next.jobId };
  });
}

export async function signalPulseMetricsJob(job: Job<SignalPulseStepJobData>) {
  return runSignalPulseStep(job, async ({ engineAnalysisId, pipelineStepId }) => {
    const ctx = await loadSignalPulseContext(engineAnalysisId);
    assertSignalPulse(ctx);
    const result = await pool.query<{ signal_count: number }>(
      `SELECT COUNT(*)::int AS signal_count
       FROM canonical_signals
       WHERE study_corpus_id = $1
         AND methodology_slug = 'signal-pulse'
         AND status <> 'archived'`,
      [ctx.study_corpus_id]
    );
    const signalCount = Number(result.rows[0]?.signal_count ?? 0);
    await mergeMeta(engineAnalysisId, { signal_pulse: { metrics: { signal_count: signalCount, impact_formula: "impact_v1" } } });
    await markEngineStepCompleted({ pipelineStepId, resultSummary: { signal_count: signalCount } });
    await pool.query(
      `UPDATE engine_analyses
       SET status = 'needs_review',
           current_step = 'sp_metrics',
           updated_at = NOW()
       WHERE id = $1`,
      [engineAnalysisId]
    );
    await releaseEngineCorpusLock(engineAnalysisId);
    return { signal_count: signalCount, status: "needs_review" };
  });
}

async function runSignalPulseStep<T>(
  job: Job<SignalPulseStepJobData>,
  run: (data: SignalPulseStepJobData) => Promise<T>
) {
  const { pipelineStepId } = job.data;
  await markEngineStepRunning(pipelineStepId);
  try {
    const result = await run(job.data);
    await job.updateProgress(100);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markEngineStepFailed({ pipelineStepId, errorMessage: message });
    await releaseEngineCorpusLock(job.data.engineAnalysisId);
    throw error;
  }
}

async function loadSignalPulseContext(engineAnalysisId: string): Promise<AnalysisContext> {
  const result = await pool.query<AnalysisContext>(
    `SELECT
       ea.study_corpus_id,
       ea.methodology_slug,
       ea.params,
       sc.analysis_plan,
       sc.target_window_months
     FROM engine_analyses ea
     JOIN study_corpora sc ON sc.id = ea.study_corpus_id
     WHERE ea.id = $1`,
    [engineAnalysisId]
  );
  const row = result.rows[0];
  if (!row) throw new Error(`engine_analyses ${engineAnalysisId} not found`);
  return row;
}

function assertSignalPulse(ctx: AnalysisContext) {
  if (ctx.methodology_slug !== "signal-pulse") {
    throw new Error(`Signal Pulse step received unsupported methodology ${ctx.methodology_slug}`);
  }
}

function readWindowMonths(ctx: AnalysisContext) {
  return numberFrom(ctx.params?.window_months) ?? numberFrom(ctx.analysis_plan?.target_window_months) ?? ctx.target_window_months ?? 12;
}

function readBudgetCapUsd(ctx: AnalysisContext) {
  return numberFrom(ctx.params?.budget_cap_usd) ?? numberFrom(ctx.analysis_plan?.budget_cap_usd) ?? 5;
}

function numberFrom(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function mergeMeta(engineAnalysisId: string, meta: Record<string, unknown>) {
  const signalPulseMeta = meta.signal_pulse;
  if (signalPulseMeta && typeof signalPulseMeta === "object" && !Array.isArray(signalPulseMeta)) {
    await pool.query(
      `UPDATE engine_analyses
       SET meta_json = jsonb_set(
             COALESCE(meta_json, '{}'::jsonb),
             '{signal_pulse}',
             COALESCE(meta_json->'signal_pulse', '{}'::jsonb) || $1::jsonb,
             true
           ),
           updated_at = NOW()
       WHERE id = $2`,
      [safeJsonStringifyForPostgres(signalPulseMeta), engineAnalysisId]
    );
    return;
  }

  await pool.query(
    `UPDATE engine_analyses
     SET meta_json = COALESCE(meta_json, '{}'::jsonb) || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [safeJsonStringifyForPostgres(meta), engineAnalysisId]
  );
}

function buildCheapTermClusters(rows: Array<{ id: string; text_clean: string; platform: string | null }>): TermCluster[] {
  const byTerm = new Map<string, { mentionIds: Set<string>; platforms: Set<string> }>();
  for (const row of rows) {
    const terms = new Set(tokenize(row.text_clean).slice(0, 80));
    for (const term of terms) {
      const current = byTerm.get(term) ?? { mentionIds: new Set<string>(), platforms: new Set<string>() };
      current.mentionIds.add(row.id);
      if (row.platform) current.platforms.add(row.platform);
      byTerm.set(term, current);
    }
  }
  return Array.from(byTerm.entries())
    .map(([term, value]) => ({
      term,
      mention_count: value.mentionIds.size,
      platforms: Array.from(value.platforms).slice(0, 8),
      sample_mention_ids: Array.from(value.mentionIds).slice(0, 12)
    }))
    .filter((cluster) => cluster.mention_count >= 3)
    .sort((a, b) => b.mention_count - a.mention_count || a.term.localeCompare(b.term))
    .slice(0, 120);
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !STOPWORDS_ES_MX.has(term));
}
