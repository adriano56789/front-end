import { useRef, useEffect, useState } from "react";
import { SrsPlayerEngine } from "../services/SrsPlayerEngine";
import { streamPublishService } from "../services/streamPublishService";
import { getWhepPlayUrl } from "../services/mediaConfig";

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
  url,
  streamId,
  isBroadcaster = false,
  onPlaying,
  onError,
  muted = false,
  onVideoRef,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

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

      console.log(`[LivePlayer] Iniciando player WHEP (WebRTC) para stream ID: ${streamId}`);

      if (engineRef.current) {
        console.log('[LivePlayer] Engine já existe, ignorando dupla inicialização');
        return;
      }

      // Variáveis para cleanup - declaradas no escopo do useEffect
      let unsubState: (() => void) | undefined;
      let unsubError: (() => void) | undefined;
      let unsubPlaying: (() => void) | undefined;

      const startWhepPlayer = () => {
        if (instanceKey !== destroyKeyRef.current) return;

        const engine = new SrsPlayerEngine({
          autoMuteRetry: true,
          reconnectRetries: 5,
          connectTimeout: 15000,
          verboseLogs: true,
        });
        engineRef.current = engine;

        unsubState = engine.on('stateChanged', (prev: string, next: string) => {
          if (instanceKey !== destroyKeyRef.current) return;
          console.log(`[LivePlayer] Estado mudou: ${prev} -> ${next}`);
          if (next === 'playing') {
            setPlayerError(null);
            console.log('[LivePlayer] WebRTC/WHEP playback iniciado');
            onPlaying?.();
          } else if (next === 'error') {
            onError?.();
          }
        });

        // Escutar erros detalhados do engine
        unsubError = engine.on('error', (code: string, msg: string) => {
          console.error(`[LivePlayer] SRS error ${code}:`, msg);
          setPlayerError(msg || 'Erro ao conectar na transmissão');
          onError?.();
        });

        // 🔧 Usar URL WHEP do backend se disponível, senão gerar com getWhepPlayUrl()
        // A URL do backend já tem o prefixo 'stream_' correto (ex: /api/rtc/v1/whep/?app=live&stream=stream_1951388)
        const finalUrl = url || getWhepPlayUrl(streamId);
        engine.start(streamId, video, finalUrl).catch(err => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('[LivePlayer] Error running SrsPlayerEngine:', errMsg);
          setPlayerError(errMsg || 'Falha ao carregar transmissão');
          onError?.();
        });

        // Limpar erro quando começar a tocar
        unsubPlaying = engine.on('playing', () => {
          setPlayerError(null);
        });
      };

      // Iniciar WHEP player IMEDIATAMENTE — sem validação de URL.
      console.log('[LivePlayer] Iniciando WHEP player imediatamente (WebRTC)...');
      startWhepPlayer();

      return () => {
        if (instanceKey !== destroyKeyRef.current) return;
        if (unsubState) unsubState();
        if (unsubError) unsubError();
        if (unsubPlaying) unsubPlaying();
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
      {playerError && !isBroadcaster && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center px-6">
            <div className="text-red-400 text-4xl mb-3">📡</div>
            <p className="text-white font-semibold text-sm mb-1">Stream indisponível</p>
            <p className="text-gray-400 text-xs max-w-[250px]">{playerError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
