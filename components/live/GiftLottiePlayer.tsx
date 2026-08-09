import React, { useRef, useEffect } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { ensureLottieJson, getLottieJson } from '../../services/LottiePreloader';

interface GiftLottiePlayerProps {
  url: string;
  /** Nome do gift — usado para as dimensões corretas do JSON (750×1624). */
  giftName: string;
  onDuration?: (ms: number) => void;
  /** Disparado quando a animação começa a rodar de verdade (reseta o timer de encerramento). */
  onPlaying?: () => void;
  /** Disparado quando a animação termina (fim REAL). */
  onVideoEnd?: () => void;
  /** Disparado se o JSON não puder ser carregado/reproduzido (fallback para partículas/ícone). */
  onLoadError?: () => void;
}

// 📐 Proporção nativa dos JSON exportados (750×1624) — usada para dimensionar
// o container sem distorção (mesma geometria dos mp4 VAP).
const GIFT_LOTTIE_DIMENSIONS: Record<string, { w: number; h: number }> = {
  'Foguete': { w: 750, h: 1624 },
  'Caixa de Música': { w: 1500, h: 1334 },
};

// 🔊 O lottie-web NÃO toca áudio por padrão: sem `audioFactory` ele usa um stub
// mudo. Este factory devolve um wrapper sobre um <Audio> REAL, que reproduz o
// som EMBUTIDO no próprio JSON (camada ty:6 → asset data URI `main_火箭.mp3`)
// em sincronia EXATA com os frames da animação — "o som que faz parte do efeito".
//
// O lottie chama: play(), pause(), seek(t)/seek(), playing(), volume(v)/volume(),
// rate(r). O volume vem em % (lv padrão = 100), então divide por 100.
const createGiftAudio = (src: string) => {
  const el = new Audio(src);
  el.preload = 'auto';

  return {
    play() {
      try {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch { /* autoplay bloqueado — silencioso */ }
    },
    pause() {
      try { el.pause(); } catch { /* ignore */ }
    },
    seek(t?: number) {
      if (typeof t === 'number') {
        try { el.currentTime = t; } catch { /* ignore */ }
        return t;
      }
      return el.currentTime;
    },
    playing() {
      return !el.paused && !el.ended;
    },
    volume(v?: number) {
      if (typeof v === 'number') {
        el.volume = Math.max(0, Math.min(1, v / 100));
      }
      return el.volume;
    },
    setVolume(v?: number) {
      if (typeof v === 'number') {
        el.volume = Math.max(0, Math.min(1, v / 100));
      }
      return el.volume;
    },
    rate(r?: number) {
      if (typeof r === 'number') el.playbackRate = r;
      return el.playbackRate;
    },
  };
};

/**
 * 🎞️ Player de animação de presente via LOTTIE (JSON direto no navegador).
 *
 * O JSON (exportado com fundo transparente) é renderizado pelo lottie-web em
 * <svg> — transparência real sobre a transmissão, sem mp4 nem canvas WebGL.
 * O áudio original fica embutido no JSON e toca via `audioFactory` em sincronia
 * com a animação (o lottie-web sozinho não reproduz áudio — usa um stub mudo).
 *
 * O JSON é PRÉ-CARREGADO (LottiePreloader) quando a sala entra, então quando o
 * presente chega a animação usa os dados já em memória → aparece sem atraso.
 *
 * Reporta a duração REAL da animação via onDuration ((op - ip) / fr * 1000)
 * para que o timer de encerramento seja exatamente o tempo da animação.
 */
const GiftLottiePlayer: React.FC<GiftLottiePlayerProps> = ({ url, giftName, onDuration, onPlaying, onVideoEnd, onLoadError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDurationRef = useRef(onDuration);
  useEffect(() => { onDurationRef.current = onDuration; }, [onDuration]);
  const onPlayingRef = useRef(onPlaying);
  useEffect(() => { onPlayingRef.current = onPlaying; }, [onPlaying]);
  const onVideoEndRef = useRef(onVideoEnd);
  useEffect(() => { onVideoEndRef.current = onVideoEnd; }, [onVideoEnd]);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);

  const dims = GIFT_LOTTIE_DIMENSIONS[giftName] || { w: 750, h: 1624 };
  const CONTENT_ASPECT = dims.w / dims.h;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let loaded = false;
    let anim: AnimationItem | null = null;
    let endTimer: number | null = null;

    const computeDurationMs = (data: { fr?: number; ip?: number; op?: number }): number | null => {
      const fr = data.fr || 25;
      const ip = data.ip || 0;
      const op = data.op || 0;
      if (op > ip && fr > 0) return Math.round(((op - ip) / fr) * 1000);
      return null;
    };

    async function start() {
      try {
        // 🚀 Dados PRÉ-CARREGADOS → sem atraso. Senão, garante o download
        // (entra no download em andamento, nunca duplica).
        let data = getLottieJson(url);
        if (!data) data = await ensureLottieJson(url);
        if (destroyed) return;

        const d = computeDurationMs(data);
        if (d) onDurationRef.current?.(d);

        anim = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: data,
          // 🖼️ Imagens do JSON (assets com `u`/`p`) são servidas do MESMO
          // diretório do .json (ex.: /animations/musicbox.json → imagens em
          // /animations/musicbox/1.webp …). Foguete é 100% vetorial/embutido.
          assetsPath: url.replace(/\.json$/, '') + '/',
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
          },
          audioFactory: createGiftAudio,
        });

        anim.addEventListener('DOMLoaded', () => {
          if (destroyed) return;
          loaded = true;
          // ⏰ Timer de segurança: se o evento `complete` não disparar, encerra
          // pelo tempo real da animação + pequena margem.
          if (d && endTimer === null) {
            endTimer = window.setTimeout(() => onVideoEndRef.current?.(), d + 200);
          }
          onPlayingRef.current?.();
        });
        anim.addEventListener('complete', () => {
          if (destroyed) return;
          if (endTimer !== null) { clearTimeout(endTimer); endTimer = null; }
          onVideoEndRef.current?.();
        });
        anim.addEventListener('error', () => {
          if (!destroyed) onLoadErrorRef.current?.();
        });
      } catch (err) {
        console.error('[GiftLottiePlayer] Falha ao carregar a animação:', err);
        if (!destroyed) onLoadErrorRef.current?.();
      }
    }

    start();

    // ⏰ Se em 2.5s nada carregou (rede/recurso) → fallback para animação.
    const loadTimeout = window.setTimeout(() => {
      if (!loaded && !destroyed) onLoadErrorRef.current?.();
    }, 2500);

    return () => {
      destroyed = true;
      if (endTimer !== null) { clearTimeout(endTimer); endTimer = null; }
      window.clearTimeout(loadTimeout);
      if (anim) {
        try { anim.destroy(); } catch { /* ignore */ }
        anim = null;
      }
    };
  }, [url]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 1 }}>
      <div
        className="relative"
        style={{
          width: `min(90vw, calc(72vh * ${CONTENT_ASPECT}))`,
          maxWidth: '90vw',
          maxHeight: '72vh',
          aspectRatio: `${dims.w} / ${dims.h}`,
          animation: 'gift-lottie-pop-impact 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          willChange: 'transform, opacity',
        }}
      >
        <div ref={containerRef} className="w-full h-full block" style={{ zIndex: 1 }} />
        <style>{`
            @keyframes gift-lottie-pop-impact {
                0% { transform: scale(0.35) rotate(-15deg); opacity: 0; }
                15% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                22% { transform: scale(0.95) rotate(-2deg); }
                30% { transform: scale(1) rotate(0deg); }
            }
        `}</style>
      </div>
    </div>
  );
};

export default GiftLottiePlayer;
