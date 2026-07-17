import { api } from '../api';

export const livekitApi = {
  getLiveKitToken: async (roomId: string, identity: string, isPublisher: boolean): Promise<{ success: boolean; token: string; serverUrl: string }> => {
    console.log(`[LiveKit] Obtendo token...`);
    console.log(`[LiveKit] ID da sala: ${roomId}`);
    console.log(`[LiveKit] Usu\u00e1rio conectado: ${identity}`);
    
    const result = await api.getLiveKitToken(identity, roomId, isPublisher ? 'publisher' : 'subscriber');
    
    console.log(`[LiveKit] Token obtido com sucesso. Token expira em 1 hora.`);
    return {
      success: result.success,
      token: result.token,
      serverUrl: result.livekitUrl,
    };
  },

  createRoom: async (roomId: string): Promise<{ success: boolean; roomId: string }> => {
    console.log(`[LiveKit] Criando sala no backend...`);
    console.log(`[LiveKit] ID da sala: ${roomId}`);
    const res = await api.createLiveKitRoom(roomId);
    return { success: res.success, roomId };
  },

  endRoom: async (roomId: string): Promise<{ success: boolean }> => {
    console.log(`[LiveKit] Finalizando sala no backend...`);
    console.log(`[LiveKit] ID da sala: ${roomId}`);
    const res = await api.deleteLiveKitRoom(roomId);
    return { success: res.success };
  },

  getChatToken: async (streamId: string, userId: string, isHost: boolean): Promise<{ token: string; serverUrl: string }> => {
    console.log('[LIVEKIT-API] getChatToken chamado streamId:', streamId, 'userId:', userId, 'isHost:', isHost);
    
    if (isHost) {
      // Host precisa de canPublish: true — usar endpoint publisher-aware
      // A sala LiveKit é criada com prefixo 'live_' pelo backend (LiveKitTokenService.getLiveRoomName)
      const roomName = `live_${streamId}`;
      console.log('[LIVEKIT-API] Usando getLiveKitToken com publisher=true para o Host, room:', roomName);
      const result = await api.getLiveKitToken(roomName, userId, true);
      console.log('[LIVEKIT-API] Token de host gerado via getLiveKitToken');
      return { token: result.token, serverUrl: result.livekitUrl || result.serverUrl };
    }
    
    // Espectador: token com canPublish: false (padrão)
    const res = await api.post('/api/livekit/chat-token', { streamId });
    return { token: res.token, serverUrl: res.serverUrl };
  },
};
