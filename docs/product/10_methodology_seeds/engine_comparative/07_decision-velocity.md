# 07 · Decision Velocity

`slug: decision-velocity` · status: seed beta → diseño · prioridad: **baja**

> Qué acelera o frena una decisión de compra: fricción, confianza, claridad, precio, reputación, disponibilidad, comparación — por journey y por entidad.

---

## Resumen (formato cliente)

- **Nombre:** Decision Velocity
- **Objetivo:** Diagnosticar por qué el consumidor decide rápido o lento, y qué arquitectura de elección altera esa velocidad.
- **Cuándo se usa:** optimización de funnel, choice architecture, categorías de alta deliberación.
- **Entidades comparadas:** marca vs categoría/competidores (¿quién genera decisiones más veloces?).
- **Inputs necesarios:** corpus 1,000–3,000 **narrativo** (describe el proceso de decisión): reviews de comparación, YouTube/TikTok comparativas, foros. Ideal: data de funnel del cliente.
- **Dimensiones/ejes:** **fase** {initiation, evaluation, commitment} × **sistema** (Kahneman) {sistema 1 intuitivo, sistema 2 deliberativo} × factor {fricción, confianza, claridad, precio, reputación, disponibilidad, comparación}.
- **Cómo se puntúa:** por (fase × factor × entidad) → es blocker o accelerator; `velocity_index` = balance accelerators−blockers ponderado por intensidad.
- **Outputs esperados:** diagnóstico de velocidad vs benchmark, slowdown causes, speedup levers, recomendaciones de arquitectura, hipótesis A/B.
- **Ejemplo de insight:** *"Tu categoría es lenta en 'evaluation' por exceso de comparación (sistema 2 saturado); el competidor acelera con prueba social en commitment — palanca: simplificar la comparación, no añadir features."*
- **Prioridad:** baja (requiere data narrativa sofisticada; evaluar post-MVP).

## Marco técnico

- **entity:** marca vs categoría/competidores.
- **unit of analysis:** factor de decisión articulado en una mención.
- **dimensions:** `decision_phase`, `cognitive_system`, `factor`, `polarity` (blocker/accelerator) → `engine_findings.dimensions`.
- **scoring:** `velocity_index` por entidad/fase = `Σ(accelerator·intensity) − Σ(blocker·intensity)` normalizado; benchmark = vs categoría.
- **evidence:** citas de relato de decisión.
- **output contract:** `methodology_blocks.decision_velocity` (stub: `rows[{journey_phase,blockers,accelerators,dominant_entity}]`).

## Datos y qué necesita para un resultado real

- **Imprescindible:** narrativa de proceso ("dudé porque…", "me decidí cuando…"). Pre-flight valida densidad narrativa. Reviews de estrella sin texto no sirven.
- **Para "real":** la velocidad es **inferida** del relato, no medida — salvo que el cliente suba data de funnel (`brand_knowledge_sources`), entonces se calibra. Se marca declarado vs medido.
- Benchmark de velocidad por vertical vive en `memory_industry`.

## Voyage + Opus

- Voyage: recupera relatos de decisión por factor; los blockers están dispersos.
- Opus: codifica cada factor a (fase, sistema 1/2, blocker/accelerator, intensidad) + deriva hipótesis A/B testeables.

## Diseño de charts

1. **Chart primario — `gauge` de velocidad + matriz 3 fases × 2 sistemas.** Gauge vs benchmark; debajo, matriz mostrando dónde se concentra la fricción cognitiva. Hover/click = evidencia.
2. **Chart soporte — `bar_ranking` diverging de slowdowns vs speedups** por factor (blockers a la izquierda, accelerators a la derecha).
3. **Chart evidencia — `hypothesis_cards`.** Cada palanca como hipótesis A/B testeable (qué cambiar, qué medir).

**Conclusiones:** `velocity_diagnosis`, `slowdown_causes[]`, `speedup_levers[]`, `architecture_recommendations[]`, `ab_hypotheses[]`.

## Output contract

```jsonc
"decision_velocity": {
  "kind": "decision_velocity",
  "velocity_index": {"brand","category_benchmark"},
  "factors": [ { "phase","cognitive_system","factor","polarity","intensity","entity_id","evidence_ids":[...],"confidence" } ],
  "levers": [...], "ab_hypotheses": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Velocidad declarada ≠ medida sin data de funnel. Hipótesis A/B son para testear, no conclusiones. Capa #16.
</content>
</invoke>
