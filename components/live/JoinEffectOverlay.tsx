import React, { useEffect, useRef } from 'react';
import { createVap, canWebGL } from '../../services/vap';
import { VapPlayerOptions } from '../../services/vap/vapTypes';
import type VapPlayer from '../../services/vap/vapWebglRender';
import {
  ENTRANCE_EFFECT_URL,
  ENTRANCE_VAP_CONFIG_URL,
  ENTRANCE_W,
  ENTRANCE_H,
  buildEntranceHeadData,
} from '../../services/vap/entranceVapConfig';

// 🚪 Efeito de ENTRADA na live (join effect) — igual ti.live/Bigo.
//
// Toca o pacote REAL ZEGO (entrada_efeito.mp4, VAP 752×304 @15fps) com
// transparência real via player VAP da Tencent, fundindo no próprio frame o
// nome e o avatar do usuário que entrou (slots do vapc.json). É exibido em
// faixa horizontal (750×200) no centro da tela, some sozinho no fim do vídeo.

interface JoinEffectOverlayProps {
  /** Nome do usuário que entrou na live. */
  userName: string;
  /** Avatar do usuário (slot img do VAP; opcional). */
  avatarUrl?: string;
  /**
   * Pacote de efeito enviado pelo backend no evento de entrada (VIP ativo).
   * Se omitido, usa o pacote local real (entrada_efeito.mp4, pacote 6756).
   */
  entranceEffect?: {
    id?: string;
    url?: string;
    configUrl?: string;
    w?: number;
    h?: number;
  };
  /** Chamado quando o efeito termina (fim do vídeo, erro ou timeout). */
  onEnd: () => void;
}

const JoinEffectOverlay: React.FC<JoinEffectOverlayProps> = ({ userName, avatarUrl, entranceEffect, onEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  const EFFECT_URL = entranceEffect?.url || ENTRANCE_EFFECT_URL;
  const EFFECT_CONFIG_URL = entranceEffect?.configUrl || ENTRANCE_VAP_CONFIG_URL;
  const EFFECT_W = entranceEffect?.w || ENTRANCE_W;
  const EFFECT_H = entranceEffect?.h || ENTRANCE_H;

  const CONTENT_ASPECT = EFFECT_W / EFFECT_H;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!canWebGL()) {
      onEndRef.current?.();
      return;
    }

    let destroyed = false;
    let vap: VapPlayer | null = null;

    const loadConfig = async (): Promise<VapPlayerOptions['config']> => {
      try {
        const res = await fetch(EFFECT_CONFIG_URL);
        if (!res.ok) throw new Error(`config HTTP ${res.status}`);
        return (await res.json()) as VapPlayerOptions['config'];
      } catch {
        // Fallback: geometria conhecida sem fusão (só a animação).
        return {
          info: {
            v: 2,
            w: EFFECT_W,
            h: EFFECT_H,
            videoW: 752,
            videoH: 304,
            orien: 0,
            fps: 15,
            aFrame: [0, 204, 375, 100],
            rgbFrame: [0, 0, 750, 200],
          },
          src: [],
          frame: [],
        };
      }
    };

    const start = async () => {
      if (destroyed) return;
      const config = await loadConfig();
      if (destroyed) return;
      try {
        vap = createVap({
          container,
          src: EFFECT_URL,
          config,
          fps: 15,
          width: EFFECT_W,
          height: EFFECT_H,
          mute: true,
          loop: false,
          accurate: false,
          // Fusão: nome + texto + avatar nos slots do vapc.json.
          ...buildEntranceHeadData(userName, avatarUrl),
          onLoadError: () => {
            if (!destroyed) onEndRef.current?.();
          },
        } as VapPlayerOptions);
      } catch {
        if (!destroyed) onEndRef.current?.();
        return;
      }

      vap.on('ended', () => {
        if (!destroyed) onEndRef.current?.();
      });
      vap.on('error', () => {
        if (!destroyed) onEndRef.current?.();
      });
    };
    start();

    // ⏰ Garantia: nunca deixa o efeito travado na tela (>6s sem terminar).
    const endTimeout = window.setTimeout(() => {
      if (!destroyed) onEndRef.current?.();
    }, 6000);

    return () => {
      destroyed = true;
      window.clearTimeout(endTimeout);
      try {
        vap?.destroy();
      } catch {
        /* ignore */
      }
      vap = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, avatarUrl, entranceEffect]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 5 }}>
      <div
        className="relative"
        style={{
          width: `min(90vw, calc(40vh * ${CONTENT_ASPECT}))`,
          maxWidth: '90vw',
          maxHeight: '40vh',
          aspectRatio: `${EFFECT_W} / ${EFFECT_H}`,
          animation: 'join-effect-pop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          willChange: 'transform, opacity',
        }}
      >
        <div ref={containerRef} className="w-full h-full block" style={{ zIndex: 1 }} />
        <style>{`
            @keyframes join-effect-pop {
                0% { transform: translateY(-18px) scale(0.5); opacity: 0; }
                18% { transform: translateY(0) scale(1.08); opacity: 1; }
                30% { transform: scale(0.96); opacity: 1; }
                45% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
        `}</style>
      </div>
    </div>
  );
};

export default JoinEffectOverlay;
