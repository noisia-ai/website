# 09 · Brand Positioning Map

`slug: brand-positioning-map` · status: nuevo · prioridad: **media**

> Mapa perceptual de marcas sobre ejes definidos por el estudio (premium/accesible, confianza/innovación, simple/complejo…).

---

## Resumen (formato cliente)

- **Nombre:** Brand Positioning Map
- **Objetivo:** Ubicar cada marca en un mapa perceptual según cómo la percibe la conversación, no como se autodefine.
- **Cuándo se usa:** estrategia de posicionamiento, diferenciación, detección de marcas indistinguibles (clustering).
- **Entidades comparadas:** marca + competidores.
- **Inputs necesarios:** corpus con percepción de atributos por marca; ≥2 marcas; ejes definidos en el `context_form` del estudio.
- **Dimensiones/ejes:** 2 ejes perceptuales configurables (ej. premium↔accesible × tradicional↔innovador) o radar multi-atributo.
- **Cómo se puntúa:** por marca×atributo → posición en el eje = `Σ(sentiment·intensity·share)` de menciones del atributo; distancia entre marcas = diferenciación.
- **Outputs esperados:** mapa 2×2 perceptual, radar por marca, clusters de marcas indistinguibles, gaps de posicionamiento.
- **Ejemplo de insight:** *"Tu marca y el competidor B están a 0.08 de distancia perceptual: el mercado no los distingue. Hay espacio vacío en 'innovador-accesible' que nadie ocupa."*
- **Prioridad:** media (comparte motor de dimensiones con VPM/Positioning).

## Marco técnico

- **entity:** marcas.
- **unit of analysis:** mención que atribuye un atributo a una marca.
- **dimensions:** `attribute`, `axis_value` (posición en el eje), por marca → `engine_findings.dimensions`.
- **scoring:** posición en cada eje normalizada entre marcas; `perceptual_distance` (euclidiana) para clusters; whitespace = región del mapa sin marca con demanda.
- **evidence:** citas que anclan cada posición.
- **output contract:** `methodology_blocks.brand_positioning`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** los ejes deben venir del estudio (el Insights Manager los define en `context_form`); no se inventan. ≥2 marcas con menciones sobre los atributos del eje.
- **Para "real":** percepción, no posicionamiento declarado de la marca. Reviews + social + editorial. Si un eje no tiene evidencia suficiente, se omite (no se rellena a ojo).

## Voyage + Opus

- Voyage: recupera menciones de cada atributo por marca.
- Opus: clasifica la mención al atributo y asigna posición direccional (más cerca de premium vs accesible) + intensidad; el promedio lo hace SQL.

## Diseño de charts

1. **Chart primario — `matrix_2x2` perceptual.** Marcas como burbujas (r=volumen) sobre los dos ejes; anotaciones de whitespace y de clusters (marcas solapadas). Hover = cita; click = drawer. Ejes reconfigurables en vivo.
2. **Chart soporte — `radar` multi-atributo.** Perfil de cada marca sobre todos los atributos.
3. **Chart evidencia — `bar_ranking` de distancia perceptual** entre pares de marcas (quién se parece a quién).

**Conclusiones:** `positions[]`, `clusters[]` (marcas indistinguibles), `whitespace_positions[]`, `differentiation_recommendations[]`.

## Output contract

```jsonc
"brand_positioning": {
  "kind": "brand_positioning_map",
  "axes": { "x":{"label","poles"}, "y":{"label","poles"} },
  "brands": [ { "entity_id","x","y","r","attribute_scores":{...},"evidence_ids":[...],"confidence" } ],
  "clusters": [...], "whitespace": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Ejes definidos por el estudio, no auto-generados sin validación. Marca con corpus chico → posición inestable (radio punteado). Capa #16.
</content>
</invoke>
