import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { ServiceWorker } from "@/components/ui/service-worker";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Interview Arena",
    template: "%s · AI Interview Arena",
  },
  description:
    "AI-powered mock interviews with personalized questions, adaptive follow-ups and actionable feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>
        <ConnectionBanner />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
