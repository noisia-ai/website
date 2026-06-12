import assert from "node:assert/strict";
import test from "node:test";

import { buildLensQueryPacks } from "./index";
import { ENGINE_METHODOLOGY_SLUGS, isEngineRunnableMethodologySlug } from "./engine";
import { LENS_QUERY_PACK_TEMPLATES } from "./lens-query-packs";
import type { ComposedQuery, QueryComposerInput } from "./index";

const input: QueryComposerInput = {
  corpus: {
    id: "corpus-1",
    name: "Takis",
    businessQuestion: "Entender la marca frente a categoría y competencia.",
    decisionToInform: "Priorizar narrativa, valor y riesgo.",
    audienceSegment: "Consumidores MX",
    geoFocus: ["MX"],
    targetWindowMonths: 6,
    contextForm: {}
  },
  subject: {
    type: "brand",
    name: "Takis",
    slug: "takis",
    industry: "snacks",
    industrySub: "botanas",
    countries: ["MX"],
    brandSeedHandles: ["@TakisMX"],
    description: null
  },
  methodology: {
    slug: "triggers-barriers",
    name: "Triggers & Barriers",
    version: "1.0",
    manifest: {}
  },
  competitors: ["Sabritas", "Doritos"],
  brandSeeds: ["Takis"],
  knowledgeSources: [],
  memoryIndustry: [],
  memoryBrand: []
};

const composed: ComposedQuery = {
  query_text: '("Takis") AND ("me gusta" OR "no me gusta")',
  competitor_query_text: '("Sabritas" OR "Doritos") AND ("me gusta" OR "no me gusta")',
  industry_query_text: '("snacks" OR "botanas") AND ("me gusta" OR "no me gusta")',
  query_components: {
    brand_seeds: ["Takis", "@TakisMX"],
    competitor_seeds: ["Sabritas", "Doritos"],
    category_seeds: ["snacks", "botanas"],
    trigger_phrases_tb: ["me gusta"],
    barrier_phrases_tb: ["no me gusta"],
    knowledge_query_language: ["pica rico"],
    global_exclusions: ["receta"],
    memory_industry: [],
    memory_brand: []
  }
};

test("query packs materialize every selected active lens without arbitrary subset", () => {
  const packs = buildLensQueryPacks({
    input,
    composed,
    analysisPlan: {
      version: 1,
      primary_methodology_slug: "triggers-barriers",
      selected_lenses: [
        "triggers-barriers",
        "competitive-wave",
        "narrative-ownership",
        "value-perception-matrix",
        "brand-positioning-map",
        "category-opportunity-map",
        "white-space-analysis",
        "journey-friction-mapping",
        "decision-velocity",
        "cultural-codes-decoding",
        "sentiment-advocacy-proxy",
        "audience-segment-lens",
        "influence-architecture",
        "trust-risk-benchmark",
        "evidence-confidence-layer"
      ]
    }
  });

  const byLens = new Map<string, number>();
  for (const pack of packs) {
    byLens.set(pack.lensSlug, (byLens.get(pack.lensSlug) ?? 0) + 1);
  }

  assert.equal(byLens.get("triggers-barriers"), 3);
  assert.equal(byLens.get("competitive-wave"), 3);
  assert.equal(byLens.get("narrative-ownership"), 3);
  assert.equal(byLens.get("value-perception-matrix"), 3);
  assert.equal(byLens.get("brand-positioning-map"), 3);
  assert.equal(byLens.get("category-opportunity-map"), 3);
  assert.equal(byLens.get("white-space-analysis"), 3);
  assert.equal(byLens.get("journey-friction-mapping"), 2);
  assert.equal(byLens.get("decision-velocity"), 2);
  assert.equal(byLens.get("cultural-codes-decoding"), 2);
  assert.equal(byLens.get("sentiment-advocacy-proxy"), 2);
  assert.equal(byLens.get("audience-segment-lens"), 2);
  assert.equal(byLens.get("influence-architecture"), 3);
  assert.equal(byLens.get("trust-risk-benchmark"), 3);
  assert.equal(byLens.get("evidence-confidence-layer"), 1);
  assert.equal(packs.length, 38);
});

test("query pack registry covers every runnable engine methodology", () => {
  const templateSlugs = new Set(LENS_QUERY_PACK_TEMPLATES.map((template) => template.lensSlug));
  assert.equal(templateSlugs.has("triggers-barriers"), true);

  for (const slug of ENGINE_METHODOLOGY_SLUGS.filter(isEngineRunnableMethodologySlug)) {
    assert.equal(templateSlugs.has(slug), true, `${slug} needs query pack templates before it can be selected`);
  }
});

test("every lens pack scope is reachable by the CSV import fan-out vocabulary", () => {
  // INVARIANT: services/workers/src/workers/mentions-csv-ingest.ts resolveQueryScope()
  // only ever emits these scopes for imported batches, and the fan-out links a
  // mention to other lens packs by matching `scope` exactly. If a template ever
  // introduces a scope outside this set (e.g. "baseline"), that lens silently
  // receives ZERO fanned-out mentions and shows up empty/blocked in the Signal.
  const csvFannableScopes = new Set(["brand", "competitors", "category"]);
  const offenders = LENS_QUERY_PACK_TEMPLATES
    .filter((template) => !csvFannableScopes.has(template.scope))
    .map((template) => `${template.lensSlug}:${template.signalIntent}:${template.scope}`);

  assert.deepEqual(
    offenders,
    [],
    `These lens packs use a scope the CSV import fan-out cannot match: ${offenders.join(", ")}`
  );
});

test("T&B packs preserve the three classic query slots", () => {
  const packs = buildLensQueryPacks({
    input,
    composed,
    analysisPlan: { selected_lenses: ["triggers-barriers"] }
  });

  assert.deepEqual(
    packs.map((pack) => [pack.lensSlug, pack.signalIntent, pack.scope, pack.queryText]),
    [
      ["triggers-barriers", "decision_signal", "brand", composed.query_text],
      ["triggers-barriers", "competitive_signal", "competitors", composed.competitor_query_text],
      ["triggers-barriers", "category_signal", "category", composed.industry_query_text]
    ]
  );
});

test("Signal Pulse packs cover brand, competitors and category with marketing language", () => {
  const packs = buildLensQueryPacks({
    input: {
      ...input,
      methodology: {
        slug: "signal-pulse",
        name: "Signal Pulse",
        version: "0.1",
        manifest: {}
      }
    },
    composed,
    analysisPlan: { primary_methodology_slug: "signal-pulse", selected_lenses: ["signal-pulse"] }
  }).filter((pack) => pack.lensSlug === "signal-pulse");

  assert.deepEqual(
    packs.map((pack) => [pack.signalIntent, pack.scope]),
    [
      ["marketing_signal", "brand"],
      ["marketing_signal", "competitors"],
      ["marketing_signal", "category"]
    ]
  );
  assert.match(packs[0]?.queryText ?? "", /esta de moda|lo vi en|creator|campana/);
  assert.equal(packs.every((pack) => pack.seeds.required === true), true);
});

test("non-T&B packs add lens-specific signal language and provenance metadata", () => {
  const [pack] = buildLensQueryPacks({
    input,
    composed,
    analysisPlan: { selected_lenses: ["narrative-ownership"] }
  }).filter((candidate) => candidate.lensSlug === "narrative-ownership" && candidate.scope === "brand");

  assert.ok(pack);
  assert.match(pack.queryText, /confío en|no confío|letra chica/);
  assert.match(pack.queryText, /Takis/);
  assert.equal(pack.seeds.lens_slug, "narrative-ownership");
  assert.equal(pack.evaluation.status, "awaiting_csv");
  assert.equal(pack.status, "planned");
});
