# Noisia Public Reporting API V2

## OpenAPI para ReadMe

Sube o importa este archivo en ReadMe:

```txt
https://studio.noisia.ai/api/public/openapi.yaml
```

## Personalized Docs Webhook

Si ReadMe muestra el wizard de **API Keys, Server Variables & More**, configura
el webhook para pre-poblar el token del usuario en el API Explorer.

### Lenguaje

Selecciona **Node.js** en el wizard.

### Webhook URL

```txt
https://studio.noisia.ai/api/readme/personalized-docs
```

### Variables de entorno requeridas en Studio

```bash
README_WEBHOOK_SECRET='<SECRET_DE_README>'
```

Para una sola llave default:

```bash
NOISIA_README_DEFAULT_API_KEY='<NOISIA_REPORTING_API_KEY>'
```

Para mapear llaves por email de usuario en ReadMe:

```bash
NOISIA_README_API_KEYS_BY_EMAIL='{
  "cliente@empresa.com": "sk_cliente_xxx",
  "otro@empresa.com": "sk_otro_xxx",
  "default": "sk_default_xxx"
}'
```

Las llaves devueltas por este webhook deben existir también en
`NOISIA_REPORTING_API_KEYS`; si no, ReadMe las mostrará pero la API rechazará el
request.

### Security Scheme variables

El webhook devuelve:

```json
{
  "bearerAuth": "<NOISIA_REPORTING_API_KEY>",
  "noisiaApiKey": "<NOISIA_REPORTING_API_KEY>",
  "x-noisia-api-key": "<NOISIA_REPORTING_API_KEY>"
}
```

ReadMe usa `bearerAuth` para completar:

```http
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

## Base URL

```txt
https://studio.noisia.ai/api/public/v2
```

## API Key

La API usa Bearer token.

```http
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

Fallback soportado:

```http
x-noisia-api-key: <NOISIA_REPORTING_API_KEY>
```

> No guardar la llave real en GitHub, ReadMe público, Slack abierto ni archivos versionados.
> Compartirla por un canal seguro y reemplazar `<NOISIA_REPORTING_API_KEY>` al consumir la API.

## Endpoints principales

### Listar reportes publicados

```http
GET https://studio.noisia.ai/api/public/v2/reports
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

### Obtener reporte completo

```http
GET https://studio.noisia.ai/api/public/v2/reports/:outputId
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

### Obtener una sección del reporte

```http
GET https://studio.noisia.ai/api/public/v2/reports/:outputId/sections/:section
Authorization: Bearer <NOISIA_REPORTING_API_KEY>
```

Secciones disponibles:

```txt
overview
findings
decision-field
action-cards
strategic-opportunities
competitive-intelligence
emerging-patterns
future-signals
market-analysis
knowledge-impact
evidence-deep-dives
aggregates
evidence-sample
manifest
```

## Ejemplos con curl

```bash
curl -H "Authorization: Bearer <NOISIA_REPORTING_API_KEY>" \
  "https://studio.noisia.ai/api/public/v2/reports"
```

```bash
curl -H "Authorization: Bearer <NOISIA_REPORTING_API_KEY>" \
  "https://studio.noisia.ai/api/public/v2/reports/<OUTPUT_ID>"
```

```bash
curl -H "Authorization: Bearer <NOISIA_REPORTING_API_KEY>" \
  "https://studio.noisia.ai/api/public/v2/reports/<OUTPUT_ID>/sections/overview"
```

## Respuestas de auth esperadas

Sin API key:

```json
{
  "error": "missing_api_key",
  "message": "Missing reporting API key."
}
```

Con API key inválida:

```json
{
  "error": "invalid_api_key",
  "message": "Invalid reporting API key."
}
```

Con API key válida pero sin acceso al reporte:

```json
{
  "error": "forbidden_output",
  "message": "API key cannot access this report."
}
```

## Nota de versión

V2 entrega JSON estructurado client-ready. Para CSV o datasets planos de Looker,
usar V1:

```txt
https://studio.noisia.ai/api/public/v1
```
