import assert from "node:assert/strict";
import test from "node:test";

import { buildCorpusExplorerSql, type CorpusExplorerFilters } from "./corpus-explorer";

function filters(overrides: Partial<CorpusExplorerFilters> = {}): CorpusExplorerFilters {
  return {
    q: "",
    platform: "",
    finding: "",
    lens: "",
    signalIntent: "",
    entity: "",
    signal: "",
    dateFrom: "",
    dateTo: "",
    sort: "relevance",
    page: 1,
    limit: 120,
    ...overrides
  };
}

test("corpus explorer SQL scopes brand and baseline corpora with pagination", () => {
  const sql = buildCorpusExplorerSql({
    scopedCorpusIds: ["brand-corpus", "baseline-corpus"],
    filters: filters({ page: 3, limit: 50, sort: "newest" })
  });

  assert.deepEqual(sql.values, [["brand-corpus", "baseline-corpus"], 50, 100]);
  assert.deepEqual(sql.countValues, [["brand-corpus", "baseline-corpus"]]);
  assert.equal(sql.limitParam, 2);
  assert.equal(sql.offsetParam, 3);
  assert.match(sql.whereSql, /m\.study_corpus_id = ANY\(\$1::uuid\[\]\)/);
  assert.match(sql.orderBy, /m\.published_at DESC NULLS LAST/);
});

test("corpus explorer SQL keeps user filters parameterized", () => {
  const sql = buildCorpusExplorerSql({
    scopedCorpusIds: ["corpus-1"],
    filters: filters({
      q: "trust%' OR 1=1 --",
      platform: "tiktok",
      finding: "T-01",
      lens: "triggers-barriers",
      signalIntent: "decision_signal",
      entity: "brand:telco",
      signal: "signal-1",
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31"
    })
  });

  assert.equal(sql.values[1], "%trust%' OR 1=1 --%");
  assert.doesNotMatch(sql.whereSql, /OR 1=1/);
  assert.match(sql.whereSql, /m\.text_clean ILIKE \$2/);
  assert.match(sql.whereSql, /m\.resolved_platform = \$3/);
  assert.match(sql.whereSql, /f\.finding_id = \$4/);
  assert.match(sql.whereSql, /mqs\.lens_slug = \$5/);
  assert.match(sql.whereSql, /mqs\.signal_intent = \$6/);
  assert.match(sql.whereSql, /mqs\.entity_id = \$7/);
  assert.match(sql.whereSql, /cs\.id::text = \$8/);
  assert.match(sql.whereSql, /m\.published_at >= \$9::date/);
  assert.match(sql.whereSql, /m\.published_at < \(\$10::date \+ interval '1 day'\)/);
  assert.match(sql.orderBy, /WHEN max\(f\.finding_id\) ILIKE \$2 THEN 0/);
});
