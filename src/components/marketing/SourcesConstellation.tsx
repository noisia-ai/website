// Platform logo cloud — visual hierarchy by size (xl → xs).
// Uses simple-icons for brand SVGs; lucide for platforms not in the package.

import { Cloud, Headphones, Mail, MessageSquare, ShoppingBag, Store } from "lucide-react";
import {
  siAppstore,
  siBigcommerce,
  siDiscourse,
  siFacebook,
  siGoogle,
  siGoogleplay,
  siHubspot,
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
  note?: string;
};

const PLATFORMS: Platform[] = [
  { name: "Amazon",          lucide: <ShoppingBag size={16} strokeWidth={2} />, size: "xl", note: "reviews + Q&A" },
  { name: "Shopify",         si: siShopify,     size: "xl", note: "commerce data" },
  { name: "Klaviyo",         lucide: <Mail size={16} strokeWidth={2} />, size: "lg", note: "email signals" },
  { name: "Salesforce",      lucide: <Cloud size={16} strokeWidth={2} />, size: "lg", note: "CRM context" },
  { name: "Zendesk",         lucide: <Headphones size={16} strokeWidth={2} />, size: "lg", note: "tickets" },
  { name: "Mercado Libre",   si: siMercadopago, size: "lg", note: "marketplace" },
  { name: "Google Reviews",  si: siGoogle,      size: "lg", note: "local CX" },
  { name: "WhatsApp",        si: siWhatsapp,    size: "md", note: "care flows" },
  { name: "App Store",       si: siAppstore,    size: "md", note: "app feedback" },
  { name: "Google Play",     si: siGoogleplay,  size: "md", note: "ratings" },
  { name: "BigCommerce",     si: siBigcommerce, size: "md", note: "storefront" },
  { name: "DTC stores",      lucide: <Store size={16} strokeWidth={2} />, size: "sm", note: "checkout" },
  { name: "Instagram",       si: siInstagram,   size: "sm", note: "culture" },
  { name: "TikTok",          si: siTiktok,      size: "sm", note: "signals" },
  { name: "YouTube",         si: siYoutube,     size: "sm", note: "comments" },
  { name: "Facebook",        si: siFacebook,    size: "sm", note: "communities" },
  { name: "X / Twitter",     si: siX,           size: "sm", note: "reputation" },
  { name: "Reddit",          si: siReddit,      size: "sm", note: "deep doubts" },
  { name: "HubSpot",         si: siHubspot,     size: "xs", note: "growth" },
  { name: "Trustpilot",      si: siTrustpilot,  size: "xs", note: "proof" },
  { name: "Threads",         si: siThreads,     size: "xs", note: "conversation" },
  { name: "Spotify",         si: siSpotify,     size: "xs", note: "podcasts" },
  { name: "Foros y Q&A",     si: siDiscourse,   size: "xs", note: "context" },
  { name: "Encuestas abiertas", lucide: <MessageSquare size={16} strokeWidth={2} />, size: "xs", note: "open ends" },
];

const SOURCE_STATS = [
  { value: "+214M", label: "señales potenciales en México" },
  { value: "150+", label: "tipos de fuente VoC" },
  { value: "12", label: "familias de datos conectables" }
];

export function SourcesConstellation() {
  return (
    <div className="sources-constellation-shell">
      <div className="sources-constellation-meta glass">
        <span className="eyebrow">Escucha en México</span>
        <div className="sources-constellation-meta__stats">
          {SOURCE_STATS.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
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
            {platform.note && (
              <span className="constellation-bubble__note">{platform.note}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
