# 10 · Category Opportunity Map

`slug: category-opportunity-map` · status: nuevo · prioridad: **media**

> Detecta espacios no ocupados o mal servidos dentro de la industria y quién podría capturarlos.

---

## Resumen (formato cliente)

- **Nombre:** Category Opportunity Map
- **Objetivo:** Identificar oportunidades de categoría (necesidades fuertes mal atendidas) dimensionadas por tamaño, urgencia y evidencia.
- **Cuándo se usa:** estrategia de innovación, roadmap de producto, entrada a categoría, expansión de portafolio.
- **Entidades comparadas:** categoría (baseline) vs cobertura de cada marca.
- **Inputs necesarios:** corpus de categoría amplio (baseline reutilizable, `base_corpus_id`) + corpus de marcas para medir cobertura.
- **Dimensiones/ejes:** necesidad/tema × (fuerza de demanda) × (cobertura competitiva) × urgencia.
- **Cómo se puntúa:** `opportunity_score = demand_strength · (1 − coverage) · urgency`; tamaño = volumen de la necesidad; cobertura = share de marcas que la atienden bien (sentiment positivo).
- **Outputs esperados:** mapa de oportunidades (bubble), ranking por score, evidencia de demanda no atendida, qué entidad está mejor posicionada para capturar.
- **Ejemplo de insight:** *"'Servicio post-venta en español real' tiene demanda alta (1,200 menciones), cobertura 0.12 y urgencia creciente: oportunidad #1, y tu marca ya tiene permiso parcial."*
- **Prioridad:** media.

## Marco técnico

- **entity:** categoría + marcas (cobertura).
- **unit of analysis:** necesidad/tema de categoría (cluster de menciones de demanda).
- **dimensions:** `need`, `demand_strength`, `coverage`, `urgency` → `engine_findings.dimensions`.
- **scoring:** `opportunity_score` (arriba); `coverage` = `Σ share marcas que la sirven con sentiment>0`; `urgency` = tendencia temporal de la demanda.
- **evidence:** citas de demanda insatisfecha.
- **output contract:** `methodology_blocks.category_opportunity`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** baseline de categoría robusto (no sólo el corpus de la marca). Aquí brilla `base_corpus_id` (un corpus de industria compartido entre estudios).
- **Para "real":** cobertura requiere atribución de marcas; sin ella sólo se mide demanda (mitad del insight). Demanda + cobertura juntas = oportunidad real, no wishlist.
- Multi-fuente eleva validez: una necesidad confirmada en social **y** reviews **y** soporte es más sólida que en un canal.

## Voyage + Opus

- Voyage: clustering de demanda en la categoría; recupera `memory_industry` para no repetir oportunidades ya conocidas.
- Opus: distingue demanda real ("ojalá existiera…", "nadie ofrece…") de queja puntual; estima urgencia cualitativa.

## Diseño de charts

1. **Chart primario — `bubble_field` demanda × cobertura.** Eje x = cobertura (baja=oportunidad), y = fuerza de demanda; r = volumen; color = urgencia. Cuadrante arriba-izquierda = oportunidades top. Hover/click = evidencia.
2. **Chart soporte — `bar_ranking` por opportunity_score.**
3. **Chart evidencia — `tension_card` por oportunidad** con cita de demanda insatisfecha + qué marca está mejor posicionada.

**Conclusiones:** `opportunities[]` (con score, tamaño, urgencia), `best_positioned_entity` por oportunidad, `evidence`, `limitations`.

## Output contract

```jsonc
"category_opportunity": {
  "kind": "category_opportunity_map",
  "opportunities": [ { "need","demand_strength","coverage","urgency","opportunity_score",
     "best_positioned_entity_id","evidence_ids":[...],"confidence" } ],
  "limitations": [...]
}
```

## Confianza / limitaciones

Sin baseline de categoría amplio, las oportunidades son hipótesis. Cobertura sin atribución de marcas no se afirma. Capa #16.
</content>
</invoke>
