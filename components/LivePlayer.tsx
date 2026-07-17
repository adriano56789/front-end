import { useRef, useEffect, useCallback } from "react";
import { SrsPlayerEngine } from "../services/SrsPlayerEngine";
import { streamPublishService } from "../services/streamPublishService";
import { EgressMonitor } from "../services/EgressMonitor";
import { getHlsPlayUrl } from "../services/mediaConfig";

interface LivePlayerProps {
  url?: string;
  streamId?: string;
  userId?: string;
  isBroadcaster?: boolean;
  egressId?: string; // ID do Egress para monitoramento (viewers)
  onPlaying?: () => void;
  onError?: () => void;
  onEgressActive?: () => void; // Chamado quando Egress fica ativo
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
  egressId,
  onPlaying,
  onError,
  onEgressActive,
  muted = false,
  onVideoRef,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Refs de proteção contra dupla inicialização (React StrictMode) ───
  const engineRef = useRef<SrsPlayerEngine | null>(null);
  const monitorRef = useRef<EgressMonitor | null>(null);
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

      console.log(`📡 [LivePlayer] [SRS] Iniciando player para stream ID: ${streamId}`);

      // Se já existe um engine rodando, não criar outro (proteção StrictMode)
      if (engineRef.current) {
        console.log('[LivePlayer] Engine já existe, ignorando dupla inicialização');
        return;
      }

      // ─── Lógica de inicialização do player HLS ───
      // Se temos um egressId, aguardar o Egress ficar ativo antes de iniciar o HLS.
      // Isso evita o erro "HLS native error" causado pelo player tentar
      // carregar o .m3u8 antes do RTMP chegar no SRS e os segmentos HLS existirem.
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
          console.log(`[LivePlayer] [SRS] Estado mudou: ${prev} -> ${next}`);
          if (next === 'playing') {
            console.log('[LivePlayer] ✅ HLS playback iniciado');
            onPlaying?.();
          } else if (next === 'error') {
            onError?.();
          }
        });

        engine.start(streamId, video).catch(err => {
          console.error('[LivePlayer] Error running SrsPlayerEngine:', err);
          onError?.();
        });

        // Guardar cleanup do unsub
        return unsubState;
      };

      let unsubState: (() => void) | undefined;

      if (egressId) {
        console.log(`[LivePlayer] Aguardando Egress ativo para iniciar HLS (egressId: ${egressId})...`);

        const monitor = new EgressMonitor(egressId, {
          onActive: (data) => {
            console.log('[LivePlayer] ✅ Egress ativo! Iniciando playback HLS...');
            onEgressActive?.();
            // Só inicia o HLS player agora, quando o RTMP já está chegando no SRS
            if (!engineRef.current) {
              unsubState = startHlsPlayer();
            }
          },
          onFailed: (data) => {
            console.error('[LivePlayer] ❌ Egress falhou:', data.error);
            onError?.();
          },
          onPollError: (err) => {
            console.warn('[LivePlayer] ⚠️ Erro no polling do Egress:', err.message);
          },
        }, {
          pollInterval: 3000,
          maxPolls: 40, // 120s de timeout
          stopOnActive: true,
        });
        monitorRef.current = monitor;
        monitor.start();
      } else {
        // Sem egressId: validar URL HLS antes de iniciar (com retry)
        // O Egress RTMP precisa de alguns segundos para enviar mídia ao SRS
        // e o SRS precisa gerar os segmentos .ts antes do .m3u8 ficar disponível.
        console.log('[LivePlayer] Sem egressId - validando URL HLS antes de iniciar...');
        
        const hlsUrl = getHlsPlayUrl(streamId);
        let attempts = 0;
        const maxAttempts = 10;
        const retryDelay = 3000;
        
        const tryStartWithValidation = async () => {
          if (instanceKey !== destroyKeyRef.current) return;
          
          try {
            console.log('[LivePlayer] Verificando HLS URL (tentativa ' + (attempts + 1) + '/' + maxAttempts + '):', hlsUrl);
            const response = await fetch(hlsUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
            
            if (response.ok) {
              const text = await response.text();
              if (text.trim().startsWith('#EXTM3U')) {
                console.log('[LivePlayer] URL HLS válida! Iniciando player...');
                if (!engineRef.current) {
                  unsubState = startHlsPlayer();
                }
                return;
              } else {
                console.warn('[LivePlayer] Resposta não é HLS válido (não começa com #EXTM3U). Retentando...');
              }
            } else {
              console.warn('[LivePlayer] HLS retornou ' + response.status + '. Aguardando Egress enviar RTMP ao SRS...');
            }
          } catch (fetchErr: any) {
            console.warn('[LivePlayer] Erro ao verificar HLS:', fetchErr.message, '. Aguardando...');
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(tryStartWithValidation, retryDelay);
          } else {
            console.error('[LivePlayer] Esgotadas tentativas de validação HLS. Iniciando player mesmo assim...');
            if (!engineRef.current) {
              unsubState = startHlsPlayer();
            }
          }
        };
        
        tryStartWithValidation();
      }

      return () => {
        if (instanceKey !== destroyKeyRef.current) return;
        console.log('[LivePlayer] Cleanup: destruindo engine e monitor...');
        if (unsubState) unsubState();
        if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
        }
        if (monitorRef.current) {
          monitorRef.current.destroy();
          monitorRef.current = null;
        }
      };

    }
  }, [streamId, isBroadcaster, muted, egressId]);

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
