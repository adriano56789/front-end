import { WhepClient } from './WhepClient';

export type WebRTCState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

type StateListener = (state: WebRTCState) => void;

interface WebRTCStats {
  rtt: number | null;
  packetsLost: number | null;
  bytesSent: number | null;
  bitrate: number | null;
  resolution: { width: number; height: number } | null;
  frameRate: number | null;
}

type StatsListener = (stats: WebRTCStats) => void;

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private state: WebRTCState = 'idle';
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private currentStreamUrl: string | null = null;
  private listeners: StateListener[] = [];
  private statsListeners: StatsListener[] = [];
  private retryCount = 0;
  private maxRetries = 3;
  private lastBytesSent = 0;
  private lastStatsTime = 0;

  // Signaling WebSocket (SRS nativo, sem HTTP)
  private signalingWs: WebSocket | null = null;
  private tidCounter = 0;
  private pendingRequests = new Map<string, {
    resolve: (msg: any) => void;
    reject: (err: any) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private currentRoom: string | null = null;
  private currentDisplay: string | null = null;
  public currentFacingMode: 'user' | 'environment' = 'user';

  constructor() { }

  onStateChange(cb: StateListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  onStats(cb: StatsListener): () => void {
    this.statsListeners.push(cb);
    return () => {
      this.statsListeners = this.statsListeners.filter(l => l !== cb);
    };
  }

  getState(): WebRTCState {
    return this.state;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getCurrentStreamUrl(): string | null {
    return this.currentStreamUrl;
  }

  private setState(next: WebRTCState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach(l => l(next));
  }

  private nextTid(): string {
    return String(++this.tidCounter);
  }

  private extractStreamKey(streamUrl: string): string {
    return streamUrl.split('/').pop() || streamUrl;
  }

  private async connectSignaling(): Promise<void> {
    if (this.signalingWs?.readyState === WebSocket.OPEN) return;

    return new Promise((resolve, reject) => {
      this.signalingWs?.close();

      const ws = new WebSocket('wss://livego.store/sig/v1/rtc');
      this.signalingWs = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Signaling connection failed'));
      ws.onclose = () => {
        this.pendingRequests.forEach(p => { clearTimeout(p.timer); p.reject(new Error('Signaling closed')); });
        this.pendingRequests.clear();
      };
      ws.onmessage = (event) => this.handleSignalingMessage(event);
    });
  }

  private handleSignalingMessage(event: MessageEvent): void {
    try {
      const parsed = JSON.parse(event.data);
      const msg = parsed.msg || parsed;
      const tid = parsed.tid;

      if (tid && this.pendingRequests.has(tid)) {
        const { resolve, reject, timer } = this.pendingRequests.get(tid)!;
        clearTimeout(timer);
        this.pendingRequests.delete(tid);
        if (msg.code === 0) resolve(msg);
        else reject(new Error(msg.data || `Signaling error: ${JSON.stringify(msg)}`));
      }
    } catch { }
  }

  private sendRequest(tid: string, body: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(tid);
        reject(new Error('Signaling timeout'));
      }, 20000);

      this.pendingRequests.set(tid, { resolve, reject, timer });

      if (this.signalingWs?.readyState === WebSocket.OPEN) {
        this.signalingWs.send(JSON.stringify({ tid, msg: body }));
      } else {
        clearTimeout(timer);
        this.pendingRequests.delete(tid);
        reject(new Error('Signaling not connected'));
      }
    });
  }

  private formatSDP(sdp: string): string {
    const lines = sdp.replace(/\r\n/g, '\n').split('\n');
    const newLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      if (trimmed.includes('extmap-allow-mixed')) continue;
      if (trimmed.includes('transport-cc')) continue;
      if (trimmed.includes('goog-remb')) continue;

      newLines.push(trimmed);
    }

    return newLines.join('\r\n') + '\r\n';
  }

  async startPublish(streamUrl: string, retries = this.maxRetries): Promise<MediaStream> {
    this.currentStreamUrl = streamUrl;
    this.retryCount = this.maxRetries - retries;
    this.setState('connecting');
    console.log(`[WebRTC-WS] Publishing to ${streamUrl} via signaling (retries: ${retries})`);

    try {
      if (!this.localStream) {
        try {
          // Tentar obter stream ativo do mapa global de streams ativos para evitar re-capturar hardware e economizar recursos
          let sharedStream: MediaStream | null = null;
          if (typeof window !== 'undefined' && (window as any).__activeStreamsMap) {
            const keys = Object.keys((window as any).__activeStreamsMap);
            if (keys.length > 0) {
              sharedStream = (window as any).__activeStreamsMap[keys[0]];
            }
          }

          if (sharedStream && sharedStream.active && sharedStream.getVideoTracks().length > 0) {
            console.log('[WebRTC-WS] Reutilizando stream ativa globalmente compartilhada');
            this.localStream = sharedStream;
          } else {
            console.log('[WebRTC-WS] Capturando stream real via cameraService...');
            const { cameraService } = await import('./cameraService');
            this.localStream = await cameraService.captureStream(this.currentFacingMode);
          }
        } catch (e) {
          console.error('[WebRTC-WS] Media capture failed', e);
          throw new Error('Media capture failed');
        }
      }

      const streamKey = this.extractStreamKey(streamUrl);
      const display = `publisher_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      await this.connectSignaling();

      const joinTid = this.nextTid();
      const joinRes = await this.sendRequest(joinTid, { action: 'join', room: streamKey, display });
      if (joinRes.code !== 0) throw new Error('Join room failed');

      this.currentRoom = streamKey;
      this.currentDisplay = display;

      this.cleanupPeerConnection();

      const config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        iceTransportPolicy: 'relay' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      } as RTCConfiguration;

      this.pc = new RTCPeerConnection(config);

      this.pc.oniceconnectionstatechange = () => {
        const iceState = this.pc?.iceConnectionState;
        if (iceState === 'disconnected' || iceState === 'failed') {
          this.stopStatsMonitoring();
          if (this.retryCount < this.maxRetries) {
            this.setState('reconnecting');
            this.handleReconnect();
          } else {
            this.setState('failed');
          }
        }
      };

      this.localStream.getTracks().forEach(track => {
        if (this.pc && this.localStream) this.pc.addTrack(track, this.localStream);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      if (this.pc.iceGatheringState !== 'complete') {
        await new Promise<void>(resolve => {
          const check = () => {
            if (this.pc?.iceGatheringState === 'complete') {
              this.pc!.removeEventListener('icegatheringstatechange', check);
              resolve();
            }
          };
          this.pc?.addEventListener('icegatheringstatechange', check);
          setTimeout(resolve, 2000);
        });
      }

      const finalOffer = this.pc.localDescription?.sdp;
      if (!finalOffer) throw new Error('Failed to generate SDP offer');

      const pubTid = this.nextTid();
      const pubRes = await this.sendRequest(pubTid, {
        action: 'publish', room: streamKey, display, sdp: finalOffer,
      });

      if (pubRes.code === 0 && pubRes.sdp) {
        if (!this.pc) throw new Error('Connection closed during negotiation');
        if (this.pc.signalingState === 'stable') return this.localStream;

        const formattedSdp = this.formatSDP(pubRes.sdp);
        await this.pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: formattedSdp,
        }));

        this.pc.onicecandidate = (event) => {
          if (event.candidate && this.signalingWs?.readyState === WebSocket.OPEN) {
            this.signalingWs.send(JSON.stringify({
              tid: this.nextTid(),
              msg: { action: 'control', room: streamKey, display, candidate: event.candidate.candidate },
            }));
          }
        };

        this.setState('connected');
        this.startStatsMonitoring();
        this.setupICELogging();
        console.log('✅ [WebRTC-WS-Publish] Confirmação de publicação iniciada. Stream ativo!');
      } else {
        throw new Error('SRS Publish failed');
      }

      return this.localStream;
    } catch (error) {
      console.error('[WebRTC-WS] Publish error:', error);
      if (retries > 0) {
        const backoff = Math.min(1000 * Math.pow(2, this.maxRetries - retries), 10000);
        await new Promise(r => setTimeout(r, backoff));
        return this.startPublish(streamUrl, retries - 1);
      }
      this.setState('failed');
      this.stop();
      throw error;
    }
  }

  async startPlay(streamUrl: string, retries = this.maxRetries): Promise<MediaStream> {
    this.currentStreamUrl = streamUrl;
    this.retryCount = this.maxRetries - retries;
    this.setState('connecting');

    console.log('[WebRTC-WS-Play] Iniciando reproducao WebRTC via WS...');

    try {
      const streamKey = this.extractStreamKey(streamUrl);
      const display = `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      await this.connectSignaling();

      const joinTid = this.nextTid();
      const joinRes = await this.sendRequest(joinTid, { action: 'join', room: streamKey, display });
      if (joinRes.code !== 0) throw new Error('Join room failed');

      this.currentRoom = streamKey;
      this.currentDisplay = display;

      this.cleanupPeerConnection();

      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        iceTransportPolicy: 'relay' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle',
      } as RTCConfiguration);

      this.pc.oniceconnectionstatechange = () => {};

      this.pc.addTransceiver('audio', { direction: 'recvonly' });
      this.pc.addTransceiver('video', { direction: 'recvonly' });

      this.remoteStream = new MediaStream();
      this.pc.ontrack = (event) => {
        if (this.remoteStream) {
          this.remoteStream.addTrack(event.track);
        }
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      if (this.pc.iceGatheringState !== 'complete') {
        await new Promise<void>(resolve => {
          const check = () => {
            if (this.pc?.iceGatheringState === 'complete') resolve();
          };
          this.pc?.addEventListener('icegatheringstatechange', check);
          setTimeout(resolve, 2000);
        });
      }

      const finalOffer = this.pc.localDescription?.sdp;
      if (!finalOffer) throw new Error('Failed to generate SDP offer');

      const playTid = this.nextTid();
      const playRes = await this.sendRequest(playTid, {
        action: 'play', room: streamKey, display, sdp: finalOffer,
      });

      if (playRes.code === 0 && playRes.sdp) {
        if (!this.pc) throw new Error('Connection closed during negotiation');
        if (this.pc.signalingState === 'stable') return this.remoteStream!;

        const formattedSdp = this.formatSDP(playRes.sdp);
        await this.pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: formattedSdp,
        }));

        this.pc.onicecandidate = (event) => {
          if (event.candidate && this.signalingWs?.readyState === WebSocket.OPEN) {
            this.signalingWs.send(JSON.stringify({
              tid: this.nextTid(),
              msg: { action: 'control', room: streamKey, display, candidate: event.candidate.candidate },
            }));
          }
        };

        this.setState('connected');
        this.startStatsMonitoring();
        this.setupICELogging();
        console.log('✅ [WebRTC-WS-Play] Player conectado e recebendo mídia!');
      } else {
        throw new Error('SRS Playback failed');
      }

      return this.remoteStream!;
    } catch (error) {
      console.error('[WebRTC-WS] Playback error:', error);
      if (retries > 0) {
        const backoff = Math.min(1000 * Math.pow(2, this.maxRetries - retries), 10000);
        await new Promise(r => setTimeout(r, backoff));
        return this.startPlay(streamUrl, retries - 1);
      }
      this.setState('failed');
      this.stop();
      throw error;
    }
  }

  private handleReconnect(): void {
    if (!this.currentStreamUrl) return;
    const backoff = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
    console.log(`[WebRTC-WS] Reconnecting in ${backoff}ms (attempt ${this.retryCount + 1})`);
    this.retryCount++;

    setTimeout(async () => {
      try {
        this.signalingWs?.close();
        this.signalingWs = null;
        if (this.currentStreamUrl) {
          await this.startPublish(this.currentStreamUrl, this.maxRetries - this.retryCount);
        }
      } catch {
        this.setState('failed');
      }
    }, backoff);
  }

  private setupICELogging(): void {
    if (!this.pc) return;
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log(`[WebRTC-WS] Connection State: ${state}`);
      if (state === 'failed' || state === 'closed') {
        this.stopStatsMonitoring();
      }
    };
  }

  private startStatsMonitoring(): void {
    this.stopStatsMonitoring();
    this.lastBytesSent = 0;
    this.lastStatsTime = Date.now();

    this.statsInterval = setInterval(async () => {
      if (this.pc && this.state === 'connected') {
        try {
          const stats = await this.pc.getStats();
          const now = Date.now();
          const elapsed = (now - this.lastStatsTime) / 1000;

          let packetsLost = 0;
          let bytesSent = 0;
          let currentRtt: number | null = null;
          let width: number | null = null;
          let height: number | null = null;
          let frameRate: number | null = null;

          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              packetsLost += report.packetsLost || 0;
              bytesSent = report.bytesSent || 0;
              frameRate = report.framesPerSecond || null;
              width = report.frameWidth || null;
              height = report.frameHeight || null;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              currentRtt = report.currentRoundTripTime || null;
            }
          });

          const deltaBytes = bytesSent - this.lastBytesSent;
          const bitrate = elapsed > 0 ? (deltaBytes * 8) / elapsed : 0;

          this.statsListeners.forEach(l => l({
            rtt: currentRtt,
            packetsLost,
            bytesSent,
            bitrate: bitrate > 0 ? bitrate : null,
            resolution: width && height ? { width, height } : null,
            frameRate,
          }));

          this.lastBytesSent = bytesSent;
          this.lastStatsTime = now;
        } catch {
          // stats unavailable
        }
      }
    }, 5000);
  }

  private stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.lastBytesSent = 0;
    this.lastStatsTime = 0;
  }

  private cleanupPeerConnection(): void {
    if (this.pc) {
      try {
        this.pc.oniceconnectionstatechange = null;
        this.pc.onconnectionstatechange = null;
        this.pc.ontrack = null;
        if (this.pc.connectionState !== 'closed') {
          this.pc.close();
        }
      } catch {
        // ignore
      }
      this.pc = null;
    }
  }

  async startWhepPlay(streamKey: string, signal?: AbortSignal): Promise<MediaStream> {
    const result = await WhepClient.connect(streamKey, signal);
    return result.stream;
  }

  async stop(): Promise<void> {
    this.stopStatsMonitoring();
    this.setState('idle');

    if (this.signalingWs?.readyState === WebSocket.OPEN && this.currentRoom && this.currentDisplay) {
      try {
        this.signalingWs.send(JSON.stringify({
          tid: this.nextTid(),
          msg: { action: 'leave', room: this.currentRoom, display: this.currentDisplay },
        }));
      } catch { }
    }

    this.signalingWs?.close();
    this.signalingWs = null;
    this.pendingRequests.forEach(p => { clearTimeout(p.timer); p.reject(new Error('Stopped')); });
    this.pendingRequests.clear();

    this.currentStreamUrl = null;
    this.currentRoom = null;
    this.currentDisplay = null;
    this.retryCount = 0;

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    this.cleanupPeerConnection();
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    if (!this.pc) return;
    const sender = this.pc.getSenders().find(s => s.track?.kind === kind);
    if (sender) {
      await sender.replaceTrack(track);
    }
    if (this.localStream && track) {
      const oldTracks = kind === 'video' ? this.localStream.getVideoTracks() : this.localStream.getAudioTracks();
      oldTracks.forEach(t => {
        t.stop();
        this.localStream?.removeTrack(t);
      });
      this.localStream.addTrack(track);
    }
  }
}

export const webrtcService = new WebRTCService();
