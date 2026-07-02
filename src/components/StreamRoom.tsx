import React, { useState, useEffect, useRef, useMemo } from 'react';
import OnlineUsersModal from '../../components/live/OnlineUsersModal';
const OnlineUsersModalAny: any = OnlineUsersModal;
import ChatMessage from '../../components/live/ChatMessage';
import CoHostModal from '../../components/CoHostModal';
import EntryChatMessage from '../../components/live/EntryChatMessage';
import ChatScreen from '../../components/ChatScreen';
import ToolsModal from '../../components/ToolsModal';
const ToolsModalAny: any = ToolsModal;
import { GiftIcon, MessageIcon, SendIcon, MoreIcon, CloseIcon, PlusIcon, SoundWaveIcon, ViewerIcon, GoldCoinWithGIcon, HeartIcon, TrophyIcon, BellIcon, RankIcon } from '../../components/icons';
import { Streamer, User, Gift, ToastType, RankedUser, LiveSessionState, SrsPublishStatus } from '../types';
import ContributionRankingModal from '../../components/ContributionRankingModal';
import BeautyEffectsPanel from '../../components/live/BeautyEffectsPanel';
import ResolutionPanel from '../../components/live/ResolutionPanel';
import GiftModal from '../../components/live/GiftModal';
import GiftAnimationOverlay, { GiftPayload } from '../../components/live/GiftAnimationOverlay';
import GiftQueueManager from '../../components/live/GiftQueueManager';
import WalletScreen from '../../components/WalletScreen';
import ConfirmPurchaseScreen from '../../components/ConfirmPurchaseScreen';
import { useTranslation } from '../../i18n';
import { api } from '../../services/api';
import { getVideoHttpBaseUrl } from '../../services/mediaConfig';
import UserActionModal from '../../components/UserActionModal';
import FriendRequestNotification from '../../components/live/FriendRequestNotification';
import { RankedAvatar } from '../../components/live/RankedAvatar';
import FullScreenGiftAnimation from '../../components/live/FullScreenGiftAnimation';
import { streamPublishService } from '../../services/streamPublishService';
import { socketService } from '../../services/socket';
import AvatarWithFrame from '../../components/ui/AvatarWithFrame';
import { beautyWebRTCIntegration } from '../../services/BeautyWebRTCIntegration';
import LivePlayer from '../../components/LivePlayer';
import LiveCallInvitation from './LiveCallInvitation';

interface ChatMessageType {
    id: number;
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
    activeFrameId?: string | null;
    frameExpiration?: string | null;
}

interface StreamRoomProps {
    streamer: Streamer;
    onRequestEndStream: () => void;
    onLeaveStreamView: () => void;
    onStartPKBattle: (opponent: User) => void;
    onViewProfile: (user: User) => void;
    currentUser: User;
    onOpenWallet: (initialTab?: 'Diamante' | 'Ganhos') => void;
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
    updateUser: (user: User) => void;
    liveSession: LiveSessionState | null;
    updateLiveSession: (updates: Partial<LiveSessionState>) => void;
    logLiveEvent: (type: string, data: any) => void;
    onStreamUpdate: (updates: Partial<Streamer>) => void;
    refreshStreamRoomData: (streamerId: string) => void;
    addToast: (type: ToastType, message: string) => void;
    followingUsers: User[];
    streamers: Streamer[];
    onSelectStream: (streamer: Streamer) => void;
    onOpenVIPCenter: () => void;
    rankingData: Record<string, RankedUser[]>;
}

const FollowChatMessage: React.FC<{ follower: string; followed: string; level?: number }> = ({ follower, followed, level }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-purple-500/30 rounded-full p-1.5 px-3 flex items-center self-start text-xs">
            <span className="text-purple-300 font-bold">{follower}</span>
            {level && (
                <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 ml-2">
                    <RankIcon className="h-3 w-3" />
                    <span>{level}</span>
                </span>
            )}
            <span className="text-gray-200 ml-1.5">{t('streamRoom.followed')}</span>
            <span className="text-purple-300 font-bold ml-1.5">{followed}! 🎉</span>
        </div>
    );
};

// Controle global para evitar múltiplas chamadas simultâneas
const globalFetchControl = new Map<string, boolean>();

const StreamRoom: React.FC<StreamRoomProps> = ({ streamer, onRequestEndStream, onLeaveStreamView, onStartPKBattle, onViewProfile, currentUser, onOpenWallet, onFollowUser, onOpenPrivateChat, onOpenPrivateInviteModal, setActiveScreen, onStartChatWithStreamer, onOpenPKTimerSettings, onOpenFans, onOpenFriendRequests, gifts, receivedGifts, updateUser, liveSession, updateLiveSession, logLiveEvent, onStreamUpdate, refreshStreamRoomData, addToast, followingUsers, streamers, onSelectStream, onOpenVIPCenter, rankingData }) => {
    const { t } = useTranslation();

    // Early validation for required props
    if (!streamer || !currentUser) {
        return (
            <div className="absolute inset-0 bg-gray-900 text-white font-sans z-10 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-2">Erro ao carregar transmissão</div>
                    <div className="text-gray-400">Verifique sua conexão e tente novamente</div>
                </div>
            </div>
        );
    }

    const [isUiVisible, setIsUiVisible] = useState(true);
    const [showChatScreen, setShowChatScreen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isBeautyPanelOpen, setBeautyPanelOpen] = useState(false);
    const [isCoHostModalOpen, setIsCoHostModalOpen] = useState(false);
    const [coHostModalMode, setCoHostModalMode] = useState<'cohost' | 'battle'>('cohost');
    const [isOnlineUsersOpen, setOnlineUsersOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const getStreamUrl = () => {
        // 👥 Para viewers: mostrar transmissão via URL do SRS
        return `${getVideoHttpBaseUrl()}/live/${streamer.streamKey || streamer.id}.m3u8`;
    };
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [onlineUsersInterval, setOnlineUsersInterval] = useState<NodeJS.Timeout | null>(null);
    const [isResolutionPanelOpen, setResolutionPanelOpen] = useState(false);
    const [currentResolution, setCurrentResolution] = useState(streamer.quality || '480p');
    const [isGiftModalOpen, setGiftModalOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<{ diamonds: number; price: number } | null>(null);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [userActionModalState, setUserActionModalState] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [isModerationMode, setIsModerationMode] = useState(false);
    const [isAutoPrivateInviteEnabled, setIsAutoPrivateInviteEnabled] = useState(liveSession?.isAutoPrivateInviteEnabled ?? false);
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const previousOnlineUsersRef = useRef<(User & { value: number })[]>([]);

    // Estado para likes da transmissão
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    // State to track if video is actually playing to hide the cover image
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const [bannerGifts, setBannerGifts] = useState<(GiftPayload & { id: number })[]>([]);
    const nextGiftId = useRef(0);
    const [fullscreenGiftQueue, setFullscreenGiftQueue] = useState<GiftPayload[]>([]);
    const [currentFullscreenGift, setCurrentFullscreenGift] = useState<GiftPayload | null>(null);
    const [giftQueue, setGiftQueue] = useState<GiftPayload[]>([]); // Nova fila para GiftQueueManager
    const [isLocalMuted, setIsLocalMuted] = useState(false);

    // Estado para monitoramento de publish SRS
    const [publishStatus, setPublishStatus] = useState<SrsPublishStatus>({
        state: 'idle' as any,
        lastUpdate: new Date()
    });

    const isBroadcaster = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);

    const isFollowed = useMemo(() => followingUsers.some(u => u.id === streamer.hostId), [followingUsers, streamer.hostId]);

    const [streamerUser, setStreamerUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchStreamerData = async () => {
            try {
                const user = await api.getUser(streamer.hostId);
                setStreamerUser(user);
            } catch (error) {
            }
        };
        fetchStreamerData();
    }, [streamer.hostId]);

    const streamerDisplayUser = isBroadcaster ? currentUser : (streamerUser || {
        id: streamer.hostId,
        name: streamer.name,
        avatarUrl: streamer.avatar,
        identification: streamer.hostId,
        level: 1,
        // Fallback minimal user
    } as User);

    // Simplificado - sem frames para navegação isolada
    const frameGlowClass = '';

    const swipeStart = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 50;

    const handlePointerDown = (clientX: number, clientY: number) => {
        swipeStart.current = { x: clientX, y: clientY };
    };

    const handlePointerUp = (clientX: number, clientY: number) => {
        if (!swipeStart.current) return;

        const deltaX = clientX - swipeStart.current.x;
        const deltaY = clientY - swipeStart.current.y;

        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
            // Vertical swipe for navigation
            if (!Array.isArray(streamers)) return;
            const currentIndex = streamers.findIndex(s => s.id === streamer.id);
            if (currentIndex === -1 || streamers.length <= 1) return;

            if (deltaY < 0) { // Swipe Up
                const nextIndex = (currentIndex + 1) % streamers.length;
                onSelectStream(streamers[nextIndex]);
            } else { // Swipe Down
                const prevIndex = (currentIndex - 1 + streamers.length) % streamers.length;
                onSelectStream(streamers[prevIndex]);
            }
        } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            // Horizontal swipe for UI toggle
            setIsUiVisible(p => !p);
        }

        swipeStart.current = null;
    };

    useEffect(() => {
        // Add entry message for current user
        const currentUserEntryMessage: ChatMessageType = {
            id: Date.now(),
            type: 'entry',
            fullUser: currentUser,
        };
        setMessages([currentUserEntryMessage]);

        // Buscar likes iniciais da transmissão
        const fetchInitialLikes = async () => {
            try {
                const likesData = await api.getStreamLikes(streamer.id);
                if (likesData) {
                    setLikes(likesData.totalLikes || 0);
                }
            } catch (error) {
                console.error('Erro ao buscar likes iniciais:', error);
            }
        };

        // Variável de controle para evitar chamadas duplicadas
        let hasJoined = false;
        let hasLeft = false;
        let hasFetchedInitialUsers = false;

        // Marcar usuário como online na stream (apenas uma vez)
        const joinStreamOnce = async () => {
            if (!hasJoined) {
                hasJoined = true;
                const success = await api.joinStream(streamer.id, currentUser.id);
                if (success) {
                } else {
                }
            }
        };

        // Initial fetch para definir baseline
        const fetchInitialUsers = async () => {
            const controlKey = `${streamer.id}_${currentUser.id}`;

            if (!hasFetchedInitialUsers && !globalFetchControl.get(controlKey)) {
                hasFetchedInitialUsers = true;
                globalFetchControl.set(controlKey, true);

                try {
                    const users = await api.getStreamOnlineUsers(streamer.id);
                    if (users) {
                        setOnlineUsers(users);
                        updateLiveSession({ viewers: users.length });
                        previousOnlineUsersRef.current = users;
                    }
                } finally {
                    // Limpar controle após um tempo para permitir novas chamadas em sessões futuras
                    setTimeout(() => {
                        globalFetchControl.delete(controlKey);
                    }, 5000);
                }
            }
        };

        // Executar uma vez no início
        joinStreamOnce();
        fetchInitialUsers();
        fetchInitialLikes();

        // REMOVIDO: Polling automático de usuários online
        // A busca agora ocorre apenas em eventos reais (entrada/saída via WebSocket)
        setOnlineUsersInterval(null);

        socketService.connect();
        socketService.joinRoom(streamer.id);

        // Escutar usuários entrando na stream
        socketService.onUserJoined((data) => {
            // Adicionar usuário à lista de online users
            setOnlineUsers(prev => {
                const exists = prev.find(u => u.id === data.userId);
                if (!exists) {
                    const newUser: User & { value: number } = {
                        id: data.userId,
                        name: data.userName,
                        avatarUrl: data.userAvatar,
                        level: data.userLevel,
                        value: 0,
                        identification: data.userId,
                        fans: 0, following: 0, receptores: 0, enviados: 0, diamonds: 0, earnings: 0, earnings_withdrawn: 0, ownedFrames: [],
                    };
                    const updated = [...prev, newUser];
                    updateLiveSession({ viewers: updated.length });
                    return updated;
                }
                return prev;
            });
        });

        // Escutar usuários saindo da stream
        socketService.onUserLeft((data) => {
            // Remover usuário da lista de online users
            setOnlineUsers(prev => {
                const updated = prev.filter(u => u.id !== data.userId);
                updateLiveSession({ viewers: updated.length });
                return updated;
            });
        });

        // Escutar atualizações de contagem de viewers
        socketService.onViewersCountUpdated((data) => {
            updateLiveSession({ viewers: data.count });
        });

        // Escutar likes em tempo real
        const handleStreamLiked = (data: { streamId: string; totalLikes: number; userId: string }) => {
            if (data.streamId === streamer.id) {
                setLikes(data.totalLikes);
                // Se o próprio usuário deu like, atualizar estado
                if (data.userId === currentUser.id) {
                    setIsLiked(true);
                }
            }
        };

        const handleStreamUnliked = (data: { streamId: string; totalLikes: number; userId: string }) => {
            if (data.streamId === streamer.id) {
                setLikes(data.totalLikes);
                // Se o próprio usuário removeu like, atualizar estado
                if (data.userId === currentUser.id) {
                    setIsLiked(false);
                }
            }
        };

        socketService.on('stream_liked', handleStreamLiked);
        socketService.on('stream_unliked', handleStreamUnliked);

        return () => {
            // Marcar que está saindo para evitar múltiplas chamadas
            hasLeft = true;

            // Limpar listeners WebSocket
            socketService.off('user_joined_stream');
            socketService.off('user_left_stream');
            socketService.off('viewers_count_updated');
            socketService.off('stream_liked', handleStreamLiked);
            socketService.off('stream_unliked', handleStreamUnliked);

            // Marcar usuário como offline ao sair da stream (apenas uma vez)
            if (hasJoined && !hasLeft) {
                api.leaveStream(streamer.id, currentUser.id).then(success => {
                    if (success) {
                    } else {
                    }
                });
            }

            socketService.leaveRoom(streamer.id);
        };
    }, [streamer.id, currentUser.id]); // Removido onlineUsersInterval das dependências

    const postGiftChatMessage = (payload: GiftPayload) => {
        try {
            const { fromUser, gift, toUser, quantity } = payload;

            // Validação robusta para evitar undefined errors
            if (!fromUser || !fromUser.name || !gift || !toUser || !toUser.name) {
                console.error('postGiftChatMessage: Dados inválidos', { fromUser, gift, toUser, quantity });
                return;
            }

            const messageKey = quantity > 1 ? 'streamRoom.sentMultipleGiftsMessage' : 'streamRoom.sentGiftMessage';
            const messageOptions = { quantity, giftName: gift.name || 'Presente', receiverName: toUser.name };

            const giftMessage: ChatMessageType = {
                id: Date.now() + Math.random(),
                type: 'chat',
                user: fromUser.name,
                level: fromUser.level || 1,
                message: (
                    <span className="inline-flex items-center">
                        {t(messageKey, messageOptions)}
                        {gift.component ? React.cloneElement(gift.component as React.ReactElement<any>, { className: "w-5 h-5 inline-block ml-1.5" }) : <span className="ml-1.5">{gift.icon || '🎁'}</span>}
                    </span>
                ),
                avatar: fromUser.avatarUrl || '',
                activeFrameId: fromUser.activeFrameId || null,
                frameExpiration: fromUser.frameExpiration || null,
            };
            setMessages(prev => [...prev, giftMessage]);
        } catch (error) {
            console.error('Erro em postGiftChatMessage:', error);
            // Não impede o envio do presente, apenas loga o erro
        }
    };

    const handleBannerAnimationEnd = (id: number) => {
        setBannerGifts(prev => prev.filter(g => g.id !== id));
    };

    const handleFullscreenGiftAnimationEnd = () => {
        if (currentFullscreenGift) {
            const newBanner = { ...currentFullscreenGift, id: nextGiftId.current++ };
            setBannerGifts(prev => [...prev, newBanner].slice(-5));
        }
        setCurrentFullscreenGift(null);
    };

    useEffect(() => {
        if (!currentFullscreenGift && fullscreenGiftQueue.length > 0) {
            const nextGift = fullscreenGiftQueue[0];
            setCurrentFullscreenGift(nextGift);
            setFullscreenGiftQueue(prev => prev.slice(1));
        }
    }, [currentFullscreenGift, fullscreenGiftQueue]);

    useEffect(() => {
        const handleNewMessage = (message: any) => {
            setMessages(prev => [...prev, message]);
        };
        socketService.on('receive_message', handleNewMessage);

        const handleNewGift = (data: any) => {
            // Converter dados do WebSocket para formato GiftPayload
            const payload: GiftPayload = {
                fromUser: {
                    id: data.from.id,
                    identification: data.from.identification || data.from.id,
                    name: data.from.name,
                    avatarUrl: data.from.avatarUrl,
                    coverUrl: data.from.coverUrl,
                    photos: data.from.photos,
                    country: data.from.country,
                    age: data.from.age,
                    gender: data.from.gender,
                    level: data.from.level || 1,
                    xp: data.from.xp,
                    rank: data.from.rank,
                    location: data.from.location,
                    distance: data.from.distance,
                    fans: data.from.fans || 0,
                    following: data.from.following || 0,
                    receptores: data.from.receptores || 0,
                    enviados: data.from.enviados || 0,
                    topFansAvatars: data.from.topFansAvatars,
                    isLive: data.from.isLive,
                    isFollowed: data.from.isFollowed,
                    isFriend: data.from.isFriend,
                    isOnline: data.from.isOnline,
                    lastSeen: data.from.lastSeen,
                    currentStreamId: data.from.currentStreamId,
                    diamonds: data.from.diamonds || 0,
                    earnings: data.from.earnings || 0,
                    earnings_withdrawn: data.from.earnings_withdrawn || 0,
                    withdrawal_method: data.from.withdrawal_method,
                    bio: data.from.bio,
                    obras: data.from.obras,
                    curtidas: data.from.curtidas,
                    birthday: data.from.birthday,
                    residence: data.from.residence,
                    emotional_status: data.from.emotional_status,
                    tags: data.from.tags,
                    profession: data.from.profession,
                    isVIP: data.from.isVIP,
                    vipSubscriptionDate: data.from.vipSubscriptionDate,
                    vipExpirationDate: data.from.vipExpirationDate,
                    isAvatarProtected: data.from.isAvatarProtected,
                    activeFrameId: data.from.activeFrameId,
                    ownedFrames: data.from.ownedFrames || [],
                    chatPermission: data.from.chatPermission,
                    pipEnabled: data.from.pipEnabled,
                    locationPermission: data.from.locationPermission,
                    showActivityStatus: data.from.showActivityStatus,
                    showLocation: data.from.showLocation,
                    privateStreamSettings: data.from.privateStreamSettings,
                    platformEarnings: data.from.platformEarnings,
                    adminWithdrawalMethod: data.from.adminWithdrawalMethod,
                    frameExpiration: data.from.frameExpiration,
                    geoLocation: data.from.geoLocation
                },
                toUser: { 
                    id: data.toUser.id, 
                    name: data.toUser.name 
                },
                gift: gifts?.find((g: any) => g.name === data.gift?.name || g.id === data.gift?.id) || {
                    name: data.gift.name,
                    price: data.gift.price,
                    icon: data.gift.icon,
                    category: data.gift.category || 'Popular'
                },
                quantity: data.quantity,
                roomId: streamer.id,
                id: Date.now() + Math.random() // ID único para este gift
            };

            // Pular se o remetente for o próprio usuário (já adicionou otimisticamente) ou se os IDs baterem
            const isSenderSelf = (data.from?.id === currentUser?.id) || 
                                 (data.fromUser?.id === currentUser?.id) || 
                                 (payload.fromUser?.id === currentUser?.id);
            if (!isSenderSelf) {
                // Adicionar à fila de animação (nova fila para GiftQueueManager)
                setGiftQueue(prev => [...prev, payload]);
                
                // Adicionar mensagem de presente ao chat
                postGiftChatMessage(payload);
                
                // Adicionar à fila de animação em tela cheia (mantida para fullscreen)
                setFullscreenGiftQueue(prev => [...prev, payload]);
            }
            
            console.log(`🎁 [LIVE GIFT] Recebido em tempo real: ${data.from?.name} -> ${data.toUser?.name} (${data.quantity}x ${data.gift?.name})`);
        };
        
        // Escutar o novo evento de presente em tempo real
        socketService.on('live_gift_received', handleNewGift);
        socketService.on('gift_received', handleNewGift);

        return () => {
            socketService.off('receive_message', handleNewMessage);
            socketService.off('gift_received', handleNewGift);
            socketService.off('live_gift_received', handleNewGift);
        };
    }, [streamer.id, updateLiveSession, currentUser.id, t, onOpenFriendRequests, liveSession, refreshStreamRoomData]);

    const handleSendMessage = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (chatInput.trim() === '' || !currentUser) return;
        const messagePayload: ChatMessageType = {
            id: Date.now(),
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
        };
        setMessages(prev => [...prev, messagePayload]);
        socketService.sendMessage(streamer.id, messagePayload);
        setChatInput('');
    };

    const handleTogglePrivacy = async () => {
        if (!isBroadcaster) return;
        const newPrivacy = !streamer.isPrivate;
        try {
            await api.updateStream(streamer.id, { isPrivate: newPrivacy });
            onStreamUpdate({ isPrivate: newPrivacy });
        } catch (error) {
        }
    };

    const handleFollowStreamer = () => {
        if (streamerUser) {
            onFollowUser(streamerUser, streamer.id);
        }
    };

    const handleFollowChatUser = (userToFollow: User) => {
        onFollowUser(userToFollow, streamer.id);
        setFollowedUsers(prev => new Set(prev).add(userToFollow.id));
    };

    const handleLike = async () => {
        try {
            if (isLiked) {
                // Remover like
                const response = await api.unlikeStream(streamer.id, currentUser.id);
                if (response?.success) {
                    setLikes(response.totalLikes);
                    setIsLiked(false);
                }
            } else {
                // Dar like
                const response = await api.likeStream(streamer.id, currentUser.id);
                if (response?.success) {
                    setLikes(response.totalLikes);
                    setIsLiked(true);
                }
            }
        } catch (error) {
            console.error('Erro ao dar like:', error);
        }
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Monitorar status de publish usando apenas controle do backend (SRS apenas para ingestão)
    useEffect(() => {
        if (!isBroadcaster) return;

        // Status baseado no backend - SRS não controla status
        const checkPublishStatus = async () => {
            try {
                // Status da live vem do backend, não do SRS
                const isStreamActive = streamer.isLive && streamer.streamStatus === 'live';
                
                if (isStreamActive) {
                    // Stream está ativo conforme controle do backend
                    const publishActive = streamPublishService.isPublishing();
                    setPublishStatus({
                        state: publishActive ? 'publishing' : 'connecting' as any,
                        streamId: streamer.streamKey,
                        streamUrl: streamer.playbackUrl,
                        lastUpdate: new Date()
                    });
                } else {
                    // Stream não está ativo no backend
                    setPublishStatus({
                        state: 'idle',
                        streamId: streamer.streamKey,
                        streamUrl: streamer.playbackUrl,
                        lastUpdate: new Date()
                    });
                }
            } catch (error) {
                console.error('[SRS-API] Erro ao consultar status:', error);
                const publishState = streamPublishService.getState();
                setPublishStatus({
                    state: publishState === 'failed' ? 'error' : 'idle',
                    streamId: streamer.streamKey,
                    streamUrl: streamer.playbackUrl,
                    lastUpdate: new Date(),
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        };

        // Verificar status a cada 3 segundos (API SRS)
        const interval = setInterval(checkPublishStatus, 3000);
        checkPublishStatus(); // Verificar imediatamente

        return () => {
            clearInterval(interval);
        };
    }, [isBroadcaster, streamer.streamKey, streamer.playbackUrl]);

    
    // Cleanup apenas do sistema de beleza ao desmontar
    // NÃO parar WebRTC automaticamente - live só encerra por ação do usuário
    useEffect(() => {
        return () => {
            // Parar processamento de beleza ao sair da sala
            if (beautyWebRTCIntegration.isBeautyActive()) {
                beautyWebRTCIntegration.stopBeautyProcessing();
                console.log('Sistema de beleza limpo ao sair da sala');
            }
            
            // IMPORTANTE: NÃO parar WebRTC ao sair da sala
            // A live só deve ser encerrada quando usuário clicar em "encerrar transmissão"
            // Sair da tela não pode derrubar a transmissão
        };
    }, []); // Sem dependências para evitar re-execução

    // activeScreen é controlado pela prop setActiveScreen do componente pai


    const handleInvite = (opponent: User) => {
        setIsCoHostModalOpen(false);
        onStartPKBattle(opponent);
    };

    const handleOpenCoHostModal = (e: React.MouseEvent, mode?: 'cohost' | 'battle') => {
        e.stopPropagation();
        setIsToolsOpen(false);
        setCoHostModalMode(mode || 'cohost');
        setIsCoHostModalOpen(true);
    };

    const handleOpenBeautyPanel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsToolsOpen(false);
        setBeautyPanelOpen(true);
    };

    const handleOpenClarityPanel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsToolsOpen(false);
        setResolutionPanelOpen(true);
    };

    const handleSelectResolution = async (resolution: string) => {
        const { success, stream } = await api.updateVideoQuality(streamer.id, resolution, currentUser.id);
        if (success && stream) {
            setCurrentResolution(resolution);
            onStreamUpdate({ quality: resolution });
            addToast(ToastType.Success, `Qualidade do vídeo alterada para ${resolution}`);
        } else {
            addToast(ToastType.Error, `Falha ao alterar a qualidade do vídeo.`);
        }
        setResolutionPanelOpen(false);
    };

    const handleOpenTimerSettings = () => {
        onOpenPKTimerSettings();
    };

    const constructUserFromMessage = (user: ChatMessageType): User => {
        // Usar ID real do usuário de fullUser, não da mensagem
        const userId = user.fullUser?.id || user.id || Date.now();
        const userName = user.user || user.fullUser?.name || 'Usuário Anônimo';
        
        return {
            id: userId.toString(),
            identification: user.fullUser?.identification || userId.toString(),
            name: userName,
            avatarUrl: user.avatar || user.fullUser?.avatarUrl || `https://picsum.photos/seed/${userId}/200/200`,
            coverUrl: user.fullUser?.coverUrl || `https://picsum.photos/seed/${userId}/400/600`,
            country: 'br',
            gender: user.gender || 'not_specified',
            level: user.level || 1,
            xp: 0,
            age: user.age || 18,
            location: 'Brasil',
            distance: 'desconhecida',
            fans: 0,
            following: 0,
            receptores: streamerUser?.receptores || 0,
            enviados: streamerUser?.enviados || 0,
            topFansAvatars: [],
            isLive: false,
            diamonds: 0,
            earnings: 0,
            earnings_withdrawn: 0,
            bio: 'Usuário da plataforma',
            obras: [],
            curtidas: [],
            ownedFrames: [],
            activeFrameId: user.activeFrameId || null,
            frameExpiration: user.frameExpiration || null,
        };
    };

    const handleViewChatUserProfile = (user: ChatMessageType) => {
        if (!user.user || !user.avatar) return;
        const userProfile = constructUserFromMessage(user);
        onViewProfile(userProfile);
    };

    const handleSendGift = async (gift: Gift, quantity: number, isSimulation?: boolean) => {
        try {
            const totalCost = gift.price || 0;
            if (!isSimulation && currentUser.diamonds < totalCost) {
                handleRecharge();
                return;
            }

            // Validação robusta do currentUser
            if (!currentUser || !currentUser.id) {
                console.error('handleSendGift: Usuário inválido', currentUser);
                addToast(ToastType.Error, "Erro ao enviar presente. Tente novamente.");
                return;
            }

            // Validação robusta do streamer
            if (!streamer || !streamer.id || !streamer.hostId) {
                console.error('handleSendGift: Streamer inválido', streamer);
                addToast(ToastType.Error, "Erro ao enviar presente. Tente novamente.");
                return;
            }

            // Optimistic UI Update for sender
            const giftPayload: GiftPayload = {
                fromUser: currentUser,
                toUser: { id: streamer.hostId, name: streamer.name || 'Streamer' },
                gift,
                quantity,
                roomId: streamer.id,
                id: Date.now() + Math.random() // IMPORTANT: Ensure ID is unique per click
            };

            // Enviar presento imediatamente (optimistic UI)
            postGiftChatMessage(giftPayload);
            setFullscreenGiftQueue(prev => [...prev, giftPayload]);
            (socketService as any).sendGift(
                streamer.id,
                currentUser.id as any,
                currentUser.name,
                currentUser.avatarUrl || 'https://via.placeholder.com/40',
                (streamer.hostId || streamer.id) as any,
                streamer.name || 'Streamer',
                streamer.avatar || 'https://via.placeholder.com/40',
                gift.name,
                gift.name,
                gift.icon || '🎁',
                gift.price || 0,
                quantity
            );

            if (isSimulation) {
                addToast(ToastType.Success, `[SIMULAÇÃO] Presente ${gift.name} enviado para demonstração!`);
                return;
            }

            // Now, call the API in the background
            try {
                const { success, error, updatedSender, updatedReceiver } = await api.sendGift(currentUser.id, streamer.id, streamer.id, gift.name, quantity);

                if (success && updatedSender) {
                    // 🔧 SINCRONIZAÇÃO: Usar dados reais da API (banco de dados) para atualizar o remetente
                    updateUser(updatedSender);
                    // Remetente atualizado com dados da API

                    // 🔧 SINCRONIZAÇÃO: Atualizar streamer/destinatário se disponível
                    if (updatedReceiver) {
                        // Atualizar streamerUser se for o mesmo usuário
                        if (streamerUser && streamerUser.id === updatedReceiver.id) {
                            // Atualizar o streamerUser com dados frescos
                            setStreamerUser(updatedReceiver);
                            // Streamer atualizado com dados da API
                        }

                        // Atualizar liveSession coins com valor real retornado pelo banco
                        if (liveSession && updatedReceiver.receptores !== undefined) {
                            updateLiveSession({ coins: updatedReceiver.receptores });
                            // Contador da live sincronizado com receptores reais
                        } else if (liveSession) {
                            const addedValue = gift.price * quantity;
                            updateLiveSession({ coins: (liveSession.coins || 0) + addedValue });
                        }
                    }

                    if (gift.triggersAutoFollow && !isFollowed && streamerUser) {
                        onFollowUser(streamerUser, streamer.id);
                    }

                    // 🔧 SINCRONIZAÇÃO: Atualizar ranking de online users com contribuição do remetente
                    // O ranking deve refletir os dados reais do banco de dados
                    setOnlineUsers(prev => {
                        const existing = prev.find(u => u.id === currentUser.id);
                        const totalValue = gift.price * quantity;
                        if (existing) {
                            return prev.map(u => u.id === currentUser.id
                                ? { ...u, value: (u.value || 0) + totalValue }
                                : u
                            ).sort((a, b) => (b.value || 0) - (a.value || 0));
                        } else {
                            const newEntry = { ...currentUser, value: totalValue } as User & { value: number };
                            return [...prev, newEntry].sort((a, b) => (b.value || 0) - (a.value || 0));
                        }
                    });

                    // Atualizar contador de moedas via refreshStreamRoomData (busca dados reais)
                    refreshStreamRoomData(streamer.id);

                } else {
                    throw new Error(error || "Failed to send gift on server");
                }
            } catch (apiError) {
                console.error('Erro na API ao enviar presente:', apiError);
                // O presente já foi enviado via WebSocket, só loga o erro
                // Não mostra erro para usuário para não atrapalhar experiência
            }
        } catch (error) {
            console.error('Erro geral em handleSendGift:', error);
            addToast(ToastType.Error, "Falha ao enviar o presente. Tente novamente.");
        }
    };

    const handleRecharge = () => {
        // Abre WalletScreen como modal local dentro da live (não fecha o modal de presentes)
        setIsWalletOpen(true);
    };

    const handlePurchaseDiamonds = (pkg: { diamonds: number; price: number }) => {
        // Abre ConfirmPurchaseScreen com o pacote selecionado
        setSelectedPackage(pkg);
        setIsWalletOpen(false);
    };

    const handleConfirmPurchase = async (pkg: { diamonds: number; price: number }) => {
        try {
            // Confirmar compra após pagamento aprovado
            const updatedUser = await api.getCurrentUser();
            if (updatedUser) {
                updateUser(updatedUser);
                addToast(ToastType.Success, `Compra de ${pkg.diamonds} diamantes realizada com sucesso!`);
            }
            setSelectedPackage(null);
        } catch (error) {
            addToast(ToastType.Error, 'Erro ao atualizar dados do usuário');
        }
    };

    const handleOpenUserActions = (chatUser: ChatMessageType) => {
        if (!isBroadcaster || !chatUser.user) return;
        if (chatUser.user === streamer.name || chatUser.user === currentUser.name) return;
        const userForModal = constructUserFromMessage(chatUser);
        setUserActionModalState({ isOpen: true, user: userForModal });
    };
    const handleCloseUserActions = () => {
        setUserActionModalState({ isOpen: false, user: null });
    };
    const handleKickUser = (user: User) => {
        // 🔐 PROTEÇÃO DO DONO - VERIFICAÇÃO DUPLA NO FRONTEND
        const APP_OWNER_ID = ':98501723';
        
        if (user.id === APP_OWNER_ID) {
            console.log('🛡️ [FRONTEND_PROTECTION] Tentativa de expulsar dono bloqueada no frontend!');
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

    const handleToggleMicrophone = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) return;
        await api.toggleMicrophone(streamer.id);
    };

    const handleToggleSound = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) {
            setIsLocalMuted(prev => {
                const updatedMuted = !prev;
                addToast(ToastType.Info, updatedMuted ? 'Áudio da live silenciado localmente.' : 'Áudio da live ativado localmente.');
                return updatedMuted;
            });
            return;
        }
        addToast(ToastType.Info, !(liveSession?.isStreamMuted) ? 'Áudio da live silenciado.' : 'Áudio da live ativado.');
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

    const handleToggleAutoPrivateInvite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) return;
        const newAutoInviteState = !isAutoPrivateInviteEnabled;
        try {
            await api.toggleAutoPrivateInvite(streamer.id, newAutoInviteState);
            addToast(ToastType.Success, newAutoInviteState ? 'Convite automático ativado.' : 'Convite automático desativado.');
        } catch (error) {
            addToast(ToastType.Error, "Falha ao alterar a configuração.");
        }
    };

    const topContributors = onlineUsers.filter(u => u.value > 0).slice(0, 3);

    
    return (
        <div className="absolute inset-0 bg-gray-900 text-white font-sans z-10"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseUp={(e) => handlePointerUp(e.clientX, e.clientY)}
            onTouchStart={(e) => handlePointerDown(e.targetTouches[0].clientX, e.targetTouches[0].clientY)}
            onTouchEnd={(e) => handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
        >
            {/* Renderizar ChatScreen quando showChatScreen for true */}
            {showChatScreen && (
                <ChatScreen
                    currentUser={currentUser}
                    onOpenProfile={onViewProfile}
                    onBack={() => setShowChatScreen(false)}
                    isModal={false}
                    user={currentUser}
                    onNavigateToFriends={() => { }}
                    onFollowUser={onFollowUser}
                    onBlockUser={() => { }}
                    onReportUser={() => { }}
                    onOpenPhotoViewer={() => { }}
                />
            )}

            {/* 1. Video Layer (Bottom) */}
            <div className="absolute inset-0 z-0 bg-black">
                {/* Fallback Image - Visible only for viewers when video is NOT playing */}
                {!isBroadcaster && !isVideoPlaying && (
                    <img
                        src={streamerUser?.coverUrl || streamerUser?.avatarUrl || streamer.avatar}
                        key={streamerUser?.coverUrl || streamerUser?.avatarUrl || streamer.avatar}
                        className="absolute inset-0 w-full h-full object-cover z-10"
                        alt="Stream background"
                        onError={(e) => {
                            // Fallback to placeholder image if main image fails
                            const target = e.target as HTMLImageElement;
                            target.src = `https://picsum.photos/seed/streamer-${streamer.id}/800/600.jpg`;
                        }}
                    />
                )}

                {/* Video Layer - Player HLS profissional */}
                <LivePlayer url={getStreamUrl()} streamId={streamer.streamKey || streamer.id} isBroadcaster={isBroadcaster} userId={currentUser.id} onPlaying={() => setIsVideoPlaying(true)} onError={() => setIsVideoPlaying(false)} muted={!isBroadcaster && isLocalMuted} />

                {/* Dark Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/70 pointer-events-none transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0'}`} style={{ zIndex: 15 }}></div>
            </div>

            {/* 2. Gift Animation Layers */}
            <div className="absolute top-24 left-3 z-30 pointer-events-none flex flex-col-reverse items-start">
                <GiftQueueManager
                    gifts={giftQueue}
                    onAnimationEnd={(id) => {
                        // Remover da fila quando a animação terminar
                        setGiftQueue(prev => prev.filter(g => g.id !== id));
                    }}
                    maxConcurrent={3}
                    maxQueueSize={50}
                />
            </div>

            <FullScreenGiftAnimation
                payload={currentFullscreenGift}
                onEnd={handleFullscreenGiftAnimationEnd}
            />

            {/* 3. Header UI */}
            <header className={`p-3 bg-transparent absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-start">
                    {/* Left side */}
                    <div className="flex items-start space-x-2">
                        <div className="flex flex-col space-y-2">
                            {/* Publish Status Indicator simplificado (apenas para broadcasters) - TEMPORARIAMENTE ESCONDIDO */}
                            {false && isBroadcaster && (
                                <div className={`flex items-center space-x-2 rounded-lg px-3 py-2 mb-2 ${
                                    publishStatus.state === 'publishing' ? 'bg-green-900/50' :
                                    (publishStatus.state as string) === 'connecting' ? 'bg-blue-900/50' :
                                    (publishStatus.state as string) === 'failed' || (publishStatus.state as string) === 'network_error' ? 'bg-red-900/50' :
                                    'bg-gray-800'
                                }`}>
                                    <div className={`w-4 h-4 ${
                                        publishStatus.state === 'publishing' ? 'text-green-400 animate-pulse' :
                                        (publishStatus.state as string) === 'connecting' ? 'text-blue-400' :
                                        (publishStatus.state as string) === 'failed' || (publishStatus.state as string) === 'network_error' ? 'text-red-400' :
                                        'text-gray-400'
                                    }`}>
                                        {publishStatus.state === 'publishing' ? (
                                            <svg fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                            </svg>
                                        ) : (publishStatus.state as string) === 'connecting' ? (
                                            <div className="animate-spin">...</div>
                                        ) : (
                                            <svg fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-medium ${
                                            publishStatus.state === 'publishing' ? 'text-green-400' :
                                            (publishStatus.state as string) === 'connecting' ? 'text-blue-400' :
                                            (publishStatus.state as string) === 'failed' || (publishStatus.state as string) === 'network_error' ? 'text-red-400' :
                                            'text-gray-400'
                                        }`}>
                                            {publishStatus.state === 'publishing' ? 'Ao Vivo' :
                                             (publishStatus.state as string) === 'connecting' ? 'Conectando...' :
                                             (publishStatus.state as string) === 'failed' || (publishStatus.state as string) === 'network_error' ? 'Falha na Conexão' :
                                             'Inativo'}
                                        </div>
                                        {publishStatus.state === 'publishing' && (
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-green-400">LIVE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Streamer Info */}
                            <button onClick={(e) => { e.stopPropagation(); streamerDisplayUser && onViewProfile(streamerDisplayUser); }} className="flex items-center bg-black/40 rounded-full p-1 pr-3 space-x-2 text-left">
                                <div className="relative flex-shrink-0">
                                    <div className="live-ring-animated">
                                        <AvatarWithFrame
                                            user={streamerDisplayUser || ({
                                                id: streamer.hostId,
                                                name: streamer.name,
                                                avatarUrl: streamer.avatar,
                                                identification: streamer.hostId,
                                                level: 1,
                                                diamonds: 0,
                                                fans: 0,
                                                following: 0,
                                                receptores: 0,
                                                enviados: 0,
                                                earnings: 0,
                                                earnings_withdrawn: 0,
                                                ownedFrames: [],
                                                isOnline: true,
                                                isVIP: false,
                                                isAvatarProtected: false
                                            } as User)}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{streamerDisplayUser?.name || streamer.name}</p>
                                    <div className="flex items-center space-x-1 text-gray-300 text-xs">
                                        <ViewerIcon className="w-4 h-4" />
                                        <span>{Math.max(1, liveSession?.viewers || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </button>
                            {/* G and Heart icons */}
                            <div className="flex items-center space-x-2 pl-1">
                                <button onClick={(e) => { e.stopPropagation(); setIsRankingOpen(true); }} className="flex items-center bg-black/40 rounded-full px-2 py-1 space-x-1 text-xs cursor-pointer">
                                    <GoldCoinWithGIcon className="w-4 h-4" />
                                    <span className="text-white font-semibold">{(() => {
                                        const coins = liveSession?.coins || 0;
                                        return coins.toLocaleString();
                                    })()}</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleLike(); }} 
                                    className={`flex items-center bg-black/40 rounded-full px-2 py-1 space-x-1 text-xs cursor-pointer transition-all duration-200 ${
                                        isLiked ? 'bg-red-500/30' : 'hover:bg-black/60'
                                    }`}
                                >
                                    <HeartIcon className={`w-4 h-4 transition-colors duration-200 ${
                                        isLiked ? 'text-red-500 fill-current' : 'text-white'
                                    }`} />
                                    <span className="text-white font-semibold">
                                        {(() => {
                                            const likesCount = likes || 0;
                                            if (likesCount >= 1000) {
                                                return (likesCount / 1000).toFixed(1) + 'K';
                                            }
                                            return likesCount.toString();
                                        })()}
                                    </span>
                                </button>
                                {isBroadcaster && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTogglePrivacy(); }}
                                        className="bg-black/40 rounded-full px-3 py-1 text-xs text-white"
                                    >
                                        {streamer.isPrivate ? 'Privada' : 'Pública'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Add button */}
                        {!isFollowed && currentUser.id !== streamer.hostId && (
                            <button onClick={(e) => { e.stopPropagation(); handleFollowStreamer(); }} className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white mt-1 shrink-0">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                            {topContributors.map((user, index) => (
                                <RankedAvatar
                                    key={user.id}
                                    user={user}
                                    rank={index + 1}
                                    onClick={onViewProfile}
                                />
                            ))}

                            {/* Notifications / Viewers button */}
                            {/* FIX: Corrected typo for state setter from 'setIsOnlineUsersOpen' to 'setOnlineUsersOpen'. */}
                            <button onClick={(e) => { e.stopPropagation(); setOnlineUsersOpen(true); }} className="flex items-center bg-black/40 rounded-full px-2.5 py-1.5 space-x-1 text-sm cursor-pointer">
                                <BellIcon className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-semibold">{Math.max(1, onlineUsers.length)}</span>
                            </button>

                            {/* Close button */}
                            <button onClick={(e) => { e.stopPropagation(); isBroadcaster ? onRequestEndStream() : onLeaveStreamView(); }} className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center shrink-0">
                                <CloseIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="pr-1">
                            <div className="bg-black/40 rounded-full px-3 py-1 text-xs text-gray-300">
                                ID: {streamer.hostId}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 4. Chat & Footer UI */}
            <div className={`absolute bottom-0 left-0 right-0 w-full transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {!isBroadcaster && (
                    <div ref={chatContainerRef} className="max-h-[33vh] h-full overflow-y-auto no-scrollbar flex flex-col pointer-events-auto px-3">
                        <div className="space-y-2 mt-auto">
                            {messages.map((msg) => {
                                if (msg.type === 'entry' && msg.fullUser) {
                                    return <EntryChatMessage
                                        key={msg.id}
                                        user={msg.fullUser}
                                        currentUser={currentUser}
                                        onClick={onViewProfile}
                                        onFollow={onFollowUser}
                                        isFollowed={followingUsers.some(u => u.id === msg.fullUser!.id)} />;
                                }
                                if (msg.type === 'chat' && msg.user && msg.avatar) {
                                    const chatUser = constructUserFromMessage(msg);
                                    const shouldShowFollow = !isBroadcaster && chatUser.id !== currentUser.id && chatUser.name !== streamer.name;

                                    return <ChatMessage
                                        key={msg.id}
                                        userObject={chatUser}
                                        message={msg.message}
                                        onAvatarClick={() => handleViewChatUserProfile(msg)}
                                        onFollow={shouldShowFollow ? () => handleFollowChatUser(chatUser) : undefined}
                                        isFollowed={followedUsers.has(chatUser.id)}
                                        onModerationClick={isBroadcaster && isModerationMode && msg.user !== currentUser.name && msg.user !== streamer.name ? () => handleOpenUserActions(msg) : undefined}
                                        isModerator={msg.isModerator}
                                    />;
                                }
                                if (msg.type === 'follow' && msg.user && msg.followedUser) {
                                    return <FollowChatMessage key={msg.id} follower={msg.user} followed={msg.followedUser} level={msg.level} />;
                                }
                                if (msg.type === 'friend_request' && msg.follower) {
                                    return <FriendRequestNotification key={msg.id} followerName={msg.follower.name} onClick={onOpenFriendRequests} />;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                )}

                <footer className="p-3 pointer-events-auto">
                    <div className="flex items-center space-x-2">
                        <div className="flex-grow bg-black/40 rounded-full flex items-center pr-1.5" onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                placeholder={t('streamRoom.sayHi')}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                className="flex-grow bg-transparent px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none"
                            />
                            <button onClick={handleSendMessage} className="bg-gray-500/50 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-400/50 transition-colors"><SendIcon className="w-5 h-5 text-white" /></button>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setGiftModalOpen(true); }} className="bg-black/40 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"><GiftIcon className="w-6 h-6 text-yellow-400" /></button>
                        {!isBroadcaster && (
                            <button onClick={(e) => { e.stopPropagation(); onOpenPrivateChat(); }} className="bg-black/40 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"><MessageIcon className="w-6 h-6 text-white" /></button>
                        )}
                        {isBroadcaster && (
                            <button onClick={(e) => { e.stopPropagation(); setIsToolsOpen(true); }} className="bg-black/40 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"><MoreIcon className="w-6 h-6 text-white" /></button>
                        )}
                    </div>
                </footer>
            </div>

            {/* 5. Modals & Overlays */}
            {/* FIX: Corrected typo for state setter from 'setIsOnlineUsersOpen' to 'setOnlineUsersOpen'. */}
            {isOnlineUsersOpen && (
                <OnlineUsersModalAny 
                    onClose={() => setOnlineUsersOpen(false)} 
                    streamId={streamer.id} 
                    userId={currentUser.id} 
                    currentUser={currentUser} 
                    onSelectUser={(selectedUser: any) => {
                        setOnlineUsersOpen(false);
                        setUserActionModalState({ isOpen: true, user: selectedUser });
                    }}
                />
            )}
            {isBroadcaster && (
                <ToolsModalAny
                    isOpen={isToolsOpen}
                    onClose={() => setIsToolsOpen(false)}
                    onOpenCoHostModal={handleOpenCoHostModal}
                    isPKBattleActive={false}
                    onOpenBeautyPanel={handleOpenBeautyPanel}
                    onOpenPrivateChat={(e: any) => { e.stopPropagation(); onOpenPrivateChat(); }}
                    onOpenPrivateInviteModal={(e: any) => { e.stopPropagation(); onOpenPrivateInviteModal(); }}
                    onOpenClarityPanel={handleOpenClarityPanel}
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
                    isHost={isBroadcaster}
                    addToast={addToast}
                />
            )}
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} />}
            <ResolutionPanel isOpen={isResolutionPanelOpen} onClose={() => setResolutionPanelOpen(false)} onSelectResolution={handleSelectResolution} currentResolution={currentResolution} />
            <CoHostModal isOpen={isCoHostModalOpen} mode={coHostModalMode} onClose={() => setIsCoHostModalOpen(false)} onInvite={handleInvite} onOpenTimerSettings={handleOpenTimerSettings} currentUser={currentUser} addToast={addToast} streamId={streamer.id} />
            {isRankingOpen && <ContributionRankingModal onClose={() => setIsRankingOpen(false)} liveRanking={Object.values(rankingData || {}).flat().map((u: any) => ({ ...u, value: u?.contribution || 0 }))} currentUser={currentUser} />}

            <GiftModal
                isOpen={isGiftModalOpen}
                onClose={() => setGiftModalOpen(false)}
                userDiamonds={currentUser.diamonds ?? 0}
                onSendGift={handleSendGift}
                onRecharge={handleRecharge}
                gifts={gifts}
                receivedGifts={receivedGifts}
                isBroadcaster={isBroadcaster}
                onOpenVIPCenter={onOpenVIPCenter}
                isVIP={currentUser.isVIP || false}
                currentUser={currentUser}
            />
            {isWalletOpen && (
                <WalletScreen
                    onClose={() => setIsWalletOpen(false)}
                    onPurchase={handlePurchaseDiamonds}
                    initialTab="Diamante"
                    isBroadcaster={isBroadcaster}
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
            <UserActionModal
                isOpen={userActionModalState.isOpen}
                onClose={handleCloseUserActions}
                user={userActionModalState.user}
                currentUser={currentUser}
                streamer={streamer as unknown as User}
                onViewProfile={(user) => { handleCloseUserActions(); onViewProfile(user); }}
                onMention={handleMentionUser}
                onMakeModerator={handleMakeModerator}
                onKick={handleKickUser}
            />

                                            </div>
    );
};

export default StreamRoom;

