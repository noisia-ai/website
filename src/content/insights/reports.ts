import rawReport from "./noisia-foresight-master-handoff.json";

export type HeroNumber = {
  value: string;
  label: string;
  detail: string;
};

export type SignalEvidence = {
  text: string;
  platform: string;
  date: string;
  url?: string;
  mx: boolean;
  source?: string;
};

export type CulturalHeadline = {
  value: string;
  label: string;
  detail: string;
};

export type InsightSignal = {
  id: string;
  order: number;
  commercial_name: string;
  color: string;
  one_liner: string;
  tension: {
    left: string;
    right: string;
  };
  lead_quote: {
    text: string;
    platform: string;
    attribution: string;
  };
  cultural_reading: string;
  cultural_headlines: CulturalHeadline[];
  brand_implications: {
    do: string[];
    avoid: string[];
    categories_exposed: string[];
    categories_opportunity: string[];
  };
  monitor_next: string[];
  maturity: "emergente" | "acelerando" | "mainstreaming";
  maturity_label: string;
  maturity_note: string;
  volume_indicator: {
    records_analyzed: number;
    mx_evidence_estimated: number;
    sources_count: number;
    framing: string;
  };
  evidence: SignalEvidence[];
};

export type BrandAction = {
  pillar: string;
  do: string;
  avoid: string;
  signals_relevant: string[];
};

export type NarrativeUmbrella = {
  title: string;
  subtitle: string;
  description: string;
  umbrella_logic: Array<{
    tier: string;
    signals: string[];
    theme: string;
  }>;
};

export type Methodology = {
  opening_statement: string;
  principles: string[];
  corpus: {
    sources_used: string[];
    platforms: string[];
    period: string;
    language_focus: string;
    volume_scope: string;
  };
  lenses_applied: string[];
  limitations: string[];
  maturity_framework: Record<InsightSignal["maturity"], string>;
};

export type InsightReport = {
  slug: string;
  indexLabel: string;
  ctaHref: string;
  meta: {
    study: string;
    subtitle: string;
    agency: string;
    version: string;
    analysis_date: string;
  };
  hero_numbers: Record<string, HeroNumber>;
  narrative_umbrella: NarrativeUmbrella;
  signals: InsightSignal[];
  brand_action_map: BrandAction[];
  methodology: Methodology;
};

const report = rawReport as Omit<InsightReport, "slug" | "indexLabel" | "ctaHref">;

export const mexicoForesight2026Report: InsightReport = {
  ...report,
  slug: "mexico-esta-cansado-de-performar",
  indexLabel: "Cultural Foresight México 2026",
  ctaHref: "/diagnostico"
};

export const insightsReports = [mexicoForesight2026Report];

export function getInsightReport(slug: string) {
  return insightsReports.find((reportItem) => reportItem.slug === slug);
}
