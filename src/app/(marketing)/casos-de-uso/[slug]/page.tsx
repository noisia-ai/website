import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MethodologyChip } from "@/components/ui/MethodologyIcon";
import { PageIntro } from "@/components/ui/PageIntro";
import { useCases } from "@/content/site";

type UseCaseDetailProps = {
  params: Promise<{
    slug: string;
  }>;
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

export default async function UseCaseDetailPage({ params }: UseCaseDetailProps) {
  const { slug } = await params;
  const useCase = useCases.find((item) => item.slug === slug);
  if (!useCase) notFound();

  return (
    <>
      <PageIntro eyebrow="CASO DE USO" title={useCase.title} lead={useCase.approach} />
      <section className="section">
        <div className="section__inner detail-layout">
          <div className="detail-main">
            <section className="detail-block glass">
              <h2>Por qué importa estratégicamente</h2>
              <p>
                Esta pregunta cambia decisiones de inversión, comunicación, producto o entrada a mercado. La
                conversación pública permite ver motivaciones, fricciones y códigos que rara vez aparecen en un
                dashboard de volumen.
              </p>
            </section>
            <section className="detail-block solid-panel">
              <h2>Cómo Noisia la aborda</h2>
              <p>{useCase.approach}</p>
              <div className="tag-list">
                {useCase.methodologies.map((methodology) => (
                  <MethodologyChip identifier={methodology} key={methodology} compact />
                ))}
              </div>
            </section>
            <section className="detail-block glass">
              <h2>Qué entrega</h2>
              <ul>
                {useCase.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </section>
            <section className="detail-block solid-panel">
              <h2>Vignette anonimizada</h2>
              <p>{useCase.vignette}</p>
            </section>
          </div>
          <aside className="detail-aside">
            <div className="aside-panel glass">
              <h3>Contexto</h3>
              <span>Industrias: {useCase.industries}</span>
              <span>Tiempo aproximado: {useCase.timing}</span>
              <span>Metodologías: {useCase.methodologies.join(", ")}</span>
            </div>
            <div className="aside-panel solid-panel">
              <h3>Diseñar este diagnóstico</h3>
              <span>El flujo de diagnóstico convierte esta pregunta en alcance, fuentes y output.</span>
              <Button href="/diagnostico">Iniciar diagnóstico</Button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
