import React from 'react';
import { LiveIndicatorIcon } from '../icons';

interface LiveBadgeProps {
  /** Chamado ao clicar no indicador → entra na transmissão. */
  onClick?: (e: React.MouseEvent) => void;
  /** Texto do badge (padrão "AO VIVO"). Passe '' ou false para só o ícone. */
  label?: string;
  /** Classes extras do container. */
  className?: string;
  /** Tamanho do ícone (padrão w-4 h-4). */
  iconClassName?: string;
  /** Se true, mostra o texto ao lado do ícone (padrão true). */
  showLabel?: boolean;
  /** Cor do ícone — SEMPRE verde; evite mudar para manter consistência. */
  colorClass?: string;
}

/**
 * 🔴 LiveBadge — o ÚNICO indicador "AO VIVO" do app.
 *
 * Mesmo SVG (LiveIndicatorIcon), mesma cor VERDE, mesma animação CSS
 * (live-ladder-animation) em TODOS os lugares: lista de mensagens, perfil
 * de transmissão, chat, co-host, notificações. Ao clicar → entra na live.
 * Só deve ser renderizado enquanto a pessoa estiver transmitindo.
 */
const LiveBadge: React.FC<LiveBadgeProps> = ({
  onClick,
  label = 'AO VIVO',
  className = '',
  iconClassName = 'w-4 h-4',
  showLabel = true,
  colorClass = 'text-green-400',
}) => {
  const clickable = typeof onClick === 'function';

  // Não-clicável → <span> (evita <button> aninhado dentro de outros botões/avatares)
  if (!clickable) {
    return (
      <span
        aria-label={label || 'Ao vivo'}
        title={label || 'Ao vivo'}
        className={`inline-flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-sm border border-green-400/40 px-2 py-1 shadow-[0_0_10px_rgba(34,197,94,0.35)] select-none pointer-events-none ${className}`}
      >
        <LiveIndicatorIcon className={`${iconClassName} ${colorClass}`} />
        {showLabel && label && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white leading-none whitespace-nowrap">
            {label}
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || 'Ao vivo'}
      title={label || 'Ao vivo'}
      className={`inline-flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-sm border border-green-400/40 px-2 py-1 shadow-[0_0_10px_rgba(34,197,94,0.35)] select-none cursor-pointer hover:bg-black/85 active:scale-95 transition-transform ${className}`}
    >
      <LiveIndicatorIcon className={`${iconClassName} ${colorClass}`} />
      {showLabel && label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-white leading-none whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
};

export default LiveBadge;
