/* ============================================================
   src/scroll/timeline.js
   GSAP ScrollTrigger — cinematic camera path
   Camera flies from space → city → InsurCorp → Floor 27 → exit
   ============================================================ */
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { camera } from '../world/scene.js';
import { setDoorOpen, setElevatorFloor } from '../world/building.js';
import { crowdMesh, userOrb } from '../world/particles.js';
import { showHUD, hideHUD } from '../ui/hud.js';

gsap.registerPlugin(ScrollTrigger);

// ── Camera keyframes (position + target) ──────────────────
// Each entry: scroll progress 0-1, cam position, look-at target
const KEYFRAMES = [
  { p: 0.00, pos: [0, 300, 400],  look: [0, 80, 0]   },  // space view
  { p: 0.08, pos: [0, 200, 300],  look: [0, 40, 0]   },  // clouds
  { p: 0.16, pos: [60, 100, 180], look: [0, 20, 0]   },  // city reveal
  { p: 0.24, pos: [20, 50,  80],  look: [0, 60, 0]   },  // zoom to building
  { p: 0.31, pos: [0, 12,  50],   look: [0, 8, 0]    },  // close on entrance
  { p: 0.36, pos: [0, 8,   20],   look: [0, 4, 11]   },  // door approach
  { p: 0.42, pos: [0, 5,   8],    look: [0, 3, 0]    },  // inside lobby
  { p: 0.47, pos: [5, 30,  6],    look: [0, 30, 0]   },  // elevator rising
  { p: 0.52, pos: [5, 80,  6],    look: [0, 80, 0]   },  // elevator mid
  { p: 0.56, pos: [0, 112, 15],   look: [0, 109, 0]  },  // floor 27 entry
  { p: 0.63, pos: [-8, 112, 12],  look: [0, 109, 0]  },  // profile scene
  { p: 0.70, pos: [0, 111, 6],    look: [0, 108, 0]  },  // crowd orbs
  { p: 0.77, pos: [8, 112, 12],   look: [0, 109, -4] },  // guess cubes
  { p: 0.84, pos: [0, 110, 18],   look: [0, 108, 0]  },  // trading floor
  { p: 0.92, pos: [0, 60,  60],   look: [40, 40, 0]  },  // exit building
  { p: 1.00, pos: [80, 40, 120],  look: [40, 40, 0]  },  // next building
];

// ── HUD visibility schedule ────────────────────────────────
const HUD_SCHEDULE = [
  { enter: 0.56, exit: 0.68, id: 'hud-profile'  },  // Profile builder
  { enter: 0.68, exit: 0.75, id: 'hud-crowd'    },  // Crowd math
  { enter: 0.75, exit: 0.82, id: 'hud-guess'    },  // Guess mechanic
  { enter: 0.82, exit: 0.90, id: 'hud-game'     },  // Beat the system
  { enter: 0.90, exit: 1.00, id: 'hud-cliff'    },  // Cliffhanger
];

const camPos    = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const lookObj   = { x: 0, y: 0, z: 0 };

export function initScrollTimeline(lenisInstance) {
  // ── Scroll proxy for GSAP ──────────────────────────────
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) lenisInstance.scrollTo(value);
      return lenisInstance.scroll;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
  });

  lenisInstance.on('scroll', ScrollTrigger.update);

  // ── Main scroll-driven camera animation ───────────────
  const proxy = { progress: 0 };

  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    onUpdate: (self) => {
      const p = self.progress;
      animateCamera(p);
      animateSceneObjects(p);
      updateHUDs(p);
    },
  });
}

// ── Interpolate camera along keyframes ────────────────────
function animateCamera(p) {
  let from = KEYFRAMES[0], to = KEYFRAMES[1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].p && p <= KEYFRAMES[i + 1].p) {
      from = KEYFRAMES[i];
      to   = KEYFRAMES[i + 1];
      break;
    }
  }

  const t = (p - from.p) / (to.p - from.p);
  const ease = easeInOut(t);

  camera.position.lerpVectors(
    new THREE.Vector3(...from.pos),
    new THREE.Vector3(...to.pos),
    ease
  );

  const lookFrom = new THREE.Vector3(...from.look);
  const lookTo   = new THREE.Vector3(...to.look);
  camTarget.lerpVectors(lookFrom, lookTo, ease);
  camera.lookAt(camTarget);
}

// ── Scene object animations ───────────────────────────────
function animateSceneObjects(p) {
  // Door opens 0.34→0.40
  if (p >= 0.34 && p <= 0.42) {
    setDoorOpen((p - 0.34) / 0.08);
  }

  // Elevator rises 0.44→0.55
  if (p >= 0.44 && p <= 0.56) {
    setElevatorFloor((p - 0.44) / 0.12);
  }

  // Crowd orbs appear at 0.66
  if (crowdMesh) crowdMesh.visible = p > 0.66 && p < 0.80;
  if (userOrb)   userOrb.visible   = p > 0.67 && p < 0.80;
}

// ── HUD panel transitions ─────────────────────────────────
function updateHUDs(p) {
  HUD_SCHEDULE.forEach(({ enter, exit, id }) => {
    if (p >= enter && p < exit) showHUD(id);
    else hideHUD(id);
  });
}

// ── Easing ────────────────────────────────────────────────
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
