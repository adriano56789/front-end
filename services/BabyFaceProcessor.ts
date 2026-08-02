// Processador do efeito "Rosto Bebê" (baby face) em tempo real.
// Usa MediaPipe Face Landmarker (478 landmarks) + warp por malha de triângulos (Delaunay)
// para rejuvenescer o rosto: rosto mais arredondado, queixo encurtado, bochechas cheias,
// testa levemente mais alta e olhos maiores.

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Point {
  x: number;
  y: number;
}

// Índices do face mesh do MediaPipe (ordem do contorno do rosto)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

// Anéis dos olhos (para aumentar os olhos)
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

// Pontos internos fixos (não movem — mantêm nariz, boca e sobrancelhas estáveis)
const LEFT_BROW = [70, 63, 105, 66, 107];
const RIGHT_BROW = [300, 293, 334, 296, 336];
const NOSE = [1, 2, 168, 6, 197, 195, 5, 4, 98, 327];
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

const WASM_BASE = '/wasm';
const MODEL_URL = '/models/face_landmarker.task';

// Cálculo de uma transformação afim (3 pares de pontos) que mapeia dst -> src.
// Retorna [m00, m10, m01, m11, m02, m12] no formato do canvas ctx.setTransform(a,b,c,d,e,f).
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
  const ax = a.x - p.x;
  const ay = a.y - p.y;
  const bx = b.x - p.x;
  const by = b.y - p.y;
  const cx = c.x - p.x;
  const cy = c.y - p.y;

  const ab = ax * ax + ay * ay;
  const bc = bx * bx + by * by;
  const cd = cx * cx + cy * cy;

  const det = ax * (by * cd - bc * cy) - ay * (bx * cd - bc * cx) + ab * (bx * cy - by * cx);
  return det > 0;
}

// Triangulação de Delaunay (Bowyer-Watson) sobre um conjunto de pontos.
function triangulate(points: Point[]): number[][] {
  const n = points.length;
  if (n < 3) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
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
      if (inCircumcircle(at(a), at(b), at(c), points[i])) {
        badTriangles.push(t);
      }
    }

    const edges: Set<string> = new Set();
    for (const t of badTriangles) {
      const [a, b, c] = tris[t];
      const triEdges = [[a, b], [b, c], [c, a]];
      for (const [u, v] of triEdges) {
        const key = Math.min(u, v) + ':' + Math.max(u, v);
        if (edges.has(key)) {
          edges.delete(key);
        } else {
          edges.add(key);
        }
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

export class BabyFaceProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private landmarker: FaceLandmarker | null = null;
  private landmarkerReady = false;
  private initPromise: Promise<boolean> | null = null;

  private detectionBusy = false;
  private lastDetection = 0;
  private detectionIntervalMs = 100;
  private detectionFailedFrames = 0;

  // Malha atual (escala do canvas)
  private meshPoints: Point[] = [];
  private targetPoints: Point[] = [];
  private triangles: number[][] = [];
  private transforms: Array<[number, number, number, number, number, number]> = [];
  private meshValid = false;

  private intensity = 0;
  private intensitySmooth = 0;

  private sourceWidth = 0;
  private sourceHeight = 0;

  constructor() {}

  get canvasElement(): HTMLCanvasElement | null {
    return this.canvas;
  }

  isReady(): boolean {
    return this.landmarkerReady;
  }

  isActive(): boolean {
    return this.intensitySmooth > 0.001 && this.landmarkerReady;
  }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElement;

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 360;
      this.ctx = this.canvas.getContext('2d');
    }

    if (!this.initPromise) {
      this.initPromise = this.loadLandmarker();
    }
    return this.initPromise;
  }

  private async loadLandmarker(): Promise<boolean> {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
      } catch {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
      }
      this.landmarkerReady = true;
      console.log('✅ [BABY_FACE] Face Landmarker pronto');
      return true;
    } catch (error) {
      console.error('❌ [BABY_FACE] Falha ao carregar Face Landmarker:', error);
      this.landmarkerReady = false;
      return false;
    }
  }

  destroy(): void {
    this.landmarkerReady = false;
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // ignora erro ao fechar
      }
      this.landmarker = null;
    }
    this.initPromise = null;
    this.meshValid = false;
    this.meshPoints = [];
    this.targetPoints = [];
    this.triangles = [];
    this.transforms = [];
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Renderiza o frame atual (com warp se a malha estiver pronta).
   * Retorna o canvas processado, ou null se ainda não está ativo.
   */
  render(): HTMLCanvasElement | null {
    if (!this.landmarkerReady || !this.canvas || !this.videoElement) return null;
    if (this.intensity <= 0.001) return null;

    // Suaviza a intensidade para transições suaves no slider
    this.intensitySmooth += (this.intensity - this.intensitySmooth) * 0.25;

    // Dimensionar canvas conforme o vídeo
    const vw = this.videoElement.videoWidth || this.sourceWidth || 640;
    const vh = this.videoElement.videoHeight || this.sourceHeight || 360;
    if (vw !== this.sourceWidth || vh !== this.sourceHeight) {
      this.sourceWidth = vw;
      this.sourceHeight = vh;
      this.canvas.width = vw;
      this.canvas.height = vh;
    }

    // Agendar detecção (assíncrona, throttled) — não bloqueia o render
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
        this.updateMesh(result.faceLandmarks[0]);
        this.detectionFailedFrames = 0;
      } else {
        this.detectionFailedFrames++;
        if (this.detectionFailedFrames > 5) {
          this.meshValid = false;
        }
      }
    } catch (error) {
      this.meshValid = false;
    } finally {
      this.detectionBusy = false;
    }
  }

  private updateMesh(landmarks: Array<{ x: number; y: number; z?: number }>): void {
    const W = this.sourceWidth || this.canvas?.width || 640;
    const H = this.sourceHeight || this.canvas?.height || 360;
    const f = this.intensitySmooth || this.intensity;

    const pt = (i: number): Point => ({ x: landmarks[i].x * W, y: landmarks[i].y * H });

    // --- Âncoras fixas (borda da imagem) ---
    const anchors: Point[] = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H },
      { x: W / 2, y: 0 },
      { x: W / 2, y: H },
      { x: 0, y: H / 2 },
      { x: W, y: H / 2 }
    ];

    // --- Métricas faciais ---
    let eyeLY = 0, eyeRY = 0;
    for (const i of LEFT_EYE) eyeLY += pt(i).y;
    for (const i of RIGHT_EYE) eyeRY += pt(i).y;
    const eyeLineY = (eyeLY / LEFT_EYE.length + eyeRY / RIGHT_EYE.length) / 2;

    let mouthY = 0;
    mouthY += pt(61).y;
    mouthY += pt(291).y;
    mouthY /= 2;

    let ovalMinX = Infinity, ovalMaxX = -Infinity, ovalMinY = Infinity, ovalMaxY = -Infinity, cxSum = 0, cySum = 0;
    for (const i of FACE_OVAL) {
      const p = pt(i);
      ovalMinX = Math.min(ovalMinX, p.x);
      ovalMaxX = Math.max(ovalMaxX, p.x);
      ovalMinY = Math.min(ovalMinY, p.y);
      ovalMaxY = Math.max(ovalMaxY, p.y);
      cxSum += p.x;
      cySum += p.y;
    }
    const faceCX = cxSum / FACE_OVAL.length;
    const faceCY = cySum / FACE_OVAL.length;
    const faceW = ovalMaxX - ovalMinX;
    const faceH = ovalMaxY - ovalMinY;

    const eyeL = { x: 0, y: 0 };
    const eyeR = { x: 0, y: 0 };
    for (const i of LEFT_EYE) { eyeL.x += pt(i).x; eyeL.y += pt(i).y; }
    for (const i of RIGHT_EYE) { eyeR.x += pt(i).x; eyeR.y += pt(i).y; }
    eyeL.x /= LEFT_EYE.length;
    eyeL.y /= LEFT_EYE.length;
    eyeR.x /= RIGHT_EYE.length;
    eyeR.y /= RIGHT_EYE.length;

    // --- Construir pontos e alvos ---
    const source: Point[] = [];
    const target: Point[] = [];
    const f2 = f * f;

    const pushOval = (i: number) => {
      const p = pt(i);
      let tx = p.x;
      let ty = p.y;

      const dx = p.x - faceCX;
      const dy = p.y - faceCY;
      const dist = Math.hypot(dx, dy) || 1;

      // Queixo/parte inferior: encurta para cima e afina levemente
      if (p.y > mouthY + 0.08 * faceH) {
        const chinFactor = (p.y - mouthY) / Math.max(faceH * 0.5, 1);
        ty -= f * chinFactor * faceH * 0.12; // sobe o queixo
        tx += f * (-dx / Math.abs(dx || 1)) * Math.min(Math.abs(dx) * 0.12, faceW * 0.05); // afina
        // A base do rosto (bochechas inferiores) ganha volume para fora
        if (Math.abs(dx) > faceW * 0.22) {
          tx += f * Math.sign(dx) * faceW * 0.03 * (1 - chinFactor);
        }
      }
      // Testa/parte superior: alarga levemente e sobe um pouco
      else if (p.y < eyeLineY - 0.12 * faceH) {
        const topFactor = (eyeLineY - p.y) / Math.max(faceH * 0.5, 1);
        ty -= f * topFactor * faceH * 0.06;
        tx += f * Math.sign(dx) * Math.min(Math.abs(dx) * 0.1, faceW * 0.04) * topFactor;
      }
      // Bochechas (meio): empurra para fora (rosto cheio/bebê)
      else if (Math.abs(dx) > faceW * 0.3) {
        const cheekBlend = Math.min((Math.abs(dx) - faceW * 0.3) / (faceW * 0.2), 1);
        tx += f * Math.sign(dx) * faceW * 0.055 * cheekBlend;
        ty += f * faceH * 0.015 * cheekBlend;
      }

      source.push(p);
      target.push({ x: tx, y: ty });
    };

    const pushFixed = (i: number) => {
      const p = pt(i);
      source.push(p);
      target.push({ x: p.x, y: p.y });
    };

    const pushEye = (ring: number[], center: Point, grow: number) => {
      for (const i of ring) {
        const p = pt(i);
        const d = { x: p.x - center.x, y: p.y - center.y };
        const s = 1 + grow;
        source.push(p);
        target.push({ x: center.x + d.x * s, y: center.y + d.y * s });
      }
    };

    FACE_OVAL.forEach(pushOval);
    pushEye(LEFT_EYE, eyeL, f2 * 0.07 + f * 0.02);
    pushEye(RIGHT_EYE, eyeR, f2 * 0.07 + f * 0.02);
    LEFT_BROW.forEach(pushFixed);
    RIGHT_BROW.forEach(pushFixed);
    NOSE.forEach(pushFixed);
    MOUTH.forEach(pushFixed);
    anchors.forEach((a) => {
      source.push(a);
      target.push({ x: a.x, y: a.y });
    });

    // --- Triangulação + transformações (recalcula a cada detecção) ---
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

    // Fundo: desenha o vídeo sem distorção; o warp cobre o rosto por cima.
    ctx.drawImage(this.videoElement, 0, 0, W, H);

    const alpha = this.intensitySmooth;

    for (let t = 0; t < this.triangles.length; t++) {
      const [a, b, c] = this.triangles[t];
      const s1 = this.meshPoints[a];
      const s2 = this.meshPoints[b];
      const s3 = this.meshPoints[c];
      const d1 = this.targetPoints[a];
      const d2 = this.targetPoints[b];
      const d3 = this.targetPoints[c];
      const m = this.transforms[t];

      // Inflar triângulo alvo para reduzir costuras entre triângulos
      const cx = (d1.x + d2.x + d3.x) / 3;
      const cy = (d1.y + d2.y + d3.y) / 3;
      const inflate = 1.015;
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

      ctx.globalAlpha = alpha;
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(this.videoElement, 0, 0, W, H);
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }
}
