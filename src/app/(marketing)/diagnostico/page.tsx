import { DiagnosticWizard } from "@/components/forms/DiagnosticWizard";

export const metadata = {
  title: "Diagnóstico",
  description: "Cuestionario de discovery para convertir una pregunta de negocio en protocolo Noisia.",
};

export default function DiagnosticPage() {
  return (
    <section className="section diag-page-section">
      <div className="section__inner diag-page-inner">
        <header className="diag-page-header">
          <span className="eyebrow">DIAGNÓSTICO</span>
          <h1 className="display-md">Empieza por la pregunta.<br />La metodología viene después.</h1>
          <p className="body-lg">
            8–10 minutos. Un arquitecto lee tus respuestas antes de cualquier llamada.
          </p>
        </header>
        <DiagnosticWizard />
      </div>
    </section>
  );
}
