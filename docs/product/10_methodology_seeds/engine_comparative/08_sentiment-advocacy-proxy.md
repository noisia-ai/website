# 08 · Sentiment / NPS Proxy (Advocacy)

`slug: sentiment-advocacy-proxy` · status: nuevo · prioridad: **alta**

> **No es NPS real** (no viene de encuesta). Es un **proxy de advocacy**: promotores, detractores, intensidad emocional y temas asociados. Honesto en el nombre.

---

## Resumen (formato cliente)

- **Nombre:** Sentiment / Advocacy Proxy
- **Objetivo:** Medir advocacy (promotores vs detractores), intensidad emocional y qué temas impulsan cada lado, por entidad.
- **Cuándo se usa:** tracking de salud de marca, alertas de reputación, comparativo de sentimiento competitivo.
- **Entidades comparadas:** marca vs competidores vs categoría.
- **Inputs necesarios:** corpus con sentimiento (`mentions.sentiment_score`) o texto para que Opus lo infiera; ≥200 menciones/entidad para benchmark.
- **Dimensiones/ejes:** sentimiento (-1..1) × intensidad emocional × tema (advocacy driver / complaint driver).
- **Cómo se puntúa:** `advocacy_proxy = (%promotores − %detractores)` (NPS-like, etiquetado como proxy); promotor/detractor por umbral de sentiment·intensidad; drivers por share de temas en cada lado.
- **Outputs esperados:** sentiment benchmark por entidad, advocacy proxy score, advocacy drivers, complaint drivers, evolución temporal.
- **Ejemplo de insight:** *"Tu advocacy proxy es +12 vs −4 del líder, pero tu intensidad de detractor es mayor: menos quejas, pero más furiosas, y todas sobre 'soporte'."*
- **Prioridad:** alta (rápido, universal, base de Trust&Risk).

## Marco técnico

- **entity:** todas.
- **unit of analysis:** mención con sentimiento + tema.
- **dimensions:** `sentiment`, `emotional_intensity`, `theme`, `advocacy_class ∈ {promoter,passive,detractor}` → `engine_findings.dimensions`.
- **scoring:** `advocacy_proxy = %promoters − %detractors`; drivers = top temas por clase (share). Usa `mentions.sentiment_score` si existe; si no, Opus asigna.
- **evidence:** citas representativas de promotor y detractor por tema.
- **output contract:** `methodology_blocks.sentiment_advocacy`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** volumen por entidad (≥200) para que el proxy no oscile. Sentimiento de proveedor (`sentiment_source`) o inferido por Opus — se reporta cuál.
- **Para "real":** dejar claro que es **proxy**, no NPS de encuesta. Si el cliente sube encuestas (`brand_knowledge_sources.survey`), se puede triangular con NPS real (se marca la fuente).
- Multi-fuente: reviews + social + soporte dan un sentimiento más robusto que un solo canal.

## Voyage + Opus

- Voyage: agrupa quejas/elogios por tema → drivers limpios.
- Opus: cuando falta `sentiment_score`, clasifica sentimiento + intensidad emocional + tema; distingue sarcasmo/ironía que rompe el sentiment automático.

## Diseño de charts

1. **Chart primario — `diverging_bar` de advocacy por entidad.** Promotores arriba / detractores abajo del cero; ancho = volumen. Hover = cita; click = drawer.
2. **Chart soporte — `bar_ranking` de drivers** (advocacy drivers vs complaint drivers, dos columnas).
3. **Chart evidencia — `timeline` / `monthly_pulse`.** Evolución del sentiment por entidad; marca picos con el evento/tema detrás.

**Conclusiones:** `advocacy_proxy` por entidad, `advocacy_drivers[]`, `complaint_drivers[]`, `alerts[]` (caídas), `limitations` (es proxy).

## Output contract

```jsonc
"sentiment_advocacy": {
  "kind": "sentiment_advocacy_proxy",
  "is_survey_nps": false,
  "entities": [ { "entity_id","advocacy_proxy","pct_promoter","pct_detractor","avg_sentiment","sentiment_source","confidence" } ],
  "drivers": { "advocacy":[...], "complaint":[...] },
  "timeseries": [...], "limitations": ["proxy de advocacy, no NPS de encuesta"]
}
```

## Confianza / limitaciones

Siempre etiquetar `is_survey_nps:false`. Sarcasmo y bots degradan sentiment automático → Opus revisa muestras. Capa #16.
</content>
</invoke>
