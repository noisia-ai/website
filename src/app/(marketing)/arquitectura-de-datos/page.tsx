import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { dataLayers, sourceTypes } from "@/content/site";

export const metadata = {
  title: "Arquitectura de datos",
  description: "El moat técnico de Noisia: ingesta, normalización, enriquecimiento y analítica."
};

export default function DataArchitecturePage() {
  return (
    <>
      <PageIntro
        eyebrow="EL MOAT TÉCNICO"
        title="La calidad de la inteligencia depende de la arquitectura del dato."
        lead="Una metodología brillante operando sobre un corpus pobre produce conclusiones pobres. Por eso Noisia construye lo que la mayoría de agencias subcontrata: una arquitectura de orquestación diseñada para operar sobre el corpus correcto, no solo sobre el corpus disponible."
      />
      <section className="section">
        <div className="section__inner data-architecture-home">
          <div className="data-layer-stack glass">
            {dataLayers.map((layer, index) => (
              <article key={layer.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{layer.name}</h3>
                <p>{layer.detail}</p>
              </article>
            ))}
          </div>
          <div className="detail-block solid-panel">
            <h2>El problema con las plataformas únicas</h2>
            <p>
              Ninguna plataforma cubre por completo la conversación que decide una categoría. La señal aparece
              distribuida: reviews largos, foros, comentarios de video, noticias, podcasts transcritos,
              marketplaces y comunidades accesibles.
            </p>
            <p>
              Noisia no compite con plataformas. Las orquesta cuando sirven, las complementa cuando faltan y
              normaliza todo en un corpus que pueda sostener decisiones.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section__inner">
          <SectionHeader
            eyebrow="FUENTES"
            title="Tipos de fuente cubiertas."
            lead="El set final depende de la pregunta, la categoría, el mercado y el nivel de profundidad contratado."
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
      <section className="section section--compact">
        <div className="section__inner">
          <div className="integrity-panel glass">
            <ShieldCheck size={24} strokeWidth={1.7} />
            <h2>Lo que no hacemos.</h2>
            <p>
              No hackeamos plataformas cerradas, no scrapeamos contra términos de servicio, no comprometemos
              privacidad personal y no operamos sobre datos personales identificables sin justificación legal.
            </p>
            <Button href="/diagnostico" variant="secondary">
              Diseñar un protocolo
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
