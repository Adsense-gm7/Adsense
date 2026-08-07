/* ============================================================
   src/world/city.js
   Procedural city skyline — dark steel towers with glowing windows
   ============================================================ */
import * as THREE from 'three';
import { scene } from './scene.js';

const CITY_RADIUS = 280;
const BUILDING_COUNT = 180;

export function buildCity() {
  const cityGroup = new THREE.Group();

  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x0d1420,
    roughness: 0.9,
    metalness: 0.2,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a5c,
    emissive: 0x0a2035,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
  });

  const rng = mulberry32(42); // deterministic random

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 40 + rng() * CITY_RADIUS;
    const w = 4 + rng() * 10;
    const d = 4 + rng() * 10;
    const h = 10 + rng() * 80;

    // Skip center area (reserved for InsurCorp)
    if (radius < 50) continue;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, buildingMat.clone());
    mesh.position.set(
      Math.cos(angle) * radius,
      h / 2 - 5,
      Math.sin(angle) * radius
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);

    // Window strips (emissive planes on faces)
    addWindowStrips(mesh, w, h, d, windowMat, rng, cityGroup);
  }

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x060c14, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5;
  ground.receiveShadow = true;
  cityGroup.add(ground);

  scene.add(cityGroup);
  return cityGroup;
}

function addWindowStrips(building, w, h, d, mat, rng, group) {
  const floors = Math.floor(h / 4);
  for (let f = 0; f < floors; f++) {
    if (rng() > 0.6) continue; // some dark floors
    const y = building.position.y - h / 2 + f * 4 + 2;
    const brightness = 0.3 + rng() * 0.7;
    const m = mat.clone();
    m.emissiveIntensity = brightness * 0.5;

    // Front + back strips
    const stripGeo = new THREE.PlaneGeometry(w * 0.7, 0.8);
    const sf = new THREE.Mesh(stripGeo, m);
    sf.position.set(building.position.x, y, building.position.z + d / 2 + 0.01);
    group.add(sf);

    const sb = new THREE.Mesh(stripGeo, m.clone());
    sb.position.set(building.position.x, y, building.position.z - d / 2 - 0.01);
    sb.rotation.y = Math.PI;
    group.add(sb);
  }
}

// Deterministic RNG
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
