// FaceSkinMask — Máscara de PELE do rosto em tempo real via MediaPipe Face Landmarker.
//
// Para que serve: o shader de beleza do VideoProcessor usava só detecção de pele
// por COR (skinProbability) — parede bege, madeira e roupa clara entravam no
// "alisar a pele". Com esta máscara (468 pontos do rosto), a suavização e o
// clareamento passam a valer SÓ dentro do oval do rosto, preservando olhos,
// sobrancelhas, boca e fundo. NÃO altera formato de nada — é só uma máscara 2D.
//
// Formato da máscara: canvas pequeno onde BRANCO = pele do rosto e PRETO =
// tudo que deve ser preservado. O shader amostra com filtro LINEAR, então as
// bordas já ficam suaves (feather natural).

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Contorno do rosto (ordem do face mesh)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

// Anéis dos olhos (recortados da máscara — nunca suavizar olho)
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

// Sobrancelhas: fileira de cima + de baixo (polígono fechado para recorte)
const LEFT_BROW_TOP = [70, 63, 105, 66, 107];
const LEFT_BROW_BOTTOM = [55, 65, 52, 53, 46];
const RIGHT_BROW_TOP = [300, 293, 334, 296, 336];
const RIGHT_BROW_BOTTOM = [285, 295, 282, 283, 276];

// Lábios externos (recortados — nunca suavizar boca)
const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

const WASM_BASE = '/wasm';
const MODEL_URL = '/models/face_landmarker.task';

// Detecção a cada ~120ms (igual BabyFaceProcessor) — máscara redesenhada só quando detecta
const DETECTION_INTERVAL_MS = 120;
// Rosto considerado "presente" por até 600ms após a última detecção (evita piscar)
const FACE_TTL_MS = 600;

type Landmark = { x: number; y: number; z?: number };

export class FaceSkinMask {
  private landmarker: FaceLandmarker | null = null;
  private landmarkerReady = false;
  private initPromise: Promise<boolean> | null = null;

  private videoElement: HTMLVideoElement | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private detectionBusy = false;
  private lastDetection = 0;
  private lastFaceTime = 0;
  private failedFrames = 0;

  constructor() {
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = 256;
    this.maskCanvas.height = 256;
    this.ctx = this.maskCanvas.getContext('2d', { willReadFrequently: false });
    if (this.ctx) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, 256, 256);
    }
  }

  get canvas(): HTMLCanvasElement | null {
    return this.maskCanvas;
  }

  isReady(): boolean {
    return this.landmarkerReady;
  }

  /** Rosto visto recentemente? (máscara válida para o frame atual) */
  hasFace(): boolean {
    return this.landmarkerReady && performance.now() - this.lastFaceTime < FACE_TTL_MS;
  }

  /** Elemento de vídeo onde rodar a detecção (vídeo DEDICADO de processamento). */
  attach(videoElement: HTMLVideoElement): void {
    this.videoElement = videoElement;
  }

  detach(): void {
    this.videoElement = null;
  }

  /**
   * Pré-carrega o Face Landmarker (wasm + modelo). Mesmos assets do
   * BabyFaceProcessor (/wasm + /models/face_landmarker.task) — o browser serve
   * do cache HTTP, sem baixar duas vezes.
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
      const options = {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      };
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } });
      } catch {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
      }
      this.landmarkerReady = true;
      console.log('✅ [FACE_SKIN_MASK] Face Landmarker pronto');
      return true;
    } catch (error) {
      console.warn('⚠️ [FACE_SKIN_MASK] Face Landmarker indisponível — usando só detecção por cor:', error);
      this.landmarkerReady = false;
      this.initPromise = null; // permite retry na próxima chamada
      return false;
    }
  }

  /**
   * Rodar a cada frame do render (barato): dispara detecção throttled e
   * mantém a máscara atualizada. Não bloqueia o render.
   */
  update(now: number = performance.now()): void {
    if (!this.landmarkerReady || !this.landmarker || !this.videoElement) return;
    if (this.detectionBusy) return;
    if (now - this.lastDetection < DETECTION_INTERVAL_MS) return;
    this.lastDetection = now;
    this.detectionBusy = true;
    try {
      const result = this.landmarker.detectForVideo(this.videoElement, now);
      const landmarks = result?.faceLandmarks?.[0];
      if (landmarks && landmarks.length >= 400) {
        this.drawMask(landmarks);
        this.lastFaceTime = now;
        this.failedFrames = 0;
      } else {
        this.failedFrames++;
        if (this.failedFrames > 5) this.lastFaceTime = 0;
      }
    } catch {
      // timestamp repetido ou vídeo sem frame — tenta de novo no próximo ciclo
    } finally {
      this.detectionBusy = false;
    }
  }

  /**
   * Desenha a máscara: oval do rosto em branco, olhos/sobrancelhas/boca
   * recortados. Coordenadas normalizadas dos landmarks × tamanho do canvas —
   * alinha com o vídeo independente da proporção.
   */
  private drawMask(landmarks: Landmark[]): void {
    const ctx = this.ctx;
    const canvas = this.maskCanvas;
    if (!ctx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const pt = (i: number): { x: number; y: number } => ({ x: landmarks[i].x * W, y: landmarks[i].y * H });

    ctx.save();
    // Fundo preto (fora do rosto = preservado)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Oval do rosto levemente EXPANDIDO a partir do centróide (pele da borda
    // do queixo/testa entra na máscara; expansão pequena para não pegar pescoço)
    let cx = 0, cy = 0;
    for (const i of FACE_OVAL) { cx += pt(i).x; cy += pt(i).y; }
    cx /= FACE_OVAL.length;
    cy /= FACE_OVAL.length;
    const expand = 1.05;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let k = 0; k < FACE_OVAL.length; k++) {
      const p = pt(FACE_OVAL[k]);
      const x = cx + (p.x - cx) * expand;
      const y = cy + (p.y - cy) * expand;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Recortes (destination-out): features que NUNCA recebem suavização
    ctx.globalCompositeOperation = 'destination-out';

    // Olhos (anel inflado 1.7× a partir do centro — cobre cílios/contorno)
    for (const ring of [LEFT_EYE, RIGHT_EYE]) {
      let ex = 0, ey = 0;
      for (const i of ring) { ex += pt(i).x; ey += pt(i).y; }
      ex /= ring.length; ey /= ring.length;
      ctx.beginPath();
      for (let k = 0; k < ring.length; k++) {
        const p = pt(ring[k]);
        const x = ex + (p.x - ex) * 1.7;
        const y = ey + (p.y - ey) * 1.7;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Sobrancelhas (polígono topo+base inflado do centróide)
    for (const [top, bottom] of [[LEFT_BROW_TOP, LEFT_BROW_BOTTOM], [RIGHT_BROW_TOP, RIGHT_BROW_BOTTOM]] as [number[], number[]][]) {
      const poly = [...top.map(pt), ...bottom.map(pt)];
      let bx = 0, by = 0;
      for (const p of poly) { bx += p.x; by += p.y; }
      bx /= poly.length; by /= poly.length;
      ctx.beginPath();
      for (let k = 0; k < poly.length; k++) {
        const x = bx + (poly[k].x - bx) * 1.35;
        const y = by + (poly[k].y - by) * 1.5;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Boca/lábios (polígono externo inflado)
    {
      const poly = LIPS_OUTER.map(pt);
      let lx = 0, ly = 0;
      for (const p of poly) { lx += p.x; ly += p.y; }
      lx /= poly.length; ly /= poly.length;
      ctx.beginPath();
      for (let k = 0; k < poly.length; k++) {
        const x = lx + (poly[k].x - lx) * 1.3;
        const y = ly + (poly[k].y - ly) * 1.45;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  destroy(): void {
    this.landmarkerReady = false;
    if (this.landmarker) {
      try { this.landmarker.close(); } catch { /* ignore */ }
      this.landmarker = null;
    }
    this.initPromise = null;
    this.lastFaceTime = 0;
    this.failedFrames = 0;
    this.videoElement = null;
    this.maskCanvas = null;
    this.ctx = null;
  }
}
