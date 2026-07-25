import { api, callApi } from './api';

export type PublishState = 'idle' | 'connecting' | 'publishing' | 'reconnecting' | 'failed';

export interface PublishEngineConfig {
  videoCodec?: 'H264' | 'VP8' | 'VP9';
  maxVideoBitrate?: number;
  simulcast?: SimulcastLayer[];
  iceServers?: RTCIceServer[];
  reconnectRetries?: number;
}

export interface SimulcastLayer {
  rid: string;
  active: boolean;
  scaleResolutionDownBy?: number;
  maxBitrate?: number;
}

export interface PublishMetrics {
  publishStartTime: number;
  reconnectCount: number;
  avgBitrate: number;
  packetLoss: number;
  framesDropped: number;
  framesEncoded: number;
  currentLayer: string;
  iceReconnects: number;
}

const DEFAULT_CONFIG: Required<Pick<PublishEngineConfig, 'videoCodec' | 'maxVideoBitrate' | 'reconnectRetries'>> = {
  videoCodec: 'H264',
  maxVideoBitrate: 2500,
  reconnectRetries: 3,
};

const PC_CONFIG: any = {
  iceServers: [],
  bundlePolicy: 'max-bundle',
};

const RECONNECT_DELAYS = [1000, 2000, 4000];
const ICE_DISCONNECT_TIMEOUT = 3000;
const ICE_CONNECT_TIMEOUT = 15000;
const METRICS_POLL_MS = 5000;

export class PublishEngine {
  private _state: PublishState = 'idle';
  private _destroyed = false;
  private _pc: RTCPeerConnection | null = null;
  private _mediaStream: MediaStream | null = null;
  private _resourceUrl = '';
  private _streamKey = '';
  private _config: PublishEngineConfig;
  private _listeners = new Map<string, Set<Function>>();
  private _metrics: PublishMetrics = {
    publishStartTime: 0,
    reconnectCount: 0,
    avgBitrate: 0,
    packetLoss: 0,
    framesDropped: 0,
    framesEncoded: 0,
    currentLayer: 'default',
    iceReconnects: 0,
  };
  private _reconnectAttempt = 0;
  private _iceDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _metricsTimer: ReturnType<typeof setInterval> | null = null;
  private _visibilityHandler: (() => void) | null = null;

  constructor(config?: PublishEngineConfig) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get state(): PublishState {
    return this._state;
  }

  get metrics(): PublishMetrics {
    return { ...this._metrics };
  }

  on(event: string, cb: Function): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(cb);
    return () => this._listeners.get(event)?.delete(cb);
  }

  private _emit(event: string, ...args: any[]) {
    this._listeners.get(event)?.forEach(cb => cb(...args));
  }

  private _setState(next: PublishState) {
    if (this._state === next || this._destroyed) return;
    const prev = this._state;
    this._state = next;
    this._emit('stateChanged', prev, next);
  }

  async start(streamKey: string, mediaStream: MediaStream): Promise<void> {
    if (this._destroyed) return;
    if (this._state === 'connecting' || this._state === 'publishing') return;

    this._streamKey = streamKey;
    this._mediaStream = mediaStream;
    this._metrics.publishStartTime = Date.now();
    this._reconnectAttempt = 0;
    this._setState('connecting');

    try {
      await this._startPublishFlow(mediaStream);
      this._setState('publishing');
      this._emit('connected');
      console.log('✅ Stream publicada.');
    } catch (err) {
      this._cleanupPC();
      this._setState('failed');
      this._emit('error', 'PUBLISH_FAILED', String(err));
      throw err;
    }
  }

  private async _startPublishFlow(mediaStream: MediaStream): Promise<void> {
    let iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    try {
      const turnEndpoint = (await api.getIceServers() as any).turnCredentialsEndpoint;
      if (turnEndpoint) {
        const turnRes = await callApi('POST', turnEndpoint, 
          { userId: this._streamKey, streamId: this._streamKey },
          { 'Content-Type': 'application/json' }
        );
        if (turnRes?.username && turnRes?.credential && turnRes?.urls) {
          iceServers.push({
            urls: turnRes.urls,
            username: turnRes.username,
            credential: turnRes.credential,
          });
        }
      }
    } catch (e) {
      // Falha silenciosa - continua sem TURN
    }

    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all' as RTCIceTransportPolicy,
      bundlePolicy: 'max-bundle',
    } as RTCConfiguration);
    this._pc = pc;

    pc.addEventListener('iceconnectionstatechange', () => {
      this._onIceStateChange();
    });

    pc.addEventListener('connectionstatechange', () => {
      this._onConnectionStateChange();
    });

    this._addTransceivers(pc, mediaStream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (pc.iceGatheringState !== 'complete') {
      await new Promise<void>(resolve => {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(() => {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }, 2000);
      });
    }

    const finalOffer = pc.localDescription?.sdp;
    if (!finalOffer) throw new Error('SDP offer could not be generated');

    let result;
    try {
      result = await api.rtc.whip(this._streamKey, finalOffer);
    } catch (err: any) {
      throw new Error(`WHIP publish failed: ${err.message || err}`);
    }

    if (!result.ok) {
      let srsMsg = result.sdp || '';
      try {
        const parsed = JSON.parse(srsMsg);
        srsMsg = parsed.data || parsed.message || parsed.error || JSON.stringify(parsed);
      } catch { /* srsMsg is already text */ }
      throw new Error(`SRS rejeitou a publicação: ${srsMsg}`);
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });

    this._resourceUrl = result.location || '';

    this._monitorVisibility();
    this._startMetricsMonitor();

    await this._waitForIceConnected(pc);
  }

  private _addTransceivers(pc: RTCPeerConnection, stream: MediaStream): void {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const encodings = this._getSendEncodings();
      pc.addTransceiver(videoTrack, {
        direction: 'sendonly',
        sendEncodings: encodings,
      });
      this._setCodecPreferences(pc, videoTrack);
    }

    if (audioTrack) {
      pc.addTransceiver(audioTrack, {
        direction: 'sendonly',
        sendEncodings: [{}],
      });
    }
  }

  private _getSendEncodings(): RTCRtpEncodingParameters[] {
    if (this._config.simulcast && this._config.simulcast.length > 0) {
      return this._config.simulcast.map(layer => ({
        rid: layer.rid,
        active: layer.active,
        scaleResolutionDownBy: layer.scaleResolutionDownBy,
        maxBitrate: layer.maxBitrate,
      }));
    }

    const encodings: RTCRtpEncodingParameters[] = [{}];
    if (this._config.maxVideoBitrate) {
      encodings[0].maxBitrate = this._config.maxVideoBitrate * 1000;
    }
    return encodings;
  }

  private _setCodecPreferences(pc: RTCPeerConnection, track: MediaStreamTrack): void {
    const caps = RTCRtpSender.getCapabilities('video');
    if (!caps) return;

    const preferred = caps.codecs.filter(c =>
      c.mimeType.toLowerCase().includes(this._config.videoCodec!.toLowerCase())
    );
    if (!preferred.length) return;

    const transceivers = pc.getTransceivers();
    const videoTransceiver = transceivers.find(t => t.sender?.track === track);
    if (videoTransceiver && 'setCodecPreferences' in videoTransceiver) {
      videoTransceiver.setCodecPreferences(preferred);
    }
  }

  private _waitForIceConnected(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        resolve();
        return;
      }

      let settled = false;

      const onIce = () => {
        if (settled || this._destroyed) return;
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          settled = true;
          clearTimeout(timeout);
          resolve();
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`ICE ${pc.iceConnectionState}`));
        }
      };

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('ICE connection timeout'));
      }, ICE_CONNECT_TIMEOUT);

      pc.addEventListener('iceconnectionstatechange', onIce);
    });
  }

  private _onIceStateChange = () => {
    if (!this._pc || this._destroyed) return;

    switch (this._pc.iceConnectionState) {
      case 'connected':
      case 'completed':
        if (this._iceDisconnectTimer) {
          clearTimeout(this._iceDisconnectTimer);
          this._iceDisconnectTimer = null;
        }
        break;

      case 'disconnected':
        if (this._state === 'publishing' && !this._iceDisconnectTimer) {
          this._iceDisconnectTimer = setTimeout(() => {
            if (this._pc?.iceConnectionState !== 'connected') {
              this._metrics.iceReconnects++;
              this._tryReconnect();
            }
            this._iceDisconnectTimer = null;
          }, ICE_DISCONNECT_TIMEOUT);
        }
        break;

      case 'failed':
        this._metrics.iceReconnects++;
        if (this._state === 'publishing') {
          this._tryReconnect();
        }
        break;

      case 'closed':
        if (this._state === 'publishing' || this._state === 'reconnecting') {
          this._cleanupPC();
          this._setState('failed');
          this._emit('error', 'ICE_CLOSED', 'ICE connection closed unexpectedly');
        }
        break;
    }
  };

  private _onConnectionStateChange = () => {
    if (!this._pc || this._destroyed) return;
    if (this._pc.connectionState === 'failed' && this._state === 'publishing') {
      this._tryReconnect();
    }
  };

  private async _tryReconnect(): Promise<void> {
    if ((this._state !== 'publishing' && this._state !== 'reconnecting') || this._destroyed) return;

    if (this._reconnectAttempt >= (this._config.reconnectRetries ?? 3)) {
      this._setState('failed');
      this._emit('error', 'RECONNECT_EXHAUSTED', `Max reconnect attempts (${this._config.reconnectRetries})`);
      return;
    }

    this._setState('reconnecting');
    this._emit('reconnecting', this._reconnectAttempt + 1, this._config.reconnectRetries ?? 3);

    const delay = RECONNECT_DELAYS[this._reconnectAttempt] || 4000;
    this._reconnectAttempt++;

    await new Promise(r => setTimeout(r, delay));
    if (this._destroyed || (this._state !== 'reconnecting' && this._state !== 'publishing')) return;

    const stream = this._mediaStream;
    if (!stream) {
      this._setState('failed');
      return;
    }

    this._cleanupPC();

    try {
      await this._startPublishFlow(stream);
    } catch (err) {
      console.warn('[PublishEngine] Reconnect attempt failed:', err);
      if (this._destroyed || this._state !== 'reconnecting') return;
      this._tryReconnect();
      return;
    }

    this._reconnectAttempt = 0;
    this._setState('publishing');
    this._emit('connected');
  }

  private _monitorVisibility(): void {
    const handler = () => {
      if (document.hidden) {
        this._stopMetricsMonitor();
      } else {
        this._startMetricsMonitor();

        if (this._pc && this._pc.connectionState !== 'connected' && this._state === 'publishing') {
          this._tryReconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handler);
    this._visibilityHandler = () => document.removeEventListener('visibilitychange', handler);
  }

  private _startMetricsMonitor(): void {
    if (this._metricsTimer) return;

    this._metricsTimer = setInterval(async () => {
      if (!this._pc || this._state !== 'publishing') return;

      try {
        const stats = await this._pc.getStats();
        let videoFramesDropped = 0;
        let videoFramesEncoded = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        let bytesSent = 0;
        let currentLayer = 'default';

        stats.forEach(report => {
          if (report.type === 'outbound-rtp') {
            if (report.kind === 'video') {
              videoFramesDropped = report.framesDropped || 0;
              videoFramesEncoded = report.framesEncoded || 0;
              currentLayer = report.rid || 'default';
            }
            packetsSent += report.packetsSent || 0;
            bytesSent += report.bytesSent || 0;
          }
          if (report.type === 'remote-inbound-rtp') {
            packetsLost = report.packetsLost || 0;
          }
        });

        this._metrics.framesDropped = videoFramesDropped;
        this._metrics.framesEncoded = videoFramesEncoded;
        this._metrics.packetLoss = packetsSent > 0 ? packetsLost / packetsSent : 0;
        this._metrics.avgBitrate = bytesSent;
        this._metrics.currentLayer = currentLayer;
        this._metrics.reconnectCount = this._reconnectAttempt;

        this._emit('metrics', { ...this._metrics });
      } catch {
        /* getStats may fail if PC is closed */
      }
    }, METRICS_POLL_MS);
  }

  private _stopMetricsMonitor(): void {
    if (this._metricsTimer) {
      clearInterval(this._metricsTimer);
      this._metricsTimer = null;
    }
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    if (!this._pc) return;
    const sender = this._pc.getSenders().find(s => s.track?.kind === kind);
    if (!sender) return;

    if (track) {
      await sender.replaceTrack(track);
    } else {
      await sender.replaceTrack(null);
    }
  }

  async stop(): Promise<void> {
    if (this._resourceUrl) {
      try {
        await api.rtc.deleteWhip(this._resourceUrl);
      } catch (err) {
        console.warn('[PublishEngine] DELETE failed:', err);
      }
      this._resourceUrl = '';
    }
    this.destroy();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._cleanupPC();

    if (this._visibilityHandler) {
      this._visibilityHandler();
      this._visibilityHandler = null;
    }

    this._listeners.clear();
    this._mediaStream = null;
    this._state = 'idle';
  }

  private _cleanupPC(): void {
    this._stopMetricsMonitor();

    if (this._iceDisconnectTimer) {
      clearTimeout(this._iceDisconnectTimer);
      this._iceDisconnectTimer = null;
    }

    if (this._pc) {
      this._pc.removeEventListener('iceconnectionstatechange', this._onIceStateChange);
      this._pc.removeEventListener('connectionstatechange', this._onConnectionStateChange);
      this._pc.getSenders().forEach(s => {
        try { s.replaceTrack(null); } catch { /* ignore */ }
      });
      this._pc.close();
      this._pc = null;
    }

    this._resourceUrl = '';
  }
}
