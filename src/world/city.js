/* ============================================================
   src/world/city.js — quality-aware city builder
   ============================================================ */
import * as THREE from 'three';
import { scene } from './scene.js';

export function buildCity(quality = 'high') {
  const COUNT = quality === 'low' ? 60 : quality === 'medium' ? 110 : 180;
  const cityGroup = new THREE.Group();

  const buildingMat = new THREE.MeshStandardMaterial({ color:0x0d1420, roughness:0.9, metalness:0.2 });
  const windowMat   = new THREE.MeshStandardMaterial({ color:0x1a3a5c, emissive:0x0a2035, emissiveIntensity:0.6, roughness:0.1, metalness:0.8 });
  const rng = mulberry32(42);

  for (let i = 0; i < COUNT; i++) {
    const angle  = rng() * Math.PI * 2;
    const radius = 40 + rng() * 280;
    const w = 4 + rng() * 10, d = 4 + rng() * 10, h = 10 + rng() * 80;
    if (radius < 50) { i--; continue; }

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat.clone());
    mesh.position.set(Math.cos(angle)*radius, h/2-5, Math.sin(angle)*radius);
    cityGroup.add(mesh);

    if (quality !== 'low') addWindowStrips(mesh, w, h, d, windowMat, rng, cityGroup);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200,1200),
    new THREE.MeshStandardMaterial({ color:0x060c14, roughness:1 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -5;
  cityGroup.add(ground);

  scene.add(cityGroup);
  return cityGroup;
}

function addWindowStrips(building, w, h, d, mat, rng, group) {
  const floors = Math.floor(h/4);
  for (let f=0; f<floors; f++) {
    if (rng() > 0.6) continue;
    const y = building.position.y - h/2 + f*4 + 2;
    const m = mat.clone(); m.emissiveIntensity = (0.3 + rng()*0.7) * 0.5;
    const geo = new THREE.PlaneGeometry(w*0.7, 0.8);
    const sf = new THREE.Mesh(geo, m); sf.position.set(building.position.x, y, building.position.z + d/2 + 0.01); group.add(sf);
    const sb = new THREE.Mesh(geo, m.clone()); sb.position.set(building.position.x, y, building.position.z - d/2 - 0.01); sb.rotation.y=Math.PI; group.add(sb);
  }
}

function mulberry32(seed) {
  return function() {
    seed|=0; seed=(seed+0x6D2B79F5)|0;
    let t=Math.imul(seed^(seed>>>15),1|seed);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
