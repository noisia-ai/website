#!/usr/bin/env node
/**
 * fetch-insights.mjs — pull insights from a published Signal / Signal Pulse report
 * into deck-ready JSON, via the Noisia public reporting API.
 *
 * Usage:
 *   SIGNAL_API_BASE=https://<studio-host> SIGNAL_API_TOKEN=<token> \
 *   node fetch-insights.mjs <outputId> [out.json]
 *
 * The public reporting API lives in apps/studio (api/public/v1|v2/reports). This
 * script reads a report and reshapes its metrics + representative quotes into the
 * placeholders used by slides/signal-insight/signal-insight.html and finding.html.
 *
 * Rule: metrics come straight from Signal (deterministic) — never edit the numbers
 * by hand. Quotes must keep their source for traceability.
 */
const base = process.env.SIGNAL_API_BASE;
const token = process.env.SIGNAL_API_TOKEN;
const outputId = process.argv[2];

if (!base || !outputId) {
  console.error("Usage: SIGNAL_API_BASE=... SIGNAL_API_TOKEN=... node fetch-insights.mjs <outputId> [out.json]");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/api/public/v2/reports/${outputId}`;
const res = await fetch(url, {
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
if (!res.ok) {
  console.error(`Signal API ${res.status}: ${await res.text()}`);
  process.exit(2);
}
const report = await res.json();

// Reshape into deck-ready insight cards. Adjust the field paths to the live
// public contract (docs/api/openapi.yaml) if it evolves.
const insights = (report.findings ?? report.insights ?? []).slice(0, 8).map((f) => ({
  eyebrow: f.theme ?? f.methodology ?? "signal",
  metric: f.metric ?? f.value ?? "",
  metric_label: f.metric_label ?? f.title ?? "",
  quote: f.representative_quote ?? f.quote ?? "",
  quote_source: f.evidence_source ?? f.source ?? "signal · corpus",
  confidence: f.confidence ?? "",
}));

const payload = { outputId, source: url, fetched_at: new Date().toISOString(), insights };
const out = process.argv[3];
if (out) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.error(`Wrote ${insights.length} insights → ${out}`);
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
