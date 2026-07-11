import { useRef, useEffect, useCallback, useState } from 'react';

interface UseNativePiPOptions {
  onEnterNativePiP?: () => void;
  onLeaveNativePiP?: () => void;
  autoPiPOnBackground?: boolean; // enableWhenBackground equivalent (ZEGO)
}

export function useNativePiP(options: UseNativePiPOptions = {}) {
  const { onEnterNativePiP, onLeaveNativePiP, autoPiPOnBackground = true } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isNativePiPActive, setIsNativePiPActive] = useState(false);
  const hasUserGesture = useRef(false);

  // Check if the browser supports the standard Picture-in-Picture API
  const isSupported = typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    document.pictureInPictureEnabled;

  // Register the video element ref
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  // Request native PiP mode — uses video.requestPictureInPicture()
  // (wider support: Chrome, Edge, Safari, Firefox)
  const requestPiP = useCallback(async () => {
    if (!videoRef.current || !isSupported) return false;
    // Don't re-enter PiP if already active
    if (document.pictureInPictureElement) return true;
    try {
      await videoRef.current.requestPictureInPicture();
      setIsNativePiPActive(true);
      hasUserGesture.current = true;
      onEnterNativePiP?.();
      return true;
    } catch (err) {
      console.error('[NativePiP] Error entering PiP:', err);
      return false;
    }
  }, [isSupported, onEnterNativePiP]);

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

  // Auto-PiP when tab goes to background (ZEGO's enableWhenBackground)
  // Note: video.requestPictureInPicture() requires a user gesture (transient activation)
  // in all browsers. Auto-PiP on visibilitychange will only work if the user has
  // previously triggered PiP via a click (hasUserGesture = true) or if the browser
  // has granted automatic PiP permission to this origin.
  useEffect(() => {
    if (!autoPiPOnBackground || !isSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !isNativePiPActive && hasUserGesture.current) {
        requestPiP();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoPiPOnBackground, isSupported, requestPiP, isNativePiPActive]);

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

  return {
    setVideoRef,
    requestPiP,
    exitPiP,
    isPiPSupported: isSupported,
    isNativePiPActive,
  };
}
