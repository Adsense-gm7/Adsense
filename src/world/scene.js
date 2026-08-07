/* ============================================================
   src/world/scene.js
   Three.js renderer, camera, lights, resize handling
   ============================================================ */
import * as THREE from 'three';

export let renderer, camera, scene, clock;

export function initScene(canvas) {
  clock = new THREE.Clock();

  // ── Renderer ──────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Scene ─────────────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.FogExp2(0x0a1628, 0.018);

  // ── Camera ────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 120, 200);
  camera.lookAt(0, 0, 0);

  // ── Lights ────────────────────────────────────────────────
  // Ambient
  const ambient = new THREE.AmbientLight(0x0a1628, 0.4);
  scene.add(ambient);

  // Moon (cold directional)
  const moon = new THREE.DirectionalLight(0x4488cc, 0.8);
  moon.position.set(50, 100, 50);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.far = 500;
  scene.add(moon);

  // Warm fill from below (city reflected light)
  const fill = new THREE.HemisphereLight(0x0a1628, 0x1a0a2e, 0.3);
  scene.add(fill);

  // ── Resize ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, camera, scene, clock };
}
