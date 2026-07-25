
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveKit } from '../hooks/useLiveKit';
import OnlineUsersModal from './live/OnlineUsersModal';
import ChatMessage from './live/ChatMessage';
import CoHostModal from './CoHostModal';
import EntryChatMessage from './live/EntryChatMessage';
import ToolsModal from './ToolsModal';
const ToolsModalAny: any = ToolsModal;
import ResolutionPanel from './live/ResolutionPanel';
import BeautyEffectsPanel from './live/BeautyEffectsPanel';
import { GiftIcon, MessageIcon, SendIcon, MoreIcon, CloseIcon, PlusIcon, ViewerIcon, StarIcon, HeartIcon, GoldCoinWithGIcon, BellIcon } from './icons';
import { Streamer, User, Gift, RankedUser, LiveSessionState, ToastType } from '../types';
import ContributionRankingModal from './ContributionRankingModal';
import GiftModal from './live/GiftModal';
import GiftAnimationOverlay, { GiftPayload } from './live/GiftAnimationOverlay';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { livekitApi } from '../services/livekit/livekitApi';
// Socket.IO removido — comunicação PK via LiveKit DataChannel + REST API
import { LoadingSpinner } from './Loading';
import UserActionModal from './UserActionModal';
import FriendRequestNotification from './live/FriendRequestNotification';
import { RankedAvatar } from './live/RankedAvatar';
import FullScreenGiftAnimation from './live/FullScreenGiftAnimation';
import GiftQueueManager from './live/GiftQueueManager';
import LivePlayer from './LivePlayer';

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
        <div className="bg-purple-500/30 rounded-[18px] p-1.5 px-3 flex items-center self-start text-xs">
            <span className="text-purple-300 font-bold">{follower}</span>
            <span className="text-gray-200 ml-1.5">{t('streamRoom.followed')}</span>
            <span className="text-purple-300 font-bold ml-1.5">{followed}! 🎉</span>
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
    const [timeLeft, setTimeLeft] = useState(pkBattleDuration * 60);
    const timeLeftRef = useRef(timeLeft);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [myHearts, setMyHearts] = useState(0);
    const [opponentHearts, setOpponentHearts] = useState(0);
    const [hearts, setHearts] = useState<Heart[]>([]);

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
    const nextGiftId = useRef(0);

    const [isSendingGift, setIsSendingGift] = useState(false);
    const [isLocalMuted, setIsLocalMuted] = useState(false);

    // Real-time LiveKit SFU hook for PK Battle
    const {
        room: lkRoom,
        connect: connectLiveKit,
        disconnect: disconnectLiveKit,
        connectionState: lkState,
        localParticipant: lkLocal,
        remoteParticipants: lkRemotes
    } = useLiveKit();

    const [isOpponentConnected, setIsOpponentConnected] = useState(false);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const selfPreviewRef = useRef<HTMLVideoElement>(null);

    // Fetch Token and Connect to LiveKit SFU Room for PK interactive tracks
    useEffect(() => {
        let active = true;
        const isBroadcasterUser = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);
        
        const initLiveKit = async () => {
            try {
                console.log(`[PK-LiveKit] Requesting credentials for live room: ${streamer.id}`);
                const pkRoomName = `live_${streamer.id}`;
                console.log('[PK-LiveKit] Room name (alinhado com chat):', pkRoomName);
                const res = await livekitApi.getLiveKitToken(pkRoomName, currentUser.id, isBroadcasterUser);
                if (res.success && active) {
                    await connectLiveKit(res.serverUrl, res.token);
                }
            } catch (err) {
                console.error('[PK-LiveKit] Connection failed:', err);
            }
        };

        initLiveKit();

        return () => {
            active = false;
            disconnectLiveKit();
        };
    }, [streamer.id, currentUser.id, opponent]);

    // Handle Local Camera Stream for self-preview overlay (LiveKit tracks)
    // NOTE: The main left column uses LivePlayer (SRS) for the public stream.
    // This self-preview is just a small PIP overlay for the broadcaster.
    useEffect(() => {
        const video = selfPreviewRef.current;
        if (!video) return;

        let localTrack: MediaStreamTrack | null = null;
        const isBroadcasterUser = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);
        
        if (lkLocal) {
            const videoPub = Array.from(lkLocal.tracks.values()).find((pub: any) => pub.source === 'camera') as any;
            if (videoPub && videoPub.track) {
                localTrack = videoPub.track;
                video.srcObject = new MediaStream([localTrack]);
                video.style.transform = 'scaleX(-1)'; // mirror
            }
        }

        // Fallback to standard preview stream if LiveKit is not active yet
        if (!localTrack && isBroadcasterUser) {
            navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 } }, audio: false })
                .then(stream => {
                    if (video) {
                        video.srcObject = stream;
                        video.style.transform = 'scaleX(-1)';
                    }
                })
                .catch(err => {
                    console.warn('[PKBattle] Self-preview fallback stream failed:', err);
                });
        }

        return () => {
            if (video) video.srcObject = null;
        };
    }, [lkLocal, streamer?.hostId, currentUser?.id]);

    // Handle Remote Opponent Video Track binding (Right Column) via LiveKit
    useEffect(() => {
        const video = remoteVideoRef.current;
        if (!video) return;

        // Find opponent from remotes — identity pode ser 'streamer_{id}' ou apenas '{id}'
        const opponentIdentity = opponent.id;
        const opponentStreamerIdentity = `streamer_${opponent.id}`;
        
        const oppParticipant = lkRemotes.find(p => 
            p.identity === opponentIdentity || 
            p.identity === opponentStreamerIdentity ||
            p.identity === `viewer_${opponent.id}`
        );
        
        if (oppParticipant && oppParticipant.tracks) {
            const videoPub = Array.from(oppParticipant.tracks.values()).find((pub: any) => 
                pub.source === 'camera' || pub.trackName === 'camera'
            ) as any;
            if (videoPub && videoPub.track) {
                video.srcObject = new MediaStream([videoPub.track]);
                video.style.transform = 'scaleX(1)';
                setIsOpponentConnected(true);
                return;
            }
        }

        video.srcObject = null;
        setIsOpponentConnected(false);
    }, [lkRemotes, opponent.id]);
    
    // Build SRS stream URL for the LivePlayer (left column — public stream via SRS)
    const getStreamUrl = () => {
        if (streamer.hlsUrl) return streamer.hlsUrl;
        const httpBase = import.meta.env.VITE_SRS_HTTP_URL || (
            typeof window !== 'undefined' && window.location
            ? `${window.location.origin}/srs`
            : '/srs'
        );
        return `${httpBase}/live/${streamer.id}.m3u8`;
    };
        
    const isBroadcaster = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);

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
    const handleCloseUserActions = () => {
        setUserActionModalState({ isOpen: false, user: null });
    };
    const handleKickUser = (user: User) => {
        // 🔐 PROTEÇÃO DO DONO - VERIFICAÇÃO DUPLA NO FRONTEND
        const APP_OWNER_ID = '65384127';
        
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

    const totalScore = myScore + opponentScore;
    const myProgress = totalScore > 0 ? (myScore / totalScore) * 100 : 50;
    
    const isStreamerFollowed = useMemo(() => followingUsers.some(u => u.id === streamer.hostId), [followingUsers, streamer.hostId]);

    const streamerUser = useMemo(() => ({
        id: streamer.hostId, identification: streamer.hostId, name: streamer.name, avatarUrl: streamer.avatar,
        coverUrl: `https://picsum.photos/seed/${streamer.hostId}/400/800`, country: streamer.country || 'global',
        age: 23, gender: 'female' as 'female', level: 1, location: streamer.location, distance: 'desconhecida',
        fans: 0, following: 0, receptores: 0, enviados: 0, topFansAvatars: [], isLive: true,
        diamonds: 0, earnings: 0, 
        earnings_withdrawn: 0, bio: 'Amante de streams!', obras: [], curtidas: [], 
        xp: 0, ownedFrames: [], activeFrameId: null, frameExpiration: null
    } as User), [streamer]);

    const streamerDisplayUser = isBroadcaster ? currentUser : streamerUser;

    // Simplificado - sem frames para navegação isolada
    const frameGlowClass = '';

    const handleRecharge = () => {
        setGiftModalOpen(false);
    };

    const postGiftChatMessage = (payload: GiftPayload) => {
        const { fromUser, gift, toUser, quantity } = payload;
        const messageKey = quantity > 1 ? 'streamRoom.sentMultipleGiftsMessage' : 'streamRoom.sentGiftMessage';
        const messageOptions = { quantity, giftName: gift.name, receiverName: toUser.name };

        const giftMessage: ChatMessageType = {
            id: Date.now() + Math.random(),
            type: 'chat',
            user: fromUser.name,
            level: fromUser.level,
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
            // Optimistic UI Update Payload
            const giftPayload: GiftPayload = {
                fromUser: currentUser,
                toUser: { id: streamer.hostId, name: streamer.name },
                gift,
                quantity,
                roomId: streamer.id,
                id: Date.now() + Math.random() // Unique ID
            };

            // 1. Add to Chat immediately
            postGiftChatMessage(giftPayload);

            // 2. Queue Fullscreen Effect immediately
            setEffectsQueue(prev => [...prev, giftPayload]);

            // 3. Show Banner Notification immediately
            const newBanner = { ...giftPayload, id: nextGiftId.current++ };
            setBannerGifts(prev => [...prev, newBanner].slice(-5));

            // Sincronizar via LiveKit data channel
            if (lkRoom && lkRoom.state === 'connected') {
                lkRoom.sendChatMessage({
                    type: 'gift_sent',
                    fromUser: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl, level: currentUser.level },
                    toUser: { id: streamer.hostId || streamer.id, name: streamer.name },
                    gift: { name: gift.name, icon: gift.icon || '🎁', price: gift.price || 0 },
                    quantity,
                    roomId: streamer.id
                });
            }

            if (isSimulation) {
                // Simplesmente termina aqui na simulação
                return;
            }

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
                handleRecharge();
            }
        } finally {
            setIsSendingGift(false);
        }
    };

    const handleBannerAnimationEnd = (id: number) => {
        setBannerGifts(prev => prev.filter(g => g.id !== id));
    };

    const constructUserFromMessage = (user: ChatMessageType): User => ({ 
        avatar: user.avatar || '',
        id: `user-${user.id}`, identification: `user-${user.id}`, name: user.user!, avatarUrl: user.avatar!, 
        coverUrl: `https://picsum.photos/seed/${user.id}/400/600`, country: streamerUser?.country || 'global', 
        gender: user.gender || 'not_specified', level: user.level || 1, xp: 0, age: user.age || 18, 
        location: streamerUser?.location || 'Global', distance: 'desconhecida', fans: 0, following: 0, receptores: 0, enviados: 0,
        topFansAvatars: [], isLive: false, diamonds: 0, earnings: 0, 
        earnings_withdrawn: 0, bio: 'Usuário da plataforma', obras: [], curtidas: [], 
        ownedFrames: [], activeFrameId: user.activeFrameId || null, frameExpiration: user.frameExpiration || null,
    });
    
    const handleViewChatUserProfile = (user: ChatMessageType) => {
        if (!user.user || !user.avatar) return;
        const userProfile = constructUserFromMessage(user);
        onViewProfile(userProfile);
    };

    useEffect(() => {
        setMyScore(liveSession?.coins || 0);
        const opponentInitialScore = Math.floor((liveSession?.coins || 0) * (Math.random() * 0.4 + 0.8));
        setOpponentScore(opponentInitialScore);
    }, [liveSession?.coins]);
    
    const handleHeartClick = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const side = clickX < rect.width / 2 ? 'mine' : 'opponent';
      
      const newHeart: Heart = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY, side };
      setHearts(prev => [...prev, newHeart]);

      if (side === 'mine') setMyHearts(prev => prev + 1);
      else setOpponentHearts(prev => prev + 1);
      
      api.sendPKHeart(streamer.id, side === 'mine' ? 'A' : 'B');

      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 2000);
    };

    useEffect(() => {
        const currentUserEntryMessage: ChatMessageType = {
            id: Date.now() + Math.random(),
            type: 'entry',
            fullUser: currentUser,
        };
        setMessages([currentUserEntryMessage]);
    
        // DESABILITADO: getOnlineUsers causando polling repetitivo
        // api.getOnlineUsers(streamer.id).then(users => {
        //     setOnlineUsers(users || []);
        //     previousOnlineUsersRef.current = users || [];
        // });
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
                            id: Date.now() + Math.random(),
                            type: 'entry',
                            fullUser: user,
                        }));
                        setMessages(prev => [...prev, ...entryMessages]);
                    }
                }
                setOnlineUsers(newUsers);
                previousOnlineUsersRef.current = newUsers;
            }
        };
        // Socket.IO removido — eventos PK via LiveKit DataChannel + CustomEvents
        const handleHeartUpdate = (data: { roomId: string, heartsA: number, heartsB: number }) => {
             if (data.roomId === streamer.id) {
                setMyHearts(data.heartsA);
                setOpponentHearts(data.heartsB);
            }
        };

        // Socket.IO removido — gifts via LiveKit DataChannel
        const handleFollowUpdate = (payload: { follower: User, followed: User, isUnfollow: boolean }) => {
            if (payload.isUnfollow) return; 

            const { follower, followed } = payload;
            
            const newMessage: ChatMessageType = (followed.id === currentUser.id)
                ? { id: Date.now() + Math.random(), type: 'friend_request', follower: follower }
                : { id: Date.now() + Math.random(), type: 'follow', user: follower.name, followedUser: followed.name, avatar: follower.avatarUrl };

            setMessages(prev => [...prev, newMessage]);
        };


        // Socket.IO removido — mensagens/gifts/recebimento via LiveKit DataChannel
    
        return () => {
        };
    }, [streamer.id, t, currentUser.id, onOpenFriendRequests]);

    // Escutar todas as mensagens do LiveKit data channel (chat + pk sync)
    useEffect(() => {
        if (!lkRoom) return;

        const handleDataReceived = (data: any) => {
            if (!data || !data.type) return;
            // Mensagens de chat
            if (data.type === 'chat_message' || data.type === 'chat') {
                const stableId = Date.now() + Math.random();
                setMessages(prev => {
                    return [...prev, { ...data, type: 'chat', id: stableId }];
                });
            }
            // Sync de estado PK
            else if (data.type === 'pk_state_sync') {
                setOpponentScore(prev => Math.max(prev, data.opponentScore || 0));
                if (data.timeLeft !== undefined && Math.abs(data.timeLeft - timeLeftRef.current) > 5) {
                    setTimeLeft(data.timeLeft);
                }
                if (data.opponentHearts !== undefined) {
                    setOpponentHearts(data.opponentHearts);
                }
            }
            // Comandos PK (end_battle etc)
            else if (data.type === 'pk_battle_command') {
                if (data.command === 'end_battle') {
                    addToast(ToastType.Info, 'O oponente encerrou a batalha.');
                    onEndPKBattle();
                }
            }
        };

        lkRoom.on('data_received', handleDataReceived);

        return () => {
            lkRoom.off('data_received', handleDataReceived);
        };
    }, [lkRoom]);

    const handleFollowStreamer = (user: User) => onFollowUser(user, streamer.id);

    useEffect(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!currentEffect && effectsQueue.length > 0) {
            const nextInQueue = effectsQueue[0];
            setCurrentEffect(nextInQueue);
            setEffectsQueue(prev => prev.slice(1));
        }
    }, [currentEffect, effectsQueue]);

    // Enviar estado do PK via LiveKit data channel para sincronização entre participantes
    useEffect(() => {
        if (!lkRoom || lkRoom.state !== 'connected') return;
        
        const interval = setInterval(() => {
            try {
                const pkState = {
                    type: 'pk_state_sync',
                    myScore,
                    opponentScore,
                    timeLeft,
                    myHearts,
                    opponentHearts,
                    timestamp: Date.now()
                };
                lkRoom.sendChatMessage(pkState);
            } catch (e) {
                // silent fail - data channel pode não estar pronto
            }
        }, 5000); // Sync a cada 5 segundos
        
        return () => clearInterval(interval);
    }, [lkRoom, myScore, opponentScore, timeLeft, myHearts, opponentHearts]);

    // Escutar eventos CustomEvent para sincronização de score/timer vindos do backend
    useEffect(() => {
        const handleScoreSync = (e: Event) => {
            const { scoreA, scoreB } = (e as CustomEvent).detail;
            if (scoreA !== undefined) setMyScore(scoreA);
            if (scoreB !== undefined) setOpponentScore(scoreB);
        };
        const handleTimerSync = (e: Event) => {
            const { timeLeft: newTime } = (e as CustomEvent).detail;
            if (newTime !== undefined) setTimeLeft(newTime);
        };
        const handleBattleEnded = () => {
            handleEndBattle();
        };

        window.addEventListener('livego:pk_score_sync', handleScoreSync);
        window.addEventListener('livego:pk_timer_sync', handleTimerSync);
        window.addEventListener('livego:pk_battle_ended', handleBattleEnded);

        return () => {
            window.removeEventListener('livego:pk_score_sync', handleScoreSync);
            window.removeEventListener('livego:pk_timer_sync', handleTimerSync);
            window.removeEventListener('livego:pk_battle_ended', handleBattleEnded);
        };
    }, []);

    // Timer countdown — ao expirar, usar handleEndBattle via ref para evitar re-registros
    useEffect(() => {
        if (timeLeft <= 0) {
            handleEndBattleRef.current();
            return;
        }
        const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    // Tratamento de reconexão do LiveKit
    useEffect(() => {
        if (!lkRoom) return;

        const handleReconnecting = () => {
            addToast(ToastType.Info, 'Reconectando ao servidor PK...');
        };
        const handleReconnected = () => {
            addToast(ToastType.Success, 'PK reconectado!');
            // Re-enviar estado atual para o oponente
            try {
                const pkState = {
                    type: 'pk_state_sync',
                    myScore,
                    opponentScore,
                    timeLeft,
                    myHearts,
                    opponentHearts,
                    timestamp: Date.now()
                };
                lkRoom.sendChatMessage(pkState);
            } catch (e) {
                // silent
            }
        };
        const handleDisconnected = () => {
            addToast(ToastType.Error, 'Conexão PK perdida. A batalha será encerrada.');
            setTimeout(() => handleEndBattle(), 3000);
        };

        lkRoom.on('reconnecting', handleReconnecting);
        lkRoom.on('reconnected', handleReconnected);
        lkRoom.on('disconnected', handleDisconnected);

        return () => {
            lkRoom.off('reconnecting', handleReconnecting);
            lkRoom.off('reconnected', handleReconnected);
            lkRoom.off('disconnected', handleDisconnected);
        };
    }, [lkRoom, myScore, opponentScore, timeLeft, myHearts, opponentHearts]);

    // Override do onEndPKBattle para enviar comando de fim via LiveKit antes de encerrar
    const handleEndBattle = () => {
        if (lkRoom && lkRoom.state === 'connected') {
            try {
                lkRoom.sendChatMessage({ type: 'pk_battle_command', command: 'end_battle' });
            } catch (e) {
                // silent
            }
        }
        onEndPKBattle();
    };
    const handleEndBattleRef = useRef(handleEndBattle);
    handleEndBattleRef.current = handleEndBattle;

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
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

    const handleSendMessage = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (chatInput.trim() === '' || !currentUser) return;
        
        // Construir payload da mensagem
        const messagePayload: ChatMessageType = {
            id: Date.now() + Math.random(),
            type: 'chat',
            user: currentUser.name,
            level: currentUser.level,
            message: chatInput.trim(),
            avatar: currentUser.avatarUrl || '',
            gender: currentUser.gender,
            age: currentUser.age,
            activeFrameId: currentUser.activeFrameId,
            frameExpiration: currentUser.frameExpiration,
            fullUser: currentUser,
        };
        
        const safePayload = {
            ...messagePayload,
            avatar: messagePayload.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`,
            roomId: streamer.id, // Incluir roomId para que receptores possam filtrar
        };
        
        // Otimista: adicionar mensagem localmente
        setMessages(prev => [...prev, safePayload]);
        
        // Enviar via LiveKit data channel
        if (lkRoom && lkRoom.state === 'connected') {
            lkRoom.sendChatMessage(safePayload);
        } else {
            console.warn('[PKBattle] Chat não enviado — LiveKit não conectado');
        }
        
        setChatInput('');
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

    if (!opponent) return <div className="absolute inset-0 bg-black flex items-center justify-center"><LoadingSpinner /></div>;

    return (
        <div className="absolute inset-0 bg-[#000000] flex flex-col font-sans text-white z-10 select-none">
            {/* ═══════════════════════════════════════════════════════════
               PROFESSIONAL PICTURE-IN-PICTURE PK BATTLE LAYOUT
               
               ARQUITETURA:
               - Fundo fullscreen: Host video (SRS HLS/WHEP) — stream pública
               - Janela PiP flutuante: Opponent video (LiveKit remote track)
               - Mini-PiP: Self-preview (LiveKit local camera) para broadcaster
               - VS Banner: overlay centralizado no topo
               - Chat: sobreposição no bottom
               ═══════════════════════════════════════════════════════════ */}
            
            {/* Main Video Container — full height, host video as background */}
            <div 
                className="relative w-full h-full bg-zinc-950 overflow-hidden"
                onClick={handleHeartClick}
            >
                {/* ─── LAYER 1: Host Video (Full Background via SRS) ─── */}
                <div className="absolute inset-0 bg-black">
                    <LivePlayer
                        url={getStreamUrl()}
                        streamId={streamer.streamKey || streamer.id}
                        isBroadcaster={isBroadcaster}
                        userId={currentUser.id}
                        muted={!isBroadcaster && isLocalMuted}
                    />
                    {/* Subtle dark vignette overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />
                    {/* Fallback cover while player connects */}
                    <img 
                        src={streamerUser.coverUrl} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover mix-blend-lighten pointer-events-none opacity-10" 
                    />
                </div>

                {/* ─── LAYER 2: Floating PiP — Opponent Video (LiveKit) ─── */}
                {/* 
                    Professional PiP styling (top-right corner, like Zoom/Google Meet):
                    - Positioned top-right to avoid overlapping with chat input at bottom
                    - ~25% width with 9:16 aspect ratio (portrait video call feel)
                    - 14px rounded corners with thick glowing border
                    - Glassmorphism backdrop when opponent not connected
                    - Smooth scale+opacity entrance animation
                    - Team-colored shadow glow
                */}
                <div 
                    className={`absolute sm:top-4 top-[72px] right-3 z-30 transition-all duration-500 ease-out
                        ${isOpponentConnected 
                            ? 'opacity-100 scale-100 translate-x-0' 
                            : 'opacity-80 scale-95 translate-x-2'
                        }`}
                    style={{
                        width: 'min(26%, 170px)',
                        minWidth: '100px',
                        maxWidth: '170px',
                        aspectRatio: '9 / 16',
                    }}
                >
                    {/* Glowing border ring — team blue/cyan gradient */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-700 ${
                        isOpponentConnected 
                            ? 'shadow-[0_0_30px_rgba(0,122,255,0.4)] border-[2.5px] border-white/40' 
                            : 'shadow-[0_0_15px_rgba(0,122,255,0.15)] border-[2px] border-white/15'
                    }`} />
                    
                    {/* Video element */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/80 backdrop-blur-sm">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                                isOpponentConnected ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                        
                        {/* Placeholder when opponent not connected */}
                        {!isOpponentConnected && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900/95 via-zinc-800/90 to-black/95 backdrop-blur-xl">
                                {/* Animated pulsing avatar placeholder */}
                                <div className="relative mb-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 p-[2px] animate-pulse">
                                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                                            <img 
                                                src={opponent.avatarUrl} 
                                                alt={opponent.name}
                                                className="w-full h-full rounded-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Small loading spinner */}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-black">
                                        <svg className="animate-spin w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-blue-200/70 text-[9px] font-medium tracking-wide">AGUARDANDO</p>
                                <p className="text-white/50 text-[8px] mt-0.5">{opponent.name}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Opponent name badge — glassmorphism overlay at bottom of PiP */}
                    <div className={`absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-500 ${
                        isOpponentConnected ? 'opacity-100' : 'opacity-0'
                    }`}>
                        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-2 px-2.5 rounded-b-2xl">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-500/30 ring-1 ring-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img src={opponent.avatarUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-white text-[9px] font-bold truncate drop-shadow-lg">
                                    {opponent.name}
                                </span>
                                <span className="ml-auto text-blue-300 text-[7px] font-semibold">LIVE</span>
                            </div>
                            {/* Small score indicator */}
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                <span className="text-blue-200/70 text-[7px] font-medium">
                                    {opponentScore.toLocaleString()} pts
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── LAYER 3: Self-Preview (Mini PiP) — only for broadcaster ─── */}
                {isBroadcaster && (
                    <div 
                        className="absolute bottom-3 left-3 z-30 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                        style={{
                            width: '70px',
                            aspectRatio: '9 / 16',
                        }}
                    >
                        <video
                            ref={selfPreviewRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Glossy label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-1 px-1.5">
                            <span className="text-white text-[6px] font-bold tracking-wide">VOCÊ</span>
                        </div>
                    </div>
                )}

                {/* ─── LAYER 4: VS Battle Banner (centered top) ─── */}
                <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Gradient header background */}
                    <div className="bg-gradient-to-b from-black/70 via-black/30 to-transparent pb-12 pt-4 px-4">
                        {/* VS Progress Bar */}
                        <div className="relative w-full h-1.5 bg-zinc-800/60 rounded-full overflow-visible flex items-center">
                            {/* Pink (host) bar */}
                            <div 
                                className="h-full bg-gradient-to-r from-pink-500 to-[#FF2D55] rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(255,45,85,0.4)]" 
                                style={{ width: `${myProgress}%` }}
                            />
                            {/* Blue (opponent) bar */}
                            <div 
                                className="h-full bg-gradient-to-r from-[#007AFF] to-[#0A84FF] rounded-r-full transition-all duration-500 flex-grow shadow-[0_0_8px_rgba(0,122,255,0.4)]" 
                            />
                            {/* VS badge — floating center */}
                            <div 
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full font-black text-[8px] text-black px-2 py-0.5 border border-white/60 shadow-lg shadow-yellow-500/30 z-10 select-none"
                                style={{ left: `${myProgress}%` }}
                            >
                                VS
                            </div>
                        </div>

                        {/* Score row: Host — Timer — Opponent */}
                        <div className="flex justify-between items-center mt-3">
                            {/* Host score */}
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                    <div className="w-7 h-7 rounded-full ring-2 ring-pink-500/60 overflow-hidden flex-shrink-0">
                                        <img src={streamerDisplayUser.avatarUrl} alt={streamerDisplayUser.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white text-[10px] font-bold leading-tight truncate max-w-[80px]">
                                            {streamerDisplayUser.name}
                                        </span>
                                        <span className="text-pink-300 text-[9px] font-bold">
                                            {myScore.toLocaleString()}
                                            <span className="text-pink-400/60 text-[7px] ml-0.5">({myHearts}♥)</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1 border border-white/10 shadow-lg">
                                <span className="text-white font-mono text-[12px] font-bold tracking-wider">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>

                            {/* Opponent score */}
                            <div className="flex items-center gap-1.5 text-right">
                                <div className="flex items-center gap-1 flex-row-reverse">
                                    <div className="w-7 h-7 rounded-full ring-2 ring-blue-500/60 overflow-hidden flex-shrink-0">
                                        <img src={opponent.avatarUrl} alt={opponent.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-white text-[10px] font-bold leading-tight truncate max-w-[80px]">
                                            {opponent.name}
                                        </span>
                                        <span className="text-blue-300 text-[9px] font-bold">
                                            {opponentScore.toLocaleString()}
                                            <span className="text-blue-400/60 text-[7px] ml-0.5">({opponentHearts}♥)</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top-right action buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsOnlineUsersOpen(true); }}
                            className="bg-black/40 hover:bg-black/60 backdrop-blur-md p-2 rounded-full transition-all active:scale-90 border-none cursor-pointer"
                        >
                            <BellIcon className="w-4 h-4 text-yellow-400" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); isBroadcaster ? onRequestEndStream() : onLeaveStreamView(); }}
                            className="bg-black/40 hover:bg-black/60 backdrop-blur-md p-2 rounded-full transition-all active:scale-90 border-none cursor-pointer"
                        >
                            <CloseIcon className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* ─── LAYER 5: Chat Overlay at Bottom ─── */}
                <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Chat messages */}
                    <div ref={chatContainerRef} className="overflow-y-auto no-scrollbar px-3 pt-16 pb-2 flex flex-col gap-1.5 justify-end max-h-[40vh]" style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'
                    }}>
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
                                    onFollow={shouldShowFollow ? () => onFollowUser(chatUser, streamer.id) : undefined}
                                    isFollowed={followingUsers.some(f => f.id === chatUser.id)}
                                    onModerationClick={isBroadcaster && isModerationMode && msg.user !== currentUser.name && msg.user !== streamer.name ? () => handleOpenUserActions(msg) : undefined}
                                    isModerator={msg.isModerator}
                                />;
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

                    {/* Chat input footer */}
                    <footer className="px-3 pb-3 pt-1 pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <div className="flex-grow">
                                <input 
                                    type="text"
                                    placeholder={t('streamRoom.sayHi')}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Send button */}
                                <button 
                                    onClick={handleSendMessage} 
                                    className="rounded-full p-2.5 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                                >
                                    <SendIcon className="w-4 h-4 text-white" />
                                </button>
                                {/* Gift button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setGiftModalOpen(true); }} 
                                    className="hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                                >
                                    <img 
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3" 
                                        alt="Gift" 
                                        className="w-8 h-8 object-cover rounded-full shadow-lg" 
                                    />
                                </button>
                                {/* More options */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsToolsOpen(true); }} 
                                    className="text-white/70 hover:text-white transition-opacity cursor-pointer shrink-0 border-none bg-transparent"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="5" cy="12" r="2"></circle>
                                        <circle cx="12" cy="12" r="2"></circle>
                                        <circle cx="19" cy="12" r="2"></circle>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* ─── LAYER 6: Gift notifications ─── */}
                <div className="absolute top-24 left-3 z-30 pointer-events-none flex flex-col-reverse items-start">
                    <GiftQueueManager
                        gifts={bannerGifts}
                        onAnimationEnd={handleBannerAnimationEnd}
                        maxConcurrent={3}
                        maxQueueSize={50}
                    />
                </div>

                <FullScreenGiftAnimation 
                    payload={currentEffect}
                    onEnd={() => setCurrentEffect(null)}
                />

                {/* ─── LAYER 7: Hearts on click ─── */}
                {hearts.map(heart => (
                    <div key={heart.id} className="heart-anim pointer-events-none fixed" style={{ left: `${heart.x - 16}px`, top: `${heart.y - 16}px` }}>
                        <HeartIcon className={`w-8 h-8 ${heart.side === 'mine' ? 'text-pink-500' : 'text-blue-500'}`} />
                    </div>
                ))}
            </div>

            {/* ─── MODAIS ─── */}
            {isOnlineUsersOpen && (
                <OnlineUsersModal 
                    onClose={() => setIsOnlineUsersOpen(false)} 
                    streamId={streamer.id} 
                    userId={currentUser.id} 
                    currentUser={currentUser} 
                    onSelectUser={(selectedUser: any) => {
                        setIsOnlineUsersOpen(false);
                        if (isBroadcaster) {
                            setUserActionModalState({ isOpen: true, user: selectedUser });
                        } else {
                            onViewProfile(selectedUser);
                        }
                    }}
                />
            )}
            {isRankingOpen && <ContributionRankingModal onClose={() => setIsRankingOpen(false)} liveRanking={onlineUsers} />}
            
            <ToolsModalAny 
                isOpen={isToolsOpen} 
                onClose={() => setIsToolsOpen(false)} 
                onOpenCoHostModal={handleOpenCoHostModal}
                isPKBattleActive={true} 
                onEndPKBattle={(e: any) => { e.stopPropagation(); handleEndBattle(); }}
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
                isHost={isBroadcaster}
                addToast={addToast}
            />
            <GiftModal isOpen={isGiftModalOpen} onClose={() => setGiftModalOpen(false)} userDiamonds={currentUser.diamonds ?? 0} onSendGift={handleSendGift} onRecharge={() => setGiftModalOpen(false)} gifts={gifts} receivedGifts={receivedGifts} isBroadcaster={isBroadcaster} onOpenVIPCenter={onOpenVIPCenter} isVIP={currentUser.isVIP || false} currentUser={currentUser} />
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} />}
            {isCoHostModalOpen && (
                <CoHostModal 
                    isOpen={isCoHostModalOpen} 
                    mode={coHostModalMode} 
                    onClose={() => setIsCoHostModalOpen(false)} 
                    onInvite={()=>{}} 
                    onOpenTimerSettings={onOpenPKTimerSettings} 
                    currentUser={currentUser} 
                    addToast={addToast} 
                    streamId={streamer.id} 
                />
            )}
            <ResolutionPanel isOpen={isResolutionPanelOpen} onClose={() => setResolutionPanelOpen(false)} onSelectResolution={()=>{}} currentResolution={"480p"} />

            <UserActionModal 
                isOpen={userActionModalState.isOpen} 
                onClose={handleCloseUserActions} 
                user={userActionModalState.user}
                currentUser={currentUser}
                streamer={streamerUser as any}
                onViewProfile={(user) => { handleCloseUserActions(); onViewProfile(user); }}
                onMention={handleMentionUser}
                onMakeModerator={handleMakeModerator}
                onKick={handleKickUser}
            />
        </div>
    );
}
