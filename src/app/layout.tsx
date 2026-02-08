import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { buildMetadata } from "@/lib/seo";
import { Toaster } from "@/components/ui/sonner";
import { SiteFooter } from "@/components/site/footer";

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = buildMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fontDisplay.variable} ${fontSans.variable}`}>
      <body className="min-h-screen bg-white font-sans">
        {/* Fondo sutil editorial */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_600px_at_12%_12%,rgba(50,181,173,0.10),transparent_60%),radial-gradient(700px_500px_at_88%_18%,rgba(0,75,87,0.10),transparent_55%),linear-gradient(to_bottom,#ffffff,rgba(244,247,248,0.7))]" />
        {children}
        <SiteFooter />
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
