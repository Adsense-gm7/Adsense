/* ============================================================
   src/scroll/timeline.js — GSAP ScrollTrigger, native window scroll
   Camera lerps smoothly in render loop toward scroll-driven target
   ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { camera } from '../world/scene.js';
import { setDoorOpen, setElevatorFloor } from '../world/building.js';
import { crowdMesh, userOrb } from '../world/particles.js';
import { showHUD, hideHUD } from '../ui/hud.js';

gsap.registerPlugin(ScrollTrigger);

const KEYFRAMES = [
  { p:0.00, pos:[0,  220,320], look:[0, 60, 0] },
  { p:0.07, pos:[0,  140,220], look:[0, 40, 0] },
  { p:0.15, pos:[60,  80,180], look:[0, 20, 0] },
  { p:0.22, pos:[20,  50, 90], look:[0, 55, 0] },
  { p:0.30, pos:[0,   16, 52], look:[0,  8, 0] },
  { p:0.35, pos:[0,    9, 24], look:[0,  4,12] },
  { p:0.40, pos:[0,    6, 10], look:[0,  3, 0] },
  { p:0.46, pos:[5,   35,  7], look:[0, 35, 0] },
  { p:0.52, pos:[5,   85,  7], look:[0, 85, 0] },
  { p:0.57, pos:[0,  114, 18], look:[0,109, 0] },
  { p:0.63, pos:[-8, 113, 14], look:[0,109, 0] },
  { p:0.70, pos:[0,  112,  8], look:[0,108, 0] },
  { p:0.77, pos:[8,  113, 14], look:[0,109,-4] },
  { p:0.84, pos:[0,  111, 20], look:[0,108, 0] },
  { p:0.92, pos:[0,   65, 70], look:[40,40, 0] },
  { p:1.00, pos:[80,  40,130], look:[40,40, 0] },
];

const HUD_SCHEDULE = [
  { enter:0.57, exit:0.68, id:'hud-profile' },
  { enter:0.68, exit:0.75, id:'hud-crowd'   },
  { enter:0.75, exit:0.82, id:'hud-guess'   },
  { enter:0.82, exit:0.90, id:'hud-game'    },
  { enter:0.90, exit:1.01, id:'hud-cliff'   },
];

// Target camera state (set by scroll, lerped in render loop)
const targetPos = new THREE.Vector3(0, 220, 320);
const targetLook = new THREE.Vector3(0, 60, 0);
const currentPos = new THREE.Vector3(0, 220, 320);
const currentLook = new THREE.Vector3(0, 60, 0);
let scrollProgress = 0;

export function initScrollTimeline() {
  ScrollTrigger.create({
    trigger:   '#scroll-container',
    start:     'top top',
    end:       'bottom bottom',
    scrub:     false,   // we do our own lerp in render loop
    onUpdate: (self) => {
      scrollProgress = self.progress;
      getTargetAtProgress(self.progress, targetPos, targetLook);
      animateWorld(self.progress);
      updateHUDs(self.progress);
    },
  });
}

// Called every frame — smooth lerp toward target
export function updateCamera(delta) {
  const speed = Math.min(delta * 3.5, 0.12);
  currentPos.lerp(targetPos, speed);
  currentLook.lerp(targetLook, speed);
  camera.position.copy(currentPos);
  camera.lookAt(currentLook);
}

function getTargetAtProgress(p, posOut, lookOut) {
  let from = KEYFRAMES[0], to = KEYFRAMES[1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].p && p <= KEYFRAMES[i+1].p) { from=KEYFRAMES[i]; to=KEYFRAMES[i+1]; break; }
  }
  const span = to.p - from.p;
  const t = span > 0 ? easeInOut(Math.min((p-from.p)/span, 1)) : 1;
  posOut.lerpVectors(new THREE.Vector3(...from.pos), new THREE.Vector3(...to.pos), t);
  lookOut.lerpVectors(new THREE.Vector3(...from.look), new THREE.Vector3(...to.look), t);
}

function animateWorld(p) {
  if (p>=0.33&&p<=0.41) setDoorOpen((p-0.33)/0.08);
  else if (p>0.41) setDoorOpen(1);
  if (p>=0.44&&p<=0.56) setElevatorFloor((p-0.44)/0.12);
  else if (p>0.56) setElevatorFloor(1);
  if (crowdMesh) crowdMesh.visible = (p>0.67&&p<0.80);
  if (userOrb)   userOrb.visible   = (p>0.68&&p<0.80);
}

function updateHUDs(p) {
  const hero = document.getElementById('hud-hero');
  if (hero) hero.style.opacity = p > 0.04 ? '0' : '1';
  HUD_SCHEDULE.forEach(({enter,exit,id}) => {
    if (p>=enter&&p<exit) showHUD(id); else hideHUD(id);
  });
}

function easeInOut(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }
