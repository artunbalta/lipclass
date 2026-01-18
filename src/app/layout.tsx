import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LipClass - Bir Video Çek, Binlerce Ders Oluştur",
  description:
    "AI destekli eğitim platformu ile öğretmenler zamandan tasarruf eder, öğrenciler kişiselleştirilmiş içeriklerle öğrenir. Referans videonuzu yükleyin, AI gerisini halleder.",
  keywords: [
    "eğitim",
    "video",
    "yapay zeka",
    "AI",
    "öğretmen",
    "ders videosu",
    "lipsync",
    "MEB müfredatı",
    "e-öğrenme",
  ],
  authors: [{ name: "LipClass Team" }],
  openGraph: {
    title: "LipClass - Bir Video Çek, Binlerce Ders Oluştur",
    description:
      "AI destekli eğitim platformu ile öğretmenler zamandan tasarruf eder.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
      >
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
