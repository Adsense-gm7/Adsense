/* ============================================================
   src/main.js — Entry point
   Single RAF loop: Lenis + Three.js composer
   ============================================================ */
import { initScene, renderer, camera, scene, clock } from './world/scene.js';
import { initPostProcessing, detectQuality, composer } from './world/postprocessing.js';
import { buildCity }      from './world/city.js';
import { buildInsurCorp } from './world/building.js';
import { buildStars, buildDust, buildCrowdOrbs, animateParticles } from './world/particles.js';
import { initLenis, lenisRaf }  from './scroll/lenis.js';
import { initScrollTimeline }   from './scroll/timeline.js';
import { initHUD }       from './ui/hud.js';
import { unlockAchievement } from './ui/achievements.js';
import { trackEvent, trackSceneEnter, SESSION_ID } from './analytics/tracker.js';

// ── Boot ──────────────────────────────────────────────────
async function boot() {
  const canvas = document.getElementById('canvas-3d');

  // 1. Three.js scene
  initScene(canvas);

  // 2. Post-processing (quality-adaptive)
  const quality = detectQuality();
  initPostProcessing(quality);

  // 3. Build 3D world
  buildStars();
  buildDust();
  buildCity();
  buildInsurCorp();
  buildCrowdOrbs();

  // 4. Smooth scroll (Lenis)
  const lenis = initLenis();

  // 5. Camera scroll timeline
  initScrollTimeline(lenis);

  // 6. HTML HUD overlays
  initHUD();

  // 7. Analytics
  trackEvent('page_view', 0, { session: SESSION_ID, quality });
  trackSceneEnter(0);
  setTimeout(() => unlockAchievement('started'), 1500);

  // 8. Cursor glow
  initCursorGlow();

  // 9. Live counter
  animateLiveCounter();

  // 10. Single RAF render loop (Lenis + Three.js in sync)
  function render(time) {
    requestAnimationFrame(render);
    lenisRaf(time);                   // advance Lenis smooth scroll
    const delta = clock.getDelta();
    animateParticles(delta);
    composer.render();
  }
  requestAnimationFrame(render);
}

// ── Cursor glow ───────────────────────────────────────────
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  window.addEventListener('mousemove', e => {
    glow.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
  });
}

// ── Live counter ──────────────────────────────────────────
function animateLiveCounter() {
  const el = document.getElementById('sp-live');
  if (!el) return;
  let current = 1200 + Math.floor(Math.random() * 200);
  el.textContent = current.toLocaleString();
  setInterval(() => {
    current = Math.max(current + (Math.floor(Math.random() * 7) - 2), 800);
    el.textContent = current.toLocaleString();
  }, 4000);
}

boot();
