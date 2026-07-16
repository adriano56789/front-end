import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import { livekitApi } from '../services/livekit/livekitApi';
import {
  getLiveKitRoom,
  connectLiveKitRoom,
  sendLiveKitData,
  disconnectLiveKitRoom,
} from '../services/livekit/livekitRoomService';

// Maximum message size for LiveKit DataPacket (~16KB)
const MAX_MESSAGE_SIZE = 16384;

interface LiveKitChatOptions {
  streamId: string;
  userId: string;
  disabled?: boolean;
  onMessage?: (data: any) => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export function useLiveKitChat(options: LiveKitChatOptions) {
  const { streamId, userId, disabled } = options;
  const [connected, setConnected] = useState(false);
  const optionsRef = useRef(options);
  const listenersRegistered = useRef(false);
  const destroyedRef = useRef(false);
  const connectAttempted = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (disabled) {
      console.log('[LiveKitChat] disabled=true, pulando conexão.');
      return;
    }

    if (!streamId || !userId) {
      console.warn('[LiveKitChat] streamId ou userId ausente. streamId:', streamId, 'userId:', userId);
      return;
    }

    destroyedRef.current = false;
    const room = getLiveKitRoom();

    // ── Registrar listeners — com cleanup adequado ──
    // Usamos funções nomeadas para poder removê-las no cleanup.
    // O optionsRef.current garante que os callbacks SEMPRE capturem a versão mais recente.
    const onDataReceived = (payload: Uint8Array, participant: any, _kind: any, topic?: string) => {
      if (destroyedRef.current) return;
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        // Aceita topic 'livechat' OU undefined — nunca filtrar
        if (optionsRef.current.onMessage && data) {
          optionsRef.current.onMessage(data);
        }
      } catch (err) {
        console.warn('[LiveKitChat] Erro ao decodificar payload:', err);
      }
    };
    const onConnected = () => {
      if (destroyedRef.current) return;
      setConnected(true);
      console.log('[LiveKitChat] ✅ Conectado à sala live_' + streamId +
        ' | participants:', room.remoteParticipants.size);
      optionsRef.current.onConnected?.();
    };
    const onDisconnected = () => {
      if (destroyedRef.current) return;
      setConnected(false);
      optionsRef.current.onDisconnected?.();
      console.warn('[LiveKitChat] Desconectado');
    };
    const onReconnecting = () => {
      if (!destroyedRef.current) {
        optionsRef.current.onReconnecting?.();
      }
    };
    const onReconnected = () => {
      if (destroyedRef.current) return;
      setConnected(true);
      console.log('[LiveKitChat] ✅ Reconectado à sala live_' + streamId);
      optionsRef.current.onReconnected?.();
    };
    const onParticipantConnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] 👤 Participante entrou:', participant.identity, '|', participant.name);
      optionsRef.current.onParticipantConnected?.(participant);
    };
    const onParticipantDisconnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] 👤 Participante saiu:', participant.identity);
      optionsRef.current.onParticipantDisconnected?.(participant);
    };

    // Só registrar se ainda não registramos (evita duplicatas em re-renders)
    if (!listenersRegistered.current) {
      listenersRegistered.current = true;
      room.on(RoomEvent.DataReceived, onDataReceived);
      room.on(RoomEvent.Connected, onConnected);
      room.on(RoomEvent.Disconnected, onDisconnected);
      room.on(RoomEvent.Reconnecting, onReconnecting);
      room.on(RoomEvent.Reconnected, onReconnected);
      room.on(RoomEvent.ParticipantConnected, onParticipantConnectedFn);
      room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnectedFn);
    }

    // ── Conectar APENAS UMA VEZ ──
    if (!connectAttempted.current && room.state === 'disconnected') {
      connectAttempted.current = true;
      console.log('[LiveKitChat] Iniciando conexão para live_' + streamId + ' (userId=' + userId + ')');

      (async () => {
        try {
          const { token, serverUrl } = await livekitApi.getChatToken(streamId);
          if (destroyedRef.current) return;

          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('[LiveKitChat] Token room:', payload.video?.room || payload.room,
              '| canPublish:', payload.video?.canPublish,
              '| canPublishData:', payload.video?.canPublishData,
              '| canSubscribe:', payload.video?.canSubscribe,
              '| identity:', payload.sub);
          } catch (_) {}

          await connectLiveKitRoom(serverUrl, token);
          if (destroyedRef.current) return;
          // O evento Connected vai setar connected = true
        } catch (err) {
          if (destroyedRef.current) return;
          console.error('[LiveKitChat] Falha na conexão:', err instanceof Error ? err.message : err);
        }
      })();
    } else if (room.state === 'connected') {
      setConnected(true);
    }

    // ── Cleanup: remover listeners e resetar estado ──
    // A Room singleton PERMANECE conectada (outros hooks podem usá-la),
    // mas removemos nossos listeners específicos para evitar vazamento.
    return () => {
      destroyedRef.current = true;
      if (listenersRegistered.current) {
        listenersRegistered.current = false;
        room.off(RoomEvent.DataReceived, onDataReceived);
        room.off(RoomEvent.Connected, onConnected);
        room.off(RoomEvent.Disconnected, onDisconnected);
        room.off(RoomEvent.Reconnecting, onReconnecting);
        room.off(RoomEvent.Reconnected, onReconnected);
        room.off(RoomEvent.ParticipantConnected, onParticipantConnectedFn);
        room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnectedFn);
      }
    };
  }, [streamId, userId, disabled]);

  const sendMessage = useCallback(async (payload: any): Promise<boolean> => {
    if (disabled) {
      console.warn('[LiveKitChat] sendMessage ignorado - disabled=true');
      return false;
    }
    const room = getLiveKitRoom();
    if (room.state !== 'connected') {
      console.warn('[LiveKitChat] sendMessage ignorado - room não conectada (state:', room.state, ')');
      return false;
    }
    try {
      return await sendLiveKitData(payload);
    } catch (err) {
      console.warn('[LiveKitChat] Erro ao enviar:', err);
      return false;
    }
  }, [disabled]);

  const disconnect = useCallback(() => {
    disconnectLiveKitRoom().then(() => {
      setConnected(false);
    }).catch(() => {});
    connectAttempted.current = false;
  }, []);

  return { connected, sendMessage, disconnect };
}
