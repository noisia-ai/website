import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { HeroScrollytelling } from "@/components/home/HeroScrollytelling";
import { EvidenceStrip } from "@/components/marketing/EvidenceStrip";
import { MethodologyPreviewGrid } from "@/components/marketing/MethodologyPreviewGrid";
import { SourcesConstellation } from "@/components/marketing/SourcesConstellation";
import { UseCaseSelector } from "@/components/marketing/UseCaseSelector";
import { ProductConsoleShowcase } from "@/components/product-scenes/ProductConsoleShowcase";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { serviceTiers } from "@/content/site";

const timingPattern = /semana|trimestral|anual/i;

export default function HomePage() {
  return (
    <>
      <HeroScrollytelling />

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="COBERTURA"
            title="Escuchamos donde la decisión se está formando."
            lead="La señal puede vivir en TikTok, reviews, foros, búsquedas, noticias o marketplaces. La cobertura se define por tu pregunta, no por una lista fija de fuentes."
          />
          <SourcesConstellation />
        </div>
      </section>

      <section className="section product-preview-section" data-reveal>
        <div className="section__inner product-preview-section__inner">
          <SectionHeader
            eyebrow="DEL DATO A LA DECISIÓN"
            title="Así se ve una lectura cuando ya está lista para negocio."
            lead="Ejemplos de salidas: una pregunta clara, una tensión visible, evidencia detrás y un movimiento recomendado."
          />
          <Suspense fallback={<div className="glass loading-panel">Cargando lecturas...</div>}>
            <ProductConsoleShowcase />
          </Suspense>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="LA PREGUNTA QUE TIENES ENFRENTE"
            title="Encuentra la pregunta que hoy te está frenando."
            lead="Lanzamiento, medios, producto, mercado, competencia, tendencias o crisis. El punto de partida cambia, pero la salida siempre es una decisión defendible."
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
            title="Métodos propios, explicados en lenguaje de negocio."
            lead="Cada método responde una duda concreta: qué activa compra, qué frena confianza, dónde hay valor, quién influye y qué mensaje acelera la decisión."
          />
          <MethodologyPreviewGrid />
        </div>
      </section>

      <section className="section section--compact">
        <div className="section__inner">
          <SectionHeader
            eyebrow="EVIDENCIA"
            title="La evidencia no queda escondida."
            lead="Cada hallazgo conserva la cita, la fuente y el tag que lo sostiene para que tu equipo pueda discutir la decisión, no adivinarla."
          />
        </div>
        <EvidenceStrip />
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="SERVICIOS"
            title="Elige la profundidad según el tamaño de la decisión."
            lead="Foundation, Intelligence y Strategy son tres formas de llegar a una respuesta útil: desde validar una hipótesis hasta sostener un sistema continuo de decisiones."
          />
          <div className="tier-grid">
            {serviceTiers.map((tier) => (
              <article className="tier-card glass" key={tier.name}>
                <h3>{tier.name}</h3>
                <ul>
                  {tier.scope.filter((item) => !timingPattern.test(item)).map((item) => (
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
            <span className="eyebrow">LISTO PARA DECIDIR</span>
            <h2 className="display-lg">No necesitas más ruido. Necesitas una lectura que puedas defender.</h2>
            <p className="body-lg">
              Trabajamos con la conversación pública para responder una pregunta de negocio,
              sostenerla con evidencia trazable y traducirla en acciones que tu equipo pueda poner sobre la mesa.
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
