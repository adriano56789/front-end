import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Message, FeedPhoto } from '../types';
import { BackIcon, ThreeDotsIcon, SendIcon, GalleryIcon, CheckIcon, DoubleCheckIcon, UserIcon, CloseIcon, ClockIcon, WarningTriangleIcon } from './icons';
import BlockReportModal from './BlockReportModal';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { useComposerKeyboard, COMPOSER_BAR_HEIGHT } from '../hooks/useComposerKeyboard';

import LiveBadge from './ui/LiveBadge';
import { formatMessageTime } from '../utils/formatMessageTime';
import { syncServerTime } from '../utils/serverTime';
import { emitChatTyping, connectSocket } from '../services/socketService';
import { translateText } from '../services/translate';

// 💬 Chat privado via WebSocket (Socket.IO): o socketService faz a ponte do
// evento `newChatMessage` do backend para o window (abaixo). A busca inicial
// usa REST e o envio usa REST (persiste no banco); a entrega em tempo real é
// via WebSocket. Comportamento estilo WhatsApp: indicador
// "digitando...", ✓✓ azul em tempo real, responder mensagem e separadores de
// data (Hoje/Ontem).

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

// 📅 Separador de data estilo WhatsApp: "Hoje", "Ontem" ou "15/08"
const formatDayLabel = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const ChatMessageBubble: React.FC<{ 
    message: Message; 
    isMe: boolean; 
    user: User; 
    onImageClick: (url: string) => void; 
    onAvatarClick?: (user: User) => void;
    currentUser: User;
    onReply?: (message: Message) => void;
}> = ({ message, isMe, user, onImageClick, onAvatarClick, currentUser, onReply }) => {
    const isObservable = !isMe && message.status !== 'read';
    const { language } = useTranslation();

    // 🔤 Tradução da mensagem (estilo Google): só nas mensagens RECEBIDAS.
    // Toque no botão "A" traduz para o idioma do perfil; toque de novo volta.
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);

    const canTranslate = !isMe && !!message.text && message.text.trim().length > 0;

    const handleTranslate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!message.text) return;
        if (showTranslated) {
            setShowTranslated(false);
            return;
        }
        if (translatedText) {
            setShowTranslated(true);
            return;
        }
        setTranslating(true);
        const result = await translateText(message.text, language);
        setTranslating(false);
        if (result) {
            setTranslatedText(result);
            setShowTranslated(true);
        }
    };

    // Simplificado - sem frames para navegação isolada
    const frameGlowClass = '';

    // Usar dados do remetente da API se disponíveis, senão usar dados do user prop
    const senderName = message.senderName || user.name;
    const senderAvatar = message.senderAvatar || user.avatarUrl;
    const senderLevel = message.senderLevel || user.level;
    const senderBirthday = message.senderBirthday || user.birthday;

    // 🔞 Conteúdo +18 (remetente maior de idade OU flag explícita): proteção
    // TOTAL — a imagem é baixada como BLOB sem cache de disco e o objeto é
    // revogado quando a mensagem sai da tela. Nada fica salvo/exportável.
    const isAdultMedia = message.isAdultContent === true || (message.senderAge ?? 0) >= 18;
    const [adultBlobUrl, setAdultBlobUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!isAdultMedia || !message.imageUrl) return;
        let revoked: string | null = null;
        fetch(message.imageUrl, { cache: 'no-store' })
            .then((r) => (r.ok ? r.blob() : null))
            .then((b) => {
                if (b) {
                    revoked = URL.createObjectURL(b);
                    setAdultBlobUrl(revoked);
                }
            })
            .catch(() => {});
        return () => {
            if (revoked) URL.revokeObjectURL(revoked);
            setAdultBlobUrl(null);
        };
    }, [isAdultMedia, message.imageUrl]);
    const protectedImageUrl = adultBlobUrl || message.imageUrl || null;

    // Verificar se hoje é aniversário
    const isBirthday = () => {
        if (!senderBirthday) return false;
        const today = new Date();
        const birthday = new Date(senderBirthday);
        return today.getDate() === birthday.getDate() && 
               today.getMonth() === birthday.getMonth();
    };

    // 📌 Long-press (estilo WhatsApp): segurar na mensagem abre "Responder".
    // 🖐️ MAS se o usuário estiver SELECIONANDO TEXTO (pra copiar), o "Responder"
    // é CANCELADO na hora — seleção nativa tem prioridade (copiar/colar funciona).
    const pressTimerRef = useRef<number | null>(null);
    const pressTriggeredRef = useRef(false);
    const onSelectionChange = () => {
        try {
            const sel = document.getSelection?.();
            if (sel && !sel.isCollapsed && String(sel).length > 0 && pressTimerRef.current) {
                window.clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
            }
        } catch { /* ignora */ }
    };
    const onPressStart = () => {
        if (!onReply) return;
        pressTriggeredRef.current = false;
        document.addEventListener('selectionchange', onSelectionChange);
        pressTimerRef.current = window.setTimeout(() => {
            // Se já começou a seleção de texto, NÃO abre "Responder"
            try {
                const sel = document.getSelection?.();
                if (sel && !sel.isCollapsed && String(sel).length > 0) return;
            } catch { /* segue */ }
            pressTriggeredRef.current = true;
            onReply(message);
            navigator.vibrate?.(30);
        }, 400);
    };
    const onPressEnd = () => {
        if (pressTimerRef.current) {
            window.clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        document.removeEventListener('selectionchange', onSelectionChange);
    };

    return (
        <div
            key={message.id}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            onTouchMove={onPressEnd}
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onMouseLeave={onPressEnd}
            onContextMenu={(e) => {
                // 🖐️ Toque longo no celular = seleção nativa de texto (copiar).
                // Só intercepta o clique DIREITO do MOUSE (desktop) para "Responder".
                const isTouch = typeof PointerEvent !== 'undefined' && e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'touch';
                if (isTouch) return;
                e.preventDefault();
                if (onReply) onReply(message);
            }}
            className={`flex items-start ${isMe ? 'flex-row-reverse' : ''} ${isObservable ? 'message-bubble-observable' : ''} ${message.status === 'failed' ? 'opacity-70' : ''} select-text`}
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
            
            {/* 💬 Bolha — MESMA RECEITA DO CHAT DA LIVE (live/ChatMessage.tsx):
                whitespace-normal + break-words garantem quebra automática;
                min-w-0 permite o item de flex encolher de verdade;
                [overflow-wrap:anywhere] quebra até palavras gigantes.
                Resultado: texto grande vira várias linhas, uma abaixo da outra. */}
            <div className={`relative z-10 min-w-0 max-w-[80%] md:max-w-[70%] whitespace-normal break-words [overflow-wrap:anywhere] rounded-2xl ${message.imageUrl && !message.text ? (isMe ? 'bg-[#911eff]/20 border border-[#b91bff]/30 rounded-tr-none p-1' : 'bg-white/[0.04] border border-white/[0.06] rounded-tl-none p-1') : `${isMe ? 'bg-[#911eff]/20 border border-[#b91bff]/30 rounded-tr-none pr-6 pl-3.5' : 'bg-white/[0.04] border border-white/[0.06] rounded-tl-none pl-6 pr-3.5'} py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}`}>
                {/* 📌 Citação da mensagem respondida (estilo WhatsApp) */}
                {message.replyTo && (
                    <div className={`mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${isMe ? 'bg-[#3a1a52]/60 border-[#d21fff]' : 'bg-black/30 border-[#00e5ff]'}`}>
                        <div className="font-black text-[11px] mb-0.5 truncate flex items-center space-x-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isMe ? 'text-[#d21fff]' : 'text-[#00e5ff]'}>
                                <path d="M3 12c3.5-4 8-6 13-6v4l5-5-5-5v4c-6 0-11 3-14 8z" fill="none"/>
                                <path d="M8 21c2.5-1.5 4-4 4-7H6v6z" fill="none"/>
                            </svg>
                            <span className={isMe ? 'text-[#d21fff]' : 'text-[#00e5ff]'}>{message.replyTo.senderName || 'Você'}</span>
                        </div>
                        {message.replyTo.imageUrl && !message.replyTo.text && (
                            <img src={message.replyTo.imageUrl} alt="resposta" className="w-10 h-10 rounded object-cover opacity-90" />
                        )}
                        {message.replyTo.text && (
                            <p className="text-zinc-300/90 truncate">{message.replyTo.text}</p>
                        )}
                    </div>
                )}
                {(senderName || senderLevel) && (
                    <div className="flex items-center flex-wrap gap-1.5 mb-1.5 text-xs select-none">
                        <span 
                            onClick={() => onAvatarClick?.(user)}
                            className={`font-black tracking-wide text-[13px] cursor-pointer hover:underline ${isMe ? 'text-amber-200' : 'text-[#00e5ff]'}`}
                        >
                            {senderName}
                        </span>

                        {/* 🔤 Traduzir mensagem (idioma do perfil) */}
                        {canTranslate && (
                            <button
                                onClick={handleTranslate}
                                title={showTranslated ? 'Traduzido' : 'Traduzir'}
                                aria-label="Traduzir mensagem"
                                className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 leading-none shrink-0 select-none cursor-pointer transition-all text-[9px] font-black shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${showTranslated
                                    ? 'bg-[#a855f7]/40 border-[#a855f7] text-white'
                                    : 'bg-[#a855f7]/25 border-[#a855f7]/60 text-[#e9d5ff] hover:bg-[#a855f7]/45 hover:border-[#a855f7]'}`}
                            >
                                {translating ? '…' : 'A'}
                            </button>
                        )}
                        
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
                        onClick={() => onImageClick(protectedImageUrl!)}
                        className={`focus:outline-none rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 ${message.text ? 'mb-2' : ''}`}
                        aria-label="View image full screen"
                    >
                        {/* FORA da sala de transmissao: SEM protecao de captura
                            (regra do dono). +18 continua usando blob revogavel. */}
                        <span
                            className="relative block"
                        >
                            <img
                                src={protectedImageUrl || undefined}
                                alt="Chat attachment"
                                className="max-w-[220px] sm:max-w-[260px] max-h-[300px] w-auto h-auto object-contain rounded-lg bg-black/20"
                                draggable={false}
                            />
                            {isAdultMedia && (
                                <span
                                    style={{ opacity: 0.22, transition: 'all .6s ease', top: '6%', right: '8%' }}
                                    className="absolute z-[5] pointer-events-none select-none text-white text-[9px] font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] whitespace-nowrap"
                                >
                                    @{senderName} · 🔞 LiveGO
                                </span>
                            )}
                        </span>
                    </button>
                )}
                {message.text && (
                    <div className="flow-root">
                        <div className="float-right ml-2.5 -mb-0.5 flex items-center space-x-1 relative top-1">
                            <span className="text-[10px] text-zinc-400/70 font-mono whitespace-nowrap">{formatTimestamp(message.timestamp)}</span>
                            {isMe && <MessageStatus status={message.status} />}
                        </div>
                        {/* whitespace-pre-line: preserva as quebras de linha (\n) do texto
                            enviado — cada parte aparece uma abaixo da outra, igual WhatsApp/live */}
                        <p className="text-zinc-100 font-sans tracking-wide break-words whitespace-pre-line [overflow-wrap:anywhere] text-[13.5px] leading-relaxed font-semibold">{message.text}</p>
                        {showTranslated && translatedText && (
                            <p className="text-zinc-300 italic font-sans tracking-wide break-words whitespace-pre-line [overflow-wrap:anywhere] text-[13.5px] leading-relaxed border-t border-white/10 mt-1 pt-1">🔤 {translatedText}</p>
                        )}
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
    // 💬 Histórico: enquanto a API não responde, NÃO mostramos a tela
    // "Nenhuma mensagem ainda". Se a conversa JÁ TEM mensagens, o chat abre
    // DIRETO com elas (sem passar pela tela vazia); se realmente não tiver
    // nenhuma, aí sim mostramos o estado vazio.
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(!propMessages || propMessages.length === 0);
    const effectiveMessages = useMemo(() => {
        const base = propMessages || messages;
        const sortTime = (m: any) => {
            const t = new Date(m?.timestamp).getTime();
            return Number.isNaN(t) ? 0 : t;
        };
        return [...base].sort((a, b) => sortTime(a) - sortTime(b));
    }, [propMessages, messages]);
    const [newMessage, setNewMessage] = useState('');
    const [userStatus, setUserStatus] = useState<{ isOnline?: boolean; lastSeen?: string } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    // 🔒 Scroll da lista de mensagens — rola SOMENTE o container interno
    // (scrollTop), NUNCA a página. scrollIntoView fazia PAN na tela inteira e
    // empurrava a barra de mensagem para cima quando o teclado abria.
    const messagesScrollRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLButtonElement>(null);
    // ⌨️ Composer TikTok-style: a barra de mensagem principal fica TOTALMENTE
    // FIXA no fundo (bottom = safe-area, nunca sai do lugar). Ao tocar nela,
    // a barra fica INVISÍVEL (sem ser movida nem apagada) e abre um SEGUNDO
    // campo de digitação (composer) colado acima do teclado.
    // `keyboardInset` (altura real do teclado) é usado tanto para rolar até a
    // última mensagem quanto para posicionar o composer COLADO no teclado.
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

    // 📝 Auto-resize textarea: ajusta a altura automaticamente
    const autoResizeTextarea = useCallback(() => {
        const ta = composerInputRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        const maxH = 120; // ~5 linhas
        ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
    }, []);
    const { t } = useTranslation();
    const chatKey = useMemo(() => {
        const cId = currentUser?.id;
        const fId = user?.id;
        if (!cId || !fId) return '';
        return `chat_private_${cId < fId ? cId + '_' + fId : fId + '_' + cId}`;
    }, [currentUser?.id, user?.id]);

    // Sala de chat: Socket.IO removido — mensagens via REST API
    const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);

    // ⌨️ Indicador "digitando..." (estilo WhatsApp)
    const [isTyping, setIsTyping] = useState(false);
    const typingStopTimerRef = useRef<number | null>(null);
    const lastTypingEmitRef = useRef(0);

    // 📌 Responder mensagem (estilo WhatsApp)
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const replyToRef = useRef<Message | null>(null);
    replyToRef.current = replyTo;

    const handleUserTyping = useCallback(() => {
        if (!user?.id) return;
        const now = Date.now();
        // Debounce: no máximo 1 emit a cada 900ms
        if (now - lastTypingEmitRef.current > 900) {
            lastTypingEmitRef.current = now;
            emitChatTyping(user.id, true);
        }
        if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = window.setTimeout(() => emitChatTyping(user.id, false), 2000);
    }, [user?.id]);

    const handleReplyTo = useCallback((msg: Message) => {
        setReplyTo(msg);
        if (!isComposerOpen) openComposer();
    }, [isComposerOpen, openComposer]);
    

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
        // ⚡ SEM spinner: carrega do banco e renderiza direto.
        setIsLoadingHistory(true);
        try {
            const [fetchedMessages, status] = await Promise.all([
                api.getChatMessages(user.id, currentUser.id),
                api.getUserStatus(user.id)
            ]);
            
            const fetched = fetchedMessages || [];
            setMessages(prev => {
                if (!prev || prev.length === 0) return fetched;
                const fetchedIds = new Set(fetched.map(m => m.id));
                const localOnly = prev.filter(m => !fetchedIds.has(m.id));
                return [...fetched, ...localOnly];
            });
            setUserStatus(status);
            syncFromMessages(fetched);
        } catch (error) {
            // Falhou a busca: tenta mais uma vez antes de decidir mostrar vazio
            try {
                const retry = await api.getChatMessages(user.id, currentUser.id);
                setMessages(prev => (prev && prev.length > 0 ? prev : (retry || [])));
                syncFromMessages(retry || []);
            } catch (_) { /* mantém o que temos */ }
        } finally {
            setIsLoadingHistory(false);
        }
    }, [user.id, currentUser.id]);

    // 📜 Rola a lista de mensagens INTERNAMENTE até o fim (scrollTop do
    // container). NUNCA usa scrollIntoView — que rola a página/visualViewport
    // e fazia a barra de mensagem SUBIR quando o teclado abria.
    const scrollMessagesToBottom = () => {
        const el = messagesScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

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
            
            setTimeout(scrollMessagesToBottom, 80);
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
            setTimeout(scrollMessagesToBottom, 60);
        }
    }, [effectiveMessages.length]);

    // 📝 Quando o texto é limpo (após enviar), reseta a altura do textarea
    useEffect(() => {
        if (!newMessage) {
            const ta = composerInputRef.current as HTMLTextAreaElement | null;
            if (ta) ta.style.height = 'auto';
        }
    }, [newMessage]);

    // ⌨️ Quando o teclado abre (keyboardInset sobe), rolar a última mensagem
    // para cima do input — rolagem INTERNA, sem mover a página nem a barra.
    const prevInsetRef = useRef(0);
    useEffect(() => {
        const opened = keyboardInset > 0 && prevInsetRef.current === 0;
        prevInsetRef.current = keyboardInset;
        if (opened && effectiveMessages.length > 0) {
            // Delay: espera a animação do teclado (e do re-layout) estabilizar
            setTimeout(scrollMessagesToBottom, 120);
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

    // ⌨️ Indicador "digitando..." em tempo real (estilo WhatsApp).
    // Recebe o evento do backend (repasse via socketService) e mostra no header.
    // 🔵 Confirmação de leitura em tempo real: quando o DESTINATÁRIO lê minhas
    // mensagens, o backend emite `messages_read` → aqui atualizo ✓✓ para azul.
    useEffect(() => {
        const onTyping = (e: Event) => {
            const data = (e as CustomEvent).detail;
            if (!data) return;
            if (data.from === user.id && data.to === currentUser.id) {
                setIsTyping(!!data.typing);
                if (data.typing) {
                    if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
                    typingStopTimerRef.current = window.setTimeout(() => setIsTyping(false), 4000);
                }
            }
        };
        const onMessagesRead = (e: Event) => {
            const data = (e as CustomEvent).detail;
            if (!data?.messageIds?.length) return;
            // `userId` é quem LEU (o destinatário). Só atualizo se for o outro lado.
            if (data.userId !== user.id) return;
            const ids = new Set(data.messageIds);
            setMessages(prev => prev.map(m =>
                m.from === currentUser.id && ids.has(m.id)
                    ? { ...m, status: 'read' as 'read' }
                    : m
            ));
        };
        window.addEventListener('chat_typing', onTyping);
        window.addEventListener('messages_read', onMessagesRead);
        return () => {
            window.removeEventListener('chat_typing', onTyping);
            window.removeEventListener('messages_read', onMessagesRead);
            if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
            // Avisar o outro lado que parei de digitar
            if (user?.id && currentUser?.id) emitChatTyping(user.id, false);
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
        const sendingMessage = effectiveMessages.some((m: any) => m.status === 'sending');

        if ((!hasText && !hasImage) || sendingMessage) return;

        setSendError(null);

        const textToSend = newMessage;
        const imageFile = selectedImageFile;

        const tempId = `temp_${Date.now()}`;
        const replyContext = replyToRef.current
            ? {
                text: replyToRef.current.imageUrl && !replyToRef.current.text ? undefined : replyToRef.current.text,
                imageUrl: replyToRef.current.imageUrl || undefined,
                from: replyToRef.current.from,
                senderName: replyToRef.current.senderName || (replyToRef.current.from === currentUser.id ? currentUser.name : user.name)
            }
            : undefined;

        const optimisticMessage: Message = {
            id: tempId,
            chatId: chatKey,
            from: currentUser.id,
            to: user.id,
            text: textToSend,
            imageUrl: selectedImage || undefined,
            timestamp: new Date().toISOString(),
            status: 'sending' as 'sent',
            replyTo: replyContext,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setSelectedImage(null);
        setSelectedImageFile(null);
        setReplyTo(null);
        // Parei de digitar
        emitChatTyping(user.id, false);

        setTimeout(scrollMessagesToBottom, 120);

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

            const result = await api.sendChatMessage(currentUser.id, user.id, textToSend, finalImageUrl, tempId, replyContext);

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
            const anyErr = error as any;
            const reason = anyErr?.response?.data?.error;
            if (anyErr?.response?.status === 403 && reason) {
                setSendError(reason);
            } else if (anyErr?.response?.status === 403) {
                setSendError('Este usuário não aceita mensagens privadas no momento');
            }
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
                                <span className={`text-[12px] flex items-center font-medium ${isTyping ? 'text-[#b91bff]' : 'text-[#00e5ff]'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isTyping ? 'bg-[#b91bff] animate-pulse' : 'bg-[#00e5ff]'}`}></span>
                                    {isTyping ? 'digitando...' : ((userStatus?.isOnline ?? user.isOnline) ? t('common.online') : formatLastSeen(userStatus?.lastSeen))}
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
                    <div ref={messagesScrollRef} className="absolute inset-0 overflow-y-auto no-scrollbar overscroll-contain">
                    {!isLoadingHistory && effectiveMessages.length === 0 ? (
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
                            {(() => {
                                // 📅 Separadores de data (estilo WhatsApp): Hoje / Ontem / data
                                let lastDayKey = '';
                                return effectiveMessages.map((msg) => {
                                    if (msg.type === 'system-friend-notification') {
                                        return <BecameFriendsIndicator key={msg.id} onNavigate={onNavigateToFriends} />;
                                    }
                                    const dayKey = formatDayLabel(msg.timestamp);
                                    const showSeparator = dayKey && dayKey !== lastDayKey;
                                    lastDayKey = dayKey;
                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showSeparator && (
                                                <div className="flex justify-center my-2 select-none">
                                                    <span className="bg-[#232128]/90 text-[#a09cae] text-[11px] font-bold px-3 py-1 rounded-full">{dayKey}</span>
                                                </div>
                                            )}
                                            <ChatMessageBubble
                                                message={msg}
                                                isMe={msg.from === currentUser.id}
                                                user={msg.from === currentUser.id ? currentUser : user}
                                                onImageClick={handleViewImage}
                                                onAvatarClick={onOpenProfile}
                                                currentUser={currentUser}
                                                onReply={handleReplyTo}
                                            />
                                        </React.Fragment>
                                    );
                                });
                            })()}
                            {/* ⌨️ Bolha "digitando..." (estilo WhatsApp) */}
                            {isTyping && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-10 h-10 rounded-full bg-[#131317] border-[3px] border-[#131317] overflow-hidden">
                                        <img src={user.avatarUrl || `https://picsum.photos/seed/${user.name}/200/200.jpg`} alt="avatar" className="w-full h-full rounded-full object-cover border border-white/10 bg-zinc-950" />
                                    </div>
                                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-1">
                                        <span className="typing-dot" />
                                        <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                                        <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                </div>
                            )}
                            <div style={{ height: `calc(4.5rem + ${isComposerOpen ? keyboardInset : 0}px + env(safe-area-inset-bottom, 0px))` }} />
                        </div>
                    )}
                    </div>
                </main>
                {/* ⌨️ Barra de mensagem 100% FIXA: bottom é SEMPRE
                    safe-area-inset-bottom — o teclado NUNCA a move. Ao digitar,
                    ela fica apenas INVISÍVEL (opacity) e o composer (SEGUNDA
                    barra) aparece colado acima do teclado, por cima dela.
                    z-30 > avatar das bolhas (z-20): ao rolar, o avatar passa
                    POR BAIXO da barra, nunca por cima. */}
                <footer className={`fixed left-0 right-0 z-30 bg-[#131317] px-4 pt-3 pb-3 border-t border-[#232128] transition-all duration-200 ${isComposerOpen ? 'opacity-0 pointer-events-none' : ''}`} style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    {replyTo && (
                        <div className="relative mb-2 rounded-xl bg-[#2a1334]/70 border-l-4 border-[#d21fff] px-3 py-2 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-black text-[#d21fff] truncate">
                                    Respondendo a {replyTo.senderName || (replyTo.from === currentUser.id ? currentUser.name : user.name)}
                                </div>
                                <div className="text-[12px] text-zinc-300 truncate">
                                    {replyTo.imageUrl && !replyTo.text ? '📷 Foto' : replyTo.text || ''}
                                </div>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="ml-2 p-1 text-[#888691] hover:text-white flex-shrink-0" aria-label="Cancelar resposta">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
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
                    {sendError && (
                        <div className="mb-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-[13px] text-red-400 leading-relaxed">
                            {sendError}
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
                        <div className="flex-grow min-h-[40px] flex items-center">
                            <button
                                type="button"
                                ref={chatInputRef}
                                tabIndex={-1}
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); openComposer(); }}
                                className="w-full bg-transparent text-[14px] px-2 py-2 text-left focus:outline-none cursor-pointer select-none whitespace-normal break-words [overflow-wrap:anywhere] leading-relaxed line-clamp-2 overflow-hidden"
                            >
                                {newMessage ? (
                                    <span className="text-white whitespace-normal break-words [overflow-wrap:anywhere]">{newMessage}</span>
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

                {/* ⌨️ Composer (SEGUNDA barra): container SEPARADO, `position:fixed`
                    relativo ao VIEWPORT (não ao layout do chat) e z-index alto.
                    Usa a altura REAL do teclado medida pela 🔬 sonda do
                    visualViewport (`bottom` = fixedBottom): cola EXATAMENTE em
                    cima do teclado, sem depender do auto-rise do navegador.
                    `min()` garante que NUNCA ultrapassa o topo da tela — se o
                    teclado for alto demais, a barra encosta no limite e não
                    um fixo `bottom:0` realmente termina naquele aparelho — cola a
                    barra EXATAMENTE em cima do teclado. ⚠️ SEM `min(..., 100dvh - X)`: com
                    o teclado aberto o 100dvh é a altura VISÍVEL (tela − teclado), então
                    o min empurrava a barra para baixo, para TRÁS do teclado. A sonda
                    já mede o valor certo (0 em iOS que auto-sobe; altura do teclado
                    em Android). */}
                {isComposerOpen && (
                    <div
                        ref={composerRef}
                        className="fixed left-0 right-0 z-[999]"
                        style={{ bottom: `${bottom}px` }}
                    >
                        <footer className="bg-[#131317] px-4 pt-3 pb-3 border-t border-[#232128]">
                            {replyTo && (
                                <div className="relative mb-2 rounded-xl bg-[#2a1334]/70 border-l-4 border-[#d21fff] px-3 py-2 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-black text-[#d21fff] truncate">
                                            Respondendo a {replyTo.senderName || (replyTo.from === currentUser.id ? currentUser.name : user.name)}
                                        </div>
                                        <div className="text-[12px] text-zinc-300 truncate">
                                            {replyTo.imageUrl && !replyTo.text ? '📷 Foto' : replyTo.text || ''}
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="ml-2 p-1 text-[#888691] hover:text-white flex-shrink-0" aria-label="Cancelar resposta">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {sendError && (
                                <div className="mb-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-[13px] text-red-400 leading-relaxed">
                                    {sendError}
                                </div>
                            )}
                            <div className="flex items-center space-x-2 bg-[#1b191e] rounded-[24px] p-1 border border-[#232128]">
                                <div className="flex-grow min-h-[40px]">
                                    <textarea
                                        ref={composerInputRef}
                                        rows={1}
                                        placeholder="Diga oi..."
                                        value={newMessage}
                                        enterKeyHint="send"
                                        autoComplete="off"
                                        onChange={(e) => { setNewMessage(e.target.value); setSendError(null); handleUserTyping(); autoResizeTextarea(); }}
                                        onBlur={() => {
                                            // Só fecha se o foco saiu do composer por completo.
                                            // Não fecha em blur transitório do navegador (mobile).
                                            setTimeout(() => {
                                                if (composerRef.current && !composerRef.current.contains(document.activeElement)) {
                                                    closeComposer();
                                                }
                                            }, 120);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        className="w-full bg-transparent text-white placeholder-[#5a5860] text-[14px] px-2 py-2.5 focus:outline-none resize-none overflow-y-auto max-h-[120px] leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
                                        style={{ height: 'auto', minHeight: '40px' }}
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
