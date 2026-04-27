"use client";

import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/** Daha düşük lerp = daha belirgin yay/sürtünme; daha düşük wheelMultiplier = adım adım daha yumuşak */
const lenisOptions = {
  autoRaf: true,
  smoothWheel: true,
  lerp: 0.035,
  wheelMultiplier: 0.72,
  touchMultiplier: 0.85,
  syncTouch: false,
} as const;

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={lenisOptions}>
      {children}
    </ReactLenis>
  );
}
