import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '../services/socketService';
import { api } from '../services/api';
import type { InAppNotification } from '../components/live/InAppNotificationBanner';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * Notificações in-app GLOBAIS (fora da StreamRoom).
 *
 * Conecta o Socket.IO compartilhado (socketService — o backend já coloca o
 * usuário na sala `user_{id}` ao conectar) e escuta:
 *   - unread_notification  (type 'live_started')   → faixa "X está ao vivo"
 *   - private_stream_invite                        → faixa de convite privado
 *   - live_invite          (inviteType 'pk-battle')→ faixa de convite PK
 *
 * Também aceita um evento de janela 'app:show_in_app_notification' (bridge
 * para o FCM em foreground) com { type: 'live_started', streamerId, ... }.
 * ═══════════════════════════════════════════════════════════════════════
 */

interface UseGlobalNotificationsOptions {
  enabled: boolean;              // usuário autenticado
  userId?: string;
  streamerLiveEnabled: boolean;  // configuração "streamer seguido ficou ao vivo"
  skipInvitesWhenInStream: boolean; // em uma StreamRoom o convite PK é tratado lá dentro
  onNotification: (n: InAppNotification) => void;
}

const DEDUPE_TTL_MS = 120_000;

export function useGlobalNotifications(options: UseGlobalNotificationsOptions) {
  const optsRef = useRef(options);
  const seenRef = useRef<Map<string, number>>(new Map());

  // Mantém as opções sempre frescas (evita closures antigas)
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!options.enabled || !options.userId) return;

    let disposed = false;
    let socket: Socket | null = null;
    const unsubs: Array<() => void> = [];

    const isSeen = (id: string): boolean => {
      const now = Date.now();
      const last = seenRef.current.get(id);
      if (last && now - last < DEDUPE_TTL_MS) return true;
      seenRef.current.set(id, now);
      if (seenRef.current.size > 80) {
        for (const [k, v] of seenRef.current) {
          if (now - v > DEDUPE_TTL_MS) seenRef.current.delete(k);
        }
      }
      return false;
    };

    const push = (n: InAppNotification) => {
      if (disposed) return;
      if (isSeen(n.id)) return;
      optsRef.current.onNotification(n);
    };

    const buildLive = (d: any): InAppNotification => ({
      id: `live_${d.streamId || d.streamerId || d.streamerName}`,
      type: 'live_started',
      accent: 'live',
      title: 'Ao vivo agora',
      name: d.streamerName || String(d.message || '').replace(/ está ao vivo!?$/, '') || 'Alguém',
      avatar: d.avatar || d.streamerAvatar || '',
      message: d.message || 'Iniciou uma transmissão ao vivo',
      actionLabel: 'Assistir',
      icon: '🔴',
      data: d,
    });

    const handleLiveStarted = (d: any) => {
      if (!d || d.type !== 'live_started') return;
      if (!optsRef.current.streamerLiveEnabled) return;
      if (d.streamerId && d.streamerId === optsRef.current.userId) return;
      push(buildLive(d));
    };

    const setup = async () => {
      socket = await connectSocket();
      if (disposed || !socket?.connected) return;
      const s = socket;

      const onUnread = (d: any) => handleLiveStarted(d);

      const onPrivateInvite = (d: any) => {
        if (!d) return;
        push({
          id: `priv_${d.streamId || d.fromUserId}`,
          type: 'private_invite',
          accent: 'invite',
          title: 'Convite privado',
          name: d.fromUserName || d.fromName || 'Alguém',
          avatar: d.fromUserAvatar || '',
          message: d.message || (d.streamName ? `Convidado para ${d.streamName}` : 'Te convidou para uma transmissão privada'),
          actionLabel: 'Entrar',
          icon: '🔑',
          data: d,
        });
      };

      const onLiveInvite = async (d: any) => {
        if (!d || d.inviteType !== 'pk-battle') return;
        if (optsRef.current.skipInvitesWhenInStream) return; // dentro da sala o modal de convite já cuida
        const inviteId = d.inviteId || '';
        if (!inviteId) return;
        const dedupeId = `pk_${inviteId}`;
        if (isSeen(dedupeId)) return;
        const fromId = d.fromUserId || d.from || '';
        let avatar = d.fromUserAvatar || '';
        if (fromId && !avatar) {
          try {
            const u = await api.getUser(fromId);
            avatar = u?.avatarUrl || '';
          } catch { /* segue sem avatar */ }
        }
        if (disposed) return;
        optsRef.current.onNotification({
          id: dedupeId,
          type: 'pk_invite',
          accent: 'pk',
          title: 'Desafio de PK!',
          name: d.fromUserName || d.fromName || 'Alguém',
          avatar,
          message: d.message || 'Te convidou para uma batalha PK',
          actionLabel: 'Aceitar',
          secondaryLabel: 'Recusar',
          icon: '⚔️',
          data: d,
        });
      };

      s.on('unread_notification', onUnread);
      s.on('private_stream_invite', onPrivateInvite);
      s.on('live_invite', onLiveInvite);
      unsubs.push(
        () => s.off('unread_notification', onUnread),
        () => s.off('private_stream_invite', onPrivateInvite),
        () => s.off('live_invite', onLiveInvite),
      );
    };
    setup();

    // Bridge para FCM foreground (quando o push chega com o app aberto)
    const onBridge = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      handleLiveStarted(d);
    };
    window.addEventListener('app:show_in_app_notification', onBridge);

    return () => {
      disposed = true;
      window.removeEventListener('app:show_in_app_notification', onBridge);
      unsubs.forEach(u => u());
    };
  }, [options.enabled, options.userId]);
}
