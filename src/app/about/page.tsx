import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Chalk | Hakkımızda",
  description:
    "Chalk hakkında: öğretmenlerin yükünü hafifletip her öğrenciye seviyesine göre ders veren yapay zeka platformu.",
};

const chalkText: React.CSSProperties = {
  fontFamily: "var(--font-caveat), system-ui, sans-serif",
  color: "#f5f5f0",
  textShadow:
    "0 0 1px rgba(255,255,255,0.55), 0 0 6px rgba(255,255,255,0.12), 0 1px 0 rgba(0,0,0,0.25)",
  letterSpacing: "0.01em",
};

const chalkboardBg: React.CSSProperties = {
  backgroundColor: "#1f3a2e",
  backgroundImage: [
    "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
    "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
    "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04), transparent 40%)",
    "radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03), transparent 45%)",
  ].join(", "),
  backgroundSize: "3px 3px, 7px 7px, 100% 100%, 100% 100%",
  backgroundPosition: "0 0, 1px 2px, 0 0, 0 0",
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={chalkboardBg}>
      {/* Wooden frame top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-[#3d2a17] to-[#5a3d22]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-[#3d2a17] to-[#5a3d22]" />

      {/* Soft chalk dust streaks */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, transparent 60%), linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 70%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16 sm:px-10 sm:py-20 md:py-24">
        <Link
          href="/trial"
          className="mb-12 inline-flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-100"
          style={{ ...chalkText, opacity: 0.7 }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>geri</span>
        </Link>

        <h1 className="text-6xl leading-tight sm:text-7xl md:text-8xl" style={chalkText}>
          Hakkımızda
        </h1>

        <div className="mt-6 h-[2px] w-24" style={{ background: "rgba(245,245,240,0.45)" }} />

        <div className="mt-10 space-y-8 text-2xl leading-relaxed sm:text-3xl md:text-[2rem] md:leading-[1.5]" style={chalkText}>
          <p>
            Chalk, öğretmenlerin yükünü hafifletmek ve her öğrenciye kendi
            seviyesine göre ders verebilmek için kuruldu.
          </p>

          <p>
            Tek bir ders videosundan; özetler, quizler, seviye bazlı içerikler
            ve pekiştirme materyalleri üretiyoruz. Müfredat MEB ile uyumlu,
            veriler Türkiye sunucularında, KVKK güvencesi altında.
          </p>

          <p>
            Amacımız basit: öğretmen tekrar tekrar aynı dersi anlatmasın,
            öğrenci de geride kalmasın.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3" style={chalkText}>
          <div>
            <div className="text-5xl sm:text-6xl">10x</div>
            <p className="mt-2 text-lg sm:text-xl" style={{ opacity: 0.75 }}>
              öğretmen zamanı kazandırır
            </p>
          </div>
          <div>
            <div className="text-5xl sm:text-6xl">%100</div>
            <p className="mt-2 text-lg sm:text-xl" style={{ opacity: 0.75 }}>
              MEB müfredat uyumu
            </p>
          </div>
          <div>
            <div className="text-5xl sm:text-6xl">3 adım</div>
            <p className="mt-2 text-lg sm:text-xl" style={{ opacity: 0.75 }}>
              video → analiz → ders
            </p>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-2xl transition-transform hover:scale-[1.02]"
            style={{
              ...chalkText,
              border: "2px solid rgba(245,245,240,0.7)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            Ücretsiz Dene
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-2 py-3 text-2xl"
            style={{ ...chalkText, opacity: 0.7 }}
          >
            Bizimle iletişime geç →
          </Link>
        </div>
      </div>
    </main>
  );
}
