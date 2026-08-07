/* ============================================================
   src/world/building.js
   InsurCorp HQ — the glowing building at the center
   Includes: lobby, elevator shaft, Risk Dept (Floor 27)
   ============================================================ */
import * as THREE from 'three';
import { scene } from './scene.js';

export let buildingGroup, door, elevator, elevatorLight;
export const LOBBY_POS  = new THREE.Vector3(0, 3, 8);
export const FLOOR27_POS = new THREE.Vector3(0, 110, 2);

export function buildInsurCorp() {
  buildingGroup = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a2e,
    roughness: 0.3,
    metalness: 0.8,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x001a33,
    emissive: 0x002244,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    metalness: 0.9,
  });

  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 3.0,
    roughness: 0,
    metalness: 0,
  });

  // ── Main tower ──────────────────────────────────────────
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 160, 22),
    steelMat
  );
  tower.position.y = 75;
  tower.castShadow = true;
  buildingGroup.add(tower);

  // Glass facade overlay
  const facade = new THREE.Mesh(
    new THREE.BoxGeometry(22.4, 160, 22.4),
    glassMat
  );
  facade.position.y = 75;
  buildingGroup.add(facade);

  // ── Neon trim lines ─────────────────────────────────────
  addNeonTrim(buildingGroup, neonMat);

  // ── INSURCORP neon sign (Floor 30) ──────────────────────
  addNeonSign(buildingGroup, neonMat);

  // ── Lobby (ground level) ────────────────────────────────
  buildLobby(buildingGroup, steelMat, neonMat);

  // ── Elevator shaft (internal) ───────────────────────────
  buildElevatorShaft(buildingGroup);

  // ── Floor 27 — Risk Department ──────────────────────────
  buildRiskRoom(buildingGroup, steelMat, neonMat);

  // ── Point light inside building ─────────────────────────
  const interiorLight = new THREE.PointLight(0x00d4ff, 2, 80);
  interiorLight.position.set(0, 80, 0);
  buildingGroup.add(interiorLight);

  scene.add(buildingGroup);
  return buildingGroup;
}

// ── Neon horizontal trim every 10 floors ──────────────────
function addNeonTrim(group, mat) {
  for (let y = 10; y < 155; y += 20) {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(23.2, 0.3, 23.2),
      mat
    );
    trim.position.y = y;
    group.add(trim);
  }
}

// ── "INSURCORP" sign ──────────────────────────────────────
function addNeonSign(group, mat) {
  // Sign backing
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(18, 3, 0.5),
    mat
  );
  sign.position.set(0, 128, 11.5);
  group.add(sign);

  // Glow light behind sign
  const signLight = new THREE.PointLight(0x00d4ff, 4, 40);
  signLight.position.set(0, 128, 9);
  group.add(signLight);
}

// ── Lobby ─────────────────────────────────────────────────
function buildLobby(group, steelMat, neonMat) {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.1, metalness: 0.9 })
  );
  floor.position.set(0, 0.1, 0);
  group.add(floor);

  // Reception desk
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.5, 2),
    steelMat
  );
  desk.position.set(0, 0.75, -4);
  group.add(desk);

  // Desk neon strip
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.1, 0.1),
    neonMat
  );
  strip.position.set(0, 1.5, -3);
  group.add(strip);

  // Door frame
  door = new THREE.Group();
  const leftDoor = new THREE.Mesh(
    new THREE.BoxGeometry(4, 8, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x001a33, transparent: true, opacity: 0.6, metalness: 0.9, roughness: 0.05 })
  );
  leftDoor.position.x = -2;
  const rightDoor = leftDoor.clone();
  rightDoor.position.x = 2;
  door.add(leftDoor, rightDoor);
  door.position.set(0, 4, 11);
  group.add(door);

  // Door light
  const doorLight = new THREE.SpotLight(0x00d4ff, 3, 20, Math.PI / 6);
  doorLight.position.set(0, 10, 11);
  doorLight.target.position.set(0, 0, 11);
  group.add(doorLight, doorLight.target);
}

// ── Elevator Shaft ────────────────────────────────────────
function buildElevatorShaft(group) {
  // Shaft walls (transparent)
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x001122,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.8,
  });

  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(4, 160, 4),
    shaftMat
  );
  shaft.position.set(6, 75, 0);
  group.add(shaft);

  // Elevator car
  elevator = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 3, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x0d1a2e, metalness: 0.9, roughness: 0.1 })
  );
  elevator.position.set(6, 2, 0);
  group.add(elevator);

  elevatorLight = new THREE.PointLight(0xffd080, 1.5, 8);
  elevatorLight.position.set(6, 4, 0);
  group.add(elevatorLight);

  // Floor counter panels
  for (let f = 0; f < 27; f++) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.4, 3.6),
      new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.3,
      })
    );
    panel.position.set(7.8, f * 5.5 + 3, 0);
    group.add(panel);
  }
}

// ── Risk Department — Floor 27 ─────────────────────────────
function buildRiskRoom(group, steelMat, neonMat) {
  const roomGroup = new THREE.Group();
  roomGroup.position.set(0, 107, 0);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x080d14, roughness: 0.05, metalness: 0.95 })
  );
  roomGroup.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.9 })
  );
  ceiling.position.y = 5;
  roomGroup.add(ceiling);

  // Holographic table
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.15, 32),
    new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
      metalness: 1,
      roughness: 0,
    })
  );
  table.position.set(0, 0.6, 0);
  roomGroup.add(table);

  // Table light
  const tableLight = new THREE.PointLight(0x00d4ff, 3, 15);
  tableLight.position.set(0, 2, 0);
  roomGroup.add(tableLight);

  // Wall screens (3)
  const screenPositions = [
    { x: -9.9, y: 2.5, z: 0, ry: Math.PI / 2 },
    { x:  9.9, y: 2.5, z: 0, ry: -Math.PI / 2 },
    { x:  0,   y: 2.5, z: -9.9, ry: 0 },
  ];

  screenPositions.forEach(({ x, y, z, ry }) => {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4),
      new THREE.MeshStandardMaterial({
        color: 0x001122,
        emissive: 0x003366,
        emissiveIntensity: 1.2,
      })
    );
    screen.position.set(x, y, z);
    screen.rotation.y = ry;
    roomGroup.add(screen);

    const screenLight = new THREE.RectAreaLight(0x0066ff, 1.5, 8, 4);
    screenLight.position.set(x, y, z);
    screenLight.lookAt(0, y, 0);
    roomGroup.add(screenLight);
  });

  // "FLOOR 27 — RISK DEPT" neon sign
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xff4040,
    emissive: 0xff2020,
    emissiveIntensity: 2.0,
  });
  const floorSign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.5, 0.2),
    signMat
  );
  floorSign.position.set(0, 4.8, -9.8);
  roomGroup.add(floorSign);

  group.add(roomGroup);
  return roomGroup;
}

// ── Animate elevator ─────────────────────────────────────
export function setElevatorFloor(progress) {
  // progress 0→1 maps elevator from ground (y=2) to floor27 (y=110)
  if (!elevator) return;
  const y = 2 + progress * 108;
  elevator.position.y = y;
  if (elevatorLight) elevatorLight.position.y = y + 2;
}

// ── Open/close door ───────────────────────────────────────
export function setDoorOpen(progress) {
  if (!door) return;
  door.children[0].position.x = -2 - progress * 3.5;
  door.children[1].position.x =  2 + progress * 3.5;
}
