import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Message, FeedPhoto } from '../types';
import { BackIcon, ThreeDotsIcon, SendIcon, GalleryIcon, CheckIcon, DoubleCheckIcon, UserIcon, CloseIcon, ClockIcon, WarningTriangleIcon } from './icons';
import BlockReportModal from './BlockReportModal';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { useComposerKeyboard } from '../hooks/useComposerKeyboard';

import { LoadingSpinner } from './Loading';
import LiveBadge from './ui/LiveBadge';
import { formatMessageTime } from '../utils/formatMessageTime';
import { syncServerTime } from '../utils/serverTime';
// 💬 Chat privado via WebSocket (Socket.IO): o socketService faz a ponte do
// evento `newChatMessage` do backend para o window (abaixo). A busca inicial
// usa REST e o envio usa REST (persiste no banco); a entrega em tempo real é
// via WebSocket — sem Firebase.

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
    // 📡 Byte Streams: envio de imagens em tempo real (se disponível)
    sendFile?: (file: File, onProgress?: (pct: number) => void) => Promise<boolean>;
    // 🔴 Indicador AO VIVO clicável → entra na transmissão
    onOpenLive?: (user: User) => void;
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
    return formatMessageTime(timestamp);
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


const ChatScreen: React.FC<ChatScreenProps> = ({ user, onBack, isModal, currentUser, onOpenProfile, onNavigateToFriends, onFollowUser, onBlockUser, onReportUser, onOpenPhotoViewer, messages: propMessages, sendFile: propSendFile, onOpenLive }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const effectiveMessages = useMemo(() => {
        const base = propMessages || messages;
        const sortTime = (m: any) => {
            const t = new Date(m?.timestamp).getTime();
            return Number.isNaN(t) ? 0 : t;
        };
        return [...base].sort((a, b) => sortTime(a) - sortTime(b));
    }, [propMessages, messages]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userStatus, setUserStatus] = useState<{ isOnline?: boolean; lastSeen?: string } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLButtonElement>(null);
    // ⌨️ Composer TikTok-style: a barra de mensagem principal fica TOTALMENTE
    // FIXA no fundo (bottom = safe-area, nunca sai do lugar). Ao tocar nela,
    // a barra fica INVISÍVEL (sem ser movida nem apagada) e abre um SEGUNDO
    // campo de digitação (composer) colado acima do teclado.
    // `keyboardInset` (altura real do teclado) é usado para rolar até a última
    // mensagem quando o teclado abre; `bottom` é a posição do composer.
    const {
        isComposerOpen,
        openComposer,
        closeComposer,
        composerInputRef,
        composerRef,
        keyboardInset,
        bottom,
    } = useComposerKeyboard();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const blobUrlsRef = useRef<string[]>([]);
    const { t } = useTranslation();
    const chatKey = useMemo(() => {
        const cId = currentUser?.id;
        const fId = user?.id;
        if (!cId || !fId) return '';
        return `chat_private_${cId < fId ? cId + '_' + fId : fId + '_' + cId}`;
    }, [currentUser?.id, user?.id]);

    // Sala de chat: Socket.IO removido — mensagens via REST API
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

    // ⏰ Sincroniza o relógio do SERVIDOR a partir da mensagem mais recente.
    // Só usa como referência se for recente ("agora" no servidor) — conversas
    // antigas não servem de referência de relógio.
    const syncFromMessages = (list: any[]) => {
        let newest = 0;
        list.forEach((m: any) => {
            const t = m?.timestamp ? new Date(m.timestamp).getTime() : 0;
            if (!Number.isNaN(t) && t > newest) newest = t;
        });
        if (!newest) return;
        if (Math.abs(Date.now() - newest) < 60 * 60 * 1000) syncServerTime(newest);
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
            syncFromMessages(cached.data.messages || []);
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
            syncFromMessages(data.messages);
        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    }, [user.id]);

    // 📡 Byte Streams: receber imagens via window event
    useEffect(() => {
        const onByteStreamFile = (e: Event) => {
            const data = (e as CustomEvent).detail;
            if (!data || !data.bytes) return;
            
            const blob = new Blob([data.bytes], { type: data.mimeType || 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlsRef.current.push(blobUrl);
            
            const receivedMessage: Message = {
                id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                chatId: chatKey,
                from: data.sender?.identity || user.id,
                to: currentUser.id,
                text: '',
                imageUrl: blobUrl,
                timestamp: new Date().toISOString(),
                status: 'sent' as 'sent',
            };
            
            setMessages(prev => [...prev, receivedMessage]);
            
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        };
        
        window.addEventListener('byteStream:fileReceived', onByteStreamFile);
        
        return () => {
            window.removeEventListener('byteStream:fileReceived', onByteStreamFile);
            // Limpar blob URLs para evitar memory leak
            blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = [];
        };
    }, [chatKey, user.id, currentUser.id]);

    useEffect(() => {
        fetchInitialData();
    }, [user.id]); // Removido fetchInitialData das dependências para evitar loop infinito

    useEffect(() => {
        if (effectiveMessages.length > 0) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }, [effectiveMessages.length]);

    // ⌨️ Quando o teclado abre (keyboardInset sobe), rolar para a última
    // mensagem para que ela fique visível logo acima do input — igual WhatsApp.
    const prevInsetRef = useRef(0);
    useEffect(() => {
        const opened = keyboardInset > 0 && prevInsetRef.current === 0;
        prevInsetRef.current = keyboardInset;
        if (opened && effectiveMessages.length > 0) {
            // Delay: espera a animação do teclado (e do re-layout) estabilizar
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
            }, 120);
        }
    }, [keyboardInset, effectiveMessages.length]);

    useEffect(() => {
        const handleNewMessage = (message: Message & { tempId?: string }) => {
            // ⏰ Mensagem recebida em tempo real (socket): timestamp = "agora" no servidor
            syncServerTime(message.timestamp);
            const msgChatId = message.chatId || `chat_private_${message.from < message.to ? message.from + '_' + message.to : message.to + '_' + message.from}`;
            if (msgChatId === chatKey || (message.from === user.id && message.to === currentUser.id) || (message.from === currentUser.id && message.to === user.id)) {
                if (!propMessages) {
                    setMessages(prev => {
                        const tempId = message.tempId;
                        if (tempId && prev.some(m => m.id === tempId)) {
                            return prev.map(m => (m.id === tempId ? { ...message, tempId: undefined } : m));
                        }
                        else if (!prev.some(m => m.id === message.id)) {
                            return [...prev, message];
                        }
                        return prev;
                    });
                }
            }
        };

        const onSocketMessage = (event: Event) => {
            handleNewMessage((event as CustomEvent).detail);
        };

        window.addEventListener('newChatMessage', onSocketMessage);
        return () => {
            window.removeEventListener('newChatMessage', onSocketMessage);
        };
    }, [chatKey, currentUser.id, user.id, propMessages]);

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
        const sendingMessage = effectiveMessages.some((m: any) => m.status === 'sending');

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
            status: 'sending' as 'sent',
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setSelectedImage(null);
        setSelectedImageFile(null);

        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 150);

        try {
            let finalImageUrl: string | undefined = undefined;

            if (imageFile) {
                // 📡 Byte Streams: enviar imagem em tempo real
                if (typeof propSendFile === 'function') {
                    propSendFile(imageFile, (pct: number) => {
                        console.log('[ByteStream] Upload progress:', Math.round(pct * 100), '%');
                    });
                }

                // REST API: upload para persistência no banco
                const uploadResponse = await api.uploadChatImage(imageFile) as unknown as { success: boolean; imageUrl: string };
                if (uploadResponse?.success && uploadResponse?.imageUrl) {
                    finalImageUrl = uploadResponse.imageUrl;
                } else {
                    throw new Error("Image upload failed");
                }
            }

            const result = await api.sendChatMessage(currentUser.id, user.id, textToSend, finalImageUrl, tempId);

            if (result && result.message) {
                // ⏰ Confirmado pelo servidor: timestamp de envio = horário do servidor
                syncServerTime(result.message.timestamp);
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
        ? "bg-[#131317] text-white flex flex-col w-full max-w-md h-[75%] rounded-t-2xl relative overflow-hidden"
        : "text-white flex flex-col w-full h-full relative overflow-hidden";

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
                                    {user.isLive && (
                                        <span onClick={(e) => { e.stopPropagation(); onOpenLive?.(user); }}>
                                            <LiveBadge label="" showLabel={false} iconClassName="w-4 h-4" className="rounded-full p-[3px]" />
                                        </span>
                                    )}
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
                <main className="relative flex-1 min-h-0 overflow-hidden">
                    {/* overscroll-contain: a rolagem existe SÓ aqui (mensagens);
                        não propaga para a tela/página de jeito nenhum */}
                    <div className="absolute inset-0 overflow-y-auto no-scrollbar overscroll-contain">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoadingSpinner />
                        </div>
                    ) : effectiveMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center px-8 py-4 select-none h-full">
                            <div className="relative mb-6">
                                <div className="w-[90px] h-[90px] bg-[#1a1721] rounded-[32px] flex items-center justify-center">
                                    <svg width="46" height="46" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 19c-1.657 0-3-1.343-3-3V7c0-1.657 1.343-3 3-3h12c1.657 0 3 1.343 3 3v2h-1c-2.761 0-5 2.239-5 5v7H9z" fill="#8000b3"/>
                                        <path d="M13 25c-1.657 0-3-1.343-3-3v-9c0-1.657 1.343-3 3-3h12c1.657 0 3 1.343 3 3v9c0 1.657-1.343 3-3 3h-5l-5 4v-4h-2z" fill="#aa00ff"/>
                                    </svg>
                                </div>
                            </div>
                            <p className="text-[18px] font-bold text-white mb-1 tracking-tight">Nenhuma mensagem ainda</p>
                            <p className="text-[13px] text-[#888691] font-medium mb-6">Comece a conversar com pessoas!</p>
                            <button 
                                onClick={() => { setNewMessage('👋 Oi!'); handleSendMessage(); }}
                                className="bg-[#2a1334] hover:bg-[#34173d] text-[#d21fff] font-bold py-[12px] px-7 rounded-full flex items-center space-x-2 transition-colors active:scale-95 border border-[#3b194a]/30"
                            >
                                <span className="text-[14px] tracking-wide">Mandar um salve</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 px-4 pt-2">
                            {effectiveMessages.map((msg) => {
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
                            <div ref={chatEndRef} style={{ height: `calc(4.5rem + ${isComposerOpen ? keyboardInset : 0}px + env(safe-area-inset-bottom, 0px))` }} />
                        </div>
                    )}
                    </div>
                </main>
                {/* ⌨️ Barra de mensagem 100% FIXA: bottom é SEMPRE
                    safe-area-inset-bottom — o teclado NUNCA a move. Ao digitar,
                    ela fica apenas INVISÍVEL (opacity) e o composer (SEGUNDA
                    barra) aparece colado acima do teclado, por cima dela. */}
                <footer className={`fixed left-0 right-0 z-10 bg-[#131317] px-4 pt-3 pb-3 border-t border-[#232128] transition-all duration-200 ${isComposerOpen ? 'opacity-0 pointer-events-none' : ''}`} style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    {selectedImage && (
                        <div className="relative mb-2 w-fit">
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
                            <button
                                type="button"
                                ref={chatInputRef}
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); openComposer(); }}
                                className="w-full h-full bg-transparent text-[14px] px-2 text-left focus:outline-none cursor-pointer select-none"
                            >
                                {newMessage ? (
                                    <span className="text-white">{newMessage}</span>
                                ) : (
                                    <span className="text-[#5a5860]">Diga oi...</span>
                                )}
                            </button>
                        </div>
                        <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { handleSendMessage(); }}
                            className="bg-[#b91bff] text-white rounded-full hover:bg-[#a617e6] transition-colors flex items-center justify-center w-9 h-9 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                            disabled={(!newMessage.trim() && !selectedImageFile) || effectiveMessages.some(m => m.status === 'sending')}
                        >
                            {effectiveMessages.some(m => m.status === 'sending') ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.01 21L23 12L2.01 3L2 10l15 2-15 2z" fill="currentColor"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </footer>

                {/* ⌨️ Composer (SEGUNDA barra): aparece SÓ na hora de digitar,
                    colado acima do teclado, sem mexer na barra fixa. */}
                {isComposerOpen && (
                    <div
                        ref={composerRef}
                        className="fixed left-0 right-0 z-50"
                        style={{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, transition: 'bottom 0.12s ease-out' }}
                    >
                        <footer className="bg-[#131317] px-4 pt-3 pb-3 border-t border-[#232128]">
                            <div className="flex items-center space-x-2 bg-[#1b191e] rounded-[24px] p-1 border border-[#232128]">
                                <div className="flex-grow h-10">
                                    <input
                                        ref={composerInputRef}
                                        type="text"
                                        placeholder="Diga oi..."
                                        value={newMessage}
                                        enterKeyHint="send"
                                        autoComplete="off"
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onBlur={() => {
                                            // Só fecha se o foco saiu do composer por completo.
                                            // Não fecha em blur transitório do navegador (mobile).
                                            setTimeout(() => {
                                                if (composerRef.current && !composerRef.current.contains(document.activeElement)) {
                                                    closeComposer();
                                                }
                                            }, 120);
                                        }}
                                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
                                        className="w-full h-full bg-transparent text-white placeholder-[#5a5860] text-[14px] px-2 focus:outline-none"
                                    />
                                </div>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { handleSendMessage(); }}
                                    className="bg-[#b91bff] text-white rounded-full hover:bg-[#a617e6] transition-colors flex items-center justify-center w-9 h-9 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                                    disabled={(!newMessage.trim() && !selectedImageFile) || effectiveMessages.some(m => m.status === 'sending')}
                                >
                                    {effectiveMessages.some(m => m.status === 'sending') ? (
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
                )}
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
