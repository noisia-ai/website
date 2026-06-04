import { config } from "dotenv";
import pg from "pg";
import { resolve } from "node:path";

config({ path: resolve("../../services/workers/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 600_000
});

try {
  const rows = (
    await pool.query<{ id: string; study_corpus_id: string }>(`
      select s.id, s.study_corpus_id
      from corpus_snapshots s
      left join corpus_snapshot_aggregates a on a.snapshot_id = s.id
      where a.snapshot_id is null
      order by s.mention_count desc, s.created_at desc
    `)
  ).rows;

  let done = 0;
  for (const row of rows) {
    const t0 = Date.now();
    await pool.query(
      `
        WITH scoped AS (
          SELECT m.id, m.published_at,
                 COALESCE(NULLIF(m.resolved_platform, ''), 'unknown') AS resolved_platform,
                 COALESCE(NULLIF(m.content_type, ''), 'unknown') AS content_type
          FROM mentions m
          JOIN corpus_snapshot_mentions csm ON csm.mention_id = m.id
          WHERE csm.snapshot_id = $1::uuid
            AND m.study_corpus_id = $2::uuid
        ),
        platform_rows AS (
          SELECT resolved_platform AS platform, COUNT(*)::int AS mention_count
          FROM scoped
          GROUP BY 1
          ORDER BY mention_count DESC
          LIMIT 10
        ),
        content_rows AS (
          SELECT content_type, COUNT(*)::int AS mention_count
          FROM scoped
          GROUP BY 1
          ORDER BY mention_count DESC
          LIMIT 10
        ),
        timeline_rows AS (
          SELECT to_char(date_trunc('month', published_at), 'YYYY-MM') AS month, COUNT(*)::int AS mention_count
          FROM scoped
          GROUP BY 1
          ORDER BY 1 ASC
        ),
        rollup AS (
          SELECT COUNT(*)::int AS total_mentions,
                 MIN(published_at) AS window_start,
                 MAX(published_at) AS window_end
          FROM scoped
        )
        INSERT INTO corpus_snapshot_aggregates (
          snapshot_id,
          study_corpus_id,
          total_mentions,
          window_start,
          window_end,
          platform_distribution,
          content_type_distribution,
          volume_timeline,
          refreshed_at
        )
        SELECT
          $1::uuid,
          $2::uuid,
          rollup.total_mentions,
          rollup.window_start,
          rollup.window_end,
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object('platform', platform, 'count', mention_count) ORDER BY mention_count DESC)
            FROM platform_rows
          ), '[]'::jsonb),
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object('content_type', content_type, 'count', mention_count) ORDER BY mention_count DESC)
            FROM content_rows
          ), '[]'::jsonb),
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object('month', month, 'count', mention_count) ORDER BY month ASC)
            FROM timeline_rows
          ), '[]'::jsonb),
          now()
        FROM rollup
        ON CONFLICT (snapshot_id) DO UPDATE SET
          study_corpus_id = EXCLUDED.study_corpus_id,
          total_mentions = EXCLUDED.total_mentions,
          window_start = EXCLUDED.window_start,
          window_end = EXCLUDED.window_end,
          platform_distribution = EXCLUDED.platform_distribution,
          content_type_distribution = EXCLUDED.content_type_distribution,
          volume_timeline = EXCLUDED.volume_timeline,
          refreshed_at = now()
      `,
      [row.id, row.study_corpus_id]
    );
    done += 1;
    console.log(`[snapshot-aggregates] ${done}/${rows.length} ${row.id} ${Date.now() - t0}ms`);
  }

  const pending = await pool.query<{ pending: number }>(`
    select count(*)::int as pending
    from corpus_snapshots s
    left join corpus_snapshot_aggregates a on a.snapshot_id = s.id
    where a.snapshot_id is null
  `);
  console.log(JSON.stringify({ backfilled: done, pending: pending.rows[0]?.pending ?? null }));
} finally {
  await pool.end();
}
