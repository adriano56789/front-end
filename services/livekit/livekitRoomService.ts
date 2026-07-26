import { Room } from 'livekit-client';

// ── Singleton Room — única instância por aplicação ──
// 📡 Text Streams: chat em tempo real via LiveKit (documentação oficial).
// SRS: mídia (câmera/microfone) via WHIP.
// LiveKit: sala, participantes, chat (Text Streams), tracks, metadados.
// Documentação Text Streams: https://docs.livekit.io/transport/data/text-streams/

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
      autoSubscribe: true,
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

  if (room.state === 'connected') return;
  if (room.state === 'connecting' || room.state === 'reconnecting') {
    if (connectPromise) return connectPromise;
    await new Promise(resolve => setTimeout(resolve, 2000));
    return;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      await room.connect(url, token);
      console.log('[LiveKitRoom] ✅ Conectado | room:', room.name, '| participants:', room.remoteParticipants.size);
    } catch (err) {
      connectPromise = null;
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

// ═══════════════════════════════════════════════════════════════════
// 📡 TEXT STREAMS — Chat em tempo real via LiveKit
// Docs: https://docs.livekit.io/transport/data/text-streams/
// ═══════════════════════════════════════════════════════════════════

/**
 * Envia uma mensagem de texto via Text Streams (topic 'chat').
 * Usa sendText() do LiveKit — o SDK fragmenta automaticamente para mensagens grandes.
 * LiveKit entrega para todos os participantes conectados que registraram handler para o topic.
 */
export async function sendTextStream(
  topic: string,
  payload: any
): Promise<boolean> {
  const room = getLiveKitRoom();
  if (room.state !== 'connected' || !room.localParticipant) {
    console.warn('[TextStream] sendText ignorado — Room não conectada');
    return false;
  }
  try {
    const text = JSON.stringify(payload);
    await room.localParticipant.sendText(text, { topic });
    return true;
  } catch (err) {
    console.warn('[TextStream] sendText erro:', err);
    return false;
  }
}

/**
 * Registra um handler para receber Text Streams de um tópico específico.
 * O callback recebe o reader (para ler chunks) e o participant que enviou.
 * Usar registerTextStreamHandler() conforme documentação oficial:
 * https://docs.livekit.io/reference/client-sdk-js/classes/Room.html#registerTextStreamHandler
 */
export function registerTextStreamHandler(
  topic: string,
  handler: (reader: any, participant: any) => void
): void {
  const room = getLiveKitRoom();
  room.registerTextStreamHandler(topic, handler);
}


