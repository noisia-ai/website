"use client";

import Script from "next/script";
import { useCallback, useRef, useState, type ChangeEvent, type FC, type PropsWithChildren, type ReactNode } from "react";

// <deck-stage> is a custom element defined by /deck/deck-stage.js at runtime.
// Cast the tag to a typed component so JSX accepts it without augmenting the
// global JSX.IntrinsicElements namespace (lint forbids `namespace`).
const DeckStage = "deck-stage" as unknown as FC<
  PropsWithChildren<{ width?: string; height?: string; readonly?: string }>
>;

const MAX_LOGO_BYTES = 1024 * 1024; // 1MB

type DeckRuntimeLabels = {
  downloadPdf: string;
  present: string;
  hint: string;
  logo: string;
  logoTitle: string;
  logoIntro: string;
  logoLight: string;
  logoLightHint: string;
  logoDark: string;
  logoDarkHint: string;
  upload: string;
  done: string;
  logoTooBig: string;
  logoBadType: string;
};

type Variant = "light" | "dark";

export function DeckRuntime({ children, labels }: { children: ReactNode; labels: DeckRuntimeLabels }) {
  const lightRef = useRef<HTMLInputElement | null>(null);
  const darkRef = useRef<HTMLInputElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [preview, setPreview] = useState<{ light: string | null; dark: string | null }>({ light: null, dark: null });

  const downloadPdf = useCallback(() => {
    // deck-stage's @media print lays out one slide per page at the design
    // size, so the browser's "Save as PDF" produces a clean 16:9 deck.
    window.print();
  }, []);

  const present = useCallback(() => {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  const applyLogo = useCallback(
    (variant: Variant, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        // Light slides use the dark logo; dark slides carry .deck-logo--invert.
        const selector =
          variant === "light"
            ? "img.deck-logo-img:not(.deck-logo--invert)"
            : "img.deck-logo-img.deck-logo--invert";
        document.querySelectorAll<HTMLImageElement>(selector).forEach((img) => {
          img.src = dataUrl;
        });
        document.querySelector(".deck-shell")?.classList.add(`has-custom-logo-${variant}`);
        setPreview((prev) => ({ ...prev, [variant]: dataUrl }));
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const onChange = useCallback(
    (variant: Variant) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!/^image\/(png|svg\+xml)$/.test(file.type)) {
        window.alert(labels.logoBadType);
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        window.alert(labels.logoTooBig);
        return;
      }
      applyLogo(variant, file);
    },
    [applyLogo, labels.logoBadType, labels.logoTooBig],
  );

  return (
    <>
      <div className="deck-controls" role="toolbar" aria-label="Deck controls">
        <button type="button" onClick={present} title={labels.hint}>
          <FullscreenIcon />
          {labels.present}
        </button>

        <div className="deck-logo-control">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-label={labels.logo}
          >
            <SwapIcon />
            {labels.logo}
            {preview.light || preview.dark ? <CheckDot /> : null}
          </button>
          {panelOpen ? (
            <div className="deck-logo-panel" role="dialog" aria-label={labels.logoTitle}>
              <strong>{labels.logoTitle}</strong>
              <p>{labels.logoIntro}</p>
              <button type="button" className="deck-logo-slot" onClick={() => lightRef.current?.click()}>
                <span className="deck-logo-swatch deck-logo-swatch--light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview.light ? <img src={preview.light} alt="" /> : null}
                </span>
                <span className="deck-logo-text">
                  <b>{labels.logoLight}</b>
                  <small>{labels.logoLightHint}</small>
                </span>
                <em>{preview.light ? labels.done : labels.upload}</em>
              </button>
              <button type="button" className="deck-logo-slot" onClick={() => darkRef.current?.click()}>
                <span className="deck-logo-swatch deck-logo-swatch--dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview.dark ? <img src={preview.dark} alt="" /> : null}
                </span>
                <span className="deck-logo-text">
                  <b>{labels.logoDark}</b>
                  <small>{labels.logoDarkHint}</small>
                </span>
                <em>{preview.dark ? labels.done : labels.upload}</em>
              </button>
            </div>
          ) : null}
        </div>

        <button type="button" className="deck-btn-primary" onClick={downloadPdf}>
          <DownloadIcon />
          {labels.downloadPdf}
        </button>
      </div>

      <input ref={lightRef} type="file" accept="image/png,image/svg+xml" hidden onChange={onChange("light")} />
      <input ref={darkRef} type="file" accept="image/png,image/svg+xml" hidden onChange={onChange("dark")} />

      <DeckStage width="1920" height="1080" readonly="">
        {children}
      </DeckStage>

      <Script
        src="/deck/deck-stage.js"
        strategy="afterInteractive"
        onReady={() => {
          // The thumbnail rail is feature-flagged off until the host opts in.
          // Enable it for the client deck so viewers can jump between slides.
          window.customElements
            ?.whenDefined("deck-stage")
            .then(() => window.postMessage({ type: "__omelette_rail_enabled" }, "*"));
        }}
      />
    </>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CheckDot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
