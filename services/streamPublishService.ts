import { isNativeRtmpBridge } from './mediaConfig';
import { cameraService } from './cameraService';

type PublishEngineType = { replaceTrack: (kind: 'audio' | 'video', track: MediaStreamTrack | null) => Promise<void> };

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

    mediaStream.getVideoTracks().forEach(track => {
      mediaStream.removeTrack(track);
      track.stop();
    });

    processedVideoTracks.forEach(track => {
      mediaStream.addTrack(track);
    });

    return mediaStream;
  }

  async updateBeautyTrack(): Promise<void> {
    const processed = this.beautyProcessedStream;
    if (!processed || !this.currentStream) return;

    const processedVideoTracks = processed.getVideoTracks();
    if (processedVideoTracks.length === 0) return;

    const newVideoTrack = processedVideoTracks[0];

    this.currentStream.getVideoTracks().forEach(track => {
      this.currentStream!.removeTrack(track);
      track.stop();
    });
    this.currentStream.addTrack(newVideoTrack);

    if (this._publishing && this._publishEngine) {
      try {
        await this._publishEngine.replaceTrack('video', newVideoTrack);
      } catch (e) {
        console.warn('[PUBLISH_SERVICE] Falha ao atualizar track de beleza no SRS:', e);
      }
    }

    if (this.currentVideoRef?.current) {
      const videoEl = this.currentVideoRef.current;
      if (videoEl.srcObject) {
        videoEl.srcObject = this.currentStream;
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

  getFacingMode(): 'user' | 'environment' {
    return this.currentFacingMode;
  }

  getState(): PublishStateT {
    if (isNativeRtmpBridge()) {
      const streaming = (window as any).Android?.isStreaming?.();
      return streaming ? 'native' : 'idle';
    }
    if (this._publishing) return 'publishing';
    return 'idle';
  }

  isPublishing(): boolean {
    if (isNativeRtmpBridge()) {
      return (window as any).Android?.isStreaming?.() || false;
    }
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
    if (isNativeRtmpBridge()) {
      const webPreview = options.videoRef?.current;
      if (webPreview?.srcObject) {
        const stream = webPreview.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        webPreview.srcObject = null;
      }
      window.Android!.startRTMP(streamKey);
      this._publishing = true;
      return;
    }

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
    if (isNativeRtmpBridge()) {
      try { window.Android?.stopRTMP?.(); } catch { /* ignore */ }
      this._publishing = false;
      return;
    }

    this.currentStream = null;
    this.currentVideoRef = null;
    this.currentFacingMode = 'user';
    this.beautyProcessedStream = null;
    this._publishing = false;
  }

  async switchCamera(): Promise<void> {
    if (isNativeRtmpBridge()) {
      window.Android?.switchCamera?.();
      return;
    }

    const nextFacing = this.currentFacingMode === 'user' ? 'environment' : 'user';
    const videoElement = this.currentVideoRef?.current;

    if (videoElement && videoElement.srcObject) {
      try {
        const activeDomStream = videoElement.srcObject as MediaStream;
        activeDomStream.getVideoTracks().forEach(track => {
          track.enabled = false;
          track.stop();
        });
      } catch (domErr) {
        console.warn('[PUBLISH_SERVICE] Erro ao parar tracks do video element:', domErr);
      }
      videoElement.srcObject = null;
    }

    if (this.currentStream) {
      this.currentStream.getVideoTracks().forEach(track => {
        try {
          track.enabled = false;
          track.stop();
          this.currentStream?.removeTrack(track);
        } catch (err) {
          console.warn('[PUBLISH_SERVICE] Erro ao parar tracks do servico:', err);
        }
      });
    }

    await new Promise(resolve => setTimeout(resolve, 250));

    try {
      let newStream: MediaStream | null = null;
      const baseVideoConfig = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };

      const constraintAttempts = [
        { video: { ...baseVideoConfig, facingMode: { exact: nextFacing } }, audio: false },
        { video: { ...baseVideoConfig, facingMode: { ideal: nextFacing } }, audio: false },
        { video: { ...baseVideoConfig, facingMode: nextFacing as any }, audio: false },
        { video: { facingMode: { exact: nextFacing } }, audio: false },
        { video: { facingMode: { ideal: nextFacing } }, audio: false },
        { video: { facingMode: nextFacing as any }, audio: false },
        { video: baseVideoConfig, audio: false },
        { video: true, audio: false },
      ];

      for (let i = 0; i < constraintAttempts.length; i++) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia(constraintAttempts[i] as any);
          if (newStream && newStream.getVideoTracks().length > 0) break;
        } catch { /* next tier */ }
      }

      if (!newStream) {
        newStream = await cameraService.captureStream(nextFacing);
      }

      if (!newStream) {
        throw new Error('Todas as constraints de captura de camera falharam');
      }

      this.currentFacingMode = nextFacing;
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (this.currentStream) {
        this.currentStream.getVideoTracks().forEach(track => {
          try { track.stop(); this.currentStream?.removeTrack(track); } catch {}
        });
        this.currentStream.addTrack(newVideoTrack);
      } else {
        this.currentStream = newStream;
      }

      if (videoElement) {
        const parentElement = videoElement.parentElement;
        if (parentElement) {
          parentElement.classList.add('camera-3d-flip-active');
          setTimeout(() => parentElement.classList.remove('camera-3d-flip-active'), 550);
        }

        videoElement.srcObject = this.currentStream;
        videoElement.play().catch(() => {});
        videoElement.style.transform = nextFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
      }

      if (this._publishing && this._publishEngine) {
        try {
          await this._publishEngine.replaceTrack('video', newVideoTrack);
        } catch (e) {
          console.warn('[PUBLISH_SERVICE] Falha ao atualizar camera no SRS:', e);
        }
      }

    } catch (e) {
      console.error('[PUBLISH_SERVICE] Falha critica ao trocar camera:', e);
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

        if (videoElement) {
          videoElement.srcObject = this.currentStream;
          videoElement.style.transform = this.currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        if (this._publishing && this._publishEngine) {
          try {
            await this._publishEngine.replaceTrack('video', recVideoTrack);
          } catch {}
        }
      } catch (recoveryErr) {
        console.error('[PUBLISH_SERVICE] Recuperacao de camera tambem falhou:', recoveryErr);
      }
    }
  }
}

export const streamPublishService = new StreamPublishService();

declare global {
  interface Window {
    Android?: {
      startRTMP: (streamKey: string) => void;
      stopRTMP: () => void;
      switchCamera: () => void;
      prepareRTMPPreview?: () => void;
      releaseRTMP?: () => void;
      isStreaming?: () => boolean;
      applyBeautySettings?: (
        whitening: number,
        smoothing: number,
        saturation: number,
        contrast: number,
        filterName: string
      ) => void;
    };
  }
}
