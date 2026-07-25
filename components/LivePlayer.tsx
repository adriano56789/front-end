import { useRef, useEffect } from "react";
import { SrsPlayerEngine } from "../services/SrsPlayerEngine";
import { streamPublishService } from "../services/streamPublishService";
import { getHlsPlayUrl } from "../services/mediaConfig";

interface LivePlayerProps {
  url?: string;
  streamId?: string;
  userId?: string;
  isBroadcaster?: boolean;
  onPlaying?: () => void;
  onError?: () => void;
  muted?: boolean;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}

/**
 * Tenta chamar video.play() tratando AbortError silenciosamente.
 * O AbortError é esperado quando:
 *   - O componente desmonta durante a reprodução
 *   - React StrictMode causa mount/unmount/mount
 *   - srcObject é reatribuído antes do play() resolver
 */
function safePlay(video: HTMLVideoElement): Promise<void> {
  return video.play().catch((e: DOMException) => {
    if (e.name === 'AbortError') {
      // AbortError é esperado — ignorar silenciosamente
      return;
    }
    console.warn('[LivePlayer] Erro ao reproduzir vídeo:', e);
  });
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

  // ─── Refs de proteção contra dupla inicialização (React StrictMode) ───
  const engineRef = useRef<SrsPlayerEngine | null>(null);
  const startedRef = useRef(false);
  const destroyKeyRef = useRef(0); // Incrementado a cada destroy para detectar stale closures

  // Expose video element to parent
  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  }, [onVideoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const instanceKey = ++destroyKeyRef.current;

    if (isBroadcaster) {
      // ═══ MODO BROADCASTER ═══
      console.log("[LivePlayer] Modo Broadcaster ativo. Registrando vídeo local...");

      streamPublishService.registerVideoRef(videoRef);

      // Fetch and assign the current stream
      const localStream = streamPublishService.getCurrentStream();
      if (localStream && !startedRef.current) {
        startedRef.current = true;
        video.srcObject = localStream;
        safePlay(video).then(() => onPlaying?.());
      }

      // Check periodically in case stream wasn't ready on first mount
      const checkInterval = setInterval(() => {
        // Proteção contra closures stale (React StrictMode)
        if (instanceKey !== destroyKeyRef.current) {
          clearInterval(checkInterval);
          return;
        }
        if (!startedRef.current) {
          const currentLocal = streamPublishService.getCurrentStream();
          if (currentLocal) {
            startedRef.current = true;
            video.srcObject = currentLocal;
            safePlay(video).then(() => onPlaying?.());
          }
        }
      }, 1000);

      return () => {
        clearInterval(checkInterval);
        streamPublishService.registerVideoRef(null);
        startedRef.current = false;
        // Limpar srcObject apenas se esta é a última instância
        if (instanceKey === destroyKeyRef.current || destroyKeyRef.current <= 1) {
          if (video) {
            video.srcObject = null;
          }
        }
      };
    } else {
      // ═══ MODO VIEWER ═══
      if (!streamId) return;

      console.log(`[LivePlayer] Iniciando player para stream ID: ${streamId}`);

      if (engineRef.current) {
        console.log('[LivePlayer] Engine já existe, ignorando dupla inicialização');
        return;
      }

      const startHlsPlayer = () => {
        if (instanceKey !== destroyKeyRef.current) return;

        const engine = new SrsPlayerEngine({
          autoMuteRetry: true,
          reconnectRetries: 5,
          manifestTimeout: 15000,
          verboseLogs: true,
        });
        engineRef.current = engine;

        const unsubState = engine.on('stateChanged', (prev: string, next: string) => {
          if (instanceKey !== destroyKeyRef.current) return;
          console.log(`[LivePlayer] Estado mudou: ${prev} -> ${next}`);
          if (next === 'playing') {
            console.log('[LivePlayer] HLS playback iniciado');
            onPlaying?.();
          } else if (next === 'error') {
            onError?.();
          }
        });

        engine.start(streamId, video).catch(err => {
          console.error('[LivePlayer] Error running SrsPlayerEngine:', err);
          onError?.();
        });

        return unsubState;
      };

      // Iniciar HLS player IMEDIATAMENTE — sem validação de URL.
      // A validação prévia causava delay de até 30s mostrando a capa de fundo.
      // O SrsPlayerEngine já trata erros de manifest/HLS internamente.
      console.log('[LivePlayer] Iniciando HLS player imediatamente (sem validação)...');
      const unsubState = startHlsPlayer();

      return () => {
        if (instanceKey !== destroyKeyRef.current) return;
        if (unsubState) unsubState();
        if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
        }
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
