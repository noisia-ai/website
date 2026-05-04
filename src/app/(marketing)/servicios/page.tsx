import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FAQAccordion, type FAQItem } from "@/components/marketing/FAQAccordion";
import { OutOfScope, type OutOfScopeItem } from "@/components/marketing/OutOfScope";
import { ProcessTrace, type ProcessStep } from "@/components/marketing/ProcessTrace";

export const metadata = {
  title: "Servicios",
  description: "Foundation, Intelligence y Strategy: tres niveles de proyecto diseñados para la complejidad de tu decisión."
};

type Tier = {
  number: string;
  name: string;
  tagline: string;
  trigger: string;
  features: string[];
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    number: "01",
    name: "Foundation",
    tagline: "Diagnóstico inicial",
    trigger: "Para validar o descartar una hipótesis antes de comprometer presupuesto.",
    features: [
      "1–2 metodologías aplicadas",
      "Corpus construido por pregunta",
      "Equipo de 2 personas",
      "Entrega: diagnóstico trazable",
      "Modalidad proyecto puntual",
    ],
  },
  {
    number: "02",
    name: "Intelligence",
    tagline: "Lectura operativa",
    trigger: "Para decisiones que ya vienen encima y necesitan playbook, no solo validación.",
    features: [
      "3–4 metodologías combinadas",
      "Corpus multicanal + enriquecido",
      "Equipo de 3–4 personas",
      "Entrega: playbook accionable",
      "Evidencia trazable + actualizable",
      "Modalidad proyecto puntual",
    ],
    featured: true,
  },
  {
    number: "03",
    name: "Strategy",
    tagline: "Capacidad continua",
    trigger: "Para portafolios complejos que necesitan inteligencia social instalada como función permanente.",
    features: [
      "Las 6 metodologías + custom",
      "Corpus vivo y actualizable",
      "Equipo de 4–6 + lead",
      "Protocolo evolutivo propio",
      "Alertas y decisiones recurrentes",
      "Modalidad retainer evolutivo",
    ],
  },
];

const specRows = [
  { attribute: "Pregunta de negocio", foundation: "Una", intelligence: "Una principal + derivadas", strategy: "Múltiples, recurrentes" },
  { attribute: "Metodologías", foundation: "1–2", intelligence: "3–4", strategy: "Las 6 + custom" },
  { attribute: "Output", foundation: "Diagnóstico", intelligence: "Playbook accionable", strategy: "Capacidad continua" },
  { attribute: "Evidencia", foundation: "Trazable", intelligence: "Trazable + actualizable", strategy: "Trazable + alertas" },
  { attribute: "Modalidad", foundation: "Proyecto", intelligence: "Proyecto", strategy: "Retainer" },
  { attribute: "Equipo Noisia", foundation: "2 personas", intelligence: "3–4 personas", strategy: "4–6 + lead" },
];

const proposalSteps: ProcessStep[] = [
  { name: "Pregunta estratégica real", description: "La que quita el sueño, no la que suena bien en un brief. Si esa pregunta no es nítida, no hay propuesta — hay diagnóstico previo." },
  { name: "Metodologías aplicables", description: "De las seis metodologías propietarias, elegimos las que responden esa pregunta específica. No las que están de moda." },
  { name: "Fuentes a orquestar", description: "Definidas por la pregunta y el mercado, no por default. La conversación relevante rara vez vive donde el corpus genérico la busca." },
  { name: "Alcance, equipo y modalidad", description: "De ahí — y solo de ahí — salen alcance, equipo y modalidad. La propuesta es consecuencia, no punto de partida." },
];

const noList: OutOfScopeItem[] = [
  { headline: "Licencias de software revendidas.", body: "No somos integradores de listening tools. La infraestructura es nuestra; el corpus se arma por pregunta." },
  { headline: "Dashboards permanentes sin decisión asociada.", body: "Un panel sin pregunta detrás es ruido bonito. Cada dashboard que entregamos vive amarrado a una decisión específica." },
  { headline: "Retainers genéricos de horas sueltas.", body: "Strategy es retainer evolutivo, no bolsa de horas. La capacidad se factura contra protocolo, no contra disponibilidad." },
  { headline: "Reportes de volumen y sentiment como sustituto de insight.", body: "Sentiment score solo no responde decisiones de negocio. Si esa es la entrega esperada, hay otras agencias que la hacen mejor y más barato." },
];

const faqItems: FAQItem[] = [
  {
    question: "¿Cuánto cuesta un proyecto?",
    answer:
      "El precio depende de la pregunta, las fuentes necesarias, las metodologías aplicables y el alcance. No tenemos pricing fijo porque cada protocolo se diseña para la decisión específica. El diagnóstico inicial define el alcance y de ahí sale la propuesta.",
  },
  {
    question: "¿En qué mercados pueden operar?",
    answer:
      "Cubrimos Latinoamérica con especial profundidad en México, Colombia, Argentina, Chile y Perú. También operamos en España y en contextos US-Hispanic. Si tu mercado no está en esta lista, podemos evaluar cobertura en el diagnóstico.",
  },
  {
    question: "¿Necesitamos tener nuestras propias herramientas?",
    answer:
      "No. Noisia opera con infraestructura propia. No vendemos licencias de software ni dependemos de que el cliente tenga acceso a plataformas específicas. El corpus se construye por pregunta.",
  },
  {
    question: "¿Pueden integrarse a nuestro equipo de research?",
    answer:
      "Sí. Muchos proyectos Intelligence y Strategy operan como extensión del equipo interno. Nos adaptamos a herramientas de colaboración, NDA estándar, calendarios de entrega y formatos del cliente.",
  },
  {
    question: "¿Es un retainer o un proyecto?",
    answer:
      "Foundation e Intelligence son proyectos puntuales con inicio, entregables y cierre. Strategy opera como retainer evolutivo con protocolo vivo y corpus actualizable.",
  },
  {
    question: "¿Qué pasa con la evidencia después del proyecto?",
    answer:
      "Todo el corpus, codificación y evidencia es del cliente. Al cierre, el cliente recibe el grafo de evidencia completo — corpus, JSON tagueado y AI-Brief — no solo el reporte final. La trazabilidad no se queda en Noisia.",
  },
  {
    question: "¿Pueden firmar NDA estándar?",
    answer:
      "Sí. Firmamos NDA estándar antes de cualquier diagnóstico. La confidencialidad de la pregunta estratégica y del corpus es no-negociable.",
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-experience page-hero">
        <div className="hero-experience__inner page-hero__inner">
          <div className="hero-copy">
            <span className="eyebrow">SERVICIOS</span>
            <h1 className="display-lg">
              Foundation. Intelligence. Strategy.<br />La decisión te dice cuál.
            </h1>
            <p className="body-lg">
              No vendemos paquetes cerrados. Diseñamos el alcance después del diagnóstico, cuando
              entendemos la decisión, las fuentes a orquestar y la metodología que realmente hace falta.
            </p>
            <div className="hero-actions">
              <Button href="/diagnostico" variant="primary">
                Iniciar diagnóstico
              </Button>
              <Button href="#planes" variant="secondary">
                Ver planes
              </Button>
            </div>
          </div>

          <aside className="page-hero-panel glass">
            <span className="chip">Cómo elegimos el nivel</span>
            <h2>No empieza en precios. Empieza en la complejidad de la decisión.</h2>
            <ul className="page-hero-list">
              <li>
                <b>Foundation</b>
                <span>Una hipótesis importante, antes de comprometer presupuesto.</span>
              </li>
              <li>
                <b>Intelligence</b>
                <span>Una decisión cerca, con riesgo real y necesidad de playbook.</span>
              </li>
              <li>
                <b>Strategy</b>
                <span>Capacidad continua cuando la categoría se mueve todo el tiempo.</span>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* ─── 1. Pricing cards ──────────────────────────────────────────────── */}
      <section className="section" id="planes">
        <div className="section__inner">
          <header className="method-section-header">
            <span className="eyebrow">PLANES</span>
            <h2>Tres niveles de proyecto. Elige el que corresponde a tu decisión.</h2>
            <p>
              El nivel correcto no lo define el presupuesto — lo define la complejidad de la
              pregunta. El diagnóstico inicial es siempre el primer paso, y es gratuito.
            </p>
          </header>

          <div className="services-pricing-grid">
            {tiers.map((tier) => (
              <div
                className={`services-pricing-card ${tier.featured ? "services-pricing-card--featured" : "glass"}`}
                key={tier.name}
              >
                {tier.featured && (
                  <span className="services-pricing-badge">Más solicitado</span>
                )}

                <div className="services-pricing-card__head">
                  <span className="services-pricing-index">{tier.number}</span>
                  <div className="services-pricing-card__title">
                    <p className="services-pricing-tagline">{tier.tagline}</p>
                    <h3 className="services-pricing-name">{tier.name}</h3>
                  </div>
                </div>

                <p className="services-pricing-trigger">{tier.trigger}</p>

                <ul className="services-pricing-features">
                  {tier.features.map((f) => (
                    <li key={f}>
                      <CheckCircle size={14} strokeWidth={2.2} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  className={`services-pricing-cta ${tier.featured ? "services-pricing-cta--light" : "services-pricing-cta--dark"}`}
                  href="/diagnostico"
                >
                  Iniciar diagnóstico →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. Comparativa ────────────────────────────────────────────────── */}
      <section className="section section--compact">
        <div className="section__inner">
          <header className="method-section-header">
            <span className="eyebrow">COMPARATIVA</span>
            <h2>Qué cambia entre cada nivel.</h2>
            <p>Especificaciones operativas: alcance, equipo y tipo de output.</p>
          </header>
          <div className="services-spec">
            <div className="services-spec__head">
              <span className="services-spec__head-attr">Atributo</span>
              <span>Foundation</span>
              <span>Intelligence</span>
              <span>Strategy</span>
            </div>
            {specRows.map((row) => (
              <div className="services-spec__row" key={row.attribute}>
                <span className="services-spec__attr">{row.attribute}</span>
                <span>{row.foundation}</span>
                <span>{row.intelligence}</span>
                <span>{row.strategy}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Cómo construimos la propuesta ──────────────────────────────── */}
      <section className="section">
        <div className="section__inner">
          <div className="method-protocol-grid">
            <aside className="method-protocol-intro">
              <span className="eyebrow">PROPUESTA</span>
              <h2>Cómo construimos el alcance.</h2>
              <p>
                Cuatro movimientos. La propuesta es consecuencia del diagnóstico, no punto de
                partida — por eso no hay rate cards ni tablas genéricas de horas.
              </p>
              <div className="method-protocol-meta">
                <strong>SIN PRICING POR DEFAULT</strong>
                <span>
                  Cada propuesta se construye contra la pregunta específica. Si tu equipo necesita
                  rate card antes de hablar, probablemente no somos la firma correcta.
                </span>
              </div>
            </aside>
            <div className="method-protocol-trace glass">
              <ProcessTrace steps={proposalSteps} variant="codification" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. Qué NO hacemos ─────────────────────────────────────────────── */}
      <section className="section section--compact">
        <div className="section__inner">
          <article className="services-no-block">
            <header className="services-no-block__head">
              <span className="eyebrow">FUERA DEL ALCANCE</span>
              <h2>Lo que no hacemos. Por convicción, no por falta de capacidad.</h2>
            </header>
            <OutOfScope items={noList} />
          </article>
        </div>
      </section>

      {/* ─── 5. FAQ ──────────────────────────────────────────────────────────── */}
      <section className="section section--compact">
        <div className="section__inner">
          <header className="method-section-header">
            <span className="eyebrow">PREGUNTAS FRECUENTES</span>
            <h2>Lo que nos preguntan antes de empezar.</h2>
          </header>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      {/* ─── 6. CTA final ────────────────────────────────────────────────────── */}
      <section className="section section--compact">
        <div className="section__inner">
          <div className="no-method-cta glass">
            <div className="no-method-cta__copy">
              <h2>¿Sabes qué nivel necesita la decisión?</h2>
              <p>
                El diagnóstico es gratuito, dura 8–10 minutos y lo lee uno de nuestros arquitectos
                antes de cualquier llamada. De ahí sale la propuesta — alcance, equipo, modalidad.
              </p>
            </div>
            <Button href="/diagnostico" variant="primary">
              Iniciar diagnóstico
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
