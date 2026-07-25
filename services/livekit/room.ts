import { User } from '../../types';
import { decodeTokenIdentity } from './token';
import { createParticipantFromUser, LiveKitParticipant } from './participants';
import { api, getCurrentUserId } from '../api';
// LiveKit: sala, participantes, chat/data channels, video calls, PK.
// Mídia (câmera/microfone) é publicada via WHIP diretamente ao SRS.
import {
  Room as RealRoom,
  RoomEvent as RealRoomEvent,
  RemoteParticipant as RealRemoteParticipant,
  setLogLevel,
} from 'livekit-client';

export enum RoomEvent {
  ParticipantConnected = 'participantConnected',
  ParticipantDisconnected = 'participantDisconnected',
  TrackSubscribed = 'trackSubscribed',
  TrackUnsubscribed = 'trackUnsubscribed',
  LocalTrackPublished = 'localTrackPublished',
  LocalTrackUnpublished = 'localTrackUnpublished',
  ActiveSpeakersChanged = 'activeSpeakersChanged',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting',
  Reconnected = 'reconnected',
  RoomMetadataChanged = 'roomMetadataChanged'
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TrackPublication {
  trackSid: string;
  trackName: string;
  source: 'camera' | 'microphone' | 'screen_share' | 'unknown';
  isMuted: boolean;
  track?: MediaStreamTrack;
}

export class LiveKitRoom {
  public state: ConnectionState = 'disconnected';
  public localParticipant: LiveKitParticipant | null = null;
  public remoteParticipants: Map<string, LiveKitParticipant> = new Map();
  public roomId: string = '';
  
  private realRoom: RealRoom | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private mockIntervals: any[] = [];
  private intentionalDisconnect = false;
  private isReconnecting = false;

  constructor() {
    this.reset();
  }

  private reset() {
    this.intentionalDisconnect = true;
    this.state = 'disconnected';
    this.localParticipant = null;
    this.remoteParticipants.clear();
    this.mockIntervals.forEach(clearInterval);
    this.mockIntervals = [];
    if (this.realRoom) {
      try {
        this.realRoom.disconnect();
      } catch {}
      this.realRoom = null;
    }
    this.intentionalDisconnect = false;
    this.isReconnecting = false;
  }

  private cleanupReconnection() {
    this.isReconnecting = false;
    this.intentionalDisconnect = false;
  }

  /**
   * Listen for LiveKit Room events
   */
  public on(event: RoomEvent | string, callback: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return this;
  }

  /**
   * Remove event listener
   */
  public off(event: RoomEvent | string, callback: Function): this {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
    }
    return this;
  }

  /**
   * Emit events locally
   */
  private emit(event: RoomEvent, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(...args); } catch (e) { console.error(`Error in event listener for ${event}:`, e); }
      });
    }
  }

  /**
   * Connects to a LiveKit Room
   */
  public async connect(url: string, token: string): Promise<void> {
    if (this.state !== 'disconnected' && this.state !== 'reconnecting') {
      throw new Error('Room is already connecting or connected');
    }

    this.state = 'connecting';

    let roomId = '';
    try {
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(atob(payload));
        roomId = decoded.video?.room || decoded.room || '';
      }
    } catch {
      roomId = '';
    }
    this.roomId = roomId;

    const decodedIdentity = decodeTokenIdentity(token) || `user_${Math.random().toString(36).slice(2, 6)}`;

    try {
      // Reduzir verbosidade do SDK LiveKit para exibir apenas avisos e erros
      setLogLevel('warn');

      const realRoom = new RealRoom({
        adaptiveStream: true,
        dynacast: true,
      });
      this.realRoom = realRoom;

      // Event: Connected
      realRoom.on(RealRoomEvent.Connected, () => {
        console.log('✅ LiveKit conectado.');
        this.state = 'connected';
        this.cleanupReconnection();
        this.emit(RoomEvent.RoomMetadataChanged, this);
      });

      // Event: Disconnected (final - reconnection failed or intentional)
      realRoom.on(RealRoomEvent.Disconnected, () => {
        if (this.intentionalDisconnect) {
          console.log('[LiveKit] Desconectado por ação do usuário.');
          this.state = 'disconnected';
          this.cleanupReconnection();
          this.emit(RoomEvent.Disconnected);
          return;
        }
        console.log('[LiveKit] Conexão perdida. Tentando reconectar...');
        this.state = 'reconnecting';
        this.isReconnecting = true;
        this.emit(RoomEvent.Reconnecting);
      });

      // Event: Reconnecting
      realRoom.on(RealRoomEvent.Reconnecting, () => {
        console.log('[LiveKit] Reconectando...');
        this.state = 'reconnecting';
        this.emit(RoomEvent.Reconnecting);
      });

      // Event: Reconnected
      realRoom.on(RealRoomEvent.Reconnected, () => {
        console.log('✅ LiveKit reconectado.');
        this.state = 'connected';
        this.isReconnecting = false;
        this.emit(RoomEvent.Reconnected);
        this.emit(RoomEvent.RoomMetadataChanged, this);
      });

      // Event: ParticipantConnected
      realRoom.on(RealRoomEvent.ParticipantConnected, (participant) => {
        console.log('✅ Participante entrou:', participant.identity);
        this._addRemoteParticipant(participant);
      });

      // Event: ParticipantDisconnected
      realRoom.on(RealRoomEvent.ParticipantDisconnected, (participant) => {
        const p = this.remoteParticipants.get(participant.identity);
        if (p) {
          this.remoteParticipants.delete(participant.identity);
          this.emit(RoomEvent.ParticipantDisconnected, p);
        }
      });

      // Event: TrackSubscribed
      realRoom.on(RealRoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('✅ Stream recebida.');
        this._updateParticipantTracks(participant);
        const p = this.remoteParticipants.get(participant.identity);
        if (p) {
          const pub: TrackPublication = {
            trackSid: publication.trackSid,
            trackName: publication.trackName || publication.source,
            source: (publication.source as any) || 'camera',
            isMuted: publication.isMuted,
            track: track.mediaStreamTrack || undefined
          };
          this.emit(RoomEvent.TrackSubscribed, track.mediaStreamTrack || undefined, pub, p);
        }
      });

      // Event: TrackUnsubscribed
      realRoom.on(RealRoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        this._updateParticipantTracks(participant);
        const p = this.remoteParticipants.get(participant.identity);
        if (p) {
          const pub: TrackPublication = {
            trackSid: publication.trackSid,
            trackName: publication.trackName || publication.source,
            source: (publication.source as any) || 'camera',
            isMuted: publication.isMuted,
            track: track.mediaStreamTrack || undefined
          };
          this.emit(RoomEvent.TrackUnsubscribed, track.mediaStreamTrack || undefined, pub, p);
        }
      });

      // Event: DataReceived (Real Chat Integration via SFU Data Channel)
      realRoom.on(RealRoomEvent.DataReceived, (payload: Uint8Array, participant) => {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(payload);
          const data = JSON.parse(text);
          if (data) {
            console.log('✅ Stream recebida. (Data channel message):', data.type || 'unknown');
            this.emit('data_received' as any, data, participant?.identity);
            if (data.type === 'chat_message') {
              this.emit('chat_message' as any, data, participant?.identity);
            }
          }
        } catch (err) {
          console.warn('[LiveKit] Erro ao decodificar mensagem do data channel:', err);
        }
      });

      // Actually connect
      await realRoom.connect(url, token);
      
      this.state = 'connected';

      // Register real participant join with the backend database
      try {
        await api.livekit.joinRoom(this.roomId, decodedIdentity, decodedIdentity, decodedIdentity.startsWith('streamer_') ? 'host' : 'viewer');
      } catch (e) {
        console.warn('[LiveKit] Falha ao registrar entrada no backend:', e);
      }

      // Populate local participant
      const tracksMap = new Map<string, TrackPublication>();
      this.localParticipant = {
        identity: decodedIdentity,
        name: decodedIdentity.startsWith('streamer_') ? 'Host Streamer' : decodedIdentity,
        isLocal: true,
        tracks: tracksMap,
        isSpeaking: false
      };

      // Populate already existing remote participants
      realRoom.remoteParticipants.forEach((participant) => {
        this._addRemoteParticipant(participant);
      });

      // LiveKit: sala, participantes, data channels para eventos
      // Mídia (câmera/microfone) é publicada via WHIP diretamente ao SRS

      this.emit(RoomEvent.RoomMetadataChanged, this);

    } catch (err) {
      console.error('❌ [LiveKit] Erro de conexão com o servidor SFU real:', err);
      this.state = 'disconnected';
      this.realRoom = null;
      throw err;
    }
  }

  private _addRemoteParticipant(participant: RealRemoteParticipant) {
    if (this.remoteParticipants.has(participant.identity)) {
      return;
    }
    this._updateParticipantTracks(participant);
    const p = this.remoteParticipants.get(participant.identity);
    if (p) {
      this.emit(RoomEvent.ParticipantConnected, p);
    }
  }

  private _updateParticipantTracks(participant: RealRemoteParticipant) {
    const tracksMap = new Map<string, TrackPublication>();
    const publications = participant.trackPublications || (participant as any).tracks;
    if (publications) {
      publications.forEach((pub: any) => {
        tracksMap.set(pub.trackSid, {
          trackSid: pub.trackSid,
          trackName: pub.trackName || pub.source,
          source: (pub.source as any) || 'camera',
          isMuted: pub.isMuted,
          track: pub.track?.mediaStreamTrack || undefined
        });
      });
    }

    const p: LiveKitParticipant = {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal: false,
      tracks: tracksMap,
      isSpeaking: participant.isSpeaking
    };

    this.remoteParticipants.set(participant.identity, p);
  }

  /**
   * Send a chat message via LiveKit data channel
   */
  /**
   * Envia mensagem de chat via LiveKit Data Channel com topic padronizado 'livechat'.
   * Documentação: https://docs.livekit.io/client-sdk-js/#data
   */
  public sendChatMessage(payload: any): void {
    if (this.realRoom && this.state === 'connected' && !this.isReconnecting) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
          type: 'chat_message',
          ...payload
        }));
        this.realRoom.localParticipant.publishData(data, {
          reliable: true,
          topic: 'livechat',
        });
      } catch (e) {
        console.error('[LiveKit] Erro ao serializar mensagem:', e);
      }
    } else {
      console.warn('[LiveKit] sendChatMessage ignorado — Room não conectada');
    }
  }

  /**
   * Send arbitrary data via LiveKit data channel with topic 'livechat'.
   */
  public sendData(payload: any): void {
    if (this.realRoom && this.state === 'connected' && !this.isReconnecting) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        this.realRoom.localParticipant.publishData(data, {
          reliable: true,
          topic: 'livechat',
        })
          .then(() => {
            console.log('[LiveKit] sendData OK:', payload.type || 'unknown');
          })
          .catch((err) => {
            console.warn('[LiveKit] sendData erro:', err);
          });
      } catch (e) {
        console.error('[LiveKit] Erro ao serializar dados:', e);
      }
    } else {
      console.log('[LiveKit-Fallback] sendData called:', payload.type || 'unknown');
    }
  }

  /**
   * Disconnects cleanly
   */
  public async disconnect(): Promise<void> {
    if (this.state === 'disconnected' && !this.isReconnecting) return;
    if (this.state === 'connecting') return;

    this.intentionalDisconnect = true;

    if (this.realRoom) {
      try {
        this.realRoom.disconnect();
      } catch {}
    }

    this.state = 'disconnected';
    this.localParticipant = null;
    this.remoteParticipants.clear();
    this.isReconnecting = false;
    this.intentionalDisconnect = false;
    if (this.realRoom) {
      this.realRoom = null;
    }
    this.emit(RoomEvent.Disconnected);
  }

  /**
   * Simulates joining for compatibility in development
   */
  public simulateRemoteParticipantJoin(user: User, role: 'opponent' | 'guest'): void {
    const identity = user.id;
    const remoteParticipant = createParticipantFromUser(user, role);
    this.remoteParticipants.set(identity, remoteParticipant);
    this.emit(RoomEvent.ParticipantConnected, remoteParticipant);
  }

  public simulateRemoteParticipantLeave(identity: string): void {
    const p = this.remoteParticipants.get(identity);
    if (p) {
      this.remoteParticipants.delete(identity);
      this.emit(RoomEvent.ParticipantDisconnected, p);
    }
  }
}

export type { LiveKitParticipant } from './participants';

export const livekitService = {
  createRoom: (): LiveKitRoom => new LiveKitRoom()
};
