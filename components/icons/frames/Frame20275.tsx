import React from 'react';
import FrameVapPlayer from '../../ui/FrameVapPlayer';

// 🌸 Moldura "Primavera" — pacote ZEGO 20275 (春日达人头像框).
// Usa a ANIMAÇÃO ORIGINAL do pacote (20275_bmp.mp4, VAP 608×400 @15fps, 4s,
// conteúdo 400×400 + máscara alfa) rodando em LOOP ao redor do avatar — o
// mesmo arquivo enviado, sem criar nada. O ícone estático (20275_bmp.png) é
// usado apenas como placeholder visual enquanto o vídeo carrega.
// ?v=1 quebra o cache do browser/Cloudflare caso o mp4 seja substituído.
export const Frame20275: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'w-24 h-24', style }) => (
  <>
    <FrameVapPlayer
      frameId="Frame20275"
      src="/frames/primavera.mp4?v=1"
      className={`${className} pointer-events-none select-none`}
      style={style}
    />
    <style>{`@keyframes frame-primavera-float { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(255,215,0,.35)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 10px rgba(255,215,0,.55)); } }`}</style>
  </>
);

export default Frame20275;
