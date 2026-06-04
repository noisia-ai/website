# 99 · BUILD SPEC FOR CODEX — Engine Comparativo Noisia

> **Propósito:** spec de ingeniería **autoritativo y completo** para implementar la familia de metodologías comparativas (archivos `01`–`16` de esta carpeta) sin ambigüedad. Calza con las firmas reales del repo a fecha de este doc. Todo lo que diga "[CREAR]" es archivo nuevo; "[EDITAR]" es archivo existente que se modifica.
>
> **Regla de oro del engine:** *Opus interpreta · SQL puntúa · Voyage recupera.* A Opus nunca se le pide contar ni agregar. Los números del dashboard son SQL determinista y reproducible.

---

## 0. Hechos del repo que este spec respeta (no re-inventar)

| Pieza | Realidad actual | Dónde |
|---|---|---|
| LLM call | `@ai-sdk/anthropic` + `generateText` de `ai`; `model = process.env.ANTHROPIC_MODEL_DEFAULT ?? "claude-sonnet-4-6"` | `tb-step-2-coding.ts:1-3,87` |
| Modelo del engine | **Override a Opus**: `process.env.ANTHROPIC_MODEL_ENGINE ?? "claude-opus-4-8"` para pases de detección | nuevo env |
| Prompts + parsers | viven en `packages/query-engine/src/*.ts`, no en el worker | `tb.ts` |
| Embeddings (Voyage) | `embedTexts`, `vectorLiteral`, `EMBEDDING_DIMENSIONS=1024`, `DEFAULT_EMBEDDING_MODEL="voyage-4-large"` | `packages/query-engine/src/semantic-rag.ts` |
| Vector store | tabla `semantic_embeddings(embedding vector(1024))`, hnsw cosine, poblada por worker | `migrations/0015,0017`, `semantic-embeddings.ts` |
| Cola/pipeline | BullMQ `noisia-tb-analysis`; helpers `enqueueStep/markStepRunning/markStepCompleted/markStepFailed/releaseCorpusLock`; tabla `tb_pipeline_steps` | `tb-shared.ts` |
| Step order/types | `TbStepName`, `TB_STEP_ORDER`, `nextStep()` | `packages/query-engine/src/tb.ts` |
| Output payload | `SignalPayloadV2` (`schema_version: 4`) en `published_outputs.payload (jsonb)` | `contracts.ts`, schema `published_outputs` |
| Adapter render | `adaptTbSignalPayload()` → `TbDashboardViewModel`; `MethodologyComparativeBlocks` con stubs vpm/jfm/cultural/influence/decision | `adapters/tb.ts` |
| Manifest módulos | `SignalModuleKey`, `defaultSignalManifest`, `signalModuleMeta` | `manifest.ts` |
| Scoring comparativo | `classifyOwnership()` (0.55/0.45/35%/total<2), `confidenceFromMentions()` (100/30), `roundPct()` | `tb-step-5-comparative.ts:392-456` |
| Migraciones | SQL numerado idempotente (`IF NOT EXISTS`, `DO $$`) + entrada en `meta/_journal.json`. Última: `0020`. **Siguiente: `0021`** | `migrations/` |
| Schema Drizzle | un solo `infrastructure/db/schema/index.ts` | — |
| Methodology registry | tabla `methodologies` (manifest_yaml, default_blocks, ai_prompts, quality_gates); seeds YAML en `10_methodology_seeds/` cargados por `infrastructure/db/seeds/methodologies.ts` | schema + README seeds |

**No se toca T&B.** Se mantiene su pipeline; se le añade un adaptador de salida al contrato común (§7.4). Las metodologías nuevas nacen sobre tablas `engine_*`.

---

## 1. Mapa de archivos a crear/editar

```
packages/query-engine/src/
  engine.ts                         [CREAR] tipos + constantes compartidas (slugs, unit kinds, step order, queue)
  engine-scoring.ts                 [CREAR] primitivas deterministas (port de classifyOwnership etc.)
  engine-retrieval.ts               [CREAR] helpers de retrieval Voyage (cosine top-k por dimensión)
  engine-coding.ts                  [CREAR] builder de prompt genérico + parser + Zod de salida de Opus
  methodologies/
    narrative-ownership.ts          [CREAR] params de la metodología (dimensions, prompt, charts) — REFERENCIA
    <slug>.ts                       [CREAR x15] una por metodología, mismo shape
  index.ts                          [EDITAR] re-export de engine*

services/workers/src/workers/
  engine-orchestrator.ts            [CREAR] crea engine_analysis y enola el primer step
  engine-step-retrieve.ts           [CREAR] Voyage: arma paquetes de evidencia por dimensión/entidad
  engine-step-code.ts               [CREAR] Opus: codifica unidades → engine_codings
  engine-step-score.ts              [CREAR] SQL: agrega → engine_findings (+ ownership, confidence)
  engine-step-synthesize.ts         [CREAR] arma methodology_block del payload + conclusiones (Opus copy)
  engine-step-quality-gates.ts      [CREAR] corre gates + confidence layer (#16)
  engine-shared.ts                  [CREAR] enqueueEngineStep/markStep* (clon de tb-shared para cola engine)
  index.ts / worker bootstrap       [EDITAR] registrar los nuevos job handlers

apps/studio/src/lib/signal/
  contracts.ts                      [EDITAR] añadir tipos de bloques por metodología + chart contracts
  manifest.ts                       [EDITAR] añadir SignalModuleKey nuevas (1 por familia de charts)
  adapters/engine.ts                [CREAR] adaptEngineSignalPayload() + normalizers por bloque
  build.ts                          [EDITAR] enrutar build por methodology_slug (T&B vs engine_*)

infrastructure/db/
  schema/index.ts                   [EDITAR] tablas engineAnalyses, engineFindings, engineCodings, engineFindingCitations
  migrations/0021_engine_methodologies.sql   [CREAR]
  migrations/meta/_journal.json     [EDITAR] entrada idx 21, tag 0021_engine_methodologies
  seeds/methodologies.ts            [EDITAR/verificar] carga los YAML nuevos

docs/product/10_methodology_seeds/
  <slug>.yaml                       [CREAR x15] manifest cargable por metodología (status: beta)
```

---

## 2. Migración 0021 + schema Drizzle (DDL exacto)

### 2.1 `migrations/0021_engine_methodologies.sql` [CREAR]

```sql
-- Engine comparativo: tablas generalizadas. T&B no se toca.
-- Idempotente (IF NOT EXISTS / DO $$), mismo estilo que 0019/0020.

CREATE TABLE IF NOT EXISTS "engine_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "study_corpus_id" uuid NOT NULL,
  "snapshot_id" uuid,                          -- corpus_snapshots.id (nullable: corre sobre included)
  "methodology_slug" text NOT NULL,            -- 'narrative-ownership' | ...
  "methodology_version" text NOT NULL,
  "pipeline_version" text NOT NULL,
  "status" text NOT NULL DEFAULT 'running',    -- running|needs_review|approved|failed|aborted_preflight
  "current_step" text NOT NULL DEFAULT 'preflight',
  "business_question" text,
  "params" jsonb,                              -- ejes elegidos por el estudio (positioning axes, segments, etc.)
  "limitations" jsonb DEFAULT '[]'::jsonb,
  "executed_by_user_id" uuid,
  "executed_at" timestamp with time zone DEFAULT now(),
  "failed_at" timestamp with time zone,
  "failure_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "engine_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "engine_analysis_id" uuid NOT NULL,
  "study_corpus_id" uuid NOT NULL,
  "methodology_slug" text NOT NULL,
  "finding_key" text NOT NULL,                 -- estable, legible: 'NARR-precio' (como tb_findings.finding_id)
  "entity_id" text,                            -- corpus_entities.id::text o derivado 'category:...'; NULL = cross-entity
  "unit_kind" text NOT NULL,                   -- 'narrative'|'value_cell'|'friction'|'code'|'node'|'segment_cell'|...
  "name" text NOT NULL,
  "dimensions" jsonb NOT NULL DEFAULT '{}'::jsonb,  -- ejes propios de la metodología (ver cada methodologies/<slug>.ts)
  "frequency" integer NOT NULL DEFAULT 0,
  "intensity" numeric(3,2),                    -- 1..5
  "sentiment" numeric(4,3),                    -- -1..1
  "share_pct" numeric(5,2),                    -- 0..100 dentro de su unidad
  "composite_score" numeric(6,3),
  "ownership" text,                            -- brand_owned|competitor_owned|category_wide|shared|insufficient_evidence
  "differentiation_index" numeric(4,3),        -- -1..1
  "confidence" text,                           -- alta|media|baja_direccional
  "confidence_factors" jsonb,                  -- {volume,source_diversity,consistency,recency,citation_quality}
  "period_start" date,
  "period_end" date,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "engine_codings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "engine_analysis_id" uuid NOT NULL,
  "study_corpus_id" uuid NOT NULL,
  "methodology_slug" text NOT NULL,
  "mention_id" uuid,                           -- mentions.id  (uno de mention_id / source_id no nulo)
  "source_id" uuid,                            -- brand_knowledge_sources.id (evidencia no-social)
  "finding_id" uuid,                           -- engine_findings.id (NULL hasta score step)
  "entity_id" text,
  "labels" jsonb NOT NULL DEFAULT '{}'::jsonb, -- salida cruda de Opus: dimensión asignada + valencia + tags
  "intensity" numeric(3,2),
  "span" text,                                 -- fragmento citado (<=400 chars)
  "ambiguous" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "engine_finding_citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "finding_id" uuid NOT NULL,
  "mention_id" uuid,
  "source_id" uuid,
  "is_protagonist" boolean NOT NULL DEFAULT false,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- FKs (DO $$ guard, igual que 0019)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engine_analyses_corpus_fk') THEN
    ALTER TABLE "engine_analyses" ADD CONSTRAINT "engine_analyses_corpus_fk"
      FOREIGN KEY ("study_corpus_id") REFERENCES "public"."study_corpora"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engine_findings_analysis_fk') THEN
    ALTER TABLE "engine_findings" ADD CONSTRAINT "engine_findings_analysis_fk"
      FOREIGN KEY ("engine_analysis_id") REFERENCES "public"."engine_analyses"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engine_codings_analysis_fk') THEN
    ALTER TABLE "engine_codings" ADD CONSTRAINT "engine_codings_analysis_fk"
      FOREIGN KEY ("engine_analysis_id") REFERENCES "public"."engine_analyses"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engine_codings_finding_fk') THEN
    ALTER TABLE "engine_codings" ADD CONSTRAINT "engine_codings_finding_fk"
      FOREIGN KEY ("finding_id") REFERENCES "public"."engine_findings"("id") ON DELETE set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engine_citations_finding_fk') THEN
    ALTER TABLE "engine_finding_citations" ADD CONSTRAINT "engine_citations_finding_fk"
      FOREIGN KEY ("finding_id") REFERENCES "public"."engine_findings"("id") ON DELETE cascade;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS "idx_engine_analyses_corpus" ON "engine_analyses" ("study_corpus_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_engine_analyses_slug" ON "engine_analyses" ("methodology_slug", "status");
CREATE INDEX IF NOT EXISTS "idx_engine_findings_analysis" ON "engine_findings" ("engine_analysis_id", "unit_kind", "position");
CREATE INDEX IF NOT EXISTS "idx_engine_findings_entity" ON "engine_findings" ("engine_analysis_id", "entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_engine_findings_key" ON "engine_findings" ("engine_analysis_id", "finding_key", COALESCE("entity_id",''));
CREATE INDEX IF NOT EXISTS "idx_engine_codings_analysis" ON "engine_codings" ("engine_analysis_id", "finding_id");
CREATE INDEX IF NOT EXISTS "idx_engine_codings_mention" ON "engine_codings" ("mention_id");
CREATE INDEX IF NOT EXISTS "idx_engine_citations_finding" ON "engine_finding_citations" ("finding_id", "position");
```

> **CHECK opcional** (recomendado): `engine_codings` debe tener `mention_id IS NOT NULL OR source_id IS NOT NULL`; igual para `engine_finding_citations`. Añadir como `check()` en Drizzle (§2.2).

### 2.2 `schema/index.ts` [EDITAR] — añadir al final, antes de las relations

```ts
export const engineAnalyses = pgTable("engine_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  studyCorpusId: uuid("study_corpus_id").notNull().references(() => studyCorpora.id, { onDelete: "cascade" }),
  snapshotId: uuid("snapshot_id").references(() => corpusSnapshots.id),
  methodologySlug: text("methodology_slug").notNull(),
  methodologyVersion: text("methodology_version").notNull(),
  pipelineVersion: text("pipeline_version").notNull(),
  status: text("status").notNull().default("running"),
  currentStep: text("current_step").notNull().default("preflight"),
  businessQuestion: text("business_question"),
  params: jsonb("params"),
  limitations: jsonb("limitations").default(sql`'[]'::jsonb`),
  executedByUserId: uuid("executed_by_user_id").references(() => users.id),
  executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow(),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: now(),
  updatedAt: updatedAt()
}, (t) => [
  index("idx_engine_analyses_corpus").on(t.studyCorpusId, t.createdAt),
  index("idx_engine_analyses_slug").on(t.methodologySlug, t.status)
]);

export const engineFindings = pgTable("engine_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  engineAnalysisId: uuid("engine_analysis_id").notNull().references(() => engineAnalyses.id, { onDelete: "cascade" }),
  studyCorpusId: uuid("study_corpus_id").notNull(),
  methodologySlug: text("methodology_slug").notNull(),
  findingKey: text("finding_key").notNull(),
  entityId: text("entity_id"),
  unitKind: text("unit_kind").notNull(),
  name: text("name").notNull(),
  dimensions: jsonb("dimensions").notNull().default(sql`'{}'::jsonb`),
  frequency: integer("frequency").notNull().default(0),
  intensity: numeric("intensity", { precision: 3, scale: 2 }),
  sentiment: numeric("sentiment", { precision: 4, scale: 3 }),
  sharePct: numeric("share_pct", { precision: 5, scale: 2 }),
  compositeScore: numeric("composite_score", { precision: 6, scale: 3 }),
  ownership: text("ownership"),
  differentiationIndex: numeric("differentiation_index", { precision: 4, scale: 3 }),
  confidence: text("confidence"),
  confidenceFactors: jsonb("confidence_factors"),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  position: integer("position").notNull().default(0),
  createdAt: now()
}, (t) => [
  index("idx_engine_findings_analysis").on(t.engineAnalysisId, t.unitKind, t.position),
  index("idx_engine_findings_entity").on(t.engineAnalysisId, t.entityId)
]);

export const engineCodings = pgTable("engine_codings", {
  id: uuid("id").primaryKey().defaultRandom(),
  engineAnalysisId: uuid("engine_analysis_id").notNull().references(() => engineAnalyses.id, { onDelete: "cascade" }),
  studyCorpusId: uuid("study_corpus_id").notNull(),
  methodologySlug: text("methodology_slug").notNull(),
  mentionId: uuid("mention_id").references(() => mentions.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => brandKnowledgeSources.id, { onDelete: "cascade" }),
  findingId: uuid("finding_id").references(() => engineFindings.id, { onDelete: "set null" }),
  entityId: text("entity_id"),
  labels: jsonb("labels").notNull().default(sql`'{}'::jsonb`),
  intensity: numeric("intensity", { precision: 3, scale: 2 }),
  span: text("span"),
  ambiguous: boolean("ambiguous").notNull().default(false),
  createdAt: now()
}, (t) => [
  check("engine_coding_has_source", sql`${t.mentionId} IS NOT NULL OR ${t.sourceId} IS NOT NULL`),
  index("idx_engine_codings_analysis").on(t.engineAnalysisId, t.findingId),
  index("idx_engine_codings_mention").on(t.mentionId)
]);

export const engineFindingCitations = pgTable("engine_finding_citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  findingId: uuid("finding_id").notNull().references(() => engineFindings.id, { onDelete: "cascade" }),
  mentionId: uuid("mention_id").references(() => mentions.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => brandKnowledgeSources.id, { onDelete: "cascade" }),
  isProtagonist: boolean("is_protagonist").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: now()
}, (t) => [index("idx_engine_citations_finding").on(t.findingId, t.position)]);
```

### 2.3 `migrations/meta/_journal.json` [EDITAR]

Añadir al array `entries`:
```json
{ "idx": 21, "version": "7", "when": 1780199270000, "tag": "0021_engine_methodologies", "breakpoints": true }
```

---

## 3. `@noisia/query-engine` — tipos y constantes compartidas

### 3.1 `engine.ts` [CREAR]

```ts
export const ENGINE_QUEUE_NAME = "noisia-engine-analysis";
export const ENGINE_PIPELINE_VERSION = "engine-2026.06.01";

export type EngineMethodologySlug =
  | "competitive-wave" | "value-perception-matrix" | "journey-friction-mapping"
  | "cultural-codes-decoding" | "influence-architecture" | "decision-velocity"
  | "sentiment-advocacy-proxy" | "brand-positioning-map" | "category-opportunity-map"
  | "competitive-tb-matrix" | "narrative-ownership" | "white-space-analysis"
  | "audience-segment-lens" | "trust-risk-benchmark" | "evidence-confidence-layer";

export type EngineStepName =
  | "preflight" | "retrieve" | "code" | "score" | "synthesize" | "quality_gates";

export const ENGINE_STEP_ORDER: EngineStepName[] = [
  "preflight", "retrieve", "code", "score", "synthesize", "quality_gates"
];
export function engineNextStep(s: EngineStepName): EngineStepName | null {
  const i = ENGINE_STEP_ORDER.indexOf(s);
  return i === -1 || i === ENGINE_STEP_ORDER.length - 1 ? null : ENGINE_STEP_ORDER[i + 1]!;
}

export type Confidence = "alta" | "media" | "baja_direccional";
export type Ownership =
  | "brand_owned" | "competitor_owned" | "category_wide" | "shared" | "insufficient_evidence";

/** Resultado crudo de Opus por unidad. SIN agregados. */
export type EngineCodingLabel = {
  external_ref: string;          // mention_id o source_id (echo del input)
  finding_key: string;           // clave estable propuesta por Opus (se normaliza)
  dimensions: Record<string, string | number | boolean>;
  intensity: number;             // 1..5
  span: string;                  // <=400 chars, textual del corpus
  ambiguous?: boolean;
};

/** Contrato que cada methodologies/<slug>.ts exporta. */
export type EngineMethodologySpec = {
  slug: EngineMethodologySlug;
  unitKind: string;                                  // engine_findings.unit_kind
  requiresCompetitors: boolean;
  requiresAuthorsMetadata?: boolean;
  minMentionsPerEntity: number;
  /** Dimensiones que Opus debe devolver, con sus valores permitidos. */
  dimensionSchema: Record<string, { type: "enum" | "number" | "text"; values?: readonly string[] }>;
  /** Construye el prompt de codificación (system+user) dado el paquete de evidencia. */
  buildCodingPrompt(input: EngineCodingPromptInput): string;
  /** Charts que produce el synthesize step (ids del banco, §8). */
  charts: string[];
  /** Gates extra además de los universales (§9). */
  qualityGates: string[];
};

export type EngineCodingPromptInput = {
  brandName: string;
  businessQuestion: string | null;
  params: Record<string, unknown> | null;     // ejes/segmentos elegidos por el estudio
  ragContext?: unknown;                        // de loadEngineRagContext
  units: Array<{ external_ref: string; entity_hint: string | null; text: string; platform: string | null; published_at: string | null }>;
};
```

### 3.2 `engine-scoring.ts` [CREAR] — port verbatim de los umbrales actuales

```ts
import type { Confidence, Ownership } from "./engine";

export function roundPct(v: number) { return Math.round(v * 1000) / 10; }

export function confidenceFromMentions(count: number): Confidence {
  if (count >= 100) return "alta";
  if (count >= 30) return "media";
  return "baja_direccional";
}

export function classifyOwnership(a: {
  total: number; brandMentions: number; competitorMentions: number;
  categoryMentions: number; dominantSharePct: number;
}): Ownership {
  if (a.total < 2 || a.dominantSharePct < 35) return "insufficient_evidence";
  if (a.brandMentions / a.total >= 0.55) return "brand_owned";
  if (a.competitorMentions / a.total >= 0.55) return "competitor_owned";
  if (a.categoryMentions / a.total >= 0.45) return "category_wide";
  return "shared";
}

export function differentiationIndex(shareEntity: number, shareMaxOther: number) {
  return Math.round((shareEntity - shareMaxOther) * 1000) / 1000; // -1..1
}

/** Confidence layer (#16). Devuelve label + factores 0..1. */
export function evidenceConfidence(f: {
  volume: number; distinctSources: number; sentimentVariance: number;
  newestAgeMonths: number; hasProtagonistQuote: boolean;
}): { confidence: Confidence; factors: Record<string, number> } {
  const volume = f.volume >= 100 ? 1 : f.volume >= 30 ? 0.6 : 0.3;
  const source_diversity = Math.min(1, f.distinctSources / 3);
  const consistency = Math.max(0, 1 - f.sentimentVariance);          // var alta ⇒ baja
  const recency = f.newestAgeMonths <= 6 ? 1 : f.newestAgeMonths <= 9 ? 0.6 : 0.3;
  const citation_quality = f.hasProtagonistQuote ? 1 : 0.4;
  const score = 0.30*volume + 0.25*source_diversity + 0.20*consistency + 0.15*recency + 0.10*citation_quality;
  const confidence: Confidence = score >= 0.75 ? "alta" : score >= 0.5 ? "media" : "baja_direccional";
  return { confidence, factors: { volume, source_diversity, consistency, recency, citation_quality } };
}
```

### 3.3 `engine-retrieval.ts` [CREAR] — reusa el vector store existente

```ts
import { embedTexts, vectorLiteral } from "./semantic-rag";
// Ejecutado desde el worker con acceso a `pool`. Firma del helper SQL:
export const ENGINE_TOPK_SQL = `
  SELECT se.mention_id, se.source_id, se.chunk_text,
         1 - (se.embedding <=> $1::vector) AS similarity
  FROM semantic_embeddings se
  WHERE se.study_corpus_id = ANY($2::uuid[])         -- corpus + base_corpus_id
    AND ($3::text IS NULL OR se.scope_type = $3)      -- 'mention' | 'knowledge_source' | NULL=both
  ORDER BY se.embedding <=> $1::vector
  LIMIT $4`;
// El worker: para cada dimensión/entidad arma un query-text, lo embebe con embedTexts({texts,[...]}),
// y trae top-k con ENGINE_TOPK_SQL. Garantiza evidencia comparable por celda antes de codificar.
```

### 3.4 `engine-coding.ts` [CREAR] — prompt genérico + parser

```ts
import { z } from "zod";
import type { EngineMethodologySpec, EngineCodingPromptInput, EngineCodingLabel } from "./engine";

/** Reglas duras de salida, idénticas en estilo a buildPreflightPrompt (tb.ts). */
export function buildEngineCodingPrompt(spec: EngineMethodologySpec, input: EngineCodingPromptInput): string {
  // Devuelve string con: rol, "PRIMER caracter '{' / ULTIMO '}'", esquema de dimensiones del spec,
  // lista de unidades con external_ref, y el contrato JSON de salida { codings: EngineCodingLabel[] }.
  return spec.buildCodingPrompt(input);
}

export const EngineCodingResponse = z.object({
  codings: z.array(z.object({
    external_ref: z.string(),
    finding_key: z.string().min(1),
    dimensions: z.record(z.union([z.string(), z.number(), z.boolean()])),
    intensity: z.number().min(0).max(5),
    span: z.string().max(400),
    ambiguous: z.boolean().optional()
  }))
});

export function parseEngineCodingResponse(raw: string): EngineCodingLabel[] {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return EngineCodingResponse.parse(JSON.parse(json)).codings;
}
```

---

## 4. Pipeline de workers (clon del patrón T&B)

### 4.1 `engine-shared.ts` [CREAR]
Clonar `tb-shared.ts` cambiando la cola a `ENGINE_QUEUE_NAME`, la tabla de pasos a una nueva `engine_pipeline_steps` **o** reusar `tb_pipeline_steps` con una col `engine_analysis_id` nullable (preferido: tabla nueva `engine_pipeline_steps` con mismas columnas; añadir a migración 0021). Exporta `enqueueEngineStep`, `markStepRunning/Completed/Failed`, `releaseCorpusLock`.

### 4.2 Workers (un job por step). Cada uno sigue EXACTO el patrón de `tb-step-5-comparative.ts`:
`markStepRunning → trabajo → persistir → markStepCompleted → enqueueEngineStep(next) → return`; en `catch`: `markStepFailed` + `releaseCorpusLock` + `throw`.

| Worker | Hace | LLM | SQL |
|---|---|---|---|
| `engine-step-retrieve.ts` | por dimensión×entidad arma paquetes de unidades (Voyage top-k) | no | `ENGINE_TOPK_SQL` |
| `engine-step-code.ts` | 1 call Opus por batch de unidades → inserta `engine_codings` | **Opus** (`ANTHROPIC_MODEL_ENGINE`) vía `generateText` | INSERT codings |
| `engine-step-score.ts` | agrega codings → `engine_findings` (frequency, share, ownership via `classifyOwnership`, sentiment AVG, differentiation, confidence) + `engine_finding_citations` (protagonista = mayor intensity) | no | agregación |
| `engine-step-synthesize.ts` | arma `methodology_block` del payload + copys de conclusiones | **Opus** sólo para copy (headline/recommendations) | lee findings |
| `engine-step-quality-gates.ts` | corre gates universales + spec.qualityGates + confidence layer; set `engine_analyses.status` | no | gates |

**Batching de codificación (anti-coste, igual que step-2):** no 1 call por mención. Agrupar por finding candidato/dimensión; ~30–60 unidades por call con sus spans. Opus devuelve labels; SQL propaga y agrega.

### 4.3 Registro del worker
En el bootstrap de `services/workers` (donde se registran los handlers de `noisia-tb-analysis`), registrar un `Worker(ENGINE_QUEUE_NAME, router)` cuyo router mapea `job.name → handler` con los 6 nombres de step (mismo `STEP_JOB_NAME` style).

---

## 5. Orquestación y disparo

`engine-orchestrator.ts` [CREAR] expone `startEngineAnalysis({ studyCorpusId, methodologySlug, params, userId })`:
1. Valida que `study_corpora.methodology_id` resuelve a un slug de la familia (o acepta override).
2. Inserta `engine_analyses` (status `running`, current_step `preflight`).
3. Toma lock del corpus (reusa `study_corpora.locked_by_analysis_id`).
4. `enqueueEngineStep({ engineAnalysisId, step: "preflight" })`.

API route [CREAR] `apps/studio/src/app/api/corpora/[id]/engine/run/route.ts` (POST) → llama al orquestador. (Sigue el patrón de auth de las rutas existentes en `api/corpora/[id]/...`.)

---

## 6. Reparto Voyage + Opus (exacto)

- **Voyage (retrieve step):** modelo `DEFAULT_EMBEDDING_MODEL` ya configurado. Si `hasEmbeddingProvider()===false`, el step **no codifica a ciegas**: marca `limitations += "RAG no disponible; codificación sobre muestra lineal"` y cae a muestreo por `inclusion_status='included' ORDER BY published_at DESC LIMIT N`. Nunca falla por falta de embeddings.
- **Opus (code + synthesize):** `model = process.env.ANTHROPIC_MODEL_ENGINE ?? "claude-opus-4-8"`. Usar `generateText({ model: anthropic(model), prompt, temperature: 0 })`. Output JSON estricto (primer char `{`), parse con `parseEngineCodingResponse`. Reintentar 1 vez si Zod falla (re-prompt "tu salida no fue JSON válido").
- **SQL (score + gates):** todo agregado. Cero números de Opus en el payload.

---

## 7. Output contract — `contracts.ts` y adapter

### 7.1 `contracts.ts` [EDITAR] — tipos compartidos de chart + bloque

```ts
export type EngineChartConfidence = Confidence;

export type EngineChartPoint = {
  x?: number; y?: number; r?: number;
  label: string; entity_id?: string; finding_id?: string;
  value?: number; ownership?: Ownership; confidence: EngineChartConfidence;
  evidence_ids: string[];           // mention_id|source_id → drawer
};
export type EngineChart = {
  block_id: string;                 // 'wave_plot' | 'heatmap' | 'matrix_2x2' | ... (§8)
  title: string;
  axes?: { x?: { label: string }; y?: { label: string } };
  series: Array<{ entity_id?: string; entity_name?: string; points: EngineChartPoint[] }>;
  annotations?: Array<{ kind: string; label: string }>;
  confidence: EngineChartConfidence;
  limitations: string[];
};
export type EngineMethodologyBlock = {
  kind: string;                     // slug, p.ej. "narrative_ownership"
  summary: { headline: string; answer: string; strongest_entity: string | null; benchmark_available: boolean };
  entities: Array<{ entity_id: string; entity_name: string; entity_kind: string; mention_count: number; confidence: Confidence }>;
  charts: EngineChart[];
  findings: Array<{ finding_id: string; title: string; dimensions: Record<string, unknown>; score: number | null; ownership: Ownership | null; evidence_count: number; public_quote: string | null; confidence: Confidence }>;
  conclusions: { key_findings: unknown[]; gaps: unknown[]; recommendations: unknown[] };
  evidence_index: Array<{ finding_id: string; mention_ids: string[] }>;
  limitations: string[];
  confidence_layer: { per_finding: unknown[]; global: Record<string, unknown> };
};
```
`SignalPayloadV2` gana un campo opcional `engine_block?: EngineMethodologyBlock | null`. (No se rompe T&B: queda `null` para slug `triggers-barriers`.)

### 7.2 `manifest.ts` [EDITAR]
Añadir keys a `SignalModuleKey` + `defaultSignalManifest` + `signalModuleMeta` por familia de chart que el front debe poder togglear, p.ej. `"engine_primary_chart"`, `"engine_support_chart"`, `"engine_conclusions"`. (status `"partial"` hasta validar.)

### 7.3 `adapters/engine.ts` [CREAR]
`adaptEngineSignalPayload(payload): EngineDashboardViewModel` — mismo estilo defensivo que `adaptTbSignalPayload` (`asRecord/arrayValue/stringValue/numberValue/coerce*`). Una función `normalize<Slug>Block` por metodología que valida `kind` y rellena defaults. **Reusar los coercers existentes** (`coerceConfidence`, `coerceEntityKind`) exportándolos desde `adapters/tb.ts` o moviéndolos a `adapters/shared.ts`.

### 7.4 `build.ts` [EDITAR] — enrutado
`buildSignalPayload` decide por `corpus.methodologySlug`:
- `triggers-barriers` → camino actual (sin cambios).
- slug de la familia → `buildEngineSignalPayload(state, corpus)` que lee `engine_findings/citations` y arma `engine_block`. Reusa `report/metrics/manifest`. T&B Comparative (#01) y Competitive T/B Matrix (#11) leen de `tb_*` vía un adaptador read-only (no re-codifican).

---

## 8. Banco de charts (props exactas que el front espera)

Registrar en el catálogo (`02_METHODOLOGIES_CATALOG.md` §4) y tipar en `contracts.ts`. Todos consumen `EngineChart` (§7.1); `block_id` define el render:

| block_id | encoding | interacción obligatoria |
|---|---|---|
| `wave_plot` | x,y macro-ejes; r=volumen; zona por cuadrante | hover=breakdown, click=drawer, sliders reponderan ejes |
| `matrix_2x2` | x,y ejes; burbujas por entidad | hover=cita, click=drawer, ejes reconfigurables |
| `heatmap` | filas×cols; color=value | hover=cita, click=drawer, toggle entidad |
| `radar` | ejes=dimensiones; serie por entidad | hover por vértice |
| `force_graph` | nodes+edges (usa `series[0].points` como nodos, `annotations` como meta) | filtro comunidad/entidad, click=drawer |
| `bubble_field` | x,y,r,color | cuadrante highlight, click=drawer |
| `stacked_share` | barras 100% por unidad | hover=segmento→cita |
| `diverging_bar` | value ± respecto a 0 | hover=cita |
| `scatter_effort_impact` | x=effort,y=impact | cuadrante quick-wins |
| `bar_ranking` | value ordenado | click=drawer |
| `timeline` | x=fecha, y=value | brush temporal |
| `gauge` | value vs benchmark | — |
| `confidence_badge` | factores 0..1 | hover=factor limitante |
| `evidence_list` / `tension_card` | citas | click=fuente |

Cada `.md` 01–16 ya declara cuáles usa (sección "Diseño de charts").

---

## 9. Quality gates + confidence layer (#16)

`engine-step-quality-gates.ts` corre, para cada finding y chart:
- **Universales (bloqueantes de publish):** `traceability` (todo finding con ≥1 cita), `confidence_calibrated` (todo finding con `confidence` set via `evidenceConfidence`), `limitations_section` (no vacío si falta entidad/fuente), `no_invented_benchmark` (si `benchmark_available=false`, no hay claims comparativos).
- **Por metodología:** `spec.qualityGates` (p.ej. VPM `balance_per_brand ≥30%`, White Space `absence_evidence` presente).
- Resultado → `engine_analyses.status = needs_review` (si pasa) o deja warnings en `limitations`. **Nada llega a `published_outputs` sin pasar #16.**

`confidence_layer` se embebe en el bloque (§7.1) con `per_finding[]` (de `engineConfidence`) y `global` (counts publishable/directional).

---

## 10. Seeds YAML (registro en `methodologies`)

Una `<slug>.yaml` por metodología en `10_methodology_seeds/` siguiendo el shape Zod existente (`MethodologyManifestSchema`), con `status: beta`, `default_dashboard_blocks` = sus `block_id` de charts, `ai_prompts.coding` = referencia al spec de `methodologies/<slug>.ts`, `quality_gates` = universales + propios. `infrastructure/db/seeds/methodologies.ts` ya los carga (verificar glob).

---

## 11. Metodología de referencia end-to-end: `narrative-ownership`

Implementar **esta primero, completa**, como plantilla viva. Es pura agregación (sin grafo, sin journey) y de prioridad alta.

**`methodologies/narrative-ownership.ts`:**
```ts
import type { EngineMethodologySpec } from "../engine";
export const narrativeOwnership: EngineMethodologySpec = {
  slug: "narrative-ownership",
  unitKind: "narrative",
  requiresCompetitors: true,
  minMentionsPerEntity: 150,
  dimensionSchema: {
    narrative: { type: "text" },                                  // nombre en lenguaje del corpus
    valence:   { type: "enum", values: ["positiva", "negativa", "neutra"] as const }
  },
  buildCodingPrompt(input) {
    // Rol analista Noisia. Reglas JSON duras. Para cada unidad asigna {narrative, valence, intensity, span}.
    // narrative debe emerger del texto (no taxonomía impuesta). Devuelve { codings: [...] }.
    return /* string con el contrato y las units */;
  },
  charts: ["stacked_share", "matrix_2x2", "bar_ranking"],
  qualityGates: ["narrative_emergent_not_imposed", "owned_negative_flagged"]
};
```

**Scoring (engine-step-score):**
- Agrupa codings por `dimensions.narrative`.
- `frequency = COUNT(DISTINCT mention_id)` por (narrativa, entity).
- `share_pct` por entity dentro de la narrativa; `ownership = classifyOwnership({...})`; `sentiment = AVG(sentiment)` con `valence`.
- `owner_entity_id = argmax(share)`; `differentiation_index`.
- citas: top intensity por (narrativa, owner) → `is_protagonist`.

**Synthesize → `engine_block.kind = "narrative_ownership"`:** charts `stacked_share` (narrativa→entidades), `matrix_2x2` (ownership×valencia), `bar_ranking` (huérfanas). `conclusions.key_findings`/`gaps` (owned_negative = alertas).

**Acceptance (ver §13).**

---

## 12. Matriz de parametrización (las 16, para no repetir el framework)

Cada fila se implementa **sólo** escribiendo su `methodologies/<slug>.ts` (dimensionSchema + buildCodingPrompt + charts + gates) y el agregado SQL en score-step. El resto (pipeline, payload, adapter, gates universales, confidence) es compartido.

| slug | unit_kind | requires | dimensions clave (jsonb) | scoring extra | charts | lee de |
|---|---|---|---|---|---|---|
| narrative-ownership | narrative | competidores | narrative, valence | ownership, differentiation | stacked_share, matrix_2x2, bar_ranking | engine_* |
| competitive-tb-matrix | finding | T&B previo | (de tb_findings) | share, ownership por celda | heatmap, bar_ranking, diverging_bar | **tb_*** |
| triggers-barriers (comparative) | finding | T&B previo | polarity, layer | ownership | heatmap, bubble_field, diverging_bar | **tb_*** |
| value-perception-matrix | value_cell | ≥2 competidores | benefit, cost, declared_vs_perceived | ownership_share por celda | matrix, radar, whitespace_overlay | engine_* |
| journey-friction-mapping | friction | journey largo | journey_phase, friction_type, articulable | choke_score, removability | heatmap, timeline, scatter_effort_impact | engine_* |
| cultural-codes-decoding | code | texto largo | level, binary_opposition, maturity | tension_score | waterfall, binary_oppositions, tension_card | engine_* |
| influence-architecture | node | authors metadata | node_role, community, tie_type | centrality (grafo), influence_score | force_graph, top_nodes_cards, sankey | engine_* + authors |
| decision-velocity | factor | narrativa decisión | decision_phase, cognitive_system, factor, polarity | velocity_index | gauge, diverging_bar, hypothesis_cards | engine_* |
| sentiment-advocacy-proxy | mention | volumen | sentiment, emotional_intensity, theme, advocacy_class | advocacy_proxy | diverging_bar, bar_ranking, timeline | engine_* |
| brand-positioning-map | attribute | ≥2 marcas, ejes en params | attribute, axis_value | perceptual_distance | matrix_2x2, radar, bar_ranking | engine_* |
| category-opportunity-map | need | baseline categoría | need, demand_strength, coverage, urgency | opportunity_score | bubble_field, bar_ranking, tension_card | engine_* + base_corpus |
| white-space-analysis | space | demanda+cobertura | demand, competitive_coverage, brand_permission | whitespace_score | bubble_field, bar_ranking, tension_card | engine_* (puede consumir otros) |
| audience-segment-lens | segment_cell | señal de segmento | segment + dims de la envuelta | segment_skew | heatmap, radar, bar_ranking | envuelve otra |
| trust-risk-benchmark | risk_theme | foros queja/prensa | trust_driver\|risk_theme, severity, escalating | trust_score, risk_score | matrix_2x2, bar_ranking, timeline | engine_* |
| competitive-wave | entity | ≥3 entidades | resonance, cultural_ownership, sentiment, decision_velocity, differentiation | macro-ejes normalizados | wave_plot, radar, bar_ranking | agrega otras |
| evidence-confidence-layer | (transversal) | — | volume, source_diversity, consistency, recency, citation_quality | evidenceConfidence() | confidence_badge, bar_ranking | todas |

> `competitive-wave`, `white-space-analysis` y `audience-segment-lens` son **meta**: su score-step consume `engine_findings` ya producidos por otras corridas del mismo corpus (no re-codifican con Opus salvo el eje faltante). `confidence-layer` no es un step propio: es la función `evidenceConfidence` que el score-step de todas llama.

---

## 13. Acceptance criteria (tests que deben pasar)

**DB/migración**
- `pnpm db:migrate` aplica `0021` sin error; `pnpm db:generate` no produce drift contra el schema Drizzle (las tablas Drizzle ↔ SQL coinciden).
- Rollback lógico: `engine_*` con `ON DELETE cascade` desde `engine_analyses`.

**Pipeline (integración, corpus seed)**
- `startEngineAnalysis(narrative-ownership)` recorre `preflight→…→quality_gates`, deja `engine_analyses.status='needs_review'`.
- Sin embeddings (`VOYAGE_API_KEY` ausente) → no crashea; `limitations` contiene el aviso; corre por muestreo.
- Sin corpus competitivo → `benchmark_available=false`, charts comparativos omitidos, `limitations` lo declara (igual que `buildComparativeBrief`).
- Todo `engine_findings` tiene ≥1 `engine_finding_citations` (gate `traceability`) y `confidence` no nulo.
- Cero números provenientes de Opus en el payload (score-step es la única fuente de `frequency/share/ownership`).

**Contrato/render**
- `adaptEngineSignalPayload(payload)` es total (nunca lanza) ante payload parcial — test con `{}`.
- `SignalPayloadV2` mantiene `schema_version: 4`; T&B publica con `engine_block: null` (no regresión: snapshot del payload T&B actual idéntico).
- Cada `EngineChart.points[].evidence_ids` resuelve a `mention_id`/`source_id` reales.

**Unit**
- `classifyOwnership`, `confidenceFromMentions`, `evidenceConfidence`, `differentiationIndex`: tablas de casos en los bordes (total<2, share 0.55, 100/30 menciones, varianza alta).

---

## 14. Orden de implementación (PRs)

1. **PR-1 schema:** migración `0021` + Drizzle + journal + `engine.ts`/`engine-scoring.ts` + tests unit de scoring. (No toca runtime.)
2. **PR-2 pipeline core:** `engine-shared`, `engine-retrieval`, `engine-coding`, los 6 workers, orquestador, API route. Smoke con `narrative-ownership`.
3. **PR-3 contrato+render:** `contracts.ts`, `manifest.ts`, `adapters/engine.ts`, `build.ts` routing. Charts `stacked_share/matrix_2x2/bar_ranking`.
4. **PR-4 reference methodology:** `narrative-ownership.ts` end-to-end + acceptance §13 verdes + seed YAML.
5. **PR-5+:** una metodología por PR siguiendo §12, reusando todo. Empezar por las que leen `tb_*` (#01, #11 — coste IA ~0), luego sentiment, VPM, JFM; dejar influence/decision/wave/meta al final.

---

## 15. Variables de entorno nuevas

```
ANTHROPIC_MODEL_ENGINE=claude-opus-4-8     # detección/codificación del engine (default si ausente)
# VOYAGE_API_KEY ya existe (semantic-embeddings). EMBEDDING_DIMENSIONS=1024 ya fijado.
ENGINE_CODING_BATCH_SIZE=48                 # unidades por call Opus en code-step
ENGINE_RETRIEVE_TOPK=40                     # top-k por dimensión/entidad
```

---

## 16. Resumen para Codex (qué garantiza "sin errores")

- **Un solo modelo de datos** (`engine_*`), un solo pipeline, un solo contrato, un solo adapter. Cada metodología = un archivo `methodologies/<slug>.ts` + su agregado SQL. **No se duplica infraestructura.**
- **Calza con lo existente:** mismas firmas de cola/steps/LLM/embeddings/migraciones/payload. Nada de T&B cambia (se adapta de salida).
- **Honestidad mecánica:** gates universales + confidence layer bloquean publicar sin evidencia o sin confianza; los `limitations[]` se llenan igual que hoy.
- **Voyage recupera, Opus interpreta, SQL puntúa.** Determinismo en todos los números del dashboard.

Cualquier ambigüedad restante se resuelve mirando la metodología `.md` correspondiente (01–16) en esta carpeta: cada una ya trae su marco de 6 piezas, charts y output contract.

---

## 17. Puntos de registro exactos (verificados en el repo)

Cierran el último margen de ambigüedad de PR-1/PR-2.

### 17.1 Worker — `services/workers/src/queues/tb-analysis.ts`
Es un archivo `[CREAR] services/workers/src/queues/engine-analysis.ts` **espejo** de `tb-analysis.ts`:
- Exporta `startEngineAnalysisWorker()` que crea `new Worker(ENGINE_QUEUE_NAME, router, { connection: redisConnection, concurrency: 1 })`.
- El `switch (job.name)` mapea los 6 nombres de step (`engine_step_preflight`, `engine_step_retrieve`, `engine_step_code`, `engine_step_score`, `engine_step_synthesize`, `engine_quality_gates`) + `engine_run_analysis` → handlers.
- Reusa `redisConnection` de `./query-engine` (no crear conexión nueva).
- **`[EDITAR] services/workers/src/index.ts`**: ahí se llama `startTbAnalysisWorker()`. Añadir junto a él la llamada a `startEngineAnalysisWorker()`. (Verificar el símbolo exacto: `index.ts` es el bootstrap que arranca los workers.)
- `concurrency: 1` igual que T&B (rate-limit safe con Opus; los steps son largos).

### 17.2 Seed loader — `infrastructure/db/seeds/methodologies.ts`
- **NO es recursivo**: hace `readdir(seedsDir)` con `seedsDir = resolve(process.cwd(), "../../docs/product/10_methodology_seeds")` y filtra `.yaml`. **No entra a subcarpetas.**
- ⇒ Los `<slug>.yaml` nuevos van en `docs/product/10_methodology_seeds/` (el **directorio padre**, junto a `triggers-barriers.yaml`), **no** dentro de `engine_comparative/`. Los `.md` de `engine_comparative/` quedan ignorados por el seed (correcto).
- El loader ya valida `slug/name/version/status` y hace `onConflictDoUpdate` por `(slug, version)`. No hay que tocar el loader: basta con depositar los YAML en el padre. (El `MethodologyManifest` type del loader es laxo; el shape rico vive en el YAML.)
- `status: beta` en los YAML hace que NO entren al conteo de `active` (el loader filtra `status='active'` al final) — seguro para no exponerlos en UI antes de tiempo.

### 17.3 Cola/conexión
- `ENGINE_QUEUE_NAME = "noisia-engine-analysis"` (definido en `engine.ts`, §3.1) — cola **separada** de `noisia-tb-analysis` y del query-engine, por la misma razón documentada en `tb-analysis.ts` (steps largos no deben starvar otros jobs).
- `enqueueEngineStep` (en `engine-shared.ts`) instancia su propio `Queue(ENGINE_QUEUE_NAME, { connection: redisConnection })`, igual que `getTbQueue()` en `tb-shared.ts`.
</content>
</invoke>
