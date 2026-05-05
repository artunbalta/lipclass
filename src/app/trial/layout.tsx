import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chalk | Platformu Keşfet",
  description:
    "Chalk platformunu keşfedin. Tek bir video ile tüm müfredatı, her öğrenci seviyesi için özelleştirilmiş derslere dönüştürün.",
};

export default function TrialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
