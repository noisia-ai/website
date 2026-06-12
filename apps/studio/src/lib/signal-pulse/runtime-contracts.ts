import type { EngineMethodologyOption } from "@/lib/engine/methodology-options";

export const SIGNAL_PULSE_SLUG = "signal-pulse";

export const SIGNAL_PULSE_RUNTIME_OPTION: EngineMethodologyOption = {
  slug: SIGNAL_PULSE_SLUG,
  label: "Signal Pulse",
  shortLabel: "Signal Pulse",
  priority: "SP",
  runtimeKind: "engine",
  seeded: true,
  status: "beta",
  version: "0.1",
  runnable: true
};

export function isSignalPulseMethodology(slug?: string | null) {
  return slug === SIGNAL_PULSE_SLUG;
}

export function shouldLoadSelectedLensState(primaryMethodologySlug?: string | null) {
  return !isSignalPulseMethodology(primaryMethodologySlug);
}

export function buildRuntimeMethodologyOptions({
  primaryMethodologySlug,
  baseOptions
}: {
  primaryMethodologySlug?: string | null;
  baseOptions: EngineMethodologyOption[];
}) {
  if (isSignalPulseMethodology(primaryMethodologySlug)) return [SIGNAL_PULSE_RUNTIME_OPTION];
  return baseOptions;
}

export function enginePublishedOutputTypeForMethodology(slug: string) {
  return isSignalPulseMethodology(slug) ? "signal_pulse_dashboard" : "narrative_dashboard";
}
