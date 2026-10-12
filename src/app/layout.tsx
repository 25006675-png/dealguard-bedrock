import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "DealGuard MY",
  description: "Commercial decision support for Malaysian SME construction subcontractors, powered by Claude on Amazon Bedrock.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
