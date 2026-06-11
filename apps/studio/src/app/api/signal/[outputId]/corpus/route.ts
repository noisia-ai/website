import { z } from "zod";

import { unauthorized, validationError } from "@/lib/api/responses";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { pool } from "@/lib/db";
import { isUndefinedTableError } from "@/lib/db/errors";
import { getSignalOutputForUser } from "@/lib/data/signal";
import { buildCorpusExplorerSql } from "@/lib/live-intelligence/corpus-explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(500).optional().default(""),
  platform: z.string().max(80).optional().default(""),
  finding: z.string().max(80).optional().default(""),
  lens: z.string().max(120).optional().default(""),
  signalIntent: z.string().max(120).optional().default(""),
  entity: z.string().max(160).optional().default(""),
  signal: z.string().max(160).optional().default(""),
  dateFrom: z.string().max(20).optional().default(""),
  dateTo: z.string().max(20).optional().default(""),
  sort: z.enum(["relevance", "newest", "oldest"]).optional().default("relevance"),
  page: z.coerce.number().int().min(1).max(5000).optional().default(1),
  limit: z.coerce.number().int().min(20).max(500).optional().default(120)
});

export async function GET(
  request: Request,
  context: { params: Promise<{ outputId: string }> }
) {
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

  const filters = parsed.data;
  const scopedCorpusIds = Array.from(new Set([output.studyCorpusId, output.baseCorpusId].flatMap((id) => id ? [id] : [])));
  const corpusSql = buildCorpusExplorerSql({ scopedCorpusIds, filters });

  let results;
  try {
    results = await Promise.all([
      pool.query<{ total: number }>(
        `
          ${corpusSql.baseSql}
          SELECT COUNT(DISTINCT m.id)::int AS total
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
        `,
        corpusSql.countValues
      ),
      pool.query(
        `
          ${corpusSql.baseSql}
          SELECT
            m.id AS mention_id,
            CASE WHEN m.study_corpus_id = ($1::uuid[])[1] THEN 'primary' ELSE 'baseline' END AS corpus_scope,
            m.text_clean AS text,
            m.text_snippet,
            m.resolved_platform AS platform,
            m.published_at::text AS published_at,
            m.sentiment_source,
            m.url,
            m.batch_mention_type AS mention_type,
            m.batch_entity_kind AS entity_kind,
            m.batch_entity_label AS entity_label,
            m.source_file_name,
            max(f.finding_id) AS finding_id,
            max(f.nombre_comercial) AS finding_name,
            bool_or(COALESCE(fc.is_protagonist, soe.is_protagonist, false)) AS is_protagonist,
            max(mqs.lens_slug) AS lens_slug,
            max(mqs.signal_intent) AS signal_intent,
            max(mqs.scope) AS query_scope,
            max(COALESCE(mqs.entity_id, mqs.corpus_entity_id::text, m.batch_entity_label)) AS source_entity_id,
            max(cs.id::text) AS canonical_signal_id,
            max(cs.canonical_title) AS canonical_signal_title
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN tb_finding_citations fc ON fc.finding_id = f.id AND fc.mention_id = m.id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
          GROUP BY
            m.id, m.study_corpus_id, m.text_clean, m.text_snippet, m.resolved_platform,
            m.platform, m.published_at, m.sentiment_source, m.url, m.batch_mention_type,
            m.batch_entity_kind, m.batch_entity_label, m.source_file_name
          ORDER BY ${corpusSql.orderBy}, m.id
          LIMIT $${corpusSql.limitParam} OFFSET $${corpusSql.offsetParam}
        `,
        corpusSql.values
      ),
      pool.query<{ platform: string; count: number }>(
        `
          ${corpusSql.baseSql}
          SELECT COALESCE(NULLIF(m.resolved_platform, ''), 'unknown') AS platform, COUNT(*)::int AS count
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
          GROUP BY 1
          ORDER BY count DESC
          LIMIT 24
        `,
        corpusSql.countValues
      ),
      pool.query<{ finding_id: string; finding_name: string; count: number }>(
        `
          ${corpusSql.baseSql}
          SELECT
            f.finding_id,
            max(f.nombre_comercial) AS finding_name,
            COUNT(DISTINCT m.id)::int AS count
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
            AND f.finding_id IS NOT NULL
          GROUP BY f.finding_id
          ORDER BY count DESC
          LIMIT 120
        `,
        corpusSql.countValues
      ),
      pool.query<{ lens_slug: string; signal_intent: string; count: number }>(
        `
          ${corpusSql.baseSql}
          SELECT
            COALESCE(NULLIF(mqs.lens_slug, ''), 'unmapped') AS lens_slug,
            COALESCE(NULLIF(mqs.signal_intent, ''), 'unmapped') AS signal_intent,
            COUNT(DISTINCT m.id)::int AS count
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
          GROUP BY 1, 2
          ORDER BY count DESC
          LIMIT 80
        `,
        corpusSql.countValues
      ),
      pool.query<{ entity_id: string; entity_label: string; count: number }>(
        `
          ${corpusSql.baseSql}
          SELECT
            COALESCE(mqs.entity_id, mqs.corpus_entity_id::text, m.batch_entity_label, ib.entity_label, 'unknown') AS entity_id,
            COALESCE(m.batch_entity_label, ib.entity_label, mqs.entity_id, 'unknown') AS entity_label,
            COUNT(DISTINCT m.id)::int AS count
          FROM scoped_mentions m
          LEFT JOIN import_batches ib ON ib.id = m.source_file_id
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
          GROUP BY 1, 2
          ORDER BY count DESC
          LIMIT 80
        `,
        corpusSql.countValues
      ),
      pool.query<{ id: string; title: string; count: number }>(
        `
          ${corpusSql.baseSql}
          SELECT
            cs.id::text AS id,
            cs.canonical_title AS title,
            COUNT(DISTINCT soe.mention_id)::int AS count
          FROM scoped_mentions m
          LEFT JOIN tb_mention_codings mc ON mc.mention_id = m.id
          LEFT JOIN tb_findings f ON f.id = mc.finding_id
          LEFT JOIN mention_query_sources mqs ON mqs.mention_id = m.id
          LEFT JOIN signal_observation_evidence soe ON soe.mention_id = m.id
          LEFT JOIN signal_observations so ON so.id = soe.signal_observation_id
          LEFT JOIN canonical_signals cs ON cs.id = so.canonical_signal_id
          WHERE ${corpusSql.whereSql}
            AND cs.id IS NOT NULL
          GROUP BY 1, 2
          ORDER BY count DESC
          LIMIT 80
        `,
        corpusSql.countValues
      )
    ]);
  } catch (error) {
    if (!isUndefinedTableError(error)) throw error;
    return Response.json(
      {
        error: "live_intelligence_schema_missing",
        message: "Live corpus schema is not migrated yet; fall back to static published evidence."
      },
      { status: 503 }
    );
  }
  const [
    countResult,
    rowsResult,
    facetsResult,
    findingFacetResult,
    lensFacetResult,
    entityFacetResult,
    signalFacetResult
  ] = results;

  return Response.json(
    {
      total: countResult.rows[0]?.total ?? 0,
      page: filters.page,
      limit: filters.limit,
      rows: rowsResult.rows,
      facets: {
        platforms: facetsResult.rows,
        findings: findingFacetResult.rows,
        lenses: lensFacetResult.rows,
        entities: entityFacetResult.rows,
        signals: signalFacetResult.rows
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
