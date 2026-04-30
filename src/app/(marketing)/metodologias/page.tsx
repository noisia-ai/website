import Link from "next/link";
import { MethodologyIcon } from "@/components/ui/MethodologyIcon";
import { PageIntro } from "@/components/ui/PageIntro";
import { methodologies } from "@/content/site";

export const metadata = {
  title: "Metodologías",
  description: "Las seis metodologías propietarias de Noisia para convertir conversación social en decisión."
};

export default function MethodologiesPage() {
  return (
    <>
      <PageIntro
        eyebrow="METODOLOGÍAS PROPIETARIAS"
        title="Seis lentes. Cada una construida para una pregunta distinta."
        lead="Las metodologías de Noisia no son frameworks de marketing reciclados. Cada una combina psicología cognitiva, antropología, semiótica, economía conductual y teoría de redes sobre datos conversacionales reales."
      />
      <section className="section">
        <div className="section__inner">
          <div className="content-grid">
            {methodologies.map((methodology) => (
              <Link className="content-card glass" href={`/metodologias/${methodology.slug}`} key={methodology.slug}>
                <div className="content-card__head">
                  <span className="chip">Metodología {methodology.number}</span>
                  <span className="methodology-mark" aria-hidden="true">
                    <MethodologyIcon identifier={methodology.slug} />
                  </span>
                </div>
                <h2>{methodology.name}</h2>
                <p>{methodology.question}</p>
                <ul>
                  {methodology.foundations.slice(0, 3).map((foundation) => (
                    <li key={foundation}>{foundation}</li>
                  ))}
                </ul>
                <b className="link-arrow">Estudiar metodología <span>→</span></b>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
