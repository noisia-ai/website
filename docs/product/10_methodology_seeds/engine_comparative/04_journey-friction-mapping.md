# 04 · JFM Completo — Journey Friction Mapping

`slug: journey-friction-mapping` · status: seed → diseño completo · prioridad: **alta**

> Mapea dónde se rompe el camino entre intención y acción, qué tipo de fricción lo rompe, por fase y por entidad.

---

## Resumen (formato cliente)

- **Nombre:** Journey Friction Mapping (completo)
- **Objetivo:** Identificar fricciones por **fase del journey** y **tipo**, ubicar los choke points y qué removerlos.
- **Cuándo se usa:** caída de conversión sin causa atribuible, e-commerce/SaaS, optimización de CX.
- **Entidades comparadas:** marca vs competidores (¿quién sufre qué barrera en qué fase?) y/o marca vs categoría.
- **Inputs necesarios:** corpus 1,500–4,000 de journey **real** (no idealizado): foros de troubleshooting, reviews, Q&A de marketplaces, transcripts de soporte.
- **Dimensiones/ejes:** **fase** {discovery, consideration, purchase, onboarding, usage, support, retention} × **tipo de fricción** (Nordgren) {inertia, effort, emotion, reactance}.
- **Cómo se puntúa:** por (fase × tipo × entidad) → frecuencia, intensidad, impacto declarado en conversión; **choke score** = frecuencia·intensidad; **removibilidad** (esfuerzo/impacto).
- **Outputs esperados:** heatmap fase×tipo, top choke points, blockers/accelerators, quick wins, recomendaciones con esfuerzo estimado.
- **Ejemplo de insight:** *"El choke point #1 es 'onboarding-effort': 38% de las fricciones, intensidad 4.1, y es exclusivo de tu marca (la competencia no lo sufre) — quick win de alto impacto."*
- **Prioridad:** alta (conecta con barriers de T&B).

## Marco técnico

- **entity:** `corpus_entities`.
- **unit of analysis:** fricción articulada en una mención (coding).
- **dimensions:** `journey_phase`, `friction_type`, `articulable_vs_invisible` → `engine_findings.dimensions`.
- **scoring:** `choke_score = frequency·intensity`; `removability = f(effort,impact)`; `accelerator` = lo opuesto (lo que destraba). Comparativo: share de fricción por entidad por fase.
- **evidence:** citas por choke point.
- **output contract:** `methodology_blocks.jfm` (stub: `rows[{journey_phase,entity,friction_count,top_friction}]`) — se enriquece a heatmap.

## Datos y qué necesita para un resultado real

- **Imprescindible:** journey **suficientemente largo** en el corpus (pre-flight lo valida). Reviews positivas no traen fricción; se necesitan foros de queja + soporte.
- **Para "real":** transcripts de soporte (`brand_knowledge_sources.support_transcript`) elevan mucho la calidad de las fases purchase/onboarding/support. El impacto en conversión es **declarado** (lo dice el corpus), no medido — se marca como tal.
- Comparativo de fricción requiere corpus competitivo; si no hay, JFM corre en modo single-entity (sigue siendo útil).

## Voyage + Opus

- Voyage: recupera relatos de proceso ("intenté… y…") por fase; clave para no perder fricciones invisibles dispersas.
- Opus: codifica cada fricción a (fase, tipo Nordgren, intensidad, articulable/invisible) + cita; distingue fricción real de queja genérica.

## Diseño de charts

1. **Chart primario — `heatmap` fase × tipo** (color = choke_score). Celda con tipo+fase; hover = cita; click = drawer. Toggle de entidad para comparar el heatmap de marca vs competidor lado a lado.
2. **Chart soporte — `timeline` del journey.** Fases en horizontal con marcadores de tamaño = volumen de fricción; resalta los choke points.
3. **Chart evidencia — `scatter_effort_impact`.** 4 cuadrantes de removibilidad; cada fricción como punto → quick wins (bajo esfuerzo / alto impacto) saltan a la vista.

**Conclusiones:** `top_choke_points[]`, `quick_wins[]`, `blockers/accelerators` por entidad, `friction_removal_recommendations[]` con esfuerzo estimado.

## Output contract

```jsonc
"jfm": {
  "kind": "journey_friction_mapping",
  "phases": [...], "friction_types": [...],
  "cells": [ { "phase","friction_type","entity_id","frequency","intensity","choke_score",
     "removability":{"effort","impact"},"evidence_ids":[...],"confidence" } ],
  "choke_points": [...], "quick_wins": [...], "recommendations": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Impacto en conversión = declarado, nunca medido (salvo que el cliente suba data de funnel). Fases vacías se justifican. Capa #16 por celda.
</content>
</invoke>
