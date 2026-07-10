import React from 'react';
import { Conversation, User } from '../types';
import { CloseIcon } from './icons';

interface PrivateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (user: User) => void;
  conversations: Conversation[];
}

// Beautiful pill metallic badge for levels as requested/shown in the screenshot
const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(to bottom, #ffffff 0%, #e2e8f0 40%, #cbd5e1 100%)';
    let textCol = '#111111';
    let borderColor = '#ffffff';

    if (level >= 41) {
        bgGrad = 'linear-gradient(to bottom, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fda4af';
    } else if (level >= 21) {
        bgGrad = 'linear-gradient(to bottom, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0.5px rgba(255, 255, 255, 0.4)'
            }}
            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[10px] font-black font-sans tracking-tight h-[18px] select-none"
        >
            Lvl. {level}
        </span>
    );
};

const formatConvoTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    try {
        let dateVal = timestamp;
        if (timestamp && typeof timestamp === 'object') {
            if ('$date' in timestamp) {
                dateVal = timestamp.$date;
            } else if ('date' in timestamp) {
                dateVal = timestamp.date;
            } else {
                return '';
            }
        }
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) {
            return typeof timestamp === 'object' ? '' : String(timestamp);
        }
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Ontem';
        } else if (diffDays < 7) {
            const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return dias[date.getDay()];
        } else {
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }
    } catch {
        return typeof timestamp === 'object' ? '' : String(timestamp);
    }
};

const ConversationItem: React.FC<{ conversation: Conversation; onClick: () => void }> = ({ conversation, onClick }) => {
    return (
        <div 
            className="group flex items-center px-5 py-3 border-b border-zinc-900 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-all duration-200" 
            onClick={onClick}
        >
            {/* Avatar container with fixed size and deep custom glow border */}
            <div className="relative mr-4 flex-shrink-0">
                <div className="w-[52px] h-[52px] rounded-full p-[2px] bg-gradient-to-tr from-purple-800 via-purple-600 to-indigo-600 shadow-[0_0_12px_rgba(168,85,247,0.35)]">
                    <img 
                        src={conversation.friend.avatarUrl || 'https://placehold.co/150'} 
                        alt={conversation.friend.name} 
                        className="w-full h-full rounded-full object-cover border border-[#0d0d12]" 
                    />
                </div>
            </div>

            {/* Middle Section */}
            <div className="flex-grow min-w-0 pr-2">
                <div className="flex items-center gap-2">
                    {/* Golden yellow name explicitly as requested: "nome marelo" */}
                    <h3 className="font-extrabold text-[16px] truncate text-[#f8b600] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] filter brightness-110">
                        {conversation.friend.name}
                    </h3>
                    <div className="flex items-center flex-shrink-0">
                        <LevelBadge level={conversation.friend.level || 1} />
                    </div>
                </div>
                {/* Last Message preview */}
                <p className="text-sm text-zinc-400 mt-0.5 truncate font-medium group-hover:text-zinc-300">
                    {conversation.lastMessage || 'Mensagem de mídia'}
                </p>
            </div>

            {/* Right Section: Time & Unread bubble */}
            <div className="flex flex-col items-end flex-shrink-0 space-y-1.5">
                <span className="text-[11px] text-zinc-500 font-mono tracking-tighter">
                    {formatConvoTimestamp(conversation.timestamp)}
                </span>
                {conversation.unreadCount && conversation.unreadCount > 0 ? (
                    <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-red-600 text-white font-extrabold text-[9px] flex items-center justify-center shadow-lg shadow-red-600/30">
                        {conversation.unreadCount}
                    </span>
                ) : null}
            </div>
        </div>
    );
};

const PrivateChatModal: React.FC<PrivateChatModalProps> = ({ isOpen, onClose, onStartChat, conversations }) => {
  const handleStartChat = (user: User) => {
    onStartChat(user);
    onClose();
  };
  
  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300 ${isOpen ? 'bg-black/10 pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
      onClick={onClose}
    >
      {/* Pitch black design plate: bg-black / placa preta, rounded upper border, high height */}
      <div
        className={`bg-black border-t-2 border-zinc-900 w-full max-w-md h-[80vh] rounded-t-[2rem] flex flex-col transform transition-transform duration-300 ease-out shadow-[0_-20px_50px_rgba(0,0,0,0.9)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modern clean drag handle indicator */}
        <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mt-3.5 mb-1.5 flex-shrink-0"></div>

        {/* Beautiful Pitch Black Header layout */}
        <header className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-zinc-900 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Mensagens Privadas
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-full transition-all duration-200"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Conversation list: Scrollable over pure black plate */}
        <div className="flex-grow overflow-y-auto no-scrollbar pb-6 bg-[#000000]">
            {conversations.map(convo => (
                <ConversationItem key={convo.id} conversation={convo} onClick={() => handleStartChat(convo.friend)} />
            ))}
            {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-4">
                    <div className="w-14 h-14 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center shadow-inner">
                        <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v5.028z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-400 text-sm">Nenhuma mensagem direta</h3>
                        <p className="text-zinc-600 text-xs mt-1 max-w-xs leading-relaxed">
                            Suas conversas aparecerão aqui. Envie uma mensagem privada para começar!
                        </p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PrivateChatModal;
