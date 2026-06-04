# Noisia Engine — Familia de Metodologías Comparativas Reutilizables

> **Marco técnico compartido.** No es un engine de industria único: es una **familia de lentes comparativas** que consumen el mismo modelo base (`corpus + entities + baseline + findings + citations`). Cada metodología sólo cambia **cómo agrupa, puntúa y visualiza**. Este documento define el contrato común; cada `NN_<slug>.md` de esta carpeta lo especializa.
>
> Estado: **diseño** (no implementación). Sirve para definir qué entra al engine, qué necesita cada metodología para dar un resultado real, y cómo se chartea.

---

## 1. El modelo base (ya existe en la BD)

Todas las metodologías leen de las mismas tablas. No se inventa esquema nuevo salvo donde se indique `[requiere migración]`.

| Concepto del marco | Tabla / columna real | Notas |
|---|---|---|
| **Estudio / corpus** | `study_corpora` | `business_question`, `decision_to_inform`, `audience_segment`, `geo_focus`, `methodology_id`, `base_corpus_id` (reuso de baseline) |
| **Entity** (marca, competidor, categoría, segmento) | `corpus_entities` | `entity_kind` ∈ {`primary_brand`,`competitor`,`category`}; `is_category_baseline`; `aliases`, `handles`, `query_seeds`, `priority` |
| **Atribución entity ↔ data** | `import_batches.entity_kind` / `.competitor_id` / `.corpus_entity_id` / `.entity_label` | Cada lote de ingesta queda atado a una entidad. Es lo que hace posible el comparativo (`tb-step-5-comparative.ts`) |
| **Unit of analysis base** | `mentions` | `platform`, `published_at`, `sentiment_score`, `engagement` (jsonb), `author_id`, `country`, `language`, `inclusion_status`, `quality_score`, `text_clean` |
| **Autor / nodo** | `authors` | `handle`, `follower_count_last_seen`, `is_verified`, `is_business`, `platform`, `inferred_country/gender` |
| **Finding** (unidad interpretada) | `tb_findings` | `polarity`, `layer`, `frecuencia`, `intensidad_promedio`, `capacidad_predictiva`, `score_compuesto`, `movilidad`, `confidence`, `period_start/end` |
| **Coding** (mención → finding) | `tb_mention_codings` | `polarity`, `layer`, `intensity_score`, `emergent_tags`, `ambiguous` |
| **Evidence / citation** | `tb_finding_citations` | `is_protagonist`, `position` → liga finding a `mentions` |
| **Baseline reutilizable** | `study_corpora.base_corpus_id` | Un corpus de categoría/industria que varios estudios comparten como punto de comparación |
| **Memoria** | `memory_industry`, `memory_brand` | Patrones por vertical y por marca; consultados vía RAG |
| **Fuentes no-social** | `brand_knowledge_sources` | `source_kind`, `raw_text`, `extracted_payload`, `source_period_start/end` — docs, reviews CSV, transcripts, surveys, PDFs |
| **Output publicado** | `published_outputs.payload` (jsonb) | El contrato que Signal renderiza (`SignalPayloadV2`, `contracts.ts`) |

> **Decisión de diseño:** `tb_findings` / `tb_mention_codings` / `tb_finding_citations` hoy son específicas de T&B. Para la familia se generalizan a **`engine_findings` / `engine_codings` / `engine_finding_citations`** con una columna `methodology_slug` y un `dimensions jsonb` libre por metodología. Cada `.md` indica qué guarda en `dimensions`. **No se duplica una tabla por metodología.** (Ver §7.)

---

## 2. El marco técnico de 6 piezas

Cada metodología se define respondiendo **exactamente estas 6 preguntas**. Es el contrato que hace la familia reutilizable.

1. **entity** — ¿qué se compara? (`corpus_entities.entity_kind` + `is_category_baseline`, o un segmento derivado).
2. **unit of analysis** — ¿cuál es la pieza atómica? (mención, finding, trigger, fase de journey, nodo/autor, código cultural, narrativa, segmento…).
3. **dimensions** — ¿qué ejes/variables se miden? (se guardan en `engine_findings.dimensions`).
4. **scoring** — ¿cómo se calcula fuerza / frecuencia / sentimiento / confianza / diferenciación? (fórmulas deterministas en SQL sobre lo que Opus codificó).
5. **evidence** — ¿qué citas/posts sostienen cada conclusión? (`engine_finding_citations` → `mentions` / `brand_knowledge_sources`).
6. **output contract** — ¿qué tablas/charts/cards renderiza Signal? (forma JSON dentro de `published_outputs.payload`).

---

## 3. Reparto de trabajo IA ↔ determinista (Voyage + Opus + SQL)

El principio: **Opus interpreta, SQL puntúa, Voyage recupera.** Nunca se le pide a Opus que "cuente" — se le pide que clasifique; el conteo y el score son SQL reproducible.

```
                 ┌─────────────────────────────────────────────┐
   INGESTA       │ mentions (social listening)                 │
   multi-fuente  │ brand_knowledge_sources (docs/reviews/CSV/  │
                 │   transcripts/surveys/editorial/PDF)        │
                 └───────────────┬─────────────────────────────┘
                                 │  chunk + embed
                 ┌───────────────▼─────────────────────────────┐
   VOYAGE AI     │ voyage-3 embeddings → vector store          │
   (RAG)         │ - retrieval semántico por dimensión         │
                 │ - dedup / clustering de unidades            │
                 │ - memoria industry/brand como contexto      │
                 └───────────────┬─────────────────────────────┘
                                 │  top-k pasajes por dimensión/entidad
                 ┌───────────────▼─────────────────────────────┐
   CLAUDE OPUS   │ pases de codificación cualitativa:          │
   (detección)   │ - clasifica unidad → dimensión/layer/code   │
                 │ - asigna intensidad (1–5), polaridad        │
                 │ - extrae cita protagonista + razón          │
                 │ devuelve SOLO labels + spans, NO agregados  │
                 └───────────────┬─────────────────────────────┘
                                 │  filas en engine_codings
                 ┌───────────────▼─────────────────────────────┐
   SQL/TS        │ scoring determinista y reproducible:        │
   (agregación)  │ frecuencia, share, ownership, sentiment,    │
                 │ differentiation, confidence (ver §4)        │
                 └───────────────┬─────────────────────────────┘
                                 │
                 ┌───────────────▼─────────────────────────────┐
   OUTPUT        │ published_outputs.payload → Signal charts   │
                 └─────────────────────────────────────────────┘
```

**Por qué Voyage:** permite que el corpus sea heterogéneo (no sólo posts). Embebemos menciones **y** chunks de `brand_knowledge_sources.raw_text`, así una review larga, un transcript de soporte o una encuesta abierta entran al mismo espacio semántico y se recuperan por dimensión sin depender de keywords. También sostiene `memory_industry/brand` como contexto recuperable.

**Por qué Opus:** la clasificación a dimensiones simbólicas/psicológicas (layer cultural, tipo de fricción, código, narrativa) no es regex — requiere lectura. Opus codifica **una unidad a la vez con su contexto recuperado**, devuelve label + span + intensidad + cita. Nunca produce los números del dashboard.

---

## 4. Scoring común (fórmulas reutilizables)

Estas primitivas viven una sola vez y todas las metodologías las llaman. Los umbrales **ya están en código** (`tb-step-5-comparative.ts`) y se respetan.

| Métrica | Fórmula | Origen |
|---|---|---|
| **Frecuencia** | `COUNT(DISTINCT mention_id)` por unidad | `engine_codings` |
| **Share of voice (entity)** | `mentions_entity / total_mentions_unidad` | normalizado por unidad |
| **Intensidad** | `AVG(intensity_score)` 1–5 que asigna Opus | `engine_codings.intensity_score` |
| **Sentimiento** | `AVG(mentions.sentiment_score)` (-1..1) o proxy Opus si falta | `mentions.sentiment_score` |
| **Ownership** | `brand≥0.55→brand_owned`, `competitor≥0.55→competitor_owned`, `category≥0.45→category_wide`, `dominant_share<35% o total<2 → insufficient_evidence`, resto `shared` | `classifyOwnership()` existente |
| **Differentiation index** | `share_entity − share_max_otra_entity` (rango -1..1) | derivado |
| **Composite / fuerza** | `z(frecuencia)·w_f + intensidad·w_i + capacidad_predictiva·w_p` | patrón de `score_compuesto` |
| **Confidence** | `≥100 menciones→alta`, `≥30→media`, `<30→baja_direccional`; **degrada** si <2 fuentes o recencia >9m | `confidenceFromMentions()` existente |

> **Capa de confianza transversal** (= metodología #16, `16_evidence-confidence-layer.md`): cada chart y cada card lleva un `confidence` calculado con volumen + diversidad de fuentes + consistencia + recencia. Ningún output se publica sin él. Las demás metodologías **importan** esta capa; no la reimplementan.

---

## 5. Fuentes de datos: social listening **y** más

El engine no asume social listening. Cada metodología declara su `source_mix` mínimo. Tipos soportados (vía `mentions.source_system/platform` y `brand_knowledge_sources.source_kind`):

| Fuente | Entra como | Buena para |
|---|---|---|
| Social listening (X, TikTok, IG, foros, Reddit, Discord) | `mentions` | volumen, cultura, influencia, sentimiento |
| Reviews / marketplaces (CSV) | `mentions` o `brand_knowledge_sources` | fricción, valor, trust |
| Transcripts de soporte / call center | `brand_knowledge_sources` (`source_kind=support_transcript`) | journey, fricción, trust/risk |
| Encuestas abiertas / verbatims | `brand_knowledge_sources` (`survey`) | NPS proxy, valor, positioning |
| Editorial / prensa / blogs | `brand_knowledge_sources` (`editorial`) | narrativa, códigos culturales |
| PDFs de research previo, decks | `brand_knowledge_sources` (`document`) | memoria, contexto, baseline |

**Regla de honestidad:** cada metodología dice explícitamente **qué necesita para un resultado real** y qué pasa si falta (sección "Qué necesita para un resultado real" en cada `.md`). Si no hay corpus competitivo atribuido, los comparativos degradan a direccional, no inventan benchmark — exactamente como hace `buildComparativeBrief()` con sus `limitations[]`.

---

## 6. Sistema de charting (interactivo, reutilizable)

Las metodologías **no** inventan librería por estudio. Hay un **banco de bloques** (extiende `default_dashboard_blocks` del catálogo). Convenciones de diseño:

- **Interactivo por defecto:** hover = cita/evidencia; click = abre `evidence drawer` con los posts/citas que sostienen ese punto (vía `engine_finding_citations`).
- **Cada chart liga a evidencia.** No hay número sin `finding_id`/`mention_id` detrás. (Trazabilidad = quality gate.)
- **Cada bloque lleva su `confidence` visible** (badge alta/media/direccional).
- **2–3 charts + bloques de conclusión por metodología.** El patrón estándar de cada `.md`:
  1. **Chart primario** (la firma visual: matriz/wave/heatmap/grafo).
  2. **Chart de soporte** (ranking/scatter/serie temporal).
  3. **(Opcional) Chart de evidencia/distribución.**
  4. **Bloques de conclusión:** `headline`, `key_findings[]` (card con cita), `gaps/whitespace`, `recommendations[]`, `limitations[]`.

Tipos de chart del banco (todos con drill-to-evidence):

`matrix_2x2`, `wave_plot`, `heatmap`, `force_graph`, `radial/radar`, `scatter_effort_impact`, `bar_ranking`, `diverging_bar` (sentiment), `gauge`, `timeline`, `waterfall`, `stacked_share`, `bubble_field`, `sankey/flow`, `evidence_list`, `tension_card`, `confidence_badge`.

Forma genérica de un chart en el payload:

```jsonc
{
  "block_id": "matrix_2x2",
  "title": "…",
  "axes": { "x": {...}, "y": {...} },
  "series": [ { "entity_id", "entity_name", "points": [ { "x","y","r","label","finding_id","confidence","evidence_ids":[...] } ] } ],
  "annotations": [ { "kind":"whitespace|leader|tension", "label", "region" } ],
  "confidence": "alta|media|baja_direccional",
  "limitations": ["…"]
}
```

---

## 7. Contrato de output común

Cada metodología extiende `SignalPayloadV2` (`contracts.ts`) con un bloque propio bajo `methodology_blocks.<slug>` (hoy ya existen stubs para vpm/jfm/cultural_codes/influence/decision_velocity). El bloque por metodología tiene **siempre**:

```jsonc
{
  "kind": "<slug>",
  "summary": { "headline", "answer", "strongest_entity", "benchmark_available": bool },
  "entities": [ { "entity_id","entity_name","entity_kind","mention_count","confidence" } ],
  "charts": [ /* §6 */ ],
  "findings": [ { "finding_id","title","dimensions":{...},"score","ownership","evidence_count","public_quote","confidence" } ],
  "conclusions": { "key_findings":[...], "gaps":[...], "recommendations":[...] },
  "evidence_index": [ { "finding_id","mention_ids":[...] } ],
  "limitations": ["…"],
  "confidence_layer": { /* metodología #16 */ }
}
```

Esquema de tablas generalizado (una migración, sirve a todas):

```sql
-- [requiere migración] engine_findings: generaliza tb_findings
engine_findings(id, study_corpus_id, methodology_slug, entity_id NULL,
  unit_kind text, name text, dimensions jsonb,           -- ejes propios de la metodología
  frequency int, intensity numeric, sentiment numeric,
  composite_score numeric, ownership text, confidence text,
  period_start date, period_end date, ...)
engine_codings(id, study_corpus_id, methodology_slug, mention_id|source_chunk_id,
  finding_id, entity_id, labels jsonb, intensity numeric, span text, ambiguous bool)
engine_finding_citations(id, finding_id, mention_id|source_id, is_protagonist, position)
```

T&B se mantiene como está (ya en producción); las metodologías nuevas nacen sobre `engine_*`. Un adaptador expone T&B en el mismo contrato para que Signal renderice todo igual.

---

## 8. Índice de la familia

| # | Archivo | Metodología | Reusa de | Prioridad |
|---|---|---|---|---|
| 01 | `01_tb-comparative-dashboard.md` | T&B Comparative Dashboard | T&B (existe) | Alta |
| 02 | `02_competitive-wave.md` | Competitive / Market Wave | findings + entities | Alta |
| 03 | `03_value-perception-matrix.md` | VPM Profundo | VPM seed | Alta |
| 04 | `04_journey-friction-mapping.md` | JFM Completo | JFM seed | Alta |
| 05 | `05_cultural-codes.md` | Cultural Codes | CC seed | Media |
| 06 | `06_influence-architecture.md` | Influence Architecture | authors + IA seed | Media |
| 07 | `07_decision-velocity.md` | Decision Velocity | DV seed | Baja |
| 08 | `08_sentiment-advocacy-proxy.md` | Sentiment / NPS Proxy | sentiment | Alta |
| 09 | `09_brand-positioning-map.md` | Brand Positioning Map | dimensions | Media |
| 10 | `10_category-opportunity-map.md` | Category Opportunity Map | whitespace | Media |
| 11 | `11_competitive-tb-matrix.md` | Competitive T/B Matrix | T&B + entities | Alta |
| 12 | `12_narrative-ownership.md` | Narrative Ownership | ownership | Alta |
| 13 | `13_white-space-analysis.md` | White Space Analysis | needs×coverage | Media |
| 14 | `14_audience-segment-lens.md` | Audience / Segment Lens | segmento | Media |
| 15 | `15_trust-risk-benchmark.md` | Trust & Risk Benchmark | sentiment+risk | Media |
| 16 | `16_evidence-confidence-layer.md` | Evidence Quality / Confidence | transversal | Alta |

Cada `.md` sigue el mismo template: **Resumen (formato cliente) → Marco técnico (6 piezas, mapeado a tablas) → Datos y qué necesita para un resultado real → Voyage+Opus → Diseño de charts → Output contract → Confianza/limitaciones**.
</content>
</invoke>
