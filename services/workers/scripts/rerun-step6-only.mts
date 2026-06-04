import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "bullmq";

type AnalysisSnapshot = {
  id: string;
  study_corpus_id: string;
  status: string;
  current_step: string;
  failure_reason: string | null;
  failed_at: Date | null;
};

type Step6Result = {
  recommendations_inserted?: number;
  next_step_job_id?: string | null;
  quality_gates_skipped?: boolean;
};

type StepJobData = {
  tbAnalysisId: string;
  pipelineStepId: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(scriptDir, "..");
const repoRoot = resolve(workerRoot, "../..");

loadEnvFile(resolve(repoRoot, "apps/studio/.env.local"), false);
loadEnvFile(resolve(repoRoot, "apps/studio/.env"), false);
loadEnvFile(resolve(workerRoot, ".env"), true);
process.env.TB_STEP6_ONLY_SKIP_QUALITY_GATES = "true";

const analysisId = argValue("--analysis-id") ?? process.argv[2];
if (!analysisId) {
  throw new Error("Usage: pnpm exec tsx scripts/rerun-step6-only.mts --analysis-id=<tb_analysis_id>");
}

const { pool } = await import("../src/db/client.ts");
const { tbStep6SynthesisJob } = await import("../src/workers/tb-step-6-synthesis.ts");
const { getTbQueue } = await import("../src/workers/tb-shared.ts");
const { redisConnection } = await import("../src/queues/query-engine.ts");

let before: AnalysisSnapshot | null = null;
let queue: ReturnType<typeof getTbQueue> | null = null;

try {
  before = await loadAnalysisSnapshot(analysisId);
  const counts = await loadExistingAnalysisCounts(analysisId);
  console.log(
    `[step6-only] analysis=${before.id} corpus=${before.study_corpus_id} ` +
      `status=${before.status} current_step=${before.current_step}`
  );
  console.log(
    `[step6-only] reusing persisted data: codings=${counts.codings} findings=${counts.findings} ` +
      `recommendations_before=${counts.recommendations}`
  );
  if (counts.codings === 0 || counts.findings === 0) {
    throw new Error("No hay codings/findings existentes para reusar; abortando para no tocar step 1.");
  }

  const pipelineStepId = await insertStep6PipelineStep(analysisId);
  const fakeJob = {
    id: `manual-step6-${pipelineStepId}`,
    name: "tb_step_6_synthesis",
    data: { tbAnalysisId: analysisId, pipelineStepId },
    updateProgress: async (progress: number | object) => {
      console.log(`[step6-only] progress=${typeof progress === "number" ? `${progress}%` : JSON.stringify(progress)}`);
    }
  };

  const result = (await tbStep6SynthesisJob(fakeJob as unknown as Job<StepJobData>)) as Step6Result;

  if (result.next_step_job_id) {
    queue = getTbQueue();
    const queued = await queue.getJob(result.next_step_job_id);
    if (queued) {
      const state = await queued.getState();
      if (["waiting", "delayed", "prioritized"].includes(state)) {
        await queued.remove();
        console.log(`[step6-only] removed auto-enqueued quality gate job=${result.next_step_job_id}`);
      } else {
        console.log(`[step6-only] quality gate job=${result.next_step_job_id} already state=${state}`);
      }
    }
    await markLatestQueuedQualityGateSkipped(analysisId);
  }

  await restoreAnalysisSnapshot(before);
  await releaseCorpusLock(analysisId);

  const after = await loadRunSummary(analysisId);
  console.log(
    JSON.stringify(
      {
        step6_only: true,
        analysis_id: analysisId,
        result,
        latest_step6: after.step6,
        analysis: after.analysis,
        output: after.output
      },
      null,
      2
    )
  );
} catch (error) {
  if (before) {
    await restoreAnalysisSnapshot(before);
    await releaseCorpusLock(analysisId);
  }
  throw error;
} finally {
  if (queue) await queue.close();
  await redisConnection.quit();
  await pool.end();
}

function loadEnvFile(path: string, override: boolean) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!override && process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function argValue(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function loadAnalysisSnapshot(tbAnalysisId: string): Promise<AnalysisSnapshot> {
  const row = (
    await pool.query<AnalysisSnapshot>(
      `SELECT id, study_corpus_id, status, current_step, failure_reason, failed_at
       FROM tb_analyses
       WHERE id = $1`,
      [tbAnalysisId]
    )
  ).rows[0];
  if (!row) throw new Error(`tb_analysis ${tbAnalysisId} not found`);
  return row;
}

async function loadExistingAnalysisCounts(tbAnalysisId: string) {
  const row = (
    await pool.query<{ codings: number; findings: number; recommendations: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM tb_mention_codings WHERE tb_analysis_id = $1) AS codings,
         (SELECT COUNT(*)::int FROM tb_findings WHERE tb_analysis_id = $1) AS findings,
         (SELECT COUNT(*)::int FROM tb_recommendations WHERE tb_analysis_id = $1) AS recommendations`,
      [tbAnalysisId]
    )
  ).rows[0];
  return row ?? { codings: 0, findings: 0, recommendations: 0 };
}

async function insertStep6PipelineStep(tbAnalysisId: string): Promise<string> {
  const row = (
    await pool.query<{ id: string }>(
      `INSERT INTO tb_pipeline_steps (tb_analysis_id, step, status, attempt)
       VALUES (
         $1,
         'step6_synthesis',
         'queued',
         (
           SELECT COALESCE(MAX(attempt), 0) + 1
           FROM tb_pipeline_steps
           WHERE tb_analysis_id = $1 AND step = 'step6_synthesis'
         )
       )
       RETURNING id`,
      [tbAnalysisId]
    )
  ).rows[0];
  if (!row) throw new Error("Could not create manual step6 pipeline row");
  return row.id;
}

async function markLatestQueuedQualityGateSkipped(tbAnalysisId: string) {
  await pool.query(
    `UPDATE tb_pipeline_steps
     SET status = 'skipped',
         completed_at = NOW(),
         error_message = 'Skipped by manual step6-only rerun.'
     WHERE id = (
       SELECT id
       FROM tb_pipeline_steps
       WHERE tb_analysis_id = $1
         AND step = 'quality_gates'
         AND status IN ('queued', 'running')
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    [tbAnalysisId]
  );
}

async function restoreAnalysisSnapshot(snapshot: AnalysisSnapshot) {
  await pool.query(
    `UPDATE tb_analyses
     SET status = $2,
         current_step = $3,
         failure_reason = $4,
         failed_at = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [snapshot.id, snapshot.status, snapshot.current_step, snapshot.failure_reason, snapshot.failed_at]
  );
}

async function releaseCorpusLock(tbAnalysisId: string) {
  await pool.query(
    `UPDATE study_corpora
     SET locked_by_analysis_id = NULL
     WHERE locked_by_analysis_id = $1`,
    [tbAnalysisId]
  );
}

async function loadRunSummary(tbAnalysisId: string) {
  const step6 = (
    await pool.query(
      `SELECT id, status, result_summary, created_at, completed_at
       FROM tb_pipeline_steps
       WHERE tb_analysis_id = $1 AND step = 'step6_synthesis'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tbAnalysisId]
    )
  ).rows[0];
  const analysis = (
    await pool.query(
      `SELECT
         id,
         status,
         current_step,
         jsonb_array_length(COALESCE(meta_json->'action_studio', '[]'::jsonb)) AS action_studio_cards,
         meta_json->'humanizer' AS humanizer
       FROM tb_analyses
       WHERE id = $1`,
      [tbAnalysisId]
    )
  ).rows[0];
  const output = (
    await pool.query(
      `SELECT id, status, title, version, updated_at, published_at
       FROM published_outputs
       WHERE tb_analysis_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [tbAnalysisId]
    )
  ).rows[0];
  return { step6, analysis, output };
}
