"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FC, type FormEvent, type PropsWithChildren, type ReactNode } from "react";

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
  share: string;
  shareTitle: string;
  shareIntro: string;
  shareLink: string;
  copy: string;
  copied: string;
  inviteEmail: string;
  invitePlaceholder: string;
  inviteSend: string;
  inviteSending: string;
  inviteSent: string;
  inviteExists: string;
  inviteSavedNoEmail: string;
  inviteError: string;
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
type InviteState = { tone: "ok" | "warn" | "error"; text: string } | null;

export function DeckRuntime({
  children,
  labels,
  outputId,
  lang,
}: {
  children: ReactNode;
  labels: DeckRuntimeLabels;
  outputId: string;
  lang: "en" | "es";
}) {
  const lightRef = useRef<HTMLInputElement | null>(null);
  const darkRef = useRef<HTMLInputElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [email, setEmail] = useState("");
  const [inviteState, setInviteState] = useState<InviteState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<{ light: string | null; dark: string | null }>({ light: null, dark: null });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = "";
    if (!url.searchParams.has("lang")) url.searchParams.set("lang", lang);
    setShareUrl(url.toString());
  }, [lang]);

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

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [shareUrl]);

  const sendInvite = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setInviteState(null);
      try {
        const res = await fetch(`/api/signal/${outputId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, lang })
        });
        const json = await res.json().catch(() => null) as
          | { data?: { invitation_status?: string }; email_sent?: boolean; email_error?: string; message?: string }
          | null;
        if (!res.ok) throw new Error(json?.message ?? labels.inviteError);
        if (json?.email_sent) {
          setInviteState({
            tone: json.data?.invitation_status === "already_invited" ? "warn" : "ok",
            text: json.data?.invitation_status === "already_invited" ? labels.inviteExists : labels.inviteSent
          });
          setEmail("");
        } else {
          setInviteState({ tone: "warn", text: labels.inviteSavedNoEmail });
        }
      } catch (err) {
        setInviteState({ tone: "error", text: err instanceof Error ? err.message : labels.inviteError });
      } finally {
        setSubmitting(false);
      }
    },
    [email, labels.inviteError, labels.inviteExists, labels.inviteSavedNoEmail, labels.inviteSent, lang, outputId],
  );

  return (
    <>
      <div className="deck-controls" role="toolbar" aria-label="Deck controls">
        <button type="button" onClick={present} title={labels.hint}>
          <FullscreenIcon />
          {labels.present}
        </button>

        <div className="deck-share-control">
          <button
            type="button"
            onClick={() => {
              setShareOpen((v) => !v);
              setPanelOpen(false);
            }}
            aria-expanded={shareOpen}
            aria-label={labels.share}
          >
            <ShareIcon />
            {labels.share}
          </button>
          {shareOpen ? (
            <div className="deck-share-panel" role="dialog" aria-label={labels.shareTitle}>
              <strong>{labels.shareTitle}</strong>
              <p>{labels.shareIntro}</p>
              <label className="deck-share-field">
                <span>{labels.shareLink}</span>
                <div className="deck-share-copy">
                  <input value={shareUrl} readOnly />
                  <button type="button" onClick={copyShareUrl}>{copied ? labels.copied : labels.copy}</button>
                </div>
              </label>
              <form className="deck-share-form" onSubmit={sendInvite}>
                <label className="deck-share-field">
                  <span>{labels.inviteEmail}</span>
                  <input
                    type="email"
                    required
                    value={email}
                    placeholder={labels.invitePlaceholder}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <button type="submit" className="deck-share-submit" disabled={submitting}>
                  <SendIcon />
                  {submitting ? labels.inviteSending : labels.inviteSend}
                </button>
              </form>
              {inviteState ? <p className={`deck-share-message is-${inviteState.tone}`}>{inviteState.text}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="deck-logo-control">
          <button
            type="button"
            onClick={() => {
              setPanelOpen((v) => !v);
              setShareOpen(false);
            }}
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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
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
