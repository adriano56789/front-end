import { io, Socket } from 'socket.io-client';
import { getUserIdFromToken } from '../utils/auth';
import { callApi } from '../../services/api';
import { env } from '../config/environment';
import { webrtcService } from '../../services/webrtcService';

export interface CallInvitation {
  id: string;
  hostId: string;
  hostName: string;
  guestId?: string;
  guestName?: string;
  roomId: string;
  streamId: string;
  streamTitle?: string;
  webrtcUrl?: string;
}

export interface CallInvitationEvent {
  type: 'invitation_received' | 'invitation_sent' | 'invitation_accepted' | 'invitation_declined' | 'call_joined' | 'call_ended';
  invitation: CallInvitation;
}

class CallInvitationService {
  private socket: Socket | null = null;
  private currentCall: CallInvitation | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private activeGuestStreams: Map<string, string> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private async initializeSocket() {
    const wsUrl = env.wsUrl;
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    const userId = getUserIdFromToken();
    if (userId) {
      this.socket.emit('join_user_room', userId);
    }

    this.socket.on('call_invitation', (event: CallInvitationEvent) => {
      this.handleCallInvitation(event);
    });

    this.socket.on('connect', () => {
      console.log('📞 Conectado ao serviço de convites');
      const userId = getUserIdFromToken();
      if (userId) {
        this.socket?.emit('join_user_room', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('📞 Desconectado do serviço de convites');
    });
  }

  private handleCallInvitation(event: CallInvitationEvent) {
    console.log('📞 Evento de chamada:', event);

    switch (event.type) {
      case 'invitation_received':
        this.currentCall = event.invitation;
        break;

      case 'invitation_accepted': {
        const invitation = event.invitation;
        if (invitation.webrtcUrl && invitation.guestId) {
          this.currentCall = invitation;
          this.startGuestPlayback(invitation.webrtcUrl, invitation.guestId);
        }
        break;
      }

      case 'call_joined': {
        const invitation = event.invitation;
        if (invitation.webrtcUrl) {
          this.currentCall = invitation;
          this.startOwnPublish(invitation.webrtcUrl);
        }
        break;
      }

      case 'call_ended':
        this.cleanupCall();
        break;
    }

    this.notifyListeners('callInvitation', event);
  }

  private async startOwnPublish(webrtcUrl: string) {
    try {
      console.log(`📞 Publicando próprio vídeo em: ${webrtcUrl}`);
      await webrtcService.startPublish(webrtcUrl);
      this.notifyListeners('connected', { webrtcUrl });
    } catch (err) {
      console.error('📞 Erro ao publicar vídeo:', err);
      this.notifyListeners('error', { error: 'Falha ao publicar vídeo via SRS' });
    }
  }

  private async startGuestPlayback(webrtcUrl: string, guestId: string) {
    try {
      console.log(`📞 Reproduzindo vídeo do convidado ${guestId} de: ${webrtcUrl}`);
      const remoteStream = await webrtcService.startPlay(webrtcUrl);

      const videoEl = document.getElementById(`guest-video-${guestId}`) as HTMLVideoElement;
      if (videoEl && remoteStream) {
        videoEl.srcObject = remoteStream;
        this.activeGuestStreams.set(guestId, webrtcUrl);
      }

      this.notifyListeners('connected', { guestId, webrtcUrl });
    } catch (err) {
      console.error(`📞 Erro ao reproduzir vídeo do convidado ${guestId}:`, err);
      this.notifyListeners('error', { error: `Falha ao reproduzir vídeo do convidado ${guestId}` });
    }
  }

  private cleanupCall() {
    webrtcService.stop();
    this.activeGuestStreams.clear();
    this.currentCall = null;
    this.notifyListeners('disconnected', {});
  }

  async inviteGuest(guestId: string, guestName: string, streamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await callApi('POST', '/api/call-invitation/invite', { guestId, guestName, streamId });
    } catch (error: any) {
      console.error('Erro ao convidar usuário:', error);
      return { success: false, error: error.message };
    }
  }

  async respondToInvitation(invitationId: string, response: 'accept' | 'decline'): Promise<{ success: boolean; error?: string }> {
    try {
      return await callApi('POST', '/api/call-invitation/respond', { invitationId, response });
    } catch (error: any) {
      console.error('Erro ao responder convite:', error);
      return { success: false, error: error.message };
    }
  }

  async endCall(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await callApi('POST', '/api/call-invitation/end', { invitationId });
    } catch (error: any) {
      console.error('Erro ao encerrar chamada:', error);
      return { success: false, error: error.message };
    }
  }

  addListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeListener(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  getCurrentCall(): CallInvitation | null {
    return this.currentCall;
  }

  isInCall(): boolean {
    return this.currentCall !== null;
  }

  disconnect() {
    this.cleanupCall();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

export const callInvitationService = new CallInvitationService();
export default callInvitationService;
