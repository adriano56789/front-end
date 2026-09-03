// Hook para facilitar o uso do sistema de processamento de beleza
// Interface simples para componentes React — usa o videoProcessor diretamente.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { videoProcessor, BeautyEffectSettings } from '../services/VideoProcessor';

export interface UseBeautyProcessorOptions {
  autoInitialize?: boolean;
  onError?: (error: Error) => void;
  onInitialized?: () => void;
  onSettingsChanged?: (settings: BeautyEffectSettings) => void;
}

export interface UseBeautyProcessorReturn {
  isInitialized: boolean;
  isProcessing: boolean;
  isBeautyActive: boolean;
  currentSettings: BeautyEffectSettings;
  error: Error | null;

  initialize: (videoElement: HTMLVideoElement) => Promise<boolean>;
  startProcessing: () => MediaStream | null;
  stopProcessing: () => void;
  updateSettings: (settings: Partial<BeautyEffectSettings>) => void;
  toggleBeauty: () => boolean;
  resetSettings: () => void;
  destroy: () => void;
}

export const useBeautyProcessor = (options: UseBeautyProcessorOptions = {}): UseBeautyProcessorReturn => {
  const {
    autoInitialize = false,
    onError,
    onInitialized,
    onSettingsChanged
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<BeautyEffectSettings>({
    whitening: 0,
    smoothing: 0,
    saturation: 0,
    contrast: 0,
    babyFace: 0
  });
  const [error, setError] = useState<Error | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const initialize = useCallback(async (videoElement: HTMLVideoElement): Promise<boolean> => {
    try {
      setError(null);
      videoRef.current = videoElement;
      const success = await videoProcessor.initialize(videoElement);
      if (!success) throw new Error('Falha ao inicializar VideoProcessor');
      setIsInitialized(true);
      setIsActive(true);
      onInitialized?.();
      console.log('✅ [BEAUTY_HOOK] Processador inicializado');
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      console.error('❌ [BEAUTY_HOOK] Erro na inicialização:', error);
      return false;
    }
  }, [onInitialized, onError]);

  const startProcessing = useCallback((): MediaStream | null => {
    if (!isInitialized) {
      const errorMsg = new Error('Processador não inicializado');
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }
    try {
      setError(null);
      const processedStream = videoProcessor.startProcessing();
      setIsProcessing(true);
      console.log('✅ [BEAUTY_HOOK] Processamento iniciado');
      return processedStream;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      console.error('❌ [BEAUTY_HOOK] Erro ao iniciar processamento:', error);
      return null;
    }
  }, [isInitialized, onError]);

  const stopProcessing = useCallback(() => {
    try {
      videoProcessor.stopProcessing();
      setIsProcessing(false);
      console.log('⏹️ [BEAUTY_HOOK] Processamento parado');
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      console.error('❌ [BEAUTY_HOOK] Erro ao parar processamento:', error);
    }
  }, [onError]);

  const updateSettings = useCallback((newSettings: Partial<BeautyEffectSettings>) => {
    try {
      const updatedSettings = { ...currentSettings, ...newSettings };
      setCurrentSettings(updatedSettings);
      videoProcessor.updateBeautySettings(updatedSettings);
      onSettingsChanged?.(updatedSettings);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    }
  }, [currentSettings, onSettingsChanged, onError]);

  const toggleBeauty = useCallback((): boolean => {
    const newActive = !isActive;
    setIsActive(newActive);
    if (!newActive) {
      videoProcessor.updateBeautySettings({
        whitening: 0, smoothing: 0, saturation: 0, contrast: 0, babyFace: 0,
        wrinkleSmoothing: 0, darkCircle: 0, nasolabialFolds: 0, browDefinition: 0,
        cheekbone: 0, head: 0, eyeBrightness: 0, forehead: 0,
        acneRemoval: 0, shineReduction: 0, sharpness: 0, faceVolume3D: 0,
        noiseReduction: 0, whiteBalance: 0, teethWhitening: 0, selectedFilter: ''
      });
    } else {
      videoProcessor.updateBeautySettings(currentSettings);
    }
    return newActive;
  }, [isActive, currentSettings]);

  const resetSettings = useCallback(() => {
    const defaultSettings: BeautyEffectSettings = {
      whitening: 0, smoothing: 0, saturation: 0, contrast: 0, babyFace: 0,
      wrinkleSmoothing: 0, darkCircle: 0, nasolabialFolds: 0, browDefinition: 0,
      cheekbone: 0, head: 0, eyeBrightness: 0, forehead: 0,
      acneRemoval: 0, shineReduction: 0, sharpness: 0, faceVolume3D: 0,
      noiseReduction: 0, whiteBalance: 0, teethWhitening: 0, selectedFilter: ''
    };
    updateSettings(defaultSettings);
  }, [updateSettings]);

  const destroy = useCallback(() => {
    stopProcessing();
    videoProcessor.destroy();
    setIsInitialized(false);
    setIsProcessing(false);
    setIsActive(false);
    setError(null);
    videoRef.current = null;
  }, [stopProcessing]);

  useEffect(() => {
    if (autoInitialize && videoRef.current && !isInitialized) {
      initialize(videoRef.current);
    }
  }, [autoInitialize, isInitialized, initialize]);

  useEffect(() => {
    return () => { destroy(); };
  }, [destroy]);

  return {
    isInitialized,
    isProcessing,
    isBeautyActive: isActive,
    currentSettings,
    error,
    initialize,
    startProcessing,
    stopProcessing,
    updateSettings,
    toggleBeauty,
    resetSettings,
    destroy
  };
};

// Hook simplificado para casos básicos
export const useSimpleBeauty = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const beauty = useBeautyProcessor({
    onInitialized: () => {
      console.log('🎨 [SIMPLE_BEAUTY] Sistema pronto');
    },
    onError: (error) => {
      console.error('❌ [SIMPLE_BEAUTY] Erro:', error);
    }
  });

  // Auto-inicializar quando o vídeo estiver disponível
  useEffect(() => {
    if (videoRef.current && !beauty.isInitialized) {
      beauty.initialize(videoRef.current);
    }
  }, [videoRef.current, beauty.isInitialized, beauty.initialize]);

  return {
    isReady: beauty.isInitialized,
    isActive: beauty.isBeautyActive,
    settings: beauty.currentSettings,
    updateSettings: beauty.updateSettings,
    toggle: beauty.toggleBeauty,
    reset: beauty.resetSettings
  };
};
