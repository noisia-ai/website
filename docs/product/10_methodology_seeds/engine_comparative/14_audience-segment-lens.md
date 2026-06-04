# 14 · Audience / Segment Lens

`slug: audience-segment-lens` · status: nuevo · prioridad: **media**

> Compara entidades por segmento de audiencia. Ej. jóvenes, familias, gamers, negocios, prepago, postpago. Segmento × entidad × necesidades/fricciones.

---

## Resumen (formato cliente)

- **Nombre:** Audience / Segment Lens
- **Objetivo:** Re-cortar cualquier análisis por **segmento de audiencia** para ver cómo cambian necesidades, fricciones y ownership entre públicos.
- **Cuándo se usa:** segmentación, targeting, descubrir que "la marca gana en un segmento y pierde en otro".
- **Entidades comparadas:** entidades **dentro de cada segmento** (marca vs competidores por público).
- **Inputs necesarios:** señal de segmento por mención: de `study_corpora.audience_segment`, de metadata de `authors` (inferido), o asignado por Opus desde el texto.
- **Dimensiones/ejes:** segmento × entidad × (necesidad / fricción / sentimiento / narrativa).
- **Cómo se puntúa:** misma metodología base (T&B/Sentiment/Narrative) **particionada por segmento**; `segment_skew` = cuánto difiere un segmento del promedio.
- **Outputs esperados:** matriz segmento×entidad, perfiles por segmento, dónde la marca gana/pierde por público, fricciones específicas de segmento.
- **Ejemplo de insight:** *"Ganas en 'negocios' (advocacy +20) pero pierdes en 'jóvenes prepago' (−15), donde el competidor posee la narrativa de 'precio sin trucos' — tu fuga está en un solo segmento."*
- **Prioridad:** media (es una **lente transversal**: re-particiona otras metodologías).

## Marco técnico

- **entity:** entidades, dentro de cada segmento.
- **unit of analysis:** la misma de la metodología base, con `segment` como dimensión de partición.
- **dimensions:** `segment` + las dimensiones de la metodología envuelta → `engine_findings.dimensions`.
- **scoring:** se recalcula por segmento; `segment_skew` resalta diferencias significativas; confianza **por segmento** (un segmento chico degrada).
- **evidence:** citas filtradas por segmento.
- **output contract:** `methodology_blocks.audience_segment` (envuelve otro bloque por segmento).

## Datos y qué necesita para un resultado real

- **Imprescindible:** una **señal de segmento confiable**. Tres fuentes posibles, en orden de confianza: (1) `audience_segment` declarado del estudio + atribución, (2) metadata de `authors` (negocio/verificado/país), (3) Opus infiere del texto (marcar como inferido). Sin ninguna, no hay segmentación honesta.
- **Para "real":** ≥150 menciones por (segmento × entidad), o la celda se marca direccional. La inferencia de segmento por Opus debe auditarse en muestra.

## Voyage + Opus

- Voyage: agrupa por similitud para detectar segmentos emergentes no previstos.
- Opus: asigna segmento cuando no hay metadata, con una etiqueta de confianza de la inferencia.

## Diseño de charts

1. **Chart primario — `heatmap` segmento × entidad** (color = métrica elegida: advocacy / ownership / fricción). Selector de métrica. Hover = cita; click = drawer del segmento.
2. **Chart soporte — `radar` por segmento** comparando entidades dentro del público.
3. **Chart evidencia — `bar_ranking` de `segment_skew`** (qué segmentos se desvían más del promedio — dónde está la historia).

**Conclusiones:** `segment_profiles[]`, `win/lose por segmento`, `segment_specific_frictions[]`, `targeting_recommendations[]`.

## Output contract

```jsonc
"audience_segment": {
  "kind": "audience_segment_lens",
  "wrapped_methodology": "<slug>",
  "segment_source": "declared|author_metadata|opus_inferred",
  "cells": [ { "segment","entity_id","metric","value","segment_skew","evidence_ids":[...],"confidence" } ],
  "profiles": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Segmento inferido por Opus se etiqueta como tal y no se mezcla con declarado sin avisar. Segmentos chicos → direccional. Capa #16 por celda.
</content>
</invoke>
