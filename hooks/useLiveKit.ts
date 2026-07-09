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
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    // Instantiate LiveKit Room
    const activeRoom = livekitService.createRoom();
    roomRef.current = activeRoom;
    setRoom(activeRoom);

    // Event handlers
    const handleParticipantConnected = (p: LiveKitParticipant) => {
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
      optionsRef.current.onParticipantConnected?.(p);
    };

    const handleParticipantDisconnected = (p: LiveKitParticipant) => {
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
      setConnectionState(activeRoom.state);
      setLocalParticipant(activeRoom.localParticipant);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
    };

    const handleDisconnected = () => {
      setConnectionState('disconnected');
      setLocalParticipant(null);
      setRemoteParticipants([]);
      optionsRef.current.onDisconnected?.();
    };

    const handleReconnecting = () => {
      setConnectionState('reconnecting');
      optionsRef.current.onReconnecting?.();
    };

    const handleReconnected = () => {
      setConnectionState('connected');
      setLocalParticipant(activeRoom.localParticipant);
      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));
      optionsRef.current.onReconnected?.();
    };

    // Listen to Room events
    activeRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    activeRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    activeRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    activeRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    activeRoom.on(RoomEvent.RoomMetadataChanged, handleRoomMetadataChanged);
    activeRoom.on(RoomEvent.Disconnected, handleDisconnected);
    activeRoom.on(RoomEvent.Reconnecting, handleReconnecting);
    activeRoom.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      activeRoom.disconnect();
      roomRef.current = null;
    };
  }, []);

  const connect = async (url: string, token: string) => {
    if (!roomRef.current) return;
    if (connectionState === 'connected') return;
    setConnectionState('connecting');
    try {
      await roomRef.current.connect(url, token);
      setConnectionState('connected');
      setLocalParticipant(roomRef.current.localParticipant);
    } catch (e) {
      setConnectionState('disconnected');
      console.error('[useLiveKit] Connect failed:', e);
      throw e;
    }
  };

  const disconnect = async () => {
    if (!roomRef.current) return;
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
