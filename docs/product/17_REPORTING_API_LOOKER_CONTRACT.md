# Reporting API + Looker Contract

Fecha: 2026-05-28

## Objetivo

Exponer reportes publicados de Noisia como datasets planos para herramientas BI
externas como Looker Studio, sin obligar al cliente a entrar a Signal y sin
exponer la base operativa.

La fuente de verdad es `published_outputs.payload`, no `mentions`, `tb_*` ni
query iterations en vivo. Esto mantiene la promesa de snapshot: si un reporte
fue publicado, sus datos de API son estables y auditables.

## Principios

- El API entrega data client-safe; no entrega notas internas.
- El contrato es tabular, no un JSON editorial gigante.
- Cada dataset incluye `output_id` para joins en Looker.
- Las menciones expuestas son sólo evidencia seleccionada en el reporte, no el
  corpus completo.
- Las limitaciones internas, quality gates y structural notes privadas quedan
  fuera del contrato.

## Auth

Header recomendado:

```http
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

Fallback soportado:

```http
x-noisia-api-key: <NOISIA_REPORTING_API_KEY>
```

Variable de entorno:

```bash
NOISIA_REPORTING_API_KEYS='sephora:sk_live_xxx:b1be058b-814e-4e6d-805e-14b02cfe224e'
```

Formato:

```txt
label:key:outputId1|outputId2
```

Para llaves internas de admin se permite `*`:

```bash
NOISIA_REPORTING_API_KEYS='internal:sk_live_admin:*'
```

También se soporta JSON:

```json
[
  {
    "label": "sephora",
    "key": "sk_live_xxx",
    "outputs": ["b1be058b-814e-4e6d-805e-14b02cfe224e"]
  }
]
```

## Endpoints

Base:

```txt
https://studio.noisia.ai/api/public/v1
```

Lista de reportes visibles para la API key:

```txt
GET /reports
```

Datasets por reporte:

```txt
GET /reports/:outputId/summary
GET /reports/:outputId/kpis
GET /reports/:outputId/findings
GET /reports/:outputId/recommendations
GET /reports/:outputId/time-series/monthly
GET /reports/:outputId/distributions/platform
GET /reports/:outputId/distributions/layer
GET /reports/:outputId/distributions/mobility
GET /reports/:outputId/distributions/polarity
GET /reports/:outputId/evidence-sample
```

CSV:

```txt
GET /reports/:outputId/datasets/findings.csv
GET /reports/:outputId/datasets/recommendations.csv
GET /reports/:outputId/datasets/time-series-monthly.csv
```

También se puede usar `?format=csv`.

## Datasets

### `summary`

Una fila por reporte.

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `report_version` | number |
| `brand_name` | string |
| `methodology` | string |
| `methodology_slug` | string |
| `business_question` | string |
| `headline` | string |
| `summary` | string |
| `generated_at` | datetime |
| `published_at` | datetime |
| `corpus_total_mentions` | number |
| `window_start` | datetime |
| `window_end` | datetime |
| `window_months` | number |

### `kpis`

Una fila por KPI.

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `metric_key` | string |
| `metric_label` | string |
| `metric_value` | number |

### `findings`

Una fila por hallazgo público.

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `finding_id` | string |
| `finding_name` | string |
| `polarity` | trigger/barrier |
| `layer` | psicologico/personal/social/cultural |
| `mobility` | movible_por_marca/parcialmente_movible/estructural |
| `confidence` | alta/media/baja_direccional |
| `frequency_mentions` | number |
| `intensity_score` | number |
| `composite_score` | number |
| `citation_count` | number |
| `public_quote` | string |

### `recommendations`

Acciones públicas. Excluye `structural_note`.

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `recommendation_id` | string |
| `finding_id` | string |
| `finding_name` | string |
| `kind` | activation/friction_removal |
| `recommendation_text` | string |
| `intervention_type` | string |
| `estimated_effort` | string |
| `success_signal` | string |
| `suggested_owner` | string |
| `recommended_medium` | string |
| `recommended_tone` | string |
| `confidence` | string |
| `priority_rank` | number |

### `time-series-monthly`

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `month` | YYYY-MM |
| `mention_count` | number |

### Distribuciones

`platform-distribution`

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `platform` | string |
| `mention_count` | number |
| `share_pct` | number |

`layer-distribution`

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `layer` | string |
| `finding_count` | number |
| `share_pct` | number |
| `avg_intensity` | number |

`mobility-distribution`

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `mobility` | string |
| `finding_count` | number |
| `share_pct` | number |

`polarity-distribution`

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `polarity` | string |
| `finding_count` | number |
| `share_pct` | number |

### `evidence-sample`

Sólo evidencia seleccionada para el reporte.

| Campo | Tipo |
|---|---|
| `output_id` | string |
| `mention_id` | string |
| `finding_id` | string |
| `finding_name` | string |
| `text` | string |
| `platform` | string |
| `published_at` | datetime |
| `is_protagonist` | boolean |

## Excluido por compliance

- `quality.failed`
- `quality.gates_total`
- `limitations`
- `actions.structural_notes`
- notas internas de segunda ronda o futuras mejoras
- usuarios internos
- corpus completo
- menciones excluidas
- snapshots internos
- cleanup history
- query iterations y queries de SentiOne

## Looker Studio

MVP:

1. Crear API key por cliente/output.
2. Probar CSV con `findings.csv` y `time-series-monthly.csv`.
3. Crear Community Connector con datasets seleccionables.
4. En Looker, modelar relaciones por `output_id` y `finding_id`.

El conector deberá pedir:

- API key
- Output ID
- Dataset

Y llamar el endpoint JSON correspondiente.
