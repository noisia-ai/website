# 12 · Narrative Ownership

`slug: narrative-ownership` · status: nuevo · prioridad: **alta**

> Qué entidad "posee" cada narrativa. Ej. telefonía: cobertura, precio, velocidad, atención, promociones, confianza, abuso, letra chica. Ranking de ownership narrativo por tema.

---

## Resumen (formato cliente)

- **Nombre:** Narrative Ownership
- **Objetivo:** Determinar, tema por tema, qué marca **posee** la narrativa en la conversación de la categoría.
- **Cuándo se usa:** estrategia de mensaje, war-gaming competitivo, decidir qué narrativa disputar vs ceder.
- **Entidades comparadas:** marca + competidores + categoría.
- **Inputs necesarios:** corpus atribuido por entidad; lista de narrativas/temas (Opus las descubre o el estudio las define).
- **Dimensiones/ejes:** narrativa/tema × entidad → share of narrative + sentimiento + intensidad.
- **Cómo se puntúa:** `narrative_ownership = share de voz del tema · sign(sentiment)`; una marca puede "poseer" una narrativa **positiva** (la atención) o quedar dueña de una **negativa** (el abuso). `ownership` con umbrales estándar.
- **Outputs esperados:** ranking de ownership por narrativa, narrativas propias positivas, narrativas negativas pegadas a la marca, narrativas huérfanas (whitespace narrativo).
- **Ejemplo de insight:** *"Posees 'velocidad' (share 0.58, sentiment +0.3) pero también 'letra chica' (share 0.49, sentiment −0.6): tu narrativa positiva está contaminada por una negativa que ningún competidor carga."*
- **Prioridad:** alta (insight directo y muy demandado en categorías reguladas/telecom/banca).

## Marco técnico

- **entity:** todas.
- **unit of analysis:** mención asignada a una narrativa.
- **dimensions:** `narrative`, `valence` (positiva/negativa), `entity_share` → `engine_findings.dimensions`.
- **scoring:** `share` por entidad por narrativa + `sentiment` + `ownership`; separa ownership positivo de negativo (clave: poseer una narrativa negativa es un riesgo, no un activo).
- **evidence:** citas por narrativa por entidad.
- **output contract:** `methodology_blocks.narrative_ownership`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** atribución por entidad. Sin competencia, sólo se ve qué narrativas rodean a la marca, no quién las posee relativamente.
- **Para "real":** las narrativas deben emerger del corpus (Opus) o validarse con el estudio; no imponer una taxonomía ajena a la categoría. Editorial + social + reviews dan narrativas más completas que un canal.

## Voyage + Opus

- Voyage: clustering de menciones en narrativas candidatas.
- Opus: nombra cada narrativa en lenguaje de la categoría, asigna valencia, atribuye a entidad. Determinista: el share y el ownership.

## Diseño de charts

1. **Chart primario — `stacked_share` por narrativa.** Cada narrativa = barra 100% repartida entre entidades (quién posee qué parte); color positivo/negativo por valencia. Hover = cita; click = drawer.
2. **Chart soporte — `matrix_2x2` ownership × valencia.** x = qué tan dueña es la marca, y = sentiment de la narrativa → cuadrantes: activos propios / pasivos tóxicos / oportunidades / riesgos ajenos.
3. **Chart evidencia — `bar_ranking` de narrativas huérfanas** (whitespace narrativo: alta presencia, sin dueño claro).

**Conclusiones:** `owned_positive[]`, `owned_negative[]` (alertas), `competitor_owned[]`, `orphan_narratives[]`, `recommendations` (disputar/ceder/limpiar).

## Output contract

```jsonc
"narrative_ownership": {
  "kind": "narrative_ownership",
  "narratives": [ { "narrative","valence",
     "by_entity":[ {"entity_id","share_pct","sentiment"} ],
     "owner_entity_id","ownership","evidence_ids":[...],"confidence" } ],
  "owned_negative": [...], "orphan_narratives": [...], "limitations": [...]
}
```

## Confianza / limitaciones

No confundir "más menciones" con "ownership": se pondera por share relativo y dominant_share≥35%. Narrativa negativa propia se marca como riesgo, no logro. Capa #16.
</content>
</invoke>
