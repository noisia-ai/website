import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonthlyReportPeriods,
  calculateImpactV1,
  classifySignalPulseLifecycle
} from "./signal-pulse";

test("Signal Pulse periodization creates comparable monthly buckets", () => {
  assert.deepEqual(buildMonthlyReportPeriods({ windowEnd: "2026-06-12", months: 3 }), [
    { periodStart: "2026-04-01", periodEnd: "2026-04-30", label: "2026-04" },
    { periodStart: "2026-05-01", periodEnd: "2026-05-31", label: "2026-05" },
    { periodStart: "2026-06-01", periodEnd: "2026-06-30", label: "2026-06" }
  ]);
});

test("impact_v1 uses the closed weighted formula and clamps inputs", () => {
  assert.equal(calculateImpactV1({
    volumeNorm: 1,
    engagementNorm: 0.5,
    recency: 0.25,
    sourceDiversity: 2,
    temporalConsistency: -1
  }), 66.25);
});

test("Signal Pulse lifecycle classifies basic monthly movement", () => {
  assert.equal(classifySignalPulseLifecycle({ currentVolume: 20, previousVolume: 0, periodsSeen: 1 }), "new");
  assert.equal(classifySignalPulseLifecycle({ currentVolume: 18, previousVolume: 0, periodsSeen: 3 }), "reappeared");
  assert.equal(classifySignalPulseLifecycle({ currentVolume: 30, previousVolume: 10, periodsSeen: 4 }), "accelerating");
  assert.equal(classifySignalPulseLifecycle({ currentVolume: 4, previousVolume: 12, periodsSeen: 5 }), "declining");
  assert.equal(classifySignalPulseLifecycle({ currentVolume: 10, previousVolume: 11, periodsSeen: 5, volatility: 0.9 }), "volatile");
});
