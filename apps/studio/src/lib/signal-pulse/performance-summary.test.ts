import assert from "node:assert/strict";
import test from "node:test";

import { summarizePulsePerformance } from "./performance-summary";

test("summarizePulsePerformance calculates totals and paid efficiency from structured rows", () => {
  const summary = summarizePulsePerformance({
    periods: [
      { label: "2026-01", coverage: { conversation: 120 } },
      { label: "2026-02", coverage: { conversation: 80 } }
    ],
    performancePeriods: [
      { label: "2026-01", spend: 100, impressions: 10000, clicks: 250, engagement: 600, conversions: 12, records: 4 },
      { label: "2026-02", spend: 50, impressions: 5000, clicks: 50, engagement: 150, conversions: 3, records: 2 }
    ]
  });

  assert.equal(summary.totals.conversation, 200);
  assert.equal(summary.totals.spend, 150);
  assert.equal(summary.totals.impressions, 15000);
  assert.equal(summary.efficiency.ctr, 0.02);
  assert.equal(summary.efficiency.cpm, 10);
  assert.equal(summary.efficiency.cpc, 0.5);
  assert.equal(summary.efficiency.costPerConversation, 0.75);
  assert.equal(summary.coverage.periodsWithPerformance, 2);
  assert.deepEqual(summary.alerts, []);
});

test("summarizePulsePerformance surfaces coverage gaps without inventing interpretation", () => {
  const summary = summarizePulsePerformance({
    periods: [
      { label: "2026-01", coverage: { conversation: 0 } },
      { label: "2026-02", coverage: { conversation: 72 } },
      { label: "2026-03", coverage: { conversation: 33 } }
    ],
    performancePeriods: [
      { label: "2026-01", spend: 80, impressions: 4000, clicks: 20, records: 2 },
      { label: "2026-03", spend: 0, impressions: 0, clicks: 0, records: 0 }
    ]
  });

  assert.equal(summary.coverage.spendWithoutConversation, 1);
  assert.equal(summary.coverage.conversationWithoutSpend, 2);
  assert.match(summary.read, /inversión pero sin conversación/);
  assert.match(summary.alerts.join(" "), /spend sin conversación/);
  assert.match(summary.alerts.join(" "), /conversación sin spend/);
});

test("summarizePulsePerformance matches performance rows by report period id", () => {
  const summary = summarizePulsePerformance({
    periods: [
      { id: "rp_1", label: "2026-01", coverage: { conversation: 20 } },
      { id: "rp_2", label: "2026-02", coverage: { conversation: 30 } }
    ],
    performancePeriods: [
      { period_id: "rp_2", spend: 90, impressions: 9000, clicks: 180, records: 3 }
    ]
  });

  assert.equal(summary.totals.spend, 90);
  assert.equal(summary.totals.impressions, 9000);
  assert.equal(summary.coverage.conversationWithoutSpend, 1);
  assert.equal(summary.coverage.periodsWithPerformance, 1);
});
