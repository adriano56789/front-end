import React, { useRef, useEffect } from 'react';
import { createVap, canWebGL, buildGiftVapConfig } from '../../services/vap';
import { getGiftVapSpec } from '../../services/vap/giftVapConfig';
import type VapPlayer from '../../services/vap/vapWebglRender';

// 🎞️ Player de animação de presente com TRANSPARÊNCIA REAL — VAP da Tencent.
//
// Os .mp4 de presentes embutem o canal ALPHA dentro do próprio frame, todos
// agora em SIDE-BY-SIDE 1500×1624:
//   - conteúdo RGB em x [0, 750) · máscara alfa em x [750, 1500)
//   (ex.: coracao.mp4, rosa_cristal.mp4 — mp4 1500×1624)
// A exceção é a Caixa de Música (musicbox.webm ZEGO 752×304).
// A geometria exata de cada gift vem de `getGiftVapSpec`.
//
// O HTML5 player não reconstrói essa transparência. O VAP (player oficial da
// Tencent, Tencent/vap → /web) renderiza num <canvas> WebGL com shader que
// amostra o conteúdo em `rgbFrame` e a luminância em `aFrame` e emite
// `vec4(rgb, alpha)` — um canvas TRANSPARENTE sobre a live, SEM fundo preto.
//
// Fonte: https://github.com/Tencent/vap  ·  MIT
// Padrão também documentado em https://jakearchibald.com/2024/video-with-transparency/

interface GiftVapPlayerProps {
  url: string;
  /** Nome do gift — usado para gerar o config VAP (fps/geometria corretos). */
  giftName: string;
  /** 🥂 Champanhe: a animação SOBE do fundo até o meio da tela (fim = centro). */
  riseFromBottom?: boolean;
  onDuration?: (ms: number) => void;
  /** Disparado quando o vídeo começa a rodar de verdade (reseta o timer de encerramento). */
  onPlaying?: () => void;
  /** Disparado quando o vídeo termina (fim REAL da animação). */
  onVideoEnd?: () => void;
  /** Disparado se o vídeo não puder ser carregado/reproduzido (fallback para partículas/ícone). */
  onLoadError?: () => void;
}

/**
 * Desenha a animação com transparência real via o player VAP da Tencent.
 *
 * O <video> existe APENAS como fonte de frames e fica OFERSCREEN (posição fixa
 * fora da viewport) — nenhum elemento de vídeo aparece na tela. O canvas
 * transparente é a única coisa visível, por cima da transmissão.
 *
 * Reporta a duração REAL do arquivo via onDuration (evento loadedmetadata) para
 * que o timer de encerramento seja exatamente o tempo do vídeo.
 */
const GiftVapPlayer: React.FC<GiftVapPlayerProps> = ({ url, giftName, riseFromBottom = false, onDuration, onPlaying, onVideoEnd, onLoadError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDurationRef = useRef(onDuration);
  useEffect(() => { onDurationRef.current = onDuration; }, [onDuration]);
  const onPlayingRef = useRef(onPlaying);
  useEffect(() => { onPlayingRef.current = onPlaying; }, [onPlaying]);
  const onVideoEndRef = useRef(onVideoEnd);
  useEffect(() => { onVideoEndRef.current = onVideoEnd; }, [onVideoEnd]);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);

  const spec = getGiftVapSpec(giftName);
  const CONTENT_W = spec.w;
  const CONTENT_H = spec.h;
  const CONTENT_ASPECT = CONTENT_W / CONTENT_H;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!canWebGL()) {
      onLoadErrorRef.current?.();
      return;
    }

    let destroyed = false;
    let vap: VapPlayer | null = null;

    const reportDuration = (v: HTMLVideoElement | undefined) => {
      if (v && Number.isFinite(v.duration) && v.duration > 0) {
        onDurationRef.current?.(Math.round(v.duration * 1000));
      }
    };

    try {
      vap = createVap({
        container,
        src: url,
        config: buildGiftVapConfig(giftName),
        fps: spec.fps,
        width: CONTENT_W,
        height: CONTENT_H,
        mute: true,
        loop: false,
        accurate: false,
        onLoadError: () => {
          if (!destroyed) onLoadErrorRef.current?.();
        },
      });
    } catch {
      if (!destroyed) onLoadErrorRef.current?.();
      return;
    }

    // ⏱ Duração exata do arquivo (metadata) — o tempo de exibição é o próprio
    // tempo do vídeo, nunca um valor fixo.
    vap.on('loadedmetadata', () => {
      if (!destroyed) reportDuration(vap?.video);
    });
    vap.on('durationchange', () => {
      if (!destroyed) reportDuration(vap?.video);
    });
    // ▶️ Começou a rodar de verdade — o timer de encerramento deve contar A
    // PARTIR DAQUI (senão o atraso de carregamento corta a animação no meio).
    vap.on('playing', () => {
      if (!destroyed) onPlayingRef.current?.();
    });
    // 🔚 Fim REAL da animação.
    vap.on('ended', () => {
      if (!destroyed) onVideoEndRef.current?.();
    });

    // ⏰ Se em 2.5s nada carregou (rede/recurso) → fallback para animação.
    const loadTimeout = window.setTimeout(() => {
      if (vap?.video && (vap.video.readyState === 0 || !vap.video.videoWidth) && !destroyed) {
        onLoadErrorRef.current?.();
      }
    }, 2500);

    return () => {
      destroyed = true;
      window.clearTimeout(loadTimeout);
      try {
        vap?.destroy();
      } catch {
        /* ignore */
      }
      vap = null;
    };
  }, [url, giftName]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 1 }}>
      <div
        className="relative"
        style={{
          // 📏 ANIMAÇÃO GRANDE centralizada: mantém a proporção do conteúdo
          // (750×1624 ≈ 0.462), limitada a ~72% da altura e 90% da largura —
          // NUNCA corta, sempre inteira no meio da tela.
          //
          // 🎬 O wrapper é centralizado por flex (o pai é fixed inset-0 +
          // flex), então os keyframes NÃO precisam de translate — só
          // escala/rotação em torno do próprio centro.
          width: `min(90vw, calc(72vh * ${CONTENT_ASPECT}))`,
          maxWidth: '90vw',
          maxHeight: '72vh',
          aspectRatio: `${CONTENT_W} / ${CONTENT_H}`,
          // 🥂 Champanhe: SOBE do fundo da tela até o centro (que é onde o
          // wrapper flex a posiciona) e para lá. Demais presentes mantêm o
          // pop-in centralizado original.
          animation: riseFromBottom
            ? 'gift-champagne-rise 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : 'gift-video-pop-impact 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          willChange: 'transform, opacity',
        }}
      >
        <div ref={containerRef} className="w-full h-full block" style={{ zIndex: 1 }} />
        <style>{`
            @keyframes gift-video-pop-impact {
                0% { transform: scale(0.35) rotate(-15deg); opacity: 0; }
                15% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                22% { transform: scale(0.95) rotate(-2deg); }
                30% { transform: scale(1) rotate(0deg); }
            }
            @keyframes gift-champagne-rise {
                0%   { transform: translateY(60vh) scale(0.55); opacity: 0; }
                16%  { transform: translateY(55vh) scale(1.08); opacity: 1; }
                38%  { transform: translateY(-2vh) scale(0.96); opacity: 1; }
                55%  { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(0) scale(1); opacity: 1; }
            }
        `}</style>
      </div>
    </div>
  );
};

export default GiftVapPlayer;
