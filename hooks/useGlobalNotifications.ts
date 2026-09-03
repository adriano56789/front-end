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
 * para push em foreground) com { type: 'live_started', streamerId, ... }.
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

    const handleLiveStarted = async (d: any) => {
      if (!d || d.type !== 'live_started') return;
      if (!optsRef.current.streamerLiveEnabled) return;
      if (d.streamerId && d.streamerId === optsRef.current.userId) return;
      // 🖼️ FOTO SEMPRE no banner: se o evento veio SEM avatar, busca o
      // usuário na API (mesma receita do convite PK abaixo). Nada de letra
      // "L"/inicial no lugar da foto.
      let avatar = d.avatar || d.streamerAvatar || '';
      const whoId = d.streamerId || d.hostId || '';
      if (whoId && !avatar) {
        try {
          const u = await api.getUser(String(whoId));
          avatar = u?.avatarUrl || '';
        } catch { /* segue sem avatar */ }
      }
      if (disposed) return;
      push(buildLive({ ...d, avatar }));
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
          message: d.message || (d.inviteType === 'pk-battle' ? `Você recebeu um convite de PK de ${d.fromUserName || d.fromName || 'Alguém'}` : 'Te convidou para uma batalha PK'),
          actionLabel: 'Aceitar',
          secondaryLabel: 'Recusar',
          icon: '⚔️',
          data: d,
        });
      };

      // 📞 Convite de CHAMADA DE VÍDEO global: quando o convidado NÃO está
      // dentro de uma live, a notificação não chegaria pela StreamRoom. Aqui
      // mostramos um banner global com ACEITAR/RECUSAR em qualquer tela.
      const onCallInvitation = (d: any) => {
        if (!d || d.type !== 'invitation_received') return;
        if (optsRef.current.skipInvitesWhenInStream) return; // dentro da sala a StreamRoom cuida
        const inv = d.invitation || {};
        const inviteId = inv.id || '';
        if (!inviteId) return;
        const dedupeId = `call_${inviteId}`;
        if (isSeen(dedupeId)) return;
        const fromId = inv.hostId || '';
        optsRef.current.onNotification({
          id: dedupeId,
          type: 'call_invite',
          accent: 'live',
          title: 'Chamada de vídeo',
          name: inv.hostName || 'Alguém',
          avatar: (inv as any).hostAvatar || '',
          message: `${inv.hostName || 'Alguém'} quer fazer uma chamada de vídeo com você`,
          actionLabel: 'Aceitar',
          secondaryLabel: 'Recusar',
          icon: '📞',
          data: {
            invitationId: inviteId,
            hostId: fromId,
            streamId: inv.streamId || '',
          },
        });
      };

      s.on('unread_notification', onUnread);
      s.on('private_stream_invite', onPrivateInvite);
      s.on('live_invite', onLiveInvite);
      s.on('call_invitation', onCallInvitation);
      unsubs.push(
        () => s.off('unread_notification', onUnread),
        () => s.off('private_stream_invite', onPrivateInvite),
        () => s.off('live_invite', onLiveInvite),
        () => s.off('call_invitation', onCallInvitation),
      );
    };
    setup();

    // Bridge para push foreground (quando o push chega com o app aberto)
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
