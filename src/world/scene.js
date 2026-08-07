/* ============================================================
   src/world/scene.js — quality-aware renderer
   ============================================================ */
import * as THREE from 'three';

export let renderer, camera, scene, clock;

export function initScene(canvas, quality = 'high') {
  clock = new THREE.Clock();

  const mobile = quality === 'low';

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: mobile ? 'low-power' : 'high-performance',
  });
  renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mobile ? 1.0 : 1.2;
  renderer.shadowMap.enabled = !mobile;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.FogExp2(0x0a1628, mobile ? 0.005 : 0.008);

  camera = new THREE.PerspectiveCamera(
    mobile ? 70 : 60,
    window.innerWidth / window.innerHeight, 0.1, 2000
  );
  camera.position.set(0, 220, 320);
  camera.lookAt(0, 60, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x0a1628, mobile ? 0.8 : 0.4));

  const moon = new THREE.DirectionalLight(0x4488cc, 0.8);
  moon.position.set(50, 100, 50);
  if (!mobile) { moon.castShadow = true; moon.shadow.mapSize.set(1024,1024); }
  scene.add(moon);

  if (!mobile) scene.add(new THREE.HemisphereLight(0x0a1628, 0x1a0a2e, 0.3));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, camera, scene, clock };
}
