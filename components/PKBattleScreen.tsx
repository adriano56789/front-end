
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStreamChat } from '../hooks/useStreamChat';
import { useComposerKeyboard, MESSAGE_BAR_HEIGHT, COMPOSER_BAR_HEIGHT } from '../hooks/useComposerKeyboard';
import OnlineUsersModal from './live/OnlineUsersModal';
import ChatMessage from './live/ChatMessage';
import CoHostModal from './CoHostModal';
import EntryChatMessage from './live/EntryChatMessage';
import ToolsModal from './ToolsModal';
const ToolsModalAny: any = ToolsModal;
import ConnectionQualityIndicator from './live/ConnectionQualityIndicator';
import { GiftIcon, MessageIcon, SendIcon, MoreIcon, CloseIcon, PlusIcon, ViewerIcon, StarIcon, HeartIcon, GoldCoinWithGIcon, BellIcon } from './icons';
import { Streamer, User, Gift, RankedUser, LiveSessionState, ToastType } from '../types';
import ContributionRankingModal from './ContributionRankingModal';
import GiftModal from './live/GiftModal';
import GiftAnimationOverlay, { GiftPayload } from './live/GiftAnimationOverlay';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { getAnimationUrl, getAnimationDuration } from '../services/GiftAnimationUrls';
import { LoadingSpinner } from './Loading';
import UserActionModal from './UserActionModal';
import FriendRequestNotification from './live/FriendRequestNotification';
import { RankedAvatar } from './live/RankedAvatar';
import FullScreenGiftAnimation from './live/FullScreenGiftAnimation';
import GiftQueueManager from './live/GiftQueueManager';
import LivePlayer from './LivePlayer';
import BeautyEffectsPanel from './live/BeautyEffectsPanel';
import RouletteModal from './RouletteModal';
const RouletteModalAny: any = RouletteModal;

interface ChatMessageType {
    id: number | string;
    type: 'chat' | 'entry' | 'friend_request' | 'follow';
    user?: string;
    fullUser?: User;
    follower?: User;
    age?: number;
    gender?: 'male' | 'female' | 'not_specified';
    level?: number;
    message?: string | React.ReactNode;
    avatar?: string;
    followedUser?: string;
    isModerator?: boolean;
    isGift?: boolean;
    activeFrameId?: string | null;
    frameExpiration?: string | null;
    timestamp?: string | number;
}

interface PKBattleScreenProps {
    streamer: Streamer;
    opponent: User;
    onEndPKBattle: () => void;
    onRequestEndStream: () => void;
    onLeaveStreamView: () => void;
    onViewProfile: (user: User) => void;
    currentUser: User;
    onFollowUser: (user: User, streamId?: string) => void;
    onOpenPrivateChat: () => void;
    onOpenPrivateInviteModal: () => void;
    setActiveScreen: (screen: 'main' | 'profile' | 'messages' | 'video') => void;
    onStartChatWithStreamer: (user: User) => void;
    onOpenPKTimerSettings: () => void;
    onOpenFans: (user: User) => void;
    onOpenFriendRequests: () => void;
    gifts: Gift[];
    receivedGifts: (Gift & { count: number })[];
    liveSession: LiveSessionState | null;
    updateLiveSession: (updates: Partial<LiveSessionState>) => void;
    logLiveEvent: (type: string, data: any) => void;
    updateUser: (user: User) => void;
    onStreamUpdate: (updates: Partial<Streamer>) => void;
    refreshStreamRoomData: (streamerId: string) => void;
    addToast: (type: ToastType, message: string) => void;
    rankingData: Record<string, RankedUser[]>;
    followingUsers: User[];
    pkBattleDuration: number;
    streamers: Streamer[];
    onSelectStream: (streamer: Streamer) => void;
    onOpenVIPCenter: () => void;
}

interface Heart {
  id: number;
  x: number;
  y: number;
  side: 'mine' | 'opponent';
}

const FollowChatMessage: React.FC<{ follower: string; followed: string }> = ({ follower, followed }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-purple-500/30 rounded-[14px] p-1 px-2.5 flex items-center self-start text-[10px]">
            <span className="text-purple-300 font-bold text-[10px]">{follower}</span>
            <span className="text-gray-200 ml-1.5 text-[10px]">{t('streamRoom.followed')}</span>
            <span className="text-purple-300 font-bold ml-1.5 text-[10px]">{followed}! 🎉</span>
        </div>
    );
};

export default function PKBattleScreen({ 
    streamer, opponent, onEndPKBattle, onRequestEndStream, onLeaveStreamView, onViewProfile, currentUser,
    onFollowUser, onOpenPrivateChat, onOpenPrivateInviteModal, onStartChatWithStreamer,
    onOpenPKTimerSettings, onOpenFans, onOpenFriendRequests, gifts, receivedGifts, liveSession,
    updateLiveSession, logLiveEvent, updateUser, onStreamUpdate, refreshStreamRoomData, addToast,
    followingUsers, pkBattleDuration, onOpenVIPCenter
}: PKBattleScreenProps) {
    const { t } = useTranslation();
    
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [isRouletteOpen, setIsRouletteOpen] = useState(false);
    const [isRouletteMinimized, setIsRouletteMinimized] = useState(false);
    const timeLeftRef = useRef(pkBattleDuration * 60);
    const [timeLeft, setTimeLeft] = useState(pkBattleDuration * 60);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLButtonElement>(null);
    const {
        isComposerOpen,
        openComposer,
        closeComposer,
        composerInputRef,
        composerRef,
        keyboardInset,
        bottom: chatBarBottom,
    } = useComposerKeyboard();
    
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [myHearts, setMyHearts] = useState(0);
    const [opponentHearts, setOpponentHearts] = useState(0);
    const [hearts, setHearts] = useState<Heart[]>([]);
    const nextGiftId = useRef(0);

    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isBeautyPanelOpen, setBeautyPanelOpen] = useState(false);
    const [isCoHostModalOpen, setIsCoHostModalOpen] = useState(false);
    const [coHostModalMode, setCoHostModalMode] = useState<'cohost' | 'battle'>('cohost');
    const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isResolutionPanelOpen, setResolutionPanelOpen] = useState(false);
    const [isGiftModalOpen, setGiftModalOpen] = useState(false);
    const [userActionModalState, setUserActionModalState] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [isModerationMode, setIsModerationMode] = useState(false);
    const [isAutoPrivateInviteEnabled, setIsAutoPrivateInviteEnabled] = useState(liveSession?.isAutoPrivateInviteEnabled ?? false);
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const previousOnlineUsersRef = useRef<(User & { value: number })[]>([]);

    const [effectsQueue, setEffectsQueue] = useState<GiftPayload[]>([]);
    const [currentEffect, setCurrentEffect] = useState<GiftPayload | null>(null);
    const [bannerGifts, setBannerGifts] = useState<(GiftPayload & { id: number })[]>([]);

    const [isSendingGift, setIsSendingGift] = useState(false);
    const [isLocalMuted, setIsLocalMuted] = useState(false);

    const isBroadcaster = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);

    const lkConnectedRef = useRef(false);

    const {
        connected: lkConnected,
        connectionQualities: lkConnectionQualities,
        sendMessage: lkSendMessage,
        disconnect: disconnectLkChat,
        setMetadata: lkChatSetMetadata,
        inviteCoHost: lkInviteCoHost,
        invitePK: lkInvitePK,
        sendReaction: lkSendReaction,
        sendTyping: lkSendTyping,
        setParticipantRole: lkSetRole,
    } = useStreamChat({
        streamId: streamer.id,
        userId: currentUser.id,
        userName: currentUser.name,
        isHost: isBroadcaster,
        disabled: false,
        onMessage: (data: any) => {
            if (!data || !data.type) return;
            if (data.type === 'chat_message' || data.type === 'chat') {
                const stableId = Date.now() + Math.random();
                setMessages(prev => [...prev, { ...data, type: 'chat', id: stableId }]);
            }
            else if (data.type === 'live_entry') {
                if (data.fullUser && String(data.fullUser.id) === String(currentUser.id)) return;
                const stableId = Date.now() + Math.random();
                setMessages(prev => {
                    if (prev.some(m => m.type === 'entry' && m.fullUser && String(m.fullUser.id) === String(data.fullUser?.id || data.userId))) return prev;
                    return [...prev, {
                        id: stableId,
                        type: 'entry',
                        user: data.userName || data.user?.name,
                        fullUser: data.fullUser || null,
                    }];
                });
            }
            else if (data.type === 'live_gift_received' || data.type === 'gift_received') {
                // 🔁 Echo do MEU próprio presente: o caminho otimista
                // (handleSendGift) já exibiu animação + mensagem no chat.
                // Sem este filtro, a animação tocava 2x e a mensagem duplicava.
                const senderIsMe = String(data.from?.id || data.fromUser?.id || '') === String(currentUser?.id || '');
                if (senderIsMe) return;
                const rawGift = data.gift || { name: data.giftName, price: 0, icon: '🎁', category: 'Popular' };
                const animationUrl = getAnimationUrl(rawGift);
                const duration = getAnimationDuration(rawGift);
                const giftEvtPayload: any = {
                    fromUser: {
                        id: data.from?.id || data.fromUser?.id,
                        identification: data.from?.identification || data.fromUser?.identification || data.from?.id,
                        name: data.from?.name || data.fromUser?.name || 'Usuário',
                        avatarUrl: data.from?.avatarUrl || data.fromUser?.avatarUrl || '',
                        level: data.from?.level || data.fromUser?.level || 1,
                        fans: 0, following: 0, receptores: 0, enviados: 0,
                        diamonds: 0, earnings: 0, earnings_withdrawn: 0, ownedFrames: [],
                    },
                    toUser: { id: data.toUser?.id, name: data.toUser?.name || 'Streamer' },
                    gift: { ...rawGift, ...(animationUrl ? { animationUrl } : {}), ...(duration ? { duration } : {}) },
                    quantity: data.quantity || 1,
                    roomId: streamer.id,
                    id: String(data.id || Date.now() + Math.random()),
                };
                setEffectsQueue(prev => [...prev, giftEvtPayload]);
                postGiftChatMessage(giftEvtPayload);
            }
            else if (data.type === 'pk_state_sync') {
                setOpponentScore(prev => Math.max(prev, data.opponentScore || 0));
                if (data.timeLeft !== undefined && Math.abs(data.timeLeft - timeLeftRef.current) > 5) {
                    setTimeLeft(data.timeLeft);
                }
                if (data.opponentHearts !== undefined) {
                    setOpponentHearts(data.opponentHearts);
                }
            }
            else if (data.type === 'pk_battle_command') {
                if (data.command === 'end_battle') {
                    addToast(ToastType.Info, 'O oponente encerrou a batalha.');
                    onEndPKBattle();
                }
            }
        },
        onConnected: () => {
            lkConnectedRef.current = true;
            lkSetRole(isBroadcaster ? 'host' : 'viewer');
        },
    });

    useEffect(() => {
        return () => { lkConnectedRef.current = false; };
    }, []);

    const handleOpenCoHostModal = (e: React.MouseEvent, mode?: 'cohost' | 'battle') => {
        e.stopPropagation();
        setIsToolsOpen(false);
        setCoHostModalMode(mode || 'cohost');
        setIsCoHostModalOpen(true);
    };

    const handleOpenUserActions = (chatUser: ChatMessageType) => {
        if (!isBroadcaster || !chatUser.user) return;
        if(chatUser.user === streamer.name || chatUser.user === currentUser.name) return;
        const userForModal = constructUserFromMessage(chatUser);
        setUserActionModalState({ isOpen: true, user: userForModal });
    };
    const handleCloseUserActions = () => { setUserActionModalState({ isOpen: false, user: null }); };
    const handleKickUser = (user: User) => {
        const APP_OWNER_ID = '65384127';
        if (user.id === APP_OWNER_ID) {
            addToast(ToastType.Error, 'PROIBIDO: Este usuário não pode ser expulso!');
            return;
        }
        api.kickUser(streamer.id, user.id, currentUser.id);
        addToast(ToastType.Info, `Usuário ${user.name} foi expulso.`);
    };
    const handleMakeModerator = (user: User) => {
        api.makeModerator(streamer.id, user.id, currentUser.id);
        addToast(ToastType.Success, `${user.name} agora é um moderador.`);
    };
    const handleMentionUser = (user: User) => {
        setChatInput(prev => `${prev}@${user.name} `);
    };

    const totalScore = myScore + opponentScore;
    const myProgress = totalScore > 0 ? (myScore / totalScore) * 100 : 50;
    
    const isStreamerFollowed = useMemo(() => followingUsers.some(u => u.id === streamer.hostId), [followingUsers, streamer.hostId]);

    const streamerUser = useMemo(() => ({
        id: streamer.hostId, identification: streamer.hostId, name: streamer.name, avatarUrl: streamer.avatar,
        coverUrl: `https://picsum.photos/seed/${streamer.hostId}/400/800`, country: streamer.country || 'br',
        age: 23, gender: 'female' as 'female', level: 1, location: streamer.location, distance: 'desconhecida',
        fans: 0, following: 0, receptores: 0, enviados: 0, topFansAvatars: [], isLive: true,
        diamonds: 0, earnings: 0, earnings_withdrawn: 0, bio: 'Amante de streams!', obras: [], curtidas: [], 
        xp: 0, ownedFrames: [], activeFrameId: null, frameExpiration: null
    } as User), [streamer]);

    const streamerDisplayUser = isBroadcaster ? currentUser : streamerUser;

    const postGiftChatMessage = (payload: GiftPayload) => {
        const { fromUser, gift, toUser, quantity } = payload;
        const messageKey = quantity > 1 ? 'streamRoom.sentMultipleGiftsMessage' : 'streamRoom.sentGiftMessage';
        const messageOptions = { quantity, giftName: gift.name, receiverName: toUser.name };
        const giftMessage: ChatMessageType = {
            id: Date.now() + Math.random(),
            type: 'chat',
            user: fromUser.name,
            level: fromUser.level,
            isGift: true,
            message: (
                <span className="inline-flex items-center">
                    {t(messageKey, messageOptions)}
                    {gift.component ? React.cloneElement(gift.component as React.ReactElement<any>, { className: "w-5 h-5 inline-block ml-1.5" }) : <span className="ml-1.5">{gift.icon}</span>}
                </span>
            ),
            avatar: fromUser.avatarUrl,
            activeFrameId: fromUser.activeFrameId,
            frameExpiration: fromUser.frameExpiration,
        };
        setMessages(prev => [...prev, giftMessage]);
    };

    const handleSendGift = async (gift: Gift, quantity: number, isSimulation?: boolean) => {
        if (isSendingGift) return;
        setIsSendingGift(true);
        try {
            const giftPayload: GiftPayload = {
                fromUser: currentUser,
                toUser: { id: streamer.hostId, name: streamer.name },
                gift, quantity, roomId: streamer.id,
                id: Date.now() + Math.random()
            };
            postGiftChatMessage(giftPayload);
            setEffectsQueue(prev => [...prev, giftPayload]);
            const newBanner = { ...giftPayload, id: nextGiftId.current++ };
            setBannerGifts(prev => [...prev, newBanner].slice(-5));

            if (isSimulation) return;

            const { success, error, updatedSender, updatedReceiver } = await api.sendGift(currentUser.id, streamer.id, streamer.id, gift.name, quantity);
            if (success && updatedSender && updatedReceiver) {
                updateUser(updatedSender);
                updateUser(updatedReceiver);
                if (gift.triggersAutoFollow && !isStreamerFollowed) {
                    onFollowUser(streamerUser, streamer.id);
                }
                const coinsAdded = gift.price || 0;
                if (liveSession) {
                    updateLiveSession({ coins: (liveSession.coins || 0) + coinsAdded });
                    logLiveEvent('gift', { from: currentUser.id, to: streamer.hostId, gift: gift.name, coins: coinsAdded });
                }
                refreshStreamRoomData(streamer.hostId);
            } else if (error === 'Not enough diamonds') {
                setGiftModalOpen(false);
            }
        } finally {
            setIsSendingGift(false);
        }
    };

    const handleBannerAnimationEnd = (id: number) => {
        setBannerGifts(prev => prev.filter(g => g.id !== id));
    };

    const constructUserFromMessage = (user: ChatMessageType): User => ({ 
        id: `user-${user.id}`, identification: `user-${user.id}`, name: user.user!, avatar: user.avatar!, avatarUrl: user.avatar!, 
        coverUrl: `https://picsum.photos/seed/${user.id}/400/600`, country: user.fullUser?.country || 'br', 
        gender: user.gender || 'not_specified', level: user.level || 1, xp: 0, age: user.age || 18, 
        location: user.fullUser?.location || user.fullUser?.residence || 'Brasil', distance: 'desconhecida', fans: 0, following: 0, receptores: 0, enviados: 0,
        topFansAvatars: [], isLive: false, diamonds: 0, earnings: 0, 
        earnings_withdrawn: 0, bio: 'Usuário da plataforma', obras: [], curtidas: [], 
        ownedFrames: [], activeFrameId: user.activeFrameId || null, frameExpiration: user.frameExpiration || null,
    });
    
    const handleViewChatUserProfile = (user: ChatMessageType) => {
        if (!user.user || !user.avatar) return;
        onViewProfile(constructUserFromMessage(user));
    };

    useEffect(() => {
        const handlePKScoreUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            const myId = currentUser.id;
            const isChallenger = String(streamer.hostId) === String(myId);
            if (isChallenger) {
                setMyScore(detail.scoreA || 0);
                setOpponentScore(detail.scoreB || 0);
            } else {
                setMyScore(detail.scoreB || 0);
                setOpponentScore(detail.scoreA || 0);
            }
        };
        window.addEventListener('livego:pk_score_update', handlePKScoreUpdate);
        return () => window.removeEventListener('livego:pk_score_update', handlePKScoreUpdate);
    }, [currentUser.id, streamer.hostId]);
    
    const handleHeartClick = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const side = clickX < rect.width / 2 ? 'mine' : 'opponent';
      
      const newHeart: Heart = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY, side };
      setHearts(prev => [...prev, newHeart]);
      if (side === 'mine') setMyHearts(prev => prev + 1);
      else setOpponentHearts(prev => prev + 1);
      api.sendPKHeart(streamer.id, side === 'mine' ? 'A' : 'B');
      setTimeout(() => { setHearts(prev => prev.filter(h => h.id !== newHeart.id)); }, 2000);
    };

    useEffect(() => {
        const currentUserEntryMessage: ChatMessageType = { id: Date.now(), type: 'entry', fullUser: currentUser };
        setMessages([currentUserEntryMessage]);
    }, [streamer.id, currentUser]);

    useEffect(() => {
        const handleOnlineUsersUpdate = (data: { roomId: string, users: (User & { value: number })[] }) => {
            if (data.roomId === streamer.id) {
                const newUsers = data.users;
                const previousUsers = previousOnlineUsersRef.current;
                if (previousUsers.length > 0) {
                    const previousUserIds = new Set(previousUsers.map(u => u.id));
                    const newlyJoinedUsers = newUsers.filter(u => !previousUserIds.has(u.id) && u.id !== currentUser.id);
                    if (newlyJoinedUsers.length > 0) {
                        const entryMessages: ChatMessageType[] = newlyJoinedUsers.map(user => ({
                            id: Date.now() + Math.random(), type: 'entry', fullUser: user,
                        }));
                        setMessages(prev => [...prev, ...entryMessages]);
                    }
                }
                setOnlineUsers(newUsers);
                previousOnlineUsersRef.current = newUsers;
            }
        };
        const handleHeartUpdate = (data: { roomId: string, heartsA: number, heartsB: number }) => {
            if (data.roomId === streamer.id) { setMyHearts(data.heartsA); setOpponentHearts(data.heartsB); }
        };

        return () => {};
    }, [streamer.id, currentUser.id]);

    useEffect(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!currentEffect && effectsQueue.length > 0) {
            setCurrentEffect(effectsQueue[0]);
            setEffectsQueue(prev => prev.slice(1));
        }
    }, [currentEffect, effectsQueue]);

    useEffect(() => {
        if (timeLeft <= 0) {
            onEndPKBattle();
            return;
        }
        timeLeftRef.current = timeLeft;
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                timeLeftRef.current = next;
                return next;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft <= 0]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const handleSendMessage = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (chatInput.trim() === '' || !currentUser) return;
        const messagePayload: ChatMessageType = {
            id: String(Date.now()),
            type: 'chat',
            user: currentUser.name,
            level: currentUser.level,
            message: chatInput.trim(),
            avatar: currentUser.avatarUrl || currentUser.avatar,
            gender: currentUser.gender,
            age: currentUser.age,
            activeFrameId: currentUser.activeFrameId,
            frameExpiration: currentUser.frameExpiration,
            fullUser: currentUser,
            timestamp: Date.now(),
        };
        const stableId = String(Date.now() + Math.random());
        const safePayload = {
            ...messagePayload,
            avatar: messagePayload.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`,
            id: stableId,
        };
        setMessages(prev => [...prev, safePayload]);
        lkSendMessage({ ...safePayload, type: 'chat_message' })
            .catch((err: any) => console.warn('[PK CHAT] Erro ao enviar mensagem:', err));
        setChatInput('');
        requestAnimationFrame(() => {
            if (isComposerOpen) {
                composerInputRef.current?.focus();
            } else {
                chatInputRef.current?.focus({ preventScroll: true } as any);
            }
        });
    };

    const handleToggleAutoPrivateInvite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) return;
        const newAutoInviteState = !isAutoPrivateInviteEnabled;
        try {
            await api.toggleAutoPrivateInvite(streamer.id, newAutoInviteState);
            setIsAutoPrivateInviteEnabled(newAutoInviteState);
            updateLiveSession({ isAutoPrivateInviteEnabled: newAutoInviteState });
            addToast(ToastType.Success, newAutoInviteState ? 'Convite automático ativado.' : 'Convite automático desativado.');
        } catch (error) {
            addToast(ToastType.Error, "Falha ao alterar a configuração.");
        }
    };

    const handleToggleMicrophone = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) return;
        await api.toggleMicrophone(streamer.id);
    };

    const handleToggleSound = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) {
            setIsLocalMuted(prev => {
                addToast(ToastType.Info, !prev ? 'Áudio da live silenciado localmente.' : 'Áudio da live ativado localmente.');
                return !prev;
            });
            return;
        }
        await api.toggleStreamSound(streamer.id);
    };

    const handleToggleAutoFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster || !liveSession) return;
        const newAutoFollowState = !liveSession.isAutoFollowEnabled;
        try {
            await api.toggleAutoFollow(streamer.id, newAutoFollowState);
            updateLiveSession({ isAutoFollowEnabled: newAutoFollowState });
            addToast(ToastType.Success, newAutoFollowState ? 'Seguimento automático ativado.' : 'Seguimento automático desativado.');
        } catch (error) {
            addToast(ToastType.Error, "Falha ao alterar a configuração.");
        }
    };

    if (!opponent) return <div className="absolute inset-0 bg-black flex items-center justify-center"><LoadingSpinner /></div>;

    return (
        <div className="absolute inset-0 bg-[#000000] flex flex-col font-sans text-white z-10 select-none">
            {/* ═══ TOP: Split Video Area (52vh) ═══ */}
            <div className="relative w-full h-[52vh] min-h-[280px] flex-shrink-0 bg-zinc-950 overflow-hidden" style={{ height: '52svh' }} onClick={handleHeartClick}>
                <div className="absolute inset-0 grid grid-cols-2 bg-black">
                    {/* Host Camera Stream (Left) */}
                    <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
                        <LivePlayer
                            streamId={streamer.streamKey || streamer.id}
                            isBroadcaster={isBroadcaster}
                            userId={currentUser.id}
                            muted={!isBroadcaster && isLocalMuted}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none z-10" />
                    </div>
                    {/* Opponent Camera Stream (Right) */}
                    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
                        <LivePlayer
                            streamId={opponent.id}
                            userId={currentUser.id}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none z-10" />
                    </div>
                </div>

                {/* Golden Vertical Separator */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#fcd34d] -translate-x-1/2 z-10 pointer-events-none" />

                {/* Banner Notifications */}
                <div className="absolute top-28 left-3 z-30 pointer-events-none flex flex-col-reverse items-start">
                    <GiftQueueManager gifts={bannerGifts} onAnimationEnd={handleBannerAnimationEnd} maxConcurrent={3} maxQueueSize={50} />
                </div>

                {/* ═══ Header: Host + Opponent Info ═══ */}
                <header className={`absolute top-0 left-0 right-0 p-3 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Left: Host */}
                    <div className="flex items-start space-x-2">
                        <div className="relative">
                            <div className="w-[42px] h-[42px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#FF2D55] via-purple-600 to-indigo-500 flex items-center justify-center">
                                <img src={streamerDisplayUser.avatarUrl} alt={streamerDisplayUser.name} className="w-full h-full rounded-full object-cover border border-black/50" />
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onFollowUser(streamerUser, streamer.id); }}
                                className="absolute -right-1 -bottom-1 w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-md hover:scale-110 active:scale-95 transition-all border-none cursor-pointer"
                            >+</button>
                        </div>
                        <div className="flex flex-col text-left">
                            <h4 className="text-white font-bold text-xs leading-tight tracking-wide drop-shadow-md">
                                Live de {streamerDisplayUser.name}
                            </h4>
                            <p className="text-gray-350 text-[10px] mt-0.5 bg-black/35 px-1.5 py-0.5 rounded-full w-max select-none">
                                @{streamerDisplayUser.name}
                            </p>
                            <div className="flex items-center space-x-1 mt-0.5 text-yellow-400 text-[10px] bg-black/35 px-1.5 py-0.5 rounded-full w-max">
                                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full flex items-center justify-center text-[7px] text-black font-extrabold pb-[0.5px]">G</span>
                                <span className="font-semibold">{myScore.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Opponent */}
                    <div className="flex items-start space-x-2 text-right">
                        <div className="flex flex-col items-end">
                            <h4 className="text-white font-bold text-xs leading-tight tracking-wide drop-shadow-md flex items-center gap-1">
                                {opponent.name}
                            </h4>
                            <p className="text-gray-300 text-[10px] mt-0.5 bg-black/35 px-1.5 py-0.5 rounded-full w-max select-none">
                                @{opponent.name}
                            </p>
                        </div>
                        <div className="relative">
                            <div className="w-[42px] h-[42px] rounded-full p-[2.5px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-teal-400 flex items-center justify-center">
                                <img src={opponent.avatarUrl} alt={opponent.name} className="w-full h-full rounded-full object-cover border border-black/50" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-1.5 ml-1.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsOnlineUsersOpen(true); }}
                                className="bg-black/30 hover:bg-black/50 p-1.5 rounded-full flex items-center justify-center text-white transition-all scale-90 border-none cursor-pointer focus:outline-none"
                            >
                                <BellIcon className="w-4 h-4 text-yellow-400" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); isBroadcaster ? onRequestEndStream() : onLeaveStreamView(); }}
                                className="bg-black/30 hover:bg-black/50 p-1.5 rounded-full flex items-center justify-center text-white transition-all scale-90 border-none cursor-pointer focus:outline-none"
                            >
                                <CloseIcon className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                </header>
                
                {/* ═══ VS Progress Bar ═══ */}
                <div className={`w-full px-4 absolute top-[68px] left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="relative w-full h-[10px] bg-zinc-850 rounded-full overflow-visible flex items-center">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-[#FF2D55] rounded-l-full transition-all duration-500" style={{ width: `${myProgress}%` }} />
                        <div className="h-full bg-gradient-to-r from-[#007AFF] to-[#0A84FF] rounded-r-full transition-all duration-500 flex-grow" />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full font-black text-[9px] text-black px-1.5 py-0.5 border border-white shadow-md z-30 select-none pb-[1px]" style={{ left: `${myProgress}%` }}>VS</div>
                    </div>
                    <div className="flex justify-between items-center mt-2.5">
                        <div className="flex items-center space-x-1 text-left">
                            <StarIcon className="w-3.5 h-3.5 text-pink-500 fill-current" />
                            <span className="font-extrabold text-[13px] text-white tracking-tight drop-shadow">{myScore.toLocaleString()}</span>
                            <span className="font-semibold text-[11px] text-gray-400 drop-shadow">({myHearts})</span>
                        </div>
                        <div className="bg-black/65 border border-white/[0.08] backdrop-blur-md rounded-full px-4 py-1 text-white font-mono text-[13px] font-bold shadow-lg flex items-center justify-center">
                            {formatTime(timeLeft)}
                        </div>
                        <div className="flex items-center space-x-1 text-right">
                            <span className="font-semibold text-[11px] text-gray-400 drop-shadow">({opponentHearts})</span>
                            <StarIcon className="w-3.5 h-3.5 text-blue-500 fill-current" />
                            <span className="font-extrabold text-[13px] text-white tracking-tight drop-shadow">{opponentScore.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ BOTTOM: Chat Area — fixed bottom, matches StreamRoom style ═══ */}
            <div className="fixed left-0 right-0 bottom-0 w-full z-30">
                {/* Chat shading for text contrast */}
                <div className="absolute inset-x-0 bottom-0 top-[-10px] bg-gradient-to-t from-black/95 via-black/45 to-transparent -z-10 pointer-events-none" />

                <div ref={chatContainerRef} className="max-h-[33vh] overflow-y-auto no-scrollbar overscroll-contain flex flex-col pointer-events-auto px-1.5 pb-[env(safe-area-inset-bottom)] relative z-10" style={{ maxHeight: '33lvh' }}>
                    <div className="flex flex-col gap-px mt-auto items-start w-full">
                    {messages.map((msg) => {
                        if (msg.type === 'entry' && msg.fullUser) {
                            return <EntryChatMessage 
                                key={msg.id} user={msg.fullUser} currentUser={currentUser}
                                onClick={onViewProfile} onFollow={onFollowUser}
                                isFollowed={followingUsers.some(u => u.id === msg.fullUser!.id)} />;
                        }
                        if (msg.type === 'chat' && msg.user && msg.avatar) {
                            const chatUser = constructUserFromMessage(msg);
                            const shouldShowFollow = !isBroadcaster && chatUser.id !== currentUser.id && chatUser.name !== streamer.name;
                            return <ChatMessage 
                                key={msg.id} userObject={chatUser} message={msg.message}
                                avatarUrl={msg.avatar || chatUser.avatarUrl}
                                onAvatarClick={msg.isGift ? () => setGiftModalOpen(true) : () => handleViewChatUserProfile(msg)} 
                                onFollow={shouldShowFollow ? () => onFollowUser(chatUser, streamer.id) : undefined}
                                isFollowed={followingUsers.some(f => f.id === chatUser.id)}
                                onModerationClick={isBroadcaster && isModerationMode && msg.user !== currentUser.name && msg.user !== streamer.name ? () => handleOpenUserActions(msg) : undefined}
                                isModerator={msg.isModerator} />;
                        }
                        if (msg.type === 'follow' && msg.user && msg.followedUser) {
                            return <FollowChatMessage key={msg.id} follower={msg.user} followed={msg.followedUser} />;
                        }
                        if (msg.type === 'friend_request' && msg.follower) {
                            return <FriendRequestNotification key={msg.id} followerName={msg.follower.name} onClick={onOpenFriendRequests} />;
                        }
                        return null;
                    })}
                    </div>
                </div>
                <div style={{ height: `calc(${isComposerOpen ? COMPOSER_BAR_HEIGHT : MESSAGE_BAR_HEIGHT}px + ${isComposerOpen ? chatBarBottom : 0}px + env(safe-area-inset-bottom, 0px))` }} />
            </div>

            <footer className={`fixed left-0 right-0 z-30 p-3 pointer-events-auto transition-opacity duration-200 ${isComposerOpen ? 'opacity-0 pointer-events-none' : ''}`} style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="flex items-center gap-3" data-purpose="bottom-controls">
                    <div className="flex-grow">
                        <button
                            type="button"
                            ref={chatInputRef}
                            tabIndex={-1}
                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); openComposer(); }}
                            className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-sm text-left focus:ring-0 focus:outline-none focus:bg-white/15 transition-all cursor-pointer select-none"
                        >
                            {chatInput ? (
                                <span className="text-white">{chatInput}</span>
                            ) : (
                                <span className="text-gray-450">{t('streamRoom.sayHi')}</span>
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => { console.log('[PK CHAT] onClick botão Enviar'); handleSendMessage(e); }} 
                            className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                            style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                        >
                            <SendIcon className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setGiftModalOpen(true); }} 
                            className="text-yellow-400 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                        >
                            <img 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3" 
                                alt="Gift" className="w-9 h-9 object-cover rounded-full shadow-lg" 
                            />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsToolsOpen(true); }} 
                            className="bg-black/40 hover:bg-black/65 w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 border-none focus:outline-none cursor-pointer"
                            title="Ferramentas"
                        >
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="5" cy="12" r="2"></circle>
                                <circle cx="12" cy="12" r="2"></circle>
                                <circle cx="19" cy="12" r="2"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
            </footer>

            {/* ═══ Composer flutuante (TikTok-style) — matches StreamRoom exactly ═══ */}
            {isComposerOpen && (
                <div ref={composerRef} className="fixed left-0 right-0 z-40" style={{ bottom: `${chatBarBottom}px` }}>
                    <footer className="px-3 pt-2 pb-3 pointer-events-auto bg-[#131317] border-t border-[#232128] shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
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
                                    onBlur={() => {
                                        setTimeout(() => {
                                            if (composerRef.current && !composerRef.current.contains(document.activeElement)) {
                                                closeComposer();
                                            }
                                        }, 120);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(e); } }}
                                    className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-sm text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                                />
                            </div>
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => { e.stopPropagation(); handleSendMessage(e); }}
                                className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                            >
                                <SendIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </footer>
                </div>
            )}

            {hearts.map(heart => (
              <div key={heart.id} className="heart-anim pointer-events-none fixed" style={{ left: `${heart.x - 16}px`, top: `${heart.y - 16}px` }}>
                <HeartIcon className={`w-8 h-8 ${heart.side === 'mine' ? 'text-pink-500' : 'text-blue-500'}`} />
              </div>
            ))}

            {/* 🎁 ANIMAÇÃO DO PRESENTE EM TELA CHEIA — camada fixa sobre o app
            INTEIRO (não só o vídeo de cima), sem bloquear toques. Acima do chat
            (z-30) e do composer (z-40); abaixo dos modais (z-[100]). */}
            <div className="fixed inset-0 pointer-events-none select-none" style={{ zIndex: 60, background: 'transparent' }}>
                <FullScreenGiftAnimation payload={currentEffect} onEnd={() => setCurrentEffect(null)} />
            </div>
            
            {isOnlineUsersOpen && (
                <OnlineUsersModal 
                    onClose={() => setIsOnlineUsersOpen(false)} 
                    streamId={streamer.id} userId={currentUser.id} currentUser={currentUser} 
                    connectionQualities={lkConnectionQualities}
                    onSelectUser={(selectedUser: any) => {
                        setIsOnlineUsersOpen(false);
                        onViewProfile(selectedUser);
                    }}
                />
            )}
            {isRankingOpen && <ContributionRankingModal onClose={() => setIsRankingOpen(false)} liveRanking={onlineUsers} />}
            
            <ToolsModalAny 
                isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} 
                onOpenCoHostModal={handleOpenCoHostModal}
                isPKBattleActive={true} 
                onEndPKBattle={(e: any) => { e.stopPropagation(); onEndPKBattle(); }}
                onOpenBeautyPanel={(e: any) => { e.stopPropagation(); setIsToolsOpen(false); setBeautyPanelOpen(true); }} 
                onOpenPrivateChat={(e: any) => { e.stopPropagation(); onOpenPrivateChat(); }} 
                onOpenPrivateInviteModal={(e: any) => { e.stopPropagation(); onOpenPrivateInviteModal(); }}
                onOpenClarityPanel={(e: any) => { e.stopPropagation(); setIsToolsOpen(false); setResolutionPanelOpen(true); }}
                isModerationActive={isModerationMode}
                onToggleModeration={(e: any) => { e.stopPropagation(); setIsModerationMode((prev: boolean) => !prev); }}
                isPrivateStream={streamer.isPrivate}
                isMicrophoneMuted={liveSession?.isMicrophoneMuted ?? false}
                onToggleMicrophone={handleToggleMicrophone}
                isSoundMuted={isBroadcaster ? (liveSession?.isStreamMuted ?? false) : isLocalMuted}
                onToggleSound={handleToggleSound}
                isAutoFollowEnabled={liveSession?.isAutoFollowEnabled ?? false}
                onToggleAutoFollow={handleToggleAutoFollow}
                isAutoPrivateInviteEnabled={isAutoPrivateInviteEnabled}
                onToggleAutoPrivateInvite={handleToggleAutoPrivateInvite}
                onOpenRoulette={(e: any) => { e.stopPropagation(); setIsRouletteOpen(true); setIsRouletteMinimized(false); }}
                isHost={isBroadcaster}
                addToast={addToast}
            />
            <RouletteModalAny
                isOpen={isRouletteOpen}
                isMinimized={isRouletteMinimized}
                onClose={() => { setIsRouletteOpen(false); setIsRouletteMinimized(false); }}
                onMinimize={() => setIsRouletteMinimized(true)}
                onMaximize={() => setIsRouletteMinimized(false)}
                currentUser={currentUser}
                updateUser={updateUser}
                addToast={addToast}
                ownerId={streamer.hostId}
                streamId={streamer.id}
                canEdit={isBroadcaster}
            />
            <GiftModal isOpen={isGiftModalOpen} onClose={() => setGiftModalOpen(false)} userDiamonds={currentUser.diamonds ?? 0} onSendGift={handleSendGift} onRecharge={() => setGiftModalOpen(false)} gifts={gifts} receivedGifts={receivedGifts} isBroadcaster={isBroadcaster} onOpenVIPCenter={onOpenVIPCenter} isVIP={currentUser.isVIP || false} currentUser={currentUser} />
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} />}
            {isCoHostModalOpen && (
                <CoHostModal 
                    isOpen={isCoHostModalOpen} mode={coHostModalMode} 
                    onClose={() => setIsCoHostModalOpen(false)} 
                    onInvite={()=>{}} onOpenTimerSettings={onOpenPKTimerSettings} 
                    currentUser={currentUser} addToast={addToast} streamId={streamer.id}
                />
            )}
            <UserActionModal 
                isOpen={userActionModalState.isOpen} onClose={handleCloseUserActions} 
                user={userActionModalState.user} currentUser={currentUser}
                streamer={streamerUser as any}
                onViewProfile={(user) => { handleCloseUserActions(); onViewProfile(user); }}
                onMention={handleMentionUser} onMakeModerator={handleMakeModerator} onKick={handleKickUser}
            />
        </div>
    );
}
