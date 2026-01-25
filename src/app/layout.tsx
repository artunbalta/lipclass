import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import LiquidEther from "@/components/ui/LiquidEther";
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
  title: "LipClass | Okulunuzun En Üretken Öğretmeni: Yapay Zeka",
  description:
    "Öğretmenleriniz yorulmasın. Tek bir video ile tüm müfredatı, her öğrenci seviyesi için özelleştirilmiş derslere dönüştürün. MEB uyumlu, KVKK güvenceli.",
  keywords: [
    "yapay zeka eğitim",
    "okul dijital dönüşüm",
    "müfredat uyumlu video",
    "öğretmen tükenmişliği",
    "lipclass",
    "meb uyumlu içerik",
    "eğitim teknolojileri",
    "öğretmen asistanı",
    "video ders anlatımı",
  ],
  authors: [{ name: "LipClass Team" }],
  openGraph: {
    title: "LipClass | Öğretmenleriniz Yorulmasın, Eğitiminiz Çoğalsın",
    description:
      "Aynı dersi tekrar tekrar anlatmak tarih oldu. Tek bir video ile tüm müfredatı özelleştirilmiş derslere dönüştürün.",
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
        suppressHydrationWarning
      >
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
          <LiquidEther />
        </div>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
