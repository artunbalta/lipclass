"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
const navItems: { label: string; href: string }[] = [
  { label: "Hakkımızda", href: "/about" },
  { label: "Nasıl Çalışır?", href: "/#how-it-works" },
  { label: "Programlar", href: "/#features" },
  { label: "Demo", href: "/#how-it-works" },
  { label: "İletişim", href: "/contact" },
];

// Chalkboard interior (writing surface) bounds within the natural frame image,
// expressed as fractions of the rendered image's width/height.
const CHALKBOARD = {
  left: 0.225,
  top: 0.065,
  width: 0.58,
  height: 0.59,
};

const FADE_FRAMES = 15;
const LOGO_HIDE_FRAMES = 3;
const VIDEO_CLIP_END = 15;
const SECTION_HEIGHT_VH = 700;
const FRAME_SCROLL_END = 0.86;

const ChalkHero = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedSetRef = useRef<Set<number>>(new Set());
  const maxLoadedRef = useRef(-1);
  const currentFrameRef = useRef(0);
  const frameCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  const drawFrame = (requestedIdx: number) => {
    const canvas = canvasRef.current;
    const sticky = stickyRef.current;
    if (!canvas || !sticky) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If the requested frame isn't loaded yet, fall back to the latest loaded
    // frame at or before it. The demo video overlay must reflect the frame we
    // actually draw — never the un-rendered target — otherwise it would fade
    // in over a stale earlier frame.
    let idx = requestedIdx;
    let img = imagesRef.current[idx];
    if (!img || !img.complete || !img.naturalWidth) {
      const loaded = loadedSetRef.current;
      let fallback = -1;
      for (let i = requestedIdx; i >= 0; i--) {
        if (loaded.has(i)) {
          fallback = i;
          break;
        }
      }
      if (fallback < 0) return;
      idx = fallback;
      img = imagesRef.current[idx];
      if (!img || !img.complete || !img.naturalWidth) return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = sticky.clientWidth;
    const cssH = sticky.clientHeight;
    const targetW = Math.floor(cssW * dpr);
    const targetH = Math.floor(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);

    // Position the demo video inside the chalkboard, in CSS pixels.
    const overlay = overlayRef.current;
    if (overlay) {
      const cssScale = Math.max(cssW / iw, cssH / ih);
      const cssImgW = iw * cssScale;
      const cssImgH = ih * cssScale;
      const cssOffsetX = (cssW - cssImgW) / 2;
      const cssOffsetY = (cssH - cssImgH) / 2;
      overlay.style.left = `${cssOffsetX + cssImgW * CHALKBOARD.left}px`;
      overlay.style.top = `${cssOffsetY + cssImgH * CHALKBOARD.top}px`;
      overlay.style.width = `${cssImgW * CHALKBOARD.width}px`;
      overlay.style.height = `${cssImgH * CHALKBOARD.height}px`;

      const total = frameCountRef.current;
      if (total > 1) {
        const fadeEnd = total - 1;
        const fadeStart = Math.max(0, fadeEnd - FADE_FRAMES);
        const opacity = Math.min(
          1,
          Math.max(0, (idx - fadeStart) / Math.max(1, fadeEnd - fadeStart)),
        );
        overlay.style.opacity = String(opacity);
      }
    }

    const logo = logoRef.current;
    if (logo) {
      const total = frameCountRef.current;
      if (total > 1) {
        const hideEnd = total - 1;
        const hideStart = Math.max(0, hideEnd - LOGO_HIDE_FRAMES);
        const t = Math.min(
          1,
          Math.max(0, (idx - hideStart) / Math.max(1, hideEnd - hideStart)),
        );
        logo.style.opacity = String(1 - t);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/frames");
        if (!res.ok) return;
        const { frames } = (await res.json()) as { frames: string[] };
        if (cancelled || frames.length === 0) return;

        setFrameCount(frames.length);
        frameCountRef.current = frames.length;
        const images: HTMLImageElement[] = new Array(frames.length);
        let loaded = 0;

        for (let i = 0; i < frames.length; i++) {
          const img = new window.Image();
          img.decoding = "async";
          img.src = frames[i];
          img.onload = () => {
            if (cancelled) return;
            loaded++;
            loadedSetRef.current.add(i);
            if (i > maxLoadedRef.current) maxLoadedRef.current = i;
            setLoadedCount(loaded);
            // Redraw if this newly-loaded frame is the closest available match
            // to what the user is currently scrolled to.
            const requested = currentFrameRef.current;
            if (i === requested || (i < requested && i > maxLoadedRef.current - 1 && !loadedSetRef.current.has(requested))) {
              drawFrame(requested);
            } else if (i === 0 && requested === 0) {
              drawFrame(0);
            }
          };
          images[i] = img;
        }
        imagesRef.current = images;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS Safari often refuses to autoplay despite muted+playsInline+autoplay,
    // especially when the element starts at 0×0. Force a load and call play()
    // explicitly. If the first attempt is rejected (e.g. user hasn't touched
    // the page yet), retry on the first user interaction.
    video.muted = true;
    video.load();
    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    const onFirstTouch = () => {
      tryPlay();
      window.removeEventListener("touchstart", onFirstTouch);
      window.removeEventListener("click", onFirstTouch);
    };
    window.addEventListener("touchstart", onFirstTouch, { passive: true, once: true });
    window.addEventListener("click", onFirstTouch, { once: true });

    const onTimeUpdate = () => {
      if (video.currentTime >= VIDEO_CLIP_END) {
        video.currentTime = 0;
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      window.removeEventListener("touchstart", onFirstTouch);
      window.removeEventListener("click", onFirstTouch);
    };
  }, []);

  useEffect(() => {
    if (frameCount === 0) return;

    const update = () => {
      rafRef.current = null;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / total, 0), 1);
      const frameProgress = Math.min(1, progress / FRAME_SCROLL_END);
      const idx = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(frameProgress * (frameCount - 1) + 0.5)),
      );
      if (idx !== currentFrameRef.current) {
        currentFrameRef.current = idx;
        drawFrame(idx);
      }
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(update);
    };

    const onResize = () => {
      drawFrame(currentFrameRef.current);
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [frameCount]);

  const isLoading = frameCount === 0 || loadedCount < frameCount;
  const progressPct =
    frameCount === 0 ? 0 : Math.round((loadedCount / frameCount) * 100);

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: `${SECTION_HEIGHT_VH}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-2 h-[calc(100vh-1rem)] w-full overflow-hidden rounded-2xl md:top-3 md:h-[calc(100vh-1.5rem)] md:rounded-[2rem]"
      >
        {/* Frame sequence canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ display: "block" }}
        />

        {/* Demo video on the chalkboard — frameless, filling the slate */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: 0, top: 0, width: 0, height: 0, opacity: 0 }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disableRemotePlayback
            className="h-full w-full object-contain object-center"
            src="/demo2.mp4"
          />
        </div>

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Logo + one-liner */}
        <div
          ref={logoRef}
          className="absolute right-3 top-20 z-40 w-max max-w-[min(calc(100vw-1rem),40rem)] sm:right-5 sm:top-24 md:right-8 md:top-28"
          style={{ transition: "opacity 120ms linear" }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex w-full flex-col items-stretch gap-2">
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
        </div>

        {/* Navbar */}
        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 lg:gap-14">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[10px] transition-colors sm:text-xs md:text-sm"
                style={{ color: "rgba(225, 224, 204, 0.8)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E1E0CC")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(225, 224, 204, 0.8)")}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-2 sm:px-6 md:px-10">
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
          className="absolute bottom-3 right-4 z-30 text-[9px] sm:text-[10px] md:right-8"
          style={{ color: "rgba(225, 224, 204, 0.4)" }}
        >
          * MEB müfredatı ile uyumlu, KVKK güvenceli
        </motion.p>

        {/* Loading indicator */}
        {isLoading && (
          <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[9px] font-medium uppercase tracking-widest text-white/60 backdrop-blur sm:right-6 sm:top-6 sm:text-[10px]">
            Yükleniyor {progressPct}%
          </div>
        )}
      </div>
    </section>
  );
};

export { ChalkHero };
