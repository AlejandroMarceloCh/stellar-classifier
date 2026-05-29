import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stellar Classifier",
  description: "Clasificación de objetos celestes del SDSS17 (Galaxia / Estrella / Quásar)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-[1320px] px-6 py-10 sm:px-10 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white py-5">
          <div className="mx-auto max-w-[1320px] px-6 sm:px-10 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] tracking-wide text-gray-500">
            <span>DS3022 UTEC · Proyecto Final</span>
            <span aria-hidden>·</span>
            <span>
              Dataset{" "}
              <a
                href="https://www.kaggle.com/datasets/fedesoriano/stellar-classification-dataset-sdss17"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nasa-blue hover:text-nasa-blue-light transition-colors underline-offset-4 hover:underline"
              >
                SDSS17 Stellar Classification
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
