import Link from "next/link";
import { PageIntro } from "@/components/ui/PageIntro";
import { fieldNotes } from "@/content/site";

export const metadata = {
  title: "Field Notes",
  description: "Ensayos cortos de Noisia sobre inteligencia social, cultura y estrategia."
};

export default function FieldNotesPage() {
  return (
    <>
      <PageIntro
        eyebrow="FIELD NOTES"
        title="Ensayos cortos para pensar inteligencia social sin churn de SEO."
        lead="Notas firmadas para discutir método, cultura, influencia y decisiones. Pocas piezas, más criterio."
      />
      <section className="section">
        <div className="editorial-list">
          {fieldNotes.map((note) => (
            <Link className="editorial-row" href={`/field-notes/${note.slug}`} key={note.slug}>
              <div>
                <span>{note.date} · {note.readingTime} min</span>
                <h2>{note.title}</h2>
                <p>{note.dek}</p>
              </div>
              <b>Leer →</b>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
