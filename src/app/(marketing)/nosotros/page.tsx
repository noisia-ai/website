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
        title="Un equipo para convertir conversación pública en decisiones claras."
        lead="Noisia existe porque las marcas no necesitan más ruido. Necesitan saber qué significa, qué hacer con él y cómo defenderlo con evidencia."
      />
      <section className="section">
        <div className="section__inner">
          <div className="content-grid">
            {principles.map((principle, index) => (
              <article className="content-card glass" key={principle}>
                <span className="chip">{String(index + 1).padStart(2, "0")}</span>
                <h2>{principle}</h2>
                <p>
                  Este principio guía cómo elegimos fuentes, leemos evidencia y decidimos qué recomendaciones
                  sí merecen llegar a una mesa de negocio.
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
            <h2 className="display-md">Leemos categorías locales con estándares de evidencia globales.</h2>
            <p className="body-lg">
              Combinamos estrategia, análisis cultural, investigación y producto para entregar lecturas que un equipo
              pueda usar, presentar y cuestionar.
            </p>
            <Button href="/contacto">Contactar</Button>
          </div>
        </div>
      </section>
    </>
  );
}
