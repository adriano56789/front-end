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

// ═══════════════════════════════════════════════════════════════════
// 📡 BYTE STREAMS — Envio de imagens e arquivos via LiveKit
// Docs: https://docs.livekit.io/transport/data/byte-streams/
// ═══════════════════════════════════════════════════════════════════

/**
 * Envia um arquivo (imagem, etc.) via Byte Streams.
 * Usa sendFile() do LiveKit — envia dados binários em tempo real.
 * O tópico 'chat-image' separa imagens do chat de texto.
 * Opcional: callback onProgress para monitorar progresso do upload.
 */
export async function sendFileBytes(
  file: File,
  topic: string = 'chat-image',
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const room = getLiveKitRoom();
  if (room.state !== 'connected' || !room.localParticipant) {
    console.warn('[ByteStream] sendFile ignorado — Room não conectada');
    return false;
  }
  try {
    const options: any = { topic };
    if (typeof onProgress === 'function') {
      options.onProgress = onProgress;
    }
    await room.localParticipant.sendFile(file, options);
    console.log('[ByteStream] ✅ Arquivo enviado:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.warn('[ByteStream] sendFile erro:', err);
    return false;
  }
}

/**
 * Registra um handler para receber Byte Streams de um tópico específico.
 * O callback recebe o reader (ByteStreamReader) e o participant que enviou.
 * O reader pode ser usado para ler chunks progressivamente ou usar readAll().
 * Docs: https://docs.livekit.io/transport/data/byte-streams/
 */
export function registerByteStreamHandler(
  topic: string,
  handler: (reader: any, participant: any) => void
): void {
  const room = getLiveKitRoom();
  room.registerByteStreamHandler(topic, handler);
}

/**
 * Cria um stream de bytes para envio contínuo de dados binários.
 * Retorna um ByteStreamWriter que deve ser fechado com .close() após o envio.
 * Docs: https://docs.livekit.io/transport/data/byte-streams/
 */
export async function streamBytes(
  topic: string = 'file-transfer'
): Promise<any | null> {
  const room = getLiveKitRoom();
  if (room.state !== 'connected' || !room.localParticipant) {
    console.warn('[ByteStream] streamBytes ignorado — Room não conectada');
    return null;
  }
  try {
    const writer = await room.localParticipant.streamBytes({ topic });
    return writer;
  } catch (err) {
    console.warn('[ByteStream] streamBytes erro:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📡 RPC — Comandos remotos entre participantes
// Docs: https://docs.livekit.io/transport/data/rpc/
// ═══════════════════════════════════════════════════════════════════

/**
 * Registra um método RPC que outros participantes podem chamar.
 * O handler deve retornar uma string (resposta) ou lançar um erro.
 */
export function registerRpcMethod(
  method: string,
  handler: (data: any) => Promise<string>
): void {
  const room = getLiveKitRoom();
  try {
    room.registerRpcMethod(method, async (invocationData: any) => {
      try {
        return await handler(invocationData);
      } catch (err: any) {
        // Relançar como RpcError para o LiveKit transmitir ao caller
        throw err;
      }
    });
    console.log('[RPC] ✅ Método registrado:', method);
  } catch (err) {
    console.warn('[RPC] Erro ao registrar método', method, ':', err);
  }
}

/**
 * Executa uma chamada RPC em outro participante.
 * Retorna a resposta como string ou lança erro com código do LiveKit.
 * Timeout padrão: 10 segundos (configurável).
 */
export async function performRpc(
  destinationIdentity: string,
  method: string,
  payload: string,
  timeout: number = 10000
): Promise<string> {
  const room = getLiveKitRoom();
  if (room.state !== 'connected' || !room.localParticipant) {
    throw new Error('Room not connected');
  }
  try {
    const response = await room.localParticipant.performRpc({
      destinationIdentity,
      method,
      payload,
      responseTimeout: timeout,
    });
    return response;
  } catch (err: any) {
    // Repassar erros nativos do LiveKit
    const code = err?.code || err?.name || 'UNKNOWN';
    const message = err?.message || String(err);
    console.warn('[RPC] performRpc falhou:', method, '->', destinationIdentity, ':', code, message);
    throw { code, message, originalError: err };
  }
}
