                  import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import OnlineUsersModal from './live/OnlineUsersModal';
const OnlineUsersModalAny: any = OnlineUsersModal;
import ChatMessage from './live/ChatMessage';
import CoHostModal from './CoHostModal';
import EntryChatMessage from './live/EntryChatMessage';
import ChatScreen from './ChatScreen';
import ToolsModal from './ToolsModal';
const ToolsModalAny: any = ToolsModal;
import { GiftIcon, MessageIcon, SendIcon, MoreIcon, CloseIcon, PlusIcon, SoundWaveIcon, ViewerIcon, GoldCoinWithGIcon, HeartIcon, TrophyIcon, BellIcon, RankIcon } from './icons';
import { Streamer, User, Gift, ToastType, RankedUser, LiveSessionState, SrsPublishStatus, SrsPublishState } from '../types';
import ContributionRankingModal from './ContributionRankingModal';
import BeautyEffectsPanel from './live/BeautyEffectsPanel';
import ResolutionPanel from './live/ResolutionPanel';
import GiftModal from './live/GiftModal';
import GiftAnimationOverlay, { GiftPayload } from './live/GiftAnimationOverlay';
import GiftQueueManager from './live/GiftQueueManager';
import WalletScreen from './WalletScreen';
import ConfirmPurchaseScreen from './ConfirmPurchaseScreen';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import UserActionModal from './UserActionModal';
import FriendRequestNotification from './live/FriendRequestNotification';
import { RankedAvatar } from './live/RankedAvatar';
import FullScreenGiftAnimation from './live/FullScreenGiftAnimation';
import { streamPublishService } from '../services/streamPublishService';
// Socket.IO removido — comunicação via LiveKit DataChannel
import AvatarWithFrame from './ui/AvatarWithFrame';
import { beautyWebRTCIntegration } from '../services/BeautyWebRTCIntegration';
import LivePlayer from './LivePlayer';
import { useLiveKitChat } from '../hooks/useLiveKitChat';
import { getLiveKitRoom } from '../services/livekit/livekitRoomService';
import { useNativePiP } from '../hooks/useNativePiP';

interface ChatMessageType {
    id: string | number;
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
    onMinimizeStreamView?: () => void;
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
    onOpenFollowing?: () => void;
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
        <div className="flex items-center gap-2 text-xs bg-transparent rounded-[18px] px-3 py-1 my-0.5 max-w-[95%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-black/10 hover:scale-[1.01] active:scale-[0.98] animate-chat-message whitespace-normal break-words flex flex-wrap">
            <span 
                className="text-[#c084fc] font-extrabold tracking-wide font-sans text-[13px]"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {follower}
            </span>
            
            {/* Glossy Silver metal level badge matching the screenshot */}
            <span className="bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans flex items-center h-[16px]">
                Lvl. {level || 1}
            </span>

            <span 
                className="text-zinc-300 font-sans font-semibold text-[13px] ml-0.5 tracking-wide"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {t('streamRoom.followed')}
            </span>
            <span 
                className="text-[#c084fc] font-extrabold ml-0.5 font-sans text-[13px]"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {followed}! 🎉
            </span>
        </div>
    );
};

// Controle global para evitar múltiplas chamadas simultâneas
const globalFetchControl = new Map<string, boolean>();

const StreamRoom: React.FC<StreamRoomProps> = ({ streamer, onRequestEndStream, onLeaveStreamView, onMinimizeStreamView, onStartPKBattle, onViewProfile, currentUser, onOpenWallet, onFollowUser, onOpenPrivateChat, onOpenPrivateInviteModal, setActiveScreen, onStartChatWithStreamer, onOpenPKTimerSettings, onOpenFans, onOpenFriendRequests, gifts, receivedGifts, updateUser, liveSession, updateLiveSession, logLiveEvent, onStreamUpdate, refreshStreamRoomData, addToast, followingUsers, streamers, onSelectStream, onOpenVIPCenter, rankingData }) => {
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
    const lastLoggedUrlRef = useRef<string>('');
    // Função para gerar URL HLS do stream
    const getStreamUrl = () => {
        // 🎥 USANDO URLs REAIS DO BACKEND
        // Priorizar URL HLS retornada pelo backend para garantir Network requests
        if (streamer.hlsUrl) {
            if (lastLoggedUrlRef.current !== streamer.hlsUrl) {
                console.log(`🔗 [StreamRoom] Usando HLS URL do backend: ${streamer.hlsUrl}`);
                lastLoggedUrlRef.current = streamer.hlsUrl;
            }
            return streamer.hlsUrl;
        }
        
        // Fallback para URL construída via proxy HTTPS (caso backend não retorne hlsUrl)
        const httpBase = import.meta.env.VITE_SRS_HTTP_URL || (typeof window !== 'undefined' && window.location && !window.location.hostname.includes('livego.store') ? `${window.location.origin}/api/video/http` : 'https://api.livego.store/api/video/http');
        const fallbackUrl = `${httpBase}/live/${streamer.id}.m3u8`;
        if (lastLoggedUrlRef.current !== fallbackUrl) {
            console.log(`⚠️ [StreamRoom] Usando fallback HLS URL: ${fallbackUrl}`);
            lastLoggedUrlRef.current = fallbackUrl;
        }
        return fallbackUrl;
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
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const [isAutoPrivateInviteEnabled, setIsAutoPrivateInviteEnabled] = useState(liveSession?.isAutoPrivateInviteEnabled ?? false);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const previousOnlineUsersRef = useRef<(User & { value: number })[]>([]);
    const [moderatorIds, setModeratorIds] = useState<string[]>([]);

    // Estado para likes da transmissão
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    // State to track if video is actually playing to hide the cover image
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isLocalMuted, setIsLocalMuted] = useState(false);

    // Native PiP (out-of-app) hook — ZEGO's pipButton + enableWhenBackground
    const [nativePiPActive, setNativePiPActive] = useState(false);
    const enableWhenBg = currentUser?.enableWhenBackground !== undefined ? currentUser.enableWhenBackground : true;
    const { setVideoRef, requestPiP, exitPiP, isPiPSupported } = useNativePiP({
      onEnterNativePiP: () => {
        setNativePiPActive(true);
        addToast(ToastType.Info, 'Picture-in-Picture ativado. O vídeo continuará mesmo fora do app.');
      },
      onLeaveNativePiP: () => {
        setNativePiPActive(false);
      },
      config: {
        enableWhenBackground: enableWhenBg, // ZEGO's enableWhenBackground — user configurable via Settings
        mediaSessionMetadata: {
          title: streamer.name || 'Live Stream',
          artist: `${currentUser.name} está assistindo`,
          artwork: streamer.avatar
            ? [{ src: streamer.avatar!, sizes: '96x96', type: 'image/jpeg' }]
            : [],
        },
      },
    });

    const [bannerGifts, setBannerGifts] = useState<(GiftPayload & { id: number })[]>([]);
    const nextGiftId = useRef(0);
    const [fullscreenGiftQueue, setFullscreenGiftQueue] = useState<GiftPayload[]>([]);
    const [currentFullscreenGift, setCurrentFullscreenGift] = useState<GiftPayload | null>(null);
    const [giftQueue, setGiftQueue] = useState<GiftPayload[]>([]); // Nova fila para GiftQueueManager
    const [activeLiveInvite, setActiveLiveInvite] = useState<{ inviteId: string; type: string; from: string; fromName: string; streamId: string } | null>(null);

    // Estado para monitoramento de publish SRS
    const [publishStatus, setPublishStatus] = useState<SrsPublishStatus>({
        state: 'idle' as any,
        lastUpdate: new Date()
    });

    const isBroadcaster = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);

    // ═══════════════════════════════════════════════════════════════════
    // ARQUITETURA:
    // - LiveKit: ÚNICA conexão — host publica câmera/microfone,
    //   chat, participantes online, likes, gifts, tudo via Room singleton.
    // - SRS: player HLS para espectadores (recebe RTMP via LiveKit Egress)
    // - Socket.IO: fallback para chat quando LiveKit não disponível
    // ═══════════════════════════════════════════════════════════════════

  const {
    connected: lkChatConnected,
    sendMessage: lkChatSendMessage,
    disconnect: disconnectLkChat,
  } = useLiveKitChat({
    streamId: streamer.id,
    userId: currentUser.id,
    isHost: isBroadcaster,
    disabled: false, // host e viewers conectam na mesma sala live_${streamId}
    onMessage: (data: any) => {
      if (!data || !data.type) return;
      if (data.type === 'chat_message' || data.type === 'chat') {
        setMessages(prev => {
          const stableId = String(data.id || Date.now() + Math.random());
          if (prev.some(m => String(m.id) === stableId)) return prev;
          return [...prev, { ...data, type: 'chat', id: stableId }];
        });
      } else if (data.type === 'live_entry') {
        setMessages(prev => {
          const stableId = String(data.id || Date.now() + Math.random());
          if (prev.some(m => String(m.id) === stableId)) return prev;
          return [...prev, { id: stableId, type: 'entry', user: data.user || data.userName, fullUser: data.fullUser || null }];
        });
      } else if (data.type === 'live_gift_received' || data.type === 'gift_received') {
        const isSelf = data.from?.id === currentUser?.id || data.fromUser?.id === currentUser?.id;
        if (!isSelf) {
          const giftEvtPayload: any = {
            fromUser: { id: data.from?.id || data.fromUser?.id, identification: data.from?.identification || data.fromUser?.identification || data.from?.id, name: data.from?.name || data.fromUser?.name || 'Usuário', avatarUrl: data.from?.avatarUrl || data.fromUser?.avatarUrl || '', level: data.from?.level || data.fromUser?.level || 1, fans: 0, following: 0, receptores: 0, enviados: 0, diamonds: 0, earnings: 0, earnings_withdrawn: 0, ownedFrames: [] },
            toUser: { id: data.toUser?.id, name: data.toUser?.name || 'Streamer' },
            gift: data.gift || { name: data.giftName, price: 0, icon: '🎁', category: 'Popular' },
            quantity: data.quantity || 1, roomId: streamer.id,id: String(data.id || Date.now() + Math.random()),
        };
        setGiftQueue(prev => [...prev, giftEvtPayload]);
          setFullscreenGiftQueue(prev => [...prev, giftEvtPayload]);
          postGiftChatMessage(giftEvtPayload);
        }
      } else if (data.type === 'stream_liked' && data.streamId === streamer.id) {
        setLikes(data.totalLikes);
        if (data.userId === currentUser?.id) setIsLiked(true);
      } else if (data.type === 'stream_unliked' && data.streamId === streamer.id) {
        setLikes(data.totalLikes);
        if (data.userId === currentUser?.id) setIsLiked(false);
      }
    },
    onParticipantConnected: (participant) => {
      console.log('[CHAT] Participante conectado via LiveKit:', participant.identity, 'name:', participant.name);
      setOnlineUsers(prev => {
        if (prev.some(u => u.id === participant.identity)) return prev;
        const newUser = {
          avatar: '',
          id: participant.identity,
          identification: participant.identity,
          name: participant.name || participant.identity,
          avatarUrl: '',
          value: 0,
          level: 1,
          fans: 0,
          following: 0,
          receptores: 0,
          enviados: 0,
          diamonds: 0,
          earnings: 0,
          earnings_withdrawn: 0,
          ownedFrames: [],
        } as User & { value: number };
        console.log('[CHAT] Adicionando à lista de onlineUsers:', newUser.name);
        return [...prev, newUser];
      });
    },
    onParticipantDisconnected: (participant) => {
      console.log('[CHAT] Participante desconectado via LiveKit:', participant.identity);
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.id !== participant.identity);
        console.log('[CHAT] Removendo da lista de onlineUsers. Antes:', prev.length, 'Depois:', filtered.length);
        return filtered;
      });
    },
    onConnected: () => {
      console.log('[CHAT] LiveKitChat conectado!');
    },
    onDisconnected: () => {
      console.log('[CHAT] LiveKitChat desconectado!');
    },
  });

    // useLiveKit (room.ts) REMOVIDO — tudo unificado via useLiveKitChat.
    // A sala live_${streamId} é a única conexão: mídia (host), chat, eventos.
    // Host publica câmera/microfone pelo Room singleton após useLiveKitChat conectar.
    // Viewers recebem as tracks automaticamente via SFU (canSubscribe: true).

    // HOST-MEDIA: Após useLiveKitChat conectar, host publica câmera/microfone
    // pelo Room singleton (mesmo usado para chat/eventos).
    // Melhorias: usar refs para evitar recriação de MediaStream em rerenders
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const egressIdRef = useRef<string | null>(null);
    const isPublishingRef = useRef(false);
    const isConnectingRef = useRef(false);

    const publishMedia = useCallback(async () => {
        if (isPublishingRef.current || isConnectingRef.current) {
            console.log('[HOST-LK] Já publicando ou conectando, ignorando...');
            return;
        }

        isConnectingRef.current = true;
        
        try {
            const room = getLiveKitRoom();
            if (room.state !== 'connected') {
                console.log('[HOST-LK] Room não conectado, aguardando...');
                isConnectingRef.current = false;
                return;
            }

            // Reutilizar MediaStream se já existir
            if (!mediaStreamRef.current) {
                console.log('[HOST-LK] Criando nova MediaStream...');
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 360 } },
                    audio: true,
                });
            } else {
                console.log('[HOST-LK] Reutilizando MediaStream existente');
            }

            const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
            if (videoTrack && !videoTrack.enabled) {
                videoTrack.enabled = true;
            }
            
            if (videoTrack) {
                await room.localParticipant.publishTrack(videoTrack, { name: 'camera' });
                console.log('[HOST-LK] ✅ Câmera publicada via Room singleton');
            }
            
            const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
            if (audioTrack && !audioTrack.enabled) {
                audioTrack.enabled = true;
            }
            
            if (audioTrack) {
                await room.localParticipant.publishTrack(audioTrack, { name: 'microphone' });
                console.log('[HOST-LK] ✅ Microfone publicado via Room singleton');
            }

            isPublishingRef.current = true;

            // Iniciar Egress RTMP para enviar stream ao SRS
            // Isso permite que espectadores assistam via HLS
            const roomId = `live_${streamer.id}`;
            try {
                console.log('[EGRESS] Iniciando RTMP Egress para SRS...');
                const egressResult = await api.startRTMPEgress(roomId, streamer.id);
                if (egressResult.success && egressResult.egressId) {
                    egressIdRef.current = egressResult.egressId;
                    console.log('[EGRESS] ✅ RTMP Egress iniciado:', egressIdRef.current);
                } else {
                    console.warn('[EGRESS] ⚠️ Falha ao iniciar Egress:', egressResult);
                }
            } catch (egressErr) {
                console.error('[EGRESS] ❌ Erro ao iniciar Egress:', egressErr);
            }
        } catch (err) {
            console.warn('[HOST-LK] Falha ao publicar mídia:', err);
        } finally {
            isConnectingRef.current = false;
        }
    }, [streamer.id]);

    useEffect(() => {
        if (!isBroadcaster || !lkChatConnected) return;

        // Pequeno delay para garantir que a Room esteja totalmente conectada
        const timer = setTimeout(() => {
            publishMedia();
        }, 500);

        return () => {
            clearTimeout(timer);
            // Não desconectar no cleanup - isso é apenas rerenderização
            // A desconexão real acontece quando o componente é desmontado
        };
    }, [isBroadcaster, lkChatConnected, publishMedia]);

    // Cleanup real ao desmontar o componente (não em rerenders)
    useEffect(() => {
        return () => {
            console.log('[HOST-LK] Cleanup: parando publicação e Egress');
            
            // Parar tracks
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(t => {
                    t.stop();
                    t.enabled = false;
                });
                mediaStreamRef.current = null;
            }
            
            // Parar Egress
            if (egressIdRef.current) {
                api.stopEgress(egressIdRef.current).catch(err => {
                    console.warn('[EGRESS] Erro ao parar Egress:', err);
                });
                egressIdRef.current = null;
            }
            
            isPublishingRef.current = false;
            isConnectingRef.current = false;
        };
    }, []);

    // Escutar mensagens de chat via Socket.IO (redundância quando LiveKit não roteia)
    useEffect(() => {
        if (!streamer.id) return;

        const handleNewChatMessage = (message: any) => {
            if (!message) return;
            
            const text = message.text || message.message || '';
            if (!text) return;
            
            // Extrair dados do formato Socket.IO
            const stableId = String(message.id || Date.now() + Math.random());
            const chatMsg: ChatMessageType = {
                id: stableId,
                type: 'chat',
                user: message.userName || message.user || 'Usuário',
                message: text,
                avatar: message.avatarUrl || message.avatar || '',
                level: message.level || 1,
            };

            // Não adicionar se já existe (evitar duplicatas com LiveKit)
            setMessages(prev => {
                if (prev.some(m => String(m.id) === stableId)) return prev;
                return [...prev, chatMsg];
            });
        };


        // Também escutar evento global window (caso socket.ts dispare via CustomEvent)
        const handleWindowChat = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                handleNewChatMessage(detail);
            }
        };
        window.addEventListener('livego:chat_message', handleWindowChat);

        return () => {
window.removeEventListener('livego:chat_message', handleWindowChat);
        };
    }, [streamer.id]);

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
            id: String(Date.now()),
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
        // Socket.IO joinRoom removido — room gerenciado via LiveKit

        // Buscar histórico de mensagens do banco
        api.get("/api/streams/" + streamer.id + "/live-messages?limit=50").then((res: any) => {
            if (res && res.messages && Array.isArray(res.messages)) {
                const history = res.messages.map((m: any) => ({
                    id: String(m._id || m.id || Date.now() + Math.random()),
                    type: "chat" as const,
                    user: m.userName || m.userId,
                    message: m.text,
                    avatar: m.avatarUrl || "",
                    level: m.level || 1,
                    activeFrameId: m.activeFrameId || null,
                    frameExpiration: null,
                }));
                setMessages(prev => [...history, ...prev]);
            }
        }).catch(() => {});

        return () => {
            if (hasJoined) {
                api.leaveStream(streamer.id, currentUser.id).then(success => {
                    if (success) { console.log('✅ Desconectado do stream com sucesso.'); }
                });
            }
            // Socket.IO leaveRoom removido
        };
    }, [streamer.id, currentUser.id]); // Removido onlineUsersInterval das dependências


    useEffect(() => {
        const handleLiveInvite = (e) => {
            const d = e.detail; if (!d) return;
            setActiveLiveInvite({ inviteId: d.inviteId || d.id || "", type: d.type || "co-host", from: d.from || d.fromId || "", fromName: d.fromName || d.from || "Usuário", streamId: d.streamId || "" });
        };
        const handleCallInvite = (e) => {
            const d = e.detail; if (!d) return;
            setActiveLiveInvite({ inviteId: d.inviteId || d.id || "", type: "call", from: d.from || d.fromId || "", fromName: d.fromName || d.from || "Usuário", streamId: d.streamId || streamer.id });
        };
        const clearInvite = () => setActiveLiveInvite(null);
        window.addEventListener("livego:live_invite", handleLiveInvite);
        window.addEventListener("livego:call_invitation", handleCallInvite);
        window.addEventListener("livego:live_invite_timeout", clearInvite);
        window.addEventListener("livego:live_invite_response", clearInvite);
        return () => {
            window.removeEventListener("livego:live_invite", handleLiveInvite);
            window.removeEventListener("livego:call_invitation", handleCallInvite);
            window.removeEventListener("livego:live_invite_timeout", clearInvite);
            window.removeEventListener("livego:live_invite_response", clearInvite);
        };
    }, [streamer.id]);

    const postGiftChatMessage = (payload: GiftPayload) => {
        try {
            const { fromUser, gift, toUser, quantity } = payload;

            // Validação robusta para evitar undefined errors
            if (!fromUser || !fromUser.name || !gift || !toUser || !toUser.name) {
                console.error('postGiftChatMessage: Dados inválidos', { fromUser, gift, toUser, quantity });
                return;
            }

            const giftMessage: ChatMessageType = {
                id: String(Date.now() + Math.random()),
                type: 'chat',
                user: 'Sistema', // Under 'Sistema', ChatMessage styles it with a gorgeous purple glowing border
                level: fromUser.level || 1,
                message: (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-extrabold text-[#c084fc] hover:underline">{fromUser.name}</span>
                        <span className="text-purple-250">enviou {quantity}x {gift.name || 'Presente'} para {toUser.name}!</span>
                        {gift.component ? React.cloneElement(gift.component as React.ReactElement<any>, { className: "w-5 h-5 inline-block" }) : <span className="text-base">{gift.icon || '🎁'}</span>}
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
            // 🔥 Adicionar à fila lateral após a animação em tela cheia terminar
            setGiftQueue(prev => [...prev, currentFullscreenGift]);
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



    const handleSendMessage = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        console.log('[CHAT] handleSendMessage chamado, input:', chatInput.trim(), 'user:', currentUser?.id, 'isBroadcaster:', isBroadcaster, 'lkChatConnected:', lkChatConnected);
        if (chatInput.trim() === '' || !currentUser) { console.log('[CHAT] handleSendMessage ignorado - input vazio ou sem user'); return; }
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
        };
        // Garantir que avatar sempre tenha um valor para ser renderizado no chat
        const stableId = String(Date.now() + Math.random());
        const safePayload = {
            ...messagePayload,
            avatar: messagePayload.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`,
            id: stableId, // Garantir unicidade como string
        };
        setMessages(prev => [...prev, safePayload]);
        
        // Host e viewers: todos usam lkChatSendMessage (sala live_${streamId} compartilhada)
        if (lkChatConnected) {
            lkChatSendMessage({ type: 'chat_message', ...safePayload });
        } else {
            console.warn('[CHAT] LiveKit chat não conectado. Mensagem local apenas.');
        }

        const apiUrl = '/api/streams/' + streamer.id + '/live-message';
        console.log('[CHAT] Persistindo no MongoDB via REST API:', apiUrl, 'streamer:', streamer.id);
        // Persistir no MongoDB via REST API (sem distribuir em tempo real)
        api.post(apiUrl, {
            text: safePayload.message || chatInput.trim(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: safePayload.avatar,
            userLevel: currentUser.level,
        }).then(() => console.log('[CHAT] REST API sucesso')).catch((err: any) => console.warn('[CHAT] REST API erro:', err));
        
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
                    // Transmitir like via LiveKit data channel
                    if (lkChatConnected) { lkChatSendMessage({ type: 'stream_unliked', streamId: streamer.id, totalLikes: response.totalLikes, userId: currentUser.id }); }
                }
            } else {
                // Dar like
                const response = await api.likeStream(streamer.id, currentUser.id);
                if (response?.success) {
                    setLikes(response.totalLikes);
                    setIsLiked(true);
                    // Transmitir like via LiveKit data channel
                    if (lkChatConnected) { lkChatSendMessage({ type: 'stream_liked', streamId: streamer.id, totalLikes: response.totalLikes, userId: currentUser.id }); }
                }
            }
        } catch (error) {
            console.error('Erro ao dar like:', error);
        }
    };

    // Scroll inteligente: só vai para o fim se usuário NÃO tiver scrollado para cima
    const handleChatScroll = useCallback(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
            setIsUserScrolledUp(!isNearBottom);
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current && !isUserScrolledUp) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isUserScrolledUp]);

    // Periodic gold system announcements to simulate live stream events in real-time, free and lightweight
    useEffect(() => {
        // Welcome message on join
        const welcomeTimeout = setTimeout(() => {
            const welcomeId = String(Date.now() + Math.random());
            setMessages(prev => [...prev, {
                id: welcomeId,
                type: 'chat',
                user: 'Sistema',
                message: 'Bem-vindo à sala de transmissão ao vivo! Siga as diretrizes de convivência e apoie o streamer compartilhando a live ou enviando presentes! 🎉',
                level: 1,
            }]);
        }, 1200);

        const systemEvents = [
            'Novo evento de presente ativado! Envie presentes para subir no ranking de patrocinadores!',
            'Toque na tela repetidamente para enviar likes e impulsionar a transmissão!',
            'Quer ter destaque supremo com molduras brilhantes e efeitos de entrada? Adquira já o passe de VIP no perfil!',
            'Dica de segurança: Não compartilhe dados pessoais no chat público. Mantenha a live segura para todos.',
            'O modo PK Battle está liberado! O streamer pode ativar o modo PK para disputar curtidas com outros streamers!',
            'Participe do ranking de contribuição semanal tocando no troféu no cabeçalho.'
        ];

        let index = Math.floor(Math.random() * systemEvents.length);
        const eventInterval = setInterval(() => {
            const nextEvent = systemEvents[index % systemEvents.length];
            const evtId = String(Date.now() + Math.random());
            setMessages(prev => [...prev, {
                id: evtId,
                type: 'chat',
                user: 'Sistema',
                message: nextEvent,
                level: 1,
            }]);
            index++;
        }, 35000); // Send beautifully every 35 seconds

        return () => {
            clearTimeout(welcomeTimeout);
            clearInterval(eventInterval);
        };
    }, [streamer.name]);

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
                        state: publishActive ? SrsPublishState.PUBLISHING : SrsPublishState.CONNECTING,
                        streamId: streamer.streamKey,
                        streamUrl: streamer.playbackUrl,
                        lastUpdate: new Date()
                    });
                } else {
                    // Stream não está ativo no backend
                    setPublishStatus({
                        state: SrsPublishState.IDLE,
                        streamId: streamer.streamKey,
                        streamUrl: streamer.playbackUrl,
                        lastUpdate: new Date()
                    });
                }
            } catch (error) {
                console.error('[SRS-API] Erro ao consultar status:', error);
                // Fallback para WebRTC state
                const publishState = streamPublishService.getState();
                setPublishStatus({
                    state: (publishState as string) === 'failed' ? SrsPublishState.NETWORK_ERROR : SrsPublishState.CONNECTING,
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

    // Keyboard offset for mobile chat (prevents video from scrolling with keyboard)
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const handler = () => {
            const diff = window.innerHeight - vv.height;
            setKeyboardOffset(diff > 0 ? diff : 0);
        };
        vv.addEventListener('resize', handler);
        handler();
        return () => vv.removeEventListener('resize', handler);
    }, []);

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
        
        // Usar país real do fullUser, ou do streamerUser, ou fallback global
        const userCountry = user.fullUser?.country || streamerUser?.country || 'global';
        const userLocation = user.fullUser?.location || streamerUser?.location || (userCountry === 'global' ? 'Global' : userCountry.toUpperCase());
        
        return {
            avatar: user.avatar || '',
            id: userId.toString(),
            identification: user.fullUser?.identification || userId.toString(),
            name: userName,
            avatarUrl: user.avatar || user.fullUser?.avatarUrl || `https://picsum.photos/seed/${userId}/200/200`,
            coverUrl: user.fullUser?.coverUrl || `https://picsum.photos/seed/${userId}/400/600`,
            country: userCountry,
            gender: user.gender || 'not_specified',
            level: user.level || 1,
            xp: 0,
            age: user.age || 18,
            location: userLocation,
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
        if (!user.user) return;
        if (user.user === 'Sistema') return;
        const userProfile = constructUserFromMessage(user);
        
        if (userProfile.id === currentUser.id) {
            onViewProfile(userProfile);
        } else if (isBroadcaster) {
            setUserActionModalState({ isOpen: true, user: userProfile });
        } else {
            onViewProfile(userProfile);
        }
    };

    const handleSendGift = async (gift: Gift, quantity: number) => {
        try {
            const totalCost = gift.price || 0;
            if (currentUser.diamonds < totalCost) {
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
            const stableGiftId = String(Date.now() + Math.random());
            const giftPayload: GiftPayload = {
                fromUser: currentUser,
                toUser: { id: streamer.hostId, name: streamer.name || 'Streamer' },
                gift,
                quantity,
                roomId: streamer.id,
                id: stableGiftId // string única
            };

            // Enviar presento imediatamente (optimistic UI)
            postGiftChatMessage(giftPayload);
            setFullscreenGiftQueue(prev => [...prev, giftPayload]);

            // Transmitir presente via LiveKit data channel (sala compartilhada)
            if (lkChatConnected) {
                lkChatSendMessage({
                    type: 'live_gift_received',
                    from: { id: currentUser.id, identification: currentUser.identification || currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl, level: currentUser.level || 1 },
                    toUser: { id: streamer.hostId || streamer.id, name: streamer.name || 'Streamer' },
                    gift: { id: gift.name, name: gift.name, price: gift.price, icon: gift.icon, category: gift.category },
                    quantity, roomId: streamer.id, id: giftPayload.id
                });
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
                            const addedValue = (gift.price ?? 0) * quantity;
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
                        const totalValue = (gift.price ?? 0) * quantity;
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

                    // REMOVIDO: Atualização via API - agora usa WebSocket em tempo real
                    // refreshStreamRoomData(streamer.id);

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
        const isModNow = moderatorIds.includes(user.id);
        if (isModNow) {
            setModeratorIds(prev => prev.filter(id => id !== user.id));
            addToast(ToastType.Info, `${user.name} foi removido dos moderadores.`);
        } else {
            setModeratorIds(prev => [...prev, user.id]);
            addToast(ToastType.Success, `Sucesso! ${user.name} foi promovido a Moderador/Admin com sucesso! 🎉`);
        }
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
        <div className="absolute inset-0 bg-black text-white font-sans z-10"
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

                {/* Video Layer - SRS (HLS/WHEP) + LiveKit para tempo real */}
                <LivePlayer url={getStreamUrl()} streamId={streamer.streamKey || streamer.id} isBroadcaster={isBroadcaster} userId={currentUser.id} onPlaying={() => setIsVideoPlaying(true)} onError={() => setIsVideoPlaying(false)} muted={!isBroadcaster && isLocalMuted} onVideoRef={setVideoRef} />



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
            <header className={`p-4 flex flex-col gap-2 bg-transparent absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-start">
                    {/* Left side (User Info) */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); streamerDisplayUser && onViewProfile(streamerDisplayUser); }} 
                            className="flex items-center gap-2 text-left shrink-0 cursor-pointer focus:outline-none"
                        >
                            <div className="profile-gradient-ring rounded-full" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '2px' }}>
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0 flex items-center justify-center bg-black">
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
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm truncate max-w-[120px] text-white select-none">{streamerDisplayUser?.name || streamer.name}</span>
                                <div className="flex items-center gap-1 text-[10px] text-gray-300 font-medium">
                                    <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 7H7v2h6V7z"></path>
                                        <path clipRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" fillRule="evenodd"></path>
                                    </svg>
                                    <span>{Math.max(1, liveSession?.viewers || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </button>
                        {!isFollowed && currentUser.id !== streamer.hostId && (
                            <button onClick={(e) => { e.stopPropagation(); handleFollowStreamer(); }} className="w-7 h-7 bg-gradient-to-br from-[#bd00ff] to-[#e7006e] rounded-full flex items-center justify-center text-white shrink-0 transition-all transform active:scale-90 cursor-pointer ml-1">
                                <PlusIcon className="w-3.5 h-3.5" />
                             </button>
                        )}
                    </div>

                    {/* Right side (Controls & Viewers) */}
                    <div className="flex items-center gap-3">
                        {/* Top Contributors and Rank Avatars listed inline */}
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

                        {/* Notification bell, PiP button, Minimize button & Close button */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setOnlineUsersOpen(true); }}
                                className="flex items-center bg-black/40 hover:bg-black/60 rounded-full px-2.5 py-1.5 space-x-1.5 text-sm cursor-pointer transition-all border border-white/[0.02] active:scale-95 focus:outline-none"
                            >
                                <BellIcon className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-bold select-none">{Math.max(1, onlineUsers.length)}</span>
                            </button>
                            {/* PiP button (viewers only) - OUT-OF-APP native Picture-in-Picture, like ZEGO's pipButton */}
                            {!isBroadcaster && isPiPSupported && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (nativePiPActive) {
                                            exitPiP();
                                        } else {
                                            requestPiP();
                                        }
                                    }}
                                    className={`focus:outline-none cursor-pointer transition-all hover:scale-110 active:scale-90 ${
                                        nativePiPActive ? 'text-purple-400' : 'text-white/70 hover:text-white'
                                    }`}
                                    title={nativePiPActive ? 'Sair do Picture-in-Picture' : 'Picture-in-Picture (fora do app)'}
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                    </svg>
                                </button>
                            )}
                            {/* Minimize button (viewers only) - always PiP, like ZEGO's minimizingButton */}
                            {!isBroadcaster && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMinimizeStreamView?.(); }}
                                    className="focus:outline-none cursor-pointer text-white/70 hover:text-white transition-all hover:scale-110 active:scale-90"
                                    title="Minimizar para janela flutuante"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                    </svg>
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); isBroadcaster ? onRequestEndStream() : onLeaveStreamView(); }}
                                className="focus:outline-none cursor-pointer text-white hover:opacity-85 transition-opacity"
                                title={isBroadcaster ? 'Encerrar transmissão' : 'Fechar'}
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats and ID */}
                <div className="flex justify-between items-center mt-2 px-1">
                    <div className="flex items-center gap-4 text-xs font-medium select-none">
                        {/* G Coin Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsRankingOpen(true); }} 
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer border-none bg-transparent"
                        >
                            <span className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-extrabold shadow-sm">G</span>
                            <span className="text-white font-medium">{(() => {
                                const coins = liveSession?.coins || 0;
                                return coins.toLocaleString();
                            })()}</span>
                        </button>

                        {/* Heart / Like Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleLike(); }} 
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer border-none bg-transparent"
                        >
                            <svg 
                                className={`w-3 h-3 transition-colors ${isLiked ? 'text-rose-500 fill-current' : 'text-white'}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                            <span className="text-white font-medium">
                                {(() => {
                                    const likesCount = likes || 0;
                                    if (likesCount >= 1000) {
                                        return (likesCount / 1000).toFixed(1) + 'K';
                                    }
                                    return likesCount.toString();
                                })()}
                            </span>
                        </button>

                        {/* Public / Private stream status */}
                        {isBroadcaster ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleTogglePrivacy(); }}
                                className="text-white/80 hover:text-white cursor-pointer select-none focus:outline-none hover:underline border-none bg-transparent"
                            >
                                {streamer.isPrivate ? 'Privada' : 'Pública'}
                            </button>
                        ) : (
                            <span className="text-white/80">
                                {streamer.isPrivate ? 'Privada' : 'Pública'}
                            </span>
                        )}
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono select-none">
                        @{streamer.name}
                    </div>
                </div>
            </header>

            {/* 4. Chat & Footer UI */}
            <div className={`absolute left-0 right-0 w-full transition-opacity duration-300 ${isUiVisible ? 'opacity-105' : 'opacity-0 pointer-events-none'}`} style={{ bottom: keyboardOffset + 'px' }}>
                {/* PUBLIC CHAT SHADING (Sombreamento de Bate Papo Público) - Creates high contrast to make text pop over live feeds */}
                <div className="absolute inset-x-0 bottom-0 top-[-30px] bg-gradient-to-t from-black/95 via-black/45 to-transparent -z-10 pointer-events-none" />

                {!isBroadcaster && (
                    <div ref={chatContainerRef} onScroll={handleChatScroll} className="max-h-[33vh] h-full overflow-y-auto no-scrollbar flex flex-col pointer-events-auto px-3 relative z-10">
                        <div className="flex flex-col gap-1.5 mt-auto items-start w-full">
                            {messages.map((msg) => {
                                if (msg.type === 'entry' && msg.fullUser) {
                                    const entryProps: any = {
                                        user: msg.fullUser,
                                        currentUser: currentUser,
                                        onClick: onViewProfile,
                                        onFollow: onFollowUser,
                                        isFollowed: followingUsers.some(u => u.id === msg.fullUser!.id),
                                        isBroadcaster: isBroadcaster,
                                        isModerator: msg.fullUser.id ? moderatorIds.includes(msg.fullUser.id) : false
                                    };
                                    return <EntryChatMessage key={msg.id} {...entryProps} />;
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
                                        isModerator={msg.isModerator || moderatorIds.includes(chatUser.id)}
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
                    <div className="flex items-center gap-3" data-purpose="bottom-controls">
                        <div className="flex-grow">
                            <input 
                                type="text"
                                placeholder={t('streamRoom.sayHi')}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { console.log("[CHAT] onKeyDown Enter disparado"); handleSendMessage(e); } }}
                                className="w-full bg-white/10 border-none rounded-full px-4 py-2 text-sm text-white placeholder-gray-450 focus:ring-0 focus:outline-none focus:bg-white/15 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Share/Send Action */}
                            <button 
                                onClick={(e) => { console.log('[CHAT] onClick botão Enviar disparado'); handleSendMessage(e); }} 
                                className="rounded-full p-2 flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none"
                                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                            >
                                <SendIcon className="w-5 h-5 text-white" />
                            </button>
                            {/* Gift Action */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setGiftModalOpen(true); }} 
                                className="text-yellow-400 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 border-none bg-transparent"
                            >
                                <img 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEbs37m8nkgg-zP8SbCVft7aJxxbBm2sKdQVF2GU_ZSmxX3PMz9RI3ATDH0saDgDw4_Kzh1Lbb49Ba-2lhchOXOjkAzfDYnUBZ17nBC-nrysuZv_hRFz_ebfhEXuZdFCrGlTodvT8qpZwnNC3T-d21GtVESWlzqUKYb7CMvWVujWAZ1acL0_0sOBh5GtWYFR3KcrMNlrM2gn2NFRlwXkdIj3oJHWAkTULf1Lye6X8mugRMzbHMhYAI9VzwsmA4hUZ0juciJgPK9Gw3" 
                                    alt="Gift Icon" 
                                    className="w-9 h-9 object-cover rounded-full shadow-lg" 
                                />
                            </button>
                            {/* Private Chat */}
                            {!isBroadcaster && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onOpenPrivateChat(); }} 
                                    className="bg-black/40 hover:bg-black/65 w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 border-none focus:outline-none cursor-pointer"
                                    title="Chat privado"
                                >
                                    <MessageIcon className="w-5 h-5 text-white" />
                                </button>
                            )}
                            {/* More Options */}
                            {isBroadcaster && (
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
                            )}
                        </div>
                    </div>
                </footer>
            </div>

            {/* Native PiP Active Indicator */}
            {nativePiPActive && (
                <div className="absolute top-16 left-0 right-0 z-30 flex justify-center pointer-events-none">
                    <div className="bg-purple-600/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-purple-400/30 shadow-lg animate-in fade-in zoom-in-95">
                        🎬 Picture-in-Picture ativo — vídeo continua fora do app
                    </div>
                </div>
            )}

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
                        if (isBroadcaster) {
                            setUserActionModalState({ isOpen: true, user: selectedUser });
                        } else {
                            onViewProfile(selectedUser);
                        }
                    }}
                    moderatorIds={moderatorIds}
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
                isAlreadyModerator={userActionModalState.user ? moderatorIds.includes(userActionModalState.user.id) : false}
            />


            {activeLiveInvite && (
                <div className="absolute inset-0 z-[99999998] flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto bg-gray-900/95 border border-purple-500/60 rounded-2xl p-5 mx-4 max-w-xs w-full shadow-2xl">
                        <p className="text-white text-sm font-semibold text-center mb-1">
                            {activeLiveInvite.type === "call" ? "📞 Chamada de vídeo" : "🎬 Convite para live"}
                        </p>
                        <p className="text-gray-300 text-xs text-center mb-4">
                            <span className="font-bold text-purple-300">{activeLiveInvite.fromName}</span>{" "}
                            te convidou para {activeLiveInvite.type === "call" ? "uma chamada" : "entrar na live"}
                        </p>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                                onClick={() => { api.respondToLiveInvite(activeLiveInvite.inviteId, "declined").catch(() => {}); setActiveLiveInvite(null); }}>
                                Recusar
                            </button>
                            <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                                onClick={() => { api.respondToLiveInvite(activeLiveInvite.inviteId, "accepted").catch(() => {}); setActiveLiveInvite(null); }}>
                                Aceitar
                            </button>
                        </div>
                    </div>
                </div>
            )}

                                            </div>
    );
};

export default StreamRoom;

