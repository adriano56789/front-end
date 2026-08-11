import React, { useRef, useEffect } from 'react';
import { createVap, canWebGL } from '../../services/vap';
import { buildFrameVapConfig } from '../../services/vap/giftVapConfig';

// 🌸 Player VAP em LOOP para molduras de avatar animadas.
//
// Os pacotes ZEGO de molduras (ex.: 20275_bmp.mp4) embutem o canal ALPHA no
// próprio frame (conteúdo RGB + máscara em escala de cinza). O HTML5 não
// reconstrói essa transparência — o VAP renderiza num <canvas> WebGL com o
// shader oficial (amostra rgbFrame + aFrame e emite vec4(rgb, alpha)),
// deixando o fundo invisível sobre o avatar.
//
// O <video> fica OFFSCREEN (-2000px) — nenhum elemento de vídeo aparece.
// Roda em loop infinito enquanto a moldura estiver equipada.
interface FrameVapPlayerProps {
  /** Id do frame (ex.: 'Frame20275') — resolve a geometria VAP do pacote. */
  frameId: string;
  /** URL do mp4 de animação do pacote. */
  src: string;
  /** Altura/largura de exibição (CSS). Default: preenche o container pai. */
  className?: string;
  style?: React.CSSProperties;
}

const FrameVapPlayer: React.FC<FrameVapPlayerProps> = ({ frameId, src, className = 'w-full h-full', style }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!canWebGL()) {
      console.warn('[FrameVapPlayer] WebGL indisponível — moldura sem animação.');
      return;
    }

    let destroyed = false;
    let vap: ReturnType<typeof createVap> | null = null;

    try {
      vap = createVap({
        container,
        src,
        config: buildFrameVapConfig(frameId),
        fps: 15,
        mute: true,
        loop: true,
        accurate: false,
      });
    } catch (e) {
      console.warn('[FrameVapPlayer] VAP falhou:', e);
      return;
    }

    return () => {
      destroyed = true;
      try {
        vap?.destroy();
      } catch {
        /* ignore */
      }
      vap = null;
    };
  }, [frameId, src]);

  return (
    <div
      ref={containerRef}
      className={`${className} pointer-events-none select-none`}
      style={{ aspectRatio: '1 / 1', ...style }}
    />
  );
};

export default FrameVapPlayer;
