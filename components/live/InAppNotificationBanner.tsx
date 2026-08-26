import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '../icons';

const resolveAvatar = (n: InAppNotification): string => {
  const d = n.data || {};
  return n.avatar || d.fromUserAvatar || d.hostAvatar || d.avatar || '';
};

// ═══════════════════════════════════════════════════════════════════════
// Notificação flutuante in-app (faixa) — estilos TikTok/ZEGO:
//   - live_started    → "X está ao vivo" (badge LIVE, botão Assistir)
//   - private_invite  → convite para transmissão privada (botão Entrar)
//   - pk_invite       → convite para batalha PK (botões Aceitar/Recusar)
// A faixa pode ser arrastada pra cima/baixo para dispensar e some sozinha.
// ═══════════════════════════════════════════════════════════════════════

export type InAppNotificationType = 'live_started' | 'private_invite' | 'pk_invite';
export type InAppAccent = 'live' | 'invite' | 'pk';

export interface InAppNotification {
  id: string;
  type: InAppNotificationType;
  accent: InAppAccent;
  title: string;
  name: string;
  avatar: string;
  message: string;
  actionLabel: string;
  secondaryLabel?: string;
  icon?: string;
  data: any;
}

interface InAppNotificationBannerProps {
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
  onAction: (n: InAppNotification) => void;
  onSecondaryAction?: (n: InAppNotification) => void;
}

const THEMES: Record<InAppAccent, {
  ring: string;
  badgeClass: string;
  badgeText: string;
  actionClass: string;
  cardGlow: string;
}> = {
  live: {
    ring: 'from-[#ff2d55] via-[#ff6b35] to-[#ffd60a]',
    badgeClass: 'bg-[#ff2d55] text-white',
    badgeText: 'AO VIVO',
    actionClass: 'bg-gradient-to-r from-[#ff2d55] to-[#ff6b35] shadow-[0_0_14px_rgba(255,45,85,0.45)]',
    cardGlow: 'shadow-[0_10px_36px_rgba(255,45,85,0.22)]',
  },
  invite: {
    ring: 'from-[#26e3ff] via-[#7c3aed] to-[#ff2d9b]',
    badgeClass: 'bg-[#7c3aed] text-white',
    badgeText: 'CONVITE',
    actionClass: 'bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shadow-[0_0_14px_rgba(124,58,237,0.5)]',
    cardGlow: 'shadow-[0_10px_36px_rgba(124,58,237,0.25)]',
  },
  pk: {
    ring: 'from-[#ff2d55] via-[#ff9f0a] to-[#ffd60a]',
    badgeClass: 'bg-gradient-to-r from-[#ff2d55] to-[#ff9f0a] text-white',
    badgeText: 'PK ⚔️',
    actionClass: 'bg-gradient-to-r from-[#ff2d55] to-[#ff9f0a] shadow-[0_0_14px_rgba(255,159,10,0.5)]',
    cardGlow: 'shadow-[0_10px_36px_rgba(255,159,10,0.25)]',
  },
};

const AUTO_DISMISS_MS = 6500;

// Avatar do banner: foto real primeiro; "L" (letra) só quando não tem foto.
const BannerAvatar: React.FC<{ n: InAppNotification; theme: typeof THEMES.live; onOpen: () => void }> = ({ n, theme, onOpen }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveAvatar(n);
  return (
    <div
      className={`relative flex-shrink-0 rounded-full p-[2px] bg-gradient-to-tr ${theme.ring} cursor-pointer active:scale-95 transition-transform`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-black">
        {src && !failed ? (
          <img src={src} alt={n.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <img src="/android-chrome-192x192.png" alt="" className="w-10 h-10 object-cover rounded-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>
      {/* 🏷️ Quadradinho = LOGO DO APP (pedido do dono) */}
      <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-[5px] overflow-hidden border border-black/60 bg-black shadow-sm">
        <img src="/android-chrome-192x192.png" alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
    </div>
  );
};

// Visualizador em tela cheia da foto (estilo Buzzcast) — imagem original, sem erros.
const AvatarViewer: React.FC<{ n: InAppNotification; onClose: () => void }> = ({ n, onClose }) => {
  const src = resolveAvatar(n);
  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        className="fixed top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform z-10"
        aria-label="Fechar"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <CloseIcon className="w-6 h-6 text-white" />
      </button>
      <div className="px-6 pb-10 text-center" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt={n.name}
            className="max-w-[85vw] max-h-[75vh] rounded-3xl object-contain bg-black shadow-[0_0_60px_rgba(0,0,0,0.8)]"
            onError={(e) => { (e.currentTarget).style.display = 'none'; }}
          />
        ) : null}
        {!src && (
          <div className="mx-auto w-40 h-40 rounded-full flex items-center justify-center bg-zinc-800 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <img src="/android-chrome-192x192.png" alt="" className="w-24 h-24 object-cover rounded-2xl" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <p className="mt-5 text-white font-bold text-lg drop-shadow-lg">{n.name}</p>
        <p className="text-white/50 text-xs mt-1">{n.message}</p>
      </div>
    </div>
  );
};

const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  notifications,
  onDismiss,
  onAction,
  onSecondaryAction,
}) => {
  const [dragY, setDragY] = useState(0);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<InAppNotification | null>(null);
  const dragRef = useRef<{ id: string; startY: number; startX: number; moved: boolean } | null>(null);

  const visible = notifications.slice(-3);
  const topN = visible.length > 0 ? visible[visible.length - 1] : null;
  const extraCount = Math.max(0, notifications.length - visible.length);

  // Resetar o drag quando a faixa do topo muda
  useEffect(() => {
    setDragY(0);
  }, [topN?.id]);

  if (!topN) return null;

  const beginExit = (id: string) => {
    setExitingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onDismiss(id);
    }, 220);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (exitingIds.has(id)) return;
    dragRef.current = { id, startY: e.clientY, startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    const dx = e.clientX - d.startX;
    if (Math.abs(dy) > Math.abs(dx)) {
      d.moved = d.moved || Math.abs(dy) > 6;
      setDragY(dy);
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    // Arrastou pra cima ou pra baixo além do limite → dispensar
    if (Math.abs(dragY) > 70) {
      setDragY(0);
      beginExit(d.id);
    } else {
      setDragY(0);
    }
  };

  return (
    <div className="fixed top-2 inset-x-0 z-[10001] flex flex-col items-center gap-2 px-3 pointer-events-none select-none">
      <style>{`
        @keyframes inapp-slide-in { from { transform: translateY(-26px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes inapp-progress { from { width: 100%; } to { width: 0%; } }
      `}</style>

      {visible.map((n, i) => {
        const isTop = i === visible.length - 1;
        const depth = visible.length - 1 - i;
        const theme = THEMES[n.accent] || THEMES.live;
        const exiting = exitingIds.has(n.id);
        return (
          <div
            key={n.id}
            className={`w-full max-w-[380px] ${isTop ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{
              zIndex: 60 - depth,
              transform: `translateY(${isTop ? dragY : -depth * 10}px) scale(${1 - depth * 0.04})`,
              opacity: isTop ? 1 : 0.72 - depth * 0.08,
              transition: exiting
                ? 'transform 0.22s ease, opacity 0.22s ease'
                : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
            }}
          >
            <div
              className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121218]/95 backdrop-blur-xl ${theme.cardGlow}`}
              style={isTop && !exiting ? { animation: 'inapp-slide-in 0.35s cubic-bezier(0.22,1,0.36,1)' } : undefined}
              onPointerDown={isTop ? (e) => handlePointerDown(e, n.id) : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerUp : undefined}
              onClick={isTop && n.type !== 'pk_invite' && !exiting && !dragRef.current?.moved ? () => { beginExit(n.id); onAction(n); } : undefined}
            >
              {/* Hairline gradiente no topo */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.ring}`} />

              <div className="flex items-center gap-3 p-3">
                {/* Avatar com anel gradiente + badge — tocar na foto amplia (Buzzcast) */}
                <BannerAvatar n={n} theme={theme} onOpen={() => { dragRef.current = null; setViewer(n); }} />

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[13px] truncate">{n.name}</span>
                  </div>
                  <p className="text-[11px] text-white/60 truncate mt-0.5">{n.message}</p>
                </div>

                {/* Fechar */}
                <button
                  className="flex-shrink-0 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); beginExit(n.id); }}
                  aria-label="Fechar"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Ações */}
              <div className="flex gap-2 px-3 pb-3">
                <button
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-all ${theme.actionClass}`}
                  onClick={(e) => { e.stopPropagation(); beginExit(n.id); onAction(n); }}
                >
                  {n.actionLabel}
                </button>
                {n.secondaryLabel && (
                  <button
                    className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white/80 bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.97] transition-all"
                    onClick={(e) => { e.stopPropagation(); beginExit(n.id); onSecondaryAction?.(n); }}
                  >
                    {n.secondaryLabel}
                  </button>
                )}
              </div>

              {/* Barra de progresso (só na do topo) — some sozinha */}
              {isTop && !exiting && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                  <div
                    className={`h-full bg-gradient-to-r ${theme.ring}`}
                    style={{ animation: `inapp-progress ${AUTO_DISMISS_MS}ms linear forwards` }}
                    onAnimationEnd={() => beginExit(n.id)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {extraCount > 0 && (
        <div className="pointer-events-auto rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white/80 border border-white/10">
          +{extraCount} notificação{extraCount > 1 ? 'ões' : ''}
        </div>
      )}

      {/* 🔍 Foto ampliada (estilo Buzzcast) */}
      {viewer && <AvatarViewer n={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

export default InAppNotificationBanner;
