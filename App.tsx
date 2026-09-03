

import React, { useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './src/styles.css';

// Error Boundary funcional como alternativa
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({ hasError: false });

  useEffect(() => {
    const handleError = (error: Error) => {
      // Apenas logar erro no console, não quebrar a aplicação
      console.error('Error caught by boundary:', error);
      
      // NÃO definir hasError: true para evitar quebra da UI
      // Apenas registrar o erro para debug
      
      // Se for erro crítico (não relacionado a presentes), podemos considerar mostrar
      const message = error.message || '';
      if (message && !message.includes('presente') && 
          !message.includes('gift') && 
          !message.includes('Promise') &&
          !message.includes('useCache') &&
          !message.includes('Receiving end does not exist')) {
        // Apenas para erros realmente críticos
        // setErrorState({ hasError: true, error });
      }
    };

    // Configurar tratamento de erros globais
    const errorHandler = (event: ErrorEvent) => {
      const message = event.message || 'Unknown error occurred';
      handleError(new Error(message));
      event.preventDefault();
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      try {
        // Tratar caso onde event.reason pode ser undefined
        const reason = event.reason || 'Unknown promise rejection';
        const errorMessage = typeof reason === 'string' ? reason : String(reason);
        
        // Ignorar erros específicos de extensões, presentes e do WebSocket do Vite HMR
        if (errorMessage.includes('useCache') || 
            errorMessage.includes('Receiving end does not exist') ||
            errorMessage.includes('content.js') ||
            errorMessage.includes('presente') ||
            errorMessage.includes('gift') ||
            errorMessage.includes('WebSocket') ||
            errorMessage.includes('websocket') ||
            errorMessage.includes('Promise')) {
          console.warn('Ignorando erro não crítico:', errorMessage);
          event.preventDefault();
          return;
        }

        handleError(new Error(errorMessage));
      } catch (handlerError) {
        console.error('Erro no rejectionHandler:', handlerError);
        handleError(new Error('Erro ao processar rejeição de promise'));
      }
      event.preventDefault();
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // NÃO mostrar tela de erro para não interromper experiência
  // Apenas retornar children normalmente
  return <>{children}</>;
};

// Adicionar tratamento de erros globais para extensões (fora do ErrorBounday)
window.addEventListener('error', (event) => {
  // Ignorar erros de extensões de navegador
  const msg = event.message || '';
  if ((event.filename && (event.filename.includes('content.js') || event.filename.includes('polyfill.js'))) ||
      msg.includes('useCache') || msg.includes('Receiving end does not exist')) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Normalizar reason (pode ser string, Error, ou undefined)
  let reasonStr = '';
  if (event.reason) {
    reasonStr = typeof event.reason === 'string' ? event.reason :
                event.reason instanceof Error ? event.reason.message :
                event.reason.message || String(event.reason);
  }
  // Ignorar rejeições de extensões de navegador
  if (reasonStr.includes('useCache') || reasonStr.includes('Receiving end does not exist') ||
      reasonStr.includes('content.js') || reasonStr.includes('polyfill.js')) {
    event.preventDefault();
    return false;
  }
});

import LoginScreen from './components/LoginScreen';

import MainScreen from './components/MainScreen';

// ⚡ CODE-SPLITTING: telas pesadas carregam sob demanda (chunks separados),
// deixando o bundle inicial MUITO menor → app abre instantâneo.
import { lazy, Suspense } from 'react';

const ProfileScreen = lazy(() => import('./components/ProfileScreen'));

const MessagesScreen = lazy(() => import('./components/MessagesScreen'));

const ChatScreen = lazy(() => import('./components/ChatScreen'));

import FooterNav from './components/FooterNav';

import ReminderModal from './components/ReminderModal';

import RegionModal from './components/RegionModal';

const GoLiveScreen = lazy(() => import('./components/GoLiveScreen'));
import type { InviteData } from './components/GoLiveScreen';

const VoiceRoom = lazy(() => import('./components/VoiceRoom'));

const StreamRoom = lazy(() => import('./components/StreamRoom'));
import { enrichGiftsWithComponents } from './components/live/GiftSvgHelper';

const PKBattleScreen = lazy(() => import('./components/PKBattleScreen'));

import { ToastType, ToastData, Streamer, User, Gift, StreamSummaryData, LiveSessionState, RankedUser, Conversation, Country, NotificationSettings, BeautySettings, FeedPhoto, StreamHistoryEntry, Visitor, PurchaseRecord, Message, EndStreamSummary, PurchaseCurrency, PurchasePackage, VoiceRoom as VoiceRoomType } from './types';

import Toast from './components/Toast';
import FloatingChatNotification, { FloatingNotificationData } from './components/FloatingChatNotification';


import UserProfileScreen from './components/BroadcasterProfileScreen';

import EditProfileScreen from './components/EditProfileScreen';

import WalletScreen from './components/WalletScreen';

import { useUserData } from './hooks/useUserData';

import { useZoomSettings } from './hooks/useZoomSettings';

import { useUserStatus } from './hooks/useUserStatus';

import { getApproximateLocationByIP, getPreciseLocation, calculateDistanceInKm, formatDistance } from './utils/location';

import FollowingScreen from './components/FollowingScreen';

import FansScreen from './components/FansScreen';

import VisitorsScreen from './components/VisitorsScreen';

import TopFansScreen from './components/TopFansScreen';

import MyLevelScreen from './components/MyLevelScreen';

import UserLevelsScreen from './components/UserLevelsScreen';

import BlockListScreen from './components/BlockListScreen';

import AvatarProtectionScreen from './components/AvatarProtectionScreen';

import MarketScreen from './components/MarketScreen';

import FAQScreen from './components/FAQScreen';

import SettingsScreen from './components/settings/SettingsScreen';

import ConfirmPurchaseScreen from './components/ConfirmPurchaseScreen';

import CadastralDataScreen from './components/CadastralDataScreen';

import SearchScreen from './components/SearchScreen';


import LocationPermissionModal from './components/LocationPermissionModal';

import EndStreamConfirmationModal from './components/live/EndStreamConfirmationModal';

import PWAInstallBanner from './components/PWAInstallBanner';
import EndStreamSummaryScreen from './components/EndStreamSummaryScreen';

import PrivateChatModal from './components/PrivateChatModal';
import { installContentProtection } from './services/contentProtection';

import PKBattleTimerSettingsScreen from './components/settings/PKBattleTimerSettingsScreen';

import FriendRequestsScreen from './components/FriendRequestsScreen';

import { LanguageProvider, useTranslation } from './i18n';

import { LoadingSpinner } from './components/Loading';

import PipSettingsModal from './components/settings/PipSettingsModal';

import PrivateInviteModal from './components/PrivateInviteModal';

import VideoScreen from './components/VideoScreen';
import GateTransitionOverlay from './components/live/GateTransitionOverlay';

import FullScreenPhotoViewer from './components/FullScreenPhotoViewer';
import FloatingPlayer from './components/FloatingPlayer';

import LiveHistoryScreen from './components/LiveHistoryScreen';

import LanguageSelectionModal from './components/settings/LanguageSelectionModal';

import VIPCenterScreen from './components/VIPCenterScreen';

import PaymentSuccessScreen from './components/PaymentSuccessScreen';

import LiveNotificationModal from './components/live/LiveNotificationModal';
import InAppNotificationBanner, { InAppNotification } from './components/live/InAppNotificationBanner';
import PKInviteModal from './components/PKInviteModal';
import { useGlobalNotifications } from './hooks/useGlobalNotifications';
import GiftAdminPanel from './components/live/GiftAdminPanel';

import { api } from './services/api';
  import { connectSocket, initPrivateChatSocket, isSocketConnected, onSocketEvent } from './services/socketService';

import UpdateAvailableModal from './components/UpdateAvailableModal';
import { useAppVersion } from './hooks/useAppVersion';

// Dados iniciais vazios - tudo será carregado da API

const INITIAL_DATA = {

  streamers: [],

  countries: [],

  allUsers: [],

  conversations: [],

  friends: [],

  followingUsers: [],

  fans: [],

  allGifts: [],

  reminderStreamers: [],

  rankingData: { 'Diária': [], 'Semanal': [], 'Mensal': [] },

  notificationSettings: null,

  streamHistory: [],

  visitors: [],

  purchaseHistory: [],

  avatarFrames: []

};  // 📡 Chat/presença via REST API (useStreamChat) — sem polling, sem Socket.IO



interface StreamRoomData {

  gifts: Gift[];

  receivedGifts: (Gift & { count: number })[];

}



interface PaymentSuccessData {

  price: number;

  diamonds: number;

  method?: 'pix' | 'credit_card';

  currency?: PurchaseCurrency;

  transactionId?: string;

  timestamp?: Date;

}



// Enhanced notification type to support direct stream entry

interface ExtendedLiveNotification {

  streamerId: string;

  streamerName: string;

  streamerAvatar: string;

  message?: string;

  streamId?: string;

  isPrivate?: boolean;

}



// Função auxiliar para determinar tela atual baseada na URL
const getCurrentScreenFromPath = (pathname: string): 'main' | 'profile' | 'messages' | 'video' => {
  switch (pathname) {
    case '/':
    case '/live':
      return 'main';
    case '/video':
      return 'video';
    case '/messages':
      return 'messages';
    case '/profile':
      return 'profile';
    default:
      return 'main'; // Fallback para main
  }
};


// Componente para renderizar telas baseadas na URL
const ScreenRenderer: React.FC<{
  location: any;
  allProps: any;
}> = ({ location, allProps }) => {
  const currentPath = location.pathname;
  
  // Mapeamento de rotas para telas (estilo Buzzcast)
  switch (currentPath) {
    case '/':
    case '/live':
      return <MainScreen {...allProps.mainScreen} />;
    case '/video':
      return <VideoScreen {...allProps.videoScreen} />;
    case '/messages':
      return <MessagesScreen {...allProps.messagesScreen} />;
    case '/profile':
      return <ProfileScreen {...allProps.profileScreen} />;
    case '/wallet':
      return <WalletScreen {...allProps.walletScreen} />;
    case '/vip-center':
      return <VIPCenterScreen {...allProps.vipCenterScreen} />;
    case '/my-level':
      return <MyLevelScreen {...allProps.myLevelScreen} />;
    case '/fans':
      return <TopFansScreen {...allProps.topFansScreen} />;
    case '/block-list':
      return <BlockListScreen {...allProps.blockListScreen} />;
    case '/avatar-protection':
      return <AvatarProtectionScreen {...allProps.avatarProtectionScreen} />;
    case '/faq':
      return <FAQScreen {...allProps.faqScreen} />;
    case '/settings':
      return <SettingsScreen {...allProps.settingsScreen} />;
    default:
      return <MainScreen {...allProps.mainScreen} />; // Fallback para main
  }
};

// Componente wrapper para usar hooks do React Router
const AppContentWithRouter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return <AppContent navigate={navigate} location={location} />;
};

// 🔄 RENOVAÇÃO AUTOMÁTICA DE TOKEN (validação automática)
// A cada abertura do app e sempre que ele VOLTA do segundo plano (troca de
// aplicativo, tela bloqueada), pedimos ao backend um token NOVO (365d) e
// guardamos em silêncio — a sessão se renova sozinha para sempre.
// Throttle de 12h para não martelar a API. Se falhar, ignora: o token atual
// continua valendo e NUNCA deslogamos por isso.
const TOKEN_REFRESH_AT_KEY = 'livego_token_refresh_at';
const TOKEN_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const maybeRefreshTokenSilently = async (): Promise<void> => {
  try {
    if (!(window as any).currentUser?.id) return;
    const last = parseInt(localStorage.getItem(TOKEN_REFRESH_AT_KEY) || '0', 10);
    if (Date.now() - last < TOKEN_REFRESH_MIN_INTERVAL_MS) return;
    const result = await api.refreshSession();
    if (result && result.success && result.token) {
      const { setAuthToken } = await import('./services/api');
      setAuthToken(result.token);
      localStorage.setItem(TOKEN_REFRESH_AT_KEY, String(Date.now()));
      // Dados frescos do usuário vieram junto? Atualiza o cache em silêncio
      const freshUser = (result as any).user;
      if (freshUser && freshUser.id) {
        try { localStorage.setItem('livego_cached_user', JSON.stringify(freshUser)); } catch { }
      }
      console.log('[AUTH] 🔄 Token renovado automaticamente');
    }
  } catch {
    // Silêncio total: renovação é best-effort, nunca derruba sessão
  }
};

const AppContent: React.FC<{ navigate: any; location: any }> = ({ navigate, location }) => {

  // 🔐 SESSÃO PERSISTENTE — REGRA DO DONO:
  // "Tela de login SÓ na 1ª vez ou se deslogou. Se já entrou → mantém-se
  // dentro, NUNCA volta pro login."
  // Por isso isAuthenticated/currentUser JÁ INICIALIZAM do cache de forma
  // SINCRONA (antes do 1º paint): nenhum recarregamento da WebView pisca a
  // tela de login nem "refaz entrada". O restoreSession abaixo só CONFIRMA/
  // atualiza os dados com a API em background — e NUNCA desloga quem tem
  // usuário em cache (só logout explícito derruba a sessão).
  const readCachedUser = (): User | null => {
    try {
      const u = JSON.parse(localStorage.getItem('livego_cached_user') || 'null');
      return u && u.id ? u : null;
    } catch { return null; }
  };
  const cachedUserAtBoot = readCachedUser();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!cachedUserAtBoot);

  const [currentUser, setCurrentUser] = useState<User | null>(() => cachedUserAtBoot);

  // Espelho síncrono do cache para o restoreSession e o gate de render.
  const cachedUserRef = useRef<User | null>(cachedUserAtBoot);

  // ⚡ ENTRADA INSTANTÂNEA: se já existe usuário em cache (localStorage),
  // NUNCA mostramos tela de loading — o estado já inicia como "pronto".
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('livego_cached_user');
    } catch {
      return true;
    }
  });

  // 🚪 PORTÃO 3D de entrada/saída da transmissão (substitui o spinner antigo)
  const [gatePhase, setGatePhase] = useState<'idle' | 'enter' | 'exit'>('idle');
  const [gateKey, setGateKey] = useState(0);
  const gateKeyRef = useRef(0);
  const gatePhaseRef = useRef<'idle' | 'enter' | 'exit'>('idle');
  useEffect(() => { gatePhaseRef.current = gatePhase; }, [gatePhase]);

  // Dispara a animação do portão (re-monta o overlay via key → toca de novo)
  const triggerGate = (phase: 'enter' | 'exit') => {
    gateKeyRef.current += 1;
    setGateKey(gateKeyRef.current);
    setGatePhase(phase);
  };
  const endGate = () => {
    setGatePhase('idle');
  };



  // Removido activeScreen - agora controlado por URL via React Router

  const [messagesInitialTab, setMessagesInitialTab] = useState<'messages' | 'friends'>('messages');

  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  const [isRegionModalOpen, setIsRegionModalOpen] = useState<boolean>(false);


  const [isLocationPermissionModalOpen, setIsLocationPermissionModalOpen] = useState(false);

  const [isGiftAdminOpen, setIsGiftAdminOpen] = useState(false);

  // REMOVED: locationPermissionStatus local state - now syncs with currentUser.locationPermission from MongoDB
  // const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const [showLocationBanner, setShowLocationBanner] = useState(false);

  const [toasts, setToasts] = useState<ToastData[]>([]);
  // 💬 Notificações flutuantes estilo WhatsApp (fica parada, arrasta pra descartar)
  const [floatingNotifs, setFloatingNotifs] = useState<FloatingNotificationData[]>([]);
  // 🔔 CTA de permissão de notificação (PWA): o pedido precisa de gesto do usuário
  const [showNotifCta, setShowNotifCta] = useState(false);
  const notifDeniedShownRef = useRef(false);
  const notifCtaShownRef = useRef(false);
  const swMessageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  const [activeStream, setActiveStream] = useState<Streamer | null>(null);

  const [streamRoomData, setStreamRoomData] = useState<StreamRoomData | null>(null);

  const [isPKBattleActive, setIsPKBattleActive] = useState<boolean>(false);

  const [pkOpponent, setPkOpponent] = useState<User | null>(null);

  const [activePKInvite, setActivePKInvite] = useState<any>(null);

  // Estado do aceite/recusa do convite PK (evita cliques duplos)
  const [pkInviteAction, setPkInviteAction] = useState<'accepting' | 'rejecting' | null>(null);

  const [pkBattleId, setPkBattleId] = useState<string | null>(null);
  const pkBattleIdRef = useRef(pkBattleId);
  useEffect(() => { pkBattleIdRef.current = pkBattleId; }, [pkBattleId]);

  // 🤝 Convite global para subir no palco de uma sala de voz (de QUALQUER tela)
  const [stageInvite, setStageInvite] = useState<{
    roomId: string;
    roomName: string;
    inviterId: string;
    inviterName: string;
    inviterAvatar: string;
  } | null>(null);
  const [stageInviteAction, setStageInviteAction] = useState<'accepting' | 'rejecting' | null>(null);

  const [chattingWith, setChattingWith] = useState<User | null>(null);

  const [viewingProfile, setViewingProfile] = useState<User | null>(null);

  // 🛡️ Perfil com proteção de tela ATIVA sendo visto AGORA por outra pessoa:
  // o aparelho de quem VÊ bloqueia print/gravador/salvar/compartilhar apenas
  // enquanto aquele perfil estiver aberto — ver o perfil continua normal.
  const [viewingProtectedProfile, setViewingProtectedProfile] = useState<boolean>(false);

  useEffect(() => {
    const protectedId = viewingProfile && viewingProfile.id !== currentUser?.id ? viewingProfile.id : null;
    if (!protectedId) {
      setViewingProtectedProfile(false);
      return;
    }
    let disposed = false;
    setViewingProtectedProfile(!!viewingProfile?.screenSecurityEnabled);
    api.getUser(protectedId).then((u: any) => {
      if (!disposed && u && String(u.id) === String(protectedId)) {
        setViewingProtectedProfile(!!u.screenSecurityEnabled);
      }
    }).catch(() => {});
    return () => { disposed = true; };
  }, [viewingProfile?.id, currentUser?.id]);

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  const [isWalletScreenOpen, setIsWalletScreenOpen] = useState<boolean>(false);

  const [walletInitialTab, setWalletInitialTab] = useState<'Diamante' | 'Ganhos'>('Diamante');

  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState<boolean>(false);

  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage | null>(null);

  const [isCadastralScreenOpen, setIsCadastralScreenOpen] = useState<boolean>(false);

  const [pendingPurchase, setPendingPurchase] = useState<PurchasePackage | null>(null);

  const [isFollowingScreenOpen, setIsFollowingScreenOpen] = useState<boolean>(false);

  const [isFansScreenOpen, setIsFansScreenOpen] = useState<boolean>(false);

  const [isFriendRequestsScreenOpen, setIsFriendRequestsScreenOpen] = useState<boolean>(false);

  const [isVisitorsScreenOpen, setIsVisitorsScreenOpen] = useState<boolean>(false);

  const [isTopFansScreenOpen, setIsTopFansScreenOpen] = useState<boolean>(false);

  const [topFansHostId, setTopFansHostId] = useState<string | undefined>(undefined);

  const [isMyLevelScreenOpen, setIsMyLevelScreenOpen] = useState<boolean>(false);

  const [isBlockListScreenOpen, setIsBlockListScreenOpen] = useState<boolean>(false);

  const [isAvatarProtectionScreenOpen, setIsAvatarProtectionScreenOpen] = useState<boolean>(false);

  const [isMarketScreenOpen, setIsMarketScreenOpen] = useState<boolean>(false);

  const [isFAQScreenOpen, setIsFAQScreenOpen] = useState<boolean>(false);

  const [isSettingsScreenOpen, setIsSettingsScreenOpen] = useState<boolean>(false);

  const [isSearchScreenOpen, setIsSearchScreenOpen] = useState<boolean>(false);

  const [isEndStreamSummaryOpen, setIsEndStreamSummaryOpen] = useState<boolean>(false);

  const [streamSummaryData, setStreamSummaryData] = useState<StreamSummaryData | null>(null);

  const [isEndStreamConfirmOpen, setIsEndStreamConfirmOpen] = useState<boolean>(false);

  const [isPrivateChatModalOpen, setIsPrivateChatModalOpen] = useState<boolean>(false);

  const [isPKTimerSettingsOpen, setIsPKTimerSettingsOpen] = useState(false);

  const [pkBattleDuration, setPkBattleDuration] = useState(7);

  const [isPipSettingsModalOpen, setIsPipSettingsModalOpen] = useState(false);

  const [liveSession, setLiveSession] = useState<LiveSessionState | null>(null);

  const [isPrivateInviteModalOpen, setIsPrivateInviteModalOpen] = useState<boolean>(false);

  const [photoViewerData, setPhotoViewerData] = useState<{ photos: FeedPhoto[], initialIndex: number } | null>(null);

  const [isLiveHistoryOpen, setIsLiveHistoryOpen] = useState(false);

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const [isVIPCenterOpen, setIsVIPCenterOpen] = useState(false);

  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);

  const [paymentSuccessData, setPaymentSuccessData] = useState<PaymentSuccessData | null>(null);

  const [liveNotification, setLiveNotification] = useState<ExtendedLiveNotification | null>(null);

  const [privateInviteData, setPrivateInviteData] = useState<InviteData | null>(null);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  // 🔔 Fila de notificações flutuantes in-app (ao vivo / convite privado / PK)
  const pushInAppNotification = useCallback((n: InAppNotification) => {
    setInAppNotifications(prev => {
      if (prev.some(p => p.id === n.id)) return prev;
      return [...prev, n].slice(-3);
    });
    // Rede de segurança: se a animação da faixa não disparar, remove mesmo assim
    setTimeout(() => {
      setInAppNotifications(prev => prev.filter(p => p.id !== n.id));
    }, 8000);
  }, []);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [pipStreamer, setPipStreamer] = useState<Streamer | null>(null);

  // REMOVED: local arrays for streamHistory, visitors, purchaseHistory - now fetched from API
  // const [streamHistory, setStreamHistory] = useState<StreamHistoryEntry[]>([]);
  // const [visitors, setVisitors] = useState<Visitor[]>([]);
  // const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);

  // Dados críticos devem vir sempre da API - não usar estado estático

  const [streamers, setStreamers] = useState<Streamer[]>([]);

  const [voiceRooms, setVoiceRooms] = useState<VoiceRoomType[]>([]);

  const [isLoadingStreamers, setIsLoadingStreamers] = useState(false);

  const [invitedStreamIds, setInvitedStreamIds] = useState<string[]>([]);

  const [countries, setCountries] = useState<Country[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [friends, setFriends] = useState<User[]>([]);

  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  const [fans, setFans] = useState<User[]>([]);

  // These arrays are now fetched from API when needed
  const [streamHistory, setStreamHistory] = useState<StreamHistoryEntry[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);

  const [allGifts, setAllGifts] = useState<Gift[]>([]);

  const [reminderStreamers, setReminderStreamers] = useState<Streamer[]>([]);

  // REMOVED: selectedCountry state - now always uses currentUser.country from MongoDB
  // const [selectedCountry, setSelectedCountry] = useState<string>('ICON_GLOBE');

  const [activeCategory, setActiveCategory] = useState('popular');

  // Filtro de país para a listagem de lives (SOMENTE visualização - não mexe no perfil)
  const [selectedCountry, setSelectedCountry] = useState<string>('ICON_GLOBE');

  // Função global para atualizar streams a partir do GoLiveScreen
  useEffect(() => {
    // Expor função globalmente para o GoLiveScreen poder atualizar streams
    (window as any).setGlobalStreamers = (streams: Streamer[]) => {
      console.log('setGlobalStreamers chamado com:', streams.length, 'streams');
      setStreamers(streams);
    };

    // Cleanup ao desmontar
    return () => {
      delete (window as any).setGlobalStreamers;
    };
  }, []);

  // A lista de conversas só recebe novos contatos quando houver mensagem real
  // trocada — tratado no listener de 'newChatMessage' (upsert da conversa).

  // Sempre buscar dados da API - não usar localStorage
  useEffect(() => {

    const restoreSession = async () => {

      // 🔐 REGRA DO DONO: login SÓ na 1ª vez ou após logout explícito.
      // Quem tem usuário em cache ENTRA DIRETO e NUNCA é jogado pra tela de
      // login — nem com rede ruim, nem com token expirado, nem com resposta
      // vazia da API. A API abaixo apenas ATUALIZA os dados em background.
      const cachedUser = readCachedUser();
      cachedUserRef.current = cachedUser;

      if (cachedUser) {
        setCurrentUser(cachedUser);
        (window as any).currentUser = cachedUser;
        setIsAuthenticated(true);
        setIsLoadingCurrentUser(false);
      }

      try {

        // Aquece o token na memória da API (lê do localStorage)
        const { getAuthToken } = await import('./components/utils/TokenStorage');
        const token = await getAuthToken();

        if (!token && !cachedUser) {
          // Primeira vez MESMO (nada salvo) → tela de login
          console.warn('⚠️ Token não encontrado no banco de dados');
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoadingCurrentUser(false);
          return;
        }

        // Tentar buscar usuário atual da API
        try {
          const user = await api.getCurrentUser();

          if (user && (user as any).id) {
            // Dados frescos do banco → atualiza em silêncio (sem flash)
            setCurrentUser(user);
            (window as any).currentUser = user;
            setIsAuthenticated(true);
            cachedUserRef.current = user;
            try { localStorage.setItem('livego_cached_user', JSON.stringify(user)); } catch { }
          } else if (!cachedUser) {
            // Sem usuário válido na API e sem cache → login
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
          // ⚠️ COM cache: resposta vazia/inválida NÃO desloga — permanece dentro.

        } catch {
          // Rede falhou OU token expirado: SEM cache → login; COM cache → PERMANECE.
          if (!cachedUser) {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }

      } catch {
        // Erro inesperado: mantém o que temos (nunca derruba sessão ativa)
      } finally {
        setIsLoadingCurrentUser(false);
      }

      // 🔄 Validação automática: renova o token em background (throttle 12h)
      maybeRefreshTokenSilently();

    };

    restoreSession();

  }, []);

  // 🔄 Sempre que o app VOLTA do segundo plano → valida/renova o token
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeRefreshTokenSilently();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);


  // Aplicar configurações de zoom quando usuário está disponível

  useZoomSettings(currentUser?.id);



  // Gerenciar status online do usuário

  const { setUserOnline, setUserOffline } = useUserStatus(currentUser?.id);






  // Marcar usuário como online quando autenticado

  useEffect(() => {

    if (isAuthenticated && currentUser?.id) {

      setUserOnline();

    }

  }, [isAuthenticated, currentUser?.id]);



  // Marcar usuário como offline quando sair da página

  useEffect(() => {

    const handleBeforeUnload = () => {

      if (currentUser?.id) {

        setUserOffline();

      }

    };



    const handleVisibilityChange = async () => {
      // Quando volta para foreground: atualizar status + buscar dados frescos do servidor
      // Isso garante que avatares, nomes e outros dados alterados em outro dispositivo apareçam imediatamente
      if (!document.hidden && isAuthenticated && currentUser?.id) {
        setUserOnline();
        try {
          const freshUser = await api.getCurrentUser();
          if (freshUser && freshUser.id === currentUserRef.current?.id) {
            const cur = currentUserRef.current;
            if (cur && (cur.avatarUrl !== freshUser.avatarUrl || cur.name !== freshUser.name || JSON.stringify(cur.obras) !== JSON.stringify(freshUser.obras))) {
              updateUserEverywhere(freshUser);
            }
          }
        } catch (_) {}
      }
    };



    window.addEventListener('beforeunload', handleBeforeUnload);

    document.addEventListener('visibilitychange', handleVisibilityChange);



    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Não marcar como offline no cleanup - usuário ainda pode estar ativo
    };

  }, [currentUser?.id, isAuthenticated]);



  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const loadInitialData = async () => {
      setIsLoadingStreamers(true);
      try {
        console.log('📦 [App] Carregando dados iniciais...');

        // ⚡ ABERTURA RÁPIDA: mostra o feed do cache antes de buscar na rede.
        // A busca fresca atualiza a grid em seguida (sem spinner em branco).
        try {
          const cachedStreams = JSON.parse(localStorage.getItem('livego_cached_streams') || 'null');
          if (Array.isArray(cachedStreams) && cachedStreams.length > 0) {
            setStreamers(cachedStreams);
          }
        } catch { }

        // Carregar dados em paralelo para maior performance
        const filterCountry = selectedCountry !== 'ICON_GLOBE' ? selectedCountry : undefined;
        const [streams, countries, gifts, voiceRoomsData] = await Promise.all([
          api.getLiveStreamers('popular', filterCountry),
          api.getRegions(),
          api.getGifts(),
          api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
        ]);

        setStreamers(Array.isArray(streams) ? streams : []);
        setCountries(countries);
        setAllGifts(enrichGiftsWithComponents(gifts));
        setVoiceRooms(voiceRoomsData?.data?.rooms || []);

        // Cache do feed para a próxima abertura abrir instantânea
        try { localStorage.setItem('livego_cached_streams', JSON.stringify(Array.isArray(streams) ? streams : [])); } catch { }

        console.log('✅ [App] Dados iniciais carregados');
      } catch (error) {
        console.error('❌ [App] Erro ao carregar dados iniciais:', error);
        setStreamers([]);
      } finally {
        setIsLoadingStreamers(false);
      }
    };

    loadInitialData();
  }, []);

  // Suporte ao formato /video-room?room_id=X&uid=Y (compatível com TI Live / SRS SFU)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!location.pathname.startsWith('/video-room')) return;
    const params = new URLSearchParams(location.search);
    const roomId = params.get('room_id');
    if (!roomId) {
      navigate('/');
      return;
    }
    navigate(`/live/${roomId}`, { replace: true });
  }, [location.pathname, location.search, isAuthenticated, navigate]);

  // Auto-load stream from URL /live/:streamId
  // Só carrega automaticamente se NÃO acabamos de sair de uma stream
  useEffect(() => {
    if (!isAuthenticated) return;
    if (leftStreamRef.current) {
      // Acabamos de sair de uma stream — não tentar re-entrar
      leftStreamRef.current = false;
      return;
    }
    const match = location.pathname.match(/^\/live\/(.+)$/);
    if (!match || activeStream) return;
    const streamId = decodeURIComponent(match[1]);
    const found = streamers.find(s => s.id === streamId);
    if (found && handleSelectStreamRef.current) {
      handleSelectStreamRef.current(found);
      return;
    }
    // If not in local list, fetch from API
    (async () => {
      try {
        const data = await api.getLiveDetails(streamId);
        if (data && handleSelectStreamRef.current) {
          handleSelectStreamRef.current(data);
        } else {
          navigate('/');
        }
      } catch {
        navigate('/');
      }
    })();
  }, [location.pathname, isAuthenticated, activeStream]);



  // Sync locationPermissionStatus with currentUser.locationPermission from MongoDB
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    if (currentUser?.locationPermission) {
      setLocationPermissionStatus(currentUser.locationPermission as any);
    }
  }, [currentUser?.locationPermission]);



  // Carregar dados do usuário logado (conversas, amigos, fãs, seguindo)

  useEffect(() => {

    if (!currentUser?.id) return;    const loadUserData = async () => {

      try {

        // ⚡ FASE 1: Dados críticos (conversas, amigos, seguindo) — carrega PRIMEIRO
        // pra tela de mensagens ficar instantânea.
        const [convs, friendList, following] = await Promise.allSettled([

          api.getConversations(currentUser.id),

          api.getFriends(currentUser.id),

          api.getFollowingUsers(currentUser.id),

        ]);

        if (convs.status === 'fulfilled' && Array.isArray(convs.value)) {
          setConversations(convs.value);
        }
        if (friendList.status === 'fulfilled' && Array.isArray(friendList.value)) {
          setFriends(friendList.value);
        }
        if (following.status === 'fulfilled' && Array.isArray(following.value)) {
          setFollowingUsers(following.value);
          setCurrentUser(prev => prev ? { ...prev, following: following.value.length } : prev);
        }

        // ⚡ FASE 2: Dados secundários (fans, histórico, visitantes) — em background,
        // NÃO bloqueia a UI.
        Promise.allSettled([

          api.getFansUsers(currentUser.id),

          api.getStreamHistory(),

          api.getVisitors(currentUser.id),

          api.getWithdrawalHistory(currentUser.id),

          api.getPurchaseHistory(currentUser.id),

        ]).then(([fans, streamHistory, visitors, withdrawalHistory, purchases]) => {

          if (fans.status === 'fulfilled' && Array.isArray(fans.value)) setFans(fans.value);
          if (streamHistory.status === 'fulfilled' && Array.isArray(streamHistory.value)) setStreamHistory(streamHistory.value);
          if (visitors.status === 'fulfilled' && Array.isArray(visitors.value)) setVisitors(visitors.value);
          if (withdrawalHistory.status === 'fulfilled' && Array.isArray(withdrawalHistory.value)) setPurchaseHistory(withdrawalHistory.value);
          if (purchases.status === 'fulfilled' && Array.isArray(purchases.value) && purchases.value.length > 0) setPurchaseHistory(purchases.value);
        });

      } catch (error) {

        console.error('❌ [App] Erro ao carregar dados do usuário:', error);

      }

    };



    loadUserData();

  }, [currentUser?.id]);



  useEffect(() => {
    if (!currentUser) return;

    const handlePKInvite = (e: Event) => {
      const invite = (e as CustomEvent).detail;
      // Only care about invites destined to the current logged-in user
      if (invite && (invite.inviteeId === currentUser.id || invite.invitee_id === currentUser.id)) {
        console.log("⚔️ [PK-INVITE] Received pending invite:", invite);
        setActivePKInvite(invite);
      }
    };

    const handlePKInviteResponse = async (e: Event) => {
      const resp = (e as CustomEvent).detail;
      console.log("⚔️ [PK-RESPONSE] Invite response received:", resp);
      
      const currentStreamId = activeStream?.id;
      if (currentStreamId && resp.status === 'accepted') {
        const opponentUser = streamers.find((s: any) => s.id === resp.invitee_id || s.id === resp.inviteeId) || 
                             listScreenUsers.find((u: any) => u.id === resp.invitee_id || u.id === resp.inviteeId);
                             
        if (opponentUser) {
          addToast(ToastType.Success, `Desafio aceito por ${opponentUser.name}! Iniciando PK...`);
          try {
            const battleResp = await api.startPKBattle(currentUser.id, currentStreamId, opponentUser.id);
            if (battleResp?.battleId) setPkBattleId(String(battleResp.battleId));
            setPkOpponent(opponentUser as unknown as User);
            setIsPKBattleActive(true);
          } catch (err) {
            console.error("Error starting battle:", err);
          }
        }
      } else if (resp.status === 'declined') {
        addToast(ToastType.Error, "O oponente recusou o desafio de batalha PK.");
      }
    };

    window.addEventListener('livego:pk_invite', handlePKInvite);
    window.addEventListener('livego:pk_invite_response', handlePKInviteResponse);

    // ─── Eventos de estado da batalha PK ───
    const handlePKBattleStarted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("⚔️ [PK-STARTED] Battle started event:", detail);
      if (!detail) return;
      // ⚠️ O backend pode enviar battleId como roomId (streamId) ou como o _id do Battle.
      // Usamos pkBattleId do REST (setado antes) se disponível; caso contrário, usamos o do socket.
      // O pkBattleId do REST já foi setado em handlePKInviteResponse.
      if (detail.battleId && !pkBattleId) {
        setPkBattleId(String(detail.battleId));
      }
      // O oponente é o participante que NÃO é o usuário atual (streamerA/B).
      const myId = currentUser?.id;
      const aId = detail.streamerAId || detail.streamerA;
      const bId = detail.streamerBId || detail.streamerB;
      let opponentId = detail.opponentId || detail.streamerB;
      if (myId && aId && bId) {
        opponentId = String(myId) === String(aId) ? bId : aId;
      } else if (myId && opponentId && String(opponentId) === String(myId)) {
        opponentId = detail.streamerAId || detail.streamerA || opponentId;
      }
      if (opponentId) {
        // Buscar por streamId OU hostId (nos dados das streams carregadas)
        const opponentUser = streamers.find((s: any) => String(s.id) === String(opponentId) || String(s.hostId) === String(opponentId));
        if (opponentUser) {
          setPkOpponent(opponentUser as unknown as User);
          setIsPKBattleActive(true);
          addToast(ToastType.Success, '⚔️ Batalha PK iniciada!');
        } else {
          // Buscar usuário real da API como fallback
          api.getUser(String(opponentId)).then((realOpponent) => {
            if (realOpponent) {
              setPkOpponent(realOpponent as unknown as User);
              setIsPKBattleActive(true);
              addToast(ToastType.Success, '⚔️ Batalha PK iniciada!');
            } else {
              console.warn('[PK] Oponente não encontrado — batalha não iniciada');
              addToast(ToastType.Error, 'Não foi possível iniciar a batalha PK: oponente não encontrado');
            }
          }).catch(() => {
            console.warn('[PK] Oponente não encontrado — batalha não iniciada');
            addToast(ToastType.Error, 'Não foi possível iniciar a batalha PK: oponente não encontrado');
          });
        }
      }
    };

    const handlePKBattleEnded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("⚔️ [PK-ENDED] Battle ended event:", detail);
      if (detail && detail.streamId && detail.streamId !== activeStream?.id) return;
      addToast(ToastType.Info, detail?.reason || 'Batalha PK encerrada.');
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setPkBattleId(null);
      setActivePKInvite(null);
    };

    const handlePKScoreUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      // ⚠️ O backend emite pk_score_update SEM streamId, apenas battleId.
      // Se temos battleId, verificar se é da battle atual (usa ref para valor atualizado).
      const currentBattleId = pkBattleIdRef.current;
      if (detail.battleId && currentBattleId && String(detail.battleId) !== String(currentBattleId)) return;
      // Re-despachar como pk_score_sync para PKBattleScreen consumir
      window.dispatchEvent(new CustomEvent('livego:pk_score_sync', { 
        detail: { scoreA: detail.scoreA || detail.teamAScore, scoreB: detail.scoreB || detail.teamBScore }
      }));
    };

    const handlePKTimerSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.streamId && detail.streamId !== activeStream?.id) return;
      if (detail && detail.timeLeft !== undefined) {
        window.dispatchEvent(new CustomEvent('livego:pk_timer_sync', { 
          detail: { timeLeft: detail.timeLeft }
        }));
      }
    };

    window.addEventListener('livego:pk_battle_started', handlePKBattleStarted);
    window.addEventListener('livego:pk_battle_ended', handlePKBattleEnded);
    window.addEventListener('livego:pk_score_update', handlePKScoreUpdate);
    window.addEventListener('livego:pk_timer_sync', handlePKTimerSync);

    // Initial check for pending invites
    const checkPendingInvites = async () => {
      try {
        const res = await api.getPendingPKInvites(currentUser.id);
        if (res && res.success && res.invites && res.invites.length > 0) {
          setActivePKInvite(res.invites[0]);
        }
      } catch (err) {
        console.error("Error loading pending invites:", err);
      }
    };
    checkPendingInvites();

    return () => {
      window.removeEventListener('livego:pk_invite', handlePKInvite);
      window.removeEventListener('livego:pk_invite_response', handlePKInviteResponse);
      window.removeEventListener('livego:pk_battle_started', handlePKBattleStarted);
      window.removeEventListener('livego:pk_battle_ended', handlePKBattleEnded);
      window.removeEventListener('livego:pk_score_update', handlePKScoreUpdate);
      window.removeEventListener('livego:pk_timer_sync', handlePKTimerSync);
    };
  }, [currentUser, activeStream, streamers]);

  const [rankingData, setRankingData] = useState<Record<string, RankedUser[]>>(INITIAL_DATA.rankingData);

  const [listScreenUsers, setListScreenUsers] = useState<User[]>([]);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(INITIAL_DATA.notificationSettings);   // 🔔 Notificações in-app GLOBAIS (Socket.IO + push nativo): faixa de ao vivo,
  // convite privado e convite PK aparecem mesmo fora da StreamRoom.
  useGlobalNotifications({
    enabled: isAuthenticated && !!currentUser?.id,
    userId: currentUser?.id,
    streamerLiveEnabled: notificationSettings?.streamerLive !== false,
    skipInvitesWhenInStream: !!activeStream,
    onNotification: pushInAppNotification,
  });

  // ⚔️ PK INVITE GLOBAL — garante que o convite de batalha (pk-battle) SEMPRE
  // apareça na tela do convidado com Aceitar/Recusar, dentro OU fora de uma
  // stream. Conecta ao Socket.IO (sala user_{id}) e também usa polling REST
  // como fallback, para nunca perder o convite. Ao ser aceito, o backend já
  // cria a Battle e emite pk_battle_start para os dois lados — aqui fazemos a
  // ponte global para que ambos entrem na tela de PK.
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    let disposed = false;
    const seenInviteIds = new Set<string>();

    const openPKInvite = (detail: any) => {
      if (disposed || !detail) return;
      const inviteId = detail.inviteId || detail._id || detail.id || '';
      if (inviteId) {
        if (seenInviteIds.has(String(inviteId))) return;
        seenInviteIds.add(String(inviteId));
      }
      // Só aceita convites PK destinados a este usuário
      const type = String(detail.inviteType || detail.type || '');
      if (type && type !== 'pk-battle') return;
      const inviteeId = detail.inviteeId || detail.invitee_id || detail.inviteeUsername || '';
      if (inviteeId && inviteeId !== currentUser.id) return;
      // Evita reabrir se já está numa batalha ativa
      if (activePKInvite) return;

      const inviterId = detail.fromUserId || detail.from || detail.inviterId || detail.inviter_id || detail.inviterUsername || '';
      setActivePKInvite({
        id: inviteId,
        invite_id: inviteId,
        inviteType: 'pk-battle',
        streamId: detail.streamId || '',
        inviterId: inviterId,
        inviter_id: inviterId,
        inviterUsername: inviterId,
        inviterName: detail.fromUserName || detail.fromName || detail.inviterName || inviterId,
        inviterAvatar: detail.fromUserAvatar || detail.inviterAvatar || '',
      });
    };

    const unsubs: Array<() => void> = [];

    const setup = async () => {
      const s = await connectSocket();
      if (disposed || !s?.connected) return;
      const onLiveInviteRaw = (d: any) => openPKInvite(d);
      const onLiveInviteTimeout = (d: any) => {
        if (!d) return;
        setActivePKInvite(prev => (prev && String(prev.id || prev.invite_id) === String(d.inviteId)) ? null : prev);
      };
      const onLiveInviteConfirmed = (d: any) => {
        if (!d) return;
        setActivePKInvite(prev => (prev && String(prev.id || prev.invite_id) === String(d.inviteId)) ? null : prev);
      };
      const onLiveInviteResponse = (d: any) => {
        if (!d || !currentUser) return;
        const isInviter = !d.from || d.from === currentUser.id || d.inviteType === 'pk-battle';
        if (String(d.inviteType) === 'pk-battle') {
          if (d.status === 'declined') {
            addToast(ToastType.Error, 'O oponente recusou o desafio de batalha PK.');
          }
        }
      };
      // ⚔️ Ponte global: pk_battle_start / pk_battle_end → window event, para
      // que AMBOS os lados entrem/ saiam da tela de PK mesmo fora da stream.
      const onPKBattleStart = (d: any) => {
        if (!d) return;
        window.dispatchEvent(new CustomEvent('livego:pk_battle_started', { detail: d }));
      };
      const onPKBattleEnd = (d: any) => {
        if (!d) return;
        window.dispatchEvent(new CustomEvent('livego:pk_battle_ended', { detail: d }));
      };
      // 🤝 Convite para subir no palco de uma sala de voz (global — qualquer tela)
      const onStageInvite = (d: any) => {
        if (disposed || !d) return;
        if (d.invitee?.id || d.inviteeId) {
          const target = String(d.inviteeId || d.invitee?.id || '');
          if (target && target !== currentUser?.id) return;
        }
        // Se o usuário JÁ está dentro desta mesma sala, quem trata é o VoiceRoom
        // (evita dois modais empilhados).
        const evRoom = String(d.roomId || '');
        if (evRoom && location.pathname === `/voice-room/${evRoom}`) return;
        // Não reabrir se já há um convite ativo
        setStageInvite(prev => {
          if (prev) return prev;
          return {
            roomId: evRoom,
            roomName: d.roomName || 'Sala de voz',
            inviterId: d.inviterId || d.hostId || '',
            inviterName: d.inviterName || d.hostName || 'Anfitrião',
            inviterAvatar: d.hostAvatar || d.inviterAvatar || '',
          };
        });
      };
      s.on('live_invite', onLiveInviteRaw);
      s.on('live_invite_timeout', onLiveInviteTimeout);
      s.on('live_invite_confirmed', onLiveInviteConfirmed);
      s.on('live_invite_response', onLiveInviteResponse);
      s.on('pk_battle_start', onPKBattleStart);
      s.on('pk_battle_end', onPKBattleEnd);
      s.on('voice_stage_invite', onStageInvite);
      unsubs.push(() => s.off('live_invite', onLiveInviteRaw));
      unsubs.push(() => s.off('live_invite_timeout', onLiveInviteTimeout));
      unsubs.push(() => s.off('live_invite_confirmed', onLiveInviteConfirmed));
      unsubs.push(() => s.off('live_invite_response', onLiveInviteResponse));
      unsubs.push(() => s.off('pk_battle_start', onPKBattleStart));
      unsubs.push(() => s.off('pk_battle_end', onPKBattleEnd));
      unsubs.push(() => s.off('voice_stage_invite', onStageInvite));
    };
    setup();

    // 🪫 Fallback confiável: polling REST dos convites PK pendentes (fora da
    // stream também), para nunca perder o convite.
    const pollPending = async () => {
      if (disposed || !currentUser?.id) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res: any = await api.get(`/api/live/invites/pending?username=${encodeURIComponent(currentUser.id)}`);
        const invites = Array.isArray(res?.invites) ? res.invites : [];
        for (const inv of invites) {
          if (String(inv.inviteType) !== 'pk-battle') continue;
          openPKInvite({
            inviteId: String(inv._id || inv.id || ''),
            inviteType: inv.inviteType,
            streamId: inv.streamId || '',
            inviterId: inv.inviterUsername || '',
            inviterUsername: inv.inviterUsername || '',
            inviterName: inv.inviterName || inv.inviterUsername || 'Usuário',
            inviterAvatar: inv.inviterAvatar || '',
          });
        }
      } catch { /* silencioso */ }
    };
    pollPending();
    const pollInterval = setInterval(pollPending, 8000);

    return () => {
      disposed = true;
      clearInterval(pollInterval);
      unsubs.forEach(u => u());
    };
  }, [isAuthenticated, currentUser?.id]);

  // ⚡ CARD AO VIVO EM TEMPO REAL (WebSocket): quando o backend emite
  // 'new_live'/'stream_started' (disparado pelo on_publish do SRS), o card
  // do streamer aparece INSTANTANEAMENTE na lista — sem precisar recarregar.
  // Preenche os detalhes completos via API em background; o card mínimo
  // (nome/avatar) já entra na lista na hora.
  const liveCardSeenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    let disposed = false;
    let socket: any = null;

    const addLiveCard = (data: any) => {
      if (!data || disposed) return;
      const streamId = String(data.id || data.streamId || data.streamKey || '');
      const hostId = String(data.hostId || data.userId || '');
      if (!streamId && !hostId) return;

      const key = streamId || hostId;
      if (liveCardSeenRef.current.has(key)) return; // dedupe por evento
      liveCardSeenRef.current.add(key);

      // 1) Card MÍNIMO instantâneo (aparece na hora, sem esperar API)
      const name = data.name || 'Transmissão ao vivo';
      const avatar = data.avatar || '';
      setStreamers(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const exists = list.some(s => String(s.id) === streamId || String(s.hostId) === hostId);
        if (exists) return list;
        const newCard = {
          id: streamId,
          streamKey: streamId,
          hostId: hostId || streamId,
          name,
          avatar,
          isLive: true,
          streamStatus: 'active',
          country: data.country || 'BR',
          viewers: data.viewers || 0,
          category: data.category || 'popular',
          diamonds: 0,
        } as Streamer;
        return [newCard, ...list];
      });

      // 2) Preencher detalhes completos do card em background (sem bloquear)
      if (streamId) {
        api.getLiveDetails(streamId).then((details: any) => {
          if (disposed || !details) return;
          setStreamers(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map(s => String(s.id) === streamId ? { ...s, ...details } : s);
          });
        }).catch(() => {/* card mínimo já está na tela */});
      }
    };

    // 🚫 Remove um card da lista de lives em tempo real quando o host encerra
    // (eventos emitidos pelo backend: card_removed / stream_ended / stream_stopped).
    const removeLiveCard = (data: any) => {
      if (!data || disposed) return;
      const streamId = String(data.streamId || data.id || '');
      const hostId = String(data.hostId || '');
      setStreamers(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const next = list.filter(s => {
          if (streamId && String(s.id) === streamId) return false;
          if (streamId && String(s.streamKey) === streamId) return false;
          if (hostId && (String(s.hostId) === hostId || String(s.id) === hostId)) return false;
          return true;
        });
        return next;
      });
    };

    connectSocket().then(s => {
      if (disposed || !s?.connected) return;
      socket = s;
      s.on('new_live', addLiveCard);
      s.on('stream_started', addLiveCard);
      s.on('card_removed', removeLiveCard);
      s.on('stream_ended', removeLiveCard);
      s.on('stream_stopped', removeLiveCard);
      // 💬 Chat privado: o socket conectado já entra na sala `user_{id}` do
      // backend; a ponte repassa `newChatMessage` para o window (tempo real).
      initPrivateChatSocket();
    });

    // 🔒 Proteção de conteúdo: bloqueio de print/gravação/download em live e
    // mídia protegida (instala UMA vez — service é idempotente).
    installContentProtection();

    return () => {
      disposed = true;
      if (socket) {
        socket.off('new_live', addLiveCard);
        socket.off('stream_started', addLiveCard);
        socket.off('card_removed', removeLiveCard);
        socket.off('stream_ended', removeLiveCard);
        socket.off('stream_stopped', removeLiveCard);
      }
    };
  }, [isAuthenticated, currentUser?.id]);

  // 🔑 Lives privadas para as quais o usuário foi convidado (cadeado na lista)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      setInvitedStreamIds([]);
      return;
    }
    let disposed = false;

    const refreshInvitedStreams = () => {
      api.getInvitedStreams(currentUser.id)
        .then(data => {
          if (disposed) return;
          const ids = Array.isArray(data?.streamIds) ? data.streamIds.map(String) : [];
          setInvitedStreamIds(prev => {
            const merged = new Set([...prev, ...ids]);
            return Array.from(merged);
          });
        })
        .catch(() => {/* segue sem a lista de convidados */});
    };

    refreshInvitedStreams();

    // Atualizar em tempo real quando um novo convite chegar
    let socket: any = null;
    connectSocket().then(s => {
      if (disposed || !s?.connected) return;
      socket = s;
      const onInvite = () => refreshInvitedStreams();
      s.on('private_stream_invite', onInvite);
      s.on('invite_sent', onInvite);
    });

    return () => {
      disposed = true;
      if (socket) {
        socket.off('private_stream_invite');
        socket.off('invite_sent');
      }
    };
  }, [isAuthenticated, currentUser?.id]);

  const [lastPhotoLikeUpdate, setLastPhotoLikeUpdate] = useState<number>(0);

  // Refs para evitar loops no useEffect dos sockets
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  const pipStreamerRef = useRef(pipStreamer);
  useEffect(() => { pipStreamerRef.current = pipStreamer; }, [pipStreamer]);
  const handleSelectStreamRef = useRef<((streamer: Streamer) => Promise<void>) | null>(null);
  const swInitializedRef = useRef(false);
  // Refs de estado para uso em listeners globais (SW auto-update)
  const activeStreamRef = useRef(activeStream);
  useEffect(() => { activeStreamRef.current = activeStream; }, [activeStream]);
  // Flag para evitar que o auto-load effect re-entre em uma stream que acabou de ser encerrada
  const leftStreamRef = useRef(false);

  // REMOVED: duplicate declarations - these are now fetched from API and declared earlier
  // const [streamHistory, setStreamHistory] = useState<StreamHistoryEntry[]>(INITIAL_DATA.streamHistory);
  // const [visitors, setVisitors] = useState<Visitor[]>(INITIAL_DATA.visitors);
  // const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>(INITIAL_DATA.purchaseHistory);



  const { t, language, setLanguage } = useTranslation();



  // Calculate total unread messages for footer badge

  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);



  const addToast = useCallback((type: ToastType, message: string, options?: { title?: string; avatar?: string }) => {

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => [...prev, { id, type, message, title: options?.title, avatar: options?.avatar }]);

    setTimeout(() => {

      setToasts(prev => prev.filter(t => t.id !== id));

    }, 3000);

  }, []);

  // 💬 Handlers da notificação flutuante estilo WhatsApp
  const handleDismissFloatingNotif = useCallback((id: string) => {
    setFloatingNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleTapFloatingNotif = useCallback((sender: User) => {
    // Remove a notificação
    setFloatingNotifs(prev => prev.filter(n => n.sender.id !== sender.id));
    // Abre o chat com o remetente (limpa badge + abre tela)
    setConversations(prev => prev.map(c =>
      c.friend?.id === sender.id ? { ...c, unreadCount: 0 } : c
    ));
    setChattingWith(sender);
  }, []);

  // 🛡️ REGRA DO DONO: proteção de tela funciona SOMENTE DENTRO DA SALA DE
  // TRANSMISSÃO (activeStream definido ao entrar na live e limpo ao sair).
  // FORA da sala — cards, listas, perfil, chat — NENHUMA proteção, bloqueio
  // ou mensagem deve aparecer.
  // Enquanto DENTRO da sala: print/gravação dispara aviso "NÃO PERMITIDO",
  // app Android nativo fica PRETO na gravação (FLAG_SECURE), e salvar/copiar/
  // arrastar imagens é bloqueado. A LIVE continua podendo ser compartilhada.
  useEffect(() => {
    const enabled = !!activeStream;
    if (!enabled) return;

    const root = document.documentElement;
    let styleEl: HTMLStyleElement | null = null;

    const isImage = (target: EventTarget | null): boolean => {
      const t = target as HTMLElement | null;
      return !!t && typeof t.closest === 'function' && !!t.closest('img, canvas');
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isImage(e.target)) {
        e.preventDefault();
        addToast(ToastType.Error, 'Não é permitido salvar imagens com a proteção de tela ativa.');
      }
    };

    const onDragStart = (e: DragEvent) => {
      if (isImage(e.target)) e.preventDefault();
    };

    const onCopy = (e: ClipboardEvent) => {
      if (isImage(e.target)) e.preventDefault();
    };

    const onClickDownload = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const link = t && typeof t.closest === 'function' ? t.closest('a[download]') as HTMLAnchorElement | null : null;
      if (link && /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(link.getAttribute('href') || '')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    root.classList.add('screen-security-enabled');
    styleEl = document.createElement('style');
    styleEl.textContent = `
      .screen-security-enabled img,
      .screen-security-enabled canvas {
        -webkit-touch-callout: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(styleEl);

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('click', onClickDownload, true);

    // App Android nativo: FLAG_SECURE → tela preta ao tentar print/gravar
    const bridge = (window as any).Android;
    if (bridge && typeof bridge.setScreenSecure === 'function') {
      try { bridge.setScreenSecure(true); } catch (_) {}
    }

    // Bloqueia compartilhar FOTO/VIDEO (ex.: bot do Telegram) — a LIVE
    // (link de página) continua podendo ser compartilhada normalmente.
    const isMediaShare = (data: any): boolean => {
      if (!data) return false;
      if (Array.isArray(data.files) && data.files.length > 0) return true;
      const url = typeof data.url === 'string' ? data.url : '';
      return /\.(jpe?g|png|gif|webp|bmp|heic|mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(url);
    };
    let restoredShare: (() => void) | null = null;
    if (typeof navigator.share === 'function') {
      const original = (navigator as any).share;
      try {
        (navigator as any).share = (data: any) => {
          if (isMediaShare(data)) {
            addToast(ToastType.Error, 'Não é permitido compartilhar foto ou vídeo com a proteção de tela ativa.');
            return Promise.reject(new Error('Compartilhamento de mídia bloqueado pela proteção de tela.'));
          }
          return original.call(navigator, data);
        };
        restoredShare = () => { (navigator as any).share = original; };
      } catch (_) {}
    }

    // 🚫 TENTATIVA DE PRINT/CAPTURA NO NAVEGADOR (melhor esforço): não existe
    // API web que escureça SÓ a gravação (o gravador captura o que a tela
    // mostra). Então aqui NÃO bloqueamos a tela de quem assiste: só aparece o
    // aviso "NÃO PERMITIDO". O vídeo da gravação/print fica PRETO de verdade
    // no app Android nativo (FLAG_SECURE via bridge setScreenSecure abaixo).
    let captureViolated = false;

    const showCaptureWarning = () => {
      addToast(ToastType.Error, 'NÃO PERMITIDO — captura de tela/gravação bloqueada.');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') captureViolated = true;
    };
    const onWindowBlur = () => { captureViolated = true; };
    const onReturnVisible = () => {
      if (!captureViolated) return;
      captureViolated = false;
      showCaptureWarning();
    };
    // Ponte para o app Android nativo: o WebView chama window.onScreenCaptureAttempt()
    // (ex.: Android 14 DETECT_SCREEN_CAPTURE / onUserLeaveHint) ou dispara o
    // evento 'screen_capture_attempt' — aqui apenas mostra o aviso (o preto da
    // gravação é o FLAG_SECURE nativo).
    const nativeAttempt = () => showCaptureWarning();
    (window as any).onScreenCaptureAttempt = nativeAttempt;
    window.addEventListener('screen_capture_attempt', nativeAttempt as EventListener);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onReturnVisible);
    window.addEventListener('pageshow', onReturnVisible);

    return () => {
      root.classList.remove('screen-security-enabled');
      if (styleEl) styleEl.remove();
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('click', onClickDownload, true);
      delete (window as any).onScreenCaptureAttempt;
      window.removeEventListener('screen_capture_attempt', nativeAttempt as EventListener);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onReturnVisible);
      window.removeEventListener('pageshow', onReturnVisible);
      const bridge2 = (window as any).Android;
      if (bridge2 && typeof bridge2.setScreenSecure === 'function') {
        try { bridge2.setScreenSecure(false); } catch (_) {}
      }
      if (restoredShare) restoredShare();
    };

  }, [activeStream, addToast]);

  // 🔔 Ativa notificações via gesto do usuário — navegadores móveis ignoram
  // requestPermission fora de um toque, então o CTA/botão é o gatilho correto.
  const handleEnableNotifications = useCallback(async () => {
    setShowNotifCta(false);
    if (!currentUserRef.current) return;
    try {
      const { requestNotificationPermission } = await import('./services/notificationService');
      const status = await requestNotificationPermission(currentUserRef.current.id);
      if (status === 'granted') {
        addToast(ToastType.Success, '🔔 Notificações ativadas! Você será avisado quando seus streamers entrarem ao vivo.');
      } else if (status === 'denied') {
        addToast(ToastType.Error, '🔕 Permissão negada. Ative nas configurações do navegador: 🔒 (endereço) → Permissões → Notificações → Permitir.');
      } else if (status === 'unsupported') {
        addToast(ToastType.Info, 'ℹ️ Seu navegador não suporta notificações. Instale o app pela tela de início para recebê-las.');
      }
    } catch (err) {
      console.warn('[NOTIFICATION] Erro ao ativar notificações:', err);
    }
  }, [addToast]);

  const updateUserEverywhere = useCallback((updatedUser: User) => {

    const updater = (users: User[] | undefined) => {
      if (!users || !Array.isArray(users)) return [];
      return users.map(u => u.id === updatedUser.id ? updatedUser : u);
    };

    const cur = currentUserRef.current;
    if (cur?.id === updatedUser.id) {

      // Só re-renderiza se realmente houve mudança (evita loop)
      if (JSON.stringify(cur) !== JSON.stringify(updatedUser)) {
        setCurrentUser(updatedUser);
        (window as any).currentUser = updatedUser;
      }

      // Só persiste no backend se campos de perfil mudaram (não runtime: diamonds, earnings, isOnline etc.)
      const profileFields: (keyof User)[] = ['name', 'avatarUrl', 'coverUrl', 'bio', 'gender', 'birthday', 'residence', 'profession', 'emotional_status', 'tags', 'city', 'state', 'country', 'age', 'isAvatarProtected', 'chatPermission', 'pipEnabled', 'locationPermission', 'showActivityStatus', 'showLocation', 'privateStreamSettings', 'activeFrameId', 'obras'];
      const hasProfileChange = profileFields.some(f => cur[f] !== updatedUser[f]);
      if (hasProfileChange) {
        api.updateProfile(updatedUser.id, updatedUser).then(res => {
          if (res && res.success) {
            console.log("💾 [AUTOSAVE] Sucesso: Dados do usuário salvos no banco", updatedUser.id);
          }
        }).catch(err => {
          console.error("❌ [AUTOSAVE ERROR] Falha ao persistir alterações no banco:", err);
        });
      }

    }

    if (viewingProfile?.id === updatedUser.id) {

      setViewingProfile(updatedUser);

    }

    if (pkOpponent?.id === updatedUser.id) {

      setPkOpponent(updatedUser);

    }



    setAllUsers(updater);

    setFollowingUsers(updater);

    setFans(updater);

    setFriends(updater);

    setListScreenUsers(updater);



    setConversations(prev => prev.map(c => c.friend.id === updatedUser.id ? { ...c, friend: updatedUser } : c));



    const streamUpdater = (s: Streamer) => s.hostId === updatedUser.id ? { ...s, name: updatedUser.name, avatar: updatedUser.avatarUrl } : s;

    setStreamers(prev => (Array.isArray(prev) ? prev.map(streamUpdater) : []));
    setReminderStreamers(prev => (Array.isArray(prev) ? prev.map(streamUpdater) : []));



    if (activeStream?.hostId === updatedUser.id) {

      setActiveStream(prev => prev ? streamUpdater(prev) : null);

    }

  }, [viewingProfile, pkOpponent, activeStream]);

  // 💎 Atualização de saldo em tempo real via socket: quando o backend emite
  // diamonds_updated (roleta, presentes, etc.), atualiza o saldo do usuário
  // local imediatamente sem precisar recarregar a página.
  useEffect(() => {
    if (!currentUser?.id) return;
    const handleDiamondsUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !data.userId) return;
      if (String(data.userId) === String(currentUser.id) && typeof data.diamonds === 'number') {
        const updated = { ...currentUserRef.current, diamonds: data.diamonds };
        if (typeof data.receptores === 'number') (updated as any).receptores = data.receptores;
        if (typeof data.earnings === 'number') (updated as any).earnings = data.earnings;
        updateUserEverywhere(updated);
      }
    };
    window.addEventListener('livego:diamonds_updated', handleDiamondsUpdated);
    return () => window.removeEventListener('livego:diamonds_updated', handleDiamondsUpdated);
  }, [currentUser?.id, updateUserEverywhere]);

  // 🪙 Contador da LIVE em tempo real (presentes, roleta, PK): o backend emite
  // live_coins_updated (GLOBAL) e TODOS os celulares da sala — host e
  // espectadores — sobem o contador G na hora, sem precisar recarregar.
  useEffect(() => {
    const handleLiveCoinsUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || typeof data.totalCoins !== 'number') return;
      const evRoom = data.streamId || data.roomId || '';
      const activeId = activeStream?.id || '';
      if (activeId) {
        const baseActive = String(activeId).replace(/^stream_/, '');
        const baseEv = String(evRoom).replace(/^stream_/, '');
        if (baseActive !== baseEv) return;
      }
      setLiveSession(prev => (prev ? { ...prev, coins: data.totalCoins } : prev));
    };
    window.addEventListener('livego:live_coins_updated', handleLiveCoinsUpdated);
    return () => window.removeEventListener('livego:live_coins_updated', handleLiveCoinsUpdated);
  }, [activeStream?.id]);

  // 💰 Earnings/receptores da HOST em tempo real: quando alguém dá presente ou
  // gira a roleta, o saldo de diamantes da host (wallet/carteira) sobe na hora
  // na tela dela, sem recarregar.
  useEffect(() => {
    if (!currentUser?.id) return;
    const handleEarningsUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !data.userId) return;
      if (String(data.userId) !== String(currentUser.id)) return;
      const updated = { ...currentUserRef.current };
      let changed = false;
      if (typeof data.totalEarnings === 'number') { (updated as any).earnings = data.totalEarnings; changed = true; }
      if (typeof data.receptores === 'number') { (updated as any).receptores = data.receptores; changed = true; }
      // 🔧 NÃO sobrescrever diamonds aqui — o campo diamonds no earnings_updated
      // pode ser o custo do giro/valor do presente, NÃO o saldo total da host.
      // O saldo de diamonds é atualizado via diamonds_updated (recarga/spend).
      // O earnings_updated só serve pra earnings + receptores (saldo de ganhos).
      if (changed) updateUserEverywhere(updated);
    };
    window.addEventListener('livego:earnings_updated', handleEarningsUpdated);
    return () => window.removeEventListener('livego:earnings_updated', handleEarningsUpdated);
  }, [currentUser?.id, updateUserEverywhere]);

  // 🖼️ Avatar atualizado em tempo real: quando QUALQUER usuário troca a foto
  // de perfil, o backend emite avatar_updated (global). Atualiza o avatar em
  // TODOS os lugares: chat, live entry, chat privado, online users, perfil.
  useEffect(() => {
    if (!currentUser?.id) return;
    const handleAvatarUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !data.userId) return;
      const changedUserId = String(data.userId);
      const newAvatarUrl = String(data.avatarUrl || '');
      // Atualizar o próprio currentUser se for ele quem trocou
      if (changedUserId === String(currentUser.id) && typeof data.avatarUrl === 'string') {
        const updated = { ...currentUserRef.current, avatarUrl: newAvatarUrl };
        updateUserEverywhere(updated);
      }
      // Atualizar conversas (chat privado) — avatar do amigo mudou
      setConversations(prev => prev.map(c =>
        c.friend?.id === changedUserId ? { ...c, friend: { ...c.friend, avatarUrl: newAvatarUrl } } : c
      ));
      // Disparar evento global para outros componentes que mantêm cache de avatar
      // (StreamRoom, online users, etc.)
      window.dispatchEvent(new CustomEvent('livego:user_avatar_changed', {
        detail: { userId: changedUserId, avatarUrl: newAvatarUrl }
      }));
    };
    window.addEventListener('livego:avatar_updated', handleAvatarUpdated);
    return () => window.removeEventListener('livego:avatar_updated', handleAvatarUpdated);
  }, [currentUser?.id, updateUserEverywhere]);



  // ... (keeping existing handlers like handleLeaveStreamView, handleLogout, etc.) ...



  // 🚪 Fim da SAÍDA com portão: o portão já cobriu a tela → limpa o estado e
  // volta pra lista de salas (a lista monta POR BAIXO do portão, que então
  // desaparece revelando-a). Deve acontecer SÓ depois do portão cobrir.
  const finishGateExit = useCallback(() => {
    setPipStreamer(null);
    setIsPiPMode(false);
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
    setActivePKInvite(null);
    setLiveSession(null);
    setStreamRoomData(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleLeaveStreamView = useCallback((forceClose = false) => {
    // Marcar que saímos deliberadamente — auto-load não deve tentar re-entrar
    leftStreamRef.current = true;
    // Se PiP estiver ativado (e não for fechamento forçado), minimizar para janela flutuante
    const isHost = activeStream?.hostId === currentUser?.id;
    if (!forceClose && currentUser?.pipEnabled && activeStream && !isHost) {
      endGate();
      setPipStreamer(activeStream);
      setIsPiPMode(true);
      setActiveStream(null);
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setActivePKInvite(null);
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/', { replace: true });
      return;
    }
    // Host saindo da própria live / fechamento forçado (expulsão etc.)
    // → comportamento imediato original, sem efeito de portão.
    if (forceClose || isHost) {
      setPipStreamer(null);
      setIsPiPMode(false);
      setActiveStream(null);
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setActivePKInvite(null);
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/', { replace: true });
      return;
    }
    // 🚪 Espectador fechando a transmissão → portão FECHA vindo de trás pra
    // frente, cobre a tela (finishGateExit) e então volta pra lista de salas.
    if (gatePhaseRef.current === 'idle') {
      triggerGate('exit');
    } else {
      // Já existe um portão na tela (ex.: saindo durante a abertura) → imediato
      finishGateExit();
    }
  }, [activeStream, navigate, currentUser]);

  const handleRestoreFromPiP = useCallback(() => {
    if (pipStreamer && handleSelectStreamRef.current) {
      handleSelectStreamRef.current(pipStreamer);
      setIsPiPMode(false);
      setPipStreamer(null);
    }
  }, [pipStreamer]);

  // 📱 Botão VOLTAR/HOME do celular durante uma live (ASSISTINDO): em vez de a
  // transmissão sumir, minimiza para a janela flutuante (PiP no app). O PiP
  // nativo (autoPictureInPicture) só cobre o botão HOME (app vai para o fundo);
  // o VOLTAR (navegação do browser) dispara `popstate` — é isso que interceptamos.
  const handleMinimizeToPiP = useCallback(() => {
    const stream = activeStreamRef.current;
    const user = currentUserRef.current;
    if (!stream || !user) return;
    // Só minimiza quem está ASSISTINDO a live (nunca o dono transmitindo)
    if (String(stream.hostId) === String(user.id)) return;
    // Já minimizado → não duplicar
    if (pipStreamerRef.current) return;

    leftStreamRef.current = true;
    endGate();
    setPipStreamer(stream);
    setIsPiPMode(true);
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
    setActivePKInvite(null);
    setLiveSession(null);
    setStreamRoomData(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleMinimizeToPiPRef = useRef(handleMinimizeToPiP);
  useEffect(() => { handleMinimizeToPiPRef.current = handleMinimizeToPiP; }, [handleMinimizeToPiP]);

  useEffect(() => {
    const handlePopState = () => {
      const stream = activeStreamRef.current;
      const user = currentUserRef.current;
      if (!stream || !user) return;
      // Fora da live → comportamento normal de voltar
      if (String(stream.hostId) === String(user.id)) return;
      handleMinimizeToPiPRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



  const handleLogout = async () => {

    // Limpar token da API

    const { removeAuthToken } = await import('./services/api');

    removeAuthToken();

    // 🔐 LOGOUT REAL: limpar TAMBÉM o usuário em cache — sem isso, qualquer
    // recarregamento reentrava sozinho ("login automático" indevido).
    try { localStorage.removeItem('livego_cached_user'); } catch { }
    cachedUserRef.current = null;

    // Limpar estado - não usar localStorage

    setIsAuthenticated(false);

    setCurrentUser(null);

    // Limpar window.currentUser também

    (window as any).currentUser = null;

    navigate('/');

    setIsSettingsScreenOpen(false);

  };



  const handleDeleteAccount = async () => {

    if (!currentUser) return;

    try {

      await api.deleteAccount(currentUser.id);

      addToast(ToastType.Success, "Conta excluída com sucesso.");

      await handleLogout();

    } catch (error: any) {

      const message = error?.message || "Não foi possível excluir a conta.";

      addToast(ToastType.Error, message);

    }

  };



  // Listener para evento de logout (por exemplo, quando o token expira na API)
  useEffect(() => {
    const onAuthLogout = () => {
      handleLogout();
    };

    window.addEventListener('auth:logout', onAuthLogout);
    return () => {
      window.removeEventListener('auth:logout', onAuthLogout);
    };
  }, []);



  // Removido - dados estáticos já inicializados



  // REMOVIDO: WebSocket events simplificados (kicked, joinDenied)
  // Esses eventos agora são gerenciados via useStreamChat no componente StreamRoom



  // Removido - dados estáticos já inicializados



  // Removido - WebSocket simplificado



  useEffect(() => {

    const handleStreamerLive = (payload: { streamerId: string, streamerName: string, streamerAvatar: string }) => {

      if (notificationSettings?.streamerLive) {

        setLiveNotification(payload);

      }

      // Removido - não atualizar isLive automaticamente

      // Cards só devem ser criados quando o usuário realmente iniciar uma transmissão

    };



    const handlePrivateInvite = (payload: { streamId: string, hostId: string, streamName: string, inviterName: string, inviterAvatar: string }) => {

      setPrivateInviteData({
        streamId: payload.streamId,
        hostId: payload.hostId,
        streamName: payload.streamName,
        hostName: payload.inviterName,
        hostAvatar: payload.inviterAvatar
      });
      navigate('/golive');
    };



    // REMOVIDO: simpleEventManager - eventos gerenciados via useStreamChat (REST)



    return () => {
      // REMOVIDO: simpleEventManager cleanup
    };

  }, [addToast, notificationSettings, allUsers, updateUserEverywhere]);



  // Removido - dados estáticos já inicializados



  // Removido - dados estáticos já inicializados



  // Removido - dados estáticos já inicializados



  // Conectar ao WebSocket para atualizações de presença

  useEffect(() => {

    // 📲 PWA: registrar Service Worker (obrigatório para instalação do app + push notifications)
    // O sw.js usa Network-First: online sempre busca conteúdo fresco,
    // cache é só fallback offline — não causa "assets antigos" para usuários conectados.
    if ('serviceWorker' in navigator && !swInitializedRef.current) {
      swInitializedRef.current = true;
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[SW] Service Worker registrado (única vez)');
        // 🚀 AUTO-UPDATE: se uma versão nova do app for detectada no servidor,
        // ativa o service worker novo e recarrega a página automaticamente.
        // Assim o usuário nunca fica preso na versão antiga (sem limpar cache).
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] ✅ Versão nova instalada — ativando automaticamente...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        // Quando o SW novo assumir o controle, recarregar com o app novo.
        // ⚠️ Proteção: NUNCA recarregar durante uma transmissão ao vivo — o
        // reload derrubaria o publish WHIP e encerraria a live. Nesse caso,
        // aguarda até a próxima abertura (o SW já ativado garante a versão nova).
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          // Se há uma live ativa (transmitindo ou em sala), adia o reload
          if (activeStreamRef.current) {
            console.log('[PWA] ⏸️ Live ativa — adiando auto-reload para não derrubar a transmissão');
            return;
          }
          refreshing = true;
          console.log('[PWA] 🔄 Recarregando com a versão nova...');
          window.location.reload();
        });
      }).catch((err) => {
        console.warn('[SW] Erro ao registrar Service Worker:', err);
      });
    }

    // ⌨️ Ajusta o container do app à área visível. Na tela de LIVE o container
    // NUNCA encolhe com o teclado (--app-height = MAIOR altura de layout já
    // vista) — assim a tela da live não sobe nem se move: a barra de mensagem
    // fica fixa no fundo e um composer flutua acima do teclado. Só a rotação
    // de tela redefine a referência. Nas demais telas, mantém o comportamento
    // adjustResize (--app-height = visualViewport.height) para o input ficar
    // acima do teclado.
    const vv = window.visualViewport;
    let maxLayoutRef = Math.max(
      document.documentElement?.clientHeight || 0,
      window.innerHeight || 0
    );
    const setAppHeight = () => {
      const cur = Math.max(document.documentElement?.clientHeight || 0, window.innerHeight || 0);
      const container = document.querySelector<HTMLElement>('.app-container');
      const isLiveFixed = !!container?.classList.contains('live-fixed');
      if (isLiveFixed) {
        // 🚫 NUNCA reduzir --app-height aqui: `cur` encolhe com o teclado
        // (browsers/WebViews sem interactive-widget) e durante a animação de
        // abrir/fechar. Reduzir empurra a barra de mensagem para cima e deixa
        // um fundo preto piscando embaixo ao fechar. maxLayoutRef só cresce;
        // a rotação de tela redefine a referência.
        maxLayoutRef = Math.max(maxLayoutRef, cur);
        const h = Math.max(maxLayoutRef, vv ? vv.height : cur);
        document.documentElement.style.setProperty('--app-height', `${h}px`);
      } else {
        const h = vv ? vv.height : cur;
        document.documentElement.style.setProperty('--app-height', `${h}px`);
      }
    };
    if (vv) {
      vv.addEventListener('resize', setAppHeight);
      vv.addEventListener('scroll', setAppHeight);
    }
    window.addEventListener('resize', setAppHeight);
    const heightTimers: number[] = [];
    const lateHeight = () => {
      heightTimers.push(window.setTimeout(setAppHeight, 120));
      heightTimers.push(window.setTimeout(setAppHeight, 400));
    };
    document.addEventListener('focus', lateHeight, true);
    document.addEventListener('blur', lateHeight, true);
    // 🔄 Rotação: re-sincroniza a referência da live com o novo layout.
    const onOrientationChange = () => {
      maxLayoutRef = Math.max(
        document.documentElement?.clientHeight || 0,
        window.innerHeight || 0
      );
      setAppHeight();
    };
    window.addEventListener('orientationchange', onOrientationChange);
    setAppHeight();
    // (não cleanup: o var persiste para toda a vida do app;
    //  se o componente desmontar, o var permanece com o último valor — inócuo)

    // 🔔 WEB PUSH NATIVO serve só para notificação na tela — o tempo real do
    // app é 100% WebSocket (socketService). Por isso o push é carregado DEPOIS
    // da interface abrir (idle com timeout), sem competir com o feed no boot.
    const initPushNotifications = () => {
      if (!currentUserRef.current) return;
      import('./services/notificationService').then(async ({ initNotifications }) => {
        const notifStatus = await initNotifications(currentUserRef.current.id);
        if (notifStatus === 'denied') {
          if (!notifDeniedShownRef.current) {
            notifDeniedShownRef.current = true;
            addToast(ToastType.Error, '🔕 Notificações bloqueadas no navegador. Para ativar, toque no 🔒 do endereço → Permissões → Notificações → Permitir.');
          }
        } else if (notifStatus === 'default' && !notifCtaShownRef.current) {
          notifCtaShownRef.current = true;
          setShowNotifCta(true);
        }
      });
      import('./services/webPushService').then(({ listenForegroundPush }) => {
        // 💬 Abre a conversa com quem mandou a mensagem (clique na notificação
        // do sistema ou botão "Responder" — o SW repassa via postMessage).
        const openChatFromPush = async (senderId: string, senderName?: string) => {
          if (!senderId || !currentUserRef.current) return;
          try {
            const u: any = await api.getUser(senderId);
            const user = u?.user || u;
            if (user?.id) {
              setConversations(prev => prev.map(c => c.friend?.id === user.id ? { ...c, unreadCount: 0 } : c));
              setChattingWith(user);
              return;
            }
          } catch { /* cai no fallback minimalista */ }
          setChattingWith({ id: senderId, name: senderName || '', photos: [] } as any);
        };
        const onSwMessage = (event: MessageEvent) => {
          const msg: any = event.data;
          if (msg?.type === 'OPEN_CONVERSATION' && msg.senderId) {
            openChatFromPush(String(msg.senderId), msg.senderName);
          }
        };
        navigator.serviceWorker.addEventListener('message', onSwMessage);
        swMessageHandlerRef.current = onSwMessage;

        // 🔗 Cold start por deep-link /?openchat=<senderId> (notificação com app fechado)
        const wAny = window as any;
        if (!wAny.__lgOpenChatHandled) {
          wAny.__lgOpenChatHandled = true;
          try {
            const params = new URLSearchParams(window.location.search);
            const oc = params.get('openchat');
            if (oc) {
              params.delete('openchat');
              const qs = params.toString();
              window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
              setTimeout(() => openChatFromPush(oc), 1500); // espera auth hidratar
            }
          } catch { /* URL malformada — ignora */ }
        }

        const recentPushKeys: string[] = [];
        listenForegroundPush((payload) => {
          const title = payload.title || payload.data?.title || 'Nova notificação';
          const body = payload.body || '';
          const type = payload.data?.type;
          if (type === 'new_message') {
            // 💬 FALLBACK do CHAT PRIVADO: com o app aberto a mensagem chega em
            // tempo real pelo WebSocket (socketService → evento 'newChatMessage').
            // O push em foreground entra só como reserva quando o socket está
            // desconectado — o dedup evita banner duplicado (WS + push).
            const senderIdPush = payload.data?.senderId || payload.data?.from || '';
            const key = `nm|${senderIdPush}|${payload.data?.fromUserName || title}|${body}`;
            if (recentPushKeys.includes(key)) return;
            recentPushKeys.push(key);
            if (recentPushKeys.length > 20) recentPushKeys.shift();
            const uid = currentUserRef.current?.id;
            if (!uid) return;
            if (!isSocketConnected()) {
              window.dispatchEvent(new CustomEvent('newChatMessage', {
                detail: {
                  id: `push_${Date.now()}_${Math.random()}`,
                  from: payload.data?.senderId || payload.data?.from || '',
                  to: uid,
                  senderName: payload.data?.fromUserName || title,
                  senderAvatar: '',
                  text: body,
                  timestamp: new Date().toISOString(),
                  conversationId: payload.data?.conversationId || '',
                },
              }));
            }
          } else if (type === 'live_started') {
            // 🔔 Push nativo serve SÓ para push na tela: NUNCA carrega avatar,
            // foto ou ícone. A faixa in-app usa apenas os dados de roteamento
            // (ids) — o avatar vem exclusivamente do Socket.IO em tempo real.
            // Dedup: se o socket já disparou este evento, ignorar.
            const lsKey = `ls|${payload.data?.hostId || ''}|${payload.data?.streamId || ''}`;
            if (recentPushKeys.includes(lsKey)) return;
            recentPushKeys.push(lsKey);
            if (recentPushKeys.length > 20) recentPushKeys.shift();
            window.dispatchEvent(new CustomEvent('app:show_in_app_notification', {
              detail: {
                type: 'live_started',
                streamerId: payload.data?.streamerId || payload.data?.hostId || '',
                streamerName: title,
                streamId: payload.data?.streamId || payload.data?.streamKey || '',
              }
            }));
          } else if (type === 'gift_received') {
            // 🎁 Presente: toast informativo (o gift já aparece na tela via socket)
            const giftKey = `gift|${payload.data?.fromUserId || ''}|${payload.data?.giftName || ''}|${payload.data?.quantity || ''}`;
            if (recentPushKeys.includes(giftKey)) return;
            recentPushKeys.push(giftKey);
            if (recentPushKeys.length > 20) recentPushKeys.shift();
            // Só mostra toast se o socket NÃO está conectado (fallback offline)
            if (!isSocketConnected()) {
              addToast(ToastType.Info, `${title}: ${body}`);
            }
          } else if (type === 'new_follower') {
            // 👤 Novo seguidor: toast informativo
            const flKey = `fl|${payload.data?.followerId || ''}`;
            if (recentPushKeys.includes(flKey)) return;
            recentPushKeys.push(flKey);
            if (recentPushKeys.length > 20) recentPushKeys.shift();
            addToast(ToastType.Info, `${title}: ${body}`);
          } else if (type === 'friend_invite_received') {
            // 👥 Convite de amizade: toast + in-app notification
            const fiKey = `fi|${payload.data?.inviteId || ''}`;
            if (recentPushKeys.includes(fiKey)) return;
            recentPushKeys.push(fiKey);
            if (recentPushKeys.length > 20) recentPushKeys.shift();
            addToast(ToastType.Info, `${title}: ${body}`);
          } else if (body) {
            addToast(ToastType.Info, `${title}: ${body}`);
          }
        });
      });
    };
    const w = window as any;
    if (w.requestIdleCallback) {
      w.requestIdleCallback(initPushNotifications, { timeout: 3000 });
    } else {
      w.setTimeout(initPushNotifications, 2000);
    }

    return () => {
      if (swMessageHandlerRef.current && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', swMessageHandlerRef.current);
        swMessageHandlerRef.current = null;
      }
    };

  }, [currentUser?.id]);



  const refreshStreamRoomData = useCallback(async (streamerId: string) => {

    try {

      // 🔧 SINCRONIZAÇÃO: Buscar dados reais da live (diamonds acumulados no banco)

      const liveDetails = await api.getLiveDetails(streamerId);

      if (liveDetails) {

        const realDiamonds = (liveDetails as any).diamonds || 0;

        // Atualizar via setLiveSession para evitar dependência circular

        setLiveSession(prev => prev ? { ...prev, coins: realDiamonds } : prev);

      }



      // Atualizar ranking ao vivo com dados reais da API

      const liveRanking = await api.getRankingForPeriod('live', currentUser?.id);

      setRankingData(prev => ({ ...prev, 'live': liveRanking }));



    } catch (error) {

      // Falha silenciosa - não interrompe a experiência do usuário

    }

  }, []);



  const handleStreamUpdate = (updates: Partial<Streamer>) => {

    // Validate that updates.id is not [object Object]

    if (updates.id && (typeof updates.id !== 'string' || updates.id === '[object Object]')) {

      // Invalid stream ID in updates

      return; // Don't apply invalid updates

    }

    

    setActiveStream(prev => {

      if (!prev) return null;

      return { ...prev, ...updates };

    });

  };



  const updateLiveSession = useCallback((updates: Partial<LiveSessionState>) => {

    setLiveSession(prev => {

      if (!prev) return null;

      const newSession = { ...prev, ...updates };

      if (updates.viewers !== undefined) {

        newSession.peakViewers = Math.max(prev.peakViewers, updates.viewers);

      }

      return newSession;

    });

  }, []);



  // WebSocket handlers simplificados

  useEffect(() => {

    const handleFollowUpdate = (payload: { follower: User, followed: User, isUnfollow: boolean }) => {

      const { follower, followed, isUnfollow } = payload;



      updateUserEverywhere(follower);

      updateUserEverywhere(followed);



      if (currentUser && followed.id === currentUser.id) {

        setFans(prevFans => {

          if (isUnfollow) {

            return prevFans.filter(fan => fan.id !== follower.id);

          } else {

            if (prevFans.some(fan => fan.id === follower.id)) {

              return prevFans.map(fan => fan.id === follower.id ? follower : fan);

            }

            return [...prevFans, follower];

          }

        });

      }



      if (currentUser && follower.id === currentUser.id) {

        setFollowingUsers(prevFollowing => {

          if (isUnfollow) {

            return prevFollowing.filter(user => user.id !== followed.id);

          } else {

            if (prevFollowing.some(user => user.id === followed.id)) {

              return prevFollowing.map(user => user.id === followed.id ? followed : user);

            }

            return [...prevFollowing, followed];

          }

        });

      }

    };



    const handleNewFollower = (payload: { follower: User }) => {

      if (currentUser) {

        const { follower } = payload;

        setFans(prevFans => {

          if (prevFans.some(fan => fan.id === follower.id)) {

            return prevFans.map(fan => fan.id === follower.id ? follower : fan);

          }

          return [...prevFans, follower];

        });

        updateUserEverywhere(follower);

      }

    };



    const handleMicStateUpdate = (payload: { roomId: string; isMuted: boolean }) => {

      if (activeStream?.id === payload.roomId) {

        updateLiveSession({ isMicrophoneMuted: payload.isMuted });

      }

    };



    const handleSoundStateUpdate = (payload: { roomId: string; isMuted: boolean }) => {

      if (activeStream?.id === payload.roomId) {

        updateLiveSession({ isStreamMuted: payload.isMuted });

      }

    };



    // 📡 Sincroniza mute/som do host para TODOS os usuários na sala da stream

    let syncSocket: any = null;

    let syncDisposed = false;

    const onMicToggled = (payload: any) => {

      const roomId = payload?.roomId || payload?.streamId;

      if (activeStream && roomId === activeStream.id) {

        const isMuted = payload.isMuted !== undefined ? payload.isMuted : !!payload.microphoneEnabled;

        updateLiveSession({ isMicrophoneMuted: isMuted });

      }

    };

    const onSoundToggled = (payload: any) => {

      const roomId = payload?.roomId || payload?.streamId;

      if (activeStream && roomId === activeStream.id) {

        const isMuted = payload.isMuted !== undefined ? payload.isMuted : !!payload.soundEnabled;

        updateLiveSession({ isStreamMuted: isMuted });

      }

    };

    connectSocket().then(s => {

      if (syncDisposed || !s?.connected) return;

      syncSocket = s;

      s.on('mic_toggled', onMicToggled);

      s.on('sound_toggled', onSoundToggled);

    });



    const handleUserUpdate = (payload: { user: User }) => {

      updateUserEverywhere(payload.user);

    };



    const handleTransactionUpdate = (payload: { record: PurchaseRecord }) => {

      const { record } = payload;

      setPurchaseHistory(prev => {

        const index = prev.findIndex(r => r.id === record.id);

        if (index > -1) {

          const newHistory = [...prev];

          newHistory[index] = record;

          return newHistory;

        }

        return [record, ...prev]; // Latest first

      });



      if (record.userId === currentUser?.id) {

        if (record.status === 'Concluído' && record.type === 'withdraw_earnings') {

          addToast(ToastType.Success, `Saque de R$ ${record.amountBRL.toFixed(2)} concluído!`);

        } else if (record.status === 'Cancelado') {

          addToast(ToastType.Error, `Saque de R$ ${record.amountBRL.toFixed(2)} falhou.`);

        }

      }

    };



    // Global New Message Handler for Badges

    const handleNewMessage = (message: Message) => {

      if (!currentUser) return;

      // Não reposiciona nem conta badge por ecos das PRÓPRIAS mensagens

      if (message.from === currentUser.id) return;

      // Se estamos no chat com quem mandou, o ChatScreen já exibe na hora

      if (chattingWith && chattingWith.id === message.from) {

        return;

      }

      // 💬 NOTIFICAÇÃO FLUTUANTE estilo WhatsApp: aparece no topo, fica parada,
      // só some quando o usuário arrasta pra descartar ou toca pra abrir o chat.
      const senderUser = {
        id: message.from,
        name: message.senderName || message.from,
        avatarUrl: message.senderAvatar || '',
        level: message.senderLevel || 1,
        birthday: message.senderBirthday,
      } as User;
      setFloatingNotifs(prev => {
        // Evitar duplicata: se já tem notificação deste remetente, atualiza em vez de criar nova
        const existing = prev.findIndex(n => n.sender.id === message.from);
        const updated = [...prev];
        const notif: FloatingNotificationData = {
          id: `flnoti_${message.from}_${Date.now()}`,
          sender: senderUser,
          text: message.text || (message.imageUrl ? '📷 Foto' : ''),
          timestamp: Date.now(),
        };
        if (existing > -1) {
          updated[existing] = notif;
        } else {
          updated.push(notif);
        }
        return updated.slice(-5); // Máximo 5 na fila
      });

      // Caso contrário, atualiza a lista de conversas em tempo real (badge + última mensagem)

      setConversations(prevConversations => {

        const index = prevConversations.findIndex(c => c.friend.id === message.from);

        const lastMessage = message.text || (message.imageUrl ? '[Imagem]' : '');

        const timestamp = message.timestamp || new Date().toISOString();

        if (index > -1) {

          const updated = [...prevConversations];

          const oldConv = updated[index];

          updated[index] = {

            ...oldConv,

            lastMessage,

            timestamp,

            unreadCount: (oldConv.unreadCount || 0) + 1

          };

          // Move to top

          updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return updated;

        }

        // Nova conversa: cria a entrada na hora (com os dados do remetente)

        const friend = {

          id: message.from,

          name: message.senderName || message.from,

          avatarUrl: message.senderAvatar || '',

          level: message.senderLevel || 1,

          birthday: message.senderBirthday,

        } as User;

        const newConvo: Conversation = {

          id: `convo_${message.from}_${currentUser.id}`,

          friend,

          lastMessage,

          timestamp,

          unreadCount: 1,

        };

        return [newConvo, ...prevConversations];

      });

    };

    // 💬 ATUALIZAÇÃO EM TEMPO REAL da lista de conversas: o backend emite
    // `newChatMessage` e a ponte (socketService) repassa como evento no window.
    // Este handler antes ficava definido mas NUNCA registrado — a lista só
    // mudava ao recarregar. Registramos aqui (mesmo efeito, closure fresca).

    const onChatWindowMessage = (event: Event) => {

      handleNewMessage((event as CustomEvent).detail as Message);

    };

    window.addEventListener('newChatMessage', onChatWindowMessage);



    // Eventos gerenciados via useStreamChat (REST polling)



    return () => {

      syncDisposed = true;

      window.removeEventListener('newChatMessage', onChatWindowMessage);

      if (syncSocket) {

        syncSocket.off('mic_toggled', onMicToggled);

        syncSocket.off('sound_toggled', onSoundToggled);

      }

    };

  }, [currentUser, updateUserEverywhere, activeStream, updateLiveSession, addToast, chattingWith]);

  const startLiveSession = async (streamer: Streamer) => {

    try {

      // 🔧 SINCRONIZAÇÃO: Buscar dados reais da stream da API (diamonds acumulados)

      // O contador de moedas deve refletir o banco de dados, nunca estado temporário

      let streamDiamonds = streamer.diamonds || 0;

      let streamViewers = streamer.onlineTotal ?? (streamer.viewers || 1);

      try {

        const streamDetails = await api.getLiveDetails(streamer.id);

        if (streamDetails) {

          streamDiamonds = (streamDetails as any).diamonds || 0;

          streamViewers = (streamDetails as any).onlineTotal ?? ((streamDetails as any).viewers || 1);

        }    } catch {
        // Fallback: usar dados do objeto streamer passado
    }

      

      const newSession = {

        startTime: Date.now(),

        viewers: streamViewers,

        peakViewers: streamViewers,

        coins: streamDiamonds, // 🔧 FONTE UNIFICADA: dados reais da API

        followers: 0,

        members: 0,

        fans: 0,

        events: [],

        isMicrophoneMuted: false,

        isStreamMuted: false,

        isAutoFollowEnabled: false,

        isAutoPrivateInviteEnabled: false,

      };

      setLiveSession(newSession);

    } catch (error) {

      // Fallback: usar dados originais do streamer

      const newSession = {

        startTime: Date.now(),

        viewers: streamer.onlineTotal ?? (streamer.viewers || 1),

        peakViewers: streamer.onlineTotal ?? (streamer.viewers || 1),

        coins: streamer.diamonds || 0, // Fallback para dados originais

        followers: 0,

        members: 0,

        fans: 0,

        events: [],

        isMicrophoneMuted: false,

        isStreamMuted: false,

        isAutoFollowEnabled: false,

        isAutoPrivateInviteEnabled: false,

      };

      setLiveSession(newSession);

    }

  };



  // ... (Keeping rest of the logic: handleSelectRegion, logLiveEvent, handleLogin, etc.) ...



  const handleSelectRegion = async (countryCode: string) => {

    // 🔧 FILTRO DE VISUALIZAÇÃO APENAS: NÃO altera o país/bandeira do perfil do usuário.

    setIsRegionModalOpen(false);

    // Atualizar o filtro de país selecionado
    setSelectedCountry(countryCode);    if (countryCode !== 'ICON_GLOBE') {

      setIsLoadingStreamers(true);

      try {

        const [streams, vrData] = await Promise.all([
          api.getLiveStreamers('popular', countryCode),
          api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
        ]);
        setStreamers(Array.isArray(streams) ? streams : []);
        setVoiceRooms(vrData?.data?.rooms || []);

      } catch (error) {

        setStreamers([]);
        setVoiceRooms([]);

      } finally {
        setIsLoadingStreamers(false);
      }

    } else {



      // Se for Global, carregar todos os streams

      setIsLoadingStreamers(true);

      try {

        const [streams, vrData] = await Promise.all([
          api.getLiveStreamers('popular'),
          api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
        ]);
        setStreamers(Array.isArray(streams) ? streams : []);
        setVoiceRooms(vrData?.data?.rooms || []);

      } catch (error) {

        setStreamers([]);
        setVoiceRooms([]);

      } finally {
        setIsLoadingStreamers(false);
      }

    }

  };  const loadStreams = async () => {

    setIsLoadingStreamers(true);

    try {

      const [streams, vrData] = await Promise.all([
        api.getLiveStreamers('popular', selectedCountry !== 'ICON_GLOBE' ? selectedCountry : undefined),
        api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
      ]);
      setStreamers(Array.isArray(streams) ? streams : []);
      setVoiceRooms(vrData?.data?.rooms || []);

    } catch (error) {

      setStreamers([]);
      setVoiceRooms([]);

    } finally {
      setIsLoadingStreamers(false);
    }

  };



const logLiveEvent = (type: string, data: any) => {

  if (!liveSession || !activeStream) return;

  const event = { type, timestamp: new Date().toISOString(), ...data };

  updateLiveSession({ events: [...(liveSession.events || []), event] });

};



  const handleLoginOriginal = async (user: User, token: string) => {

    setIsLoadingCurrentUser(true);

    try {

      // Configurar token na API antes de fazer qualquer requisição

      const { setAuthToken } = await import('./services/api');

      setAuthToken(token);



      // Token já está configurado, agora buscar dados atualizados do banco

      const freshUser = await api.getCurrentUser();

      if (freshUser) {

        setCurrentUser(freshUser);

        // Sincronizar com window para API ter acesso

        (window as any).currentUser = freshUser;

        setIsAuthenticated(true);

      } else {

        // Fallback para usuário recebido do login

        setCurrentUser(user);

        // Sincronizar com window para API ter acesso

        (window as any).currentUser = user;

        setIsAuthenticated(true);

      }

    } catch (error) {

      console.error('Erro ao configurar sessão:', error);

      setIsAuthenticated(false);

      setCurrentUser(null);

    } finally {

      setIsLoadingCurrentUser(false);

    }

  };



  const handleNavigation = (screen: 'main' | 'profile' | 'messages' | 'video' | 'wallet' | 'vip-center' | 'my-level' | 'fans' | 'block-list' | 'avatar-protection' | 'faq' | 'settings') => {

    // Mapeamento das telas para rotas URL (estilo Buzzcast)
    const routeMap = {
      'main': '/',
      'video': '/video',
      'messages': '/messages',
      'profile': '/profile',
      'wallet': '/wallet',
      'vip-center': '/vip-center',
      'my-level': '/my-level',
      'fans': '/fans',
      'block-list': '/block-list',
      'avatar-protection': '/avatar-protection',
      'faq': '/faq',
      'settings': '/settings'
    };

    if (screen === 'messages') {
      setMessagesInitialTab('messages');
    }

    // Navegar usando React Router - atualiza URL automaticamente
    navigate(routeMap[screen]);
  };



  const handleNavigateToFriends = () => {

    setChattingWith(null);

    setActiveStream(null);

    setMessagesInitialTab('friends');

    navigate('/messages');

  };



  const handleTabChange = async (tab: string) => {

    if (tab === 'nearby') {

      // Verificar status atual da permissão
if (locationPermissionStatus === 'granted') {

        setActiveCategory('nearby');

        setShowLocationBanner(false);

        // 🔄 TROCA DE ABA: limpa os cards ANTES do fetch → feedback imediato
        // (spinner). Só quando muda de categoria: o refresh da MESMA aba
        // mantém os cards (nada some ao puxar pra atualizar).

        if (tab !== activeCategory) setStreamers([]);

        setIsLoadingStreamers(true);
        try {
          const [streams, vrData] = await Promise.all([
            api.getLiveStreamers('nearby'),
            api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
          ]);
          setStreamers(Array.isArray(streams) ? streams : []);
          setVoiceRooms(vrData?.data?.rooms || []);
        } catch {
          setStreamers([]);
          setVoiceRooms([]);
        } finally {
          setIsLoadingStreamers(false);
        }

      } else if (locationPermissionStatus === 'denied') {

        // Mostrar modal para que o usuário possa re-solicitar permissão

        setActiveCategory('nearby');
        setShowLocationBanner(true);
        setIsLocationPermissionModalOpen(true);

      } else {

        // Se está prompt, mostrar modal de permissão

        setLocationPermissionStatus('prompt');

        setIsLocationPermissionModalOpen(true);

      }

    } else {

      setActiveCategory(tab);

      setShowLocationBanner(false);

      // 🔄 TROCA DE ABA: limpa os cards ANTES do fetch → feedback imediato
      // (spinner). Só quando muda de categoria: o refresh da MESMA aba
      // mantém os cards (nada some ao puxar pra atualizar).

      if (tab !== activeCategory) setStreamers([]);      // Carregar streams da API para a categoria selecionada

      setIsLoadingStreamers(true);

      try {

        if (tab === 'voiceChat') {
          // Aba voiceChat: buscar APENAS salas de voz
          setStreamers([]);
          const vrData = await api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }));
          setVoiceRooms(vrData?.data?.rooms || []);
        } else {
          const [streams, vrData] = await Promise.all([
            api.getLiveStreamers(tab, selectedCountry !== 'ICON_GLOBE' ? selectedCountry : undefined),
            api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
          ]);
          setStreamers(Array.isArray(streams) ? streams : []);
          setVoiceRooms(vrData?.data?.rooms || []);
        }

      } catch (error) {

        setStreamers([]);
        setVoiceRooms([]);

      } finally {
        setIsLoadingStreamers(false);

      }

    }

  };



  const syncUserLocation = async () => {
    if (!currentUser) return;
    try {
      console.log('🌍 [LOCATION] Sincronizando localização do usuário...');
      const ipLoc = await getApproximateLocationByIP();
      let finalLat = ipLoc.latitude;
      let finalLng = ipLoc.longitude;
      let finalCity = ipLoc.city;
      let finalState = ipLoc.state;
      // 🔧 CORREÇÃO: Preservar o país escolhido manualmente pelo usuário
      // Se o usuário já tem um country definido (que não seja vazio/global), não sobrescrever
      let finalCountry = currentUser.country && currentUser.country !== 'global'
        ? currentUser.country  // Preservar escolha manual do usuário
        : ipLoc.country;        // Usar detecção automática apenas se não foi escolhido manualmente
      let finalLocationName = ipLoc.locationName;

      if (locationPermissionStatus === 'granted' || currentUser.locationPermission === 'granted') {
        try {
          const coords = await getPreciseLocation();
          finalLat = coords.latitude;
          finalLng = coords.longitude;
          console.log('🌍 [LOCATION] Localização precisa obtida via navegador:', finalLat, finalLng);
        } catch (err) {
          console.warn('🌍 [LOCATION] Falha ao obter localização precisa, usando IP fallback:', err);
        }
      }

      console.log('🌍 [LOCATION] Salvando localização na API:', finalLat, finalLng, finalCity, finalState, 'country:', finalCountry);
      const res = await api.updateLocation(finalLat, finalLng, finalCity, finalState, finalCountry, finalLocationName);
      
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        (window as any).currentUser = res.user;
        console.log('🌍 [LOCATION] Localização sincronizada com sucesso:', res.user.location);
      }
    } catch (e) {
      console.error('🌍 [LOCATION] Erro geral ao sincronizar localização:', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      syncUserLocation();
    }
  }, [currentUser?.id, locationPermissionStatus, isAuthenticated]);

  useEffect(() => {
    if (currentUser && currentUser.locationPermission) {
      if (currentUser.locationPermission !== locationPermissionStatus) {
        setLocationPermissionStatus(currentUser.locationPermission as any);
      }
    }
  }, [currentUser?.locationPermission]);

  const handleAllowLocation = async () => {

    setLocationPermissionStatus('granted');
    setActiveCategory('nearby');
    setShowLocationBanner(false);
    addToast(ToastType.Success, "Permissão de localização concedida.");
    setIsLocationPermissionModalOpen(false);

    setIsLoadingStreamers(true);
    try {
      const [streams, vrData] = await Promise.all([
        api.getLiveStreamers('nearby'),
        api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
      ]);
      setStreamers(Array.isArray(streams) ? streams : []);
      setVoiceRooms(vrData?.data?.rooms || []);
    } catch {
      setStreamers([]);
      setVoiceRooms([]);
    } finally {
      setIsLoadingStreamers(false);
    }

  };



  const handleDenyLocation = async () => {

    setLocationPermissionStatus('denied');
    setActiveCategory('nearby');
    setShowLocationBanner(true);
    addToast(ToastType.Info, "Permissão de localização negada.");
    setIsLocationPermissionModalOpen(false);

    setIsLoadingStreamers(true);
    try {
      const [streams, vrData] = await Promise.all([
        api.getLiveStreamers('nearby'),
        api.voiceRoom.list().catch(() => ({ code: 200, data: { rooms: [], hasMore: false } }))
      ]);
      setStreamers(Array.isArray(streams) ? streams : []);
      setVoiceRooms(vrData?.data?.rooms || []);
    } catch {
      setStreamers([]);
      setVoiceRooms([]);
    } finally {
      setIsLoadingStreamers(false);
    }

  };



  // 🎥 Permissão NATIVA do sistema — sem tela personalizada:
  // getUserMedia dispara o prompt oficial do Android/iOS/desktop.
  // Aqui só validamos a permissão; a captura real é feita no GoLiveScreen.
  const handleOpenGoLive = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      navigate('/golive');
      return;
    }
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Libera o teste — a tela Ao Vivo captura de novo (já autorizado)
      testStream.getTracks().forEach(t => t.stop());
      navigate('/golive');
    } catch (err: any) {
      const name = err?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        addToast(ToastType.Error, '🔕 Permissão de câmera/microfone negada. Para ativar: toque no 🔒 do endereço → Permissões → Câmera e Microfone → Permitir.');
      } else if (name === 'NotFoundError') {
        addToast(ToastType.Error, 'Câmera ou microfone não encontrados neste dispositivo.');
      } else if (name === 'NotReadableError') {
        addToast(ToastType.Error, 'Câmera em uso por outro aplicativo. Feche o outro app e tente de novo.');
      } else {
        addToast(ToastType.Error, 'Não foi possível acessar câmera/microfone. Verifique as permissões no navegador (🔒).');
      }
    }
  };



  // 🔔 Ações das notificações in-app
  const handleInAppAction = useCallback(async (n: InAppNotification) => {
    if (n.type === 'live_started') {
      const d = n.data || {};
      const targetId = d.streamId || `stream_${d.streamerId}`;
      let target: Streamer | null = streamers.find((s: Streamer) => s.id === targetId || s.hostId === d.streamerId) || null;
      if (!target) {
        try {
          const data = await api.getLiveDetails(targetId);
          if (data) target = data;
        } catch { /* live pode ter acabado */ }
      }
      if (target) {
        handleSelectStreamRef.current?.(target);
      } else {
        addToast(ToastType.Error, 'Transmissão não encontrada ou já encerrada.');
      }
      return;
    }
    if (n.type === 'private_invite') {
      const d = n.data || {};
      setPrivateInviteData({
        streamId: d.streamId,
        hostId: d.fromUserId || d.hostId || '',
        streamName: d.streamName || d.message || 'Transmissão privada',
        hostName: d.fromUserName || d.fromName || 'Usuário',
        hostAvatar: d.fromUserAvatar || '',
      });
      navigate('/golive');
      return;
    }
    if (n.type === 'pk_invite') {
      const d = n.data || {};
      addToast(ToastType.Info, 'Aceitando convite da batalha PK...');
      try {
        await api.respondToLiveInvite(d.inviteId, 'accepted');
        const streamId = d.streamId;
        if (streamId) {
          let target = streamers.find((s: any) => s.id === streamId || s.hostId === (d.fromUserId || d.from)) || null;
          if (!target) {
            try { const data = await api.getLiveDetails(streamId); if (data) target = data; } catch { /* segue */ }
          }
          if (target) handleSelectStreamRef.current?.(target);
          else addToast(ToastType.Success, 'Convite aceito! Entre na live do oponente pela lista.');
        } else {
          addToast(ToastType.Success, 'Convite aceito!');
        }
      } catch (err) {
        console.error('[PK-INVITE] Erro ao aceitar:', err);
        addToast(ToastType.Error, 'Falha ao aceitar o desafio.');
      }
    }
    // 📞 CONVITE DE CHAMADA GLOBAL: aceita e entra na live do anfitrião, onde
    // a StreamRoom publica a câmera e abre o PiP automaticamente via socket.
    if (n.type === 'call_invite') {
      const d = n.data || {};
      const invitationId = d.invitationId || '';
      addToast(ToastType.Info, 'Aceitando chamada de vídeo...');
      try {
        if (invitationId) {
          await api.call.respond(invitationId, 'accept');
        }
        const streamId = d.streamId;
        if (streamId && handleSelectStreamRef.current) {
          let target = streamers.find((s: any) => s.id === streamId) || null;
          if (!target) {
            try { const data = await api.getLiveDetails(streamId); if (data) target = data; } catch { /* segue */ }
          }
          if (target) handleSelectStreamRef.current(target);
          else addToast(ToastType.Success, 'Chamada aceita! Entre na live do anfitrião pela lista.');
        } else {
          addToast(ToastType.Success, 'Chamada aceita!');
        }
      } catch (err) {
        console.error('[CALL-INVITE] Erro ao aceitar:', err);
        addToast(ToastType.Error, 'Falha ao aceitar a chamada.');
      }
    }
  }, [streamers, navigate, addToast]);

  const handleInAppSecondaryAction = useCallback(async (n: InAppNotification) => {
    if (n.type === 'pk_invite') {
      const d = n.data || {};
      try {
        await api.respondToLiveInvite(d.inviteId, 'declined');
        addToast(ToastType.Info, 'Convite recusado.');
      } catch (err) {
        console.error('[PK-INVITE] Erro ao recusar:', err);
      }
    }
    if (n.type === 'call_invite') {
      const d = n.data || {};
      try {
        if (d.invitationId) await api.call.respond(d.invitationId, 'decline');
        addToast(ToastType.Info, 'Chamada recusada.');
      } catch (err) {
        console.error('[CALL-INVITE] Erro ao recusar:', err);
      }
    }
  }, [addToast]);

  // ⚔️ ACEITAR convite de batalha PK (modal global). Chama a API para responder
  // o convite live e entra na disputa. O backend já emite pk_battle_start para
  // os dois lados; aqui também é definido um fallback local por segurança.
  const handleAcceptPKInvite = useCallback(async (invite: any) => {
    if (pkInviteAction) return;
    const inviteId = String(invite?.id || invite?.invite_id || invite?.inviteId || '');
    const inviterId = String(invite?.inviterId || invite?.inviter_id || invite?.inviterUsername || invite?.from || invite?.fromUserId || '');
    setPkInviteAction('accepting');
    try {
      if (inviteId) {
        await api.respondToLiveInvite(inviteId, 'accepted');
      }
      addToast(ToastType.Success, 'Desafio aceito! Iniciando batalha PK...');
      setPkInviteAction(null);
      setActivePKInvite(null);

      // Fallback local: se o pk_battle_start ainda não chegou, entra na disputa
      // configurando o oponente (o backend emitirá o start para ambos).
      if (inviterId) {
        let opponentUser = streamers.find((s: any) => String(s.id) === inviterId || String(s.hostId) === inviterId) ||
                           listScreenUsers.find((u: any) => String(u.id) === inviterId);
        if (!opponentUser) {
          try { opponentUser = await api.getUser(inviterId); } catch { opponentUser = null; }
        }
        if (opponentUser) {
          setPkOpponent(opponentUser as unknown as User);
          setIsPKBattleActive(true);
          // Se ainda não está numa live, entra na live do desafiante
          if (!activeStream && handleSelectStreamRef.current) {
            const opponentStream = (streamers.find((s: any) => String(s.hostId) === inviterId));
            if (opponentStream) {
              handleSelectStreamRef.current(opponentStream);
            } else {
              handleSelectStreamRef.current(opponentUser as unknown as Streamer);
            }
          }
        }
      }
    } catch (err) {
      console.error('[PK-INVITE] Erro ao aceitar:', err);
      addToast(ToastType.Error, 'Falha ao aceitar o desafio.');
      setPkInviteAction(null);
    }
  }, [pkInviteAction, streamers, listScreenUsers, activeStream, addToast]);

  // ⚔️ RECUSAR convite de batalha PK (modal global)
  const handleRejectPKInvite = useCallback(async (invite: any) => {
    if (pkInviteAction) return;
    const inviteId = String(invite?.id || invite?.invite_id || invite?.inviteId || '');
    setPkInviteAction('rejecting');
    try {
      if (inviteId) {
        await api.respondToLiveInvite(inviteId, 'declined');
      }
      addToast(ToastType.Info, 'Convite recusado.');
      setPkInviteAction(null);
      setActivePKInvite(null);
    } catch (err) {
      console.error('[PK-INVITE] Erro ao recusar:', err);
      setPkInviteAction(null);
      setActivePKInvite(null);
    }
  }, [pkInviteAction, addToast]);

  // 🤝 ACEITAR convite global para subir no palco de uma sala de voz.
  // Chama a API (o backend já coloca o usuário no palco), navega para a sala
  // e fecha o modal. Não cria sala nova — é a MESMA sala já aberta.
  const handleAcceptStageInvite = useCallback(async () => {
    if (!stageInvite || stageInviteAction) return;
    setStageInviteAction('accepting');
    try {
      const res = await api.voiceRoom.inviteCoHostRespond(
        stageInvite.roomId,
        currentUser?.id || '',
        'accept',
        { name: currentUser?.name || '', avatar: currentUser?.avatarUrl || '', level: currentUser?.level || 1 },
      );
      if (!res?.success && res?.error && !res?.already) {
        addToast(ToastType.Error, res.error);
      }
      // Navega para a sala — o VoiceRoom carrega e o usuário já está no palco
      if (stageInvite.roomId && location.pathname !== `/voice-room/${stageInvite.roomId}`) {
        navigate(`/voice-room/${stageInvite.roomId}`);
      }
      if (res?.success) {
        addToast(ToastType.Success, 'Você subiu no palco!');
      }
    } catch {
      addToast(ToastType.Error, 'Falha ao subir no palco.');
    } finally {
      setStageInviteAction(null);
      setStageInvite(null);
    }
  }, [stageInvite, stageInviteAction, currentUser, navigate, location.pathname, addToast]);

  // 🤝 RECUSAR convite global para subir no palco
  const handleDeclineStageInvite = useCallback(async () => {
    if (!stageInvite || stageInviteAction) return;
    setStageInviteAction('rejecting');
    try {
      await api.voiceRoom.inviteCoHostRespond(stageInvite.roomId, currentUser?.id || '', 'decline');
    } catch {
      /* silencioso */
    } finally {
      setStageInviteAction(null);
      setStageInvite(null);
    }
  }, [stageInvite, stageInviteAction, currentUser, addToast]);

  const handleSelectStream = async (streamer: Streamer) => {

    if (!currentUser) return;

    // Bloquear entrada em outra stream enquanto PiP estiver ativo
    if (isPiPMode && pipStreamer) {
      addToast(ToastType.Info, 'Feche a janela flutuante antes de entrar em outra transmissão.');
      return;
    }

    

    // Validate that streamer.id is a string

    if (typeof streamer.id !== 'string' || streamer.id === '[object Object]') {

      // Invalid stream ID

      addToast(ToastType.Error, "ID da stream inválido. Não foi possível entrar na live.");

      return;

    }

    

    // 🚫 HOST entrando na PRÓPRIA live → SEM o efeito do portão (feio ao iniciar).
    // O portão continua só para ESPECTADORES entrando/saindo da sala.
    if (streamer.hostId !== currentUser.id) {
      triggerGate('enter');
    }

    try {

      if (streamer.isPrivate && streamer.hostId !== currentUser.id) {

        try {

          const access = await api.checkPrivateStreamAccess(streamer.id, currentUser.id);

          if (!access?.canJoin) {

            addToast(ToastType.Error, access?.reason || "Você não tem permissão para entrar nesta sala privada.");

            endGate();

            return;

          }

        } catch (err) {

          addToast(ToastType.Error, "Falha ao verificar permissão de acesso.");

          endGate();

          return;

        }

      }



      setStreamRoomData({

        gifts: allGifts,

        receivedGifts: []

      });

      setActiveStream(streamer);

      startLiveSession(streamer);

      // REMOVIDO: simpleEventManager.connect()

      navigate(`/live/${streamer.id}`);

      // 🚪 O overlay do portão se mantém na tela até o fim da animação
      // (GateTransitionOverlay.chama endGate em onFinished — sucesso).

    } catch (error) {

      addToast(ToastType.Error, "Falha ao carregar dados da live.");

      endGate();

    }

  };
  handleSelectStreamRef.current = handleSelectStream;

  // 🔴 Indicador AO VIVO (LiveBadge): clicou em qualquer avatar ao vivo → entra na transmissão
  const handleOpenUserLive = async (user: User) => {
    if (!currentUser) return;
    // 1) Procurar nas streams carregadas (hostId = userId)
    const found = (streamers || []).find(s => s.hostId === user.id || s.id === user.id);
    if (found) {
      handleSelectStream(found);
      return;
    }
    // 2) Fallback: consultar a API de live do usuário
    try {
      const data = await api.getUserStream(user.id);
      if (data && data.isLive && data.streamId) {
        const details = await api.getLiveDetails(data.streamId);
        if (details) {
          handleSelectStream(details as Streamer);
          return;
        }
      }
      addToast(ToastType.Info, `${user.name || 'Essa pessoa'} não está ao vivo no momento.`);
    } catch (err) {
      addToast(ToastType.Info, 'Não foi possível entrar na transmissão.');
    }
  };



  const handleStartStream = async (streamer: Streamer) => {
    setPrivateInviteData(null);

    

    // Redirecionar automaticamente para a tela de transmissão (StreamRoom)

    // Isso garante que o usuário entre no modo live assim que iniciar a transmissão

    setStreamRoomData({

      gifts: allGifts,

      receivedGifts: []

    });

    setActiveStream(streamer);

    startLiveSession(streamer);

    // REMOVIDO: simpleEventManager.connect()

    

    handleSelectStream(streamer);



    const updateStreamList = (prev: Streamer[]) => {
      if (!Array.isArray(prev)) return [streamer];
      const existingIndex = prev.findIndex(s => s.hostId === streamer.hostId);

      if (existingIndex > -1) {

        const newList = [...prev];

        newList[existingIndex] = streamer;

        return newList;

      }

      return [streamer, ...prev];

    };



    setReminderStreamers(updateStreamList);

    setStreamers(updateStreamList);



    if (currentUser && streamer.hostId === currentUser.id) {

      const updatedUser = { ...currentUserRef.current, isLive: true, isOnline: true };

      updateUserEverywhere(updatedUser);

      addToast(ToastType.Success, "Live iniciada com sucesso! Redirecionando para a transmissão...");



      setLiveNotification({

        streamerId: currentUser.id,

        streamerName: currentUser.name,

        streamerAvatar: currentUser.avatarUrl

      });

    }

  };



  const handleRequestEndStream = () => setIsEndStreamConfirmOpen(true);



  const handleConfirmEndStream = async () => {

    setIsEndStreamConfirmOpen(false);

    // 🚫 Impedir auto-load de re-entrar na stream que acabou de ser encerrada
    leftStreamRef.current = true;

    try {
      const { streamPublishService } = await import('./services/streamPublishService');
      streamPublishService.stopPublish();
    } catch (error) {
      console.warn('[LIVE-END] Falha ao parar publicação:', error);
    }      if (activeStream && liveSession) {

      // Validate that activeStream.id is a string

      if (typeof activeStream.id !== 'string' || activeStream.id === '[object Object]') {

        // Invalid stream ID

        addToast(ToastType.Error, "ID da stream inválido. Não foi possível encerrar a transmissão.");

        setActiveStream(null);

        setIsPKBattleActive(false);

        setPkOpponent(null);

        setActivePKInvite(null);

        setLiveSession(null);

        navigate('/');

        return;

      }

      

      const endTime = Date.now();
      const sessionStartTime = liveSession?.startTime ?? Date.now();

      const historyEntry: StreamHistoryEntry = {

        id: `hist_stream-${activeStream.id}_${endTime}_${Math.random().toString(36).slice(2)}`,

        streamerId: activeStream.hostId,

        name: activeStream.name,

        avatar: activeStream.avatar,

        startTime: sessionStartTime,

        endTime: endTime,

      };

      setStreamHistory(prev => [historyEntry, ...prev]);



      // Prepare summary data

      const summary: EndStreamSummary = {

        streamId: activeStream.id,

        title: activeStream.name,

        startTime: sessionStartTime,

        endTime: endTime,

        duration: Math.floor((endTime - sessionStartTime) / 1000),

        viewers: liveSession.viewers || 0,

        followers: liveSession.followers,

        members: liveSession.members,

        fans: liveSession.fans,

        coins: liveSession.coins || 0,

        user: { name: activeStream.name, avatarUrl: activeStream.avatar }

      };

      setStreamSummaryData(summary);

      setIsEndStreamSummaryOpen(true);

      // 🔧 CORREÇÃO: encerrar a live no backend e remover o card. Cada chamada
      // secundária é isolada para NUNCA mostrar toast de erro — o encerramento
      // e a navegação sempre acontecem, mesmo se alguma etapa falhar.
      console.log('[LIVE-END] Encerrando live - chamando backend...');
      try {
        const endResponse = await api.endLive();
        if (endResponse?.success) {
          console.log('[LIVE-END] Live encerrada no backend');
        } else {
          console.warn('[LIVE-END] Falha ao encerrar live no backend');
        }
      } catch (backendError) {
        console.warn('[LIVE-END] Erro ao chamar endLive:', backendError);
      }

      try {
        await api.endLiveSession(activeStream.id, liveSession);
      } catch (sessionErr) {
        console.warn('[LIVE-END] endLiveSession falhou (ignorado):', sessionErr);
      }

      // Remover o card especificamente
      try {
        const removeResponse = await api.removeLiveCard(activeStream.id, currentUser?.id || '');
        if (removeResponse?.success) {
          console.log('[LIVE-END] ✅ Card removido com sucesso');
        } else {
          console.warn('[LIVE-END] ⚠️ Card da live não foi removido no backend');
        }
      } catch (removeErr) {
        console.warn('[LIVE-END] removeLiveCard falhou (ignorado):', removeErr);
      }

      // Recarregar a lista de streams para atualizar os cards
      try {
        await loadStreams();
      } catch (loadErr) {
        console.warn('[LIVE-END] loadStreams falhou (ignorado):', loadErr);
      }

      // ✅ SEMPRE limpar estado e navegar, independente de erros nas chamadas de API
      setActiveStream(null);
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setActivePKInvite(null);
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/');

    }

    // 🔧 Fallback incondicional: sempre limpar estado e navegar, mesmo se activeStream/liveSession for null
    // Garante que o usuário nunca fique preso na tela de stream morta
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
    setActivePKInvite(null);
    setLiveSession(null);
    setStreamRoomData(null);

    // ✅ Navegar para home independente do caminho do if acima
    navigate('/');

  };



  const handleStartPKBattle = async (opponent: User) => {

    if (!activeStream) return;

    setPkOpponent(opponent);

    setIsPKBattleActive(true);

    addToast(ToastType.Success, "Batalha PK iniciada!");

  };



  const handleEndPKBattle = useCallback(() => {
    addToast(ToastType.Info, "Batalha PK encerrada.");
    setIsPKBattleActive(false);
    setPkOpponent(null);
    setPkBattleId(null);
    setActivePKInvite(null);
    // ⚠️ NÃO chamar api.endPKBattle aqui — o backend (StreamEndConsolidator.handleEndPK)
    // chama endStream() que encerra a LIVE INTEIRA. Isso é um bug.
    // O encerramento do PK deve ser feito pelo backend automaticamente via timer
    // ou por uma rota dedicada que só atualiza o status do Battle para 'finished'.
    // TODO: Criar rota POST /api/pk/finish que só encerra o battle, não a live.
  }, []);



  const handleStartChatWithStreamer = async (user: User) => {
    if (!currentUser) return;

    try {
      const check = await api.canSendMessage(currentUser.id, user.id);
      if (!check.allowed) {
        addToast(ToastType.Error, check.reason || 'Não é possível enviar mensagem');
        return;
      }
    } catch {
      return;
    }

    setConversations(prev => prev.map(c =>
      c.friend?.id === user.id ? { ...c, unreadCount: 0 } : c
    ));
    setChattingWith(user);
  };

  const handleStartChat = async (user: User) => {
    if (!currentUser) return;

    const existingConvo = conversations.find(c => c.friend?.id === user.id);
    if (!existingConvo) {
      try {
        const check = await api.canSendMessage(currentUser.id, user.id);
        if (!check.allowed) {
          addToast(ToastType.Error, check.reason || 'Não é possível enviar mensagem');
          return;
        }
      } catch {
        return;
      }
    }

    setConversations(prev => prev.map(c =>
      c.friend?.id === user.id ? { ...c, unreadCount: 0 } : c
    ));
    setChattingWith(user);
  };



  const handleViewProfile = async (user: User) => {

    setChattingWith(null);

    if (currentUser && user.id !== currentUser.id) {
      api.recordVisit(user.id, currentUser.id).catch(err => {
        console.error('[API] Erro ao registrar visita no perfil:', err);
      });
    }

    // 🔧 Dados FRESCOS do servidor pra QUALQUER usuário: o objeto clicado (da listagem
    // /api/users ou busca) vem com fans/following/isFollowed desatualizados/denormalizados.
    // O /api/users/:id agora retorna contagem e listas REAIS — usa ele sempre.
    try {
      const freshUser = await api.getUser(user.id);
      if (freshUser) {
        setViewingProfile(freshUser);
        return;
      }
    } catch (_) { /* se falhar, usa dados disponíveis */ }

    // Fallback para dados locais (rede indisponível / erro)

    const fullUserFromState = allUsers.find(u => u.id === user.id);

    const userToView = user.id === currentUser?.id ? currentUser : (fullUserFromState || user);

    // 🔧 Estado REAL do follow na abertura: a lista/origem pode vir sem a flag
    // isFollowed (ou errada) — sincroniza com quem EU realmente sigo.
    const reallyFollowing = currentUser && userToView.id !== currentUser.id
      ? followingUsers.some(u => String(u.id) === String(userToView.id))
      : false;

    const userToViewEnriched: User = { ...userToView, isFollowed: !!userToView.isFollowed || reallyFollowing };

    setViewingProfile(userToViewEnriched);

  };



  const handleEditProfile = () => { setIsEditingProfile(true); setViewingProfile(null); }



  const handleSaveProfile = async (updatedData: Partial<User>) => {

    if (!currentUser) return;

    try {
      // 1. Enviar para API primeiro
      const response = await api.updateProfile(currentUser.id, updatedData);
      
      if (response.success) {
        // 2. Atualizar com dados do servidor
        updateUserEverywhere(response.user);
        setViewingProfile(response.user);
        setIsEditingProfile(false);
        addToast(ToastType.Success, t('toasts.profileSaved'));
      }
    } catch (error) {
      addToast(ToastType.Error, 'Erro ao salvar perfil');
      console.error('Error saving profile:', error);
    }

  };



  const handleFollowUser = async (userToFollow: User, streamId?: string) => {

    if (!currentUser) return;

    // 🛡️ Não permite seguir a si mesmo (evita 400 "Cannot follow yourself"
    // vindo do backend quando o próprio dono da live toca no botão seguir)
    if (String(userToFollow.id) === String(currentUser.id)) return;



    try {

      const response = await api.followUser(currentUser.id, userToFollow.id, streamId);



      if (response.success) {

        // 🔧 VERDADE DO SERVIDOR: o backend responde o estado REAL depois do
        // toggle (isFollowing). Antes usávamos a flag do cliente (user.isFollowed),
        // que podia vir errada de onde o perfil foi aberto — o botão invertia
        // ("Seguir" mesmo já seguindo) e podia DESSEGUIR sem querer.
        const isNowFollowing = typeof (response as any).isFollowing === 'boolean'
          ? (response as any).isFollowing
          : !userToFollow.isFollowed;

        const updatedFollowed = { ...userToFollow, isFollowed: isNowFollowing };

        const updatedFollower = { ...currentUserRef.current, following: Math.max(0, (currentUser.following || 0) + (isNowFollowing ? 1 : -1)) };



        updateUserEverywhere(updatedFollower);

        updateUserEverywhere(updatedFollowed);



        setFollowingUsers(prev => {

          if (isNowFollowing) {

            if (prev.some(u => u.id === updatedFollowed.id)) {

              return prev.map(u => u.id === updatedFollowed.id ? updatedFollowed : u);

            }

            return [...prev, updatedFollowed];

          } else {

            return prev.filter(u => u.id !== updatedFollowed.id);

          }

        });



        if (liveSession && activeStream && userToFollow.id === activeStream.hostId) {

          const increment = isNowFollowing ? 1 : -1;

          updateLiveSession({ followers: Math.max(0, (liveSession.followers || 0) + increment) });

        }



        // Se virou amizade, mostrar notificação especial

        if (response.isFriendship && isNowFollowing) {

          addToast(ToastType.Success, `🎉 Você e ${userToFollow.name} agora são amigos!`);

        } else if (!streamId) {

          const toastMessage = isNowFollowing

            ? t('toasts.followedUser', { name: userToFollow.name })

            : `Você deixou de seguir ${userToFollow.name}.`;

          addToast(ToastType.Success, toastMessage);

        }

      }

    } catch (error) {

      addToast(ToastType.Error, 'Não foi possível realizar esta ação');

    }

  };



  const handleBlockUser = async (userToBlock: User) => {

    if (!currentUser) return;

    // 🔒 Chama a API de verdade (antes só mostrava toast e o bloqueio nunca
    // era salvo — a lista de bloqueio ficava vazia). O backend grava o bloqueio
    // com o dono = usuário logado (token).
    try {

      await api.blockUser(userToBlock.id);

    } catch (err: any) {

      addToast(ToastType.Error, err?.message || 'Erro ao bloquear. Tente novamente.');

      return;

    }

    addToast(ToastType.Success, `${userToBlock.name} foi bloqueado.`);

    if (viewingProfile?.id === userToBlock.id) {

      setViewingProfile(null);

    }

    if (chattingWith?.id === userToBlock.id) {

      setChattingWith(null);

    }

  };



  const handleReportUser = async (userToReport: User) => {

    if (!currentUser) return;

    addToast(ToastType.Success, `Denúncia sobre ${userToReport.name} enviada.`);

  };



  const handleUnblockUser = async (userToUnblock: User) => {

    if (!currentUser) return;

    // 🔒 Chama a API de verdade (antes só mostrava toast e o desbloqueio
    // nunca era salvo). O BlockListScreen remove o item localmente após o ok.
    try {

      await api.unblockUser(userToUnblock.id);

    } catch (err: any) {

      addToast(ToastType.Error, err?.message || 'Erro ao desbloquear. Tente novamente.');

      return;

    }

    addToast(ToastType.Success, `${userToUnblock.name} foi desbloqueado.`);

  };



  const hasCadastralData = (user: User | null): boolean => {
    return !!user?.cadastral?.document;
  };

  const handlePurchase = (pkg: PurchasePackage) => {

    if (pkg.isFreeDev) return;

    // Exigência legal: dados cadastrais (nome, CPF/CNPJ e endereço) pedidos antes do pagamento
    if (!hasCadastralData(currentUser)) {
      setPendingPurchase(pkg);
      setIsCadastralScreenOpen(true);
      return;
    }

    setSelectedPackage(pkg);

    setIsWalletScreenOpen(false);

    setIsConfirmingPurchase(true);

  };

  const handleCadastralSaved = () => {

    setIsCadastralScreenOpen(false);

    if (pendingPurchase) {
      const pkg = pendingPurchase;
      setPendingPurchase(null);
      setSelectedPackage(pkg);
      setIsWalletScreenOpen(false);
      setIsConfirmingPurchase(true);
    }

  };



  const handleConfirmPurchase = async (pkg: PurchasePackage, method: 'card' | 'pix' | 'payoneer' = 'payoneer') => {

    if (!currentUser) return;

    try {
      // Criar ordem + sessão de checkout Payoneer e redirecionar ao checkout hospedado
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

      if (res && res.configured === false) {
        addToast(ToastType.Error, 'Pagamentos em configuração. Assim que o provedor for conectado, a compra será processada.');
        return;
      }

      addToast(ToastType.Error, 'Não foi possível iniciar o pagamento. Tente novamente.');
    } catch (error) {
      console.error('[PURCHASE] Erro ao iniciar pagamento:', error);
      addToast(ToastType.Error, 'Pagamento indisponível no momento.');
    }
  };



  const handlePurchaseFrame = async (frameId: string) => {

    if (!currentUser) return;

    try {
      const response = await api.purchaseFrame(currentUser.id, frameId);
      
      if (response && response.success && response.user) {
        updateUserEverywhere(response.user);
        addToast(ToastType.Success, "Moldura comprada com sucesso!");
      } else {
        addToast(ToastType.Error, 'Erro ao comprar moldura');
      }
    } catch (error) {
      console.error('[FRAME] Erro ao comprar moldura:', error);
      addToast(ToastType.Error, 'Erro ao comprar moldura');
    }
  };



  const handleOpenPKTimerSettings = () => setIsPKTimerSettingsOpen(true);



  const handleSavePKTimer = async (duration: number) => {

    setPkBattleDuration(duration);

    addToast(ToastType.Success, t('toasts.pkTimerSaved'));

    setIsPKTimerSettingsOpen(false);

  };



  const handleOpenListScreen = async (listType: 'following' | 'fans' | 'visitors' | 'topFans' | 'blockList', targetUser?: User) => {

    if (!currentUser) return;

    const targetId = targetUser?.id || currentUser.id;

    let users: User[] = [];

    switch (listType) {

      case 'following':

        try { users = await api.getFollowingUsers(targetId) ?? []; } catch { users = followingUsers; }

        break;

      case 'fans':

        try { users = await api.getFansUsers(targetId) ?? []; } catch { users = fans; }

        break;

      case 'visitors':

        users = visitors;

        break;

      case 'topFans':

        setTopFansHostId(targetUser?.id);

        try { users = (await api.getFansUsers(targetId) ?? []).slice(0, 10); } catch { users = fans.slice(0, 10); }

        break;

      case 'blockList':

        users = [];

        break;

    }



    setListScreenUsers(users);



    switch (listType) {

      case 'following':

        setIsFollowingScreenOpen(true);

        break;

      case 'fans':

        setIsFansScreenOpen(true);

        break;

      case 'visitors':

        setIsVisitorsScreenOpen(true);

        break;

      case 'topFans':

        setIsTopFansScreenOpen(true);

        break;

      case 'blockList':

        setIsBlockListScreenOpen(true);

        break;

    }

  };



  const handlePurchaseEffect = async (gift: Gift) => {

    if (currentUser && currentUser.diamonds && gift.price && currentUser.diamonds >= gift.price) {

      const updatedUser = { ...currentUserRef.current, diamonds: currentUser.diamonds - gift.price };

      updateUserEverywhere(updatedUser);

      addToast(ToastType.Success, t('vip.store.purchaseSuccess', { name: gift.name }));

    } else {

      addToast(ToastType.Error, t('vip.store.notEnoughDiamonds'));

    }

  }



  const handleOpenMyStream = () => {

    if (!currentUser) return;

    if (!currentUser.isLive) {

      handleOpenGoLive();

    } else {

      const myStream = streamers.find(s => s.hostId === currentUser.id);

      if (myStream) {

        handleSelectStream(myStream);

      } else {

        addToast(ToastType.Error, "Não foi possível encontrar sua transmissão. Tente reiniciar.");

      }

    }

  };



  const handleOpenVIPCenter = () => {

    setIsVIPCenterOpen(true);

  };



  const handleSubscribeVIP = async () => {

    if (!currentUser) return;

    try {
      const response = await api.subscribeToVIP(currentUser.id);
      
      if (response && response.success && response.user) {
        updateUserEverywhere(response.user);
        addToast(ToastType.Success, t('toasts.vipSuccess'));
        setIsVIPCenterOpen(false);
      } else {
        addToast(ToastType.Error, 'Erro ao assinar VIP');
      }
    } catch (error) {
      console.error('[VIP] Erro ao assinar VIP:', error);
      addToast(ToastType.Error, 'Erro ao assinar VIP');
    }
  };



  const handleWatchLiveNotification = async () => {

    if (!liveNotification) return;



    const targetId = liveNotification.streamId || `stream_${liveNotification.streamerId}`;



    let targetStream = streamers.find(s => s.id === targetId || s.hostId === liveNotification.streamerId);



    if (!targetStream) {

      targetStream = {

        id: targetId,

        hostId: liveNotification.streamerId,

        name: liveNotification.streamerName,

        avatar: liveNotification.streamerAvatar,

        location: 'Unknown',

        time: 'Just now',

        message: liveNotification.message || 'Live Started!',

        tags: [],

        isPrivate: !!liveNotification.isPrivate,

        country: 'global',

        viewers: 0

      };

    }



    setLiveNotification(null);

    handleSelectStream(targetStream);

  };



  // Função de login - chamada pelo LoginScreen após autenticação bem-sucedida
  const handleLogin = useCallback(async (user: User, token: string) => {
    const { setAuthToken } = await import('./services/api');
    setAuthToken(token);
    // Sincronizar com window para acesso da API
    (window as any).currentUser = user;
    setCurrentUser(user);
    setIsAuthenticated(true);
    // Cache para a próxima abertura abrir instantânea
    try { localStorage.setItem('livego_cached_user', JSON.stringify(user)); } catch { }
    // 🔄 Login acabou de emitir token novo — marca o momento da última renovação
    try { localStorage.setItem(TOKEN_REFRESH_AT_KEY, String(Date.now())); } catch { }
  }, []);



  // Mostrar loading enquanto restaura sessão
  if (isLoadingCurrentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;

  // 🔐 Tela de login SÓ na 1ª vez ou após logout explícito. Se existe usuário
  // em cache, NUNCA mostramos login aqui — evita qualquer flash/redirecionamento.
  if (!isAuthenticated && !cachedUserRef.current) return <LoginScreen onLogin={handleLogin} />;

  if (!currentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;



  return (
    <Suspense fallback={null}>
    <div className={`app-container bg-black text-white font-sans ${((activeStream && streamRoomData) || chattingWith) && currentUser ? 'live-fixed' : ''}`}>


      {/* ⚔️ PK Invite Pop-up Modal (global, com Aceitar/Recusar + preview) */}
      {activePKInvite && (
        <PKInviteModal
          invite={activePKInvite}
          currentUserId={currentUser?.id || ''}
          onAccept={handleAcceptPKInvite}
          onReject={handleRejectPKInvite}
          isAccepting={pkInviteAction === 'accepting'}
          isRejecting={pkInviteAction === 'rejecting'}
        />
      )}

      {/* 🤝 Convite global para subir no palco de uma sala de voz (qualquer tela) */}
      {stageInvite && currentUser && (
        <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
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
                      <svg className="w-8 h-8 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="16" y1="11" x2="22" y2="11" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              <h3 className="text-white text-sm font-bold leading-snug">
                {stageInvite.inviterName} te convidou
              </h3>
              <p className="text-white/50 text-xs mt-1">para subir no palco da sala de voz</p>
              <span className="text-[10px] text-cyan-300/70 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2 py-0.5 mt-2">
                {stageInvite.roomName}
              </span>

              <div className="flex items-center gap-3 w-full mt-5">
                <button
                  onClick={() => handleDeclineStageInvite()}
                  disabled={!!stageInviteAction}
                  className="flex-1 py-2.5 rounded-full bg-white/[0.06] text-white/80 text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                >
                  Recusar
                </button>
                <button
                  onClick={() => handleAcceptStageInvite()}
                  disabled={!!stageInviteAction}
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {stageInviteAction === 'accepting' ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Aceitar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ChatScreen com prioridade absoluta - sobre todas as outras telas */}
      {/* 💬 DENTRO da transmissão abre como MODAL (por cima da live, sem sair);
          FORA dela abre como página normal. */}

      {chattingWith && currentUser && (
        activeStream ? (
          <div className="fixed inset-0 z-[999999] bg-black/40" onClick={() => setChattingWith(null)}>
              <ChatScreen

                user={chattingWith}

                onBack={() => setChattingWith(null)}

                isModal={true}

                currentUser={currentUser}

                onNavigateToFriends={handleNavigateToFriends}

                onFollowUser={handleFollowUser}

                onBlockUser={handleBlockUser}

                onReportUser={handleReportUser}

                onOpenPhotoViewer={(photos, index) => {

                    setPhotoViewerData({ photos, initialIndex: index });

                }}

                onOpenLive={handleOpenUserLive}

                onOpenProfile={setViewingProfile}

              />
            </div>
        ) : (

        <div className="fixed top-0 left-0 right-0 z-[999999]" style={{ height: 'var(--app-height, 100dvh)' }}>

          <ChatScreen

            user={chattingWith}

            onBack={() => setChattingWith(null)}

            isModal={false}

            currentUser={currentUser}

            onNavigateToFriends={handleNavigateToFriends}

            onFollowUser={handleFollowUser}

            onBlockUser={handleBlockUser}

            onReportUser={handleReportUser}

            onOpenPhotoViewer={(photos, index) => {

                setPhotoViewerData({ photos, initialIndex: index });

            }}

            onOpenLive={handleOpenUserLive}

            onOpenProfile={setViewingProfile}

          />

        </div>

        )

      )}



      {/* 🚪 PORTÃO 3D de entrada/saída da transmissão */}
      {gatePhase !== 'idle' && (
        <GateTransitionOverlay
          key={gateKey}
          phase={gatePhase as 'enter' | 'exit'}
          onCovered={gatePhase === 'exit' ? finishGateExit : undefined}
          onFinished={endGate}
        />
      )}



      {activeStream && streamRoomData && currentUser ? (

        <>

          <StreamRoom

            streamer={activeStream}

            onRequestEndStream={handleRequestEndStream}

            onStartPKBattle={handleStartPKBattle}

            onViewProfile={handleViewProfile}

            currentUser={currentUser}

            onOpenWallet={() => handleNavigation('wallet')}

            onFollowUser={handleFollowUser}

            onOpenPrivateChat={() => setIsPrivateChatModalOpen(true)}

            onStartChatWithStreamer={handleStartChatWithStreamer}

            onOpenPKTimerSettings={handleOpenPKTimerSettings}

            gifts={streamRoomData.gifts}

            receivedGifts={streamRoomData.receivedGifts}

            updateUser={updateUserEverywhere}

            liveSession={liveSession}

            updateLiveSession={updateLiveSession}

            logLiveEvent={logLiveEvent}

            setActiveScreen={handleNavigation}

            onStreamUpdate={handleStreamUpdate}

            refreshStreamRoomData={refreshStreamRoomData}

            addToast={addToast}

            onLeaveStreamView={handleLeaveStreamView}

            onBannedFromStream={() => { try { handleLeaveStreamView(true); } catch {} setTimeout(() => setIsBlockListScreenOpen(true), 350); }}

            onOpenPrivateInviteModal={() => setIsPrivateInviteModalOpen(true)}

            onOpenFans={() => handleOpenListScreen('fans')}

            onOpenFollowing={() => handleOpenListScreen('following')}

            onOpenFriendRequests={() => setIsFriendRequestsScreenOpen(true)}

            followingUsers={followingUsers}

            streamers={streamers}

            onSelectStream={handleSelectStream}

            onOpenVIPCenter={handleOpenVIPCenter}

            rankingData={rankingData}

          />

          {isPKBattleActive && pkOpponent && (

            <PKBattleScreen

              streamer={activeStream}

              opponent={pkOpponent}

              pkBattleId={pkBattleId}

              onEndPKBattle={handleEndPKBattle}

              onRequestEndStream={handleRequestEndStream}

              onViewProfile={handleViewProfile}

              currentUser={currentUser}

              onFollowUser={handleFollowUser}

              onOpenPrivateChat={() => setIsPrivateChatModalOpen(true)}

              onStartChatWithStreamer={handleStartChatWithStreamer}

              onOpenPKTimerSettings={handleOpenPKTimerSettings}

              gifts={streamRoomData.gifts}

              receivedGifts={streamRoomData.receivedGifts}

              liveSession={liveSession}

              updateLiveSession={updateLiveSession}

              logLiveEvent={logLiveEvent}

              updateUser={updateUserEverywhere}

              setActiveScreen={handleNavigation}

              onStreamUpdate={handleStreamUpdate}

              rankingData={rankingData}

              addToast={addToast}

              refreshStreamRoomData={refreshStreamRoomData}

              onLeaveStreamView={handleLeaveStreamView}

              onOpenPrivateInviteModal={() => setIsPrivateInviteModalOpen(true)}

              onOpenFans={() => handleOpenListScreen('fans')}

              onOpenFriendRequests={() => setIsFriendRequestsScreenOpen(true)}

              followingUsers={followingUsers}

              pkBattleDuration={pkBattleDuration}

              streamers={streamers}

              onSelectStream={handleSelectStream}

              onOpenVIPCenter={handleOpenVIPCenter}

            />

          )}

        </>

      ) : (

        <>

          {/* Demais telas só aparecem se não houver chat ativo */}

          {!chattingWith && (

            <div className="h-full w-full">

              {/* Navegação isolada por seção */}
              {location.pathname === '/' || location.pathname === '/live' ? (                  <MainScreen 
                    onOpenReminderModal={() => setIsReminderModalOpen(true)}
                    onOpenRegionModal={() => setIsRegionModalOpen(true)}
                    onSelectStream={handleSelectStream}
                    onOpenSearch={() => setIsSearchScreenOpen(true)}
                    streamers={streamers}
                    isLoading={isLoadingStreamers}
                    activeTab={activeCategory}
                    onTabChange={handleTabChange}
                    showLocationBanner={showLocationBanner}
                    unreadCount={totalUnreadMessages}
                    invitedStreamIds={invitedStreamIds}
                    voiceRooms={voiceRooms}
                    onOpenVoiceRoom={(roomId) => navigate('/voice-room/' + roomId)}
                    onRefresh={() => {
                      // 🔄 Recarrega os cards da aba atual (pull-to-refresh / auto-refresh)
                      if (activeCategory !== 'nearby' || locationPermissionStatus === 'granted') {
                        handleTabChange(activeCategory);
                      }
                    }}
                />
              ) : location.pathname.startsWith('/live/') && location.pathname !== '/live' ? (
                <LiveLoadingRedirect />
              ) : location.pathname === '/video-room' ? (
                null
              ) : location.pathname === '/video' ? (
                <VideoScreen
                  onViewProfile={handleViewProfile}
                  onOpenPhotoViewer={(photos, index) => setPhotoViewerData({ photos, initialIndex: index })}
                />
              ) : location.pathname === '/messages' ? (
                <MessagesScreen
                  onStartChat={handleStartChat}
                  onViewProfile={handleViewProfile}
                  conversations={conversations}
                  friends={friends}
                  initialTab={messagesInitialTab}
                  initialChatUserId={new URLSearchParams(location.search).get('chat') || undefined}
                  onOpenFriendRequests={() => setIsFriendRequestsScreenOpen(true)}
                  fans={fans}
                  followingUsers={followingUsers}
                  liveStreamers={streamers}
                  onSelectStreamer={handleSelectStream}
                  onOpenLive={handleOpenUserLive}
                  onConversationDeleted={(friendId) => setConversations(prev => prev.filter(c => c.friend?.id !== friendId))}
                />
              ) : location.pathname === '/profile' ? (
                <ProfileScreen
                  currentUser={currentUser}
                  onOpenMyLevel={() => navigate('/profile/my-level')}
                  onOpenUserLevels={() => navigate('/profile/user-levels')}
                  onOpenBlockList={() => navigate('/profile/block-list')}
                  onOpenAvatarProtection={() => navigate('/profile/avatar-protection')}
                  onOpenFAQ={() => navigate('/profile/faq')}
                  onOpenSettings={() => navigate('/profile/settings')}
                  onOpenVIPCenter={handleOpenVIPCenter}
                  onNavigateToMessages={() => navigate('/messages')}
                  onOpenFans={() => handleOpenListScreen('fans')}
                  onOpenFollowing={() => handleOpenListScreen('following')}
                  onOpenVisitors={() => setIsVisitorsScreenOpen(true)}
                  onOpenTopFans={() => handleOpenListScreen('topFans')}
                  onOpenMarket={() => setIsMarketScreenOpen(true)}
                  onOpenWallet={(initialTab?: 'Diamante' | 'Ganhos') => {
                    setWalletInitialTab(initialTab || 'Diamante');
                    setIsWalletScreenOpen(true);
                  }}
                  onOpenAdminWallet={() => {
                    setWalletInitialTab('Ganhos');
                    setIsWalletScreenOpen(true);
                  }}
                  onEnterMyStream={() => {
                    if (currentUser?.isLive) {
                      const userStream = streamers.find(s => s.hostId === currentUser.id);
                      if (userStream) handleSelectStream(userStream);
                    }
                  }}
                  onOpenProfile={() => {
                    console.log('👤 [PROFILE] Abrindo perfil do usuário atual:', currentUser?.name);
                    if (currentUser) setViewingProfile({...currentUser});
                  }}
                  visitors={visitors}
                />
              ) : location.pathname === '/profile/wallet' ? (
                <WalletScreen
                  onClose={() => navigate('/profile')}
                  onPurchase={handlePurchase}
                  initialTab={walletInitialTab}
                  isBroadcaster={true}
                  currentUser={currentUser}
                  updateUser={updateUserEverywhere}
                  addToast={addToast}
                  purchaseHistory={purchaseHistory}
                />
              ) : location.pathname === '/profile/vip-center' ? (
                <VIPCenterScreen
                  isOpen={true}
                  onClose={() => navigate('/profile')}
                  user={currentUser}
                  onSubscribe={handleSubscribeVIP}
                />
              ) : location.pathname === '/profile/my-level' ? (
                <MyLevelScreen
                  onClose={() => navigate('/profile')}
                  currentUser={currentUser}
                />
              ) : location.pathname === '/profile/user-levels' ? (
                <UserLevelsScreen
                  onClose={() => navigate('/profile')}
                  currentUser={currentUser}
                />
              ) : location.pathname === '/profile/fans' ? (
                <TopFansScreen
                  onBack={() => navigate('/profile')}
                  onViewProfile={handleViewProfile}
                  currentUser={currentUser}
                />
              ) : location.pathname === '/profile/block-list' ? (
                <BlockListScreen
                  onClose={() => navigate('/profile')}
                  onUnblockUser={handleUnblockUser}
                  onViewProfile={handleViewProfile}
                />
              ) : location.pathname === '/profile/avatar-protection' ? (
                <AvatarProtectionScreen
                  onClose={() => navigate('/profile')}
                  currentUser={currentUser}
                  updateUser={updateUserEverywhere}
                  addToast={addToast}
                />
              ) : location.pathname === '/profile/faq' ? (
                <FAQScreen
                  onClose={() => navigate('/profile')}
                />
              ) : location.pathname === '/profile/settings' ? (
                <SettingsScreen
                  onClose={() => navigate('/profile')}
                  currentUser={currentUser}
                  gifts={allGifts}
                  updateUser={updateUserEverywhere}
                  addToast={addToast}
                  onOpenPipModal={() => setIsPipSettingsModalOpen(true)}
                  onLogout={handleLogout}
                  onDeleteAccount={handleDeleteAccount}
                  onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                />
              ) : location.pathname === '/golive' ? (
                <GoLiveScreen
                  isOpen={true}
                  onClose={() => navigate(-1)}
                  onStartStream={handleStartStream}
                  onJoinStream={handleStartStream}
                  addToast={addToast}
                  currentUser={currentUser}
                  updateUser={updateUserEverywhere}
                  inviteData={privateInviteData}
                  onOpenVoiceRoom={(roomId) => navigate('/voice-room/' + roomId)}
                />
              ) : location.pathname.startsWith('/voice-room/') ? (
                (() => {
                  const voiceRoomId = decodeURIComponent(location.pathname.split('/voice-room/')[1] || '');
                  return voiceRoomId && currentUser ? (
                    <VoiceRoom
                      roomId={voiceRoomId}
                      currentUser={currentUser}
                      onClose={() => navigate(-1)}
                      addToast={addToast}
                      gifts={allGifts}
                      receivedGifts={streamRoomData?.receivedGifts || []}
                      updateUser={updateUserEverywhere}
                      onOpenWallet={(initialTab) => {
                        setWalletInitialTab(initialTab || 'Diamante');
                        setIsWalletScreenOpen(true);
                      }}
                      onOpenVIPCenter={handleOpenVIPCenter}
                    />
                  ) : null;
                })()
              ) : null}

              {['/', '/live', '/video', '/messages', '/profile'].includes(location.pathname) && (
                <FooterNav currentUser={currentUser} onOpenGoLive={handleOpenGoLive} activeTab={getCurrentScreenFromPath(location.pathname)} onNavigate={handleNavigation} onOpenChat={() => handleNavigation('messages')} unreadCount={totalUnreadMessages} />
              )}

            </div>

          )}

        </>

      )}



      {/* Floating Player - Picture-in-Picture */}
      {isPiPMode && pipStreamer && (
        <FloatingPlayer
          streamer={pipStreamer}
          onClose={() => {
            setPipStreamer(null);
            setIsPiPMode(false);
          }}
          onRestore={handleRestoreFromPiP}
        />
      )}

      <ReminderModal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} onSelectStream={handleSelectStream} streamers={reminderStreamers} onOpenLiveHistory={() => setIsLiveHistoryOpen(true)} />

      <RegionModal isOpen={isRegionModalOpen} onClose={() => setIsRegionModalOpen(false)} countries={countries} onSelectRegion={handleSelectRegion} selectedCountryCode={selectedCountry || 'ICON_GLOBE'} />

      {/* Banner de instalação PWA para dispositivos móveis */}
      <PWAInstallBanner />

      {/* Updated GoLiveScreen usage to accept inviteData */}


      <LocationPermissionModal isOpen={isLocationPermissionModalOpen} onAllow={handleAllowLocation} onAllowOnce={handleAllowLocation} onDeny={handleDenyLocation} permissionStatus={locationPermissionStatus} />

      {isEndStreamConfirmOpen && <EndStreamConfirmationModal onCancel={() => setIsEndStreamConfirmOpen(false)} onConfirm={handleConfirmEndStream} isPK={isPKBattleActive} />}

      {isEndStreamSummaryOpen && streamSummaryData && <EndStreamSummaryScreen data={streamSummaryData} onClose={() => { setIsEndStreamSummaryOpen(false); setStreamSummaryData(null); navigate('/'); }} />}

      {viewingProfile && <UserProfileScreen user={viewingProfile} isCurrentUser={viewingProfile.id === currentUser?.id} onBack={() => setViewingProfile(null)} onEdit={handleEditProfile} onOpenTopFans={() => { setViewingProfile(null); handleOpenListScreen('topFans', viewingProfile); }} onOpenFollowing={() => { setViewingProfile(null); handleOpenListScreen('following'); }} onOpenFans={() => { setViewingProfile(null); handleOpenListScreen('fans'); }} onFollow={handleFollowUser} onStartChat={handleStartChat} onBlockUser={handleBlockUser} onReportUser={handleReportUser} onOpenPhotoViewer={(photos, index) => setPhotoViewerData({ photos, initialIndex: index })} lastPhotoLikeUpdate={lastPhotoLikeUpdate} onPhotoLiked={() => setLastPhotoLikeUpdate(Date.now())} onPhotoRemoved={(u) => { updateUserEverywhere(u); setViewingProfile(u); }} onOpenLive={handleOpenUserLive} />}

      {isEditingProfile && <EditProfileScreen user={currentUser} onBack={() => setIsEditingProfile(false)} onSave={handleSaveProfile} />}

      {isWalletScreenOpen && <WalletScreen onClose={() => setIsWalletScreenOpen(false)} onPurchase={handlePurchase} initialTab={walletInitialTab} isBroadcaster={true} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} purchaseHistory={purchaseHistory} />}

      {isConfirmingPurchase && selectedPackage && <ConfirmPurchaseScreen onClose={() => setIsConfirmingPurchase(false)} packageDetails={selectedPackage} onConfirmPurchase={handleConfirmPurchase} addToast={addToast} currentUser={currentUser} />}

      {isCadastralScreenOpen && pendingPurchase && currentUser && <CadastralDataScreen onClose={() => { setIsCadastralScreenOpen(false); setPendingPurchase(null); }} onSaved={handleCadastralSaved} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />}

      {isFollowingScreenOpen && <FollowingScreen onBack={() => setIsFollowingScreenOpen(false)} onViewProfile={handleViewProfile} onOpenLive={handleOpenUserLive} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFansScreenOpen && <FansScreen onBack={() => setIsFansScreenOpen(false)} onViewProfile={handleViewProfile} onOpenLive={handleOpenUserLive} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFriendRequestsScreenOpen && <FriendRequestsScreen onBack={() => setIsFriendRequestsScreenOpen(false)} onViewProfile={handleViewProfile} users={(followingUsers || []).filter(followed => followed && (fans || []).some(fan => fan && fan.id === followed.id))} onFollowUser={handleFollowUser} />}

      {isVisitorsScreenOpen && <VisitorsScreen onBack={() => setIsVisitorsScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} addToast={addToast} />}

      {isTopFansScreenOpen && <TopFansScreen onBack={() => setIsTopFansScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} hostId={topFansHostId} />}

      {isMyLevelScreenOpen && <MyLevelScreen onClose={() => setIsMyLevelScreenOpen(false)} currentUser={currentUser} />}

      {isBlockListScreenOpen && <BlockListScreen onClose={() => setIsBlockListScreenOpen(false)} onUnblockUser={handleUnblockUser} onViewProfile={handleViewProfile} />}

      {isAvatarProtectionScreenOpen && <AvatarProtectionScreen onClose={() => setIsAvatarProtectionScreenOpen(false)} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />}

      {isMarketScreenOpen && currentUser && <MarketScreen onClose={() => setIsMarketScreenOpen(false)} user={currentUser} updateUser={updateUserEverywhere} onPurchaseFrame={handlePurchaseFrame} addToast={addToast} onOpenWallet={(initialTab) => handleNavigation('wallet')} />}

      {isFAQScreenOpen && <FAQScreen onClose={() => setIsFAQScreenOpen(false)} />}

      {isSettingsScreenOpen && <SettingsScreen onClose={() => setIsSettingsScreenOpen(false)} currentUser={currentUser} gifts={allGifts} updateUser={updateUserEverywhere} addToast={addToast} onOpenPipModal={() => setIsPipSettingsModalOpen(true)} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />}

      {isGiftAdminOpen && <GiftAdminPanel onClose={() => setIsGiftAdminOpen(false)} />}

      <PipSettingsModal isOpen={isPipSettingsModalOpen} onClose={() => setIsPipSettingsModalOpen(false)} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />

      <LanguageSelectionModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} currentLanguage={language} onSave={(lang) => { setLanguage(lang); setIsLanguageModalOpen(false); }} />

      {isSearchScreenOpen && <SearchScreen onClose={() => setIsSearchScreenOpen(false)} onViewProfile={handleViewProfile} allUsers={allUsers} onFollowUser={handleFollowUser} followingUsers={followingUsers} />}

      {activeStream && isPrivateInviteModalOpen && <PrivateInviteModal isOpen={isPrivateInviteModalOpen} onClose={() => setIsPrivateInviteModalOpen(false)} streamId={activeStream.id} currentUser={currentUser} addToast={addToast} followingUsers={followingUsers} onFollowUser={handleFollowUser} allGifts={allGifts} />}

      {photoViewerData && (

        <>

          

          <FullScreenPhotoViewer 

            photos={photoViewerData.photos} 

            initialIndex={photoViewerData.initialIndex} 

            onClose={() => {

              setPhotoViewerData(null);

            }} 

            onViewProfile={handleViewProfile} 

            onPhotoLiked={() => setLastPhotoLikeUpdate(Date.now())} 

          />

        </>

      )}

      <LiveHistoryScreen isOpen={isLiveHistoryOpen} onClose={() => setIsLiveHistoryOpen(false)} history={streamHistory} />

      <PrivateChatModal isOpen={isPrivateChatModalOpen} onClose={() => setIsPrivateChatModalOpen(false)} onStartChat={(user) => { setIsPrivateChatModalOpen(false); handleStartChat(user); }} conversations={conversations} />

      <PKBattleTimerSettingsScreen isOpen={isPKTimerSettingsOpen} onBack={() => setIsPKTimerSettingsOpen(false)} onSave={handleSavePKTimer} />

      {isVIPCenterOpen && currentUser && <VIPCenterScreen isOpen={isVIPCenterOpen} onClose={() => setIsVIPCenterOpen(false)} user={currentUser} onSubscribe={handleSubscribeVIP} />}

      {isPaymentSuccessOpen && paymentSuccessData && <PaymentSuccessScreen onClose={() => setIsPaymentSuccessOpen(false)} data={paymentSuccessData} addToast={(type, msg) => addToast(type === 'info' ? ToastType.Info : ToastType.Success, msg)} />}



      {/* 🔔 Faixa de notificações in-app (ao vivo / convite privado / PK) */}
      <InAppNotificationBanner
        notifications={inAppNotifications}
        onDismiss={(id) => setInAppNotifications(prev => prev.filter(p => p.id !== id))}
        onAction={handleInAppAction}
        onSecondaryAction={handleInAppSecondaryAction}
      />

      {/* LiveNotificationModal rendered for standard notifications, but private invite uses GoLiveScreen directly */}

      <LiveNotificationModal

        isOpen={!!liveNotification}

        onClose={() => setLiveNotification(null)}

        onWatch={handleWatchLiveNotification}

        data={liveNotification}

      />



      {/* 🔔 CTA único: pedir permissão de notificação com gesto do usuário (PWA) */}
      {showNotifCta && (
        <div className="fixed bottom-24 left-3 right-3 z-[100] animate-fade-in">
          <div className="bg-[#14121f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#26e3ff]/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔔</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Ative as notificações</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">Saiba quando seus streamers favoritos entram ao vivo, mesmo com o app fechado.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleEnableNotifications}
                    className="flex-1 bg-gradient-to-r from-[#26e3ff] to-sky-500 text-black font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    Ativar
                  </button>
                  <button
                    onClick={() => setShowNotifCta(false)}
                    className="px-4 bg-white/[0.06] text-zinc-300 text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 Notificações flutuantes estilo WhatsApp — no topo, arrasta pra descartar */}
      <FloatingChatNotification
        notifications={floatingNotifs}
        onDismiss={handleDismissFloatingNotif}
        onTap={handleTapFloatingNotif}
      />

      {/* 🔔 Notificações/toasts — embaixo, PERTO da barra de mensagens (pedido do
          dono: "X entrou na sala" não pode ficar lá no alto). bottom-24 (96px)
          folga os composers das telas (~58-92px). Toasts seguem clicáveis. */}
      <div className="absolute bottom-24 right-4 left-4 sm:left-auto space-y-2 z-[9999] pointer-events-none">

        {toasts.map(toast => (

          <div key={toast.id} className="pointer-events-auto">

            <Toast data={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />

          </div>

        ))}

      </div>

    </div>
    </Suspense>
  );

};



// Componente para rotas de profile aninhadas
const ProfileRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obter props do contexto global
  const { 
    currentUser, 
    handleOpenVIPCenter, 
    handleOpenListScreen, 
    setIsVisitorsScreenOpen, 
    setIsMarketScreenOpen,
    setWalletInitialTab,
    setIsWalletScreenOpen,
    streamers,
    handleSelectStream,
    setViewingProfile,
    visitors,
    handlePurchase,
    updateUserEverywhere,
    addToast,
    purchaseHistory,
    walletInitialTab,
    handleSubscribeVIP,
    handleUnblockUser,
    handleViewProfile,
    allGifts,
    handleLogout,
    handleDeleteAccount,
    setIsPipSettingsModalOpen,
    setIsLanguageModalOpen
  } = (window as any).appContext || {};

  return (
    <Routes>
      <Route path="/" element={
        <ProfileScreen
          currentUser={currentUser}
          onOpenMyLevel={() => navigate('my-level')}
          onOpenUserLevels={() => navigate('user-levels')}
          onOpenBlockList={() => navigate('block-list')}
          onOpenAvatarProtection={() => navigate('avatar-protection')}
          onOpenFAQ={() => navigate('faq')}
          onOpenSettings={() => navigate('settings')}
          onOpenVIPCenter={handleOpenVIPCenter}
          onNavigateToMessages={() => navigate('/messages')}
          onOpenFans={() => handleOpenListScreen('fans')}
          onOpenFollowing={() => handleOpenListScreen('following')}
          onOpenVisitors={() => setIsVisitorsScreenOpen(true)}
          onOpenTopFans={() => handleOpenListScreen('topFans')}
          onOpenMarket={() => setIsMarketScreenOpen(true)}
          onOpenWallet={(initialTab?: 'Diamante' | 'Ganhos') => {
            setWalletInitialTab(initialTab || 'Diamante');
            setIsWalletScreenOpen(true);
          }}
          onOpenAdminWallet={() => {
            setWalletInitialTab('Ganhos');
            setIsWalletScreenOpen(true);
          }}
          onEnterMyStream={() => {
            if (currentUser?.isLive) {
              const userStream = streamers.find(s => s.hostId === currentUser.id);
              if (userStream) handleSelectStream(userStream);
            }
          }}
          onOpenProfile={() => setViewingProfile(currentUser)}
          visitors={visitors}
        />
      } />
      <Route path="wallet" element={
        <WalletScreen
          onClose={() => navigate('..')}
          onPurchase={handlePurchase}
          initialTab={walletInitialTab}
          isBroadcaster={true}
          currentUser={currentUser}
          updateUser={updateUserEverywhere}
          addToast={addToast}
          purchaseHistory={purchaseHistory}
        />
      } />
      <Route path="vip-center" element={
        <VIPCenterScreen
          isOpen={true}
          onClose={() => navigate('..')}
          user={currentUser}
          onSubscribe={handleSubscribeVIP}
        />
      } />
      <Route path="my-level" element={
        <MyLevelScreen
          onClose={() => navigate('..')}
          currentUser={currentUser}
        />
      } />
      <Route path="user-levels" element={
        <UserLevelsScreen
          onClose={() => navigate('..')}
          currentUser={currentUser}
        />
      } />
      <Route path="fans" element={
        <TopFansScreen
          onBack={() => navigate('..')}
          onViewProfile={handleViewProfile}
          currentUser={currentUser}
        />
      } />
      <Route path="block-list" element={
        <BlockListScreen
          onClose={() => navigate('..')}
          onUnblockUser={handleUnblockUser}
          onViewProfile={handleViewProfile}
        />
      } />
      <Route path="avatar-protection" element={
        <AvatarProtectionScreen
          onClose={() => navigate('..')}
          currentUser={currentUser}
          updateUser={updateUserEverywhere}
          addToast={addToast}
        />
      } />
      <Route path="faq" element={
        <FAQScreen
          onClose={() => navigate('..')}
        />
      } />
      <Route path="settings" element={
        <SettingsScreen
          onClose={() => navigate('..')}
          currentUser={currentUser}
          gifts={allGifts}
          updateUser={updateUserEverywhere}
          addToast={addToast}
          onOpenPipModal={() => setIsPipSettingsModalOpen(true)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        />
      } />
    </Routes>
  );
};

const LiveLoadingRedirect: React.FC = () => {
  const navigate = useNavigate();
  // Navegar imediatamente — sem mostrar nenhuma UI intermediária
  useEffect(() => {
    navigate('/');
  }, [navigate]);
  return null;
};

const App: React.FC = () => {

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContentWithRouter />} />
            <Route path="/live" element={<AppContentWithRouter />} />
            <Route path="/live/:streamId" element={<AppContentWithRouter />} />
            <Route path="/video-room" element={<AppContentWithRouter />} />
            <Route path="/video" element={<AppContentWithRouter />} />
            <Route path="/messages" element={<AppContentWithRouter />} />
            <Route path="/golive" element={<AppContentWithRouter />} />
            <Route path="/voice-room/:roomId" element={<AppContentWithRouter />} />
            <Route path="/profile" element={<AppContentWithRouter />} />
            <Route path="/profile/*" element={<AppContentWithRouter />} />
            <Route path="/wallet" element={<AppContentWithRouter />} />
          </Routes>
        </Router>
        <UpdateNotifier />
      </LanguageProvider>
    </ErrorBoundary>
  );

};

// 🔄 Aviso de versão nova: compara a versão do servidor com a do aparelho e
// bloqueia o uso da versão antiga até o usuário atualizar.
const UpdateNotifier: React.FC = () => {
  const { updateAvailable, latestVersion } = useAppVersion();
  return <UpdateAvailableModal open={updateAvailable} latestVersion={latestVersion} />;
};



export default App;



