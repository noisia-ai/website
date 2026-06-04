# 15 · Trust & Risk Benchmark

`slug: trust-risk-benchmark` · status: nuevo · prioridad: **media** (alta en industrias sensibles)

> Especialmente útil en industrias sensibles (finanzas, salud, telecom, seguros). Mide confianza, reputación, quejas, percepción de abuso, transparencia.

---

## Resumen (formato cliente)

- **Nombre:** Trust & Risk Benchmark
- **Objetivo:** Medir confianza y exposición reputacional por entidad, e identificar los temas de riesgo que pueden escalar.
- **Cuándo se usa:** industrias reguladas/sensibles, gestión de reputación, due diligence, alertas tempranas de crisis.
- **Entidades comparadas:** marca vs competidores vs categoría.
- **Inputs necesarios:** corpus con quejas/reputación (foros, reviews 1–2★, soporte, prensa). Sentimiento + temas de riesgo.
- **Dimensiones/ejes:** **trust drivers** {confiabilidad, transparencia, atención, cumplimiento} vs **risk themes** {abuso, letra chica, fraude, fallas, opacidad}.
- **Cómo se puntúa:** `trust_score = f(sentiment, share trust-drivers, recencia)`; `risk_score = severidad · frecuencia · tendencia (escalando?)`; `reputational_vulnerability` = riesgo exclusivo de la marca.
- **Outputs esperados:** trust score benchmark, risk themes rankeados, vulnerabilidades reputacionales, comparativo de transparencia, alertas de escalada.
- **Ejemplo de insight:** *"Tu trust score (62) supera al líder (54), pero 'cargos no autorizados' está escalando (+40% trimestre) y es casi exclusivo tuyo: vulnerabilidad #1 antes de que sea prensa."*
- **Prioridad:** media — alta para finanzas/telecom/seguros.

## Marco técnico

- **entity:** todas.
- **unit of analysis:** mención de confianza o de riesgo.
- **dimensions:** `trust_driver` | `risk_theme`, `severity`, `escalating` → `engine_findings.dimensions`.
- **scoring:** `trust_score` (0–100, comparable), `risk_score` por tema (severidad·frecuencia·tendencia), `vulnerability` = `ownership` de un risk_theme negativo.
- **evidence:** citas de queja/abuso/elogio de confianza.
- **output contract:** `methodology_blocks.trust_risk`.

## Datos y qué necesita para un resultado real

- **Imprescindible:** fuentes donde vive el riesgo: foros de queja, reviews bajas, soporte, prensa (`brand_knowledge_sources.editorial`). Social positivo solo subestima el riesgo.
- **Para "real":** la **tendencia** (escalando vs estable) requiere ventana temporal suficiente (`published_at`) — un risk_theme sin tendencia es foto, no alerta.
- Severidad la pondera Opus (un "cargo no autorizado" pesa más que "tardó el envío"), con criterio explícito.

## Voyage + Opus

- Voyage: recupera quejas dispersas y las agrupa por risk_theme; detecta temas emergentes.
- Opus: clasifica severidad y tipo de riesgo, distingue queja anecdótica de patrón sistémico, marca si escala.

## Diseño de charts

1. **Chart primario — `matrix_2x2` severidad × frecuencia** de risk themes (cuadrante alto-alto = crisis latente); burbujas por tema, color = escalando. Hover/click = evidencia.
2. **Chart soporte — `bar_ranking` de trust_score por entidad** + drivers de confianza.
3. **Chart evidencia — `timeline` de risk themes** mostrando escalada; `tension_card` por vulnerabilidad reputacional.

**Conclusiones:** `trust_benchmark[]`, `risk_themes[]` (rankeados), `reputational_vulnerabilities[]` (exclusivas de la marca), `escalation_alerts[]`, `recommendations`.

## Output contract

```jsonc
"trust_risk": {
  "kind": "trust_risk_benchmark",
  "entities": [ { "entity_id","trust_score","confidence" } ],
  "risk_themes": [ { "theme","severity","frequency","escalating","risk_score","owner_entity_id","evidence_ids":[...] } ],
  "vulnerabilities": [...], "escalation_alerts": [...], "limitations": [...]
}
```

## Confianza / limitaciones

No declarar crisis sin patrón (frecuencia + severidad + tendencia). Severidad es criterio Opus auditable, no objetivo absoluto. Capa #16 por tema.
</content>
</invoke>
