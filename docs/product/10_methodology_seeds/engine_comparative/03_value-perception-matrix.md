# 03 · VPM Profundo — Value Perception Matrix

`slug: value-perception-matrix` · status: seed beta → diseño profundo · prioridad: **alta**

> Extiende el seed `value-perception-matrix.yaml`. Define qué valor percibido tiene cada marca y dónde hay whitespace de valor que nadie ocupa.

---

## Resumen (formato cliente)

- **Nombre:** Value Perception Matrix (profundo)
- **Objetivo:** Mapear qué **dimensión de valor** capitaliza cada entidad (funcional, emocional, social, económico, aspiracional) y dónde hay gaps.
- **Cuándo se usa:** reposicionamiento, pricing/defensa de margen, evaluación post-lanzamiento, justificar premium vs entrante low-cost.
- **Entidades comparadas:** marca + ≥2 competidores comparables (sin ≥2 no hay matriz).
- **Inputs necesarios:** corpus ≥1,800 (≥600/marca), balance ≥30% por marca, window 6–12 meses.
- **Dimensiones/ejes:** **Beneficio percibido** {funcional, emocional, social, aspiracional} × **Costo percibido** {monetario, tiempo, cognitivo, social}. (Extiende el 4×3 del seed a valor económico/aspiracional.)
- **Cómo se puntúa:** por entidad×dimensión → frecuencia, intensidad (1–5 Opus), sentimiento; **value_ownership** = share de la dimensión; **gap** = dimensión con demanda alta y baja ocupación.
- **Outputs esperados:** matriz valor×entidad, brand position cards, whitespace de valor, defense brief.
- **Ejemplo de insight:** *"Tu marca posee valor funcional (share 0.52) pero abandonó el aspiracional, que el competidor B está ocupando con intensidad 4.3 — riesgo de quedar como 'la opción práctica sin sueño'."*
- **Prioridad:** alta (comparte estructura de codificación de doble eje con T&B).

## Marco técnico

- **entity:** `corpus_entities`, requiere ≥2 competitor.
- **unit of analysis:** mención codificada a (dimensión de valor, entidad).
- **dimensions:** `value_benefit ∈ {funcional,emocional,social,aspiracional,economico}`, `value_cost ∈ {monetario,tiempo,cognitivo,social}` → `engine_findings.dimensions`.
- **scoring:** por celda (entidad × dimensión): `frecuencia`, `intensidad`, `sentiment`, `value_ownership_share`, `declared_vs_perceived` (distingue lo que la marca dice vs lo que el corpus percibe).
- **evidence:** ≥1 cita por celda ocupada (quality gate `evidence_per_quadrant`).
- **output contract:** `methodology_blocks.vpm` (stub ya existe: `rows[{entity,value_axis,score,evidence_count}]`) — se enriquece.

## Datos y qué necesita para un resultado real

- **Imprescindible:** ≥2 marcas con balance; sin balance la matriz miente (una marca con 80% del corpus "gana" todo).
- **Para "real":** corpus con verbatims de **percepción**, no sólo transaccional. Reviews + foros + encuestas abiertas (`brand_knowledge_sources.survey`) son ideales para valor; social puro tiende a aspiracional/emocional.
- **Gap real:** sólo se afirma whitespace si hay evidencia de **demanda** de esa dimensión y **ausencia** de ocupación (no conjetura).

## Voyage + Opus

- Voyage: recupera, por dimensión de valor, pasajes de cada marca → asegura que cada celda se llene con evidencia comparable.
- Opus: clasifica cada mención a (beneficio, costo, entidad) + intensidad + distingue *valor declarado* (marca lo promete) vs *valor percibido* (consumidor lo confirma).

## Diseño de charts

1. **Chart primario — `matrix` valor (firma).** Grid beneficio×costo; en cada celda, marcas superpuestas como chips con área proporcional a ownership. Hover = top cita; click = drawer. Toggle "declarado vs percibido" para ver el gap de promesa.
2. **Chart soporte — `radar` por marca.** Una cara por entidad sobre las dimensiones de beneficio; superponer para comparar perfiles de valor.
3. **Chart evidencia — `whitespace_overlay`.** Capa sobre la matriz marcando celdas con demanda alta y ocupación baja (whitespace de valor).

**Conclusiones:** `value_owned[]` por marca, `value_abandoned[]`, `whitespace_value[]`, `defense_brief` (qué proteger antes que un competidor lo tome).

## Output contract

```jsonc
"vpm": {
  "kind": "value_perception_matrix",
  "dimensions": { "benefit":[...], "cost":[...] },
  "cells": [ { "entity_id","benefit","cost","frequency","intensity","sentiment",
     "ownership_share","declared_vs_perceived","evidence_ids":[...],"confidence" } ],
  "brand_positions": [...], "whitespace_value": [...], "defense_brief": {...}, "limitations":[...]
}
```

## Confianza / limitaciones

Sin ≥2 competidores → no se publica matriz (se ofrece lectura absoluta). Balance <30%/marca degrada a direccional. Capa #16 por celda.
</content>
</invoke>
