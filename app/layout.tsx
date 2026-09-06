import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

// Monospace se koristi za stopericu na ekranu uzivo — znamenke moraju biti
// jednake sirine da broj ne poskakuje dok se mijenja.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memorijalni termin",
  description: "Organizacija nogometnih 5v5 termina — prijave, ekipe, golovi i statistika.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  // maximumScale se namjerno NE postavlja: zakljucavanje zooma otezava
  // koristenje ljudima koji slabije vide. Gumbi su ionako veliki.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
