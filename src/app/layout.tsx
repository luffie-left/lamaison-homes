import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import "./globals.css";

import { PageShell } from "@/components/layout/page-shell";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceDisclosure } from "@/components/voice/VoiceDisclosure";
import ConciergeChat from "@/components/ConciergeChat";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [{ url: absoluteUrl(siteConfig.ogImage) }],
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImage)],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=brand-20261105", sizes: "any" },
      { url: "/icon-32.png?v=brand-20261105", sizes: "32x32", type: "image/png" },
      { url: "/icon-64.png?v=brand-20261105", sizes: "64x64", type: "image/png" },
      { url: "/icon-128.png?v=brand-20261105", sizes: "128x128", type: "image/png" },
      { url: "/icon-512.png?v=brand-20261105", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png?v=brand-20261105", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <PageShell>{children}</PageShell>
        {/* Floating widgets — re-enabled at relaunch 2026-11-05 with stacking
            (LMH-004 fix): chat stays at bottom-6 right-6; the voice widget is
            lifted above it at bottom-24 (its own fixed wrapper updated to
            bottom: 96px). VoiceDisclosure satisfies LMH-009 (AI/privacy
            notice adjacent to the voice button). */}
        <ConciergeChat />
        <VoiceButton />
        <VoiceDisclosure />
      </body>
    </html>
  );
}
