import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { fieldNotes } from "@/content/site";

type FieldNotePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return fieldNotes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: FieldNotePageProps) {
  const { slug } = await params;
  const note = fieldNotes.find((item) => item.slug === slug);
  return {
    title: note ? note.title : "Field Note",
    description: note?.dek
  };
}

export default async function FieldNotePage({ params }: FieldNotePageProps) {
  const { slug } = await params;
  const note = fieldNotes.find((item) => item.slug === slug);
  if (!note) notFound();

  return (
    <>
      <PageIntro eyebrow="FIELD NOTE" title={note.title} lead={note.dek}>
        <p className="method-question">{note.date} · {note.readingTime} minutos</p>
      </PageIntro>
      <section className="section">
        <article className="essay-body">
          {note.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="manifesto-cta glass">
            <h2>La pregunta correcta cambia el tipo de evidencia que vale la pena mirar.</h2>
            <Button href="/diagnostico">Traer una pregunta</Button>
          </div>
        </article>
      </section>
    </>
  );
}
