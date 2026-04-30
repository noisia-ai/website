import Link from "next/link";
import { MethodologyChip } from "@/components/ui/MethodologyIcon";
import { PageIntro } from "@/components/ui/PageIntro";
import { useCases } from "@/content/site";

export const metadata = {
  title: "Casos de uso",
  description: "Diez preguntas de negocio que Noisia puede responder con inteligencia social."
};

export default function UseCasesPage() {
  return (
    <>
      <PageIntro
        eyebrow="CASOS DE USO"
        title="Diez preguntas de negocio. Diez formas de convertir conversación en decisión."
        lead="Cada caso de uso parte de una pregunta directa. Noisia define fuentes, metodologías y output según el tipo de decisión que la marca necesita tomar."
      />
      <section className="section">
        <div className="section__inner">
          <div className="content-grid">
            {useCases.map((useCase) => (
              <Link className="content-card glass" href={`/casos-de-uso/${useCase.slug}`} key={useCase.slug}>
                <span className="chip">{useCase.timing}</span>
                <h2>{useCase.title}</h2>
                <p>{useCase.approach}</p>
                <div className="tag-list">
                  {useCase.methodologies.map((methodology) => (
                    <MethodologyChip identifier={methodology} key={methodology} compact />
                  ))}
                </div>
                <b className="link-arrow">Ver caso <span>→</span></b>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
