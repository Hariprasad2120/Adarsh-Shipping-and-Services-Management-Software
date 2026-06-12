"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

type HarborStep =
  | "approaching"
  | "berthed"
  | "moving_to_ship"
  | "lowering_to_ship"
  | "grabbing"
  | "lifting"
  | "holding_high"
  | "moving_to_truck"
  | "lowering_to_truck"
  | "releasing"
  | "departing"
  | "failed";

interface HarborScene3DProps {
  email: string;
  password: string;
  isTyping: boolean;
  isTypingPassword: boolean;
  isAuthenticated: boolean;
  error: string;
  mousePos: { x: number; y: number };
}

const TROLLEY_X = { park: 0, ship: 9.8, truck: -5 };
const HOIST_Y = { up: -1.4, ship: -4.0, truck: -5.1 };
const TRUCK_X = { enter: -26, park: -5, exit: -30 };
// Ship berths parallel to the quay, arriving along the berth line.
const SHIP_BERTH_X = 9.8;
const SHIP_Z = { enter: -38, berth: 0 };

// Monochrome palette — soft whites and greys only. The single exception is
// the cargo outline, which tints green/red as functional auth feedback.
const OUTLINE_IDLE = 0x565a5e;
const OUTLINE_OK = 0x2e7d4f;
const OUTLINE_BAD = 0xb3402f;

/** Per-theme studio palette: bright porcelain vs. graphite night. */
const THEMES = {
  light: {
    bg: 0xf1f2f0,
    water: 0xd9e0e3,
    hemiSky: 0xffffff,
    hemiGround: 0xd6d6d3,
    hemiIntensity: 0.9,
    keyColor: 0xffffff,
    keyIntensity: 2.2,
    stars: 0,
    exposure: 1.0,
  },
  dark: {
    bg: 0x1b1e21,
    water: 0x252a2e,
    hemiSky: 0x3c4147,
    hemiGround: 0x141618,
    hemiIntensity: 0.55,
    keyColor: 0xdfe6ee,
    keyIntensity: 1.15,
    stars: 0.65,
    exposure: 1.05,
  },
} as const;

function matte(color: number, roughness = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.06 });
}

const M = {
  white: () => matte(0xf6f6f4),
  bone: () => matte(0xe9e9e6),
  silver: () => matte(0xd4d6d4),
  grey: () => matte(0xb8bab8),
  slate: () => matte(0x9a9da0, 0.82),
  graphite: () => matte(0x6f7376, 0.75),
  dark: () => matte(0x44484c, 0.65),
};

/** Sharp-edged box. No rounding anywhere — crisp architectural-model look. */
function box(w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Cylinder strut between two points — stays, braces, A-frame legs. */
function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

/** Canvas texture for signage / container decals. */
function makeLabelTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 256,
  h = 128,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return { tex, canvas, ctx };
}

interface ContainerParts {
  group: THREE.Group;
  edges?: THREE.LineBasicMaterial;
}

/** Sharp corrugated container in a grey shade; optional pulsing outline. */
function buildContainer(shade: number, withEdges = false): ContainerParts {
  const group = new THREE.Group();
  const body = box(2.4, 1.0, 1.2, matte(shade));
  group.add(body);

  // Corrugation ribs a half-tone darker.
  const ribShade = new THREE.Color(shade).multiplyScalar(0.93).getHex();
  const ribMat = matte(ribShade);
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const rib = box(0.05, 1.02, 1.22, ribMat);
    rib.position.x = i * 0.25;
    group.add(rib);
  }
  // Corner castings.
  const cornerMat = M.graphite();
  for (const x of [-1.18, 1.18]) {
    for (const y of [-0.46, 0.46]) {
      const casting = box(0.1, 0.1, 1.24, cornerMat);
      casting.position.set(x, y, 0);
      group.add(casting);
    }
  }

  const parts: ContainerParts = { group };
  if (withEdges) {
    const edges = new THREE.LineBasicMaterial({
      color: OUTLINE_IDLE,
      transparent: true,
      opacity: 0.8,
    });
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.44, 1.04, 1.24)),
      edges,
    );
    group.add(lines);
    parts.edges = edges;
  }
  return parts;
}

function buildShip() {
  const ship = new THREE.Group();

  // Real hull form: plan-view curve with a pointed bow and rounded stern,
  // extruded vertically. Local +x is the bow; the group is rotated 90° at
  // placement so the hull lies parallel to the quay.
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-5.8, -1.45);
  hullShape.lineTo(2.6, -1.45);
  hullShape.quadraticCurveTo(4.7, -1.3, 6.3, 0);
  hullShape.quadraticCurveTo(4.7, 1.3, 2.6, 1.45);
  hullShape.lineTo(-5.8, 1.45);
  hullShape.quadraticCurveTo(-6.45, 0, -5.8, -1.45);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 1.75,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.12,
    bevelSegments: 2,
    curveSegments: 16,
  });
  hullGeo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, M.white());
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.position.y = -0.55;
  ship.add(hull);

  // Deck plate, slightly inset.
  const deckGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 16,
  });
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.94, 1, 0.9);
  const deck = new THREE.Mesh(deckGeo, M.silver());
  deck.receiveShadow = true;
  deck.position.y = 1.32;
  ship.add(deck);

  // Aft superstructure — stepped white tower with bridge.
  const tier1 = box(2.0, 0.9, 2.5, M.white());
  tier1.position.set(-4.3, 1.85, 0);
  ship.add(tier1);
  const tier2 = box(1.7, 0.8, 2.2, M.bone());
  tier2.position.set(-4.3, 2.7, 0);
  ship.add(tier2);
  const bridge = box(1.5, 0.7, 2.7, M.white());
  bridge.position.set(-4.3, 3.45, 0);
  ship.add(bridge);

  // Bridge glazing: forward face (towards the bow) and aft face strip.
  const glassMat = M.dark();
  const glassFwd = box(0.05, 0.3, 2.5, glassMat);
  glassFwd.position.set(-3.52, 3.55, 0);
  ship.add(glassFwd);
  const glassAft = box(0.05, 0.24, 2.2, glassMat);
  glassAft.position.set(-5.08, 3.5, 0);
  ship.add(glassAft);

  // Funnel with a graphite cap band.
  const funnel = box(0.6, 0.95, 1.05, M.grey());
  funnel.position.set(-4.75, 4.3, 0);
  ship.add(funnel);
  const funnelCap = box(0.64, 0.16, 1.09, M.graphite());
  funnelCap.position.set(-4.75, 4.72, 0);
  ship.add(funnelCap);

  // Mast + rotating radar bar (spun in the render loop).
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.0, 6), M.slate());
  mast.position.set(-4.0, 4.3, 0);
  ship.add(mast);
  const radar = box(0.8, 0.05, 0.1, M.graphite());
  radar.position.set(-4.0, 4.85, 0);
  ship.add(radar);

  // Forecastle mast.
  const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.9, 6), M.slate());
  foreMast.position.set(5.0, 1.85, 0);
  ship.add(foreMast);

  // Deck cargo bays. The ship group is rotated 90° at placement, so every
  // box counter-rotates to keep its long axis matching the spreader.
  const shades = [0xeeeeec, 0xd8dad8, 0xc4c6c4, 0xb2b4b2];
  const bays = [-3.0, -1.5, 0, 1.5, 3.0];
  bays.forEach((bx, i) => {
    const { group } = buildContainer(shades[i % shades.length]);
    group.position.set(bx, 1.92, 0);
    group.rotation.y = -Math.PI / 2;
    ship.add(group);
  });
  for (const bx of [-1.5, 1.5]) {
    const { group } = buildContainer(shades[(bx + 4) % shades.length | 0]);
    group.position.set(bx, 2.96, 0);
    group.rotation.y = -Math.PI / 2;
    ship.add(group);
  }

  // The SECURE target container — middle bay, top tier, world z = 0 so the
  // spreader lines up exactly.
  const target = buildContainer(0xfafaf8, true);
  target.group.position.set(0, 2.96, 0);
  target.group.rotation.y = -Math.PI / 2;
  ship.add(target.group);

  const secureLabel = makeLabelTexture((ctx, w, h) => {
    ctx.fillStyle = "rgba(250,250,249,0.96)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#565a5e";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = "#3c4043";
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SECURE", w / 2, h / 2 + 14);
  });
  const securePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.66),
    new THREE.MeshBasicMaterial({ map: secureLabel.tex, transparent: true, opacity: 0.96 }),
  );
  securePlate.position.set(0, 0, 0.62);
  target.group.add(securePlate);

  // Stern nameplate — faces the camera once berthed.
  const nameLabel = makeLabelTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#6f7376";
      ctx.font = "900 50px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ADARSH", w / 2, h / 2 + 6);
      ctx.fillStyle = "#9a9da0";
      ctx.font = "bold 22px monospace";
      ctx.fillText("DE-4", w / 2, h / 2 + 34);
    },
    512,
    128,
  );
  const namePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.55),
    new THREE.MeshBasicMaterial({ map: nameLabel.tex, transparent: true, opacity: 0.9 }),
  );
  namePlate.position.set(-6.12, 0.7, 0);
  namePlate.rotation.y = -Math.PI / 2;
  ship.add(namePlate);

  return { ship, shipTarget: target.group, shipTargetEdges: target.edges!, radar };
}

function buildCrane(scene: THREE.Scene) {
  // Whole crane is one group so the gantry can travel along its rails (z).
  const crane = new THREE.Group();
  const frame = M.bone();
  const heavy = M.silver();
  const dark = M.graphite();

  // Main girder + boom over the water.
  const beam = box(21, 0.75, 1.5, frame);
  beam.position.set(2, 8, 0);
  crane.add(beam);
  for (const x of [-8.1, 12.1]) {
    const tip = box(0.8, 0.85, 1.56, heavy);
    tip.position.set(x, 8, 0);
    crane.add(tip);
  }

  // Portal legs — one bogie under EACH leg so the truck lane stays clear.
  for (const legX of [-7, 5]) {
    for (const legZ of [-1.4, 1.4]) {
      const leg = box(0.55, 8, 0.5, frame);
      leg.position.set(legX, 4, legZ);
      crane.add(leg);

      const band = box(0.58, 0.5, 0.53, dark);
      band.position.set(legX, 1.0, legZ);
      crane.add(band);

      const bogie = box(1.9, 0.5, 0.85, M.dark());
      bogie.position.set(legX, 0.26, legZ);
      crane.add(bogie);
    }
    const portalBeam = box(0.5, 0.5, 3.3, frame);
    portalBeam.position.set(legX, 3.1, 0);
    crane.add(portalBeam);
    for (const dir of [1, -1]) {
      const brace = box(0.14, 2.6, 0.12, heavy);
      brace.position.set(legX, 5.2, 0);
      brace.rotation.x = dir * 0.55;
      crane.add(brace);
    }
  }

  // Machinery house + A-frame pylon + tie-rod stays — STS silhouette.
  const house = box(3.0, 1.0, 1.6, frame);
  house.position.set(-0.6, 8.9, 0);
  crane.add(house);
  const vent = box(0.7, 0.25, 1.0, dark);
  vent.position.set(-0.6, 9.55, 0);
  crane.add(vent);

  const apex = new THREE.Vector3(2, 11.4, 0);
  for (const z of [-0.5, 0.5]) {
    crane.add(rod(new THREE.Vector3(1.0, 8.3, z), apex, 0.13, frame));
    crane.add(rod(new THREE.Vector3(3.2, 8.3, z), apex, 0.13, frame));
  }
  const apexCap = box(0.6, 0.5, 1.3, heavy);
  apexCap.position.copy(apex);
  crane.add(apexCap);
  const apexBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const apexBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), apexBeaconMat);
  apexBeacon.position.set(2, 11.75, 0);
  crane.add(apexBeacon);

  const stayMat = M.slate();
  crane.add(rod(new THREE.Vector3(2, 11.2, 0), new THREE.Vector3(12.1, 8.35, 0), 0.035, stayMat));
  crane.add(rod(new THREE.Vector3(2, 11.2, 0), new THREE.Vector3(-7.9, 8.35, 0), 0.035, stayMat));

  const sheave = box(0.6, 0.5, 0.9, dark);
  sheave.position.set(12.1, 7.55, 0);
  crane.add(sheave);

  // Trolley rides under the girder; operator cab travels with it.
  const trolley = new THREE.Group();
  trolley.position.set(TROLLEY_X.park, 7.4, 0);

  const trolleyBody = box(1.6, 0.55, 1.7, M.dark());
  trolleyBody.position.y = 0.1;
  trolley.add(trolleyBody);

  const cab = box(0.85, 0.7, 0.6, dark);
  cab.position.set(0, -0.5, 0.75);
  trolley.add(cab);
  const cabGlass = box(0.6, 0.32, 0.05, M.dark());
  cabGlass.position.set(0, -0.55, 1.06);
  cabGlass.rotation.x = -0.25;
  trolley.add(cabGlass);

  const cableGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 6);
  const cableMat = M.slate();
  const cables = [-0.6, 0.6].map((x) => {
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.x = x;
    trolley.add(cable);
    return cable;
  });

  const hoist = new THREE.Group();
  hoist.position.y = HOIST_Y.up;

  const spreader = box(2.7, 0.3, 1.3, dark);
  hoist.add(spreader);

  // Twist-lock indicator lamps — flash white while locking.
  const lockMats: THREE.MeshStandardMaterial[] = [];
  for (const x of [-1.28, 1.28]) {
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), lampMat);
    lamp.position.set(x, 0, 0);
    hoist.add(lamp);
    lockMats.push(lampMat);
  }

  // Alignment scan beams shown during the grab.
  const laserGroup = new THREE.Group();
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const x of [-0.9, -0.3, 0.3, 0.9]) {
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 0.02), laserMat);
    ray.position.set(x, -0.6, 0);
    laserGroup.add(ray);
  }
  laserGroup.visible = false;
  hoist.add(laserGroup);

  const carried = buildContainer(0xfafaf8, true);
  carried.group.position.y = -0.68;
  carried.group.visible = false;
  hoist.add(carried.group);

  const cargoLabel = makeLabelTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#5a5e62";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ADSH-CARGO", w / 2, h / 2);
  });
  const cargoPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.85),
    new THREE.MeshBasicMaterial({ map: cargoLabel.tex, transparent: true, opacity: 0.95 }),
  );
  cargoPlate.position.set(0, 0, 0.62);
  carried.group.add(cargoPlate);

  trolley.add(hoist);
  crane.add(trolley);
  scene.add(crane);

  return {
    crane,
    trolley,
    hoist,
    cables,
    carried: carried.group,
    carriedEdges: carried.edges!,
    lockMats,
    laserGroup,
    cargoLabel,
    apexBeaconMat,
  };
}

function buildTruck() {
  const truck = new THREE.Group();

  const chassis = box(5.2, 0.25, 1.3, M.graphite());
  chassis.position.set(-0.2, 0.95, 0);
  truck.add(chassis);

  // Trailer cross-members.
  for (const x of [-0.9, 0.4, 1.7]) {
    const member = box(0.12, 0.18, 1.34, M.slate());
    member.position.set(x, 0.95, 0);
    truck.add(member);
  }
  // Reflective marker blocks, alternating white/graphite.
  for (let i = 0; i < 6; i++) {
    const block = box(0.3, 0.09, 0.03, i % 2 === 0 ? M.white() : M.graphite());
    block.position.set(-0.9 + i * 0.55, 0.95, 0.67);
    truck.add(block);
  }

  // Cab — white with a dark windshield slab.
  const cabBody = box(1.6, 1.35, 1.5, M.white());
  cabBody.position.set(-2.35, 1.1, 0);
  truck.add(cabBody);
  const cabRoof = box(1.2, 0.18, 1.3, M.bone());
  cabRoof.position.set(-2.3, 1.85, 0);
  truck.add(cabRoof);
  const windshield = box(0.06, 0.5, 1.3, M.dark());
  windshield.position.set(-3.16, 1.42, 0);
  truck.add(windshield);
  const grille = box(0.05, 0.3, 1.1, M.silver());
  grille.position.set(-3.17, 0.85, 0);
  truck.add(grille);

  // Exhaust stack + roof beacon (white pulse).
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 8), M.slate());
  stack.position.set(-1.6, 2.0, 0.55);
  truck.add(stack);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), beaconMat);
  beacon.position.set(-2.3, 2.02, 0);
  truck.add(beacon);

  // Headlight: soft white cone + real spotlight.
  const headConeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const headCone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6.0, 18, 1, true), headConeMat);
  headCone.rotation.z = -Math.PI / 2;
  headCone.position.set(-6.2, 0.85, 0);
  truck.add(headCone);

  const headlight = new THREE.SpotLight(0xffffff, 0, 15, 0.5, 0.7, 1.6);
  headlight.position.set(-3.1, 1.0, 0);
  const headTargetObj = new THREE.Object3D();
  headTargetObj.position.set(-12, 0.2, 0);
  truck.add(headTargetObj);
  headlight.target = headTargetObj;
  truck.add(headlight);

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = matte(0x3a3d40, 0.95);
  const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = M.silver();

  const wheels: THREE.Mesh[] = [];
  for (const x of [-2.4, 0.7, 1.7]) {
    for (const z of [-0.64, 0.64]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.castShadow = true;
      wheel.position.set(x, 0.42, z);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      wheel.add(hub);
      truck.add(wheel);
      wheels.push(wheel);
    }
  }

  // Exhaust puffs — animated in the render loop.
  const smokeTex = makeLabelTexture(
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      grad.addColorStop(0, "rgba(150,155,160,0.6)");
      grad.addColorStop(1, "rgba(150,155,160,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    64,
    64,
  );
  const smoke: { sprite: THREE.Sprite; offset: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex.tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(-1.6, 2.55, 0.55);
    sprite.scale.setScalar(0.3);
    truck.add(sprite);
    smoke.push({ sprite, offset: i / 6 });
  }

  // Cargo riding on the bed after release.
  const bed = buildContainer(0xfafaf8, true);
  bed.group.position.set(0.2, 1.62, 0);
  bed.group.visible = false;
  truck.add(bed.group);

  truck.position.set(TRUCK_X.enter, 0, 0);
  return {
    truck,
    wheels,
    truckBox: bed.group,
    truckBoxEdges: bed.edges!,
    beaconMat,
    headConeMat,
    headlight,
    smoke,
  };
}

function buildEnvironment(scene: THREE.Scene) {
  // Gently rolling water — vertex swell, no other motion.
  const waterGeo = new THREE.PlaneGeometry(160, 90, 90, 50);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0xd9e0e3,
    roughness: 0.42,
    metalness: 0.08,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.95;
  water.receiveShadow = true;
  scene.add(water);
  const waterBase = (waterGeo.attributes.position.array as Float32Array).slice();

  // Deep pier apron — the foreground is working dock, not open water.
  const pier = box(28, 1.4, 14, M.bone());
  pier.position.set(-6, -0.7, 0.8);
  scene.add(pier);

  // Quay edge: graphite cap strip + pale hazard band.
  const edgeCap = box(0.3, 0.08, 14, M.graphite());
  edgeCap.position.set(7.86, 0.02, 0.8);
  scene.add(edgeCap);
  const hazard = box(0.5, 0.03, 14, M.silver());
  hazard.position.set(7.4, 0.015, 0.8);
  scene.add(hazard);

  // Crane rails.
  const railMat = M.graphite();
  for (const x of [-7, 5]) {
    const rail = box(0.16, 0.07, 13.4, railMat);
    rail.position.set(x, 0.035, 0.8);
    scene.add(rail);
  }

  // Bollards along the berth.
  const bollardGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.32, 10);
  const bollardMat = M.dark();
  for (const z of [-4.5, -1.8, 0.9, 3.6, 6.3]) {
    const bollard = new THREE.Mesh(bollardGeo, bollardMat);
    bollard.castShadow = true;
    bollard.position.set(7.5, 0.16, z);
    scene.add(bollard);
  }

  // Rubber fenders on the quay wall.
  const fenderGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.1, 10);
  const fenderMat = matte(0x3a3d40, 0.95);
  for (const z of [-3.4, -0.8, 1.8, 4.4]) {
    const fender = new THREE.Mesh(fenderGeo, fenderMat);
    fender.position.set(8.06, -0.35, z);
    scene.add(fender);
  }

  // Storage yard stacks.
  const shades = [0xeeeeec, 0xd8dad8, 0xc4c6c4, 0xb2b4b2];
  shades.forEach((shade, i) => {
    const { group } = buildContainer(shade);
    group.position.set(-15.5 + (i % 2) * 2.7, 0.55 + Math.floor(i / 2) * 1.06, -1.9);
    group.rotation.y = (i % 2) * 0.04;
    scene.add(group);
  });

  // Bay signage boards — quiet grey typography.
  const baySigns = [
    { text: "BAY AA-01 · CHEMICALS", x: -12.5 },
    { text: "BAY BB-04 · FAST LOGISTICS", x: -2.5 },
  ];
  for (const bay of baySigns) {
    const label = makeLabelTexture(
      (ctx, w, h) => {
        ctx.fillStyle = "rgba(250,250,249,0.95)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#b8bab8";
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.fillStyle = "#6f7376";
        ctx.font = "bold 25px monospace";
        ctx.textAlign = "center";
        ctx.fillText(bay.text, w / 2, h / 2 + 9);
      },
      512,
      80,
    );
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.5),
      new THREE.MeshBasicMaterial({ map: label.tex, transparent: true }),
    );
    board.position.set(bay.x, 2.4, -2.9);
    scene.add(board);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.4, 6), M.slate());
    pole.position.set(bay.x, 1.2, -2.95);
    scene.add(pole);
  }

  // Light masts as set dressing (no coloured light in the studio look).
  for (const x of [-16, 8.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7.6, 8), M.bone());
    pole.position.set(x, 3.8, -2.6);
    pole.castShadow = true;
    scene.add(pole);
    const head = box(1.0, 0.35, 0.45, M.silver());
    head.position.set(x, 7.6, -2.4);
    scene.add(head);
  }

  // Distant ship crossing the horizon — slow ambient life.
  const bgShip = new THREE.Group();
  const bgHull = box(8, 1.0, 1.6, M.slate());
  bgHull.position.y = 0.4;
  bgShip.add(bgHull);
  const bgHouse = box(1.0, 1.0, 1.4, M.grey());
  bgHouse.position.set(-2.8, 1.4, 0);
  bgShip.add(bgHouse);
  const bgStack = box(4, 0.55, 1.2, M.silver());
  bgStack.position.set(1.0, 1.15, 0);
  bgShip.add(bgStack);
  bgShip.position.set(-40, -0.5, -26);
  scene.add(bgShip);

  // Star field for the dark theme.
  const starCount = 200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 140;
    starPos[i * 3 + 1] = 14 + Math.random() * 30;
    starPos[i * 3 + 2] = -30 - Math.random() * 30;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xe8edf2,
    size: 0.1,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starsMat);
  scene.add(stars);

  return { waterGeo, waterBase, waterMat, starsMat, bgShip };
}

export function HarborScene3D({
  email,
  password,
  isTyping,
  isTypingPassword,
  isAuthenticated,
  error,
  mousePos,
}: HarborScene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(mousePos);
  const [step, setStep] = useState<HarborStep>("approaching");
  const [webglFailed, setWebglFailed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Follow the app theme: html.dark class first, OS preference as fallback.
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () =>
      root.classList.contains("dark") ||
      (!root.classList.contains("light") && media.matches);
    const timer = setTimeout(() => setIsDark(compute()), 0);
    const observer = new MutationObserver(() => setIsDark(compute()));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    const onMedia = () => setIsDark(compute());
    media.addEventListener("change", onMedia);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);

  const refs = useRef<{
    ship: THREE.Group;
    shipTarget: THREE.Group;
    shipTargetEdges: THREE.LineBasicMaterial;
    radar: THREE.Mesh;
    bgShip: THREE.Group;
    crane: THREE.Group;
    trolley: THREE.Group;
    hoist: THREE.Group;
    cables: THREE.Mesh[];
    carried: THREE.Group;
    carriedEdges: THREE.LineBasicMaterial;
    lockMats: THREE.MeshStandardMaterial[];
    laserGroup: THREE.Group;
    cargoLabel: { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement };
    apexBeaconMat: THREE.MeshStandardMaterial;
    truck: THREE.Group;
    truckBox: THREE.Group;
    truckBoxEdges: THREE.LineBasicMaterial;
    truckBeacon: THREE.MeshStandardMaterial;
    headConeMat: THREE.MeshBasicMaterial;
    headlight: THREE.SpotLight;
    smoke: { sprite: THREE.Sprite; offset: number }[];
    wheels: THREE.Mesh[];
    camShift: { x: number; y: number; z: number };
    camLook: { x: number; y: number; z: number };
    camBase: { x: number; y: number; z: number };
    theme: {
      scene: THREE.Scene;
      fog: THREE.Fog;
      hemi: THREE.HemisphereLight;
      key: THREE.DirectionalLight;
      waterMat: THREE.MeshStandardMaterial;
      starsMat: THREE.PointsMaterial;
      renderer: THREE.WebGLRenderer;
    };
    wheelsSpinning: boolean;
    engineOn: boolean;
    timeline: gsap.core.Timeline | null;
    loops: gsap.core.Tween[];
  } | null>(null);

  useEffect(() => {
    mouseRef.current = mousePos;
  }, [mousePos]);

  // Print whoever is logging in onto the carried container.
  useEffect(() => {
    const R = refs.current;
    if (!R) return;
    const { ctx, canvas, tex } = R.cargoLabel;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#5a5e62";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ADSH-CARGO", canvas.width / 2, canvas.height / 2 - 8);
    const user = email.split("@")[0].slice(0, 14).toUpperCase();
    if (user) {
      ctx.fillStyle = "#8a8e92";
      ctx.font = "bold 22px monospace";
      ctx.fillText(user, canvas.width / 2, canvas.height / 2 + 24);
    }
    tex.needsUpdate = true;
  }, [email]);

  // Build the scene once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      const failTimer = setTimeout(() => setWebglFailed(true), 0);
      return () => clearTimeout(failTimer);
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f2f0);
    const fog = new THREE.Fog(0xf1f2f0, 40, 104);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      160,
    );

    // Frame the full port (crane span + berthed ship) regardless of panel aspect.
    const camBase = { x: 0.5, y: 6.4, z: 34 };
    const fitCamera = () => {
      const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      const halfWidth = 16.5;
      const dist = THREE.MathUtils.clamp(
        halfWidth / (Math.tan(THREE.MathUtils.degToRad(21)) * aspect),
        24,
        46,
      );
      camBase.z = dist;
      fog.near = dist + 6;
      fog.far = dist + 64;
    };
    fitCamera();
    camera.position.set(camBase.x, camBase.y, camBase.z);

    // Studio lighting: bright soft hemisphere, crisp white key, gentle fill.
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd6d6d3, 0.9);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(10, 18, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -22;
    key.shadow.camera.right = 22;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 2.5;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-12, 8, -6);
    scene.add(fill);

    const { waterGeo, waterBase, waterMat, starsMat, bgShip } = buildEnvironment(scene);

    const { ship, shipTarget, shipTargetEdges, radar } = buildShip();
    // Parallel to the quay, hard against the fenders; arrives along the berth line.
    ship.position.set(SHIP_BERTH_X, -0.15, SHIP_Z.enter);
    ship.rotation.y = Math.PI / 2;
    scene.add(ship);

    const craneParts = buildCrane(scene);
    // Gantry starts slightly off-bay; it travels into alignment on its rails.
    craneParts.crane.position.z = 1.1;

    const truckParts = buildTruck();
    scene.add(truckParts.truck);

    refs.current = {
      ship,
      shipTarget,
      shipTargetEdges,
      radar,
      bgShip,
      crane: craneParts.crane,
      trolley: craneParts.trolley,
      hoist: craneParts.hoist,
      cables: craneParts.cables,
      carried: craneParts.carried,
      carriedEdges: craneParts.carriedEdges,
      lockMats: craneParts.lockMats,
      laserGroup: craneParts.laserGroup,
      cargoLabel: craneParts.cargoLabel,
      apexBeaconMat: craneParts.apexBeaconMat,
      truck: truckParts.truck,
      truckBox: truckParts.truckBox,
      truckBoxEdges: truckParts.truckBoxEdges,
      truckBeacon: truckParts.beaconMat,
      headConeMat: truckParts.headConeMat,
      headlight: truckParts.headlight,
      smoke: truckParts.smoke,
      wheels: truckParts.wheels,
      camShift: { x: 0, y: 0, z: 0 },
      camLook: { x: -1, y: 3.2, z: 0 },
      camBase,
      theme: { scene, fog, hemi, key, waterMat, starsMat, renderer },
      wheelsSpinning: false,
      engineOn: false,
      timeline: null,
      loops: [],
    };

    const waterPos = waterGeo.attributes.position;
    const lookCur = new THREE.Vector3(-1, 3.2, 0);
    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.elapsedTime;
      const R = refs.current;
      if (!R) return;

      // Rolling swell — kept small so nothing reads as soft-bodied.
      const arr = waterPos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = waterBase[i];
        const y = waterBase[i + 1];
        arr[i + 2] =
          Math.sin(x * 0.32 + t * 1.0) * 0.06 +
          Math.cos(y * 0.28 + t * 0.65) * 0.05;
      }
      waterPos.needsUpdate = true;
      waterGeo.computeVertexNormals();

      // Moored ship: faint rigid waterline drift only.
      R.ship.position.y = -0.15 + Math.sin(t * 0.7) * 0.02;

      // Ambient motion: radar sweep, horizon traffic, beacon breathing.
      R.radar.rotation.y = t * 1.6;
      R.bgShip.position.x = -44 + ((t * 0.7) % 88);
      R.apexBeaconMat.emissiveIntensity = 0.8 + Math.max(0, Math.sin(t * 2.6)) * 1.4;
      R.truckBeacon.emissiveIntensity = 0.6 + Math.max(0, Math.sin(t * 5)) * 1.2;

      // Outline pulses.
      const pulse = 0.45 + (Math.sin(t * 4) + 1) * 0.27;
      R.shipTargetEdges.opacity = pulse;
      R.carriedEdges.opacity = pulse;
      R.truckBoxEdges.opacity = pulse;

      // Cables stretch from trolley to the hoist.
      const drop = -R.hoist.position.y;
      for (const cable of R.cables) {
        cable.scale.y = Math.max(drop, 0.01);
        cable.position.y = R.hoist.position.y / 2;
      }

      if (R.wheelsSpinning) {
        for (const wheel of R.wheels) wheel.rotation.z -= delta * 9;
      }

      // Exhaust puffs while the engine runs.
      const smokeStrength = R.wheelsSpinning ? 1 : R.engineOn ? 0.45 : 0;
      for (const puff of R.smoke) {
        const life = (t * 0.55 + puff.offset) % 1;
        puff.sprite.position.y = 2.5 + life * 1.5;
        puff.sprite.position.x = -1.6 + life * 0.5;
        puff.sprite.scale.setScalar(0.22 + life * 0.8);
        (puff.sprite.material as THREE.SpriteMaterial).opacity =
          smokeStrength * (1 - life) * 0.35;
      }

      // Camera: aspect-fit base + per-step zoom/track + mouse parallax,
      // with a smoothed look-at target for cinematic pans.
      const m = mouseRef.current;
      const targetX = R.camBase.x + R.camShift.x + (m.x - 0.5) * 2.2;
      const targetY = R.camBase.y + R.camShift.y + (0.5 - m.y) * 1.2;
      const targetZ = R.camBase.z + R.camShift.z;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      lookCur.x += (R.camLook.x - lookCur.x) * 0.05;
      lookCur.y += (R.camLook.y - lookCur.y) * 0.05;
      lookCur.z += (R.camLook.z - lookCur.z) * 0.05;
      camera.lookAt(lookCur);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      fitCamera();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      const R = refs.current;
      if (R) {
        R.timeline?.kill();
        R.loops.forEach((tween) => tween.kill());
        gsap.killTweensOf([
          R.trolley.position,
          R.hoist.position,
          R.truck.position,
          R.ship.position,
          R.crane.position,
          R.carried.position,
          R.carried.rotation,
          R.camShift,
          R.camLook,
          R.headConeMat,
          R.headlight,
        ]);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
          (obj as THREE.Mesh).geometry?.dispose();
          const mats = Array.isArray((obj as THREE.Mesh).material)
            ? ((obj as THREE.Mesh).material as THREE.Material[])
            : [(obj as THREE.Mesh).material as THREE.Material];
          mats.forEach((mat) => {
            const mapped = mat as THREE.Material & { map?: THREE.Texture | null };
            mapped.map?.dispose();
            mat.dispose();
          });
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      refs.current = null;
    };
  }, []);

  // Crossfade the studio palette when the app theme changes.
  useEffect(() => {
    const R = refs.current;
    if (!R) return;
    const T = THEMES[isDark ? "dark" : "light"];
    const { theme } = R;
    const d = 1.2;
    const tint = (color: THREE.Color, hex: number) => {
      const c = new THREE.Color(hex);
      gsap.to(color, { r: c.r, g: c.g, b: c.b, duration: d, overwrite: "auto" });
    };
    tint(theme.scene.background as THREE.Color, T.bg);
    tint(theme.fog.color, T.bg);
    tint(theme.waterMat.color, T.water);
    tint(theme.hemi.color, T.hemiSky);
    tint(theme.hemi.groundColor, T.hemiGround);
    tint(theme.key.color, T.keyColor);
    gsap.to(theme.hemi, { intensity: T.hemiIntensity, duration: d, overwrite: "auto" });
    gsap.to(theme.key, { intensity: T.keyIntensity, duration: d, overwrite: "auto" });
    gsap.to(theme.starsMat, { opacity: T.stars, duration: d, overwrite: "auto" });
    gsap.to(theme.renderer, { toneMappingExposure: T.exposure, duration: d, overwrite: "auto" });
  }, [isDark]);

  // ---- State machine (mirrors the reference 2D timeline) ----

  useEffect(() => {
    const timer = setTimeout(() => setStep("berthed"), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isEmailFocused = (isTyping && !isTypingPassword) || (email.length > 0 && password.length === 0);
    if (!(isEmailFocused && step === "berthed")) return;
    const timer = setTimeout(() => setStep("moving_to_ship"), 0);
    return () => clearTimeout(timer);
  }, [isTyping, isTypingPassword, email, password, step]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === "moving_to_ship") timer = setTimeout(() => setStep("lowering_to_ship"), 1000);
    else if (step === "lowering_to_ship") timer = setTimeout(() => setStep("grabbing"), 1000);
    else if (step === "grabbing") timer = setTimeout(() => setStep("lifting"), 800);
    else if (step === "lifting") timer = setTimeout(() => setStep("holding_high"), 1000);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const isPasswordFocused = isTypingPassword || password.length > 0;
    if (!(isPasswordFocused && (step === "holding_high" || step === "berthed" || step === "lifting"))) {
      return;
    }
    const timer = setTimeout(() => setStep("moving_to_truck"), 0);
    return () => clearTimeout(timer);
  }, [isTypingPassword, password, step]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === "moving_to_truck") timer = setTimeout(() => setStep("lowering_to_truck"), 1200);
    else if (step === "lowering_to_truck") timer = setTimeout(() => setStep("releasing"), 1000);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    let next: HarborStep | null = null;
    if (isAuthenticated && step !== "departing") next = "departing";
    else if (error && step !== "failed" && step !== "departing") next = "failed";
    if (!next) return;
    const target = next;
    const timer = setTimeout(() => setStep(target), 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, error, step]);

  useEffect(() => {
    if (!(step === "failed" && !error)) return;
    const timer = setTimeout(() => setStep("holding_high"), 0);
    return () => clearTimeout(timer);
  }, [error, step]);

  // ---- Drive a GSAP timeline + camera choreography from the current step ----

  useEffect(() => {
    const R = refs.current;
    if (!R) return;

    R.timeline?.kill();
    R.loops.forEach((tween) => tween.kill());
    R.loops = [];
    gsap.killTweensOf([R.carried.position, R.carried.rotation]);
    R.carried.position.x = 0;
    R.carried.rotation.z = 0;
    R.laserGroup.visible = false;
    R.lockMats.forEach((mat) => {
      gsap.killTweensOf(mat);
      mat.emissiveIntensity = 0.4;
    });

    const tl = gsap.timeline();
    R.timeline = tl;

    const setOutline = (hex: number) => {
      R.carriedEdges.color.set(hex);
      R.truckBoxEdges.color.set(hex);
    };

    const setHeadlight = (on: boolean) => {
      gsap.to(R.headConeMat, { opacity: on ? 0.1 : 0, duration: 0.5 });
      gsap.to(R.headlight, { intensity: on ? 20 : 0, duration: 0.5 });
    };

    const grabCargo = () => {
      R.shipTarget.visible = false;
      R.carried.visible = true;
    };

    // Camera grammar: camTo = dolly/zoom offset from the fitted base,
    // lookTo = pan target. Negative z zooms in, positive pulls out.
    const camTo = (x: number, y: number, z: number, duration = 1.4) => {
      tl.to(R.camShift, { x, y, z, duration, ease: "power2.inOut" }, 0);
    };
    const lookTo = (x: number, y: number, z: number, duration = 1.4) => {
      tl.to(R.camLook, { x, y, z, duration, ease: "power2.inOut" }, 0);
    };

    switch (step) {
      case "approaching":
        // Glide in along the berth line, decelerating onto the fenders.
        tl.fromTo(
          R.ship.position,
          { z: SHIP_Z.enter },
          { z: SHIP_Z.berth, duration: 2.6, ease: "power3.out" },
          0,
        );
        camTo(3, 0.5, 4, 2.6);
        lookTo(8, 1.5, 1, 2.6);
        break;

      case "berthed":
        camTo(0, 0, 0);
        lookTo(-1, 3.2, 0);
        break;

      case "moving_to_ship":
        // Gantry travels into bay alignment while the trolley runs out.
        tl.to(R.crane.position, { z: 0, duration: 1.0, ease: "power2.inOut" }, 0);
        tl.to(R.trolley.position, { x: TROLLEY_X.ship, duration: 1, ease: "power2.inOut" }, 0);
        camTo(2.5, -0.3, -6);
        lookTo(6, 4.5, 0);
        break;

      case "lowering_to_ship":
        tl.to(R.hoist.position, { y: HOIST_Y.ship, duration: 1, ease: "power2.inOut" }, 0);
        camTo(3.5, -1.2, -11);
        lookTo(9.5, 3, 0);
        break;

      case "grabbing":
        R.laserGroup.visible = true;
        R.lockMats.forEach((mat) => {
          R.loops.push(
            gsap.to(mat, {
              emissiveIntensity: 2.6,
              duration: 0.18,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
            }),
          );
        });
        tl.call(grabCargo, undefined, 0.5);
        camTo(3.5, -1.6, -13, 0.7);
        lookTo(9.8, 2.9, 0, 0.7);
        break;

      case "lifting":
        tl.to(R.hoist.position, { y: HOIST_Y.up, duration: 1, ease: "power2.inOut" }, 0);
        camTo(2, -0.5, -8);
        lookTo(8, 4, 0);
        break;

      case "holding_high":
        // Rigid hold — the spreader locks the box dead still.
        setOutline(OUTLINE_IDLE);
        tl.to(R.hoist.position, { y: HOIST_Y.up, duration: 0.8, ease: "power2.inOut" }, 0);
        camTo(0, 0, 0);
        lookTo(-1, 3.2, 0);
        break;

      case "moving_to_truck":
        grabCargo(); // covers the path where password was typed before the email pickup ran
        tl.to(R.trolley.position, { x: TROLLEY_X.truck, duration: 1.1, ease: "power2.inOut" }, 0);
        camTo(-2.5, -0.3, -5);
        lookTo(-3, 4, 0);
        if (R.truck.position.x < TRUCK_X.park - 1) {
          R.wheelsSpinning = true;
          R.engineOn = true;
          setHeadlight(true);
          tl.to(
            R.truck.position,
            {
              x: TRUCK_X.park,
              duration: 1.6,
              ease: "power3.out",
              onComplete: () => {
                R.wheelsSpinning = false;
              },
            },
            0,
          );
        }
        break;

      case "lowering_to_truck":
        tl.to(R.hoist.position, { y: HOIST_Y.truck, duration: 1, ease: "power2.inOut" }, 0);
        camTo(-3, -1.2, -10);
        lookTo(-5, 2.2, 0);
        break;

      case "releasing":
        tl.call(
          () => {
            R.carried.visible = false;
            R.truckBox.visible = true;
          },
          undefined,
          0.4,
        );
        tl.to(R.hoist.position, { y: HOIST_Y.up, duration: 0.9, ease: "power2.inOut" }, 0.7);
        camTo(-3, -1.4, -11, 0.8);
        lookTo(-5, 1.8, 0, 0.8);
        break;

      case "departing":
        setOutline(OUTLINE_OK);
        R.carried.visible = false;
        R.truckBox.visible = true;
        R.wheelsSpinning = true;
        R.engineOn = true;
        setHeadlight(true);
        tl.to(R.hoist.position, { y: HOIST_Y.up, duration: 0.8, ease: "power2.inOut" }, 0);
        tl.to(R.truck.position, { x: TRUCK_X.exit, duration: 1.9, ease: "power2.in" }, 0.4);
        camTo(0, 1, 6, 2.0);
        lookTo(-8, 1.5, 0, 2.0);
        break;

      case "failed":
        setOutline(OUTLINE_BAD);
        R.truckBox.visible = false;
        R.carried.visible = true;
        tl.to(R.hoist.position, { y: HOIST_Y.truck, duration: 0.6, ease: "power2.inOut" }, 0);
        // Rigid alarm judder — pure translation, no deformation.
        R.loops.push(
          gsap.to(R.carried.position, { x: 0.05, duration: 0.07, yoyo: true, repeat: -1 }),
        );
        camTo(-3, -1, -9, 0.6);
        lookTo(-5, 2, 0, 0.6);
        break;
    }
  }, [step]);

  if (webglFailed) {
    return <div className={`h-full w-full ${isDark ? "bg-[#1b1e21]" : "bg-[#f1f2f0]"}`} />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />

      <div
        className={`pointer-events-none absolute right-10 top-10 flex flex-col items-end gap-0.5 rounded-md border px-3 py-1.5 font-mono text-[9px] font-bold backdrop-blur-md ${
          isDark
            ? "border-white/10 bg-black/40 text-slate-300"
            : "border-black/10 bg-white/70 text-slate-500"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`size-1.5 animate-pulse rounded-full ${isDark ? "bg-white/80" : "bg-slate-500"}`}
          />
          <span>PORT DE-4 SYSTEMS</span>
        </div>
        <span
          className={`mt-0.5 text-[7.5px] font-bold uppercase leading-none tracking-widest ${
            isDark ? "text-slate-400" : "text-slate-400"
          }`}
        >
          STATUS: {step.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      <div
        className={`pointer-events-none absolute bottom-8 right-10 font-mono text-[9px] font-bold uppercase tracking-wider ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        [ PORT OPERATIONS — LIVE ]
      </div>
    </div>
  );
}
