/**
 * BeautyEngine — Motor de beleza independente inspirado na arquitetura Tencent.
 *
 * Arquitetura (igual Tencent TEBeautyKit + BaseBeautyStore):
 *
 *   BeautyState (Observable)  ←→  BeautyProcessor (GPU/WebGL)
 *         ↕                              ↕
 *   BeautyPipelineManager  ←→  Camera / Transmission
 *
 * Princípios:
 * 1. Estado observável — listeners notificam quando params mudam
 * 2. GPU processing — WebGL aplica efeitos no frame da câmera
 * 3. Pipeline isolado — câmera → processador → stream processada
 * 4. Lifecycle aware — sobrevive a camera switch, GL context rebuild
 * 5. Zero dependência externa — sem Tencent SDK, sem bibliotecas
 */

// ═══════════════════════════════════════════════════════════════
// 1. BEAUTY STATE — Estado observável (inspirado BaseBeautyStore)
// ═══════════════════════════════════════════════════════════════

export interface BeautyParams {
  // Efeitos 2D (shader WebGL)
  whitening: number;       // Branquear (0-100)
  smoothing: number;       // Alisar a pele (0-100)
  saturation: number;      // Ruborizar (0-100)
  contrast: number;        // Contraste (0-100)
  whiteBalance: number;    // Balanço de Branco (0-100)
  sharpness: number;       // Nitidez (0-100)
  noiseReduction: number;  // Limpar Chiado (0-100)
  faceVolume3D: number;    // Efeito 3D (0-100)
  // Efeitos de pele
  teethWhitening: number;  // Clarear dentes (0-100)
  wrinkleSmoothing: number;// Suavizar rugas (0-100)
  darkCircle: number;      // Clarear olheiras (0-100)
  nasolabialFolds: number;// Suavizar rugas do sorriso (0-100)
  eyeBrightness: number;   // Brilho/luminosidade dos olhos (0-100)
  acneRemoval: number;     // Remover manchas (0-100)
  shineReduction: number;  // Reduzir brilho (0-100)
  // Efeitos de malha facial (MediaPipe)
  babyFace: number;        // Rosto Bebê (0-100)
  browDefinition: number;  // Definição da sobrancelha (0-100)
  // Avançados (malha)
  lipFill: number;
  lipAugment: number;
  smileAdjust: number;
  browThickness: number;
  browCurve: number;
  noseRefine: number;
  jawChin: number;
  eyeRefine: number;
  browColor: string;
  browColorStrength: number;
  cheekbone: number;       // Maçãs do rosto (0-100)
  head: number;            // Formato da cabeça (0-100)
  forehead: number;        // Testa (0-100)
  // Maquiagem virtual (procedural)
  blush: number;           // Blush bochechas (0-100)
  lipstick: number;        // Batom lábios (0-100)
  eyeshadow: number;       // Sombra pálpebras (0-100)
  contour: number;         // Contorno facial (0-100)
  // Filtro
  selectedFilter: string;
}

export const DEFAULT_BEAUTY_PARAMS: BeautyParams = {
  whitening: 42,
  smoothing: 40,
  saturation: 32,
  contrast: 18,
  whiteBalance: 48,
  sharpness: 60,
  noiseReduction: 70,
  faceVolume3D: 50,
  teethWhitening: 24,
  wrinkleSmoothing: 45,
  darkCircle: 35,
  nasolabialFolds: 30,
  eyeBrightness: 25,
  acneRemoval: 70,
  shineReduction: 28,
  babyFace: 38,
  browDefinition: 0,
  lipFill: 0,
  lipAugment: 0,
  smileAdjust: 0,
  browThickness: 0,
  browCurve: 0,
  noseRefine: 0,
  jawChin: 0,
  eyeRefine: 0,
  browColor: '',
  browColorStrength: 0,
  cheekbone: 0,
  head: 0,
  forehead: 0,
  blush: 0,
  lipstick: 0,
  eyeshadow: 0,
  contour: 0,
  selectedFilter: '',
};

type BeautyStateListener = (params: BeautyParams) => void;

/**
 * BeautyState — Estado central de beleza (como BaseBeautyStore.shared())
 * 
 * Singleton observável. Qualquer componente que muda um slider atualiza
 * o state; o render loop do BeautyProcessor lê os params a cada frame.
 */
class BeautyState {
  private static instance: BeautyState;
  private params: BeautyParams = { ...DEFAULT_BEAUTY_PARAMS };
  private listeners: Set<BeautyStateListener> = new Set();

  static getInstance(): BeautyState {
    if (!BeautyState.instance) {
      BeautyState.instance = new BeautyState();
    }
    return BeautyState.instance;
  }

  getParams(): Readonly<BeautyParams> {
    return this.params;
  }

  /**
   * Atualiza múltiplos params de uma vez (batch update).
   * Notifica listeners uma única vez.
   */
  update(partial: Partial<BeautyParams>): void {
    this.params = { ...this.params, ...partial };
    this.notify();
  }

  /**
   * Atualiza um único parâmetro.
   */
  set<K extends keyof BeautyParams>(key: K, value: BeautyParams[K]): void {
    this.params[key] = value;
    this.notify();
  }

  /**
   * Reseta tudo para o padrão.
   */
  reset(): void {
    this.params = { ...DEFAULT_BEAUTY_PARAMS };
    this.notify();
  }

  /**
   * Exporta params como JSON (para persistência — como exportParam() da Tencent).
   */
  exportJSON(): string {
    return JSON.stringify(this.params);
  }

  /**
   * Importa params de JSON (restauração — como setLastParamList() da Tencent).
   */
  importJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.params = { ...DEFAULT_BEAUTY_PARAMS, ...parsed };
      this.notify();
    } catch {
      // Mantém params atuais se JSON inválido
    }
  }

  /**
   * Importa de formato antigo do BeautySettings (chaves em português).
   */
  importFromLegacySettings(settings: Record<string, any>): void {
    const s = settings || {};
    const num = (v: any, fallback: number): number =>
      typeof v === 'number' ? v : fallback;

    this.update({
      whitening: num(s['Branquear'], this.params.whitening),
      smoothing: num(s['Alisar a pele'], this.params.smoothing),
      saturation: num(s['Ruborizar'], this.params.saturation),
      contrast: num(s['Contraste'], this.params.contrast),
      whiteBalance: num(s['Balanço de Branco'], this.params.whiteBalance),
      sharpness: num(s['Nitidez'], this.params.sharpness),
      noiseReduction: num(s['Limpar Chiado'], this.params.noiseReduction),
      faceVolume3D: num(s['Efeito 3D'], this.params.faceVolume3D),
      teethWhitening: num(s['Clarear dentes'], this.params.teethWhitening),
      wrinkleSmoothing: num(s['Suavizar rugas'], this.params.wrinkleSmoothing),
      darkCircle: num(s['Clarear olheiras'], this.params.darkCircle),
      acneRemoval: num(s['Remover manchas'], this.params.acneRemoval),
      shineReduction: num(s['Reduzir brilho'], this.params.shineReduction),
      babyFace: num(s['Rosto Bebê'], this.params.babyFace),
      browDefinition: num(s['Definição da sobrancelha'], this.params.browDefinition),
      selectedFilter: typeof s['selectedFilter'] === 'string' ? s['selectedFilter'] : '',
    });
  }

  /**
   * Exporta para formato legacy do BeautySettings (chaves em português).
   */
  exportToLegacySettings(): Record<string, any> {
    const p = this.params;
    return {
      'Branquear': p.whitening,
      'Alisar a pele': p.smoothing,
      'Ruborizar': p.saturation,
      'Contraste': p.contrast,
      'Balanço de Branco': p.whiteBalance,
      'Nitidez': p.sharpness,
      'Limpar Chiado': p.noiseReduction,
      'Efeito 3D': p.faceVolume3D,
      'Clarear dentes': p.teethWhitening,
      'Suavizar rugas': p.wrinkleSmoothing,
      'Clarear olheiras': p.darkCircle,
      'Remover manchas': p.acneRemoval,
      'Reduzir brilho': p.shineReduction,
      'Rosto Bebê': p.babyFace,
      'Definição da sobrancelha': p.browDefinition,
      'selectedFilter': p.selectedFilter,
    };
  }

  subscribe(listener: BeautyStateListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(this.params); } catch { /* listener erro */ }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRTC-style API — setBeautify() + isDetectionActive()
  // ═══════════════════════════════════════════════════════════════

  /**
   * setBeautify() — batch update estilo TRTC sdk.setBeautify().
   * Aceita parâmetros normalizados 0-1 (TRTC) e converte para 0-100 (interno).
   * Exemplo: beautyState.setBeautify({ whiten: 0.5, dermabrasion: 0.3 })
   */
  setBeautify(opts: {
    whiten?: number;
    dermabrasion?: number;
    lift?: number;
    shave?: number;
    eye?: number;
    chin?: number;
    darkCircle?: number;
    nasolabialFolds?: number;
    cheekbone?: number;
    eyeBrightness?: number;
    lip?: number;
    nose?: number;
    usm?: number;
  }): void {
    const to100 = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);
    const partial: Partial<BeautyParams> = {};
    if (opts.whiten !== undefined) partial.whitening = to100(opts.whiten);
    if (opts.dermabrasion !== undefined) partial.smoothing = to100(opts.dermabrasion);
    if (opts.lift !== undefined) partial.faceVolume3D = to100(opts.lift);
    if (opts.shave !== undefined) partial.jawChin = to100(opts.shave);
    if (opts.eye !== undefined) partial.eyeRefine = to100(opts.eye);
    if (opts.chin !== undefined) partial.jawChin = to100(opts.chin);
    if (opts.darkCircle !== undefined) partial.darkCircle = to100(opts.darkCircle);
    if (opts.nasolabialFolds !== undefined) partial.nasolabialFolds = to100(opts.nasolabialFolds);
    if (opts.cheekbone !== undefined) partial.cheekbone = to100(opts.cheekbone);
    if (opts.eyeBrightness !== undefined) partial.eyeBrightness = to100(opts.eyeBrightness);
    if (opts.lip !== undefined) partial.lipFill = to100(opts.lip);
    if (opts.nose !== undefined) partial.noseRefine = to100(opts.nose);
    if ((opts as any).head !== undefined) partial.head = to100((opts as any).head);
    if ((opts as any).forehead !== undefined) partial.forehead = to100((opts as any).forehead);
    if (opts.usm !== undefined) partial.sharpness = to100(opts.usm);
    this.update(partial);
  }

  /**
   * isDetectionActive() — verifica se algum efeito precisa de AI detection.
   * TRTC desliga detecção quando tudo = 0 para economizar recursos.
   */
  isDetectionActive(): boolean {
    const p = this.params;
    return (
      p.babyFace > 0 ||
      p.lipFill > 0 ||
      p.lipAugment > 0 ||
      p.smileAdjust > 0 ||
      p.browThickness > 0 ||
      p.browCurve > 0 ||
      p.noseRefine > 0 ||
      p.jawChin > 0 ||
      p.eyeRefine > 0 ||
      p.browColorStrength > 0 ||
      p.browDefinition > 0 ||
      p.cheekbone > 0 ||
      p.head > 0 ||
      p.forehead > 0
    );
  }

  /**
   * isShaderActive() — verifica se algum efeito shader está ativo.
   * Quando tudo = 0, pula o processamento WebGL inteiro (economiza GPU).
   */
  isShaderActive(): boolean {
    const p = this.params;
    return (
      p.whitening > 0 ||
      p.smoothing > 0 ||
      p.saturation > 0 ||
      p.contrast > 0 ||
      p.whiteBalance > 0 ||
      p.sharpness > 0 ||
      p.noiseReduction > 0 ||
      p.faceVolume3D > 0 ||
      p.teethWhitening > 0 ||
      p.wrinkleSmoothing > 0 ||
      p.darkCircle > 0 ||
      p.nasolabialFolds > 0 ||
      p.eyeBrightness > 0 ||
      p.acneRemoval > 0 ||
      p.shineReduction > 0 ||
      p.blush > 0 ||
      p.lipstick > 0 ||
      p.eyeshadow > 0 ||
      p.contour > 0 ||
      p.selectedFilter !== ''
    );
  }

  /**
   * isAnyEffectActive() — pipeline ativo (shader OU mesh).
   * Quando false, o VideoProcessor pode pular o frame inteiro.
   */
  isAnyEffectActive(): boolean {
    return this.isShaderActive() || this.isDetectionActive();
  }
}

export const beautyState = BeautyState.getInstance();

// ═══════════════════════════════════════════════════════════════
// 2. BEAUTY PROCESSOR — GPU/WebGL (inspirado TEBeautyKit.process)
// ═══════════════════════════════════════════════════════════════

/**
 * BeautyProcessor — Processa frames via WebGL com todos os efeitos.
 *
 * Como o TEBeautyKit da Tencent:
 * - Recebe textura de entrada (frame da câmera)
 * - Aplica TODOS os efeitos de beleza via shader
 * - Retorna frame processado
 *
 * Diferente da Tencent: usamos Canvas + captureStream() em vez de
 * OpenGL texture IDs, porque no browser o pipeline é:
 *   <video> → WebGL shader → <canvas> → captureStream() → MediaStreamTrack
 */

// ═══════════════════════════════════════════════════════════════
// 3. BEAUTY PIPELINE MANAGER — Lifecycle (inspirado TEBeautyManager)
// ═══════════════════════════════════════════════════════════════

/**
 * BeautyPipelineManager — Conecta câmera → BeautyProcessor → Stream
 *
 * Como o TEBeautyManager da Tencent:
 * - Registra o processador no pipeline de vídeo
 * - Gerencia lifecycle (init, camera switch, destroy)
 * - Serializa/deserializa estado (exportParam/setLastParamList)
 * - Processa frame a frame em tempo real
 */
export class BeautyPipelineManager {
  private static instance: BeautyPipelineManager;
  private initialized = false;
  private processing = false;

  static getInstance(): BeautyPipelineManager {
    if (!BeautyPipelineManager.instance) {
      BeautyPipelineManager.instance = new BeautyPipelineManager();
    }
    return BeautyPipelineManager.instance;
  }

  /**
   * Inicializa o pipeline de beleza.
   * Chamar UMA vez quando a câmera é aberta.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Escuta mudanças de estado
    beautyState.subscribe((params) => {
      // Estado propagado via beautyState — o VideoProcessor lê a cada frame
      this.syncStateToProcessor(params);
    });
  }

  /**
   * Sincroniza estado do BeautyState para o VideoProcessor.
   * Chamado a cada mudança de estado.
   */
  private syncStateToProcessor(params: BeautyParams): void {
    // O VideoProcessor já tem seu próprio beautySettings.
    // Este sync garante que mudanças de BEAUtyState cheguem ao processor.
    // Será integrado quando refatorarmos o VideoProcessor.
  }

  /**
   * Exporta estado atual (para persistência).
   * Equivalente a exportParam() da Tencent.
   */
  exportState(): string {
    return beautyState.exportJSON();
  }

  /**
   * Restaura estado (de persistência).
   * Equivalente a setLastParamList() da Tencent.
   */
  restoreState(json: string): void {
    beautyState.importJSON(json);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

export const beautyPipeline = BeautyPipelineManager.getInstance();
