import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { manifesto } from "@/content/site";

export const metadata = {
  title: "Manifiesto",
  description: "Por qué Noisia existe en una industria saturada de plataformas."
};

export default function ManifestoPage() {
  return (
    <>
      <PageIntro
        eyebrow="MANIFIESTO"
        title="Por qué construimos una agencia de inteligencia social en una industria saturada de plataformas."
      />
      <section className="section">
        <article className="manifesto-body">
          {manifesto.map((paragraph, index) => (
            <section className="manifesto-part" key={paragraph}>
              <span>{["I.", "II.", "III.", "IV.", "V.", "VI."][index]}</span>
              <p>{paragraph}</p>
            </section>
          ))}
          <div className="manifesto-cta glass">
            <h2>Si esto te resuena, probablemente tienes una pregunta que las herramientas no están respondiendo.</h2>
            <Button href="/diagnostico">Iniciemos un diagnóstico</Button>
          </div>
        </article>
      </section>
    </>
  );
}
