// Processador do efeito "Rosto Bebê" (baby face) em tempo real.
// Usa MediaPipe Face Landmarker (478 landmarks) + warp por malha de triângulos (Delaunay)
// para rejuvenescer o rosto: rosto mais arredondado, queixo encurtado, bochechas cheias,
// testa levemente mais alta e olhos maiores.

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Point {
  x: number;
  y: number;
}

// Parâmetros dos efeitos de malha facial (todos normalizados 0-1)
export interface FaceEffectParams {
  babyFace: number;      // Rosto Bebê
  lipFill: number;       // Preenchimento labial
  lipAugment: number;    // Aumentar lábios
  smileAdjust: number;   // Ajuste de sorriso
  browThickness: number; // Espessura da sobrancelha
  browCurve: number;     // Curvatura da sobrancelha
  noseRefine: number;    // Refinar nariz (afina a ponte e as narinas)
  jawChin: number;       // Mandíbula/queixo (V-line: afina a base do rosto e define o queixo)
  eyeRefine: number;     // Refinamento de olhos (aumenta e clareia os olhos)
  browColor: string;     // Cor da sobrancelha (hex, ex: '#4a2c17'; '' = desligado)
  browColorStrength: number; // Intensidade da cor da sobrancelha (0-1)
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
// Fileira inferior das sobrancelhas (para compor o polígono de tintura de cor)
const LEFT_BROW_BOTTOM = [55, 65, 52, 53, 46];
const RIGHT_BROW_BOTTOM = [285, 295, 282, 283, 276];
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
  // Frames SEM rosto detectado (normal — pessoa saiu do quadro). Zera ao detectar.
  private detectionFailedFrames = 0;
  // EXCEÇÕES da detecção (crash real, ex.: contexto WebGL do delegate GPU perdido).
  // Chegou no limite → recria o landmarker com delegate CPU (recuperação automática).
  private detectionErrors = 0;
  private rebuildingLandmarker = false;
  private lastWarnLog = 0;

  // Malha atual (escala do canvas)
  private meshPoints: Point[] = [];
  private targetPoints: Point[] = [];
  private triangles: number[][] = [];
  private transforms: Array<[number, number, number, number, number, number]> = [];
  private meshValid = false;
  // Polígonos das sobrancelhas (coordenadas alvo) para tintura de cor
  private browTintPolys: Point[][] = [];

  private intensity = 0;
  private intensitySmooth = 0;

  // Parâmetros dos efeitos de malha
  private params: FaceEffectParams = {
    babyFace: 0,
    lipFill: 0,
    lipAugment: 0,
    smileAdjust: 0,
    browThickness: 0,
    browCurve: 0,
    noseRefine: 0,
    jawChin: 0,
    eyeRefine: 0,
    browColor: '',
    browColorStrength: 0
  };

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

  // ═══════════════════════════════════════════════════════════════════
  // Tencent doc 50102: disable()/enable() — pausa/retoma detecção
  // ═══════════════════════════════════════════════════════════════════
  private _enabled = true;

  /**
   * Pausa detecção facial (reduce CPU). O render continua mas sem landmarks.
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Retorna se a detecção está habilitada.
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  setIntensity(value: number): void {
    this.params.babyFace = Math.max(0, Math.min(1, value));
    this.recomputeIntensity();
  }

  setParams(params: Partial<FaceEffectParams>): void {
    this.params = { ...this.params, ...params };
    this.recomputeIntensity();
  }

  /**
   * A intensidade GLOBAL da malha = maior parâmetro ativo. Ela só controla se o
   * render roda (gate) — cada efeito aplica o próprio deslocamento no mesh.
   */
  private recomputeIntensity(): void {
    this.intensity = Math.max(
      this.params.babyFace,
      Math.max(this.params.lipFill, Math.max(this.params.lipAugment,
        Math.max(this.params.smileAdjust, Math.max(this.params.browThickness,
          Math.max(this.params.browCurve, Math.max(this.params.noseRefine,
            Math.max(this.params.jawChin, Math.max(this.params.eyeRefine,
              this.params.browColorStrength))))))))
    );
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

  /**
   * Pré-carrega o Face Landmarker (wasm + modelo) ANTES da câmera ficar pronta,
   * para o efeito de malha começar sem atraso. Independente de elemento de vídeo.
   */
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
      // 🔁 Limpa o initPromise para permitir RETRY: se a 1ª tentativa falhar
      // (rede lenta, WebView ocupada), o próximo initialize() tenta de novo em
      // vez de ficar preso no resultado de falha para sempre.
      this.initPromise = null;
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
    this.browTintPolys = [];
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
    if (!this._enabled) return null; // Tencent disable/enable pattern

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
        // Sucesso → zera o contador de EXCEÇÕES (crash real) também.
        if (this.detectionErrors > 0) this.detectionErrors = 0;
      } else {
        this.detectionFailedFrames++;
        if (this.detectionFailedFrames > 5) {
          this.meshValid = false;
        }
      }
    } catch (error) {
      // ⚠️ EXCEÇÃO = crash real (ex.: contexto WebGL do delegate GPU perdido).
      // Antes falava em silêncio PARA SEMPRE — sem warp, sem log. Agora:
      // loga com rate-limit e recria o landmarker com delegate CPU.
      this.detectionErrors++;
      const now = performance.now();
      if (now - this.lastWarnLog > 5000) {
        this.lastWarnLog = now;
        console.warn(`⚠️ [BABY_FACE] detectForVideo falhou (${this.detectionErrors}x seguidas):`, error);
      }
      this.meshValid = false;
      if (this.detectionErrors >= 8 && !this.rebuildingLandmarker) {
        void this.rebuildLandmarkerWithCpu();
      }
    } finally {
      this.detectionBusy = false;
    }
  }

  /**
   * 🔁 Recuperação automática: destrói o landmarker atual e recria com delegate
   * CPU (o GPU crasheado nunca se recupera sozinho). Se falhar, limpa o
   * initPromise para o próximo ensureBabyFace()/preload() tentar de novo.
   */
  private async rebuildLandmarkerWithCpu(): Promise<void> {
    this.rebuildingLandmarker = true;
    try {
      console.warn('🔁 [BABY_FACE] Recriando Face Landmarker com delegate CPU...');
      try { this.landmarker?.close(); } catch { /* ignora */ }
      this.landmarker = null;
      this.landmarkerReady = false;

      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
      this.landmarkerReady = true;
      this.detectionErrors = 0;
      console.log('✅ [BABY_FACE] Face Landmarker recriado com CPU — efeito restaurado');
    } catch (error) {
      console.error('❌ [BABY_FACE] Falha ao recriar landmarker:', error);
      this.landmarkerReady = false;
      this.initPromise = null; // permite retry pelo preload()/ensureBabyFace()
    } finally {
      this.rebuildingLandmarker = false;
    }
  }

  private updateMesh(landmarks: Array<{ x: number; y: number; z?: number }>): void {
    const W = this.sourceWidth || this.canvas?.width || 640;
    const H = this.sourceHeight || this.canvas?.height || 360;

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

    const mouthCenter = { x: 0, y: mouthY };
    for (const i of MOUTH) {
      mouthCenter.x += pt(i).x;
    }
    mouthCenter.x /= MOUTH.length;

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

    const pushOval = (i: number) => {
      const p = pt(i);
      let tx = p.x;
      let ty = p.y;

      const dx = p.x - faceCX;
      const dy = p.y - faceCY;
      const dist = Math.hypot(dx, dy) || 1;

      // --- Rosto Bebê: arredonda o rosto (alarga bochechas, sobe testa/queixo) ---
      const bf = this.params.babyFace;
      if (bf > 0.001) {
        // Queixo/parte inferior: encurta para cima e afina levemente
        if (p.y > mouthY + 0.08 * faceH) {
          const chinFactor = (p.y - mouthY) / Math.max(faceH * 0.5, 1);
          ty -= bf * chinFactor * faceH * 0.19; // sobe o queixo
          tx += bf * (-dx / Math.abs(dx || 1)) * Math.min(Math.abs(dx) * 0.16, faceW * 0.07); // afina
          // A base do rosto (bochechas inferiores) ganha volume para fora
          if (Math.abs(dx) > faceW * 0.22) {
            tx += bf * Math.sign(dx) * faceW * 0.05 * (1 - chinFactor);
          }
        }
        // Testa/parte superior: alarga levemente e sobe um pouco
        else if (p.y < eyeLineY - 0.12 * faceH) {
          const topFactor = (eyeLineY - p.y) / Math.max(faceH * 0.5, 1);
          ty -= bf * topFactor * faceH * 0.09;
          tx += bf * Math.sign(dx) * Math.min(Math.abs(dx) * 0.12, faceW * 0.06) * topFactor;
        }
        // Bochechas (meio): empurra para fora (rosto cheio/bebê)
        else if (Math.abs(dx) > faceW * 0.3) {
          const cheekBlend = Math.min((Math.abs(dx) - faceW * 0.3) / (faceW * 0.2), 1);
          tx += bf * Math.sign(dx) * faceW * 0.085 * cheekBlend;
          ty += bf * faceH * 0.025 * cheekBlend;
        }
      }

      // --- Mandíbula/queixo (V-line): afina a base do rosto e define o queixo ---
      // Independente do "Rosto Bebê" — só age na parte inferior do rosto.
      const jc = this.params.jawChin;
      if (jc > 0.001 && p.y > mouthY + 0.02 * faceH) {
        const chinFactor = Math.min(Math.max((p.y - mouthY) / Math.max(faceH * 0.5, 1), 0), 1);
        // Afunila para o centro quanto mais próximo do queixo
        const narrow = jc * Math.min(Math.abs(dx) * 0.38, faceW * 0.13) * chinFactor;
        tx -= Math.sign(dx) * narrow;
        // Puxa o queixo levemente para cima (define o contorno)
        if (p.y > mouthY + 0.28 * faceH) {
          ty -= jc * chinFactor * faceH * 0.07;
        }
      }

      source.push(p);
      target.push({ x: tx, y: ty });
    };

    // Boca: preenchimento labial / aumento de lábios (escala a partir do centro da boca)
    // e ajuste de sorriso (levanta as comissuras)
    const pushMouth = (i: number) => {
      const p = pt(i);
      let tx = p.x;
      let ty = p.y;

      const mouthScale = 1 + this.params.lipAugment * 0.14 + this.params.lipFill * 0.09;
      if (mouthScale > 1.001) {
        const dx = p.x - mouthCenter.x;
        const dy = p.y - mouthCenter.y;
        tx = mouthCenter.x + dx * mouthScale;
        ty = mouthCenter.y + dy * mouthScale;
      }

      if (this.params.smileAdjust > 0.001) {
        const isCorner = i === 61 || i === 291;
        const nearCorner = i === 37 || i === 267 || i === 40 || i === 269 || i === 41 || i === 270 || i === 185 || i === 409;
        if (isCorner || nearCorner) {
          const w = isCorner ? 1.0 : 0.5;
          ty -= this.params.smileAdjust * faceH * 0.06 * w;
          if (i === 61 || i === 40 || i === 41 || i === 37) tx += this.params.smileAdjust * faceW * 0.03 * w;
          else if (i === 291 || i === 269 || i === 270 || i === 267) tx -= this.params.smileAdjust * faceW * 0.03 * w;
        }
      }

      source.push(p);
      target.push({ x: tx, y: ty });
    };

    // Sobrancelha: espessura (expande para cima) e curvatura (arco do meio elevado)
    // Retorna o ponto alvo (reaproveitado para o polígono de tintura de cor).
    const browTarget = (i: number, side: 'left' | 'right'): Point => {
      const p = pt(i);
      let tx = p.x;
      let ty = p.y;

      if (this.params.browThickness > 0.001) {
        ty -= this.params.browThickness * faceH * 0.030;
      }

      if (this.params.browCurve > 0.001) {
        const midIdx = side === 'left' ? 105 : 334;
        const innerIdx = side === 'left' ? 70 : 300;
        const outerIdx = side === 'left' ? 107 : 336;
        if (i === midIdx) {
          ty -= this.params.browCurve * faceH * 0.07;
        } else if (i === innerIdx) {
          ty += this.params.browCurve * faceH * 0.018;
        } else if (i === outerIdx) {
          ty += this.params.browCurve * faceH * 0.034;
        } else {
          ty -= this.params.browCurve * faceH * 0.028;
        }
      }

      return { x: tx, y: ty };
    };

    const pushBrow = (i: number, side: 'left' | 'right') => {
      const p = pt(i);
      source.push(p);
      target.push(browTarget(i, side));
    };

    // Nariz: refinar — afina a ponte e as narinas, deixa a ponta mais definida
    const pushNose = (i: number) => {
      const p = pt(i);
      let tx = p.x;
      let ty = p.y;

      const nr = this.params.noseRefine;
      if (nr > 0.001) {
        // Centro aproximado do nariz (base da ponte entre as narinas)
        const noseCx = (pt(1).x + pt(2).x + pt(98).x + pt(327).x) / 4;
        const sidePull = (i === 1 || i === 2) ? 0.55 : (i === 4 || i === 5 || i === 195 || i === 197) ? 0.75 : 1.0;
        if (i === 98 || i === 327) {
          // Narinas: puxa para dentro e sobe levemente
          tx += (noseCx - p.x) * nr * 0.45;
          ty -= nr * faceH * 0.02;
        } else if (i === 168 || i === 6) {
          // Ponta: afina um pouco (define o nariz)
          tx += (noseCx - p.x) * nr * 0.20;
        } else {
          // Ponte do nariz: afina em direção ao centro
          tx += (noseCx - p.x) * nr * 0.28 * sidePull;
        }
      }

      source.push(p);
      target.push({ x: tx, y: ty });
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

    // Polígonos de tintura da sobrancelha (topo + base, por lado) — só se a cor estiver ativa
    const tintActive = this.params.browColorStrength > 0.001 && !!this.params.browColor;
    const browTintPolys: Point[][] = [];
    if (tintActive) {
      const buildPoly = (topIdx: number[], bottomIdx: number[], side: 'left' | 'right') => {
        const pts = [
          ...topIdx.map((i) => browTarget(i, side)),
          ...bottomIdx.map((i) => browTarget(i, side))
        ];
        // Infla levemente para não deixar "cabelo solto" fora da tintura
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const inflate = 1.06;
        return pts.map((p) => ({ x: cx + (p.x - cx) * inflate, y: cy + (p.y - cy) * inflate }));
      };
      browTintPolys.push(buildPoly(LEFT_BROW, LEFT_BROW_BOTTOM, 'left'));
      browTintPolys.push(buildPoly(RIGHT_BROW, RIGHT_BROW_BOTTOM, 'right'));
    }
    this.browTintPolys = browTintPolys;

    const bfEye = this.params.babyFace;
    const erEye = this.params.eyeRefine;
    const growEye = (bfEye * bfEye * 0.10 + bfEye * 0.03) + erEye * 0.14;

    FACE_OVAL.forEach(pushOval);
    pushEye(LEFT_EYE, eyeL, growEye);
    pushEye(RIGHT_EYE, eyeR, growEye);
    LEFT_BROW.forEach((i) => pushBrow(i, 'left'));
    RIGHT_BROW.forEach((i) => pushBrow(i, 'right'));
    NOSE.forEach(pushNose);
    MOUTH.forEach(pushMouth);
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

    // A intensidade de cada efeito já está codificada no deslocamento dos pontos;
    // a sobreposição do warp é total para a magnitude do slider ser linear.
    const alpha = 1.0;

    for (let t = 0; t < this.triangles.length; t++) {
      const [a, b, c] = this.triangles[t];
      const s1 = this.meshPoints[a];
      const s2 = this.meshPoints[b];
      const s3 = this.meshPoints[c];
      const d1 = this.targetPoints[a];
      const d2 = this.targetPoints[b];
      const d3 = this.targetPoints[c];

      // ⚡ Poda de triângulos PARADOS: longe do rosto os pontos-alvo ≈ origem.
      // Desenhar esses triângulos é custo puro (centenas de clip+drawImage do
      // frame inteiro). Pular os que se movem < 0.35px não muda nada visível
      // e corta a maior parte do trabalho por frame em cenas normais.
      const disp =
        Math.max(Math.abs(d1.x - s1.x), Math.abs(d1.y - s1.y),
          Math.max(Math.abs(d2.x - s2.x), Math.abs(d2.y - s2.y)),
          Math.max(Math.abs(d3.x - s3.x), Math.abs(d3.y - s3.y)));
      if (disp < 0.35) continue;

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

    // Tintura da cor da sobrancelha (aplica MATIZ/croma sem mexer na luminância —
    // o blend 'color' preserva a sombra dos fios, só troca a cor)
    this.tintBrows(ctx);
  }

  /**
   * Recolore as sobrancelhas com a cor escolhida, mantendo o brilho dos fios.
   */
  private tintBrows(ctx: CanvasRenderingContext2D): void {
    if (this.browTintPolys.length === 0) return;
    const strength = this.params.browColorStrength;
    const color = this.params.browColor;
    if (strength <= 0.001 || !color) return;

    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = Math.min(strength, 1) * 0.95;
    ctx.fillStyle = color;

    for (const poly of this.browTintPolys) {
      if (poly.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
