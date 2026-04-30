import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MethodologyChip, MethodologyIcon } from "@/components/ui/MethodologyIcon";
import { PageIntro } from "@/components/ui/PageIntro";
import { methodologies } from "@/content/site";

type MethodologyDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return methodologies.map((methodology) => ({ slug: methodology.slug }));
}

export async function generateMetadata({ params }: MethodologyDetailProps) {
  const { slug } = await params;
  const methodology = methodologies.find((item) => item.slug === slug);
  return {
    title: methodology ? methodology.name : "Metodología",
    description: methodology?.lead
  };
}

export default async function MethodologyDetailPage({ params }: MethodologyDetailProps) {
  const { slug } = await params;
  const methodology = methodologies.find((item) => item.slug === slug);
  if (!methodology) notFound();

  return (
    <>
      <PageIntro eyebrow={`METODOLOGÍA ${methodology.number}`} title={methodology.name} lead={methodology.lead}>
        <div className="methodology-intro-mark glass" aria-hidden="true">
          <span className="methodology-mark methodology-mark--large">
            <MethodologyIcon identifier={methodology.slug} />
          </span>
        </div>
        <p className="method-question">{methodology.question}</p>
      </PageIntro>
      <section className="section">
        <div className="section__inner detail-layout">
          <div className="detail-main">
            <section className="detail-block glass">
              <h2>Fundamentos científicos</h2>
              <ul>
                {methodology.foundations.map((foundation) => (
                  <li key={foundation}>{foundation}</li>
                ))}
              </ul>
            </section>
            <section className="detail-block solid-panel">
              <h2>El problema que resuelve</h2>
              <p>{methodology.problem}</p>
            </section>
            <section className="detail-block glass">
              <h2>Cómo opera Noisia esta metodología</h2>
              <ol>
                {methodology.protocol.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
            <section className="detail-block solid-panel">
              <h2>Outputs</h2>
              <ul>
                {methodology.outputs.map((output) => (
                  <li key={output}>{output}</li>
                ))}
              </ul>
            </section>
            <section className="detail-block glass">
              <h2>Cuándo usarla</h2>
              <p>{methodology.uses}</p>
            </section>
            <section className="detail-block solid-panel">
              <h2>Limitaciones honestas</h2>
              <p>{methodology.limitations}</p>
            </section>
            <section className="detail-block glass">
              <h2>Lectura recomendada</h2>
              <ul>
                {methodology.reading.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="detail-aside">
            <div className="aside-panel glass">
              <h3>Metodologías</h3>
              {methodologies.map((item) => (
                <Link className="aside-panel__method-link" href={`/metodologias/${item.slug}`} key={item.slug}>
                  <MethodologyChip identifier={item.slug} label={`${item.number} · ${item.name}`} compact />
                </Link>
              ))}
            </div>
            <div className="aside-panel solid-panel">
              <h3>Conectar con un arquitecto</h3>
              <span>Si esta pregunta se parece a la tuya, el diagnóstico define protocolo, fuentes y alcance.</span>
              <Button href="/diagnostico">Iniciar diagnóstico</Button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
