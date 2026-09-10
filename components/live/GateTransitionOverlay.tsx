import React, { useEffect, useRef } from 'react';

// 🚪 PORTÃO de ENTRADA/SAÍDA da transmissão (split vertical / travessa horizontal).
//
// ENTRAR (espectador clica na sala): as duas folhas do portão abrem COMO SE
// fossem um portão de garagem automático de folhas duplas — a emenda vertical
// se abre NO CENTRO e cada folha desliza para a sua borda (esquerda/direita),
// revelando a transmissão que já está carregando por trás da animação.
//
// SAIR: fechamento NA TRAVESSA (horizontal) — as folhas voltam das bordas em
// direção ao centro até se encontrarem (fecha o portão diante da tela) e então
// o overlay some, revelando a lista de salas.
//
// 100% CSS/transform (GPU) — sem fetch, sem tocar em player/câmera/resolução.
interface GateTransitionOverlayProps {
  phase: 'enter' | 'exit';
  /** EXIT: dispara no instante em que o portão fecha e cobre a tela (hora de navegar). */
  onCovered?: () => void;
  /** Fim da animação → desmontar o overlay. */
  onFinished: () => void;
}

const ENTER_MS = 1500;
const EXIT_MS = 1600;
const EXIT_COVER_MS = 800;

const GATE_CSS = `
.gate-ov {
  position: fixed;
  inset: 0;
  z-index: 9950;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  background: #000;
}
/* Escurece/clareia o fundo conforme o portão abre ou fecha */
.gate-dim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 140% 100% at 50% 45%, rgba(226, 191, 122, 0.10), transparent 60%),
    #000;
  will-change: opacity;
}
.gate-dim-enter { animation: gate-dim-enter 1.5s linear forwards; }
.gate-dim-exit  { animation: gate-dim-exit 1.6s linear forwards; }

.gate-assembly {
  position: absolute;
  inset: 0;
  will-change: transform, opacity;
}
.gate-assembly-enter { animation: gate-assembly-enter 1.5s linear forwards; }
.gate-assembly-exit  { animation: gate-assembly-exit 1.6s linear forwards; }

/* Folha do portão: cada metade vertical da tela. Deslizam no eixo X. */
.gate-leaf {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.gate-leaf-left  { left: 0; }
.gate-leaf-right { right: 0; }
.gate-leaf-left.gate-leaf-enter  { animation: gate-leaf-left-enter 1.5s linear forwards; }
.gate-leaf-right.gate-leaf-enter { animation: gate-leaf-right-enter 1.5s linear forwards; }
.gate-leaf-left.gate-leaf-exit   { animation: gate-leaf-left-exit 1.6s linear forwards; }
.gate-leaf-right.gate-leaf-exit  { animation: gate-leaf-right-exit 1.6s linear forwards; }

.gate-sheet {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: #1c1c20;
  background-image:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.028) 0 2px, transparent 2px 16px),
    repeating-linear-gradient(90deg, #2b2b31 0 62px, #1e1e23 62px 88px, #26262c 88px 122px, #1b1b20 122px 152px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 -24px 48px rgba(0, 0, 0, 0.55), inset 0 24px 48px rgba(255, 255, 255, 0.03);
}
.gate-rail {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 46px;
  background: linear-gradient(180deg, #41414a, #2a2a30 70%, #232329);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5);
}
.gate-rail-b {
  top: auto;
  bottom: 0;
  background: linear-gradient(0deg, #41414a, #2a2a30 70%, #232329);
  border-bottom: none;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
/* Borda iluminada na emenda central (dobradiça visível abrindo/fechando) */
.gate-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 7px;
  background: linear-gradient(180deg, rgba(241, 215, 162, 0.95), rgba(225, 186, 114, 0.5) 55%, rgba(241, 215, 162, 0.95));
  box-shadow: 0 0 26px rgba(225, 186, 114, 0.75);
}
.gate-edge-left  { right: -3px; }
.gate-edge-right { left: -3px; }

/* ===== ENTRAR: folhas fechadas no centro deslizam PARA AS BORDAS,
         abrindo a emenda do centro → bordas (portão automático) ===== */
@keyframes gate-leaf-left-enter {
  0%   { transform: translateX(0); }
  60%  { transform: translateX(-100%); }
  100% { transform: translateX(-100%); }
}
@keyframes gate-leaf-right-enter {
  0%   { transform: translateX(0); }
  60%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}
@keyframes gate-assembly-enter {
  0%   { opacity: 1; }
  62%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes gate-dim-enter {
  0%   { opacity: 0.92; }
  55%  { opacity: 0.08; }
  100% { opacity: 0; }
}

/* ===== SAIR: folhas nas bordas deslizam AO CENTRO na horizontal (travessa),
         fechando o portão. Quando se encontram (50%) → onCovered (navegar).
         Depois o overlay some revelando a lista de salas ===== */
@keyframes gate-leaf-left-exit {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(0); }
  100% { transform: translateX(0); }
}
@keyframes gate-leaf-right-exit {
  0%   { transform: translateX(100%); }
  50%  { transform: translateX(0); }
  100% { transform: translateX(0); }
}
@keyframes gate-assembly-exit {
  0%   { opacity: 1; }
  62%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes gate-dim-exit {
  0%   { opacity: 0.08; }
  50%  { opacity: 0.96; }
  62%  { opacity: 0.96; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .gate-ov { display: none; }
}
`;

const GateTransitionOverlay: React.FC<GateTransitionOverlayProps> = ({ phase, onCovered, onFinished }) => {
  const onCoveredRef = useRef(onCovered);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => { onCoveredRef.current = onCovered; }, [onCovered]);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  const duration = phase === 'exit' ? EXIT_MS : ENTER_MS;

  useEffect(() => {
    let coveredTimer: number | undefined;
    if (phase === 'exit') {
      coveredTimer = window.setTimeout(() => onCoveredRef.current?.(), EXIT_COVER_MS);
    }
    const finishTimer = window.setTimeout(() => onFinishedRef.current?.(), duration);
    return () => {
      if (coveredTimer !== undefined) window.clearTimeout(coveredTimer);
      window.clearTimeout(finishTimer);
    };
  }, [phase, duration]);

  return (
    <div className="gate-ov" aria-hidden="true">
      <div className={`gate-dim gate-dim-${phase}`} />
      <div className={`gate-assembly gate-assembly-${phase}`}>
        <div className={`gate-leaf gate-leaf-left gate-leaf-${phase}`}>
          <div className="gate-sheet">
            <span className="gate-rail" />
            <span className="gate-rail gate-rail-b" />
            <span className="gate-edge gate-edge-left" />
          </div>
        </div>
        <div className={`gate-leaf gate-leaf-right gate-leaf-${phase}`}>
          <div className="gate-sheet">
            <span className="gate-rail" />
            <span className="gate-rail gate-rail-b" />
            <span className="gate-edge gate-edge-right" />
          </div>
        </div>
      </div>
      <style>{GATE_CSS}</style>
    </div>
  );
};

export default GateTransitionOverlay;