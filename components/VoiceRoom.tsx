import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    CloseIcon, MessageIcon, GiftIcon, MicrophoneIcon, MicrophoneOffIcon,
    ViewerIcon, GoldCoinWithGIcon, PlusIcon, SendIcon, BellIcon, LockIcon,
    MoreIcon, CheckIcon, UserPlusIcon
} from './icons';
import { VoiceRoom as VoiceRoomType, VoiceSlot, User, ToastType, Gift as GiftType } from '../types';
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
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { VoiceSfuService } from '../services/VoiceSfuService';
import ChatMessage from './live/ChatMessage';
import EntryChatMessage from './live/EntryChatMessage';

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
}

const AVATAR_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">' +
    '<rect width="150" height="150" fill="#374151"/>' +
    '<circle cx="75" cy="62" r="26" fill="#9ca3af"/>' +
    '<path d="M22 138c3-30 30-42 53-42s50 12 53 42" fill="#9ca3af"/>' +
    '</svg>'
);
const AVATAR_FALLBACK = (_seed: string) => AVATAR_PLACEHOLDER_SVG;

/* ══════════════════════════════════════════════════════════════════════
 * ChatMessageType — MESMO formato da sala de transmissão (StreamRoom).
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
    const audioServiceRef = useRef<VoiceSfuService | null>(null);
    const { fixedBottom: keyboardFixedBottom } = useKeyboardInset();

    // ─── Convite para subir no palco (dentro da própria sala) ───
    const [stageInvite, setStageInvite] = useState<{
        roomId: string;
        roomName: string;
        inviterId: string;
        inviterName: string;
        inviterAvatar: string;
    } | null>(null);
    const [inviteResponding, setInviteResponding] = useState(false);

    const isHost = room?.hostId === currentUser.id;
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
            }
        } catch {
            addToast(ToastType.Error, t('voiceRoom.loadError'));
        } finally {
            setLoading(false);
        }
    }, [roomId, addToast, t]);

    useEffect(() => { loadRoom(); }, [loadRoom]);

    // ─── Socket events: slots, speaking, mute, ended, gift, viewer count ───
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
        // Presentes
        const offGiftA = onSocketEvent('live_gift_received', (data: any) => {
            if (!data) return;
            const giftName = data.gift?.name || data.giftName || data.name || 'Presente';
            const fromName = data.fromUser?.name || data.from?.name || data.userName || 'Alguém';
            const quantity = data.quantity || 1;
            const giftPrice = data.gift?.price || data.price || 0;
            setCoins(prev => prev + giftPrice * quantity);
            setMessages(prev => [...prev, {
                id: data.eventId || String(Date.now() + Math.random()),
                type: 'chat' as const,
                user: 'Sistema',
                isGift: true,
                level: data.fromUser?.level || 1,
                avatar: data.fromUser?.avatarUrl || AVATAR_FALLBACK(data.fromUser?.id || ''),
                message: (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-extrabold text-[#c084fc] text-[10px]">{fromName}</span>
                        <span className="text-purple-200 text-[10px]">enviou {quantity}x {giftName}!</span>
                    </span>
                ),
                timestamp: Date.now(),
            }].slice(-50));
        });
        const offGiftB = onSocketEvent('gift_received', (data: any) => {
            if (!data) return;
            const giftName = data.gift?.name || data.giftName || 'Presente';
            const fromName = data.from?.name || data.fromUser?.name || data.userName || 'Alguém';
            const quantity = data.quantity || 1;
            const giftPrice = data.gift?.price || data.price || 0;
            setCoins(prev => prev + giftPrice * quantity);
            setMessages(prev => [...prev, {
                id: String(Date.now() + Math.random()),
                type: 'chat' as const,
                user: 'Sistema',
                isGift: true,
                avatar: data.from?.avatarUrl || AVATAR_FALLBACK(data.from?.id || ''),
                message: (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-extrabold text-[#c084fc] text-[10px]">{fromName}</span>
                        <span className="text-purple-200 text-[10px]">enviou {quantity}x {giftName}!</span>
                    </span>
                ),
                timestamp: Date.now(),
            }].slice(-50));
        });
        // Chat
        const offLive = onSocketEvent('live_message', (data: any) => {
            if (!data || !data.text) return;
            setMessages(prev => [...prev, {
                id: data.id || String(Date.now() + Math.random()),
                type: 'chat' as const,
                user: data.userName || data.userId || 'Usuário',
                userId: data.userId,
                avatar: data.avatarUrl || '',
                level: data.level || 1,
                message: data.text,
                timestamp: new Date(data.timestamp || Date.now()).toISOString(),
            }].slice(-50));
        });
        const offBlocked = onSocketEvent('live_message_blocked', (data: any) => {
            addToast(ToastType.Error, data?.reason || 'Você foi proibido de falar');
        });
        return () => {
            offSlot(); offSpeaking(); offMute(); offEnded(); offViewerCount();
            offCoins(); offGiftA(); offGiftB(); offLive(); offBlocked();
            offStageInvite();
        };
    }, [roomId, addToast, onClose, t, room?.name]);

    useEffect(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [messages]);

    // ─── Enviar mensagem ───
    const sendMessage = async () => {
        const text = chatInput.trim();
        if (!text) return;
        try {
            const s = await connectSocket();
            s?.emit('send_live_message', { streamId: roomId, userId: currentUser.id, text });
            setChatInput('');
        } catch {
            addToast(ToastType.Error, 'Erro ao enviar mensagem.');
        }
    };

    // ─── Entrada do usuário atual na sala — MESMO comportamento da live ───
    useEffect(() => {
        const entryMessage: VoiceChatMessage = {
            id: String(Date.now()),
            type: 'entry',
            fullUser: currentUser,
            timestamp: Date.now(),
        };
        setMessages(prev => [entryMessage, ...prev]);
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

    // ─── Enviar presente ───
    const handleSendGift = async (gift: GiftType, quantity: number) => {
        if (!room) return;
        try {
            const totalCost = (gift.price || 0) * quantity;
            if ((currentUser.diamonds || 0) < totalCost) {
                addToast(ToastType.Error, t('vip.store.notEnoughDiamonds'));
                onOpenWallet?.('Diamante');
                return;
            }
            const { success, error, updatedSender } = await api.sendGift(
                currentUser.id, room.hostId, roomId, gift.name, quantity,
            );
            if (success && updatedSender) updateUser(updatedSender);
            else if (error) addToast(ToastType.Error, error);
            setIsGiftOpen(false);
            refreshRanking();
        } catch {
            addToast(ToastType.Error, 'Erro ao enviar presente.');
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
                    </div>

                    {/* Right side (Controls) */}
                    <div className="flex items-center gap-2">
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

            {/* ═══════════════════════════════════════════════════════════
             * 3. CHAT — IDÊNTICO AO STREAMROOM
             * ═══════════════════════════════════════════════════════════ */}
            <div className="fixed left-0 right-0 bottom-0 w-full z-30 flex-shrink-0" style={{ bottom: keyboardFixedBottom > 0 ? `${keyboardFixedBottom}px` : undefined }}>
                <div className="absolute inset-x-0 bottom-0 top-[-10px] bg-gradient-to-t from-black/95 via-black/45 to-transparent -z-10 pointer-events-none" />

                {/* Chat messages */}
                <div ref={chatScrollRef} className="max-h-[18vh] overflow-y-auto no-scrollbar overscroll-contain flex flex-col justify-end px-1.5 relative z-10">
                    <div className="flex flex-col gap-px items-start w-full">
                        {messages.length === 0 && (
                            <p className="text-white/25 text-xs text-center w-full py-6">{t('voiceRoom.noMessages')}</p>
                        )}
                        {messages.map((msg, index) => {
                            if (msg.type === 'entry' && msg.fullUser) {
                                return <EntryChatMessage
                                    key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`}
                                    user={msg.fullUser}
                                    currentUser={currentUser}
                                    onClick={() => {}}
                                    onFollow={() => {}}
                                    isFollowed={false}
                                    isBroadcaster={isHost}
                                    isModerator={false}
                                    timestamp={msg.timestamp}
                                />;
                            }
                            if (msg.type === 'chat' && msg.user && (msg.avatar || msg.user === 'Sistema')) {
                                const chatUser = constructUserFromMessage(msg);
                                return <ChatMessage
                                    key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`}
                                    userObject={chatUser}
                                    message={msg.message}
                                    avatarUrl={msg.avatar || chatUser.avatarUrl}
                                    onAvatarClick={msg.isGift ? () => setIsGiftOpen(true) : () => {}}
                                    isFollowed={false}
                                    isModerator={msg.isModerator || false}
                                    timestamp={msg.timestamp}
                                />;
                            }
                            return null;
                        })}
                    </div>
                    <div style={{ height: '72px' }} />
                </div>

                {/* ═══════════ BARRA INFERIOR — IDÊNTICA AO STREAMROOM ═══════════ */}
                <footer className="fixed left-0 right-0 z-30 p-3" style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <div className="flex items-center gap-3" data-purpose="bottom-controls">
                        <div className="flex-grow">
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                                placeholder={t('streamRoom.sayHi')}
                                className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-sm text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all cursor-pointer select-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Send */}
                            <button
                                onClick={sendMessage}
                                className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                            >
                                <SendIcon className="w-5 h-5 text-white" />
                            </button>
                            {/* Gift */}
                            <button
                                onClick={() => setIsGiftOpen(true)}
                                className="text-yellow-400 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                            >
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3"
                                    alt="Gift Icon"
                                    className="w-9 h-9 object-cover rounded-full shadow-lg"
                                />
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
                    onRecharge={() => onOpenWallet?.('Diamante')}
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
                    onSelectUser={() => setIsOnlineUsersOpen(false)}
                />
            )}

            {/* ⚙️ Ferramentas — o MESMO modal da sala de transmissão (três pontinhos) */}
            <ToolsModal
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                onOpenCoHostModal={() => setIsCoHostModalOpen(true)}
                onOpenPrivateInviteModal={() => {}}
                isHost={isHost}
                isPrivateStream={false}
                isMicrophoneMuted={isMuted}
                onToggleMicrophone={(e) => { e?.stopPropagation(); handleToggleMute(); }}
                isSoundMuted={isSoundMuted}
                onToggleSound={(e) => { e?.stopPropagation(); setIsSoundMuted(m => !m); }}
                onOpenPrivateChat={(e) => { e?.stopPropagation(); addToast(ToastType.Info, 'Chat privado indisponível na sala de voz'); }}
                onOpenVideoCall={() => {}}
                isAutoFollowEnabled={false}
                onToggleAutoFollow={() => {}}
                isAutoPrivateInviteEnabled={false}
                onToggleAutoPrivateInvite={() => {}}
                addToast={addToast}
                gifts={gifts}
                onSavePinnedGifts={() => {}}
                isModerationActive={false}
                onToggleModeration={() => {}}
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
