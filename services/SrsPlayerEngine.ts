import Hls from 'hls.js';
import { getHlsPlayUrl } from './mediaConfig';

export type PlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'error';

interface EngineConfig {
  autoMuteRetry?: boolean;
  /** Número máximo de tentativas de reconexão HLS (com backoff exponencial). Default: 5 */
  reconnectRetries?: number;
  /** Timeout em ms para carregamento do manifest .m3u8. Default: 15000 */
  manifestTimeout?: number;
  /** Se true, loga cada etapa do pipeline HLS em detalhe. Default: true */
  verboseLogs?: boolean;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];
const BUFFER_POLL_MS = 1000;

/**
 * ═══════════════════════════════════════════════════════════════════
 * SrsPlayerEngine
 *
 * Player HLS que conecta ao SRS para reprodução de streams ao vivo.
 *
 * Pipeline:
 *   1. Gera URL do .m3u8 via getHlsPlayUrl()
 *   2. Tenta carregar o manifest (nativo ou hls.js)
 *   3. Valida que o manifest contém segmentos .ts
 *   4. Inicia reprodução
 *   5. Em caso de falha, tenta reconectar com backoff exponencial
 * ═══════════════════════════════════════════════════════════════════
 */
export class SrsPlayerEngine {
  private _state: PlayerState = 'idle';
  private _destroyed = false;
  private _connecting = false;
  private _retryCount = 0;

  private _video: HTMLVideoElement | null = null;
  private _streamId = '';
  private _hls: Hls | null = null;

  private _bufferTimer: ReturnType<typeof setInterval> | null = null;
  private _bufferPercent = 0;

  private _audioCtx: AudioContext | null = null;
  private _listeners = new Map<string, Set<Function>>();
  private _visibilityHandler: (() => void) | null = null;
  private _unlockHandler: (() => void) | null = null;

  private _config: Required<EngineConfig> = {
    autoMuteRetry: true,
    reconnectRetries: 5,
    manifestTimeout: 15000,
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

  async start(streamId: string, video: HTMLVideoElement): Promise<void> {
    if (this._destroyed) return;
    if (this._connecting) {
      console.warn('[SRS-Engine] Já está conectando. Ignorando start().');
      return;
    }
    this._connecting = true;
    this._streamId = streamId;
    this._video = video;
    this._retryCount = 0;

    this._setState('loading');

    const hlsUrl = getHlsPlayUrl(this._streamId);
    console.log(`[SRS-Engine] 🎬 Iniciando player HLS para stream ${streamId}`);
    console.log(`[SRS-Engine] 📡 URL do manifest: ${hlsUrl}`);

    try {
      await this._startHls();
      this._connecting = false;
    } catch (err: any) {
      console.error(`[SRS-Engine] ❌ HLS falhou na tentativa inicial:`, err?.message || err);
      this._setState('error');
      this._emit('error', 'PLAYBACK_FAILED', err?.message || 'Falha ao conectar no HLS');

      // Tentar reconectar com backoff
      if (this._config.reconnectRetries > 0 && !this._destroyed) {
        console.log(`[SRS-Engine] 🔄 Iniciando reconexão (${this._config.reconnectRetries} tentativas)...`);
        this._scheduleRetry();
      }
      this._connecting = false;
    }
  }

  /**
   * Agenda uma tentativa de reconexão com backoff exponencial.
   */
  private _scheduleRetry(): void {
    if (this._destroyed) return;
    if (this._retryCount >= this._config.reconnectRetries) {
      console.error(`[SRS-Engine] ❌ Esgotadas ${this._config.reconnectRetries} tentativas de reconexão.`);
      this._emit('error', 'RETRY_EXHAUSTED', `Esgotadas ${this._config.reconnectRetries} tentativas`);
      return;
    }

    const delay = RECONNECT_DELAYS[this._retryCount] || 15000;
    this._retryCount++;
    console.log(
      `[SRS-Engine] 🔄 Tentativa ${this._retryCount}/${this._config.reconnectRetries} em ${delay}ms...`,
    );

    setTimeout(async () => {
      if (this._destroyed) return;
      console.log(`[SRS-Engine] 🔄 Reconectando (tentativa ${this._retryCount})...`);
      this._setState('loading');

      try {
        // Destruir HLS anterior se existir
        if (this._hls) {
          this._hls.destroy();
          this._hls = null;
        }

        await this._startHls();
        console.log(`[SRS-Engine] ✅ Reconexão bem-sucedida na tentativa ${this._retryCount}!`);
        this._retryCount = 0; // Reset contador após sucesso
      } catch (err: any) {
        console.error(`[SRS-Engine] ❌ Tentativa ${this._retryCount} falhou:`, err.message);
        this._setState('error');
        this._emit('error', 'RETRY_FAILED', err.message);
        this._scheduleRetry(); // Tentar novamente
      }
    }, delay);
  }

  private async _startHls(): Promise<void> {
    const video = this._video;
    if (!video || this._destroyed) throw new Error('No video element');

    const hlsUrl = getHlsPlayUrl(this._streamId);

    // Tentar reprodução nativa (Chrome, Safari, Edge)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[SRS-Engine] 🍎 Tentando player HLS nativo primeiro...');
      try {
        video.src = hlsUrl;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('HLS native timeout: .m3u8 não carregou em 15s'));
          }, this._config.manifestTimeout);

          video.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            console.log('[SRS-Engine] ✅ Manifest .m3u8 carregado (nativo)');
            this._autoPlay(video).then(resolve).catch(reject);
          }, { once: true });

          video.addEventListener('error', () => {
            clearTimeout(timeout);
            const medErr = video.error;
            reject(new Error(`HLS native error: ${medErr?.message || medErr?.code || 'unknown'}`));
          }, { once: true });
        });
        this._startBufferMonitor(video);
        this._setState('playing');
        this._emit('playing');
        this._handleVisibility();
        return;
      } catch (nativeErr: any) {
        console.warn('[SRS-Engine] ⚠️ Nativo falhou:', nativeErr.message);
        // Se hls.js estiver disponível, tentar como fallback
        if (Hls.isSupported()) {
          console.log('[SRS-Engine] 📦 Nativo falhou, fazendo fallback para hls.js...');
          video.src = ''; // Limpar src nativo
        } else {
          // Se hls.js não estiver disponível, relançar o erro
          throw nativeErr;
        }
      }
    }

    // hls.js para demais navegadores
    if (!Hls.isSupported()) {
      throw new Error('HLS not supported in this browser');
    }

    console.log('[SRS-Engine] 📦 Usando hls.js para reprodução');

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      manifestLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: 8000,
          maxLoadTimeMs: this._config.manifestTimeout,
          timeoutRetry: {
            maxNumRetry: 3,
            retryDelayMs: 1000,
            maxRetryDelayMs: 5000,
          },
          errorRetry: {
            maxNumRetry: 3,
            retryDelayMs: 1000,
            maxRetryDelayMs: 5000,
          },
        },
      },
    });
    this._hls = hls;

    // Log detalhado de erros HLS
    hls.on(Hls.Events.ERROR, (_e, data) => {
      const { type, details, fatal, reason } = data;
      console.warn(
        `[SRS-Engine] ⚠️ HLS Error | type=${type} details=${details} fatal=${fatal} reason=${reason}`,
      );

      if (fatal) {
        if (type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.log('[SRS-Engine] 🔄 Tentando recuperar de erro de rede (startLoad)...');
          hls.startLoad();
        } else if (type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.log('[SRS-Engine] 🔄 Tentando recuperar de erro de mídia (recoverMediaError)...');
          hls.recoverMediaError();
        } else {
          console.error('[SRS-Engine] ❌ Erro fatal não recuperável');
          this._setState('error');
          this._emit('error', 'HLS_FATAL', reason || details);
        }
      }
    });

    // Log quando manifest é carregado
    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      console.log(
        `[SRS-Engine] ✅ Manifest .m3u8 carregado: ${data.levels?.length || 0} qualidade(s), ` +
        `${data.audioTracks?.length || 0} faixa(s) de áudio`,
      );
    });

    // Log de níveis
    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      console.log(`[SRS-Engine] 📊 Qualidade alternada para nível ${data.level}`);
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`HLS manifest timeout: .m3u8 não carregou em ${this._config.manifestTimeout / 1000}s`));
      }, this._config.manifestTimeout);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeout);
        this._autoPlay(video).then(resolve).catch(reject);
      });
    });

    this._startBufferMonitor(video);
    this._setState('playing');
    this._emit('playing');
    this._handleVisibility();
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
    }, BUFFER_POLL_MS);
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
        if (!this._audioCtx || this._audioCtx.state === 'closed') {
          this._audioCtx = new AudioContext();
        }
        if (this._audioCtx.state === 'suspended') {
          this._audioCtx.resume();
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

    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }

    if (this._video) {
      this._video.src = '';
      this._video.srcObject = null;
      this._video = null;
    }

    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }

    this._listeners.clear();
    this._setState('idle');
    console.log(`[SRS-Engine] 🧹 Destruído (stream=${this._streamId})`);
  }
}
