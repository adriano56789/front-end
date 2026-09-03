/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GestureRecognitionService — Reconhecimento de gestos de mão em tempo real.
 *
 * Inspirado no Tencent Effect SDK (doc 69309):
 *   - 8 gestos suportados: Thumb_Up, Thumb_Down, Victory, Pointing_Up,
 *     Open_Palm, ILoveYou, Closed_Fist, None
 *   - Callback quando o gesto muda (handGesture event)
 *   - Mão esquerda/direita identificada (handedness)
 *
 * Implementação própria:
 *   - MediaPipe HandLandmarker (@mediapipe/tasks-vision)
 *   - Classificação de gestos via posições dos landmarks
 *   - Throttled detection (a cada ~100ms para performance)
 *   - Observable pattern (listeners notificados quando gesto muda)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type GestureName =
  | 'None'
  | 'Thumb_Up'
  | 'Thumb_Down'
  | 'Victory'
  | 'Pointing_Up'
  | 'Open_Palm'
  | 'ILoveYou'
  | 'Closed_Fist';

export type Handedness = 'Left' | 'Right';

export interface HandGesture {
  gesture: GestureName;
  handedness: Handedness;
  confidence: number;
}

export type GestureListener = (hands: HandGesture[]) => void;

// ─── MediaPipe config ──────────────────────────────────────────────────────

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const DETECTION_INTERVAL_MS = 100; // ~10 FPS para gestos (performance)

// ─── Landmark indices (MediaPipe Hands) ────────────────────────────────────
// Cada dedo tem 4 joints: MCP, PIP, DIP, TIP
const WRIST = 0;
const THUMB_CMC = 1; const THUMB_MCP = 2; const THUMB_IP = 3; const THUMB_TIP = 4;
const INDEX_MCP = 5; const INDEX_PIP = 6; const INDEX_DIP = 7; const INDEX_TIP = 8;
const MIDDLE_MCP = 9; const MIDDLE_PIP = 10; const MIDDLE_DIP = 11; const MIDDLE_TIP = 12;
const RING_MCP = 13; const RING_PIP = 14; const RING_DIP = 15; const RING_TIP = 16;
const PINKY_MCP = 17; const PINKY_PIP = 18; const PINKY_DIP = 19; const PINKY_TIP = 20;

// ─── Service ───────────────────────────────────────────────────────────────

export class GestureRecognitionService {
  private handLandmarker: HandLandmarker | null = null;
  private ready = false;
  private initPromise: Promise<boolean> | null = null;
  private enabled = true;

  private listeners: GestureListener[] = [];
  private lastGestures: HandGesture[] = [];
  private lastDetectionTime = 0;

  private videoElement: HTMLVideoElement | null = null;
  private running = false;

  // ── Inicialização ──────────────────────────────────────────────────────

  /**
   * Inicializa o HandLandmarker. Singleton — segunda chamada reutiliza.
   */
  async initialize(): Promise<boolean> {
    if (this.ready) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<boolean> {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

      // Tentar GPU primeiro, fallback para CPU
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 2,           // Detectar até 2 mãos
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch {
        this.handLandmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      this.ready = true;
      console.log('✅ [GESTURE] HandLandmarker inicializado');
      return true;
    } catch (err: any) {
      console.warn('⚠️ [GESTURE] Falha ao inicializar HandLandmarker:', err.message);
      this.ready = false;
      return false;
    }
  }

  // ── Controle ───────────────────────────────────────────────────────────

  /**
   * Liga/desliga reconhecimento (equivalente ao module.handGesture do Tencent).
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Limpar último gesto e notificar None
      if (this.lastGestures.length > 0) {
        this.lastGestures = [];
        this.notifyListeners([]);
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Inicia detecção contínua no vídeo.
   */
  start(videoElement: HTMLVideoElement): void {
    if (this.running) return;
    this.videoElement = videoElement;
    this.running = true;
    this.detectLoop();
    console.log('▶️ [GESTURE] Detecção de gestos iniciada');
  }

  /**
   * Para detecção.
   */
  stop(): void {
    this.running = false;
    this.videoElement = null;
    console.log('⏹️ [GESTURE] Detecção de gestos parada');
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.ready = false;
    this.initPromise = null;
  }

  // ── Listeners ──────────────────────────────────────────────────────────

  /**
   * Registra callback para mudanças de gesto (equivalente ao sdk.on('handGesture')).
   */
  onGesture(listener: GestureListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(hands: HandGesture[]): void {
    // Só notificar se mudou
    if (this.gesturesEqual(hands, this.lastGestures)) return;
    this.lastGestures = hands;
    for (const listener of this.listeners) {
      try { listener(hands); } catch { /* ignore */ }
    }
  }

  private gesturesEqual(a: HandGesture[], b: HandGesture[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].gesture !== b[i].gesture || a[i].handedness !== b[i].handedness) return false;
    }
    return true;
  }

  // ── Detection loop ─────────────────────────────────────────────────────

  private detectLoop(): void {
    if (!this.running) return;

    const now = performance.now();
    if (now - this.lastDetectionTime >= DETECTION_INTERVAL_MS) {
      this.lastDetectionTime = now;
      this.detect();
    }

    requestAnimationFrame(() => this.detectLoop());
  }

  private detect(): void {
    if (!this.handLandmarker || !this.videoElement || !this.enabled) return;
    if (this.videoElement.readyState < 2) return; // HAVE_CURRENT_DATA

    try {
      const results = this.handLandmarker.detectForVideo(this.videoElement, performance.now());

      if (!results.landmarks || results.landmarks.length === 0) {
        this.notifyListeners([]);
        return;
      }

      const hands: HandGesture[] = [];

      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handednesses?.[i]?.[0]?.categoryName || 'Right';

        const gesture = this.classifyGesture(landmarks);
        hands.push({
          gesture,
          handedness: handedness as Handedness,
          confidence: results.handednesses?.[i]?.[0]?.score || 0.5,
        });
      }

      this.notifyListeners(hands);
    } catch {
      // Silencioso — detecção pode falhar em frames específicos
    }
  }

  // ── Gesture classification ─────────────────────────────────────────────

  /**
   * Classifica o gesto a partir dos 21 landmarks da mão.
   * Lógica baseada na geometria dos dedos (extensão/encolhimento).
   *
   * MediaPipe hand landmarks:
   *   0: WRIST
   *   1-4: THUMB (CMC, MCP, IP, TIP)
   *   5-8: INDEX (MCP, PIP, DIP, TIP)
   *   9-12: MIDDLE (MCP, PIP, DIP, TIP)
   *   13-16: RING (MCP, PIP, DIP, TIP)
   *   17-20: PINKY (MCP, PIP, DIP, TIP)
   */
  private classifyGesture(landmarks: any[]): GestureName {
    // Verificar se há landmarks suficientes
    if (!landmarks || landmarks.length < 21) return 'None';

    // Status de extensão de cada dedo (true = esticado)
    const thumbExtended = this.isThumbExtended(landmarks);
    const indexExtended = this.isFingerExtended(landmarks, INDEX_MCP, INDEX_PIP, INDEX_TIP);
    const middleExtended = this.isFingerExtended(landmarks, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP);
    const ringExtended = this.isFingerExtended(landmarks, RING_MCP, RING_PIP, RING_TIP);
    const pinkyExtended = this.isFingerExtended(landmarks, PINKY_MCP, PINKY_PIP, PINKY_TIP);

    const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
      .filter(Boolean).length;

    // Thumb_Up: polegar pra cima, outros dedos fechados
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y) {
        return 'Thumb_Up';
      }
    }

    // Thumb_Down: polegar pra baixo, outros dedos fechados
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (landmarks[THUMB_TIP].y > landmarks[THUMB_IP].y) {
        return 'Thumb_Down';
      }
    }

    // Victory: indicador + médio esticados, outros fechados
    if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'Victory';
    }

    // Pointing_Up: só indicador esticado
    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'Pointing_Up';
    }

    // ILoveYou: polegar + indicador + mindinho esticados (rock/devil horns)
    if (thumbExtended && indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      return 'ILoveYou';
    }

    // Closed_Fist: todos os dedos fechados
    if (extendedCount === 0) {
      return 'Closed_Fist';
    }

    // Open_Palm: todos os dedos esticados
    if (extendedCount >= 4) {
      return 'Open_Palm';
    }

    return 'None';
  }

  /**
   * Verifica se o polegar está esticado.
   * Polegar é especial: usa eixo X (lado a lado) em vez de Y.
   */
  private isThumbExtended(landmarks: any[]): boolean {
    const thumbTip = landmarks[THUMB_TIP];
    const thumbIp = landmarks[THUMB_IP];
    const thumbMcp = landmarks[THUMB_MCP];
    const wrist = landmarks[WRIST];

    // Polegar esticado quando a ponta está longe da palma
    // Medir distância horizontal entre TIP e MCP vs IP e MCP
    const tipToMcp = Math.abs(thumbTip.x - thumbMcp.x);
    const ipToMcp = Math.abs(thumbIp.x - thumbMcp.x);

    // Também verificar se TIP está acima de IP (polegar pra cima)
    // ou abaixo (polegar pra baixo) — qualquer direção conta como esticado
    return tipToMcp > ipToMcp * 1.2;
  }

  /**
   * Verifica se um dedo (não-polegar) está esticado.
   * Compara a posição Y da ponta com a do PIP joint.
   * Dedo esticado: TIP.y < PIP.y (mais acima na tela).
   */
  private isFingerExtended(landmarks: any[], mcpIdx: number, pipIdx: number, tipIdx: number): boolean {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];

    // Dedo esticado quando ponta está significativamente acima do PIP
    // (coordenadas Y do MediaPipe: 0 = topo, 1 = base)
    return tip.y < pip.y - 0.02;
  }

  // ── API pública para consultas ─────────────────────────────────────────

  /**
   * Retorna o último gesto detectado (para polling).
   */
  getLastGestures(): HandGesture[] {
    return this.lastGestures;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────
export const gestureService = new GestureRecognitionService();
