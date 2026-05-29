import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ToastType } from '../types';
import { streamPublishService } from '../services/streamPublishService';

interface CameraPreviewState {
  isUiVisible: boolean;
}

interface CameraPreviewActions {
  hideUi: () => void;
  showUi: () => void;
  initializeCamera: () => Promise<void>;
  cleanupCamera: () => void;
}

export const useCameraPreview = (
  isOpen: boolean,
  addToast: (type: ToastType, message: string) => void
): CameraPreviewState & CameraPreviewActions & { videoRef: React.RefObject<HTMLVideoElement | null> } => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const hasInitialized = useRef(false);

  const hideUi = useCallback(() => {
    setIsUiVisible(false);
  }, []);

  const showUi = useCallback(() => {
    if (!isUiVisible) {
      setIsUiVisible(true);
    }
  }, [isUiVisible]);

  const initializeCamera = useCallback(async () => {
    const androidBridge = typeof window !== 'undefined' ? (window as any).Android : undefined;
    if (androidBridge?.prepareRTMPPreview) {
      androidBridge.prepareRTMPPreview();
      console.log('[CAMERA_PREVIEW] Preview nativo RTMP iniciado');
      return;
    }

    if (videoRef.current && !videoRef.current.srcObject) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, frameRate: 30 },
            audio: true
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          
          console.log('[CAMERA_PREVIEW] Preview da câmera iniciado:', stream.getTracks().length, 'tracks');
        } catch (err) {
          console.error('[CAMERA_PREVIEW] Falha no preview da câmera:', err);
          addToast(ToastType.Error, 'Não foi possível acessar a câmera. Verifique as permissões.');
        }
      }
    }
  }, [addToast]);

  const cleanupCamera = useCallback(() => {
    const androidBridge = typeof window !== 'undefined' ? (window as any).Android : undefined;
    if (androidBridge?.releaseRTMP && !androidBridge?.isStreaming?.()) {
      androidBridge.releaseRTMP();
      return;
    }

    if (streamPublishService.isPublishing()) {
      return;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeCamera();
    } else if (!isOpen) {
      hasInitialized.current = false;
      cleanupCamera();
    }
  }, [isOpen, initializeCamera, cleanupCamera]);

  return {
    videoRef,
    isUiVisible,
    hideUi,
    showUi,
    initializeCamera,
    cleanupCamera
  };
};
