import { useRef, useEffect } from "react";
import { SrsPlayerEngine } from "../services/SrsPlayerEngine";
import { streamPublishService } from "../services/streamPublishService";

interface LivePlayerProps {
  url?: string;
  streamId?: string;
  userId?: string;
  isBroadcaster?: boolean;
  onPlaying?: () => void;
  onError?: () => void;
  muted?: boolean;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  quality?: string;
}

export default function LivePlayer({
  streamId,
  isBroadcaster = false,
  onPlaying,
  onError,
  muted = false,
  onVideoRef,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Expose video element to parent
  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  }, [onVideoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isBroadcaster) {
      console.log("[LivePlayer] Modo Broadcaster ativo. Registrando vídeo local...");
      
      // 1. Register with streamPublishService so we get the mirrored style classes and state updates
      streamPublishService.registerVideoRef(videoRef);

      // 2. Fetch and assign the current stream
      const localStream = streamPublishService.getCurrentStream();
      if (localStream) {
        video.srcObject = localStream;
        video.play().catch(e => console.warn('[LivePlayer] Erro ao reproduzir preview local:', e));
        onPlaying?.();
      }

      // Check periodically in case stream wasn't ready on first mount
      const checkInterval = setInterval(() => {
        if (video.srcObject) return;
        const currentLocal = streamPublishService.getCurrentStream();
        if (currentLocal) {
          video.srcObject = currentLocal;
          video.play().catch(e => console.warn('[LivePlayer] Erro ao reproduzir preview local (retrying):', e));
          onPlaying?.();
        }
      }, 1000);

      return () => {
        clearInterval(checkInterval);
        streamPublishService.registerVideoRef(null);
        if (video) {
          video.srcObject = null;
        }
      };
    } else {
      if (!streamId) return;

      console.log(`📡 [LivePlayer] [SRS] Iniciando player para stream ID: ${streamId}`);
      console.log('📡 [SRS] Conectando ao SRS...');

      const engine = new SrsPlayerEngine({
        autoMuteRetry: true,
        userMuted: muted,
      });

      const unsubState = engine.on('stateChanged', (prev: string, next: string) => {
        console.log(`[LivePlayer] [SRS] Estado mudou: ${prev} -> ${next}`);
        if (next === 'loading') {
          console.log('⏳ [LivePlayer] Conectando à live (WHEP)...');
        } else if (next === 'playing') {
          console.log('✅ [LivePlayer] CONECTADO — reprodução ao vivo iniciada');
          console.log('✅ [LivePlayer] [SRS] SRS conectado');
          console.log('✅ [LivePlayer] [SRS] stream ativo');
          console.log('🎬 [LivePlayer] [SRS] playback iniciado');
          onPlaying?.();
        } else if (next === 'error') {
          console.error('❌ [LivePlayer] FALHA ao conectar na live (verifique se o streamer está transmitindo)');
          onError?.();
        }
      });

      engine.start(streamId, video).catch(err => {
        console.error('[LivePlayer] Error running SrsPlayerEngine:', err);
        onError?.();
      });

      return () => {
        unsubState();
        engine.destroy();
      };
    }
  }, [streamId, isBroadcaster, muted]);

  if (!isBroadcaster && !streamId) {
    return null;
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden perspective-viewport">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isBroadcaster || muted}
        controls={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
