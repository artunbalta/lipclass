"use client";

import { useEffect, useRef, useState } from "react";

export default function FramesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  const drawFrame = (idx: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[idx];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(window.innerWidth * dpr);
    const targetH = Math.floor(window.innerHeight * dpr);
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
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/frames");
      if (!res.ok) return;
      const { frames } = (await res.json()) as { frames: string[] };
      if (cancelled || frames.length === 0) return;

      setFrameCount(frames.length);
      const images: HTMLImageElement[] = new Array(frames.length);
      let loaded = 0;

      for (let i = 0; i < frames.length; i++) {
        const img = new window.Image();
        img.decoding = "async";
        img.src = frames[i];
        img.onload = () => {
          if (cancelled) return;
          loaded++;
          setLoadedCount(loaded);
          if (i === 0) drawFrame(0);
        };
        images[i] = img;
      }
      imagesRef.current = images;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (frameCount === 0) return;

    const update = () => {
      rafRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const total = container.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / total, 0), 1);
      const idx = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(progress * (frameCount - 1) + 0.5)),
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

  const progressPct =
    frameCount === 0 ? 0 : Math.round((loadedCount / frameCount) * 100);
  const isLoading = frameCount === 0 || loadedCount < frameCount;

  return (
    <main className="bg-black">
      <div
        ref={containerRef}
        className="relative"
        style={{ height: "600vh" }}
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ display: "block" }}
          />
          {isLoading && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/60 backdrop-blur">
              Yükleniyor {progressPct}%
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
