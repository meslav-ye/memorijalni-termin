import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
  manifest: "/manifest.json",
  // Da se aplikacija na iPhoneu otvori bez adresne trake kad se doda na zaslon.
  appleWebApp: {
    capable: true,
    title: "Termin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
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

        {/* Google trazi javno dostupnu stranicu o privatnosti za objavu
            OAuth aplikacije; a i ionako spremamo tudje podatke. */}
        <footer className="mt-auto px-5 py-6 text-center">
          <Link
            href="/privatnost"
            className="text-xs text-slate-400 underline underline-offset-4"
          >
            Privatnost
          </Link>
        </footer>
      </body>
    </html>
  );
}
