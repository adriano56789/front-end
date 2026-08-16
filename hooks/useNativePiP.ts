import { useRef, useEffect, useCallback, useState } from 'react';

interface NativePiPConfig {
  enableWhenBackground?: boolean;    // ZEGO's enableWhenBackground
  mediaSessionMetadata?: {            // MediaSession metadata for Android PiP controls
    title?: string;
    artist?: string;
    artwork?: { src: string; sizes: string; type: string }[];
  };
}

interface UseNativePiPOptions {
  onEnterNativePiP?: () => void;
  onLeaveNativePiP?: () => void;
  config?: NativePiPConfig;
}

/**
 * Detects if PiP is supported in the current browser/WebView.
 * Android WebView (Chrome-based) supports video.requestPictureInPicture().
 */
function isPiPSupported(): boolean {
  return typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    document.pictureInPictureEnabled;
}

/**
 * Sets up MediaSession metadata for better Android PiP controls.
 * The browser's PiP window on Android shows media controls (play/pause, previous/next)
 * based on the MediaSession API metadata.
 */
function updateMediaSession(metadata?: NativePiPConfig['mediaSessionMetadata']) {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  
  const mediaSession = (navigator as any).mediaSession;
  
  if (metadata) {
    // Filter out undefined artwork entries to prevent MediaMetadata rejection
    const safeArtwork = (metadata.artwork || []).filter(a => a && a.src);
    mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Live Stream',
      artist: metadata.artist || '',
      artwork: safeArtwork,
    });
  }
}

/**
 * Hook that manages the browser native Picture-in-Picture (PiP) API.
 * 
 * ZEGO reference:
 * - pipButton → PiP button in top menu bar
 * - enableWhenBackground → auto PiP when app goes to background
 * - aspectWidth / aspectHeight → PiP window aspect ratio
 * - android.background → background widget (default black)
 * 
 * For our PWA-in-WebView architecture:
 * - Uses video.requestPictureInPicture() (works in Chrome/WebView Android)
 * - Falls back gracefully when PiP is not supported
 * - Supports user gesture requirement (auto PiP only after first manual PiP)
 * - Integrates with MediaSession for Android PiP controls
 * 
 * Nota: `enableWhenBackground` é o equivalente ZEGO (enableWhenBackground).
 * O PiP nativo no Android WebView funciona porque o WebView Android moderno
 * é baseado em Chrome e suporta video.requestPictureInPicture().
 */
export function useNativePiP(options: UseNativePiPOptions = {}) {
  const { onEnterNativePiP, onLeaveNativePiP } = options;
  const config = options.config || {};
  const { enableWhenBackground = true, mediaSessionMetadata } = config;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isNativePiPActive, setIsNativePiPActive] = useState(false);

  // Register the video element ref
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      // ✅ Minimizar automático via botão HOME/VOLTAR do celular: quando a página
      // vai para segundo plano com a live tocando, o navegador (Chrome/WebView
      // Android) abre a janelinha flutuante sozinho — sem nenhum botão extra.
      // `autoPictureInPicture` NÃO exige gesto prévio do usuário (diferente do
      // requestPictureInPicture(), que só funciona depois de um toque manual).
      (el as HTMLVideoElement & { autoPictureInPicture?: boolean }).autoPictureInPicture = enableWhenBackground;
      if (mediaSessionMetadata) {
        updateMediaSession(mediaSessionMetadata);
      }
    }
  }, [enableWhenBackground, mediaSessionMetadata]);

  /**
   * Aguarda o vídeo carregar metadata antes de entrar em PiP.
   * Retorna true se o vídeo está pronto, false se timeout.
   */
  const waitForMetadata = useCallback(async (video: HTMLVideoElement, timeoutMs = 3000): Promise<boolean> => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return true;
    
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);
      
      function onLoaded() {
        clearTimeout(timeout);
        resolve(true);
      }
      
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
    });
  }, []);

  // Request native PiP mode — uses video.requestPictureInPicture()
  // (wider support: Chrome, Edge, Safari, Firefox, Android WebView)
  const requestPiP = useCallback(async () => {
    if (!videoRef.current || !isPiPSupported()) return false;
    // Don't re-enter PiP if already active
    if (document.pictureInPictureElement) return true;
    
    try {
      const video = videoRef.current;
      
      // ⚠️ CORREÇÃO: Aguardar metadata carregar antes de PiP
      // Erro no console: "InvalidStateError: Metadata for the video element are not loaded yet"
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        console.log('[NativePiP] ⏳ Aguardando metadata do vídeo carregar...');
        const ready = await waitForMetadata(video);
        if (!ready) {
          console.warn('[NativePiP] ⚠️ Metadata não carregou dentro do timeout, tentando PiP mesmo assim...');
        }
      }
      
      await video.requestPictureInPicture();
      setIsNativePiPActive(true);
      onEnterNativePiP?.();
      return true;
    } catch (err: any) {
      // 🚫 NotAllowedError é ESPERADO: requestPictureInPicture() exige gesto do
      // usuário (Chrome/WebView Android). O autoPictureInPicture (setVideoRef)
      // é quem cobre o caso de fundo sem gesto — este fallback falha silencioso.
      if (err?.name === 'NotAllowedError' || (err && typeof err.name === 'string' && err.name.indexOf('NotAllowed') !== -1)) {
        console.info('[NativePiP] PiP ignorado: exige gesto do usuário (autoPictureInPicture cobre o caso de fundo)');
      } else {
        console.error('[NativePiP] Error entering PiP:', err);
      }
      return false;
    }
  }, [onEnterNativePiP, waitForMetadata]);

  // Exit native PiP mode
  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error('[NativePiP] Error exiting PiP:', err);
    }
    setIsNativePiPActive(false);
    onLeaveNativePiP?.();
  }, [onLeaveNativePiP]);

  // Auto-PiP when tab goes to background (ZEGO's enableWhenBackground).
  // O `autoPictureInPicture` (definido no setVideoRef) já cobre o caso do botão
  // HOME/VOLTAR. Este handler é um fallback para navegadores que ainda não
  // suportam autoPictureInPicture — tenta requestPictureInPicture() mesmo sem
  // gesto manual prévio (pode ser bloqueado, mas o autoPictureInPicture cuida).
  useEffect(() => {
    if (!enableWhenBackground || !isPiPSupported()) return;

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !isNativePiPActive) {
        requestPiP();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableWhenBackground, requestPiP, isNativePiPActive]);

  // Deduplication guard — prevents double onLeaveNativePiP calls
  const hasCalledLeaveRef = useRef(false);

  // Listen for PiP leave events on the video element (primary source)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLeavePiP = () => {
      if (hasCalledLeaveRef.current) return;
      hasCalledLeaveRef.current = true;
      setIsNativePiPActive(false);
      onLeaveNativePiP?.();
      // Reset after a short delay so future leave events can fire
      setTimeout(() => { hasCalledLeaveRef.current = false; }, 500);
    };

    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [onLeaveNativePiP]);

  // Listen for global PiP change events (safety net for browser-level PiP actions)
  useEffect(() => {
    const handleEnterPiP = () => setIsNativePiPActive(true);
    const handleLeavePiP = () => {
      if (hasCalledLeaveRef.current) return;
      hasCalledLeaveRef.current = true;
      if (!document.pictureInPictureElement) {
        setIsNativePiPActive(false);
        onLeaveNativePiP?.();
      }
      setTimeout(() => { hasCalledLeaveRef.current = false; }, 500);
    };

    document.addEventListener('enterpictureinpicture', handleEnterPiP);
    document.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      document.removeEventListener('enterpictureinpicture', handleEnterPiP);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [onLeaveNativePiP]);

  // Clean up MediaSession on unmount
  useEffect(() => {
    return () => {
      if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.metadata = null;
      }
    };
  }, []);

  return {
    setVideoRef,
    requestPiP,
    exitPiP,
    isPiPSupported: isPiPSupported(),
    isNativePiPActive,
  };
}
