// Componente simples para renderizar eventos de live em tempo real
// Escuta eventos globais do WebSocket e renderiza chat, presentes, etc.

import React, { useEffect, useState, useRef } from 'react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: number;
  streamId?: string;
}

interface GiftEvent {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  giftPrice: number;
  quantity: number;
  totalValue: number;
  timestamp: number;
  streamId?: string;
}

interface UserJoinedEvent {
  userId: string;
  userName: string;
  userAvatar: string;
  userLevel: number;
  timestamp: number;
  streamId?: string;
}

interface StreamStatusEvent {
  streamId?: string;
  status: 'starting' | 'live' | 'paused' | 'ended';
  viewers: number;
  timestamp: number;
}

interface LiveEventsDisplayProps {
  streamId?: string;
  maxEvents?: number;
}

export const LiveEventsDisplay: React.FC<LiveEventsDisplayProps> = ({ 
  streamId, 
  maxEvents = 50 
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gifts, setGifts] = useState<GiftEvent[]>([]);
  const [userJoins, setUserJoins] = useState<UserJoinedEvent[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatusEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar conexão WebSocket
    const checkConnection = () => {
      const socket = (window as any).socketService?.getSocket();
      setIsConnected(!!socket?.connected);
    };
    
    const interval = setInterval(checkConnection, 1000);
    checkConnection();

    // Listener para mensagens de chat
    const handleChatMessage = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setChatMessages(prev => [detail, ...prev].slice(0, maxEvents));
        console.log(`🗨️ [UI] Chat message rendered: ${detail.userName}: ${detail.message}`);
      }
    };

    // Listener para presentes
    const handleGiftReceived = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setGifts(prev => [detail, ...prev].slice(0, maxEvents));
        console.log(`🎁 [UI] Gift rendered: ${detail.giftName} x${detail.quantity} from ${detail.fromUserName}`);
      }
    };

    // Listener para entrada de usuários
    const handleUserJoined = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setUserJoins(prev => [detail, ...prev].slice(0, maxEvents));
        console.log(`👤 [UI] User joined rendered: ${detail.userName}`);
      }
    };

    // Listener para status da stream
    const handleStreamStatus = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setStreamStatus(detail);
        console.log(`📡 [UI] Stream status rendered: ${detail.status} (${detail.viewers} viewers)`);
      }
    };

    // Registrar listeners
    window.addEventListener('livego:chat_message', handleChatMessage as EventListener);
    window.addEventListener('livego:gift_received', handleGiftReceived as EventListener);
    window.addEventListener('livego:user_joined', handleUserJoined as EventListener);
    window.addEventListener('livego:stream_status', handleStreamStatus as EventListener);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('livego:chat_message', handleChatMessage as EventListener);
      window.removeEventListener('livego:gift_received', handleGiftReceived as EventListener);
      window.removeEventListener('livego:user_joined', handleUserJoined as EventListener);
      window.removeEventListener('livego:stream_status', handleStreamStatus as EventListener);
    };
  }, [streamId, maxEvents]);

  // Auto-scroll para eventos mais recentes
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, gifts, userJoins]);

  const renderChatMessage = (msg: ChatMessage, index: number) => (
    <div key={`chat-${index}`} className="event-item chat-event">
      <div className="event-header">
        <img src={msg.userAvatar} alt={msg.userName} className="user-avatar" />
        <span className="user-name">{msg.userName}</span>
        <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="event-content">{msg.message}</div>
    </div>
  );

  const renderGift = (gift: GiftEvent, index: number) => (
    <div key={`gift-${index}`} className="event-item gift-event">
      <div className="event-header">
        <img src={gift.fromUserAvatar} alt={gift.fromUserName} className="user-avatar" />
        <span className="user-name">{gift.fromUserName}</span>
        <span className="gift-quantity">x{gift.quantity}</span>
        <span className="timestamp">{new Date(gift.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="event-content gift-content">
        <span className="gift-icon">{gift.giftIcon}</span>
        <span className="gift-name">{gift.giftName}</span>
        <span className="gift-value">{gift.totalValue} coins</span>
      </div>
    </div>
  );

  const renderUserJoined = (user: UserJoinedEvent, index: number) => (
    <div key={`join-${index}`} className="event-item user-joined-event">
      <div className="event-header">
        <img src={user.userAvatar} alt={user.userName} className="user-avatar" />
        <span className="user-name">{user.userName}</span>
        <span className="user-level">Level {user.userLevel}</span>
        <span className="timestamp">{new Date(user.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="event-content">🎉 Entrou na live</div>
    </div>
  );

  // Combinar todos os eventos ordenados por timestamp
  const allEvents = [
    ...chatMessages.map(msg => ({ ...msg, type: 'chat' })),
    ...gifts.map(gift => ({ ...gift, type: 'gift' })),
    ...userJoins.map(user => ({ ...user, type: 'join' }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, maxEvents);

  return (
    <div className="live-events-display">
      <div className="events-header">
        <h3>🔥 Live Events - Real Time</h3>
        <div className="status-indicators">
          <div className={`indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </div>
          {streamStatus && (
            <div className={`indicator status-${streamStatus.status}`}>
              {streamStatus.status.toUpperCase()} ({streamStatus.viewers} viewers)
            </div>
          )}
        </div>
      </div>
      
      <div className="events-container">
        {allEvents.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum evento ainda. Conecte-se a uma stream para ver as interações em tempo real!</p>
          </div>
        ) : (
          allEvents.map((event, index) => {
            switch (event.type) {
              case 'chat':
                return renderChatMessage(event as ChatMessage, index);
              case 'gift':
                return renderGift(event as GiftEvent, index);
              case 'join':
                return renderUserJoined(event as UserJoinedEvent, index);
              default:
                return null;
            }
          })
        )}
        <div ref={eventsEndRef} />
      </div>
      
      <style jsx>{`
        .live-events-display {
          max-width: 500px;
          height: 600px;
          border: 2px solid #333;
          border-radius: 12px;
          background: #1a1a1a;
          color: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .events-header {
          padding: 16px;
          background: #2a2a2a;
          border-bottom: 2px solid #333;
        }

        .events-header h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          color: #ff6b6b;
          text-align: center;
        }

        .status-indicators {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .indicator {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: bold;
        }

        .indicator.connected {
          background: #00ff88;
          color: #000;
        }

        .indicator.disconnected {
          background: #ff4444;
          color: white;
        }

        .indicator.status-live {
          background: #ff4444;
          color: white;
          animation: pulse 2s infinite;
        }

        .indicator.status-starting {
          background: #ffaa00;
          color: white;
        }

        .indicator.status-paused {
          background: #ffaa00;
          color: white;
        }

        .indicator.status-ended {
          background: #666;
          color: white;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .events-container {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #888;
        }

        .event-item {
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 8px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #444;
        }

        .user-name {
          font-weight: bold;
          color: #00ff88;
          font-size: 13px;
        }

        .user-level {
          background: #ff6b6b;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .gift-quantity {
          background: #ffd700;
          color: #000;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .timestamp {
          margin-left: auto;
          color: #888;
          font-size: 10px;
        }

        .event-content {
          margin-left: 40px;
          font-size: 14px;
          line-height: 1.4;
        }

        .chat-event {
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid #00ff88;
        }

        .gift-event {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
          border-left: 3px solid #ffd700;
        }

        .gift-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gift-icon {
          font-size: 20px;
        }

        .gift-name {
          color: #ffd700;
          font-weight: bold;
        }

        .gift-value {
          margin-left: auto;
          color: #00ff88;
          font-weight: bold;
        }

        .user-joined-event {
          background: rgba(0, 255, 136, 0.1);
          border-left: 3px solid #00ff88;
        }

        /* Scrollbar styling */
        .events-container::-webkit-scrollbar {
          width: 8px;
        }

        .events-container::-webkit-scrollbar-track {
          background: #2a2a2a;
        }

        .events-container::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }

        .events-container::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
    </div>
  );
};

export default LiveEventsDisplay;
