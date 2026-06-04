# 11 · Competitive Trigger / Barrier Matrix

`slug: competitive-tb-matrix` · status: nuevo (especializa T&B) · prioridad: **alta**

> Más específico que el T&B general: entidad × trigger/barrier individual. Quién domina qué trigger, quién sufre qué barrier.

---

## Resumen (formato cliente)

- **Nombre:** Competitive T/B Matrix
- **Objetivo:** Vista granular entidad × cada trigger/barrier: ownership punto por punto, no agregado por layer.
- **Cuándo se usa:** después de un T&B, cuando se necesita saber exactamente quién posee cada palanca.
- **Entidades comparadas:** todas las del estudio.
- **Inputs necesarios:** un T&B ya corrido (`tb_findings` + codings atribuidos por entidad).
- **Dimensiones/ejes:** trigger/barrier individual × entidad → share + ownership + differentiation.
- **Cómo se puntúa:** por celda → `share_pct`, `ownership` (`classifyOwnership`), `differentiation_index`; ranking de "quién domina" por trigger.
- **Outputs esperados:** matriz densa trigger×entidad, ranking de dominancia por trigger, barriers exclusivos de la marca, triggers disputables.
- **Ejemplo de insight:** *"De 14 triggers, posees 2, la categoría 8, el competidor A 4. De los 4 del competidor, 'estatus' es disputable (tu share 0.31); el resto son suyos — no los copies."*
- **Prioridad:** alta (reusa todo T&B, output muy concreto para creativo/medios).

## Marco técnico

- **entity:** todas.
- **unit of analysis:** finding individual (trigger/barrier) × entidad.
- **dimensions:** reusa `polarity`, `layer` + añade `entity_share`, `ownership`, `differentiation_index`.
- **scoring:** idéntico a `finding_entity_presence` de `tb-step-5-comparative.ts`, pero **expuesto como matriz completa**, no resumido a 8 findings.
- **evidence:** `tb_finding_citations` por celda.
- **output contract:** especialización de `ComparativeDashboardPayload.entity_finding_matrix` con la matriz completa + ranking.

## Datos y qué necesita para un resultado real

- **Imprescindible:** T&B previo con atribución. Es una **vista derivada**, no un pipeline nuevo: corre sobre `tb_mention_codings` + `import_batches`.
- **Para "real":** ≥30 menciones por celda para ownership no `insufficient_evidence`; celdas bajo el umbral se muestran en gris "evidencia insuficiente", no se ocultan.

## Voyage + Opus

- No requiere pases nuevos de Opus si el T&B ya corrió. Voyage sólo si se quieren más citas por celda. **Coste IA ~0** sobre un T&B existente — es agregación.

## Diseño de charts

1. **Chart primario — `heatmap` denso trigger×entidad.** Filas = findings (triggers y barriers separados), columnas = entidades; color = share, símbolo = ownership. Orden por differentiation. Hover = cita; click = drawer. Sort/filter por layer y polaridad.
2. **Chart soporte — `bar_ranking` "dominancia por trigger".** Por trigger seleccionado, ranking de entidades por share.
3. **Chart evidencia — `diverging` exclusividad.** Barriers exclusivos de la marca vs de la competencia.

**Conclusiones:** `brand_owned[]`, `competitor_owned[]`, `disputable[]` (share marca 0.30–0.45), `do_not_copy[]`, `exclusive_barriers[]`.

## Output contract

```jsonc
"competitive_tb_matrix": {
  "kind": "competitive_tb_matrix",
  "findings": [ { "finding_id","polarity","layer",
     "by_entity":[ {"entity_id","share_pct","ownership","differentiation_index","evidence_ids":[...]} ],
     "dominant_entity_id","confidence" } ],
  "disputable": [...], "do_not_copy": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Celdas <2 menciones o dominant_share<35% → `insufficient_evidence` visible. Hereda confianza de la corrida T&B. Capa #16.
</content>
</invoke>
