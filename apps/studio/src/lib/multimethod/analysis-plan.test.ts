import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStudyAnalysisPlan,
  composerModulesForLenses,
  defaultStudyLensSlugs,
  normalizeStudyAnalysisPlan,
  STUDY_LENS_OPTIONS
} from "./analysis-plan";

test("defaultStudyLensSlugs keeps T&B and Narrative selected", () => {
  assert.deepEqual(defaultStudyLensSlugs(), ["triggers-barriers", "narrative-ownership"]);
});

test("buildStudyAnalysisPlan forces the primary lens and drops unknown slugs", () => {
  const plan = buildStudyAnalysisPlan(["value-perception-matrix", "unknown-lens"], "triggers-barriers");

  assert.deepEqual(plan.selected_lenses, ["triggers-barriers", "value-perception-matrix"]);
  assert.equal(plan.primary_methodology_slug, "triggers-barriers");
  assert.equal(plan.lens_configs["triggers-barriers"]?.runtime, "tb_pipeline");
  assert.equal(plan.lens_configs["value-perception-matrix"]?.runtime, "engine_lens");
  assert.equal((plan.lens_configs["value-perception-matrix"]?.query_pack as Record<string, unknown>).requires_competitors, true);
  assert.deepEqual(plan.lens_configs["value-perception-matrix"]?.signal_module_keys, ["live_composer", "value_perception", "opportunities"]);
});

test("normalizeStudyAnalysisPlan falls back to the safe default", () => {
  const plan = normalizeStudyAnalysisPlan({ selected_lenses: ["unknown-lens"] }, "missing-primary");

  assert.deepEqual(plan.selected_lenses, ["triggers-barriers"]);
  assert.equal(plan.primary_methodology_slug, "triggers-barriers");
});

test("buildStudyAnalysisPlan preserves every selected study lens", () => {
  const everyLens = STUDY_LENS_OPTIONS.map((option) => option.slug);
  const plan = buildStudyAnalysisPlan(everyLens, "triggers-barriers");

  assert.deepEqual(plan.selected_lenses, everyLens);
  assert.equal(plan.selected_lenses.length, STUDY_LENS_OPTIONS.length);
});

test("composerModulesForLenses dedupes module slugs", () => {
  assert.deepEqual(
    composerModulesForLenses(["triggers-barriers", "narrative-ownership"]).slice(0, 3),
    ["overview", "tb_decision_field", "opportunities"]
  );
});
