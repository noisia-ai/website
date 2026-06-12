import assert from "node:assert/strict";
import test from "node:test";

import type { EngineMethodologyOption } from "@/lib/engine/methodology-options";
import {
  SIGNAL_PULSE_RUNTIME_OPTION,
  buildRuntimeMethodologyOptions,
  enginePublishedOutputTypeForMethodology,
  shouldLoadSelectedLensState
} from "./runtime-contracts";

const pausedEngineOptions: EngineMethodologyOption[] = [
  {
    slug: "narrative-ownership",
    label: "#12 Narrative Ownership",
    shortLabel: "Narrative Ownership",
    priority: "#12",
    runtimeKind: "engine",
    seeded: true,
    status: "beta",
    version: "0.1",
    runnable: true
  },
  {
    slug: "competitive-wave",
    label: "#02 Competitive Wave",
    shortLabel: "Competitive Wave",
    priority: "#02",
    runtimeKind: "engine",
    seeded: true,
    status: "beta",
    version: "0.1",
    runnable: true
  }
];

test("Signal Pulse runtime exposes only the Signal Pulse action", () => {
  const options = buildRuntimeMethodologyOptions({
    primaryMethodologySlug: "signal-pulse",
    baseOptions: pausedEngineOptions
  });

  assert.deepEqual(options.map((option) => option.slug), ["signal-pulse"]);
  assert.deepEqual(options[0], SIGNAL_PULSE_RUNTIME_OPTION);
});

test("non Signal Pulse runtime keeps the existing engine options", () => {
  const options = buildRuntimeMethodologyOptions({
    primaryMethodologySlug: "narrative-ownership",
    baseOptions: pausedEngineOptions
  });

  assert.equal(options, pausedEngineOptions);
});

test("Signal Pulse skips selected-lens runtime state", () => {
  assert.equal(shouldLoadSelectedLensState("signal-pulse"), false);
  assert.equal(shouldLoadSelectedLensState("competitive-wave"), true);
  assert.equal(shouldLoadSelectedLensState(null), true);
});

test("Signal Pulse reads and writes its dedicated published output type", () => {
  assert.equal(enginePublishedOutputTypeForMethodology("signal-pulse"), "signal_pulse_dashboard");
  assert.equal(enginePublishedOutputTypeForMethodology("narrative-ownership"), "narrative_dashboard");
});
