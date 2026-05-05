import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chalk | Hakkımızda",
  description:
    "Chalk hakkında: öğretmenlerin yükünü hafifletip her öğrenciye seviyesine göre ders veren yapay zeka platformu.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-[#0f0f1a]">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-28 sm:px-10 sm:pt-36 md:pt-44">
        <p
          className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
        >
          Vizyonumuz
        </p>

        <h1
          className="text-5xl leading-[1.1] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 800 }}
        >
          Chalk, öğretmenin&nbsp;yorgunluğu ile öğrencinin&nbsp;geride kalması arasındaki boşluğu&nbsp;kapatıyor.
        </h1>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        <div className="h-px bg-[#e5e7eb]" />
      </div>

      {/* Body */}
      <section className="mx-auto max-w-4xl space-y-10 px-6 py-20 sm:px-10">
        <p
          className="text-xl leading-[1.75] text-[#374151] sm:text-2xl sm:leading-[1.8]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
        >
          Bir öğretmen aynı dersi yıllarca tekrar tekrar anlatır. Kimileri için hız çok hızlı,
          kimileri için çok yavaş. Hazırlık saatleri biter, pekiştirme olmaz. Chalk bunun
          için var.
        </p>
        <p
          className="text-xl leading-[1.75] text-[#374151] sm:text-2xl sm:leading-[1.8]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
        >
          Tek bir ders videosunu platforma yükleyin; yapay zekamız saniyeler içinde
          MEB müfredatına uyumlu özetler, quizler ve seviye bazlı materyaller üretir.
          İleri, orta, başlangıç — her öğrenci kendi hızında ilerler.
        </p>
        <p
          className="text-xl leading-[1.75] text-[#374151] sm:text-2xl sm:leading-[1.8]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
        >
          Tüm veriler Türkiye sunucularında tutulur, KVKK'ya tam uyumlu.
          Kurulum yok, entegrasyon yok — sadece yükle ve öğret.
        </p>
      </section>

      {/* Stats */}
      <section className="border-t border-[#e5e7eb] bg-[#f9fafb]">
        <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y divide-[#e5e7eb] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-10">
          {[
            { number: "10×", label: "Öğretmen zamanı kazancı" },
            { number: "%100", label: "MEB müfredat uyumu" },
            { number: "3 adım", label: "Video → Analiz → Ders" },
          ].map((s) => (
            <div key={s.label} className="py-12 sm:px-10 sm:first:pl-0 sm:last:pr-0">
              <div
                className="text-5xl leading-none sm:text-6xl"
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontWeight: 800,
                  color: "#0f0f1a",
                }}
              >
                {s.number}
              </div>
              <p
                className="mt-3 text-base text-[#6b7280]"
                style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 sm:px-10">
        <h2
          className="mb-10 max-w-2xl text-4xl leading-[1.2] sm:text-5xl"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 800 }}
        >
          Okulunuzu geleceğe taşımaya hazır mısınız?
        </h2>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="inline-block rounded-full bg-[#0f0f1a] px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f1f2e]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
          >
            Ücretsiz Başla
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-[#6b7280] underline-offset-4 transition-colors hover:text-[#0f0f1a] hover:underline"
            style={{ fontFamily: "var(--font-plus-jakarta-sans), system-ui, sans-serif" }}
          >
            Demo talep edin →
          </Link>
        </div>
      </section>
    </main>
  );
}
