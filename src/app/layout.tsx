import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { FluidBackground } from "@/components/layout/FluidBackground";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { site } from "@/content/site";

const noisiaSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noisia"
});

export const metadata: Metadata = {
  title: {
    default: "Noisia | Social Intelligence Architects",
    template: "%s | Noisia"
  },
  description: site.description,
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Noisia",
    description: site.description,
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={noisiaSans.variable}>
        <FluidBackground />
        <ScrollReveal />
        <div className="site-shell">
          <a className="skip-link" href="#main">
            Saltar al contenido
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
