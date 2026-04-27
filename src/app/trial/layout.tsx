import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chalk | Ücretsiz Denemeye Başla",
  description:
    "Chalk'ı ücretsiz deneyin. Tek bir video ile tüm müfredatı, her öğrenci seviyesi için özelleştirilmiş derslere dönüştürün.",
};

export default function TrialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Hide the root LiquidEther background for this route */}
      <style>{`
        body > div[style*="position: fixed"] {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
