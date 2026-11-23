import * as THREE from 'three';

export interface ProceduralTextureSet {
  skyDome: THREE.CanvasTexture;
  trackBed: THREE.CanvasTexture;
  barrierStripes: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  buildingFacade: THREE.CanvasTexture;
  coinFace: THREE.CanvasTexture;
  rampPlanks: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  trainSides: THREE.CanvasTexture[];
  dispose: () => void;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function createSkyDomeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1d4ed8');
  grad.addColorStop(0.32, '#38bdf8');
  grad.addColorStop(0.58, '#bae6fd');
  grad.addColorStop(0.76, '#e0f2fe');
  grad.addColorStop(1.0, '#bae6fd');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);
  return canvas;
}

function createTrackBedCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm reddish-brown subway dirt & gravel ballast (matches classic Subway Surfers track bed)
  ctx.fillStyle = '#7c6255';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle deterministic gravel & dusty earth texture
  for (let i = 0; i < 4200; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const shade = (i * 29) % 36;
    ctx.fillStyle = `rgb(${102 + shade}, ${78 + Math.floor(shade * 0.8)}, ${68 + Math.floor(shade * 0.7)})`;
    ctx.fillRect(x, y, 4, 3);
  }

  // 3 track trenches
  const laneCenters = [85, 256, 427];

  for (const cx of laneCenters) {
    // Slightly darker recessed track channel
    ctx.fillStyle = 'rgba(54, 38, 32, 0.25)';
    ctx.fillRect(cx - 58, 0, 116, 512);
  }

  // Thick timber sleepers with rail tie plates
  for (let y = 0; y < 512; y += 64) {
    for (const cx of laneCenters) {
      // Soft shadow beneath tie
      ctx.fillStyle = 'rgba(30, 20, 16, 0.35)';
      ctx.fillRect(cx - 58, y + 30, 116, 6);

      // Timber tie
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(cx - 56, y + 10, 112, 20);
      ctx.fillStyle = '#735343';
      ctx.fillRect(cx - 54, y + 12, 108, 7);

      // Iron rail plates
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 42, y + 14, 12, 12);
      ctx.fillRect(cx + 30, y + 14, 12, 12);
    }
  }

  // Subtle dusty paths between tracks
  ctx.fillStyle = 'rgba(226, 202, 186, 0.14)';
  ctx.fillRect(166, 0, 8, 512);
  ctx.fillRect(338, 0, 8, 512);

  return canvas;
}

function createBarrierStripesCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#ef4444';
  for (let x = -128; x < 384; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 88, 128);
    ctx.lineTo(x + 64, 128);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 116, 256, 12);
  return canvas;
}

function createConcreteWallCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Cool blue-grey sloped retaining wall concrete
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 512);
  wallGrad.addColorStop(0, '#8ea0b8');
  wallGrad.addColorStop(0.55, '#6b7d94');
  wallGrad.addColorStop(1, '#4b5a6e');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle panel expansion joints
  ctx.fillStyle = 'rgba(30, 41, 59, 0.32)';
  for (let x = 0; x < 512; x += 128) {
    ctx.fillRect(x, 0, 4, 512);
  }
  ctx.fillRect(0, 62, 512, 5);
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 34);

  // Bold Street Graffiti Tag #1 (Cyan tag)
  ctx.save();
  ctx.translate(82, 310);
  ctx.rotate(-0.12);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 1.8);
  ctx.moveTo(38, -24);
  ctx.lineTo(38, 28);
  ctx.moveTo(22, 0);
  ctx.lineTo(56, -10);
  ctx.stroke();
  ctx.restore();

  // Bold Street Graffiti Tag #2 (Orange/Red Heart + NY style tag)
  ctx.save();
  ctx.translate(310, 325);
  ctx.rotate(0.08);
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('OST', -44, 16);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(44, -22, 12, 0, Math.PI * 2);
  ctx.arc(62, -22, 12, 0, Math.PI * 2);
  ctx.moveTo(32, -16);
  ctx.lineTo(53, 8);
  ctx.lineTo(74, -16);
  ctx.fill();
  ctx.restore();

  // Lime splash tag
  ctx.save();
  ctx.translate(442, 260);
  ctx.fillStyle = '#84cc16';
  ctx.beginPath();
  ctx.roundRect(-24, -18, 48, 36, 12);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(-18, -12, 36, 24);
  ctx.restore();

  return canvas;
}

function createBuildingFacadeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c3f34';
  ctx.fillRect(0, 0, 256, 512);

  // Decorative cornice & vertical pilasters
  ctx.fillStyle = '#5c2c24';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillRect(0, 0, 14, 512);
  ctx.fillRect(242, 0, 14, 512);

  // Apartment windows with sky reflection & sills
  for (let row = 0; row < 6; row++) {
    const wy = 48 + row * 74;
    for (let col = 0; col < 3; col++) {
      const wx = 28 + col * 72;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx, wy, 48, 52);
      ctx.fillStyle = (row + col) % 3 === 0 ? '#fde68a' : '#7dd3fc';
      ctx.fillRect(wx + 5, wy + 5, 38, 42);
      // Window frame crossbars
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(wx + 22, wy + 5, 4, 42);
      ctx.fillRect(wx + 5, wy + 24, 38, 4);
      // Stone sill
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx - 4, wy + 52, 56, 6);
    }
  }

  return canvas;
}

function createCoinFaceCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Bright radiant gold coin background
  const grad = ctx.createRadialGradient(108, 102, 16, 128, 128, 128);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.55, '#facc15');
  grad.addColorStop(1, '#d97706');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Recessed inner circle + raised rim ring
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp 5-point Star emblem in center
  ctx.save();
  ctx.translate(128, 130);
  ctx.beginPath();
  const outerR = 58;
  const innerR = 25;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#fde047';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#b45309';
  ctx.stroke();
  ctx.restore();

  return canvas;
}

function createRampPlanksCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d99a3e';
  ctx.fillRect(0, 0, 256, 256);

  // Vertical ribbed wooden/steel ramp slats
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = '#f3bf60';
    ctx.fillRect(x + 3, 0, 22, 256);
    ctx.fillStyle = '#925d1d';
    ctx.fillRect(x + 25, 0, 7, 256);
  }

  // Horizontal cross bolts
  ctx.fillStyle = '#78350f';
  for (let y = 32; y < 256; y += 64) {
    ctx.fillRect(0, y, 256, 6);
  }
  return canvas;
}

function createTrainSideCanvas(
  primary: string,
  accent: string,
  stripe: string,
  freightMode = false,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (freightMode) {
    // Classic Subway Surfers ribbed yellow/wood freight boxcar
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 512, 256);

    for (let x = 0; x < 512; x += 24) {
      ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
      ctx.fillRect(x, 12, 5, 212);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(x + 5, 12, 3, 212);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 512, 22);
    ctx.fillRect(0, 226, 512, 30);

    // Center corrugated sliding freight door
    ctx.fillStyle = stripe;
    ctx.fillRect(190, 26, 132, 198);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5;
    ctx.strokeRect(190, 26, 132, 198);
    return canvas;
  }

  // Classic Subway Surfers passenger car
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 256);

  // Lower brushed metal skirt
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 178, 512, 78);

  // Corrugated ribs
  ctx.fillStyle = 'rgba(15,23,42,0.14)';
  for (let y = 184; y < 248; y += 10) {
    ctx.fillRect(0, y, 512, 3);
  }

  // Bold dual racing stripes
  ctx.fillStyle = accent;
  ctx.fillRect(0, 126, 512, 26);
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 152, 512, 12);

  // Bright blue reflective rounded passenger windows
  for (let x = 22; x < 480; x += 78) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x, 36, 56, 74, 8);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(x + 4, 40, 48, 66, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + 6, 40);
    ctx.lineTo(x + 30, 40);
    ctx.lineTo(x + 14, 106);
    ctx.lineTo(x + 6, 106);
    ctx.closePath();
    ctx.fill();
  }

  // Sliding door outlines
  ctx.strokeStyle = 'rgba(15,23,42,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(186, 28, 66, 220);
  ctx.strokeRect(342, 28, 66, 220);

  return canvas;
}

function createContactShadowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.78)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.35)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const skyDome = new THREE.CanvasTexture(createSkyDomeCanvas());
  skyDome.colorSpace = THREE.SRGBColorSpace;

  const trackBed = configureTexture(createTrackBedCanvas(), maxAnisotropy, 1, 4);
  const barrierStripes = configureTexture(createBarrierStripesCanvas(), maxAnisotropy, 2, 1);
  const concreteWall = configureTexture(createConcreteWallCanvas(), maxAnisotropy, 2, 1);
  const buildingFacade = configureTexture(createBuildingFacadeCanvas(), maxAnisotropy, 1, 1);

  const coinFace = configureTexture(createCoinFaceCanvas(), maxAnisotropy, 1, 1);
  coinFace.wrapS = THREE.ClampToEdgeWrapping;
  coinFace.wrapT = THREE.ClampToEdgeWrapping;

  const rampPlanks = configureTexture(createRampPlanksCanvas(), maxAnisotropy, 1, 2);
  const contactShadow = new THREE.CanvasTexture(createContactShadowCanvas());
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  const trainSpecs: [string, string, string, boolean][] = [
    ['#fef3c7', '#dc2626', '#f59e0b', false], // Cream + Crimson classic passenger
    ['#e0f2fe', '#0284c7', '#bae6fd', false], // Ice-Blue + White express
    ['#eab308', '#991b1b', '#d97706', true], // Classic Yellow/Wood freight car
  ];
  const trainSides = trainSpecs.map(([p, a, s, f]) =>
    configureTexture(createTrainSideCanvas(p, a, s, f), maxAnisotropy, 1, 1),
  );

  return {
    skyDome,
    trackBed,
    barrierStripes,
    concreteWall,
    buildingFacade,
    coinFace,
    rampPlanks,
    contactShadow,
    trainSides,
    dispose: () => {
      skyDome.dispose();
      trackBed.dispose();
      barrierStripes.dispose();
      concreteWall.dispose();
      buildingFacade.dispose();
      coinFace.dispose();
      rampPlanks.dispose();
      contactShadow.dispose();
      trainSides.forEach((t) => t.dispose());
    },
  };
}
