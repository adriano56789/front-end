import { isNativeRtmpBridge, getWhipEndpointUrl } from './mediaConfig';
import { whipPublishService, PublishState } from './whipPublishService';
import { webrtcService, WebRTCState } from './webrtcService';

export type PublishStateT = PublishState | WebRTCState | 'native';

const SRS_CANDIDATE = '72.60.249.175';

class StreamPublishService {
  private useBackendProxy = false;

  setUseBackendProxy(use: boolean): void {
    this.useBackendProxy = use;
  }

  getState(): PublishStateT | 'idle' {
    if (isNativeRtmpBridge()) {
      const streaming = (window as Window & { Android?: { isStreaming?: () => boolean } }).Android?.isStreaming?.();
      return streaming ? 'native' : 'idle';
    }
    return this.useBackendProxy ? webrtcService.getState() : whipPublishService.getState();
  }

  isPublishing(): boolean {
    const state = this.getState();
    return state === 'publishing' || state === 'connected' || state === 'native';
  }

  onStateChange(cb: (state: PublishStateT | 'idle') => void): () => void {
    if (this.useBackendProxy) {
      return webrtcService.onStateChange(cb);
    }
    return whipPublishService.onStateChange(cb as (s: PublishState) => void);
  }

  onStats(cb: (stats: any) => void): () => void {
    return webrtcService.onStats(cb);
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
      return;
    }

    if (this.useBackendProxy) {
      const streamUrl = `webrtc://${SRS_CANDIDATE}/live/${streamKey}`;
      const stream = await webrtcService.startPublish(streamUrl);

      if (options.videoRef?.current) {
        options.videoRef.current.srcObject = stream;
      }
    } else {
      let mediaStream = options.previewStream ?? null;
      if (!mediaStream && options.videoRef?.current?.srcObject) {
        mediaStream = options.videoRef.current.srcObject as MediaStream;
      }

      if (!mediaStream || mediaStream.getTracks().length === 0) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (options.videoRef?.current) {
          options.videoRef.current.srcObject = mediaStream;
        }
      }

      await whipPublishService.start(streamKey, mediaStream);
    }
  }

  stopPublish(): void {
    if (isNativeRtmpBridge()) {
      try { window.Android?.stopRTMP?.(); } catch { /* ignore */ }
      return;
    }
    if (this.useBackendProxy) {
      webrtcService.stop();
    } else {
      whipPublishService.stop();
    }
  }

  switchCamera(): void {
    if (isNativeRtmpBridge()) {
      window.Android?.switchCamera?.();
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
