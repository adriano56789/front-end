import { Room } from 'livekit-client';

// ── Singleton Room — única instância por aplicação ──
// LiveKit: conexão de sala, chat, eventos, presença via data channels.
// Mídia (câmera/microfone) é publicada via WHIP diretamente ao SRS.
// Documentação: https://docs.livekit.io/client-sdk-js/

let roomInstance: Room | null = null;
let connectPromise: Promise<void> | null = null;

/**
 * Retorna a instância singleton da Room LiveKit.
 * A primeira chamada cria a Room; chamadas subsequentes retornam a mesma.
 */
export function getLiveKitRoom(): Room {
  if (!roomInstance) {
    roomInstance = new Room({
      adaptiveStream: false,
      dynacast: false,
      autoSubscribe: true, // LiveKit docs: subscribe to all tracks automatically
    });
  }
  return roomInstance;
}

/**
 * Conecta a Room singleton se ainda não estiver conectada.
 * Retorna a mesma Promise para chamadas concorrentes (evita múltiplas conexões).
 */
export async function connectLiveKitRoom(url: string, token: string): Promise<void> {
  const room = getLiveKitRoom();

  // Já conectado ou conectando — reutilizar
  if (room.state === 'connected') return;
  if (room.state === 'connecting' || room.state === 'reconnecting') {
    // Aguardar a conexão em andamento
    if (connectPromise) return connectPromise;
    // Se não há promise mas o estado é 'connecting' (raro), esperar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));
    return;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      await room.connect(url, token);
      console.log('[LiveKitRoom] ✅ Conectado | room:', room.name, '| participants:', room.remoteParticipants.size);
    } catch (err) {
      connectPromise = null; // reset em caso de falha
      throw err;
    }
  })();

  return connectPromise;
}

/**
 * Desconecta a Room singleton.
 */
export async function disconnectLiveKitRoom(): Promise<void> {
  if (!roomInstance) return;
  connectPromise = null;
  try {
    roomInstance.disconnect();
  } catch (_) {}
  roomInstance = null;
}

/**
 * Envia dados com topic 'livechat' (padrão para toda mensagem de chat/presença/gift/like).
 * Todos os participantes recebem no handler DataReceived com topic='livechat'.
 */
export async function sendLiveKitData(payload: any): Promise<boolean> {
  const room = getLiveKitRoom();
  if (room.state !== 'connected') {
    console.warn('[LiveKitRoom] sendData ignorado — Room não conectada');
    return false;
  }
  try {
    const data = new TextEncoder().encode(JSON.stringify(payload));
    await room.localParticipant.publishData(data, {
      reliable: true,
      topic: 'livechat',
    });
    return true;
  } catch (err) {
    console.warn('[LiveKitRoom] sendData erro:', err);
    return false;
  }
}
