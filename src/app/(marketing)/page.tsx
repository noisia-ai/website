import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { ArchitectureFlow } from "@/components/marketing/ArchitectureFlow";
import { MethodologyPreviewGrid } from "@/components/marketing/MethodologyPreviewGrid";
import { UseCaseSelector } from "@/components/marketing/UseCaseSelector";
import { ProductConsoleShowcase } from "@/components/product-scenes/ProductConsoleShowcase";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { serviceTiers, sourceTypes } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <section className="hero-experience">
        <div className="hero-experience__inner">
          <div className="hero-copy reveal">
            <h1 className="display-xl">Inteligencia social no es un dashboard. Es una decisión.</h1>
            <p className="body-lg">
              Construimos inteligencia social para marcas que necesitan resolver una decisión, no
              monitorear menciones. Orquestamos fuentes públicas, aplicamos metodología propietaria
              y entregamos una recomendación que tu equipo puede accionar.
            </p>
            <div className="hero-actions">
              <Button href="/diagnostico" icon={<ArrowRight size={17} strokeWidth={1.8} />}>
                Iniciar diagnóstico
              </Button>
              <Button href="/metodologias" variant="secondary">
                Ver metodologías
              </Button>
            </div>
            <div className="hero-proof">
              <div className="glass">
                <strong>150+</strong>
                <span>fuentes normalizadas</span>
              </div>
              <div className="glass">
                <strong>6</strong>
                <span>metodologías propietarias</span>
              </div>
              <div className="glass">
                <strong>1</strong>
                <span>decisión trazable por proyecto</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section product-preview-section" data-reveal>
        <div className="section__inner product-preview-section__inner">
          <SectionHeader
            eyebrow="DEL DATO A LA DECISIÓN"
            title="Cinco lecturas. Un sistema que cambia con la decisión."
            lead="Cada decisión activa un protocolo distinto: qué fuentes leer, qué método aplicar, qué métrica defender. Estas son cinco lecturas reales — no demos, no plantillas — que muestran cómo se ve el output cuando la conversación deja de ser ruido y empieza a ordenar una decisión."
            align="center"
          />
          <ProductConsoleShowcase />
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="LA PREGUNTA QUE TIENES ENFRENTE"
            title="Si reconoces tu pregunta acá, ya sabemos por dónde empezar."
            lead="Cada situación activa un protocolo distinto — fuentes, método, entregables. Estas son siete preguntas que hemos resuelto antes y donde el camino ya está calibrado."
          />
          <Suspense fallback={<div className="glass loading-panel">Cargando preguntas...</div>}>
            <UseCaseSelector />
          </Suspense>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="METODOLOGÍAS PROPIETARIAS"
            title="Seis lentes. Cada una construida para una pregunta distinta."
            lead="Cada una entra cuando su pregunta aparece. Se aplican solas, en pares o como sistema, según la profundidad de la decisión."
          />
          <MethodologyPreviewGrid />
        </div>
      </section>

      <section className="section">
        <div className="section__inner data-architecture-home">
          <div>
            <SectionHeader
              eyebrow="INFRAESTRUCTURA"
              title="El corpus es la primera decisión analítica."
              lead="Una metodología afilada operando sobre un corpus pobre produce conclusiones pobres. Por eso el primer trabajo de Noisia no es analizar — es orquestar las fuentes correctas, normalizarlas y construir un corpus comparable antes de aplicar método."
            />
            <Button href="/arquitectura-de-datos" variant="secondary" icon={<ArrowRight size={17} strokeWidth={1.8} />}>
              Conocer arquitectura
            </Button>
          </div>
          <ArchitectureFlow />
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="COBERTURA"
            title="La conversación que importa rara vez vive en una sola plataforma."
            lead="El corpus se arma por pregunta, no por default. Combinamos fuentes sociales, reviews, foros, noticias, audio, video y marketplaces cuando la decisión lo exige — y dejamos fuera lo que no aporta señal."
            align="center"
          />
          <div className="source-cloud">
            {sourceTypes.map((source) => (
              <span className="chip" key={source}>
                {source}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="SERVICIOS"
            title="Tres formas de trabajar juntos. Una sola lógica: la pregunta manda."
            lead="Foundation, Intelligence y Strategy no son paquetes cerrados. Son niveles de profundidad para construir una respuesta proporcional al riesgo de la decisión que tienes enfrente."
          />
          <div className="tier-grid">
            {serviceTiers.map((tier) => (
              <article className="tier-card glass" key={tier.name}>
                <span className="chip">{tier.name}</span>
                <h3>{tier.description}</h3>
                <ul>
                  {tier.scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{tier.ideal}</p>
                <Button href="/diagnostico" variant="ghost">
                  Iniciar diagnóstico
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="section__inner">
          <div className="closing-panel glass">
            <span className="eyebrow">HONESTIDAD METODOLÓGICA</span>
            <h2 className="display-lg">Tu pregunta no es “qué dicen sobre mi marca”. Es “qué hago con lo que dicen”.</h2>
            <p className="body-lg">
              Lo que la conversación pública dice de tu marca es materia prima, no producto final.
              Nuestro trabajo es encontrar la respuesta que sostiene tu pregunta de negocio,
              defenderla con evidencia trazable y traducirla a algo que tu equipo pueda accionar el lunes.
            </p>
            <div className="hero-actions">
              <Button href="/diagnostico" icon={<ArrowRight size={17} strokeWidth={1.8} />}>
                Iniciar diagnóstico
              </Button>
              <Button href="/contacto" variant="secondary">
                Hablar con Noisia
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
