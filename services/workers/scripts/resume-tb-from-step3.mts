// Rescue: resume a failed T&B analysis from step3_hierarchy WITHOUT re-running
// the expensive step1 open-pass (which already spent the Claude credits and
// persisted tb_mention_codings). Steps 3-6 operate on aggregated data and cost
// a few cents total. Re-enqueues step3; each step chains to the next on success.
import { readFileSync } from "node:fs";

for (const file of ["../../apps/studio/.env.local", "../.env"]) {
  try {
    for (const line of readFileSync(new URL(file, import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const { pool } = await import("../src/db/client.ts");
const { enqueueStep } = await import("../src/workers/tb-shared.ts");

const RESUME_STEP = (process.argv[2] as string) || "step3_hierarchy";
const corpus = "7dea09ac-932c-4e64-91d0-c373e195c9c5";
const [an] = (
  await pool.query<{ id: string; status: string; current_step: string }>(
    `SELECT id, status, current_step FROM tb_analyses WHERE study_corpus_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [corpus]
  )
).rows;
if (!an) throw new Error("No analysis found");
console.log(`[resume] analysis ${an.id} currently status=${an.status} step=${an.current_step}`);

const codings = (await pool.query<{ n: number }>(`SELECT count(*)::int n FROM tb_mention_codings WHERE tb_analysis_id=$1`, [an.id])).rows[0].n;
console.log(`[resume] step1 codings present: ${codings} (these are reused, NOT recomputed)`);
if (codings === 0) throw new Error("No codings — step1 must have data to resume. Aborting to avoid re-running step1.");

await pool.query(
  `UPDATE tb_analyses SET status='running', current_step=$2, failure_reason=NULL, failed_at=NULL, updated_at=now() WHERE id=$1`,
  [an.id, RESUME_STEP]
);
console.log(`[resume] analysis reset to running @ ${RESUME_STEP}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { jobId, pipelineStepId } = await enqueueStep({ tbAnalysisId: an.id, step: RESUME_STEP as any, attempt: 1 });
console.log(`[resume] enqueued ${RESUME_STEP} job=${jobId} step_row=${pipelineStepId}. Worker continues the chain.`);

await pool.end();
process.exit(0);
