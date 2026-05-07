"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ComputerMockupProps {
  videoSrc?: string;
  poster?: string;
  url?: string;
  clipEnd?: number;
  className?: string;
}

export function ComputerMockup({
  videoSrc = "/demo2.mp4",
  poster,
  url = "chalk.app/dashboard",
  clipEnd = 20,
  className,
}: ComputerMockupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= clipEnd) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [clipEnd]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_30px_120px_-20px_rgba(99,102,241,0.25)] ring-1 ring-white/5",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/8 bg-[#141414] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex max-w-md flex-1 items-center justify-center gap-2 rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-white/40">
          <Lock className="h-3 w-3" />
          <span className="truncate">{url}</span>
        </div>
        <div className="w-[52px]" aria-hidden />
      </div>

      {/* Video area — object-contain: full frame visible, no side crop */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      </div>
    </div>
  );
}
