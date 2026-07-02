import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Message, FeedPhoto } from '../types';
import { BackIcon, ThreeDotsIcon, SendIcon, GalleryIcon, CheckIcon, DoubleCheckIcon, UserIcon, CloseIcon, LiveIndicatorIcon, ClockIcon, WarningTriangleIcon } from './icons';
import BlockReportModal from './BlockReportModal';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import { socketService } from '../services/socket';

interface ChatScreenProps {
    user: User;
    onBack: () => void;
    isModal: boolean;
    currentUser: User;
    onOpenProfile?: (user: User) => void;
    onNavigateToFriends: () => void;
    onFollowUser: (user: User) => void;
    onBlockUser: (user: User) => void;
    onReportUser: (user: User) => void;
    onOpenPhotoViewer: (photos: FeedPhoto[], initialIndex: number) => void;
    messages?: any[];
}

const MessageStatus: React.FC<{ status: Message['status'] }> = ({ status }) => {
    if (status === 'sending') {
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
    if (status === 'failed') {
        return <WarningTriangleIcon className="w-4 h-4 text-red-500" />;
    }
    if (status === 'sent') {
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
    }
    if (status === 'delivered') {
        return <DoubleCheckIcon className="w-4 h-4 text-gray-400" />;
    }
    if (status === 'read') {
        return <DoubleCheckIcon className="w-4 h-4 text-blue-400" />;
    }
    return null;
};

const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const ChatMessageBubble: React.FC<{ 
    message: Message; 
    isMe: boolean; 
    user: User; 
    onImageClick: (url: string) => void; 
    onAvatarClick?: (user: User) => void;
    currentUser: User;
}> = ({ message, isMe, user, onImageClick, onAvatarClick, currentUser }) => {
    const isObservable = !isMe && message.status !== 'read';

    // Simplificado - sem frames para navegação isolada
    const frameGlowClass = '';

    // Usar dados do remetente da API se disponíveis, senão usar dados do user prop
    const senderName = message.senderName || user.name;
    const senderAvatar = message.senderAvatar || user.avatarUrl;
    const senderLevel = message.senderLevel || user.level;
    const senderBirthday = message.senderBirthday || user.birthday;

    // Verificar se hoje é aniversário
    const isBirthday = () => {
        if (!senderBirthday) return false;
        const today = new Date();
        const birthday = new Date(senderBirthday);
        return today.getDate() === birthday.getDate() && 
               today.getMonth() === birthday.getMonth();
    };

    return (
        <div
            key={message.id}
            className={`flex items-start ${isMe ? 'flex-row-reverse' : ''} ${isObservable ? 'message-bubble-observable' : ''} ${message.status === 'failed' ? 'opacity-70' : ''}`}
            data-message-id={message.id}
        >
            {/* Clickable Avatar with frame indicator matching user action modal */}
            <div 
                onClick={() => onAvatarClick?.(user)} 
                className={`relative w-10 h-10 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all z-20 ${isMe ? '-ml-2.5' : '-mr-2.5'} rounded-full border-[3px] border-[#131317] bg-[#131317]`}
            >
                <img 
                    src={senderAvatar || `https://picsum.photos/seed/${senderName || 'support'}/200/200.jpg`} 
                    alt="avatar" 
                    className="w-full h-full rounded-full object-cover border border-white/10 bg-zinc-950" 
                />
            </div>
            
            {/* Chat Message Box with gorgeous live stream semi-transparent glass style matching feed */}
            <div className={`relative z-10 max-w-[80%] md:max-w-[70%] rounded-2xl ${isMe ? 'bg-[#911eff]/20 border border-[#b91bff]/30 rounded-tr-none pr-6 pl-3.5' : 'bg-white/[0.04] border border-white/[0.06] rounded-tl-none pl-6 pr-3.5'} ${message.imageUrl && !message.text ? 'p-1' : 'py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)]'}`}>
                {(senderName || senderLevel) && (
                    <div className="flex items-center flex-wrap gap-1.5 mb-1.5 text-xs select-none">
                        <span 
                            onClick={() => onAvatarClick?.(user)}
                            className={`font-black tracking-wide text-[13px] cursor-pointer hover:underline ${isMe ? 'text-amber-200' : 'text-[#00e5ff]'}`}
                        >
                            {senderName}
                        </span>
                        
                        {/* Glossy Silver metal level badge */}
                        <span 
                            className="bg-gradient-to-b from-zinc-200 via-white to-zinc-400 text-zinc-900 border border-zinc-200 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans flex items-center h-[15px] leading-none"
                            style={{
                                textShadow: '0 0.5px 1px rgba(255, 255, 255, 0.4)'
                            }}
                        >
                            Lvl. {senderLevel || 1}
                        </span>

                        {/* Admin status badge */}
                        {(senderName?.toLowerCase() === 'adriano' || user.id === 'adriano' || user.id === '98501723') && (
                            <span className="bg-gradient-to-r from-red-500 to-amber-500 text-white border border-red-400/30 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.6)] tracking-wider uppercase font-sans flex items-center h-[15px] leading-none shrink-0">
                                Adm
                            </span>
                        )}

                        {/* VIP status badge */}
                        {user.isVIP && (
                            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(250,204,21,0.5)] uppercase tracking-wide flex items-center h-[15px] leading-none shrink-0">
                                VIP
                            </span>
                        )}

                        {/* Mod Badge */}
                        {user.id !== 'adriano' && user.id !== '98501723' && user.id !== currentUser.id && user.isBroadcaster && (
                            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans flex items-center h-[15px] leading-none shrink-0">
                                Mod
                            </span>
                        )}

                        {isBirthday() && <span className="text-xs select-none">🎂</span>}
                    </div>
                )}
                {message.imageUrl && (
                    <button
                        onClick={() => onImageClick(message.imageUrl!)}
                        className={`focus:outline-none rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 ${message.text ? 'mb-2' : ''}`}
                        aria-label="View image full screen"
                    >
                        <img
                            src={message.imageUrl}
                            alt="Chat attachment"
                            className="w-24 object-cover bg-black/20"
                        />
                    </button>
                )}
                {message.text && (
                    <div className="flow-root">
                        <div className="float-right ml-2.5 -mb-0.5 flex items-center space-x-1 relative top-1">
                            <span className="text-[10px] text-zinc-400/70 font-mono whitespace-nowrap">{formatTimestamp(message.timestamp)}</span>
                            {isMe && <MessageStatus status={message.status} />}
                        </div>
                        <p className="text-zinc-100 font-sans tracking-wide break-words text-[13.5px] leading-relaxed font-semibold">{message.text}</p>
                    </div>
                )}
                {!message.text && message.imageUrl && (
                    <div className="flex justify-end items-center space-x-1 mt-1 px-2 pb-1">
                        <span className="text-[10px] text-zinc-400/70 font-mono whitespace-nowrap">{formatTimestamp(message.timestamp)}</span>
                        {isMe && <MessageStatus status={message.status} />}
                    </div>
                )}
            </div>
        </div>
    );
};

const BecameFriendsIndicator: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
    const { t } = useTranslation();
    return (
        <div className="flex justify-center my-4">
            <button onClick={onNavigate} className="bg-gray-700/80 text-gray-300 text-sm px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-gray-600 transition-colors">
                <UserIcon className="w-5 h-5" />
                <span>{t('chat.becameFriends')}</span>
            </button>
        </div>
    );
};


const ChatScreen: React.FC<ChatScreenProps> = ({ user, onBack, isModal, currentUser, onOpenProfile, onNavigateToFriends, onFollowUser, onBlockUser, onReportUser, onOpenPhotoViewer }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userStatus, setUserStatus] = useState<{ isOnline?: boolean; lastSeen?: string } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();
    const chatKey = useMemo(() => {
        const cId = currentUser?.id;
        const fId = user?.id;
        if (!cId || !fId) return '';
        return `chat_private_${cId < fId ? cId + '_' + fId : fId + '_' + cId}`;
    }, [currentUser?.id, user?.id]);
    const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
    
    // Cache local para evitar requisições duplicadas
    const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    const formatLastSeen = (timestamp?: string) => {
        if (!timestamp) return 'Offline';
        const now = new Date();
        const lastSeenDate = new Date(timestamp);
        const diffSeconds = Math.round((now.getTime() - lastSeenDate.getTime()) / 1000);

        if (diffSeconds < 60) return t('common.online');
        if (diffSeconds < 3600) return `Visto por último há ${Math.floor(diffSeconds / 60)} min`;
        if (diffSeconds < 86400) return `Visto por último há ${Math.floor(diffSeconds / 3600)} horas`;
        return `Visto por último em ${lastSeenDate.toLocaleDateString()}`;
    };

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        
        // Verificar cache primeiro
        const cacheKey = `chat_data_${user.id}`;
        const cached = cacheRef.current.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            // Usar dados em cache
            setMessages(cached.data.messages || []);
            setUserStatus(cached.data.status);
            setIsLoading(false);
            return;
        }
        
        try {
            const [fetchedMessages, status] = await Promise.all([
                api.getChatMessages(user.id, currentUser.id),
                api.getUserStatus(user.id)
            ]);
            
            const data = {
                messages: fetchedMessages || [],
                status
            };
            
            // Salvar no cache
            cacheRef.current.set(cacheKey, {
                data,
                timestamp: now
            });
            
            setMessages(data.messages);
            setUserStatus(data.status);
        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchInitialData();
    }, [user.id]); // Removido fetchInitialData das dependências para evitar loop infinito

    useEffect(() => {
        const handleNewMessage = (message: Message & { tempId?: string }) => {
            if (message.chatId === chatKey || (message.from === user.id && message.to === currentUser.id) || (message.from === currentUser.id && message.to === user.id)) {
                setMessages(prev => {
                    const tempId = message.tempId;
                    // If it's an ack for an optimistic message, replace it
                    if (tempId && prev.some(m => m.id === tempId)) {
                        return prev.map(m => (m.id === tempId ? { ...message, tempId: undefined } : m));
                    }
                    // If it's a new message from the other user, or a duplicate broadcast (already replaced)
                    else if (!prev.some(m => m.id === message.id)) {
                        return [...prev, message];
                    }
                    return prev; // It's a duplicate, do nothing
                });
            }
        };

        socketService.on('newMessage', handleNewMessage);
        return () => {
            socketService.off('newMessage', handleNewMessage);
        };
    }, [chatKey, currentUser.id, user.id]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const messageIdsToRead: string[] = [];
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const messageId = (entry.target as HTMLElement).dataset.messageId;
                        if (messageId) {
                            messageIdsToRead.push(messageId);
                            observer.unobserve(entry.target);
                        }
                    }
                });

                if (messageIdsToRead.length > 0) {
                    // Optimistically update UI
                    setMessages(prev => prev.map(m =>
                        messageIdsToRead.includes(m.id) ? { ...m, status: 'read' } : m
                    ));
                    // Inform the server
                    api.markMessagesAsRead(messageIdsToRead, currentUser.id);
                }
            },
            { threshold: 0.8 }
        );

        document.querySelectorAll('.message-bubble-observable').forEach(el => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, [messages, currentUser.id]);


    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            // Armazenar o arquivo para upload
            setSelectedImageFile(file);
            
            // Criar preview para exibição
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
        if (event.target) event.target.value = '';
    };

    const handleSendMessage = async () => {
        const hasText = newMessage.trim() !== '';
        const hasImage = !!selectedImageFile;
        const sendingMessage = messages.some(m => m.status === 'sending');

        if ((!hasText && !hasImage) || sendingMessage) return;

        const textToSend = newMessage;
        const imageFile = selectedImageFile;

        const tempId = `temp_${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            chatId: chatKey,
            from: currentUser.id,
            to: user.id,
            text: textToSend,
            imageUrl: selectedImage || undefined,
            timestamp: new Date().toISOString(),
            status: 'sending' as 'sent', // Casting for type compatibility until status is widened
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setSelectedImage(null);
        setSelectedImageFile(null);

        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }

        try {
            let finalImageUrl: string | undefined = undefined;
            if (imageFile) {
                // Usar nova API de upload com FormData
                const uploadResponse = await api.uploadChatImage(imageFile) as { success: boolean; imageUrl: string };
                if (uploadResponse?.success && uploadResponse?.imageUrl) {
                    finalImageUrl = uploadResponse.imageUrl;
                } else {
                    throw new Error("Image upload failed");
                }
            }

            const result = await api.sendChatMessage(currentUser.id, user.id, textToSend, finalImageUrl, tempId);

            if (result && result.message) {
                // Update the optimistic message with the real one and status 'sent'
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === tempId
                            ? { ...result.message, status: 'sent' as 'sent' }
                            : msg
                    )
                );
            } else {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === tempId
                            ? { ...msg, status: 'failed' as 'failed' }
                            : msg
                    )
                );
            }
        } catch (error) {
            // Revert optimistic update on failure, or show failed status
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, status: 'failed' as 'failed' }
                        : msg
                )
            );
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await api.deleteMessage(messageId, currentUser.id);
            // Substituir mensagem por "mensagem excluída"
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, text: 'mensagem excluída', imageUrl: undefined, status: 'sent' as 'sent' }
                    : msg
            ));
        } catch (error) {
        }
    };

    const handleDeleteAllMessages = async () => {
        
        try {
            // Apagar todas as mensagens do usuário atual
            const deletePromises = messages
                .filter(msg => msg.from === currentUser.id)
                .map(msg => api.deleteMessage(msg.id, currentUser.id));
            
            await Promise.all(deletePromises);
            
            // Substituir mensagens por "mensagem excluída"
            setMessages(prev => prev.map(msg => 
                msg.from === currentUser.id 
                    ? { ...msg, text: 'mensagem excluída', imageUrl: undefined, status: 'sent' as 'sent' }
                    : msg
            ));
            
            setIsActionsModalOpen(false);
        } catch (error) {
        }
    };

    const handleViewImage = (clickedUrl: string) => {
        
        // Criar photoFeed apenas com a imagem clicada para performance
        // Usar ID único baseado na URL para consistência
        const photoId = `chat_${clickedUrl.split('/').pop()?.split('.')[0] || Date.now()}`;
        const photoFeed: FeedPhoto[] = [{
            id: photoId,
            photoUrl: clickedUrl,
            user: currentUser,
            likes: 0,
            isLiked: false,
        }];


        try {
            onOpenPhotoViewer(photoFeed, 0);
        } catch (error) {
        }
    };

    const containerClasses = isModal
        ? "absolute inset-0 z-[70] flex items-end justify-center"
        : "absolute inset-0 z-50 bg-[#131317] text-white flex flex-col";

    const contentClasses = isModal
        ? "bg-[#131317] text-white flex flex-col w-full max-w-md h-[75%] rounded-t-2xl"
        : "text-white flex flex-col w-full h-full";

    const backdropClick = isModal ? onBack : undefined;

    return (
        <div className={containerClasses} onClick={backdropClick}>
            <div
                className={contentClasses}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 flex-shrink-0 relative h-[72px]">
                    <button onClick={onBack} className="p-2 -ml-2 text-white z-10">
                        <BackIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div 
                            onClick={() => onOpenProfile?.(user)}
                            className="flex items-center space-x-3 pointer-events-auto cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                        >
                            <div className="relative">
                                <img src={user.avatarUrl || `https://picsum.photos/seed/${user.name}/200/200.jpg`} 
                                     className="w-10 h-10 rounded-full object-cover bg-[#1b191e] border border-white/10" alt={user.name} />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="font-bold text-[15px] flex items-center space-x-1 text-white">
                                    <span>{user.name}</span>
                                    <svg className="w-3.5 h-3.5 text-[#b91bff]" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                    {user.isLive && <LiveIndicatorIcon className="w-4 h-4 text-red-500" />}
                                </h1>
                                <span className="text-[12px] text-[#00e5ff] flex items-center font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] mr-1.5"></span>
                                    {(userStatus?.isOnline ?? user.isOnline) ? t('common.online') : formatLastSeen(userStatus?.lastSeen)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setIsActionsModalOpen(true)} className="p-2 -mr-2 text-[#888691] hover:text-white z-10">
                        <ThreeDotsIcon className="w-5 h-5" />
                    </button>
                </header>
                <main className="flex-grow p-4 overflow-y-auto no-scrollbar flex flex-col">
                    {isLoading ? (
                        <div className="flex-grow flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 select-none">
                            <div className="relative mb-8">
                                <div className="w-[110px] h-[110px] bg-[#1a1721] rounded-[32px] flex items-center justify-center">
                                    <svg width="56" height="56" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 19c-1.657 0-3-1.343-3-3V7c0-1.657 1.343-3 3-3h12c1.657 0 3 1.343 3 3v2h-1c-2.761 0-5 2.239-5 5v7H9z" fill="#8000b3"/>
                                        <path d="M7 23l4-3 1-1h-3c-1.657 0-3-1.343-3-3v-5c0-.987.48-1.85 1.218-2.385C7.304 9.4 7.6 10.156 7.6 11v5c0 1.105.895 2 2 2h3.5l-3.5 3.5V23h-2.6z" fill="#8000b3"/>
                                        <path d="M13 25c-1.657 0-3-1.343-3-3v-9c0-1.657 1.343-3 3-3h12c1.657 0 3 1.343 3 3v9c0 1.657-1.343 3-3 3h-5l-5 4v-4h-2z" fill="#aa00ff"/>
                                    </svg>
                                </div>
                                <div className="absolute -top-3 -right-3 bg-[#9b0eed] p-2.5 rounded-full ring-[6px] ring-[#131317]">
                                    <span className="text-[14px] text-white flex items-center justify-center leading-none">👋</span>
                                </div>
                            </div>
                            <p className="text-[20px] font-bold text-white mb-2 tracking-tight">Nenhuma mensagem ainda</p>
                            <p className="text-[14px] text-[#888691] font-medium mb-10">Comece a conversar com pessoas!</p>
                            <button 
                                onClick={() => setNewMessage('👋 Oi!') || handleSendMessage()}
                                className="bg-[#2a1334] hover:bg-[#34173d] text-[#d21fff] font-bold py-[14px] px-8 rounded-full flex items-center space-x-2 transition-colors active:scale-95 border border-[#3b194a]/30"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.5 7.5a2.5 2.5 0 0 0-2.5-2.5c-.24 0-.47.04-.69.1l.03-3.05a2.5 2.5 0 0 0-2.84-2.48l-.94.13c-1.35.18-2.3 1.4-2.07 2.75l.48 2.87a2.54 2.54 0 0 0-2.33 1.05A2.5 2.5 0 0 0 4.1 6.5l.38 6.46C3.07 14.28 2 15.68 2 17.5c0 2.48 2.02 4.5 4.5 4.5h7c3.86 0 7-3.14 7-7v-5a2.5 2.5 0 0 0-3-2.5zM19 15c0 3.03-2.47 5.5-5.5 5.5h-7A3 3 0 0 1 3.5 17.5c0-1.28.8-2.46 2.03-2.88l1.45-.5.18-5.32c.04-.84.77-1.48 1.6-1.43a1.5 1.5 0 0 1 1.43 1.58L10 11.23l1.5.08.38-7.3a1.03 1.03 0 0 1 1.25-1.04l.94-.13a1 1 0 0 1 1.13 1l.24 7.21L17 11.2a1 1 0 0 1 2 .1v3.7z"/>
                                    <path d="M21.5 5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z" opacity="0.5"/>
                                    <path d="M19 2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z" opacity="0.7"/>
                                </svg>
                                <span className="text-[15px] tracking-wide">Mandar um salve</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 mt-auto">
                            {messages.map((msg) => {
                                if (msg.type === 'system-friend-notification') {
                                    return <BecameFriendsIndicator key={msg.id} onNavigate={onNavigateToFriends} />;
                                }
                                return (
                                    <ChatMessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isMe={msg.from === currentUser.id}
                                        user={msg.from === currentUser.id ? currentUser : user}
                                        onImageClick={handleViewImage}
                                        onAvatarClick={onOpenProfile}
                                        currentUser={currentUser}
                                    />
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </main>
                <footer className="p-4 py-3 bg-[#131317] flex-shrink-0">
                    {selectedImage && (
                        <div className="relative p-2 mb-2 w-fit">
                            <img src={selectedImage} alt="Preview" className="max-h-24 rounded-lg" />
                            <button
                            onClick={() => {
                                setSelectedImage(null);
                                setSelectedImageFile(null);
                            }}
                            className="absolute -top-1 -right-1 bg-black/50 text-white rounded-full p-0.5"
                        >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2 bg-[#1b191e] rounded-[24px] p-1 border border-[#232128]">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[#888691] hover:text-white transition-colors flex items-center justify-center w-10 h-10 flex-shrink-0 ml-1"
                        >
                            <GalleryIcon className="w-5 h-5" />
                        </button>
                        <div className="flex-grow h-10">
                            <input
                                type="text"
                                placeholder="Diga oi..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                className="w-full h-full bg-transparent text-white placeholder-[#5a5860] text-[14px] px-2 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            className="bg-[#b91bff] text-white rounded-full hover:bg-[#a617e6] transition-colors flex items-center justify-center w-9 h-9 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                            disabled={(!newMessage.trim() && !selectedImageFile) || messages.some(m => m.status === 'sending')}
                        >
                            {messages.some(m => m.status === 'sending') ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.01 21L23 12L2.01 3L2 10l15 2-15 2z" fill="currentColor"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </footer>
            </div>
            <BlockReportModal
                isOpen={isActionsModalOpen}
                onClose={() => setIsActionsModalOpen(false)}
                currentUser={currentUser}
                targetUser={user}
                onUnfriend={user.isFollowed ? () => {
                    onFollowUser(user);
                    setIsActionsModalOpen(false);
                    onNavigateToFriends();
                } : undefined}
                onBlock={() => {
                    onBlockUser(user);
                    setIsActionsModalOpen(false);
                    onBack();
                }}
                onReport={() => {
                    onReportUser(user);
                    setIsActionsModalOpen(false);
                }}
                onDeleteMessages={handleDeleteAllMessages}
            />
        </div>
    );
};

export default ChatScreen;
