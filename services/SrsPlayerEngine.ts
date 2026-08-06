import { WhepClient } from './WhepClient';

export type PlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'error';

interface EngineConfig {
  autoMuteRetry?: boolean;
  /** Se o usuário silenciou explicitamente, o player NÃO desfaz o mute
      automaticamente no próximo toque/clique. */
  userMuted?: boolean;
}

interface WhepAttempt {
  pc: RTCPeerConnection | null;
  stream: MediaStream | null;
}

export class SrsPlayerEngine {
  private _state: PlayerState = 'idle';
  private _destroyed = false;
  private _connecting = false;

  private _whepAttempt: WhepAttempt = { pc: null, stream: null };
  private _video: HTMLVideoElement | null = null;
  private _streamId = '';

  private _listeners = new Map<string, Set<Function>>();
  private _visibilityHandler: (() => void) | null = null;
  private _unlockHandler: (() => void) | null = null;
  private _signal: AbortController | null = null;
  private _autoMuted = false;

  private _config: Required<EngineConfig> = {
    autoMuteRetry: true,
    userMuted: false,
  };

  constructor(config?: EngineConfig) {
    if (config) Object.assign(this._config, config);
  }

  get state(): PlayerState { return this._state; }

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
    this._emit('stateChanged', prev, next);
  }

  /**
   * Fluxo de play WHEP oficial do SRS (srs.sdk.js play()):
   * negocia o SDP via POST, aceita 201, faz setRemoteDescription e pronto —
   * as tracks chegam via ontrack quando o publisher estiver ativo.
   * Sem timeout artificial, sem HLS, sem lógica de falha.
   */
  async start(streamId: string, video: HTMLVideoElement): Promise<void> {
    if (this._destroyed) return;
    if (this._connecting) return;
    this._connecting = true;
    this._streamId = streamId;
    this._video = video;

    this._setState('loading');

    this._signal = new AbortController();
    const startedAt = Date.now();

    try {
      const result = await WhepClient.connect(this._streamId, this._signal.signal);
      if (this._destroyed) {
        result.pc.close();
        result.stream.getTracks().forEach(t => t.stop());
        return;
      }

      console.log(`[SRS-Engine] 🧊 WHEP handshake OK em ${Date.now() - startedAt}ms (stream=${this._streamId})`);

      this._whepAttempt = result;
      await this._attachStream(result.stream);
      this._handleVisibility();
      this._unlockAudio();
      this._connecting = false;
    } catch (err: any) {
      if (this._destroyed) return;
      const errMsg = err?.message || err?.toString() || 'Unknown error';
      console.warn('[SRS-Engine] Falha ao conectar WHEP:', errMsg);
      this._connecting = false;
      this._setState('error');
      this._emit('error', 'PLAYBACK_FAILED', errMsg);
    }
  }

  private async _attachStream(stream: MediaStream): Promise<void> {
    const video = this._video;
    if (!video || this._destroyed) return;

    video.srcObject = stream;
    await this._autoPlay(video);
    console.log('✅ Player conectado.');
    console.log('✅ Reprodução iniciada.');
    this._setState('playing');
    this._emit('playing');
  }

  private async _autoPlay(video: HTMLVideoElement): Promise<void> {
    try {
      await video.play();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' && this._config.autoMuteRetry) {
        // 🔇 Autoplay bloqueado sem gesto do usuário: reproduz silenciado e
        // marca para DESFAZER o mute no primeiro toque/clique (_unlockAudio).
        video.muted = true;
        this._autoMuted = true;
        try {
          await video.play();
          this._emit('autoplayMuted');
          return;
        } catch {}
      }
      throw err;
    }
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
      if (this._destroyed) return;
      // 🔊 Se o autoplay silenciou o player (por bloqueio de autoplay), o
      // PRIMEIRO toque/clique do usuário desfaz o mute e retoma o áudio da
      // live — isso só acontece se o usuário NÃO tiver silenciado manualmente.
      if (this._autoMuted && !this._config.userMuted) {
        this._autoMuted = false;
        const video = this._video;
        if (video && video.muted) {
          video.muted = false;
          this._autoPlay(video).catch(() => {});
        }
      }
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

    this._signal?.abort();
    this._removeVisibilityHandler();
    this._removeAudioUnlock();

    const { pc, stream } = this._whepAttempt;
    if (pc) {
      try {
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.ontrack = null;
        pc.onicecandidate = null;
        if (pc.connectionState !== 'closed') pc.close();
      } catch {}
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    this._whepAttempt = { pc: null, stream: null };

    if (this._video) {
      this._video.src = '';
      this._video.srcObject = null;
      this._video = null;
    }

    this._listeners.clear();
    this._setState('idle');
  }
}
