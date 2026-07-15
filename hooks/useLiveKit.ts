import { useState, useEffect, useRef } from 'react';
import { livekitService, LiveKitRoom, RoomEvent, LiveKitParticipant, ConnectionState } from '../services/livekit/room';
import { User } from '../types';

interface UseLiveKitOptions {
  onParticipantConnected?: (participant: LiveKitParticipant) => void;
  onParticipantDisconnected?: (participant: LiveKitParticipant) => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export function useLiveKit(options: UseLiveKitOptions = {}) {
  const [room, setRoom] = useState<LiveKitRoom | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localParticipant, setLocalParticipant] = useState<LiveKitParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<LiveKitParticipant[]>([]);
  
  const roomRef = useRef<LiveKitRoom | null>(null);
  const optionsRef = useRef(options);
  const connectingRef = useRef(false);
  const destroyedRef = useRef(false);
  const connectionGenRef = useRef(0);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const activeRoom = livekitService.createRoom();
    roomRef.current = activeRoom;
    setRoom(activeRoom);

    const handleParticipantConnected = (p: LiveKitParticipant) => {
      console.log('[useLiveKit] 🔔 participantConnected event:', p.identity, 'name:', p.name);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
      optionsRef.current.onParticipantConnected?.(p);
    };

    const handleParticipantDisconnected = (p: LiveKitParticipant) => {
      console.log('[useLiveKit] 🔔 participantDisconnected event:', p.identity, 'name:', p.name);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
      optionsRef.current.onParticipantDisconnected?.(p);
    };

    const handleTrackSubscribed = () => {
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
    };

    const handleTrackUnsubscribed = () => {
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
    };

    const handleRoomMetadataChanged = () => {
      if (destroyedRef.current) return;
      setConnectionState(activeRoom.state);
      setLocalParticipant(activeRoom.localParticipant);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
    };

    const handleDisconnected = () => {
      if (destroyedRef.current) return;
      setConnectionState('disconnected');
      setLocalParticipant(null);
      setRemoteParticipants([]);
      optionsRef.current.onDisconnected?.();
    };

    const handleReconnecting = () => {
      if (destroyedRef.current) return;
      setConnectionState('reconnecting');
      optionsRef.current.onReconnecting?.();
    };

    const handleReconnected = () => {
      if (destroyedRef.current) return;
      setConnectionState('connected');
      setLocalParticipant(activeRoom.localParticipant);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
      optionsRef.current.onReconnected?.();
    };

    activeRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    activeRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    activeRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    activeRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    activeRoom.on(RoomEvent.RoomMetadataChanged, handleRoomMetadataChanged);
    activeRoom.on(RoomEvent.Disconnected, handleDisconnected);
    activeRoom.on(RoomEvent.Reconnecting, handleReconnecting);
    activeRoom.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      destroyedRef.current = true;
      activeRoom.disconnect();
      roomRef.current = null;
    };
  }, []);

  const connect = async (url: string, token: string) => {
    if (!roomRef.current) return;
    if (connectionState === 'connected') return;
    if (connectingRef.current) return;
    const gen = ++connectionGenRef.current;
    connectingRef.current = true;
    setConnectionState('connecting');
    try {
      console.log('[useLiveKit] Conectando ao LiveKit... url:', url);
      await roomRef.current.connect(url, token);
      if (destroyedRef.current || gen !== connectionGenRef.current) return;
      setConnectionState('connected');
      setLocalParticipant(roomRef.current.localParticipant);
      console.log('[useLiveKit] ✅ Conectado! Local identity:', roomRef.current.localParticipant?.identity, 'state:', roomRef.current.state);
    } catch (e) {
      if (!destroyedRef.current && gen === connectionGenRef.current) {
        setConnectionState('disconnected');
      }
      console.error('[useLiveKit] Connect failed:', e);
      throw e;
    } finally {
      if (gen === connectionGenRef.current) {
        connectingRef.current = false;
      }
    }
  };

  const disconnect = async () => {
    if (!roomRef.current) return;
    connectionGenRef.current++;
    if (roomRef.current.state === 'connecting') {
      return;
    }
    await roomRef.current.disconnect();
  };

  return {
    room,
    connectionState,
    localParticipant,
    remoteParticipants,
    connect,
    disconnect
  };
}
