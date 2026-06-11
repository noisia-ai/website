import type { ComposedQuery, QueryComposerInput } from "./index";

export type QueryPackScope = "brand" | "competitors" | "category" | "baseline";

export type LensQueryPackTemplate = {
  lensSlug: string;
  lensLabel: string;
  signalIntent: string;
  signalLabel: string;
  scope: QueryPackScope;
  objective: string;
  phraseHints: string[];
  sourceHints: string[];
  required: boolean;
};

export type MaterializedLensQueryPack = {
  lensSlug: string;
  lensLabel: string;
  signalIntent: string;
  signalLabel: string;
  scope: QueryPackScope;
  objective: string;
  queryText: string;
  queryComponents: Record<string, unknown>;
  seeds: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  status: "planned";
  costBudget: Record<string, unknown>;
};

export type StudyAnalysisPlanLike = {
  version?: number;
  primary_methodology_slug?: string;
  selected_lenses?: unknown;
  lens_configs?: unknown;
  composer_modules?: unknown;
};

const PRIMARY_LENS = "triggers-barriers";

export const LENS_QUERY_PACK_TEMPLATES: LensQueryPackTemplate[] = [
  {
    lensSlug: PRIMARY_LENS,
    lensLabel: "Triggers & Barriers",
    signalIntent: "decision_signal",
    signalLabel: "Marca: triggers, barriers y experiencia",
    scope: "brand",
    objective: "Capturar menciones de la marca con fuerzas que motivan, frenan o explican la decisión.",
    phraseHints: [
      "lo compré porque",
      "me convenció",
      "no me conviene",
      "me frena",
      "me molesta",
      "vale la pena",
      "no vale la pena"
    ],
    sourceHints: ["SentiOne brand export", "reviews", "Zendesk", "social comments"],
    required: true
  },
  {
    lensSlug: PRIMARY_LENS,
    lensLabel: "Triggers & Barriers",
    signalIntent: "competitive_signal",
    signalLabel: "Competidores: triggers y barriers comparables",
    scope: "competitors",
    objective: "Capturar menciones del peer set para comparar qué frena o mueve a usuarios frente a competidores.",
    phraseHints: [
      "me cambié a",
      "prefiero",
      "comparé con",
      "es mejor que",
      "es peor que",
      "me quedo con"
    ],
    sourceHints: ["SentiOne competitor export", "reviews comparativas", "social comments"],
    required: true
  },
  {
    lensSlug: PRIMARY_LENS,
    lensLabel: "Triggers & Barriers",
    signalIntent: "category_signal",
    signalLabel: "Categoría: baseline de decisión",
    scope: "category",
    objective: "Capturar conversación de categoría sin amarrarla a marca para medir baseline cultural.",
    phraseHints: [
      "quiero contratar",
      "no entiendo",
      "sale caro",
      "me preocupa",
      "recomiendan",
      "qué conviene"
    ],
    sourceHints: ["SentiOne category export", "forums", "search/social questions"],
    required: true
  },
  ...templatesForThreeScopes({
    lensSlug: "narrative-ownership",
    lensLabel: "Narrative Ownership",
    signalIntent: "narrative_signal",
    signalLabel: "Narrativas y ownership",
    objective: "Encontrar narrativas que las entidades poseen, disputan o dejan huérfanas.",
    phraseHints: [
      "confío en",
      "no confío",
      "letra chica",
      "sin trucos",
      "me resuelve",
      "siempre falla",
      "me da confianza",
      "me decepcionó"
    ],
    sourceHints: ["SentiOne", "reviews", "community posts", "customer voice CSV"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "value-perception-matrix",
    lensLabel: "Value Perception Matrix",
    signalIntent: "value_perception",
    signalLabel: "Valor percibido y costos",
    objective: "Capturar beneficios percibidos y costos funcionales, emocionales, sociales o cognitivos.",
    phraseHints: [
      "vale lo que cuesta",
      "muy caro",
      "barato pero",
      "me da más por mi dinero",
      "no rinde",
      "me ahorra tiempo",
      "me complica",
      "me conviene"
    ],
    sourceHints: ["SentiOne", "reviews", "pricing feedback", "commerce/review CSV"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "brand-positioning-map",
    lensLabel: "Brand Positioning Map",
    signalIntent: "positioning_signal",
    signalLabel: "Posicionamiento perceptual",
    objective: "Capturar asociaciones perceptuales que ubican entidades en ejes de posicionamiento.",
    phraseHints: [
      "se siente",
      "lo percibo como",
      "es para",
      "parece",
      "más premium",
      "más confiable",
      "más barato",
      "más moderno"
    ],
    sourceHints: ["SentiOne", "reviews", "brand perception CSV", "social comments"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "category-opportunity-map",
    lensLabel: "Category Opportunity Map",
    signalIntent: "category_opportunity",
    signalLabel: "Oportunidades de categoría",
    objective: "Capturar necesidades, gaps, urgencia y demanda expresada que puedan convertirse en oportunidad.",
    phraseHints: [
      "necesito",
      "ojalá",
      "nadie ofrece",
      "me gustaría",
      "falta que",
      "no encuentro",
      "sería bueno",
      "deberían"
    ],
    sourceHints: ["SentiOne category export", "forums", "reviews", "search/social questions"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "white-space-analysis",
    lensLabel: "White Space Analysis",
    signalIntent: "white_space",
    signalLabel: "Espacios no capturados",
    objective: "Capturar necesidades poco atendidas y evidencia de espacios disputables o aspiracionales.",
    phraseHints: [
      "nadie resuelve",
      "no hay opción",
      "me falta",
      "quisiera",
      "no encuentro",
      "todas son iguales",
      "si existiera",
      "me encantaría"
    ],
    sourceHints: ["SentiOne", "reviews", "category CSV", "community posts"]
  }),
  {
    lensSlug: "journey-friction-mapping",
    lensLabel: "Journey Friction Mapping",
    signalIntent: "journey_friction",
    signalLabel: "Marca: fricciones del journey",
    scope: "brand",
    objective: "Detectar fricciones por fase del journey cuando la marca o experiencia está presente.",
    phraseHints: [
      "quise comprar",
      "no pude",
      "se cayó",
      "no me dejó",
      "cancelé",
      "no contestan",
      "me tardaron",
      "me cobraron"
    ],
    sourceHints: ["SentiOne brand export", "Zendesk", "reviews", "app store"],
    required: true
  },
  {
    lensSlug: "journey-friction-mapping",
    lensLabel: "Journey Friction Mapping",
    signalIntent: "journey_friction",
    signalLabel: "Categoría: fricciones del journey",
    scope: "category",
    objective: "Detectar fricciones recurrentes de categoría aunque no nombren a la marca.",
    phraseHints: [
      "contratar",
      "cancelar",
      "renovar",
      "soporte",
      "servicio al cliente",
      "app falla",
      "cobro",
      "garantía"
    ],
    sourceHints: ["SentiOne category export", "Zendesk", "reviews", "app store"],
    required: true
  },
  ...templatesForScopes({
    lensSlug: "decision-velocity",
    lensLabel: "Decision Velocity",
    signalIntent: "decision_velocity",
    signalLabel: "Blockers y accelerators del journey",
    scopes: ["brand", "category"],
    objective: "Capturar señales que aceleran o frenan la decisión a lo largo del journey.",
    phraseHints: [
      "decidí rápido",
      "me tardé",
      "no pude decidir",
      "me convenció",
      "me detuvo",
      "me hizo dudar",
      "me resolvió",
      "me bloqueó"
    ],
    sourceHints: ["SentiOne", "Zendesk", "reviews", "journey/support CSV"]
  }),
  ...templatesForScopes({
    lensSlug: "cultural-codes-decoding",
    lensLabel: "Cultural Codes",
    signalIntent: "cultural_code",
    signalLabel: "Códigos, símbolos y tensiones culturales",
    scopes: ["brand", "category"],
    objective: "Capturar lenguaje, símbolos, rituales y tensiones culturales que dan significado a la categoría.",
    phraseHints: [
      "se volvió",
      "es de",
      "representa",
      "me identifica",
      "me da pena",
      "lo presumo",
      "ritual",
      "trend"
    ],
    sourceHints: ["TikTok/social comments", "forums", "long-form reviews", "community posts"]
  }),
  ...templatesForScopes({
    lensSlug: "sentiment-advocacy-proxy",
    lensLabel: "Sentiment / Advocacy Proxy",
    signalIntent: "advocacy_signal",
    signalLabel: "Advocacy y defensa espontánea",
    scopes: ["brand", "competitors"],
    objective: "Capturar recomendación, defensa, rechazo, intensidad emocional y boca a boca comparable.",
    phraseHints: [
      "lo recomiendo",
      "no lo recomiendo",
      "me encanta",
      "lo odio",
      "definitivamente",
      "jamás vuelvo",
      "me quedo con",
      "cámbiate a"
    ],
    sourceHints: ["SentiOne", "reviews", "NPS/comments CSV", "social comments"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "trust-risk-benchmark",
    lensLabel: "Trust & Risk Benchmark",
    signalIntent: "trust_risk",
    signalLabel: "Confianza, riesgo y reputación",
    objective: "Capturar drivers de confianza, riesgo percibido, severidad y señales reputacionales.",
    phraseHints: [
      "me da confianza",
      "me da miedo",
      "es fraude",
      "letra chica",
      "me estafaron",
      "cumplieron",
      "no cumplen",
      "riesgo"
    ],
    sourceHints: ["SentiOne", "reviews", "complaints CSV", "support tickets"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "competitive-wave",
    lensLabel: "Competitive Wave",
    signalIntent: "competitive_wave",
    signalLabel: "Ejes comparativos y posición competitiva",
    objective: "Capturar señales comparables para construir ejes de posición competitiva entre entidades.",
    phraseHints: [
      "mejor que",
      "peor que",
      "se compara con",
      "prefiero",
      "lidera en",
      "se queda corto",
      "más fuerte",
      "más débil"
    ],
    sourceHints: ["SentiOne competitor export", "reviews comparativas", "benchmark CSV", "social comments"]
  }),
  ...templatesForScopes({
    lensSlug: "audience-segment-lens",
    lensLabel: "Audience Segment Lens",
    signalIntent: "audience_segment",
    signalLabel: "Señales por audiencia o segmento",
    scopes: ["brand", "category"],
    objective: "Capturar señales con metadata o pistas de segmento para detectar sesgos de audiencia.",
    phraseHints: [
      "como mamá",
      "como estudiante",
      "para mi negocio",
      "en mi zona",
      "en mi edad",
      "para niños",
      "para trabajar",
      "para viajar"
    ],
    sourceHints: ["CRM/Zendesk CSV", "survey open ends", "reviews with metadata", "SentiOne"]
  }),
  ...templatesForThreeScopes({
    lensSlug: "influence-architecture",
    lensLabel: "Influence Architecture",
    signalIntent: "influence_signal",
    signalLabel: "Nodos, comunidades e influencia",
    objective: "Capturar menciones con handles, comunidades, fuentes e interacciones que permitan inferir influencia.",
    phraseHints: [
      "lo vi en",
      "me recomendó",
      "influencer",
      "creator",
      "comunidad",
      "grupo",
      "trend",
      "viral"
    ],
    sourceHints: ["social export with handles", "creator CSV", "community posts", "SentiOne author metadata"]
  }),
  ...templatesForScopes({
    lensSlug: "evidence-confidence-layer",
    lensLabel: "Evidence Confidence Layer",
    signalIntent: "evidence_confidence",
    signalLabel: "Calidad, diversidad y trazabilidad de evidencia",
    scopes: ["brand"],
    objective: "Capturar evidencia útil para evaluar confianza, diversidad de fuente y fuerza de claims.",
    phraseHints: [
      "en mi experiencia",
      "me pasó",
      "tengo evidencia",
      "captura",
      "ticket",
      "factura",
      "comprobante",
      "caso real"
    ],
    sourceHints: ["SentiOne", "Zendesk", "reviews", "evidence/support CSV"]
  })
];

export function selectedLensSlugsFromAnalysisPlan(
  analysisPlan: unknown,
  primarySlug = PRIMARY_LENS
): string[] {
  const plan = normalizeAnalysisPlan(analysisPlan, primarySlug);
  return plan.selected_lenses;
}

export function buildLensQueryPacks(params: {
  input: QueryComposerInput;
  composed: ComposedQuery;
  analysisPlan?: unknown;
}): MaterializedLensQueryPack[] {
  const selectedLenses = selectedLensSlugsFromAnalysisPlan(
    params.analysisPlan,
    params.input.methodology.slug || PRIMARY_LENS
  );
  const selected = new Set(selectedLenses);
  const templates = LENS_QUERY_PACK_TEMPLATES.filter((template) => selected.has(template.lensSlug));
  const components = normalizeComponents(params.composed.query_components);
  const knowledgeLanguage = arrayOfStrings(components.knowledge_query_language);

  return templates.map((template) => {
    const baseQuery = baseQueryForScope(params.composed, template.scope);
    const queryText = template.lensSlug === PRIMARY_LENS
      ? baseQuery
      : buildLensQuery({
          template,
          baseQuery,
          components,
          knowledgeLanguage,
          subjectName: params.input.subject.name
        });
    const scopeSeeds = seedsForScope(template.scope, components, params.input.subject.name);
    return {
      lensSlug: template.lensSlug,
      lensLabel: template.lensLabel,
      signalIntent: template.signalIntent,
      signalLabel: template.signalLabel,
      scope: template.scope,
      objective: template.objective,
      queryText,
      queryComponents: {
        source: "lens_query_pack_registry",
        lens_slug: template.lensSlug,
        signal_intent: template.signalIntent,
        scope: template.scope,
        base_query_text: baseQuery,
        phrase_hints: template.phraseHints,
        source_hints: template.sourceHints,
        selected_lenses: selectedLenses,
        shared_components: {
          brand_seeds: arrayOfStrings(components.brand_seeds),
          competitor_seeds: arrayOfStrings(components.competitor_seeds),
          category_seeds: arrayOfStrings(components.category_seeds),
          global_exclusions: arrayOfStrings(components.global_exclusions)
        }
      },
      seeds: {
        lens_slug: template.lensSlug,
        lens_label: template.lensLabel,
        signal_intent: template.signalIntent,
        signal_label: template.signalLabel,
        scope: template.scope,
        scope_seeds: scopeSeeds,
        phrase_hints: template.phraseHints,
        source_hints: template.sourceHints,
        required: template.required
      },
      evaluation: {
        source: "planned_from_query_iteration",
        status: "awaiting_csv",
        coverage: "pending_upload"
      },
      status: "planned",
      costBudget: {
        source: "study_size_policy",
        note: "Resolved by corpus package and worker runtime, not by hardcoded per-lens caps."
      }
    };
  });
}

function normalizeAnalysisPlan(analysisPlan: unknown, primarySlug: string): { selected_lenses: string[] } {
  const plan = analysisPlan && typeof analysisPlan === "object" && !Array.isArray(analysisPlan)
    ? (analysisPlan as StudyAnalysisPlanLike)
    : {};
  const selected = Array.isArray(plan.selected_lenses)
    ? plan.selected_lenses.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return {
    selected_lenses: unique([primarySlug || PRIMARY_LENS, ...selected]).filter((slug) =>
      LENS_QUERY_PACK_TEMPLATES.some((template) => template.lensSlug === slug)
    )
  };
}

function templatesForThreeScopes(params: Omit<Parameters<typeof templatesForScopes>[0], "scopes">) {
  return templatesForScopes({ ...params, scopes: ["brand", "competitors", "category"] });
}

function templatesForScopes(params: {
  lensSlug: string;
  lensLabel: string;
  signalIntent: string;
  signalLabel: string;
  scopes: QueryPackScope[];
  objective: string;
  phraseHints: string[];
  sourceHints: string[];
}) {
  const labels: Record<QueryPackScope, string> = {
    brand: "Marca",
    competitors: "Competidores",
    category: "Categoría",
    baseline: "Baseline"
  };
  return params.scopes.map< LensQueryPackTemplate>((scope) => ({
    lensSlug: params.lensSlug,
    lensLabel: params.lensLabel,
    signalIntent: params.signalIntent,
    signalLabel: `${labels[scope]}: ${params.signalLabel}`,
    scope,
    objective: `${params.objective} Scope: ${labels[scope].toLowerCase()}.`,
    phraseHints: params.phraseHints,
    sourceHints: params.sourceHints,
    required: true
  }));
}

function baseQueryForScope(composed: ComposedQuery, scope: QueryPackScope) {
  if (scope === "competitors") return composed.competitor_query_text || composed.query_text;
  if (scope === "category" || scope === "baseline") return composed.industry_query_text || composed.query_text;
  return composed.query_text;
}

function buildLensQuery(params: {
  template: LensQueryPackTemplate;
  baseQuery: string;
  components: Record<string, unknown>;
  knowledgeLanguage: string[];
  subjectName: string;
}) {
  const scopeSeeds = seedsForScope(params.template.scope, params.components, params.subjectName);
  const signalSeeds = unique([
    ...params.template.phraseHints,
    ...params.knowledgeLanguage,
    ...arrayOfStrings(params.components.knowledge_potential_triggers),
    ...arrayOfStrings(params.components.knowledge_potential_barriers)
  ]).slice(0, 28);
  const exclusions = arrayOfStrings(params.components.global_exclusions).slice(0, 18);
  const scopeClause = quoteAny(scopeSeeds);
  const signalClause = quoteAny(signalSeeds);
  const exclusionClause = quoteAny(exclusions);

  if (!scopeClause || !signalClause) {
    return params.baseQuery;
  }

  return `((${
    scopeClause
  })) AND ((${signalClause}))${exclusionClause ? ` NOT (${exclusionClause})` : ""}`;
}

function seedsForScope(scope: QueryPackScope, components: Record<string, unknown>, subjectName: string) {
  if (scope === "competitors") return arrayOfStrings(components.competitor_seeds).slice(0, 80);
  if (scope === "category" || scope === "baseline") return arrayOfStrings(components.category_seeds).slice(0, 40);
  return unique([subjectName, ...arrayOfStrings(components.brand_seeds)]).slice(0, 60);
}

function normalizeComponents(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function quoteAny(values: string[]) {
  return unique(values)
    .filter((value) => value.length > 0)
    .map((value) => `"${value.replace(/"/g, '\\"')}"`)
    .join(" OR ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
