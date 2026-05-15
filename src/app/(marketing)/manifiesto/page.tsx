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
        title="Más datos no son más claridad."
        lead="Construimos Noisia para ayudar a equipos que ya escuchan mucho, pero todavía necesitan decidir mejor."
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
            <h2>Si esto te resuena, probablemente tienes una decisión que tus reportes actuales no están resolviendo.</h2>
            <Button href="/diagnostico">Iniciemos un diagnóstico</Button>
          </div>
        </article>
      </section>
    </>
  );
}
