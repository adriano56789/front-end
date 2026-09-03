                  import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import OnlineUsersModal from './live/OnlineUsersModal';
const OnlineUsersModalAny: any = OnlineUsersModal;
import ChatMessage from './live/ChatMessage';
import CoHostModal from './CoHostModal';
import EntryChatMessage from './live/EntryChatMessage';
import ChatScreen from './ChatScreen';
import ToolsModal from './ToolsModal';
const ToolsModalAny: any = ToolsModal;
import ConnectionQualityIndicator from './live/ConnectionQualityIndicator';
import { GiftIcon, MessageIcon, SendIcon, MoreIcon, CloseIcon, PlusIcon, SoundWaveIcon, ViewerIcon, GoldCoinWithGIcon, HeartIcon, TrophyIcon, BellIcon, RankIcon, LockIcon } from './icons';
import { Streamer, User, Gift, ToastType, RankedUser, LiveSessionState, SrsPublishStatus, SrsPublishState, PurchasePackage } from '../types';
import ContributionRankingModal from './ContributionRankingModal';
import BeautyEffectsPanel from './live/BeautyEffectsPanel';
import ResolutionPanel from './live/ResolutionPanel';
import GiftModal from './live/GiftModal';
import RouletteModal from './RouletteModal';
const RouletteModalAny: any = RouletteModal;
import GiftAnimationOverlay, { GiftPayload } from './live/GiftAnimationOverlay';
import WalletScreen from './WalletScreen';
import ConfirmPurchaseScreen from './ConfirmPurchaseScreen';
import CadastralDataScreen from './CadastralDataScreen';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import UserActionModal from './UserActionModal';
import FriendRequestNotification from './live/FriendRequestNotification';
import { RankedAvatar } from './live/RankedAvatar';
import GiftAnimationPanel, { GiftAnimationPanelHandle } from './live/GiftAnimationPanel';
import JoinEffectOverlay from './live/JoinEffectOverlay';
import { streamPublishService } from '../services/streamPublishService';
import { setProtectionContext } from '../services/contentProtection';
import { onSocketEvent } from '../services/socketService';
import { getAnimationUrl, getAnimationDuration } from '../services/GiftAnimationUrls';
// Chat e presença via Socket.IO (useStreamChat) com sync inicial REST
import AvatarWithFrame from './ui/AvatarWithFrame';

import LivePlayer from './LivePlayer';
import VideoCallPiP from './VideoCallPiP';
import { participationService } from '../services/participationService';
import { callService } from '../services/callService';
import type { ParticipationRequest } from './ToolsModal';
import { useStreamChat } from '../hooks/useStreamChat';
import { useComposerKeyboard, MESSAGE_BAR_HEIGHT, COMPOSER_BAR_HEIGHT } from '../hooks/useComposerKeyboard';

import { useNativePiP } from '../hooks/useNativePiP';
import { PublishEngine } from '../services/PublishEngine';
import { ensureLiveBeautyInRoom } from '../services/autoBeauty';
import { videoProcessor } from '../services/VideoProcessor';

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
    // 🎁 Mensagem de presente: clicar abre o modal de presentes (NÃO o perfil)
    isGift?: boolean;
    activeFrameId?: string | null;
    frameExpiration?: string | null;
    timestamp?: string | number;
    // 🔒 Denúncia automática de captura (print/gravação) — host pode banir
    violationUserId?: string;
    violationUserName?: string;
    violationType?: 'print' | 'record' | 'capture' | 'contextmenu';
}

interface StreamRoomProps {
    streamer: Streamer;
    onRequestEndStream: () => void;
    onLeaveStreamView: () => void;
    /** ⛔ Chamado quando o usuário está BANIDO pelo host → redireciona pra lista de bloqueio */
    onBannedFromStream?: () => void;
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
    addToast: (type: ToastType, message: string, options?: { title?: string; avatar?: string }) => void;
    followingUsers: User[];
    streamers: Streamer[];
    onSelectStream: (streamer: Streamer) => void;
    onOpenVIPCenter: () => void;
    rankingData: Record<string, RankedUser[]>;
}

const FollowChatMessage: React.FC<{ follower: string; followed: string; level?: number }> = ({ follower, followed, level }) => {
    const { t } = useTranslation();
    return (
        <div className="text-[8px] bg-purple-950/40 backdrop-blur-sm border border-purple-500/30 rounded-[10px] px-1.5 py-0.5 my-0.5 max-w-[70%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-purple-900/50 animate-chat-message break-words leading-tight">
            <span 
                className="text-[#c084fc] font-extrabold tracking-wide font-sans text-[8px] shrink-0"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {follower}
            </span>
            
            <span className="inline-flex items-center bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[6px] font-black px-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans h-[9px] align-middle">
                Lvl. {level || 1}
            </span>

            <span 
                className="text-zinc-300 font-sans font-semibold text-[8px] tracking-wide break-words"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {t('streamRoom.followed')}
            </span>
            <span 
                className="text-[#c084fc] font-extrabold font-sans text-[8px] shrink-0"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {followed}!
            </span>
        </div>
    );
};

// 📱 Ritmo TikTok: chat efêmero — só as mensagens recentes ficam na sala
const MAX_CHAT_MESSAGES = 50;

const StreamRoom: React.FC<StreamRoomProps> = ({ streamer, onRequestEndStream, onLeaveStreamView, onBannedFromStream, onStartPKBattle, onViewProfile, currentUser, onOpenWallet, onFollowUser, onOpenPrivateChat, onOpenPrivateInviteModal, setActiveScreen, onStartChatWithStreamer, onOpenPKTimerSettings, onOpenFans, onOpenFriendRequests, gifts, receivedGifts, updateUser, liveSession, updateLiveSession, logLiveEvent, onStreamUpdate, refreshStreamRoomData, addToast, followingUsers, streamers, onSelectStream, onOpenVIPCenter, rankingData }) => {
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
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isBeautyPanelOpen, setBeautyPanelOpen] = useState(false);
    const [isCoHostModalOpen, setIsCoHostModalOpen] = useState(false);
    const [coHostModalMode, setCoHostModalMode] = useState<'cohost' | 'battle' | 'call'>('cohost');
    const [isOnlineUsersOpen, setOnlineUsersOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [onlineUsersInterval, setOnlineUsersInterval] = useState<NodeJS.Timeout | null>(null);
    const [isResolutionPanelOpen, setResolutionPanelOpen] = useState(false);
    const [currentResolution, setCurrentResolution] = useState(streamer.quality || '480p');
    // 🪫 Qualidade do ESPECTADOR (auto/480p/360p/240p) — economiza dados em rede lenta
    const [viewerQuality, setViewerQuality] = useState<'auto' | '480p' | '360p' | '240p'>('auto');
    const [isViewerQualityOpen, setIsViewerQualityOpen] = useState(false);
    const [isGiftModalOpen, setGiftModalOpen] = useState(false);
    const [isRouletteOpen, setIsRouletteOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<PurchasePackage | null>(null);
    const [isCadastralScreenOpen, setIsCadastralScreenOpen] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState<PurchasePackage | null>(null);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [userActionModalState, setUserActionModalState] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [isModerationMode, setIsModerationMode] = useState(false);
    const [isVideoCallPiPOpen, setIsVideoCallPiPOpen] = useState(false);
    // 📞 Dados do outro participante da chamada (para o PiP tocar o stream remoto certo)
    const [remoteCallUser, setRemoteCallUser] = useState<{ streamId: string; name: string; avatar?: string } | null>(null);
    // 🎥 Participação por vídeo (convidado dentro da live) — pedidos pendentes recebidos pelo HOST
    const [participationRequests, setParticipationRequests] = useState<ParticipationRequest[]>([]);
    const [activeParticipantName, setActiveParticipantName] = useState<string | null>(null);
    const [participationBadge, setParticipationBadge] = useState<string>('');
    const chatInputRef = useRef<HTMLButtonElement>(null);
    // ✨ Composer TikTok-style: a barra de mensagem principal fica TOTALMENTE
    // FIXA no fundo da live (bottom = safe-area, nunca sobe). Ao tocar nela,
    // abre um SEGUNDO campo de digitação (composer) colado acima do teclado.
    const {
        isComposerOpen,
        openComposer,
        closeComposer,
        composerInputRef,
        composerRef,
        bottom: chatBarBottom,
    } = useComposerKeyboard();
    const [isAutoPrivateInviteEnabled, setIsAutoPrivateInviteEnabled] = useState(liveSession?.isAutoPrivateInviteEnabled ?? false);

    // ⚡ Sincronizar isAutoPrivateInviteEnabled quando liveSession carrega (null → dados)
    useEffect(() => {
        if (liveSession && liveSession.isAutoPrivateInviteEnabled !== undefined) {
            setIsAutoPrivateInviteEnabled(liveSession.isAutoPrivateInviteEnabled);
        }
    }, [liveSession?.isAutoPrivateInviteEnabled]);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const previousOnlineUsersRef = useRef<(User & { value: number })[]>([]);
    // 👥 Contagem REAL de online (fonte da verdade = API), igual ao modal de
    // usuários online. O estado onlineUsers (socket) fica sujo quando o evento
    // viewer_left não chega — então o sino usa este número.
    const [onlineCount, setOnlineCount] = useState(0);
    const [moderatorIds, setModeratorIds] = useState<string[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 🎁 Ref para o GiftAnimationPanel (painel independente de animação de presentes)
    const giftPanelRef = useRef<GiftAnimationPanelHandle>(null);

    // 📡 Cleanup do typingTimeout ao desmontar
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // ═══ Sincronizar viewer count com a lista de onlineUsers (REST polling) ═══
    useEffect(() => {
        updateLiveSession({ viewers: Math.max(1, onlineUsers.length) });
    }, [onlineUsers.length]);

    // ═══ Contagem de usuários online via API (fonte da verdade) ═══
    // Polling leve (15s) com a MESMA deduplicação do modal de usuários online,
    // pra o número do sino bater com a lista que o modal mostra.
    useEffect(() => {
        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;
        const fetchCount = async () => {
            try {
                const data = await api.getStreamOnlineUsers(streamer.id);
                if (cancelled) return;
                if (Array.isArray(data)) {
                    const seen = new Set<string>();
                    const unique = (data as any[]).filter((u: any) => {
                        const key = String(u?.id ?? '');
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    setOnlineCount(unique.length);
                }
            } catch (err) {
                // Mantém o último valor em caso de erro de rede
            }
        };
        fetchCount();
        interval = setInterval(fetchCount, 15000);
        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
        };
    }, [streamer.id]);

    // Estado para likes da transmissão
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    // 🖼️ ATUALIZAR AVATAR EM TEMPO REAL: quando qualquer usuário troca a foto
    // de perfil, atualiza o avatar em TODAS as mensagens do chat (entry + chat)
    // e no objeto do streamer — sem precisar sair/entrar na sala.
    useEffect(() => {
      const handleAvatarChanged = (e: Event) => {
        const data = (e as CustomEvent).detail;
        if (!data || !data.userId || !data.avatarUrl) return;
        const changedUserId = String(data.userId);
        const newAvatarUrl = String(data.avatarUrl);
        // Atualizar todas as mensagens que contenham esse userId
        setMessages(prev => prev.map(msg => {
          // Entry messages: fullUser.id ou user.id
          if (msg.fullUser && String((msg.fullUser as any).id) === changedUserId) {
            return { ...msg, fullUser: { ...(msg.fullUser as any), avatarUrl: newAvatarUrl } };
          }
          if (msg.user && typeof msg.user === 'object' && String((msg.user as any).id) === changedUserId) {
            return { ...msg, user: { ...(msg.user as any), avatarUrl: newAvatarUrl } };
          }
          // Chat messages: avatar pode estar em msg.avatar
          if (String(msg.userId) === changedUserId && msg.avatar !== undefined) {
            return { ...msg, avatar: newAvatarUrl };
          }
          return msg;
        }));
      };
      window.addEventListener('livego:user_avatar_changed', handleAvatarChanged);
      return () => window.removeEventListener('livego:user_avatar_changed', handleAvatarChanged);
    }, []);

    // State to track if video is actually playing to hide the cover image
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isLocalMuted, setIsLocalMuted] = useState(false);
    // 🔴 Live encerrada pelo broadcaster: mantém a sala aberta e o chat visível
    const [streamEnded, setStreamEnded] = useState(false);
    const streamEndedRef = useRef(false);
    useEffect(() => { streamEndedRef.current = streamEnded; }, [streamEnded]);

    // Native PiP (out-of-app) — minimizar automático via botão HOME/VOLTAR do
    // celular (autoPictureInPicture ativado no hook). Sem botão extra na sala.
    const [nativePiPActive, setNativePiPActive] = useState(false);
    const enableWhenBg = currentUser?.enableWhenBackground !== undefined ? currentUser.enableWhenBackground : true;
    const { setVideoRef } = useNativePiP({
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
    // 🚪 Efeito de entrada na live (join effect) — igual ti.live/Bigo.
    // Premium: só toca para quem tem VIP ativo. O HOST vê a animação de cada
    // VIP que entra (anúncio de chegada) e o próprio VIP se vê entrando.
    const [joinEffect, setJoinEffect] = useState<{
      userName: string;
      avatarUrl: string;
      entranceEffect?: any;
    } | null>(null);
    const joinEffectShownRef = useRef(false);
    const [pinnedGifts, setPinnedGifts] = useState<{ gift: Gift; label: string }[]>([]);
    const [activeLiveInvite, setActiveLiveInvite] = useState<{ inviteId: string; type: string; from: string; fromName: string; streamId: string } | null>(null);
    // Espelho em ref para leitura dentro de handlers de socket (sem recriar o effect)
    const activeLiveInviteRef = useRef(activeLiveInvite);
    useEffect(() => { activeLiveInviteRef.current = activeLiveInvite; }, [activeLiveInvite]);

    // Estado para monitoramento de publish SRS
    const [publishStatus, setPublishStatus] = useState<SrsPublishStatus>({
        state: 'idle' as any,
        lastUpdate: new Date()
    });

    const isBroadcaster = !!streamer?.hostId && !!currentUser?.id && String(streamer.hostId) === String(currentUser.id);

    // ═══════════════════════════════════════════════════════════════════
    // ARQUITETURA (apenas SRS):
    // - SRS: Publica mídia (câmera/microfone) via WHIP (WebRTC)
    // - Socket.IO: Chat, presentes, likes e presença em tempo real (useStreamChat)
    //   com sincronização inicial única via REST (histórico, online, presentes, likes)
    // - Push nativo: Notificações push
    // - SRS WHEP: Playback dos espectadores
    // ═══════════════════════════════════════════════════════════════════

  const {
    connected: lkChatConnected,
    connectionQualities: lkConnectionQualities,
    sendMessage: lkChatSendMessage,
    disconnect: disconnectLkChat,
    setMetadata: lkChatSetMetadata,
    // 📡 Convites co-host/PK via REST API
    inviteCoHost: lkInviteCoHost,
    invitePK: lkInvitePK,
    // 📡 Reações e digitação (no-op no polling REST)
    sendReaction: lkSendReaction,
    sendTyping: lkSendTyping,
    // 📡 Room Metadata (no-op — mantido para compatibilidade)
    updateRoomMetadata: lkUpdateRoomMetadata,
    // 📡 State Synchronization (REST)
    setAttributes: lkSetAttributes,
    setParticipantRole: lkSetRole,
    setMicStatus: lkSetMicStatus,
    setCamStatus: lkSetCamStatus,
    setHandRaise: lkSetHandRaise,
  } = useStreamChat({
    streamId: streamer.id,
    userId: currentUser.id,
    userName: currentUser.name,
    isHost: isBroadcaster,
    disabled: false, // host e viewers conectam na mesma live (Socket.IO)
    onMessage: (data: any) => {
      if (!data || !data.type) return;
      // 🛑 Live encerrada: ignora TODOS os eventos da sala (entradas, mensagens,
      // presentes, likes) — nada da live antiga pode continuar aparecendo.
      if (streamEnded) return;
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
          return [...prev, { id: stableId, type: 'entry', user: data.user || data.userName, fullUser: data.fullUser || null, timestamp: data.timestamp || Date.now() }];
        });
        // 🔔 Notificar o host quando um espectador entra na sala (além da msg no chat)
        // 🖼️¸ Com a FOTO DE PERFIL do usuário no banner — estilo app de mensagens.
        if (isBroadcaster) {
          const entryName = data.fullUser?.name || data.userName || data.user?.name || 'Alguém';
          const entryAvatar = data.fullUser?.avatarUrl || data.user?.avatarUrl || '';
          addToast(ToastType.Info, t('streamRoom.enteredRoom'), { title: entryName, avatar: entryAvatar });
          // 🚪 VIP com efeito de entrada → HOST vê a animação (anúncio de chegada,
          // estilo Bigo/ti.live: "you can easily be noticed by the host").
          if (data.entranceEffect) {
            setJoinEffect({ userName: entryName, avatarUrl: entryAvatar, entranceEffect: data.entranceEffect });
          }
        }
      } else if (data.type === 'live_gift_received' || data.type === 'gift_received') {
        // 🔧 NORMALIZAÇÃO: extrair dados de múltiplos formatos possíveis do backend
        const rawGift = data.gift || { name: data.giftName || data.name || '', price: data.giftPrice || 0, icon: data.giftIcon || '🎁', category: data.giftCategory || 'Popular' };
        const animationUrl = getAnimationUrl(rawGift);
        const duration = getAnimationDuration(rawGift);
        // 🔧 fromId normalizado: funciona com qualquer formato que o backend envie
        const senderId = data.from?.id || data.fromUser?.id || data.userId || data.senderId || data.fromUserId || '';
        const senderName = data.from?.name || data.fromUser?.name || data.senderName || data.userName || 'Usuário';
        const senderAvatar = data.from?.avatarUrl || data.fromUser?.avatarUrl || data.senderAvatar || data.avatarUrl || '';
        const senderLevel = data.from?.level || data.fromUser?.level || data.level || 1;
        const giftEvtPayload: any = {
          fromUser: { id: senderId, identification: senderId, name: senderName, avatarUrl: senderAvatar, level: senderLevel, fans: 0, following: 0, receptores: 0, enviados: 0, diamonds: 0, earnings: 0, earnings_withdrawn: 0, ownedFrames: [] },
          toUser: { id: data.toUser?.id || streamer.id, name: data.toUser?.name || 'Streamer' },
          gift: { ...rawGift, ...(animationUrl ? { animationUrl } : {}), ...(duration ? { duration } : {}) },
          quantity: data.quantity || 1, roomId: streamer.id, id: String(data.id || Date.now() + Math.random()),
        };
        const senderIsMe = String(senderId) === String(currentUser?.id || '');
        console.log('[STREAM]🎁 evento recebido:', rawGift?.name, 'senderIsMe:', senderIsMe, 'from:', senderId);
        if (senderIsMe) return;
        enqueueGift(giftEvtPayload);
      } else if (data.type === 'stream_liked' && data.streamId === streamer.id) {
        setLikes(data.totalLikes);
        if (data.userId === currentUser?.id) setIsLiked(true);
      } else if (data.type === 'stream_unliked' && data.streamId === streamer.id) {
        setLikes(data.totalLikes);
        if (data.userId === currentUser?.id) setIsLiked(false);
      } else if (data.type === 'viewer_joined') {
        const u = data.user;
        if (u?.id) {
          setOnlineUsers(prev => {
            if (prev.some(p => String(p.id) === String(u.id))) return prev;
            return [...prev, {
              avatar: u.avatarUrl || u.avatar || '',
              id: u.id,
              identification: u.id,
              name: u.name || u.userName || u.id,
              avatarUrl: u.avatarUrl || u.avatar || '',
              value: 0,
              level: u.level || 1,
              fans: 0,
              following: 0,
              receptores: 0,
              enviados: 0,
              diamonds: 0,
              earnings: 0,
              earnings_withdrawn: 0,
              ownedFrames: [],
            } as User & { value: number }];
          });
        }
      } else if (data.type === 'viewer_left') {
        const leftId = data.userId;
        if (leftId) {
          setOnlineUsers(prev => prev.filter(u => String(u.id) !== String(leftId)));
        }
      }
    },
    onConnected: () => {
      console.log('[CHAT] Chat REST conectado (polling)!');
      // 🚪 Efeito de entrada: toca UMA vez quando o espectador VIP entra na
      // sala (premium — só quem tem VIP ativo se vê entrando; host não vê o
      // próprio efeito, ele já está na própria live).
      if (!isBroadcaster && !joinEffectShownRef.current) {
        joinEffectShownRef.current = true;
        const isVipActive = !!currentUser?.isVIP &&
          (!currentUser.vipExpirationDate || new Date(currentUser.vipExpirationDate).getTime() > Date.now());
        if (isVipActive) {
          setJoinEffect({
            userName: currentUser?.name || 'Alguém',
            avatarUrl: currentUser?.avatarUrl || currentUser?.avatar || '',
          });
        }
      }
      // 📡 State Sync: sincronizar papel do participante
      lkSetRole(isBroadcaster ? 'host' : 'viewer');
      // 📡 Room Metadata: Se for o broadcaster, registrar metadata inicial da live
      if (isBroadcaster && liveSession) {
        lkUpdateRoomMetadata({
          liveId: streamer.id,
          hostId: streamer.hostId,
          title: streamer.name,
          category: streamer.category || '',
          configId: streamer.id,
          coHostEnabled: liveSession.isCoHostEnabled || false,
          chatEnabled: liveSession.isChatEnabled !== false,
        });
      }
    },
    onDisconnected: (reason?: any) => {
      const reasonCode = typeof reason === 'number' ? reason : (reason?.code ?? -1);
      console.log('[CHAT] Chat REST desconectado! Reason:', reasonCode);
      // 🔴 Code 5 = live encerrada (404 na API ou evento socket stream_ended)
      if (reasonCode === 5) {
        console.log('[CHAT] 🔴 Live encerrada pelo broadcaster. Limpando chat da tela...');
        // 🧹 Chat morre com a transmissão: apaga TODAS as mensagens da tela
        // (host E espectadores — ritmo TikTok: live acabou, histórico some).
        // A sala continua aberta (sem auto-redirecionamento), mas fica zerada.
        setStreamEnded(true);
        setMessages([]);
        setBannerGifts([]);
      }
    },
    // 🚫 Mensagem rejeitada pelo backend (usuário bloqueado pelo host da live):
    // não foi persistida nem enviada a ninguém. Avisa o remetente e remove a
    // mensagem otimista que ele viu.
    onBlocked: (data) => {
      addToast(ToastType.Error, data?.reason || 'Você foi proibido de falar');
      const bannedText = data?.text || '';
      if (bannedText && currentUser) {
        setMessages(prev => {
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
            const m: any = prev[i];
            const sender = String(m?.user || m?.userName || m?.userId || '');
            if ((sender === String(currentUser.name) || sender === String(currentUser.id)) && String(m?.message || '') === bannedText) {
              idx = i;
              break;
            }
          }
          if (idx === -1) return prev;
          const copy = [...prev];
          copy.splice(idx, 1);
          return copy;
        });
      }
    },
  });

    // 📡 Sincronizar metadata do usuário atual (REST polling — no-op mantido p/ compatibilidade)
    useEffect(() => {
        if (!lkChatConnected) return;
        const metadataPayload = {
            avatarUrl: currentUser.avatarUrl || currentUser.avatar || '',
            name: currentUser.name,
            level: currentUser.level || 1,
        };
        lkChatSetMetadata(metadataPayload);
    }, [lkChatConnected]);

    // Apenas SRS: host publica câmera/microfone via WHIP (sdk.publish do srs.sdk.js).
    // Viewers recebem via SRS WHEP.

    // HOST-MEDIA: Host publica câmera/microfone via PublishEngine (WHIP — sdk.publish).
    // Melhorias: usar refs para evitar recriação de MediaStream em rerenders
    const isPublishingRef = useRef(false);
    const isConnectingRef = useRef(false);

    const publishEngineRef = useRef<PublishEngine | null>(null);

    // 🔒 Proteção de conteúdo: contexto para denúncia automática — toda
    // tentativa de print/gravação nesta sala é denunciada via API no chat.
    useEffect(() => {
        setProtectionContext({
            userId: currentUser.id,
            userName: currentUser.name,
            streamId: streamer.streamKey || streamer.id,
            hostId: streamer.hostId,
        });
        return () => setProtectionContext({});
    }, [currentUser.id, currentUser.name, streamer.streamKey, streamer.id, streamer.hostId]);

    // 🚨 Denúncia em TEMPO REAL: aviso ⚠️¸ no chat da transmissão com o nome de
    // quem tentou capturar. O HOST vê e pode bloquear o usuário PRA SEMPRE.
    useEffect(() => {
        const unsub = onSocketEvent('content_violation', (data: any) => {
            if (!data || !data.violationUserId) return;
            if (!isBroadcaster) return; // só o dono vê a denúncia detalhada
            setMessages(prev => {
                const id = `viol_${data.timestamp || Date.now()}_${data.violationUserId}`;
                if (prev.some(m => String(m.id) === id)) return prev;
                return [...prev, {
                    id,
                    type: 'chat',
                    user: data.userName || 'Proteção de Conteúdo',
                    message: data.text || '⚠️ Tentativa de captura detectada!',
                    avatar: '',
                    level: 1,
                    violationUserId: data.violationUserId,
                    violationUserName: data.violationUserName,
                    violationType: data.violationType || 'capture',
                    timestamp: data.timestamp || Date.now(),
                } as ChatMessageType];
            });
        });
        return () => { unsub(); };
    }, [isBroadcaster]);

    // 🔒 Ban permanente direto do chat (host)
    const handleBanViolator = async (userId: string, userName: string, violationType: 'print' | 'record' | 'capture' | 'contextmenu' = 'print') => {
        try {
            await api.banUserForever(streamer.hostId, userId, userName, violationType);
            addToast(ToastType.Success, `${userName} bloqueado das suas lives nesta conta.`);
            setMessages(prev => prev.filter(m => m.violationUserId !== userId));
        } catch (e) {
            console.error('[PROTECTION] Falha ao banir:', e);
            addToast(ToastType.Error, 'Não foi possível bloquear o usuário.');
        }
    };

    const publishMedia = useCallback(async () => {
        if (isPublishingRef.current || isConnectingRef.current) {
            console.log('[HOST] Já publicando ou conectando, ignorando...');
            return;
        }

        isConnectingRef.current = true;
        
        try {
            // 🛡️¸ GUARD ANTI-VOZ-DUPLA: se já existe publicação WHIP ativa (host saiu
            // e voltou na própria live), NÃO publicar de novo — dois publicadores no
            // mesmo streamKey fazem o SRS entregar áudio duplicado/estragado.
            if (streamPublishService.isPublishing()) {
                console.log('[HOST] ⏭️¸ Publicação já ativa — reaproveitando sessão WHIP existente');
                return;
            }
            // 🔌 FLUXO REAL (WHIP — sdk.publish do srs.sdk.js):
            // 1. PublishEngine inicia a sessão WHIP no SRS (POST SDP offer)
            // 2. O SDK captura câmera/mic (getUserMedia) e a mídia flui via WebRTC
            // O evento 'mediaReady' entrega a MediaStream capturada para o preview.
            const engine = new PublishEngine({ videoCodec: 'H264', maxVideoBitrate: 6000 });
            publishEngineRef.current = engine;
            streamPublishService.setPublishEngine(engine);

            engine.on('stateChanged', (prev: string, next: string) => {
                console.log(`[HOST] WHIP publish state: ${prev} → ${next}`);
            });
            // 🎁€ Quando o ICE conectar (senders existem), aplicar beleza pré-configurada
            // via replaceTrack real no sender do engine — path robusto pós-publicação.
            engine.on('connected', () => {
                streamPublishService.updateBeautyTrack();
            });
            engine.on('error', (code: string, msg: string) => {
                console.error(`[HOST] Publish error ${code}:`, msg);
                if (code === 'PUBLISH_FAILED' || code === 'RECONNECT_EXHAUSTED' || code === 'ICE_CLOSED') {
                    addToast(ToastType.Error, `Erro na transmissão: ${msg}. Verifique sua conexão de rede e câmera.`);
                }
            });

            // 📺 Quando o engine capturar a mídia (via WHIP), registrar
            // no streamPublishService para o LivePlayer (modo broadcaster) exibir o preview.
            engine.on('mediaReady', (stream: MediaStream) => {
                console.log('[HOST] 🎁¥ Mídia capturada via WHIP — registrando preview');
                // 🛡️ Guardar como "current" só se não há câmera crua viva — quando
                // publicamos a stream PROCESSADA, o engine devolve ela aqui e
                // sobrescreveria a fonte CRUA usada pelo filtro (flip/amostragem).
                const cur = streamPublishService.getCurrentStream();
                if (!cur || !cur.getVideoTracks().some(t => t.readyState === 'live')) {
                    streamPublishService.setCurrentStream(stream);
                }
                streamPublishService.setPublishing(true);
                // 🎨 Rede de segurança: se publicamos cru (filtro falhou), liga o
                // auto-beleza agora e faz replaceTrack assim que ficar pronto.
                void ensureLiveBeautyInRoom(currentUser.id);
            });

            // 🎨 ORDEM CORRETA (captura → filtra → transmite): liga o auto-beleza
            // ANTES de abrir a sessão WHIP — o SRS recebe o vídeo JÁ filtrado
            // desde o 1º frame (pele limpa/sem manchas/jovem automaticamente).
            // Se falhar, devolve null e publicamos a câmera crua (live nunca trava).
            let mediaForPublish: MediaStream | undefined;
            try {
                const beauty = await ensureLiveBeautyInRoom(currentUser.id);
                if (beauty && beauty.getVideoTracks().some(t => t.readyState === 'live')) {
                    mediaForPublish = beauty;
                    console.log('[HOST] 🎨 Publicando stream PROCESSADA (filtro desde o 1º frame)');
                }
            } catch (beautyErr) {
                console.warn('[HOST] Filtro não ficou pronto antes do publish:', beautyErr);
            }

            // Fallback: sem filtro pronto → usa o preview cru existente (ou deixa
            // o engine capturar), como antes. O mediaReady re-tenta ligar o filtro
            // e faz replaceTrack assim que ficar pronto.
            if (!mediaForPublish) {
                const previewStream = streamPublishService.getCurrentStream();
                // 🔧 Só reutilizar se tiver track de vídeo VIVA (um publish que falhou
                // anteriormente parou os tracks — o stream morto não serve para publicar).
                mediaForPublish = (previewStream && previewStream.getVideoTracks().some(t => t.readyState === 'live'))
                    ? previewStream
                    : undefined;
            }

            // WHIP inicia a sessão e captura a mídia (getUserMedia) ao publicar
            await engine.start(streamer.streamKey || streamer.id, mediaForPublish, currentUser.id);
            isPublishingRef.current = true;
            console.log('[HOST] ✅ Stream publicada via WHIP ao SRS');
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.warn('[HOST] Falha ao publicar mídia:', errMsg);
            // 🔧 Resetar estado de publishing se falhou após o mediaReady (evita status incorreto)
            streamPublishService.setPublishing(false);
            addToast(ToastType.Error, '❌ Falha ao iniciar transmissão: ' + errMsg + '. Verifique câmera, microfone e rede.');
        } finally {
            isConnectingRef.current = false;
        }
    }, [streamer.id, streamer.streamKey, currentUser.id]);

    // 🎁¯ Publica mídia no SRS via WHIP imediatamente (independente do chat REST)
    useEffect(() => {
        if (!isBroadcaster) return;

        console.log('[HOST] 🎁¬ Iniciando publicacao via WHIP (SRS)...');
        const timer = setTimeout(() => {
            publishMedia();
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [isBroadcaster, publishMedia]);

    // Cleanup ao desmontar: NÃO parar tracks nem fechar o WebSocket de publish.
    // A transmissão SÓ deve ser encerrada pelo dono ao clicar "Encerrar Transmissão".
    useEffect(() => {
        return () => {
            console.log('[HOST] StreamRoom desmontado — publish NÃO interrompido (mantido ativo)');
        };
    }, []);

    // 🚫 REMOVIDO: encerramento automático ao o host sair da tela (mudar de aba,
    // abrir outro app etc). A transmissão SÓ encerra quando o host clica em
    // "Encerrar Transmissão" — sair da tela nunca derruba a live.

    // Escutar mensagens de chat via evento global (window CustomEvent)
    useEffect(() => {
        if (!streamer.id) return;

        const handleNewChatMessage = (message: any) => {
            if (!message) return;
            
            const text = message.text || message.message || '';
            if (!text) return;
            
            // Extrair dados do formato do evento
            const stableId = String(message.id || Date.now() + Math.random());
            const chatMsg: ChatMessageType = {
                id: stableId,
                type: 'chat',
                user: message.userName || message.user || 'Usuário',
                message: text,
                avatar: message.avatarUrl || message.avatar || '',
                level: message.level || 1,
                timestamp: message.timestamp || Date.now(),
            };

            // Não adicionar se já existe (evitar duplicatas com o polling REST)
            setMessages(prev => {
                if (prev.some(m => String(m.id) === stableId)) return prev;
                return [...prev, chatMsg];
            });
        };


        // Também escutar evento global window (caso socket.ts dispare via CustomEvent)
        const handleWindowChat = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            // 💬 Mensagem PRIVADA (payload de /api/messages tem chatId + from):
            // mostra notificação em tempo real para o destinatário, em qualquer
            // ponto da sala — antes só mensagens da live eram tratadas aqui.
            if (detail.chatId && detail.from && String(detail.from) !== String(currentUser.id)) {
                const preview = detail.text ? String(detail.text).slice(0, 60) : (detail.imageUrl ? '📷 Foto' : 'Nova mensagem');
                addToast(ToastType.Info, `💬 ${detail.senderName || 'Nova mensagem'}: ${preview}`);
                return;
            }
            handleNewChatMessage(detail);
        }
        window.addEventListener('livego:chat_message', handleWindowChat);

        return () => {
window.removeEventListener('livego:chat_message', handleWindowChat);
        };
    }, [streamer.id]);

    const isFollowed = useMemo(() => followingUsers.some(u => String(u.id) === String(streamer.hostId)), [followingUsers, streamer.hostId]);

    // 📊 Ranking ao vivo: memoizar para evitar re-criação do array a cada render
    const memoizedLiveRanking = useMemo(() => {
        return Object.values(rankingData || {}).flat().map((u: any) => ({ ...u, value: u?.contribution || 0 }));
    }, [rankingData]);

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
            timestamp: Date.now(),
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

        fetchInitialLikes();

        // 🔒 BANIMENTO POR CONTA: usuário bloqueado pelo dono não entra na sala
        // e é redirecionado pra tela de lista de bloqueio (perfil do host some pra ele).
        if (!isBroadcaster && streamer.hostId) {
            api.checkStreamBan(streamer.hostId, currentUser.id).then((r) => {
                if (r && r.banned) {
                    console.log('[PROTECTION] Usuário banido desta sala — saída forçada');
                    addToast(ToastType.Error, 'Você foi bloqueado pelo host desta transmissão.');
                    setTimeout(() => { try { onBannedFromStream(); } catch { try { onLeaveStreamView(); } catch {} } }, 1600);
                }
            }).catch(() => {});
        }
        // 👢 EXPULSÃO DA SESSÃO: se o usuário já foi expulso desta live,
        // ele ENTRA e é expulso automaticamente de novo. Só volta quando
        // a host encerrar a transmissão e abrir uma nova.
        let kickCheckId = 0;
        if (!isBroadcaster) {
            kickCheckId = window.setTimeout(() => {
                api.checkStreamKicked(streamer.id, currentUser.id).then((r) => {
                    if (r && r.kicked) {
                        console.log('[PROTECTION] Usuário expulso desta sessão — auto-expulsão na reentrada');
                        addToast(ToastType.Error, 'Você foi expulso desta transmissão.');
                        setTimeout(() => { try { onLeaveStreamView(); } catch {} }, 1600);
                    }
                }).catch(() => {});
            }, 1200);
        }
        // 👢 Kick em TEMPO REAL: host expulsou este espectador agora
        const unsubKicked = onSocketEvent('user_kicked', (data: any) => {
            if (data?.userId === String(currentUser.id)) {
                addToast(ToastType.Error, data.reason || 'Você foi expulso da transmissão.');
                try { onLeaveStreamView(); } catch {}
            }
        });
        // Presença/chat em tempo real via Socket.IO (useStreamChat) — online users sync inicial REST

        // Buscar histórico de mensagens do banco — 🚫 NUNCA carregar se a live já
        // encerrou (ritmo TikTok: sala de live encerrada fica SEM histórico).
        api.get("/api/streams/" + streamer.id + "/live-messages?limit=50").then((res: any) => {
            if (streamEndedRef.current) {
                console.log('[CHAT] Live já encerrada — histórico ignorado');
                return;
            }
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
                    timestamp: m.timestamp || Date.now(),
                }));
                setMessages(prev => [...history, ...prev]);
            }
        }).catch(() => {});

        // ⚠️¸ REMOVIDO: api.leaveStream — essa chamada no backend pode encerrar a live inteira.
        // A transmissão SÓ deve ser encerrada pelo dono ao clicar "Encerrar Transmissão".
        // Sair da tela não pode derrubar a transmissão.
        return () => {
            if (kickCheckId) window.clearTimeout(kickCheckId);
            try { unsubKicked && unsubKicked(); } catch {}
            // Socket.IO leaveRoom removido
        };
    }, [streamer.id, currentUser.id]); // Removido onlineUsersInterval das dependências


    useEffect(() => {
        const handleLiveInvite = (e: Event) => {
            const d = (e as CustomEvent<any>).detail;
            if (!d) return;
            // ⚔️ Convite PK é tratado pelo modal global (PKInviteModal no App),
            // aqui só co-host/call para não duplicar a notificação.
            const type = d.type || d.inviteType || "co-host";
            if (type === 'pk-battle') return;
            setActiveLiveInvite({ inviteId: d.inviteId || d.id || "", type: type === 'call' ? 'call' : 'co-host', from: d.from || d.fromId || "", fromName: d.fromName || d.from || "Usuário", streamId: d.streamId || "" });
        };
        const handleCallInvite = (e: Event) => {
            const d = (e as CustomEvent<any>).detail;
            if (!d) return;
            setActiveLiveInvite({ inviteId: d.inviteId || d.id || "", type: "call", from: d.from || d.fromId || "", fromName: d.fromName || d.from || "Usuário", streamId: d.streamId || streamer.id });
        };
        // 📞 PONTE SOCKET → UI: o backend emite 'call_invitation' para as salas
        // user_<id>; sem essa ponte a notificação NUNCA chega na tela.
        const offCallInv = onSocketEvent('call_invitation', (data: any) => {
            try {
                const inv = data?.invitation || {};
                switch (data?.type) {
                    case 'invitation_received': {
                        // Destinatário (guest): mostra banner Aceitar/Recusar
                        window.dispatchEvent(new CustomEvent('livego:call_invitation', { detail: {
                            inviteId: inv.id, from: inv.hostId, fromName: inv.hostName,
                            streamId: inv.streamId,
                        }}));
                        break;
                    }
                    case 'invitation_sent':
                    case 'call_request_sent': {
                        addToast(ToastType.Info, `Convite de chamada enviado para ${inv.guestName || ''}. Aguardando resposta...`);
                        break;
                    }
                    case 'invitation_accepted': {
                        // Host: convidado aceitou — abre o PiP com o stream do convidado
                        addToast(ToastType.Success, `${inv.guestName || 'Convidado'} aceitou a chamada!`);
                        setRemoteCallUser({ streamId: `guest_${inv.guestId}`, name: inv.guestName || 'Convidado', avatar: inv.guestAvatar });
                        setIsVideoCallPiPOpen(true);
                        break;
                    }
                    case 'call_joined': {
                        // Guest: chamada confirmada — PiP com o stream do host.
                        // 📸 Publica a câmera do convidado no SRS sob guest_<id>,
                        // para o PiP do HOST exibir o vídeo do convidado (antes mostrava preto).
                        setRemoteCallUser({ streamId: inv.streamId || activeLiveInviteRef.current?.streamId || streamer.id, name: activeLiveInviteRef.current?.fromName || 'Host' });
                        setIsVideoCallPiPOpen(true);
                        const guestKey = `guest_${currentUser.id}`;
                        callService.publishGuestStream(guestKey).catch((err: any) => {
                            console.warn('[StreamRoom] Falha ao publicar câmera do convidado:', err);
                            addToast(ToastType.Error, 'Não foi possível publicar sua câmera na chamada.');
                        });
                        break;
                    }
                    case 'call_ended':
                    case 'call_removed':
                    case 'call_left': {
                        // Chamada encerrada por qualquer lado — para a publicação do convidado.
                        callService.stopGuestPublish();
                        setIsVideoCallPiPOpen(false);
                        setRemoteCallUser(null);
                        break;
                    }
                }
            } catch (err) {
                console.warn('[StreamRoom] call_invitation handler:', err);
            }
        });
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
            offCallInv();
        };
    }, [streamer.id, currentUser.id]);

    // 🎥 PARTICIPAÇÃO POR VÍDEO — wiring (serve listener + disponibiliza handlers)
    // para o HOST receber pedidos do espectador e o espectador pedir para entrar.
    const handleParticipantRequestTap = useCallback(async () => {
        const res = await participationService.requestToJoin(streamer.id, streamer.id);
        if (!res.ok) {
            addToast(ToastType.Error, res.message || 'Não foi possível pedir participação.');
            return;
        }
        addToast(ToastType.Info, 'Pedido enviado ao anfitrião. Aguarde a resposta...');
        setParticipationBadge('Aguardando anfitrião...');
    }, [streamer.id, addToast]);

    const handleAcceptParticipation = useCallback(async (invitationId: string) => {
        const req = participationRequests.find(r => r.invitationId === invitationId);
        const ok = await participationService.hostAccept(invitationId);
        if (!ok) {
            addToast(ToastType.Error, 'Não foi possível aceitar o pedido.');
            return;
        }
        setParticipationRequests(prev => prev.filter(r => r.invitationId !== invitationId));
        const guestName = req?.guestName || 'Convidado';
        setActiveParticipantName(guestName);
        // Abre o PiP do convidado (o convidado publica em guest_<id> via WHIP no SRS)
        setRemoteCallUser({ streamId: `guest_${req?.guestId || ''}`, name: guestName, avatar: req?.guestAvatar });
        setIsVideoCallPiPOpen(true);
        addToast(ToastType.Success, 'Você aceitou a participação por vídeo!');
    }, [participationRequests, addToast]);

    const handleRejectParticipation = useCallback(async (invitationId: string) => {
        await participationService.hostReject(invitationId);
        setParticipationRequests(prev => prev.filter(r => r.invitationId !== invitationId));
    }, []);

    const handleRemoveParticipant = useCallback(async () => {
        await participationService.hostRemove();
        setActiveParticipantName(null);
        setIsVideoCallPiPOpen(false);
        addToast(ToastType.Info, 'Participante removido do vídeo.');
    }, [addToast]);

    useEffect(() => {
        participationService.init();
        const offSub = participationService.subscribe((state, info) => {
            if (state === 'CONNECTED' && info?.guestName) {
                setActiveParticipantName(info.guestName);
            }
            // Estado terminal → limpa o painel do host
            if (state === 'ENDED' || state === 'REJECTED') {
                setActiveParticipantName(null);
            }
        });
        const handleParticipationRequest = (e: Event) => {
            const d = (e as CustomEvent<any>).detail as any;
            if (!d || !d.invitationId) return;
            setParticipationRequests(prev =>
                prev.some(r => r.invitationId === d.invitationId)
                    ? prev
                    : [...prev, { invitationId: d.invitationId, guestId: d.guestId || '', guestName: d.guestName || 'Convidado', guestAvatar: d.guestAvatar, requestedAt: Date.now() }]
            );
            addToast(ToastType.Info, `${d.guestName || 'Um espectador'} quer entrar no vídeo!`);
        };
        window.addEventListener('livego:participation_request', handleParticipationRequest);
        return () => {
            window.removeEventListener('livego:participation_request', handleParticipationRequest);
            offSub();
        };
    }, [addToast]);


    const postGiftChatMessage = (payload: GiftPayload) => {
        try {
            const { fromUser, gift, toUser, quantity } = payload;

            // Validação robusta para evitar undefined errors
            if (!fromUser || !fromUser.name || !gift || !toUser || !toUser.name) {
                console.error('postGiftChatMessage: Dados inválidos', { fromUser, gift, toUser, quantity });
                return;
            }                    const giftMessage: ChatMessageType = {
                id: String(Date.now() + Math.random()),
                type: 'chat',
                user: 'Sistema', // Under 'Sistema', ChatMessage styles it with a gorgeous purple glowing border
                isGift: true, // 🎁 clicar nesta mensagem abre o GiftModal (não o perfil)
                level: fromUser.level || 1,
                message: (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-extrabold text-[#c084fc] hover:underline text-[10px]">{fromUser.name}</span>
                        <span className="text-purple-250 text-[10px]">enviou {quantity}x {gift.name || 'Presente'} para {toUser.name}!</span>
                        {gift.component ? React.cloneElement(gift.component as React.ReactElement<any>, { className: "w-3 h-3 inline-block" }) : typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/')) ? <img src={gift.icon} alt={gift.name} className="w-3 h-3 inline-block object-contain" /> : <span className="text-xs">{gift.icon || '🎁'}</span>}
                    </span>
                ),
                // 🔧 Fallback de avatar para garantir renderização (msg.avatar obrigatório no chat)
                avatar: fromUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fromUser.name || 'Sistema')}&background=random`,
                activeFrameId: fromUser.activeFrameId || null,
                frameExpiration: fromUser.frameExpiration || null,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, giftMessage]);
        } catch (error) {
            console.error('Erro em postGiftChatMessage:', error);
            // Não impede o envio do presente, apenas loga o erro
        }
    };

    // 🎁 Fila central de presentes → painel independente (GiftAnimationPanel).
    // Usada pelo caminho OTIMISTA (quem envia, ver handleSendGift) e pelo
    // caminho do SOCKET (demais espectadores).
    const enqueueGift = (payload: any) => {
        const fromId = payload?.fromUser?.id || payload?.from?.id || payload?.userId || payload?.senderId || '';
        const giftName = payload?.gift?.name || payload?.giftName || '';
        if (!giftName) {
            console.warn('[STREAM] enqueueGift: giftName ausente, ignorando', { payload });
            return;
        }
        // 🔧 Garantir fromId preenchido (fallback para não dropar a animação)
        if (!payload?.fromUser?.id) {
            if (!payload.fromUser) payload.fromUser = {} as any;
            payload.fromUser.id = fromId || 'unknown';
        }
        // Enfileira no painel independente de animação
        // 🔧 RETRY: se giftPanelRef.current é null (componente ainda não montou),
        // espera 200ms e tenta de novo — corrige race condition no 1º gift
        // quando o socket é mais rápido que o React mount.
        const tryPush = (attempt: number) => {
            if (giftPanelRef.current) {
                giftPanelRef.current.pushGift(payload);
            } else if (attempt < 5) {
                setTimeout(() => tryPush(attempt + 1), 200);
            } else {
                console.warn('[STREAM] enqueueGift: giftPanelRef.current é NULL após 5 tentativas — animação não exibida');
            }
        };
        tryPush(0);
        postGiftChatMessage(payload);
    };

    const handleBannerAnimationEnd = (id: number) => {
        setBannerGifts(prev => prev.filter(g => g.id !== id));
    };




    // 📝 Altura EXTRA do textarea quando o texto quebra em várias linhas
    // (cada linha nova = +20px). Serve para a lista de mensagens continuar
    // parando EXATAMENTE acima da barra, mesmo com o campo crescendo.
    const [composerExtraHeight, setComposerExtraHeight] = useState(0);

    const autoResizeComposer = () => {};

    // Campo vazio (enviou/apagou) → reset
    useEffect(() => {
        if (chatInput === '') {
            setComposerExtraHeight(0);
        }
    }, [chatInput]);

    const MAX_CHAT_MESSAGE_LENGTH = 120;
    const handleSendMessage = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        const rawText = chatInput.trim();
        if (rawText === '' || !currentUser) return;
        const text = rawText.slice(0, MAX_CHAT_MESSAGE_LENGTH);
        const messagePayload: ChatMessageType = {
            id: String(Date.now()),
            type: 'chat',
            user: currentUser.name,
            level: currentUser.level,
            message: text,
            avatar: currentUser.avatarUrl || currentUser.avatar,
            gender: currentUser.gender,
            age: currentUser.age,
            activeFrameId: currentUser.activeFrameId,
            frameExpiration: currentUser.frameExpiration,
            fullUser: currentUser,
            timestamp: Date.now(),
        };
        // Garantir que avatar sempre tenha um valor para ser renderizado no chat
        const stableId = String(Date.now() + Math.random());
        const safePayload = {
            ...messagePayload,
            avatar: messagePayload.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`,
            id: stableId, // Garantir unicidade como string
        };
        setMessages(prev => [...prev, safePayload]);
        
        // Host e viewers: todos usam lkChatSendMessage (Socket.IO, com fallback REST).
        // 🔧 ÚNICA persistência — lkChatSendMessage emite send_live_message (persiste + broadcast live_message).
        //    (Removido o api.post() direto abaixo, que causava mensagens DUPLICADAS no banco.)
        lkChatSendMessage({ ...safePayload, type: 'chat_message' })
            .catch((err: any) => console.warn('[CHAT] Erro ao persistir mensagem:', err));
        
        setChatInput('');
        
        // 🔧 Manter foco para o teclado NÃO fechar após enviar (comportamento tipo app famoso)
        requestAnimationFrame(() => {
            if (isComposerOpen) {
                composerInputRef.current?.focus();
            } else {
                chatInputRef.current?.focus({ preventScroll: true } as any);
            }
        });
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
        // 🛡️¸ Não permite seguir a si mesmo (própria stream)
        if (!streamerUser || String(streamerUser.id) === String(currentUser?.id)) return;
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
                    // Broadcast de stream_unliked já é feito pelo backend (liveRoutes) para a sala
                    if (lkChatConnected) { lkChatSendMessage({ type: 'stream_unliked', streamId: streamer.id, totalLikes: response.totalLikes, userId: currentUser.id }); }
                }
            } else {
                // Dar like
                const response = await api.likeStream(streamer.id, currentUser.id);
                if (response?.success) {
                    setLikes(response.totalLikes);
                    setIsLiked(true);
                    // Broadcast de stream_liked já é feito pelo backend (liveRoutes) para a sala
                    if (lkChatConnected) { lkChatSendMessage({ type: 'stream_liked', streamId: streamer.id, totalLikes: response.totalLikes, userId: currentUser.id }); }
                }
            }
        } catch (error) {
            console.error('Erro ao dar like:', error);
        }
    };

    // Scroll inteligente: só vai para o fim se usuário NÃO tiver scrollado para cima
    // ⚠️ Optimização: medições de layout no máximo 1x por frame (rAF-throttle) e scroll
    // automático agendado via requestAnimationFrame para evitar "forced reflow" a cada
    // mensagem nova do chat.
    const scrollFrameRef = useRef<number>(0);
    const handleChatScroll = useCallback(() => {
        if (scrollFrameRef.current) return;
        scrollFrameRef.current = requestAnimationFrame(() => {
            scrollFrameRef.current = 0;
            if (chatContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
                setIsUserScrolledUp(!isNearBottom);
            }
        });
    }, []);

    useEffect(() => {
        if (chatContainerRef.current && !isUserScrolledUp) {
            const frame = requestAnimationFrame(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [messages.length, isUserScrolledUp]);

    // Cap de mensagens: limita o DOM do chat para manter o custo de layout baixo
    useEffect(() => {
        if (messages.length > MAX_CHAT_MESSAGES) {
            setMessages(prev => (prev.length > MAX_CHAT_MESSAGES ? prev.slice(prev.length - MAX_CHAT_MESSAGES) : prev));
        }
    }, [messages.length]);

    // 🚫 REMOVIDO: mensagens automáticas do Sistema (welcome + dicas periódicas).
    // O chat agora só mostra eventos REAIS: mensagens de usuários, entradas e
    // presentes enviados por usuários reais (live_gift_received via socket).

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

        // 🪫 Economia: 5s em vez de 3s (API SRS não precisa de checagem tão frequente)
        const interval = setInterval(checkPublishStatus, 5000);
        checkPublishStatus(); // Verificar imediatamente

        return () => {
            clearInterval(interval);
        };
    }, [isBroadcaster, streamer.streamKey, streamer.playbackUrl]);

    
    // 🛑 REMOVIDO: cleanup que parava o processamento de beleza ao desmontar.
    // Ele DESLIGAVA o filtro enquanto a live CONTINUAVA no ar (só encerra por
    // ação do usuário) — os espectadores voltavam a ver a câmera crua/envelhecida
    // após qualquer navegação. O pipeline é singleton e se auto-gerencia;
    // o watchdog abaixo religa caso algo caia.

    // 🩺 WATCHDOG DO FILTRO NA SALA: a cada 4s verifica se o stream processado
    // está produzindo frames. Se não estiver (crash do MediaPipe, contexto
    // WebGL perdido, F5, reconexão), RELIGA o auto-beleza e faz replaceTrack.
    // Garante a regra do produto: abriu a sala → rosto limpo/jovem SEMPRE.
    useEffect(() => {
        if (!isBroadcaster) return;
        const wd = setInterval(() => {
            try {
                if (!streamPublishService.isPublishing()) return;
                // Usuário pediu câmera crua de propósito? (zerou tudo no painel agora)
                const st = videoProcessor.getBeautySettings();
                const allOff = Object.entries(st).filter(([k]) => k !== 'selectedFilter')
                    .every(([, v]) => typeof v !== 'number' || v === 0);
                if (allOff) return;
                if (!videoProcessor.isFramesFlowing()) {
                    console.warn('[HOST] 🩺 Watchdog: filtro sem fluxo — religando auto-beleza');
                    void ensureLiveBeautyInRoom(currentUser.id);
                }
            } catch { /* nunca derruba a live por causa do watchdog */ }
        }, 4000);
        return () => clearInterval(wd);
    }, [isBroadcaster, currentUser.id]);

    // Keyboard removed: usar position:fixed no footer mantém o chat sempre visível
    // sem empurrar o layout. O teclado não desce ao enviar porque mantemos o foco no input.

    // activeScreen é controlado pela prop setActiveScreen do componente pai


    const handleEndStream = useCallback(() => {
      onRequestEndStream();
    }, [onRequestEndStream]);

    const handleInvite = (opponent: User) => {
        setIsCoHostModalOpen(false);
        if (coHostModalMode === 'call') {
            // 📞 Convite de chamada já enviado dentro do modal (api.call.invite);
            // o PiP abre quando o convidado aceitar (socket 'invitation_accepted').
            return;
        }
        onStartPKBattle(opponent);
    };

    const handleOpenCoHostModal = (e: React.MouseEvent, mode?: 'cohost' | 'battle' | 'call') => {
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

            // 🔧 Presente propagado em tempo real via Socket.IO:
            // a rota POST /streams/:id/gift do backend emite live_gift_received
            // para a sala da stream — todos (inclusive o remetente) recebem.
            // 🚀 OPTIMISTIC UI: quem envia vê a animação IMEDIATAMENTE após o
            // servidor confirmar o envio (sem depender do socket). O enqueueGift
            // deduplica com o evento do socket (mesma chave + janela de 4s),
            // então a animação nunca aparece duplicada.

            // Now, call the API in the background
            try {
                const { success, error, updatedSender, updatedReceiver } = await api.sendGift(currentUser.id, streamer.id, streamer.id, gift.name, quantity);

                if (success && updatedSender) {
                    // 🚀 OPTIMISTIC: enfileira a animação do presente para o remetente
                    const optAnimationUrl = getAnimationUrl(gift);
                    const optDuration = getAnimationDuration(gift);
                    console.log('[STREAM]礼物 handleSendGift optimistic: enfileirando animação para remetente', gift.name, 'giftPanelRef.current:', !!giftPanelRef.current);
                    enqueueGift({
                        fromUser: {
                            id: currentUser.id,
                            name: (updatedSender.name || currentUser.name || 'Usuário'),
                            avatarUrl: updatedSender.avatarUrl || currentUser.avatarUrl || currentUser.avatar || '',
                            level: updatedSender.level || currentUser.level || 1,
                        },
                        toUser: { id: streamer.id, name: streamerUser?.name || streamer.name || 'Streamer' },
                        gift: { ...gift, ...(optAnimationUrl ? { animationUrl: optAnimationUrl } : {}), ...(optDuration ? { duration: optDuration } : {}) },
                        quantity,
                        roomId: streamer.id,
                        id: String(Date.now() + Math.random()),
                    });
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

                    if (gift.triggersAutoFollow && !isFollowed && streamerUser && !isBroadcaster) {
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
                addToast(ToastType.Error, "Falha ao enviar o presente. Tente novamente.");
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

    const handlePurchaseDiamonds = (pkg: PurchasePackage) => {
        // Identificação (nome e CPF/CNPJ) pedida antes do pagamento; endereço é opcional
        if (pkg.isFreeDev) return;
        if (!currentUser?.cadastral?.document) {
            setPendingPurchase(pkg);
            setIsCadastralScreenOpen(true);
            return;
        }
        // Abre ConfirmPurchaseScreen com o pacote selecionado
        setSelectedPackage(pkg);
        setIsWalletOpen(false);
    };

    const handleConfirmPurchase = async (pkg: PurchasePackage, method: 'card' | 'pix' | 'payoneer' = 'payoneer') => {
        try {
            if (!currentUser) return;
            const res = await api.createPayoneerDepositSession({
                userId: currentUser.id,
                amountBRL: pkg.price,
                diamonds: pkg.diamonds,
                method,
            });
            if (res && res.redirectUrl) {
                window.location.href = res.redirectUrl;
                return;
            }
            addToast(ToastType.Error, 'Pagamento indisponível no momento.');
        } catch (error) {
            addToast(ToastType.Error, 'Pagamento indisponível no momento.');
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
            console.log('🛡️¸ [FRONTEND_PROTECTION] Tentativa de expulsar dono bloqueada no frontend!');
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
        const newMicState = !(liveSession?.isMicrophoneMuted ?? false);
        // ⚡ Resposta IMEDIATA no clique: estado otimista + track de áudio
        // publicada no SRS liga/desliga já (a API só confirma).
        updateLiveSession({ isMicrophoneMuted: newMicState });
        const micStream = streamPublishService.getBeautyProcessedStream() || streamPublishService.getCurrentStream();
        micStream?.getAudioTracks().forEach(t => { try { t.enabled = !newMicState; } catch {} });
        addToast(ToastType.Success, newMicState ? 'Microfone desativado.' : 'Microfone ativado.');
        if (lkChatConnected) {
          lkSetMicStatus(newMicState);
        }
        try {
          // 🔊 Envia o estado DESEJADO explícito — backend e front nunca dessincronizam
          await api.toggleMicrophone(streamer.id, currentUser.id, !newMicState);
        } catch (err) {
          console.warn('[StreamRoom] toggleMicrophone erro:', err);
          // Reverte ao falhar
          updateLiveSession({ isMicrophoneMuted: !newMicState });
          micStream?.getAudioTracks().forEach(t => { try { t.enabled = newMicState; } catch {} });
          addToast(ToastType.Error, 'Falha ao alternar o microfone.');
        }
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
        const newSoundState = !(liveSession?.isStreamMuted ?? false);
        // ⚡ Resposta IMEDIATA no clique: estado otimista + track de áudio
        // publicada no SRS liga/desliga já (a API só confirma).
        updateLiveSession({ isStreamMuted: newSoundState });
        const sndStream = streamPublishService.getBeautyProcessedStream() || streamPublishService.getCurrentStream();
        sndStream?.getAudioTracks().forEach(t => { try { t.enabled = !newSoundState; } catch {} });
        addToast(ToastType.Info, newSoundState ? 'Áudio da live silenciado.' : 'Áudio da live ativado.');
        try {
            // 🔇 Envia o estado DESEJADO explícito — backend e front nunca dessincronizam
            await api.toggleStreamSound(streamer.id, currentUser.id, !newSoundState);
        } catch (err) {
            console.warn('[StreamRoom] toggleStreamSound erro:', err);
            // Reverte ao falhar
            updateLiveSession({ isStreamMuted: !newSoundState });
            sndStream?.getAudioTracks().forEach(t => { try { t.enabled = newSoundState; } catch {} });
            addToast(ToastType.Error, 'Falha ao alternar o áudio da live.');
        }
    };

    const handleToggleAutoFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster || !liveSession) return;
        const newAutoFollowState = !liveSession.isAutoFollowEnabled;
        // ⚡ Aplica NA HORA do clique. Com a caixa ATIVA, o host passa a seguir
        // automaticamente quem MANDAR PRESENTE na live; quem não manda
        // presente NÃO é seguido.
        updateLiveSession({ isAutoFollowEnabled: newAutoFollowState });
        addToast(ToastType.Success, newAutoFollowState ? 'Seguir automático ativado: quem mandar presente será seguido.' : 'Seguir automático desativado.');
        try {
            await api.toggleAutoFollow(streamer.id, newAutoFollowState, currentUser.id);
        } catch (error) {
            // Reverte ao falhar
            updateLiveSession({ isAutoFollowEnabled: !newAutoFollowState });
            addToast(ToastType.Error, 'Falha ao alterar a configuração.');
        }
    };

    const handleToggleAutoPrivateInvite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isBroadcaster) return;
        const newAutoInviteState = !isAutoPrivateInviteEnabled;
        // ⚡ Aplica NA HORA do clique (otimista), confirma na API.
        setIsAutoPrivateInviteEnabled(newAutoInviteState);
        updateLiveSession({ isAutoPrivateInviteEnabled: newAutoInviteState });
        addToast(ToastType.Success, newAutoInviteState ? 'Convite automático ativado.' : 'Convite automático desativado.');
        try {
            await api.toggleAutoPrivateInvite(streamer.id, newAutoInviteState, currentUser.id);
        } catch (error) {
            // Reverte ao falhar
            setIsAutoPrivateInviteEnabled(!newAutoInviteState);
            updateLiveSession({ isAutoPrivateInviteEnabled: !newAutoInviteState });
            addToast(ToastType.Error, 'Falha ao alterar a configuração.');
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
            {/* 1. Video Layer (Bottom) */}
            <div className="absolute inset-0 z-0 bg-black" onClick={() => { if (chatInputRef.current && document.activeElement === chatInputRef.current) chatInputRef.current.blur(); }}>
                {/* Loading state - mostra gradiente sutil + spinner enquanto vídeo não carrega */}
                {!isBroadcaster && !isVideoPlaying && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
                            <span className="text-white/50 text-sm font-medium">Carregando transmissão...</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 pointer-events-none" />
                    </div>
                )}

                {/* 🔒 Proteção SEM escurecer: print/gravação/download bloqueados.
                    Marca d'água REMOVIDA da tela (o nome atrapalhava a live). */}
                <div data-protected="true" className="absolute inset-0 no-capture-media">
                    <LivePlayer
                        streamId={streamer.streamKey || streamer.id}
                        isBroadcaster={isBroadcaster}
                        quality={isBroadcaster ? 'auto' : viewerQuality}
                        userId={currentUser.id}
                        onPlaying={() => setIsVideoPlaying(true)}
                        onError={() => setIsVideoPlaying(false)}
                        muted={!isBroadcaster && isLocalMuted}
                        onVideoRef={setVideoRef}
                    />
                </div>



                {/* Dark Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/70 pointer-events-none transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0'}`} style={{ zIndex: 15 }}></div>

                {/* Live encerrada - mantém a sala aberta e o chat visível */}
                {streamEnded && (
                    <div className="absolute inset-0 z-[16] flex flex-col items-center justify-center gap-4 bg-black/60 pointer-events-none">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                                <svg className="w-7 h-7 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm1 5a1 1 0 10-2 0v6a1 1 0 102 0V5zm-1 11.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" clipRule="evenodd" fillRule="evenodd"></path>
                                </svg>
                            </div>
                            <span className="text-white font-bold text-lg">A transmissão terminou</span>
                            <span className="text-white/60 text-sm">O chat continua disponível.</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Gift Animation Panel (independente — camada sobre o vídeo, abaixo dos controles) */}
            <GiftAnimationPanel ref={giftPanelRef} />

            {/* 🚪 Efeito de entrada na live (mp4 do pacote real, com o nome do usuário) */}
            {joinEffect && (
                <JoinEffectOverlay
                    userName={joinEffect.userName}
                    avatarUrl={joinEffect.avatarUrl}
                    entranceEffect={joinEffect.entranceEffect}
                    onEnd={() => setJoinEffect(null)}
                />
            )}

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
                                            avatar: streamer.avatar || '',
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
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-sm truncate max-w-[100px] text-white select-none">{streamerDisplayUser?.name || streamer.name}</span>
                                {streamer.isPrivate && (
                                    <LockIcon className="w-3 h-3 text-[#f2d7a2] flex-shrink-0 drop-shadow" />
                                )}
                                <ConnectionQualityIndicator quality={lkConnectionQualities[streamer.hostId]} />
                            </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-300 font-medium">
                                    <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 7H7v2h6V7z"></path>
                                        <path clipRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" fillRule="evenodd"></path>
                                    </svg>
                                    <span>{Math.max(1, liveSession?.viewers || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </button>
                        {/* 🚫 O dono NUNCA vê botão de seguir a si mesmo — só o
                            espectador vê. Checa isBroadcaster E hostId (cobre
                            streamer.hostId indefinido na entrada do host). */}
                        {!isFollowed && !isBroadcaster && String(currentUser.id) !== String(streamer.hostId) && (
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
                                <span className="text-white font-bold select-none">{onlineCount}</span>
                            </button>
                            {/* 🪫 Seletor de qualidade do espectador (economia de dados) */}
                            {!isBroadcaster && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsViewerQualityOpen(prev => !prev); }}
                                        className="focus:outline-none cursor-pointer flex items-center gap-1 text-white/70 hover:text-white transition-all px-1.5 py-1 rounded-lg hover:bg-white/10 active:scale-95"
                                        title="Qualidade do vídeo"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                        </svg>
                                        <span className="text-[11px] font-bold">{viewerQuality === 'auto' ? 'Auto' : viewerQuality}</span>
                                    </button>
                                    {isViewerQualityOpen && (
                                        <div className="absolute right-0 top-9 z-[60] bg-[#14121f]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 min-w-[120px] shadow-[0_12px_36px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
                                            {(['auto', '480p', '360p', '240p'] as const).map((q) => (
                                                <button
                                                    key={q}
                                                    onClick={(e) => { e.stopPropagation(); setViewerQuality(q); setIsViewerQualityOpen(false); }}
                                                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${viewerQuality === q ? 'text-[#26e3ff] bg-white/[0.06]' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'}`}
                                                >
                                                    {q === 'auto' ? 'Auto (recomendado)' : q === '480p' ? '480p — HD' : q === '360p' ? '360p — Economia' : '240p — Máx. economia'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button 
                                onClick={(e) => { e.stopPropagation(); isBroadcaster ? handleEndStream() : onLeaveStreamView(); }}
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
                                className="text-[13px] font-medium text-white/90 hover:text-white cursor-pointer select-none focus:outline-none border-none bg-transparent transition-colors"
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
            {/* O container é FIXED e fica PARADO em bottom:0 (viewport) — igual ao
                chat privado. Quem reserva o espaço no fundo é um ESPAÇADOR FORA da
                área rolável (fechado = altura da 1ª barra; aberto = composer +
                teclado). Assim o teclado NUNCA move a 1ª barra e as mensagens
                ficam sempre visíveis ACIMA do espaçador (nunca escondidas). */}
            <div className={`fixed left-0 right-0 bottom-0 w-full z-30 transition-opacity duration-300 ${isUiVisible ? 'opacity-105' : 'opacity-0 pointer-events-none'}`}>
                {/* PUBLIC CHAT SHADING (Sombreamento de Bate Papo Público) - Creates high contrast to make text pop over live feeds */}
                <div className="absolute inset-x-0 bottom-0 top-[-10px] bg-gradient-to-t from-black/95 via-black/45 to-transparent -z-10 pointer-events-none" />

                <div ref={chatContainerRef} onScroll={handleChatScroll} className="max-h-[20vh] overflow-y-auto no-scrollbar overscroll-contain flex flex-col justify-end pointer-events-auto px-1.5 relative z-10" style={{ maxHeight: '20lvh' }}>
                        <div className="flex flex-col gap-px items-start w-full">
                            {messages.map((msg, index) => {
                                if (msg.type === 'entry' && msg.fullUser) {
                                    const entryProps: any = {
                                        user: msg.fullUser,
                                        currentUser: currentUser,
                                        onClick: onViewProfile,
                                        onFollow: onFollowUser,
                                        isFollowed: followingUsers.some(u => u.id === msg.fullUser!.id),
                                        isBroadcaster: isBroadcaster,
                                        isModerator: msg.fullUser.id ? moderatorIds.includes(msg.fullUser.id) : false,
                                        timestamp: msg.timestamp,
                                    };
                                    return <EntryChatMessage key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`} {...entryProps} />;
                                }
                                // 🚨 DENÚNCIA DE CAPTURA — bolha dedicada com botão
                                // de BANIMENTO PERMANENTE (só o host da sala vê).
                                if (msg.type === 'chat' && msg.violationUserId && isBroadcaster) {
                                    return (
                                        <div key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`} className="w-full self-stretch bg-red-950/70 border border-red-500/40 rounded-xl px-2.5 py-1.5 my-0.5 animate-chat-message">
                                            <p className="text-[11px] leading-snug text-red-100 font-semibold break-words">{msg.message}</p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleBanViolator(msg.violationUserId!, msg.violationUserName || msg.violationUserId!, msg.violationType || 'print'); }}
                                                className="mt-1 w-full flex items-center justify-center gap-1 bg-red-600/90 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer border-none"
                                                title="Bloquear este usuário das suas lives (nesta conta)"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>
                                                Bloquear {msg.violationUserName} das minhas lives
                                            </button>
                                        </div>
                                    );
                                }
                                if (msg.type === 'chat' && msg.user && (msg.avatar || msg.user === 'Sistema')) {
                                    const chatUser = constructUserFromMessage(msg);
                                    const shouldShowFollow = !isBroadcaster && chatUser.id !== currentUser.id && chatUser.name !== streamer.name;

                                    return<ChatMessage key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`}
                                        userObject={chatUser}
                                        message={msg.message}
                                        avatarUrl={msg.avatar || chatUser.avatarUrl}
                                        onAvatarClick={msg.isGift ? () => setGiftModalOpen(true) : () => handleViewChatUserProfile(msg)}
                                        onFollow={shouldShowFollow ? () => handleFollowChatUser(chatUser) : undefined}
                                        isFollowed={followedUsers.has(chatUser.id)}
                                        onModerationClick={isBroadcaster && isModerationMode && msg.user !== currentUser.name && msg.user !== streamer.name ? () => handleOpenUserActions(msg) : undefined}
                                        isModerator={msg.isModerator || moderatorIds.includes(chatUser.id)}
                                        timestamp={msg.timestamp}
                                    />;
                                }
                                if (msg.type === 'follow' && msg.user && msg.followedUser) {
                                    return <FollowChatMessage key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`} follower={msg.user} followed={msg.followedUser} level={msg.level} />;
                                }
                                if (msg.type === 'friend_request' && msg.follower) {
                                    return <FriendRequestNotification key={typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : `msg-${index}`} followerName={msg.follower.name} onClick={onOpenFriendRequests} />;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                    {/* Espaçador FORA da área rolável: reserva o espaço do fundo
                        (1ª barra ou composer + teclado) sem esconder as mensagens —
                        elas ficam sempre visíveis acima dele. */}
                    <div style={{ height: `calc(${isComposerOpen ? COMPOSER_BAR_HEIGHT + composerExtraHeight : MESSAGE_BAR_HEIGHT}px + ${isComposerOpen ? chatBarBottom : 0}px + env(safe-area-inset-bottom, 0px))` }} />
                </div>

                {/* 📝 1ª barra: renderiza APENAS quando o composer está fechado.
                    Antes usávamos opacity-0 + pointer-events-none, mas isso mantinha
                    a barra no DOM visível durante a transição de 200ms, causando
                    overlap visual com a 2ª barra (composer) e o teclado. Agora o
                    footer é removido do DOM quando o composer abre. */}
                {!isComposerOpen && <footer className={`fixed left-0 right-0 z-30 p-3 pointer-events-auto ${isUiVisible ? '' : 'opacity-0 pointer-events-none'}`} style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    {/* 📡 Typing indicator */}
                    {typingUsers.length > 0 && (
                      <div className="px-2 py-1 text-xs text-gray-400 italic">
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} está digitando...`
                          : `${typingUsers.join(', ')} estão digitando...`
                        }
                      </div>
                    )}
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
                            {/* Share/Send Action */}
                            <button 
                                onMouseDown={(e) => e.preventDefault()}
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
                            {/* More Options (host: ferramentas de interação; espectador: pedir participação por vídeo) */}
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
                </footer>}

            {isComposerOpen && (
                <div
                    ref={composerRef}
                    className="fixed left-0 right-0 z-40"
                    style={{ bottom: `${chatBarBottom}px` }}
                >
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
                                    onChange={(e) => {
                                        setChatInput(e.target.value);
                                        if (lkChatConnected && e.target.value.length > 0) {
                                            lkSendTyping(true, currentUser.name);
                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                            typingTimeoutRef.current = setTimeout(() => {
                                                lkSendTyping(false, currentUser.name);
                                            }, 2000);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            if (composerRef.current && !composerRef.current.contains(document.activeElement)) {
                                                if (lkChatConnected && typingTimeoutRef.current) {
                                                    clearTimeout(typingTimeoutRef.current);
                                                    lkSendTyping(false, currentUser.name);
                                                }
                                                closeComposer();
                                            }
                                        }, 120);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(e); } }}
                                    maxLength={120}
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

            {/* 📌 Presentes Fixados — CANTO inferior direito da transmissão. Só o
                host fixa via Ferramentas (até 5); todos veem os presentes fixados
                enquanto a live estiver no ar. O NOME aparece EM CIMA, editável pelo
                host nas Ferramentas. Ao salvar, os presentes SOBEM do fundo até o canto. */}
            {pinnedGifts.length > 0 && (
                <div className="absolute bottom-96 right-3 z-30 flex flex-col items-end gap-2 pointer-events-none select-none">
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

            {/* Native PiP Active Indicator */}
            {nativePiPActive && (
                <div className="absolute top-16 left-0 right-0 z-30 flex justify-center pointer-events-none">
                    <div className="bg-purple-600/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-purple-400/30 shadow-lg animate-in fade-in zoom-in-95">
                        Picture-in-Picture ativo — vídeo continua fora do app
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
                    connectionQualities={lkConnectionQualities}
                    onSelectUser={(selectedUser: any) => {
                        setOnlineUsersOpen(false);
                        // 🔧 HOST: clicar no nome do espectador abre o modal de
                        // ações (tornar mod, expulsar, ver perfil) — igual ao chat.
                        // Espectador: abre o perfil normalmente.
                        if (isBroadcaster && selectedUser?.id && selectedUser.id !== currentUser.id) {
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
                    onOpenVideoCall={(e: any) => {
                        // 📞 Chamada de vídeo na live: abre o seletor e ENVIA o convite.
                        // O PiP só abre quando o outro lado ACEITA (socket call_invitation).
                        e.stopPropagation();
                        setIsToolsOpen(false);
                        setCoHostModalMode('call');
                        setIsCoHostModalOpen(true);
                    }}
                    isHost={isBroadcaster}
                    addToast={addToast}
                    gifts={gifts}
                    pinnedGifts={pinnedGifts}
                    onSavePinnedGifts={(entries: { gift: Gift; label: string }[]) => {
                        setPinnedGifts(entries);
                    }}
                    participationRequests={participationRequests}
                    activeParticipantName={activeParticipantName || undefined}
                    onAcceptParticipation={handleAcceptParticipation}
                    onRejectParticipation={handleRejectParticipation}
                    onRemoveParticipant={handleRemoveParticipant}
                />
            )}
            {!isBroadcaster && (
                <ToolsModalAny
                    isOpen={isToolsOpen}
                    onClose={() => setIsToolsOpen(false)}
                    onOpenCoHostModal={handleOpenCoHostModal}
                    onOpenPrivateInviteModal={() => {}}
                    isPrivateStream={streamer.isPrivate}
                    isSoundMuted={isLocalMuted}
                    onToggleSound={(e: any) => { e.stopPropagation(); setIsLocalMuted(m => !m); }}
                    onOpenPrivateChat={(e: any) => { e.stopPropagation(); onOpenPrivateChat(); }}
                    isHost={false}
                    addToast={addToast}
                    onRequestParticipation={handleParticipantRequestTap}
                    isParticipationActive={participationService.state === 'CONNECTED'}
                    participationLabel={participationBadge || 'Participe por vídeo'}
                />
            )}
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} />}
            <ResolutionPanel isOpen={isResolutionPanelOpen} onClose={() => setResolutionPanelOpen(false)} onSelectResolution={handleSelectResolution} currentResolution={currentResolution} />
            <CoHostModal isOpen={isCoHostModalOpen} mode={coHostModalMode} onClose={() => setIsCoHostModalOpen(false)} onInvite={handleInvite} onOpenTimerSettings={handleOpenTimerSettings} currentUser={currentUser} addToast={addToast} streamId={streamer.id} />
            {isRankingOpen && <ContributionRankingModal onClose={() => setIsRankingOpen(false)} liveRanking={memoizedLiveRanking} currentUser={currentUser} />}

            {/* 🔧 Painel de presentes: estrutura idêntica para todos (mesmas abas e
                layout). O host (broadcaster) vê as áreas de envio vazias — não pode
                presentear a si mesmo — e usa a aba Galeria para acompanhar os presentes
                que recebe durante a live. */}
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
            {/* 🎡 Roleta — widget fixo na tela da live, SEM janela.
                ownerId SEMPRE o ID REAL do HOST (hostId): itens e custo da roleta
                ficam salvos no User do host — passar o streamer.id (que no feed é o
                streamKey) fazia o espectador ver 0 itens e 0💎. */}
            <RouletteModalAny
                isOpen={isRouletteOpen}
                onClose={() => setIsRouletteOpen(false)}
                currentUser={currentUser}
                updateUser={updateUser}
                addToast={addToast}
                onOpenWallet={handleRecharge}
                ownerId={streamer.hostId}
                streamId={streamer.id}
                canEdit={isBroadcaster}
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

            {/* Video Call PiP — Chamada de vídeo Picture-in-Picture
                Quando dois usuários estão ao vivo e conversam entre si,
                a telinha pequenininha PiP aparece DENTRO DA CHAMADA,
                nas ferramentas de interação (ícone Chamada). */}
            <VideoCallPiP
                isOpen={isVideoCallPiPOpen}
                onClose={() => { setIsVideoCallPiPOpen(false); setRemoteCallUser(null); callService.stopGuestPublish(); }}
                localStreamId={streamer.streamKey || streamer.id}
                remoteStreamId={remoteCallUser?.streamId || streamer.streamKey || streamer.id}
                remoteUserName={remoteCallUser?.name || streamer.name}
                remoteUserAvatar={remoteCallUser?.avatar || streamer.avatar}
                localUserId={currentUser.id}
            />


            {activeLiveInvite && (
                <div className="absolute inset-0 z-[99999998] flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto bg-gray-900/95 border border-purple-500/60 rounded-2xl p-5 mx-4 max-w-xs w-full shadow-2xl">
                        <p className="text-white text-sm font-semibold text-center mb-1">
                            {activeLiveInvite.type === "call" ? "Chamada de vídeo" : "Convite para live"}
                        </p>
                        <p className="text-gray-300 text-xs text-center mb-4">
                            <span className="font-bold text-purple-300">{activeLiveInvite.fromName}</span>{" "}
                            te convidou para {activeLiveInvite.type === "call" ? "uma chamada" : "entrar na live"}
                        </p>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                                onClick={() => {
                                    if (activeLiveInvite.type === "call") {
                                        // 📞 Recusa via API de chamada (backend notifica o host)
                                        api.call.respond(activeLiveInvite.inviteId, "decline").catch(() => {});
                                    } else {
                                        api.respondToLiveInvite(activeLiveInvite.inviteId, "declined").catch(() => {});
                                    }
                                    setActiveLiveInvite(null);
                                }}>
                                Recusar
                            </button>
                            <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                                onClick={() => {
                                    if (activeLiveInvite.type === "call") {
                                        // 📞 Aceite via API de chamada; o evento 'call_joined'
                                        // (socket) abre o PiP com o stream do host.
                                        const invite = activeLiveInvite;
                                        setActiveLiveInvite(null);
                                        addToast(ToastType.Info, 'Aceitando a chamada...');
                                        api.call.respond(invite.inviteId, "accept").catch((err) => {
                                            console.warn('[StreamRoom] call respond erro:', err);
                                            addToast(ToastType.Error, 'Não foi possível entrar na chamada.');
                                        });
                                        return;
                                    }
                                    api.respondToLiveInvite(activeLiveInvite.inviteId, "accepted").catch(() => {});
                                    if (activeLiveInvite.type === "co-host" || activeLiveInvite.type === "pk-battle") {
                                        lkSetRole("co-host");
                                    }
                                    setActiveLiveInvite(null);
                                }}>
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



