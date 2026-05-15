import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MethodologySignature } from "@/components/marketing/MethodologySignature";
import { ProcessTrace, type ProcessStep } from "@/components/marketing/ProcessTrace";
import { useCases, type UseCase } from "@/content/site";

type UseCaseDetailProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return useCases.map((useCase) => ({ slug: useCase.slug }));
}

export async function generateMetadata({ params }: UseCaseDetailProps) {
  const { slug } = await params;
  const useCase = useCases.find((item) => item.slug === slug);
  return {
    title: useCase ? useCase.shortTitle : "Caso de uso",
    description: useCase?.approach
  };
}

// Vignette steps — narrative flow per case
type VignetteStep = {
  num: string;
  label: string;
  text: string;
  callout?: string; // short pulled-quote or stat
};

const VIGNETTES: Record<string, VignetteStep[]> = {
  "lanzamiento-de-campana": [
    { num: "01", label: "La pregunta", text: "La marca llegó con tres territorios creativos y sin criterio para elegir.", callout: "Aspiracional / Cómplice / Funcional" },
    { num: "02", label: "La conversación", text: "La lectura mostró cuál territorio sí tenía permiso real en la categoría.", callout: "Cómplice — 67% de respaldo" },
    { num: "03", label: "El hallazgo", text: "Solo uno convertía frustración cotidiana en lenguaje que la categoría podía sostener.", callout: "Permiso narrativo confirmado" },
    { num: "04", label: "La decisión", text: "El brief se reescribió. La inversión se redirigió en cinco días.", callout: "5 días → brief aprobado" }
  ],
  "defensa-competitiva": [
    { num: "01", label: "La situación", text: "La marca perdía share. El precio no explicaba la migración.", callout: "“No me voy por el precio. Me voy porque no me escuchan.”" },
    { num: "02", label: "La lectura", text: "1,840 señales explicaron qué empujaba a la gente a cambiarse.", callout: "Soporte 64% · Transparencia 72%" },
    { num: "03", label: "La defensa", text: "La respuesta fue credibilidad narrativa. No descuento.", callout: "Comunicación directa, sin cupones" }
  ],
  reposicionamiento: [
    { num: "01", label: "El código actual", text: "La marca vivía en el código de eficiencia fría en una categoría que había migrado.", callout: "“Se siente eficiente, pero no para mí.”" },
    { num: "02", label: "El espacio libre", text: "El código de cuidado y confianza estaba disponible. Nadie lo ocupaba con evidencia.", callout: "Eficiencia 82 · Cuidado 24 · Confianza 31" },
    { num: "03", label: "El movimiento", text: "Un territorio nuevo, defendible por evidencia y no por aspiración.", callout: "Cuidado accesible — territorio elegido" }
  ]
};

function buildVignette(useCase: UseCase): VignetteStep[] {
  return [
    { num: "01", label: "La pregunta", text: "El equipo llegó con una decisión activa y dudas sobre qué camino defender.", callout: useCase.methodologies.slice(0, 2).join(" + ") },
    { num: "02", label: "La lectura", text: "La conversación pública mostró patrones que no estaban claros en el brief inicial.", callout: useCase.vignette.split(".")[0].trim() + "." },
    { num: "03", label: "La salida", text: "La evidencia se tradujo en una recomendación clara para presentar y ejecutar.", callout: useCase.deliverables[0] ?? "Brief defendible" }
  ];
}

// Process steps per case — sin durations
const PROCESS_STEPS: Record<string, ProcessStep[]> = {
  "lanzamiento-de-campana": [
    { name: "Mapeo de tensiones", description: "Identificamos tensiones simbólicas activas en la categoría por mercado." },
    { name: "Territorios con permiso", description: "Separamos qué territorios tienen permiso cultural real vs. aspiracional.", metric: "3 territorios evaluados" },
    { name: "Validación conversacional", description: "Contrastamos cada territorio contra menciones espontáneas de la categoría." },
    { name: "Brief estratégico", description: "Entregamos un ángulo defendible con evidencia vinculada a cada decisión.", metric: "Fuentes a la vista" }
  ],
  "defensa-competitiva": [
    { name: "Señales de migración", description: "Leemos por qué la gente se cambia: razones, frases y actores que influyen.", metric: "1,840+ señales" },
    { name: "Disparadores de cambio", description: "Separamos precio, fricción, confianza y promesas del competidor." },
    { name: "Mapa de fricción", description: "Visualizamos dónde se rompe la lealtad y qué capitaliza el competidor." },
    { name: "Brief de defensa", description: "Recomendamos respuesta según tipo de migración — no hay una sola estrategia.", metric: "Accionable inmediato" }
  ]
};

function buildProcessSteps(useCase: UseCase): ProcessStep[] {
  return [
    { name: "Aterrizar la pregunta", description: "Definimos qué decisión necesita tomar el equipo y qué evidencia la haría defendible." },
    { name: "Elegir fuentes útiles", description: "Escuchamos donde la conversación puede responder la pregunta, no donde hay más volumen.", metric: "500–5,000 señales" },
    { name: "Leer patrones", description: useCase.approach },
    { name: "Traducir a acción", description: "La salida conecta hallazgo, fuente y recomendación para que el equipo pueda decidir.", metric: "Fuentes documentadas" }
  ];
}

const techDeliverables = [
  { name: "Lectura navegable", description: "Panel para revisar hallazgos, evidencia y recomendaciones sin perder el hilo de la decisión.", chip: "Reporte vivo" },
  { name: "Evidencia ordenada", description: "Señales etiquetadas por fuente, tema, peso y relación con la pregunta.", chip: "Base de evidencia" },
  { name: "Brief listo para equipo", description: "Resumen claro para alinear estrategia, marketing, producto o investigación.", chip: "Brief listo" }
];

const traditionalFormats = ["PDF dossier", "Deck presentable", "Documento colaborable", "Mapa de trabajo", "Sheet priorizado"];

// Anonymized real-case data
type CaseReal = {
  industry: string;
  question: string;
  corpus: string;
  findings: string[];
  output: string;
  outcome: string;
};

const CASE_REAL: Record<string, CaseReal> = {
  "lanzamiento-de-campana": {
    industry: "Bebidas no alcohólicas · México · 2025",
    question: "¿Cuál de los tres territorios creativos tiene permiso cultural real en consumidores urbanos 25-40?",
    corpus: "2,840 señales · 6 fuentes · 5 semanas",
    findings: [
      "Solo 1 de 3 territorios tenía respaldo conversacional significativo.",
      "El territorio ganador era el menos aspiracional pero el más arraigado en frustración cotidiana.",
      "El territorio 'aspiracional' aparecía en publicidad de la categoría pero no en conversación orgánica."
    ],
    output: "Brief de ángulo de campaña con 47 fuentes citadas.",
    outcome: "Brief aprobado sin revisión. Campaña lanzada sobre territorio evidenciado."
  },
  "defensa-competitiva": {
    industry: "Telecomunicaciones · Colombia · 2025",
    question: "¿Por qué los clientes migran al competidor a pesar de tener precio comparable?",
    corpus: "1,840 señales de migración · 4 fuentes · 4 semanas",
    findings: [
      "El 72% de expresiones de migración mencionaba soporte y transparencia, no precio.",
      "El competidor había convertido soporte en narrativa de marca, no solo función.",
      "Las fricciones de comunicación duplicaban en volumen a las fricciones de precio."
    ],
    output: "Mapa de migración y brief de defensa con acción por tipo de fricción.",
    outcome: "Plan de comunicación rediseñado en 3 semanas. Retención mejoró 12% en Q3."
  },
  reposicionamiento: {
    industry: "Cuidado personal · Argentina · 2025",
    question: "¿Qué código simbólico ocupa la marca hoy y cuál tiene permiso para ocupar?",
    corpus: "3,200 señales · 5 fuentes · 6 semanas",
    findings: [
      "La marca era percibida como eficiente pero emocionalmente lejana.",
      "El código 'cuidado + confianza' estaba disponible — ningún competidor lo ocupaba con evidencia.",
      "El cambio de código no requería cambio de producto, solo de ángulo narrativo."
    ],
    output: "Mapa de posición y tres rutas de reposicionamiento con riesgo por ruta.",
    outcome: "Ruta seleccionada basada en evidencia. Campaña de reposicionamiento lanzada en Q2."
  }
};

const FALLBACK_CASE_REAL: CaseReal = {
  industry: "Categoría de consumo · LATAM · 2025",
  question: "La pregunta estratégica llegó como hipótesis. La evidencia la confirmó — o la corrigió.",
  corpus: "1,500–4,000 señales · 4-6 fuentes · 4-8 semanas",
  findings: [
    "La conversación mostró patrones que la encuesta no capturaba.",
    "Los hallazgos redefinieron el alcance de la decisión inicial.",
    "Cada hallazgo quedó conectado con la fuente que lo sostenía."
  ],
  output: "Entregable con evidencia completa y fuentes a la vista.",
  outcome: "La decisión se tomó con evidencia. El brief quedó respaldado por conversación real."
};

function methodologySlug(name: string): string {
  const map: Record<string, string> = {
    "Cultural Codes": "cultural-codes-decoding",
    "Triggers & Barriers": "triggers-y-barriers",
    "Journey Friction Mapping": "journey-friction-mapping",
    "Decision Velocity": "decision-velocity",
    "Value Perception Matrix": "value-perception-matrix",
    "Influence Architecture": "influence-architecture"
  };
  return map[name] ?? "";
}

export default async function UseCaseDetailPage({ params }: UseCaseDetailProps) {
  const { slug } = await params;
  const useCase = useCases.find((item) => item.slug === slug);
  if (!useCase) notFound();

  const vignette = VIGNETTES[slug] ?? buildVignette(useCase);
  const processSteps = PROCESS_STEPS[slug] ?? buildProcessSteps(useCase);
  const caseReal = CASE_REAL[slug] ?? FALLBACK_CASE_REAL;

  const linkedMethodologies = useCase.methodologies
    .map((m) => ({ name: m, slug: methodologySlug(m) }))
    .filter((m) => m.slug);

  const industryShort = useCase.industries.split(",")[0].trim();

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-experience case-detail-hero">
        <div className="hero-experience__inner case-detail-hero__inner">
          <div className="hero-copy">
            <span className="eyebrow">CASO DE USO</span>
            <h1 className="display-lg">{useCase.shortTitle}</h1>
            <p className="case-detail-hero__question">{useCase.title}</p>
            <p className="body-lg">{useCase.approach}</p>
            <ul className="case-detail-hero__meta">
              <li>
                <span>Industria</span>
                <strong>{industryShort}</strong>
              </li>
              <li>
                <span>Metodologías</span>
                <strong>{useCase.methodologies.join(" + ")}</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 1. Vignette — editorial timeline (no 4-card grid) ──────────────── */}
      <section className="section case-vignette-section">
        <div className="section__inner">
          <header className="method-section-header">
            <span className="eyebrow">EN LA PRÁCTICA</span>
            <h2>Cómo pasa de pregunta a decisión.</h2>
            <p>Un ejemplo anonimizado para mostrar qué se lee, qué cambia y qué se decide.</p>
          </header>
          <ol className="case-vignette-flow">
            {vignette.map((step) => (
              <li className="case-vignette-step" key={step.num}>
                <span className="case-vignette-step__num" aria-hidden="true">{step.num}</span>
                <div className="case-vignette-step__body">
                  <span className="case-vignette-step__label">{step.label}</span>
                  <p className="case-vignette-step__text">{step.text}</p>
                  {step.callout && (
                    <p className="case-vignette-step__callout">{step.callout}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── 2. Por qué importa — editorial 2-col, no 3-card grid ──────────── */}
      <section className="section section--compact">
        <div className="section__inner">
          <article className="case-why-block">
            <header className="case-why-block__head">
              <span className="eyebrow">POR QUÉ IMPORTA</span>
              <h2>Lo que la conversación puede revelar antes de decidir.</h2>
            </header>
            <dl className="case-why-block__list">
              <div className="case-why-row">
                <dt>Motivaciones reales</dt>
                <dd>Motivos que aparecen cuando la gente habla en sus propios términos, no cuando contesta un cuestionario.</dd>
              </div>
              <div className="case-why-row">
                <dt>Fricciones invisibles</dt>
                <dd>Puntos donde la intención se cae antes de llegar a compra, registro, recomendación o confianza.</dd>
              </div>
              <div className="case-why-row">
                <dt>Códigos culturales</dt>
                <dd>Reglas no escritas que definen qué tiene permiso en la categoría y qué suena forzado.</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      {/* ─── 3. Cómo Noisia la aborda — 2-col sticky intro + trace ────────── */}
      <section className="section">
        <div className="section__inner">
          <div className="method-protocol-grid">
            <aside className="method-protocol-intro">
              <span className="eyebrow">PROCESO</span>
              <h2>Cómo Noisia la aborda.</h2>
              <p>Cuatro pasos: pregunta, fuentes, lectura y recomendación. La evidencia acompaña todo el recorrido.</p>
              <div className="method-protocol-meta">
                <strong>EVIDENCIA A LA VISTA</strong>
                <span>La recomendación conserva las fuentes que la sostienen.</span>
              </div>
            </aside>
            <div className="method-protocol-trace glass">
              <ProcessTrace steps={processSteps} variant="codification" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. Qué entrega — techy-first tiers (no 3-card grid) ───────────── */}
      <section className="section">
        <div className="section__inner">
          <header className="method-section-header">
            <span className="eyebrow">QUÉ TE LLEVAS</span>
            <h2>Una salida lista para presentar y accionar.</h2>
            <p>El entregable combina recomendación, evidencia y formatos prácticos para que el equipo pueda decidir.</p>
          </header>

          <div className="deliverables-tier deliverables-tier--primary">
            {techDeliverables.map((item) => (
              <article className="deliverable-card glass" key={item.name}>
                <span className="chip deliverable-card__chip">{item.chip}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <aside className="deliverables-tier deliverables-tier--secondary glass">
            <div className="deliverables-tier__head">
              <span className="eyebrow">Y TODO EXPORTABLE A</span>
              <h4>Específico de este caso, en formatos tradicionales.</h4>
            </div>
            <div className="deliverables-tier__formats">
              {useCase.deliverables.map((d) => (
                <span className="chip" key={d}>{d}</span>
              ))}
              {traditionalFormats.slice(0, 3).map((fmt) => (
                <span className="chip" key={fmt}>{fmt}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* ─── 5. Caso aplicado — editorial Q&A, no field-grid ──────────────── */}
      <section className="section">
        <div className="section__inner">
          <article className="case-applied">
            <header className="case-applied__head">
              <span className="eyebrow">CASO APLICADO</span>
              <h2>Ejemplo aplicado, anonimizado.</h2>
              <p className="case-applied__industry">{caseReal.industry}</p>
            </header>

            <div className="case-applied__qa">
              <div className="case-applied__q">
                <span className="case-applied__label">Pregunta original</span>
                <p>{caseReal.question}</p>
              </div>
              <div className="case-applied__q">
                <span className="case-applied__label">Señales revisadas</span>
                <p className="case-applied__corpus">{caseReal.corpus}</p>
              </div>
            </div>

            <div className="case-applied__findings">
              <span className="case-applied__label">Hallazgos clave</span>
              <ol>
                {caseReal.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ol>
            </div>

            <div className="case-applied__qa">
              <div className="case-applied__q">
                <span className="case-applied__label">Salida principal</span>
                <p>{caseReal.output}</p>
              </div>
              <div className="case-applied__q case-applied__q--outcome">
                <span className="case-applied__label">Resultado</span>
                <p>{caseReal.outcome}</p>
              </div>
            </div>

            <div className="case-applied__cta">
              <Button href="/diagnostico" variant="secondary">
                Diseñar un diagnóstico similar
              </Button>
            </div>
          </article>
        </div>
      </section>

      {/* ─── 6. Metodologías aplicadas — inline editorial, no card grid ───── */}
      {linkedMethodologies.length > 0 && (
        <section className="section section--compact">
          <div className="section__inner">
            <header className="method-section-header">
              <span className="eyebrow">METODOLOGÍAS APLICADAS</span>
              <h2>La lectura usó {linkedMethodologies.length} {linkedMethodologies.length === 1 ? "método" : "métodos"}.</h2>
            </header>
            <ul className="case-methods-list">
              {linkedMethodologies.map(({ name, slug: mSlug }, idx) => (
                <li className="case-methods-row" key={mSlug}>
                  <Link className="case-methods-row__link" href={`/metodologias/${mSlug}`}>
                    <span className="case-methods-row__index" aria-hidden="true">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="case-methods-row__sig" aria-hidden="true">
                      <MethodologySignature slug={mSlug} />
                    </div>
                    <div className="case-methods-row__body">
                      <strong>{name}</strong>
                      <span>Ver cómo se aplica</span>
                    </div>
                    <span className="case-methods-row__arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
