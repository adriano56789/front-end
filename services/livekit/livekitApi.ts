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
    
    // UNIFICADO: host e viewers usam o mesmo endpoint POST /api/livekit/chat-token.
    // O backend detecta automaticamente se é host via userId === streamId
    // e concede canPublish: true (host) ou false (viewer) conforme necessário.
    //
    // Isso elimina a duplicidade de lógica entre dois endpoints diferentes
    // e garante que as permissões do token estejam sempre corretas.
    const res = await api.post('/api/livekit/chat-token', { streamId });
    console.log('[LIVEKIT-API] Token obtido via POST /chat-token (unificado)');
    return { token: res.token, serverUrl: res.serverUrl };
  },
};
