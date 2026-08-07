/* ============================================================
   src/world/particles.js
   Stars, ambient dust, crowd orbs, confetti burst
   ============================================================ */
import * as THREE from 'three';
import { scene } from './scene.js';

export let starsPoints, dustPoints, crowdMesh, userOrb;

// ── Stars ─────────────────────────────────────────────────
export function buildStars() {
  const count = 3000;
  const pos   = new Float32Array(count * 3);
  const col   = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 600 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    const bright = 0.5 + Math.random() * 0.5;
    col[i * 3]     = bright;
    col[i * 3 + 1] = bright;
    col[i * 3 + 2] = bright + Math.random() * 0.3; // slight blue tint
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  starsPoints = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  }));
  scene.add(starsPoints);
  return starsPoints;
}

// ── Ambient floating dust ─────────────────────────────────
export function buildDust() {
  const count = 800;
  const pos   = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 60;
    pos[i * 3 + 1] = Math.random() * 160;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  dustPoints = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x4488ff,
    size: 0.12,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  }));
  scene.add(dustPoints);
  return dustPoints;
}

// ── 1000 Crowd Orbs (Risk Scene) ──────────────────────────
export function buildCrowdOrbs() {
  const count = 1000;
  const dummy = new THREE.Object3D();

  crowdMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.18, 6, 6),
    new THREE.MeshStandardMaterial({
      color: 0x1a4a8a,
      emissive: 0x0033aa,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    }),
    count
  );

  // Arrange in concentric rings around the holographic table
  for (let i = 0; i < count; i++) {
    const ring  = Math.floor(i / 80);
    const angle = (i % 80) / 80 * Math.PI * 2;
    const r     = 2 + ring * 0.9;
    dummy.position.set(
      Math.cos(angle) * r,
      108 + Math.sin(i * 0.4) * 0.3,
      Math.sin(angle) * r
    );
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);

    // Color: mostly blue, 5% red (accident risk)
    const isRisk = Math.random() < 0.05;
    crowdMesh.setColorAt(i, isRisk
      ? new THREE.Color(0xff3030)
      : new THREE.Color(0x1a4a8a)
    );
  }

  crowdMesh.instanceMatrix.needsUpdate = true;
  crowdMesh.instanceColor.needsUpdate  = true;
  crowdMesh.visible = false; // shown when entering scene 2
  scene.add(crowdMesh);

  // User's orb (gold, glowing)
  userOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 2.0,
      roughness: 0,
      metalness: 0,
    })
  );
  userOrb.position.set(2, 108, 0);
  userOrb.visible = false;
  scene.add(userOrb);

  // Orb glow
  const orbLight = new THREE.PointLight(0xfbbf24, 3, 5);
  userOrb.add(orbLight);

  return { crowdMesh, userOrb };
}

// ── Confetti burst (win condition) ────────────────────────
let confettiMesh = null;
const confettiVelocities = [];

export function triggerConfetti() {
  const count = 300;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const colors = [
    [1, 0.73, 0.14],
    [0, 0.83, 1],
    [0.25, 1, 0.5],
    [1, 0.25, 0.4],
  ];

  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 8;
    pos[i * 3 + 1] = 112 + Math.random() * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8;

    const c = colors[Math.floor(Math.random() * colors.length)];
    col[i * 3]     = c[0];
    col[i * 3 + 1] = c[1];
    col[i * 3 + 2] = c[2];

    confettiVelocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y:  0.05 + Math.random() * 0.1,
      z: (Math.random() - 0.5) * 0.15,
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  if (confettiMesh) scene.remove(confettiMesh);
  confettiMesh = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
  }));
  scene.add(confettiMesh);

  // Auto-remove after 4s
  setTimeout(() => {
    if (confettiMesh) { scene.remove(confettiMesh); confettiMesh = null; }
    confettiVelocities.length = 0;
  }, 4000);
}

// Animate dust + confetti (called in render loop)
export function animateParticles(delta) {
  if (dustPoints) {
    dustPoints.rotation.y += delta * 0.01;
    const pos = dustPoints.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += delta * 0.4;
      if (pos[i] > 160) pos[i] = 0;
    }
    dustPoints.geometry.attributes.position.needsUpdate = true;
  }

  if (confettiMesh && confettiVelocities.length) {
    const pos = confettiMesh.geometry.attributes.position.array;
    for (let i = 0; i < confettiVelocities.length; i++) {
      pos[i * 3]     += confettiVelocities[i].x;
      pos[i * 3 + 1] += confettiVelocities[i].y;
      pos[i * 3 + 2] += confettiVelocities[i].z;
      confettiVelocities[i].y -= delta * 0.08; // gravity
    }
    confettiMesh.geometry.attributes.position.needsUpdate = true;
  }
}
