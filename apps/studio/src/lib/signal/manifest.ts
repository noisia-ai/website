export type SignalModuleKey =
  | "overview"
  | "tb_decision_field"
  | "opportunities"
  | "competitive_intelligence"
  | "action_studio"
  | "evidence"
  | "quality_boundaries"
  | "emerging_patterns"
  | "corpus_view"
  | "corpus_chat";

export const defaultSignalManifest: Record<SignalModuleKey, boolean> = {
  overview: true,
  tb_decision_field: true,
  opportunities: true,
  competitive_intelligence: true,
  action_studio: true,
  evidence: true,
  quality_boundaries: true,
  emerging_patterns: true,
  corpus_view: true,
  corpus_chat: true
};

export const signalModuleMeta: Array<{
  key: SignalModuleKey;
  label: string;
  description: string;
  status: "ready" | "partial" | "hold";
}> = [
  {
    key: "overview",
    label: "Overview & confianza",
    description: "Contexto del corte, tamaño de corpus, periodo, confianza y lectura ejecutiva.",
    status: "ready"
  },
  {
    key: "tb_decision_field",
    label: "T&B Decision Field",
    description: "Vista propietaria central: fuerzas que motivan, frenan y qué tan movibles son.",
    status: "ready"
  },
  {
    key: "opportunities",
    label: "Opportunities",
    description: "Tensiones, whitespace y prioridades sin repetir el mismo finding.",
    status: "ready"
  },
  {
    key: "competitive_intelligence",
    label: "Competitive Intelligence",
    description: "Qué es de la marca, qué posee la competencia y qué es de categoría.",
    status: "ready"
  },
  {
    key: "action_studio",
    label: "Action Studio",
    description: "Acciones por equipo: estrategia, contenido, producto/CX, media y medición.",
    status: "ready"
  },
  {
    key: "evidence",
    label: "Evidence",
    description: "Citas y finding detail conectados a cada recomendación.",
    status: "ready"
  },
  {
    key: "quality_boundaries",
    label: "Quality / Boundaries",
    description: "Límites de lo que podemos afirmar, gates y advertencias client-safe.",
    status: "ready"
  },
  {
    key: "emerging_patterns",
    label: "Emerging Patterns",
    description: "Insights abiertos que nacen del corpus sin forzarlos al método T&B.",
    status: "ready"
  },
  {
    key: "corpus_view",
    label: "Corpus View",
    description: "Vista client-safe del corpus publicado: búsqueda, fuente, fecha y finding.",
    status: "ready"
  },
  {
    key: "corpus_chat",
    label: "Corpus Chat",
    description: "Agente restringido al reporte publicado, Knowledge Base y evidencia del snapshot.",
    status: "partial"
  }
];

export type SignalDemoModeConfig = {
  enabled: boolean;
  blurredSections: SignalModuleKey[];
};

export type SignalDemoModeManifest = {
  enabled: boolean;
  blurred_sections: SignalModuleKey[];
};

export type SignalOutputManifest = Record<SignalModuleKey, boolean> & {
  demo_mode: SignalDemoModeManifest;
};

export const defaultSignalDemoBlurredSections: SignalModuleKey[] = [
  "tb_decision_field",
  "opportunities",
  "competitive_intelligence",
  "action_studio",
  "evidence",
  "emerging_patterns",
  "corpus_view",
  "corpus_chat"
];

const signalModuleKeySet = new Set<SignalModuleKey>(signalModuleMeta.map((module) => module.key));

export function isSignalModuleKey(value: unknown): value is SignalModuleKey {
  return typeof value === "string" && signalModuleKeySet.has(value as SignalModuleKey);
}

export function normalizeSignalModuleFlags(input?: unknown): Record<SignalModuleKey, boolean> {
  const value = asRecord(input);
  const flags = { ...defaultSignalManifest };
  for (const meta of signalModuleMeta) {
    const flag = value[meta.key];
    if (typeof flag === "boolean") {
      flags[meta.key] = flag;
    }
  }
  return flags;
}

export function normalizeSignalDemoMode(input?: unknown): SignalDemoModeConfig {
  const value = asRecord(input);
  const rawBlurredSections = Array.isArray(value.blurred_sections)
    ? value.blurred_sections
    : Array.isArray(value.blurredSections)
      ? value.blurredSections
      : [];

  return {
    enabled: value.enabled === true,
    blurredSections: rawBlurredSections.filter(isSignalModuleKey)
  };
}

export function serializeSignalDemoMode(config: SignalDemoModeConfig): SignalDemoModeManifest {
  return {
    enabled: config.enabled,
    blurred_sections: uniqueSignalModuleKeys(config.blurredSections)
  };
}

export function normalizeSignalOutputManifest(input?: unknown): SignalOutputManifest {
  const value = asRecord(input);
  return {
    ...normalizeSignalModuleFlags(value),
    demo_mode: serializeSignalDemoMode(normalizeSignalDemoMode(value.demo_mode))
  };
}

export function uniqueSignalModuleKeys(values: SignalModuleKey[]): SignalModuleKey[] {
  const seen = new Set<SignalModuleKey>();
  return values.filter((value) => {
    if (!signalModuleKeySet.has(value) || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
