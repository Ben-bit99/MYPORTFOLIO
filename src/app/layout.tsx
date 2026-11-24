import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { profile, siteMeta } from "@/data/portfolio";
import "./globals.css";

// 3-tier type system: display (titles), UI/body, technical HUD micro-labels.
const display = Chakra_Petch({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--font-chakra" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-grotesk" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-jet" });

export const metadata: Metadata = {
  metadataBase: new URL(siteMeta.url),
  title: siteMeta.title,
  description: siteMeta.description,
  keywords: siteMeta.keywords,
  authors: [{ name: profile.name }],
  creator: profile.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: siteMeta.title,
    description: siteMeta.description,
    siteName: profile.name,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteMeta.title,
    description: siteMeta.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  email: `mailto:${profile.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "NED University of Engineering and Technology" },
  award: "5th Prize, Global Game Jam 2026 (CEGA, Karachi)",
  url: siteMeta.url,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${grotesk.variable} ${jetbrains.variable}`}>
      <body className="bg-black antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <noscript>
          <div style={{ padding: 24, color: "#e5e7eb", fontFamily: "monospace" }}>
            {profile.name}: {profile.headline}. Email: {profile.email}
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
