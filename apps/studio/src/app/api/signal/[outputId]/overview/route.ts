import { z } from "zod";

import { unauthorized, validationError } from "@/lib/api/responses";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { pool } from "@/lib/db";
import { isUndefinedTableError } from "@/lib/db/errors";
import { getSignalOutputForUser } from "@/lib/data/signal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  dateFrom: z.string().max(20).optional().default(""),
  dateTo: z.string().max(20).optional().default("")
});

export async function GET(request: Request, context: { params: Promise<{ outputId: string }> }) {
  const session = await getAuthenticatedAppUser();
  if (!session) return unauthorized();

  const { outputId } = await context.params;
  const output = await getSignalOutputForUser(session.appUser, outputId);
  if (!output) {
    return Response.json({ error: "not_found", message: "Signal output not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error);

  const scopedCorpusIds = Array.from(new Set([output.studyCorpusId, output.baseCorpusId].flatMap((id) => id ? [id] : [])));
  const mentionParams: unknown[] = [scopedCorpusIds];
  const mentionWhere = ["m.study_corpus_id = ANY($1::uuid[])", "m.inclusion_status <> 'excluded'"];
  if (parsed.data.dateFrom) {
    mentionParams.push(parsed.data.dateFrom);
    mentionWhere.push(`m.published_at >= $${mentionParams.length}::date`);
  }
  if (parsed.data.dateTo) {
    mentionParams.push(parsed.data.dateTo);
    mentionWhere.push(`m.published_at < ($${mentionParams.length}::date + interval '1 day')`);
  }

  const observationParams: unknown[] = [scopedCorpusIds];
  const observationWhere = ["so.study_corpus_id = ANY($1::uuid[])", "cs.status <> 'archived'"];
  if (parsed.data.dateFrom) {
    observationParams.push(parsed.data.dateFrom);
    observationWhere.push(`COALESCE(so.window_end, so.window_start) >= $${observationParams.length}::date`);
  }
  if (parsed.data.dateTo) {
    observationParams.push(parsed.data.dateTo);
    observationWhere.push(`COALESCE(so.window_start, so.window_end) <= $${observationParams.length}::date`);
  }

  try {
    const [
      corpus,
      platformDistribution,
      contentTypeDistribution,
      volumeTimeline,
      signalMetrics,
      polarityDistribution,
      polarityTimeline,
      findingTimeSeries,
      layerDistribution,
      mobilityDistribution,
      topVoice
    ] = await Promise.all([
      pool.query<{ total_mentions: number; window_start: string | null; window_end: string | null }>(
        `
          SELECT
            COUNT(*)::int AS total_mentions,
            min(m.published_at)::text AS window_start,
            max(m.published_at)::text AS window_end
          FROM mentions m
          WHERE ${mentionWhere.join(" AND ")}
        `,
        mentionParams
      ),
      pool.query<{ platform: string; count: number }>(
        `
          SELECT COALESCE(NULLIF(m.resolved_platform, ''), m.platform, 'unknown') AS platform, COUNT(*)::int AS count
          FROM mentions m
          WHERE ${mentionWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY count DESC
          LIMIT 12
        `,
        mentionParams
      ),
      pool.query<{ content_type: string; count: number }>(
        `
          SELECT COALESCE(NULLIF(m.content_type, ''), 'unknown') AS content_type, COUNT(*)::int AS count
          FROM mentions m
          WHERE ${mentionWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY count DESC
          LIMIT 12
        `,
        mentionParams
      ),
      pool.query<{ month: string; mentions: number }>(
        `
          SELECT to_char(date_trunc('month', m.published_at), 'YYYY-MM') AS month, COUNT(*)::int AS mentions
          FROM mentions m
          WHERE ${mentionWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY 1
        `,
        mentionParams
      ),
      pool.query<{
        findings_total: number;
        triggers_total: number;
        barriers_total: number;
        movable_total: number;
      }>(
        `
          SELECT
            COUNT(DISTINCT cs.id)::int AS findings_total,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.signal_type = 'trigger')::int AS triggers_total,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.signal_type = 'barrier')::int AS barriers_total,
            COUNT(DISTINCT cs.id) FILTER (
              WHERE cs.signal_type IN ('trigger', 'value', 'opportunity', 'narrative')
                OR COALESCE(cs.dimensions->>'mobility', '') IN ('movible_por_marca', 'movable')
            )::int AS movable_total
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          WHERE ${observationWhere.join(" AND ")}
        `,
        observationParams
      ),
      pool.query<{ polarity: string; count: number }>(
        `
          SELECT
            CASE
              WHEN cs.signal_type = 'trigger' THEN 'trigger'
              WHEN cs.signal_type = 'barrier' THEN 'barrier'
              ELSE cs.signal_type
            END AS polarity,
            SUM(so.frequency)::int AS count
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY count DESC
        `,
        observationParams
      ),
      pool.query<{ month: string; trigger: number; barrier: number }>(
        `
          SELECT
            to_char(date_trunc('month', COALESCE(so.window_start, so.window_end)::timestamp), 'YYYY-MM') AS month,
            SUM(so.frequency) FILTER (WHERE cs.signal_type = 'trigger')::int AS trigger,
            SUM(so.frequency) FILTER (WHERE cs.signal_type = 'barrier')::int AS barrier
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY 1
        `,
        observationParams
      ),
      pool.query<{
        finding_id: string;
        nombre: string;
        polarity: string;
        layer: string | null;
        movilidad: string | null;
        month: string;
        mentions: number;
        intensidad: string | null;
        score: string | null;
      }>(
        `
          SELECT
            COALESCE(tf.finding_id, substring(cs.id::text from 1 for 8)) AS finding_id,
            cs.canonical_title AS nombre,
            CASE WHEN cs.signal_type IN ('trigger', 'barrier') THEN cs.signal_type ELSE 'mixed' END AS polarity,
            COALESCE(tf.layer, cs.dimensions->>'layer') AS layer,
            COALESCE(tf.movilidad, cs.dimensions->>'mobility') AS movilidad,
            to_char(date_trunc('month', COALESCE(so.window_start, so.window_end)::timestamp), 'YYYY-MM') AS month,
            SUM(so.frequency)::int AS mentions,
            avg(so.intensity)::text AS intensidad,
            avg(so.composite_score)::text AS score
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          LEFT JOIN tb_findings tf ON tf.id = cs.created_from_tb_finding_id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1,2,3,4,5,6
          ORDER BY month, mentions DESC
        `,
        observationParams
      ),
      pool.query<{ layer: string; count: number; avg_intensity: string | null }>(
        `
          SELECT COALESCE(tf.layer, cs.dimensions->>'layer', cs.signal_type, 'unknown') AS layer,
                 COUNT(DISTINCT cs.id)::int AS count,
                 avg(so.intensity)::text AS avg_intensity
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          LEFT JOIN tb_findings tf ON tf.id = cs.created_from_tb_finding_id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY count DESC
        `,
        observationParams
      ),
      pool.query<{ movilidad: string; count: number }>(
        `
          SELECT COALESCE(tf.movilidad, cs.dimensions->>'mobility', 'unknown') AS movilidad,
                 COUNT(DISTINCT cs.id)::int AS count
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          LEFT JOIN tb_findings tf ON tf.id = cs.created_from_tb_finding_id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1
          ORDER BY count DESC
        `,
        observationParams
      ),
      pool.query<{ finding_id: string; nombre: string; citation_count: number }>(
        `
          SELECT
            COALESCE(tf.finding_id, substring(cs.id::text from 1 for 8)) AS finding_id,
            cs.canonical_title AS nombre,
            COUNT(soe.id)::int AS citation_count
          FROM canonical_signals cs
          JOIN signal_observations so ON so.canonical_signal_id = cs.id
          LEFT JOIN signal_observation_evidence soe ON soe.signal_observation_id = so.id
          LEFT JOIN tb_findings tf ON tf.id = cs.created_from_tb_finding_id
          WHERE ${observationWhere.join(" AND ")}
          GROUP BY 1,2
          ORDER BY citation_count DESC
          LIMIT 12
        `,
        observationParams
      )
    ]);

    const corpusRow = corpus.rows[0] ?? { total_mentions: 0, window_start: null, window_end: null };
    return Response.json(
      {
        ok: true,
        filters: parsed.data,
        corpus: {
          total_mentions: corpusRow.total_mentions,
          window: {
            start: corpusRow.window_start,
            end: corpusRow.window_end
          }
        },
        metrics: signalMetrics.rows[0] ?? {
          findings_total: 0,
          triggers_total: 0,
          barriers_total: 0,
          movable_total: 0
        },
        polarity_distribution: polarityDistribution.rows,
        layer_distribution: layerDistribution.rows,
        mobility_distribution: mobilityDistribution.rows,
        platform_distribution: platformDistribution.rows,
        content_type_distribution: contentTypeDistribution.rows,
        volume_timeline: volumeTimeline.rows,
        polarity_time_series: polarityTimeline.rows.map((row) => ({
          month: row.month,
          trigger: row.trigger ?? 0,
          barrier: row.barrier ?? 0
        })),
        finding_time_series: findingTimeSeries.rows,
        top_findings_by_voice: topVoice.rows
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (!isUndefinedTableError(error)) throw error;
    return Response.json({ ok: false, unavailable: true, reason: "live_intelligence_schema_missing" }, { status: 503 });
  }
}
