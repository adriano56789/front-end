import * as protobuf from 'protobufjs';

// Carregar o arquivo .proto
let root: protobuf.Root;
let LiveEvent: protobuf.Type;
let ChatEvent: protobuf.Type;
let GiftEvent: protobuf.Type;
let UserJoinedEvent: protobuf.Type;
let StreamStatusEvent: protobuf.Type;
let StreamInfoEvent: protobuf.Type;
let JoinStreamEvent: protobuf.Type;

// Inicializar o Protobuf
async function initProtobuf() {
  try {
    // Usar caminho absoluto a partir da raiz do projeto
    root = await protobuf.load('/protobuf/livego.proto');
    LiveEvent = root.lookupType('livego.LiveEvent');
    ChatEvent = root.lookupType('livego.ChatEvent');
    GiftEvent = root.lookupType('livego.GiftEvent');
    UserJoinedEvent = root.lookupType('livego.UserJoinedEvent');
    StreamStatusEvent = root.lookupType('livego.StreamStatusEvent');
    StreamInfoEvent = root.lookupType('livego.StreamInfoEvent');
    JoinStreamEvent = root.lookupType('livego.JoinStreamEvent');
    
    console.log('✅ [PROTOBUF] Protocol buffers loaded successfully');
  } catch (error) {
    console.error('❌ [PROTOBUF] Error loading protocol buffers:', error);
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
    // Tentar decodificar como Protobuf primeiro
    if (LiveEvent) {
      try {
        const decoded = LiveEvent.decode(buffer);
        const obj = LiveEvent.toObject(decoded, {
          longs: Number,
          enums: String,
          defaults: true,
          oneofs: true
        });
        console.log(`📦 [PROTOBUF] Decoded protobuf event`);
        return obj;
      } catch (protobufError) {
      }
    }

    // Fallback: tentar decodificar como JSON string
    try {
      const jsonString = new TextDecoder().decode(buffer);
      const event = JSON.parse(jsonString);
      return event;
    } catch (jsonError) {
      console.error('❌ [PROTOBUF] Error decoding event:', jsonError);
      return null;
    }
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
