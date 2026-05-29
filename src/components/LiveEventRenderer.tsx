// Componente para renderização instantânea de eventos binários em tempo real
// Escuta eventos globais do BinaryDecoder e renderiza na UI sem delay

import React, { useEffect, useState, useRef } from 'react';
import { EventType } from '../services/BinaryProtocol';

interface LiveEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: any;
  renderKey: string;
}

interface LiveEventRendererProps {
  streamId?: string;
  maxEvents?: number;
}

export const LiveEventRenderer: React.FC<LiveEventRendererProps> = ({ 
  streamId, 
  maxEvents = 100 
}) => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamStatus, setStreamStatus] = useState<'starting' | 'live' | 'paused' | 'ended'>('starting');
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listener para mensagens de chat
    const handleChatMessage = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.CHAT_MESSAGE,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `chat_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Listener para presentes
    const handleGiftSent = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.GIFT_SENT,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `gift_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Listener para entrada de usuários
    const handleUserJoined = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.USER_JOINED,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `join_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Listener para saída de usuários
    const handleUserLeft = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.USER_LEFT,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `leave_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Listener para status da stream
    const handleStreamStatus = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setStreamStatus(detail.status);
        setViewerCount(detail.viewers);
        
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.STREAM_STATUS,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `status_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Listener para atualização de viewers
    const handleViewersUpdate = (event: CustomEvent) => {
      const { detail } = event;
      if (!streamId || detail.streamId === streamId) {
        setViewerCount(detail.viewers);
        
        const newEvent: LiveEvent = {
          id: detail.id,
          type: EventType.VIEWERS_UPDATE,
          timestamp: detail.timestamp,
          data: detail,
          renderKey: `viewers_${detail.id}`
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      }
    };

    // Registrar listeners
    window.addEventListener('livego:chat_message', handleChatMessage as EventListener);
    window.addEventListener('livego:gift_sent', handleGiftSent as EventListener);
    window.addEventListener('livego:user_joined', handleUserJoined as EventListener);
    window.addEventListener('livego:user_left', handleUserLeft as EventListener);
    window.addEventListener('livego:stream_status', handleStreamStatus as EventListener);
    window.addEventListener('livego:viewers_update', handleViewersUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('livego:chat_message', handleChatMessage as EventListener);
      window.removeEventListener('livego:gift_sent', handleGiftSent as EventListener);
      window.removeEventListener('livego:user_joined', handleUserJoined as EventListener);
      window.removeEventListener('livego:user_left', handleUserLeft as EventListener);
      window.removeEventListener('livego:stream_status', handleStreamStatus as EventListener);
      window.removeEventListener('livego:viewers_update', handleViewersUpdate as EventListener);
    };
  }, [streamId, maxEvents]);

  // Auto-scroll para eventos mais recentes
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const renderEvent = (event: LiveEvent) => {
    const { type, data, timestamp } = event;

    switch (type) {
      case EventType.CHAT_MESSAGE:
        return (
          <div key={event.renderKey} className="chat-event">
            <div className="event-header">
              <img src={data.userAvatar} alt={data.userName} className="user-avatar" />
              <span className="user-name">{data.userName}</span>
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="event-content">{data.message}</div>
          </div>
        );

      case EventType.GIFT_SENT:
        return (
          <div key={event.renderKey} className="gift-event">
            <div className="event-header">
              <img src={data.fromUserAvatar} alt={data.fromUserName} className="user-avatar" />
              <span className="user-name">{data.fromUserName}</span>
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="gift-content">
              <img src={data.giftIcon} alt={data.giftName} className="gift-icon" />
              <span className="gift-name">{data.giftName}</span>
              <span className="gift-quantity">x{data.quantity}</span>
              <span className="gift-value">{data.totalValue} coins</span>
            </div>
          </div>
        );

      case EventType.USER_JOINED:
        return (
          <div key={event.renderKey} className="user-joined-event">
            <div className="event-header">
              <img src={data.userAvatar} alt={data.userName} className="user-avatar" />
              <span className="user-name">{data.userName}</span>
              <span className="user-level">Level {data.userLevel}</span>
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="event-content">🎉 Entrou na live</div>
          </div>
        );

      case EventType.USER_LEFT:
        return (
          <div key={event.renderKey} className="user-left-event">
            <div className="event-header">
              <span className="user-name">{data.userName}</span>
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="event-content">👋 Saiu da live</div>
          </div>
        );

      case EventType.STREAM_STATUS:
        return (
          <div key={event.renderKey} className="stream-status-event">
            <div className="event-header">
              <span className="status-label">Status da Stream</span>
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="event-content">
              <span className={`status ${data.status}`}>{data.status.toUpperCase()}</span>
              <span className="viewers">{data.viewers} viewers</span>
            </div>
          </div>
        );

      case EventType.VIEWERS_UPDATE:
        return (
          <div key={event.renderKey} className="viewers-update-event">
            <div className="event-header">
              <span className="timestamp">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="event-content">
              <span className="viewers-count">👁️ {data.viewers} viewers</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="live-event-renderer">
      <div className="stream-info">
        <h3>Live Events - Real Time</h3>
        <div className="status-bar">
          <span className={`stream-status ${streamStatus}`}>
            {streamStatus.toUpperCase()}
          </span>
          <span className="viewer-count">
            👁️ {viewerCount} viewers
          </span>
        </div>
      </div>
      
      <div className="events-container">
        {events.map(renderEvent)}
        <div ref={eventsEndRef} />
      </div>
      
      <style jsx>{`
        .live-event-renderer {
          max-width: 400px;
          height: 500px;
          border: 1px solid #333;
          border-radius: 8px;
          background: #1a1a1a;
          color: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .stream-info {
          padding: 12px;
          background: #2a2a2a;
          border-bottom: 1px solid #333;
        }

        .stream-info h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #00ff88;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .stream-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
        }

        .stream-status.live {
          background: #ff4444;
          color: white;
        }

        .stream-status.starting {
          background: #ffaa00;
          color: white;
        }

        .stream-status.paused {
          background: #ffaa00;
          color: white;
        }

        .stream-status.ended {
          background: #666;
          color: white;
        }

        .viewer-count {
          color: #00ff88;
        }

        .events-container {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-name {
          font-weight: bold;
          color: #00ff88;
        }

        .user-level {
          background: #ff6b6b;
          color: white;
          padding: 1px 6px;
          border-radius: 8px;
          font-size: 10px;
        }

        .timestamp {
          margin-left: auto;
          color: #888;
          font-size: 10px;
        }

        .event-content {
          margin-left: 32px;
          font-size: 13px;
          line-height: 1.3;
        }

        .chat-event {
          margin-bottom: 8px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .gift-event {
          margin-bottom: 8px;
          padding: 4px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
          border-radius: 4px;
          border: 1px solid rgba(255, 215, 0, 0.3);
        }

        .gift-content {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 32px;
        }

        .gift-icon {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .gift-name {
          color: #ffd700;
          font-weight: bold;
        }

        .gift-quantity {
          color: #ff6b6b;
          font-weight: bold;
        }

        .gift-value {
          margin-left: auto;
          color: #00ff88;
          font-weight: bold;
        }

        .user-joined-event {
          margin-bottom: 6px;
          padding: 4px;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
        }

        .user-left-event {
          margin-bottom: 6px;
          padding: 4px;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 4px;
        }

        .stream-status-event {
          margin-bottom: 6px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .viewers-update-event {
          margin-bottom: 4px;
          padding: 2px 4px;
          background: rgba(0, 255, 136, 0.05);
          border-radius: 2px;
        }

        .viewers-count {
          color: #00ff88;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default LiveEventRenderer;
