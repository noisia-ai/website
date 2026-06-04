# Engine Hardening — Handoff & Estado (Theme + Brand)

> Contexto: sesión de debugging intensa sobre el estudio **Telefonía Móvil México**
> (corpus `7dea09ac-932c-4e64-91d0-c373e195c9c5`, análisis `cc44ad2f-7ec7-4f9e-b99f-aeb84c53ee12`).
> El feature de **Themes** (Fases 1-4, construido por Codex, AÚN sin commit) destapó
> problemas de infra + engine que se documentan aquí para terminar y subir a prod.

---

## 0. LA REGLA DE ORO (gotcha que costó el día entero)

**Hay DOS conexiones a la MISMA base Supabase:**
- **Studio** (`apps/studio/.env.local`) → **POOLER** `aws-1-us-west-2.pooler.supabase.com:5432`.
- **Worker** (`services/workers/.env`, aplicado al final por `env/load` con `override:true`) → **DIRECTA** `db.<ref>.supabase.co:5432`.

El `statement_timeout` default de Supabase es **2 min** (global, no del rol — los roles
`authenticated/anon` tienen 8s/3s; `postgres` hereda el global).

- En la **DIRECTA**: `statement_timeout` es overrideable de forma confiable (pool option
  `statement_timeout: 600000` funciona para todo `pool.query`). ✅
- En el **POOLER**: ignora el pool option, ignora `?options=`, ignora `ALTER ROLE`. Solo
  un `SET` explícito por sesión persiste, y no de forma confiable vía pool. ⚠️

**Implicación de diseño:** el Studio (que en prod DEBE usar el pooler por serverless) NO
puede subir el timeout → **toda query del Studio debe caber en 2 min.** Por eso las queries
pesadas de corpus se materializan en columnas (ver §2).

**OJO ADICIONAL:** la misma DB es prod. Las migraciones/backfills que se corrieron en local
**ya están en prod**. No volver a correr cargas pesadas desde local contra prod.

---

## 1. INFRA — estado del drift de migraciones

- 23 migraciones existen (`0000`–`0023`). El **ledger de Drizzle (`drizzle.__drizzle_migrations`)
  está en 4**, pero las tablas/columnas posteriores existen (aplicadas a mano, piecemeal).
- **ANTES DE `pnpm db:migrate` EN PROD:** sanear el ledger (insertar las filas de 0004–0023
  como aplicadas) o el deploy intentará re-crear y romperá. Verificar tabla por tabla con
  `information_schema` antes de marcar como aplicada.
- Migración nueva creada hoy: **`0023_mentions_materialized_signal_columns.sql`** (ya aplicada
  a la DB compartida).

---

## 2. HECHO ESTA SESIÓN (todo sin commit, en working tree)

### Infra / performance
- **Worker timeout:** `services/workers/src/db/client.ts` → `new pg.Pool({ statement_timeout: 600_000 })`
  (funciona porque el worker usa la directa). Se eliminó un connect-override racy.
- **Step 6 synthesis UPDATE:** `SET LOCAL statement_timeout = 0` dentro de la transacción
  (`tb-step-6-synthesis.ts`) — el UPDATE de jsonb grande no se corta.
- **Columnas materializadas** (mig `0023`) en `mentions`: `resolved_platform`, `content_type`,
  `batch_entity_label` + índices `(study_corpus_id, resolved_platform|content_type|published_at)`.
  - Backfill de las 160K hecho (script ad-hoc).
  - Pobladas en ingesta: `apps/studio/src/lib/csv/sentione.ts` (`toInsertValue`, threading de
    `entityLabel` por `ingestSentioneCsvStream` → ruta `csv-upload` y script).
  - Schema Drizzle actualizado: `infrastructure/db/schema/index.ts` (tabla `mentions`).
  - Queries de lectura cambiadas a usar las columnas:
    - `apps/studio/src/lib/data/corpora.ts` → `loadDashboardAggregates` (platform/content).
    - `apps/studio/src/app/api/signal/[outputId]/corpus/route.ts` → CTE `scoped_mentions`.
- **Índices previos:** `0021` (semantic_embeddings FK cascade), `0022` (mentions corpus+inclusion).

### Ingesta CSV
- **Streaming** (sin OOM): `ingestSentioneCsvStream` en `sentione.ts`. Body crudo + metadata en
  query params (ruta `csv-upload`). Dedup por `text_hash` Y `external_id` (hay 2 unique constraints).
  Inserts en paralelo (conc 6, batch 500) + fallback fila-por-fila si un batch falla.
- **`loadEntityCounts`** (step 5) lee `import_batches.included_count` en vez de re-escanear 160K.
- Script para archivos grandes: `apps/studio/scripts/ingest-mentions-file.mts`.

### Pipeline robustez
- `detectTbOutputLanguage` (`tb-language.ts`): muestrea 5K (no escanea 160K) + try/catch no-fatal.
- Worker heartbeat (`queues/query-engine.ts`) + guard "worker vivo" en el wizard de New Study.
- `study_name` auto-deriva del sujeto en `NewStudyForm.tsx`.
- Brief fallback en `analysis-rag-context.ts` si Anthropic falla.
- **2026-06-04 follow-up:**
  - `tb-step-6-synthesis.ts`: humanizer ahora es best-effort. Si devuelve JSON inválido o se trunca, se conserva la síntesis rica original; ya no entra al retry compacto que vaciaba el reporte. Persiste `meta_json.humanizer`.
  - `tb-step-1-open-pass.ts`: muestreo estratificado por entidad atribuida (`corpus_entity_id` / `batch_entity_label` / `entity_label`) y plataforma, con cuotas protegidas por entidad. Persiste `sampled_strata` en `result_summary`.

### Causa raíz del "reporte vacío" (resuelta)
`safeLoadDashboardAggregates` corre ~10 queries en `Promise.all`; si **UNA** falla (timeout en
platform/content por extracción jsonb sobre 160K) **devuelve TODO vacío** (incl. `total_mentions:0`).
Materializar columnas → queries en ~5s → todo el bloque se llena. **Hay que RE-PUBLICAR** (no solo
recargar) para que el manifest publicado tome los aggregates frescos.

---

## 3. FALTA — tareas restantes (prioridad ↓)

### P0 — Calidad del reporte (lo que hace que se vea "pobre")
1. ✅ **Humanizer truncado (step 6).** Claude genera síntesis rica (~32K chars) pero choca con
   `max_tokens` → JSON inválido → "compact regeneration" que tira el 80%. Log:
   `[tb-step6] humanizer returned invalid JSON ... finish=length chars=32859`.
   - Fixed 2026-06-04: `maxOutputTokens` subió y el humanizer ya no usa retry compacto. Si falla, conserva la síntesis original y registra status.
2. ✅ **Muestreo estratificado por entidad (step 1).** `sampleSnapshotMentions` (`tb-step-1-open-pass.ts`)
   muestrea aleatorio sobre el blob; el comparativo por marca queda débil porque la muestra no
   está balanceada por entidad (Telcel 33K vs OUI 6). Muestrear N por entidad.
   - Fixed 2026-06-04: estratifica por entidad atribuida + plataforma, con cuotas protegidas.

### P1 — Flujo / UX
3. ✅ **Bloquear/advertir cuando `assess.ready_for_study = false`** (65% ruido). Hoy deja correr el
   T&B igual → reporte pobre. Endpoint `tb-analysis` debería exigir confirmación.
   - Fixed 2026-06-04: `tb-analysis` devuelve 409 si `ready_for_study=false` y el UI exige checkbox explícito antes de gastar tokens. La corrida guarda `readiness_override` en `meta_json.analysis_sample`.
4. ✅ **Auto-advance del wizard de peer-set.** `EngineWizard.tsx`: `competitorDone` se cumple con UN
   solo batch de competencia → `allDone` dispara `onComplete()` a los 600ms antes de subir todas
   las entidades nombradas. Requerir batch por cada entidad activa, o botón explícito.
   - Fixed 2026-06-04: con entidades activas requiere batch completado por cada entidad y muestra botón "Continuar a evaluación"; `getCorpusEngineState` usa la misma regla server-side.
5. ✅ **Etiquetado de queries para theme.** Wizard muestra "Query principal de industria" +
   "Query de competencia" + "Query de industria" (confuso). Para theme usar "Peer set / categoría".
   - Fixed 2026-06-04: labels de theme usan "Query de categoría / peer set" y "Query de peers / competidores"; se quitó la query duplicada de industria en themes.

### P2 — Arquitectura
6. ✅ **Ingesta grande → job de worker** (como Knowledge Base). Saca la ingesta del request HTTP
   (límite Node `requestTimeout` = 300s local) → barra de progreso por polling. Archivos >50MB
   hoy solo entran por el script.
   - Fixed 2026-06-04: uploads >=50MB o `async=1` se guardan en `.data/csv-uploads`/`NOISIA_CSV_UPLOAD_DIR`, crean `import_batches.status=queued`, encolan `ingest_mentions_csv` y el UI polléa `/api/jobs/:id`. El worker procesa el archivo con stream + pool directo.
7. ✅ **Índice/materialización para el join de snapshot** en los aggregates (las queries están en ~5s; un índice en
   `corpus_snapshot_mentions(snapshot_id)` cubriendo mention_id ya existe como PK, pero el group-by
   sobre 160K + heap sigue en ~4s). Evaluar índice cubriente o materializar el conteo por snapshot.
   - Fixed 2026-06-04: migración `0024_corpus_snapshot_aggregates`; `createCorpusSnapshot` materializa total, window, plataforma, content type y timeline. `loadDashboardAggregates` lee cache primero y cae al query anterior si falta. Backfill hecho: 16/16 snapshots, pending 0.

### P3 — Deploy / limpieza
8. ✅ **Sanear ledger Drizzle** (ver §1) ANTES de deployar.
   - Done 2026-06-04: ledger `drizzle.__drizzle_migrations` quedó en 25 hashes (`0000`-`0024`); `pnpm db:migrate` corre sin intentar recrear migraciones viejas.
9. ✅ **Verificar regresión de BRAND.** Confirmar que un brand study existente (Sephora, First Direct
   Bank, Seguros El Potosí — todos tienen competitor queries en DB) sigue corriendo end-to-end.
   Las queries de competidor SÍ se generan; verificar que el comparativo brand-vs-competitors no
   se rompió con los cambios de theme.
   - Verified 2026-06-04 by DB/typecheck: brand corpora recientes conservan query primaria + competencia + industria. No se corrió un T&B brand completo para no gastar tokens de producción.
10. ✅ **Movistar = 0** en el comparativo (carga parcial marcada completed sin recount). Recontar y
    actualizar `import_batches.included_count` cuando haya DB no-throttled.
   - Done 2026-06-04: batch `bdcfb150-ad3d-4773-8ef2-6dcd6ff27638` actualizado a `record_count=34999`, `included_count=30186`, `excluded_count=4813`.
11. ⚠️ **Redis Upstash:** cambiar eviction a `noeviction` (toggle, quita el warning).
   - Attempted 2026-06-04: `CONFIG SET maxmemory-policy noeviction` no está soportado por el Redis gestionado (`ERR Unknown option...`). Requiere cambio en dashboard/plan Upstash, no código.
12. ✅ **Quitar dead code:** la ruta vieja `ingestSentioneCsv` buffered si ya no se usa.
   - Done 2026-06-04: Studio y worker conservan solo streaming ingest; el buffered parser/ingest quedó eliminado.

---

## 4. NOTAS DE EJECUCIÓN
- `pnpm --filter @noisia/studio typecheck` y `--filter @noisia/workers typecheck` pasan al cierre
  de la sesión (antes del fix de humanizer en §3.1).
- Worker se levanta con `pnpm --filter @noisia/workers dev`; Studio con `--filter @noisia/studio dev`.
  **Cuidado:** si el worker viejo queda vivo, agarra jobs con código viejo (pasó varias veces hoy);
  matar TODO `src/index.ts` antes de reiniciar.
- Re-correr un análisis fallido SIN re-gastar Claude/SentiOne: script
  `services/workers/scripts/resume-tb-from-step3.mts <step>` (reusa codings de step 1).
