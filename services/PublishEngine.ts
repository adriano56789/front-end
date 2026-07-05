import { getWhipEndpointUrl } from './mediaConfig';
import { api } from './api';

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
  sdpSemantics: 'unified-plan',
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
    console.log('📡 [WebRTC-WHIP] Iniciando fluxo de publicação WebRTC...');
    console.log('📡 [WebRTC-WHIP] Buscando servidores STUN/TURN atualizados do backend...');
    
    let iceServers: RTCIceServer[] = [];

    try {
      const response = await api.getIceServers();
      const respAny = response as any;
      if (response && Array.isArray(response.iceServers)) {
        iceServers = response.iceServers;
      } else if (response && Array.isArray(response)) {
        iceServers = response;
      } else if (respAny && respAny.result && Array.isArray(respAny.result.iceServers)) {
        iceServers = respAny.result.iceServers;
      }
    } catch (e) {
      console.warn('⚠️ [WebRTC-WHIP] Falha ao carregar servidores ICE:', e);
    }

    const config: any = {
      iceServers,
      sdpSemantics: 'unified-plan',
      bundlePolicy: 'max-bundle',
    };

    console.log('📡 [WebRTC-WHIP] Criando instância de RTCPeerConnection...');
    console.log('📡 [WebRTC-WHIP] Configuração dos servidores ICE:', JSON.stringify(config.iceServers));

    const pc = new RTCPeerConnection(config);
    this._pc = pc;

    console.log(`📡 [WebRTC-WHIP] Estado inicial da sinalização (signalingState): ${pc.signalingState}`);
    console.log(`📡 [WebRTC-WHIP] Estado inicial da conexão ICE (iceConnectionState): ${pc.iceConnectionState}`);
    console.log(`📡 [WebRTC-WHIP] Estado inicial da conexão (connectionState): ${pc.connectionState}`);
    console.log(`📡 [WebRTC-WHIP] Estado inicial da coleta de ICE (iceGatheringState): ${pc.iceGatheringState}`);

    // Monitor Peer Connection events
    pc.addEventListener('signalingstatechange', () => {
      console.log(`📡 [WebRTC-WHIP] signalingState mudou: ${pc.signalingState}`);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      console.log(`📡 [WebRTC-WHIP] iceConnectionState mudou: ${pc.iceConnectionState}`);
      this._onIceStateChange();
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log(`📡 [WebRTC-WHIP] connectionState mudou: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log('✅ [WebRTC-WHIP] Conexão estabelecida com sucesso! SRS conectado.');
      }
      this._onConnectionStateChange();
    });

    pc.addEventListener('icegatheringstatechange', () => {
      console.log(`📡 [WebRTC-WHIP] iceGatheringState mudou: ${pc.iceGatheringState}`);
    });

    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        const candStr = event.candidate.candidate;
        let type = 'unknown';
        if (candStr.includes('typ host')) type = 'host';
        else if (candStr.includes('typ srflx')) type = 'srflx';
        else if (candStr.includes('typ relay')) type = 'relay';

        console.log(`📡 [WebRTC-WHIP] ICE Candidate gerado: tipo=${type}, candidate=${candStr}`);

        if (type === 'relay') {
          console.log('⚠️ [WebRTC-WHIP] Candidato TURN (relay) detectado! Fallback para TURN disponível.');
        }
      } else {
        console.log('📡 [WebRTC-WHIP] Coleta de ICE candidates finalizada (null candidate).');
      }
    });

    if ('onicecandidateerror' in pc) {
      (pc as any).onicecandidateerror = (event: any) => {
        console.error('❌ [WebRTC-WHIP] Erro de ICE Candidate:', event.errorCode, event.errorText, 'URL:', event.url);
      };
    }

    console.log('📡 [WebRTC-WHIP] Adicionando mídias capturadas ao RTCPeerConnection...');
    mediaStream.getTracks().forEach(track => {
      console.log(`📡 [WebRTC-WHIP] Adicionando track: kind=${track.kind}, label=${track.label}, enabled=${track.enabled}`);
    });

    this._addTransceivers(pc, mediaStream);

    console.log('📡 [WebRTC-WHIP] Criando SDP offer...');
    const offer = await pc.createOffer();
    console.log('📡 [WebRTC-WHIP] Configurando local description (offer SDP)...');
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete or at least gather some candidates before sending offer!
    if (pc.iceGatheringState !== 'complete') {
      console.log('📡 [WebRTC-WHIP] Aguardando a conclusão da coleta de ICE...');
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
        }, 2000); // 2 seconds timeout fallback
      });
    }

    const finalOffer = pc.localDescription?.sdp;
    if (!finalOffer) throw new Error('SDP offer could not be generated');

    console.log(`📡 [WebRTC-WHIP] Enviando requisição HTTP POST (WHIP Publish) para o SRS...`);
    console.log(`📡 [WebRTC-WHIP] Endpoint de publicação: /api/rtc/v1/whip/?app=live&stream=${this._streamKey}`);
    console.log(`📡 [WebRTC-WHIP] Offer SDP enviada:\n`, finalOffer);

    let result;
    try {
      result = await api.rtc.whip(this._streamKey, finalOffer);
      console.log(`✅ [WebRTC-WHIP] Resposta HTTP recebida com sucesso! Status: 201 Created`);
      console.log(`📡 [WebRTC-WHIP] Answer SDP recebida:\n`, result.sdp);
    } catch (err: any) {
      console.error(`❌ [WebRTC-WHIP] Falha na requisição HTTP de sinalização para /rtc/v1/publish:`, err);
      throw err;
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });
    console.log(`📡 [WebRTC-WHIP] setRemoteDescription concluído. signalingState atual: ${pc.signalingState}`);

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
        console.log('✅ [WebRTC-WHIP] Confirmação de publicação iniciada. Stream ativo!');
        resolve();
        return;
      }

      let settled = false;

      const onIce = () => {
        if (settled || this._destroyed) return;
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          settled = true;
          clearTimeout(timeout);
          console.log('✅ [WebRTC-WHIP] Confirmação de publicação iniciada. Stream ativo!');
          resolve();
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          settled = true;
          clearTimeout(timeout);
          console.error(`❌ [WebRTC-WHIP] Conexão ICE falhou: estado=${pc.iceConnectionState}`);
          reject(new Error(`ICE ${pc.iceConnectionState}`));
        }
      };

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.error(`❌ [WebRTC-WHIP] Tempo limite de conexão ICE excedido.`);
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

        let usingTurn = false;
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
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const localCand = stats.get(report.localCandidateId);
            if (localCand && localCand.candidateType === 'relay') {
              usingTurn = true;
            }
          }
        });

        if (usingTurn) {
          console.log('⚠️ [WebRTC-WHIP] Canal ativo utilizando fallback TURN (relay) para contornar restrições de rede.');
        } else {
          console.log('📡 [WebRTC-WHIP] Canal ativo utilizando conexão direta (STUN / host).');
        }

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
