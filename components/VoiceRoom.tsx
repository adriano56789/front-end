import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    CloseIcon, MessageIcon, GiftIcon, MicrophoneIcon, MicrophoneOffIcon,
    ViewerIcon, GoldCoinWithGIcon, PlusIcon, SendIcon, BellIcon, LockIcon,
    MoreIcon, CheckIcon, UserPlusIcon
} from './icons';
import { VoiceRoom as VoiceRoomType, VoiceSlot, User, ToastType, Gift as GiftType, PurchasePackage, HostNoticeState } from '../types';
import { api } from '../services/api';
import { connectSocket, onSocketEvent } from '../services/socketService';
import { useTranslation } from '../i18n';
import { PremiumLevelBadge } from './UserLevelsScreen';
import GiftModal from './live/GiftModal';
import ToolsModal from './ToolsModal';
import ContributionRankingModal from './ContributionRankingModal';
import OnlineUsersModal from './live/OnlineUsersModal';
import AvatarWithFrame from './ui/AvatarWithFrame';
import CoHostModal from './CoHostModal';
import { VoiceSfuService } from '../services/VoiceSfuService';
import ChatMessage from './live/ChatMessage';
import EntryChatMessage from './live/EntryChatMessage';
import HostNoticePlaque from './live/HostNoticePlaque';
import { RankedAvatar } from './live/RankedAvatar';
import GiftAnimationPanel, { GiftAnimationPanelHandle } from './live/GiftAnimationPanel';
import type { GiftPayload } from './live/GiftAnimationOverlay';
import RouletteModal from './RouletteModal';
import WalletScreen from './WalletScreen';
import ConfirmPurchaseScreen from './ConfirmPurchaseScreen';
import StripeCheckoutOverlay from './StripeCheckoutOverlay';
import CadastralDataScreen from './CadastralDataScreen';
import UserActionModal from './UserActionModal';
import JoinEffectOverlay from './live/JoinEffectOverlay';
import { getAnimationUrl, getAnimationDuration } from '../services/GiftAnimationUrls';
import { useComposerKeyboard, MESSAGE_BAR_HEIGHT } from '../hooks/useComposerKeyboard';
import { useHostNotice } from '../hooks/useHostNotice';

interface VoiceRoomProps {
    roomId: string;
    currentUser: User;
    onClose: () => void;
    addToast: (type: ToastType, message: string, options?: { title?: string; avatar?: string }) => void;
    gifts: GiftType[];
    receivedGifts: (GiftType & { count: number })[];
    updateUser: (user: User) => void;
    onOpenWallet: (initialTab?: 'Diamante' | 'Ganhos') => void;
    onOpenVIPCenter: () => void;
    onFollowUser?: (user: User, streamId?: string) => void;
    onViewProfile?: (user: User) => void;
    onOpenPrivateChat?: () => void;
    onOpenPrivateInviteModal?: () => void;
    followingUsers?: string[];
    onKickedOut?: () => void;
}

const AVATAR_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">' +
    '<rect width="150" height="150" fill="#374151"/>' +
    '<circle cx="75" cy="62" r="26" fill="#9ca3af"/>' +
    '<path d="M22 138c3-30 30-42 53-42s50 12 53 42" fill="#9ca3af"/>' +
    '</svg>'
);
const AVATAR_FALLBACK = (_seed: string) => AVATAR_PLACEHOLDER_SVG;

const MAX_CHAT_MESSAGES = 50;

// 🚪 A mensagem de entrada do próprio usuário deve aparecer UMA ÚNICA vez por
// sessão E por sala (não a cada reentrada na MESMA sala). Como VoiceRoom
// remonta a cada entrada/saída, um flag global por sala atravessa os mounts.
const selfEntryShownRooms = new Set<string>();

/* ══════════════════════════════════════════════════════════════════════
 * VoiceChatMessage — MESMO formato da sala de transmissão (StreamRoom).
 * Mensagens do chat de voz são renderizadas com as MESMAS bolhas
 * (EntryChatMessage / ChatMessage) da live.
 * ══════════════════════════════════════════════════════════════════════ */
interface VoiceChatMessage {
    id: string | number;
    type: 'chat' | 'entry';
    user?: string;
    userId?: string | number;
    fullUser?: User;
    age?: number;
    gender?: 'male' | 'female' | 'not_specified';
    level?: number;
    message?: string | React.ReactNode;
    avatar?: string;
    isModerator?: boolean;
    isGift?: boolean;
    timestamp?: string | number;
    // 🪧 Plaquinha do host embutida como item de mensagem (fluxo normal do chat)
    hostNotice?: HostNoticeState | null;
}

/* ══════════════════════════════════════════════════════════════════════
 * SlotAvatar — avatar de quem está no palco (estilo TikTok / Tencent Cloud)
 * - Anel gradiente girando = FALANDO
 * - Anel estático sutil = no palco (ocioso)
 * - Tracejado com "+" = slot vazio (toque para subir)
 * ══════════════════════════════════════════════════════════════════════ */
const SlotAvatar: React.FC<{
    slot: VoiceSlot;
    size: 'host' | 'mic';
    isCurrentUser: boolean;
    canTap?: boolean;
    onSlotClick?: () => void;
}> = ({ slot, size, isCurrentUser, canTap, onSlotClick }) => {
    const filled = !!slot.userId;
    const isHost = slot.index === 0;
    const speaking = filled && slot.isSpeaking && !slot.isMuted;
    const dims = size === 'host' ? 'w-[58px] h-[58px]' : 'w-[46px] h-[46px]';

    return (
        <div className="flex flex-col items-center gap-1.5 min-w-0 select-none">
            <button
                onClick={onSlotClick}
                disabled={!onSlotClick}
                className={`relative ${dims} rounded-full flex-shrink-0 transition-transform ${filled ? 'bg-[#161a23]' : 'bg-transparent'} ${onSlotClick ? 'cursor-pointer active:scale-95' : ''}`}
            >
                {filled ? (
                    <>
                        {/* Anel gradiente (fala = gira, ocioso = estático) */}
                        <div className={`absolute inset-0 rounded-full pointer-events-none ${speaking ? 'vr-ring vr-ring-speaking vr-ring-pulse' : isHost ? 'vr-host-ring' : 'vr-ring'}`} />
                        {/* Avatar chegando até a borda interna do anel */}
                        <img
                            src={slot.avatar || AVATAR_FALLBACK(slot.userId || '')}
                            alt={slot.userName}
                            className="absolute inset-[3px] rounded-full object-cover w-[calc(100%-6px)] h-[calc(100%-6px)] bg-[#1a1f2b]"
                            draggable={false}
                        />
                        {/* Equalizer falando */}
                        {speaking && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 vr-eq z-10">
                                <span /><span /><span />
                            </div>
                        )}
                        {/* Mudo */}
                        {slot.isMuted && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center border-2 border-[#0e0f13] shadow-[0_2px_8px_rgba(239,68,68,0.6)]">
                                <MicrophoneOffIcon className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                        {/* Host: badge de microfone central */}
                        {isHost && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center border-2 border-[#0e0f13] shadow-[0_2px_10px_rgba(34,211,238,0.7)]">
                                <MicrophoneIcon className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Slot vazio — tracejado */}
                        <div className={`absolute inset-0 rounded-full border-2 border-dashed ${canTap ? 'border-cyan-400/40' : 'border-white/15'} transition-colors`} />
                        <div className={`absolute inset-[5px] rounded-full flex items-center justify-center ${canTap ? 'bg-cyan-400/10' : 'bg-white/[0.04]'} transition-colors ${canTap ? 'group-hover:bg-cyan-400/20' : ''}`}>
                            <PlusIcon className={`w-6 h-6 ${canTap ? 'text-cyan-300/70' : 'text-white/20'}`} />
                        </div>
                    </>
                )}
            </button>

            {/* Nome + nível */}
            {filled && (
                <div className="flex items-center justify-center gap-1 max-w-full min-w-0">
                    <span className="text-[11px] text-white/90 font-semibold truncate max-w-[68px]">{slot.userName}</span>
                    <PremiumLevelBadge level={slot.level} className="scale-[0.72] -mx-1.5 shrink-0" />
                </div>
            )}
            {!filled && !isHost && (
                <span className="text-[9px] text-white/25 leading-none">{canTap ? 'Subir' : 'Vazio'}</span>
            )}
            {isCurrentUser && filled && (
                <span className="-mt-1 text-[8px] font-bold px-1.5 py-[1px] rounded-full bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">Você</span>
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════
 * VoiceRoom — IDÊNTICO ao StreamRoom em estrutura
 * Header, coins, likes, chat, barra inferior — tudo igual
 * Só muda: no lugar do vídeo, aparecem os slots de voz
 * ══════════════════════════════════════════════════════════════════════ */
export const VoiceRoom: React.FC<VoiceRoomProps> = ({
    roomId,
    currentUser,
    onClose,
    addToast,
    gifts,
    receivedGifts,
    updateUser,
    onOpenWallet,
    onOpenVIPCenter,
    onFollowUser = () => {},
    onViewProfile = () => {},
    onOpenPrivateChat = () => {},
    onOpenPrivateInviteModal = () => {},
    followingUsers = [],
    onKickedOut,
}) => {
    const { t } = useTranslation();
    const [room, setRoom] = useState<VoiceRoomType | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isGiftOpen, setIsGiftOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [coins, setCoins] = useState(0);
    const [onlineCount, setOnlineCount] = useState(1);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
    const [liveRanking, setLiveRanking] = useState<(User & { value: number })[]>([]);
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [isCoHostModalOpen, setIsCoHostModalOpen] = useState(false);
    // 🤝 Convite para subir no palco (DENTRO desta sala — não cria sala nova)
    const [stageInvite, setStageInvite] = useState<{ roomId: string; roomName: string; inviterId: string; inviterName: string; inviterAvatar?: string } | null>(null);
    const [inviteResponding, setInviteResponding] = useState(false);
    const audioServiceRef = useRef<VoiceSfuService | null>(null);

    // ─── PARITY STREAMROOM — estados adicionais ───
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [isModerationMode, setIsModerationMode] = useState(false);
    const [moderatorIds, setModeratorIds] = useState<string[]>([]);
    const [mutedIds, setMutedIds] = useState<string[]>([]);
    const [pinnedGifts, setPinnedGifts] = useState<{ gift: GiftType; label: string }[]>([]);
    const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(false);
    const [isAutoPrivateInviteEnabled, setIsAutoPrivateInviteEnabled] = useState(false);
    const [isRouletteOpen, setIsRouletteOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [stripeCheckout, setStripeCheckout] = useState<{ clientSecret: string; publishableKey: string; orderId: string; openUrl?: string } | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<PurchasePackage | null>(null);
    const [isCadastralScreenOpen, setIsCadastralScreenOpen] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState<PurchasePackage | null>(null);
    const [userActionModalState, setUserActionModalState] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [joinEffect, setJoinEffect] = useState<{ userName: string; avatarUrl?: string; entranceEffect?: { id?: string; url?: string; configUrl?: string; w?: number; h?: number } } | null>(null);
    const joinEffectShownRef = useRef(false);
    const giftPanelRef = useRef<GiftAnimationPanelHandle>(null);
    const roomRef = useRef<VoiceRoomType | null>(null);
    const recentGiftEventsRef = useRef<Set<string>>(new Set());
    const onFollowUserRef = useRef(onFollowUser);
    useEffect(() => { onFollowUserRef.current = onFollowUser; }, [onFollowUser]);
    const onKickedOutRef = useRef<() => void>(onKickedOut || onClose);
    useEffect(() => { onKickedOutRef.current = onKickedOut || onClose; }, [onKickedOut, onClose]);
    const scrollFrameRef = useRef<number>(0);

    // ─── ───
    const isHost = room?.hostId === currentUser.id;
    const isCurrentUserModerator = moderatorIds.includes(String(currentUser.id));
    const mySlot = room?.slots.find(s => s.userId === currentUser.id);
    const canSpeak = !!mySlot;

    // 🔧 Constrói um User a partir da mensagem — MESMA receita da sala de
    // transmissão (StreamRoom.constructUserFromMessage) para as bolhas.
    const constructUserFromMessage = (user: VoiceChatMessage): User => {
        const userId = user.fullUser?.id || user.userId || (user.id as string) || String(Date.now());
        const userName = user.user || user.fullUser?.name || 'Usuário Anônimo';
        return {
            avatar: user.avatar || '',
            id: String(userId),
            identification: String(userId),
            name: userName,
            avatarUrl: user.avatar || user.fullUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff&bold=true&font-size=0.4`,
            coverUrl: user.fullUser?.coverUrl || `https://picsum.photos/seed/${userId}/400/600`,
            country: user.fullUser?.country || 'global',
            gender: user.gender || 'not_specified',
            level: user.level || 1,
            xp: 0,
            age: user.age || 18,
            location: 'Global',
            distance: 'desconhecida',
            fans: 0,
            following: 0,
            receptores: 0,
            enviados: 0,
            topFansAvatars: [],
            isLive: false,
            diamonds: 0,
            earnings: 0,
            earnings_withdrawn: 0,
            bio: 'Usuário da plataforma',
            obras: [],
            curtidas: [],
            ownedFrames: [],
            activeFrameId: null,
            frameExpiration: null,
        };
    };

    // Usuário mínimo para presentes/entradas/rank (formato completo de User).
    const buildLiteUser = useCallback((u: { id: string; name: string; avatar?: string; level?: number }): User => {
        return constructUserFromMessage({ id: u.id, type: 'chat' as const, user: u.name, avatar: u.avatar || '', level: u.level || 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { roomRef.current = room; }, [room]);

    // ─── Presentes: animação + bolha no chat (MESMA lógica do StreamRoom) ───
    // ATENÇÃO: declarados ANTES do useEffect de socket abaixo — este usa
    // `enqueueGift` no corpo e nas deps; declarar depois causaria TDZ
    // (Block-scoped variable used before its declaration).
    const postGiftChatMessage = useCallback((payload: GiftPayload) => {
        try {
            const { fromUser, gift, toUser, quantity } = payload;
            if (!fromUser || !fromUser.name || !gift || !toUser || !toUser.name) return;
            const giftMessage: VoiceChatMessage = {
                id: String(Date.now() + Math.random()),
                type: 'chat',
                user: 'Sistema',
                isGift: true,
                level: fromUser.level || 1,
                message: (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-extrabold text-[#c084fc] hover:underline text-[10px]">{fromUser.name}</span>
                        <span className="text-purple-200 text-[10px]">enviou {quantity}x {gift.name || 'Presente'} para {toUser.name}!</span>
                        {typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/')) ? <img src={gift.icon} alt={gift.name} className="w-3 h-3 inline-block object-contain" /> : <span className="text-xs">{gift.icon || '🎁'}</span>}
                    </span>
                ),
                avatar: fromUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fromUser.name || 'Sistema')}&background=random`,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, giftMessage].slice(-MAX_CHAT_MESSAGES));
        } catch {
            /* não impede o envio do presente */
        }
    }, []);

    // 🎁 Fila central de presentes → painel independente (GiftAnimationPanel).
    const enqueueGift = useCallback((payload: any) => {
        const fromId = payload?.fromUser?.id || payload?.from?.id || payload?.userId || payload?.senderId || '';
        const giftName = payload?.gift?.name || payload?.giftName || '';
        if (!giftName) return;
        if (!payload?.fromUser?.id) {
            if (!payload.fromUser) payload.fromUser = {} as any;
            payload.fromUser.id = fromId || 'unknown';
        }
        const tryPush = (attempt: number) => {
            if (giftPanelRef.current) {
                giftPanelRef.current.pushGift(payload);
            } else if (attempt < 5) {
                setTimeout(() => tryPush(attempt + 1), 200);
            }
        };
        tryPush(0);
        postGiftChatMessage(payload);
    }, [postGiftChatMessage]);

    // ─── Socket: join sala ───
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const s = await connectSocket();
            if (cancelled || !s) return;
            s.emit('join_stream', {
                streamId: roomId,
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatarUrl || '',
            });
        })();
        return () => { cancelled = true; };
    }, [roomId, currentUser.id, currentUser.name, currentUser.avatarUrl]);

    // ─── Carregar sala (REST) ───
    const loadRoom = useCallback(async () => {
        try {
            const res = await api.voiceRoom.get(roomId);
            if (res?.success && res.room) {
                setRoom(res.room);
                setCoins(0);
                setOnlineCount(Math.max(1, res.room.viewers || 1));
                // 👑 Carregar administradores atuais da sala (badge Adm para todos)
                api.getStreamModerators(roomId).then((list) => {
                    if (Array.isArray(list) && list.length) setModeratorIds(list);
                }).catch(() => {});
            }
        } catch {
            addToast(ToastType.Error, t('voiceRoom.loadError'));
        } finally {
            setLoading(false);
        }
    }, [roomId, addToast, t]);

    useEffect(() => { loadRoom(); }, [loadRoom]);

    // ─── 💓 Heartbeat de presença: enquanto o usuário está DENTRO da sala,
    // mantém a sala viva no backend a cada 25s. Se parar (fechou o app/saída
    // repentina), o backend remove a sala em ~2min — nada de "card fixo vazio"
    // na home. Também re-insere na contagem de viewers após recarregar a aba.
    useEffect(() => {
        if (!room?.roomId || !currentUser?.id) return;
        const beat = () => {
            api.voiceRoom.heartbeat(room.roomId, currentUser.id)
                .then(res => {
                    if (res?.room) {
                        setRoom(prev => prev ? {
                            ...prev,
                            viewers: res.room?.viewers ?? prev.viewers,
                            slots: res.room?.slots ?? prev.slots,
                        } : prev);
                    }
                })
                .catch(() => {});
        };
        beat();
        const id = setInterval(beat, 25000);
        return () => clearInterval(id);
    }, [room?.roomId, room?.isLive, currentUser?.id]);

    // ─── Socket events: slots, speaking, mute, ended, viewer count, chat ───
    useEffect(() => {
        const offSlot = onSocketEvent('voice_slot_update', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            if (data.slots) setRoom(prev => prev ? { ...prev, slots: data.slots } : prev);
        });
        const offSpeaking = onSocketEvent('voice_speaking', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            setRoom(prev => prev ? { ...prev, slots: prev.slots.map(s => s.userId === data.userId ? { ...s, isSpeaking: data.isSpeaking } : s) } : prev);
        });
        const offMute = onSocketEvent('voice_mute_update', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            setRoom(prev => prev ? { ...prev, slots: prev.slots.map(s => s.userId === data.userId ? { ...s, isMuted: data.isMuted } : s) } : prev);
            // 🎙️ Sincroniza o estado de mudo para TODOS da sala (badge no modal)
            if (data.userId) {
                const uid = String(data.userId);
                setMutedIds(prev => (data.isMuted ? [...new Set([...prev, uid])] : prev.filter(id => id !== uid)));
            }
            // 🔊 Host silenciou VOCÊ → desliga o microfone local de verdade
            if (data.userId && String(data.userId) === String(currentUser.id)) {
                setIsMuted(!!data.isMuted);
                audioServiceRef.current?.setMuted(!!data.isMuted);
            }
        });
        const offEnded = onSocketEvent('voice_room_ended', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            addToast(ToastType.Info, t('voiceRoom.ended'));
            onClose();
        });
        const offViewerCount = onSocketEvent('voice_viewer_count', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            if (data.viewers !== undefined) {
                setRoom(prev => prev ? { ...prev, viewers: data.viewers } : prev);
                setOnlineCount(Math.max(1, data.viewers));
            }
        });
        // 🤝 Convite para subir no palco (DENTRO desta sala — não cria sala nova)
        const offStageInvite = onSocketEvent('voice_stage_invite', (data: any) => {
            if (!data) return;
            const evRoom = data.roomId || '';
            if (evRoom && String(evRoom) !== String(roomId)) return;
            setStageInvite({
                roomId: String(evRoom),
                roomName: data.roomName || room?.name || 'Sala de voz',
                inviterId: data.inviterId || data.hostId || '',
                inviterName: data.inviterName || data.hostName || 'Anfitrião',
                inviterAvatar: data.hostAvatar || data.inviterAvatar || '',
            });
        });
        // 🪙 Contador de moeda — MESMO evento da sala de transmissão: o backend
        // emite live_coins_updated (total = receptores do host, moeda GLOBAL).
        const offCoins = onSocketEvent('live_coins_updated', (data: any) => {
            if (!data) return;
            const evRoom = data.streamId || data.roomId || '';
            if (evRoom && String(evRoom) !== String(roomId)) return;
            if (typeof data.totalCoins === 'number') setCoins(data.totalCoins);
        });
        // 💬 Chat — ENVIO OTIMISTA local substituído pelo eco do servidor
        // (live_message). Sem duplicação: a bolha local (id "optimistic_") é
        // TROCADA pela do servidor quando o eco chega.
        const offLive = onSocketEvent('live_message', (data: any) => {
            if (!data || !data.text) return;
            setMessages(prev => {
                const stableId = String(data.id || Date.now() + Math.random());
                if (prev.some(m => String(m.id) === stableId)) return prev;
                const optimisticIdx = prev.findIndex(m =>
                    String(m.id).startsWith('optimistic_') &&
                    String(m.userId) === String(data.userId) &&
                    String(m.message) === String(data.text)
                );
                const msg: VoiceChatMessage = {
                    id: stableId,
                    type: 'chat' as const,
                    user: data.userName || data.userId || 'Usuário',
                    userId: data.userId,
                    avatar: data.avatarUrl || data.avatar || '',
                    level: data.level || 1,
                    message: data.text,
                    timestamp: new Date(data.timestamp || Date.now()).toISOString(),
                };
                if (optimisticIdx >= 0) {
                    const copy = [...prev];
                    copy[optimisticIdx] = msg;
                    return copy.slice(-MAX_CHAT_MESSAGES);
                }
                return [...prev, msg].slice(-MAX_CHAT_MESSAGES);
            });
        });
        const offBlocked = onSocketEvent('live_message_blocked', (data: any) => {
            addToast(ToastType.Error, data?.reason || 'Você foi proibido de falar');
        });
        return () => {
            offSlot(); offSpeaking(); offMute(); offEnded(); offViewerCount();
            offCoins(); offLive(); offBlocked(); offStageInvite();
        };
    }, [roomId, addToast, onClose, t, room?.name]);

    // ─── Socket events (PARITY): gifts, entradas, likes, online users ───
    useEffect(() => {
        // 🎁 Presente — mesmo tratamento da StreamRoom (eventos normalizados,
        // enfileira a animação e posta a bolha do chat). Deduplica por janela
        // de 4s para não duplicar quando o backend emite mais de um formato.
        const handleLiveGiftReceived = (data: any) => {
            if (!data) return;
            const evRoom = data.streamId || data.roomId || '';
            if (evRoom && String(evRoom) !== String(roomId)) return;
            const rawGift = data.gift || { name: data.giftName || data.name || '', price: data.giftPrice || data.price || 0, icon: data.giftIcon || '🎁', category: data.giftCategory || 'Popular' };
            const animationUrl = getAnimationUrl(rawGift);
            const duration = getAnimationDuration(rawGift);
            const senderId = data.from?.id || data.fromUser?.id || data.userId || data.senderId || data.fromUserId || '';
            const senderName = data.from?.name || data.fromUser?.name || data.senderName || data.userName || 'Usuário';
            const senderAvatar = data.from?.avatarUrl || data.fromUser?.avatarUrl || data.senderAvatar || data.avatarUrl || '';
            const senderLevel = data.from?.level || data.fromUser?.level || data.level || 1;
            const quantity = data.quantity || 1;
            const bucket = Math.floor(Date.now() / 4000);
            const dedupeKey = `${senderId}|${rawGift.name}|${quantity}|${bucket}`;
            if (recentGiftEventsRef.current.has(dedupeKey)) return;
            recentGiftEventsRef.current.add(dedupeKey);
            setTimeout(() => recentGiftEventsRef.current.delete(dedupeKey), 5000);

            const giftEvtPayload: any = {
                fromUser: {
                    id: senderId,
                    identification: senderId,
                    name: senderName,
                    avatarUrl: senderAvatar,
                    level: senderLevel,
                    fans: 0, following: 0, receptores: 0, enviados: 0,
                    diamonds: 0, earnings: 0, earnings_withdrawn: 0, ownedFrames: [],
                },
                toUser: { id: roomRef.current?.hostId || senderId, name: roomRef.current?.hostName || 'Anfitrião' },
                gift: { ...rawGift, ...(animationUrl ? { animationUrl } : {}), ...(duration ? { duration } : {}) },
                quantity,
                roomId,
                id: String(data.eventId || data.id || Date.now() + Math.random()),
            };
            const senderIsMe = String(senderId) === String(currentUser.id || '');
            if (senderIsMe) return;
            enqueueGift(giftEvtPayload);
            setCoins(prev => prev + (rawGift.price || 0) * quantity);
            setOnlineUsers(prev => {
                const existing = prev.find(p => String(p.id) === String(senderId));
                const addedValue = (rawGift.price || 0) * quantity;
                if (existing) {
                    return prev.map(p => String(p.id) === String(senderId) ? { ...p, value: (p.value || 0) + addedValue } : p)
                        .sort((a, b) => (b.value || 0) - (a.value || 0));
                }
                const lite = buildLiteUser({ id: senderId, name: senderName, avatar: senderAvatar, level: senderLevel });
                return [...prev, { ...lite, value: addedValue }].sort((a, b) => (b.value || 0) - (a.value || 0));
            });
            if (isHost && isAutoFollowEnabled && senderId) {
                onFollowUserRef.current(buildLiteUser({ id: senderId, name: senderName, avatar: senderAvatar, level: senderLevel }), roomRef.current?.roomId);
            }
        };
        const offGiftA = onSocketEvent('live_gift_received', handleLiveGiftReceived);
        const offGiftB = onSocketEvent('gift_received', handleLiveGiftReceived);

        // 🚪 Entrada de usuários (user:join) — MESMO comportamento da live:
        // bolha de entrada no chat + toast do host + efeito de entrada VIP.
        const offJoin = onSocketEvent('user:join', (data: any) => {
            if (!data) return;
            const evRoom = data.streamId || data.roomId || '';
            if (evRoom && String(evRoom) !== String(roomId)) return;
            const entryUserId = data.userId || data.id || '';
            const entryName = data.userName || data.name || data.user?.name || 'Alguém';
            const entryAvatar = data.avatarUrl || data.userAvatar || data.avatar || '';
            const entryLevel = data.level || 1;
            if (!entryUserId || String(entryUserId) === String(currentUser.id)) return;
            const lite = buildLiteUser({ id: String(entryUserId), name: String(entryName), avatar: entryAvatar, level: entryLevel });
            setMessages(prev => {
                const stableId = String(data.eventId || data.id || Date.now() + Math.random());
                if (prev.some(m => String(m.id) === stableId)) return prev;
                return [...prev, {
                    id: stableId,
                    type: 'entry' as const,
                    user: entryName,
                    fullUser: lite,
                    timestamp: data.timestamp || Date.now(),
                }].slice(-MAX_CHAT_MESSAGES);
            });
            setOnlineUsers(prev => {
                if (prev.some(p => String(p.id) === String(entryUserId))) return prev;
                return [...prev, { ...lite, value: 0 }];
            });
            if (isHost) {
                addToast(ToastType.Info, t('streamRoom.enteredRoom'), { title: entryName, avatar: entryAvatar });
                if (data.entranceEffect) {
                    setJoinEffect({ userName: entryName, avatarUrl: entryAvatar, entranceEffect: data.entranceEffect });
                }
            }
        });
        const offUserLeft = onSocketEvent('user:left', (data: any) => {
            const id = data?.userId || data?.id || '';
            if (id) setOnlineUsers(prev => prev.filter(u => String(u.id) !== String(id)));
        });
        const offUserLeave = onSocketEvent('user:leave', (data: any) => {
            const id = data?.userId || data?.id || '';
            if (id) setOnlineUsers(prev => prev.filter(u => String(u.id) !== String(id)));
        });
        // Espectadores entrando/saindo (infra da live) — alimenta o top-3 de contribuintes
        const offViewerJoined = onSocketEvent('viewer_joined', (data: any) => {
            const u = data?.user || {};
            if (!u?.id) return;
            setOnlineUsers(prev => {
                if (prev.some(p => String(p.id) === String(u.id))) return prev;
                return [...prev, { ...buildLiteUser({ id: u.id, name: u.name || u.userName || u.id, avatar: u.avatarUrl || u.avatar || '', level: u.level || 1 }), value: 0 }];
            });
        });
        const offViewerLeft = onSocketEvent('viewer_left', (data: any) => {
            const id = data?.userId || data?.id || '';
            if (id) setOnlineUsers(prev => prev.filter(u => String(u.id) !== String(id)));
        });
        // 🔔 Contagem online em tempo real (evento da infra da live)
        const offCount = onSocketEvent('online_users_updated', (data: any) => {
            const evRoom = data.streamId || data.roomId || '';
            if (evRoom && String(evRoom) !== String(roomId)) return;
            if (typeof data.count === 'number') setOnlineCount(Math.max(1, data.count));
        });
        // 🔨 Usuário expulso pelo host (user_kicked) — desta sala → sair.
        // (Toast/Navegação global são feitos no App via 'kicked_out'.)
        const offKicked = onSocketEvent('user_kicked', (data: any) => {
            if (!data || !data.userId) return;
            if (String(data.userId) !== String(currentUser.id)) return;
            onClose();
        });
        // 👑 Moderador mudou em tempo real — badge Adm visível para todos
        const offModUpdated = onSocketEvent('moderator_updated', (data: any) => {
            if (!data?.userId || (data.roomId && String(data.roomId) !== String(roomId))) return;
            const uid = String(data.userId);
            setModeratorIds(prev => (data.isModerator ? [...new Set([...prev, uid])] : prev.filter(id => id !== uid)));
            const userName = data.userName || data.actorId || uid;
            if (uid === String(currentUser.id)) {
                addToast(data.isModerator ? ToastType.Success : ToastType.Info, data.isModerator ? 'Você foi colocado como ADM.' : 'Você perdeu o cargo de administrador.');
            } else {
                addToast(data.isModerator ? ToastType.Success : ToastType.Info, data.isModerator ? `${userName} agora é administrador da sala! 🎉` : `${userName} deixou de ser administrador.`);
            }
        });

        return () => {
            offGiftA(); offGiftB(); offJoin(); offUserLeft(); offUserLeave();
            offViewerJoined(); offViewerLeft(); offCount(); offKicked(); offModUpdated();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, currentUser.id, addToast, onClose, t, isHost, enqueueGift, buildLiteUser]);

    // ─── Proteção: usuário bloqueado pelo host não entra nesta sala ───
    useEffect(() => {
        if (!room?.hostId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await api.checkStreamBan(room.hostId, currentUser.id);
                if (!cancelled && res?.banned) {
                    addToast(ToastType.Error, res.reason || 'Você foi bloqueado pelo anfitrião desta sala.');
                    onClose();
                }
            } catch {
                /* silencioso — nunca bloquear acesso por falha de checagem */
            }
        })();
        return () => { cancelled = true; };
    }, [room?.hostId, currentUser.id, addToast, onClose]);

    // 👢 Expulsão da sessão: quem já foi expulso NÃO volta a esta sala —
    // a lista só é limpa quando a host ENCERRA e cria a sala de novo.
    useEffect(() => {
        if (!roomId || !currentUser?.id) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            api.checkStreamKicked(roomId, currentUser.id).then((r) => {
                if (!cancelled && r?.kicked) {
                    addToast(ToastType.Error, 'Você foi expulso desta sala.');
                    onKickedOutRef.current();
                }
            }).catch(() => {});
        }, 1200);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [roomId, currentUser.id]);

    // ─── Scroll inteligente do chat (só rola p/ baixo se NÃO estiver lendo mensagens antigas) ───
    const handleChatScroll = useCallback(() => {
        if (scrollFrameRef.current) return;
        scrollFrameRef.current = requestAnimationFrame(() => {
            scrollFrameRef.current = 0;
            if (chatScrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
                setIsUserScrolledUp(!isNearBottom);
            }
        });
    }, []);

    useEffect(() => {
        if (chatScrollRef.current && !isUserScrolledUp) {
            const frame = requestAnimationFrame(() => {
                if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [messages.length, isUserScrolledUp]);

    // 🪧 Plaquinha de notificação do host (estado global da sala — host e espectadores)
    const hostNoticeCtl = useHostNotice({
        roomId,
        userId: currentUser.id,
        isHost: isHost,
        hostName: currentUser.name,
        hostAvatar: currentUser.avatarUrl || currentUser.avatar || '',
        disabled: false,
    });

    // 🪧 Plaquinha do host como MENSAGEM DO CHAT: cada disparo (pulse) insere uma
    // plaquinha NO FIM da lista de mensagens — exatamente como uma mensagem normal.
    // Mensagens novas chegam depois e empurram a plaquinha anterior pra cima; o
    // próximo disparo insere outra no fim de novo. Nunca fixa no topo/meio.
    const hostNoticeActive = !!hostNoticeCtl.notice?.active;
    useEffect(() => {
        if (!hostNoticeActive || !hostNoticeCtl.notice) return;
        const stamp = Date.now();
        setMessages(prev => {
            const id = `host_notice_${hostNoticeCtl.pulse}_${stamp}`;
            if (prev.some(m => String(m.id) === id)) return prev;
            return [...prev, { id, type: 'chat' as const, hostNotice: hostNoticeCtl.notice, timestamp: stamp }];
        });
        // Scroll pro fundo pra plaquinha ficar VISÍVEL NA HORA, mesmo que o usuário
        // estivesse lendo mensagens antigas (que sobem pra cima). Duplo rAF garante
        // que a plaquinha já montou/ocupou altura no layout.
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => {
                if (chatScrollRef.current) {
                    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                }
            });
        });
        setIsUserScrolledUp(false);
        return () => { cancelAnimationFrame(outer); if (inner) cancelAnimationFrame(inner); };
    }, [hostNoticeCtl.pulse, hostNoticeActive]);

    // Cap de mensagens: limita o DOM do chat
    useEffect(() => {
        if (messages.length > MAX_CHAT_MESSAGES) {
            setMessages(prev => (prev.length > MAX_CHAT_MESSAGES ? prev.slice(prev.length - MAX_CHAT_MESSAGES) : prev));
        }
    }, [messages.length]);

    // ─── Composer (barra única fixa) — MESMO do StreamRoom ───
    const {
        isComposerOpen,
        openComposer,
        closeComposer,
        composerInputRef,
        composerRef,
        triggerBarRef,
        keyboardBottom,
    } = useComposerKeyboard();

    // ─── Enviar mensagem (otimista + eco do servidor deduplicado) ───
    const MAX_CHAT_MESSAGE_LENGTH = 120;
    const sendMessage = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        // 🔇 SILÊNCIO PELO HOST: usuário silenciado não pode enviar mensagens
        if (mutedIds.includes(currentUser.id)) {
            addToast(ToastType.Error, 'Você foi silenciado pelo host e não pode enviar mensagens.');
            return;
        }
        const rawText = chatInput.trim();
        if (rawText === '' || !currentUser) return;
        const text = rawText.slice(0, MAX_CHAT_MESSAGE_LENGTH);
        setMessages(prev => [...prev, {
            id: `optimistic_${Date.now()}_${Math.random()}`,
            type: 'chat' as const,
            user: currentUser.name,
            userId: currentUser.id,
            avatar: currentUser.avatarUrl || currentUser.avatar || AVATAR_FALLBACK(currentUser.id),
            level: currentUser.level || 1,
            message: text,
            timestamp: Date.now(),
        }].slice(-MAX_CHAT_MESSAGES));
        setChatInput('');
        try {
            const s = connectSocket();
            s.then(sock => sock?.emit('send_live_message', { streamId: roomId, userId: currentUser.id, text })).catch(() => addToast(ToastType.Error, 'Erro ao enviar mensagem.'));
        } catch {
            addToast(ToastType.Error, 'Erro ao enviar mensagem.');
        }
    };

    // ─── Entrada do usuário atual na sala — MESMO comportamento da live ───
    // Mostra a bolha de entrada do PRÓPRIO usuário apenas UMA vez por sessão;
    // sair e reentrar não repete (a live repete porque StreamRoom remonta, mas
    // aqui o uso de flag global elimina o spam).
    useEffect(() => {
        if (selfEntryShownRooms.has(roomId)) return;
        selfEntryShownRooms.add(roomId);
        const entryMessage: VoiceChatMessage = {
            id: String(Date.now()),
            type: 'entry',
            fullUser: currentUser,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, entryMessage]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🚪 Efeito de entrada do próprio VIP (UMA vez por sessão)
    useEffect(() => {
        if (isHost || joinEffectShownRef.current) return;
        joinEffectShownRef.current = true;
        const isVipActive = !!currentUser?.isVIP &&
            (!currentUser.vipExpirationDate || new Date(currentUser.vipExpirationDate).getTime() > Date.now());
        if (isVipActive) {
            setJoinEffect({
                userName: currentUser?.name || 'Alguém',
                avatarUrl: currentUser?.avatarUrl || currentUser?.avatar || '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Like ───
    const handleLike = () => {
        if (isLiked) return;
        setIsLiked(true);
        setLikes(prev => prev + 1);
        const s = connectSocket();
        s.then(sock => sock?.emit('send_live_message', {
            streamId: roomId, userId: currentUser.id, text: '❤️',
        }));
    };

    // ─── Enviar presente (otimista + API) — MESMA lógica do StreamRoom ───
    const handleSendGift = async (gift: GiftType, quantity: number) => {
        if (!room) return;
        const totalCost = (gift.price || 0) * quantity;
        if ((currentUser.diamonds || 0) < totalCost) {
            addToast(ToastType.Error, t('vip.store.notEnoughDiamonds'));
            handleRecharge();
            return;
        }
        if (!currentUser || !currentUser.id) {
            addToast(ToastType.Error, 'Erro ao enviar presente. Tente novamente.');
            return;
        }
        const optAnimationUrl = getAnimationUrl(gift);
        const optDuration = getAnimationDuration(gift);
        try {
            const { success, error, updatedSender, updatedReceiver } = await api.sendGift(
                currentUser.id, room.hostId, roomId, gift.name, quantity,
            );
            if (success && updatedSender) {
                enqueueGift({
                    fromUser: {
                        id: currentUser.id,
                        name: (updatedSender.name || currentUser.name || 'Usuário'),
                        avatarUrl: updatedSender.avatarUrl || currentUser.avatarUrl || currentUser.avatar || '',
                        level: updatedSender.level || currentUser.level || 1,
                    },
                    toUser: { id: room.hostId, name: room.hostName || 'Anfitrião' },
                    gift: { ...gift, ...(optAnimationUrl ? { animationUrl: optAnimationUrl } : {}), ...(optDuration ? { duration: optDuration } : {}) },
                    quantity,
                    roomId,
                    id: String(Date.now() + Math.random()),
                });
                updateUser(updatedSender);
                if (updatedReceiver) {
                    setCoins(prev => prev + (gift.price || 0) * quantity);
                }
                if (gift.triggersAutoFollow && !followingUsers.includes(room.hostId)) {
                    onFollowUserRef.current(buildLiteUser({ id: room.hostId, name: room.hostName, avatar: room.hostAvatar || '' }), room.roomId);
                }
                setOnlineUsers(prev => {
                    const existing = prev.find(u => u.id === currentUser.id);
                    const totalValue = (gift.price || 0) * quantity;
                    if (existing) {
                        return prev.map(u => u.id === currentUser.id ? { ...u, value: (u.value || 0) + totalValue } : u)
                            .sort((a, b) => (b.value || 0) - (a.value || 0));
                    }
                    return [...prev, { ...currentUser, value: totalValue }].sort((a, b) => (b.value || 0) - (a.value || 0));
                });
                setIsGiftOpen(false);
                refreshRanking();
            } else {
                addToast(ToastType.Error, error || 'Falha ao enviar o presente. Tente novamente.');
            }
        } catch {
            addToast(ToastType.Error, 'Falha ao enviar o presente. Tente novamente.');
        }
    };

    // ─── Ranking de contribuição (mesmo modal da live) ───
    const refreshRanking = useCallback(async () => {
        try {
            const res = await api.voiceRoom.ranking(roomId);
            if (res?.success && Array.isArray(res.ranking)) {
                setLiveRanking(res.ranking as (User & { value: number })[]);
            }
        } catch {
            /* silencioso — modal mostra ranking vazio */
        }
    }, [roomId]);

    useEffect(() => {
        if (isRankingOpen) refreshRanking();
    }, [isRankingOpen, refreshRanking, coins]);

    useEffect(() => {
        if (room?.viewers !== undefined) setOnlineCount(Math.max(1, room.viewers || 1));
    }, [room?.viewers]);

    // ─── Slots ───
    const handleTakeSlot = async (slotIndex: number) => {
        if (!room) return;
        try {
            const res = await api.voiceRoom.takeSlot(room.roomId, currentUser.id, slotIndex);
            if (res?.success) {
                setRoom(prev => prev ? { ...prev, slots: res.slots } : prev);
                addToast(ToastType.Success, t('voiceRoom.onStage'));
                setIsMuted(false);
            }
        } catch (err: any) {
            addToast(ToastType.Error, err?.error || t('voiceRoom.joinError'));
        }
    };

    const handleReleaseSlot = async () => {
        if (!room || !mySlot || mySlot.index === 0) return;
        const res = await api.voiceRoom.releaseSlot(room.roomId, currentUser.id);
        if (res?.success) {
            setRoom(prev => prev ? { ...prev, slots: res.slots } : prev);
            setIsMuted(false);
            addToast(ToastType.Info, t('voiceRoom.offStage'));
        }
    };

    const handleToggleMute = async () => {
        if (!room || !mySlot) return;
        const next = !isMuted;
        setIsMuted(next);
        audioServiceRef.current?.setMuted(next);
        await api.voiceRoom.setMuted(room.roomId, currentUser.id, next);
    };

    const handleLeave = async () => {
        if (room) {
            audioServiceRef.current?.stop();
            api.voiceRoom.leave(room.roomId, currentUser.id).catch(() => {});
            if (isHost) api.voiceRoom.end(room.roomId, currentUser.id).catch(() => {});
        }
        onClose();
    };

    // ─── Áudio SFU — publicar microfone (se no palco) e reproduzir os demais ───
    useEffect(() => {
        if (!room) {
            audioServiceRef.current?.stop();
            audioServiceRef.current = null;
            return;
        }

        let cancelled = false;

        const startAudio = async () => {
            try {
                const previous = audioServiceRef.current;
                if (previous) {
                    previous.stop();
                    audioServiceRef.current = null;
                }

                const svc = new VoiceSfuService();
                audioServiceRef.current = svc;

                await svc.start(room.roomId, currentUser.id, canSpeak);

                if (cancelled) { svc.stop(); return; }

                svc.setCallbacks({
                    onSpeakingChange: (speaking) => {
                        if (!cancelled && canSpeak) {
                            api.voiceRoom.setSpeaking(room.roomId, currentUser.id, speaking).catch(() => {});
                        }
                    },
                });

                // Reproduzir o áudio dos outros que já estão no palco
                const peersOnStage = room.slots
                    .filter(s => s.userId && s.userId !== currentUser.id)
                    .map(s => s.userId!);
                for (const peerId of peersOnStage) {
                    if (cancelled) break;
                    svc.playPeerStream(peerId).catch(() => {});
                }
            } catch (err) {
                console.warn('[VoiceRoom] Falha ao iniciar áudio:', err);
            }
        };

        startAudio();

        return () => {
            cancelled = true;
            audioServiceRef.current?.stop();
            audioServiceRef.current = null;
        };
    }, [canSpeak, room?.roomId, currentUser.id]);

    // ─── Socket: quando alguém sobe/desce do palco, tocar/parar o áudio dele ───
    useEffect(() => {
        const offSlot = onSocketEvent('voice_slot_update', (data: any) => {
            if (data?.roomId && String(data.roomId) !== String(roomId)) return;
            if (!data.slots || !audioServiceRef.current) return;
            const svc = audioServiceRef.current;

            const currentPeerIds = new Set<string>(
                data.slots.filter((s: VoiceSlot) => s.userId && s.userId !== currentUser.id).map((s: VoiceSlot) => s.userId!)
            );

            for (const peerId of currentPeerIds) {
                svc.playPeerStream(peerId).catch(() => {});
            }

            const existing = new Set<string>();
            (svc as any)['whepMap'].forEach((_: any, id: string) => existing.add(id));
            for (const id of existing) {
                if (!currentPeerIds.has(id)) {
                    svc.stopPeerStream(id);
                }
            }
        });

        return () => { offSlot(); };
    }, [roomId, currentUser.id]);

    // ─── Co-host: convidar amigo para palco da sala de voz ───
    const handleCoHostInvite = useCallback(async (friend: User) => {
        if (!room) return;
        try {
            const res = await api.voiceRoom.inviteCoHost(room.roomId, currentUser.id, {
                id: friend.id,
                name: friend.name,
                avatar: friend.avatarUrl || friend.avatar || '',
                level: friend.level || 1,
            });
            if (res?.success) {
                addToast(ToastType.Success, `Convite enviado para ${friend.name}!`);
                setIsCoHostModalOpen(false);
            } else {
                addToast(ToastType.Error, res?.error || 'Erro ao convidar.');
            }
        } catch {
            addToast(ToastType.Error, 'Erro ao convidar co-host.');
        }
    }, [room, currentUser.id, addToast]);

    // ─── Recarga in-room (paridade StreamRoom) — wallet local na sala ───
    const handleRecharge = useCallback(() => {
        setIsWalletOpen(true);
    }, []);

    const handlePurchaseDiamonds = useCallback((pkg: PurchasePackage) => {
        if (pkg.isFreeDev) return;
        if (!currentUser?.cadastral?.document) {
            setPendingPurchase(pkg);
            setIsCadastralScreenOpen(true);
            return;
        }
        setSelectedPackage(pkg);
        setIsWalletOpen(false);
    }, [currentUser]);

    const handleConfirmPurchase = async (pkg: PurchasePackage, method: 'card' | 'pix' | 'pix_card' = 'pix_card') => {
        try {
            if (!currentUser) return;
            const res = await api.createStripeCheckoutSession({
                userId: currentUser.id,
                amountBRL: pkg.price,
                diamonds: pkg.diamonds,
                method,
                currency: pkg.currency || 'BRL',
                embed: true,
            });
            // Pagamento embutido dentro do app (página real do Stripe carregada aqui)
            if (res && res.clientSecret && res.publishableKey) {
                setStripeCheckout({
                    clientSecret: res.clientSecret,
                    publishableKey: res.publishableKey,
                    orderId: res.orderId || '',
                    openUrl: res.redirectUrl || undefined,
                });
                return;
            }
            if (res && res.redirectUrl) {
                window.location.href = res.redirectUrl;
                return;
            }
            addToast(ToastType.Error, 'Pagamento indisponível no momento.');
        } catch {
            addToast(ToastType.Error, 'Pagamento indisponível no momento.');
        }
    };

    // ─── Moderação (paridade StreamRoom) ───
    const handleOpenUserActions = (chatUser: VoiceChatMessage) => {
        if (!chatUser.user) return;
        if (chatUser.user === room?.hostName || chatUser.user === currentUser.name) return;
        const userForModal = constructUserFromMessage(chatUser);
        setUserActionModalState({ isOpen: true, user: userForModal });
    };
    const handleCloseUserActions = () => {
        setUserActionModalState({ isOpen: false, user: null });
    };
    const handleKickUser = (user: User) => {
        if (user.id === ':98501723') {
            addToast(ToastType.Error, 'PROIBIDO: Este usuário não pode ser expulso!');
            return;
        }
        const sId = room?.roomId || roomId;
        api.kickUser(sId, user.id, currentUser.id).catch(() => {});
        setRoom(prev => prev ? { ...prev, slots: prev.slots.map(s => String(s.userId) === String(user.id) ? { ...s, userId: null, userName: '', avatar: '', level: 1, isSpeaking: false, isMuted: false } : s) } : prev);
        setOnlineUsers(prev => prev.filter(u => String(u.id) !== String(user.id)));
        setModeratorIds(prev => prev.filter(id => id !== String(user.id)));
        setMutedIds(prev => prev.filter(id => id !== String(user.id)));
        addToast(ToastType.Info, `Usuário ${user.name} foi expulso.`);
    };
    const handleMakeModerator = (user: User) => {
        const sId = room?.roomId || roomId;
        const uid = String(user.id);
        const isModNow = moderatorIds.includes(uid);
        if (isModNow) {
            setModeratorIds(prev => prev.filter(id => id !== uid));
            addToast(ToastType.Info, `${user.name} foi removido dos moderadores.`);
        } else {
            setModeratorIds(prev => [...prev, uid]);
            addToast(ToastType.Success, `Sucesso! ${user.name} foi promovido a Moderador/Admin com sucesso! 🎉`);
        }
        api.makeModerator(sId, user.id, currentUser.id).catch(() => {});
    };
    const handleMuteUser = (user: User) => {
        if (String(user.id) === String(currentUser.id)) return;
        const sId = room?.roomId || roomId;
        const isMutedNow = mutedIds.includes(String(user.id));
        if (isMutedNow) {
            setMutedIds(prev => prev.filter(id => id !== String(user.id)));
            addToast(ToastType.Info, `${user.name} pode falar novamente.`);
        } else {
            setMutedIds(prev => [...prev, String(user.id)]);
            addToast(ToastType.Success, `Usuário ${user.name} foi silenciado.`);
        }
        api.muteUser(sId, user.id, currentUser.id, !isMutedNow).catch(() => {});
    };
    const handleMentionUser = (user: User) => {
        setChatInput(prev => `${prev}@${user.name} `);
    };

    // ─── Perfil / ações no clique do avatar do chat ───
    const handleViewChatUserProfile = (msg: VoiceChatMessage) => {
        if (!msg.user) return;
        if (msg.user === 'Sistema') return;
        const userProfile = constructUserFromMessage(msg);
        if (userProfile.id === currentUser.id) onViewProfile(userProfile);
        else if (isHost || isCurrentUserModerator) setUserActionModalState({ isOpen: true, user: userProfile });
        else onViewProfile(userProfile);
    };

    const handleFollowChatUser = (userToFollow: User) => {
        onFollowUserRef.current(userToFollow, roomId);
    };

    const handleFollowStreamer = () => {
        if (!room) return;
        const host = buildLiteUser({ id: room.hostId, name: room.hostName, avatar: room.hostAvatar || '', level: 1 });
        onFollowUserRef.current(host, room.roomId);
    };

    // ─── Auto-follow / auto-invite (toggle local, paridade StreamRoom) ───
    const handleToggleAutoFollow = async () => {
        if (!isHost) return;
        const next = !isAutoFollowEnabled;
        setIsAutoFollowEnabled(next);
        addToast(ToastType.Success, next ? 'Seguir automático ativado: quem mandar presente será seguido.' : 'Seguir automático desativado.');
        try {
            await api.toggleAutoFollow(roomId, next, currentUser.id);
        } catch {
            setIsAutoFollowEnabled(!next);
            addToast(ToastType.Error, 'Falha ao alterar a configuração.');
        }
    };

    const handleToggleAutoPrivateInvite = async () => {
        if (!isHost) return;
        const next = !isAutoPrivateInviteEnabled;
        setIsAutoPrivateInviteEnabled(next);
        addToast(ToastType.Success, next ? 'Convite automático ativado.' : 'Convite automático desativado.');
        try {
            await api.toggleAutoPrivateInvite(roomId, next, currentUser.id);
        } catch {
            setIsAutoPrivateInviteEnabled(!next);
            addToast(ToastType.Error, 'Falha ao alterar a configuração.');
        }
    };

    // ─── Aceitar convite → sobe direto no palco da MESMA sala ───
    const handleAcceptStageInvite = async () => {
        if (!stageInvite) return;
        setInviteResponding(true);
        try {
            const res = await api.voiceRoom.inviteCoHostRespond(
                stageInvite.roomId,
                currentUser.id,
                'accept',
                { name: currentUser.name, avatar: currentUser.avatarUrl || '', level: currentUser.level || 1 },
            );
            if (res?.success) {
                if (res.slots) {
                    setRoom(prev => prev ? { ...prev, slots: res.slots } : prev);
                }
                setIsMuted(false);
                addToast(ToastType.Success, t('voiceRoom.onStage'));
            } else {
                addToast(ToastType.Error, res?.error || 'Falha ao subir no palco.');
            }
        } catch {
            addToast(ToastType.Error, 'Falha ao subir no palco.');
        } finally {
            setInviteResponding(false);
            setStageInvite(null);
        }
    };

    // ─── Recusar convite ───
    const handleDeclineStageInvite = async () => {
        if (!stageInvite) return;
        setInviteResponding(true);
        try {
            await api.voiceRoom.inviteCoHostRespond(stageInvite.roomId, currentUser.id, 'decline');
        } catch {
            /* silencioso */
        } finally {
            setInviteResponding(false);
            setStageInvite(null);
        }
    };

    const topContributors = useMemo(() => onlineUsers.filter(u => (u.value || 0) > 0).slice(0, 3), [onlineUsers]);

    // ─── Loading / Not Found ───
    if (loading) {
        return (
            <div className="absolute inset-0 bg-[#0e0f13] z-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/60 text-sm">{t('voiceRoom.loading')}</p>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="absolute inset-0 bg-[#0e0f13] z-50 flex flex-col items-center justify-center gap-4">
                <p className="text-white/70">{t('voiceRoom.notFound')}</p>
                <button onClick={onClose} className="bg-cyan-600 px-6 py-2 rounded-full font-bold text-white">{t('common.back')}</button>
            </div>
        );
    }

    const hostSlot = room.slots.find(s => s.index === 0) || room.slots[0];
    const participantSlots = room.slots.filter(s => s.index >= 1 && s.index <= 6);
    const onStage = room.slots.filter(s => s.userId).length;

    const hostUser: User = {
        avatar: room.hostAvatar || AVATAR_FALLBACK(room.hostId),
        id: room.hostId,
        name: room.hostName,
        avatarUrl: room.hostAvatar || AVATAR_FALLBACK(room.hostId),
        identification: room.hostId,
        level: 1, diamonds: 0, fans: 0, following: 0,
        receptores: 0, enviados: 0, earnings: 0, earnings_withdrawn: 0,
        ownedFrames: [], isOnline: true, isVIP: false, isAvatarProtected: false,
    };

    const isFollowed = followingUsers.includes(room.hostId);

    return (
        <div className="absolute inset-0 bg-[#0e0f13] z-50 flex flex-col overflow-hidden">

            {/* ═══════════════════════════════════════════════════════════
             * 1. HEADER — IDÊNTICO AO STREAMROOM
             * ═══════════════════════════════════════════════════════════ */}
            <header className="p-4 flex flex-col gap-2 bg-transparent relative z-20 flex-shrink-0">
                <div className="flex justify-between items-start">
                    {/* Left side (User Info) */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-left shrink-0">
                            <div className="profile-gradient-ring rounded-full" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '2px' }}>
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0 flex items-center justify-center bg-black">
                                    <AvatarWithFrame user={hostUser} size="sm" />
                                </div>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-sm truncate max-w-[100px] text-white select-none">{room.hostName}</span>
                                    <LockIcon className="w-3 h-3 text-[#f2d7a2] flex-shrink-0 drop-shadow" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-300 font-medium">
                                    <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 7H7v2h6V7z"></path>
                                        <path clipRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" fillRule="evenodd"></path>
                                    </svg>
                                    <span>{Math.max(1, room.viewers || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        {/* 🚫 O dono NUNCA vê botão de seguir a si mesmo — só o
                            espectador vê (mesmo comportamento do StreamRoom). */}
                        {!isFollowed && !isHost && String(currentUser.id) !== String(room.hostId) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFollowStreamer(); }}
                                className="w-7 h-7 bg-gradient-to-br from-[#bd00ff] to-[#e7006e] rounded-full flex items-center justify-center text-white shrink-0 transition-all transform active:scale-90 cursor-pointer ml-1"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Right side (Controls) */}
                    <div className="flex items-center gap-3">
                        {/* 🏆 Top Contributors — avatares de rank (mesmo da live) */}
                        <div className="flex items-center gap-1 mr-1">
                            {topContributors.map((user, index) => (
                                <RankedAvatar
                                    key={user.id}
                                    user={user}
                                    rank={index + 1}
                                    onClick={onViewProfile}
                                />
                            ))}
                        </div>

                        {/* 🔔 Sininho — contagem de online (igual à live, abre OnlineUsersModal) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOnlineUsersOpen(true); }}
                            className="flex items-center bg-black/40 hover:bg-black/60 rounded-full px-2.5 py-1.5 space-x-1.5 text-sm cursor-pointer transition-all border border-white/[0.02] active:scale-95 focus:outline-none"
                        >
                            <BellIcon className="w-5 h-5 text-yellow-400" />
                            <span className="text-white font-bold select-none">{onlineCount}</span>
                        </button>
                        <button
                            onClick={handleLeave}
                            className="focus:outline-none cursor-pointer text-white hover:opacity-85 transition-opacity"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ═══════════ STATS — G Coin + Likes + @name (IDÊNTICO) ═══════════ */}
                <div className="flex justify-between items-center mt-1 px-1">
                    <div className="flex items-center gap-4 text-xs font-medium select-none">
                        {/* G Coin Button — abre o mesmo RankingModal da live */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsRankingOpen(true); }}
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer border-none bg-transparent"
                        >
                            <span className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-extrabold shadow-sm">G</span>
                            <span className="text-white font-medium">{coins.toLocaleString()}</span>
                        </button>
                        {/* Heart / Like Button */}
                        <button
                            onClick={handleLike}
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer border-none bg-transparent"
                        >
                            <svg
                                className={`w-3 h-3 transition-colors ${isLiked ? 'text-rose-500 fill-current' : 'text-white'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                            <span className="text-white font-medium">{likes >= 1000 ? (likes / 1000).toFixed(1) + 'K' : likes}</span>
                        </button>
                        <span className="text-white/80">Pública</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono select-none">
                        @{room.hostName}
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════
             * 2. CORPO — Palco de voz compacto estilo TikTok
             * Avatares menores e ancorados no topo/meio, liberando espaço
             * embaixo para o chat e a barra de mensagem.
             * ═══════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col items-center justify-start px-4 pt-3 pb-14 relative z-10 min-h-0 overflow-hidden">
                {/* Glow de fundo do palco */}
                <div className="absolute inset-0 vr-stage-glow pointer-events-none" />

                {/* Chave de status */}
                <div className="flex items-center gap-2 mb-2 z-10">
                    <span className="flex items-center gap-1 text-[8px] text-white/50 uppercase tracking-widest bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                        Ao vivo
                    </span>
                    <span className="text-[8px] text-white/40 font-mono max-w-[150px] truncate">{room.name}</span>
                </div>

                {/* Host */}
                <div className="flex flex-col items-center z-10">
                    <SlotAvatar
                        slot={hostSlot}
                        size="host"
                        isCurrentUser={hostSlot.userId === currentUser.id}
                    />
                    <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[8px] uppercase tracking-widest text-cyan-300 font-bold bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                            {t('voiceRoom.hostLabel')}
                        </span>
                    </div>
                </div>

                {/* Palco — slots de participantes */}
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 justify-items-center mt-3 z-10">
                    {participantSlots.map(slot => (
                        <SlotAvatar
                            key={slot.index}
                            slot={slot}
                            size="mic"
                            isCurrentUser={slot.userId === currentUser.id}
                            canTap={!slot.userId}
                            onSlotClick={!slot.userId ? () => handleTakeSlot(slot.index) : undefined}
                        />
                    ))}
                </div>

                <p className="text-[9px] text-white/35 mt-3 z-10">
                    {onStage}/{room.maxSlots + 1} no palco · {room.viewers || 0} ouvindo
                </p>
                <p className="text-[8px] text-white/25 mt-0.5 z-10">{t('voiceRoom.tapSlot')}</p>
            </div>

            {/* 🎁 Painel de animação de presente (independente — mesma da live) */}
            <GiftAnimationPanel ref={giftPanelRef} />

            {/* 🚪 Efeito de entrada (mp4 do pacote real, com o nome do usuário) */}
            {joinEffect && (
                <JoinEffectOverlay
                    userName={joinEffect.userName}
                    avatarUrl={joinEffect.avatarUrl}
                    entranceEffect={joinEffect.entranceEffect}
                    onEnd={() => setJoinEffect(null)}
                />
            )}

            {/* 📌 Presentes Fixados — canto inferior direito (só vivos enquanto a sala estiver aberta) */}
            {pinnedGifts.length > 0 && (
                <div className="absolute bottom-[148px] right-3 z-30 flex flex-col items-end gap-2 pointer-events-none select-none">
                    {pinnedGifts.map(({ gift, label }) => (
                        <div key={gift.id || gift.name} className="gift-pinned-rise flex flex-col items-center gap-1">
                            <div className="bg-black/55 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 shadow-xl flex flex-col items-center gap-1">
                                <p className="text-[10px] font-bold text-white truncate max-w-[90px]">{label || gift.name}</p>
                                <div className="w-14 h-14 flex items-center justify-center">
                                    {gift.component
                                        ? gift.component
                                        : (typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/')))
                                            ? <img src={gift.icon} alt={gift.name} className="w-12 h-12 object-cover rounded-xl" />
                                            : <span className="text-4xl">{gift.icon}</span>}
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#FC10B8] flex items-center justify-center shadow-lg">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 3l7 3v5c0 4.42-2.87 8.17-6 9.4V12l-1-4-1 4v8.4C7.87 19.17 5 15.42 5 11V6l9-3Z" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
             * 3. CHAT + COMPOSER — IDÊNTICO AO STREAMROOM (2 barras TikTok)
             * ═══════════════════════════════════════════════════════════ */}
            <div className="fixed left-0 right-0 bottom-0 w-full z-30 flex-shrink-0">
                <div className="absolute inset-x-0 bottom-0 top-[-10px] bg-gradient-to-t from-black/95 via-black/45 to-transparent -z-10 pointer-events-none" />

                {/* Chat messages */}
                <div ref={chatScrollRef} onScroll={handleChatScroll} className="max-h-[36vh] overflow-y-auto no-scrollbar overscroll-contain flex flex-col justify-end pointer-events-auto px-1.5 relative z-10" style={{ maxHeight: '36lvh' }}>
                    <div className="flex flex-col gap-px items-start w-full">
                        {messages.length === 0 && (
                            <p className="text-white/25 text-xs text-center w-full py-6">{t('voiceRoom.noMessages')}</p>
                        )}
                        {messages.map((msg, index) => {
                            // 🪧 Plaquinha do host — item de mensagem comum: nasce no fim,
                            // sobe quando chegam mensagens novas (nunca fixa no topo/meio).
                            if (msg.hostNotice) {
                                return <HostNoticePlaque key={`plaque-${msg.id}`} notice={msg.hostNotice} />;
                            }
                            if (msg.type === 'entry' && msg.fullUser) {
                                const entryProps: any = {
                                    user: msg.fullUser,
                                    currentUser: currentUser,
                                    onClick: onViewProfile,
                                    onFollow: (u: User) => onFollowUserRef.current(u, roomId),
                                    isFollowed: followingUsers.includes(msg.fullUser.id),
                                    isBroadcaster: isHost,
                                    isModerator: false,
                                    timestamp: msg.timestamp,
                                };
                                return <EntryChatMessage key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`} {...entryProps} />;
                            }
                            if (msg.type === 'chat' && msg.user && (msg.avatar || msg.user === 'Sistema')) {
                                const chatUser = constructUserFromMessage(msg);
                                const shouldShowFollow = !isHost && chatUser.id !== currentUser.id && chatUser.id !== room.hostId;
                                return <ChatMessage
                                    key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`}
                                    userObject={chatUser}
                                    message={msg.message}
                                    avatarUrl={msg.avatar || chatUser.avatarUrl}
                                    onAvatarClick={msg.isGift ? () => setIsGiftOpen(true) : () => handleViewChatUserProfile(msg)}
                                    onFollow={shouldShowFollow ? () => handleFollowChatUser(chatUser) : undefined}
                                    isFollowed={followingUsers.includes(chatUser.id)}
                                    onModerationClick={(isHost || isCurrentUserModerator) && isModerationMode && msg.user !== currentUser.name && msg.user !== room.hostName ? () => handleOpenUserActions(msg) : undefined}
                                    isModerator={msg.isModerator || moderatorIds.includes(chatUser.id)}
                                    timestamp={msg.timestamp}
                                />;
                            }
                            return null;
                        })}
                    </div>
                </div>
                {/* Espaçador FORA da área rolável: reserva o espaço fixo da
                    barra no fundo, sem esconder as mensagens. */}
                <div style={{ height: `calc(${MESSAGE_BAR_HEIGHT}px + ${keyboardBottom}px + env(safe-area-inset-bottom, 0px))` }} />

{/* ═══ BARRA PRINCIPAL FIXA (gatilho) ═══
                Fica parada em bottom:0 — não sobe, não mexe. O input é
                SOMENTE-LEITURA: ao tocar, abre o teclado e SURGE a barra de
                digitação flutuante por cima do teclado. */}
                <footer
                    ref={triggerBarRef as any}
                    className="fixed left-0 right-0 z-30 p-3 pointer-events-auto"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center gap-3" data-purpose="bottom-controls">
                        <div className="flex-grow">
                            <input
                                readOnly
                                type="text"
                                placeholder={t('streamRoom.sayHi')}
                                value={chatInput}
                                autoComplete="off"
                                onFocus={() => { if (!isComposerOpen) openComposer(); }}
                                onClick={() => { if (!isComposerOpen) openComposer(); }}
                                // font 16px: impede o zoom automático do iOS ao focar
                                className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-base text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Gift */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsGiftOpen(true); }}
                                className="text-yellow-400 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                            >
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3"
                                    alt="Gift Icon"
                                    className="w-9 h-9 object-cover rounded-full shadow-lg"
                                />
                            </button>
                            {/* Roleta */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsRouletteOpen(v => !v); }}
                                className="bg-black/40 hover:bg-black/65 w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 border-none focus:outline-none cursor-pointer"
                                title="Roleta"
                            >
                                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" />
                                    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                                    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
                                </svg>
                            </button>
                            {/* More / Tools — mesmo modal de ferramentas da live */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsToolsOpen(true); }}
                                className="bg-black/40 hover:bg-black/65 w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 border-none focus:outline-none cursor-pointer"
                                title="Ferramentas"
                            >
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="5" cy="12" r="2"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                    <circle cx="19" cy="12" r="2"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                </footer>

                {/* ═══ BARRA DE DIGITAÇÃO FLUTUANTE (por cima do teclado) ═══
                    Surge APENAS quando o teclado abre, posicionada com
                    bottom = altura do teclado (keyboardBottom) + safe-area.
                    É NELA que a pessoa escreve; a barra principal fica fixa
                    embaixo, sem subir nem mexer. */}
                {isComposerOpen && (
                    <footer
                        ref={composerRef}
                        className="fixed left-0 right-0 z-50 px-3 pb-2 pointer-events-auto"
                        style={{ bottom: 0, transform: `translateY(-${keyboardBottom}px)`, transition: 'transform 0ms' }}
                    >
                        <div className="rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md shadow-2xl p-2">
                            <div className="flex items-center gap-3">
                                <div className="flex-grow">
                                    <input
                                        ref={composerInputRef}
                                        type="text"
                                        placeholder={t('streamRoom.sayHi')}
                                        value={chatInput}
                                        enterKeyHint="send"
                                        autoComplete="off"
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onFocus={() => { if (!isComposerOpen) openComposer(); }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                if (composerRef.current && !composerRef.current.contains(document.activeElement)) {
                                                    closeComposer();
                                                }
                                            }, 150);
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(e); } }}
                                        maxLength={156}
                                        // font 16px: impede o zoom automático do iOS ao focar
                                        className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-base text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                                    />
                                </div>
                                {/* Send */}
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => { sendMessage(e); }}
                                    className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                                >
                                    <SendIcon className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </footer>
                )}
            </div>

            {/* ═══════════ FOOTER VOZ — Microfone (só quando está no palco) ═══════════ */}
            {canSpeak && mySlot && (
                <div className="absolute bottom-[84px] left-0 right-0 z-[35] flex justify-center gap-6">
                    <button onClick={handleToggleMute} className="flex flex-col items-center gap-0.5 text-white/80 active:scale-95">
                        <div className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-500/25' : 'bg-cyan-500/25'} border ${isMuted ? 'border-red-400/40' : 'border-cyan-400/40'} flex items-center justify-center backdrop-blur-md shadow-lg`}>
                            {isMuted ? (
                                <MicrophoneOffIcon className="w-5 h-5 text-red-400" />
                            ) : (
                                <span className="flex items-end justify-center vr-eq">
                                    <span /><span /><span />
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] text-white/50">{isMuted ? 'Mudo' : 'Falando'}</span>
                    </button>
                    {mySlot.index > 0 && (
                        <button onClick={handleReleaseSlot} className="flex flex-col items-center gap-0.5 text-white/80 active:scale-95">
                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-md shadow-lg">
                                <span className="text-white/80 text-sm font-bold">↓</span>
                            </div>
                            <span className="text-[9px] text-white/50">Descer</span>
                        </button>
                    )}
                </div>
            )}

            {/* ═══════════ MODALS ═══════════ */}
            {isGiftOpen && room && (
                <GiftModal
                    isOpen={isGiftOpen}
                    onClose={() => setIsGiftOpen(false)}
                    userDiamonds={currentUser.diamonds ?? 0}
                    onSendGift={handleSendGift}
                    onRecharge={handleRecharge}
                    gifts={gifts}
                    receivedGifts={receivedGifts}
                    isBroadcaster={isHost}
                    onOpenVIPCenter={onOpenVIPCenter}
                    isVIP={currentUser.isVIP || false}
                    currentUser={currentUser}
                />
            )}

            {/* 🏆 Ranking de contribuição — MESMO modal da live (abre no G) */}
            {isRankingOpen && (
                <ContributionRankingModal
                    onClose={() => setIsRankingOpen(false)}
                    liveRanking={liveRanking}
                    currentUser={currentUser}
                />
            )}

            {/* 🔔 Usuários online — MESMO modal da live (abre no sininho) */}
            {isOnlineUsersOpen && (
                <OnlineUsersModal
                    onClose={() => setIsOnlineUsersOpen(false)}
                    streamId={roomId}
                    userId={currentUser.id}
                    currentUser={currentUser}
                    moderatorIds={moderatorIds}
                    onSelectUser={(selectedUser: any) => {
                        setIsOnlineUsersOpen(false);
                        if ((isHost || isCurrentUserModerator) && selectedUser?.id && selectedUser.id !== currentUser.id) {
                            setUserActionModalState({ isOpen: true, user: selectedUser });
                        } else {
                            onViewProfile(selectedUser);
                        }
                    }}
                />
            )}

            {/* 🎡 Roleta — widget fixo na tela (mesmo da live).
                ownerId SEMPRE o ID REAL do HOST (hostId) — itens e custo da roleta
                ficam salvos no User do host. */}
            <RouletteModal
                isOpen={isRouletteOpen}
                onClose={() => setIsRouletteOpen(false)}
                currentUser={currentUser}
                updateUser={updateUser}
                addToast={addToast}
                onOpenWallet={handleRecharge}
                ownerId={room.hostId}
                streamId={room.roomId}
                canEdit={isHost}
            />

            {/* 💰 Recarga in-room — MESMA da live (Wallet + ConfirmPurchase + Cadastral) */}
            {isWalletOpen && (
                <WalletScreen
                    onClose={() => setIsWalletOpen(false)}
                    onPurchase={handlePurchaseDiamonds}
                    initialTab="Diamante"
                    isBroadcaster={isHost}
                    currentUser={currentUser}
                    updateUser={updateUser}
                    addToast={addToast}
                    purchaseHistory={[]}
                />
            )}
            {selectedPackage && (
                <ConfirmPurchaseScreen
                    onClose={() => setSelectedPackage(null)}
                    packageDetails={selectedPackage}
                    onConfirmPurchase={handleConfirmPurchase}
                    addToast={addToast}
                    currentUser={currentUser}
                />
            )}
            {stripeCheckout && (
                <StripeCheckoutOverlay
                    clientSecret={stripeCheckout.clientSecret}
                    publishableKey={stripeCheckout.publishableKey}
                    orderId={stripeCheckout.orderId}
                    openUrl={stripeCheckout.openUrl}
                    onPaid={() => {
                        setStripeCheckout(null);
                        addToast(ToastType.Success, 'Pagamento aprovado! Seus diamantes serão creditados em instantes.');
                        window.dispatchEvent(new CustomEvent('livego:refresh_wallet'));
                    }}
                    onClose={() => setStripeCheckout(null)}
                    addToast={addToast}
                />
            )}
            {isCadastralScreenOpen && pendingPurchase && (
                <CadastralDataScreen
                    onClose={() => { setIsCadastralScreenOpen(false); setPendingPurchase(null); }}
                    onSaved={() => {
                        setIsCadastralScreenOpen(false);
                        if (pendingPurchase) {
                            const pkg = pendingPurchase;
                            setPendingPurchase(null);
                            setSelectedPackage(pkg);
                            setIsWalletOpen(false);
                        }
                    }}
                    currentUser={currentUser}
                    updateUser={updateUser}
                    addToast={addToast}
                />
            )}

            {/* ⚙️ Ferramentas — o MESMO modal da sala de transmissão (três pontinhos) */}
            <ToolsModal
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                onOpenCoHostModal={() => setIsCoHostModalOpen(true)}
                onOpenPrivateInviteModal={(e) => { e?.stopPropagation(); onOpenPrivateInviteModal(); }}
                isHost={isHost}
                isPrivateStream={false}
                isMicrophoneMuted={isMuted}
                onToggleMicrophone={(e) => { e?.stopPropagation(); handleToggleMute(); }}
                isSoundMuted={isSoundMuted}
                onToggleSound={(e) => { e?.stopPropagation(); setIsSoundMuted(m => !m); }}
                onOpenPrivateChat={(e) => { e?.stopPropagation(); onOpenPrivateChat(); }}
                onOpenBeautyPanel={(e) => { e?.stopPropagation(); addToast(ToastType.Info, 'Filtro de beleza indisponível na sala de voz'); }}
                onOpenClarityPanel={(e) => { e?.stopPropagation(); addToast(ToastType.Info, 'Resolução indisponível na sala de voz'); }}
                onOpenVideoCall={(e) => { e?.stopPropagation(); addToast(ToastType.Info, 'Chamada de vídeo indisponível na sala de voz'); }}
                isAutoFollowEnabled={isAutoFollowEnabled}
                onToggleAutoFollow={(e) => { e?.stopPropagation(); handleToggleAutoFollow(); }}
                isAutoPrivateInviteEnabled={isAutoPrivateInviteEnabled}
                onToggleAutoPrivateInvite={(e) => { e?.stopPropagation(); handleToggleAutoPrivateInvite(); }}
                isModerationActive={isModerationMode}
                onToggleModeration={(e) => { e?.stopPropagation(); setIsModerationMode(m => !m); }}
                onRequestParticipation={(e) => { e?.stopPropagation(); addToast(ToastType.Info, 'Participação por vídeo indisponível na sala de voz'); }}
                addToast={addToast}
                gifts={gifts}
                pinnedGifts={pinnedGifts}
                onSavePinnedGifts={(entries) => setPinnedGifts(entries)}
            />

            {/* 🤝 Co-host — MESMO modal da live, adaptado para sala de voz */}
            {isCoHostModalOpen && (
                <CoHostModal
                    isOpen={isCoHostModalOpen}
                    onClose={() => setIsCoHostModalOpen(false)}
                    onInvite={handleCoHostInvite}
                    onOpenTimerSettings={() => {}}
                    currentUser={currentUser}
                    addToast={addToast}
                    streamId={room.roomId}
                    mode="cohost"
                />
            )}

            {/* 🛠 Ações do usuário (ver perfil / tornar moderador / expulsar) */}
            <UserActionModal
                isOpen={userActionModalState.isOpen}
                onClose={handleCloseUserActions}
                user={userActionModalState.user}
                currentUser={currentUser}
                streamer={hostUser}
                canModerate={isHost || isCurrentUserModerator}
                canManageModerators={isHost}
                onViewProfile={(user) => { handleCloseUserActions(); onViewProfile(user); }}
                onMention={handleMentionUser}
                onMakeModerator={handleMakeModerator}
                onKick={handleKickUser}
                onMute={handleMuteUser}
                isAlreadyModerator={userActionModalState.user ? moderatorIds.includes(userActionModalState.user.id) : false}
                isMuted={userActionModalState.user ? mutedIds.includes(userActionModalState.user.id) : false}
            />

            {/* 🤝 Convite para subir no palco (dentro da própria sala) */}
            {stageInvite && !canSpeak && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
                    <div className="w-full max-w-sm bg-[#181a24] rounded-2xl border border-white/10 p-5 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px]">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-[#0e0f13] flex items-center justify-center border-2 border-[#181a24]">
                                        {stageInvite.inviterAvatar ? (
                                            <img
                                                src={stageInvite.inviterAvatar}
                                                alt={stageInvite.inviterName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <UserPlusIcon className="w-8 h-8 text-cyan-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-white text-sm font-bold leading-snug">
                                {stageInvite.inviterName} te convidou
                            </h3>
                            <p className="text-white/50 text-xs mt-1">
                                para subir no palco da sala de voz
                            </p>
                            <span className="text-[10px] text-cyan-300/70 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2 py-0.5 mt-2">
                                {stageInvite.roomName}
                            </span>

                            <div className="flex items-center gap-3 w-full mt-5">
                                <button
                                    onClick={handleDeclineStageInvite}
                                    disabled={inviteResponding}
                                    className="flex-1 py-2.5 rounded-full bg-white/[0.06] text-white/80 text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    Recusar
                                </button>
                                <button
                                    onClick={handleAcceptStageInvite}
                                    disabled={inviteResponding}
                                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    {inviteResponding ? (
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckIcon className="w-4 h-4" />
                                            Aceitar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceRoom;