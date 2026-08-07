/* ============================================================
   src/scroll/lenis.js  — Smooth scroll
   Simple Lenis setup on the window (no custom scroller)
   ============================================================ */
import Lenis from 'lenis';

export let lenis;

export function initLenis() {
  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.5,
  });
  return lenis;
}

// Called from the main RAF loop — keeps Lenis in sync
export function lenisRaf(time) {
  if (lenis) lenis.raf(time);
}
