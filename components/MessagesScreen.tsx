
import React, { useState, useEffect } from 'react';
import { Conversation, User, Streamer } from '../types';
import { useTranslation } from '../i18n';
import { FriendRequestListIcon, MaleIcon, FemaleIcon, RankIcon } from './icons';

interface MessagesScreenProps {
    onStartChat: (friend: User) => void;
    onViewProfile: (friend: User) => void;
    conversations: Conversation[];
    friends: User[];
    initialTab?: 'messages' | 'friends';
    onOpenFriendRequests: () => void;
    fans: User[];
    followingUsers: User[];
    liveStreamers?: Streamer[];
    onSelectStreamer?: (streamer: Streamer) => void;
}

const AgeBadge: React.FC<{ user: User }> = ({ user }) => (
    <span className={`text-white text-[11px] font-bold px-2 py-[1px] rounded-full flex items-center justify-center ${user.gender === 'male' ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
        {user.age || 22}
    </span>
);

const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)';
    let textCol = '#374151'; // dark silver-grey text for silver levels
    let borderColor = '#9ca3af'; // silver border
    let glow = '0 0 6px rgba(156, 163, 175, 0.3)';
    let starColor = 'text-slate-500 fill-current';

    if (level >= 41) {
        // Red/rose profile level style matching UserLevelsScreen for top levels
        bgGrad = 'linear-gradient(135deg, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fca5a5';
        glow = '0 0 10px rgba(244, 63, 94, 0.6)';
        starColor = 'text-rose-200 fill-current';
    } else if (level >= 21) {
        // Gold style
        bgGrad = 'linear-gradient(135deg, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
        glow = '0 0 10px rgba(245, 158, 11, 0.6)';
        starColor = 'text-amber-200 fill-current';
    } else if (level >= 11) {
        // Bronze style
        bgGrad = 'linear-gradient(135deg, #ffedd5 0%, #d97706 50%, #7c2d12 100%)';
        textCol = '#ffffff';
        borderColor = '#fed7aa';
        glow = '0 0 8px rgba(217, 119, 6, 0.5)';
        starColor = 'text-orange-200 fill-current';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: `${glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`
            }}
            className="relative inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold font-sans tracking-tight h-[16px] select-none space-x-0.5 overflow-hidden"
        >
            {/* Glass reflection shine overlay */}
            <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
            <RankIcon className={`w-2 h-2 relative z-10 ${starColor}`} />
            <span className="relative z-10 leading-none">Lvl. {level}</span>
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

interface ConversationItemProps {
    conversation: Conversation;
    onStartChat: (user: User) => void;
    onViewProfile: (user: User) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onStartChat, onViewProfile }) => {
    const friend = conversation.friend;
    if (!friend) return null; // Guard: never render without a friend object
    
    return (
        <div className="flex items-center pl-4 pr-3 pt-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => onStartChat(friend)}>
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(friend); }} className="relative flex-shrink-0 focus:outline-none rounded-full mr-3.5 mb-3 self-start mt-0.5">
                <img 
                    src={friend.avatarUrl || `https://picsum.photos/seed/${friend.id || 'default'}/200/200.jpg`} 
                    alt={friend.name || 'Usuário'} 
                    className="w-[54px] h-[54px] rounded-full object-cover border border-gray-600 shadow-sm"
                    onError={(e) => {
                        e.currentTarget.src = `https://picsum.photos/seed/${friend.id || 'default'}/200/200.jpg`;
                    }}
                />
                {friend.isOnline && (
                    <div className="absolute bottom-[2px] right-[2px] w-[13px] h-[13px] bg-[#4CAF50] rounded-full border-[2.5px] border-black"></div>
                )}
            </button>
            <div className="flex-grow min-w-0 border-b border-[#1c1c1e] pb-3.5 pr-1">
                <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center space-x-1.5 min-w-0 flex-wrap overflow-hidden">
                        <h3 className="font-semibold text-white text-[15.5px] truncate max-w-[130px]">{friend.name || '—'}</h3>
                        <AgeBadge user={friend} />
                        <LevelBadge level={friend.level || 1} />
                    </div>
                    <span className="text-[12px] text-[#A0A0A5] flex-shrink-0 ml-2 mt-0.5 whitespace-nowrap">
                        {formatConvoTimestamp(conversation.timestamp)}
                    </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-[14px] text-[#A0A0A5] truncate pr-2">
                        {conversation.lastMessage || <span className="text-[#A0A0A5]">Nenhuma mensagem ainda</span>}
                    </p>
                    {conversation.unreadCount && conversation.unreadCount > 0 ? (
                        <div className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {conversation.unreadCount}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};


const FriendRequestSummaryItem: React.FC<{ latestRequest: User | null; onClick: () => void; }> = ({ latestRequest, onClick }) => {
    const date = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    return (
        <div className="flex items-center p-4 space-x-4 cursor-pointer hover:bg-gray-800/50" onClick={onClick}>
            <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <FriendRequestListIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">Pedido de amizade</h3>
                    <span className="text-xs text-gray-500">{formattedDate}</span>
                </div>
                {latestRequest ? (
                    <p className="text-sm text-gray-400 mt-1 truncate">Você seguiu @{latestRequest.name}.</p>
                ) : (
                    <p className="text-sm text-gray-400 mt-1 truncate">Veja seus pedidos de amizade.</p>
                )}
            </div>
        </div>
    );
};

interface FriendItemProps {
    friend: User;
    onStartChat: (user: User) => void;
    onViewProfile: (user: User) => void;
}

const FriendItem: React.FC<FriendItemProps> = ({ friend, onStartChat, onViewProfile }) => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center pl-4 pr-3 pt-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => onStartChat(friend)}>
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(friend); }} className="relative flex-shrink-0 focus:outline-none rounded-full mr-3.5 mb-3 self-start mt-0.5">
                <img 
                    src={friend.avatarUrl || `https://picsum.photos/seed/${friend.id || 'default'}/200/200.jpg`} 
                    alt={friend.name || 'Usuário'} 
                    className="w-[54px] h-[54px] rounded-full object-cover border border-gray-600 shadow-sm"
                    onError={(e) => {
                        e.currentTarget.src = `https://picsum.photos/seed/${friend.id || 'default'}/200/200.jpg`;
                    }}
                />
                {friend.isOnline && (
                    <div className="absolute bottom-[2px] right-[2px] w-[13px] h-[13px] bg-[#4CAF50] rounded-full border-[2.5px] border-black"></div>
                )}
            </button>
            <div className="flex-grow min-w-0 border-b border-[#1c1c1e] pb-3.5 pr-1 flex justify-between items-center">
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                        <div className="flex items-center space-x-1.5 min-w-0 flex-wrap overflow-hidden">
                            <h3 className="font-semibold text-white text-[15.5px] truncate max-w-[130px]">{friend.name || '—'}</h3>
                            <AgeBadge user={friend} />
                            <LevelBadge level={friend.level || 1} />
                        </div>
                    </div>
                    <div className="flex items-center mt-1">
                        <p className="text-[14px] text-[#A0A0A5] truncate pr-2">
                            {t('profile.id')}: {friend.id}
                        </p>
                    </div>
                </div>
                {friend.isFollowed && (
                    <button className="bg-transparent border border-gray-600 text-[#A0A0A5] text-[12px] font-medium px-3 py-1 rounded-full whitespace-nowrap ml-2 hidden sm:block">
                        {t('common.followed')}
                    </button>
                )}
            </div>
        </div>
    );
};

const MessagesScreen: React.FC<MessagesScreenProps> = ({ onStartChat, onViewProfile, conversations, friends, initialTab, onOpenFriendRequests, fans, followingUsers, liveStreamers, onSelectStreamer }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'messages');
    const { t } = useTranslation();

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Defensive fallbacks — any prop can arrive undefined before API response
    const safeConversations = conversations || [];
    const safeFriends = friends || [];
    const safeFans = fans || [];
    const safeFollowingUsers = followingUsers || [];

    const fanIds = new Set(safeFans.map(f => f.id));
    const outgoingRequests = safeFollowingUsers.filter(followed => !fanIds.has(followed.id));
    const latestOutgoingRequest = outgoingRequests.length > 0 ? outgoingRequests[outgoingRequests.length - 1] : null;

    return (
        <div className="h-full flex flex-col bg-[#111111] text-white">
            <header className="flex-shrink-0 border-b border-[#2C2C2E]/80">
                <nav className="flex w-full px-4">
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex-1 flex flex-col items-center justify-center pt-4 text-[16px] font-bold transition-colors ${activeTab === 'messages' ? 'text-white' : 'text-[#A0A0A5]'}`}
                    >
                        <span>{t('footer.message')}</span>
                        <div className={`w-full h-[2px] mt-2.5 ${activeTab === 'messages' ? 'bg-white' : 'bg-transparent'}`}></div>
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`flex-1 flex flex-col items-center justify-center pt-4 text-[16px] font-bold transition-colors ${activeTab === 'friends' ? 'text-white' : 'text-[#A0A0A5]'}`}
                    >
                        <span>{t('common.friends')}</span>
                        <div className={`w-full h-[2px] mt-2.5 ${activeTab === 'friends' ? 'bg-white' : 'bg-transparent'}`}></div>
                    </button>
                </nav>
            </header>
            <main className="flex-grow overflow-y-auto no-scrollbar pb-24">
                {activeTab === 'messages' ? (
                    <div>
                        {liveStreamers && liveStreamers.length > 0 && (
                            <div className="flex overflow-x-auto space-x-4 pt-5 pb-4 px-4 scrollbar-none">
                                {liveStreamers.map(streamer => (
                                    <div
                                        key={streamer.id}
                                        className="flex-shrink-0 flex flex-col items-center cursor-pointer group"
                                        onClick={() => onSelectStreamer?.(streamer)}
                                    >
                                        <div className="relative">
                                            {/* Gradient ring highlight */}
                                            <div className="w-[56px] h-[56px] rounded-full p-[2px] bg-gradient-to-tr from-[#EA125E] via-[#F43F5E] to-[#A855F7] flex items-center justify-center shadow-md shadow-pink-500/10">
                                                <img
                                                    src={streamer.avatar || `https://picsum.photos/seed/${streamer.id}/200/200.jpg`}
                                                    alt={streamer.name}
                                                    className="w-full h-full rounded-full object-cover border-2 border-[#111111]"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        e.currentTarget.src = `https://picsum.photos/seed/${streamer.id || 'default'}/200/200.jpg`;
                                                    }}
                                                />
                                            </div>
                                            {/* Badge "AO VIVO" */}
                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF007A] to-[#E11D48] text-white text-[8px] font-extrabold px-1.5 py-[0.5px] rounded-full uppercase tracking-wider shadow-md border border-[#111111]/80 select-none whitespace-nowrap">
                                                AO VIVO
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-semibold text-center mt-2 text-white group-hover:text-pink-400 transition-colors truncate w-14">
                                            {streamer.name || 'Host'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {outgoingRequests.length > 0 && (
                            <FriendRequestSummaryItem latestRequest={latestOutgoingRequest} onClick={onOpenFriendRequests} />
                        )}

                        {safeConversations.length > 0 && safeConversations
                            .filter(convo => convo && convo.friend) // guard against missing friend
                            .map(convo => (
                                <ConversationItem key={convo.id} conversation={convo} onStartChat={onStartChat} onViewProfile={onViewProfile} />
                            ))}

                        {safeConversations.length === 0 && safeFriends.length > 0 && (
                            <>
                                <div className="p-3 text-sm text-gray-400 font-semibold bg-black/50">
                                    Comece uma nova conversa
                                </div>
                                {safeFriends.map(friend => (
                                    <FriendItem key={friend.id} friend={friend} onStartChat={onStartChat} onViewProfile={onViewProfile} />
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        {safeFriends.map(friend => (
                            <FriendItem key={friend.id} friend={friend} onStartChat={onStartChat} onViewProfile={onViewProfile} />
                        ))}
                    </div>
                )}

                {(activeTab === 'messages' && safeConversations.length === 0 && outgoingRequests.length === 0 && safeFriends.length === 0) || (activeTab === 'friends' && safeFriends.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                        <p>Nenhum item aqui.</p>
                        <p className="text-sm">Comece a conversar com pessoas!</p>
                    </div>
                ) : null}
            </main>
        </div>
    );
};

export default MessagesScreen;
