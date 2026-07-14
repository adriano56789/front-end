import { isNativeRtmpBridge, getWhipEndpointUrl } from './mediaConfig';
import { whipPublishService, PublishState } from './srs/whip';
import { webrtcService, WebRTCState } from './webrtcService';
import { cameraService } from './cameraService';
import { env } from '../src/config/environment';

export type PublishStateT = PublishState | WebRTCState | 'native';

const SRS_CANDIDATE = env.srs.host;

class StreamPublishService {
  private useBackendProxy = false;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private currentStream: MediaStream | null = null;
  private currentVideoRef: { current: HTMLVideoElement | null } | null = null;
  // Stream processado com efeitos de beleza (WebGL)
  private beautyProcessedStream: MediaStream | null = null;

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  setCurrentStream(stream: MediaStream | null): void {
    this.currentStream = stream;
  }

  /**
   * Definir stream processado com efeitos de beleza
   */
  setBeautyProcessedStream(stream: MediaStream | null): void {
    this.beautyProcessedStream = stream;
  }

  /**
   * Obter stream processado com efeitos de beleza
   */
  getBeautyProcessedStream(): MediaStream | null {
    return this.beautyProcessedStream;
  }

  /**
   * Substituir track de vídeo do stream atual pela do stream processado (beleza)
   * Retorna o stream modificado ou o original se não houver processamento
   */
  applyBeautyToStream(mediaStream: MediaStream): MediaStream {
    const processed = this.beautyProcessedStream;
    if (!processed) return mediaStream;

    const processedVideoTracks = processed.getVideoTracks();
    if (processedVideoTracks.length === 0) return mediaStream;

    // Remover tracks de vídeo originais e adicionar as processadas
    mediaStream.getVideoTracks().forEach(track => {
      mediaStream.removeTrack(track);
      track.stop();
    });

    processedVideoTracks.forEach(track => {
      mediaStream.addTrack(track);
    });

    console.log('✅ [PUBLISH_SERVICE] Beleza aplicada ao stream de publicação');
    return mediaStream;
  }

  /**
   * Atualizar dinamicamente a track de vídeo com o stream processado (beleza)
   * Usado quando a beleza é ativada após a publicação já ter iniciado
   */
  async updateBeautyTrack(): Promise<void> {
    const processed = this.beautyProcessedStream;
    if (!processed || !this.currentStream) return;

    const processedVideoTracks = processed.getVideoTracks();
    if (processedVideoTracks.length === 0) return;

    const newVideoTrack = processedVideoTracks[0];

    // Substituir no currentStream
    this.currentStream.getVideoTracks().forEach(track => {
      this.currentStream!.removeTrack(track);
      track.stop();
    });
    this.currentStream.addTrack(newVideoTrack);

    // Se estiver publicando, substituir no WebRTC PeerConnection
    if (this.isPublishing()) {
      if (this.useBackendProxy) {
        await webrtcService.replaceTrack('video', newVideoTrack);
      } else {
        await whipPublishService.replaceTrack('video', newVideoTrack);
      }
    }

    // Atualizar preview se houver
    if (this.currentVideoRef?.current) {
      const videoEl = this.currentVideoRef.current;
      if (videoEl.srcObject) {
        videoEl.srcObject = this.currentStream;
      }
    }

    console.log('✅ [PUBLISH_SERVICE] Beauty track updated dynamically');
  }

  /**
   * Limpar stream processado de beleza e restaurar track original
   */
  clearBeautyProcessedStream(): void {
    this.beautyProcessedStream = null;
  }

  setUseBackendProxy(use: boolean): void {
    this.useBackendProxy = use;
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
    if (this.useBackendProxy) {
      return webrtcService.onStats(cb);
    }
    // whipPublishService não possui método onStats ainda
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
      return;
    }

    webrtcService.currentFacingMode = this.currentFacingMode;

    if (this.useBackendProxy) {
      const streamUrl = `webrtc://${SRS_CANDIDATE}/live/${streamKey}`;
      const stream = await webrtcService.startPublish(streamUrl);

      if (options.videoRef?.current) {
        options.videoRef.current.srcObject = stream;
        if (this.currentFacingMode === 'user') {
          options.videoRef.current.style.transform = 'scaleX(-1)';
        } else {
          options.videoRef.current.style.transform = 'scaleX(1)';
        }
      }
      this.currentStream = webrtcService.getLocalStream();
      this.currentVideoRef = options.videoRef ?? null;
    } else {
      let mediaStream = options.previewStream ?? null;
      if (!mediaStream && options.videoRef?.current?.srcObject) {
        mediaStream = options.videoRef.current.srcObject as MediaStream;
      }

      if (!mediaStream || mediaStream.getTracks().length === 0) {
        mediaStream = await cameraService.captureStream(this.currentFacingMode);
        if (options.videoRef?.current) {
          options.videoRef.current.srcObject = mediaStream;
          if (this.currentFacingMode === 'user') {
            options.videoRef.current.style.transform = 'scaleX(-1)';
          } else {
            options.videoRef.current.style.transform = 'scaleX(1)';
          }
        }
      }

      this.currentStream = mediaStream;
      this.currentVideoRef = options.videoRef ?? null;

      // 🔥 APLICAR EFEITOS DE BELEZA: substituir track de vídeo pela processada (WebGL)
      const streamWithBeauty = this.applyBeautyToStream(mediaStream);

      if (typeof window !== 'undefined') {
        if (!(window as any).__activeStreamsMap) {
          (window as any).__activeStreamsMap = {};
        }
        (window as any).__activeStreamsMap[streamKey] = streamWithBeauty;
        // fallback match standard keys too
        const rawId = streamKey.replace('stream_', '');
        (window as any).__activeStreamsMap[rawId] = streamWithBeauty;
      }

      await whipPublishService.start(streamKey, streamWithBeauty);
    }
  }

  stopPublish(): void {
    if (isNativeRtmpBridge()) {
      try { window.Android?.stopRTMP?.(); } catch { /* ignore */ }
      return;
    }
    
    this.currentStream = null;
    this.currentVideoRef = null;
    this.currentFacingMode = 'user';
    this.beautyProcessedStream = null;

    if (this.useBackendProxy) {
      webrtcService.stop();
    } else {
      whipPublishService.stop();
    }
  }

  async switchCamera(): Promise<void> {
    if (isNativeRtmpBridge()) {
      window.Android?.switchCamera?.();
      return;
    }

    const nextFacing = this.currentFacingMode === 'user' ? 'environment' : 'user';
    console.log('[PUBLISH_SERVICE] Switching web camera to:', nextFacing);

    // 1. Fully close the active camera, releasing all hardware and OS resources
    const videoElement = this.currentVideoRef?.current;
    
    // Explicitly stop all video tracks on any previous stream attached to the video DOM element
    if (videoElement && videoElement.srcObject) {
      try {
        const activeDomStream = videoElement.srcObject as MediaStream;
        activeDomStream.getVideoTracks().forEach(track => {
          console.log('[PUBLISH_SERVICE] Stopping active video track from video element:', track.label);
          track.enabled = false;
          track.stop();
        });
      } catch (domErr) {
        console.warn('[PUBLISH_SERVICE] Error stopping video DOM tracks:', domErr);
      }
      videoElement.srcObject = null;
    }

    // Stop and detach ALL video tracks from service's currentStream to ensure hardware sensor power-down
    if (this.currentStream) {
      const activeServiceTracks = this.currentStream.getVideoTracks();
      console.log(`[PUBLISH_SERVICE] Stopping ${activeServiceTracks.length} active service tracks`);
      activeServiceTracks.forEach(track => {
        try {
          track.enabled = false;
          track.stop();
          this.currentStream?.removeTrack(track);
        } catch (err) {
          console.warn('[PUBLISH_SERVICE] Error stopping/removing previous service video track:', err);
        }
      });
    }

    // 2. Pause for a dedicated duration (250ms) to allow OS/hardware layers to release locks and turn off physical indicators
    await new Promise(resolve => setTimeout(resolve, 250));

    try {
      let matchedDeviceId: string | undefined;

      // Query available video devices to locate the specific physical front / back sensor as a fallback
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log('[PUBLISH_SERVICE] Found video capture devices after release:', videoDevices.map(d => ({ label: d.label, id: d.deviceId })));

        if (nextFacing === 'environment') {
          // Find back camera by scanning device labels
          const backCam = videoDevices.find(d => {
            const lbl = d.label.toLowerCase();
            return lbl.includes('back') || lbl.includes('rear') || lbl.includes('traseir') || 
                   lbl.includes('principal') || lbl.includes('extern') || lbl.includes('ambien') ||
                   lbl.includes('traseira') || lbl.includes('trás') || lbl.includes('tras');
          });
          if (backCam) {
            matchedDeviceId = backCam.deviceId;
            console.log('[PUBLISH_SERVICE] Found physical back camera device:', backCam.label, matchedDeviceId);
          } else if (videoDevices.length >= 2) {
            // Strong heuristic fallback: environment/back camera is usually the last/second device in the list
            const backIndex = videoDevices.length - 1;
            matchedDeviceId = videoDevices[backIndex].deviceId;
            console.log(`[PUBLISH_SERVICE] Falling back to camera index ${backIndex} for Back / Environment camera`);
          }
        } else {
          // Find front camera by scanning device labels
          const frontCam = videoDevices.find(d => {
            const lbl = d.label.toLowerCase();
            return lbl.includes('front') || lbl.includes('user') || lbl.includes('selfie') || 
                   lbl.includes('frontal') || lbl.includes('intern') || lbl.includes('cam 1') ||
                   lbl.includes('frente') || lbl.includes('rosto') || lbl.includes('vga');
          });
          if (frontCam) {
            matchedDeviceId = frontCam.deviceId;
            console.log('[PUBLISH_SERVICE] Found physical front camera device:', frontCam.label, matchedDeviceId);
          } else if (videoDevices.length > 0) {
            // Strong heuristic fallback: front camera is usually the first device in list
            matchedDeviceId = videoDevices[0].deviceId;
            console.log('[PUBLISH_SERVICE] Falling back to camera index 0 for Front / User camera');
          }
        }
      } catch (enumErr) {
        console.warn('[PUBLISH_SERVICE] Failed to enumerate device labels:', enumErr);
      }

      let newStream: MediaStream | null = null;
      const baseVideoConfig = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };

      // Define a tiered self-healing chain of camera constraints.
      // We prioritize standard facingMode constraints which are native, highly optimized by browsers,
      // and much safer than guessed/heuristic deviceIds.
      const constraintAttempts = [];

      // Tier 1: Try strict facingMode exact with resolution constraints (this guarantees physical front/back switch on mobile!)
      constraintAttempts.push({ 
        video: { ...baseVideoConfig, facingMode: { exact: nextFacing } }, 
        audio: false 
      });

      // Tier 2: Try facingMode ideal with resolution constraints
      constraintAttempts.push({ 
        video: { ...baseVideoConfig, facingMode: { ideal: nextFacing } }, 
        audio: false 
      });

      // Tier 3: Try standard facingMode attribute string with resolution constraints
      constraintAttempts.push({ 
        video: { ...baseVideoConfig, facingMode: nextFacing as any }, 
        audio: false 
      });

      // Tier 4: Direct physical device ID match with resolution constraints (fallback if OS labels were successfully matched)
      if (matchedDeviceId) {
        constraintAttempts.push({ 
          video: { ...baseVideoConfig, deviceId: { exact: matchedDeviceId } }, 
          audio: false 
        });
      }

      // Tier 5: Try facingMode exact WITHOUT resolution constraints (highly robust fallback)
      constraintAttempts.push({ 
        video: { facingMode: { exact: nextFacing } }, 
        audio: false 
      });

      // Tier 6: Try facingMode ideal WITHOUT resolution constraints
      constraintAttempts.push({ 
        video: { facingMode: { ideal: nextFacing } }, 
        audio: false 
      });

      // Tier 7: Try facingMode simple string WITHOUT resolution constraints
      constraintAttempts.push({ 
        video: { facingMode: nextFacing as any }, 
        audio: false 
      });

      // Tier 8: Direct physical device ID match WITHOUT resolution constraints
      if (matchedDeviceId) {
        constraintAttempts.push({ 
          video: { deviceId: { exact: matchedDeviceId } }, 
          audio: false 
        });
      }

      // Tier 9: Ultimate fallback - grab default camera with resolution
      constraintAttempts.push({ 
        video: baseVideoConfig, 
        audio: false 
      });

      // Tier 10: Absolute base fallback - grab any raw camera video
      constraintAttempts.push({ 
        video: true, 
        audio: false 
      });

      // Try each constraint tier in order until one succeeds
      for (let i = 0; i < constraintAttempts.length; i++) {
        try {
          console.log(`[PUBLISH_SERVICE] Camera constraint tier ${i + 1}/${constraintAttempts.length}...`);
          newStream = await navigator.mediaDevices.getUserMedia(constraintAttempts[i] as any);
          if (newStream && newStream.getVideoTracks().length > 0) {
            console.log(`[PUBLISH_SERVICE] Camera constraint tier ${i + 1} succeeded`);
            break;
          }
        } catch (tierErr) {
          console.warn(`[PUBLISH_SERVICE] Camera constraint tier ${i + 1} failed:`, tierErr);
        }
      }

      // Fallback: try cameraService.captureStream if all tiers failed
      if (!newStream) {
        try {
          console.log('[PUBLISH_SERVICE] Falling back to cameraService.captureStream...');
          newStream = await cameraService.captureStream(nextFacing);
        } catch (switchErr) {
          console.error('[PUBLISH_SERVICE] cameraService.captureStream also failed:', switchErr);
        }
      }

      if (!newStream) {
        throw new Error('All available camera capture constraints failed');
      }

      this.currentFacingMode = nextFacing;
      webrtcService.currentFacingMode = nextFacing;

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Re-route the new track into our active stream (keeping the original audio track intact)
      if (this.currentStream) {
        // Strip out old video tracks once more to be absolutely clean
        this.currentStream.getVideoTracks().forEach(track => {
          try {
            track.enabled = false;
            track.stop();
            this.currentStream?.removeTrack(track);
          } catch (err) {
            console.warn('[PUBLISH_SERVICE] Error removing old tracks:', err);
          }
        });
        // Attach the new video track
        this.currentStream.addTrack(newVideoTrack);
      } else {
        this.currentStream = newStream;
      }

      // 4. Reinicializa a visualização com efeito visual 3D
      if (videoElement) {
        const parentElement = videoElement.parentElement;
        
        if (parentElement) {
          // BuzzCast style 3D viewport flip card rotation to mask camera hardware latency
          parentElement.classList.add('camera-3d-flip-active');
          setTimeout(() => {
            parentElement.classList.remove('camera-3d-flip-active');
          }, 550);
        }

        videoElement.srcObject = this.currentStream;
        videoElement.play().catch(playErr => console.warn('[PUBLISH_SERVICE] Play error on video element:', playErr));

        if (nextFacing === 'user') {
          // Flip/mirror image naturally for front camera
          videoElement.style.transform = 'scaleX(-1)';
        } else {
          // True real-world environment view for back camera (no mirror transformation!)
          videoElement.style.transform = 'scaleX(1)';
        }
      }

      // Propagate the new video track to the WebRTC peer connection
      if (this.isPublishing()) {
        if (this.useBackendProxy) {
          await webrtcService.replaceTrack('video', newVideoTrack);
        } else {
          await whipPublishService.replaceTrack('video', newVideoTrack);
        }
      }

    } catch (e) {
      console.error('[PUBLISH_SERVICE] Web switch camera failed critically:', e);
      // Recovery attempt using default camera capture constraints
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
        
        if (this.isPublishing()) {
          if (this.useBackendProxy) {
            await webrtcService.replaceTrack('video', recVideoTrack);
          } else {
            await whipPublishService.replaceTrack('video', recVideoTrack);
          }
        }
      } catch (recoveryErr) {
        console.error('[PUBLISH_SERVICE] Web switch camera fallback recovery also failed:', recoveryErr);
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
