type JsonRecord = Record<string, unknown>;

export type PulsePerformancePeriodInput = {
  period_id?: unknown;
  label?: unknown;
  spend?: unknown;
  impressions?: unknown;
  clicks?: unknown;
  engagement?: unknown;
  conversions?: unknown;
  records?: unknown;
};

export type PulseReportPeriodInput = {
  id?: unknown;
  label?: unknown;
  coverage?: unknown;
};

export type PulsePerformanceSummary = {
  totals: {
    conversation: number;
    spend: number;
    impressions: number;
    clicks: number;
    engagement: number;
    conversions: number;
    records: number;
  };
  efficiency: {
    ctr: number | null;
    cpm: number | null;
    cpc: number | null;
    costPerConversation: number | null;
  };
  coverage: {
    periods: number;
    periodsWithPerformance: number;
    periodsWithConversation: number;
    spendWithoutConversation: number;
    conversationWithoutSpend: number;
  };
  read: string;
  alerts: string[];
};

export function summarizePulsePerformance(args: {
  periods: PulseReportPeriodInput[];
  performancePeriods: PulsePerformancePeriodInput[];
}): PulsePerformanceSummary {
  const performanceByKey = indexPerformancePeriods(args.performancePeriods);
  const totals = {
    conversation: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    engagement: 0,
    conversions: 0,
    records: 0
  };
  let periodsWithPerformance = 0;
  let periodsWithConversation = 0;
  let spendWithoutConversation = 0;
  let conversationWithoutSpend = 0;

  for (const period of args.periods) {
    const performance = performanceByKey.get(stringValue(period.id)) ?? performanceByKey.get(stringValue(period.label)) ?? {};
    const coverage = asRecord(period.coverage);
    const conversation = numberFrom(coverage.conversation);
    const spend = numberFrom(performance.spend);
    const records = numberFrom(performance.records);

    totals.conversation += conversation;
    totals.spend += spend;
    totals.impressions += numberFrom(performance.impressions);
    totals.clicks += numberFrom(performance.clicks);
    totals.engagement += numberFrom(performance.engagement);
    totals.conversions += numberFrom(performance.conversions);
    totals.records += records;

    if (conversation > 0) periodsWithConversation += 1;
    if (records > 0 || spend > 0) periodsWithPerformance += 1;
    if (spend > 0 && conversation === 0) spendWithoutConversation += 1;
    if (conversation > 0 && spend === 0) conversationWithoutSpend += 1;
  }

  const efficiency = {
    ctr: totals.impressions > 0 ? round(totals.clicks / totals.impressions, 4) : null,
    cpm: totals.impressions > 0 ? round((totals.spend / totals.impressions) * 1000, 2) : null,
    cpc: totals.clicks > 0 ? round(totals.spend / totals.clicks, 2) : null,
    costPerConversation: totals.conversation > 0 ? round(totals.spend / totals.conversation, 2) : null
  };
  const coverage = {
    periods: args.periods.length,
    periodsWithPerformance,
    periodsWithConversation,
    spendWithoutConversation,
    conversationWithoutSpend
  };

  return {
    totals: {
      ...totals,
      spend: round(totals.spend, 2),
      conversions: round(totals.conversions, 2)
    },
    efficiency,
    coverage,
    read: buildRead({ totals, coverage }),
    alerts: buildAlerts({ coverage, totals })
  };
}

function indexPerformancePeriods(periods: PulsePerformancePeriodInput[]) {
  const index = new Map<string, PulsePerformancePeriodInput>();
  for (const period of periods) {
    addIndexKey(index, period.period_id, period);
    addIndexKey(index, period.label, period);
  }
  return index;
}

function addIndexKey(index: Map<string, PulsePerformancePeriodInput>, key: unknown, period: PulsePerformancePeriodInput) {
  const normalized = stringValue(key);
  if (normalized) index.set(normalized, period);
}

function buildRead(args: {
  totals: PulsePerformanceSummary["totals"];
  coverage: PulsePerformanceSummary["coverage"];
}) {
  if (args.totals.records === 0) {
    return "Todavía no hay performance estructurada suficiente para comparar inversión contra conversación.";
  }
  if (args.coverage.spendWithoutConversation > 0) {
    return "Hay periodos con inversión pero sin conversación capturada: conviene revisar cobertura antes de leer eficiencia.";
  }
  if (args.coverage.conversationWithoutSpend > 0) {
    return "Hay conversación sin inversión registrada: puede ser tracción orgánica o falta de archivo paid/organic.";
  }
  return "La comparación está lista para lectura táctica: inversión, alcance y conversación viven en datos estructurados.";
}

function buildAlerts(args: {
  coverage: PulsePerformanceSummary["coverage"];
  totals: PulsePerformanceSummary["totals"];
}) {
  const alerts: string[] = [];
  if (args.totals.records === 0) alerts.push("Sube performance de 12 meses para activar lectura paid/organic.");
  if (args.coverage.periodsWithPerformance < args.coverage.periods) {
    alerts.push(`${args.coverage.periodsWithPerformance}/${args.coverage.periods} periodos tienen performance estructurada.`);
  }
  if (args.coverage.spendWithoutConversation > 0) {
    alerts.push(`${args.coverage.spendWithoutConversation} periodos tienen spend sin conversación incluida.`);
  }
  if (args.coverage.conversationWithoutSpend > 0) {
    alerts.push(`${args.coverage.conversationWithoutSpend} periodos tienen conversación sin spend registrado.`);
  }
  return alerts.slice(0, 4);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberFrom(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
