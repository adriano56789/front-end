import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useTranslation } from '../i18n';
import { BellIcon, BellOffIcon, CloseIcon, GiftIcon, HeartIcon, ChatBubbleIcon, UserIcon, LiveBadge } from './icons';

interface NotificationItem {
  id: string;
  type: 'live_started' | 'gift_received' | 'new_follower' | 'new_message' | 'friend_request' | 'comment' | 'like' | 'system';
  title: string;
  body: string;
  image?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  meta?: Record<string, any>;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'Todas' },
  { key: 'live', label: 'Lives' },
  { key: 'gift', label: 'Presentes' },
  { key: 'follower', label: 'Seguidores' },
  { key: 'message', label: 'Mensagens' },
  { key: 'system', label: 'Sistema' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const CATEGORY_MAP: Record<CategoryKey, string[]> = {
  all: [],
  live: ['live_started'],
  gift: ['gift_received'],
  follower: ['new_follower', 'friend_request'],
  message: ['new_message', 'comment'],
  system: ['system', 'like'],
};

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  live_started: ({ className }) => (
    <div className={`${className} bg-red-500/20 rounded-full flex items-center justify-center`}>
      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4"/><path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm8-6a6 6 0 1 0 0 12A6 6 0 0 0 10 4z" opacity="0.3"/></svg>
    </div>
  ),
  gift_received: ({ className }) => (
    <div className={`${className} bg-purple-500/20 rounded-full flex items-center justify-center`}>
      <GiftIcon className="w-5 h-5 text-purple-400" />
    </div>
  ),
  new_follower: ({ className }) => (
    <div className={`${className} bg-blue-500/20 rounded-full flex items-center justify-center`}>
      <HeartIcon className="w-5 h-5 text-blue-400" />
    </div>
  ),
  new_message: ({ className }) => (
    <div className={`${className} bg-emerald-500/20 rounded-full flex items-center justify-center`}>
      <ChatBubbleIcon className="w-5 h-5 text-emerald-400" />
    </div>
  ),
  friend_request: ({ className }) => (
    <div className={`${className} bg-yellow-500/20 rounded-full flex items-center justify-center`}>
      <UserIcon className="w-5 h-5 text-yellow-400" />
    </div>
  ),
  comment: ({ className }) => (
    <div className={`${className} bg-cyan-500/20 rounded-full flex items-center justify-center`}>
      <ChatBubbleIcon className="w-5 h-5 text-cyan-400" />
    </div>
  ),
  like: ({ className }) => (
    <div className={`${className} bg-pink-500/20 rounded-full flex items-center justify-center`}>
      <HeartIcon className="w-5 h-5 text-pink-400" />
    </div>
  ),
  system: ({ className }) => (
    <div className={`${className} bg-gray-500/20 rounded-full flex items-center justify-center`}>
      <BellIcon className="w-5 h-5 text-gray-400" />
    </div>
  ),
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'agora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onNavigate }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data as NotificationItem[]);
      }
    } catch (err) {
      console.warn('[NotificationCenter] Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      setPermissionStatus(Notification.permission);
      setShowPermissionBanner(Notification.permission === 'default');
    }
  }, [isOpen, loadNotifications]);

  const filtered = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    const types = CATEGORY_MAP[activeCategory];
    return types.includes(n.type);
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      try { await api.markNotificationRead(n.id); } catch {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleEnableNotifications = async () => {
    try {
      const status = await Notification.requestPermission();
      setPermissionStatus(status);
      setShowPermissionBanner(false);
    } catch {}
  };

  const handleNotificationClick = (n: NotificationItem) => {
    handleMarkAsRead(n.id);
    if (n.actionUrl && onNavigate) {
      onClose();
      onNavigate(n.actionUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0e0e0e]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-lg font-bold text-white">Notificações</h2>
          {unreadCount > 0 && (
            <span className="bg-[#e1593c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-[#d0ae69] text-xs font-medium hover:underline">
            Marcar como lidas
          </button>
        )}
      </div>

      {/* Permission Banner */}
      {showPermissionBanner && (
        <div className="mx-4 mt-3 p-3 bg-[#1a1a2e] border border-[#d0ae69]/30 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d0ae69]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <BellIcon className="w-5 h-5 text-[#d0ae69]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Ative as notificações</p>
            <p className="text-white/50 text-xs">Receba alertas de lives, presentes e mensagens</p>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="bg-[#d0ae69] text-black text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Ativar
          </button>
          <button
            onClick={() => setShowPermissionBanner(false)}
            className="text-white/40 hover:text-white/70 p-1 flex-shrink-0"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {permissionStatus === 'denied' && (
        <div className="mx-4 mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3">
          <BellOffIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Notificações bloqueadas</p>
            <p className="text-red-300/60 text-xs">Ative nas configurações do navegador</p>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1 p-3 overflow-x-auto flex-shrink-0 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = cat.key === 'all' ? unreadCount : notifications.filter((n) => !n.read && CATEGORY_MAP[cat.key].includes(n.type)).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-[#d0ae69] text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-[#e1593c] text-white'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#d0ae69] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 text-sm mt-3">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <BellIcon className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm text-center">
              {activeCategory === 'all'
                ? 'Nenhuma notificação ainda'
                : `Nenhuma notificação de ${CATEGORIES.find((c) => c.key === activeCategory)?.label.toLowerCase()}`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((n) => {
              const IconComp = ICON_MAP[n.type] || ICON_MAP.system;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-white/5 ${
                    !n.read ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    {n.image ? (
                      <img
                        src={n.image}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 ${n.image ? 'hidden' : ''}`}>
                      <IconComp className="w-11 h-11" />
                    </div>
                    {!n.read && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#e1593c] rounded-full border-2 border-[#0e0e0e]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read ? 'text-white font-medium' : 'text-white/70'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-white/25 text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Action arrow */}
                  {n.actionUrl && (
                    <svg className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
