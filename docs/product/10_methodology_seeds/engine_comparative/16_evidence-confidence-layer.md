# 16 · Evidence Quality / Confidence Layer (transversal)

`slug: evidence-confidence-layer` · status: nuevo · prioridad: **alta**

> No es una metodología comercial: es una **capa transversal que debe existir en todas**. Mide volumen, diversidad, consistencia, recencia y calidad de evidencia → un `confidence` por insight y por chart. Las demás metodologías la **importan**.

---

## Resumen (formato cliente)

- **Nombre:** Evidence Quality / Confidence Layer
- **Objetivo:** Calcular y mostrar, de forma uniforme, cuánta confianza merece cada conclusión y cada gráfica.
- **Cuándo se usa:** **siempre.** Toda metodología la invoca antes de publicar.
- **Entidades comparadas:** N/A — opera sobre findings/charts de cualquier metodología.
- **Inputs necesarios:** los `engine_findings` + `engine_finding_citations` de cualquier corrida.
- **Dimensiones/ejes:** volumen, diversidad de fuentes, consistencia, recencia, calidad de cita.
- **Cómo se puntúa:** `confidence_score = w1·volume + w2·source_diversity + w3·consistency + w4·recency + w5·citation_quality` → mapeado a `alta | media | baja_direccional` (mismos labels que el sistema actual).
- **Outputs esperados:** badge de confianza por finding/chart, breakdown de por qué, lista de qué bajaría/subiría la confianza.
- **Ejemplo de insight:** *"Este insight es 'media': volumen alto (320) pero una sola fuente y recencia 8m. Subiría a 'alta' con una 2ª fuente."*
- **Prioridad:** alta — sin esto, ninguna metodología es publicable con honestidad.

## Marco técnico

- **entity:** N/A (capa).
- **unit of analysis:** cualquier finding/chart de cualquier metodología.
- **dimensions:**
  - `volume` = nº de menciones/citas que sostienen el finding (umbrales `≥100 alta / ≥30 media / <30 direccional`, ya en código).
  - `source_diversity` = nº de `source_system`/`platform`/`source_kind` distintos (1 fuente ⇒ degrada).
  - `consistency` = ¿las citas apuntan al mismo sentido? (dispersión de sentiment/intensity; alta varianza ⇒ degrada).
  - `recency` = antigüedad de `published_at` vs window ideal (>9m degrada).
  - `citation_quality` = ¿hay cita protagonista real, no fragmento? `quality_score` de mentions.
- **scoring:** combinación ponderada → label. Reusa `confidenceFromMentions()` como base y le suma los otros 4 factores.
- **evidence:** las propias citas auditadas.
- **output contract:** `confidence_layer` embebido en cada bloque + `confidence` por finding/chart.

## Datos y qué necesita para un resultado real

- **Imprescindible:** que cada finding tenga citas ligadas (`engine_finding_citations`). Sin trazabilidad no hay confianza (es también un quality gate de T&B: `traceability`).
- **Para "real":** multi-fuente es lo que más mueve la aguja: el factor `source_diversity` es el que distingue un insight robusto de uno de un solo canal. Por eso el engine acepta social **+** reviews **+** soporte **+** encuestas.

## Voyage + Opus

- Voyage: mide diversidad real (¿las citas vienen de clusters distintos o son casi duplicados?) — detecta falso volumen (mismo post replicado).
- Opus: juzga consistencia semántica (¿las citas dicen lo mismo o se contradicen?) cuando el sentiment numérico no alcanza.

## Diseño de charts

1. **Chart primario — `confidence_badge` + breakdown radial.** Cada finding/chart muestra su badge; al expandir, un mini-radar de los 5 factores. Interactivo: hover sobre un factor = qué lo está limitando.
2. **Chart soporte — `bar_ranking` de findings por confianza** (cuáles publicar con seguridad, cuáles marcar direccionales).
3. **Chart evidencia — panel "cómo subir la confianza"**: lista accionable (ej. "+1 fuente", "más recencia", "más volumen en competidor").

**Conclusiones:** `confidence` por elemento, `weakest_findings[]`, `how_to_improve[]`, `publishable vs directional`.

## Output contract

```jsonc
"confidence_layer": {
  "kind": "evidence_confidence_layer",
  "per_finding": [ { "finding_id","confidence","factors":{
      "volume","source_diversity","consistency","recency","citation_quality" },
      "limiting_factor","how_to_improve":[...] } ],
  "global": { "publishable_count","directional_count","weakest":[...] }
}
```

## Cómo la usan las demás

Cada `methodology_block` referencia `confidence_layer` y cada `finding`/`chart` lleva su `confidence`. Regla del engine: **nada se publica sin pasar por esta capa.** Es la implementación concreta de los quality gates `traceability` + `confidence_calibrated` + `limitations_section` del catálogo, generalizados a toda la familia.
</content>
</invoke>
