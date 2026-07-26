import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomEvent, RemoteParticipant, ConnectionQuality } from 'livekit-client';
import { livekitApi } from '../services/livekit/livekitApi';
import {
  getLiveKitRoom,
  connectLiveKitRoom,
  sendTextStream,
  registerTextStreamHandler,
  registerByteStreamHandler,
  sendFileBytes,
  sendReactionPacket,
  sendTypingPacket,
  registerRpcMethod,
  performRpc,
  disconnectLiveKitRoom,
} from '../services/livekit/livekitRoomService';

const CHAT_TOPIC = 'chat';
const CHAT_IMAGE_TOPIC = 'chat-image';

// 📡 Data Packet topics para eventos em tempo real
// Docs: https://docs.livekit.io/transport/data/packets/
const REACTION_TOPIC = 'reaction';
const TYPING_TOPIC = 'typing';

// 📡 Constantes para métodos RPC
const RPC = {
  INVITE_CO_HOST: 'inviteCoHost',
  ACCEPT_CO_HOST: 'acceptCoHost',
  REJECT_CO_HOST: 'rejectCoHost',
  END_CO_HOST: 'endCoHost',
  INVITE_PK: 'invitePK',
  ACCEPT_PK: 'acceptPK',
  REJECT_PK: 'rejectPK',
  END_PK: 'endPK',
  KICK_PARTICIPANT: 'kickParticipant',
} as const;

interface ParticipantMetadata {
  avatarUrl?: string;
  name?: string;
  level?: number;
}

interface LiveKitChatOptions {
  streamId: string;
  userId: string;
  isHost?: boolean;
  disabled?: boolean;
  onMessage?: (data: any) => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onParticipantActive?: (participant: RemoteParticipant) => void;
  onParticipantMetadataChanged?: (participant: RemoteParticipant, metadata: ParticipantMetadata) => void;
  onConnectionQualityChanged?: (quality: ConnectionQuality, participant: RemoteParticipant) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  // 📡 Track events (LiveKit docs)
  onTrackSubscribed?: (track: any, publication: any, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: any, publication: any, participant: RemoteParticipant) => void;
  onTrackMuted?: (publication: any, participant: RemoteParticipant) => void;
  onTrackUnmuted?: (publication: any, participant: RemoteParticipant) => void;

  // 📡 Byte Streams events (LiveKit docs: https://docs.livekit.io/transport/data/byte-streams/)
  onFileReceived?: (data: { fileName: string; fileSize: number; mimeType: string; bytes: ArrayBuffer; sender: any }) => void;
  onFileProgress?: (progress: number) => void;

  // 📡 RPC callbacks — chamados quando OUTRO participante invoca o método
  onInviteCoHost?: (callerIdentity: string, payload: any) => Promise<string>;
  onAcceptCoHost?: (callerIdentity: string, payload: any) => Promise<string>;
  onRejectCoHost?: (callerIdentity: string, payload: any) => Promise<string>;
  onEndCoHost?: (callerIdentity: string, payload: any) => Promise<string>;
  onInvitePK?: (callerIdentity: string, payload: any) => Promise<string>;
  onAcceptPK?: (callerIdentity: string, payload: any) => Promise<string>;
  onRejectPK?: (callerIdentity: string, payload: any) => Promise<string>;
  onEndPK?: (callerIdentity: string, payload: any) => Promise<string>;
  onKickParticipant?: (callerIdentity: string, payload: any) => Promise<string>;

  // 📡 State Synchronization — sincronização de estado via Participant Attributes e Room Metadata
  // Docs: https://docs.livekit.io/transport/data/state/
  onAttributesChanged?: (changed: Record<string, string>, participant: any) => void;
  onRoomMetadataChanged?: (metadata: string) => void;

  // 📡 Data Packet events — pequenos eventos em tempo real
  // Docs: https://docs.livekit.io/transport/data/packets/
  onReaction?: (data: {
    reaction: string;
    fromUserId: string;
    fromName: string;
    streamId: string;
    timestamp: number;
  }) => void;
  onTyping?: (data: {
    fromUserId: string;
    fromName: string;
    streamId: string;
    isTyping: boolean;
    timestamp: number;
  }) => void;
}

export function useLiveKitChat(options: LiveKitChatOptions) {
  const { streamId, userId, isHost, disabled } = options;
  const [connected, setConnected] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const optionsRef = useRef(options);
  const listenersRegistered = useRef(false);
  const rpcRegistered = useRef(false);
  const destroyedRef = useRef(false);
  const connectAttempted = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (disabled) {
      console.log('[LiveKitChat] disabled=true, skipping connection.');
      return;
    }

    if (!streamId || !userId) {
      console.warn('[LiveKitChat] streamId or userId missing. streamId:', streamId, 'userId:', userId);
      return;
    }

    destroyedRef.current = false;
    const room = getLiveKitRoom();

    // 📡 Text Streams: Receber mensagens via registerTextStreamHandler
    // Docs: https://docs.livekit.io/transport/data/text-streams/
    const onTextStream = async (reader: any, participant: any) => {
      if (destroyedRef.current) return;
      try {
        let fullText = '';
        for await (const chunk of reader) {
          fullText += chunk;
        }
        if (!fullText) return;
        const data = JSON.parse(fullText);
        if (optionsRef.current.onMessage && data) {
          optionsRef.current.onMessage(data);
        }
      } catch (err) {
        console.warn('[LiveKitChat] Error processing text stream:', err);
      }
    };

    // 📡 Byte Streams: Receber imagens/arquivos via registerByteStreamHandler
    // Docs: https://docs.livekit.io/transport/data/byte-streams/
    const onByteStream = async (reader: any, participant: any) => {
      if (destroyedRef.current) return;
      try {
        const info = reader.info || {};
        const fileName = info.name || `file_${Date.now()}`;
        const fileSize = info.size || 0;
        const mimeType = info.mimeType || 'application/octet-stream';

        // 📡 Progresso de download (se suportado pelo reader)
        if (typeof reader.onProgress === 'function') {
          reader.onProgress = (pct: number) => {
            optionsRef.current.onFileProgress?.(pct);
          };
        }

        // 📡 Ler chunks incrementalmente (funciona com sendFile e streamBytes)
        const chunks: Uint8Array[] = [];
        for await (const chunk of reader) {
          chunks.push(chunk);
        }
        if (chunks.length === 0) return;

        // 🔄 Juntar todos os chunks em um único Uint8Array
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const bytes = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }

        const fileData = {
          fileName,
          fileSize,
          mimeType,
          bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          sender: participant,
        };

        // Callback da prop (se houver)
        const onFileReceived = optionsRef.current.onFileReceived;
        if (typeof onFileReceived === 'function') {
          onFileReceived(fileData);
        }

        // 📡 Disparar evento global para componentes como ChatScreen
        try {
          window.dispatchEvent(new CustomEvent('byteStream:fileReceived', {
            detail: fileData,
          }));
        } catch (_) {}
      } catch (err) {
        console.warn('[LiveKitChat] Error processing byte stream:', err);
      }
    };
    const onConnected = () => {
      if (destroyedRef.current) return;
      setConnected(true);
      console.log('[LiveKitChat] Connected to room live_' + streamId +
        ' | participants:', room.remoteParticipants.size);

      // [DIAGNOSTIC] Log all remote participants and their tracks
      if (room.remoteParticipants.size > 0) {
        console.log('[LiveKitChat] === Remote participants in room (initial sync) ===');
        room.remoteParticipants.forEach((p) => {
          const videoTracks = Array.from(p.videoTrackPublications.values());
          const audioTracks = Array.from(p.audioTrackPublications.values());
          console.log('[LiveKitChat]   ', p.identity, '| tracks:',
            videoTracks.length + audioTracks.length,
            '(video:', videoTracks.length, 'audio:', audioTracks.length, ')');
          videoTracks.forEach(t => {
            console.log('[LiveKitChat]     [video] track:', t.trackSid,
              '| source:', t.source, '| subscribed:', t.isSubscribed, '| muted:', t.isMuted);
          });
          audioTracks.forEach(t => {
            console.log('[LiveKitChat]     [audio] track:', t.trackSid,
              '| source:', t.source, '| subscribed:', t.isSubscribed, '| muted:', t.isMuted);
          });
        });
        console.log('[LiveKitChat] ====================================');

        // 🔄 Sincronizar lista de participantes EXISTENTES para o callback onParticipantConnected
        // Isso garante que, ao entrar na sala, o usuário veja todos que já estão nela,
        // não apenas os que entrarem depois.
        room.remoteParticipants.forEach(participant => {
          optionsRef.current.onParticipantConnected?.(participant);
        });
      } else {
        console.log('[LiveKitChat]   (no remote participants yet - waiting for host...)');
      }

      // 📡 RPC: Registrar métodos APÓS conectar (requer conexão ativa)
      // Docs: https://docs.livekit.io/transport/data/rpc/
      if (!rpcRegistered.current) {
        rpcRegistered.current = true;
        const registerRpc = (method: string, cb: ((caller: string, payload: any) => Promise<string>) | undefined) => {
          if (typeof cb !== 'function') return;
          registerRpcMethod(method, async (invocationData: any) => {
            const { callerIdentity, payload } = invocationData;
            let parsedPayload: any = {};
            try { parsedPayload = JSON.parse(payload); } catch { parsedPayload = { raw: payload }; }
            return await cb(callerIdentity, parsedPayload);
          });
        };
        registerRpc(RPC.INVITE_CO_HOST, optionsRef.current.onInviteCoHost);
        registerRpc(RPC.ACCEPT_CO_HOST, optionsRef.current.onAcceptCoHost);
        registerRpc(RPC.REJECT_CO_HOST, optionsRef.current.onRejectCoHost);
        registerRpc(RPC.END_CO_HOST, optionsRef.current.onEndCoHost);
        registerRpc(RPC.INVITE_PK, optionsRef.current.onInvitePK);
        registerRpc(RPC.ACCEPT_PK, optionsRef.current.onAcceptPK);
        registerRpc(RPC.REJECT_PK, optionsRef.current.onRejectPK);
        registerRpc(RPC.END_PK, optionsRef.current.onEndPK);
        registerRpc(RPC.KICK_PARTICIPANT, optionsRef.current.onKickParticipant);
      }

      optionsRef.current.onConnected?.();
    };
    const onDisconnected = () => {
      if (destroyedRef.current) return;
      setConnected(false);
      connectAttempted.current = false; // 🔄 Permitir reconexão
      setReconnectKey(k => k + 1); // Forçar re-avaliação do effect
      optionsRef.current.onDisconnected?.();
      console.warn('[LiveKitChat] Disconnected - reconnect permitido');
    };
    const onReconnecting = () => {
      if (!destroyedRef.current) {
        optionsRef.current.onReconnecting?.();
      }
    };
    const onReconnected = () => {
      if (destroyedRef.current) return;
      setConnected(true);
      console.log('[LiveKitChat] Reconnected to room live_' + streamId);
      optionsRef.current.onReconnected?.();
    };
    // 📡 ParticipantActive: media connection established (LiveKit docs: corresponds to participant_joined webhook)
    const onParticipantActiveFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant active (media connected):', participant.identity);
      optionsRef.current.onParticipantActive?.(participant);
    };

    const onConnectionQualityChangedFn = (quality: ConnectionQuality, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      optionsRef.current.onConnectionQualityChanged?.(quality, participant);
    };

    const onParticipantConnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant joined:', participant.identity, '|', participant.name, '| metadata:', participant.metadata);
      optionsRef.current.onParticipantConnected?.(participant);
    };

    const onParticipantMetadataChangedFn = (prevMetadata: string, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant metadata changed:', participant.identity, '| metadata:', participant.metadata);
      try {
        const metadata: ParticipantMetadata = participant.metadata ? JSON.parse(participant.metadata) : {};
        optionsRef.current.onParticipantMetadataChanged?.(participant, metadata);
      } catch {
        // Ignore malformed metadata
      }
    };
    const onParticipantDisconnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant left:', participant.identity);
      optionsRef.current.onParticipantDisconnected?.(participant);
    };
    // 📡 TrackSubscribed: when viewer receives/subscribes to a remote track (LiveKit docs)
    const onTrackSubscribedFn = (track: any, publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      const kind = track?.kind || publication?.kind || 'unknown';
      const trackSid = publication?.trackSid || 'unknown';
      const source = publication?.source || 'unknown';
      console.log('[LiveKitChat] TrackSubscribed |', kind,
        '| sid:', trackSid, '| source:', source,
        '| participant:', participant.identity, '| muted:', publication?.isMuted);
      optionsRef.current.onTrackSubscribed?.(track, publication, participant);
    };
    // 📡 TrackUnsubscribed: when viewer loses a remote track (LiveKit docs)
    const onTrackUnsubscribedFn = (track: any, publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] TrackUnsubscribed |', track?.kind || publication?.kind || 'unknown',
        '| sid:', publication?.trackSid || 'unknown',
        '| participant:', participant.identity);
      optionsRef.current.onTrackUnsubscribed?.(track, publication, participant);
    };
    // 📡 TrackMuted: when a remote participant mutes a track (LiveKit docs)
    const onTrackMutedFn = (publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] TrackMuted |', publication?.kind || 'unknown', '| participant:', participant.identity);
      optionsRef.current.onTrackMuted?.(publication, participant);
    };
    // 📡 TrackUnmuted: when a remote participant unmutes a track (LiveKit docs)
    const onTrackUnmutedFn = (publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] TrackUnmuted |', publication?.kind || 'unknown', '| participant:', participant.identity);
      optionsRef.current.onTrackUnmuted?.(publication, participant);
    };

    // 📡 State Synchronization: mudança de atributos de participantes
    // Docs: https://docs.livekit.io/transport/data/state/
    const onParticipantAttributesChangedFn = (changed: Record<string, string>, participant: any) => {
      if (destroyedRef.current) return;
      optionsRef.current.onAttributesChanged?.(changed, participant);
    };

    // 📡 State Synchronization: mudança de metadados da Room
    const onRoomMetadataChangedFn = (metadata: string) => {
      if (destroyedRef.current) return;
      optionsRef.current.onRoomMetadataChanged?.(metadata);
    };

    // 📡 Data Packets: handler nomeado para permitir cleanup correto
    // Docs: https://docs.livekit.io/transport/data/packets/
    const onDataReceivedFn = (payload: Uint8Array, participant?: any) => {
      if (destroyedRef.current) return;
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (!data || !data.type) return;

        if (data.type === 'reaction') {
          optionsRef.current.onReaction?.({
            reaction: data.reaction,
            fromUserId: data.fromUserId,
            fromName: data.fromName,
            streamId: data.streamId,
            timestamp: data.timestamp,
          });
        } else if (data.type === 'typing') {
          optionsRef.current.onTyping?.({
            fromUserId: data.fromUserId,
            fromName: data.fromName,
            streamId: data.streamId,
            isTyping: data.isTyping,
            timestamp: data.timestamp,
          });
        }
      } catch {
        // Payload não é JSON — ignorar
      }
    };

    // Register only once (prevents duplicates on re-renders)
    if (!listenersRegistered.current) {
      listenersRegistered.current = true;
      // 📡 Text Streams: registrar handler para chat
      registerTextStreamHandler(CHAT_TOPIC, onTextStream);
      // 📡 Byte Streams: registrar handler para imagens do chat
      registerByteStreamHandler(CHAT_IMAGE_TOPIC, onByteStream);
      // 📡 Data Packets: escutar eventos em tempo real
      // Docs: https://docs.livekit.io/transport/data/packets/
      room.on(RoomEvent.DataReceived, onDataReceivedFn);

      // 📡 State Synchronization: escutar mudanças de atributos e metadata
      room.on(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChangedFn);
      room.on(RoomEvent.RoomMetadataChanged, onRoomMetadataChangedFn);

      // 📡 Room events (presença, tracks, metadados)
      room.on(RoomEvent.Connected, onConnected);
      room.on(RoomEvent.Disconnected, onDisconnected);
      room.on(RoomEvent.Reconnecting, onReconnecting);
      room.on(RoomEvent.Reconnected, onReconnected);
      room.on(RoomEvent.ParticipantConnected, onParticipantConnectedFn);
      room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnectedFn);
      room.on(RoomEvent.ParticipantActive, onParticipantActiveFn);
      room.on(RoomEvent.ConnectionQualityChanged, onConnectionQualityChangedFn);
      room.on(RoomEvent.ParticipantMetadataChanged, onParticipantMetadataChangedFn);
      room.on(RoomEvent.TrackSubscribed, onTrackSubscribedFn);
      room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedFn);
      room.on(RoomEvent.TrackMuted, onTrackMutedFn);
      room.on(RoomEvent.TrackUnmuted, onTrackUnmutedFn);
    }

    // Connect ONLY ONCE
    if (!connectAttempted.current && room.state === 'disconnected') {
      connectAttempted.current = true;
      console.log('[LiveKitChat] Starting connection to live_' + streamId + ' (userId=' + userId + ')');

      (async () => {
        try {
          const { token, serverUrl } = await livekitApi.getChatToken(streamId, userId, isHost || false);
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
          // Connected event will set connected = true
        } catch (err) {
          if (destroyedRef.current) return;
          const errMsg = err instanceof Error ? err.message : String(err);
          const isPcError = errMsg.toLowerCase().includes('pc') || errMsg.includes('peer connection') || errMsg.includes('ICE');
          const isNetworkError = errMsg.toLowerCase().includes('network') || errMsg.includes('timed out') || errMsg.includes('fetch');
          
          if (isPcError) {
            console.error('[LiveKitChat] ❌ Conexão WebRTC falhou. Server:', serverUrl, 'Erro:', errMsg,
              '- Verificar proxy Nginx /livekit e config TURN/STUN');
          } else if (isNetworkError) {
            console.error('[LiveKitChat] ❌ Erro de rede. Server:', serverUrl, 'Erro:', errMsg,
              '- Verificar se LiveKit está rodando e acessível');
          } else {
            console.error('[LiveKitChat] Connection failed:', errMsg);
          }
        }
      })();
    } else if (room.state === 'connected') {
      setConnected(true);
    }

    // Cleanup: remove listeners and reset state
    // Text Streams handlers são registrados via registerTextStreamHandler,
    // que não tem método de unregister direto. Como a Room é singleton,
    // os handlers persistem enquanto a Room existir.
    // Os event listeners do RoomEvent são removidos normalmente.
    return () => {
      destroyedRef.current = true;
      if (listenersRegistered.current) {
        listenersRegistered.current = false;
        room.off(RoomEvent.DataReceived, onDataReceivedFn);
        room.off(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChangedFn);
        room.off(RoomEvent.RoomMetadataChanged, onRoomMetadataChangedFn);
        room.off(RoomEvent.Connected, onConnected);
        room.off(RoomEvent.Disconnected, onDisconnected);
        room.off(RoomEvent.Reconnecting, onReconnecting);
        room.off(RoomEvent.Reconnected, onReconnected);
        room.off(RoomEvent.ParticipantConnected, onParticipantConnectedFn);
        room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnectedFn);
        room.off(RoomEvent.ParticipantActive, onParticipantActiveFn);
        room.off(RoomEvent.ConnectionQualityChanged, onConnectionQualityChangedFn);
        room.off(RoomEvent.ParticipantMetadataChanged, onParticipantMetadataChangedFn);
        room.off(RoomEvent.TrackSubscribed, onTrackSubscribedFn);
        room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedFn);
        room.off(RoomEvent.TrackMuted, onTrackMutedFn);
        room.off(RoomEvent.TrackUnmuted, onTrackUnmutedFn);
      }
    };
  }, [streamId, userId, disabled, reconnectKey]);

  // ═══════════════════════════════════════════════════════════════════
  // 📡 DATA PACKETS — Eventos em tempo real (reações, digitação, etc.)
  // Docs: https://docs.livekit.io/transport/data/packets/
  // ═══════════════════════════════════════════════════════════════════

  const sendReaction = useCallback(async (
    reaction: string,
    userName?: string
  ): Promise<boolean> => {
    if (disabled) {
      console.warn('[LiveKitChat] sendReaction ignored - disabled=true');
      return false;
    }
    return sendReactionPacket(reaction, userId, userName || userId, streamId || userId);
  }, [disabled, userId, streamId]);

  const sendTyping = useCallback(async (
    isTyping: boolean,
    userName?: string
  ): Promise<boolean> => {
    if (disabled) {
      console.warn('[LiveKitChat] sendTyping ignored - disabled=true');
      return false;
    }
    return sendTypingPacket(userId, userName || userId, streamId || userId, isTyping);
  }, [disabled, userId, streamId]);

  const sendMessage = useCallback(async (payload: any): Promise<boolean> => {
    if (disabled) {
      console.warn('[LiveKitChat] sendMessage ignored - disabled=true');
      return false;
    }
    const room = getLiveKitRoom();
    if (room.state !== 'connected') {
      console.warn('[LiveKitChat] sendMessage ignored - room not connected (state:', room.state, ')');
      return false;
    }
    try {
      // 📡 Text Streams: usar sendText com topic 'chat'
      return await sendTextStream(CHAT_TOPIC, payload);
    } catch (err) {
      console.warn('[LiveKitChat] Error sending:', err);
      return false;
    }
  }, [disabled]);

  const sendFile = useCallback(async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    if (disabled) {
      console.warn('[LiveKitChat] sendFile ignored - disabled=true');
      return false;
    }
    const room = getLiveKitRoom();
    if (room.state !== 'connected') {
      console.warn('[LiveKitChat] sendFile ignored - room not connected');
      return false;
    }
    try {
      // 📡 Byte Streams: usar sendFile com topic 'chat-image'
      // Docs: https://docs.livekit.io/transport/data/byte-streams/
      return await sendFileBytes(file, CHAT_IMAGE_TOPIC, onProgress);
    } catch (err) {
      console.warn('[LiveKitChat] Error sending file:', err);
      return false;
    }
  }, [disabled]);

  const disconnect = useCallback(() => {
    connectAttempted.current = false;
    disconnectLiveKitRoom().then(() => {
      setConnected(false);
    }).catch(() => {});
  }, []);

  const setMetadata = useCallback(async (metadata: ParticipantMetadata): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] setMetadata ignorado — Room não conectada');
      return;
    }
    try {
      await room.localParticipant.setMetadata(JSON.stringify(metadata));
      console.log('[LiveKitChat] Metadata atualizada:', metadata);
    } catch (err) {
      console.warn('[LiveKitChat] setMetadata erro:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // 📡 STATE SYNCHRONIZATION — Participant Attributes + Room Metadata
  // Docs: https://docs.livekit.io/transport/data/state/
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Atualiza atributos do participante atual (key-value strings).
   * Estes atributos são sincronizados automaticamente para todos os
   * participantes na Room via RoomEvent.ParticipantAttributesChanged.
   *
   * Atributos típicos: 'role', 'mic', 'cam', 'handRaise', 'level', 'name'
   *
   * Docs: https://docs.livekit.io/reference/client-sdk-js/classes/LocalParticipant.html#setAttributes
   */
  const setAttributes = useCallback(async (attrs: Record<string, string>): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] setAttributes ignorado — Room não conectada');
      return;
    }
    try {
      await room.localParticipant.setAttributes(attrs);
      console.log('[LiveKitChat] Atributos atualizados:', attrs);
    } catch (err) {
      console.warn('[LiveKitChat] setAttributes erro:', err);
    }
  }, []);

  /**
   * Atalho para atualizar o papel do participante (host, co-host, viewer).
   */
  const setParticipantRole = useCallback(async (role: 'host' | 'co-host' | 'viewer'): Promise<void> => {
    return setAttributes({ 'role': role });
  }, [setAttributes]);

  /**
   * Atalho para atualizar o status do microfone.
   */
  const setMicStatus = useCallback(async (muted: boolean): Promise<void> => {
    return setAttributes({ 'mic': muted ? 'muted' : 'unmuted' });
  }, [setAttributes]);

  /**
   * Atalho para atualizar o status da câmera.
   */
  const setCamStatus = useCallback(async (enabled: boolean): Promise<void> => {
    return setAttributes({ 'cam': enabled ? 'enabled' : 'disabled' });
  }, [setAttributes]);

  /**
   * Atalho para sinalizar mão levantada (pedir para falar).
   */
  const setHandRaise = useCallback(async (raised: boolean): Promise<void> => {
    return setAttributes({ 'handRaise': raised ? 'raised' : '' });
  }, [setAttributes]);

  // ═══════════════════════════════════════════════════════════════════
  // 📡 Track management (LiveKit docs: tracks, mute/unmute, pub/unpub)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Publica camera (video) e microfone (audio) como tracks no LiveKit.
   * Mantem uma unica Video Track (camera) e uma unica Audio Track (microfone).
   * Para mutar/desmutar, use muteTrack/unmuteTrack (evita renegociacao).
   */
  const publishTracks = useCallback(async (mediaStream: MediaStream): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] publishTracks ignorado — Room nao conectada');
      return;
    }
    try {
      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];

      if (videoTrack) {
        // LiveKit docs: publica como Camera source, nao recria se ja existe
        const existingVideoPub = Array.from(room.localParticipant.videoTrackPublications.values())
          .find(p => p.source === 'camera');
        if (existingVideoPub) {
          await existingVideoPub.track?.setMediaStreamTrack(videoTrack);
        } else {
          await room.localParticipant.publishTrack(videoTrack, {
            source: 'camera',
            name: 'camera',
          });
        }
      }

      if (audioTrack) {
        const existingAudioPub = Array.from(room.localParticipant.audioTrackPublications.values())
          .find(p => p.source === 'microphone');
        if (existingAudioPub) {
          await existingAudioPub.track?.setMediaStreamTrack(audioTrack);
        } else {
          await room.localParticipant.publishTrack(audioTrack, {
            source: 'microphone',
            name: 'microphone',
          });
        }
      }

      console.log('[LiveKitChat] Tracks publicadas: video=', !!videoTrack, 'audio=', !!audioTrack);
    } catch (err) {
      console.warn('[LiveKitChat] publishTracks erro:', err);
    }
  }, []);

  /**
   * Remove todas as tracks publicadas localmente.
   */
  const unpublishTracks = useCallback(async (): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] unpublishTracks ignorado — Room nao conectada');
      return;
    }
    try {
      const publications = [
        ...Array.from(room.localParticipant.videoTrackPublications.values()),
        ...Array.from(room.localParticipant.audioTrackPublications.values()),
      ];
      for (const pub of publications) {
        await room.localParticipant.unpublishTrack(pub.trackSid);
      }
      console.log('[LiveKitChat] Todas as tracks foram removidas');
    } catch (err) {
      console.warn('[LiveKitChat] unpublishTracks erro:', err);
    }
  }, []);

  /**
   * Muta uma track local (audio ou video).
   * LiveKit docs recomenda mute/unmute em vez de unpublish/republish.
   */
  const muteTrack = useCallback(async (kind: 'audio' | 'video'): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] muteTrack ignorado — Room nao conectada');
      return;
    }
    try {
      const publications = kind === 'audio'
        ? Array.from(room.localParticipant.audioTrackPublications.values())
        : Array.from(room.localParticipant.videoTrackPublications.values());
      for (const pub of publications) {
        await pub.mute();
      }
      console.log('[LiveKitChat] Track mutada:', kind);
    } catch (err) {
      console.warn('[LiveKitChat] muteTrack erro:', err);
    }
  }, []);

  /**
   * Desmuta uma track local (audio ou video).
   */
  const unmuteTrack = useCallback(async (kind: 'audio' | 'video'): Promise<void> => {
    const room = getLiveKitRoom();
    if (room.state !== 'connected' || !room.localParticipant) {
      console.warn('[LiveKitChat] unmuteTrack ignorado — Room nao conectada');
      return;
    }
    try {
      const publications = kind === 'audio'
        ? Array.from(room.localParticipant.audioTrackPublications.values())
        : Array.from(room.localParticipant.videoTrackPublications.values());
      for (const pub of publications) {
        await pub.unmute();
      }
      console.log('[LiveKitChat] Track desmutada:', kind);
    } catch (err) {
      console.warn('[LiveKitChat] unmuteTrack erro:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // 📡 RPC — Funções para chamar métodos em outros participantes
  // Docs: https://docs.livekit.io/transport/data/rpc/
  // ═══════════════════════════════════════════════════════════════════

  const callRpc = useCallback(async (
    destinationIdentity: string,
    method: string,
    payload: any = {},
    timeout: number = 10000
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const response = await performRpc(
        destinationIdentity,
        method,
        JSON.stringify(payload),
        timeout
      );
      let parsed: any;
      try { parsed = JSON.parse(response); } catch { parsed = { raw: response }; }
      return { success: true, data: parsed };
    } catch (err: any) {
      const code = err?.code || err?.name || 'UNKNOWN';
      const message = err?.message || String(err);
      console.warn(`[RPC] ${method} falhou para ${destinationIdentity}: ${code} - ${message}`);
      return { success: false, error: `${code}: ${message}` };
    }
  }, []);

  const inviteCoHost = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.INVITE_CO_HOST, data);
  }, [callRpc]);

  const acceptCoHost = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.ACCEPT_CO_HOST, data);
  }, [callRpc]);

  const rejectCoHost = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.REJECT_CO_HOST, data);
  }, [callRpc]);

  const endCoHost = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.END_CO_HOST, data);
  }, [callRpc]);

  const invitePK = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.INVITE_PK, data);
  }, [callRpc]);

  const acceptPK = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.ACCEPT_PK, data);
  }, [callRpc]);

  const rejectPK = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.REJECT_PK, data);
  }, [callRpc]);

  const endPK = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.END_PK, data);
  }, [callRpc]);

  const kickParticipant = useCallback(async (identity: string, data: any = {}) => {
    return callRpc(identity, RPC.KICK_PARTICIPANT, data);
  }, [callRpc]);    return {
    connected,
    sendMessage,
    sendFile,
    disconnect,
    setMetadata,
    publishTracks,
    unpublishTracks,
    muteTrack,
    unmuteTrack,
    // 📡 Data Packet methods — pequenos eventos em tempo real
    sendReaction,
    sendTyping,
    // 📡 State Synchronization methods
    setAttributes,
    setParticipantRole,
    setMicStatus,
    setCamStatus,
    setHandRaise,
    // 📡 RPC methods
    inviteCoHost,
    acceptCoHost,
    rejectCoHost,
    endCoHost,
    invitePK,
    acceptPK,
    rejectPK,
    endPK,
    kickParticipant,
  };
}
