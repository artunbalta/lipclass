"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({
  text,
  className = "",
  showAsterisk = false,
  style,
}: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({
  segments,
  className = "",
  style,
}: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div
      ref={ref}
      className={`inline-flex flex-wrap justify-center ${className}`}
      style={style}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- ChalkHero ---------------- */
const navItems = ["Hakkımızda", "Nasıl Çalışır?", "Programlar", "Demo", "İletişim"];

const ChalkHero = () => {
  return (
    <section className="relative h-screen w-full">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">

        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src="/landingvideo.mp4"
        />

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Logo + one-liner: tek blok (logo max-y ile; yoksa metin ekranın aşağısına kayıyor) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-3 top-20 z-40 w-max max-w-[min(calc(100vw-1rem),40rem)] sm:right-5 sm:top-24 md:right-8 md:top-28"
        >
          <div className="flex w-full flex-col items-stretch gap-2">
            {/* Üst/alt %25 kırpılmış orta %50: pb-[20%] (≈ 0,5/2,5 genişliğe göre yükseklik) */}
            <div className="relative h-0 w-[min(92vw,36rem)] overflow-hidden pb-[20%] md:w-[min(90vw,44rem)]">
              <Image
                src="/chalk-logo.png"
                alt="Chalk"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 92vw, 700px"
                priority
              />
            </div>
            <p className="m-0 w-full max-w-full translate-x-4 text-center text-[10px] font-medium leading-snug tracking-wide text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.85)] sm:translate-x-5 sm:text-xs md:translate-x-6 md:text-sm">
              Tek videodan tüm müfredat, her öğrenciye özel ders.
            </p>
          </div>
        </motion.div>

        {/* Navbar */}
        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 lg:gap-14">
            {navItems.map((item) => (
              <a
                key={item}
                href="#"
                className="text-[10px] transition-colors sm:text-xs md:text-sm"
                style={{ color: "rgba(225, 224, 204, 0.8)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E1E0CC")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(225, 224, 204, 0.8)")}
              >
                {item}
              </a>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">

            <div className="col-span-12 flex max-w-xl flex-col gap-5 pb-6 lg:max-w-2xl lg:pb-10">

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs sm:text-sm md:text-base"
                style={{ color: "rgba(225, 224, 204, 0.75)", lineHeight: 1.3 }}
              >
                Chalk, öğretmenlerinizin tek bir videodan tüm müfredatı, her öğrenci seviyesi için
                özelleştirilmiş, MEB uyumlu derslere dönüştürmesini sağlar. Yorulmadan öğretin.
              </motion.p>

              <motion.a
                href="/signup"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group inline-flex items-center gap-2 self-start rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
              >
                Ücretsiz Dene
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4" style={{ color: "#E1E0CC" }} />
                </span>
              </motion.a>

            </div>
          </div>
        </div>

        {/* Bottom footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-3 right-4 text-[9px] sm:text-[10px] md:right-8"
          style={{ color: "rgba(225, 224, 204, 0.4)" }}
        >
          * MEB müfredatı ile uyumlu, KVKK güvenceli
        </motion.p>
      </div>
    </section>
  );
};

export { ChalkHero };
