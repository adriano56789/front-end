import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { connectSocket, onSocketEvent, getSocket } from '../services/socketService';
import { HostNoticeState } from '../types';

// 🪧 Plaquinha de Notificação do Host — hook compartilhado entre StreamRoom e
// VoiceRoom. Mantém o estado sincronizado com o backend (REST + Socket.IO):
//   - GET /api/streams/:streamId/host-notice   → estado atual (late joiners)
//   - socket 'host_notice_update'              → novo estado (substitui anterior)
//   - socket 'host_notice_trigger'             → pulso de reprise (todo 15s)
// O HOST emite o pulso pelo socket a cada 15s enquanto ativo; os espectadores
// reanimam a plaquinha ao recebê-lo (com fallback local se o host sumir).
export const HOST_NOTICE_REPEAT_MS = 15000;
const HOST_NOTICE_CHECK_MS = 4000;

interface UseHostNoticeOptions {
  roomId: string;
  userId: string;
  isHost?: boolean;
  hostName?: string;
  hostAvatar?: string;
  disabled?: boolean;
}

export interface UseHostNoticeResult {
  notice: HostNoticeState | null;
  pulse: number;
  isActive: boolean;
  text: string;
  update: (partial: { active?: boolean; text?: string }) => Promise<void>;
}

export function useHostNotice(options: UseHostNoticeOptions): UseHostNoticeResult {
  const rawRoomId = String(options.roomId || '');
  // 🔧 NORMALIZAÇÃO do id (mesma regra do useStreamChat): o backend entra na
  // sala SEM o prefixo 'stream_'; aqui usamos o mesmo id para REST e socket.
  const roomId = rawRoomId.startsWith('stream_') ? rawRoomId.replace('stream_', '') : rawRoomId;
  const { userId, isHost = false, hostName = '', hostAvatar = '', disabled } = options;

  const [notice, setNotice] = useState<HostNoticeState | null>(null);
  const [pulse, setPulse] = useState(0);

  const stateRef = useRef({ roomId, userId, isHost, hostName, hostAvatar });
  const noticeRef = useRef<HostNoticeState | null>(null);
  const lastTriggerRef = useRef<number>(Date.now());

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    stateRef.current = { roomId, userId, isHost, hostName, hostAvatar };
  }, [roomId, userId, isHost, hostName, hostAvatar]);

  // ═══ Sincronização inicial (late joiners) + listeners de tempo real ═══
  useEffect(() => {
    if (disabled || !roomId || !userId) return;

    let cancelled = false;
    let offs: Array<() => void> = [];

    // Estado atual: GET único ao entrar na sala
    api.getHostNotice(roomId)
      .then((res: any) => {
        if (cancelled || !res?.success) return;
        if (res.notice) {
          setNotice((prev) => {
            if (!prev || !prev.updatedAt || !res.notice.updatedAt) return res.notice;
            // só sobrescreve com estado mais recente
            return new Date(res.notice.updatedAt).getTime() >= new Date(prev.updatedAt).getTime() ? res.notice : prev;
          });
          setPulse((p) => p + 1);
        }
      })
      .catch(() => {});

    connectSocket().then(() => {
      if (cancelled) return;
      offs.push(
        onSocketEvent('host_notice_update', (data: any) => {
          if (!data || String(data.streamId || data.roomId || '') !== roomId) return;
          if (data.notice) setNotice(data.notice as HostNoticeState);
          if (stateRef.current.isHost) return; // o host pulsa pelo próprio update()
          setPulse((p) => p + 1);
        }),
      );
      offs.push(
        onSocketEvent('host_notice_trigger', (data: any) => {
          if (!data || String(data.streamId || data.roomId || '') !== roomId) return;
          if (data.notice) setNotice(data.notice as HostNoticeState);
          lastTriggerRef.current = Date.now();
          if (stateRef.current.isHost) return; // o host emite/pulsa localmente
          setPulse((p) => p + 1);
        }),
      );
    });

    return () => {
      cancelled = true;
      offs.forEach((o) => o());
    };
  }, [roomId, userId, disabled]);

  // ═══ Reprise automática a cada 15s enquanto ativa ═══
  useEffect(() => {
    if (disabled || !roomId) return;
    const iv = setInterval(() => {
      const cur = noticeRef.current;
      if (!cur || !cur.active || !cur.text) return;
      const state = stateRef.current;
      const now = Date.now();
      if (state.isHost) {
        // HOST: re-emite e repulsa a cada 15s
        if (now - lastTriggerRef.current >= HOST_NOTICE_REPEAT_MS) {
          lastTriggerRef.current = now;
          try {
            getSocket()?.emit('host_notice_trigger', { streamId: roomId, notice: cur });
          } catch (_) {
            /* socket indisponível — segue sem broadcast */
          }
          setPulse((p) => p + 1);
        }
      } else if (now - lastTriggerRef.current > HOST_NOTICE_REPEAT_MS + 5000) {
        // ESPECTADOR: fallback local se o host não emitir os pulsos
        lastTriggerRef.current = now;
        setPulse((p) => p + 1);
      }
    }, HOST_NOTICE_CHECK_MS);
    return () => clearInterval(iv);
  }, [disabled, roomId]);

  // ═══ Atualização otimista + persistência REST (host) ═══
  const update = useCallback(async (partial: { active?: boolean; text?: string }) => {
    const state = stateRef.current;
    const cur = noticeRef.current;
    const nextActive = partial.active !== undefined ? partial.active : (cur?.active ?? false);
    const nextText = (partial.text !== undefined ? partial.text : (cur?.text ?? '')).trim();

    const base: HostNoticeState = cur || {
      roomId: state.roomId,
      hostId: state.userId,
      hostName: state.hostName,
      hostAvatar: state.hostAvatar,
      active: false,
      text: '',
    };

    // Otimista: reflete na hora no chat (host) sem esperar a rede.
    setNotice({ ...base, active: nextActive, text: nextText });
    setPulse((p) => p + 1);

    try {
      const res: any = await api.setHostNotice(state.roomId, {
        active: nextActive,
        text: nextText,
        hostId: state.userId,
        hostName: state.hostName || cur?.hostName || '',
        hostAvatar: state.hostAvatar || cur?.hostAvatar || '',
      });
      if (res?.success && res.notice) {
        setNotice(res.notice);
      }
    } catch (err) {
      console.warn('[HostNotice] erro ao salvar plaquinha:', err);
    }
  }, []);

  return {
    notice,
    pulse,
    isActive: !!notice?.active,
    text: notice?.text || '',
    update,
  };
}