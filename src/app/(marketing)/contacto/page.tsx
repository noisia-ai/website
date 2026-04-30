import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata = {
  title: "Contacto",
  description: "Contacto directo con Noisia."
};

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="CONTACTO"
        title="Salida directa para quien ya sabe qué necesita preguntar."
        lead="Si prefieres no hacer el diagnóstico, escribe directo. El mejor mensaje incluye contexto, mercado, deadline y qué decisión necesitas tomar."
      />
      <section className="section">
        <div className="section__inner detail-layout">
          <div className="contact-list glass">
            <a href="mailto:hola@noisia.ai">
              <span>General</span>
              hola@noisia.ai
            </a>
            <a href="mailto:strategy@noisia.ai">
              <span>Comercial</span>
              strategy@noisia.ai
            </a>
            <a href="mailto:press@noisia.ai">
              <span>Prensa y colaboraciones</span>
              press@noisia.ai
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
              <span>LinkedIn</span>
              Noisia
            </a>
          </div>
          <form className="contact-form solid-panel">
            <label>
              <span>Nombre</span>
              <input placeholder="Tu nombre" />
            </label>
            <label>
              <span>Email</span>
              <input placeholder="tu@email.com" type="email" />
            </label>
            <label>
              <span>Asunto</span>
              <input placeholder="Pregunta de negocio o contexto" />
            </label>
            <label>
              <span>Mensaje</span>
              <textarea placeholder="Cuéntanos qué decisión necesitas tomar." rows={6} />
            </label>
            <Button type="submit">Enviar mensaje</Button>
          </form>
        </div>
      </section>
    </>
  );
}
