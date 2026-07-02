
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
import { socketService } from '../services/socket';
import { LoadingSpinner } from './Loading';
import UserActionModal from './UserActionModal';
import FriendRequestNotification from './live/FriendRequestNotification';
import { RankedAvatar } from './live/RankedAvatar';
import FullScreenGiftAnimation from './live/FullScreenGiftAnimation';
import GiftQueueManager from './live/GiftQueueManager';

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
        connect: connectLiveKit,
        disconnect: disconnectLiveKit,
        connectionState: lkState,
        localParticipant: lkLocal,
        remoteParticipants: lkRemotes
    } = useLiveKit();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Fetch Token and Connect to LiveKit SFU Room
    useEffect(() => {
        let active = true;
        const isBroadcasterUser = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);
        
        const initLiveKit = async () => {
            try {
                console.log(`[PK-LiveKit] Requesting credentials for live room: ${streamer.id}`);
                const res = await livekitApi.getLiveKitToken(streamer.id, currentUser.id, isBroadcasterUser);
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

    // Handle Local Camera Stream binding (Left Column)
    useEffect(() => {
        const video = localVideoRef.current;
        if (!video) return;

        let localTrack: MediaStreamTrack | null = null;
        const isBroadcasterUser = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);
        
        if (lkLocal) {
            // Retrieve local video track from LiveKit state
            const videoPub = Array.from(lkLocal.tracks.values()).find((pub: any) => pub.source === 'camera') as any;
            if (videoPub && videoPub.track) {
                localTrack = videoPub.track;
                video.srcObject = new MediaStream([localTrack]);
                video.style.transform = 'scaleX(-1)'; // mirror
            }
        }

        // Fallback to standard preview stream if LiveKit is not active yet
        if (!localTrack && isBroadcasterUser) {
            navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 } }, audio: false })
                .then(stream => {
                    if (video) {
                        video.srcObject = stream;
                        video.style.transform = 'scaleX(-1)';
                    }
                })
                .catch(err => {
                    console.warn('[PKBattle] Fallback preview stream failed:', err);
                });
        }

        return () => {
            if (video) video.srcObject = null;
        };
    }, [lkLocal, streamer?.hostId, currentUser?.id]);

    // Handle Remote Opponent Video Track binding (Right Column)
    useEffect(() => {
        const video = remoteVideoRef.current;
        if (!video) return;

        // Find opponent from remotes
        const oppParticipant = lkRemotes.find(p => p.identity === opponent.id);
        if (oppParticipant) {
            const videoPub = Array.from(oppParticipant.tracks.values()).find((pub: any) => pub.source === 'camera') as any;
            if (videoPub && videoPub.track) {
                video.srcObject = new MediaStream([videoPub.track]);
                video.style.transform = 'scaleX(1)';
                return;
            }
        }

        // Clean if not found
        video.srcObject = null;
    }, [lkRemotes, opponent.id]);
        
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
        coverUrl: `https://picsum.photos/seed/${streamer.hostId}/400/800`, country: streamer.country || 'br',
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

            // Sincronizar via socket unificado
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
        id: `user-${user.id}`, identification: `user-${user.id}`, name: user.user!, avatarUrl: user.avatar!, 
        coverUrl: `https://picsum.photos/seed/${user.id}/400/600`, country: 'br', 
        gender: user.gender || 'not_specified', level: user.level || 1, xp: 0, age: user.age || 18, 
        location: 'Brasil', distance: 'desconhecida', fans: 0, following: 0, receptores: 0, enviados: 0,
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
            id: Date.now(),
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
        const handleNewMessage = (message: any) => { if (message.roomId === streamer.id) setMessages(prev => [...prev, message]); };
        const handleHeartUpdate = (data: { roomId: string, heartsA: number, heartsB: number }) => {
             if (data.roomId === streamer.id) {
                setMyHearts(data.heartsA);
                setOpponentHearts(data.heartsB);
            }
        };

        const handleNewGift = (payload: GiftPayload) => {
            if (payload.roomId !== streamer.id) return;
        
            // 1. Add to Chat
            postGiftChatMessage(payload);

            // 2. Only queue effects if NOT from current user (sender logic handled in handleSendGift)
            if (payload.fromUser.id !== currentUser.id) {
                const securePayload = { ...payload, id: payload.id || (Date.now() + Math.random()) };
                // Add to Fullscreen Effect Queue
                setEffectsQueue(prev => [...prev, securePayload]);
                
                // Add to Banner Notification
                const newBanner = { ...securePayload, id: nextGiftId.current++ };
                setBannerGifts(prev => [...prev, newBanner].slice(-5));
            }
        };

        const handleFollowUpdate = (payload: { follower: User, followed: User, isUnfollow: boolean }) => {
            if (payload.isUnfollow) return; 

            const { follower, followed } = payload;
            
            const newMessage: ChatMessageType = (followed.id === currentUser.id)
                ? { id: Date.now(), type: 'friend_request', follower: follower }
                : { id: Date.now(), type: 'follow', user: follower.name, followedUser: followed.name, avatar: follower.avatarUrl };

            setMessages(prev => [...prev, newMessage]);
        };


        // Real-time socket subscriptions for the PK Battle Screen
        socketService.on('receive_message', handleNewMessage);
        socketService.on('gift_received', handleNewGift);
        socketService.on('live_gift_received', handleNewGift);
    
        return () => {
            socketService.off('receive_message', handleNewMessage);
            socketService.off('gift_received', handleNewGift);
            socketService.off('live_gift_received', handleNewGift);
        };
    }, [streamer.id, t, currentUser.id, onOpenFriendRequests]);

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

    useEffect(() => {
        if (timeLeft <= 0) {
            onEndPKBattle();
            return;
        }
        const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timerId);
    }, [streamer.id, t, currentUser.id, onOpenFriendRequests]);

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
        // Simplificado - sem WebSocket para navegação isolada
        // webSocketManager.sendStreamMessage(streamer.id, chatInput.trim());
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
            {/* Top Split Stream View Container */}
            <div className="relative w-full h-[52vh] min-h-[380px] flex-shrink-0 bg-zinc-950 overflow-hidden" onClick={handleHeartClick}>
                {/* Background Stream Columns */}
                <div className="absolute inset-0 grid grid-cols-2 bg-black">
                    {/* Host Camera Stream (Left Column) */}
                    <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                        <img 
                            src={streamerUser.coverUrl} 
                            alt={streamerUser.name} 
                            className="absolute inset-0 w-full h-full object-cover grayscale-[0.02] mix-blend-lighten pointer-events-none opacity-20 z-10" 
                        />
                    </div>
                    {/* Opponent Camera Stream (Right Column) */}
                    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                        <img 
                            src={opponent.coverUrl} 
                            alt={opponent.name} 
                            className="absolute inset-0 w-full h-full object-cover mix-blend-lighten pointer-events-none opacity-20 z-10" 
                        />
                    </div>
                </div>

                {/* Golden Thin Vertical Separator Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#fcd34d] -translate-x-1/2 z-10 pointer-events-none" />

                {/* Banner Notifications Overlay */}
                <div className="absolute top-28 left-3 z-30 pointer-events-none flex flex-col-reverse items-start">
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

                {/* Split Float Header over Columns */}
                <header className={`absolute top-0 left-0 right-0 p-3 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Left Half Header: Host Item */}
                    <div className="flex items-start space-x-2">
                        <div className="relative">
                            {/* Avatar Frame with pink gradient ring */}
                            <div className="w-[42px] h-[42px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#FF2D55] via-purple-600 to-indigo-500 flex items-center justify-center">
                                <img src={streamerDisplayUser.avatarUrl} alt={streamerDisplayUser.name} className="w-full h-full rounded-full object-cover border border-black/50" />
                            </div>
                            {/* Overlapping Pink "+" Button Badge */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleFollowStreamer(streamerUser); }}
                                className="absolute -right-1 -bottom-1 w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-md hover:scale-110 active:scale-95 transition-all border-none cursor-pointer"
                            >
                                +
                            </button>
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

                    {/* Right Half Header: Opponent Item */}
                    <div className="flex items-start space-x-2 text-right">
                        <div className="flex flex-col items-end">
                            <h4 className="text-white font-bold text-xs leading-tight tracking-wide drop-shadow-md flex items-center gap-1">
                                {opponent.name} <span className="text-purple-400 text-[10px]">🎵</span>
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

                        {/* Split Header Action Icons */}
                        <div className="flex items-center space-x-1.5 ml-1.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsOnlineUsersOpen(true); }}
                                className="bg-black/30 hover:bg-black/50 p-1.5 rounded-full flex items-center justify-center text-white transition-all scale-90 border-none cursor-pointer focus:outline-none"
                            >
                                <BellIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-[10px] font-bold text-white ml-0.5">0</span>
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
                
                {/* VS Progress Bar and Score Details aligned under Header */}
                <div className={`w-full px-4 absolute top-[68px] left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Pink and Blue split Progress Bar with yellow center VS badge */}
                    <div className="relative w-full h-[10px] bg-zinc-850 rounded-full overflow-visible flex items-center">
                        <div 
                            className="h-full bg-gradient-to-r from-pink-500 to-[#FF2D55] rounded-l-full transition-all duration-500" 
                            style={{ width: `${myProgress}%` }}
                        />
                        <div 
                            className="h-full bg-gradient-to-r from-[#007AFF] to-[#0A84FF] rounded-r-full transition-all duration-500 flex-grow" 
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full font-black text-[9px] text-black px-1.5 py-0.5 border border-white shadow-md z-30 select-none pb-[1px]" 
                            style={{ left: `${myProgress}%` }}
                        >
                            VS
                        </div>
                    </div>

                    {/* Left/Right Score labels and transclucent Timer capsule */}
                    <div className="flex justify-between items-center mt-2.5">
                        <div className="flex items-center space-x-1 text-left">
                            <StarIcon className="w-3.5 h-3.5 text-pink-500 fill-current" />
                            <span className="font-extrabold text-[13px] text-white tracking-tight drop-shadow">
                                {myScore.toLocaleString()}
                            </span>
                            <span className="font-semibold text-[11px] text-gray-400 drop-shadow">
                                ({myHearts})
                            </span>
                        </div>

                        {/* Floating Timer Badge */}
                        <div className="bg-black/65 border border-white/[0.08] backdrop-blur-md rounded-full px-4 py-1 text-white font-mono text-[13px] font-bold shadow-lg flex items-center justify-center">
                            {formatTime(timeLeft)}
                        </div>

                        <div className="flex items-center space-x-1 text-right">
                            <span className="font-semibold text-[11px] text-gray-400 drop-shadow">
                                ({opponentHearts})
                            </span>
                            <StarIcon className="w-3.5 h-3.5 text-blue-500 fill-current" />
                            <span className="font-extrabold text-[13px] text-white tracking-tight drop-shadow">
                                {opponentScore.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Flat Solid Black Area for Public Chat scrolling content and controls */}
            <div className={`flex-1 flex flex-col bg-black justify-between min-h-0 relative ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} data-chat-container>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col space-y-2.5 justify-end">
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

                <footer className="p-3 bg-transparent pointer-events-auto">
                    <div className="flex items-center gap-3" data-purpose="bottom-controls">
                        <div className="flex-grow">
                            <input 
                                type="text"
                                placeholder={t('streamRoom.sayHi')}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-sm text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Share/Send Action */}
                            <button 
                                onClick={handleSendMessage} 
                                className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                            >
                                <SendIcon className="w-5 h-5 text-white" />
                            </button>
                            {/* Gift Action */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setGiftModalOpen(true); }} 
                                className="hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                            >
                                <img 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3" 
                                    alt="Gift Icon" 
                                    className="w-9 h-9 object-cover rounded-full shadow-lg" 
                                />
                            </button>
                            {/* More Options / Tools Modal wrapper for broadcasters/spectators */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsToolsOpen(true); }} 
                                className="text-white hover:opacity-85 transition-opacity cursor-pointer shrink-0 border-none bg-transparent focus:outline-none"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="5" cy="12" r="2"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                    <circle cx="19" cy="12" r="2"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
            
            {hearts.map(heart => (
              <div key={heart.id} className="heart-anim pointer-events-none" style={{ left: `${heart.x - 16}px`, top: `${heart.y - 16}px` }}>
                <HeartIcon className={`w-8 h-8 ${heart.side === 'mine' ? 'text-pink-500' : 'text-blue-500'}`} />
              </div>
            ))}
            
            {isOnlineUsersOpen && (
                <OnlineUsersModal 
                    onClose={() => setIsOnlineUsersOpen(false)} 
                    streamId={streamer.id} 
                    userId={currentUser.id} 
                    currentUser={currentUser} 
                    onSelectUser={(selectedUser: any) => {
                        setIsOnlineUsersOpen(false);
                        setUserActionModalState({ isOpen: true, user: selectedUser });
                    }}
                />
            )}
            {isRankingOpen && <ContributionRankingModal onClose={() => setIsRankingOpen(false)} liveRanking={onlineUsers} />}
            
            <ToolsModalAny 
                isOpen={isToolsOpen} 
                onClose={() => setIsToolsOpen(false)} 
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
