import { sql } from "drizzle-orm";

import { corpusSnapshots } from "@noisia/db";
import { db } from "@/lib/db";

/**
 * Create a snapshot row + bulk-insert mention ids in a single SQL statement.
 * Shared by the manual snapshot endpoint and the approve endpoint.
 *
 * Returns { id, mention_count } or null if the snapshot row couldn't be created.
 */
export async function createCorpusSnapshot(args: {
  corpusId: string;
  label: string;
  kind: "manual" | "approval";
  userId: string | null;
  scores?: unknown;
}): Promise<{ id: string; mention_count: number } | null> {
  const [snap] = await db
    .insert(corpusSnapshots)
    .values({
      studyCorpusId: args.corpusId,
      label: args.label,
      kind: args.kind,
      mentionCount: 0,
      scoresAtSnapshot: args.scores ?? null,
      createdByUserId: args.userId
    })
    .returning({ id: corpusSnapshots.id });

  if (!snap) return null;

  const inserted = await db.execute(sql`
    INSERT INTO corpus_snapshot_mentions (snapshot_id, mention_id)
    SELECT ${snap.id}::uuid, id FROM mentions
    WHERE study_corpus_id = ${args.corpusId}::uuid AND inclusion_status = 'included'
    RETURNING mention_id
  `);

  const count =
    (inserted as unknown as { rows?: unknown[] }).rows?.length ??
    (inserted as unknown as { length?: number }).length ??
    0;

  await db.execute(sql`UPDATE corpus_snapshots SET mention_count = ${count} WHERE id = ${snap.id}::uuid`);

  try {
    await refreshCorpusSnapshotAggregates({ snapshotId: snap.id, corpusId: args.corpusId });
  } catch (error) {
    console.warn("[snapshots] aggregate refresh failed", {
      snapshotId: snap.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return { id: snap.id, mention_count: count };
}

export async function refreshCorpusSnapshotAggregates(args: {
  snapshotId: string;
  corpusId: string;
}) {
  await db.execute(sql`
    WITH scoped AS (
      SELECT
        m.id,
        m.published_at,
        COALESCE(NULLIF(m.resolved_platform, ''), 'unknown') AS resolved_platform,
        COALESCE(NULLIF(m.content_type, ''), 'unknown') AS content_type
      FROM mentions m
      JOIN corpus_snapshot_mentions csm ON csm.mention_id = m.id
      WHERE csm.snapshot_id = ${args.snapshotId}::uuid
        AND m.study_corpus_id = ${args.corpusId}::uuid
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
      SELECT
        COUNT(*)::int AS total_mentions,
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
      ${args.snapshotId}::uuid,
      ${args.corpusId}::uuid,
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
  `);
}
