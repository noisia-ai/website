import Image from "next/image";
import Link from "next/link";
import { methodologies, site, useCases } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer section section--compact">
      <div className="site-footer__panel glass">
        <div className="site-footer__brand">
          <Image
            src="/assets/logos/logo_black.svg"
            alt="Noisia"
            width={154}
            height={54}
            suppressHydrationWarning
          />
          <p>
            Arquitectura de inteligencia social para convertir conversación pública en decisiones
            estratégicas trazables.
          </p>
        </div>
        <div className="site-footer__links">
          <div>
            <h3>Website</h3>
            <Link href="/manifiesto">Manifiesto</Link>
            <Link href="/nosotros">Nosotros</Link>
            <Link href="/field-notes">Field Notes</Link>
            <Link href="/contacto">Contacto</Link>
          </div>
          <div>
            <h3>Metodologías</h3>
            {methodologies.slice(0, 4).map((methodology) => (
              <Link href={`/metodologias/${methodology.slug}`} key={methodology.slug}>
                {methodology.name}
              </Link>
            ))}
          </div>
          <div>
            <h3>Casos</h3>
            {useCases.slice(0, 4).map((useCase) => (
              <Link href={`/casos-de-uso/${useCase.slug}`} key={useCase.slug}>
                {useCase.shortTitle}
              </Link>
            ))}
          </div>
          <div>
            <h3>Contacto</h3>
            <a href="mailto:hola@noisia.ai">hola@noisia.ai</a>
            <a href="mailto:strategy@noisia.ai">strategy@noisia.ai</a>
            <Link href="/diagnostico">Iniciar diagnóstico</Link>
            <span>{site.eyebrow}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
