# 05 · Cultural Codes Decoding

`slug: cultural-codes-decoding` · status: seed → diseño · prioridad: **media** (ya ejecutado manual)

> Detecta los sistemas simbólicos de la categoría: qué se legitima, ridiculiza, transgrede; códigos dominantes, emergentes, propios de marca y compartidos.

---

## Resumen (formato cliente)

- **Nombre:** Cultural Codes Decoding
- **Objetivo:** Decodificar símbolos, lenguaje, aspiraciones, tensiones, rituales, memes y narrativas que estructuran la categoría, y de quién es cada código.
- **Cuándo se usa:** estrategia de marca, tono de voz, brand platform, foresight cultural.
- **Entidades comparadas:** categoría (baseline cultural) + marca + competidores (¿quién posee qué código?).
- **Inputs necesarios:** corpus 1,200–3,000+ de **texto largo** (foros, blogs, ensayos, podcasts/video transcrito, editorial). Evitar puramente transaccional. Window 6–18 meses.
- **Dimensiones/ejes:** **nivel** {superficial, estructural, mítico} × **oposición binaria** (ej. frescura/tradición) × **madurez** {emergente, acelerando, mainstreaming}.
- **Cómo se puntúa:** por código → frecuencia, intensidad cultural, madurez, ownership (categoría/marca/compartido); `tension_score` para oposiciones activas.
- **Outputs esperados:** mapa de códigos en 3 niveles, oposiciones binarias, tensiones activas, whitespace narrativo, recomendaciones de voz.
- **Ejemplo de insight:** *"El código 'lujo silencioso' está acelerando (emergente→mainstream) y ninguna marca de la categoría lo posee: whitespace narrativo capturable."*
- **Prioridad:** media (componente visual de Cultural Tension Cards ya validado en estudios previos).

## Marco técnico

- **entity:** categoría + marcas.
- **unit of analysis:** código cultural (cluster de menciones que comparten símbolo/lenguaje).
- **dimensions:** `level`, `binary_opposition`, `maturity`, `ownership` → `engine_findings.dimensions`.
- **scoring:** `frequency`, `cultural_intensity`, `maturity` (Opus + tendencia temporal sobre `published_at`), `tension_score` (qué tan disputada está la oposición), ownership de share.
- **evidence:** citas de **texto largo** (no fragmentos), curadas por código.
- **output contract:** `methodology_blocks.cultural_codes` (stub: `rows[{code,category_count,brand_count,dominant_entity}]`).

## Datos y qué necesita para un resultado real

- **Imprescindible:** densidad cultural (texto largo). Pre-flight rechaza corpus sólo de reviews cortas. `brand_knowledge_sources` editorial/document es oro aquí.
- **Para "real":** ventana larga (6–18m) para detectar madurez/movimiento generacional. Memoria `memory_industry` (códigos vigentes del vertical, registro de foresight previo) entra como contexto Voyage.
- Ownership de código requiere atribución por entidad; sin ella, sólo se reporta el código de categoría.

## Voyage + Opus

- Voyage: clustering semántico de pasajes largos en candidatos a código + recupera memoria cultural previa (Cultural Foresight) para no re-descubrir.
- Opus: asciende del nivel superficial al mítico, nombra la oposición binaria, asigna madurez. Tarea netamente interpretativa — el corazón Opus de la familia.

## Diseño de charts

1. **Chart primario — `waterfall` de 3 niveles.** Superficial → estructural → mítico; cada código fluye entre niveles. Hover = vocabulario representativo; click = drawer de citas largas.
2. **Chart soporte — `binary_oppositions` (eje de tensión).** Cada oposición como un eje horizontal con marcas/categoría posicionadas en el continuo; `tension_score` colorea la intensidad de disputa.
3. **Chart evidencia — `tension_card` grid + `maturity_badges`.** Cards (tensión + cita + implicación) con badge emergente/acelerando/mainstreaming.

**Conclusiones:** `dominant_codes[]`, `emerging_codes[]`, `brand_owned_codes[]`, `shared_codes[]`, `narrative_whitespace[]`, `voice_recommendations[]`.

## Output contract

```jsonc
"cultural_codes": {
  "kind": "cultural_codes_decoding",
  "codes": [ { "code","level","binary_opposition","maturity","ownership",
     "cultural_intensity","tension_score","vocabulary":[...],"evidence_ids":[...],"confidence" } ],
  "oppositions": [...], "active_tensions": [...], "narrative_whitespace": [...],
  "voice_recommendations": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Distinguir código vigente vs emergente con evidencia temporal, no intuición. Sin texto largo no se publica nivel mítico. Capa #16 por código.
</content>
</invoke>
