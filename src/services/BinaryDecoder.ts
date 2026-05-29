// Decodificador de pacotes binários para eventos em tempo real
// Processa pacotes binários do BuzzCast/LiveGo e renderiza instantaneamente na UI

import { BinaryEvent, EventType, BinaryProtocol } from './BinaryProtocol';

export interface DecodedEvent {
  id: string;
  type: EventType;
  timestamp: number;
  streamId?: string;
  data: any;
  renderTime: number;
}

export class BinaryDecoder {
  private eventQueue: DecodedEvent[] = [];
  private isProcessing = false;
  private renderCallbacks: Map<EventType, (event: DecodedEvent) => void> = new Map();
  
  constructor() {
    // Registrar callbacks de renderização para cada tipo de evento
    this.setupRenderCallbacks();
  }
  
  /**
   * Processa um pacote binário recebido via WebSocket
   */
  processBinaryPacket(buffer: ArrayBuffer): void {
    try {
      const startTime = performance.now();
      
      // Decodificar pacote
      const event = BinaryProtocol.decode(buffer);
      if (!event) {
        console.error('❌ [DECODER] Failed to decode binary packet');
        return;
      }
      
      // Criar evento decodificado com tempo de renderização
      const decodedEvent: DecodedEvent = {
        id: event.data?.id || `event_${event.type}_${Date.now()}`,
        type: event.type,
        timestamp: event.timestamp,
        streamId: event.streamId,
        data: event.data,
        renderTime: performance.now() - startTime
      };
      
      // Adicionar à fila para processamento imediato
      this.eventQueue.push(decodedEvent);
      
      // Processar fila sem bloquear UI
      this.processQueue();
      
      console.log(`📦 [DECODER] Binary packet decoded: ${EventType[event.type]} (${decodedEvent.renderTime.toFixed(2)}ms)`);
    } catch (error) {
      console.error('❌ [DECODER] Error processing binary packet:', error);
    }
  }
  
  /**
   * Processa fila de eventos em tempo real sem bloquear UI
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      
      // Renderizar evento imediatamente
      this.renderEvent(event);
      
      // Yield para não bloquear a UI
      if (this.eventQueue.length % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Renderiza evento na UI baseado no tipo
   */
  private renderEvent(event: DecodedEvent): void {
    const callback = this.renderCallbacks.get(event.type);
    if (callback) {
      try {
        callback(event);
      } catch (error) {
        console.error(`❌ [DECODER] Error rendering event ${EventType[event.type]}:`, error);
      }
    }
  }
  
  /**
   * Configura callbacks de renderização para cada tipo de evento
   */
  private setupRenderCallbacks(): void {
    // Chat messages
    this.renderCallbacks.set(EventType.CHAT_MESSAGE, (event) => {
      this.renderChatMessage(event);
    });
    
    // Gifts
    this.renderCallbacks.set(EventType.GIFT_SENT, (event) => {
      this.renderGift(event);
    });
    
    // User joined
    this.renderCallbacks.set(EventType.USER_JOINED, (event) => {
      this.renderUserJoined(event);
    });
    
    // User left
    this.renderCallbacks.set(EventType.USER_LEFT, (event) => {
      this.renderUserLeft(event);
    });
    
    // Stream status
    this.renderCallbacks.set(EventType.STREAM_STATUS, (event) => {
      this.renderStreamStatus(event);
    });
    
    // Viewers update
    this.renderCallbacks.set(EventType.VIEWERS_UPDATE, (event) => {
      this.renderViewersUpdate(event);
    });
    
    // Heartbeat
    this.renderCallbacks.set(EventType.HEARTBEAT, (event) => {
      this.renderHeartbeat(event);
    });
  }
  
  /**
   * Renderiza mensagem de chat em tempo real
   */
  private renderChatMessage(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:chat_message', {
      detail: {
        id: data.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        message: data.message,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`💬 [LIVE] Chat message rendered: ${data.userName}: ${data.message}`);
  }
  
  /**
   * Renderiza presente animado em tempo real
   */
  private renderGift(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:gift_sent', {
      detail: {
        id: data.id,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        fromUserAvatar: data.fromUserAvatar,
        giftId: data.giftId,
        giftName: data.giftName,
        giftIcon: data.giftIcon,
        giftPrice: data.giftPrice,
        quantity: data.quantity,
        totalValue: data.totalValue,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`🎁 [LIVE] Gift rendered: ${data.giftName} x${data.quantity} (${data.totalValue} coins)`);
  }
  
  /**
   * Renderiza entrada de usuário em tempo real
   */
  private renderUserJoined(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:user_joined', {
      detail: {
        id: data.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        userLevel: data.userLevel,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`👤 [LIVE] User joined: ${data.userName} (Level ${data.userLevel})`);
  }
  
  /**
   * Renderiza saída de usuário em tempo real
   */
  private renderUserLeft(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:user_left', {
      detail: {
        id: data.id,
        userId: data.userId,
        userName: data.userName,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`👋 [LIVE] User left: ${data.userName}`);
  }
  
  /**
   * Renderiza status da stream em tempo real
   */
  private renderStreamStatus(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:stream_status', {
      detail: {
        id: data.id,
        status: data.status,
        viewers: data.viewers,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`📡 [LIVE] Stream status: ${data.status} (${data.viewers} viewers)`);
  }
  
  /**
   * Renderiza atualização de viewers em tempo real
   */
  private renderViewersUpdate(event: DecodedEvent): void {
    const { data } = event;
    
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:viewers_update', {
      detail: {
        id: data.id,
        viewers: data.viewers,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`👁️ [LIVE] Viewers: ${data.viewers}`);
  }
  
  /**
   * Processa heartbeat (mantém conexão viva)
   */
  private renderHeartbeat(event: DecodedEvent): void {
    // Disparar evento global para UI components escutarem
    window.dispatchEvent(new CustomEvent('livego:heartbeat', {
      detail: {
        id: event.data.id,
        timestamp: event.timestamp,
        streamId: event.streamId
      }
    }));
    
    console.log(`💓 [LIVE] Heartbeat received`);
  }
  
  /**
   * Registra callback customizado para tipo de evento
   */
  registerCallback(eventType: EventType, callback: (event: DecodedEvent) => void): void {
    this.renderCallbacks.set(eventType, callback);
  }
  
  /**
   * Remove callback para tipo de evento
   */
  unregisterCallback(eventType: EventType): void {
    this.renderCallbacks.delete(eventType);
  }
  
  /**
   * Limpa fila de eventos
   */
  clearQueue(): void {
    this.eventQueue = [];
  }
  
  /**
   * Obtém estatísticas de processamento
   */
  getStats(): { queueSize: number; isProcessing: boolean } {
    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Instância global do decodificador
export const binaryDecoder = new BinaryDecoder();

export default binaryDecoder;
