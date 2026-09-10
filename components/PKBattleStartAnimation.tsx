import React, { useEffect, useState } from 'react';

/**
 * PKBattleStartAnimation — ⚔️ "VS" de início de batalha PK.
 *
 * Overlay rápido (~1.2s) mostrado IGUAL nos DOIS lados (quem convidou e quem
 * aceitou): duas espadas voando e se chocando no centro com a label "VS",
 * um flash e um leve tremor de tela. Auto-remove ao terminar (onDone).
 */
interface PKBattleStartAnimationProps {
  active: boolean;
  onDone: () => void;
}

const PKBattleStartAnimation: React.FC<PKBattleStartAnimationProps> = ({ active, onDone }) => {
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!active) return;
    setRunning(true);
    const t = setTimeout(() => {
      setRunning(false);
      onDone();
    }, 1300);
    return () => clearTimeout(t);
  }, [active, onDone]);

  if (!running) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes pkBattleShake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-6px, 3px); }
          40% { transform: translate(6px, -3px); }
          60% { transform: translate(-4px, -2px); }
          80% { transform: translate(4px, 2px); }
        }
        @keyframes pkSwordLeftIn {
          0% { transform: translate(-62vw, 18vh) rotate(150deg); opacity: 0; }
          12% { opacity: 1; }
          45% { transform: translate(-12px, 2px) rotate(0deg); opacity: 1; }
          60% { transform: translate(-12px, -6px) rotate(-28deg); opacity: 1; }
          100% { transform: translate(-58vw, -22vh) rotate(-60deg); opacity: 0; }
        }
        @keyframes pkSwordRightIn {
          0% { transform: translate(62vw, 18vh) rotate(-150deg); opacity: 0; }
          12% { opacity: 1; }
          45% { transform: translate(12px, 2px) rotate(0deg); opacity: 1; }
          60% { transform: translate(12px, -6px) rotate(28deg); opacity: 1; }
          100% { transform: translate(58vw, -22vh) rotate(60deg); opacity: 0; }
        }
        @keyframes pkVsPop {
          0% { transform: scale(0) rotate(-12deg); opacity: 0; }
          38% { transform: scale(1.4) rotate(2deg); opacity: 1; }
          55% { transform: scale(0.92) rotate(0deg); }
          70% { transform: scale(1.18) rotate(0deg); }
          85% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes pkFlash {
          0% { opacity: 0; transform: scale(0.2); }
          42% { opacity: 1; transform: scale(1); }
          62% { opacity: 0.85; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(2.8); }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-black/45"
        style={{ animation: 'pkBattleShake 0.55s ease-in-out' }}
      />

      <div
        className="absolute w-40 h-40 md:w-64 md:h-64 rounded-full blur-2xl"
        style={{ animation: 'pkFlash 0.9s ease-out forwards', background: 'radial-gradient(circle, rgba(255,244,190,0.95) 0%, rgba(251,191,36,0.55) 55%, rgba(249,115,22,0) 75%)' }}
      />

      <span
        className="absolute text-[17vw] md:text-[7.5rem] leading-none select-none drop-shadow-[0_0_18px_rgba(255,255,255,0.85)]"
        style={{ left: '7%', top: '50%', animation: 'pkSwordLeftIn 1.15s ease-out forwards' }}
        aria-hidden
      >⚔️</span>

      <span
        className="absolute text-[17vw] md:text-[7.5rem] leading-none select-none drop-shadow-[0_0_18px_rgba(255,255,255,0.85)]"
        style={{ right: '7%', top: '50%', animation: 'pkSwordRightIn 1.15s ease-out forwards' }}
        aria-hidden
      >⚔️</span>

      <div
        className="text-6xl md:text-[7rem] font-black italic select-none tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_5px_0_rgba(0,0,0,0.65)]"
        style={{ animation: 'pkVsPop 1.15s ease-out forwards', fontFamily: "'Arial Black', Impact, sans-serif" }}
      >
        VS
      </div>
    </div>
  );
};

export default PKBattleStartAnimation;