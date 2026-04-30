import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { principles } from "@/content/site";

export const metadata = {
  title: "Nosotros",
  description: "Principios operativos de Noisia y cómo trabajamos."
};

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="NOSOTROS"
        title="Arquitectos de inteligencia social para decisiones que no caben en un dashboard."
        lead="Noisia nace para cubrir el espacio entre dato abundante y decisión estratégica. Operamos con método, criterio editorial y arquitectura técnica."
      />
      <section className="section">
        <div className="section__inner">
          <div className="content-grid">
            {principles.map((principle, index) => (
              <article className="content-card glass" key={principle}>
                <span className="chip">{String(index + 1).padStart(2, "0")}</span>
                <h2>{principle}</h2>
                <p>
                  Este principio regula cómo diseñamos protocolos, elegimos fuentes, interpretamos evidencia y
                  decidimos qué recomendaciones merecen llegar a cliente.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--compact">
        <div className="section__inner">
          <div className="closing-panel glass">
            <span className="eyebrow">TRABAJAMOS DESDE LATAM</span>
            <h2 className="display-md">Pensamos categorías locales con arquitectura global de datos.</h2>
            <p className="body-lg">
              El equipo se organiza alrededor de estrategia, antropología, análisis cultural, arquitectura de
              datos y producción de reportes ejecutivos.
            </p>
            <Button href="/contacto">Contactar</Button>
          </div>
        </div>
      </section>
    </>
  );
}
