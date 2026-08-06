import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { connectSocket, emitUserJoined, emitJoinStream, onSocketEvent } from '../services/socketService';

/**
 * ═══════════════════════════════════════════════════════════════════
 * useStreamChat — Chat e presença da live (Socket.IO, sem polling)
 *
 * Arquitetura "apenas SRS":
 *   - Mídia (áudio/vídeo): SRS WebRTC (WHIP publish / WHEP play)
 *   - Chat / presentes / likes / presença: Socket.IO em tempo real
 *
 * Sincronização inicial (uma única vez por stream, ao entrar):
 *   GET  /api/streams/:id/live-messages?limit=50   → histórico de mensagens
 *   GET  /api/streams/:id/online-users             → usuários online
 *   GET  /api/gifts/stream/:streamId               → presentes recentes
 *   GET  /api/streams/:id/likes                    → total de likes
 *
 * Eventos emitidos via onMessage:
 *   { type: 'chat_message', id, user, message, avatar, level }
 *   { type: 'viewer_joined', user }
 *   { type: 'viewer_left', userId }
 *   { type: 'live_gift_received', from, gift, quantity, roomId }
 *   { type: 'stream_liked', streamId, totalLikes }
 *   { type: 'stream_unliked', streamId, totalLikes }
 * ═══════════════════════════════════════════════════════════════════
 */

export interface StreamChatMessage {
  id: string;
  type: string;
  user?: string;
  userId?: string;
  message?: string | React.ReactNode;
  text?: string;
  avatar?: string;
  avatarUrl?: string;
  level?: number;
  [key: string]: any;
}

interface StreamChatOptions {
  streamId: string;
  userId: string;
  userName?: string;
  isHost?: boolean;
  disabled?: boolean;
  pollIntervalMs?: number;
  onMessage?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: (reason?: any) => void;
}

export function useStreamChat(options: StreamChatOptions) {
  const { streamId: rawStreamId, userId, userName, disabled } = options;
  // 🔧 NORMALIZAÇÃO DO STREAM ID (crítico para o tempo real entre telas):
  // O backend remove o prefixo 'stream_' em TODAS as rotas REST
  // (router.param('id') em liveRoutes.js) e faz o broadcast de mensagens
  // e presentes para a sala SEM prefixo (io.to('1065527')).
  // O socket precisa entrar na MESMA sala para receber esses broadcasts.
  const streamId = String(rawStreamId || '').startsWith('stream_')
    ? String(rawStreamId).replace('stream_', '')
    : String(rawStreamId || '');
  const [connected, setConnected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const optionsRef = useRef(options);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const knownOnlineIdsRef = useRef<Set<string>>(new Set());
  const knownGiftIdsRef = useRef<Map<string, number>>(new Map()); // key → timestamp (dedupe com janela de tempo)
  const knownEntryIdsRef = useRef<Set<string>>(new Set()); // dedupe entradas (user:join + user_joined_stream duplicados no backend)
  const lastLikesRef = useRef<number>(-1);
  const firstPollDoneRef = useRef(false);
  const deadRoomRef = useRef(false); // live encerrada (404) — não emitir eventos da sala morta

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // ═══ Sincronização inicial (uma única vez por stream, ao entrar) ═══
  // Histórico, usuários online, presentes e likes são buscados UMA vez.
  // Tudo o que acontece depois chega em tempo real via Socket.IO.
  useEffect(() => {
    if (disabled || !streamId || !userId) return;

    firstPollDoneRef.current = false;
    knownMessageIdsRef.current.clear();
    knownOnlineIdsRef.current.clear();
    knownGiftIdsRef.current.clear();
    lastLikesRef.current = -1;
    deadRoomRef.current = false;
    console.log('[StreamChat] Sincronização inicial REST para stream', streamId);

    let cancelled = false;

    const syncMessages = async () => {
      try {
        const res: any = await api.get(`/api/streams/${streamId}/live-messages?limit=50`);
        const msgs = Array.isArray(res?.messages) ? res.messages : [];
        const newMessages: any[] = [];
        for (const m of msgs) {
          const mid = String(m._id || m.id || '');
          if (!mid) continue;
          if (!knownMessageIdsRef.current.has(mid)) {
            knownMessageIdsRef.current.add(mid);
            newMessages.push({
              type: 'chat_message',
              id: mid,
              user: m.userName || m.userId || 'Usuário',
              userId: m.userId,
              message: m.text || '',
              avatar: m.avatarUrl || '',
              level: m.level || 1,
              timestamp: m.timestamp,
            });
          }
        }
        // Ordenar por timestamp para não "pular" mensagens fora de ordem
        newMessages.sort((a, b) => (a.timestamp && b.timestamp ? String(a.timestamp).localeCompare(String(b.timestamp)) : 0));
        for (const msg of newMessages) {
          optionsRef.current.onMessage?.(msg);
        }
      } catch (err: any) {
        // 404 = live não existe mais / foi encerrada
        if (err?.response?.status === 404 || err?.status === 404) {
          deadRoomRef.current = true; // 🛑 sala morta — bloqueia replay de presentes/online
          optionsRef.current.onDisconnected?.({ code: 5 }); // análogo ROOM_DELETED
        }
      }
    };

    const syncOnlineUsers = async () => {
      try {
        const users = await api.getStreamOnlineUsers(streamId);
        if (!Array.isArray(users)) return;
        const currentIds = new Set(users.map((u: any) => u.id));
        // Conectados já presentes na abertura da live
        users.forEach((u: any) => {
          if (!knownOnlineIdsRef.current.has(u.id)) {
            knownOnlineIdsRef.current.add(u.id);
            if (!deadRoomRef.current) {
              optionsRef.current.onMessage?.({ type: 'viewer_joined', user: u });
            }
          }
        });
        knownOnlineIdsRef.current = currentIds;
      } catch { /* silencioso */ }
    };

    // 🚫 REMOVIDO: syncGifts — presentes NÃO são reexibidos ao entrar na sala.
    // O "envio de presente" só deve aparecer em tempo real (via Socket.IO),
    // quando um usuário REALMENTE envia um presente. Replay de presentes
    // antigos gerava notificações falsas na entrada da sala.

    const syncLikes = async () => {
      try {
        const likesData: any = await api.getStreamLikes(streamId);
        if (likesData && typeof likesData.totalLikes === 'number') {
          if (lastLikesRef.current !== likesData.totalLikes) {
            const changed = lastLikesRef.current !== -1;
            lastLikesRef.current = likesData.totalLikes;
            if (changed) {
              optionsRef.current.onMessage?.({
                type: 'stream_liked',
                streamId,
                totalLikes: likesData.totalLikes,
                userId: optionsRef.current.userId,
              });
            }
          }
        }
      } catch { /* silencioso */ }
    };

    (async () => {
      await Promise.all([syncMessages(), syncOnlineUsers(), syncLikes()]);
      if (!cancelled && !firstPollDoneRef.current) {
        firstPollDoneRef.current = true;
        setConnected(true);
        optionsRef.current.onConnected?.();
      }
    })();

    return () => {
      cancelled = true;
      setConnected(false);
    };
  }, [streamId, userId, disabled]);

  // Convites co-host/PK via polling (REST)
  const knownInviteIdsRef = useRef<Set<string>>(new Set());
  const knownSentInviteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (disabled || !streamId || !userId) return;

    knownInviteIdsRef.current.clear();
    knownSentInviteIdsRef.current.clear();

    const pollInvites = async () => {
      // 🪫 Economia de bateria: sem polling com o app em background
      if (typeof document !== 'undefined' && document.hidden) return;
      // Convites RECEBIDOS (sou o invitee) → disparar janela de convite
      try {
        const res: any = await api.get(`/api/live/invites/pending?username=${encodeURIComponent(userId)}`);
        const invites = Array.isArray(res?.invites) ? res.invites : [];
        for (const inv of invites) {
          const id = String(inv._id || inv.id || '');
          if (!id || knownInviteIdsRef.current.has(id)) continue;
          knownInviteIdsRef.current.add(id);
          window.dispatchEvent(new CustomEvent('livego:live_invite', {
            detail: {
              inviteId: id,
              type: inv.inviteType === 'pk-battle' ? 'pk-battle' : 'co-host',
              from: inv.inviterUsername || '',
              fromName: inv.inviterName || inv.inviterUsername || 'Usuário',
              streamId: inv.streamId || streamId,
            }
          }));
        }
      } catch { /* silencioso */ }

      // Convites ENVIADOS (sou o inviter) → detectar resposta accepted/declined/expired
      try {
        const res: any = await api.get(`/api/live/invites/sent?username=${encodeURIComponent(userId)}`);
        const invites = Array.isArray(res?.invites) ? res.invites : [];
        for (const inv of invites) {
          const id = String(inv._id || inv.id || '');
          if (!id || knownSentInviteIdsRef.current.has(id)) continue;
          knownSentInviteIdsRef.current.add(id);
          window.dispatchEvent(new CustomEvent('livego:live_invite_response', {
            detail: {
              inviteId: id,
              status: inv.status || 'declined',
              from: inv.inviteeUsername || '',
              inviteType: inv.inviteType || 'co-host',
            }
          }));
        }
      } catch { /* silencioso */ }
    };

    pollInvites();
    // 🪫 10s em vez de 3s: menos requisições REST e menos bateria
    const interval = setInterval(pollInvites, 10000);

    return () => clearInterval(interval);
  }, [streamId, userId, disabled]);

  // ═══ Socket.IO: eventos em tempo real (presentes, saldos, moedas) ═══
  // O REST polling continua como fallback, mas o Socket.IO entrega presentes
  // em tempo real via live_gift_received (emitido pela rota POST /streams/:id/gift).
  useEffect(() => {
    if (disabled || !streamId || !userId) return;

    let disposed = false;
    const unsubs: Array<() => void> = [];

    const setup = async () => {
      const s = await connectSocket();
      if (disposed || !s?.connected) return;

      setSocketConnected(true);

      // Entrar na sala da stream para receber broadcasts da sala
      emitUserJoined({
        streamId,
        userId,
        userName: userName || userId,
        userLevel: 1,
      });

      // 📡 join_stream — dispara handleJoinStream no backend (server.js), que:
      //   1. marca o usuário online na stream no banco (isOnline + currentStreamId)
      //   2. emite user_joined_stream / user:join / user_joined_chat JSON na sala
      // Esse é o ÚNICO caminho que gera eventos de entrada (o protobuf binary_data
      // do user_joined está quebrado no backend — encodeUserJoinedEvent produz 0 bytes).
      knownEntryIdsRef.current.clear();
      emitJoinStream({
        streamId,
        userId,
        userName: userName || userId,
      });

      // 🚪 ENTRADA DE ESPECTADOR → mensagem de entrada no chat
      const handleUserJoined = (data: any) => {
        if (!data || disposed) return;
        const evRoom = data.streamId || data.roomId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        const joinedId = data.userId || data.user?.user_id;
        if (!joinedId) return;
        if (String(joinedId) === String(userId)) return; // própria entrada já adicionada no mount
        const entryKey = `${streamId}_${joinedId}`;
        if (knownEntryIdsRef.current.has(entryKey)) return; // backend emite user:join + user_joined_stream p/ o mesmo join
        knownEntryIdsRef.current.add(entryKey);
        const joinedName = data.userName || data.user?.user_name || 'Usuário';
        const joinedAvatar = data.userAvatar || data.user?.user_avatar || '';
        const joinedLevel = data.userLevel || data.user?.user_level || 1;
        optionsRef.current.onMessage?.({
          type: 'live_entry',
          id: `entry_${entryKey}_${Date.now()}`, // timestamp evita colisão se o mesmo usuário sair e reentrar
          user: { id: joinedId, name: joinedName },
          userName: joinedName,
          fullUser: {
            id: joinedId,
            name: joinedName,
            avatarUrl: joinedAvatar,
            level: joinedLevel,
            gender: 'not_specified',
            age: 18,
          },
        });
      };
      unsubs.push(onSocketEvent('user_joined_stream', handleUserJoined));
      unsubs.push(onSocketEvent('user:join', handleUserJoined));
      unsubs.push(onSocketEvent('user_joined_chat', handleUserJoined));

      // 🚪 SAÍDA DE ESPECTADOR → remover da lista online
      const handleUserLeft = (data: any) => {
        if (!data || disposed) return;
        const evRoom = data.streamId || data.roomId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        const leftId = data.userId || data.user?.user_id;
        if (!leftId) return;
        knownEntryIdsRef.current.delete(`${streamId}_${leftId}`);
        optionsRef.current.onMessage?.({ type: 'viewer_left', userId: leftId });
      };
      unsubs.push(onSocketEvent('user_left_stream', handleUserLeft));
      unsubs.push(onSocketEvent('user_left', handleUserLeft));
      unsubs.push(onSocketEvent('user_left_chat', handleUserLeft));

      // 💬 Mensagens de chat em tempo real — o backend (POST /live-message e
      // send_live_message) emite live_message JSON na sala. Sem este listener,
      // espectadores NUNCA recebem as mensagens do host.
      const handleLiveMessage = (data: any) => {
        if (!data || disposed) return;
        const text = data.text || '';
        if (!text.trim()) return;
        if (String(data.userId) === String(userId)) return; // remetente já tem a msg otimista
        const mid = String(data.id || data._id || '');
        // 🔑 Dedupe entre socket e polling: se o backend não enviar id (BaseModel usa _id),
        // usa chave composta userId+texto+timestamp para nunca duplicar.
        const sockKey = mid || `${data.userId || ''}_${text}_${data.timestamp || Date.now()}`;
        if (knownMessageIdsRef.current.has(sockKey)) return;
        knownMessageIdsRef.current.add(sockKey);
        optionsRef.current.onMessage?.({
          type: 'chat_message',
          id: mid || `sock_${Date.now()}_${Math.random()}`,
          user: data.userName || data.userId || 'Usuário',
          userId: data.userId,
          message: text,
          avatar: data.avatarUrl || '',
          level: data.level || 1,
          timestamp: data.timestamp,
        });
      };
      unsubs.push(onSocketEvent('live_message', handleLiveMessage));

      // 🎁 Presentes em tempo real (compatível com o payload do polling)
      const handleGift = (data: any) => {
        if (!data || disposed) return;
        // 🔒 Filtro de sala: ignorar presentes de outras streams
        // (o socket singleton permanece na sala da stream anterior no backend)
        const evRoom = data.roomId || data.streamId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        const giftName = data.gift?.name || data.giftName || '';
        if (!giftName) return;
        const fromId = data.from?.id || data.fromUser?.id || '';
        const quantity = data.quantity || 1;
        // 🔑 Chave de dedupe com JANELA DE TEMPO (2s): o backend emite o mesmo
        // evento duas vezes (live_gift_received + gift_received) — dedupe esses,
        // MAS permite presentes idênticos repetidos do mesmo usuário (ex: x2 Coração).
        const now = Date.now();
        const key = `${fromId}_${giftName}_${quantity}`;
        const lastAt = knownGiftIdsRef.current.get(key) || 0;
        if (!deadRoomRef.current && now - lastAt > 2000) {
          knownGiftIdsRef.current.set(key, now);
          optionsRef.current.onMessage?.({
            type: 'live_gift_received',
            from: {
              id: fromId,
              name: data.from?.name || data.fromUser?.name || 'Usuário',
              avatarUrl: data.from?.avatarUrl || data.fromUser?.avatarUrl || '',
              level: data.from?.level || data.fromUser?.level || 1,
            },
            gift: data.gift || { name: giftName, icon: data.giftIcon || '🎁', price: data.giftPrice || 0 },
            quantity,
            toUser: data.toUser || { id: optionsRef.current.userId, name: optionsRef.current.userName || 'Streamer' },
            roomId: data.roomId || data.streamId || streamId,
          });
        }
      };

      unsubs.push(onSocketEvent('live_gift_received', handleGift));
      unsubs.push(onSocketEvent('gift_received', handleGift));

      // ❤️ Likes em tempo real — o backend (POST /streams/:id/like) emite
      // 'stream_liked' para a sala da stream; substitui o polling de likes.
      const handleLike = (data: any) => {
        if (!data || disposed) return;
        const evRoom = data.streamId || data.roomId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        if (typeof data.totalLikes !== 'number') return;
        lastLikesRef.current = data.totalLikes;
        optionsRef.current.onMessage?.({
          type: 'stream_liked',
          streamId: data.streamId || streamId,
          totalLikes: data.totalLikes,
          userId: data.userId || optionsRef.current.userId,
        });
      };
      unsubs.push(onSocketEvent('stream_liked', handleLike));

      const handleUnlike = (data: any) => {
        if (!data || disposed) return;
        const evRoom = data.streamId || data.roomId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        if (typeof data.totalLikes !== 'number') return;
        lastLikesRef.current = data.totalLikes;
        optionsRef.current.onMessage?.({
          type: 'stream_unliked',
          streamId: data.streamId || streamId,
          totalLikes: data.totalLikes,
          userId: data.userId || optionsRef.current.userId,
        });
      };
      unsubs.push(onSocketEvent('stream_unliked', handleUnlike));

      // 🛑 LIVE ENCERRADA — o host finalizou a transmissão (backend emite stream_ended).
      // Marca a sala como morta e avisa a UI (onDisconnected code 5) para limpar o
      // chat da tela. Sem isso, espectadores que já estão na sala não saberiam que
      // a live acabou (o 404 do REST só dispara para quem entra depois).
      const handleStreamEnded = (data: any) => {
        if (!data || disposed) return;
        const evRoom = data.streamId || data.roomId;
        if (evRoom && String(evRoom) !== String(streamId)) return;
        deadRoomRef.current = true;
        optionsRef.current.onDisconnected?.({ code: 5 });
      };
      unsubs.push(onSocketEvent('stream_ended', handleStreamEnded));

      // 💎 Saldo de diamantes / ganhos do usuário em tempo real
      unsubs.push(onSocketEvent('diamonds_updated', (data: any) => {
        if (disposed || !data) return;
        window.dispatchEvent(new CustomEvent('livego:diamonds_updated', { detail: data }));
      }));

      // 🪙 Moedas da live em tempo real
      unsubs.push(onSocketEvent('live_coins_updated', (data: any) => {
        if (disposed || !data) return;
        window.dispatchEvent(new CustomEvent('livego:live_coins_updated', { detail: data }));
      }));

      // 💰 Earnings do streamer em tempo real
      unsubs.push(onSocketEvent('earnings_updated', (data: any) => {
        if (disposed || !data) return;
        window.dispatchEvent(new CustomEvent('livego:earnings_updated', { detail: data }));
      }));
    };

    setup();

    return () => {
      disposed = true;
      unsubs.forEach((u) => u());
      knownEntryIdsRef.current.clear();
      setSocketConnected(false);
    };
  }, [streamId, userId, userName, disabled]);

  /** Envia uma mensagem para a live — via WebSocket (Socket.IO) com fallback REST */
  const sendMessage = useCallback(async (payload: any): Promise<boolean> => {
    if (disabled || !streamId) {
      console.warn('[StreamChat] sendMessage ignorado');
      return false;
    }
    const text = payload?.message || payload?.text || '';
    if (!text.trim()) return false;

    // 1) 🟢 WebSocket em tempo real: o backend (send_live_message) persiste no banco
    //    e faz broadcast 'live_message' para todos na sala da stream.
    const s = await connectSocket();
    if (s?.connected) {
      try {
        s.emit('send_live_message', {
          streamId,
          userId: optionsRef.current.userId,
          userName: optionsRef.current.userName || payload?.user || optionsRef.current.userId,
          userAvatar: payload?.avatar || '',
          userLevel: payload?.level || 1,
          text: text.trim(),
        });
        return true;
      } catch (err) {
        console.warn('[StreamChat] Erro ao enviar via socket:', err);
      }
    }

    // 2) ⚠️ Fallback: REST API (caso o Socket.IO não esteja conectado)
    try {
      await api.post(`/api/streams/${streamId}/live-message`, {
        text,
        userId: optionsRef.current.userId,
        userName: optionsRef.current.userName || payload?.user || optionsRef.current.userId,
        userAvatar: payload?.avatar || '',
        userLevel: payload?.level || 1,
      });
      return true;
    } catch (err) {
      console.warn('[StreamChat] Erro ao enviar mensagem:', err);
      return false;
    }
  }, [disabled, streamId]);

  /** Reação local (emoji flutuante) — mantida como feedback visual */
  const sendReaction = useCallback(async (_reaction: string, _userName?: string): Promise<boolean> => true, []);

  /** Indicador de digitação — no polling REST não há difusão, mantido como no-op */
  const sendTyping = useCallback(async (_isTyping: boolean, _userName?: string): Promise<boolean> => true, []);

  /** Encerra o chat (parar polling) */
  const disconnect = useCallback(() => {
    setConnected(false);
  }, []);

  // Mantidos por compatibilidade com a API anterior (no-ops seguros)
  const setMetadata = useCallback(async (_metadata?: any): Promise<void> => {}, []);
  const updateRoomMetadata = useCallback(async (_payload?: any): Promise<{ success: boolean }> => ({ success: true }), []);
  const setAttributes = useCallback(async (_attrs?: any): Promise<void> => {}, []);
  const setMicStatus = useCallback(async (_enabled?: boolean): Promise<void> => {}, []);
  const setCamStatus = useCallback(async (_enabled?: boolean): Promise<void> => {}, []);
  const setHandRaise = useCallback(async (_raised?: boolean): Promise<void> => {}, []);
  const muteTrack = useCallback(async (_trackId?: string): Promise<void> => {}, []);
  const unmuteTrack = useCallback(async (_trackId?: string): Promise<void> => {}, []);

  /** Convida um usuário para co-host via REST API */
  const inviteCoHost = useCallback(async (targetUserId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (disabled || !streamId || !targetUserId) {
      return { success: false, error: 'Convite não enviado (dados inválidos)' };
    }
    try {
      const res: any = await api.inviteFriendForCoHost(streamId, targetUserId, 'co-host');
      return { success: !!res?.success, message: res?.message || 'Convite enviado', error: res?.error };
    } catch (err: any) {
      console.warn('[StreamChat] Erro ao convidar co-host:', err);
      return { success: false, error: err?.message || 'Erro de rede ao enviar convite.' };
    }
  }, [disabled, streamId]);

  /** Convida um usuário para PK battle via REST API */
  const invitePK = useCallback(async (targetUserId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (disabled || !streamId || !targetUserId) {
      return { success: false, error: 'Convite não enviado (dados inválidos)' };
    }
    try {
      const res: any = await api.inviteFriendForCoHost(streamId, targetUserId, 'pk-battle');
      return { success: !!res?.success, message: res?.message || 'Convite enviado', error: res?.error };
    } catch (err: any) {
      console.warn('[StreamChat] Erro ao convidar para PK:', err);
      return { success: false, error: err?.message || 'Erro de rede ao enviar convite.' };
    }
  }, [disabled, streamId]);

  /** Define o papel do participante (host/co-host/viewer) no backend */
  const setParticipantRole = useCallback(async (role: string): Promise<boolean> => {
    if (disabled || !streamId) return false;
    try {
      await api.post('/api/live/role', {
        userId,
        username: userName || userId,
        name: userName || userId,
        avatarUrl: '',
        streamId,
        role,
      });
      return true;
    } catch (err) {
      console.warn('[StreamChat] Erro ao definir papel:', err);
      return false;
    }
  }, [disabled, streamId, userId, userName]);

  return {
    connected,
    socketConnected,
    connectionQualities: {} as Record<string, never>,
    sendMessage,
    sendReaction,
    sendTyping,
    disconnect,
    setMetadata,
    updateRoomMetadata,
    setAttributes,
    setParticipantRole,
    setMicStatus,
    setCamStatus,
    setHandRaise,
    inviteCoHost,
    invitePK,
    muteTrack,
    unmuteTrack,
  };
}
