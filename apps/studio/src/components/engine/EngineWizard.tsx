"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CorpusMaintenancePanel,
  type CleanupAction,
  type Snapshot,
} from "@/components/engine/CorpusMaintenancePanel";
import { CopyQueryButton } from "@/components/engine/CopyQueryButton";
import { Icon } from "@/components/ui/Icon";
import { StatusPill, SuccessPill } from "@/components/ui/StatusPill";
import { queryPackHasData, queryPackHasDirectCsv } from "@/lib/engine/query-pack-readiness";

/* ============================================================
   Types — kept minimal; the server passes only what the wizard needs.
   ============================================================ */

type Step = "compose" | "upload" | "evaluate" | "decide" | "approved";

type Iteration = {
  id: string;
  iterationNumber: number;
  queryText: string;
  competitorQueryText: string | null | undefined;
  industryQueryText: string | null | undefined;
  qualityScore: string | null;
  densityScore: string | null;
  noiseScore: string | null;
  aiEvaluationNotes: unknown;
  insightsManagerDecision: string | null;
  createdAt: Date | string;
};

type Batch = {
  id: string;
  queryIterationId: string | null;
  queryPackId: string | null;
  mentionType: string | null;
  competitorId: string | null;
  corpusEntityId: string | null;
  entityKind: string | null;
  entityLabel: string | null;
  recordCount: number | null;
  includedCount: number | null;
  excludedCount: number | null;
  sourceFileName: string | null;
  status: string;
  createdAt: Date | string;
};

type QueryPack = {
  id: string;
  queryIterationId: string | null;
  lensSlug: string;
  signalIntent: string;
  scope: string;
  objective: string | null;
  queryText: string | null;
  queryComponents: unknown;
  seeds: unknown;
  status: string;
  mentionsReturned: number | null;
  linkedMentionCount?: number | null;
  createdAt: Date | string;
};

type CorpusCounts = {
  total: number;
  included: number;
  excluded: number;
  pending: number;
};

type CompetitorOption = {
  id: string;
  canonicalName: string;
  vertical: string | null;
  subVertical: string | null;
};

type CorpusEntity = {
  id: string;
  competitorId: string | null;
  entityKind: string;
  name: string;
  aliases: string[] | null;
  handles: string[] | null;
  querySeeds: string[] | null;
  notes: string | null;
  isCategoryBaseline: boolean | null;
  priority: number | null;
  status: string;
  batchCount: number;
  includedCount: number;
};

type Assessment = {
  ready_for_study: boolean;
  confidence: number;
  verdict: "ready" | "needs_more_signal" | "needs_more_volume" | "corpus_too_noisy";
  coverage: {
    trigger_signal_pct: number;
    barrier_signal_pct: number;
    experience_signal_pct: number;
    noise_pct: number;
  };
  signals_well_covered: string[];
  signals_missing: string[];
  recommendation: string;
  sample_size?: number;
  model?: string;
};

type WizardProps = {
  corpusId: string;
  corpusName: string;
  subjectType: "brand" | "theme";
  methodologyName: string | null;
  corpus: CorpusCounts;
  iterations: Iteration[];
  batches: Batch[];
  queryPacks: QueryPack[];
  selectedLensCount: number;
  current: Iteration | null;
  activeStep: Step;
  isApproved: boolean;
  readyToApprove: boolean;
  assessment: Assessment | null;
  assessedAt: Date | string | null;
  snapshots: Snapshot[];
  cleanups: CleanupAction[];
  competitors: CompetitorOption[];
  entities: CorpusEntity[];
};

type EvalNotes = {
  notes?: string;
  proposed_adjustments?: string[];
  language_mx_pct?: number;
  geo_mx_pct?: number;
} | null;

type JobState = {
  id: string;
  name?: string;
  status: string;
  progress: number;
  failed_reason?: string | null;
};

/* ============================================================
   Helpers
   ============================================================ */

function parseNotes(raw: unknown): EvalNotes {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EvalNotes;
    } catch {
      return null;
    }
  }
  return raw as EvalNotes;
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n);
}

/* ============================================================
   Main Wizard
   ============================================================ */

export function EngineWizard(props: WizardProps) {
  const router = useRouter();
  const {
    corpusId,
    corpusName,
    subjectType,
    methodologyName,
    corpus,
    iterations,
    batches,
    queryPacks,
    selectedLensCount,
    current,
    activeStep: serverActiveStep,
    isApproved,
    readyToApprove,
    assessment,
    assessedAt,
    snapshots,
    cleanups,
    competitors,
    entities,
  } = props;

  // Active step — server's computation is the source of truth, but we may
  // optimistically advance locally while a job is in flight.
  const [activeStep, setActiveStep] = useState<Step>(serverActiveStep);
  useEffect(() => setActiveStep(serverActiveStep), [serverActiveStep]);

  const iterationNumber = current ? current.iterationNumber : (iterations[0]?.iterationNumber ?? 0) + 1;

  // History = everything except the current one
  const history = useMemo(() => {
    if (!current) return iterations;
    return iterations.filter((i) => i.id !== current.id);
  }, [iterations, current]);

  const currentBatches = useMemo(
    () => (current ? batches.filter((b) => b.queryIterationId === current.id) : []),
    [batches, current]
  );
  const currentQueryPacks = useMemo(
    () => (current ? queryPacks.filter((pack) => pack.queryIterationId === current.id) : []),
    [queryPacks, current]
  );

  return (
    <div className="wizard-shell">
      {/* Vital signs header */}
      <CorpusVitals
        name={corpusName}
        methodology={methodologyName}
        counts={corpus}
        iterationCount={iterations.length}
        latestQuality={current?.qualityScore ? Number(current.qualityScore) : null}
        readyToApprove={readyToApprove || (assessment?.ready_for_study ?? false)}
        isApproved={isApproved}
      />

      {selectedLensCount > 1 ? (
        <LensFeedSummary
          batches={batches}
          queryPacks={queryPacks}
          selectedLensCount={selectedLensCount}
        />
      ) : null}

      {/* Corpus-level readiness — independent of per-iteration eval.
          Stays visible after approval too so the IM can see the snapshot. */}
      {(corpus.included >= 1000 || assessment) && (
        <CorpusAssessmentPanel
          corpusId={corpusId}
          totalIncluded={corpus.included}
          assessment={assessment}
          assessedAt={assessedAt}
          isApproved={isApproved}
          latestQuality={current?.qualityScore ? Number(current.qualityScore) : null}
          iterationCount={iterations.length}
        />
      )}

      {/* Maintenance — only visible once there's something to maintain */}
      {corpus.included >= 100 && (
        <CorpusMaintenancePanel
          corpusId={corpusId}
          totalIncluded={corpus.included}
          snapshots={snapshots}
          cleanups={cleanups}
        />
      )}

      {/* Main card */}
      <article className="wizard-card">
        <header className="wizard-card-head">
          <div>
            <div className="wizard-card-eyebrow-row">
              <p className="wizard-iter-label">
                {activeStep === "approved"
                  ? "Iteración cerrada · corpus aprobado"
                  : iterations.length === 0
                    ? "Primera iteración"
                    : `Iteración #${iterationNumber}`}
              </p>
              {isApproved && <SuccessPill>Corpus aprobado</SuccessPill>}
              {isApproved && activeStep !== "approved" && (
                <StatusPill tone="info"><Icon name="refresh" size={12} /> Enriqueciendo</StatusPill>
              )}
              {!isApproved && current && (
                activeStep === "evaluate" || activeStep === "compose" ? (
                  <StatusPill tone="idle"><Icon name="info" size={12} /> En curso</StatusPill>
                ) : activeStep === "decide" ? (
                  current.qualityScore && Number(current.qualityScore) >= 7 ? (
                    <SuccessPill>Alta calidad</SuccessPill>
                  ) : (
                    <StatusPill tone="warn"><Icon name="alert" size={12} /> Requiere ajustes</StatusPill>
                  )
                ) : (
                  <StatusPill tone="info"><Icon name="upload" size={12} /> Esperando CSVs</StatusPill>
                )
              )}
            </div>
            <h2 className="wizard-iter-title">
              {activeStep === "approved"
                ? "Sigue iterando para subir la densidad"
                : isApproved
                  ? "Iteración post-aprobación · más menciones al corpus"
                  : current?.qualityScore
                    ? "Diagnóstico listo · decide el siguiente paso"
                    : "Generar, ingerir y evaluar"}
            </h2>
          </div>
          {activeStep !== "approved" && (
            <StepIndicator
              steps={[
                { id: "compose", label: "Generar" },
                { id: "upload", label: "Ingerir" },
                { id: "evaluate", label: "Evaluar" },
                { id: "decide", label: "Decidir" },
              ]}
              activeStep={activeStep}
            />
          )}
        </header>

        <div className="wizard-card-body">
          {isApproved && activeStep === "approved" ? (
            <ApprovedImproveState
              corpusId={corpusId}
              onContinued={() => {
                router.refresh();
                setActiveStep("upload");
              }}
            />
          ) : activeStep === "compose" ? (
            <StepCompose
              corpusId={corpusId}
              hasHistory={iterations.length > 0}
              onComposed={() => {
                router.refresh();
                setActiveStep("upload");
              }}
            />
          ) : !current ? null : activeStep === "upload" ? (
            <StepUpload
              corpusId={corpusId}
              iteration={current}
              existingBatches={currentBatches}
              queryPacks={currentQueryPacks}
              selectedLensCount={selectedLensCount}
              competitors={competitors}
              entities={entities}
              subjectType={subjectType}
              onPacksMaterialized={() => router.refresh()}
              onComplete={() => {
                router.refresh();
                setActiveStep("evaluate");
              }}
            />
          ) : activeStep === "evaluate" ? (
            <StepEvaluate
              corpusId={corpusId}
              iteration={current}
              corpusTotal={corpus.included}
              onEvaluated={() => {
                router.refresh();
                setActiveStep("decide");
              }}
            />
          ) : (
            <StepDecide
              corpusId={corpusId}
              iteration={current}
              readyToApprove={readyToApprove}
              onActioned={() => router.refresh()}
            />
          )}
        </div>
      </article>

      {/* History (collapsed) */}
      {history.length > 0 && <IterationHistory iterations={history} />}
    </div>
  );
}

function LensFeedSummary({
  batches,
  queryPacks,
  selectedLensCount
}: {
  batches: Batch[];
  queryPacks: QueryPack[];
  selectedLensCount: number;
}) {
  const groups = groupQueryPacksByLens(queryPacks, batches);
  const totalPacks = queryPacks.length;
  const donePacks = queryPacks.filter((pack) => queryPackHasDirectCsv(pack, batches)).length;

  return (
    <section className="lens-feed-summary">
      <header>
        <div>
          <p className="vitals-eyebrow">Alimentación modular</p>
          <h2>Mapa de corpus por lente</h2>
          <p>
            Cada metodología seleccionada crea sus propios packs de búsqueda y uploads.
            Las menciones quedan en el corpus vivo con provenance por lente, scope e intención.
          </p>
        </div>
        <dl>
          <div>
            <dt>Lentes</dt>
            <dd>{selectedLensCount}</dd>
          </div>
          <div>
            <dt>Packs</dt>
            <dd>{donePacks}/{totalPacks || "—"}</dd>
          </div>
        </dl>
      </header>

      {groups.length > 0 ? (
        <div className="lens-feed-grid">
          {groups.map((group) => (
            <article key={group.lensSlug}>
              <span>{group.lensLabel}</span>
              <strong>{group.doneCount}/{group.packs.length}</strong>
              <small>CSVs directos</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="lens-feed-empty">
          Los módulos aparecerán después de generar la primera query. Si el job se queda en espera,
          revisa que el worker esté activo antes de volver a intentar.
        </p>
      )}
    </section>
  );
}

/* ============================================================
   Header — corpus vital signs
   ============================================================ */

function CorpusVitals({
  name,
  methodology,
  counts,
  iterationCount,
  latestQuality,
  readyToApprove,
  isApproved,
}: {
  name: string;
  methodology: string | null;
  counts: CorpusCounts;
  iterationCount: number;
  latestQuality: number | null;
  readyToApprove: boolean;
  isApproved: boolean;
}) {
  const banner: { text: string; icon: "check" | "star" | "wave" | "info"; tone: "neutral" | "warn" | "good" } = isApproved
    ? { text: "Corpus aprobado", icon: "check", tone: "good" }
    : readyToApprove
      ? { text: "Listo para aprobar", icon: "star", tone: "good" }
      : iterationCount === 0
        ? { text: "Empieza generando la primera query", icon: "info", tone: "neutral" }
        : { text: "Sigue iterando para subir calidad", icon: "wave", tone: "warn" };

  return (
    <header className="vitals">
      <div className="vitals-main">
        <p className="vitals-eyebrow">{methodology ?? "Corpus"}</p>
        <h1 className="vitals-name">{name}</h1>
      </div>
      <div className="vitals-stats">
        <Stat label="Menciones" value={fmtNumber(counts.included)} sub={`${fmtNumber(counts.total)} totales`} highlight />
        <Stat label="Excluidas" value={fmtNumber(counts.excluded)} sub="filtradas" />
        <Stat label="Iteraciones" value={String(iterationCount)} sub={iterationCount === 1 ? "ronda" : "rondas"} />
        <Stat
          label="Calidad"
          value={latestQuality !== null ? `${latestQuality.toFixed(1)}` : "—"}
          sub="última"
        />
      </div>
      <div className={`vitals-banner vitals-banner--${banner.tone}`}>
        <Icon name={banner.icon} size={14} /> {banner.text}
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`vital-stat${highlight ? " vital-stat--hi" : ""}`}>
      <span className="vital-stat-label">{label}</span>
      <span className="vital-stat-value">{value}</span>
      {sub && <span className="vital-stat-sub">{sub}</span>}
    </div>
  );
}

/* ============================================================
   Step indicator (pill train)
   ============================================================ */

function StepIndicator({
  steps,
  activeStep,
}: {
  steps: { id: Step; label: string }[];
  activeStep: Step;
}) {
  const activeIdx = steps.findIndex((s) => s.id === activeStep);
  return (
    <ol className="step-train">
      {steps.map((s, i) => {
        const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "todo";
        return (
          <li key={s.id} className={`step-pip step-pip--${state}`}>
            <span className="step-pip-dot">{state === "done" ? "✓" : i + 1}</span>
            <span className="step-pip-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ============================================================
   STEP 1 — Compose
   ============================================================ */

function StepCompose({
  corpusId,
  hasHistory,
  onComposed,
}: {
  corpusId: string;
  hasHistory: boolean;
  onComposed: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // Auto-start when there is no history at all (very first iteration of a fresh corpus)
  useEffect(() => {
    if (!hasHistory && !autoStarted && !running) {
      setAutoStarted(true);
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHistory]);

  async function start() {
    setRunning(true);
    setError(null);
    setProgress(5);

    const res = await fetch(`/api/corpora/${corpusId}/run-engine`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ iteration_strategy: "auto", max_iterations: 5 }),
    });

    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo iniciar la generación.");
      setRunning(false);
      return;
    }

    const jobId = payload.job_id;
    let waitingWithoutWorkerChecks = 0;
    const poll = setInterval(async () => {
      const jr = await fetch(`/api/jobs/${jobId}`);
      const j = await jr.json().catch(() => ({}));
      if (!jr.ok) {
        clearInterval(poll);
        setError(j.message ?? "No se pudo leer el estado del job.");
        setRunning(false);
        return;
      }
      const nextProgress = typeof j.progress === "number" ? Math.round(j.progress) : 0;
      setProgress((current) => Math.max(current, nextProgress));
      const isWaiting = j.status === "waiting" || j.status === "delayed";
      if (isWaiting && j.worker_alive === false) {
        waitingWithoutWorkerChecks += 1;
        if (waitingWithoutWorkerChecks >= 4) {
          clearInterval(poll);
          setError("El worker local no está activo. Levanta pnpm --filter @noisia/workers dev y vuelve a generar.");
          setRunning(false);
          return;
        }
      } else {
        waitingWithoutWorkerChecks = 0;
      }
      if (j.status === "completed") {
        clearInterval(poll);
        setProgress(100);
        setTimeout(onComposed, 400);
      } else if (j.status === "failed") {
        clearInterval(poll);
        setError(j.failed_reason ?? "La generación falló.");
        setRunning(false);
      }
    }, 1500);
  }

  return (
    <div className="step-body">
      <p className="step-helper">
        El motor compone <strong>query packs por lente seleccionado</strong>: T&B conserva
        marca, competencia y categoría; cada lente adicional agrega sus propios scopes e
        intenciones para que la provenance viaje hasta el análisis y Signal.
      </p>

      {!running && !autoStarted && (
        <button className="wizard-cta" onClick={start} type="button">
          <Icon name="sparkle" size={16} />
          {hasHistory ? "Generar nueva query desde cero" : "Generar primera query"}
        </button>
      )}

      {running && (
        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="wizard-progress-text">
            <Icon name="spinner" className="icon--spin" size={12} />
            Componiendo queries · {progress}%
          </p>
        </div>
      )}

      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   STEP 2 — Upload (dual CSV)
   ============================================================ */

function StepUpload({
  corpusId,
  iteration,
  existingBatches,
  queryPacks,
  selectedLensCount,
  competitors,
  entities,
  subjectType,
  onPacksMaterialized,
  onComplete,
}: {
  corpusId: string;
  iteration: Iteration;
  existingBatches: Batch[];
  queryPacks: QueryPack[];
  selectedLensCount: number;
  competitors: CompetitorOption[];
  entities: CorpusEntity[];
  subjectType: "brand" | "theme";
  onPacksMaterialized: () => void;
  onComplete: () => void;
}) {
  const [materializingPacks, setMaterializingPacks] = useState(false);
  const [materializeError, setMaterializeError] = useState<string | null>(null);
  const [autoMaterializeRequested, setAutoMaterializeRequested] = useState(false);
  const usableQueryPacks = queryPacks.filter((pack) => typeof pack.queryText === "string" && pack.queryText.length > 0);
  const packMode = usableQueryPacks.length > 0;
  const expectedPackMode = selectedLensCount > 1;
  const primaryMentionType = subjectType === "theme" ? "industry" : "brand";
  const primaryQueryText = subjectType === "theme"
    ? iteration.industryQueryText ?? iteration.queryText
    : iteration.queryText;
  const wantsIndustry = subjectType === "brand" && !!iteration.industryQueryText;
  const wantsCompetitor = !!iteration.competitorQueryText;
  const activeEntities = entities.filter((entity) => entity.status !== "archived");
  const entityMode = activeEntities.length > 0;
  const uploadedEntityIds = new Set(
    existingBatches
      .filter((batch) => batch.status === "completed" && batch.corpusEntityId)
      .map((batch) => batch.corpusEntityId as string)
  );
  const doneEntityCount = activeEntities.filter((entity) => uploadedEntityIds.has(entity.id)).length;
  const primaryDone = existingBatches.some(
    (b) => b.mentionType === primaryMentionType && b.status === "completed"
  );
  const competitorDone = existingBatches.some(
    (b) => b.mentionType === "competitor" && b.status === "completed"
  );
  const industryDone = existingBatches.some(
    (b) => b.mentionType === "industry" && b.status === "completed"
  );
  const legacyUploadsDone = primaryDone && (!wantsCompetitor || competitorDone) && (!wantsIndustry || industryDone);
  const packUploadsDone = packMode
    ? usableQueryPacks.every((pack) => queryPackHasDirectCsv(pack, existingBatches))
    : false;
  const allDone = expectedPackMode && !packMode
    ? false
    : packMode
      ? packUploadsDone
      : entityMode
        ? doneEntityCount === activeEntities.length
        : legacyUploadsDone;

  async function materializeQueryPacks() {
    setMaterializingPacks(true);
    setMaterializeError(null);
    try {
      const res = await fetch(`/api/corpora/${corpusId}/query-packs/materialize`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? "No se pudieron crear los query packs.");
      onPacksMaterialized();
    } catch (error) {
      setMaterializeError(error instanceof Error ? error.message : "No se pudieron crear los query packs.");
    } finally {
      setMaterializingPacks(false);
    }
  }

  useEffect(() => {
    if (!expectedPackMode || packMode || materializingPacks || autoMaterializeRequested) return;
    setAutoMaterializeRequested(true);
    void materializeQueryPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedPackMode, packMode, materializingPacks, autoMaterializeRequested]);

  return (
    <div className="step-body">
      <p className="step-helper">
        {packMode
          ? "Cada lente seleccionado tiene sus propios packs de búsqueda. Copia cada query, exporta el CSV correspondiente y súbelo en su módulo; la provenance queda ligada al lente, scope e intención."
          : "Copia cada query en SentiOne, exporta los CSVs y súbelos aquí. Cada archivo suma menciones únicas al corpus (los duplicados se filtran automáticamente)."}
      </p>

      {!packMode && expectedPackMode ? (
        <div className="peer-upload-requirement">
          <Icon name={materializingPacks ? "spinner" : "info"} size={14} />
          <span>
            Este estudio tiene {selectedLensCount} lentes seleccionados. Estamos preparando los módulos de query pack desde la query existente; no llama a Claude ni toca menciones.
          </span>
          <button className="wizard-cta wizard-cta--ghost" disabled={materializingPacks} onClick={materializeQueryPacks} type="button">
            <Icon name={materializingPacks ? "spinner" : "sparkle"} size={14} />
            {materializingPacks ? "Creando packs" : "Reintentar módulos"}
          </button>
        </div>
      ) : null}

      {materializeError ? (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {materializeError}
        </p>
      ) : null}

      {packMode ? (
        <QueryPackModules
          corpusId={corpusId}
          existingBatches={existingBatches}
          iterationId={iteration.id}
          packs={usableQueryPacks}
        />
      ) : (
        <div className="wizard-queries">
          <QueryBlock
            label={subjectType === "theme" ? "Query de categoría / peer set" : "Query de marca"}
            accent={primaryMentionType}
            text={primaryQueryText}
          />
          {iteration.competitorQueryText && (
            <QueryBlock
              label={subjectType === "theme" ? "Query de peers / competidores" : "Query de competencia"}
              accent="competitor"
              text={iteration.competitorQueryText}
            />
          )}
          {subjectType === "brand" && iteration.industryQueryText && (
            <QueryBlock
              label="Query de categoría / baseline"
              accent="industry"
              text={iteration.industryQueryText}
            />
          )}
        </div>
      )}

      {!packMode && (
        <PeerSetPanel
          corpusId={corpusId}
          entities={entities}
          existingBatches={existingBatches}
          iterationId={iteration.id}
        />
      )}

      {packMode ? (
        <div className="peer-upload-requirement">
          <Icon name={allDone ? "check" : "info"} size={14} />
          <span>
            CSVs directos: {usableQueryPacks.filter((pack) => queryPackHasDirectCsv(pack, existingBatches)).length} / {usableQueryPacks.length}.
          </span>
        </div>
      ) : entityMode ? (
        <div className="peer-upload-requirement">
          <Icon name={allDone ? "check" : "info"} size={14} />
          <span>
            CSVs por entidad activa: {doneEntityCount} / {activeEntities.length} listos.
          </span>
        </div>
      ) : (
        <div className={`upload-grid${wantsIndustry || wantsCompetitor ? "" : " upload-grid--single"}`}>
          <UploadSlot
            corpusId={corpusId}
            iterationId={iteration.id}
            mentionType={primaryMentionType}
            done={primaryDone}
          />
          {wantsCompetitor && (
            <UploadSlot
              corpusId={corpusId}
              iterationId={iteration.id}
              mentionType="competitor"
              competitors={competitors}
              done={competitorDone}
            />
          )}
          {wantsIndustry && (
            <UploadSlot
              corpusId={corpusId}
              iterationId={iteration.id}
              mentionType="industry"
              done={industryDone}
            />
          )}
        </div>
      )}

      {allDone && (
        <div className="wizard-success-actions">
          <p className="wizard-success-hint">
            <Icon name="check" size={14} /> CSVs listos.
          </p>
          <button className="wizard-cta" onClick={onComplete} type="button">
            Continuar a evaluación
          </button>
        </div>
      )}
    </div>
  );
}

function QueryPackModules({
  corpusId,
  iterationId,
  packs,
  existingBatches
}: {
  corpusId: string;
  iterationId: string;
  packs: QueryPack[];
  existingBatches: Batch[];
}) {
  const groups = groupQueryPacksByLens(packs, existingBatches);

  return (
    <div className="query-pack-modules">
      {groups.map((group) => (
        <section className="query-pack-module" key={group.lensSlug}>
          <header className="query-pack-module-head">
            <div>
              <p className="vitals-eyebrow">Módulo de corpus</p>
              <h3>{group.lensLabel}</h3>
              <p>{group.packs.length} packs para alimentar este lente con provenance separada.</p>
            </div>
            <StatusPill tone={group.doneCount === group.packs.length ? "success" : "info"}>
              {group.doneCount}/{group.packs.length} CSVs
            </StatusPill>
          </header>
          <div className="query-pack-grid">
            {group.packs.map((pack) => {
              const mentionType = mentionTypeForScope(pack.scope);
              const seeds = normalizePackSeeds(pack.seeds);
              const done = queryPackHasDirectCsv(pack, existingBatches);
              const hasSharedData = !done && queryPackHasData(pack, existingBatches);
              return (
                <article className="query-pack-card" key={pack.id}>
                  <div className="query-pack-card-copy">
                    <p className={`upload-slot-tag upload-slot-tag--${mentionType}`}>{scopeLabel(pack.scope)}</p>
                    <h4>{seeds.signal_label ?? pack.signalIntent}</h4>
                    <p>{pack.objective ?? "Pack generado desde el plan del estudio."}</p>
                    {seeds.source_hints.length > 0 && (
                      <small>También puede nutrirse con: {seeds.source_hints.slice(0, 4).join(", ")}.</small>
                    )}
                  </div>
                  <QueryBlock
                    label="Query para este pack"
                    accent={mentionType}
                    text={pack.queryText ?? ""}
                  />
                  <UploadSlot
                    corpusId={corpusId}
                    iterationId={iterationId}
                    mentionType={mentionType}
                    queryPackId={pack.id}
                    lensSlug={pack.lensSlug}
                    signalIntent={pack.signalIntent}
                    scope={pack.scope}
                    done={done}
                    entityLabelDefault={seeds.signal_label ?? `${group.lensLabel} · ${scopeLabel(pack.scope)}`}
                  />
                  {hasSharedData ? (
                    <p className="query-pack-shared-note">
                      Este pack ya tiene menciones compartidas por provenance, pero falta su CSV directo para cerrar el módulo.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupQueryPacksByLens(packs: QueryPack[], existingBatches: Batch[]) {
  const map = new Map<string, QueryPack[]>();
  for (const pack of packs) {
    const current = map.get(pack.lensSlug) ?? [];
    current.push(pack);
    map.set(pack.lensSlug, current);
  }
  return Array.from(map.entries()).map(([lensSlug, groupPacks]) => {
    const firstSeeds = normalizePackSeeds(groupPacks[0]?.seeds);
    return {
      lensSlug,
      lensLabel: firstSeeds.lens_label ?? labelFromSlug(lensSlug),
      packs: groupPacks.sort((a, b) => scopeOrder(a.scope) - scopeOrder(b.scope)),
      doneCount: groupPacks.filter((pack) => queryPackHasDirectCsv(pack, existingBatches)).length
    };
  });
}

function normalizePackSeeds(seeds: unknown) {
  const value = seeds && typeof seeds === "object" && !Array.isArray(seeds) ? seeds as Record<string, unknown> : {};
  return {
    lens_label: typeof value.lens_label === "string" ? value.lens_label : null,
    signal_label: typeof value.signal_label === "string" ? value.signal_label : null,
    source_hints: Array.isArray(value.source_hints)
      ? value.source_hints.filter((item): item is string => typeof item === "string")
      : []
  };
}

function mentionTypeForScope(scope: string): "brand" | "competitor" | "industry" {
  if (scope === "competitors") return "competitor";
  if (scope === "category" || scope === "baseline") return "industry";
  return "brand";
}

function scopeLabel(scope: string) {
  if (scope === "brand") return "Marca";
  if (scope === "competitors") return "Competidores";
  if (scope === "category") return "Categoría";
  if (scope === "baseline") return "Baseline";
  return scope;
}

function scopeOrder(scope: string) {
  if (scope === "brand") return 1;
  if (scope === "competitors") return 2;
  if (scope === "category") return 3;
  if (scope === "baseline") return 4;
  return 9;
}

function labelFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function PeerSetPanel({
  corpusId,
  entities,
  existingBatches,
  iterationId,
}: {
  corpusId: string;
  entities: CorpusEntity[];
  existingBatches: Batch[];
  iterationId: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entityKind, setEntityKind] = useState<"competitor" | "category" | "primary_brand">("competitor");
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [handles, setHandles] = useState("");
  const [querySeeds, setQuerySeeds] = useState("");
  const [notes, setNotes] = useState("");
  const [isCategoryBaseline, setIsCategoryBaseline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeEntities = entities.filter((entity) => entity.status !== "archived");

  function resetForm() {
    setEditingId(null);
    setEntityKind("competitor");
    setName("");
    setAliases("");
    setHandles("");
    setQuerySeeds("");
    setNotes("");
    setIsCategoryBaseline(false);
    setError(null);
  }

  function edit(entity: CorpusEntity) {
    setEditingId(entity.id);
    setEntityKind(normalizeEntityKind(entity.entityKind));
    setName(entity.name);
    setAliases((entity.aliases ?? []).join("\n"));
    setHandles((entity.handles ?? []).join("\n"));
    setQuerySeeds((entity.querySeeds ?? []).join("\n"));
    setNotes(entity.notes ?? "");
    setIsCategoryBaseline(Boolean(entity.isCategoryBaseline));
    setError(null);
  }

  async function save() {
    if (name.trim().length < 2) {
      setError("Pon el nombre de la entidad.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        entity_kind: entityKind,
        name: name.trim(),
        aliases: splitEntityLines(aliases),
        handles: splitEntityLines(handles),
        query_seeds: splitEntityLines(querySeeds),
        notes,
        is_category_baseline: entityKind === "category" && isCategoryBaseline,
        status: "active"
      };
      const res = await fetch(
        editingId ? `/api/corpora/${corpusId}/entities/${editingId}` : `/api/corpora/${corpusId}/entities`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? "No se pudo guardar la entidad.");
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la entidad.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archive(entity: CorpusEntity) {
    if (!window.confirm(`¿Archivar ${entity.name}? Sus batches históricos se conservan.`)) return;
    setError(null);
    const res = await fetch(`/api/corpora/${corpusId}/entities/${entity.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.message ?? "No se pudo archivar la entidad.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="peer-set-panel">
      <header className="peer-set-head">
        <div>
          <p className="vitals-eyebrow">Peer set reusable</p>
          <h3>Entidades del corpus</h3>
          <p>Define peers, marca principal o baseline de categoría con aliases, handles y query seeds.</p>
        </div>
        {editingId && (
          <button className="btn-micro" type="button" onClick={resetForm}>
            Cancelar edición
          </button>
        )}
      </header>

      <div className="peer-entity-form">
        <label>
          <span>Tipo</span>
          <select
            value={entityKind}
            onChange={(event) => {
              const next = normalizeEntityKind(event.target.value);
              setEntityKind(next);
              if (next !== "category") setIsCategoryBaseline(false);
            }}
          >
            <option value="competitor">Peer / competidor</option>
            <option value="category">Category baseline</option>
            <option value="primary_brand">Marca principal</option>
          </select>
        </label>
        <label>
          <span>Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Telcel, AT&T, Telefonía MX..." />
        </label>
        <label>
          <span>Aliases</span>
          <textarea value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="Uno por línea o separado por coma" />
        </label>
        <label>
          <span>Handles</span>
          <textarea value={handles} onChange={(event) => setHandles(event.target.value)} placeholder="@telcel\n@attmx" />
        </label>
        <label>
          <span>Query seeds</span>
          <textarea value={querySeeds} onChange={(event) => setQuerySeeds(event.target.value)} placeholder="términos que deben entrar a la query" />
        </label>
        <label>
          <span>Notas</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope, límites, marcas del grupo, etc." />
        </label>
        {entityKind === "category" && (
          <label className="peer-baseline-toggle">
            <input checked={isCategoryBaseline} onChange={(event) => setIsCategoryBaseline(event.target.checked)} type="checkbox" />
            <span>Usar como category baseline</span>
          </label>
        )}
        <button className="wizard-cta" type="button" onClick={save} disabled={isSaving}>
          <Icon name={isSaving ? "spinner" : "sparkle"} size={14} />
          {editingId ? "Guardar entidad" : "Crear entidad"}
        </button>
      </div>

      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      <div className="peer-entity-list">
        {activeEntities.length === 0 ? (
          <p className="peer-empty">Aún no hay entidades. Crea peers para poder subir CSVs por jugador o baseline.</p>
        ) : (
          activeEntities.map((entity) => {
            const mentionType = mentionTypeForEntity(entity);
            const done = existingBatches.some((batch) => batch.corpusEntityId === entity.id && batch.status === "completed");
            return (
              <article className="peer-entity-card" key={entity.id}>
                <header>
                  <div>
                    <p className={`upload-slot-tag upload-slot-tag--${mentionType}`}>{entity.entityKind}</p>
                    <h4>{entity.name}</h4>
                    <small>{fmtNumber(entity.includedCount)} menciones · {entity.batchCount} batches</small>
                  </div>
                  <div className="peer-entity-actions">
                    <button className="btn-micro" type="button" onClick={() => edit(entity)}>Editar</button>
                    <button className="btn-micro" type="button" onClick={() => archive(entity)}>Archivar</button>
                  </div>
                </header>
                <PeerSeedLine label="Aliases" values={entity.aliases ?? []} />
                <PeerSeedLine label="Handles" values={entity.handles ?? []} />
                <PeerSeedLine label="Seeds" values={entity.querySeeds ?? []} />
                <UploadSlot
                  corpusId={corpusId}
                  entity={entity}
                  iterationId={iterationId}
                  mentionType={mentionType}
                  done={done}
                />
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function PeerSeedLine({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <p className="peer-seed-line">
      <span>{label}</span>
      {values.slice(0, 8).join(", ")}
    </p>
  );
}

function mentionTypeForEntity(entity: Pick<CorpusEntity, "entityKind">): "brand" | "competitor" | "industry" {
  if (entity.entityKind === "primary_brand") return "brand";
  if (entity.entityKind === "category") return "industry";
  return "competitor";
}

function normalizeEntityKind(value: string): "competitor" | "category" | "primary_brand" {
  if (value === "category" || value === "primary_brand") return value;
  return "competitor";
}

function splitEntityLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  ).slice(0, 40);
}

function QueryBlock({
  label,
  accent,
  text,
}: {
  label: string;
  accent: "brand" | "competitor" | "industry";
  text: string;
}) {
  return (
    <section className={`wizard-query wizard-query--${accent}`}>
      <p className="wizard-query-label">{label}</p>
      <CopyQueryButton queryText={text} />
    </section>
  );
}

function UploadSlot({
  corpusId,
  iterationId,
  mentionType,
  entity,
  competitors = [],
  queryPackId,
  lensSlug,
  signalIntent,
  scope,
  entityLabelDefault,
  done,
}: {
  corpusId: string;
  iterationId: string;
  mentionType: "brand" | "competitor" | "industry";
  entity?: CorpusEntity;
  competitors?: CompetitorOption[];
  queryPackId?: string;
  lensSlug?: string;
  signalIntent?: string;
  scope?: string;
  entityLabelDefault?: string;
  done: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">(
    done ? "success" : "idle"
  );
  const [entityLabel, setEntityLabel] = useState(
    entity?.name ?? entityLabelDefault ?? (mentionType === "competitor" ? "Pool competitivo" : mentionType === "industry" ? "Baseline de categoría" : "Marca")
  );
  const [competitorId, setCompetitorId] = useState<string>(entity?.competitorId ?? "");
  const [stats, setStats] = useState<{ included: number; excluded: number; duplicates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (done) setStatus("success");
  }, [done]);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    setProgress(15);

    // Metadata goes in the query string; the CSV is sent as the raw request
    // body so the browser streams it from disk and the server streams it back —
    // multipart FormData buffers the whole file in memory and OOMs on ~0.5GB CSVs.
    const params = new URLSearchParams();
    params.set("mention_type", mentionType);
    params.set("query_iteration_id", iterationId);
    if (queryPackId) params.set("query_pack_id", queryPackId);
    params.set("source_label", queryPackId ? `pack_${queryPackId}` : entity ? `entity_${entity.id}` : `iter_${mentionType}`);
    params.set("file_name", file.name);
    if (entity) {
      params.set("corpus_entity_id", entity.id);
    }
    if (mentionType === "competitor" && (entity?.competitorId || competitorId)) {
      params.set("competitor_id", entity?.competitorId ?? competitorId);
    }
    params.set("entity_label", entityLabel.trim());
    params.set(
      "entity_kind",
      entity?.entityKind ??
      (mentionType === "brand"
        ? "primary_brand"
        : mentionType === "industry"
          ? "category"
          : competitorId || (entityLabel.trim() && entityLabel.trim() !== "Pool competitivo")
            ? "competitor"
            : "competitor_pool")
    );
    if (lensSlug) params.set("lens_slug", lensSlug);
    if (signalIntent) params.set("signal_intent", signalIntent);
    if (scope) params.set("scope", scope);

    // Fake progressive feedback while server processes
    const tick = setInterval(() => {
      setProgress((p) => (p < 88 ? p + 4 : p));
    }, 400);

    try {
      const res = await fetch(`/api/corpora/${corpusId}/mentions/csv-upload?${params.toString()}`, {
        method: "POST",
        headers: { "content-type": "text/csv" },
        body: file,
      });
      clearInterval(tick);
      const json = await res.json();
      if (!res.ok) {
        const raw = json?.message ?? `Error ${res.status}`;
        // Truncate long SQL/stack traces so the UI doesn't blow up
        const short = typeof raw === "string" && raw.length > 220 ? raw.slice(0, 220) + "…" : raw;
        setError(short);
        setStatus("error");
        setProgress(0);
        return;
      }
      if (json.job_id) {
        const job = await waitForCsvIngestJob(String(json.job_id), setProgress);
        if (job.status !== "completed") {
          setError(job.failed_reason ?? "La ingesta quedó detenida en el worker.");
          setStatus("error");
          setProgress(0);
          return;
        }
        const resultStats = job.result?.stats;
        setProgress(100);
        setStats(resultStats ? {
          included: resultStats.included_count ?? 0,
          excluded: resultStats.excluded_count ?? 0,
          duplicates: resultStats.duplicate_count ?? 0,
        } : null);
        setStatus("success");
        router.refresh();
        return;
      }
      setProgress(100);
      setStats({
        included: json.stats?.included_count ?? 0,
        excluded: json.stats?.excluded_count ?? 0,
        duplicates: json.stats?.duplicate_count ?? 0,
      });
      setStatus("success");
      router.refresh();
    } catch {
      clearInterval(tick);
      setError("Conexión perdida.");
      setStatus("error");
      setProgress(0);
    }
  }

  const labelText =
    mentionType === "brand"
      ? "CSV de marca"
      : mentionType === "competitor"
        ? "CSV de competencia"
        : "CSV de industria";

  return (
    <div className={`upload-slot upload-slot--${status}`}>
      <div className="upload-slot-head">
        <span className={`upload-slot-tag upload-slot-tag--${mentionType}`}>{mentionType}</span>
        <span className="upload-slot-title">{labelText}</span>
      </div>

      {status === "success" ? (
        <div className="upload-slot-success">
          <div className="upload-slot-check"><Icon name="check" size={20} /></div>
          <p className="upload-slot-msg">
            {stats ? `+${fmtNumber(stats.included)} menciones · ${fmtNumber(stats.duplicates)} duplicadas` : "CSV cargado"}
          </p>
          <p className="upload-slot-entity">{entityLabel}</p>
          <button className="btn-micro" onClick={() => fileRef.current?.click()} type="button">
            Reemplazar CSV
          </button>
        </div>
      ) : status === "uploading" ? (
        <>
          <div className="wizard-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="upload-slot-msg">
            <Icon name="spinner" className="icon--spin" size={12} /> Procesando · {progress}%
          </p>
        </>
      ) : (
        <>
          {!entity && mentionType !== "brand" && (
            <div className="upload-entity-stack">
              {mentionType === "competitor" && competitors.length > 0 ? (
                <label className="upload-entity-field">
                  <span>Entidad competitiva</span>
                  <select
                    onChange={(event) => {
                      const value = event.target.value;
                      setCompetitorId(value === "__pool" || value === "__custom" ? "" : value);
                      if (value === "__pool") setEntityLabel("Pool competitivo");
                      if (value === "__custom") setEntityLabel("");
                      const selected = competitors.find((competitor) => competitor.id === value);
                      if (selected) setEntityLabel(selected.canonicalName);
                    }}
                    value={competitorId || (entityLabel === "Pool competitivo" ? "__pool" : "__custom")}
                  >
                    <option value="__pool">Pool competitivo</option>
                    {competitors.map((competitor) => (
                      <option key={competitor.id} value={competitor.id}>
                        {competitor.canonicalName}
                      </option>
                    ))}
                    <option value="__custom">Otro / etiqueta libre</option>
                  </select>
                </label>
              ) : null}
              <label className="upload-entity-field">
                <span>{mentionType === "competitor" ? "Etiqueta de entidad" : "Baseline"}</span>
                <input
                  maxLength={140}
                  onChange={(event) => {
                    setEntityLabel(event.target.value);
                    if (mentionType === "competitor" && competitorId) setCompetitorId("");
                  }}
                  placeholder={mentionType === "competitor" ? "Ej. Sephora, Amazon, pool premium" : "Ej. categoría beauty MX"}
                  type="text"
                  value={entityLabel}
                />
              </label>
            </div>
          )}
          <button
            className="upload-slot-drop"
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            <span className="upload-slot-arrow"><Icon name="upload" size={22} /></span>
            Arrastra o haz click para seleccionar CSV
          </button>
        </>
      )}

      <input
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.currentTarget.value = "";
        }}
        ref={fileRef}
        type="file"
      />

      {error && (
        <p className="upload-slot-error">
          <Icon name="alert" size={12} /> {error}
        </p>
      )}
    </div>
  );
}

type CsvIngestJobPollResult = {
  status?: string;
  progress?: number;
  worker_alive?: boolean;
  failed_reason?: string | null;
  result?: {
    stats?: {
      included_count?: number;
      excluded_count?: number;
      duplicate_count?: number;
    };
  } | null;
};

async function waitForCsvIngestJob(
  jobId: string,
  setProgress: (next: number | ((previous: number) => number)) => void
): Promise<CsvIngestJobPollResult> {
  for (;;) {
    await sleep(2500);
    const response = await fetch(`/api/jobs/${jobId}`);
    const job = await response.json().catch(() => ({})) as CsvIngestJobPollResult;
    if (!response.ok) return { status: "failed", failed_reason: "No se pudo leer el estado del job." };
    if (job.worker_alive === false) {
      return { status: "failed", failed_reason: "El worker no está activo para procesar esta ingesta." };
    }
    if (typeof job.progress === "number") {
      setProgress(Math.min(98, Math.max(20, Math.round(job.progress))));
    }
    if (job.status === "completed" || job.status === "failed") return job;
  }
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => window.setTimeout(resolvePromise, ms));
}

const evaluationStages = [
  {
    number: 1,
    label: "Preparar contexto",
    detail: "Carga iteración, brief, metodología y configuración del corpus.",
    activeAt: 1,
    doneAt: 25
  },
  {
    number: 2,
    label: "Tomar muestra",
    detail: "Selecciona menciones incluidas del corpus completo.",
    activeAt: 25,
    doneAt: 45
  },
  {
    number: 3,
    label: "Leer señal",
    detail: "Claude evalúa calidad, densidad, ruido y cobertura.",
    activeAt: 45,
    doneAt: 85
  },
  {
    number: 4,
    label: "Guardar diagnóstico",
    detail: "Persiste scores, notas y ajustes propuestos.",
    activeAt: 85,
    doneAt: 100
  }
];

function normalizeProgress(progress: unknown) {
  return typeof progress === "number" && Number.isFinite(progress)
    ? Math.max(0, Math.min(100, Math.round(progress)))
    : 0;
}

function evaluationStageLabel(progress: number, status: string | null, queuedSeconds = 0) {
  if (status === "queued" || status === "waiting" || status === "delayed") {
    return queuedSeconds >= 8 ? "Esperando worker" : "En cola";
  }
  if (progress >= 85) return "Guardando diagnóstico";
  if (progress >= 45) return "Analizando señal con Claude";
  if (progress >= 25) return "Tomando muestra";
  return "Preparando evaluación";
}

/* ============================================================
   STEP 3 — Evaluate
   ============================================================ */

function StepEvaluate({
  corpusId,
  iteration,
  corpusTotal,
  onEvaluated,
}: {
  corpusId: string;
  iteration: Iteration;
  corpusTotal: number;
  onEvaluated: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [queuedSeconds, setQueuedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stableJobId = `evaluate-${iteration.id}`;

  // Estimated sample size for the UI
  const sampleSize = iteration.iterationNumber >= 7 ? 500 : iteration.iterationNumber >= 4 ? 250 : 100;
  const samplePct = corpusTotal > 0 ? Math.min(100, Math.round((sampleSize / corpusTotal) * 100)) : 0;

  useEffect(() => {
    let cancelled = false;

    async function recoverRunningJob() {
      if (iteration.qualityScore !== null) return;
      try {
        const res = await fetch(`/api/jobs/${stableJobId}`);
        if (!res.ok) return;
        const state = (await res.json()) as JobState;
        if (cancelled) return;
        if (["queued", "waiting", "delayed", "running", "active"].includes(state.status)) {
          setJobId(state.id);
          setRunning(true);
          setJobStatus(state.status);
          setProgress(normalizeProgress(state.progress));
        }
      } catch {
        // No recoverable job exists yet. The user can start one.
      }
    }

    recoverRunningJob();
    return () => {
      cancelled = true;
    };
  }, [iteration.qualityScore, stableJobId]);

  useEffect(() => {
    if (!jobId || !running) return;

    const poll = window.setInterval(async () => {
      try {
        const jr = await fetch(`/api/jobs/${jobId}`);
        const j = (await jr.json()) as JobState;
        if (!jr.ok) {
          setError(j.failed_reason ?? "No se pudo leer el estado del job.");
          setRunning(false);
          return;
        }
        setJobStatus(j.status);
        setProgress((current) => Math.max(current, normalizeProgress(j.progress)));

        if (j.status === "completed") {
          window.clearInterval(poll);
          setProgress(100);
          setJobStatus("completed");
          setTimeout(onEvaluated, 500);
        } else if (j.status === "failed") {
          window.clearInterval(poll);
          setError(j.failed_reason ?? "La evaluación falló.");
          setRunning(false);
        }
      } catch {
        setError("Se perdió la conexión con el job. Refresca para recuperar el estado.");
      }
    }, 1200);

    return () => window.clearInterval(poll);
  }, [jobId, onEvaluated, running]);

  useEffect(() => {
    if (!running || !["queued", "waiting", "delayed"].includes(jobStatus ?? "")) {
      setQueuedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => setQueuedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [jobStatus, running]);

  async function start() {
    setRunning(true);
    setError(null);
    setJobStatus("queued");
    setProgress(5);

    const res = await fetch(
      `/api/corpora/${corpusId}/query-iterations/${iteration.id}/evaluate`,
      { method: "POST" }
    );
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo iniciar la evaluación.");
      setRunning(false);
      return;
    }

    setJobId(payload.job_id ?? stableJobId);
  }

  return (
    <div className="step-body">
      <p className="step-helper">
        El motor leerá una muestra aleatoria de <strong>{fmtNumber(sampleSize)} menciones</strong>{" "}
        del corpus completo {corpusTotal > 0 && <>(~{samplePct}% de las {fmtNumber(corpusTotal)} válidas)</>}{" "}
        y diagnosticará calidad, densidad de señal y nivel de ruido. Te dará ajustes
        concretos al query.
      </p>

      {!running && (
        <button className="wizard-cta" onClick={start} type="button">
          <Icon name="play" size={14} /> Evaluar muestra
        </button>
      )}

      {running && (
        <div className="wizard-progress wizard-progress--detailed">
          <div className="wizard-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="wizard-progress-text">
            <Icon name="spinner" className="icon--spin" size={12} /> {evaluationStageLabel(progress, jobStatus, queuedSeconds)} · {progress}%
          </p>
          <ol className="engine-job-steps">
            {evaluationStages.map((stage) => (
              <li
                className={
                  progress >= stage.doneAt
                    ? "engine-job-step engine-job-step--done"
                    : progress >= stage.activeAt
                      ? "engine-job-step engine-job-step--active"
                      : "engine-job-step"
                }
                key={stage.label}
              >
                <span>{progress >= stage.doneAt ? <Icon name="check" size={11} /> : stage.number}</span>
                <div>
                  <strong>{stage.label}</strong>
                  <p>{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          {queuedSeconds >= 8 && ["queued", "waiting", "delayed"].includes(jobStatus ?? "") && (
            <p className="engine-job-worker-note">
              El job está esperando que el worker de query-engine lo tome. Si esto pasa de 30 segundos, probablemente el worker local no está corriendo.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   STEP 4 — Decide
   ============================================================ */

function StepDecide({
  corpusId,
  iteration,
  onActioned,
}: {
  corpusId: string;
  iteration: Iteration;
  readyToApprove: boolean;
  onActioned: () => void;
}) {
  const notes = parseNotes(iteration.aiEvaluationNotes);
  const adjustments = notes?.proposed_adjustments ?? [];
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = Number(iteration.qualityScore ?? 0);
  const d = Number(iteration.densityScore ?? 0);
  const n = Number(iteration.noiseScore ?? 0);

  async function apply() {
    setApplying(true);
    setError(null);
    const res = await fetch(
      `/api/corpora/${corpusId}/query-iterations/${iteration.id}/apply-adjustments`,
      { method: "POST" }
    );
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo aplicar ajustes.");
      setApplying(false);
      return;
    }
    // Poll
    const jobId = payload.job_id;
    const poll = setInterval(async () => {
      const jr = await fetch(`/api/jobs/${jobId}`);
      const j = await jr.json();
      if (j.status === "completed") {
        clearInterval(poll);
        onActioned();
      } else if (j.status === "failed") {
        clearInterval(poll);
        setError(j.failed_reason ?? "Falló la nueva iteración.");
        setApplying(false);
      }
    }, 1500);
  }

  return (
    <div className="step-body">
      <div className="diag-scores">
        <ScoreOrb label="Calidad" value={q} good={q >= 7} bad={q <= 3} />
        <ScoreOrb label="Densidad" value={d} good={d >= 7} bad={d <= 3} />
        <ScoreOrb label="Ruido" value={n} good={n <= 3} bad={n >= 7} invert />
      </div>

      {notes?.notes && (
        <div className="diag-notes">
          <p className="diag-notes-label">Diagnóstico</p>
          <p className="diag-notes-text">{notes.notes}</p>
          {(notes.language_mx_pct !== undefined || notes.geo_mx_pct !== undefined) && (
            <p className="diag-notes-meta">
              Español MX: {notes.language_mx_pct ?? "—"}% · Geo MX: {notes.geo_mx_pct ?? "—"}%
            </p>
          )}
        </div>
      )}

      {adjustments.length > 0 && (
        <div className="diag-adjustments">
          <p className="diag-adj-label">Ajustes propuestos ({adjustments.length})</p>
          <ul className="diag-adj-list">
            {adjustments.slice(0, 5).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
            {adjustments.length > 5 && (
              <li className="diag-adj-more">y {adjustments.length - 5} ajustes más…</li>
            )}
          </ul>
        </div>
      )}

      <div className="decide-actions">
        {adjustments.length > 0 && (
          <button
            className="wizard-cta"
            disabled={applying}
            onClick={apply}
            type="button"
          >
            {applying ? (
              <><Icon name="spinner" className="icon--spin" size={14} /> Generando iteración…</>
            ) : (
              <><Icon name="refresh" size={14} /> Aplicar ajustes y reiterar</>
            )}
          </button>
        )}
        <p className="decide-hint">
          <Icon name="info" size={13} /> La aprobación del corpus vive en el diagnóstico
          arriba — esta sección solo refina queries.
        </p>
      </div>

      <CommentReroll
        corpusId={corpusId}
        iterationId={iteration.id}
        onSent={onActioned}
      />

      {error && <p className="wizard-error">⚠ {error}</p>}
    </div>
  );
}

/* ============================================================
   Comment + Reroll — analyst writes free-form instructions and
   re-issues apply-adjustments with `userComments` injected into the prompt.
   ============================================================ */

function CommentReroll({
  corpusId,
  iterationId,
  onSent,
}: {
  corpusId: string;
  iterationId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (text.trim().length === 0) return;
    setSending(true);
    setError(null);
    const res = await fetch(
      `/api/corpora/${corpusId}/query-iterations/${iterationId}/apply-adjustments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_comments: text.trim() }),
      }
    );
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo enviar.");
      setSending(false);
      return;
    }
    const jobId = payload.job_id;
    const poll = setInterval(async () => {
      const jr = await fetch(`/api/jobs/${jobId}`);
      const j = await jr.json();
      if (j.status === "completed") {
        clearInterval(poll);
        setText("");
        setOpen(false);
        setSending(false);
        onSent();
      } else if (j.status === "failed") {
        clearInterval(poll);
        setError(j.failed_reason ?? "El motor falló.");
        setSending(false);
      }
    }, 1500);
  }

  if (!open) {
    return (
      <button
        className="comment-toggle"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Icon name="pencil" size={13} /> Comentar las queries y regenerar
      </button>
    );
  }

  return (
    <div className="comment-reroll">
      <label className="comment-label">
        Instrucciones para el motor
        <textarea
          className="comment-textarea"
          placeholder="Ej: quita 'AND (country:MX)' porque SentiOne no acepta operadores de campo. Agrega frases con 'me cobraron de más'."
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
      </label>
      <p className="comment-helper">
        El motor leerá tus instrucciones como prioridad máxima sobre el diagnóstico
        automático. Útil para corregir errores de sintaxis o forzar términos.
      </p>
      <div className="comment-actions">
        <button
          className="wizard-cta"
          disabled={sending || text.trim().length === 0}
          onClick={send}
          type="button"
        >
          {sending ? (
            <><Icon name="spinner" className="icon--spin" size={14} /> Aplicando comentarios…</>
          ) : (
            <><Icon name="refresh" size={14} /> Regenerar con comentarios</>
          )}
        </button>
        <button
          className="wizard-cta wizard-cta--ghost"
          disabled={sending}
          onClick={() => { setOpen(false); setText(""); }}
          type="button"
        >
          <Icon name="x" size={13} /> Cancelar
        </button>
      </div>
      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

function ScoreOrb({
  label,
  value,
  good,
  bad,
  invert,
}: {
  label: string;
  value: number;
  good: boolean;
  bad: boolean;
  invert?: boolean;
}) {
  const tone = good ? "good" : bad ? "bad" : "mid";
  return (
    <div className={`score-orb score-orb--${tone}`}>
      <span className="score-orb-value">{value.toFixed(1)}</span>
      <span className="score-orb-label">{label}{invert ? " ↓" : ""}</span>
    </div>
  );
}

/* ============================================================
   Approved state
   ============================================================ */

function ApprovedImproveState({
  corpusId,
  onContinued,
}: {
  corpusId: string;
  onContinued: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function startNewIteration() {
    setRunning(true);
    setError(null);
    setProgress(5);

    const res = await fetch(`/api/corpora/${corpusId}/run-engine`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ iteration_strategy: "auto", max_iterations: 5 }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo iniciar la nueva iteración.");
      setRunning(false);
      return;
    }

    const jobId = payload.job_id;
    const poll = setInterval(async () => {
      const jr = await fetch(`/api/jobs/${jobId}`);
      const j = await jr.json();
      setProgress((p) => Math.max(p, j.progress ?? 0));
      if (j.status === "completed") {
        clearInterval(poll);
        setProgress(100);
        setTimeout(onContinued, 400);
      } else if (j.status === "failed") {
        clearInterval(poll);
        setError(j.failed_reason ?? "La generación falló.");
        setRunning(false);
      }
    }, 1500);
  }

  return (
    <div className="step-body approved-state">
      <div className="approved-mark"><Icon name="check" size={28} /></div>
      <h3>Corpus aprobado · puedes seguir enriqueciéndolo</h3>
      <p>
        El snapshot del estado aprobado quedó guardado — puedes restaurarlo cuando
        quieras desde Snapshots. Si quieres meter más menciones para subir la
        densidad de señal, genera una nueva query con las{" "}
        <strong>Instrucciones para la próxima query</strong> del diagnóstico arriba.
      </p>

      {!running && (
        <button className="wizard-cta" onClick={startNewIteration} type="button">
          <Icon name="sparkle" size={14} /> Continuar iterando · nueva query
        </button>
      )}

      {running && (
        <div className="wizard-progress">
          <div className="wizard-progress-bar"><span style={{ width: `${progress}%` }} /></div>
          <p className="wizard-progress-text">
            <Icon name="spinner" className="icon--spin" size={12} /> Generando nueva iteración · {progress}%
          </p>
        </div>
      )}

      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   History (collapsed)
   ============================================================ */

function IterationHistory({ iterations }: { iterations: Iteration[] }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="history" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="history-summary">
        <span>Historial · {iterations.length} {iterations.length === 1 ? "iteración" : "iteraciones"}</span>
        <span className={`history-chev${open ? " history-chev--open" : ""}`}>
          <Icon name="chevron-down" size={16} />
        </span>
      </summary>
      <div className="history-list">
        {iterations.map((iter) => {
          const evaluated = iter.qualityScore !== null;
          const decision = iter.insightsManagerDecision;
          return (
            <div className="history-item" key={iter.id}>
              <span className="history-num">#{iter.iterationNumber}</span>
              <div className="history-meta">
                {evaluated ? (
                  <>
                    <span className="history-score">Q {Number(iter.qualityScore).toFixed(1)}</span>
                    <span className="history-score">D {Number(iter.densityScore).toFixed(1)}</span>
                    <span className="history-score">N {Number(iter.noiseScore).toFixed(1)}</span>
                  </>
                ) : (
                  <span className="history-pending">sin evaluar</span>
                )}
                {decision === "approved" && <span className="history-tag history-tag--good">aprobada</span>}
              </div>
              <div className="history-query" title={iter.queryText}>
                {iter.queryText.slice(0, 70)}…
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

/* ============================================================
   Corpus-level readiness — meta-evaluator over the full corpus.
   ============================================================ */

const VERDICT_TONE: Record<
  Assessment["verdict"],
  { label: string; tone: "success" | "warn" | "error" }
> = {
  ready: { label: "Listo para estudio", tone: "success" },
  needs_more_signal: { label: "Falta señal", tone: "warn" },
  needs_more_volume: { label: "Falta volumen", tone: "warn" },
  corpus_too_noisy: { label: "Demasiado ruido", tone: "error" },
};

function fmtAssessedAt(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function CorpusAssessmentPanel({
  corpusId,
  totalIncluded,
  assessment,
  assessedAt,
  isApproved,
  latestQuality,
  iterationCount,
}: {
  corpusId: string;
  totalIncluded: number;
  assessment: Assessment | null;
  assessedAt: Date | string | null;
  isApproved: boolean;
  latestQuality: number | null;
  iterationCount: number;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [copiedFindings, setCopiedFindings] = useState(false);
  const router = useRouter();

  async function approve() {
    setApproving(true);
    setError(null);
    const res = await fetch(`/api/corpora/${corpusId}/approve`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.message ?? "No se pudo aprobar el corpus.");
      setApproving(false);
      return;
    }
    setApproving(false);
    router.refresh();
  }

  // Compile findings into prose ready to paste into the query generator
  // comment field. Includes verdict, signals_missing, recommendation.
  function buildFindingsText(): string {
    if (!assessment) return "";
    const parts: string[] = [];
    parts.push(`Diagnóstico del corpus (${assessment.confidence}% confianza, muestra ${assessment.sample_size ?? 600}):`);
    parts.push("");
    if (assessment.recommendation) {
      parts.push(`Recomendación general: ${assessment.recommendation}`);
      parts.push("");
    }
    if (assessment.signals_missing.length > 0) {
      parts.push("Señales que faltan capturar en el corpus:");
      assessment.signals_missing.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
      parts.push("");
    }
    if (assessment.signals_well_covered.length > 0) {
      parts.push("Señales ya bien cubiertas (no duplicar):");
      assessment.signals_well_covered.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
      parts.push("");
    }
    parts.push(
      `Métricas: triggers ${assessment.coverage.trigger_signal_pct}% · barriers ${assessment.coverage.barrier_signal_pct}% · experiencia ${assessment.coverage.experience_signal_pct}% · ruido ${assessment.coverage.noise_pct}%.`
    );
    parts.push("");
    parts.push(
      "Genera la próxima query priorizando capturar las señales faltantes arriba sin reintroducir términos que generan ruido."
    );
    return parts.join("\n");
  }

  async function copyFindings() {
    const text = buildFindingsText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedFindings(true);
    setTimeout(() => setCopiedFindings(false), 2200);
  }

  async function run() {
    setRunning(true);
    setError(null);
    setProgress(5);
    const res = await fetch(`/api/corpora/${corpusId}/assess`, { method: "POST" });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.message ?? "No se pudo iniciar el diagnóstico.");
      setRunning(false);
      return;
    }
    const jobId = payload.job_id;
    const poll = setInterval(async () => {
      const jr = await fetch(`/api/jobs/${jobId}`);
      const j = await jr.json();
      setProgress(Math.max(progress, j.progress ?? 0));
      if (j.status === "completed") {
        clearInterval(poll);
        setProgress(100);
        setTimeout(() => {
          setRunning(false);
          router.refresh();
        }, 400);
      } else if (j.status === "failed") {
        clearInterval(poll);
        setError(j.failed_reason ?? "El diagnóstico falló.");
        setRunning(false);
      }
    }, 1500);
  }

  const v = assessment ? VERDICT_TONE[assessment.verdict] : null;
  const canApprove = !isApproved;
  const approveIsPrimary = assessment?.ready_for_study === true;

  return (
    <section className="corpus-assess">
      <header className="corpus-assess-head">
        <div>
          <div className="wizard-card-eyebrow-row">
            <p className="corpus-assess-eyebrow">
              {isApproved ? "Corpus aprobado" : "Diagnóstico del corpus"}
            </p>
            {isApproved && <SuccessPill>Aprobado</SuccessPill>}
            {!isApproved && v && (
              <StatusPill tone={v.tone}>
                <Icon name={v.tone === "success" ? "check" : v.tone === "error" ? "x" : "alert"} size={12} />
                {v.label}
              </StatusPill>
            )}
            {!isApproved && !assessment && totalIncluded > 0 && (
              <StatusPill tone="idle"><Icon name="info" size={12} /> Sin evaluar</StatusPill>
            )}
          </div>
          <h3 className="corpus-assess-title">
            {isApproved
              ? "Listo para análisis cultural"
              : assessment
                ? v?.label
                : `Evaluar viabilidad sobre las ${fmtNumber(totalIncluded)} menciones`}
          </h3>
          {assessment && assessedAt && (
            <p className="corpus-assess-meta">
              Diagnóstico actualizado {fmtAssessedAt(assessedAt)} · muestra{" "}
              {assessment.sample_size ?? 600} · confianza {assessment.confidence}%
            </p>
          )}
        </div>
        <div className="corpus-assess-actions">
          <button
            className="wizard-cta wizard-cta--secondary"
            disabled={running || approving}
            onClick={run}
            type="button"
          >
            {running ? (
              <><Icon name="spinner" className="icon--spin" size={14} /> Diagnosticando · {progress}%</>
            ) : assessment ? (
              <><Icon name="refresh" size={14} /> Re-diagnosticar</>
            ) : (
              <><Icon name="sparkle" size={14} /> Diagnosticar corpus</>
            )}
          </button>
          {canApprove && (
            <button
              className={`wizard-cta${approveIsPrimary ? "" : " wizard-cta--secondary"}`}
              disabled={approving || running}
              onClick={approve}
              type="button"
              title={
                approveIsPrimary
                  ? "El motor recomienda aprobar"
                  : "Aprobar aún sabiendo que el corpus tiene huecos. El Insights Manager decide."
              }
            >
              {approving ? (
                <><Icon name="spinner" className="icon--spin" size={14} /> Aprobando…</>
              ) : approveIsPrimary ? (
                <><Icon name="star" size={14} /> Aprobar corpus</>
              ) : (
                <><Icon name="check" size={14} /> Aprobar de todas formas</>
              )}
            </button>
          )}
        </div>
      </header>

      {running && (
        <div className="wizard-progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}

      {!assessment && !running && (
        <p className="corpus-assess-helper">
          El motor toma una muestra aleatoria de 600 menciones del corpus completo (no de una
          sola query) y decide si ya tienes señal suficiente para correr el estudio T&amp;B, o
          qué tipo de señal hace falta. Esto es independiente de la evaluación por iteración.
        </p>
      )}

      {assessment && (
        <>
          <div className="coverage-bars">
            <CoverageBar label="Triggers" pct={assessment.coverage.trigger_signal_pct} tone="good" />
            <CoverageBar label="Barriers" pct={assessment.coverage.barrier_signal_pct} tone="good" />
            <CoverageBar label="Experiencia" pct={assessment.coverage.experience_signal_pct} tone="good" />
            <CoverageBar label="Ruido" pct={assessment.coverage.noise_pct} tone="bad" />
          </div>

          {assessment.recommendation && (
            <p className="corpus-assess-reco">{assessment.recommendation}</p>
          )}

          {(assessment.signals_well_covered.length > 0 || assessment.signals_missing.length > 0) && (
            <div className="signals-grid">
              {assessment.signals_well_covered.length > 0 && (
                <div>
                  <p className="signals-label signals-label--good">
                    <Icon name="check" size={12} /> Bien cubiertos
                  </p>
                  <ul className="signals-list">
                    {assessment.signals_well_covered.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.signals_missing.length > 0 && (
                <div>
                  <p className="signals-label signals-label--bad">
                    <Icon name="x" size={12} /> Faltantes
                  </p>
                  <ul className="signals-list">
                    {assessment.signals_missing.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Copyable findings block — feeds directly into the query generator
              comment field so the IM doesn't retype the diagnostic. */}
          <div className="findings-block">
            <div className="findings-head">
              <div>
                <p className="findings-label">
                  <Icon name="copy" size={12} /> Instrucciones para la próxima query
                </p>
                <p className="findings-sub">
                  Copia este texto y pégalo en <strong>Comentar las queries y regenerar</strong>{" "}
                  en el panel de iteración. El motor lo aplicará como prioridad máxima.
                </p>
              </div>
              <button
                className={`btn-micro${copiedFindings ? " btn-copied" : ""}`}
                onClick={copyFindings}
                type="button"
              >
                {copiedFindings ? <Icon name="check" size={12} /> : <Icon name="copy" size={12} />}
                {copiedFindings ? "Copiado" : "Copiar"}
              </button>
            </div>
            <pre className="findings-text">{buildFindingsText()}</pre>
          </div>
        </>
      )}

      {/* When approved, render a concise reality-based summary instead of a
          generic "everything is perfect" celebration. */}
      {isApproved && (
        <div className="approved-summary">
          <p className="approved-summary-lede">
            El Insights Manager aprobó este corpus para análisis cultural.{" "}
            {iterationCount > 0 && (
              <>
                Tomó <strong>{iterationCount}</strong>{" "}
                {iterationCount === 1 ? "iteración" : "iteraciones"}.
              </>
            )}
          </p>
          <dl className="approved-stats">
            <div>
              <dt>Menciones válidas</dt>
              <dd>{fmtNumber(totalIncluded)}</dd>
            </div>
            <div>
              <dt>Calidad última iteración</dt>
              <dd>{latestQuality !== null ? latestQuality.toFixed(1) : "—"}</dd>
            </div>
            {assessment && (
              <>
                <div>
                  <dt>Veredicto del motor</dt>
                  <dd>{VERDICT_TONE[assessment.verdict].label}</dd>
                </div>
                <div>
                  <dt>Confianza del diagnóstico</dt>
                  <dd>{assessment.confidence}%</dd>
                </div>
              </>
            )}
          </dl>
          {assessment && assessment.signals_missing.length > 0 && (
            <p className="approved-caveat">
              <Icon name="info" size={13} /> El motor identificó {assessment.signals_missing.length}{" "}
              {assessment.signals_missing.length === 1 ? "señal" : "señales"} sin cubrir al cierre.
              El análisis tomará en cuenta esa limitación.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="wizard-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </section>
  );
}

function CoverageBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "good" | "bad";
}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="coverage-bar">
      <div className="coverage-bar-head">
        <span className="coverage-bar-label">{label}</span>
        <span className="coverage-bar-value">{safe}%</span>
      </div>
      <div className="coverage-bar-track">
        <span className={`coverage-bar-fill coverage-bar-fill--${tone}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
