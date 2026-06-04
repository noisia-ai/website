# 02 · Competitive / Market Wave

`slug: competitive-wave` · status: nuevo · prioridad: **alta**

> Similar a un "Wave" tipo analista (NO usar el nombre "Forrester" en producto). Posiciona entidades por fuerza estratégica y las clasifica en líderes / challengers / niche / emerging.

---

## Resumen (formato cliente)

- **Nombre:** Competitive Wave (Market Wave)
- **Objetivo:** Una vista única de **quién lidera la categoría** según la conversación real, combinando varios ejes en un score compuesto comparable.
- **Cuándo se usa:** Board decks, panorama competitivo, defensa de presupuesto, entrada a categoría nueva.
- **Entidades comparadas:** marca + todos los competidores con corpus atribuido (`corpus_entities` kind competitor) + categoría como referencia.
- **Inputs necesarios:** corpus atribuido por entidad (ideal ≥300 menciones/entidad), findings y sentimiento ya calculados.
- **Dimensiones/ejes:** market resonance (share of voice), cultural ownership (códigos/narrativas propias), sentiment, decision velocity (proxy), differentiation. Configurables por estudio.
- **Cómo se puntúa:** cada eje 0–100 normalizado entre entidades; dos macro-ejes para el plano (default: **Strength of Presence** = resonance+SOV+sentiment, **Strategy/Ownership** = differentiation+cultural ownership). Tamaño de burbuja = volumen.
- **Outputs esperados:** wave plot con 4 zonas, score breakdown por entidad, movimiento vs periodo previo (si hay histórico).
- **Ejemplo de insight:** *"Marca X es challenger: alta resonancia pero baja cultural ownership — habla fuerte pero no posee ninguna narrativa; el líder posee 3."*
- **Prioridad:** alta (output muy vendible, reusa scoring existente).

## Marco técnico

- **entity:** `corpus_entities` (todas).
- **unit of analysis:** entidad (agregado de menciones + findings).
- **dimensions:** vector configurable `{ resonance, cultural_ownership, sentiment, decision_velocity, differentiation }` en `engine_findings.dimensions` a nivel entidad.
- **scoring:** cada eje normalizado min-max entre entidades; macro-eje X/Y = combinación ponderada (pesos por estudio). Posición = (X,Y); radio = `mention_count`.
- **evidence:** top citas por entidad por eje que más la posiciona.
- **output contract:** `methodology_blocks.competitive_wave` con `wave_plot`.

## Datos y qué necesita para un resultado real

- **Mínimo real:** ≥3 entidades con ≥150 menciones cada una; sin eso el plano es ruido (se marca direccional). Cultural ownership requiere que corra Cultural Codes o Narrative Ownership; si no existen, ese eje se omite y el wave usa los ejes disponibles (transparente).
- **Fuentes:** social listening (resonance/sentiment), reviews (sentiment), editorial (cultural ownership). Multi-fuente mejora la validez de "resonance" (no sólo un canal).

## Voyage + Opus

- Voyage: clustering de menciones por entidad para SOV limpio (dedup de bots/retweets).
- Opus: sólo para el eje cualitativo (cultural ownership / differentiation) si no viene de otra metodología; devuelve label de qué narrativa posee cada entidad.

## Diseño de charts (2–3 + conclusiones)

1. **Chart primario — `wave_plot`.** Plano 2D con 4 zonas etiquetadas (Líderes arriba-derecha, Challengers, Niche, Emerging). Entidades como burbujas; hover = breakdown de ejes; click = drawer con evidencia. Toggle para reponderar ejes en vivo (slider) y ver cómo se mueve el plano — **interactivo**.
2. **Chart soporte — `radar` multi-entidad.** Superpone hasta 4 entidades sobre los 5 ejes; revela perfil (ej. una fuerte en sentiment, débil en ownership).
3. **Chart evidencia — `bar_ranking` por eje seleccionado.** Al elegir un eje, ranking de entidades con su cita representativa.

**Conclusiones:** `headline` (quién lidera y por qué), `zone_assignments[]`, `movers` (vs periodo previo si hay), `recommendations` (qué eje subir), `limitations`, confianza por entidad.

## Output contract

```jsonc
"competitive_wave": {
  "kind": "competitive_wave",
  "axes": { "x": {"label","weights"}, "y": {"label","weights"} },
  "entities": [ { "entity_id","entity_name","x","y","r","zone",
     "axis_scores": {"resonance","cultural_ownership","sentiment","decision_velocity","differentiation"},
     "top_evidence": [mention_ids], "confidence" } ],
  "conclusions": {...}, "limitations": [...]
}
```

## Confianza / limitaciones

No publicar zonas si <3 entidades. Ejes sin fuente se omiten y se listan en `limitations`. Cultural ownership sin metodología fuente → eje ausente, no estimado a ojo.
</content>
</invoke>
