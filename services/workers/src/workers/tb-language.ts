import { pool } from "../db/client";

export async function detectTbOutputLanguage(tbAnalysisId: string): Promise<string> {
  // We only need the DOMINANT language to pick the report language, so a small
  // sample is statistically identical to scanning the whole corpus — and on large
  // corpora (100k+ wide rows) the full scan can exceed the statement timeout.
  // Cap each branch to a few thousand rows.
  const LANGUAGE_SAMPLE = 5000;
  let r: { rows: { language: string; count: number }[] };
  try {
    r = await pool.query<{ language: string; count: number }>(
    `WITH scope AS (
       SELECT study_corpus_id, snapshot_id
       FROM tb_analyses
       WHERE id = $1
     ),
     sample AS (
       SELECT m.language
       FROM scope s
       JOIN corpus_snapshot_mentions csm ON csm.snapshot_id = s.snapshot_id
       JOIN mentions m ON m.id = csm.mention_id
       LIMIT ${LANGUAGE_SAMPLE}
     ),
     sample_legacy AS (
       SELECT m.language
       FROM scope s
       JOIN mentions m ON m.study_corpus_id = s.study_corpus_id
       WHERE s.snapshot_id IS NULL
       LIMIT ${LANGUAGE_SAMPLE}
     )
     SELECT COALESCE(NULLIF(LOWER(language), ''), 'unknown') AS language, COUNT(*)::int AS count
     FROM (SELECT language FROM sample UNION ALL SELECT language FROM sample_legacy) all_langs
     GROUP BY 1
     ORDER BY count DESC
     LIMIT 3`,
      [tbAnalysisId]
    );
  } catch (error) {
    // Language detection is non-critical — never let a slow/timed-out query kill
    // the whole step. Default to Spanish (Mexico).
    console.warn(`[tb-language] detection skipped (${error instanceof Error ? error.message : String(error)}), defaulting to Spanish`);
    return "Spanish (Mexico)";
  }
  const top = r.rows[0]?.language;
  if (top === "en" || top === "eng" || top === "english") return "English";
  if (top === "es" || top === "spa" || top === "spanish") return "Spanish (Mexico)";
  return "Spanish (Mexico)";
}
