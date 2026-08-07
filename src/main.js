/* ============================================================
   src/main.js — Click-driven cinematic experience
   ============================================================ */
import { initScene, renderer, camera, scene, clock } from './world/scene.js';
import { initPostProcessing, detectQuality, composer, useComposer } from './world/postprocessing.js';
import { buildCity }      from './world/city.js';
import { buildInsurCorp } from './world/building.js';
import { buildStars, buildDust, buildCrowdOrbs, animateParticles } from './world/particles.js';
import { initControls, updateCamera, nextScene, prevScene, goToScene } from './scenes/director.js';
import { initHUD }           from './ui/hud.js';
import { unlockAchievement } from './ui/achievements.js';
import { trackEvent, trackSceneEnter, SESSION_ID } from './analytics/tracker.js';

async function boot() {
  const canvas  = document.getElementById('canvas-3d');
  const quality = detectQuality();

  initScene(canvas, quality);
  initPostProcessing(quality);
  buildStars(quality);
  buildDust(quality);
  buildCity(quality);
  buildInsurCorp();
  buildCrowdOrbs(quality);

  initControls();
  initHUD();
  initCursorGlow();
  animateLiveCounter();

  trackEvent('page_view', 0, { session: SESSION_ID, quality });
  trackSceneEnter(0);
  setTimeout(() => unlockAchievement('started'), 2000);

  // Render loop
  function render() {
    requestAnimationFrame(render);
    const delta = clock.getDelta();
    updateCamera(delta);
    animateParticles(delta);
    if (useComposer && composer) composer.render();
    else renderer.render(scene, camera);
  }
  requestAnimationFrame(render);
}

function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  window.addEventListener('mousemove', e => {
    glow.style.transform = `translate(${e.clientX-150}px,${e.clientY-150}px)`;
  });
}

function animateLiveCounter() {
  const el = document.getElementById('sp-live');
  if (!el) return;
  let n = 1200 + Math.floor(Math.random()*200);
  el.textContent = n.toLocaleString();
  setInterval(() => { n=Math.max(n+Math.floor(Math.random()*7)-2,800); el.textContent=n.toLocaleString(); }, 4000);
}

// Expose globally for HTML onclick
window.nextScene = () => import('./scenes/director.js').then(m => m.nextScene());
window.prevScene = () => import('./scenes/director.js').then(m => m.prevScene());

boot();
