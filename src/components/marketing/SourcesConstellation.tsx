// Platform logo cloud — visual hierarchy by size (xl → xs).
// Uses simple-icons for brand SVGs; lucide for platforms not in the package.

import { ShoppingBag } from "lucide-react";
import {
  siAppstore,
  siDiscourse,
  siFacebook,
  siGoogle,
  siGoogleplay,
  siInstagram,
  siMercadopago,
  siReddit,
  siShopify,
  siSpotify,
  siThreads,
  siTiktok,
  siTrustpilot,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";

type Platform = {
  name: string;
  /** simple-icons icon data (has .path) */
  si?: { path: string; title?: string };
  /** Fallback: lucide icon node */
  lucide?: React.ReactNode;
  size: "xl" | "lg" | "md" | "sm" | "xs";
};

const PLATFORMS: Platform[] = [
  { name: "Instagram",       si: siInstagram,   size: "xl" },
  { name: "TikTok",          si: siTiktok,      size: "xl" },
  { name: "YouTube",         si: siYoutube,     size: "lg" },
  { name: "Facebook",        si: siFacebook,    size: "lg" },
  { name: "X / Twitter",     si: siX,           size: "lg" },
  { name: "Google Reviews",  si: siGoogle,      size: "lg" },
  { name: "Mercado Libre",   si: siMercadopago, size: "lg" },
  { name: "Amazon",          lucide: <ShoppingBag size={16} strokeWidth={2} />, size: "lg" },
  { name: "Shopify",         si: siShopify,     size: "md" },
  { name: "App Store",       si: siAppstore,    size: "md" },
  { name: "Google Play",     si: siGoogleplay,  size: "md" },
  { name: "Reddit",          si: siReddit,      size: "md" },
  { name: "Trustpilot",      si: siTrustpilot,  size: "sm" },
  { name: "WhatsApp",        si: siWhatsapp,    size: "sm" },
  { name: "Threads",         si: siThreads,     size: "sm" },
  { name: "Spotify",         si: siSpotify,     size: "sm" },
  { name: "Foros y Q&A",    si: siDiscourse,   size: "xs" },
];

export function SourcesConstellation() {
  return (
    <div className="sources-constellation" aria-label="Plataformas cubiertas">
      {PLATFORMS.map((platform) => (
        <div
          key={platform.name}
          className={`constellation-bubble constellation-bubble--${platform.size}`}
          title={platform.name}
        >
          {platform.si && (
            <svg
              className="constellation-bubble__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d={platform.si.path} />
            </svg>
          )}
          {platform.lucide && (
            <span className="constellation-bubble__icon-wrap" aria-hidden="true">
              {platform.lucide}
            </span>
          )}
          <span className="constellation-bubble__name">{platform.name}</span>
        </div>
      ))}
    </div>
  );
}
