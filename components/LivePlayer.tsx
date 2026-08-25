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
  const mutedRef = useRef(muted);

  // Keep mutedRef in sync without destroying the WebRTC connection
  useEffect(() => {
    mutedRef.current = muted;
    const video = videoRef.current;
    if (video && !isBroadcaster) {
      video.muted = muted;
    }
  }, [muted, isBroadcaster]);

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

      // 2. Fetch and assign the current stream — 🎨 PREFERE o stream processado
      // (WebGL com beleza) quando disponível, para o host ver os efeitos na live.
      const localStream = streamPublishService.getBeautyProcessedStream()
        || streamPublishService.getCurrentStream();
      if (localStream) {
        video.srcObject = localStream;
        video.play().catch(e => console.warn('[LivePlayer] Erro ao reproduzir preview local:', e));
        onPlaying?.();
      }

      // Check periodically: cobre stream não pronto no mount E o upgrade
      // cru → processado (quando o filtro fica pronto depois do preview).
      const checkInterval = setInterval(() => {
        const currentLocal = streamPublishService.getBeautyProcessedStream()
          || streamPublishService.getCurrentStream();
        if (currentLocal && video.srcObject !== currentLocal) {
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

      // 🔄 RESTAURAÇÃO APÓS F5: tentativas de reconexão — se a assinatura WHEP
      // falhar (sessão antiga morta / host re-negociando), tentamos de novo
      // antes de declarar erro. Evita tela preta ao recarregar a página.
      let retryCount = 0;
      const MAX_RETRIES = 3;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let destroyed = false;

      const engine = new SrsPlayerEngine({
        autoMuteRetry: true,
        userMuted: mutedRef.current,
      });

      const connect = () => {
        if (destroyed) return;
        engine.start(streamId, video).catch((err) => {
          console.error('[LivePlayer] Error running SrsPlayerEngine:', err);
          if (destroyed) return;
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`🔄 [LivePlayer] Reconectando à live (tentativa ${retryCount}/${MAX_RETRIES})...`);
            retryTimer = setTimeout(connect, 1500 * retryCount);
          } else {
            onError?.();
          }
        });
      };

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
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`🔄 [LivePlayer] Reconectando à live (tentativa ${retryCount}/${MAX_RETRIES})...`);
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(connect, 1500 * retryCount);
          } else {
            onError?.();
          }
        }
      });

      connect();

      return () => {
        destroyed = true;
        if (retryTimer) clearTimeout(retryTimer);
        unsubState();
        engine.destroy();
      };
    }
  }, [streamId, isBroadcaster]);

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
        style={{ filter: 'contrast(1.08) brightness(1.1) saturate(1.08)' }}
      />
    </div>
  );
}
