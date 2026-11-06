import * as THREE from "three";
import { loadPrefs, type Prefs } from "./prefs";
import type { KV } from "./loreRead";

export type RecruitGender = "m" | "f";

export interface ThreeLobbyOptions {
  container?: HTMLElement | null;
  enabled?: boolean;
  initialGender?: RecruitGender;
  store?: KV | null;
  rendererFactory?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer | null;
}

/** Verifica se o navegador atual suporta WebGL (WebGL 2 ou WebGL 1). */
export function isWebGLAvailable(): boolean {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!(
      (window as any).WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl") || (canvas.getContext as any)("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Componente ThreeLobby (JH-07):
 * Inicializa e gerencia a cena 3D interativa de fundo no lobby de personagens:
 * - Plataforma de pedra com portal espiritual Senkaimon (Torii)
 * - Iluminação atmosférica noturna/espiritual (ambiente azulada, pontual dourada e brilho de Reiatsu)
 * - Partículas de Reiatsu flutuantes e borboletas pretas espirituais (Jigokuchō)
 * - Modelo 3D estilizado do Recruta Shinigami (Shihakusho preto e Asauchi embainhada)
 * - Rotação orbital de 360° por arraste de mouse/touch com amortecimento
 * - Transição cinematográfica de entrada no mundo (zoom no portal e flash de luz)
 * - Fallback gracioso quando WebGL não está disponível
 * - Desmontagem completa sem vazamento de memória
 */
export class ThreeLobby {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private flashEl: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  private running = false;
  private disposed = false;
  private isFallback = false;
  private enabled = true;
  private gender: RecruitGender = "m";

  private animFrameId: number | null = null;
  private startTime = 0;
  private lastTime = 0;

  // Nós e referências para animações
  private avatarGroup: THREE.Group | null = null;
  private hairGroup: THREE.Group | null = null;
  private chestMesh: THREE.Mesh | null = null;
  private sleevesGroup: THREE.Group | null = null;
  private portalVeil: THREE.Mesh | null = null;
  private portalLight: THREE.PointLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private reiatsuPoints: THREE.Points | null = null;
  private reiatsuPositions: Float32Array | null = null;
  private reiatsuSpeeds: Float32Array | null = null;
  private reiatsuRadii: Float32Array | null = null;
  private reiatsuOffsets: Float32Array | null = null;
  private butterflies: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; speed: number; phase: number; radius: number; height: number }[] = [];

  // Rotação orbital interativa (drag)
  private currentRotationY = 0;
  private targetRotationY = 0;
  private isDragging = false;
  private pointerStartX = 0;
  private pointerLastX = 0;

  // Listeners para limpeza
  private onResizeHandler: (() => void) | null = null;
  private onPointerDownHandler: ((e: PointerEvent) => void) | null = null;
  private onPointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private onPointerUpHandler: ((e: PointerEvent) => void) | null = null;

  // Geometrias e materiais para descarte explícito
  private disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
    geometries: [],
    materials: [],
  };

  constructor(opts: ThreeLobbyOptions = {}) {
    this.gender = opts.initialGender ?? "m";
    if (opts.enabled !== undefined) {
      this.enabled = opts.enabled;
    } else {
      try {
        this.enabled = loadPrefs(opts.store ?? null).threeLobby;
      } catch {
        this.enabled = true;
      }
    }

    if (opts.container) {
      this.mount(opts.container, opts.rendererFactory);
    }
  }

  /** Retorna se o renderizador 3D está ativo e suportado */
  public isWebGLSupported(): boolean {
    return !this.isFallback;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isActive(): boolean {
    return this.running && !this.isFallback && this.enabled;
  }

  public getGender(): RecruitGender {
    return this.gender;
  }

  /** Ativa ou desativa a renderização 3D (ex: bi.prefs) */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.container) {
      this.container.classList.toggle("has-3d-lobby", this.enabled && !this.isFallback);
    }
    if (!this.enabled) {
      this.pause();
      if (this.canvas) this.canvas.style.display = "none";
    } else {
      if (this.canvas) this.canvas.style.display = "block";
      this.resume();
    }
  }

  /** Conecta o ThreeLobby ao elemento do DOM */
  public mount(container: HTMLElement, rendererFactory?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer | null): void {
    if (this.disposed) return;
    this.container = container;

    // Elemento flash para a transição de entrada
    let flash = container.querySelector<HTMLElement>(".three-lobby-flash");
    if (!flash) {
      flash = document.createElement("div");
      flash.className = "three-lobby-flash";
      container.prepend(flash);
    }
    this.flashEl = flash;

    // Verificação de suporte a WebGL
    const webglOk = isWebGLAvailable() || !!rendererFactory;
    if (!webglOk) {
      this.isFallback = true;
      container.classList.add("three-lobby-fallback");
      return;
    }

    // Criação do canvas
    const canvas = document.createElement("canvas");
    canvas.className = "three-lobby-canvas";
    canvas.setAttribute("aria-hidden", "true");
    container.prepend(canvas);
    this.canvas = canvas;

    // Inicialização do WebGLRenderer
    try {
      if (rendererFactory) {
        this.renderer = rendererFactory(canvas);
      } else {
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
      }

      if (!this.renderer) {
        throw new Error("WebGLRenderer creation returned null");
      }

      this.renderer.setPixelRatio(typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
    } catch {
      this.isFallback = true;
      container.classList.add("three-lobby-fallback");
      if (this.canvas) {
        this.canvas.remove();
        this.canvas = null;
      }
      return;
    }

    container.classList.add("has-3d-lobby");

    // Construção da Cena
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.05);

    // Câmera
    const width = container.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800) || 800;
    const height = container.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 600) || 600;
    this.camera = new THREE.PerspectiveCamera(45, width / Math.max(height, 1), 0.1, 100);
    this.camera.position.set(0, 1.6, 4.0);
    this.camera.lookAt(0, 1.25, 0);

    this.renderer.setSize(width, height);

    // Monta ambiente, iluminação, partículas e avatar
    this.setupLighting();
    this.setupEnvironment();
    this.setupParticles();
    this.setupAvatar();

    // Eventos
    this.setupEventListeners();

    if (this.enabled) {
      this.resume();
    }
  }

  /** Configura iluminação atmosférica noturna/espiritual */
  private setupLighting(): void {
    if (!this.scene) return;

    // Luz ambiente espiritual azulada
    this.ambientLight = new THREE.AmbientLight(0x1a2e4c, 1.2);
    this.scene.add(this.ambientLight);

    // Luz pontual dourada quente (lanternas e braseiro de pedra)
    const torchLight = new THREE.PointLight(0xffb03a, 2.5, 12, 1.2);
    torchLight.position.set(-1.8, 1.8, 1.2);
    this.scene.add(torchLight);

    const torchLightR = new THREE.PointLight(0xff9f2a, 1.8, 10, 1.2);
    torchLightR.position.set(1.8, 1.8, 1.2);
    this.scene.add(torchLightR);

    // Luz pontual azul/ciano do portal Senkaimon
    this.portalLight = new THREE.PointLight(0x38e1ff, 2.8, 14, 1.1);
    this.portalLight.position.set(0, 2.0, -0.6);
    this.scene.add(this.portalLight);

    // Luz celestial direcional para realce de contorno anime (rim light)
    const rimLight = new THREE.DirectionalLight(0x7599e0, 1.1);
    rimLight.position.set(2.5, 5, 3);
    this.scene.add(rimLight);
  }

  /** Registra geometria para descarte limpo */
  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.disposables.geometries.push(geo);
    return geo;
  }

  /** Registra material para descarte limpo */
  private trackMat<T extends THREE.Material>(mat: T): T {
    this.disposables.materials.push(mat);
    return mat;
  }

  /** Constrói o cenário: plataforma de pedra e portal Senkaimon (Torii) */
  private setupEnvironment(): void {
    if (!this.scene) return;

    const envGroup = new THREE.Group();

    // 1. Plataforma de Pedra (degraus e dais místico)
    const baseGeo = this.trackGeo(new THREE.CylinderGeometry(2.7, 2.9, 0.35, 24));
    const stoneMat1 = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9, metalness: 0.1 }));
    const baseMesh = new THREE.Mesh(baseGeo, stoneMat1);
    baseMesh.position.y = 0.175;
    envGroup.add(baseMesh);

    const stepGeo = this.trackGeo(new THREE.CylinderGeometry(2.4, 2.55, 0.25, 24));
    const stoneMat2 = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x242d3d, roughness: 0.85, metalness: 0.15 }));
    const stepMesh = new THREE.Mesh(stepGeo, stoneMat2);
    stepMesh.position.y = 0.42;
    envGroup.add(stepMesh);

    // Círculo central com runas de pedra
    const daisGeo = this.trackGeo(new THREE.CylinderGeometry(1.4, 1.5, 0.05, 24));
    const daisMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x203248, roughness: 0.8, metalness: 0.2 }));
    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.position.y = 0.55;
    envGroup.add(daisMesh);

    // Lanternas de pedra (Tōrō) nas laterais da plataforma
    const lanternMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x222733, roughness: 0.9 }));
    const lanternGlowMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xffaa33 }));

    for (const lx of [-1.9, 1.9]) {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, 0.55, 0.5);

      const lBase = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8)), lanternMat);
      lBase.position.y = 0.1;
      const lPost = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.09, 0.1, 0.5, 8)), lanternMat);
      lPost.position.y = 0.45;
      const lCore = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.22)), lanternGlowMat);
      lCore.position.y = 0.75;
      const lRoof = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.32, 0.2, 4)), lanternMat);
      lRoof.position.y = 0.95;
      lRoof.rotation.y = Math.PI / 4;

      lGroup.add(lBase, lPost, lCore, lRoof);
      envGroup.add(lGroup);
    }

    // 2. Portal Senkaimon (Torii Espiritual)
    const toriiGroup = new THREE.Group();
    toriiGroup.position.set(0, 0, -0.6);

    const pillarMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x121419, roughness: 0.4, metalness: 0.25 }));
    const goldMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xa88a44, roughness: 0.35, metalness: 0.8 }));
    const stoneShoeMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x2c3444, roughness: 0.85 }));

    for (const px of [-1.55, 1.55]) {
      // Base de pedra do pilar
      const shoe = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.4, 12)), stoneShoeMat);
      shoe.position.set(px, 0.45, 0);
      toriiGroup.add(shoe);

      // Colunas verticais do Senkaimon
      const pillar = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 12)), pillarMat);
      pillar.position.set(px, 2.3, 0);
      toriiGroup.add(pillar);

      // Anéis dourados decorativos
      const ring = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.155, 0.02, 8, 16)), goldMat);
      ring.position.set(px, 3.1, 0);
      ring.rotation.x = Math.PI / 2;
      toriiGroup.add(ring);
    }

    // Lintel inferior (Shimoki / Nuki)
    const nuki = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(3.5, 0.16, 0.22)), pillarMat);
    nuki.position.set(0, 3.3, 0);
    toriiGroup.add(nuki);

    // Lintel superior (Kasagi) com leve curvatura estética
    const kasagi = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(4.0, 0.26, 0.3)), pillarMat);
    kasagi.position.set(0, 3.75, 0);
    toriiGroup.add(kasagi);

    // Ponteiras douradas no topo do portal
    for (const kx of [-2.02, 2.02]) {
      const cap = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.12, 0.3, 0.34)), goldMat);
      cap.position.set(kx, 3.75, 0);
      toriiGroup.add(cap);
    }

    // Portas de correr do Senkaimon (Shoji) entreabertas
    const doorFrameMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x16181f, roughness: 0.7 }));
    const doorPaperMat = this.trackMat(new THREE.MeshStandardMaterial({
      color: 0x3d688c,
      emissive: 0x0a1e30,
      roughness: 0.5,
      transparent: true,
      opacity: 0.65,
    }));

    for (const [dx, sign] of [[-0.85, -1], [0.85, 1]] as const) {
      const doorGroup = new THREE.Group();
      doorGroup.position.set(dx, 1.85, -0.05);

      const frame = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.85, 2.7, 0.06)), doorFrameMat);
      const paper = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.75, 2.55, 0.04)), doorPaperMat);
      doorGroup.add(frame, paper);
      toriiGroup.add(doorGroup);
    }

    // Véu Espiritual Dimensional (o portal Senkaimon com energia de Reiatsu no centro)
    const veilGeo = this.trackGeo(new THREE.PlaneGeometry(1.6, 2.8));
    const veilMat = this.trackMat(new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));
    this.portalVeil = new THREE.Mesh(veilGeo, veilMat);
    this.portalVeil.position.set(0, 1.85, -0.08);
    toriiGroup.add(this.portalVeil);

    envGroup.add(toriiGroup);
    this.scene.add(envGroup);
  }

  /** Cria partículas espirituais flutuantes de Reiatsu e borboletas Jigokuchō */
  private setupParticles(): void {
    if (!this.scene) return;

    // 1. Partículas de Reiatsu
    const count = 90;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 0.5 + Math.random() * 1.8;
      const angle = Math.random() * Math.PI * 2;
      const y = 0.4 + Math.random() * 3.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 0.2;

      speeds[i] = 0.005 + Math.random() * 0.012;
      radii[i] = radius;
      offsets[i] = angle;
    }

    const pointsGeo = this.trackGeo(new THREE.BufferGeometry());
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pointsMat = this.trackMat(new THREE.PointsMaterial({
      color: 0x5ce1e6,
      size: 0.065,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    }));

    this.reiatsuPoints = new THREE.Points(pointsGeo, pointsMat);
    this.reiatsuPositions = positions;
    this.reiatsuSpeeds = speeds;
    this.reiatsuRadii = radii;
    this.reiatsuOffsets = offsets;
    this.scene.add(this.reiatsuPoints);

    // 2. Jigokuchō (Borboletas do Inferno pretas com borda espiritual)
    const butterflyMat = this.trackMat(new THREE.MeshStandardMaterial({
      color: 0x050608,
      emissive: 0x1f0b2a,
      roughness: 0.6,
      side: THREE.DoubleSide,
    }));

    const wingGeo = this.trackGeo(new THREE.BufferGeometry());
    // Asa triangular elegante com pivô na base
    const vertices = new Float32Array([
      0, 0, 0,
      0.08, 0.08, 0,
      0.02, 0.12, 0,
      0, 0, 0,
      0.08, -0.06, 0,
      0.03, -0.1, 0,
    ]);
    wingGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    wingGeo.computeVertexNormals();

    this.butterflies = [];
    for (let b = 0; b < 5; b++) {
      const bGroup = new THREE.Group();

      const wingL = new THREE.Mesh(wingGeo, butterflyMat);
      const wingR = new THREE.Mesh(wingGeo, butterflyMat);
      wingR.scale.set(-1, 1, 1);

      bGroup.add(wingL, wingR);
      this.scene.add(bGroup);

      this.butterflies.push({
        group: bGroup,
        wingL,
        wingR,
        speed: 0.6 + Math.random() * 0.5,
        phase: (b / 5) * Math.PI * 2,
        radius: 1.1 + Math.random() * 0.9,
        height: 1.2 + Math.random() * 1.5,
      });
    }
  }

  /** Constrói o avatar 3D estilizado do Recruta Shinigami */
  private setupAvatar(): void {
    if (!this.scene) return;

    this.avatarGroup = new THREE.Group();
    this.avatarGroup.position.set(0, 0.56, 0.25);

    // Materiais do Shinigami
    const shihakushoMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.85 }));
    const shitagiWhiteMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xedeef2, roughness: 0.6 }));
    const skinMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xf5d3b0, roughness: 0.7 }));
    const strawMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xc4a36e, roughness: 0.85 }));

    // 1. Pés e Sandálias (Waraji e Tabi)
    for (const fx of [-0.14, 0.14]) {
      const footGroup = new THREE.Group();
      footGroup.position.set(fx, 0.05, 0.02);

      const tabi = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.12, 0.09, 0.24)), shitagiWhiteMat);
      const waraji = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.13, 0.03, 0.25)), strawMat);
      waraji.position.y = -0.04;
      footGroup.add(tabi, waraji);
      this.avatarGroup.add(footGroup);
    }

    // 2. Hakama (Calças pretas amplas plissadas)
    for (const lx of [-0.13, 0.13]) {
      const leg = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.12, 0.2, 0.65, 8)), shihakushoMat);
      leg.position.set(lx, 0.38, 0);
      this.avatarGroup.add(leg);
    }

    // 3. Cintura e Obi Branco
    const obi = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.48, 0.16, 0.3)), shitagiWhiteMat);
    obi.position.set(0, 0.76, 0);
    this.avatarGroup.add(obi);

    // Nó do Obi pendendo no lado esquerdo
    const knot1 = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.06, 0.24, 0.03)), shitagiWhiteMat);
    knot1.position.set(-0.2, 0.65, 0.15);
    knot1.rotation.z = 0.15;
    const knot2 = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.05, 0.2, 0.03)), shitagiWhiteMat);
    knot2.position.set(-0.16, 0.67, 0.15);
    knot2.rotation.z = -0.1;
    this.avatarGroup.add(knot1, knot2);

    // 4. Tórax e Shihakusho com decote em V revelando o Shitagi branco
    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, 1.05, 0);

    const chest = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.46, 0.44, 0.26)), shihakushoMat);
    this.chestMesh = chest;

    // Gola branca dobrada cruzada (Shitagi)
    const collarL = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.08, 0.28, 0.03)), shitagiWhiteMat);
    collarL.position.set(-0.06, 0.08, 0.132);
    collarL.rotation.z = -0.35;

    const collarR = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.08, 0.28, 0.03)), shitagiWhiteMat);
    collarR.position.set(0.06, 0.08, 0.134);
    collarR.rotation.z = 0.35;

    chestGroup.add(chest, collarL, collarR);
    this.avatarGroup.add(chestGroup);

    // 5. Mangas amplas soltas e Braços
    this.sleevesGroup = new THREE.Group();
    this.sleevesGroup.position.set(0, 1.15, 0);

    for (const [sx, sign] of [[-0.29, -1], [0.29, 1]] as const) {
      const armGroup = new THREE.Group();
      armGroup.position.set(sx, 0, 0);

      // Manga ampla
      const sleeve = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 0.42, 0.22)), shihakushoMat);
      sleeve.position.set(sign * 0.04, -0.16, 0);
      sleeve.rotation.z = sign * -0.12;

      // Mão em tom de pele anime
      const hand = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.05, 8, 8)), skinMat);
      hand.position.set(sign * 0.06, -0.38, 0.04);

      armGroup.add(sleeve, hand);
      this.sleevesGroup.add(armGroup);
    }
    this.avatarGroup.add(this.sleevesGroup);

    // 6. Cabeça e Rosto
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.4, 0);

    const neck = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8)), skinMat);
    neck.position.y = -0.06;

    const head = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.19, 16, 16)), skinMat);
    head.scale.set(0.95, 1.05, 0.95);

    // Olhos e sobrancelhas sutis
    const eyeMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x1f242d }));
    for (const ex of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.035, 0.015, 0.01)), eyeMat);
      eye.position.set(ex, 0.02, 0.185);
      headGroup.add(eye);
    }

    headGroup.add(neck, head);
    this.avatarGroup.add(headGroup);

    // 7. Cabelo (Alternável Masculino / Feminino)
    this.hairGroup = new THREE.Group();
    this.hairGroup.position.set(0, 1.4, 0);
    this.avatarGroup.add(this.hairGroup);
    this.buildHair(this.gender);

    // 8. Asauchi Embainhada (presa ao lado esquerdo da cintura)
    const swordGroup = new THREE.Group();
    swordGroup.position.set(-0.25, 0.78, 0.04);
    // Inclinação tradicional através do Obi
    swordGroup.rotation.set(0.15, 0.1, 0.65);

    // Bainha de madeira laqueada preta (Saya)
    const sayaMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.3, metalness: 0.2 }));
    const saya = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.026, 0.022, 0.95, 8)), sayaMat);
    saya.position.y = -0.38;

    // Guarda circular da espada (Tsuba) em bronze escuro
    const tsubaMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x5a4830, roughness: 0.4, metalness: 0.85 }));
    const tsuba = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.07, 0.07, 0.018, 16)), tsubaMat);
    tsuba.position.y = 0.1;

    // Punho (Tsuka) com acabamento tradicional
    const tsukaMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.7 }));
    const tsuka = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 8)), tsukaMat);
    tsuka.position.y = 0.24;

    // Pommel dourado (Kashira)
    const kashiraMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xa88a44, roughness: 0.3, metalness: 0.9 }));
    const kashira = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.026, 0.024, 0.03, 8)), kashiraMat);
    kashira.position.y = 0.38;

    swordGroup.add(saya, tsuba, tsuka, kashira);
    this.avatarGroup.add(swordGroup);

    this.scene.add(this.avatarGroup);
  }

  /** Constrói o cabelo do Shinigami de acordo com o gênero */
  private buildHair(gender: RecruitGender): void {
    if (!this.hairGroup) return;

    // Limpa cabelo anterior
    while (this.hairGroup.children.length > 0) {
      const child = this.hairGroup.children[0];
      this.hairGroup.remove(child);
    }

    const hairMatM = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.75 }));
    const hairMatF = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x1c1a24, roughness: 0.7 }));

    if (gender === "m") {
      // Recruta Masculino: mechas espetadas estilo clássico Shinigami
      const topCap = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.2, 12, 12)), hairMatM);
      topCap.position.set(0, 0.05, -0.02);
      this.hairGroup.add(topCap);

      const spikePositions = [
        [0, 0.18, 0.08, 0.3, 0],
        [-0.08, 0.16, 0.07, 0.25, -0.3],
        [0.08, 0.16, 0.07, 0.25, 0.3],
        [-0.14, 0.1, 0.02, 0.2, -0.6],
        [0.14, 0.1, 0.02, 0.2, 0.6],
        [0, 0.17, -0.1, -0.3, 0],
        [-0.09, 0.14, -0.1, -0.35, -0.4],
        [0.09, 0.14, -0.1, -0.35, 0.4],
      ];

      for (const [x, y, z, rx, rz] of spikePositions) {
        const spike = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.065, 0.2, 4)), hairMatM);
        spike.position.set(x, y, z);
        spike.rotation.set(rx, 0, rz);
        this.hairGroup.add(spike);
      }
    } else {
      // Recruta Feminino: mechas laterais alongadas emoldurando o rosto e coque/rabo-de-cavalo
      const topCap = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.205, 12, 12)), hairMatF);
      topCap.position.set(0, 0.04, -0.02);
      this.hairGroup.add(topCap);

      // Franja estilizada
      const fringe = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.24, 0.08, 0.06)), hairMatF);
      fringe.position.set(0, 0.13, 0.17);
      this.hairGroup.add(fringe);

      // Mechas laterais que emolduram o rosto
      for (const [lx, sign] of [[-0.18, -1], [0.18, 1]] as const) {
        const lock = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.05, 0.32, 0.08)), hairMatF);
        lock.position.set(lx, -0.02, 0.1);
        lock.rotation.z = sign * 0.1;
        this.hairGroup.add(lock);
      }

      // Rabo-de-cavalo / mecha posterior longa
      const tail = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.1, 0.38, 8)), hairMatF);
      tail.position.set(0, 0.02, -0.22);
      tail.rotation.x = -0.55;
      this.hairGroup.add(tail);
    }
  }

  /** Atualiza o gênero do avatar 3D (M/F) */
  public setGender(gender: RecruitGender): void {
    if (this.gender === gender) return;
    this.gender = gender;
    if (this.avatarGroup && this.hairGroup) {
      this.buildHair(gender);
    }
  }

  /** Conecta ouvintes de eventos para resize e arraste de rotação orbital */
  private setupEventListeners(): void {
    if (typeof window === "undefined") return;

    // Redimensionamento responsivo
    this.onResizeHandler = () => this.resize();
    window.addEventListener("resize", this.onResizeHandler);

    // Rotação por arraste de mouse / touch
    const targetEl = this.container || this.canvas;
    if (!targetEl) return;

    this.onPointerDownHandler = (e: PointerEvent) => {
      // Ignora cliques que atingiram botões, links ou inputs dentro do card
      const target = e.target as HTMLElement | null;
      if (target && target.closest("input, button, select, a, textarea, form, details, [tabindex]")) {
        return;
      }
      this.isDragging = true;
      this.pointerStartX = e.clientX;
      this.pointerLastX = e.clientX;
    };

    this.onPointerMoveHandler = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.pointerLastX;
      this.pointerLastX = e.clientX;
      this.targetRotationY += deltaX * 0.008;
    };

    this.onPointerUpHandler = () => {
      this.isDragging = false;
    };

    targetEl.addEventListener("pointerdown", this.onPointerDownHandler);
    window.addEventListener("pointermove", this.onPointerMoveHandler);
    window.addEventListener("pointerup", this.onPointerUpHandler);
    window.addEventListener("pointercancel", this.onPointerUpHandler);
  }

  /** Atualiza proporções da câmera e tamanho do viewport */
  public resize(width?: number, height?: number): void {
    if (this.disposed || !this.renderer || !this.camera) return;

    const w = width ?? this.container?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 800) ?? 800;
    const h = height ?? this.container?.clientHeight ?? (typeof window !== "undefined" ? window.innerHeight : 600) ?? 600;

    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** Pausa o loop de renderização para economizar 100% de CPU/GPU */
  public pause(): void {
    if (!this.running) return;
    this.running = false;
    if (this.animFrameId !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.animFrameId);
      }
      this.animFrameId = null;
    }
  }

  /** Retoma o loop de renderização Three.js */
  public resume(): void {
    if (this.disposed || this.isFallback || !this.enabled || this.running) return;
    this.running = true;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    this.lastTime = now;
    if (!this.startTime) this.startTime = now;

    const loop = () => {
      if (!this.running) return;
      this.render();
      if (typeof requestAnimationFrame !== "undefined") {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== "undefined") {
      this.animFrameId = requestAnimationFrame(loop);
    }
  }

  /** Loop interno de renderização e atualização física */
  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    const delta = Math.min(now - (this.lastTime || now), 0.1);
    this.lastTime = now;
    const time = now - (this.startTime || now);

    // 1. Rotação orbital com amortecimento suave (lerp)
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
    if (this.avatarGroup) {
      this.avatarGroup.rotation.y = this.currentRotationY;
    }

    // 2. Animação sutil de respiração / idle no avatar
    if (this.avatarGroup) {
      const breath = Math.sin(time * 2.2);
      this.avatarGroup.position.y = 0.56 + breath * 0.012;

      if (this.chestMesh) {
        this.chestMesh.scale.set(1 + breath * 0.02, 1 + breath * 0.02, 1);
      }
      if (this.sleevesGroup) {
        this.sleevesGroup.rotation.z = breath * 0.015;
      }
    }

    // 3. Pulsação do portal dimensional Senkaimon
    if (this.portalVeil) {
      const veilPulse = 0.35 + 0.18 * Math.sin(time * 2.0);
      (this.portalVeil.material as THREE.MeshBasicMaterial).opacity = veilPulse;
      this.portalVeil.scale.set(1 + 0.03 * Math.sin(time * 1.5), 1 + 0.02 * Math.cos(time * 1.8), 1);
    }

    // 4. Pulsação da luz do portal
    if (this.portalLight) {
      this.portalLight.intensity = 2.4 + 0.6 * Math.sin(time * 2.5);
    }

    // 5. Partículas flutuantes de Reiatsu
    if (this.reiatsuPoints && this.reiatsuPositions && this.reiatsuSpeeds && this.reiatsuRadii && this.reiatsuOffsets) {
      const count = this.reiatsuSpeeds.length;
      for (let i = 0; i < count; i++) {
        let y = this.reiatsuPositions[i * 3 + 1] + this.reiatsuSpeeds[i];
        if (y > 4.6) y = 0.4;
        this.reiatsuPositions[i * 3 + 1] = y;

        const rad = this.reiatsuRadii[i];
        const angle = this.reiatsuOffsets[i] + time * 0.25;
        this.reiatsuPositions[i * 3] = Math.cos(angle) * rad;
        this.reiatsuPositions[i * 3 + 2] = Math.sin(angle) * rad - 0.3;
      }
      this.reiatsuPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Borboletas espirituais Jigokuchō
    for (const b of this.butterflies) {
      const bAngle = time * b.speed + b.phase;
      // Trajetória suave em formato de oito/elipse ao redor do portal
      b.group.position.x = Math.cos(bAngle) * b.radius;
      b.group.position.z = Math.sin(bAngle * 2) * 0.5 - 0.4;
      b.group.position.y = b.height + Math.sin(bAngle * 3) * 0.25;
      b.group.rotation.y = -bAngle + Math.PI / 2;

      // Bate de asas rápido e gracioso
      const flap = Math.sin(time * 16 + b.phase) * 0.75;
      b.wingL.rotation.y = flap;
      b.wingR.rotation.y = -flap;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Transição cinematográfica de entrada no mundo (JH-07):
   * A câmera avança em direção ao portal Senkaimon com flash de luz espiritual antes de entrar no jogo.
   */
  public async triggerEntryTransition(onComplete?: () => void): Promise<void> {
    if (this.isFallback || !this.camera || !this.renderer) {
      onComplete?.();
      return;
    }

    // Ativa flash no DOM se existir
    if (this.flashEl) {
      this.flashEl.classList.add("active");
    }

    const duration = 850;
    const startZ = this.camera.position.z;
    const targetZ = -0.3;
    const startY = this.camera.position.y;
    const targetY = 1.75;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    return new Promise((resolve) => {
      const step = () => {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        // Interpolação suave ease-in-out
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        if (this.camera) {
          this.camera.position.z = startZ + (targetZ - startZ) * t;
          this.camera.position.y = startY + (targetY - startY) * t;
        }

        if (this.portalLight) {
          this.portalLight.intensity = 2.8 + t * 8.0;
        }
        if (this.ambientLight) {
          this.ambientLight.intensity = 1.2 + t * 4.0;
        }

        if (progress < 1) {
          if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(step);
          } else {
            setTimeout(step, 16);
          }
        } else {
          onComplete?.();
          resolve();
        }
      };

      step();
    });
  }

  /**
   * Desmontagem de recursos e prevenção total de memory leak:
   * Descarta geometrias, materiais, texturas, renderer e listeners.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pause();

    // Remove event listeners
    if (typeof window !== "undefined") {
      if (this.onResizeHandler) window.removeEventListener("resize", this.onResizeHandler);
      if (this.onPointerMoveHandler) window.removeEventListener("pointermove", this.onPointerMoveHandler);
      if (this.onPointerUpHandler) {
        window.removeEventListener("pointerup", this.onPointerUpHandler);
        window.removeEventListener("pointercancel", this.onPointerUpHandler);
      }
    }

    const targetEl = this.container || this.canvas;
    if (targetEl && this.onPointerDownHandler) {
      targetEl.removeEventListener("pointerdown", this.onPointerDownHandler);
    }

    // Descarte de todas as geometrias registradas
    for (const geo of this.disposables.geometries) {
      geo.dispose();
    }
    this.disposables.geometries.length = 0;

    // Descarte de todos os materiais registrados
    for (const mat of this.disposables.materials) {
      mat.dispose();
    }
    this.disposables.materials.length = 0;

    // Percorre a cena descartando qualquer material ou geometria restante
    if (this.scene) {
      this.scene.traverse((obj) => {
        if ((obj as any).geometry) {
          (obj as any).geometry.dispose();
        }
        if ((obj as any).material) {
          const m = (obj as any).material;
          if (Array.isArray(m)) {
            for (const item of m) item.dispose();
          } else {
            m.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    // Descarte do WebGLRenderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Remoção dos elementos DOM
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    if (this.flashEl) {
      this.flashEl.remove();
      this.flashEl = null;
    }

    if (this.container) {
      this.container.classList.remove("has-3d-lobby", "three-lobby-fallback");
      this.container = null;
    }
  }
}

/** Inicializa uma instância singleton ou nova de ThreeLobby */
export function initThreeLobby(opts: ThreeLobbyOptions = {}): ThreeLobby {
  return new ThreeLobby(opts);
}
