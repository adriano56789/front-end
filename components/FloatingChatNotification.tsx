import React, { useState, useRef, useCallback, useEffect } from 'react';
import { User } from '../types';
import { playMessageNotificationSound } from '../services/notificationSound';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * FloatingChatNotification — notificação flutuante estilo WhatsApp
 *
 * Comportamento:
 *   - Aparece no TOPO da tela quando chega mensagem privada
 *   - Fica PARADA (NÃO some sozinha, NÃO sobe nem sai)
 *   - Arrastar pra CIMA, BAIXO ou LADO → remove/descarta
 *   - Toque → abre a conversa completa
 *   - Só aparece pro QUEM RECEBE (particular)
 *
 * Implementação web (PWA):
 *   - Não usa Bubbles API nem NotificationCompat (isso é native)
 *   - Implementa overlay React com gestos touch/mouse
 *   - Suporta múltiplas notificações empilhadas (queue)
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface FloatingNotificationData {
  id: string;
  sender: User;
  text: string;
  timestamp: number;
}

interface FloatingChatNotificationProps {
  notifications: FloatingNotificationData[];
  onDismiss: (id: string) => void;
  onTap: (sender: User) => void;
}

/**
 * Cada banner individual — suporta drag-to-dismiss (touch + mouse) e tap.
 */
const NotificationBanner: React.FC<{
  notification: FloatingNotificationData;
  onDismiss: () => void;
  onTap: () => void;
  index: number;
}> = ({ notification, onDismiss, onTap, index }) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    startTime: 0,
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [isAnimatingIn, setIsAnimatingIn] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimatingIn(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // 🔔 Toca som de notificação quando o banner aparece (igual WhatsApp)
  useEffect(() => {
    playMessageNotificationSound();
  }, []);

  // Threshold pra considerar como "descartado" (metade da largura da tela ou 80px vertical)
  const DISMISS_THRESHOLD_X = typeof window !== 'undefined' ? window.innerWidth * 0.3 : 100;
  const DISMISS_THRESHOLD_Y = 80;

  const getClientPos = (e: TouchEvent | MouseEvent): { x: number; y: number } => {
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handleStart = useCallback((e: TouchEvent | MouseEvent) => {
    // Ignorar se clicou no botão de fechar
    const target = e.target as HTMLElement;
    if (target.closest('[data-dismiss-btn]')) return;

    const pos = getClientPos(e);
    dragState.current = {
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      isDragging: false,
      startTime: Date.now(),
    };
  }, []);

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!dragState.current.startTime) return;

    const pos = getClientPos(e);
    const dx = pos.x - dragState.current.startX;
    const dy = pos.y - dragState.current.startY;

    // Só ativar drag se moveu mais que 5px (evita cancelar taps acidentais)
    if (!dragState.current.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      dragState.current.currentX = pos.x;
      dragState.current.currentY = pos.y;
      setOffset({ x: dx, y: dy });
      // Fade out conforme arrasta
      const progress = Math.max(
        Math.abs(dx) / DISMISS_THRESHOLD_X,
        Math.abs(dy) / DISMISS_THRESHOLD_Y
      );
      setOpacity(Math.max(0, 1 - progress * 0.6));
    }
  }, [DISMISS_THRESHOLD_X, DISMISS_THRESHOLD_Y]);

  const handleEnd = useCallback((_e: TouchEvent | MouseEvent) => {
    if (!dragState.current.startTime) return;

    const dx = dragState.current.currentX - dragState.current.startX;
    const dy = dragState.current.currentY - dragState.current.startY;
    const elapsed = Date.now() - dragState.current.startTime;
    const wasDragging = dragState.current.isDragging;

    dragState.current.startTime = 0;
    dragState.current.isDragging = false;

    // Se foi tap (pouco movimento, rápido) → abrir chat
    if (!wasDragging || (Math.abs(dx) < 10 && Math.abs(dy) < 10 && elapsed < 300)) {
      setOffset({ x: 0, y: 0 });
      setOpacity(1);
      onTap();
      return;
    }

    // Se arrastou o suficiente → descartar
    if (Math.abs(dx) > DISMISS_THRESHOLD_X || Math.abs(dy) > DISMISS_THRESHOLD_Y) {
      // Animação de saída: flutuar na direção do arrasto
      const exitX = dx > 0 ? 400 : -400;
      const exitY = dy < -10 ? -200 : dy > 10 ? 200 : 0;
      setOffset({ x: exitX, y: exitY });
      setOpacity(0);
      setTimeout(onDismiss, 250);
    } else {
      // Voltar ao lugar (spring)
      setOffset({ x: 0, y: 0 });
      setOpacity(1);
    }
  }, [onDismiss, onTap, DISMISS_THRESHOLD_X, DISMISS_THRESHOLD_Y]);

  // Registrar listeners (touch + mouse)
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  const senderName = notification.sender.name || 'Usuário';
  const avatarUrl = notification.sender.avatarUrl || `https://picsum.photos/seed/${notification.sender.id || 'default'}/200/200.jpg`;
  const preview = notification.text
    ? (notification.text.length > 60 ? notification.text.slice(0, 60) + '…' : notification.text)
    : '📷 Foto';

  return (
    <div
      ref={bannerRef}
      className="floating-notif-banner"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        opacity,
        transition: dragState.current.isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        zIndex: 10000 - index,
      }}
    >
      <div className="floating-notif-inner">
        {/* Avatar */}
        <div className="floating-notif-avatar-wrap">
          <img
            src={avatarUrl}
            alt={senderName}
            className="floating-notif-avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${notification.sender.id || 'default'}/200/200.jpg`;
            }}
          />
          <span className="floating-notif-online-dot" />
        </div>

        {/* Conteúdo */}
        <div className="floating-notif-content">
          <span className="floating-notif-sender">{senderName}</span>
          <span className="floating-notif-text">{preview}</span>
        </div>

        {/* Botão fechar (X) */}
        <button
          data-dismiss-btn="true"
          onClick={(e) => {
            e.stopPropagation();
            // Animação de saída rápida pra cima
            setOffset({ x: 0, y: -150 });
            setOpacity(0);
            setTimeout(onDismiss, 200);
          }}
          className="floating-notif-close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Barra de progresso visual (indica que não some sozinha — reta, sem animação) */}
      <div className="floating-notif-indicator" />
    </div>
  );
};

/**
 * Container que gerencia a fila de notificações.
 * Renderiza no topo da tela, empilhando de cima pra baixo.
 */
const FloatingChatNotification: React.FC<FloatingChatNotificationProps> = ({
  notifications,
  onDismiss,
  onTap,
}) => {
  if (notifications.length === 0) return null;

  // Máximo 3 visíveis (as mais recentes em cima)
  const visible = notifications.slice(-3);

  return (
    <div className="floating-notif-container">
      {visible.map((notif, i) => (
        <NotificationBanner
          key={notif.id}
          notification={notif}
          index={i}
          onDismiss={() => onDismiss(notif.id)}
          onTap={() => onTap(notif.sender)}
        />
      ))}
    </div>
  );
};

export default FloatingChatNotification;
