# 01 · T&B Comparative Dashboard

`slug: triggers-barriers` (vista comparativa) · status: **existe v1, enriquecer** · prioridad: **alta**

> Ya tenemos primera versión (`tb-step-5-comparative.ts`, `ComparativeDashboardPayload`). Falta enriquecer con mejores charts, benchmarks y confidence scoring. Es la metodología ancla: el resto de la familia hereda su patrón de ownership.

---

## Resumen (formato cliente)

- **Nombre:** Triggers & Barriers — Comparative Dashboard
- **Objetivo:** Comparar qué **triggers** (motivadores) y **barriers** (frenos) domina cada entidad, y dónde la marca tiene permiso real para actuar.
- **Cuándo se usa:** defensa competitiva no-precio, activación de comunicación, priorización de fricciones a remover.
- **Entidades comparadas:** marca primaria vs pool competitivo / competidores individuales vs categoría (baseline).
- **Inputs necesarios:** corpus 800–5000 menciones, ≥3 fuentes, window ≤9 meses, **atribución por entidad en `import_batches`** (sin esto no hay comparativo, sólo lectura absoluta).
- **Dimensiones/ejes:** polarity (trigger/barrier) × layer (psicológico/personal/social/cultural) × ownership (brand/competitor/category/shared).
- **Cómo se puntúa:** por finding → `frecuencia`, `intensidad_promedio`, `capacidad_predictiva`, `score_compuesto`, `movilidad`; ownership vía `classifyOwnership()` (umbrales 0.55/0.45/35%); confidence por volumen.
- **Outputs esperados:** matriz finding×entidad, rankings de ownership, decision field, action cards, comparative brief con whitespace y gaps.
- **Ejemplo de insight:** *"El trigger 'rendimiento que rinde' lo posee la categoría, no tu marca (share 0.61 categoría vs 0.18 marca): disputarlo es caro; mejor reinterpretarlo."*
- **Prioridad:** alta — ya en producción, sólo enriquecer.

## Marco técnico

- **entity:** `corpus_entities` resuelto vía `import_batches.entity_kind/competitor_id`.
- **unit of analysis:** **finding** (`tb_findings`) y mención codificada (`tb_mention_codings`).
- **dimensions:** `polarity`, `layer`, `movilidad` (ya columnas reales).
- **scoring:** `score_compuesto` existente + `ownership` + `differentiation_index` (nuevo: `share_brand − share_max_competidor`).
- **evidence:** `tb_finding_citations` (`is_protagonist`).
- **output contract:** `ComparativeDashboardPayload` (ya definido) — se extiende con charts §abajo.

## Datos y qué necesita para un resultado real

- **Imprescindible:** menciones atribuidas a marca **y** competencia. `buildComparativeBrief()` ya degrada con `limitations[]` si falta marca/competencia/categoría — mantener esa honestidad.
- **Para "real":** ≥30 menciones por entidad por finding para que el ownership no sea `insufficient_evidence`.
- **Fuentes:** social + foros de queja (barriers) + reviews 1–3★ (balancea triggers/barriers; failure mode conocido: corpus sólo de reviews positivas).

## Voyage + Opus

- Voyage recupera, por finding, pasajes de competencia y categoría para que Opus compare sin re-leer todo el corpus.
- Opus ya hace pasos 1–6; el comparativo es determinista sobre sus codings. No se le pide "quién gana" — lo decide el SQL de share.

## Diseño de charts (enriquecimiento sobre v1)

1. **Chart primario — `heatmap` finding × entidad** (color = share_pct, badge = ownership). Hover = cita protagonista; click = drawer de evidencia. Reemplaza la tabla plana actual.
2. **Chart soporte — `bubble_field` (Decision Field)** ya existe (`tb_decision_field_nodes`): x=movilidad, y=intensidad, r=frecuencia, color=polarity. Agregar capa de **comparación**: contorno por entidad dominante.
3. **Chart evidencia — `diverging_bar` triggers vs barriers por entidad** + `bar_ranking` de ownership.

**Conclusiones:** `brand_owned_triggers`, `competitor_owned_triggers`, `category_wide_barriers`, `whitespace`, `gaps_accionables` (ya en el brief) — cada uno como card con cita y confianza.

## Output contract

Extiende `ComparativeDashboardPayload` con `charts: [...]` y `confidence` por fila de `entity_finding_matrix`. Añadir `differentiation_index` por finding.

## Confianza / limitaciones

Reusa `limitations[]` del brief actual + capa #16. No declarar "benchmark" si `benchmark_available=false`.
</content>
</invoke>
