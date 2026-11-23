import * as THREE from 'three';
import { OstLetter } from '../types/game';
import { ProceduralTextureSet } from './textures';

export interface LimbRig {
  hip: THREE.Group;
  shin: THREE.Group;
  superBoot: THREE.Group;
}

export interface ArmRig {
  shoulder: THREE.Group;
  forearm: THREE.Group;
}

export interface RunnerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup: THREE.Group;
  head: THREE.Group;
  leftArm: ArmRig;
  rightArm: ArmRig;
  leftLeg: LimbRig;
  rightLeg: LimbRig;
  hoverboard: THREE.Group;
  jetpack: THREE.Group;
  jetpackFlameL: THREE.Mesh;
  jetpackFlameR: THREE.Mesh;
  boardPrimaryMat: THREE.MeshStandardMaterial;
  boardAccentMat: THREE.MeshStandardMaterial;
  shadowPlane: THREE.Mesh;
}

export interface ChaserRig {
  root: THREE.Group;
  inspector: THREE.Group;
  inspLeftArm: THREE.Group;
  inspRightArm: THREE.Group;
  inspLeftLeg: THREE.Group;
  inspRightLeg: THREE.Group;
  dog: THREE.Group;
  dogLegs: THREE.Mesh[];
}

export interface SharedGameAssets {
  coinDiscGeo: THREE.BufferGeometry;
  coinRimGeo: THREE.BufferGeometry;
  coinGoldMat: THREE.MeshStandardMaterial;
  coinFaceMat: THREE.MeshStandardMaterial;

  ostRingGeo: THREE.BufferGeometry;
  ostLetterOGeo: THREE.BufferGeometry;
  ostLetterSGeo: THREE.BufferGeometry;
  ostLetterTBarGeo: THREE.BufferGeometry;
  ostLetterTStemGeo: THREE.BufferGeometry;
  ostLetterMat: THREE.MeshStandardMaterial;
  ostHaloMat: THREE.MeshStandardMaterial;

  lowPostGeo: THREE.BufferGeometry;
  lowFootGeo: THREE.BufferGeometry;
  lowPlankGeo: THREE.BufferGeometry;
  lowBeaconGeo: THREE.BufferGeometry;
  orangeMat: THREE.MeshStandardMaterial;
  darkSteelMat: THREE.MeshStandardMaterial;
  barrierStripeMat: THREE.MeshStandardMaterial;
  beaconGlowMat: THREE.MeshStandardMaterial;

  highPostGeo: THREE.BufferGeometry;
  highBarGeo: THREE.BufferGeometry;
  steelMat: THREE.MeshStandardMaterial;

  trainChassisGeo: THREE.BufferGeometry;
  trainWheelGeo: THREE.BufferGeometry;
  trainBodyGeo: THREE.BufferGeometry;
  trainRoofArchGeo: THREE.BufferGeometry;
  trainRoofStripeGeo: THREE.BufferGeometry;
  trainBandGeo: THREE.BufferGeometry;
  trainHvacGeo: THREE.BufferGeometry;
  trainWindshieldGeo: THREE.BufferGeometry;
  trainLampGeo: THREE.BufferGeometry;
  trainDestGeo: THREE.BufferGeometry;
  trainRampGeo: THREE.BufferGeometry;
  trainRampRailGeo: THREE.BufferGeometry;
  hopperSideGeo: THREE.BufferGeometry;
  hopperBackGeo: THREE.BufferGeometry;
  hopperSandGeo: THREE.BufferGeometry;
  trainBodyMats: THREE.MeshStandardMaterial[];
  trainRoofBaseMats: THREE.MeshStandardMaterial[];
  trainRoofStripeMats: THREE.MeshStandardMaterial[];
  trainBandMat: THREE.MeshStandardMaterial;
  trainGlassMat: THREE.MeshStandardMaterial;
  trainHeadlightMat: THREE.MeshStandardMaterial;
  trainLedMat: THREE.MeshStandardMaterial;
  trainRampMat: THREE.MeshStandardMaterial;
  sandMat: THREE.MeshStandardMaterial;

  powerupRingGeo: THREE.BufferGeometry;
  powerupMagnetArcGeo: THREE.BufferGeometry;
  powerupMagnetTipGeo: THREE.BufferGeometry;
  powerupGemGeo: THREE.BufferGeometry;
  powerupBoardGeo: THREE.BufferGeometry;
  powerupShoeGeo: THREE.BufferGeometry;
  powerupJetTankGeo: THREE.BufferGeometry;

  dispose: () => void;
}

function buildSLetterGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.22, 0.34, 0),
    new THREE.Vector3(0.0, 0.42, 0),
    new THREE.Vector3(-0.22, 0.28, 0),
    new THREE.Vector3(-0.14, 0.08, 0),
    new THREE.Vector3(0.14, -0.06, 0),
    new THREE.Vector3(0.24, -0.26, 0),
    new THREE.Vector3(0.0, -0.4, 0),
    new THREE.Vector3(-0.24, -0.32, 0),
  ]);
  return new THREE.TubeGeometry(curve, 24, 0.095, 10, false);
}

export function createSharedGameAssets(textures: ProceduralTextureSet): SharedGameAssets {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Star-Embossed Subway Surfers Coins
  const coinDiscGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.11, 20));
  coinDiscGeo.rotateX(Math.PI / 2);
  const coinRimGeo = track(new THREE.TorusGeometry(0.41, 0.048, 8, 22));
  const coinGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0xb45309,
      emissiveIntensity: 0.28,
    }),
  );
  const coinFaceMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.coinFace,
      roughness: 0.18,
      metalness: 0.72,
      emissive: 0xca8a04,
      emissiveIntensity: 0.24,
    }),
  );

  // OST Word Hunt 3D Letters
  const ostRingGeo = track(new THREE.TorusGeometry(0.62, 0.045, 8, 24));
  const ostLetterOGeo = track(new THREE.TorusGeometry(0.28, 0.1, 12, 22));
  const ostLetterSGeo = track(buildSLetterGeometry());
  const ostLetterTBarGeo = track(new THREE.BoxGeometry(0.56, 0.16, 0.16));
  const ostLetterTStemGeo = track(new THREE.BoxGeometry(0.16, 0.72, 0.16));

  const ostLetterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.65,
    }),
  );
  const ostHaloMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.5,
    }),
  );

  // Barriers
  const lowPostGeo = track(new THREE.BoxGeometry(0.14, 1.05, 0.18));
  const lowFootGeo = track(new THREE.BoxGeometry(0.24, 0.1, 0.65));
  const lowPlankGeo = track(new THREE.BoxGeometry(2.22, 0.48, 0.14));
  const lowBeaconGeo = track(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10));
  const orangeMat = track(
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.48, metalness: 0.15 }),
  );
  const darkSteelMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.5 }),
  );
  const barrierStripeMat = track(
    new THREE.MeshStandardMaterial({ map: textures.barrierStripes, roughness: 0.5, metalness: 0.12 }),
  );
  const beaconGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
  );

  const highPostGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 2.55, 10));
  const highBarGeo = track(new THREE.BoxGeometry(2.38, 0.72, 0.18));
  const steelMat = track(
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.36, metalness: 0.72 }),
  );

  // Subway Train (Rounded Arched Roofs, Ribbed Bands & Sand Hopper Ramp Cars)
  const trainLen = 13.5;
  const trainW = 2.24;
  const trainBodyH = 2.34;

  const trainChassisGeo = track(new THREE.BoxGeometry(trainW * 0.92, 0.36, trainLen * 0.98));
  const trainWheelGeo = track(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12));
  trainWheelGeo.rotateZ(Math.PI / 2);

  const trainBodyGeo = track(new THREE.BoxGeometry(trainW, trainBodyH, trainLen));

  // Curved half-cylinder roof crown sitting at y = 2.74..3.16
  const trainRoofArchGeo = track(
    new THREE.CylinderGeometry(
      trainW * 0.495,
      trainW * 0.495,
      trainLen * 0.99,
      14,
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ),
  );
  trainRoofArchGeo.rotateX(-Math.PI / 2);
  trainRoofArchGeo.scale(1, 0.42, 1);

  const trainRoofStripeGeo = track(new THREE.BoxGeometry(0.62, 0.08, trainLen * 0.985));
  const trainBandGeo = track(new THREE.BoxGeometry(trainW + 0.07, 0.5, 0.24));
  const trainHvacGeo = track(new THREE.BoxGeometry(1.18, 0.16, 1.7));
  const trainWindshieldGeo = track(new THREE.BoxGeometry(1.76, 0.82, 0.12));
  const trainLampGeo = track(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12));
  trainLampGeo.rotateX(Math.PI / 2);
  const trainDestGeo = track(new THREE.BoxGeometry(1.28, 0.22, 0.1));

  // Ribbed Wooden/Steel Ramp (+Math.PI / 2 so it slopes UP toward train front)
  const rampShape = new THREE.Shape();
  rampShape.moveTo(0, 0);
  rampShape.lineTo(5.8, 0);
  rampShape.lineTo(5.8, 3.15);
  rampShape.lineTo(0, 0);
  const trainRampGeo = track(
    new THREE.ExtrudeGeometry(rampShape, { depth: 1.98, bevelEnabled: false }),
  );
  trainRampGeo.rotateY(Math.PI / 2);
  trainRampGeo.translate(-0.99, 0, trainLen / 2 + 5.8);

  // Side steel rails edging the ramp slope
  const rampHyp = Math.hypot(5.8, 3.15);
  const trainRampRailGeo = track(new THREE.BoxGeometry(0.11, 0.22, rampHyp));

  // Open Hopper Freight Side Walls + Sand Mound for Ramp Cars
  const hopperSideGeo = track(new THREE.BoxGeometry(0.16, 2.75, trainLen));
  const hopperBackGeo = track(new THREE.BoxGeometry(trainW, 2.75, 0.22));
  const hopperSandGeo = track(
    new THREE.CylinderGeometry(0.95, 0.95, trainLen - 0.5, 10, 1, false, 0, Math.PI),
  );
  hopperSandGeo.rotateZ(Math.PI / 2);
  hopperSandGeo.rotateY(Math.PI / 2);
  hopperSandGeo.scale(1.0, 0.72, 1.0);

  const trainBodyMats = textures.trainSides.map((tex) =>
    track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.22 })),
  );
  const trainRoofBaseMats = [0xfef3c7, 0xe0f2fe, 0x991b1b].map((color) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.18 })),
  );
  const trainRoofStripeMats = [0xdc2626, 0x38bdf8, 0xf59e0b].map((color) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 })),
  );
  const trainBandMat = track(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 }),
  );
  const trainGlassMat = track(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.14, metalness: 0.85 }),
  );
  const trainHeadlightMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 1.9,
      roughness: 0.18,
    }),
  );
  const trainLedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
      roughness: 0.3,
    }),
  );
  const trainRampMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.rampPlanks,
      roughness: 0.52,
      metalness: 0.18,
    }),
  );
  const sandMat = track(
    new THREE.MeshStandardMaterial({ color: 0xb68144, roughness: 0.92, metalness: 0.02 }),
  );

  // Powerups
  const powerupRingGeo = track(new THREE.TorusGeometry(0.5, 0.05, 8, 20));
  powerupRingGeo.rotateX(Math.PI / 2);
  const powerupMagnetArcGeo = track(new THREE.TorusGeometry(0.28, 0.09, 10, 16, Math.PI));
  const powerupMagnetTipGeo = track(new THREE.BoxGeometry(0.16, 0.22, 0.16));
  const powerupGemGeo = track(new THREE.OctahedronGeometry(0.36, 0));
  const powerupBoardGeo = track(new THREE.BoxGeometry(0.36, 0.08, 0.85));
  const powerupShoeGeo = track(new THREE.BoxGeometry(0.28, 0.24, 0.46));
  const powerupJetTankGeo = track(new THREE.CylinderGeometry(0.11, 0.12, 0.46, 10));

  return {
    coinDiscGeo,
    coinRimGeo,
    coinGoldMat,
    coinFaceMat,
    ostRingGeo,
    ostLetterOGeo,
    ostLetterSGeo,
    ostLetterTBarGeo,
    ostLetterTStemGeo,
    ostLetterMat,
    ostHaloMat,
    lowPostGeo,
    lowFootGeo,
    lowPlankGeo,
    lowBeaconGeo,
    orangeMat,
    darkSteelMat,
    barrierStripeMat,
    beaconGlowMat,
    highPostGeo,
    highBarGeo,
    steelMat,
    trainChassisGeo,
    trainWheelGeo,
    trainBodyGeo,
    trainRoofArchGeo,
    trainRoofStripeGeo,
    trainBandGeo,
    trainHvacGeo,
    trainWindshieldGeo,
    trainLampGeo,
    trainDestGeo,
    trainRampGeo,
    trainRampRailGeo,
    hopperSideGeo,
    hopperBackGeo,
    hopperSandGeo,
    trainBodyMats,
    trainRoofBaseMats,
    trainRoofStripeMats,
    trainBandMat,
    trainGlassMat,
    trainHeadlightMat,
    trainLedMat,
    trainRampMat,
    sandMat,
    powerupRingGeo,
    powerupMagnetArcGeo,
    powerupMagnetTipGeo,
    powerupGemGeo,
    powerupBoardGeo,
    powerupShoeGeo,
    powerupJetTankGeo,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * Stylized Subway Surfers runner (classic Jake-inspired street silhouette):
 * - Oversized expressive head with eyes, brows, grin & spiky hair tufts
 * - Iconic backwards red/cream trucker cap with rear brim & white front panel
 * - Open denim vest layered over white graffiti hoodie + vibrant yellow/cyan back patch
 * - Toggleable Paint Jetpack thrusters, Super Sneakers & Hoverboard
 */
export function createRunnerCharacter(textures: ProceduralTextureSet): RunnerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.78;
  bodyPivot.add(torsoGroup);

  const whiteHoodieMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.68,
    metalness: 0.04,
  });
  const cyanGraphicMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.55,
    metalness: 0.08,
  });
  const denimVestMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.75,
    metalness: 0.05,
  });
  const baggyJeansMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.84,
    metalness: 0.04,
  });
  const jeanCuffMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.8,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf5c89b,
    roughness: 0.56,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.82,
    metalness: 0.04,
  });
  const sneakerRedMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.36,
    metalness: 0.14,
  });
  const soleWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.05,
  });
  const capRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.48,
    metalness: 0.08,
  });
  const capCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.52,
    metalness: 0.05,
  });
  const graffitiGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.42,
    metalness: 0.15,
  });
  const graffitiLimeMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.45,
    metalness: 0.1,
  });
  const darkDetailMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.2,
  });
  const superBootMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.35,
  });

  // Baggy Waistband & Belt
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.35), baggyJeansMat);
  pelvis.position.y = 0.04;
  torsoGroup.add(pelvis);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.06, 0.36), darkDetailMat);
  belt.position.y = 0.11;
  torsoGroup.add(belt);

  // White Hoodie Torso + Front Graphic + Rolled Cream Hood Behind Neck
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.34), whiteHoodieMat);
  chest.position.y = 0.4;
  chest.castShadow = true;
  torsoGroup.add(chest);

  const logoStripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.03), cyanGraphicMat);
  logoStripe.position.set(0, 0.42, -0.175);
  torsoGroup.add(logoStripe);

  for (const dx of [-0.07, 0.07]) {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), sneakerRedMat);
    str.position.set(dx, 0.53, -0.19);
    torsoGroup.add(str);
  }

  // Draped Bright Hoodie Collar (prominent in chase view!)
  const hoodBack = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.085, 8, 16), whiteHoodieMat);
  hoodBack.rotation.x = Math.PI / 2 + 0.32;
  hoodBack.position.set(0, 0.68, 0.07);
  torsoGroup.add(hoodBack);

  // Open Light-Blue Denim Vest Panels
  const vestBack = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.52, 0.12), denimVestMat);
  vestBack.position.set(0, 0.4, 0.13);
  vestBack.castShadow = true;
  torsoGroup.add(vestBack);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.52, 0.36), denimVestMat);
    lapel.position.set(side * 0.21, 0.4, 0.01);
    lapel.castShadow = true;
    torsoGroup.add(lapel);
  }

  // Vibrant Yellow/Green/Cyan Back Graffiti Patch (matches classic chase view silhouette)
  const backPatchBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.05), graffitiGoldMat);
  backPatchBase.position.set(0, 0.39, 0.195);
  torsoGroup.add(backPatchBase);

  const backPatchLime = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.03), graffitiLimeMat);
  backPatchLime.position.set(-0.04, 0.41, 0.22);
  backPatchLime.rotation.z = -0.18;
  torsoGroup.add(backPatchLime);

  const backPatchCyan = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.03), cyanGraphicMat);
  backPatchCyan.position.set(0.06, 0.34, 0.225);
  backPatchCyan.rotation.z = 0.22;
  torsoGroup.add(backPatchCyan);

  // Paint Jetpack Thrusters (toggled when Jetpack powerup is active)
  const jetpack = new THREE.Group();
  jetpack.position.set(0, 0.38, 0.36);
  const jetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const jetBridge = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.16), sneakerRedMat);
  jetpack.add(jetBridge);
  const makeTank = (x: number) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.5, 12), jetMat);
    tank.position.set(x, 0, 0.08);
    jetpack.add(tank);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 10), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(x, -0.45, 0.08);
    jetpack.add(flame);
    return flame;
  };
  const jetpackFlameL = makeTank(-0.17);
  const jetpackFlameR = makeTank(0.17);
  jetpack.visible = false;
  torsoGroup.add(jetpack);

  // Oversized Cartoon Head + Expressive Face + Hair Tufts + Backwards Snapback Cap
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), skinMat);
  skull.scale.set(1.0, 1.04, 0.98);
  skull.castShadow = true;
  head.add(skull);

  for (const ex of [-0.085, 0.085]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), soleWhiteMat);
    eyeWhite.scale.set(0.95, 1.25, 0.55);
    eyeWhite.position.set(ex, 0.015, -0.235);
    head.add(eyeWhite);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), darkDetailMat);
    pupil.position.set(ex, 0.015, -0.26);
    head.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.03), hairMat);
    brow.position.set(ex, 0.082, -0.24);
    brow.rotation.z = ex < 0 ? 0.14 : -0.14;
    head.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), skinMat);
  nose.position.set(0, -0.025, -0.265);
  head.add(nose);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.014, 6, 12, Math.PI),
    soleWhiteMat,
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.082, -0.242);
  head.add(smile);

  for (const [hx, hy, hz, rz] of [
    [-0.14, 0.11, -0.21, 0.4],
    [0.0, 0.13, -0.22, 0.0],
    [0.14, 0.11, -0.21, -0.4],
    [-0.24, 0.05, -0.04, 0.7],
    [0.24, 0.05, -0.04, -0.7],
  ]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 7), hairMat);
    tuft.position.set(hx, hy, hz);
    tuft.rotation.z = rz;
    tuft.rotation.x = -0.35;
    head.add(tuft);
  }

  // Signature Backwards Red & Cream Trucker Cap
  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.285, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    capRedMat,
  );
  capDome.position.set(0, 0.06, 0.01);
  capDome.rotation.x = 0.08;
  head.add(capDome);

  const creamPanel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.28, 0.16, 14, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
    capCreamMat,
  );
  creamPanel.position.set(0, 0.155, 0.02);
  creamPanel.rotation.y = Math.PI;
  creamPanel.rotation.x = 0.08;
  head.add(creamPanel);

  // Prominent backwards brim sticking toward +Z
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.04, 16), capRedMat);
  brim.scale.set(1.06, 1, 1.2);
  brim.position.set(0, 0.075, 0.26);
  brim.rotation.x = 0.14;
  head.add(brim);

  const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), soleWhiteMat);
  capButton.position.set(0, 0.345, 0.03);
  head.add(capButton);

  torsoGroup.add(head);

  const makeArm = (side: -1 | 1): ArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.37, 0.62, 0);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.17, 4, 8), whiteHoodieMat);
    upperArm.position.y = -0.12;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.24, 0);

    const armSkin = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.19, 4, 8), skinMat);
    armSkin.position.y = -0.11;
    armSkin.castShadow = true;
    forearm.add(armSkin);

    const wristband = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.06, 8), sneakerRedMat);
    wristband.position.y = -0.2;
    forearm.add(wristband);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skinMat);
    hand.position.y = -0.26;
    forearm.add(hand);

    shoulder.add(forearm);
    torsoGroup.add(shoulder);
    return { shoulder, forearm };
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  const makeLeg = (side: -1 | 1): LimbRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 0.78, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.128, 0.21, 4, 10), baggyJeansMat);
    thigh.position.y = -0.16;
    thigh.castShadow = true;
    hip.add(thigh);

    const shin = new THREE.Group();
    shin.position.set(0, -0.34, 0);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.18, 4, 10), baggyJeansMat);
    calf.position.y = -0.13;
    calf.castShadow = true;
    shin.add(calf);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.07, 10), jeanCuffMat);
    cuff.position.y = -0.24;
    shin.add(cuff);

    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.4), sneakerRedMat);
    shoeUpper.position.set(0, -0.34, -0.05);
    shoeUpper.castShadow = true;
    shin.add(shoeUpper);

    const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.09, 0.12), soleWhiteMat);
    toeCap.position.set(0, -0.37, -0.22);
    shin.add(toeCap);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.065, 0.43), soleWhiteMat);
    sole.position.set(0, -0.415, -0.05);
    shin.add(sole);

    const superBoot = new THREE.Group();
    const bootShell = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.49), superBootMat);
    bootShell.position.set(0, -0.34, -0.06);
    superBoot.add(bootShell);
    const bootSpring = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.46), soleWhiteMat);
    bootSpring.position.set(0, -0.44, -0.06);
    superBoot.add(bootSpring);
    superBoot.visible = false;
    shin.add(superBoot);

    hip.add(shin);
    bodyPivot.add(hip);
    return { hip, shin, superBoot };
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const hoverboard = new THREE.Group();
  const boardPrimaryMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.24,
    metalness: 0.58,
  });
  const boardAccentMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.28,
    metalness: 0.72,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.7,
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.075, 1.62), boardPrimaryMat);
  deck.position.y = 0.16;
  deck.castShadow = true;
  hoverboard.add(deck);

  const boardNose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.075, 14),
    boardPrimaryMat,
  );
  boardNose.position.set(0, 0.16, -0.81);
  hoverboard.add(boardNose);

  const boardTail = boardNose.clone();
  boardTail.position.set(0, 0.16, 0.81);
  hoverboard.add(boardTail);

  const glowRail = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 1.44), boardAccentMat);
  glowRail.position.y = 0.14;
  hoverboard.add(glowRail);

  hoverboard.visible = false;
  root.add(hoverboard);

  const shadowGeo = new THREE.PlaneGeometry(1.42, 1.42);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  root.add(shadowPlane);

  return {
    root,
    bodyPivot,
    torsoGroup,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    hoverboard,
    jetpack,
    jetpackFlameL,
    jetpackFlameR,
    boardPrimaryMat,
    boardAccentMat,
    shadowPlane,
  };
}

export function createChaserRig(): ChaserRig {
  const root = new THREE.Group();

  const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const dogMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });

  const inspector = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.75, 0.45), navyMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  inspector.add(torso);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), goldMat);
  badge.position.set(-0.18, 1.32, -0.23);
  inspector.add(badge);

  const inspHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), skinMat);
  inspHead.position.y = 1.75;
  inspector.add(inspHead);

  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.18, 14), navyMat);
  capCrown.position.y = 1.94;
  inspector.add(capCrown);

  const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.2), darkMat);
  capVisor.position.set(0, 1.85, -0.22);
  inspector.add(capVisor);

  const inspLeftArm = new THREE.Group();
  inspLeftArm.position.set(-0.46, 1.42, 0);
  const lArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 8), navyMat);
  lArmMesh.position.y = -0.2;
  inspLeftArm.add(lArmMesh);
  inspector.add(inspLeftArm);

  const inspRightArm = new THREE.Group();
  inspRightArm.position.set(0.46, 1.42, 0);
  const rArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 8), navyMat);
  rArmMesh.position.y = -0.2;
  inspRightArm.add(rArmMesh);
  inspector.add(inspRightArm);

  const inspLeftLeg = new THREE.Group();
  inspLeftLeg.position.set(-0.19, 0.78, 0);
  const lLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 4, 8), darkMat);
  lLegMesh.position.y = -0.34;
  inspLeftLeg.add(lLegMesh);
  inspector.add(inspLeftLeg);

  const inspRightLeg = new THREE.Group();
  inspRightLeg.position.set(0.19, 0.78, 0);
  const rLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 4, 8), darkMat);
  rLegMesh.position.y = -0.34;
  inspRightLeg.add(rLegMesh);
  inspector.add(inspRightLeg);

  root.add(inspector);

  const dog = new THREE.Group();
  dog.position.set(0.82, 0, -0.35);
  const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.72), dogMat);
  dogBody.position.y = 0.44;
  dogBody.castShadow = true;
  dog.add(dogBody);

  const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.32), dogMat);
  dogHead.position.set(0, 0.62, -0.4);
  dog.add(dogHead);

  const dogCollar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.14), collarMat);
  dogCollar.position.set(0, 0.55, -0.28);
  dog.add(dogCollar);

  const dogLegs: THREE.Mesh[] = [];
  for (const [dx, dz] of [
    [-0.13, -0.24],
    [0.13, -0.24],
    [-0.13, 0.24],
    [0.13, 0.24],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), dogMat);
    leg.position.set(dx, 0.18, dz);
    dog.add(leg);
    dogLegs.push(leg);
  }

  root.add(dog);

  return {
    root,
    inspector,
    inspLeftArm,
    inspRightArm,
    inspLeftLeg,
    inspRightLeg,
    dog,
    dogLegs,
  };
}

export function createSubwayTrain(
  assets: SharedGameAssets,
  variant: number,
  hasRamp: boolean,
): THREE.Group {
  const group = new THREE.Group();
  // When hasRamp is true, use the classic open hopper yellow/wood freight car look!
  const styleIdx = hasRamp ? 2 : variant % assets.trainBodyMats.length;
  const bodyMat = assets.trainBodyMats[styleIdx];
  const roofMat = assets.trainRoofBaseMats[styleIdx % assets.trainRoofBaseMats.length];
  const stripeMat = assets.trainRoofStripeMats[styleIdx % assets.trainRoofStripeMats.length];
  const length = 13.5;

  const chassis = new THREE.Mesh(assets.trainChassisGeo, assets.steelMat);
  chassis.position.y = 0.36;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  for (const wz of [-4.6, -3.2, 3.2, 4.6]) {
    for (const wx of [-0.88, 0.88]) {
      const wheel = new THREE.Mesh(assets.trainWheelGeo, assets.steelMat);
      wheel.position.set(wx, 0.28, wz);
      group.add(wheel);
    }
  }

  if (hasRamp) {
    // Classic Subway Surfers Open Sand Hopper Freight Car + Ribbed Wood Ramp
    for (const sx of [-1.04, 1.04]) {
      const wall = new THREE.Mesh(assets.hopperSideGeo, bodyMat);
      wall.position.set(sx, 1.82, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    const backWall = new THREE.Mesh(assets.hopperBackGeo, bodyMat);
    backWall.position.set(0, 1.82, -length / 2 + 0.12);
    group.add(backWall);

    // Sculpted dirt/sand mound filling the hopper car flush with TRAIN_ROOF_Y (3.15)
    const sandMound = new THREE.Mesh(assets.hopperSandGeo, assets.sandMat);
    sandMound.position.set(0, 2.52, -0.1);
    sandMound.receiveShadow = true;
    group.add(sandMound);

    const rampMesh = new THREE.Mesh(assets.trainRampGeo, assets.trainRampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    group.add(rampMesh);

    // Angled side trim rails along the ramp
    const railPitch = Math.atan2(3.15, 5.8);
    for (const rx of [-1.03, 1.03]) {
      const rail = new THREE.Mesh(assets.trainRampRailGeo, bodyMat);
      rail.position.set(rx, 1.62, length / 2 + 2.9);
      rail.rotation.x = railPitch;
      group.add(rail);
    }
  } else {
    // Classic Subway Surfers Curved-Roof Car
    const body = new THREE.Mesh(assets.trainBodyGeo, bodyMat);
    body.position.y = 1.67;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofArch = new THREE.Mesh(assets.trainRoofArchGeo, roofMat);
    roofArch.position.y = 2.74;
    roofArch.receiveShadow = true;
    group.add(roofArch);

    const roofStripe = new THREE.Mesh(assets.trainRoofStripeGeo, stripeMat);
    roofStripe.position.y = 3.17;
    roofStripe.receiveShadow = true;
    group.add(roofStripe);

    // Signature dark structural bands wrapping across the roof & front/rear ends
    for (const bz of [-length / 2 + 0.15, -2.1, 2.1, length / 2 - 0.15]) {
      const band = new THREE.Mesh(assets.trainBandGeo, assets.trainBandMat);
      band.position.set(0, 2.75, bz);
      group.add(band);
    }

    // Center front beacon lamp on the forward roof band
    const topBeacon = new THREE.Mesh(assets.trainLampGeo, assets.trainHeadlightMat);
    topBeacon.position.set(0, 2.94, length / 2 + 0.04);
    group.add(topBeacon);

    if (styleIdx < 2) {
      const windshield = new THREE.Mesh(assets.trainWindshieldGeo, assets.trainGlassMat);
      windshield.position.set(0, 2.08, length / 2 + 0.02);
      group.add(windshield);

      const destSign = new THREE.Mesh(assets.trainDestGeo, assets.trainLedMat);
      destSign.position.set(0, 2.66, length / 2 + 0.03);
      group.add(destSign);

      for (const hx of [-0.72, 0.72]) {
        const lamp = new THREE.Mesh(assets.trainLampGeo, assets.trainHeadlightMat);
        lamp.position.set(hx, 1.05, length / 2 + 0.04);
        group.add(lamp);
      }
    }
  }

  return group;
}

export function createLowBarrier(assets: SharedGameAssets): THREE.Group {
  const group = new THREE.Group();
  for (const lx of [-0.95, 0.95]) {
    const post = new THREE.Mesh(assets.lowPostGeo, assets.orangeMat);
    post.position.set(lx, 0.525, 0);
    post.castShadow = true;
    group.add(post);

    const foot = new THREE.Mesh(assets.lowFootGeo, assets.darkSteelMat);
    foot.position.set(lx, 0.05, 0);
    group.add(foot);

    const beacon = new THREE.Mesh(assets.lowBeaconGeo, assets.beaconGlowMat);
    beacon.position.set(lx, 1.12, 0);
    group.add(beacon);
  }

  const plank = new THREE.Mesh(assets.lowPlankGeo, assets.barrierStripeMat);
  plank.position.set(0, 0.85, 0);
  plank.castShadow = true;
  group.add(plank);

  return group;
}

export function createHighBarrier(assets: SharedGameAssets): THREE.Group {
  const group = new THREE.Group();
  for (const lx of [-1.08, 1.08]) {
    const post = new THREE.Mesh(assets.highPostGeo, assets.steelMat);
    post.position.set(lx, 1.275, 0);
    post.castShadow = true;
    group.add(post);

    const beacon = new THREE.Mesh(assets.lowBeaconGeo, assets.beaconGlowMat);
    beacon.position.set(lx, 2.58, 0);
    group.add(beacon);
  }

  const bar = new THREE.Mesh(assets.highBarGeo, assets.barrierStripeMat);
  bar.position.set(0, 1.82, 0);
  bar.castShadow = true;
  group.add(bar);

  return group;
}

export function createCoinMesh(assets: SharedGameAssets): THREE.Group {
  const group = new THREE.Group();
  // [sideMaterial, topCapMaterial, bottomCapMaterial] renders bright star on both faces!
  const disc = new THREE.Mesh(assets.coinDiscGeo, [
    assets.coinGoldMat,
    assets.coinFaceMat,
    assets.coinFaceMat,
  ]);
  const rim = new THREE.Mesh(assets.coinRimGeo, assets.coinGoldMat);
  group.add(disc, rim);
  return group;
}

export function createOstLetterMesh(assets: SharedGameAssets, letter: OstLetter): THREE.Group {
  const group = new THREE.Group();
  const halo = new THREE.Mesh(assets.ostRingGeo, assets.ostHaloMat);
  group.add(halo);

  if (letter === 'O') {
    group.add(new THREE.Mesh(assets.ostLetterOGeo, assets.ostLetterMat));
  } else if (letter === 'S') {
    group.add(new THREE.Mesh(assets.ostLetterSGeo, assets.ostLetterMat));
  } else {
    const bar = new THREE.Mesh(assets.ostLetterTBarGeo, assets.ostLetterMat);
    bar.position.y = 0.26;
    const stem = new THREE.Mesh(assets.ostLetterTStemGeo, assets.ostLetterMat);
    stem.position.y = -0.06;
    group.add(bar, stem);
  }

  return group;
}

export function createPowerupMesh(
  assets: SharedGameAssets,
  type: 'magnet' | 'multiplier' | 'sneakers' | 'jetpack',
): THREE.Group {
  const group = new THREE.Group();
  const emissiveHex =
    type === 'magnet'
      ? 0xef4444
      : type === 'multiplier'
        ? 0x38bdf8
        : type === 'sneakers'
          ? 0xf97316
          : 0xec4899;

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: emissiveHex,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.5,
  });
  const ring = new THREE.Mesh(assets.powerupRingGeo, ringMat);
  ring.position.y = -0.35;
  group.add(ring);

  if (type === 'magnet') {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.4 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const arc = new THREE.Mesh(assets.powerupMagnetArcGeo, redMat);
    arc.rotation.z = Math.PI;
    group.add(arc);
    for (const sx of [-0.28, 0.28]) {
      const tip = new THREE.Mesh(assets.powerupMagnetTipGeo, tipMat);
      tip.position.set(sx, 0.1, 0);
      group.add(tip);
    }
  } else if (type === 'multiplier') {
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.8,
    });
    group.add(new THREE.Mesh(assets.powerupGemGeo, starMat));
  } else if (type === 'sneakers') {
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.4,
    });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const shoe = new THREE.Mesh(assets.powerupShoeGeo, shoeMat);
    shoe.rotation.set(0.25, 0.5, 0.15);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.48), soleMat);
    sole.position.y = -0.14;
    shoe.add(sole);
    group.add(shoe);
  } else {
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xdb2777,
      emissiveIntensity: 0.55,
      roughness: 0.24,
      metalness: 0.72,
    });
    for (const tx of [-0.14, 0.14]) {
      const tank = new THREE.Mesh(assets.powerupJetTankGeo, tankMat);
      tank.position.set(tx, 0.06, 0);
      group.add(tank);
    }
  }

  return group;
}

export interface TrackSharedMaterials {
  bedMat: THREE.MeshStandardMaterial;
  railMat: THREE.MeshStandardMaterial;
  streetMat: THREE.MeshStandardMaterial;
  curbMat: THREE.MeshStandardMaterial;
  slopeWallMat: THREE.MeshStandardMaterial;
  buttressMat: THREE.MeshStandardMaterial;
  archMat: THREE.MeshStandardMaterial;
  wireMat: THREE.MeshBasicMaterial;
  bldgMats: THREE.MeshStandardMaterial[];
  taxiYellowMat: THREE.MeshStandardMaterial;
  taxiGlassMat: THREE.MeshStandardMaterial;
  signGreenMat: THREE.MeshStandardMaterial;
  coneOrangeMat: THREE.MeshStandardMaterial;
  coneWhiteMat: THREE.MeshStandardMaterial;
  grassMat: THREE.MeshStandardMaterial;

  bedGeo: THREE.BufferGeometry;
  railGeo: THREE.BufferGeometry;
  slopeWallGeo: THREE.BufferGeometry;
  buttressGeo: THREE.BufferGeometry;
  streetDeckGeo: THREE.BufferGeometry;
  curbGeo: THREE.BufferGeometry;
  poleGeo: THREE.BufferGeometry;
  beamGeo: THREE.BufferGeometry;
  wireGeos: THREE.BufferGeometry[];
  taxiBodyGeo: THREE.BufferGeometry;
  taxiCabinGeo: THREE.BufferGeometry;
  taxiSignGeo: THREE.BufferGeometry;
  signPoleGeo: THREE.BufferGeometry;
  signBoardGeo: THREE.BufferGeometry;
  coneGeo: THREE.BufferGeometry;
  coneStripeGeo: THREE.BufferGeometry;
  grassGeo: THREE.BufferGeometry;
  dispose: () => void;
}

export function createTrackSharedMaterials(
  textures: ProceduralTextureSet,
  segmentLength: number,
): TrackSharedMaterials {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Sagging overhead catenary cables spanning seamlessly from z = -segmentLength/2 to +segmentLength/2
  const wireOffsets = [-3.1, -1.55, 0, 1.55, 3.1];
  const wireGeos = wireOffsets.map((wx) => {
    const sagCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(wx, 7.58, -segmentLength / 2),
      new THREE.Vector3(wx, 6.82, -segmentLength / 4),
      new THREE.Vector3(wx, 6.52, 0),
      new THREE.Vector3(wx, 6.82, segmentLength / 4),
      new THREE.Vector3(wx, 7.58, segmentLength / 2),
    ]);
    return track(new THREE.TubeGeometry(sagCurve, 12, 0.028, 5, false));
  });

  return {
    bedMat: track(
      new THREE.MeshStandardMaterial({
        map: textures.trackBed,
        roughness: 0.92,
        metalness: 0.04,
      }),
    ),
    railMat: track(
      new THREE.MeshStandardMaterial({
        color: 0xb0bec5,
        roughness: 0.28,
        metalness: 0.84,
      }),
    ),
    streetMat: track(
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.85,
        metalness: 0.08,
      }),
    ),
    curbMat: track(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.72,
        metalness: 0.15,
      }),
    ),
    slopeWallMat: track(
      new THREE.MeshStandardMaterial({
        map: textures.concreteWall,
        roughness: 0.82,
        metalness: 0.06,
      }),
    ),
    buttressMat: track(
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.78,
        metalness: 0.08,
      }),
    ),
    archMat: track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.42,
        metalness: 0.65,
      }),
    ),
    wireMat: track(new THREE.MeshBasicMaterial({ color: 0x0f172a })),
    bldgMats: [0xffffff, 0xfde68a, 0xe2e8f0, 0xfecaca].map((tint) =>
      track(
        new THREE.MeshStandardMaterial({
          map: textures.buildingFacade,
          color: tint,
          roughness: 0.78,
          metalness: 0.08,
        }),
      ),
    ),
    taxiYellowMat: track(
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.34, metalness: 0.28 }),
    ),
    taxiGlassMat: track(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.82 }),
    ),
    signGreenMat: track(
      new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.4,
        roughness: 0.4,
      }),
    ),
    coneOrangeMat: track(
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.08 }),
    ),
    coneWhiteMat: track(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, metalness: 0.05 }),
    ),
    grassMat: track(
      new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.85, metalness: 0.02 }),
    ),

    bedGeo: track(new THREE.PlaneGeometry(10.6, segmentLength)),
    railGeo: track(new THREE.BoxGeometry(0.09, 0.1, segmentLength)),
    slopeWallGeo: track(new THREE.BoxGeometry(0.65, 5.7, segmentLength)),
    buttressGeo: track(new THREE.BoxGeometry(0.55, 5.75, 0.68)),
    streetDeckGeo: track(new THREE.BoxGeometry(7.2, 0.45, segmentLength)),
    curbGeo: track(new THREE.BoxGeometry(0.42, 0.55, segmentLength)),
    poleGeo: track(new THREE.BoxGeometry(0.24, 3.2, 0.24)),
    beamGeo: track(new THREE.BoxGeometry(13.2, 0.22, 0.24)),
    wireGeos,
    taxiBodyGeo: track(new THREE.BoxGeometry(1.45, 0.62, 3.2)),
    taxiCabinGeo: track(new THREE.BoxGeometry(1.28, 0.48, 1.7)),
    taxiSignGeo: track(new THREE.BoxGeometry(0.52, 0.18, 0.24)),
    signPoleGeo: track(new THREE.CylinderGeometry(0.07, 0.08, 3.8, 8)),
    signBoardGeo: track(new THREE.BoxGeometry(0.85, 1.05, 0.12)),
    coneGeo: track(new THREE.ConeGeometry(0.24, 0.68, 10)),
    coneStripeGeo: track(new THREE.CylinderGeometry(0.145, 0.185, 0.18, 10)),
    grassGeo: track(new THREE.ConeGeometry(0.18, 0.36, 5)),

    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createTrackSegment(
  shared: TrackSharedMaterials,
  segmentLength: number,
  seed: number,
): THREE.Group {
  const seg = new THREE.Group();

  // Warm Sandy Dirt & Timber Sleeper Track Bed
  const bed = new THREE.Mesh(shared.bedGeo, shared.bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.receiveShadow = true;
  seg.add(bed);

  // Steel Rails across all 3 tracks
  for (const cx of [-2.8, 0, 2.8]) {
    for (const offset of [-0.62, 0.62]) {
      const rail = new THREE.Mesh(shared.railGeo, shared.railMat);
      rail.position.set(cx + offset, 0.05, 0);
      seg.add(rail);
    }
  }

  // Sloped Concrete Embankment Retaining Walls + Angled Buttress Pillars + Street Overlook
  const wallTilt = 0.34; // ~19.5 degrees outward lean
  for (const side of [-1, 1]) {
    const slopeWall = new THREE.Mesh(shared.slopeWallGeo, shared.slopeWallMat);
    slopeWall.position.set(side * 5.95, 2.55, 0);
    slopeWall.rotation.z = -side * wallTilt;
    slopeWall.receiveShadow = true;
    seg.add(slopeWall);

    // Repeating Concrete Buttress Ribs every 4.8m along the embankment
    for (let bz = -9.6; bz <= 9.6; bz += 4.8) {
      const buttress = new THREE.Mesh(shared.buttressGeo, shared.buttressMat);
      buttress.position.set(side * 5.62, 2.55, bz);
      buttress.rotation.z = -side * wallTilt;
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      seg.add(buttress);
    }

    // Top street curb & road deck perched above the embankment
    const curb = new THREE.Mesh(shared.curbGeo, shared.curbMat);
    curb.position.set(side * 6.95, 5.18, 0);
    seg.add(curb);

    const street = new THREE.Mesh(shared.streetDeckGeo, shared.streetMat);
    street.position.set(side * 10.5, 4.95, 0);
    street.receiveShadow = true;
    seg.add(street);

    // Street-level City Apartment Brownstones
    for (let i = 0; i < 2; i++) {
      const h = 11 + ((i * 4 + seed * 3 + (side > 0 ? 2 : 0)) % 8);
      const bMat = shared.bldgMats[(i + seed + (side > 0 ? 1 : 0)) % shared.bldgMats.length];
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(5.6, h, segmentLength * 0.45), bMat);
      bldg.position.set(side * 12.6, 5.0 + h / 2, (i === 0 ? -0.25 : 0.25) * segmentLength);
      seg.add(bldg);
    }

    // Occasional parked Yellow NYC Taxi peeking above the street curb
    if ((seed + (side > 0 ? 1 : 0)) % 2 === 0) {
      const taxi = new THREE.Group();
      const tBody = new THREE.Mesh(shared.taxiBodyGeo, shared.taxiYellowMat);
      tBody.position.y = 0.31;
      const tCab = new THREE.Mesh(shared.taxiCabinGeo, shared.taxiYellowMat);
      tCab.position.set(0, 0.84, -0.1);
      const tSign = new THREE.Mesh(shared.taxiSignGeo, shared.taxiYellowMat);
      tSign.position.set(0, 1.15, -0.1);
      taxi.add(tBody, tCab, tSign);
      taxi.position.set(side * 8.1, 5.18, side * 3.5);
      seg.add(taxi);
    }

    // Street sign pole along the rim
    if ((seed + (side > 0 ? 2 : 1)) % 2 === 0) {
      const sPole = new THREE.Mesh(shared.signPoleGeo, shared.archMat);
      sPole.position.set(side * 7.25, 6.9, -4.5);
      const sBoard = new THREE.Mesh(shared.signBoardGeo, shared.signGreenMat);
      sBoard.position.set(side * 7.25, 8.2, -4.5);
      seg.add(sPole, sBoard);
    }

    // Ground shoulder details: Safety Cones & Grass Tufts
    if ((seed + (side > 0 ? 0 : 1)) % 2 === 0) {
      const cone = new THREE.Mesh(shared.coneGeo, shared.coneOrangeMat);
      cone.position.set(side * 4.45, 0.34, 4.2 * side);
      const coneStripe = new THREE.Mesh(shared.coneStripeGeo, shared.coneWhiteMat);
      coneStripe.position.set(side * 4.45, 0.36, 4.2 * side);
      seg.add(cone, coneStripe);
    }

    const tuft = new THREE.Mesh(shared.grassGeo, shared.grassMat);
    tuft.position.set(side * 4.7, 0.16, -5.0 * side);
    seg.add(tuft);
  }

  // Overhead Slim Steel Catenary Portal Frames anchored at segment join (-segmentLength / 2)
  const gantryZ = -segmentLength / 2;
  const leftPole = new THREE.Mesh(shared.poleGeo, shared.archMat);
  leftPole.position.set(-6.5, 6.2, gantryZ);
  const rightPole = new THREE.Mesh(shared.poleGeo, shared.archMat);
  rightPole.position.set(6.5, 6.2, gantryZ);
  const crossBeam = new THREE.Mesh(shared.beamGeo, shared.archMat);
  crossBeam.position.set(0, 7.65, gantryZ);
  seg.add(leftPole, rightPole, crossBeam);

  // 5 Continuous Sagging Overhead Power Cables
  for (const wireGeo of shared.wireGeos) {
    seg.add(new THREE.Mesh(wireGeo, shared.wireMat));
  }

  return seg;
}
