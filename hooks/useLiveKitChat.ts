import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { livekitApi } from '../services/livekit/livekitApi';

// Maximum message size for LiveKit DataPacket (~16KB)
const MAX_MESSAGE_SIZE = 16384;
const MAX_RETRIES = 3;

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

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 2s, 4s, 8s
  return Math.min(2000 * Math.pow(2, attempt - 1), 8000);
}

export function useLiveKitChat(options: LiveKitChatOptions) {
  const { streamId, userId, disabled } = options;
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const optionsRef = useRef(options);
  const destroyedRef = useRef(false);
  const onMessageRef = useRef(options.onMessage);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    optionsRef.current = options;
    onMessageRef.current = options.onMessage;
  }, [options]);

  useEffect(() => {
    if (disabled) {
      console.log('[LiveKitChat] Desabilitado (disabled=true), pulando conexão separada. Host usará Room principal.');
      return;
    }

    let destroyed = false;
    let retryCount = 0;

    if (!streamId || !userId) {
        console.warn('[LiveKitChat] streamId ou userId ausente, pulando conexão. streamId:', streamId, 'userId:', userId);
        return;
    }
    console.log('[LiveKitChat] Iniciando conexão para live_' + streamId + ' (usuário ' + userId + ')');
    const connectWithRetry = async () => {
      while (retryCount <= MAX_RETRIES && !destroyed) {
        try {
          const { token, serverUrl } = await livekitApi.getChatToken(streamId);
          if (destroyed) { console.log('[LiveKitChat] Abortado após getToken (destroyed)'); return; }
          console.log('[LiveKitChat] Token obtido para live_' + streamId + ', serverUrl:', serverUrl);
          // Decodificar JWT para verificar grants e room
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const room = payload.video?.room || payload.room || 'DESCONHECIDA';
            const grants = payload.video || {};
            console.log('[LiveKitChat] Token decodificado - room:', room, 'grants:', JSON.stringify(grants));
            console.log('[LiveKitChat] canPublishData:', grants.canPublishData, 'canSubscribe:', grants.canSubscribe, 'canPublish:', grants.canPublish);
            console.log('[LiveKitChat] serverUrl:', serverUrl);
          } catch (e) {
            console.warn('[LiveKitChat] Erro ao decodificar token JWT:', e);
          }

          console.log('[LiveKitChat] Criando Room...');
          const room = new Room({
            adaptiveStream: false,
            dynacast: false,
          });

          // Register ALL listeners BEFORE connect() — per LiveKit best practices
          room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant, kind, topic?: string) => {
            try {
              console.log('[LiveKitChat] DataReceived recebido, topic:', topic, 'de:', participant?.identity, 'tamanho:', payload.byteLength);
              if (topic && topic !== 'livechat') { console.log('[LiveKitChat] DataReceived ignorado por topic:', topic); return; }

              const decoder = new TextDecoder();
              const text = decoder.decode(payload);
              const data = JSON.parse(text);
              console.log('[LiveKitChat] Mensagem decodificada, type:', data.type, 'id:', data.id, 'chamando onMessage');
              if (onMessageRef.current && data) {
                onMessageRef.current(data);
              } else {
                console.warn('[LiveKitChat] onMessage n\u00e3o dispon\u00edvel ou data vazio');
              }
            } catch (err) {
              console.warn('[LiveKitChat] Erro ao decodificar mensagem:', err);
            }
          });

          room.on(RoomEvent.Connected, () => {
            if (destroyed) return;
            retryCount = 0;
            setConnected(true);
            optionsRef.current.onConnected?.();
            console.log('[LiveKitChat] Conectado à sala live_' + streamId);
          });

          room.on(RoomEvent.Disconnected, () => {
            if (destroyed) return;
            setConnected(false);
            optionsRef.current.onDisconnected?.();
            if (retryCount < MAX_RETRIES) {
              const delay = getRetryDelay(retryCount + 1);
              console.warn(`[LiveKitChat] Room desconectado inesperadamente. Tentando reconectar em ${delay}ms...`);
              if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current);
              }
              reconnectTimerRef.current = window.setTimeout(() => {
                if (!destroyed) {
                  connectWithRetry();
                }
              }, delay);
            }
          });

          room.on(RoomEvent.Reconnecting, () => {
            if (destroyed) return;
            console.log('[LiveKitChat] Reconectando...');
            optionsRef.current.onReconnecting?.();
          });

          room.on(RoomEvent.Reconnected, () => {
            if (destroyed) return;
            setConnected(true);
            optionsRef.current.onReconnected?.();
            console.log('[LiveKitChat] Reconectado à sala live_' + streamId);
          });

          room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            if (destroyed) return;
            console.log('[LiveKitChat] Participante entrou:', participant.identity);
            optionsRef.current.onParticipantConnected?.(participant);
          });

          room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            if (destroyed) return;
            console.log('[LiveKitChat] Participante saiu:', participant.identity);
            optionsRef.current.onParticipantDisconnected?.(participant);
          });

          console.log('[LiveKitChat] Conectando ao LiveKit... serverUrl:', serverUrl);
          await room.connect(serverUrl, token);
          console.log('[LiveKitChat] Room.connect() bem-sucedido, room name:', room.name);
          roomRef.current = room;
          return;

        } catch (err) {
          retryCount++;
          if (destroyed) return;
          
          if (retryCount <= MAX_RETRIES) {
            const delay = getRetryDelay(retryCount);
            console.warn(
              `[LiveKitChat] Erro ao conectar (tentativa ${retryCount}/${MAX_RETRIES}), tentando novamente em ${delay}ms:`,
              err
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.warn('[LiveKitChat] Erro ao conectar após', MAX_RETRIES, 'tentativas');
            console.error('[LiveKitChat] DETALHES DO ERRO:', err instanceof Error ? err.message : JSON.stringify(err));
            if (err instanceof Error && err.stack) {
                console.error('[LiveKitChat] STACK:', err.stack.substring(0, 300));
            }
          }
        }
      }
    };

    connectWithRetry();

    return () => {
      destroyed = true;
      destroyedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (e) {
          console.warn('[LiveKitChat] Erro ao desconectar room no cleanup:', e);
        }
        roomRef.current = null;
      }
    };
  }, [streamId, userId, disabled]);

  const sendMessage = useCallback(async (payload: any): Promise<boolean> => {
    console.log('[LiveKitChat] sendMessage chamado, disabled:', disabled, 'room:', roomRef.current?.name || (roomRef.current as any)?.roomId, 'state:', roomRef.current?.state, 'mensagem:', payload.text || payload.message);
    if (disabled) {
      console.warn('[LiveKitChat] sendMessage ignorado - hook desabilitado (host usa Room principal)');
      return false;
    }
    if (!roomRef.current || roomRef.current.state !== 'connected') {
      console.warn('[LiveKitChat] sendMessage ignorado - room não conectada (state:', roomRef.current?.state, ')');
      return;
    }
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'chat_message',
        ...payload
      }));

      if (data.byteLength > MAX_MESSAGE_SIZE) {
        console.warn('[LiveKitChat] Mensagem muito grande (' + data.byteLength + ' bytes, máximo ' + MAX_MESSAGE_SIZE + ')');
        return;
      }

      console.log('[LiveKitChat] Enviando publishData (' + data.byteLength + ' bytes)...');
      roomRef.current.localParticipant.publishData(data, { reliable: true });
      console.log('[LiveKitChat] publishData enviado com sucesso');
    } catch (err) {
      console.warn('[LiveKitChat] Erro ao enviar mensagem:', err);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
  }, []);

  return {
    connected,
    sendMessage,
    disconnect,
  };
}
