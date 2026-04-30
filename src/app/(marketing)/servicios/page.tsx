import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { serviceTiers } from "@/content/site";

export const metadata = {
  title: "Servicios",
  description: "Foundation, Intelligence y Strategy: tres formas de trabajar con Noisia."
};

export default function ServicesPage() {
  return (
    <>
      <PageIntro
        eyebrow="SERVICIOS"
        title="Tres formas de trabajar juntos. Una sola lógica: la pregunta manda."
        lead="Noisia no opera como pricing page transaccional. El alcance se define después del diagnóstico, cuando entendemos la decisión, la urgencia, las fuentes y el nivel de profundidad necesario."
      />
      <section className="section">
        <div className="section__inner">
          <div className="tier-grid">
            {serviceTiers.map((tier) => (
              <article className="tier-card glass" key={tier.name}>
                <span className="chip">{tier.name}</span>
                <h2>{tier.description}</h2>
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
        <div className="section__inner detail-layout">
          <div className="detail-block glass">
            <h2>Cómo se construye una propuesta</h2>
            <p>
              Primero se define la pregunta estratégica real. Después se decide qué metodologías aplican, qué
              fuentes se orquestan, qué outputs producirán decisión y qué timeline tiene sentido. Precio,
              equipo y alcance salen de esa arquitectura.
            </p>
          </div>
          <div className="detail-block solid-panel">
            <h2>Qué no incluimos</h2>
            <ul>
              <li>Licencias de software revendidas.</li>
              <li>Dashboards permanentes sin decisión asociada.</li>
              <li>Retainers genéricos de horas sueltas.</li>
              <li>Reportes de volumen y sentiment como sustituto de insight.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
