"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MethodologyIcon } from "@/components/ui/MethodologyIcon";
import { methodologies, site, useCases } from "@/content/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    document.body.classList.remove("menu-open");
  }, []);

  useEffect(() => {
    setIsOpen(false);
    document.body.classList.remove("menu-open");
  }, [pathname]);

  useEffect(() => {
    const updateScrolled = () => {
      setIsScrolled(window.scrollY > 10);
    };

    let ticking = false;
    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        updateScrolled();
        ticking = false;
      });
    };

    updateScrolled();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("menu-open");
      return undefined;
    }

    document.body.classList.add("menu-open");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const featuredMethodologies = methodologies.slice(0, 2);
  const featuredCase = useCases[0];
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={`site-header ${isOpen ? "is-open" : ""} ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="site-header__inner glass">
        <Link className="brand-link" href="/" aria-label="Noisia home" onClick={closeMenu}>
          <Image
            src="/assets/logos/logo_black.svg"
            alt="Noisia"
            width={100}
            height={35}
            priority
            suppressHydrationWarning
          />
          <span>Social Intelligence Architects</span>
        </Link>

        <div className="site-header__spacer" aria-hidden="true" />

        <div className="site-header__actions">
          <Link className="site-header__cta" href="/diagnostico">
            Iniciar diagnóstico
          </Link>

          <button
            className="site-header__menu"
            type="button"
            aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={isOpen}
            aria-controls="site-fullscreen-menu"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X size={19} strokeWidth={1.8} /> : <Menu size={19} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <div className="site-header__overlay" aria-hidden={!isOpen}>
        <button className="site-header__overlay-backdrop" type="button" onClick={closeMenu} aria-label="Cerrar menu" />

        <div
          className="site-header__overlay-panel"
          id="site-fullscreen-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navegacion principal"
        >
          <div className="site-header__overlay-top">
            <Link className="brand-link brand-link--overlay" href="/" aria-label="Noisia home" onClick={closeMenu}>
              <Image
                src="/assets/logos/logo_black.svg"
                alt="Noisia"
                width={100}
                height={35}
                priority
                suppressHydrationWarning
              />
            </Link>

            <button
              className="site-header__overlay-close"
              type="button"
              aria-label="Cerrar menu"
              onClick={closeMenu}
            >
              <X size={22} strokeWidth={1.9} />
            </button>
          </div>

          <div className="site-header__overlay-layout">
            <nav className="site-header__overlay-nav" aria-label="Navegacion principal">
              {site.nav.map((item, index) => (
                <Link
                  className="site-header__overlay-link"
                  href={item.href}
                  key={item.href}
                  onClick={closeMenu}
                  style={{ ["--menu-delay" as string]: `${index * 48}ms` }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.label}</strong>
                  <ArrowRight size={22} strokeWidth={1.8} />
                </Link>
              ))}

              <Link className="site-header__overlay-cta" href="/diagnostico" onClick={closeMenu}>
                Iniciar diagnóstico
              </Link>
            </nav>

            <div className="site-header__overlay-aside">
              <section className="site-header__overlay-section">
                <header>
                  <h2>Metodologías</h2>
                  <Link href="/metodologias" onClick={closeMenu}>
                    Ver todas
                  </Link>
                </header>
                <div className="site-header__overlay-chip-grid">
                  {featuredMethodologies.map((methodology) => (
                    <Link
                      className="site-header__overlay-chip glass"
                      href={`/metodologias/${methodology.slug}`}
                      key={methodology.slug}
                      onClick={closeMenu}
                    >
                      <i aria-hidden="true">
                        <MethodologyIcon identifier={methodology.slug} />
                      </i>
                      <span>{methodology.name}</span>
                      <ArrowRight size={18} strokeWidth={1.8} />
                    </Link>
                  ))}
                </div>
              </section>

              <section className="site-header__overlay-section">
                <header>
                  <h2>Arquitectura</h2>
                </header>
                <Link className="site-header__overlay-pill glass" href="/arquitectura-de-datos" onClick={closeMenu}>
                  Corpus, normalización y evidencia trazable
                </Link>
              </section>

              <section className="site-header__overlay-section">
                <header>
                  <h2>Caso</h2>
                </header>
                <Link
                  className="site-header__overlay-case glass"
                  href={`/casos-de-uso/${featuredCase.slug}`}
                  onClick={closeMenu}
                >
                  <span>{featuredCase.shortTitle}</span>
                  <h3>{featuredCase.title}</h3>
                  <p>{featuredCase.approach}</p>
                </Link>
              </section>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
