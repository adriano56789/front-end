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

  // Cache de deviceId por facing — mapeado na primeira abertura de câmera
  private cameraDeviceCache: { user: string | null; environment: string | null } = { user: null, environment: null };

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
    // Mapear câmeras na 1ª abertura (cache pra switch instantâneo)
    if (stream && !this.cameraDeviceCache.user && !this.cameraDeviceCache.environment) {
      void this.buildCameraCache();
    }
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

  /**
   * Mapeia deviceIds de frente/trás uma única vez (chamado na 1ª abertura
   * de câmera). Depois disso, switchCamera() é lookup síncrono no cache.
   */
  async buildCameraCache(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      if (cameras.length < 2) return;

      const map: { deviceId: string; facing: string; label: string }[] = [];
      for (const cam of cameras) {
        try {
          const tmp = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: cam.deviceId } },
            audio: false,
          });
          const track = tmp.getVideoTracks()[0];
          const facing = track.getSettings().facingMode || 'unknown';
          map.push({ deviceId: cam.deviceId, facing, label: cam.label });
          track.stop();
          tmp.getTracks().forEach(t => { try { t.stop(); } catch {} });
        } catch {
          map.push({ deviceId: cam.deviceId, facing: 'unknown', label: cam.label });
        }
      }

      const userCam = map.find(c => c.facing === 'user');
      const envCam = map.find(c => c.facing === 'environment');
      this.cameraDeviceCache = {
        user: userCam?.deviceId ?? map[0]?.deviceId ?? null,
        environment: envCam?.deviceId ?? map.find(c => c.deviceId !== userCam?.deviceId)?.deviceId ?? null,
      };
      console.log('[PUBLISH_SERVICE] 🗺️ Cache câmeras:', this.cameraDeviceCache);
    } catch (e) {
      console.warn('[PUBLISH_SERVICE] Falha ao mapear câmeras:', e);
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
    this.cameraDeviceCache = { user: null, environment: null };
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

    console.log(`[PUBLISH_SERVICE] 🔄 Trocando câmera: ${this.currentFacingMode} → ${nextFacing}`);

    // ═══════════════════════════════════════════════════════════════════
    // TROCA INSTANTÂNEA:
    // 1. Olhar cache (buildCameraCache na 1ª abertura)
    // 2. Parar tracks antigas
    // 3. Abrir nova câmera por deviceId do cache
    // 4. Fallback: facingMode se cache não existe
    // ═══════════════════════════════════════════════════════════════════

    const oldTracks = this.currentStream?.getVideoTracks() ?? [];
    const oldDeviceId = oldTracks[0]?.getSettings?.()?.deviceId ?? null;

    // Se só tem 1 câmera, não troca
    if (oldTracks.length === 0 && !this.currentStream) {
      console.warn('[PUBLISH_SERVICE] ⚠️ Sem stream ativa — impossível trocar');
      return;
    }

    // Buscar targetDeviceId do cache (instantâneo, síncrono)
    let targetDeviceId: string | null = this.cameraDeviceCache[nextFacing] ?? null;

    // Se cache não tem o facing pedido, usa o que NÃO é a atual
    if (!targetDeviceId && this.cameraDeviceCache.user && this.cameraDeviceCache.environment) {
      targetDeviceId = nextFacing === 'user'
        ? this.cameraDeviceCache.user
        : this.cameraDeviceCache.environment;
    }

    // Se cache vazio, tenta construir agora (1ª vez)
    if (!targetDeviceId) {
      console.log('[PUBLISH_SERVICE] Cache vazio — construindo...');
      await this.buildCameraCache();
      targetDeviceId = this.cameraDeviceCache[nextFacing] ?? null;
    }

    console.log(`[PUBLISH_SERVICE] 🎯 Target: ${nextFacing} → ${targetDeviceId ? targetDeviceId.substring(0, 8) + '...' : 'N/A'}`);

    // PARAR tracks antigas IMEDIATAMENTE
    console.log(`[PUBLISH_SERVICE] 📵 Parando ${oldTracks.length} track(s) antiga(s)...`);
    for (const track of oldTracks) {
      try { track.stop(); } catch {}
      try { this.currentStream?.removeTrack(track); } catch {}
    }

    // Pedir nova stream
    let newStream: MediaStream | null = null;

    // Tier 1: deviceId do cache (instantâneo)
    if (targetDeviceId) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: targetDeviceId } },
          audio: false,
        });
        console.log('[PUBLISH_SERVICE] ✅ Tier 1 (deviceId exact) OK');
      } catch (e1) {
        console.warn('[PUBLISH_SERVICE] Tier 1 (deviceId) falhou:', e1);
      }
    }

    // Tier 2: facingMode exact
    if (!newStream) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: nextFacing } },
          audio: false,
        });
        console.log('[PUBLISH_SERVICE] ✅ Tier 2 (facingMode exact) OK');
      } catch (e2) {
        console.warn('[PUBLISH_SERVICE] Tier 2 (facingMode exact) falhou:', e2);
      }
    }

    // Tier 3: qualquer câmera diferente da atual
    if (!newStream) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const otherCam = cameras.find(c => c.deviceId !== oldDeviceId) || cameras[0];
        if (otherCam) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: otherCam.deviceId } },
            audio: false,
          });
          console.log('[PUBLISH_SERVICE] ✅ Tier 3 (deviceId fallback) OK');
        }
      } catch (e3) {
        console.warn('[PUBLISH_SERVICE] Tier 3 falhou:', e3);
      }
    }

    if (!newStream || newStream.getVideoTracks().length === 0) {
      console.error('[PUBLISH_SERVICE] ❌ Todas as tiers falharam — recuperando câmera anterior');
      try {
        const recovery = await cameraService.captureStream(this.currentFacingMode);
        const recTrack = recovery.getVideoTracks()[0];
        if (this.currentStream) {
          this.currentStream.addTrack(recTrack);
        } else {
          this.currentStream = recovery;
        }
        if (videoElement) {
          videoElement.srcObject = this.currentStream;
          videoElement.play().catch(() => {});
        }
        if (this._publishing && this._publishEngine) {
          await this._publishEngine.replaceTrack('video', recTrack);
        }
      } catch (recoveryErr) {
        console.error('[PUBLISH_SERVICE] ❌ Recuperação também falhou:', recoveryErr);
      }
      return;
    }

    // Verificar se a câmera realmente mudou
    const newTrack = newStream.getVideoTracks()[0];
    const newSettings = newTrack.getSettings?.() as any;
    const newDeviceId = newSettings?.deviceId ?? null;
    const newFacingMode = newSettings?.facingMode ?? null;

    console.log('[PUBLISH_SERVICE] 📷 Nova câmera:', {
      facingMode: newFacingMode,
      label: newSettings?.label,
      deviceId: newDeviceId?.substring(0, 8) + '...',
    });

    const facingChanged = newFacingMode && newFacingMode !== this.currentFacingMode;
    const deviceChanged = newDeviceId && newDeviceId !== oldDeviceId;

    if (!facingChanged && !deviceChanged) {
      console.warn('[PUBLISH_SERVICE] ⚠️ Câmera NÃO mudou!');
      newStream.getTracks().forEach(t => t.stop());
      return;
    }

    // Atualizar cache com o deviceId novo (aprende durante uso)
    if (newDeviceId && nextFacing) {
      this.cameraDeviceCache[nextFacing] = newDeviceId;
    }

    // Atualizar estado
    this.currentFacingMode = nextFacing;

    if (this.currentStream) {
      this.currentStream.addTrack(newTrack);
    } else {
      this.currentStream = newStream;
    }

    // Preview — SEMPRE mostrar a câmera crua ao trocar, mesmo com filtro
    // de beleza ativo. Sem isso, o preview mostrava o ÚLTIMO frame congelado
    // do canvas processado da câmera anterior (tela "travada") enquanto o
    // restartProcessing re-inicializava o pipeline WebGL (~1-3s em cel lentos).
    if (videoElement) {
      videoElement.srcObject = this.currentStream;
      videoElement.play().catch(() => {});
    }
    this.applyCameraFlip(videoElement, nextFacing);

    // Publicar no SRS
    if (this._publishing && this._publishEngine) {
      try {
        await this._publishEngine.replaceTrack('video', newTrack);
        console.log('[PUBLISH_SERVICE] ✅ Track atualizada no SRS');
      } catch (e) {
        console.warn('[PUBLISH_SERVICE] Falha ao atualizar camera no SRS:', e);
      }
    }

    // Re-ligar filtro de beleza
    if (this.beautyProcessedStream) {
      try {
        const proc = await videoProcessor.restartProcessing(videoElement);
        if (proc) {
          // ⏳ Aguardar canvas REALMENTE desenhando frames antes de trocar preview
          const frameDeadline = Date.now() + 3000;
          while (!(videoProcessor.isCanvasProducing() && videoProcessor.isSourceActive()) && Date.now() < frameDeadline) {
            await new Promise(r => setTimeout(r, 60));
          }
          if (videoProcessor.isCanvasProducing() && videoProcessor.isSourceActive()) {
            this.beautyProcessedStream = proc;
            // NÃO chama applyBeautyToPreview() — canvas.captureStream() congela
            // o <video> em dispositivos móveis. Preview fica na câmera crua.
            const procTrack = proc.getVideoTracks()[0];
            if (procTrack && this._publishing && this._publishEngine) {
              await this._publishEngine.replaceTrack('video', procTrack);
            }
          } else {
            console.warn('[PUBLISH_SERVICE] Canvas não produziu frames após troca — mantendo câmera crua');
          }
        }
      } catch (e) {
        console.warn('[PUBLISH_SERVICE] Falha ao religar beleza:', e);
      }
    }

    console.log(`[PUBLISH_SERVICE] ✅ Câmera trocada com sucesso para ${nextFacing}`);
  }
}

export const streamPublishService = new StreamPublishService();
