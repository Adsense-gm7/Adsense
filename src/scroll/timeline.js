/* ============================================================
   src/scroll/timeline.js
   GSAP ScrollTrigger — cinematic camera path
   Uses simple window scroll (no scrollerProxy needed)
   ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { camera } from '../world/scene.js';
import { setDoorOpen, setElevatorFloor } from '../world/building.js';
import { crowdMesh, userOrb } from '../world/particles.js';
import { showHUD, hideHUD } from '../ui/hud.js';

gsap.registerPlugin(ScrollTrigger);

// ── Camera keyframes (position + look-at) ─────────────────
// progress 0→1 maps to scroll top→bottom of #scroll-container
const KEYFRAMES = [
  { p: 0.00, pos: [0,  220, 320], look: [0,  60, 0]  },  // space view
  { p: 0.07, pos: [0,  140, 220], look: [0,  40, 0]  },  // pull back
  { p: 0.15, pos: [60,  80, 180], look: [0,  20, 0]  },  // city reveal
  { p: 0.22, pos: [20,  50,  90], look: [0,  55, 0]  },  // zoom building
  { p: 0.30, pos: [0,   16,  52], look: [0,   8, 0]  },  // entrance close
  { p: 0.35, pos: [0,    9,  24], look: [0,   4, 12] },  // door approach
  { p: 0.40, pos: [0,    6,  10], look: [0,   3,  0] },  // inside lobby
  { p: 0.46, pos: [5,   35,   7], look: [0,  35,  0] },  // elevator low
  { p: 0.52, pos: [5,   85,   7], look: [0,  85,  0] },  // elevator mid
  { p: 0.57, pos: [0,  114,  18], look: [0, 109,  0] },  // floor 27 entry
  { p: 0.63, pos: [-8, 113,  14], look: [0, 109,  0] },  // profile scene
  { p: 0.70, pos: [0,  112,   8], look: [0, 108,  0] },  // crowd orbs
  { p: 0.77, pos: [8,  113,  14], look: [0, 109, -4] },  // guess cubes
  { p: 0.84, pos: [0,  111,  20], look: [0, 108,  0] },  // trading floor
  { p: 0.92, pos: [0,   65,  70], look: [40, 40,  0] },  // exit building
  { p: 1.00, pos: [80,  40, 130], look: [40, 40,  0] },  // next building
];

// ── HUD schedule ──────────────────────────────────────────
const HUD_SCHEDULE = [
  { enter: 0.57, exit: 0.68, id: 'hud-profile' },
  { enter: 0.68, exit: 0.75, id: 'hud-crowd'   },
  { enter: 0.75, exit: 0.82, id: 'hud-guess'   },
  { enter: 0.82, exit: 0.90, id: 'hud-game'    },
  { enter: 0.90, exit: 1.01, id: 'hud-cliff'   },
];

// Hide hero when scrolling starts
const HERO_HIDE = 0.04;

let lastProgress = 0;
const camTarget = new THREE.Vector3();

export function initScrollTimeline(lenisInstance) {
  // Tell GSAP to use Lenis's scroll values
  lenisInstance.on('scroll', ScrollTrigger.update);

  ScrollTrigger.defaults({ scroller: window });

  ScrollTrigger.create({
    trigger:   '#scroll-container',
    start:     'top top',
    end:       'bottom bottom',
    scrub:     0.8,
    onUpdate: (self) => {
      const p = self.progress;
      lastProgress = p;
      moveCameraTo(p);
      animateWorld(p);
      updateHUDs(p);
    },
  });
}

// ── Camera interpolation ───────────────────────────────────
function moveCameraTo(p) {
  let from = KEYFRAMES[0], to = KEYFRAMES[1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].p && p <= KEYFRAMES[i + 1].p) {
      from = KEYFRAMES[i];
      to   = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = to.p - from.p;
  const t    = span > 0 ? (p - from.p) / span : 1;
  const ease = easeInOut(Math.min(Math.max(t, 0), 1));

  camera.position.lerpVectors(
    new THREE.Vector3(...from.pos),
    new THREE.Vector3(...to.pos),
    ease
  );

  camTarget.lerpVectors(
    new THREE.Vector3(...from.look),
    new THREE.Vector3(...to.look),
    ease
  );
  camera.lookAt(camTarget);
}

// ── World object animations ───────────────────────────────
function animateWorld(p) {
  // Door opens 0.33→0.41
  if (p >= 0.33 && p <= 0.41) setDoorOpen((p - 0.33) / 0.08);
  else if (p > 0.41) setDoorOpen(1);

  // Elevator rises 0.44→0.56
  if (p >= 0.44 && p <= 0.56) setElevatorFloor((p - 0.44) / 0.12);
  else if (p > 0.56) setElevatorFloor(1);

  // Crowd orbs
  if (crowdMesh) crowdMesh.visible = (p > 0.67 && p < 0.80);
  if (userOrb)   userOrb.visible   = (p > 0.68 && p < 0.80);
}

// ── HUD transitions ────────────────────────────────────────
function updateHUDs(p) {
  // Hide hero when scrolling starts
  const hero = document.getElementById('hud-hero');
  if (hero) hero.style.opacity = p > HERO_HIDE ? '0' : '1';

  HUD_SCHEDULE.forEach(({ enter, exit, id }) => {
    if (p >= enter && p < exit) showHUD(id);
    else hideHUD(id);
  });
}

// ── Easing ────────────────────────────────────────────────
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
