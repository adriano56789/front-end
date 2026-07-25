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
  isHost?: boolean;
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
  const { streamId, userId, isHost, disabled } = options;
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
      console.log('[LiveKitChat] disabled=true, skipping connection.');
      return;
    }

    if (!streamId || !userId) {
      console.warn('[LiveKitChat] streamId or userId missing. streamId:', streamId, 'userId:', userId);
      return;
    }

    destroyedRef.current = false;
    const room = getLiveKitRoom();

    // Register listeners - with proper cleanup
    // Named functions for unregistering later.
    // optionsRef.current ensures callbacks always capture the latest version.
    const onDataReceived = (payload: Uint8Array, participant: any, _kind: any, topic?: string) => {
      if (destroyedRef.current) return;
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (optionsRef.current.onMessage && data) {
          optionsRef.current.onMessage(data);
        }
      } catch (err) {
        console.warn('[LiveKitChat] Error decoding payload:', err);
      }
    };
    const onConnected = () => {
      if (destroyedRef.current) return;
      setConnected(true);
      console.log('[LiveKitChat] Connected to room live_' + streamId +
        ' | participants:', room.remoteParticipants.size);

      // [DIAGNOSTIC] Log all remote participants and their tracks
      if (room.remoteParticipants.size > 0) {
        console.log('[LiveKitChat] === Remote participants in room ===');
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
      } else {
        console.log('[LiveKitChat]   (no remote participants yet - waiting for host...)');
      }

      optionsRef.current.onConnected?.();
    };
    const onDisconnected = () => {
      if (destroyedRef.current) return;
      setConnected(false);
      optionsRef.current.onDisconnected?.();
      console.warn('[LiveKitChat] Disconnected');
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
    const onParticipantConnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant joined:', participant.identity, '|', participant.name);

      // [DIAGNOSTIC] Log participant's existing tracks
      const videoTracks = Array.from(participant.videoTrackPublications.values());
      const audioTracks = Array.from(participant.audioTrackPublications.values());
      console.log('[LiveKitChat]   Tracks of', participant.identity, ':',
        videoTracks.length + audioTracks.length, 'total',
        '(video:', videoTracks.length, 'audio:', audioTracks.length, ')');
      videoTracks.forEach(t => {
        console.log('[LiveKitChat]     [video]', t.trackSid, 'subscribed:', t.isSubscribed);
      });
      audioTracks.forEach(t => {
        console.log('[LiveKitChat]     [audio]', t.trackSid, 'subscribed:', t.isSubscribed);
      });

      optionsRef.current.onParticipantConnected?.(participant);
    };
    const onParticipantDisconnectedFn = (participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      console.log('[LiveKitChat] Participant left:', participant.identity);
      optionsRef.current.onParticipantDisconnected?.(participant);
    };
    // [DIAGNOSTIC] TrackSubscribed: when viewer receives/subscribes to a remote track
    const onTrackSubscribedFn = (track: any, publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      const kind = track?.kind || publication?.kind || 'unknown';
      const trackSid = publication?.trackSid || 'unknown';
      const source = publication?.source || 'unknown';
      console.log('[LiveKitChat] [DIAG] TrackSubscribed |', kind,
        '| sid:', trackSid,
        '| source:', source,
        '| participant:', participant.identity,
        '| muted:', publication?.isMuted);

      if (kind === 'video') {
        const hasTrack = !!track?.mediaStreamTrack || !!track;
        const trackReady = track?.mediaStreamTrack?.readyState || 'unknown';
        console.log('[LiveKitChat] [DIAG]   Video track received | hasTrack:', hasTrack,
          '| readyState:', trackReady,
          '| canAttach:', typeof track?.attach === 'function',
          '(NOT attaching - viewer uses HLS)');
      }
    };
    // [DIAGNOSTIC] TrackUnsubscribed: when viewer loses a remote track
    const onTrackUnsubscribedFn = (track: any, publication: any, participant: RemoteParticipant) => {
      if (destroyedRef.current) return;
      const kind = track?.kind || publication?.kind || 'unknown';
      const trackSid = publication?.trackSid || 'unknown';
      console.log('[LiveKitChat] [DIAG] TrackUnsubscribed |', kind,
        '| sid:', trackSid,
        '| participant:', participant.identity);
    };

    // Register only once (prevents duplicates on re-renders)
    if (!listenersRegistered.current) {
      listenersRegistered.current = true;
      room.on(RoomEvent.DataReceived, onDataReceived);
      room.on(RoomEvent.Connected, onConnected);
      room.on(RoomEvent.Disconnected, onDisconnected);
      room.on(RoomEvent.Reconnecting, onReconnecting);
      room.on(RoomEvent.Reconnected, onReconnected);
      room.on(RoomEvent.ParticipantConnected, onParticipantConnectedFn);
      room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnectedFn);
      room.on(RoomEvent.TrackSubscribed, onTrackSubscribedFn);
      room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedFn);
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
    // The Room singleton STAYS connected (other hooks may use it),
    // but we remove our specific listeners.
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
        room.off(RoomEvent.TrackSubscribed, onTrackSubscribedFn);
        room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedFn);
      }
    };
  }, [streamId, userId, disabled]);

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
      return await sendLiveKitData(payload);
    } catch (err) {
      console.warn('[LiveKitChat] Error sending:', err);
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
