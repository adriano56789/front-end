import React, { useEffect, useState } from 'react';

/**
 * 💧 ContentWatermark — marca d'água dinâmica com o ID do usuário.
 * Repositiona sozinha para impossibilitar corte; identifica a origem
 * de qualquer vazamento de print/gravação. Invisível para a experiência:
 * o espectador vê a live/mídia 100% normal, SEM escurecimento.
 */
const POSITIONS = [
  { top: '6%', left: '6%' },
  { top: '8%', right: '8%' },
  { bottom: '18%', left: '10%' },
  { bottom: '26%', right: '6%' },
  { top: '46%', left: '42%' },
];

export const ContentWatermark: React.FC<{ userId?: string | number; intervalMs?: number }> = ({
  userId,
  intervalMs = 25000,
}) => {
  const [pos, setPos] = useState(0);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString('pt-BR'));
      setPos((p) => (p + 1) % POSITIONS.length);
    };
    tick();
    const t = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);

  return (
    <div
      style={{ ...POSITIONS[pos], transition: 'all .6s ease', opacity: 0.16 }}
      className="absolute z-[55] pointer-events-none select-none"
      aria-hidden="true"
    >
      <span className="text-white text-[10px] font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
        @{userId || 'user'} · {clock} · LiveGO
      </span>
    </div>
  );
};
