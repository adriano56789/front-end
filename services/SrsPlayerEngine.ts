import Hls from 'hls.js';
import { getHlsPlayUrl } from './mediaConfig';
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
  hlsFallback?: boolean;
  reconnectRetries?: number;
}

interface WhepAttempt {
  pc: RTCPeerConnection | null;
  stream: MediaStream | null;
}

const RECONNECT_DELAYS = [1000, 2000, 4000];
const BUFFER_POLL_MS = 1000;
const STATS_POLL_MS = 2000;
const PACKET_LOSS_THRESHOLD = 0.05;
const PACKET_LOSS_SAMPLES = 10;

export class SrsPlayerEngine {
  private _state: PlayerState = 'idle';
  private _destroyed = false;
  private _connecting = false;
  private _iceRestarting = false;

  private _whepAttempt: WhepAttempt = { pc: null, stream: null };
  private _video: HTMLVideoElement | null = null;
  private _streamId = '';
  private _hls: Hls | null = null;

  private _bufferTimer: ReturnType<typeof setInterval> | null = null;
  private _statsTimer: ReturnType<typeof setInterval> | null = null;
  private _bufferPercent = 0;

  private _audioCtx: AudioContext | null = null;
  private _listeners = new Map<string, Set<Function>>();
  private _visibilityHandler: (() => void) | null = null;
  private _unlockHandler: (() => void) | null = null;
  private _signal: AbortController | null = null;

  private _config: Required<EngineConfig> = {
    autoMuteRetry: true,
    hlsFallback: true,
    reconnectRetries: 3,
  };

  constructor(config?: EngineConfig) {
    if (config) Object.assign(this._config, config);
  }

  get state(): PlayerState { return this._state; }
  get bufferPercent(): number { return this._bufferPercent; }

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

  async start(streamId: string, video: HTMLVideoElement): Promise<void> {
    if (this._destroyed) return;
    if (this._connecting) return;
    this._connecting = true;
    this._streamId = streamId;
    this._video = video;

    this._setState('loading');

    try {
      await this._startWhep();
    } catch (err) {
      if (this._destroyed) return;

      if (this._config.hlsFallback) {
        try {
          await this._startHls();
          return;
        } catch {
          this._setState('error');
          this._emit('error', 'PLAYBACK_FAILED', 'WHEP and HLS both failed');
          return;
        }
      }

      this._setState('error');
      this._emit('error', 'WHEP_FAILED', String(err));
    } finally {
      this._connecting = false;
    }
  }

  private async _startWhep(): Promise<void> {
    this._signal = new AbortController();

    const result = await WhepClient.connect(this._streamId, this._signal.signal);
    this._whepAttempt = result;

    const { pc, stream } = result;

    pc.addEventListener('iceconnectionstatechange', () => this._onIceStateChange(pc));
    pc.addEventListener('connectionstatechange', () => this._onConnectionStateChange(pc));

    if (this._destroyed) {
      this._cleanupPc();
      return;
    }

    await this._attachStream(stream);
    this._startMonitors(pc, this._video!);
    this._handleVisibility();
    this._unlockAudio();
  }

  private async _attachStream(stream: MediaStream): Promise<void> {
    const video = this._video;
    if (!video || this._destroyed) return;

    video.srcObject = stream;
    await this._autoPlay(video);
    this._setState('playing');
    this._emit('playing');
  }

  private async _startHls(): Promise<void> {
    const video = this._video;
    if (!video || this._destroyed) throw new Error('No video element');

    const hlsUrl = getHlsPlayUrl(this._streamId);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('HLS native timeout')), 12000);
        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          this._autoPlay(video).then(resolve).catch(reject);
        }, { once: true });
        video.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('HLS native error'));
        }, { once: true });
      });
      this._setState('playing');
      this._emit('playing');
      return;
    }

    if (!Hls.isSupported()) throw new Error('HLS not supported');

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    this._hls = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('HLS manifest timeout')), 12000);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeout);
        this._autoPlay(video).then(resolve).catch(reject);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            clearTimeout(timeout);
            reject(new Error('HLS fatal error'));
          }
        }
      });
    });

    this._setState('playing');
    this._emit('playing');
    this._handleVisibility();
  }

  private async _autoPlay(video: HTMLVideoElement): Promise<void> {
    try {
      await video.play();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' && this._config.autoMuteRetry) {
        video.muted = true;
        try {
          await video.play();
          this._emit('autoplayMuted');
          return;
        } catch {}
      }
      throw err;
    }
  }

  private _startMonitors(pc: RTCPeerConnection, video: HTMLVideoElement): void {
    this._startBufferMonitor(video);
    this._startStatsMonitor(pc);
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
      } catch {}
    }, BUFFER_POLL_MS);
  }

  private _stopBufferMonitor(): void {
    if (this._bufferTimer) { clearInterval(this._bufferTimer); this._bufferTimer = null; }
  }

  private _startStatsMonitor(pc: RTCPeerConnection): void {
    this._stopStatsMonitor();
    const lossHistory: number[] = [];
    this._statsTimer = setInterval(async () => {
      if (this._destroyed) { this._stopStatsMonitor(); return; }
      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let rtt: number | null = null;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || null;
          }
        });

        if (packetsReceived + packetsLost > 0) {
          const loss = packetsLost / (packetsReceived + packetsLost);
          lossHistory.push(loss);
          if (lossHistory.length > PACKET_LOSS_SAMPLES) lossHistory.shift();

          const avgLoss = lossHistory.reduce((a, b) => a + b, 0) / lossHistory.length;
          if (avgLoss > PACKET_LOSS_THRESHOLD) {
            this._emit('networkSlow', avgLoss);
          }
        }

        this._emit('stats', { rtt, packetsLost, packetsReceived });
      } catch {}
    }, STATS_POLL_MS);
  }

  private _stopStatsMonitor(): void {
    if (this._statsTimer) { clearInterval(this._statsTimer); this._statsTimer = null; }
  }

  private _onIceStateChange(pc: RTCPeerConnection): void {
    if (this._destroyed) return;
    const state = pc.iceConnectionState;
    if (state === 'disconnected' || state === 'failed') {
      if (this._state === 'playing') {
        this._setState('stalled');
        this._reconnect();
      }
    }
  }

  private _onConnectionStateChange(pc: RTCPeerConnection): void {
    if (this._destroyed) return;
    const state = pc.connectionState;
    if (state === 'failed' || state === 'disconnected') {
      if (this._state === 'playing') {
        this._setState('stalled');
        this._reconnect();
      }
    }
  }

  private _reconnect(): void {
    if (this._destroyed || this._iceRestarting || this._connecting) return;
    this._iceRestarting = true;

    const attemptReconnect = async (retriesLeft: number) => {
      if (this._destroyed) return;
      this._emit('reconnecting', this._config.reconnectRetries - retriesLeft);

      this._cleanupPc();

      try {
        this._signal = new AbortController();
        const result = await WhepClient.connect(this._streamId, this._signal.signal);
        this._whepAttempt = result;

        const { pc, stream } = result;
        pc.addEventListener('iceconnectionstatechange', () => this._onIceStateChange(pc));
        pc.addEventListener('connectionstatechange', () => this._onConnectionStateChange(pc));

        await this._attachStream(stream);
        this._startMonitors(pc, this._video!);
        this._iceRestarting = false;
      } catch {
        if (this._destroyed) return;
        if (retriesLeft > 0) {
          const delay = RECONNECT_DELAYS[RECONNECT_DELAYS.length - retriesLeft] || RECONNECT_DELAYS[0];
          await new Promise(r => setTimeout(r, delay));
          return attemptReconnect(retriesLeft - 1);
        }

        if (this._config.hlsFallback) {
          try {
            await this._startHls();
            this._iceRestarting = false;
            return;
          } catch {}
        }

        this._setState('error');
        this._emit('error', 'RECONNECT_FAILED', 'All reconnect attempts exhausted');
        this._iceRestarting = false;
      }
    };

    attemptReconnect(this._config.reconnectRetries);
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
      } catch {}
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

  private _cleanupPc(): void {
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
    this._iceRestarting = false;

    this._signal?.abort();
    this._stopBufferMonitor();
    this._stopStatsMonitor();
    this._removeVisibilityHandler();
    this._removeAudioUnlock();

    this._cleanupPc();

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
  }
}
