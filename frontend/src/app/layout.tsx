import type { Metadata } from "next";
import { Inter } from "next/font/google";

import TopBar from "@/components/TopBar";
import ThemeProvider from "@/components/ThemeProvider";

import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SZINSIGHT — аналитика аукциона",
  description:
    "Аналитика рынка артефактов: справедливая цена, ликвидность, выгодные лоты и учёт сделок.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider />
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-4 py-6 relative z-10">{children}</main>
      </body>
    </html>
  );
}
