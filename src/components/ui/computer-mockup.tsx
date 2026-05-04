"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComputerMockupProps {
  videoSrc?: string;
  poster?: string;
  url?: string;
  className?: string;
}

export function ComputerMockup({
  videoSrc = "/chalkdemo.mov",
  poster,
  url = "chalk.app/dashboard",
  className,
}: ComputerMockupProps) {
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

      {/* Video area (16:9) */}
      <div className="relative aspect-video w-full bg-black">
        <video
          src={videoSrc}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
