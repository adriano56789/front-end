import * as protobuf from 'protobufjs';
import { api } from '../../../services/api';

const FALLBACK_PROTO_TEXT = `
syntax = "proto3";

package livego;

// Mensagem base para todos os eventos
message BaseEvent {
  string type = 1;
  int64 timestamp = 2;
  string stream_id = 3;
}

// Mensagem de chat
message ChatMessage {
  string user_id = 1;
  string user_name = 2;
  string user_avatar = 3;
  string message = 4;
  int64 timestamp = 5;
}

// Evento de chat
message ChatEvent {
  BaseEvent base = 1;
  ChatMessage chat = 2;
}

// Presente
message Gift {
  string gift_id = 1;
  string gift_name = 2;
  string gift_icon = 3;
  int32 gift_price = 4;
  int32 quantity = 5;
  int32 total_value = 6;
}

// Usuário
message User {
  string user_id = 1;
  string user_name = 2;
  string user_avatar = 3;
  int32 user_level = 4;
}

// Evento de presente
message GiftEvent {
  BaseEvent base = 1;
  User from_user = 2;
  User to_user = 3;
  Gift gift = 4;
  int64 timestamp = 5;
}

// Evento de entrada de usuário
message UserJoinedEvent {
  BaseEvent base = 1;
  User user = 2;
  int64 timestamp = 3;
}

// Evento de join na stream
message JoinStreamEvent {
  BaseEvent base = 1;
  string user_id = 2;
  int64 timestamp = 3;
}

// Evento de saída de usuário
message UserLeftEvent {
  BaseEvent base = 1;
  User user = 2;
  int64 timestamp = 3;
}

// Status da stream
message StreamStatus {
  string status = 1;
  int32 viewers = 2;
  string host_id = 3;
  string host_name = 4;
}

// Evento de status da stream
message StreamStatusEvent {
  BaseEvent base = 1;
  StreamStatus status = 2;
  int64 timestamp = 3;
}

// Informações da stream
message StreamInfo {
  string stream_id = 1;
  string stream_title = 2;
  string stream_description = 3;
  string host_id = 4;
  string host_name = 5;
  string host_avatar = 6;
  int32 viewers = 7;
  int32 coins = 8;
  string status = 9;
  int64 start_time = 10;
}

// Evento de informações da stream
message StreamInfoEvent {
  BaseEvent base = 1;
  StreamInfo info = 2;
  int64 timestamp = 3;
}

// Evento wrapper principal - pode conter qualquer tipo de evento
message LiveEvent {
  oneof event {
    ChatEvent chat = 1;
    GiftEvent gift = 2;
    UserJoinedEvent user_joined = 3;
    UserLeftEvent user_left = 4;
    StreamStatusEvent stream_status = 5;
    StreamInfoEvent stream_info = 6;
    JoinStreamEvent join_stream = 7;
  }
}
`;

// Carregar o arquivo .proto
let root: protobuf.Root;
let LiveEvent: protobuf.Type;
let ChatEvent: protobuf.Type;
let GiftEvent: protobuf.Type;
let UserJoinedEvent: protobuf.Type;
let StreamStatusEvent: protobuf.Type;
let StreamInfoEvent: protobuf.Type;
let JoinStreamEvent: protobuf.Type;

// Carrega o schema sincronamente
function loadSchemaText(protoText: string): boolean {
  try {
    const parseResult = protobuf.parse(protoText);
    root = parseResult.root;

    LiveEvent = root.lookupType('livego.LiveEvent');
    ChatEvent = root.lookupType('livego.ChatEvent');
    GiftEvent = root.lookupType('livego.GiftEvent');
    UserJoinedEvent = root.lookupType('livego.UserJoinedEvent');
    StreamStatusEvent = root.lookupType('livego.StreamStatusEvent');
    StreamInfoEvent = root.lookupType('livego.StreamInfoEvent');
    JoinStreamEvent = root.lookupType('livego.JoinStreamEvent');
    return true;
  } catch (err) {
    console.error('❌ [PROTOBUF] Error parsing schema:', err);
    return false;
  }
}

// Inicializar síncrono com o fallback imediatamente
loadSchemaText(FALLBACK_PROTO_TEXT);

// Inicializar o Protobuf (e atualizar opcionalmente do backend)
async function initProtobuf() {
  try {
    // Garantir que já temos os tipos carregados com o fallback estático
    if (!ChatEvent) {
      loadSchemaText(FALLBACK_PROTO_TEXT);
    }
    
    // Tentar atualizar dinamicamente a partir do backend
    try {
      const protoText = await api.getProtobufDefinition();
      if (protoText && protoText.trim().startsWith('syntax')) {
        const success = loadSchemaText(protoText);
        if (success) {
          console.log('✅ [PROTOBUF] Protocol buffers dynamically updated from backend successfully');
          return;
        }
      }
    } catch (apiError) {
      console.warn('⚠️ [PROTOBUF] Could not fetch dynamic proto definition, using embedded fallback:', apiError.message);
    }
    
    console.log('✅ [PROTOBUF] Protocol buffers initialized successfully (using embedded fallback)');
  } catch (error) {
    console.error('❌ [PROTOBUF] Error during protocol buffers initialization:', error);
  }
}

// Classe de serviço para Protobuf
export class ProtobufService {
  private static initialized = false;
  
  static async init() {
    if (!this.initialized) {
      await initProtobuf();
      this.initialized = true;
    }
  }
  
  // Codificar evento de chat para binário
  static encodeChatEvent(streamId: string, userId: string, userName: string, userAvatar: string, message: string): Uint8Array | null {
    try {
      const chatEvent = {
        chat: {
          base: {
            type: 'chat',
            timestamp: Date.now(),
            stream_id: streamId
          },
          chat: {
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            message: message,
            timestamp: Date.now()
          }
        }
      };
      
      const errMsg = ChatEvent.verify(chatEvent);
      if (errMsg) {
        console.error('❌ [PROTOBUF] ChatEvent verification failed:', errMsg);
        return null;
      }
      
      const protobufMessage = ChatEvent.create(chatEvent);
      const buffer = ChatEvent.encode(protobufMessage).finish();
      
      console.log(`📦 [PROTOBUF] Chat event encoded:`, buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('❌ [PROTOBUF] Error encoding chat event:', error);
      return null;
    }
  }
  
  // Codificar evento de presente para binário
  static encodeGiftEvent(
    streamId: string,
    fromUserId: string, fromUserName: string, fromUserAvatar: string,
    toUserId: string, toUserName: string, toUserAvatar: string,
    giftId: string, giftName: string, giftIcon: string,
    giftPrice: number, quantity: number = 1
  ): Uint8Array | null {
    try {
      const giftEvent = {
        gift: {
          base: {
            type: 'gift',
            timestamp: Date.now(),
            stream_id: streamId
          },
          from_user: {
            user_id: fromUserId,
            user_name: fromUserName,
            user_avatar: fromUserAvatar,
            user_level: 1
          },
          to_user: {
            user_id: toUserId,
            user_name: toUserName,
            user_avatar: toUserAvatar,
            user_level: 1
          },
          gift: {
            gift_id: giftId,
            gift_name: giftName,
            gift_icon: giftIcon,
            gift_price: giftPrice,
            quantity: quantity,
            total_value: giftPrice * quantity
          },
          timestamp: Date.now()
        }
      };
      
      const errMsg = GiftEvent.verify(giftEvent);
      if (errMsg) {
        console.error('❌ [PROTOBUF] GiftEvent verification failed:', errMsg);
        return null;
      }
      
      const protobufMessage = GiftEvent.create(giftEvent);
      const buffer = GiftEvent.encode(protobufMessage).finish();
      
      console.log(`📦 [PROTOBUF] Gift event encoded:`, buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('❌ [PROTOBUF] Error encoding gift event:', error);
      return null;
    }
  }
  
  // Codificar evento de entrada de usuário para binário
  static encodeUserJoinedEvent(streamId: string, userId: string, userName: string, userAvatar: string, userLevel: number = 1): Uint8Array | null {
    try {
      const userJoinedEvent = {
        user_joined: {
          base: {
            type: 'user_joined',
            timestamp: Date.now(),
            stream_id: streamId
          },
          user: {
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            user_level: userLevel
          },
          timestamp: Date.now()
        }
      };
      
      const errMsg = UserJoinedEvent.verify(userJoinedEvent);
      if (errMsg) {
        console.error('❌ [PROTOBUF] UserJoinedEvent verification failed:', errMsg);
        return null;
      }
      
      const protobufMessage = UserJoinedEvent.create(userJoinedEvent);
      const buffer = UserJoinedEvent.encode(protobufMessage).finish();
      
      console.log(`📦 [PROTOBUF] User joined event encoded:`, buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('❌ [PROTOBUF] Error encoding user joined event:', error);
      return null;
    }
  }
  
  // Codificar evento de status da stream para binário
  static encodeStreamStatusEvent(streamId: string, status: string, viewers: number = 0, hostId: string = '', hostName: string = ''): Uint8Array | null {
    try {
      const streamStatusEvent = {
        stream_status: {
          base: {
            type: 'stream_status',
            timestamp: Date.now(),
            stream_id: streamId
          },
          status: {
            status: status,
            viewers: viewers,
            host_id: hostId,
            host_name: hostName
          },
          timestamp: Date.now()
        }
      };
      
      const errMsg = StreamStatusEvent.verify(streamStatusEvent);
      if (errMsg) {
        console.error('❌ [PROTOBUF] StreamStatusEvent verification failed:', errMsg);
        return null;
      }
      
      const protobufMessage = StreamStatusEvent.create(streamStatusEvent);
      const buffer = StreamStatusEvent.encode(protobufMessage).finish();
      
      console.log(`📦 [PROTOBUF] Stream status event encoded:`, buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('❌ [PROTOBUF] Error encoding stream status event:', error);
      return null;
    }
  }
  
  // Decodificar evento binário para objeto
  static decodeEvent(buffer: Uint8Array): any | null {
    if (!buffer || buffer.length === 0) return null;

    // Se o buffer começar com '{' (123) ou '[' (91), é garantido ser uma string JSON
    if (buffer[0] === 123 || buffer[0] === 91) {
      try {
        const jsonString = new TextDecoder().decode(buffer);
        const event = JSON.parse(jsonString);
        return event;
      } catch (jsonError) {
        console.error('❌ [JSON] Erro ao decodificar string JSON:', jsonError);
        return null;
      }
    }

    // Caso contrário, tratar como Protobuf real
    if (LiveEvent) {
      try {
        const decoded = LiveEvent.decode(buffer);
        const obj = LiveEvent.toObject(decoded, {
          longs: Number,
          enums: String,
          defaults: true,
          oneofs: true
        });
        console.log(`📦 [PROTOBUF] Decoded protobuf event successfully`);
        return obj;
      } catch (protobufError) {
        console.error('❌ [PROTOBUF] Erro ao decodificar evento Protobuf:', protobufError);
      }
    }

    return null;
  }
  
  // Converter buffer para HEX (para debug)
  static bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }
  
  // Codificar evento de join_stream para binário
  static encodeJoinStreamEvent(streamId: string, userId: string): Uint8Array | null {
    try {
      const joinStreamEvent = {
        join_stream: {
          base: {
            type: 'join_stream',
            timestamp: Date.now(),
            stream_id: streamId
          },
          user_id: userId,
          timestamp: Date.now()
        }
      };
      
      const errMsg = JoinStreamEvent.verify(joinStreamEvent);
      if (errMsg) {
        console.error('❌ [PROTOBUF] JoinStreamEvent verification failed:', errMsg);
        return null;
      }
      
      const protobufMessage = JoinStreamEvent.create(joinStreamEvent);
      const buffer = JoinStreamEvent.encode(protobufMessage).finish();
      
      console.log(`📦 [PROTOBUF] Join stream event encoded:`, buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('❌ [PROTOBUF] Error encoding join stream event:', error);
      return null;
    }
  }

  // Converter HEX para buffer
  static hexToBuffer(hex: string): Uint8Array {
    const hexString = hex.replace(/\s/g, '');
    const buffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      buffer[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return buffer;
  }
}

// Exportar função de inicialização
export { initProtobuf };
