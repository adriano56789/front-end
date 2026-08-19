// Face3DShaper — Engine de remodelação facial 3D em tempo real.
// Arquitetura Tencent: Face Tracking → Landmarks → Mesh → 3D Shaping → Beauty → WebGL
//
// Melhorias sobre BabyFaceProcessor:
// - Suavização temporal (exponential moving average) para estabilidade do mesh
// - V-shape moderado com controle independente
// - Olhos maiores com preservação de proporção
// - Nariz mais fino com profundidade simulada
// - Bochechas mais cheias (baby face)
// - Queixo/mandíbula suave (V-line)
// - Distância interpupilar ajustável
// - Head pose estimation (yaw/pitch/roll) para efeitos 3D
// - Performance tier (reduz complexidade em dispositivos fracos)

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Point {
  x: number;
  y: number;
  z?: number; // profundidade (normalizada)
}

// Parâmetros completos de remodelação facial 3D
export interface FaceShapingParams {
  // === ROSTO ===
  slimFace: number;        // Afinar rosto (0-100)
  vShape: number;          // V-line / queixo pontudo (0-100)
  chinLength: number;      // Comprimento do queixo (0=curto, 100=comprido)
  cheekVolume: number;     // Volume das bochechas (0-100)
  faceWidth: number;       // Largura do rosto (0-100, negativo = mais fino)
  jawWidth: number;        // Largura da mandíbula (0-100)
  cheekBone: number;       // Maçã do rosto (0-100)
  foreheadHeight: number;  // Altura da testa (0-100)

  // === OLHOS ===
  bigEye: number;          // Olhos maiores (0-100)
  eyeDistance: number;     // Distância interpupilar (-50 a 50)
  eyeHeight: number;       // Altura dos olhos (0-100)
  eyeWidth: number;        // Largura dos olhos (0-100)
  eyeTilt: number;         // Inclinação dos olhos (-50 a 50)
  brightEye: number;       // Olhos brilhantes (0-100)

  // === NARIZ ===
  slimNose: number;        // Nariz fino (0-100)
  noseBridge: number;      // Ponte do nariz (0-100)
  noseWings: number;       // Asas do nariz (0-100)
  noseLength: number;      // Comprimento do nariz (0-100)

  // === BOCA/LÁBIOS ===
  lipShape: number;        // Formato dos lábios (0-100)
  lipHeight: number;       // Altura dos lábios (0-100)
  lipWidth: number;        // Largura da boca (0-100)
  smileFace: number;       // Sorriso sutil (0-100)

  // === SOBRANCELHAS ===
  browAngle: number;       // Ângulo das sobrancelhas (0-100)
  browDistance: number;    // Distância entre sobrancelhas (0-100)
  browHeight: number;      // Altura das sobrancelhas (0-100)
  browLength: number;      // Comprimento das sobrancelhas (0-100)
  browThickness: number;   // Espessura das sobrancelhas (0-100)
  browCurve: number;       // Curvatura das sobrancelhas (0-100)

  // === PELE (shader, não mesh) ===
  smoothing: number;       // Suavização de pele (0-100)
  whitening: number;       // Clareamento (0-100)
  rosySkin: number;        // Pele rosada (0-100)
  contrast: number;        // Contraste (0-100)
  saturation: number;      // Saturação (0-100)
  sharpness: number;       // Nitidez (0-100)
  noiseReduction: number;  // Redução de ruído (0-100)
  teethWhitening: number;  // Clareamento de dentes (0-100)
  wrinkleSmoothing: number;// Suavização de rugas (0-100)
  darkCircle: number;      // Clarear olheiras (0-100)
  acneRemoval: number;     // Remoção de manchas (0-100)
  faceVolume3D: number;    // Volume 3D (0-100)
  whiteBalance: number;    // Balanço de branco (0-100)

  // === UTILITÁRIO ===
  browColor: string;       // Cor da sobrancelha (hex)
  browColorStrength: number; // Intensidade da cor (0-100)
}

// Índices do MediaPipe Face Mesh (478 landmarks)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

// Pontos internos dos olhos (iris center approximation)
const LEFT_EYE_CENTER = 468; // MediaPipe iris landmark (se disponível)
const RIGHT_EYE_CENTER = 473;

const LEFT_BROW = [70, 63, 105, 66, 107];
const RIGHT_BROW = [300, 293, 334, 296, 336];
const LEFT_BROW_BOTTOM = [55, 65, 52, 53, 46];
const RIGHT_BROW_BOTTOM = [285, 295, 282, 283, 276];
const NOSE = [1, 2, 168, 6, 197, 195, 5, 4, 98, 327];
const NOSE_TIP = [4, 5, 195, 197];
const NOSE_BRIDGE = [6, 168, 197, 195, 5];
const NOSE_WINGS = [98, 327];
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

// Pontos de referência para head pose estimation
const NOSE_TIP_POINT = 4;
const FOREHEAD_TOP = 10;
const CHIN_BOTTOM = 152;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;

const WASM_BASE = '/wasm';
const MODEL_URL = '/models/face_landmarker.task';

// --- Utilitários ---

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function affineFromTriangles(src: Point[], dst: Point[]): [number, number, number, number, number, number] {
  const [s1, s2, s3] = src;
  const [d1, d2, d3] = dst;
  const denom = d1.x * (d2.y - d3.y) + d2.x * (d3.y - d1.y) + d3.x * (d1.y - d2.y);
  if (Math.abs(denom) < 1e-9) return [1, 0, 0, 1, 0, 0];
  const m00 = (s1.x * (d2.y - d3.y) + s2.x * (d3.y - d1.y) + s3.x * (d1.y - d2.y)) / denom;
  const m01 = (s1.x * (d3.x - d2.x) + s2.x * (d1.x - d3.x) + s3.x * (d2.x - d1.x)) / denom;
  const m02 = (s1.x * (d2.x * d3.y - d3.x * d2.y) + s2.x * (d3.x * d1.y - d1.x * d3.y) + s3.x * (d1.x * d2.y - d2.x * d1.y)) / denom;
  const m10 = (s1.y * (d2.y - d3.y) + s2.y * (d3.y - d1.y) + s3.y * (d1.y - d2.y)) / denom;
  const m11 = (s1.y * (d3.x - d2.x) + s2.y * (d1.x - d3.x) + s3.y * (d2.x - d1.x)) / denom;
  const m12 = (s1.y * (d2.x * d3.y - d3.x * d2.y) + s2.y * (d3.x * d1.y - d1.x * d3.y) + s3.y * (d1.x * d2.y - d2.x * d1.y)) / denom;
  return [m00, m10, m01, m11, m02, m12];
}

function inCircumcircle(a: Point, b: Point, c: Point, p: Point): boolean {
  const ax = a.x - p.x, ay = a.y - p.y;
  const bx = b.x - p.x, by = b.y - p.y;
  const cx = c.x - p.x, cy = c.y - p.y;
  const ab = ax * ax + ay * ay;
  const bc = bx * bx + by * by;
  const cd = cx * cx + cy * cy;
  const det = ax * (by * cd - bc * cy) - ay * (bx * cd - bc * cx) + ab * (bx * cy - by * cx);
  return det > 0;
}

function triangulate(points: Point[]): number[][] {
  const n = points.length;
  if (n < 3) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const dx = (maxX - minX) || 1;
  const dy = (maxY - minY) || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const superPoints: Point[] = [
    { x: cx, y: minY - dy * 4 },
    { x: minX - dx * 4, y: maxY + dy * 4 },
    { x: maxX + dx * 4, y: maxY + dy * 4 }
  ];
  const at = (i: number) => (i < n ? points[i] : superPoints[i - n]);
  let tris: number[][] = [[n, n + 1, n + 2]];
  for (let i = 0; i < n; i++) {
    const badTriangles: number[] = [];
    for (let t = 0; t < tris.length; t++) {
      const [a, b, c] = tris[t];
      if (inCircumcircle(at(a), at(b), at(c), points[i])) badTriangles.push(t);
    }
    const edges: Set<string> = new Set();
    for (const t of badTriangles) {
      const [a, b, c] = tris[t];
      for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
        const key = Math.min(u, v) + ':' + Math.max(u, v);
        if (edges.has(key)) edges.delete(key);
        else edges.add(key);
      }
    }
    tris = tris.filter((_, t) => !badTriangles.includes(t));
    for (const edge of edges) {
      const [u, v] = edge.split(':').map(Number);
      tris.push([u, v, i]);
    }
  }
  return tris.filter((tri) => tri.every((v) => v < n));
}

// --- Performance tier ---
export type PerformanceTier = 'high' | 'medium' | 'low';

export function detectPerformanceTier(): PerformanceTier {
  const gpu = document.createElement('canvas').getContext('webgl');
  if (!gpu) return 'low';
  const debugInfo = gpu.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gpu.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  const vendor = debugInfo ? gpu.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
  const gl = gpu as any;

  // Heurística: dispositivos integrados/Mali Adreno tendem a ser mais lentos
  const rendererLower = renderer.toLowerCase();
  const isLowEnd = /mali|adreno|swiftshader|llvmpipe|software/i.test(rendererLower)
    || /android|webview/i.test(navigator.userAgent) && /mobile/i.test(navigator.userAgent);

  // Verificar suporte a extensões
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  if (isLowEnd || maxTexSize < 4096) return 'low';
  if (maxTexSize < 8192 || /adreno 5|adreno 6[0-3]/i.test(rendererLower)) return 'medium';
  return 'high';
}

// --- Head Pose ---
export interface HeadPose {
  yaw: number;    // rotação horizontal (-1 a 1, negativo = olhando para esquerda)
  pitch: number;  // rotação vertical (-1 a 1, negativo = olhando para cima)
  roll: number;   // inclinação lateral (-1 a 1)
}

function estimateHeadPose(landmarks: Array<{ x: number; y: number; z?: number }>, W: number, H: number): HeadPose {
  const nose = { x: landmarks[NOSE_TIP_POINT].x * W, y: landmarks[NOSE_TIP_POINT].y * H };
  const forehead = { x: landmarks[FOREHEAD_TOP].x * W, y: landmarks[FOREHEAD_TOP].y * H };
  const chin = { x: landmarks[CHIN_BOTTOM].x * W, y: landmarks[CHIN_BOTTOM].y * H };
  const leftEar = { x: landmarks[LEFT_EAR].x * W, y: landmarks[LEFT_EAR].y * H };
  const rightEar = { x: landmarks[RIGHT_EAR].x * W, y: landmarks[RIGHT_EAR].y * H };

  const faceW = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y);
  const faceH = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);
  const faceCenter = { x: (leftEar.x + rightEar.x) / 2, y: (forehead.y + chin.y) / 2 };

  // Yaw: deslocamento horizontal do nariz em relação ao centro do rosto
  const yaw = clamp((nose.x - faceCenter.x) / (faceW * 0.5), -1, 1);
  // Pitch: deslocamento vertical do nariz
  const pitch = clamp((nose.y - faceCenter.y) / (faceH * 0.5) - 0.15, -1, 1); // offset para nariz ficar mais baixo naturalmente
  // Roll: inclinação da linha dos olhos
  const eyeLine = { x: rightEar.x - leftEar.x, y: rightEar.y - leftEar.y };
  const roll = clamp(Math.atan2(eyeLine.y, eyeLine.x) / (Math.PI / 4), -1, 1);

  return { yaw, pitch, roll };
}

// --- Main Engine ---

export class Face3DShaper {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private landmarker: FaceLandmarker | null = null;
  private landmarkerReady = false;
  private initPromise: Promise<boolean> | null = null;

  private detectionBusy = false;
  private lastDetection = 0;
  private detectionIntervalMs = 66; // ~15fps detection (render runs at 30fps via interpolation)
  private detectionFailedFrames = 0;

  // Mesh atual + suavizado
  private meshPoints: Point[] = [];
  private smoothedPoints: Point[] = []; // smoothed version
  private targetPoints: Point[] = [];
  private triangles: number[][] = [];
  private transforms: Array<[number, number, number, number, number, number]> = [];
  private meshValid = false;

  // Brow tint polygons
  private browTintPolys: Point[][] = [];

  // Head pose
  private headPose: HeadPose = { yaw: 0, pitch: 0, roll: 0 };

  // Performance
  private tier: PerformanceTier = 'high';
  private fpsHistory: number[] = [];

  // Parameters
  private params: FaceShapingParams = getDefaultFaceShapingParams();

  private sourceWidth = 0;
  private sourceHeight = 0;

  // Temporal smoothing factor (0 = no smoothing, 1 = freeze)
  private smoothFactor = 0.35;

  constructor(tier?: PerformanceTier) {
    this.tier = tier || detectPerformanceTier();
    // Ajustar intervalo de detecção conforme performance
    if (this.tier === 'medium') this.detectionIntervalMs = 83; // ~12fps detection
    if (this.tier === 'low') this.detectionIntervalMs = 100; // ~10fps detection
  }

  get canvasElement(): HTMLCanvasElement | null { return this.canvas; }
  isReady(): boolean { return this.landmarkerReady; }
  isActive(): boolean {
    return this.hasAnyActiveEffect() && this.landmarkerReady;
  }
  getHeadPose(): HeadPose { return { ...this.headPose }; }
  getPerformanceTier(): PerformanceTier { return this.tier; }

  private hasAnyActiveEffect(): boolean {
    const p = this.params;
    return p.slimFace > 0 || p.vShape > 0 || p.bigEye > 0 || p.slimNose > 0
      || p.cheekVolume > 0 || p.chinLength !== 0 || p.jawWidth > 0
      || p.eyeDistance !== 0 || p.eyeHeight > 0 || p.eyeWidth > 0
      || p.lipShape > 0 || p.lipHeight > 0 || p.lipWidth > 0 || p.smileFace > 0
      || p.browThickness > 0 || p.browCurve > 0 || p.browHeight > 0
      || p.noseBridge > 0 || p.noseWings > 0 || p.cheekBone > 0
      || p.foreheadHeight > 0 || p.browColorStrength > 0;
  }

  setParams(params: Partial<FaceShapingParams>): void {
    this.params = { ...this.params, ...params };
  }

  getParams(): FaceShapingParams {
    return { ...this.params };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElement;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 360;
      this.ctx = this.canvas.getContext('2d');
    }
    return this.preload();
  }

  async preload(): Promise<boolean> {
    if (this.landmarkerReady) return true;
    if (!this.initPromise) {
      this.initPromise = this.loadLandmarker();
    }
    return this.initPromise;
  }

  private async loadLandmarker(): Promise<boolean> {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const options: any = {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: this.tier === 'low' ? 'CPU' : 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      };
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, options);
      } catch {
        options.baseOptions.delegate = 'CPU';
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, options);
      }
      this.landmarkerReady = true;
      console.log(`✅ [FACE_3D_SHAPER] Face Landmarker pronto (tier: ${this.tier})`);
      return true;
    } catch (error) {
      console.error('❌ [FACE_3D_SHAPER] Falha ao carregar Face Landmarker:', error);
      this.landmarkerReady = false;
      this.initPromise = null;
      return false;
    }
  }

  destroy(): void {
    this.landmarkerReady = false;
    if (this.landmarker) {
      try { this.landmarker.close(); } catch {}
      this.landmarker = null;
    }
    this.initPromise = null;
    this.meshValid = false;
    this.meshPoints = [];
    this.smoothedPoints = [];
    this.targetPoints = [];
    this.triangles = [];
    this.transforms = [];
    this.browTintPolys = [];
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Renderiza o frame atual com warpeamento facial 3D.
   * Retorna o canvas processado, ou null se não está ativo.
   */
  render(): HTMLCanvasElement | null {
    if (!this.landmarkerReady || !this.canvas || !this.videoElement) return null;
    if (!this.hasAnyActiveEffect()) return null;

    const vw = this.videoElement.videoWidth || this.sourceWidth || 640;
    const vh = this.videoElement.videoHeight || this.sourceHeight || 360;
    if (vw !== this.sourceWidth || vh !== this.sourceHeight) {
      this.sourceWidth = vw;
      this.sourceHeight = vh;
      this.canvas.width = vw;
      this.canvas.height = vh;
    }

    // Agendar detecção (throttled, assíncrona)
    const now = performance.now();
    if (!this.detectionBusy && now - this.lastDetection >= this.detectionIntervalMs) {
      this.lastDetection = now;
      this.runDetection(now);
    }

    if (!this.ctx) return null;
    this.drawWarped(this.ctx);
    return this.canvas;
  }

  private async runDetection(timestamp: number): Promise<void> {
    if (!this.landmarker || !this.videoElement) return;
    this.detectionBusy = true;
    try {
      const result = this.landmarker.detectForVideo(this.videoElement, timestamp);
      if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        // Head pose estimation
        this.headPose = estimateHeadPose(landmarks, this.sourceWidth, this.sourceHeight);

        // Build mesh
        this.buildMesh(landmarks);
        this.detectionFailedFrames = 0;
      } else {
        this.detectionFailedFrames++;
        if (this.detectionFailedFrames > 5) this.meshValid = false;
      }
    } catch {
      this.meshValid = false;
    } finally {
      this.detectionBusy = false;
    }
  }

  private buildMesh(landmarks: Array<{ x: number; y: number; z?: number }>): void {
    const W = this.sourceWidth || this.canvas?.width || 640;
    const H = this.sourceHeight || this.canvas?.height || 360;
    const pt = (i: number): Point => ({ x: landmarks[i].x * W, y: landmarks[i].y * H, z: landmarks[i].z });

    // --- Anchors (borda da imagem) ---
    const anchors: Point[] = [
      { x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H },
      { x: W / 2, y: 0 }, { x: W / 2, y: H }, { x: 0, y: H / 2 }, { x: W, y: H / 2 }
    ];

    // --- Métricas faciais ---
    let eyeLY = 0, eyeRY = 0;
    for (const i of LEFT_EYE) eyeLY += pt(i).y;
    for (const i of RIGHT_EYE) eyeRY += pt(i).y;
    const eyeLineY = (eyeLY / LEFT_EYE.length + eyeRY / RIGHT_EYE.length) / 2;

    let mouthY = (pt(61).y + pt(291).y) / 2;
    const mouthCenter = { x: 0, y: mouthY };
    for (const i of MOUTH) mouthCenter.x += pt(i).x;
    mouthCenter.x /= MOUTH.length;

    let ovalMinX = Infinity, ovalMaxX = -Infinity, ovalMinY = Infinity, ovalMaxY = -Infinity, cxSum = 0, cySum = 0;
    for (const i of FACE_OVAL) {
      const p = pt(i);
      ovalMinX = Math.min(ovalMinX, p.x); ovalMaxX = Math.max(ovalMaxX, p.x);
      ovalMinY = Math.min(ovalMinY, p.y); ovalMaxY = Math.max(ovalMaxY, p.y);
      cxSum += p.x; cySum += p.y;
    }
    const faceCX = cxSum / FACE_OVAL.length;
    const faceCY = cySum / FACE_OVAL.length;
    const faceW = ovalMaxX - ovalMinX;
    const faceH = ovalMaxY - ovalMinY;

    const eyeL = { x: 0, y: 0 };
    const eyeR = { x: 0, y: 0 };
    for (const i of LEFT_EYE) { eyeL.x += pt(i).x; eyeL.y += pt(i).y; }
    for (const i of RIGHT_EYE) { eyeR.x += pt(i).x; eyeR.y += pt(i).y; }
    eyeL.x /= LEFT_EYE.length; eyeL.y /= LEFT_EYE.length;
    eyeR.x /= RIGHT_EYE.length; eyeR.y /= RIGHT_EYE.length;

    const p = this.params;
    const head = this.headPose;

    // --- Construir source/target ---
    const source: Point[] = [];
    const target: Point[] = [];

    // === FACE OVAL: slim face, V-shape, cheek volume, jaw, forehead ===
    const pushOval = (i: number) => {
      const pt_ = pt(i);
      let tx = pt_.x;
      let ty = pt_.y;
      const dx = pt_.x - faceCX;
      const dy = pt_.y - faceCY;
      const normalizedY = (pt_.y - ovalMinY) / faceH; // 0=top, 1=bottom
      const absDx = Math.abs(dx);
      const sideSign = dx > 0 ? 1 : -1;

      // --- Slim Face ---
      if (p.slimFace > 0) {
        const slim = p.slimFace / 100;
        // Afasta os pontos laterais do centro (reduz largura)
        const lateralFactor = absDx / (faceW * 0.5);
        const amount = slim * lateralFactor * faceW * 0.15;
        tx -= sideSign * amount;
      }

      // --- V-Shape ---
      if (p.vShape > 0) {
        const vs = p.vShape / 100;
        // Quanto mais próximo do queixo (normalizedY > 0.6), mais afina
        if (normalizedY > 0.5) {
          const chinFactor = (normalizedY - 0.5) * 2; // 0 at mouth, 1 at chin
          const amount = vs * chinFactor * absDx * 0.35;
          tx -= sideSign * amount;
        }
      }

      // --- Chin Length ---
      if (p.chinLength !== 0) {
        const cl = p.chinLength / 100;
        if (normalizedY > 0.75) {
          const chinFactor = (normalizedY - 0.75) * 4; // 0 at 75%, 1 at bottom
          ty += cl * chinFactor * faceH * 0.12;
        }
      }

      // --- Jaw Width ---
      if (p.jawWidth > 0) {
        const jw = p.jawWidth / 100;
        if (normalizedY > 0.5 && normalizedY < 0.8) {
          const jawFactor = 1 - Math.abs(normalizedY - 0.65) / 0.15;
          tx += sideSign * jw * Math.max(0, jawFactor) * faceW * 0.06;
        }
      }

      // --- Cheek Volume ---
      if (p.cheekVolume > 0) {
        const cv = p.cheekVolume / 100;
        // Bochechas: empurra para fora e levemente para cima (rosto cheio/bebê)
        if (normalizedY > 0.25 && normalizedY < 0.55 && absDx > faceW * 0.25) {
          const cheekFactor = Math.sin((normalizedY - 0.25) / 0.3 * Math.PI);
          const lateralFactor2 = (absDx - faceW * 0.25) / (faceW * 0.25);
          tx += sideSign * cv * cheekFactor * Math.min(lateralFactor2, 1) * faceW * 0.08;
          ty -= cv * cheekFactor * faceH * 0.02;
        }
      }

      // --- Cheekbone ---
      if (p.cheekBone > 0) {
        const cb = p.cheekBone / 100;
        if (normalizedY > 0.2 && normalizedY < 0.4 && absDx > faceW * 0.2) {
          const factor = Math.sin((normalizedY - 0.2) / 0.2 * Math.PI);
          tx += sideSign * cb * factor * faceW * 0.04;
        }
      }

      // --- Face Width (global) ---
      if (p.faceWidth !== 0) {
        const fw = p.faceWidth / 100;
        tx += sideSign * fw * absDx * 0.12;
      }

      // --- Forehead Height ---
      if (p.foreheadHeight > 0) {
        const fh = p.foreheadHeight / 100;
        if (normalizedY < 0.2) {
          const factor = (0.2 - normalizedY) * 5;
          ty -= fh * factor * faceH * 0.06;
        }
      }

      // --- Head pose compensation (3D depth effect) ---
      // Quando a cabeça vira, os pontos laterais se movem de forma diferente
      if (Math.abs(head.yaw) > 0.1) {
        const depthFactor = absDx / (faceW * 0.5);
        tx += head.yaw * depthFactor * faceW * 0.02;
      }

      source.push(pt_);
      target.push({ x: tx, y: ty });
    };

    // === EYES: big eye, eye distance, eye height, eye width, eye tilt ===
    const pushEye = (ring: number[], center: Point, isLeft: boolean) => {
      for (const i of ring) {
        const p_ = pt(i);
        const d = { x: p_.x - center.x, y: p_.y - center.y };

        let sx = 1, sy = 1;
        let offX = 0, offY = 0;

        // Big Eye
        if (p.bigEye > 0) {
          const be = p.bigEye / 100;
          sx = 1 + be * 0.18;
          sy = 1 + be * 0.12;
        }

        // Eye Width
        if (p.eyeWidth > 0) {
          sx += (p.eyeWidth / 100) * 0.10;
        }

        // Eye Height
        if (p.eyeHeight > 0) {
          sy += (p.eyeHeight / 100) * 0.10;
        }

        // Eye Tilt
        if (p.eyeTilt !== 0) {
          const tilt = p.eyeTilt / 100;
          const angle = tilt * 0.15;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const nx = d.x * cos - d.y * sin;
          const ny = d.x * sin + d.y * cos;
          source.push(p_);
          target.push({ x: center.x + nx * sx, y: center.y + ny * sy });
          continue;
        }

        source.push(p_);
        target.push({ x: center.x + d.x * sx + offX, y: center.y + d.y * sy + offY });
      }
    };

    // Eye distance (move both eyes)
    const applyEyeDistance = (c: Point, isLeft: boolean): Point => {
      if (p.eyeDistance === 0) return c;
      const dist = p.eyeDistance / 100;
      const dir = isLeft ? -1 : 1;
      return { x: c.x + dir * dist * faceW * 0.08, y: c.y };
    };

    const eyeLAdj = applyEyeDistance(eyeL, true);
    const eyeRAdj = applyEyeDistance(eyeR, false);

    // === BROWS: angle, distance, height, length, thickness, curve ===
    const browTarget = (i: number, side: 'left' | 'right'): Point => {
      const p_ = pt(i);
      let tx = p_.x;
      let ty = p_.y;

      if (p.browThickness > 0) {
        ty -= (p.browThickness / 100) * faceH * 0.030;
      }
      if (p.browCurve > 0) {
        const midIdx = side === 'left' ? 105 : 334;
        const innerIdx = side === 'left' ? 70 : 300;
        const outerIdx = side === 'left' ? 107 : 336;
        const bc = p.browCurve / 100;
        if (i === midIdx) ty -= bc * faceH * 0.07;
        else if (i === innerIdx) ty += bc * faceH * 0.018;
        else if (i === outerIdx) ty += bc * faceH * 0.034;
        else ty -= bc * faceH * 0.028;
      }
      if (p.browHeight > 0) {
        ty -= (p.browHeight / 100) * faceH * 0.025;
      }
      if (p.browAngle > 0) {
        const ba = p.browAngle / 100;
        const innerIdx = side === 'left' ? 70 : 300;
        const outerIdx = side === 'left' ? 107 : 336;
        if (i === innerIdx) ty += ba * faceH * 0.015;
        else if (i === outerIdx) ty -= ba * faceH * 0.025;
      }

      return { x: tx, y: ty };
    };

    const pushBrow = (i: number, side: 'left' | 'right') => {
      source.push(pt(i));
      target.push(browTarget(i, side));
    };

    // Brow distance (move brows apart/together)
    const applyBrowDistance = (side: 'left' | 'right') => {
      if (p.browDistance === 0) return 0;
      return (p.browDistance / 100) * (side === 'left' ? -1 : 1) * faceW * 0.04;
    };

    // === NOSE: slim nose, nose bridge, nose wings, nose length ===
    const pushNose = (i: number) => {
      const p_ = pt(i);
      let tx = p_.x;
      let ty = p_.y;
      const noseCx = (pt(1).x + pt(2).x + pt(98).x + pt(327).x) / 4;

      if (p.slimNose > 0) {
        const sn = p.slimNose / 100;
        if (i === 98 || i === 327) {
          // Narinas: puxa para dentro
          tx += (noseCx - p_.x) * sn * 0.50;
          ty -= sn * faceH * 0.015;
        } else if (i === 168 || i === 6) {
          tx += (noseCx - p_.x) * sn * 0.22;
        } else {
          const sidePull = (i === 1 || i === 2) ? 0.55 : (i === 4 || i === 5 || i === 195 || i === 197) ? 0.75 : 1.0;
          tx += (noseCx - p_.x) * sn * 0.30 * sidePull;
        }
      }

      if (p.noseBridge > 0) {
        const nb = p.noseBridge / 100;
        if (NOSE_BRIDGE.includes(i)) {
          tx += (noseCx - p_.x) * nb * 0.15;
        }
      }

      if (p.noseWings > 0) {
        const nw = p.noseWings / 100;
        if (i === 98 || i === 327) {
          tx += (noseCx - p_.x) * nw * 0.35;
        }
      }

      if (p.noseLength !== 0) {
        const nl = p.noseLength / 100;
        if (i === 4 || i === 5) {
          ty += nl * faceH * 0.025;
        } else if (i === 1 || i === 2) {
          ty -= nl * faceH * 0.015;
        }
      }

      source.push(p_);
      target.push({ x: tx, y: ty });
    };

    // === MOUTH: lip shape, lip height, lip width, smile ===
    const pushMouth = (i: number) => {
      const p_ = pt(i);
      let tx = p_.x;
      let ty = p_.y;

      // Lip augment/shape
      const lipScale = 1 + (p.lipShape / 100) * 0.12 + (p.lipHeight / 100) * 0.08;
      if (lipScale > 1.001) {
        const dx = p_.x - mouthCenter.x;
        const dy = p_.y - mouthCenter.y;
        tx = mouthCenter.x + dx * lipScale;
        ty = mouthCenter.y + dy * lipScale;
      }

      // Lip width
      if (p.lipWidth > 0) {
        const lw = p.lipWidth / 100;
        const dx = p_.x - mouthCenter.x;
        tx = mouthCenter.x + dx * (1 + lw * 0.10);
      }

      // Smile
      if (p.smileFace > 0) {
        const sf = p.smileFace / 100;
        const isCorner = i === 61 || i === 291;
        const nearCorner = i === 37 || i === 267 || i === 40 || i === 269 || i === 41 || i === 270 || i === 185 || i === 409;
        if (isCorner || nearCorner) {
          const w = isCorner ? 1.0 : 0.5;
          ty -= sf * faceH * 0.06 * w;
          if (i === 61 || i === 40 || i === 41 || i === 37) tx += sf * faceW * 0.03 * w;
          else if (i === 291 || i === 269 || i === 270 || i === 267) tx -= sf * faceW * 0.03 * w;
        }
      }

      source.push(p_);
      target.push({ x: tx, y: ty });
    };

    // Brow tint polygons
    const tintActive = p.browColorStrength > 0 && !!p.browColor;
    const browTintPolys: Point[][] = [];
    if (tintActive) {
      const buildPoly = (topIdx: number[], bottomIdx: number[], side: 'left' | 'right') => {
        const pts = [...topIdx.map((i) => browTarget(i, side)), ...bottomIdx.map((i) => browTarget(i, side))];
        const cx = pts.reduce((s, p_) => s + p_.x, 0) / pts.length;
        const cy = pts.reduce((s, p_) => s + p_.y, 0) / pts.length;
        return pts.map((p_) => ({ x: cx + (p_.x - cx) * 1.06, y: cy + (p_.y - cy) * 1.06 }));
      };
      browTintPolys.push(buildPoly(LEFT_BROW, LEFT_BROW_BOTTOM, 'left'));
      browTintPolys.push(buildPoly(RIGHT_BROW, RIGHT_BROW_BOTTOM, 'right'));
    }
    this.browTintPolys = browTintPolys;

    // --- Build all points ---
    FACE_OVAL.forEach(pushOval);
    pushEye(LEFT_EYE, eyeLAdj, true);
    pushEye(RIGHT_EYE, eyeRAdj, false);
    LEFT_BROW.forEach((i) => pushBrow(i, 'left'));
    RIGHT_BROW.forEach((i) => pushBrow(i, 'right'));
    NOSE.forEach(pushNose);
    MOUTH.forEach(pushMouth);
    anchors.forEach((a) => { source.push(a); target.push({ x: a.x, y: a.y }); });

    // --- Temporal smoothing ---
    if (this.smoothedPoints.length === target.length) {
      for (let i = 0; i < target.length; i++) {
        target[i] = {
          x: lerp(this.smoothedPoints[i].x, target[i].x, this.smoothFactor),
          y: lerp(this.smoothedPoints[i].y, target[i].y, this.smoothFactor)
        };
      }
    }
    this.smoothedPoints = target.map((t) => ({ x: t.x, y: t.y }));

    // --- Triangulate + compute transforms ---
    this.meshPoints = source;
    this.targetPoints = target;
    this.triangles = triangulate(source);
    this.transforms = this.triangles.map(([a, b, c]) =>
      affineFromTriangles([source[a], source[b], source[c]], [target[a], target[b], target[c]])
    );
    this.meshValid = this.triangles.length > 0;
  }

  private drawWarped(ctx: CanvasRenderingContext2D): void {
    const W = this.canvas!.width;
    const H = this.canvas!.height;
    ctx.clearRect(0, 0, W, H);

    if (!this.meshValid || !this.videoElement) {
      ctx.drawImage(this.videoElement!, 0, 0, W, H);
      return;
    }

    // Fundo
    ctx.drawImage(this.videoElement, 0, 0, W, H);

    // Mesh warping com inflação para reduzir costuras
    for (let t = 0; t < this.triangles.length; t++) {
      const [a, b, c] = this.triangles[t];
      const d1 = this.targetPoints[a];
      const d2 = this.targetPoints[b];
      const d3 = this.targetPoints[c];
      const m = this.transforms[t];

      // Inflar triângulo para reduzir costuras
      const cx = (d1.x + d2.x + d3.x) / 3;
      const cy = (d1.y + d2.y + d3.y) / 3;
      const inflate = 1.012;
      const p1 = { x: cx + (d1.x - cx) * inflate, y: cy + (d1.y - cy) * inflate };
      const p2 = { x: cx + (d2.x - cx) * inflate, y: cy + (d2.y - cy) * inflate };
      const p3 = { x: cx + (d3.x - cx) * inflate, y: cy + (d3.y - cy) * inflate };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = 1.0;
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(this.videoElement, 0, 0, W, H);
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    // Brow tint
    this.tintBrows(ctx);
  }

  private tintBrows(ctx: CanvasRenderingContext2D): void {
    if (this.browTintPolys.length === 0) return;
    const strength = this.params.browColorStrength;
    const color = this.params.browColor;
    if (strength <= 0 || !color) return;
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = Math.min(strength / 100, 1) * 0.95;
    ctx.fillStyle = color;
    for (const poly of this.browTintPolys) {
      if (poly.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Extrai parâmetros de beleza para o shader (pele, não mesh).
   * Estes valores vão para o VideoProcessor como uniform arrays.
   */
  getShaderParams(): {
    whitening: number; smoothing: number; saturation: number; contrast: number;
    teethWhitening: number; wrinkleSmoothing: number; darkCircle: number;
    acneRemoval: number; sharpness: number; faceVolume3D: number;
    noiseReduction: number; whiteBalance: number; rosySkin: number;
    browDefinition: number;
  } {
    const p = this.params;
    return {
      whitening: p.whitening,
      smoothing: p.smoothing,
      saturation: p.saturation,
      contrast: p.contrast,
      teethWhitening: p.teethWhitening,
      wrinkleSmoothing: p.wrinkleSmoothing,
      darkCircle: p.darkCircle,
      acneRemoval: p.acneRemoval,
      sharpness: p.sharpness,
      faceVolume3D: p.faceVolume3D,
      noiseReduction: p.noiseReduction,
      whiteBalance: p.whiteBalance,
      rosySkin: p.rosySkin,
      browDefinition: p.browThickness // sobrancelha definida via shader também
    };
  }
}

// --- Default params ---
export function getDefaultFaceShapingParams(): FaceShapingParams {
  return {
    slimFace: 0, vShape: 0, chinLength: 0, cheekVolume: 0, faceWidth: 0,
    jawWidth: 0, cheekBone: 0, foreheadHeight: 0,
    bigEye: 0, eyeDistance: 0, eyeHeight: 0, eyeWidth: 0, eyeTilt: 0, brightEye: 0,
    slimNose: 0, noseBridge: 0, noseWings: 0, noseLength: 0,
    lipShape: 0, lipHeight: 0, lipWidth: 0, smileFace: 0,
    browAngle: 0, browDistance: 0, browHeight: 0, browLength: 0,
    browThickness: 0, browCurve: 0,
    smoothing: 0, whitening: 0, rosySkin: 0, contrast: 0, saturation: 0,
    sharpness: 0, noiseReduction: 0, teethWhitening: 0, wrinkleSmoothing: 0,
    darkCircle: 0, acneRemoval: 0, faceVolume3D: 0, whiteBalance: 0,
    browColor: '', browColorStrength: 0
  };
}

// Singleton global
export const face3DShaper = new Face3DShaper();
