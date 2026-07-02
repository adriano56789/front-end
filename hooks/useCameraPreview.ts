import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ToastType } from '../types';
import { streamPublishService } from '../services/streamPublishService';
import { cameraService } from '../services/cameraService';

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
  const addToastRef = useRef(addToast);

  // Keep addToast updated in ref to avoid dependency changes
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

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

    if (videoRef.current) {
      // Safely check if we already have an active stream with active tracks
      if (videoRef.current.srcObject) {
         const existingStream = videoRef.current.srcObject as MediaStream;
         if (existingStream.active && existingStream.getVideoTracks().length > 0 && existingStream.getVideoTracks()[0].readyState === 'live') {
            console.log('[CAMERA_PREVIEW] Active stream already present, skipping getUserMedia');
            return;
         }
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await cameraService.captureStream(streamPublishService.getFacingMode());
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          
          // Register with streamPublishService so that preview camera switching works natively
          streamPublishService.setCurrentStream(stream);
          streamPublishService.registerVideoRef(videoRef);
          
          console.log('[CAMERA_PREVIEW] Preview da câmera iniciado:', stream.getTracks().length, 'tracks');
        } catch (err) {
          console.error('[CAMERA_PREVIEW] Falha no preview da câmera:', err);
          addToastRef.current(ToastType.Error, 'Não foi possível acessar a câmera. Verifique as permissões.');
        }
      }
    }
  }, []);

  const cleanupCamera = useCallback(() => {
    const androidBridge = typeof window !== 'undefined' ? (window as any).Android : undefined;
    if (androidBridge?.releaseRTMP && !androidBridge?.isStreaming?.()) {
      androidBridge.releaseRTMP();
      return;
    }

    // Critical fix: Skip cleanup if the stream has been captured for publishing
    if (streamPublishService.isPublishing() || streamPublishService.getCurrentStream() !== null) {
      console.log('[CAMERA_PREVIEW] Skipping camera cleanup because stream is active on publish service');
      return;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Clear registration on cleanup
    streamPublishService.registerVideoRef(null);
    streamPublishService.setCurrentStream(null);
  }, []);

  // Monitor both isOpen and the presence of the video element
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
      
      // Setup short-timeout safety retrier in case the ref wasn't fully bound on the first render cycle
      const timer = setTimeout(() => {
        if (videoRef.current && !videoRef.current.srcObject) {
          initializeCamera();
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
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
