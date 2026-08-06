import { getWhipPublishUrl } from './mediaConfig';
import { cameraService } from './cameraService';

export type PublishState = 'idle' | 'connecting' | 'publishing' | 'reconnecting' | 'failed';

export interface PublishEngineConfig {
  videoCodec?: 'H264' | 'VP8' | 'VP9';
  maxVideoBitrate?: number;
  reconnectRetries?: number;
  connectTimeout?: number;
}

const DEFAULT_CONFIG: Required<Pick<PublishEngineConfig, 'videoCodec' | 'maxVideoBitrate' | 'reconnectRetries'>> = {
  videoCodec: 'H264',
  maxVideoBitrate: 2500,
  reconnectRetries: 3,
};

// ⏱ Timeout global do fluxo completo (getUserMedia → WHIP offer → answer).
// Cada etapa tem erro próprio; este é só um teto de segurança.
// 🔧 Vários celulares entrando ao vivo AO MESMO TEMPO sobrecarregam o
// SRS/nginx: o WHIP POST e o ICE gathering demoram mais. NADA é fechado
// antes da hora — o teto global só foi AUMENTADO (30s → 60s) para dar
// tempo real ao fluxo sob carga. Sem timeout extra na captura (getUserMedia
// nunca é abortado: fechar aqui derrubaria a live de celulares lentos).
const PUBLISH_FLOW_TIMEOUT = 60000;
const ICE_GATHER_TIMEOUT = 5000;
const WHIP_HTTP_TIMEOUT = 20000;
const ICE_CONNECT_TIMEOUT = 15000;

function getUserMediaErrorMessage(err: any): string {
  const name = err?.name || '';
  const msg = err?.message || String(err);
  if (name === 'NotAllowedError') return 'Permissão de câmera/microfone negada. Habilite no navegador e tente novamente.';
  if (name === 'NotFoundError') return 'Nenhuma câmera ou microfone encontrado no dispositivo.';
  if (name === 'NotReadableError') return 'Câmera/microfone já em uso por outro aplicativo. Feche-o e tente novamente.';
  if (name === 'OverconstrainedError') return 'Câmera não suporta as configurações solicitadas.';
  if (name === 'AbortError') return 'Captura de câmera/microfone cancelada.';
  return msg;
}

export class PublishEngine {
  private _state: PublishState = 'idle';
  private _destroyed = false;
  private _pc: RTCPeerConnection | null = null;
  private _mediaStream: MediaStream | null = null;
  private _streamKey = '';
  private _config: PublishEngineConfig;
  private _listeners = new Map<string, Set<Function>>();

  constructor(config?: PublishEngineConfig) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get state(): PublishState {
    return this._state;
  }

  get pc(): RTCPeerConnection | null {
    return this._pc;
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

  async start(streamKey: string, mediaStream?: MediaStream, userId?: string): Promise<void> {
    if (this._destroyed) return;
    if (this._state === 'connecting' || this._state === 'publishing') return;

    this._streamKey = streamKey;
    this._setState('connecting');

    try {
      await this._withTimeout(
        this._startPublishFlow(mediaStream),
        PUBLISH_FLOW_TIMEOUT,
        `Tempo de publicação excedido (${PUBLISH_FLOW_TIMEOUT}ms). Verifique câmera, microfone e rede.`
      );
      this._setState('publishing');
      this._emit('connected');
      console.log('[PublishEngine] ✅ Stream publicada via WHIP');
    } catch (err) {
      this._teardown();
      this._setState('failed');
      const errMsg = err instanceof Error ? err.message : String(err);
      this._emit('error', 'PUBLISH_FAILED', errMsg);
      throw err;
    }
  }

  private async _startPublishFlow(preCapturedStream?: MediaStream): Promise<void> {
    if (typeof window === 'undefined' || !navigator.mediaDevices) {
      throw new Error('WebRTC/MediaDevices não disponível neste navegador');
    }

    // 🎥 Capturar câmera/microfone com erro claro (o SDK antigo pendurava aqui).
    // 🔧 Só reutiliza o stream do preview se tiver pelo menos 1 track VIVA.
    // Se um publish anterior falhou, o teardown parou os tracks (readyState !== 'live')
    // e o stream ficaria morto — nesse caso captura de novo.
    let stream = preCapturedStream ?? null;
    const hasLiveTracks = !!stream && stream.getTracks().some(t => t.readyState === 'live');
    if (!stream || !hasLiveTracks) {
      // 🎥 Captura SEM timeout próprio: se vários celulares estão entrando ao
      // vivo ao mesmo tempo, a câmera/prompt pode demorar — nunca abortamos
      // o getUserMedia (abortar aqui fecharia a live de celulares lentos).
      stream = await this._captureMedia();
    }
    if (this._destroyed) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('Engine destruído durante a captura de mídia');
    }
    this._mediaStream = stream;

    const pc = new RTCPeerConnection(null);
    this._pc = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    if (this._config.videoCodec) {
      this._preferVideoCodec(pc, this._config.videoCodec);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this._waitForIceGathering(pc);

    const whipUrl = getWhipPublishUrl(this._streamKey);
    console.log('[PublishEngine] 📡 URL WHIP:', whipUrl);

    const answer = await this._postOffer(whipUrl, pc.localDescription?.sdp || '');

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));

    if (this._destroyed) {
      pc.close();
      return;
    }

    await this._applyMaxVideoBitrate(pc);

    this._emit('mediaReady', stream);

    this._waitForIceConnected(pc);
  }

  private async _captureMedia(): Promise<MediaStream> {
    try {
      // 🎥 Usa o cameraService (tiered fallbacks: vídeo+áudio → vídeo separado →
      // áudio separado → mínimo). Isso evita falha de captura em celulares com
      // constraints não suportadas (NotOverconstrainedError) ou câmera ocupada.
      return await cameraService.captureStream('user');
    } catch (err: any) {
      // Fallback absoluto: captura mínima simples, sem constraints
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (fallback && fallback.getTracks().length > 0) return fallback;
      } catch { /* mantém erro original */ }
      throw new Error(getUserMediaErrorMessage(err));
    }
  }

  private _preferVideoCodec(pc: RTCPeerConnection, codec: 'H264' | 'VP8' | 'VP9') {
    try {
      const caps = (RTCRtpSender as any).getCapabilities?.('video');
      if (!caps?.codecs) return;
      const mime = `video/${codec}`;
      const preferred = caps.codecs.filter((c: any) => (c.mimeType || '').toLowerCase() === mime.toLowerCase());
      if (preferred.length === 0) return;
      const tx = pc.getTransceivers().find(t => t.sender?.track?.kind === 'video');
      if (tx && typeof tx.setCodecPreferences === 'function') {
        tx.setCodecPreferences(preferred);
      }
    } catch (e) {
      console.warn('[PublishEngine] ⚠️ Falha ao preferir codec', codec, e);
    }
  }

  private _waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise(resolve => {
      if (!pc || pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', onGather);
        resolve();
      }, ICE_GATHER_TIMEOUT);
      const onGather = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          pc.removeEventListener('icegatheringstatechange', onGather);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', onGather);
    });
  }

  private async _postOffer(whipUrl: string, sdp: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WHIP_HTTP_TIMEOUT);
    try {
      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: sdp,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok || res.status < 200 || res.status >= 300) {
        throw new Error(`WHIP rejeitou a publicação (HTTP ${res.status})${text ? ': ' + text.slice(0, 200) : ''}`);
      }
      return text;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('WHIP não respondeu a tempo (timeout de 10s). Verifique o SRS/nginx.');
      }
      if (err instanceof Error && err.message.startsWith('WHIP rejeitou')) throw err;
      throw new Error('Falha de rede ao publicar via WHIP: ' + (err?.message || String(err)));
    } finally {
      clearTimeout(timer);
    }
  }

  private async _applyMaxVideoBitrate(pc: RTCPeerConnection): Promise<void> {
    if (!this._config.maxVideoBitrate) return;
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (params.encodings && params.encodings.length > 0) {
        params.encodings[0].maxBitrate = this._config.maxVideoBitrate * 1000;
        await sender.setParameters(params);
      }
    } catch (e) {
      console.warn('[PublishEngine] ⚠️ Falha ao aplicar maxVideoBitrate:', e);
    }
  }

  private _waitForIceConnected(pc: RTCPeerConnection): void {
    const onIce = () => {
      if (this._destroyed) return;
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('[PublishEngine] 🧊 ICE conectado — transmissão ativa');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        console.warn(`[PublishEngine] ⚠️ ICE ${pc.iceConnectionState} — sessão WHIP pode estar encerrando`);
        this._emit('error', 'ICE_CLOSED', `Conexão WebRTC ${pc.iceConnectionState}. A transmissão pode ter sido encerrada.`);
      }
    };
    pc.addEventListener('iceconnectionstatechange', onIce);
    const timeout = setTimeout(() => {
      pc.removeEventListener('iceconnectionstatechange', onIce);
    }, ICE_CONNECT_TIMEOUT);
    (pc as any).__iceDiagCleanup = () => {
      clearTimeout(timeout);
      pc.removeEventListener('iceconnectionstatechange', onIce);
    };
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    const pc = this._pc;
    if (!pc) return;
    const sender = pc.getSenders().find(s => s.track?.kind === kind);
    if (!sender) return;
    if (track) {
      await sender.replaceTrack(track);
    } else {
      await sender.replaceTrack(null);
    }
  }

  async stop(): Promise<void> {
    this._teardown();
  }

  private _teardown(): void {
    if (this._pc) {
      try { (this._pc as any).__iceDiagCleanup?.(); } catch { /* ignore */ }
      try { this._pc.close(); } catch { /* ignore */ }
      this._pc = null;
    }
    if (this._mediaStream) {
      try { this._mediaStream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      this._mediaStream = null;
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._teardown();
    this._listeners.clear();
    this._state = 'idle';
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }
}
