import { DiagnosticWizard } from "@/components/forms/DiagnosticWizard";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata = {
  title: "Diagnóstico",
  description: "Cuestionario de discovery para convertir una pregunta de negocio en protocolo Noisia."
};

export default function DiagnosticPage() {
  return (
    <>
      <PageIntro
        eyebrow="DIAGNÓSTICO"
        title="Antes de hablar de metodología, entendamos la pregunta."
        lead="Este cuestionario toma 8-10 minutos. Tus respuestas serán leídas por uno de nuestros arquitectos antes de cualquier llamada."
      />
      <section className="section">
        <div className="section__inner">
          <DiagnosticWizard />
        </div>
      </section>
    </>
  );
}
