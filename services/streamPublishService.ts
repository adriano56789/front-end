import { cameraService, getVideoConstraints } from './cameraService';
import { videoProcessor } from './VideoProcessor';

type PublishEngineType = {
  replaceTrack: (kind: 'audio' | 'video', track: MediaStreamTrack | null) => Promise<void>;
  stop?: () => void | Promise<void>;
};

export type PublishStateT = 'idle' | 'connecting' | 'publishing' | 'connected' | 'native';

class StreamPublishService {
  private currentFacingMode: 'user' | 'environment' = 'user';
  private currentStream: MediaStream | null = null;
  private currentVideoRef: { current: HTMLVideoElement | null } | null = null;
  private beautyProcessedStream: MediaStream | null = null;
  private _publishing = false;
  private _publishEngine: PublishEngineType | null = null;

  setPublishEngine(engine: PublishEngineType | null): void {
    this._publishEngine = engine;
  }

  getPublishEngine(): PublishEngineType | null {
    return this._publishEngine;
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  setCurrentStream(stream: MediaStream | null): void {
    this.currentStream = stream;
  }

  setBeautyProcessedStream(stream: MediaStream | null): void {
    this.beautyProcessedStream = stream;
  }

  getBeautyProcessedStream(): MediaStream | null {
    return this.beautyProcessedStream;
  }

  applyBeautyToStream(mediaStream: MediaStream): MediaStream {
    const processed = this.beautyProcessedStream;
    if (!processed) return mediaStream;

    const processedVideoTracks = processed.getVideoTracks();
    if (processedVideoTracks.length === 0) return mediaStream;

    // ⚠️ NÃO chamar track.stop() aqui: a track original da câmera é a MESMA que
    // alimenta o vídeo dedicado de processamento (VideoProcessor.getVideoStream).
    // Pará-la congelava o canvas WebGL → transmissão com tela preta/imagem parada.
    // Só removemos do stream de publicação; a track continua viva p/ o processador.
    mediaStream.getVideoTracks().forEach(track => {
      mediaStream.removeTrack(track);
    });

    processedVideoTracks.forEach(track => {
      mediaStream.addTrack(track);
    });

    return mediaStream;
  }

  // 🎥 Exibe o stream PROCESSADO no elemento de preview (videoRef). Assim o
  // usuário vê o efeito JÁ NA ABERTURA da câmera (não só na transmissão).
  // O VideoProcessor usa um vídeo dedicado (processingVideoElement) alimentado
  // pela track ORIGINAL, então exibir o canvas aqui não cria feedback loop.
  applyBeautyToPreview(): void {
    const processed = this.beautyProcessedStream;
    const video = this.currentVideoRef?.current;
    if (!processed || !video) return;
    const procTracks = processed.getVideoTracks();
    if (procTracks.length === 0) return;
    if (video.srcObject !== processed) {
      video.srcObject = processed;
      video.play().catch(() => {});
    }
  }

  async updateBeautyTrack(): Promise<void> {
    const processed = this.beautyProcessedStream;
    if (!processed || !this.currentStream) return;

    const processedVideoTracks = processed.getVideoTracks();
    if (processedVideoTracks.length === 0) return;

    const newVideoTrack = processedVideoTracks[0];

    // 🔧 NÃO parar a track original da câmera nem trocar o srcObject do preview:
    // a track original alimenta o vídeo dedicado de processamento (VideoProcessor)
    // e o preview local. Parar/remover essa track cortava o feed do processamento e
    // deixava a tela PRETA ao abrir o painel de embelezamento. O SRS recebe a stream
    // processada via replaceTrack; o preview continua exibindo a câmera normalmente
    // (com filtros CSS aplicados pelo painel).
    if (this._publishing && this._publishEngine) {
      try {
        await this._publishEngine.replaceTrack('video', newVideoTrack);
      } catch (e) {
        console.warn('[PUBLISH_SERVICE] Falha ao atualizar track de beleza no SRS:', e);
      }
    }
  }

  clearBeautyProcessedStream(): void {
    this.beautyProcessedStream = null;
  }

  registerVideoRef(videoRef: { current: HTMLVideoElement | null } | null): void {
    this.currentVideoRef = videoRef;
    if (this.currentVideoRef?.current) {
      if (this.currentFacingMode === 'user') {
        this.currentVideoRef.current.style.transform = 'scaleX(-1)';
      } else {
        this.currentVideoRef.current.style.transform = 'scaleX(1)';
      }
    }
  }

  /** Elemento de vídeo do preview do host (para inicializar beleza na sala). */
  getCurrentVideoElement(): HTMLVideoElement | null {
    return this.currentVideoRef?.current ?? null;
  }

  getFacingMode(): 'user' | 'environment' {
    return this.currentFacingMode;
  }

  getState(): PublishStateT {
    if (this._publishing) return 'publishing';
    return 'idle';
  }

  isPublishing(): boolean {
    return this._publishing;
  }

  setPublishing(value: boolean): void {
    this._publishing = value;
  }

  onStateChange(cb: (state: PublishStateT | 'idle') => void): () => void {
    const check = () => cb(this.getState());
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }

  onStats(cb: (stats: any) => void): () => void {
    return () => {};
  }

  async startPublish(
    streamKey: string,
    options: {
      previewStream?: MediaStream | null;
      videoRef?: { current: HTMLVideoElement | null };
    }
  ): Promise<void> {
    let mediaStream = options.previewStream ?? null;
    if (!mediaStream && options.videoRef?.current?.srcObject) {
      mediaStream = options.videoRef.current.srcObject as MediaStream;
    }

    if (!mediaStream || mediaStream.getTracks().length === 0) {
      mediaStream = await cameraService.captureStream(this.currentFacingMode);
    }

    if (options.videoRef?.current) {
      options.videoRef.current.srcObject = mediaStream;
      options.videoRef.current.style.transform = this.currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
    }

    this.currentStream = mediaStream;
    this.currentVideoRef = options.videoRef ?? null;

    const streamWithBeauty = this.applyBeautyToStream(mediaStream);

    if (typeof window !== 'undefined') {
      if (!(window as any).__activeStreamsMap) {
        (window as any).__activeStreamsMap = {};
      }
      (window as any).__activeStreamsMap[streamKey] = streamWithBeauty;
      const rawId = streamKey.replace('stream_', '');
      (window as any).__activeStreamsMap[rawId] = streamWithBeauty;
    }

    this._publishing = true;
  }

  stopPublish(): void {
    this.currentStream = null;
    this.currentVideoRef = null;
    this.currentFacingMode = 'user';
    this.beautyProcessedStream = null;
    this._publishing = false;
    // 🔧 Fechar a conexão WHIP: encerra a transmissão no SRS (on_unpublish).
    // Sem isso, o SRS mantém o stream ativo e o backend recria o card da live.
    if (this._publishEngine && typeof this._publishEngine.stop === 'function') {
      try { this._publishEngine.stop(); } catch (err) {
        console.warn('[PUBLISH_SERVICE] Erro ao parar engine:', err);
      }
    }
    this._publishEngine = null;
  }

  private applyCameraFlip(videoElement: HTMLVideoElement | null, facing: 'user' | 'environment'): void {
    if (!videoElement) return;
    const parentElement = videoElement.parentElement;
    if (parentElement) {
      parentElement.classList.add('camera-3d-flip-active');
      setTimeout(() => parentElement.classList.remove('camera-3d-flip-active'), 550);
    }
    videoElement.style.transform = facing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
  }

  async switchCamera(): Promise<void> {
    const nextFacing = this.currentFacingMode === 'user' ? 'environment' : 'user';
    const videoElement = this.currentVideoRef?.current;

    // ⚡ CAMINHO RÁPIDO: no Chrome (Android) a troca frontal/traseira é feita com
    // applyConstraints na track ATIVA — a câmera nem fecha e a troca é quase
    // instantânea. 🔧 FIX: só aceitamos como sucesso se o navegador CONFIRMAR o
    // sensor novo em getSettings().facingMode. Antes, `undefined` era tratado
    // como sucesso — no iOS isso espelhava a imagem sem trocar a câmera.
    const liveTrack = this.currentStream?.getVideoTracks?.().find(t => t.readyState === 'live');
    if (liveTrack && typeof liveTrack.applyConstraints === 'function') {
      try {
        await liveTrack.applyConstraints(getVideoConstraints(nextFacing));
        const settings = liveTrack.getSettings?.() as any;
        const reported = settings?.facingMode;
        if (reported && String(reported).startsWith(nextFacing)) {
          this.currentFacingMode = nextFacing;
          this.applyCameraFlip(videoElement, nextFacing);
          return;
        }
        console.warn('[PUBLISH_SERVICE] applyConstraints NÃO confirmou o sensor (reportado:', String(reported), ', pedido:', nextFacing + ') — usando getUserMedia');
      } catch (applyErr) {
        console.warn('[PUBLISH_SERVICE] applyConstraints indisponível, usando getUserMedia:', applyErr);
      }
    }

    // 🔄 CAMINHO COMPLETO — 🔧 FIX DE ORDEM: abrimos a câmera NOVA ANTES de parar
    // qualquer track da transmissão. Antes, as tracks do preview/publicação eram
    // mortas primeiro e, se o getUserMedia falhasse no meio, a live ficava PRETA
    // para os espectadores e o preview morria.
    try {
      let newStream: MediaStream | null = null;
      // 📐 Sempre pedindo resolução HD na primeira tentativa (constraints ideais).
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { ...getVideoConstraints(nextFacing), facingMode: nextFacing }, audio: false });
        if (!newStream || newStream.getVideoTracks().length === 0) newStream = null;
      } catch (gmErr) {
        console.warn('[PUBLISH_SERVICE] getUserMedia 720p falhou, tentando facingMode simples:', gmErr);
      }
      if (!newStream) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing } }, audio: false });
          if (!newStream || newStream.getVideoTracks().length === 0) newStream = null;
        } catch (gm2Err) {
          console.warn('[PUBLISH_SERVICE] getUserMedia simples falhou, tentando captura robusta:', gm2Err);
        }
      }
      if (!newStream) {
        newStream = await cameraService.captureStream(nextFacing);
      }

      if (!newStream || newStream.getVideoTracks().length === 0) {
        throw new Error('Todas as constraints de captura de camera falharam');
      }

      // Câmera nova GARANTIDA — agora sim substituímos as tracks antigas.
      this.currentFacingMode = nextFacing;
      const newVideoTrack = newStream.getVideoTracks()[0];

      // Para apenas as tracks de vídeo BRUTAS antigas (o áudio continua intacto).
      if (this.currentStream) {
        this.currentStream.getVideoTracks().forEach(track => {
          try { track.stop(); this.currentStream?.removeTrack(track); } catch {}
        });
        this.currentStream.addTrack(newVideoTrack);
      } else {
        this.currentStream = newStream;
      }

      // Preview: se a beleza está ativa, o canvas volta a exibir; senão a câmera crua.
      if (videoElement && !this.beautyProcessedStream) {
        videoElement.srcObject = this.currentStream;
        videoElement.play().catch(() => {});
      }
      this.applyCameraFlip(videoElement, nextFacing);

      // Publica a track nova no SRS imediatamente (sem buraco preto).
      if (this._publishing && this._publishEngine) {
        try {
          await this._publishEngine.replaceTrack('video', newVideoTrack);
        } catch (e) {
          console.warn('[PUBLISH_SERVICE] Falha ao atualizar camera no SRS:', e);
        }
      }

      // 🎨 Re-liga o filtro de beleza à câmera NOVA e publica o feed processado.
      if (this.beautyProcessedStream) {
        try {
          const proc = await videoProcessor.restartProcessing(videoElement);
          if (proc) {
            this.beautyProcessedStream = proc;
            this.applyBeautyToPreview();
            const procTrack = proc.getVideoTracks()[0];
            if (procTrack && this._publishing && this._publishEngine) {
              await this._publishEngine.replaceTrack('video', procTrack);
            }
          }
        } catch (e) {
          console.warn('[PUBLISH_SERVICE] Falha ao religar beleza à nova câmera:', e);
        }
      }

    } catch (e) {
      console.error('[PUBLISH_SERVICE] Falha critica ao trocar camera:', e);
      // 🛟 Recuperação SEM derrubar o que ainda está no ar: reabre a câmera atual.
      try {
        const recoveryStream = await cameraService.captureStream(this.currentFacingMode);
        const recVideoTrack = recoveryStream.getVideoTracks()[0];

        if (this.currentStream) {
          this.currentStream.getVideoTracks().forEach(track => {
            try { track.stop(); this.currentStream?.removeTrack(track); } catch {}
          });
          this.currentStream.addTrack(recVideoTrack);
        } else {
          this.currentStream = recoveryStream;
        }

        if (videoElement && !this.beautyProcessedStream) {
          videoElement.srcObject = this.currentStream;
          videoElement.style.transform = this.currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        if (this._publishing && this._publishEngine) {
          try { await this._publishEngine.replaceTrack('video', recVideoTrack); } catch {}
        }
      } catch (recoveryErr) {
        console.error('[PUBLISH_SERVICE] Recuperacao de camera tambem falhou:', recoveryErr);
      }
    }
  }
}

export const streamPublishService = new StreamPublishService();
