/* ============================================================
   src/scenes/director.js
   Click-driven scene state machine with GSAP cinematic tweens
   ============================================================ */
import gsap from 'gsap';
import * as THREE from 'three';
import { camera, scene } from '../world/scene.js';
import { setDoorOpen, setElevatorFloor } from '../world/building.js';
import { crowdMesh, userOrb }  from '../world/particles.js';
import { showHUD, hideHUD }    from '../ui/hud.js';
import { unlockAchievement }   from '../ui/achievements.js';
import { trackEvent }          from '../analytics/tracker.js';

// ── Scene definitions ─────────────────────────────────────
export const SCENES = [
  {
    id: 0, name: 'Arrival',
    cam: { pos:[0,220,320], look:[0,60,0] },
    hud: null,
    onEnter: () => { setDoorOpen(0); setElevatorFloor(0); }
  },
  {
    id: 1, name: 'The City',
    cam: { pos:[20,50,90], look:[0,55,0] },
    hud: null,
    onEnter: () => {}
  },
  {
    id: 2, name: 'InsurCorp',
    cam: { pos:[0,14,52], look:[0,8,0] },
    hud: null,
    onEnter: () => {}
  },
  {
    id: 3, name: 'Enter',
    cam: { pos:[0,5,10], look:[0,3,0] },
    hud: null,
    onEnter: () => gsap.to({}, { duration:0.6, onComplete: () => setDoorOpen(1) })
  },
  {
    id: 4, name: 'Elevator',
    cam: { pos:[5,60,7], look:[0,60,0] },
    hud: null,
    onEnter: () => {
      gsap.to({progress:0},{duration:1.8,progress:1,ease:'power2.inOut',
        onUpdate: function(){ setElevatorFloor(this.progress); }
      });
    }
  },
  {
    id: 5, name: 'Your Profile',
    cam: { pos:[-8,113,16], look:[0,109,0] },
    hud: 'hud-profile',
    onEnter: () => unlockAchievement('profiled')
  },
  {
    id: 6, name: '1,000 Drivers',
    cam: { pos:[0,112,8], look:[0,108,0] },
    hud: 'hud-crowd',
    onEnter: () => {
      if(crowdMesh) crowdMesh.visible = true;
      if(userOrb)   userOrb.visible   = true;
      unlockAchievement('crowd_seen');
    }
  },
  {
    id: 7, name: 'Myth Busters',
    cam: { pos:[8,113,16], look:[0,109,-4] },
    hud: 'hud-guess',
    onEnter: () => {
      if(crowdMesh) crowdMesh.visible = false;
      if(userOrb)   userOrb.visible   = false;
    }
  },
  {
    id: 8, name: 'Beat the System',
    cam: { pos:[0,110,20], look:[0,108,0] },
    hud: 'hud-game',
    onEnter: () => unlockAchievement('game_player')
  },
  {
    id: 9, name: 'What\'s Next',
    cam: { pos:[80,40,130], look:[40,40,0] },
    hud: 'hud-cliff',
    onEnter: () => unlockAchievement('completionist')
  },
];

let current = 0;
let transitioning = false;

// Camera state for smooth lerp
export const camTarget = {
  pos:  new THREE.Vector3(0,220,320),
  look: new THREE.Vector3(0,60,0),
};
export const camCurrent = {
  pos:  new THREE.Vector3(0,220,320),
  look: new THREE.Vector3(0,60,0),
};

// ── Advance to next scene ─────────────────────────────────
export function nextScene() {
  if (transitioning || current >= SCENES.length-1) return;
  goToScene(current + 1);
}

export function prevScene() {
  if (transitioning || current <= 0) return;
  goToScene(current - 1);
}

export function goToScene(idx) {
  if (transitioning) return;
  if (idx < 0 || idx >= SCENES.length) return;
  transitioning = true;

  const from = SCENES[current];
  const to   = SCENES[idx];
  const overlay = document.getElementById('scene-overlay');

  // Hide current HUD
  if (from.hud) hideHUD(from.hud);

  // Fade to black
  gsap.to(overlay, { opacity:1, duration:0.35, ease:'power2.in', onComplete: () => {
    // Move camera target instantly (lerp handles smooth movement during fade)
    camTarget.pos.set(...to.cam.pos);
    camTarget.look.set(...to.cam.look);

    // Scene-specific logic
    to.onEnter?.();
    current = idx;
    updateUI();

    // Fade in
    gsap.to(overlay, { opacity:0, duration:0.6, delay:0.15, ease:'power2.out',
      onComplete: () => {
        transitioning = false;
        if (to.hud) showHUD(to.hud);
        trackEvent('scene_enter', idx, { name: to.name });
      }
    });
  }});
}

// ── Update UI chrome ─────────────────────────────────────
function updateUI() {
  // Chapter dots
  document.querySelectorAll('.nav-dot').forEach((d,i) => {
    d.classList.toggle('active', i === current);
    d.classList.toggle('visited', i < current);
  });

  // Next/Prev buttons
  const nextBtn = document.getElementById('btn-next');
  const prevBtn = document.getElementById('btn-prev');
  if (nextBtn) nextBtn.style.opacity = current < SCENES.length-1 ? '1' : '0';
  if (prevBtn) prevBtn.style.opacity = current > 0 ? '1' : '0';

  // Scene label
  const label = document.getElementById('scene-label');
  if (label) {
    label.textContent = `${current+1} / ${SCENES.length} — ${SCENES[current].name}`;
  }

  // Hero visibility
  const hero = document.getElementById('hud-hero');
  if (hero) hero.style.display = current === 0 ? 'flex' : 'none';
}

// ── Smooth camera lerp (called every frame) ───────────────
export function updateCamera(delta) {
  const speed = Math.min(delta * 2.5, 0.08);
  camCurrent.pos.lerp(camTarget.pos, speed);
  camCurrent.look.lerp(camTarget.look, speed);
  camera.position.copy(camCurrent.pos);
  camera.lookAt(camCurrent.look);
}

// ── Input bindings ────────────────────────────────────────
export function initControls() {
  // Keyboard
  window.addEventListener('keydown', e => {
    if (e.key==='ArrowRight'||e.key===' '||e.key==='ArrowDown') nextScene();
    if (e.key==='ArrowLeft' ||e.key==='ArrowUp')  prevScene();
  });

  // Touch swipe
  let touchX = 0, touchY = 0;
  window.addEventListener('touchstart', e => { touchX=e.touches[0].clientX; touchY=e.touches[0].clientY; }, {passive:true});
  window.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx)>50 || Math.abs(dy)>50) {
      if (dx < -40 || dy < -40) nextScene();
      else if (dx > 40 || dy > 40) prevScene();
    }
  }, {passive:true});

  // Wheel
  let wheelLock = false;
  window.addEventListener('wheel', e => {
    if (wheelLock) return;
    wheelLock = true;
    if (e.deltaY > 30) nextScene();
    else if (e.deltaY < -30) prevScene();
    setTimeout(() => wheelLock=false, 800);
  }, {passive:true});

  // Init first scene UI
  updateUI();
}
