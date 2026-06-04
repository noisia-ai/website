# 13 · White Space Analysis

`slug: white-space-analysis` · status: nuevo · prioridad: **media**

> Cruza necesidades fuertes vs baja cobertura competitiva → espacios estratégicos, especialmente para una marca pequeña.

---

## Resumen (formato cliente)

- **Nombre:** White Space Analysis
- **Objetivo:** Encontrar espacios estratégicos: necesidades/atributos/narrativas con demanda alta y ocupación competitiva baja, dimensionados por accionabilidad para la marca.
- **Cuándo se usa:** estrategia para retador/marca pequeña, diferenciación, priorización de dónde competir.
- **Entidades comparadas:** demanda de categoría vs cobertura de todos los competidores; la marca como candidata a ocupar.
- **Inputs necesarios:** baseline de categoría + corpus competitivo atribuido.
- **Dimensiones/ejes:** necesidad/atributo/narrativa × demanda × cobertura competitiva × **permiso de marca** (¿la marca tiene credibilidad para ocuparlo?).
- **Cómo se puntúa:** `whitespace_score = demand · (1 − competitive_coverage) · brand_permission`. Permiso = afinidad existente de la marca con ese espacio.
- **Outputs esperados:** mapa de whitespace priorizado, espacios capturables vs aspiracionales, evidencia de ausencia, plan de ocupación.
- **Ejemplo de insight:** *"'Atención humana sin bot' tiene demanda 0.8, cobertura 0.1 y permiso de tu marca 0.6: whitespace capturable #1. 'Premium de lujo' tiene demanda pero permiso 0.05 — aspiracional, no para ti ahora."*
- **Prioridad:** media (síntesis de VPM/Positioning/Category Opportunity con la lente "para esta marca").

## Marco técnico

- **entity:** categoría + competidores + marca (candidata).
- **unit of analysis:** espacio (necesidad/atributo/narrativa) — puede consumir outputs de #03/#09/#10/#12.
- **dimensions:** `demand`, `competitive_coverage`, `brand_permission`, `whitespace_score` → `engine_findings.dimensions`.
- **scoring:** fórmula arriba; `brand_permission` = share/sentiment actual de la marca en espacios adyacentes.
- **evidence:** citas de demanda + ausencia de oferta + permiso de marca.
- **output contract:** `methodology_blocks.white_space`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** **dos lados** — evidencia de demanda y evidencia de baja cobertura. Un whitespace sin prueba de ausencia es conjetura (quality gate, igual que en el seed VPM: `whitespace identificado con evidencia de ausencia, no sólo conjetura`).
- **Para "real":** corpus competitivo amplio para que "cobertura baja" signifique algo. `base_corpus_id` para la demanda de categoría.
- Puede correr como **meta-metodología** que consume findings ya producidos por VPM/Narrative/Category Opportunity (no re-codifica).

## Voyage + Opus

- Voyage: confirma ausencia — busca activamente menciones de oferta en ese espacio; si no las recupera, refuerza el whitespace.
- Opus: valida permiso de marca (¿el corpus le daría credibilidad?) y distingue whitespace capturable de aspiracional.

## Diseño de charts

1. **Chart primario — `bubble_field` demanda × cobertura** con color = brand_permission. Cuadrante demanda-alta/cobertura-baja resaltado; burbujas con permiso alto brillan. Hover/click = evidencia de ambos lados.
2. **Chart soporte — `bar_ranking` por whitespace_score.**
3. **Chart evidencia — `tension_card` por espacio:** demanda (cita) + ausencia (qué NO se encontró) + permiso (cita de afinidad).

**Conclusiones:** `capturable[]`, `aspirational[]`, `defend[]` (whitespace que la marca ya ocupa y debe proteger), `occupation_plan[]`.

## Output contract

```jsonc
"white_space": {
  "kind": "white_space_analysis",
  "spaces": [ { "space","demand","competitive_coverage","brand_permission","whitespace_score",
     "classification":"capturable|aspirational|defend","evidence_ids":[...],"absence_evidence":"...","confidence" } ],
  "occupation_plan": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Whitespace sin evidencia de ausencia no se publica. Permiso de marca bajo → marcar aspiracional, no recomendable ahora. Capa #16.
</content>
</invoke>
