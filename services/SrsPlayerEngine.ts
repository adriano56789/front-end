import { getWhepPlayUrl, resolveAbsoluteUrl } from './mediaConfig';

export type PlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'error';

interface EngineConfig {
  autoMuteRetry?: boolean;
  /** Número máximo de tentativas de reconexão WHEP (com backoff exponencial). Default: 5 */
  reconnectRetries?: number;
  /** Timeout em ms para conectar ao WHEP. Default: 15000 */
  connectTimeout?: number;
  /** Se true, loga cada etapa do pipeline WHEP em detalhe. Default: true */
  verboseLogs?: boolean;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];
const SDK_WAIT_TIMEOUT = 10000;

/** URL WHEP válida = absoluta (http/https) e com host definido. */
function isValidWhepUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * SrsPlayerEngine
 *
 * Player WebRTC (WHEP) que conecta ao SRS (Simple Realtime Server)
 * usando o SDK OFICIAL do SRS (srs.sdk.js → classe SrsRtcWhipWhepAsync).
 *
 * Docs oficiais:
 *   - https://ossrs.net/lts/en-us/docs/v5/doc/webrtc
 *   - https://github.com/ossrs/srs/blob/develop/trunk/research/players/js/srs.sdk.js
 *
 * Pipeline:
 *   1. Gera URL WHEP via getWhepPlayUrl()
 *   2. Carrega o SDK oficial (srs.sdk.js) se ainda não estiver no window
 *   3. Instancia SrsRtcWhipWhepAsync e chama play(url)
 *   4. Anexa player.stream (MediaStream remota) ao <video>
 *   5. Em caso de falha, tenta reconectar com backoff exponencial
 * ═══════════════════════════════════════════════════════════════════
 */

// Tipos do SDK oficial do SRS (declarados globalmente, sem dependência externa)
declare global {
  interface SrsRtcWhipWhepAsyncInstance {
    publish: (url: string, options?: any) => Promise<any>;
    play: (url: string, options?: any) => Promise<any>;
    close: () => void;
    stream: MediaStream;
    pc: RTCPeerConnection;
  }

  interface Window {
    SrsRtcWhipWhepAsync?: new () => SrsRtcWhipWhepAsyncInstance;
  }
}

export class SrsPlayerEngine {
  private _state: PlayerState = 'idle';
  private _destroyed = false;
  private _connecting = false;
  private _retryCount = 0;

  private _video: HTMLVideoElement | null = null;
  private _streamId = '';
  private _customWhepUrl = '';

  private _player: SrsRtcWhipWhepAsyncInstance | null = null;

  private _bufferTimer: ReturnType<typeof setInterval> | null = null;
  private _bufferPercent = 0;

  private _listeners = new Map<string, Set<Function>>();
  private _visibilityHandler: (() => void) | null = null;
  private _unlockHandler: (() => void) | null = null;

  private _config: Required<EngineConfig> = {
    autoMuteRetry: true,
    reconnectRetries: 5,
    connectTimeout: 15000,
    verboseLogs: true,
  };

  constructor(config?: EngineConfig) {
    if (config) Object.assign(this._config, config);
  }

  get state(): PlayerState { return this._state; }
  get bufferPercent(): number { return this._bufferPercent; }
  get streamId(): string { return this._streamId; }

  on(event: string, cb: Function): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(cb);
    return () => this._listeners.get(event)?.delete(cb);
  }

  private _emit(event: string, ...args: any[]) {
    this._listeners.get(event)?.forEach(cb => cb(...args));
  }

  private _setState(next: PlayerState) {
    if (this._state === next || this._destroyed) return;
    const prev = this._state;
    this._state = next;
    if (this._config.verboseLogs) {
      console.log(`[SRS-Engine] Estado: ${prev} → ${next} (stream=${this._streamId})`);
    }
    this._emit('stateChanged', prev, next);
  }

  /**
   * Garante que o SDK oficial do SRS (srs.sdk.js) esteja carregado.
   * Se o script ainda não terminou de carregar (defer), aguarda até
   * SDK_WAIT_TIMEOUT ms.
   */
  private async _ensureSdk(): Promise<void> {
    if (typeof window !== 'undefined' && window.SrsRtcWhipWhepAsync) return;

    const started = Date.now();
    while (Date.now() - started < SDK_WAIT_TIMEOUT) {
      if (this._destroyed) throw new Error('Engine destroyed while waiting for SRS SDK');
      if (typeof window !== 'undefined' && window.SrsRtcWhipWhepAsync) return;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('SDK oficial do SRS (srs.sdk.js) não carregado. Verifique o <script> no index.html.');
  }

  async start(streamId: string, video: HTMLVideoElement, customUrl?: string): Promise<void> {
    if (this._destroyed) return;
    if (this._connecting) {
      console.warn('[SRS-Engine] Já está conectando. Ignorando start().');
      return;
    }
    this._connecting = true;
    this._streamId = streamId;
    this._video = video;
    this._retryCount = 0;
    this._customWhepUrl = customUrl || '';

    this._setState('loading');

    // ⚠️ Sempre usar URL ABSOLUTA no SDK do SRS: o SDK faz `new URL(location, url)`
    // e `xhr.open('POST', url)` internamente — com base relativa o browser lança
    // `TypeError: Failed to construct 'URL': Invalid base URL` (bug visto em produção).
    const whepUrl = resolveAbsoluteUrl(this._customWhepUrl || getWhepPlayUrl(this._streamId));
    if (this._config.verboseLogs) {
      console.log(`[SRS-Engine] 🎬 Iniciando player WHEP (WebRTC) para stream ${streamId}`);
      console.log(`[SRS-Engine] 📡 URL WHEP: ${whepUrl}`);
    }

    // URL determinísticamente inválida → erro imediato SEM fila de reconexão
    // (reconectar 5x com URL quebrada só gera spam de erro e timeout inútil).
    if (!isValidWhepUrl(whepUrl)) {
      console.error(`[SRS-Engine] ❌ URL WHEP inválida: "${this._customWhepUrl || getWhepPlayUrl(this._streamId)}"`);
      this._setState('error');
      this._emit('error', 'PLAYBACK_FAILED', `URL de reprodução WHEP inválida. Verifique a configuração do stream (${streamId}).`);
      this._connecting = false;
      return;
    }

    try {
      await this._ensureSdk();
      await this._startWhep(whepUrl);
      this._connecting = false;
    } catch (err: any) {
      const errMsg = err?.message || 'Falha ao conectar no WebRTC (WHEP)';
      const isFatalUrlError =
        err instanceof TypeError ||
        /failed to construct 'url'|invalid base url|invalid url/i.test(errMsg);
      console.error(`[SRS-Engine] ❌ WHEP falhou na tentativa inicial:`, errMsg);
      this._setState('error');
      this._emit('error', 'PLAYBACK_FAILED', `Stream não disponível: ${errMsg}. Verifique se a transmissão ao vivo foi iniciada corretamente.`);

      // Não tentar reconectar quando o erro é determinístico (URL quebrada) —
      // retry só faz sentido para falhas transitórias de rede/SRS.
      if (this._config.reconnectRetries > 0 && !this._destroyed && !isFatalUrlError) {
        console.log(`[SRS-Engine] 🔄 Iniciando reconexão (${this._config.reconnectRetries} tentativas)...`);
        this._scheduleRetry();
      }
      this._connecting = false;
    }
  }

  private _scheduleRetry(): void {
    if (this._destroyed) return;
    if (this._retryCount >= this._config.reconnectRetries) {
      console.error(`[SRS-Engine] ❌ Esgotadas ${this._config.reconnectRetries} tentativas de reconexão.`);
      this._emit('error', 'RETRY_EXHAUSTED', `Esgotadas ${this._config.reconnectRetries} tentativas`);
      return;
    }

    const delay = RECONNECT_DELAYS[this._retryCount] || 15000;
    this._retryCount++;
    console.log(`[SRS-Engine] 🔄 Tentativa ${this._retryCount}/${this._config.reconnectRetries} em ${delay}ms...`);

    setTimeout(async () => {
      if (this._destroyed) return;
      console.log(`[SRS-Engine] 🔄 Reconectando (tentativa ${this._retryCount})...`);
      this._setState('loading');

      try {
        this._disposePlayer();
        const whepUrl = resolveAbsoluteUrl(this._customWhepUrl || getWhepPlayUrl(this._streamId));
        await this._ensureSdk();
        await this._startWhep(whepUrl);
        console.log(`[SRS-Engine] ✅ Reconexão bem-sucedida na tentativa ${this._retryCount}!`);
        this._retryCount = 0;
      } catch (err: any) {
        const retryErrMsg = err?.message || 'Falha ao reconectar (WHEP)';
        const isFatalUrlError =
          err instanceof TypeError ||
          /failed to construct 'url'|invalid base url|invalid url/i.test(retryErrMsg);
        console.error(`[SRS-Engine] ❌ Tentativa ${this._retryCount} falhou:`, retryErrMsg);
        this._setState('error');
        this._emit('error', 'RETRY_FAILED', retryErrMsg);
        // Erros determinísticos de URL não melhoram com retry — encerra a fila
        // (evita o spam de reconexão visto em produção com SDK antigo em cache).
        if (!isFatalUrlError) {
          this._scheduleRetry();
        }
      }
    }, delay);
  }

  private async _startWhep(whepUrl: string): Promise<void> {
    const video = this._video;
    if (!video || this._destroyed) throw new Error('No video element');

    const Ctor = window.SrsRtcWhipWhepAsync!;
    const player = new Ctor();
    this._player = player;

    if (this._config.verboseLogs) {
      console.log('[SRS-Engine] 📡 SDK oficial SRS (SrsRtcWhipWhepAsync) instanciado. Negociando SDP via WHEP...');
    }

    const connectPromise = player.play(whepUrl, {});
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`WHEP timeout (${this._config.connectTimeout / 1000}s)`)), this._config.connectTimeout);
    });

    await Promise.race([connectPromise, timeoutPromise]);

    if (this._destroyed) {
      player.close();
      return;
    }

    const remoteStream = player.stream;
    if (!remoteStream || remoteStream.getTracks().length === 0) {
      throw new Error('Nenhuma track remota recebida do SRS (WHEP)');
    }

    video.srcObject = remoteStream;
    await this._autoPlay(video);

    this._startBufferMonitor(video);
    this._setState('playing');
    this._emit('playing');
    this._handleVisibility();

    if (this._config.verboseLogs) {
      console.log(`[SRS-Engine] ✅ WebRTC/WHEP conectado. Tracks remotas: ${remoteStream.getTracks().length} (video=${remoteStream.getVideoTracks().length}, audio=${remoteStream.getAudioTracks().length})`);
    }
  }

  private async _autoPlay(video: HTMLVideoElement): Promise<void> {
    try {
      await video.play();
      console.log('[SRS-Engine] ▶️ Reprodução iniciada');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' && this._config.autoMuteRetry) {
        console.log('[SRS-Engine] 🔇 Autoplay bloqueado, tentando com muted');
        video.muted = true;
        try {
          await video.play();
          console.log('[SRS-Engine] ▶️ Reprodução iniciada (muted)');
          this._emit('autoplayMuted');
          return;
        } catch (muteErr: any) {
          console.error('[SRS-Engine] ❌ Reprodução falhou mesmo com muted:', muteErr.message);
        }
      }
      throw err;
    }
  }

  private _startBufferMonitor(video: HTMLVideoElement): void {
    this._stopBufferMonitor();
    this._bufferTimer = setInterval(() => {
      if (this._destroyed) { this._stopBufferMonitor(); return; }
      try {
        const ranges = video.buffered;
        if (ranges.length > 0) {
          const bufferedEnd = ranges.end(ranges.length - 1);
          const currentTime = video.currentTime;
          const duration = video.duration;
          let percent = 0;
          if (duration > 0 && isFinite(duration)) {
            percent = Math.min(100, (bufferedEnd / duration) * 100);
          } else if (isFinite(bufferedEnd)) {
            const ahead = Math.max(0, bufferedEnd - currentTime);
            percent = Math.min(100, (ahead / 30) * 100);
          }
          this._bufferPercent = percent;
          this._emit('bufferChanged', this._bufferPercent);
        }
      } catch { /* buffer check não crítico */ }
    }, 1000);
  }

  private _stopBufferMonitor(): void {
    if (this._bufferTimer) { clearInterval(this._bufferTimer); this._bufferTimer = null; }
  }

  private _handleVisibility(): void {
    this._removeVisibilityHandler();
    const handler = () => {
      if (this._destroyed) return;
      if (document.visibilityState === 'visible' && this._state === 'paused' && this._video) {
        this._autoPlay(this._video).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    this._visibilityHandler = () => document.removeEventListener('visibilitychange', handler);
  }

  private _removeVisibilityHandler(): void {
    if (this._visibilityHandler) { this._visibilityHandler(); this._visibilityHandler = null; }
  }

  private _unlockAudio(): void {
    this._removeAudioUnlock();
    const handler = () => {
      try {
        const video = this._video;
        if (video && video.paused) {
          video.play().catch(() => {});
        }
      } catch { /* audio unlock não crítico */ }
    };
    document.addEventListener('touchend', handler, { once: false });
    document.addEventListener('click', handler, { once: false });
    this._unlockHandler = () => {
      document.removeEventListener('touchend', handler);
      document.removeEventListener('click', handler);
    };
  }

  private _removeAudioUnlock(): void {
    if (this._unlockHandler) { this._unlockHandler(); this._unlockHandler = null; }
  }

  private _disposePlayer(): void {
    if (this._player) {
      try { this._player.close(); } catch { /* ignore */ }
      this._player = null;
    }
  }

  pause(): void {
    if (this._video && this._state === 'playing') {
      this._video.pause();
      this._setState('paused');
    }
  }

  async resume(): Promise<void> {
    if (this._video && this._state === 'paused') {
      await this._autoPlay(this._video);
      this._setState('playing');
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._connecting = false;

    this._stopBufferMonitor();
    this._removeVisibilityHandler();
    this._removeAudioUnlock();

    this._disposePlayer();

    if (this._video) {
      this._video.srcObject = null;
      this._video.src = '';
      this._video = null;
    }

    this._listeners.clear();
    this._setState('idle');
    console.log(`[SRS-Engine] 🧹 Destruído (stream=${this._streamId})`);
  }
}
