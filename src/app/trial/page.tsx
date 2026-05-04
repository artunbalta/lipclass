"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight, Upload, Sparkles, GraduationCap, Clock, CheckCircle, School, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import Link from "next/link";
import { ChalkHero } from "@/components/ui/chalk-hero";
import { ComputerMockup } from "@/components/ui/computer-mockup";
import { Logos3 } from "@/components/ui/logos3";

const PaperShadersBackground = dynamic(
  () =>
    import("@/components/ui/background-paper-shaders").then((m) => m.PaperShadersBackground),
  { ssr: false, loading: () => null },
);

/* ─── Fade-in wrapper ─── */
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ y: 24, opacity: 0 }}
      animate={isInView ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── How-it-works steps ─── */
const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Videoyu Yükle",
    description:
      "Mevcut ders videolarınızı platforma yükleyin. Herhangi bir format desteklenir; dönüştürme gerekmez.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Chalk Analiz Eder",
    description:
      "Yapay zeka, videoyu saniyeler içinde analiz ederek müfredat uyumlu, seviye bazlı içerik planları oluşturur.",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "Öğrenciler Öğrenir",
    description:
      "Her öğrenci kendi hızında ilerler. Chalk, otomatik quiz, özet ve pekiştirme içerikleri üretir.",
  },
];

/* ─── Feature cards ─── */
const features = [
  {
    icon: Clock,
    label: "Öğretmen zamanını x10 artırır",
    sub: "Tekrar eden ders hazırlığına son. Haftada onlarca saat geri kazanın.",
  },
  {
    icon: School,
    label: "%100 MEB müfredat uyumu",
    sub: "Oluşturulan her içerik güncel müfredat çerçevesine otomatik hizalanır.",
  },
  {
    icon: Zap,
    label: "Anında kişiselleştirme",
    sub: "İleri, orta ve başlangıç seviyeleri için ayrı içerik akışları tek tıkla.",
  },
  {
    icon: CheckCircle,
    label: "KVKK & güvenlik güvencesi",
    sub: "Tüm veriler Türkiye sunucularında saklanır. Tam KVKK uyumluluğu.",
  },
];

/* ─── Page ─── */
export default function TrialPage() {
  return (
    <main className="bg-black min-h-screen">
      {/* ── Hero ── */}
      <div className="p-2 md:p-3">
        <ChalkHero />
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 z-0 min-h-full">
          <PaperShadersBackground className="h-full min-h-[100%] w-full" />
        </div>

        <div className="relative z-10">
      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-24 px-4 py-24 sm:px-6 md:px-10 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/50">
              Nasıl Çalışır?
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#E1E0CC] sm:text-5xl lg:text-6xl">
              Üç adımda başla.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50 sm:text-lg">
              Kurulum yok, entegrasyon yok. Videoyu yükle, gerisini Chalk halleder.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.12}>
                <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-8 transition-colors hover:border-white/15 hover:bg-white/[0.06]">
                  <span className="mb-6 block font-mono text-6xl font-bold leading-none text-white/[0.06] select-none">
                    {step.number}
                  </span>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/8">
                    <step.icon className="h-5 w-5 text-[#E1E0CC]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[#E1E0CC]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* ── Demo video (computer mockup) ── */}
          <div className="mt-20 lg:mt-24">
            <FadeIn>
              <ComputerMockup />
            </FadeIn>
            <FadeIn delay={0.15} className="mt-6 text-center">
              <p className="text-xs uppercase tracking-widest text-white/35">
                Chalk panelinden canlı görünüm
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Trusted by (school logos) ── */}
      <FadeIn>
        <Logos3
          heading="Türkiye'nin önde gelen okullarında deneniyor"
          logos={[
            { id: "school-1", description: "Pilot Okul 1", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/astro-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-2", description: "Pilot Okul 2", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/figma-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-3", description: "Pilot Okul 3", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/nextjs-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-4", description: "Pilot Okul 4", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/react-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-5", description: "Pilot Okul 5", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcn-ui-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-6", description: "Pilot Okul 6", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/supabase-wordmark.svg", className: "h-7 w-auto opacity-60" },
            { id: "school-7", description: "Pilot Okul 7", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/tailwind-wordmark.svg", className: "h-4 w-auto opacity-60" },
            { id: "school-8", description: "Pilot Okul 8", image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/vercel-wordmark.svg", className: "h-7 w-auto opacity-60" },
          ]}
        />
      </FadeIn>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-24 px-4 py-24 sm:px-6 md:px-10 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-16 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-[#E1E0CC] sm:text-5xl">
              Neden Chalk?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/50 sm:text-lg">
              Türkiye'nin okul müfredatına özel, öğretmenler için tasarlandı.
            </p>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <FadeIn key={f.label} delay={i * 0.1}>
                <div className="flex items-start gap-5 rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-white/15 hover:bg-white/[0.06]">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8">
                    <f.icon className="h-5 w-5 text-[#E1E0CC]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#E1E0CC]">{f.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">{f.sub}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 pb-24 sm:px-6 md:px-10 lg:pb-32">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] p-12 text-center md:p-20">
              {/* Glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[40rem] w-[40rem] rounded-full bg-indigo-600/10 blur-[100px]" />
              </div>

              <div className="relative z-10">
                <FadeIn delay={0.05}>
                  <h2 className="text-4xl font-bold tracking-tight text-[#E1E0CC] sm:text-5xl lg:text-6xl">
                    Okuluzu geleceğe<br className="hidden sm:block" /> taşıyın.
                  </h2>
                </FadeIn>
                <FadeIn delay={0.15}>
                  <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
                    14 gün boyunca ücretsiz, kredi kartı gerektirmeden. İlk dersinizi bugün oluşturun.
                  </p>
                </FadeIn>
                <FadeIn delay={0.25} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-full bg-[#E1E0CC] px-8 py-3 text-sm font-semibold text-black transition-all hover:gap-3 hover:bg-white sm:text-base"
                  >
                    Ücretsiz Başla
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110">
                      <ArrowRight className="h-4 w-4 text-[#E1E0CC]" />
                    </span>
                  </Link>
                  <Link
                    href="/contact"
                    className="text-sm font-medium text-white/40 transition-colors hover:text-white/70 sm:text-base"
                  >
                    Okul için demo talep edin →
                  </Link>
                </FadeIn>

                <FadeIn delay={0.35} className="mt-10">
                  <p className="text-xs text-white/25">
                    * MEB müfredatı ile uyumlu, KVKK güvenceli, Türkiye sunucularında barındırılır
                  </p>
                </FadeIn>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-4 py-8 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-white/25 sm:flex-row">
          <span>© 2026 Chalk. Tüm hakları saklıdır.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white/50">Gizlilik</Link>
            <Link href="/terms" className="transition-colors hover:text-white/50">Kullanım Koşulları</Link>
            <Link href="/contact" className="transition-colors hover:text-white/50">İletişim</Link>
          </div>
        </div>
      </footer>
        </div>
      </div>
    </main>
  );
}
