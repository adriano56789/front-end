/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useGestureRecognition — Hook React para reconhecimento de gestos de mão.
 *
 * Inspirado no Tencent doc 69309:
 *   -sdk.on('handGesture', hands => ...)
 *   - hands[].gesture (Thumb_Up, Victory, etc.)
 *   - hands[].handedness (Left, Right)
 *
 * Uso:
 *   const { isReady, gestures, onGesture } = useGestureRecognition();
 *   // Inicializar quando a câmera estiver pronta:
 *   useEffect(() => { if (videoRef.current) gesture.start(videoRef.current); }, []);
 *   // Escutar gestos:
 *   useEffect(() => { return onGesture(hands => { ... }); }, []);
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  gestureService,
  GestureRecognitionService,
  HandGesture,
  GestureName,
  GestureListener,
} from '../services/GestureRecognitionService';

interface UseGestureRecognitionOptions {
  enabled?: boolean;
  autoInit?: boolean;
}

interface UseGestureRecognitionReturn {
  isReady: boolean;
  gestures: HandGesture[];
  latestGesture: HandGesture | null;
  start: (videoElement: HTMLVideoElement) => void;
  stop: () => void;
  onGesture: (listener: GestureListener) => () => void;
  setEnabled: (enabled: boolean) => void;
}

export function useGestureRecognition(
  options: UseGestureRecognitionOptions = {}
): UseGestureRecognitionReturn {
  const { enabled = true, autoInit = false } = options;

  const [isReady, setIsReady] = useState(false);
  const [gestures, setGestures] = useState<HandGesture[]>([]);
  const latestGestureRef = useRef<HandGesture | null>(null);

  // Inicializar
  useEffect(() => {
    if (autoInit) {
      gestureService.initialize().then(ok => setIsReady(ok));
    }
  }, [autoInit]);

  // Registrar listener de gestos
  useEffect(() => {
    const unsub = gestureService.onGesture((hands) => {
      setGestures(hands);
      latestGestureRef.current = hands.length > 0 ? hands[0] : null;
    });
    return unsub;
  }, []);

  // Controle enabled/disabled
  useEffect(() => {
    gestureService.setEnabled(enabled);
  }, [enabled]);

  const start = useCallback(async (videoElement: HTMLVideoElement) => {
    const ok = await gestureService.initialize();
    setIsReady(ok);
    if (ok) {
      gestureService.start(videoElement);
    }
  }, []);

  const stop = useCallback(() => {
    gestureService.stop();
  }, []);

  const onGesture = useCallback((listener: GestureListener) => {
    return gestureService.onGesture(listener);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    gestureService.setEnabled(enabled);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { gestureService.stop(); };
  }, []);

  return {
    isReady,
    gestures,
    latestGesture: latestGestureRef.current,
    start,
    stop,
    onGesture,
    setEnabled,
  };
}

/**
 * Hook simplificado — retorna só o último gesto.
 */
export function useLatestGesture(): GestureName {
  const [gesture, setGesture] = useState<GestureName>('None');

  useEffect(() => {
    const unsub = gestureService.onGesture((hands) => {
      setGesture(hands.length > 0 ? hands[0].gesture : 'None');
    });
    return unsub;
  }, []);

  return gesture;
}
