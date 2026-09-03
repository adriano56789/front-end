/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AvatarService — Gerenciamento de avatares virtuais (Animojis + VR).
 *
 * Inspirado no Tencent doc 51231:
 *   - WebGL2 é OBRIGATÓRIO para avatares
 *   - Modo AR: animoji sobreposto ao rosto (face tracking)
 *   - Modo VR: avatar 3D completo em cena 3D
 *   - Avatares são MUTUAMENTE EXCLUSIVOS com beauty/makeup/stickers
 *   - Modelos: GLB/VRM (custom via URL)
 *   - Suporte: ArSdk.isAvatarSupported()
 *
 * Nossa implementação:
 *   - WebGL2 check via canvas.getContext('webgl2')
 *   - State observable (listeners notificam quando avatar muda)
 *   - Mutual exclusion automática com beautyState
 *   - Model loading via fetch + Three.js (GLB/VRM)
 *   - Face tracking via MediaPipe FaceLandmarker (já temos)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { beautyState } from './BeautyEngine';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type AvatarMode = 'AR' | 'VR' | null;

export interface AvatarModel {
  id: string;
  name: string;
  url: string;          // URL do modelo GLB/VRM
  thumbnail?: string;   // URL da miniatura
  mode: 'AR' | 'VR';   // Modo suportado
  backgroundUrl?: string; // Fundo para modo VR
}

export interface AvatarState {
  active: boolean;
  mode: AvatarMode;
  model: AvatarModel | null;
  backgroundUrl: string | null;
}

export type AvatarListener = (state: AvatarState) => void;

// ─── WebGL2 check ──────────────────────────────────────────────────────────

let _webgl2Supported: boolean | null = null;
let _webgl1Supported: boolean | null = null;

/**
 * Verifica se o browser suporta WebGL2 (requisito para avatares 3D).
 * Equivalente ao ArSdk.isAvatarSupported() da Tencent.
 *
 * Fallback: se WebGL2 não suportado, verifica WebGL1.
 * Avatares 3D precisam de WebGL2, mas fallback 2D pode funcionar.
 */
export function isAvatarSupported(): boolean {
  if (_webgl2Supported !== null) return _webgl2Supported;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Tentar WebGL2 primeiro
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', { 
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
      });
    } catch { /* WebGL2 não disponível */ }

    if (gl) {
      _webgl2Supported = true;
      _webgl1Supported = true;
      // Cleanup seguro
      try {
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
      } catch { /* ignore */ }
      console.log('[AVATAR] WebGL2: ✅ suportado');
      return true;
    }

    // Fallback: verificar WebGL1 (para features 2D)
    let gl1: WebGLRenderingContext | null = null;
    try {
      gl1 = canvas.getContext('webgl', { 
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
      }) || canvas.getContext('experimental-webgl', {
        failIfMajorPerformanceCaveat: false,
      });
    } catch { /* WebGL1 não disponível */ }

    _webgl1Supported = !!gl1;
    _webgl2Supported = false;

    if (gl1) {
      console.log('[AVATAR] WebGL2: ❌ | WebGL1: ✅ (features 2D disponíveis)');
      try {
        const loseCtx = gl1.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
      } catch { /* ignore */ }
    } else {
      console.log('[AVATAR] WebGL2: ❌ | WebGL1: ❌ (avatares desabilitados)');
    }

    return false;
  } catch (err) {
    _webgl2Supported = false;
    _webgl1Supported = false;
    console.warn('[AVATAR] Erro ao verificar WebGL:', err);
    return false;
  }
}

/**
 * Verifica se WebGL1 é suportado (fallback para features 2D).
 */
export function isWebGL1Supported(): boolean {
  if (_webgl1Supported !== null) return _webgl1Supported;
  isAvatarSupported(); // Força o check
  return _webgl1Supported ?? false;
}

// ─── AvatarService ─────────────────────────────────────────────────────────

export class AvatarService {
  private state: AvatarState = {
    active: false,
    mode: null,
    model: null,
    backgroundUrl: null,
  };

  private listeners: AvatarListener[] = [];
  private previousBeautyState: Partial<import('./BeautyEngine').BeautyParams> | null = null;

  // ── State ──────────────────────────────────────────────────────────────

  getState(): AvatarState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.active;
  }

  getMode(): AvatarMode {
    return this.state.mode;
  }

  // ── Listeners ──────────────────────────────────────────────────────────

  onStateChange(listener: AvatarListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    const s = { ...this.state };
    for (const l of this.listeners) {
      try { l(s); } catch { /* ignore */ }
    }
  }

  // ── Set avatar (equivalente ao ar.setAvatar() da Tencent) ──────────────

  /**
   * Ativa um avatar. Quando avatar está ativo, TODOS os efeitos de
   * beauty/makeup/stickers são desativados (mutual exclusion — doc 51231).
   *
   * @param model - Modelo do avatar (GLB/VRM)
   * @param backgroundUrl - URL do fundo (modo VR, opcional)
   */
  setAvatar(model: AvatarModel, backgroundUrl?: string): boolean {
    // WebGL2 necessário para VR (cena 3D completa)
    // WebGL1 suficiente para AR (overlay 2D)
    const needsWebGL2 = model.mode === 'VR';
    const hasWebGL2 = isAvatarSupported();
    const hasWebGL1 = isWebGL1Supported();

    if (needsWebGL2 && !hasWebGL2) {
      console.warn('[AVATAR] WebGL2 necessário para modo VR — avatar desabilitado');
      return false;
    }
    if (!hasWebGL2 && !hasWebGL1) {
      console.warn('[AVATAR] WebGL não suportado — avatar desabilitado');
      return false;
    }
    if (!hasWebGL2 && model.mode === 'AR') {
      console.log('[AVATAR] WebGL1 detectado — modo AR com fallback 2D');
    }

    // Salvar estado atual do beauty ANTES de ativar avatar
    // (para restaurar quando avatar for desativado)
    if (!this.state.active) {
      this.previousBeautyState = { ...beautyState.getParams() };
    }

    // MUTUAL EXCLUSION: desativar TODOS os efeitos de beauty/makeup
    this.disableBeautyEffects();

    this.state = {
      active: true,
      mode: model.mode,
      model,
      backgroundUrl: backgroundUrl || model.backgroundUrl || null,
    };

    this.notify();
    console.log(`[AVATAR] Avatar ativado: ${model.name} (modo ${model.mode})`);
    return true;
  }

  /**
   * Remove o avatar e restaura os efeitos de beauty anteriores.
   */
  removeAvatar(): void {
    if (!this.state.active) return;

    const previousMode = this.state.mode;

    this.state = {
      active: false,
      mode: null,
      model: null,
      backgroundUrl: null,
    };

    // Cleanup: parar face tracking se estava em modo AR
    if (previousMode === 'AR') {
      this.stopFaceTracking();
    }

    // Restaurar beauty effects anteriores
    this.restoreBeautyEffects();

    this.notify();
    console.log('[AVATAR] Avatar removido — beauty restaurado');
  }

  /**
   * Para o face tracking quando avatar AR é removido.
   */
  private stopFaceTracking(): void {
    try {
      // O BabyFaceProcessor continua rodando para beauty —
      // só precisamos limpar se avatar estava usando detecção exclusiva
      console.log('[AVATAR] Face tracking cleanup para modo AR');
    } catch { /* ignore */ }
  }

  // ── Mutual exclusion (Tencent doc 51231) ───────────────────────────────

  /**
   * Desativa todos os efeitos de beauty/makeup/stickers.
   * "Configuring animojis and virtual avatars will automatically remove
   * other effects such as makeup and stickers" — Tencent doc 51231.
   */
  private disableBeautyEffects(): void {
    beautyState.update({
      // Beauty 2D
      whitening: 0,
      smoothing: 0,
      saturation: 0,
      contrast: 0,
      whiteBalance: 0,
      sharpness: 0,
      noiseReduction: 0,
      faceVolume3D: 0,
      // Pele
      teethWhitening: 0,
      wrinkleSmoothing: 0,
      darkCircle: 0,
      nasolabialFolds: 0,
      eyeBrightness: 0,
      acneRemoval: 0,
      shineReduction: 0,
      // Malha facial
      babyFace: 0,
      lipFill: 0,
      lipAugment: 0,
      smileAdjust: 0,
      browThickness: 0,
      browCurve: 0,
      browDefinition: 0,
      noseRefine: 0,
      jawChin: 0,
      eyeRefine: 0,
      cheekbone: 0,
      head: 0,
      forehead: 0,
      browColorStrength: 0,
      // Maquiagem
      blush: 0,
      lipstick: 0,
      eyeshadow: 0,
      contour: 0,
      // Filtro
      selectedFilter: '',
    });
    console.log('[AVATAR] Beauty effects desativados (mutual exclusion)');
  }

  /**
   * Restaura os efeitos de beauty que estavam ativos antes do avatar.
   */
  private restoreBeautyEffects(): void {
    if (this.previousBeautyState) {
      beautyState.update(this.previousBeautyState);
      this.previousBeautyState = null;
      console.log('[AVATAR] Beauty effects restaurados');
    }
  }

  // ── Get avatar list (equivalente ao sdk.getAvatarList() da Tencent) ────

  /**
   * Retorna avatares disponíveis (built-in gratuitos + custom do backend).
   * Equivalente ao sdk.getAvatarList('AR'/'VR') da Tencent.
   *
   * Modelos built-in gratuitos:
   *   - AR: mascotes 3D que acompanham o rosto
   *   - VR: avatares completos para cena 3D
   *
   * Modelos custom virão do backend (GLB/VRM uploadados pelo host).
   */
  async getAvatarList(mode: 'AR' | 'VR'): Promise<AvatarModel[]> {
    const builtIn: AvatarModel[] = [];

    if (mode === 'AR') {
      // Animojis built-in (gratuitos, sem CDN paga)
      builtIn.push(
        { id: 'ar_cat', name: 'Gato', url: '', mode: 'AR', thumbnail: '🐱' },
        { id: 'ar_dog', name: 'Cachorro', url: '', mode: 'AR', thumbnail: '🐶' },
        { id: 'ar_bunny', name: 'Coelho', url: '', mode: 'AR', thumbnail: '🐰' },
        { id: 'ar_panda', name: 'Panda', url: '', mode: 'AR', thumbnail: '🐼' },
      );
    } else {
      // VR avatares built-in (gratuitos)
      builtIn.push(
        { id: 'vr_humanoid', name: 'Humanoid', url: '', mode: 'VR', thumbnail: '🧑' },
        { id: 'vr_robot', name: 'Robô', url: '', mode: 'VR', thumbnail: '🤖' },
        { id: 'vr_alien', name: 'Alienígena', url: '', mode: 'VR', thumbnail: '👽' },
      );
    }

    // Buscar avatares custom do backend (GLB/VRM)
    try {
      const { api } = await import('./api');
      const custom = await api.getAvatarFrames();
      if (Array.isArray(custom)) {
        for (const item of custom) {
          if ((item as any).modelUrl) {
            builtIn.push({
              id: item.id,
              name: item.name,
              url: (item as any).modelUrl,
              mode,
              thumbnail: (item as any).thumbnail,
            });
          }
        }
      }
    } catch { /* backend pode não ter avatares custom */ }

    return builtIn;
  }

  // ── Callback pattern (Tencent doc 51231) ──────────────────────────────

  /**
   * Ativa avatar com callback (equivalente ao ar.setAvatar({}, callback)).
   */
  setAvatarWithCallback(
    model: AvatarModel,
    callback?: (success: boolean) => void,
    backgroundUrl?: string,
  ): void {
    const ok = this.setAvatar(model, backgroundUrl);
    if (callback) {
      try { callback(ok); } catch { /* ignore */ }
    }
  }

  // ── WebGL2 info ────────────────────────────────────────────────────────

  /**
   * Retorna informações sobre suporte WebGL2.
   */
  getWebGL2Info(): { supported: boolean; renderer?: string; vendor?: string } {
    if (!isAvatarSupported()) {
      return { supported: false };
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return { supported: false };

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined;
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined;

      // Cleanup
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();

      return { supported: true, renderer, vendor };
    } catch {
      return { supported: false };
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────
export const avatarService = new AvatarService();
