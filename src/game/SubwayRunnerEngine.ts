import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { HOVERBOARDS, WORLD_TOURS } from '../data/topics';
import { HudSnapshot, OstLetter, QuizTriggerReason, WorldTourId } from '../types/game';
import {
  ChaserRig,
  createChaserRig,
  createCoinMesh,
  createHighBarrier,
  createLowBarrier,
  createOstLetterMesh,
  createPowerupMesh,
  createRunnerCharacter,
  createSharedGameAssets,
  createSubwayTrain,
  createTrackSegment,
  createTrackSharedMaterials,
  RunnerRig,
  SharedGameAssets,
  TrackSharedMaterials,
} from './models';
import { createProceduralTextures, ProceduralTextureSet } from './textures';

const LANE_X = [-2.8, 0, 2.8] as const;
const SEGMENT_LENGTH = 24;
const NUM_SEGMENTS = 9;
const TRAIN_LENGTH = 13.5;
const TRAIN_ROOF_Y = 3.15;
const RAMP_LENGTH = 5.8;
const QUIZ_INTERVAL_SECONDS = 30;
const COIN_POOL_SIZE = 160;
const PARTICLE_POOL_SIZE = 72;
const OST_SEQUENCE: OstLetter[] = ['O', 'S', 'T'];

// Module-scope reusable math helpers (zero per-frame GC)
const _v3 = new THREE.Vector3();

type ObstacleKind = 'train' | 'low' | 'high';
type PowerupKind = 'magnet' | 'multiplier' | 'sneakers' | 'jetpack';

interface SpawnedObstacle {
  id: number;
  kind: ObstacleKind;
  lane: number;
  baseY: number;
  z: number;
  hasRamp: boolean;
  isMoving: boolean;
  extraSpeed: number;
  mesh: THREE.Group;
  shattered: boolean;
  stumbledId: boolean;
  roofCounted: boolean;
}

interface SpawnedCoin {
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface SpawnedPowerup {
  kind: PowerupKind;
  lane: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface SpawnedOstLetter {
  letter: OstLetter;
  lane: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface ParticleBurst {
  active: boolean;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface RunnerCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onQuizTrigger: (reason: QuizTriggerReason, snapshot: HudSnapshot) => void;
  onEventToast?: (message: string) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SubwayRunnerEngine {
  private container: HTMLElement;
  private callbacks: RunnerCallbacks;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private skyDomeMesh: THREE.Mesh;
  private skyMat: THREE.MeshBasicMaterial;
  private horizonSkyline: THREE.Group;
  private skylineMat: THREE.MeshBasicMaterial;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private textures: ProceduralTextureSet;
  private assets: SharedGameAssets;
  private trackShared: TrackSharedMaterials;
  private runner: RunnerRig;
  private chaser: ChaserRig;

  private segments: THREE.Group[] = [];
  private obstacles: SpawnedObstacle[] = [];
  private coins: SpawnedCoin[] = [];
  private coinPool: THREE.Group[] = [];
  private powerups: SpawnedPowerup[] = [];
  private ostLetters: SpawnedOstLetter[] = [];
  private particlePool: ParticleBurst[] = [];

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private contextLost = false;

  // Game State
  private mode: 'menu' | 'running' | 'paused' = 'menu';
  private lane = 1;
  private prevLane = 1;
  private playerX = 0;
  private playerY = 0;
  private playerVy = 0;
  private isGrounded = true;
  private wasGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private slideTimer = 0;
  private landingSquash = 0;
  private runCycle = 0;
  private speed = 19;
  private resumeRamp = 1;
  private distance = 0;
  private score = 0;
  private coinCount = 0;
  private baseMultiplier = 1;
  private quizTimerRemaining = QUIZ_INTERVAL_SECONDS;

  // Powerups & Chaser
  private magnetTimer = 0;
  private doubleScoreTimer = 0;
  private sneakersTimer = 0;
  private jetpackTimer = 0;
  private jetSpawnTimer = 0;
  private jetLane = 1;
  private boardTimer = 0;
  private boardCooldown = 0;
  private invulnTimer = 0;
  private stumbleTimer = 0;
  private introChaseTimer = 0;
  private chaserX = 0;
  private shakeTimer = 0;
  private cameraBank = 0;

  // Modular Chunk Generation & OST Word Hunt
  private nextSpawnZ = -42;
  private nextLetterDistance = 115;
  private lastChunkIdx = -1;
  private collectedOstLetters: OstLetter[] = [];
  private obstacleSeq = 1;
  private hudEmitAccum = 0;
  private idleTime = 0;

  // Single-run stats for Mission tracking
  private runJumps = 0;
  private runSlides = 0;
  private runPowerups = 0;
  private runTrainRoofs = 0;
  private runBoardsUsed = 0;

  // Touch swipe & double-tap tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchActive = false;
  private swipedDuringTouch = false;
  private lastTapTime = 0;

  // Reusable particle geometry/materials
  private particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
  private coinParticleMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  private sparkParticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  constructor(
    container: HTMLElement,
    callbacks: RunnerCallbacks,
    initialBoardId = 'metro-amber',
    initialMultiplierLevel = 1,
    initialWorldId: WorldTourId = 'metro',
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.baseMultiplier = Math.max(1, Math.min(30, initialMultiplierLevel));
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Scene + Sky Dome + Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc);
    this.scene.fog = new THREE.Fog(0xbae6fd, 52, 155);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 240);
    this.camera.position.set(0, 4.4, 7.6);
    this.camera.lookAt(0, 1.5, -14);

    // Studio RoomEnvironment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Outdoor Transit Lighting
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x475569, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    this.sunLight.position.set(16, 28, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -22;
    this.sunLight.shadow.camera.right = 22;
    this.sunLight.shadow.camera.top = 24;
    this.sunLight.shadow.camera.bottom = -24;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-14, 12, -24);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.assets = createSharedGameAssets(this.textures);
    this.trackShared = createTrackSharedMaterials(this.textures, SEGMENT_LENGTH);

    // Sky Dome Gradient + Distant City Skyline Silhouettes
    const skyGeo = new THREE.SphereGeometry(195, 24, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: this.textures.skyDome,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDomeMesh);

    this.horizonSkyline = new THREE.Group();
    this.skylineMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      fog: false,
      transparent: true,
      opacity: 0.72,
    });
    const skylineSpecs: [number, number, number, number][] = [
      [-42, 48, 16, 10],
      [-26, 62, 14, 12],
      [-12, 74, 12, 12],
      [4, 44, 14, 10],
      [20, 66, 15, 12],
      [36, 52, 16, 10],
    ];
    for (const [sx, sh, sw, sd] of skylineSpecs) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), this.skylineMat);
      tower.position.set(sx, sh / 2 - 4, 0);
      this.horizonSkyline.add(tower);
    }
    this.horizonSkyline.position.set(0, 0, -148);
    this.scene.add(this.horizonSkyline);

    this.setWorldTheme(initialWorldId);

    // Track segments
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const seg = createTrackSegment(this.trackShared, SEGMENT_LENGTH, i);
      seg.position.z = 12 - i * SEGMENT_LENGTH;
      this.scene.add(seg);
      this.segments.push(seg);
    }

    // Pre-allocate Coin & Particle Object Pools
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const coinMesh = createCoinMesh(this.assets);
      coinMesh.visible = false;
      this.scene.add(coinMesh);
      this.coinPool.push(coinMesh);
    }

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, this.coinParticleMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        active: false,
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.42,
      });
    }

    // Runner & Chaser Inspector + Dog
    this.runner = createRunnerCharacter(this.textures);
    this.setBoardSkin(initialBoardId);
    this.scene.add(this.runner.root);

    this.chaser = createChaserRig();
    this.chaser.root.visible = false;
    this.scene.add(this.chaser.root);

    // Seed initial background trains for menu vista
    this.seedShowcaseObstacles();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.clock.start();
    this.scheduleNextTick();
  }

  public setWorldTheme(worldId: WorldTourId): void {
    const theme = WORLD_TOURS.find((w) => w.id === worldId) ?? WORLD_TOURS[0];
    this.skyMat.color.setHex(theme.skyTint);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(theme.fogColor);
      this.scene.fog.near = 62;
      this.scene.fog.far = 168;
    }
    this.scene.background = new THREE.Color(theme.fogColor);
    this.skylineMat.color.setHex(theme.hemiSky).lerp(new THREE.Color(0x1e40af), 0.38);
    this.hemiLight.color.setHex(theme.hemiSky);
    this.hemiLight.groundColor.setHex(theme.hemiGround);
    this.sunLight.color.setHex(theme.sunColor);
  }

  public setBoardSkin(boardId: string): void {
    const skin = HOVERBOARDS.find((b) => b.id === boardId) ?? HOVERBOARDS[0];
    this.runner.boardPrimaryMat.color.setHex(skin.primaryColor);
    this.runner.boardAccentMat.color.setHex(skin.accentColor);
    this.runner.boardAccentMat.emissive.setHex(skin.primaryColor);
  }

  public setBaseMultiplier(level: number): void {
    this.baseMultiplier = Math.max(1, Math.min(30, level));
    this.emitHud();
  }

  private seedShowcaseObstacles(): void {
    this.clearDynamicEntities();
    this.spawnObstacle('train', 0, -44, true, false, 0);
    this.spawnObstacle('train', 2, -62, false, false, 0);
    this.spawnCoinLine(1, -18, -34, 6, 0.72);
    this.nextSpawnZ = -84;
  }

  public startNewRun(): void {
    this.clearDynamicEntities();
    this.lane = 1;
    this.prevLane = 1;
    this.playerX = LANE_X[1];
    this.playerY = 0;
    this.playerVy = 0;
    this.isGrounded = true;
    this.wasGrounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideTimer = 0;
    this.landingSquash = 0;
    this.speed = 19;
    this.resumeRamp = 1;
    this.distance = 0;
    this.score = 0;
    this.coinCount = 0;
    this.quizTimerRemaining = QUIZ_INTERVAL_SECONDS;
    this.magnetTimer = 0;
    this.doubleScoreTimer = 0;
    this.sneakersTimer = 0;
    this.jetpackTimer = 0;
    this.jetSpawnTimer = 0;
    this.jetLane = 1;
    this.boardTimer = 0;
    this.boardCooldown = 0;
    this.invulnTimer = 0;
    this.stumbleTimer = 0;
    this.introChaseTimer = 3.8;
    this.chaserX = 0;
    this.shakeTimer = 0;
    this.cameraBank = 0;
    this.nextSpawnZ = -40;
    this.nextLetterDistance = 115;
    this.lastChunkIdx = -1;
    this.collectedOstLetters = [];
    this.runJumps = 0;
    this.runSlides = 0;
    this.runPowerups = 0;
    this.runTrainRoofs = 0;
    this.runBoardsUsed = 0;

    this.runner.root.position.set(0, 0, 0);
    this.runner.root.rotation.set(0, 0, 0);
    this.runner.bodyPivot.scale.set(1, 1, 1);
    this.runner.bodyPivot.rotation.set(0, 0, 0);
    this.runner.jetpack.visible = false;
    this.runner.leftLeg.superBoot.visible = false;
    this.runner.rightLeg.superBoot.visible = false;
    this.chaser.root.visible = true;

    while (this.nextSpawnZ > -155) {
      this.spawnChunk();
    }

    this.mode = 'running';
    this.emitHud();
  }

  public pause(): void {
    if (this.mode === 'running') {
      this.mode = 'paused';
      this.emitHud();
    }
  }

  public resume(options?: {
    resetQuizTimer?: boolean;
    grantGraceShield?: boolean;
    resetOstWord?: boolean;
  }): void {
    if (options?.resetQuizTimer) {
      this.quizTimerRemaining = QUIZ_INTERVAL_SECONDS;
    }
    if (options?.resetOstWord) {
      this.collectedOstLetters = [];
    }
    if (options?.grantGraceShield) {
      this.invulnTimer = 2.8;
      this.stumbleTimer = 0;
      this.clearNearbyObstacles();
      this.callbacks.onEventToast?.('Revived! Shield Active');
    }
    this.resumeRamp = 0.58;
    this.jumpBufferTimer = 0;
    this.clock.getDelta();
    this.mode = 'running';
    this.emitHud();
  }

  public returnToMenu(): void {
    this.mode = 'menu';
    this.lane = 1;
    this.prevLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVy = 0;
    this.slideTimer = 0;
    this.boardTimer = 0;
    this.sneakersTimer = 0;
    this.jetpackTimer = 0;
    this.invulnTimer = 0;
    this.stumbleTimer = 0;
    this.introChaseTimer = 0;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.landingSquash = 0;
    this.cameraBank = 0;
    this.runner.bodyPivot.scale.set(1, 1, 1);
    this.runner.bodyPivot.rotation.set(0, 0, 0);
    this.runner.jetpack.visible = false;
    this.runner.leftLeg.superBoot.visible = false;
    this.runner.rightLeg.superBoot.visible = false;
    this.chaser.root.visible = false;
    this.seedShowcaseObstacles();
    this.emitHud();
  }

  public triggerLeft(): void {
    if (this.mode !== 'running') return;
    if (this.lane > 0) {
      this.prevLane = this.lane;
      this.lane -= 1;
      soundEngine.playLaneSwitch();
    }
  }

  public triggerRight(): void {
    if (this.mode !== 'running') return;
    if (this.lane < 2) {
      this.prevLane = this.lane;
      this.lane += 1;
      soundEngine.playLaneSwitch();
    }
  }

  public triggerJump(): void {
    if (this.mode !== 'running' || this.jetpackTimer > 0) return;
    if (this.isGrounded || this.coyoteTimer > 0) {
      this.executeJump();
    } else {
      this.jumpBufferTimer = 0.16;
    }
  }

  private executeJump(): void {
    this.playerVy = this.sneakersTimer > 0 ? 19.6 : 15.0;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideTimer = 0;
    this.landingSquash = -0.14;
    this.runJumps += 1;
    soundEngine.playJump();
  }

  public triggerSlide(): void {
    if (this.mode !== 'running' || this.jetpackTimer > 0) return;
    if (!this.isGrounded) {
      this.playerVy = Math.min(this.playerVy, -30);
    }
    if (this.slideTimer <= 0.1) {
      this.runSlides += 1;
    }
    this.slideTimer = 0.65;
    this.jumpBufferTimer = 0;
    soundEngine.playSlide();
  }

  public activateHoverboard(): void {
    if (this.mode !== 'running' || this.jetpackTimer > 0) return;
    if (this.boardTimer > 0 || this.boardCooldown > 0) return;
    this.boardTimer = 12;
    this.boardCooldown = 18;
    this.runBoardsUsed += 1;
    soundEngine.playPowerup();
    this.spawnBurst(this.playerX, this.playerY + 0.4, 0, false, 10);
    this.callbacks.onEventToast?.('Hoverboard Shield Active!');
    this.emitHud();
  }

  public getSnapshot(): HudSnapshot {
    const doubleFactor = this.doubleScoreTimer > 0 ? 2 : 1;
    return {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.coinCount,
      baseMultiplier: this.baseMultiplier,
      multiplier: this.baseMultiplier * doubleFactor,
      speed: Number((this.speed * this.resumeRamp).toFixed(1)),
      quizTimerRemaining: Math.max(0, this.quizTimerRemaining),
      magnetRemaining: Math.max(0, this.magnetTimer),
      doubleScoreRemaining: Math.max(0, this.doubleScoreTimer),
      superSneakersRemaining: Math.max(0, this.sneakersTimer),
      jetpackRemaining: Math.max(0, this.jetpackTimer),
      boardActive: this.boardTimer > 0,
      boardCooldown: Math.max(0, this.boardCooldown),
      chaserAlert: this.stumbleTimer > 0 || this.introChaseTimer > 0,
      collectedOstLetters: [...this.collectedOstLetters],
      runStats: {
        coins: this.coinCount,
        distance: Math.floor(this.distance),
        score: Math.floor(this.score),
        jumps: this.runJumps,
        slides: this.runSlides,
        powerups: this.runPowerups,
        trainRoofs: this.runTrainRoofs,
        boardsUsed: this.runBoardsUsed,
      },
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.getSnapshot());
  }

  private clearNearbyObstacles(): void {
    for (const obs of this.obstacles) {
      if (obs.z > -20 && obs.z < 12) {
        obs.shattered = true;
        obs.mesh.visible = false;
      }
    }
  }

  private acquireCoinMesh(): THREE.Group {
    const pooled = this.coinPool.pop();
    if (pooled) {
      pooled.visible = true;
      pooled.rotation.set(0, 0, 0);
      return pooled;
    }
    const fresh = createCoinMesh(this.assets);
    this.scene.add(fresh);
    return fresh;
  }

  private releaseCoinMesh(mesh: THREE.Group): void {
    mesh.visible = false;
    this.coinPool.push(mesh);
  }

  private clearDynamicEntities(): void {
    for (const obs of this.obstacles) this.scene.remove(obs.mesh);
    for (const c of this.coins) this.releaseCoinMesh(c.mesh);
    for (const p of this.powerups) this.scene.remove(p.mesh);
    for (const l of this.ostLetters) this.scene.remove(l.mesh);
    for (const pt of this.particlePool) {
      pt.active = false;
      pt.mesh.visible = false;
    }
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.ostLetters = [];
  }

  private spawnObstacle(
    kind: ObstacleKind,
    lane: number,
    z: number,
    hasRamp = false,
    isMoving = false,
    baseY = 0,
  ): void {
    let mesh: THREE.Group;
    if (kind === 'train') {
      const variant = Math.floor(Math.random() * 3);
      mesh = createSubwayTrain(this.assets, variant, hasRamp);
    } else if (kind === 'low') {
      mesh = createLowBarrier(this.assets);
    } else {
      mesh = createHighBarrier(this.assets);
    }
    mesh.position.set(LANE_X[lane], baseY, z);
    this.scene.add(mesh);
    this.obstacles.push({
      id: this.obstacleSeq++,
      kind,
      lane,
      baseY,
      z,
      hasRamp,
      isMoving,
      extraSpeed: isMoving ? 9.5 : 0,
      mesh,
      shattered: false,
      stumbledId: false,
      roofCounted: false,
    });
  }

  private spawnCoinLine(
    lane: number,
    startZ: number,
    endZ: number,
    count: number,
    y = 0.72,
    arcPeak = 0,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      const coinY = y + (arcPeak > 0 ? Math.sin(t * Math.PI) * arcPeak : 0);
      const mesh = this.acquireCoinMesh();
      mesh.position.set(LANE_X[lane], coinY, z);
      mesh.rotation.y = i * 0.45;
      this.coins.push({
        lane,
        x: LANE_X[lane],
        y: coinY,
        z,
        collected: false,
        mesh,
      });
    }
  }

  private spawnCoinBridge(
    fromLane: number,
    toLane: number,
    startZ: number,
    endZ: number,
    count: number,
    baseY: number,
    arcPeak: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      const x = THREE.MathUtils.lerp(LANE_X[fromLane], LANE_X[toLane], t);
      const y = baseY + Math.sin(t * Math.PI) * arcPeak;
      const mesh = this.acquireCoinMesh();
      mesh.position.set(x, y, z);
      mesh.rotation.y = i * 0.45;
      this.coins.push({
        lane: t < 0.5 ? fromLane : toLane,
        x,
        y,
        z,
        collected: false,
        mesh,
      });
    }
  }

  private spawnPowerup(kind: PowerupKind, lane: number, z: number, y = 1.0): void {
    const mesh = createPowerupMesh(this.assets, kind);
    mesh.position.set(LANE_X[lane], y, z);
    this.scene.add(mesh);
    this.powerups.push({
      kind,
      lane,
      y,
      z,
      collected: false,
      mesh,
    });
  }

  private maybeSpawnOstLetterOrPowerup(lane: number, z: number, y: number, allowPowerup = true): void {
    const letterDue =
      this.mode === 'running' &&
      this.distance >= this.nextLetterDistance &&
      this.collectedOstLetters.length < 3;

    if (letterDue) {
      const neededLetter = OST_SEQUENCE[this.collectedOstLetters.length];
      const alreadyInTrack = this.ostLetters.some((l) => !l.collected && l.letter === neededLetter);
      if (!alreadyInTrack) {
        const mesh = createOstLetterMesh(this.assets, neededLetter);
        mesh.position.set(LANE_X[lane], y, z);
        this.scene.add(mesh);
        this.ostLetters.push({
          letter: neededLetter,
          lane,
          y,
          z,
          collected: false,
          mesh,
        });
        this.nextLetterDistance = this.distance + 125;
        return;
      }
    }

    if (allowPowerup && Math.random() < 0.45) {
      const kinds: PowerupKind[] = ['magnet', 'multiplier', 'sneakers', 'jetpack'];
      const chosen = kinds[Math.floor(Math.random() * kinds.length)];
      this.spawnPowerup(chosen, lane, z, y);
    }
  }

  private permutedLanes(): [number, number, number] {
    const arr: [number, number, number] = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * 8 Modular, Solvability-Guaranteed Subway Surfers Track Chunks:
   * Balances ground-vs-roof verticality, risk-reward coin trails, oncoming express trains,
   * and rhythmic micro-loop setups.
   */
  private spawnChunk(): void {
    const z0 = this.nextSpawnZ;
    let chunkIdx = Math.floor(Math.random() * 8);
    if (chunkIdx === this.lastChunkIdx) {
      chunkIdx = (chunkIdx + 1 + Math.floor(Math.random() * 6)) % 8;
    }
    this.lastChunkIdx = chunkIdx;

    const [a, b, c] = this.permutedLanes();

    switch (chunkIdx) {
      case 0: {
        // Chunk 1: Ramp-to-Roof Double Carriage Chain + Roof Signal vs Safe Ground Lane
        this.spawnObstacle('train', a, z0, true, false, 0);
        this.spawnCoinLine(a, z0 + 11.6, z0 + 11.6, 1, 1.25);
        this.spawnCoinLine(a, z0 + 9.5, z0 + 9.5, 1, 2.35);
        this.spawnCoinLine(a, z0 + 7.4, z0 + 7.4, 1, 3.45);
        this.spawnCoinLine(a, z0 + 4.5, z0 - 4.5, 4, TRAIN_ROOF_Y + 0.78);
        // Second elevated carriage across short roof jump gap
        this.spawnObstacle('train', a, z0 - 18.0, false, false, 0);
        this.spawnObstacle('high', a, z0 - 18.5, false, false, TRAIN_ROOF_Y);
        this.spawnCoinLine(a, z0 - 13, z0 - 23, 4, TRAIN_ROOF_Y + 0.62);
        this.maybeSpawnOstLetterOrPowerup(a, z0 - 9.5, TRAIN_ROOF_Y + 2.1, true);

        // Adjacent express & safe ground option
        this.spawnObstacle('train', b, z0 - 8, false, true, 0);
        this.spawnCoinLine(c, z0 + 5, z0 - 18, 5, 0.72);
        this.nextSpawnZ -= 35;
        break;
      }

      case 1: {
        // Chunk 2: Lateral Roof-to-Roof Transfer between Adjacent Trains
        const leftIdx = Math.random() < 0.5 ? 0 : 1;
        const adjIdx = leftIdx + 1;
        const groundIdx = leftIdx === 0 ? 2 : 0;

        this.spawnObstacle('train', leftIdx, z0, true, false, 0);
        this.spawnObstacle('train', adjIdx, z0 - 13.5, false, false, 0);
        this.spawnCoinLine(leftIdx, z0 + 5, z0 - 3, 4, TRAIN_ROOF_Y + 0.75);
        this.spawnCoinBridge(leftIdx, adjIdx, z0 - 4.5, z0 - 10.5, 4, TRAIN_ROOF_Y + 0.85, 1.1);
        this.spawnCoinLine(adjIdx, z0 - 11.5, z0 - 19, 4, TRAIN_ROOF_Y + 0.75);
        this.maybeSpawnOstLetterOrPowerup(adjIdx, z0 - 15, TRAIN_ROOF_Y + 1.05, true);

        // Ground slalom on remaining lane
        this.spawnObstacle('low', groundIdx, z0 + 2);
        this.spawnObstacle('high', groundIdx, z0 - 10);
        this.nextSpawnZ -= 31;
        break;
      }

      case 2: {
        // Chunk 3: Barrier Setup Before Train Ramp
        this.spawnObstacle('low', a, z0 + 9);
        this.spawnCoinLine(a, z0 + 11.5, z0 + 6.5, 3, 0.82, 1.5);
        this.spawnObstacle('high', a, z0 + 1);
        this.spawnObstacle('train', a, z0 - 14, true, false, 0);
        this.spawnCoinLine(a, z0 - 9, z0 - 19, 5, TRAIN_ROOF_Y + 0.75);
        this.maybeSpawnOstLetterOrPowerup(a, z0 - 14, TRAIN_ROOF_Y + 1.1, true);

        this.spawnObstacle('train', b, z0 - 4, false, false, 0);
        this.spawnObstacle('train', c, z0 - 4, false, true, 0);
        this.nextSpawnZ -= 33;
        break;
      }

      case 3: {
        // Chunk 4: Oncoming Express Risk-Reward Bait vs Quiet Safe Lane
        this.spawnCoinLine(a, z0 + 9, z0 + 1, 5, 0.75);
        this.maybeSpawnOstLetterOrPowerup(a, z0 + 4, 1.05, true);
        this.spawnObstacle('train', a, z0 - 16, false, true, 0);

        this.spawnObstacle('train', b, z0 - 2, true, false, 0);
        this.spawnCoinLine(b, z0 + 3, z0 - 7, 5, TRAIN_ROOF_Y + 0.75);

        // Quiet safe ground lane with fewer coins
        this.spawnCoinLine(c, z0 + 4, z0 - 10, 3, 0.72);
        this.nextSpawnZ -= 29;
        break;
      }

      case 4: {
        // Chunk 5: Rhythmic Micro-Loop Sprint Corridor (Jump -> Roll -> Jump)
        this.spawnObstacle('low', a, z0 + 6);
        this.spawnCoinLine(a, z0 + 8.5, z0 + 3.5, 4, 0.8, 1.6);
        this.spawnObstacle('high', a, z0 - 2.5);
        this.spawnCoinLine(a, z0, z0 - 5, 3, 0.55);
        this.spawnObstacle('low', a, z0 - 11);
        this.maybeSpawnOstLetterOrPowerup(a, z0 - 14.5, 1.05, true);

        this.spawnObstacle('train', b, z0 - 3, false, false, 0);
        this.spawnObstacle('low', c, z0 + 6);
        this.spawnObstacle('train', c, z0 - 6, false, false, 0);
        this.nextSpawnZ -= 27;
        break;
      }

      case 5: {
        // Chunk 6: Split Choice Gate (Jump Arc vs Roll Tunnel vs Roof Ramp)
        this.spawnObstacle('low', a, z0);
        this.spawnCoinLine(a, z0 + 3.5, z0 - 3.5, 5, 0.82, 1.9);

        this.spawnObstacle('high', b, z0);
        this.spawnCoinLine(b, z0 + 3, z0 - 3, 4, 0.55);
        this.maybeSpawnOstLetterOrPowerup(b, z0 - 5.5, 0.95, true);

        this.spawnObstacle('train', c, z0 - 6, true, false, 0);
        this.spawnCoinLine(c, z0 - 1, z0 - 11, 5, TRAIN_ROOF_Y + 0.78);
        this.nextSpawnZ -= 26;
        break;
      }

      case 6: {
        // Chunk 7: Double-Ramp Plaza flanking Center Express
        this.spawnObstacle('train', 0, z0 - 5, true, false, 0);
        this.spawnCoinLine(0, z0, z0 - 10, 5, TRAIN_ROOF_Y + 0.78);

        this.spawnObstacle('low', 1, z0 + 8);
        this.spawnObstacle('train', 1, z0 - 10, false, true, 0);

        this.spawnObstacle('train', 2, z0 - 5, true, false, 0);
        this.spawnCoinLine(2, z0, z0 - 10, 5, TRAIN_ROOF_Y + 0.78);
        this.maybeSpawnOstLetterOrPowerup(Math.random() < 0.5 ? 0 : 2, z0 - 5, TRAIN_ROOF_Y + 1.1, true);
        this.nextSpawnZ -= 29;
        break;
      }

      default: {
        // Chunk 8: S-Curve Track Slalom with Guiding Coin Trail
        const dir = Math.random() < 0.5 ? [0, 1, 2] : [2, 1, 0];
        this.spawnObstacle('low', dir[1], z0 + 7);
        this.spawnObstacle('high', dir[2], z0 + 7);
        this.spawnCoinLine(dir[0], z0 + 9, z0 + 3, 4, 0.72);

        this.spawnObstacle('train', dir[0], z0 - 7, false, false, 0);
        this.spawnObstacle('low', dir[2], z0 - 4);
        this.spawnCoinBridge(dir[0], dir[1], z0 + 2, z0 - 2, 3, 0.72, 0);
        this.spawnCoinLine(dir[1], z0 - 3, z0 - 12, 4, 0.72);
        this.maybeSpawnOstLetterOrPowerup(dir[1], z0 - 8, 1.05, true);
        this.nextSpawnZ -= 27;
        break;
      }
    }
  }

  private spawnBurst(x: number, y: number, z: number, isCoin: boolean, count = 6): void {
    const mat = isCoin ? this.coinParticleMat : this.sparkParticleMat;
    let spawned = 0;
    for (let i = 0; i < this.particlePool.length && spawned < count; i++) {
      const pt = this.particlePool[i];
      if (pt.active) continue;
      pt.active = true;
      pt.mesh.material = mat;
      pt.mesh.position.set(x, y, z);
      pt.mesh.scale.setScalar(1);
      pt.mesh.visible = true;
      pt.vx = (Math.random() - 0.5) * 6.5;
      pt.vy = 2.2 + Math.random() * 4.8;
      pt.vz = (Math.random() - 0.5) * 6.5;
      pt.life = 0.38;
      pt.maxLife = 0.38;
      spawned++;
    }
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (!this.contextLost) {
      if (this.mode === 'menu') {
        this.updateMenuShowcase(dt);
      } else if (this.mode === 'running') {
        this.updateGameplay(dt);
      }
      this.renderer.render(this.scene, this.camera);
    }

    this.scheduleNextTick();
  }

  private updateMenuShowcase(dt: number): void {
    this.idleTime += dt;
    const breath = Math.sin(this.idleTime * 2.4);

    this.runner.root.position.set(0, breath * 0.03, 0.4);
    this.runner.root.rotation.set(0, Math.PI + Math.sin(this.idleTime * 0.65) * 0.32, 0);
    this.runner.bodyPivot.position.y = 0;
    this.runner.torsoGroup.rotation.set(0.03, Math.sin(this.idleTime * 1.1) * 0.06, 0);
    this.runner.head.rotation.set(0, Math.sin(this.idleTime * 0.85) * 0.14, 0);
    this.runner.leftArm.shoulder.rotation.set(breath * 0.08, 0, -0.1);
    this.runner.leftArm.forearm.rotation.set(-0.42, 0, 0);
    this.runner.rightArm.shoulder.rotation.set(-breath * 0.08, 0, 0.1);
    this.runner.rightArm.forearm.rotation.set(-0.42, 0, 0);
    this.runner.leftLeg.hip.rotation.set(0.04, 0, 0);
    this.runner.leftLeg.shin.rotation.set(0.06, 0, 0);
    this.runner.rightLeg.hip.rotation.set(-0.04, 0, 0);
    this.runner.rightLeg.shin.rotation.set(0.06, 0, 0);
    this.runner.hoverboard.visible = false;

    for (const c of this.coins) {
      c.mesh.rotation.y += dt * 3;
    }

    this.camera.position.x = Math.sin(this.idleTime * 0.45) * 1.1;
    this.camera.position.y = 2.65 + Math.sin(this.idleTime * 0.6) * 0.18;
    this.camera.position.z = 5.2;
    _v3.set(0, 1.38, -5);
    this.camera.lookAt(_v3);
    this.skyDomeMesh.position.copy(this.camera.position);
    this.horizonSkyline.position.z = this.camera.position.z - 148;
  }

  private updateGameplay(dt: number): void {
    if (this.resumeRamp < 1) {
      this.resumeRamp = Math.min(1, this.resumeRamp + dt * 0.55);
    }

    // 1. Speed & Score progression
    const jetSpeedBoost = this.jetpackTimer > 0 ? 1.45 : 1.0;
    this.speed = Math.min(38, 19 + this.distance * 0.0082);
    const effectiveSpeed = this.speed * this.resumeRamp * jetSpeedBoost;
    const stepZ = effectiveSpeed * dt;
    this.distance += stepZ;

    const totalMult = this.baseMultiplier * (this.doubleScoreTimer > 0 ? 2 : 1);
    this.score += stepZ * 1.45 * totalMult;

    // Timers
    this.quizTimerRemaining -= dt;
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.doubleScoreTimer > 0) this.doubleScoreTimer = Math.max(0, this.doubleScoreTimer - dt);
    if (this.sneakersTimer > 0) this.sneakersTimer = Math.max(0, this.sneakersTimer - dt);
    if (this.boardTimer > 0) this.boardTimer = Math.max(0, this.boardTimer - dt);
    if (this.boardCooldown > 0) this.boardCooldown = Math.max(0, this.boardCooldown - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.introChaseTimer > 0) this.introChaseTimer = Math.max(0, this.introChaseTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.coyoteTimer > 0) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    // Jetpack flight & rainbow coin streams
    if (this.jetpackTimer > 0) {
      this.jetpackTimer = Math.max(0, this.jetpackTimer - dt);
      this.jetSpawnTimer -= dt;
      if (this.jetSpawnTimer <= 0) {
        this.jetSpawnTimer = 0.22;
        if (Math.random() < 0.25) {
          this.jetLane = Math.floor(Math.random() * 3);
        }
        this.spawnCoinLine(this.jetLane, -42, -50, 3, 6.9);
      }
      if (this.jetpackTimer === 0) {
        this.invulnTimer = Math.max(this.invulnTimer, 2.0);
        this.clearNearbyObstacles();
      }
    }

    // 2. Lane smooth damping + lean velocity
    const targetX = LANE_X[this.lane];
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 17, dt);
    const vx = (this.playerX - prevX) / Math.max(dt, 0.001);

    // 3. Move track segments endlessly
    for (const seg of this.segments) {
      seg.position.z += stepZ;
      if (seg.position.z > SEGMENT_LENGTH + 4) {
        seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH;
      }
    }

    // 4. Advance obstacles & check ramp / roof / minor stumble / major crash
    let supportY = 0;
    let crashed = false;
    let stumbled = false;
    let hitObstacle: SpawnedObstacle | null = null;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z += (effectiveSpeed + obs.extraSpeed * this.resumeRamp) * dt;
      obs.mesh.position.z = obs.z;

      if (obs.z > 24) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (obs.shattered || this.jetpackTimer > 0) continue;

      const dx = Math.abs(this.playerX - LANE_X[obs.lane]);
      if (obs.kind === 'train') {
        const halfLen = TRAIN_LENGTH / 2;
        const bodyFrontZ = obs.z + halfLen;
        const bodyBackZ = obs.z - halfLen;
        const rampFrontZ = bodyFrontZ + RAMP_LENGTH;

        if (dx < 1.18) {
          if (obs.hasRamp && 0 <= rampFrontZ && 0 >= bodyFrontZ) {
            const rampT = THREE.MathUtils.clamp(rampFrontZ / RAMP_LENGTH, 0, 1);
            const rampY = TRAIN_ROOF_Y * rampT;
            supportY = Math.max(supportY, rampY);
          }

          if (0 <= bodyFrontZ + 0.35 && 0 >= bodyBackZ - 0.35) {
            if (this.playerY >= TRAIN_ROOF_Y - 0.65) {
              supportY = Math.max(supportY, TRAIN_ROOF_Y);
              if (!obs.roofCounted) {
                obs.roofCounted = true;
                this.runTrainRoofs += 1;
              }
            } else if (dx < 0.96) {
              if (
                !obs.stumbledId &&
                0 < bodyFrontZ - 0.8 &&
                Math.abs(targetX - LANE_X[obs.lane]) < 0.5 &&
                Math.abs(prevX - LANE_X[obs.lane]) > 1.1
              ) {
                obs.stumbledId = true;
                this.lane = this.prevLane;
                stumbled = true;
                hitObstacle = obs;
              } else {
                crashed = true;
                hitObstacle = obs;
              }
            }
          }
        }
      } else if (obs.kind === 'low') {
        const top = obs.baseY + 1.05;
        if (Math.abs(obs.z) < 0.62 && this.playerY >= obs.baseY - 0.35 && this.playerY < top) {
          if (dx < 0.78 && this.playerY < obs.baseY + 0.78) {
            crashed = true;
            hitObstacle = obs;
          } else if (dx < 1.06 && !obs.stumbledId) {
            // Minor barrier graze / foot clip -> vault & stumble!
            obs.stumbledId = true;
            stumbled = true;
            hitObstacle = obs;
            if (this.playerY >= obs.baseY + 0.72) {
              this.playerY = top + 0.05;
              this.playerVy = Math.max(this.playerVy, 4.5);
            }
          }
        }
      } else if (obs.kind === 'high') {
        const playerTop = this.playerY + (this.slideTimer > 0 ? 0.72 : 1.72);
        if (
          Math.abs(obs.z) < 0.62 &&
          this.playerY < obs.baseY + 2.25 &&
          playerTop > obs.baseY + 1.42
        ) {
          if (dx < 0.78) {
            crashed = true;
            hitObstacle = obs;
          } else if (dx < 1.06 && !obs.stumbledId) {
            obs.stumbledId = true;
            stumbled = true;
            hitObstacle = obs;
          }
        }
      }
    }

    // 5. Vertical physics (Jetpack hover vs gravity + coyote/jump buffering)
    this.wasGrounded = this.isGrounded;
    if (this.jetpackTimer > 0) {
      this.playerY = THREE.MathUtils.damp(this.playerY, 6.8, 7, dt);
      this.playerVy = 0;
      this.isGrounded = false;
      this.slideTimer = 0;
    } else {
      this.playerVy -= 39.5 * dt;
      this.playerY += this.playerVy * dt;

      if (this.playerY <= supportY) {
        if (!this.wasGrounded && this.playerVy < -8) {
          this.landingSquash = Math.min(0.24, Math.abs(this.playerVy) * 0.008);
          this.spawnBurst(this.playerX, supportY + 0.08, 0, false, 4);
        }
        this.playerY = supportY;
        this.playerVy = 0;
        this.isGrounded = true;
        this.coyoteTimer = 0.09;

        if (this.jumpBufferTimer > 0) {
          this.executeJump();
        }
      } else {
        this.isGrounded = false;
      }
    }

    this.landingSquash = THREE.MathUtils.damp(this.landingSquash, 0, 14, dt);
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // 6. Handle Stumble vs Fatal Crash
    if (stumbled && !crashed && this.invulnTimer <= 0 && this.boardTimer <= 0) {
      if (this.stumbleTimer > 0) {
        crashed = true;
      } else {
        this.stumbleTimer = 6.0;
        this.shakeTimer = 0.24;
        soundEngine.playSlide();
        this.spawnBurst(this.playerX, this.playerY + 0.6, 0, false, 8);
        this.callbacks.onEventToast?.('Stumble! Inspector Closing In!');
      }
    }

    if (crashed && hitObstacle) {
      if (this.invulnTimer > 0) {
        // Ignore while invulnerable
      } else if (this.boardTimer > 0) {
        this.boardTimer = 0;
        this.invulnTimer = 2.2;
        this.shakeTimer = 0.32;
        hitObstacle.shattered = true;
        hitObstacle.mesh.visible = false;
        soundEngine.playCrash();
        this.spawnBurst(this.playerX, this.playerY + 1, 0, false, 16);
        this.callbacks.onEventToast?.('Hoverboard Shield Saved You!');
      } else {
        soundEngine.playCrash();
        this.shakeTimer = 0.35;
        this.mode = 'paused';
        const snap = this.getSnapshot();
        this.callbacks.onHudUpdate(snap);
        this.callbacks.onQuizTrigger('crash', snap);
        return;
      }
    }

    // 7. Coins update + Magnet pull + collection (pooled)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += stepZ;
      if (c.z > 14 || c.collected) {
        this.releaseCoinMesh(c.mesh);
        this.coins.splice(i, 1);
        continue;
      }

      if (this.magnetTimer > 0 && c.z > -25 && c.z < 4) {
        c.x = THREE.MathUtils.damp(c.x, this.playerX, 15, dt);
        c.y = THREE.MathUtils.damp(c.y, this.playerY + 0.9, 15, dt);
        c.z = THREE.MathUtils.damp(c.z, 0, 15, dt);
      }

      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y += dt * 4.4;

      const dy = c.y - (this.playerY + 0.85);
      const dxC = c.x - this.playerX;
      const distSq = dxC * dxC + dy * dy + c.z * c.z;
      if (distSq < 1.55) {
        c.collected = true;
        this.coinCount += 1;
        this.score += 10 * totalMult;
        soundEngine.playCoin();
        this.spawnBurst(c.x, c.y, c.z, true, 5);
      }
    }

    // 8. Powerups update + collection
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.z += stepZ;
      if (p.z > 14 || p.collected) {
        this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
        continue;
      }
      p.mesh.position.set(LANE_X[p.lane], p.y + Math.sin(this.distance * 0.25) * 0.15, p.z);
      p.mesh.rotation.y += dt * 2.6;

      const dx = Math.abs(LANE_X[p.lane] - this.playerX);
      const dy = Math.abs(p.y - (this.playerY + 0.9));
      if (dx < 1.1 && dy < 1.35 && Math.abs(p.z) < 1.2) {
        p.collected = true;
        this.runPowerups += 1;
        soundEngine.playPowerup();
        this.spawnBurst(LANE_X[p.lane], p.y, 0, false, 12);
        if (p.kind === 'magnet') {
          this.magnetTimer = 10;
          this.callbacks.onEventToast?.('Coin Magnet Active!');
        } else if (p.kind === 'multiplier') {
          this.doubleScoreTimer = 10;
          this.callbacks.onEventToast?.('2x Score Multiplier Active!');
        } else if (p.kind === 'sneakers') {
          this.sneakersTimer = 10;
          this.callbacks.onEventToast?.('Super Sneakers Active!');
        } else {
          this.jetpackTimer = 7;
          this.jetSpawnTimer = 0.05;
          this.jetLane = this.lane;
          this.callbacks.onEventToast?.('Paint Jetpack Launch!');
        }
      }
    }

    // 9. OST Word Hunt Letters (O -> S -> T)
    let triggeredWordHunt = false;
    for (let i = this.ostLetters.length - 1; i >= 0; i--) {
      const l = this.ostLetters[i];
      l.z += stepZ;
      if (l.z > 14 || l.collected) {
        this.scene.remove(l.mesh);
        this.ostLetters.splice(i, 1);
        continue;
      }
      const bobY = l.y + Math.sin(this.distance * 0.28) * 0.18;
      l.mesh.position.set(LANE_X[l.lane], bobY, l.z);
      l.mesh.rotation.y += dt * 2.8;

      const dx = Math.abs(LANE_X[l.lane] - this.playerX);
      const dy = Math.abs(l.y - (this.playerY + 0.95));
      if (dx < 1.2 && dy < 1.65 && Math.abs(l.z) < 1.35) {
        l.collected = true;
        soundEngine.playQuizCorrect();
        this.spawnBurst(LANE_X[l.lane], l.y, 0, true, 14);
        this.score += 50 * totalMult;
        if (!this.collectedOstLetters.includes(l.letter)) {
          this.collectedOstLetters.push(l.letter);
        }
        if (this.collectedOstLetters.length >= 3) {
          triggeredWordHunt = true;
        } else {
          const left = 3 - this.collectedOstLetters.length;
          this.callbacks.onEventToast?.(`Collected "${l.letter}"! ${left} more for OST Bonus`);
        }
      }
    }

    if (triggeredWordHunt) {
      this.mode = 'paused';
      const snap = this.getSnapshot();
      this.callbacks.onHudUpdate(snap);
      this.callbacks.onQuizTrigger('wordhunt', snap);
      return;
    }

    // 10. Spawn upcoming modular chunks far ahead
    this.nextSpawnZ += stepZ;
    while (this.nextSpawnZ > -155) {
      this.spawnChunk();
    }

    // 11. Pooled particle bursts update
    for (let i = 0; i < this.particlePool.length; i++) {
      const pt = this.particlePool[i];
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        pt.mesh.visible = false;
        continue;
      }
      pt.vy -= 18 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.position.z += pt.vz * dt;
      pt.mesh.scale.setScalar(pt.life / pt.maxLife);
    }

    // 12. Animate Runner & Chaser Inspector + Dog
    this.animateRunner(dt, vx, supportY, effectiveSpeed);
    this.animateChaser(dt);

    // 13. Classic Elevated Subway Surfers Chase Camera with Gentle Banking
    const targetCamX = this.playerX * 0.58;
    const targetCamY = 4.9 + this.playerY * 0.84;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 8.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 7.5, dt);
    this.camera.position.z = 6.35;

    if (this.shakeTimer > 0) {
      this.camera.position.x += (Math.random() - 0.5) * 0.24;
      this.camera.position.y += (Math.random() - 0.5) * 0.24;
    }

    _v3.set(this.playerX * 0.74, 1.38 + this.playerY * 0.84, -13.5);
    this.camera.lookAt(_v3);

    const targetBank = THREE.MathUtils.clamp(-vx * 0.0045, -0.055, 0.055);
    this.cameraBank = THREE.MathUtils.damp(this.cameraBank, targetBank, 10, dt);
    this.camera.rotation.z += this.cameraBank;
    this.skyDomeMesh.position.copy(this.camera.position);
    this.horizonSkyline.position.z = this.camera.position.z - 148;

    const desiredFov = 58 + (effectiveSpeed - 19) * 0.42;
    if (Math.abs(this.camera.fov - desiredFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, desiredFov, 5, dt);
      this.camera.updateProjectionMatrix();
    }

    // 14. Check 30-second OST Checkpoint Timer
    if (this.quizTimerRemaining <= 0) {
      this.quizTimerRemaining = 0;
      this.mode = 'paused';
      const snap = this.getSnapshot();
      this.callbacks.onHudUpdate(snap);
      this.callbacks.onQuizTrigger('timer', snap);
      return;
    }

    // Throttled HUD updates (~15Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private animateChaser(dt: number): void {
    const active = (this.stumbleTimer > 0 || this.introChaseTimer > 0) && this.jetpackTimer <= 0;
    if (!active) {
      this.chaser.root.visible = false;
      return;
    }

    this.chaser.root.visible = true;
    this.chaserX = THREE.MathUtils.damp(this.chaserX, this.playerX, 7.5, dt);

    const chaseTimeLeft = Math.max(this.stumbleTimer, this.introChaseTimer);
    const targetZ = chaseTimeLeft < 1.0 ? 2.4 + (1.0 - chaseTimeLeft) * 6.5 : 2.25;
    this.chaser.root.position.set(this.chaserX, 0, targetZ);

    const cCycle = this.runCycle * 1.1;
    const swing = Math.sin(cCycle) * 0.8;
    this.chaser.inspLeftLeg.rotation.x = swing;
    this.chaser.inspRightLeg.rotation.x = -swing;
    this.chaser.inspLeftArm.rotation.x = -swing * 0.9;
    this.chaser.inspRightArm.rotation.x = -1.1 + Math.sin(cCycle * 1.3) * 0.25;
    this.chaser.inspector.position.y = Math.abs(Math.cos(cCycle)) * 0.08;

    this.chaser.dog.position.y = Math.abs(Math.sin(cCycle * 1.25)) * 0.14;
    for (let i = 0; i < this.chaser.dogLegs.length; i++) {
      this.chaser.dogLegs[i].rotation.x = (i < 2 ? 1 : -1) * Math.sin(cCycle * 1.25) * 0.65;
    }
  }

  private animateRunner(dt: number, vx: number, supportY: number, effectiveSpeed: number): void {
    this.runner.root.position.set(this.playerX, this.playerY, 0);
    this.runner.root.rotation.set(0, 0, 0);

    const heightAboveSupport = Math.max(0, this.playerY - supportY);
    this.runner.shadowPlane.position.y = -heightAboveSupport + 0.025;
    const shadowScale = Math.max(0.35, 1 - heightAboveSupport * 0.11);
    this.runner.shadowPlane.scale.setScalar(shadowScale);

    if (this.invulnTimer > 0) {
      this.runner.bodyPivot.visible = Math.floor(this.invulnTimer * 14) % 2 === 0;
    } else {
      this.runner.bodyPivot.visible = true;
    }

    const showBoots = this.sneakersTimer > 0;
    this.runner.leftLeg.superBoot.visible = showBoots;
    this.runner.rightLeg.superBoot.visible = showBoots;

    const onJetpack = this.jetpackTimer > 0;
    this.runner.jetpack.visible = onJetpack;
    if (onJetpack) {
      const flicker = 0.85 + Math.random() * 0.45;
      this.runner.jetpackFlameL.scale.set(1, flicker, 1);
      this.runner.jetpackFlameR.scale.set(1, flicker, 1);
    }

    const onBoard = this.boardTimer > 0 && !onJetpack;
    this.runner.hoverboard.visible = onBoard;

    const leanZ = THREE.MathUtils.clamp(-vx * 0.03, -0.34, 0.34);
    this.runner.bodyPivot.rotation.z = leanZ;
    this.runner.hoverboard.rotation.z = leanZ * 0.9;

    const squashY = 1 - this.landingSquash;
    const stretchXZ = 1 + this.landingSquash * 0.35;

    if (onJetpack) {
      this.runner.bodyPivot.scale.set(1, 1, 1);
      this.runner.bodyPivot.rotation.x = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.x, 0.32, 10, dt);
      this.runner.bodyPivot.rotation.y = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.y, 0, 10, dt);
      this.runner.bodyPivot.position.y = Math.sin(this.distance * 0.2) * 0.08;
      this.runner.torsoGroup.rotation.set(0.1, 0, 0);
      this.runner.head.rotation.set(-0.2, 0, 0);

      this.runner.leftLeg.hip.rotation.set(-0.22, 0, 0);
      this.runner.leftLeg.shin.rotation.set(0.28, 0, 0);
      this.runner.rightLeg.hip.rotation.set(-0.1, 0, 0);
      this.runner.rightLeg.shin.rotation.set(0.18, 0, 0);

      this.runner.leftArm.shoulder.rotation.set(0.2, 0, -0.38);
      this.runner.leftArm.forearm.rotation.set(-0.25, 0, 0);
      this.runner.rightArm.shoulder.rotation.set(0.2, 0, 0.38);
      this.runner.rightArm.forearm.rotation.set(-0.25, 0, 0);
    } else if (this.slideTimer > 0) {
      this.runner.bodyPivot.scale.set(
        stretchXZ,
        THREE.MathUtils.damp(this.runner.bodyPivot.scale.y, 0.52, 18, dt),
        stretchXZ,
      );
      this.runner.bodyPivot.rotation.x = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.x, -0.42, 18, dt);
      this.runner.bodyPivot.rotation.y = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.y, 0, 14, dt);
      this.runner.bodyPivot.position.y = 0;
      this.runner.torsoGroup.rotation.set(-0.2, 0, 0);
      this.runner.head.rotation.set(0.35, 0, 0);

      this.runner.leftLeg.hip.rotation.set(0.95, 0, 0);
      this.runner.leftLeg.shin.rotation.set(0.15, 0, 0);
      this.runner.rightLeg.hip.rotation.set(-0.35, 0, 0);
      this.runner.rightLeg.shin.rotation.set(1.25, 0, 0);

      this.runner.leftArm.shoulder.rotation.set(-0.75, 0, -0.2);
      this.runner.leftArm.forearm.rotation.set(-0.5, 0, 0);
      this.runner.rightArm.shoulder.rotation.set(-0.75, 0, 0.2);
      this.runner.rightArm.forearm.rotation.set(-0.5, 0, 0);
    } else if (onBoard) {
      this.runner.bodyPivot.scale.set(
        stretchXZ,
        THREE.MathUtils.damp(this.runner.bodyPivot.scale.y, squashY, 14, dt),
        stretchXZ,
      );
      this.runner.bodyPivot.rotation.x = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.x, 0.06, 14, dt);
      this.runner.bodyPivot.rotation.y = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.y, 0.42, 14, dt);
      const hoverFloat = Math.sin(this.distance * 0.35) * 0.045;
      this.runner.bodyPivot.position.y = 0.08 + hoverFloat;
      this.runner.hoverboard.position.y = hoverFloat;

      this.runner.torsoGroup.rotation.set(0.08, -0.25, 0);
      this.runner.head.rotation.set(-0.04, -0.18, 0);

      this.runner.leftLeg.hip.rotation.set(0.32, 0, 0);
      this.runner.leftLeg.shin.rotation.set(0.42, 0, 0);
      this.runner.rightLeg.hip.rotation.set(-0.28, 0, 0);
      this.runner.rightLeg.shin.rotation.set(0.38, 0, 0);

      this.runner.leftArm.shoulder.rotation.set(0.1, 0, -0.55);
      this.runner.leftArm.forearm.rotation.set(-0.35, 0, 0);
      this.runner.rightArm.shoulder.rotation.set(-0.1, 0, 0.55);
      this.runner.rightArm.forearm.rotation.set(-0.35, 0, 0);
    } else {
      this.runner.bodyPivot.scale.set(
        stretchXZ,
        THREE.MathUtils.damp(this.runner.bodyPivot.scale.y, squashY, 16, dt),
        stretchXZ,
      );
      this.runner.bodyPivot.rotation.y = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.y, 0, 14, dt);

      if (!this.isGrounded) {
        this.runner.bodyPivot.rotation.x = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.x, 0.14, 12, dt);
        this.runner.bodyPivot.position.y = 0;
        this.runner.torsoGroup.rotation.set(0.1, 0, 0);
        this.runner.head.rotation.set(-0.06, 0, 0);

        this.runner.leftLeg.hip.rotation.set(0.75, 0, 0);
        this.runner.leftLeg.shin.rotation.set(0.95, 0, 0);
        this.runner.rightLeg.hip.rotation.set(-0.35, 0, 0);
        this.runner.rightLeg.shin.rotation.set(0.65, 0, 0);

        this.runner.leftArm.shoulder.rotation.set(-0.95, 0, -0.25);
        this.runner.leftArm.forearm.rotation.set(-0.7, 0, 0);
        this.runner.rightArm.shoulder.rotation.set(0.45, 0, 0.25);
        this.runner.rightArm.forearm.rotation.set(-0.85, 0, 0);
      } else {
        this.runCycle += dt * effectiveSpeed * 0.64;
        const phase = this.runCycle;
        const swing = Math.sin(phase) * 0.92;
        const swingOpp = -swing;

        this.runner.bodyPivot.rotation.x = THREE.MathUtils.damp(this.runner.bodyPivot.rotation.x, 0.16, 14, dt);
        this.runner.bodyPivot.position.y = Math.abs(Math.cos(phase)) * 0.085;
        this.runner.torsoGroup.rotation.set(0.06, Math.sin(phase) * 0.1, 0);
        this.runner.head.rotation.set(-0.08, -Math.sin(phase) * 0.05, 0);

        this.runner.leftLeg.hip.rotation.set(swing, 0, 0);
        this.runner.leftLeg.shin.rotation.set(Math.max(0.08, 0.62 - Math.cos(phase) * 0.58), 0, 0);

        this.runner.rightLeg.hip.rotation.set(swingOpp, 0, 0);
        this.runner.rightLeg.shin.rotation.set(Math.max(0.08, 0.62 + Math.cos(phase) * 0.58), 0, 0);

        this.runner.leftArm.shoulder.rotation.set(swingOpp * 0.82, 0, -0.26);
        this.runner.leftArm.forearm.rotation.set(-0.78 + Math.sin(phase) * 0.25, 0, 0);
        this.runner.rightArm.shoulder.rotation.set(swing * 0.82, 0, 0.26);
        this.runner.rightArm.forearm.rotation.set(-0.78 - Math.sin(phase) * 0.25, 0, 0);
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.mode !== 'running') return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.triggerLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.triggerRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.triggerJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.triggerSlide();
        break;
      case 'KeyH':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        this.activateHoverboard();
        break;
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'running') return;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchActive = true;
    this.swipedDuringTouch = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.touchActive || this.swipedDuringTouch || this.mode !== 'running') return;
    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    const threshold = 22;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    this.swipedDuringTouch = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.triggerLeft();
      else this.triggerRight();
    } else {
      if (dy < 0) this.triggerJump();
      else this.triggerSlide();
    }
  };

  private onPointerUp = (): void => {
    if (this.touchActive && !this.swipedDuringTouch && this.mode === 'running') {
      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        this.activateHoverboard();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    }
    this.touchActive = false;
  };

  private onResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.clearDynamicEntities();
    this.assets.dispose();
    this.textures.dispose();
    this.particleGeo.dispose();
    this.coinParticleMat.dispose();
    this.sparkParticleMat.dispose();
    this.trackShared.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
