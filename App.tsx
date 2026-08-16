

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

import ProfileScreen from './components/ProfileScreen';

import MessagesScreen from './components/MessagesScreen';

import ChatScreen from './components/ChatScreen';

import FooterNav from './components/FooterNav';

import ReminderModal from './components/ReminderModal';

import RegionModal from './components/RegionModal';

import GoLiveScreen, { InviteData } from './components/GoLiveScreen';

import StreamRoom from './components/StreamRoom';
import { enrichGiftsWithComponents } from './components/live/GiftSvgHelper';

import PKBattleScreen from './components/PKBattleScreen';

import { ToastType, ToastData, Streamer, User, Gift, StreamSummaryData, LiveSessionState, RankedUser, Conversation, Country, NotificationSettings, BeautySettings, FeedPhoto, StreamHistoryEntry, Visitor, PurchaseRecord, Message, EndStreamSummary, PurchaseCurrency, PurchasePackage } from './types';

import Toast from './components/Toast';

import MessageNotification from './components/MessageNotification';  // Socket.IO removido — chat via REST API

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

import PKBattleTimerSettingsScreen from './components/settings/PKBattleTimerSettingsScreen';

import FriendRequestsScreen from './components/FriendRequestsScreen';

import { LanguageProvider, useTranslation } from './i18n';

import { LoadingSpinner } from './components/Loading';

import PipSettingsModal from './components/settings/PipSettingsModal';

import PrivateInviteModal from './components/PrivateInviteModal';

import VideoScreen from './components/VideoScreen';

import FullScreenPhotoViewer from './components/FullScreenPhotoViewer';
import FloatingPlayer from './components/FloatingPlayer';

import LiveHistoryScreen from './components/LiveHistoryScreen';

import LanguageSelectionModal from './components/settings/LanguageSelectionModal';

import VIPCenterScreen from './components/VIPCenterScreen';

import PaymentSuccessScreen from './components/PaymentSuccessScreen';

import LiveNotificationModal from './components/live/LiveNotificationModal';
import InAppNotificationBanner, { InAppNotification } from './components/live/InAppNotificationBanner';
import { useGlobalNotifications } from './hooks/useGlobalNotifications';
import GiftAdminPanel from './components/live/GiftAdminPanel';

import { api } from './services/api';
import { connectSocket, initPrivateChatSocket } from './services/socketService';

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

const AppContent: React.FC<{ navigate: any; location: any }> = ({ navigate, location }) => {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState<boolean>(true);

  const [isEnteringStream, setIsEnteringStream] = useState<boolean>(false);



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
  // 🔔 CTA de permissão de notificação (PWA): o pedido precisa de gesto do usuário
  const [showNotifCta, setShowNotifCta] = useState(false);
  const notifDeniedShownRef = useRef(false);
  const notifCtaShownRef = useRef(false);

  const [messageNotifications, setMessageNotifications] = useState<Array<{

    id: string;

    senderName: string;

    senderAvatar: string;

    text: string;

    timestamp: string;

  }>>([]);

  const [activeStream, setActiveStream] = useState<Streamer | null>(null);

  const [streamRoomData, setStreamRoomData] = useState<StreamRoomData | null>(null);

  const [isPKBattleActive, setIsPKBattleActive] = useState<boolean>(false);

  const [pkOpponent, setPkOpponent] = useState<User | null>(null);

  const [activePKInvite, setActivePKInvite] = useState<any>(null);

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

      setIsLoadingCurrentUser(true);

      try {

        // Tentar restaurar token do banco de dados (TokenStorage)
        const { getAuthToken, setAuthToken } = await import('./components/utils/TokenStorage');
        let token = await getAuthToken();
        
        if (!token) {
          console.warn('⚠️ Token não encontrado no banco de dados');
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoadingCurrentUser(false);
          return;
        }

        // ⚡ ABERTURA RÁPIDA: se já temos o usuário em cache (localStorage),
        // mostra a tela imediatamente e valida em segundo plano. Evita o
        // spinner preto esperando a rede. A API atualiza o cache no sucesso.
        let cachedUser: User | null = null;
        try {
          cachedUser = JSON.parse(localStorage.getItem('livego_cached_user') || 'null');
        } catch {
          cachedUser = null;
        }
        if (cachedUser && cachedUser.id) {
          setCurrentUser(cachedUser);
          (window as any).currentUser = cachedUser;
          setIsAuthenticated(true);
          setIsLoadingCurrentUser(false);
        }

        // Tentar buscar usuário atual da API

        try {
          const user = await api.getCurrentUser();

          if (user) {

            setCurrentUser(user);
            (window as any).currentUser = user;
            setIsAuthenticated(true);
            try { localStorage.setItem('livego_cached_user', JSON.stringify(user)); } catch { }

          } else {

            setIsAuthenticated(false);
            setCurrentUser(null);
            try { localStorage.removeItem('livego_cached_user'); } catch { }

          }
        } catch {
          // Rede falhou: se não havia cache, vai para o login. Se havia cache,
          // mantém o usuário em tela (tolerante a offline momentâneo).
          if (!cachedUser || !cachedUser.id) {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }

      } catch {

        // Usuário não autenticado

        setIsAuthenticated(false);

        setCurrentUser(null);

      } finally {

        setIsLoadingCurrentUser(false);

      }

    };

    restoreSession();

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
        const [streams, countries, gifts] = await Promise.all([
          api.getLiveStreamers('popular', filterCountry),
          api.getRegions(),
          api.getGifts()
        ]);

        setStreamers(Array.isArray(streams) ? streams : []);
        setCountries(countries);
        setAllGifts(enrichGiftsWithComponents(gifts));

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

    if (!currentUser?.id) return;



    const loadUserData = async () => {

      try {

        const [convs, friendList, following, fans, streamHistory, visitors, withdrawalHistory] = await Promise.allSettled([

          api.getConversations(currentUser.id),

          api.getFriends(currentUser.id),

          api.getFollowingUsers(currentUser.id),

          api.getFansUsers(currentUser.id),

          api.getStreamHistory(),

          api.getVisitors(currentUser.id),

          api.getWithdrawalHistory(currentUser.id),

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
        if (fans.status === 'fulfilled' && Array.isArray(fans.value)) {

          setFans(fans.value);

        }
        if (streamHistory.status === 'fulfilled' && Array.isArray(streamHistory.value)) {

          setStreamHistory(streamHistory.value);

        }
        if (visitors.status === 'fulfilled' && Array.isArray(visitors.value)) {

          setVisitors(visitors.value);

        }
        if (withdrawalHistory.status === 'fulfilled' && Array.isArray(withdrawalHistory.value)) {

          setPurchaseHistory(withdrawalHistory.value);

        }
        
      } catch (error) {

        console.error('❌ [App] Erro ao carregar dados do usuário:', error);

      }

    };



    loadUserData();

  }, [currentUser?.id]);



  // Listener para notificações de novas mensagens

  useEffect(() => {

    const handleNewMessage = (event: CustomEvent) => {

      const message = event.detail;

      

      // Não notificar sobre as próprias mensagens (eco de confirmação do socket)

      if (message.from === currentUser?.id) {

        return;

      }

      

      // Não mostrar notificação se estiver no chat com o remetente

      if (chattingWith && chattingWith.id === message.from) {

        return;

      }

      

      // Adicionar notificação

      const notification = {

        id: `msg_${Date.now()}_${Math.random()}`,

        senderName: message.senderName || 'Usuário',

        senderAvatar: message.senderAvatar || '',

        text: message.text || 'Enviou uma mensagem',

        timestamp: message.timestamp || new Date().toISOString()

      };

      

      setMessageNotifications(prev => [...prev, notification]);

      addToast(ToastType.Info, notification.text);

    };



    window.addEventListener('newChatMessage', handleNewMessage as EventListener);

    

    return () => {

      window.removeEventListener('newChatMessage', handleNewMessage as EventListener);

    };

  }, [chattingWith?.id]);

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
            await api.startPKBattle(currentUser.id, currentStreamId, opponentUser.id);
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
      if (detail && detail.opponentId) {
        const opponentUser = streamers.find((s: any) => s.id === detail.opponentId || s.hostId === detail.opponentId);
        if (opponentUser) {
          setPkOpponent(opponentUser as unknown as User);
          setIsPKBattleActive(true);
          addToast(ToastType.Success, '⚔️ Batalha PK iniciada!');
        } else {
          console.warn('[PK] Oponente não encontrado nos dados da stream — batalha não iniciada');
          addToast(ToastType.Error, 'Não foi possível iniciar a batalha PK: oponente não encontrado');
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
    };

    const handlePKScoreUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.streamId && detail.streamId !== activeStream?.id) return;
      // O score é sincronizado via REST API no PKBattleScreen
      // Este evento é útil para espectadores via Socket.IO
      if (detail) {
        window.dispatchEvent(new CustomEvent('livego:pk_score_sync', { 
          detail: { scoreA: detail.scoreA || detail.teamAScore, scoreB: detail.scoreB || detail.teamBScore }
        }));
      }
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

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(INITIAL_DATA.notificationSettings);

  // 🔔 Notificações in-app GLOBAIS (Socket.IO + bridge FCM): faixa de ao vivo,
  // convite privado e convite PK aparecem mesmo fora da StreamRoom.
  useGlobalNotifications({
    enabled: isAuthenticated && !!currentUser?.id,
    userId: currentUser?.id,
    streamerLiveEnabled: notificationSettings?.streamerLive !== false,
    skipInvitesWhenInStream: !!activeStream,
    onNotification: pushInAppNotification,
  });

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

    connectSocket().then(s => {
      if (disposed || !s?.connected) return;
      socket = s;
      s.on('new_live', addLiveCard);
      s.on('stream_started', addLiveCard);
      // 💬 Chat privado: o socket conectado já entra na sala `user_{id}` do
      // backend; a ponte repassa `newChatMessage` para o window (tempo real).
      initPrivateChatSocket();
    });

    return () => {
      disposed = true;
      if (socket) {
        socket.off('new_live', addLiveCard);
        socket.off('stream_started', addLiveCard);
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
  const fcmInitializedRef = useRef(false);
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

  // 🛡️ Proteção de tela: ativa quando o usuário liga 'screenSecurityEnabled'
  // (própria conta) OU quando está vendo o perfil de alguém que ativou a
  // proteção (viewingProtectedProfile). Enquanto ativa: bloqueia print/
  // gravador (tela preta no app Android), salvar/copiar/arrastar/baixar
  // imagens e compartilhar FOTO/VIDEO (ex.: bot do Telegram). A LIVE
  // continua podendo ser compartilhada e o perfil pode ser visto normalmente.
  useEffect(() => {
    const enabled = !!currentUser?.screenSecurityEnabled || viewingProtectedProfile;
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

    return () => {
      root.classList.remove('screen-security-enabled');
      if (styleEl) styleEl.remove();
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('click', onClickDownload, true);
      const bridge2 = (window as any).Android;
      if (bridge2 && typeof bridge2.setScreenSecure === 'function') {
        try { bridge2.setScreenSecure(false); } catch (_) {}
      }
      if (restoredShare) restoredShare();
    };

  }, [currentUser?.screenSecurityEnabled, viewingProtectedProfile, addToast]);

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



  // ... (keeping existing handlers like handleLeaveStreamView, handleLogout, etc.) ...



  const handleLeaveStreamView = useCallback((forceClose = false) => {
    // Marcar que saímos deliberadamente — auto-load não deve tentar re-entrar
    leftStreamRef.current = true;
    // Se PiP estiver ativado (e não for fechamento forçado), minimizar para janela flutuante
    const isHost = activeStream?.hostId === currentUser?.id;
    if (!forceClose && currentUser?.pipEnabled && activeStream && !isHost) {
      setPipStreamer(activeStream);
      setIsPiPMode(true);
      setActiveStream(null);
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/', { replace: true });
      return;
    }
    // Comportamento normal: fechar tudo (incluindo limpar estado PiP)
    setPipStreamer(null);
    setIsPiPMode(false);
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
    setLiveSession(null);
    setStreamRoomData(null);
    navigate('/', { replace: true });
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
    setPipStreamer(stream);
    setIsPiPMode(true);
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
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

    // Limpar token persistido (REMOVIDO - não usa mais localStorage/sessionStorage)
    // sessionStorage.removeItem('authToken');



    // Limpar estado - não usar localStorage

    setIsAuthenticated(false);

    setCurrentUser(null);

    // Limpar window.currentUser também

    (window as any).currentUser = null;

    navigate('/');

    setIsSettingsScreenOpen(false);

  };



  const handleDeleteAccount = async () => {

    addToast(ToastType.Success, "Conta excluída com sucesso.");

    await handleLogout();

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
    // O firebase-messaging-sw.js usa Network-First: online sempre busca conteúdo fresco,
    // cache é só fallback offline — não causa "assets antigos" para usuários conectados.
    if ('serviceWorker' in navigator && !fcmInitializedRef.current) {
      fcmInitializedRef.current = true;
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then((reg) => {
        console.log('[FCM] Service Worker registrado (única vez)');
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
        console.warn('[FCM] Erro ao registrar Service Worker:', err);
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

    // 🔔 FIREBASE SERVE SÓ PARA NOTIFICAÇÃO NA TELA — o tempo real do app é
    // 100% WebSocket (socketService). Por isso o FCM é carregado DEPOIS da
    // interface abrir (idle com timeout), sem competir com o feed no boot.
    const initFirebaseOnlyNotifications = () => {
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
      import('./services/firebase').then(({ onForegroundMessage }) => {
        onForegroundMessage((payload) => {
          const title = payload.notification?.title || payload.data?.title || 'Nova notificação';
          const body = payload.notification?.body || payload.data?.body || '';
          const type = payload.data?.type;
          if (type === 'new_message') {
            // 🚫 REMOVIDO: o CHAT PRIVADO não usa mais Firebase. As mensagens
            // em tempo real (e o banner de notificação) chegam EXCLUSIVAMENTE
            // via WebSocket (socketService → evento window 'newChatMessage').
          } else if (type === 'live_started') {
            // 🔔 Firebase/FCM serve SÓ para push na tela: NUNCA carrega avatar,
            // foto ou ícone. A faixa in-app usa apenas os dados de roteamento
            // (ids) — o avatar vem exclusivamente do Socket.IO em tempo real.
            window.dispatchEvent(new CustomEvent('app:show_in_app_notification', {
              detail: {
                type: 'live_started',
                streamerId: payload.data?.streamerId || payload.data?.hostId || '',
                streamerName: title,
                streamId: payload.data?.streamId || payload.data?.streamKey || '',
              }
            }));
          } else if (body) {
            addToast(ToastType.Info, `${title}: ${body}`);
          }
        });
      });
    };
    const w = window as any;
    if (w.requestIdleCallback) {
      w.requestIdleCallback(initFirebaseOnlyNotifications, { timeout: 3000 });
    } else {
      w.setTimeout(initFirebaseOnlyNotifications, 2000);
    }

    return () => {};

  }, [activeStream]);



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
    setSelectedCountry(countryCode);

    if (countryCode !== 'ICON_GLOBE') {

      setIsLoadingStreamers(true);

      try {

        const streams = await api.getLiveStreamers('popular', countryCode);
        setStreamers(Array.isArray(streams) ? streams : []);

      } catch (error) {

        setStreamers([]);

      } finally {

        setIsLoadingStreamers(false);

      }

    } else {

      // Se for Global, carregar todos os streams

      setIsLoadingStreamers(true);

      try {

        const streams = await api.getLiveStreamers('popular');
        setStreamers(Array.isArray(streams) ? streams : []);

      } catch (error) {

        setStreamers([]);

      } finally {

        setIsLoadingStreamers(false);

      }

    }

  };



  const loadStreams = async () => {

    setIsLoadingStreamers(true);

    try {

      const streams = await api.getLiveStreamers('popular', selectedCountry !== 'ICON_GLOBE' ? selectedCountry : undefined);
      setStreamers(Array.isArray(streams) ? streams : []);

    } catch (error) {

      setStreamers([]);

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

        setIsLoadingStreamers(true);
        try {
          const streams = await api.getLiveStreamers('nearby');
          setStreamers(Array.isArray(streams) ? streams : []);
        } catch {
          setStreamers([]);
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



      // Carregar streams da API para a categoria selecionada

      setIsLoadingStreamers(true);

      try {

        const streams = await api.getLiveStreamers(tab, selectedCountry !== 'ICON_GLOBE' ? selectedCountry : undefined);
        setStreamers(Array.isArray(streams) ? streams : []);

      } catch (error) {

        setStreamers([]);

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
      const streams = await api.getLiveStreamers('nearby');
      setStreamers(Array.isArray(streams) ? streams : []);
    } catch {
      setStreamers([]);
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
      const streams = await api.getLiveStreamers('nearby');
      setStreamers(Array.isArray(streams) ? streams : []);
    } catch {
      setStreamers([]);
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
  }, [streamers, navigate, addToast]);

  const handleInAppSecondaryAction = useCallback(async (n: InAppNotification) => {
    if (n.type !== 'pk_invite') return;
    const d = n.data || {};
    try {
      await api.respondToLiveInvite(d.inviteId, 'declined');
      addToast(ToastType.Info, 'Convite recusado.');
    } catch (err) {
      console.error('[PK-INVITE] Erro ao recusar:', err);
    }
  }, [addToast]);

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

    

    setIsEnteringStream(true);

    try {

      if (streamer.isPrivate && streamer.hostId !== currentUser.id) {

        try {

          const access = await api.checkPrivateStreamAccess(streamer.id, currentUser.id);

          if (!access?.canJoin) {

            addToast(ToastType.Error, access?.reason || "Você não tem permissão para entrar nesta sala privada.");

            setIsEnteringStream(false);

            return;

          }

        } catch (err) {

          addToast(ToastType.Error, "Falha ao verificar permissão de acesso.");

          setIsEnteringStream(false);

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

    } catch (error) {

      addToast(ToastType.Error, "Falha ao carregar dados da live.");

    } finally {

      setIsEnteringStream(false);

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

        setLiveSession(null);

        navigate('/');

        return;

      }

      

      const endTime = Date.now();

      const historyEntry: StreamHistoryEntry = {

        id: `hist_stream-${activeStream.id}_${endTime}_${Math.random().toString(36).slice(2)}`,

        streamerId: activeStream.hostId,

        name: activeStream.name,

        avatar: activeStream.avatar,

        startTime: liveSession.startTime,

        endTime: endTime,

      };

      setStreamHistory(prev => [historyEntry, ...prev]);



      // Prepare summary data

      const summary: EndStreamSummary = {

        streamId: activeStream.id,

        title: activeStream.name,

        startTime: liveSession.startTime,

        endTime: endTime,

        duration: Math.floor((endTime - liveSession.startTime) / 1000), // Converter para segundos

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
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/');

    }

    // 🔧 Fallback incondicional: sempre limpar estado e navegar, mesmo se activeStream/liveSession for null
    // Garante que o usuário nunca fique preso na tela de stream morta
    setActiveStream(null);
    setIsPKBattleActive(false);
    setPkOpponent(null);
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



  const handleEndPKBattle = () => {

    if (!activeStream) return;

    addToast(ToastType.Info, "Batalha PK encerrada.");

    setIsPKBattleActive(false);

    setPkOpponent(null);

  };



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

    // Se for o próprio usuário, buscar dados frescos do servidor

    if (user.id === currentUser?.id) {

      try {

        const freshUser = await api.getUser(currentUser.id);

        if (freshUser) {

          setViewingProfile(freshUser);

          return;

        }

      } catch (_) { /* se falhar, usa os dados atuais */ }

    }

    

    // Para outros usuários ou se falhar o fetch, usa dados disponíveis

    const fullUserFromState = allUsers.find(u => u.id === user.id);

    const userToView = user.id === currentUser?.id ? currentUser : (fullUserFromState || user);

    if (currentUser && userToView.id !== currentUser.id) {
      api.recordVisit(userToView.id, currentUser.id).catch(err => {
        console.error('[API] Erro ao registrar visita no perfil:', err);
      });
    }

    setViewingProfile(userToView);

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

        const isNowFollowing = !userToFollow.isFollowed;

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



  const handleConfirmPurchase = async (pkg: PurchasePackage) => {

    if (!currentUser) return;

    try {
      // Chamar API real para processar compra
      const response = await api.confirmPurchase(String(pkg.diamonds));
      
      if (response && response.success && response.user) {
        updateUserEverywhere(response.user);
        
        setPaymentSuccessData({
          price: pkg.price,
          diamonds: pkg.diamonds,
          method: 'pix',
          currency: pkg.currency,
          timestamp: new Date()
        });

        setIsConfirmingPurchase(false);
        setIsPaymentSuccessOpen(true);
        setSelectedPackage(null);
      } else {
        addToast(ToastType.Error, 'Erro ao processar compra');
      }
    } catch (error) {
      console.error('[PURCHASE] Erro ao confirmar compra:', error);
      addToast(ToastType.Error, 'Erro ao processar compra');
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



  const handleOpenListScreen = (listType: 'following' | 'fans' | 'visitors' | 'topFans' | 'blockList') => {

    if (!currentUser) return;



    let users: User[] = [];

    switch (listType) {

      case 'following':

        users = followingUsers;

        break;

      case 'fans':

        users = fans;

        break;

      case 'visitors':

        users = visitors;

        break;

      case 'topFans':

        users = fans.slice(0, 10);

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
  }, []);



  // Mostrar loading enquanto restaura sessão
  if (isLoadingCurrentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  if (!currentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;



  return (
    <div className={`app-container bg-black text-white font-sans ${((activeStream && streamRoomData) || chattingWith) && currentUser ? 'live-fixed' : ''}`}>


      {/* PK Invite Pop-up Modal */}
      {activePKInvite && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[99999999] flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-white/[0.08] w-full max-w-[340px] rounded-3xl p-6 relative flex flex-col items-center justify-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 select-none">
            {/* Pulsing halo */}
            <div className="absolute top-10 w-[120px] h-[120px] rounded-full bg-[#FF2D55] opacity-20 filter blur-2xl animate-pulse"></div>

            {/* Glowing Shield circular container */}
            <div className="relative w-[84px] h-[84px] rounded-full bg-gradient-to-tr from-[#FF2D55] to-purple-600 p-[2px] flex items-center justify-center shadow-[0_0_25px_rgba(255,45,85,0.4)] mb-5">
              <div className="w-full h-full rounded-full bg-black p-[2px] flex items-center justify-center">
                {activePKInvite.inviterAvatar ? (
                  <img src={activePKInvite.inviterAvatar} alt={activePKInvite.inviterName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-white text-3xl font-extrabold uppercase">
                    ⚔️
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#FF2D55] text-white p-1 rounded-full text-xs font-bold leading-none animate-bounce">
                ⚔️
              </div>
            </div>

            <h3 className="text-[19px] font-bold text-center text-white tracking-tight leading-snug">
              Desafio de PK!
            </h3>
            
            <p className="text-[14px] text-gray-400 text-center mt-2.5 mb-6 max-w-[280px] leading-relaxed">
              O streamer <span className="text-white font-semibold">@{activePKInvite.inviterName || activePKInvite.inviter_name}</span> desafiou você para uma batalha PK de <span className="text-white font-semibold flex-row inline-flex items-center">5 minutos</span>! Deseja aceitar o desafio?
            </p>

            <div className="flex flex-col space-y-2.5 w-full">
              <button
                onClick={async () => {
                  try {
                    addToast(ToastType.Info, "Aceitando convite da batalha PK...");
                    await api.respondToPKInvite(activePKInvite.id || activePKInvite.invite_id, 'accepted');
                    
                    const opponentUser = streamers.find((s: any) => s.id === activePKInvite.inviterId || s.id === activePKInvite.inviter_id) || 
                                         listScreenUsers.find((u: any) => u.id === activePKInvite.inviterId || u.id === activePKInvite.inviter_id);
                                         
                    if (opponentUser) {
                      setPkOpponent(opponentUser as unknown as User);
                      setIsPKBattleActive(true);
                      if (!activeStream) {
                        handleSelectStream(opponentUser as Streamer);
                      }
                    } else {
                      // Buscar usuário real da API
                      const opponentId = activePKInvite.inviterId || activePKInvite.inviter_id;
                      if (opponentId) {
                        try {
                          const realOpponent = await api.getUser(opponentId);
                          if (realOpponent) {
                            setPkOpponent(realOpponent);
                            setIsPKBattleActive(true);
                            if (!activeStream) {
                              const opponentStream = streamers.find(s => s.hostId === realOpponent.id);
                              if (opponentStream) {
                                handleSelectStream(opponentStream);
                              }
                            }
                          } else {
                            addToast(ToastType.Error, 'Oponente não encontrado');
                          }
                        } catch (err) {
                          console.error('[PK] Erro ao buscar oponente da API:', err);
                          addToast(ToastType.Error, 'Erro ao carregar dados do oponente');
                        }
                      } else {
                        addToast(ToastType.Error, 'ID do oponente inválido');
                      }
                    }
                    setActivePKInvite(null);
                  } catch (err) {
                    addToast(ToastType.Error, "Falha ao aceitar desafio.");
                    console.error(err);
                  }
                }}
                className="w-full py-3 bg-[#FF2D55] text-white text-[15px] font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-[#E02447] shadow-lg shadow-[#FF2D55]/20 hover:cursor-pointer"
              >
                Aceitar Desafio
              </button>

              <button
                onClick={async () => {
                  try {
                    addToast(ToastType.Info, "Recusando convite...");
                    await api.respondToPKInvite(activePKInvite.id || activePKInvite.invite_id, 'declined');
                    setActivePKInvite(null);
                  } catch (err) {
                    console.error(err);
                    setActivePKInvite(null);
                  }
                }}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700/80 text-gray-300 text-[15px] font-bold rounded-xl active:scale-[0.98] transition-all hover:cursor-pointer"
              >
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatScreen com prioridade absoluta - sobre todas as outras telas */}

      {chattingWith && currentUser && (

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

      )}



      {(isEnteringStream) && (

        <div className="absolute inset-0 bg-black/80 z-[9999] flex items-center justify-center">

          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500"></div>

        </div>

      )}



      {activeStream && streamRoomData && currentUser ? (

        isPKBattleActive && pkOpponent ? (

          <PKBattleScreen

            streamer={activeStream}

            opponent={pkOpponent}

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

            setActiveScreen={handleNavigation} // Mantido para compatibilidade, mas agora usa navigate

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

        ) : (

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

            setActiveScreen={handleNavigation} // Mantido para compatibilidade, mas agora usa navigate

            onStreamUpdate={handleStreamUpdate}

            refreshStreamRoomData={refreshStreamRoomData}

            addToast={addToast}

            onLeaveStreamView={handleLeaveStreamView}

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

        )

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
                  onOpenFriendRequests={() => setIsFriendRequestsScreenOpen(true)}
                  fans={fans}
                  followingUsers={followingUsers}
                  liveStreamers={streamers}
                  onSelectStreamer={handleSelectStream}
                  onOpenLive={handleOpenUserLive}
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
                />
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

      {viewingProfile && <UserProfileScreen user={viewingProfile} isCurrentUser={viewingProfile.id === currentUser?.id} onBack={() => setViewingProfile(null)} onEdit={handleEditProfile} onOpenTopFans={() => { setViewingProfile(null); handleOpenListScreen('topFans'); }} onOpenFollowing={() => { setViewingProfile(null); handleOpenListScreen('following'); }} onOpenFans={() => { setViewingProfile(null); handleOpenListScreen('fans'); }} onFollow={handleFollowUser} onStartChat={handleStartChat} onBlockUser={handleBlockUser} onReportUser={handleReportUser} onOpenPhotoViewer={(photos, index) => setPhotoViewerData({ photos, initialIndex: index })} lastPhotoLikeUpdate={lastPhotoLikeUpdate} onPhotoLiked={() => setLastPhotoLikeUpdate(Date.now())} onPhotoRemoved={(u) => { updateUserEverywhere(u); setViewingProfile(u); }} onOpenLive={handleOpenUserLive} />}

      {isEditingProfile && <EditProfileScreen user={currentUser} onBack={() => setIsEditingProfile(false)} onSave={handleSaveProfile} />}

      {isWalletScreenOpen && <WalletScreen onClose={() => setIsWalletScreenOpen(false)} onPurchase={handlePurchase} initialTab={walletInitialTab} isBroadcaster={true} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} purchaseHistory={purchaseHistory} />}

      {isConfirmingPurchase && selectedPackage && <ConfirmPurchaseScreen onClose={() => setIsConfirmingPurchase(false)} packageDetails={selectedPackage} onConfirmPurchase={handleConfirmPurchase} addToast={addToast} currentUser={currentUser} />}

      {isCadastralScreenOpen && pendingPurchase && currentUser && <CadastralDataScreen onClose={() => { setIsCadastralScreenOpen(false); setPendingPurchase(null); }} onSaved={handleCadastralSaved} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />}

      {isFollowingScreenOpen && <FollowingScreen onBack={() => setIsFollowingScreenOpen(false)} onViewProfile={handleViewProfile} onOpenLive={handleOpenUserLive} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFansScreenOpen && <FansScreen onBack={() => setIsFansScreenOpen(false)} onViewProfile={handleViewProfile} onOpenLive={handleOpenUserLive} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFriendRequestsScreenOpen && <FriendRequestsScreen onBack={() => setIsFriendRequestsScreenOpen(false)} onViewProfile={handleViewProfile} users={(followingUsers || []).filter(followed => followed && (fans || []).some(fan => fan && fan.id === followed.id))} onFollowUser={handleFollowUser} />}

      {isVisitorsScreenOpen && <VisitorsScreen onBack={() => setIsVisitorsScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} addToast={addToast} />}

      {isTopFansScreenOpen && <TopFansScreen onBack={() => setIsTopFansScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} />}

      {isMyLevelScreenOpen && <MyLevelScreen onClose={() => setIsMyLevelScreenOpen(false)} currentUser={currentUser} />}

      {isBlockListScreenOpen && <BlockListScreen onClose={() => setIsBlockListScreenOpen(false)} onUnblockUser={handleUnblockUser} onViewProfile={handleViewProfile} />}

      {isAvatarProtectionScreenOpen && <AvatarProtectionScreen onClose={() => setIsAvatarProtectionScreenOpen(false)} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />}

      {isMarketScreenOpen && currentUser && <MarketScreen onClose={() => setIsMarketScreenOpen(false)} user={currentUser} updateUser={updateUserEverywhere} onPurchaseFrame={handlePurchaseFrame} addToast={addToast} onOpenWallet={(initialTab) => handleNavigation('wallet')} />}

      {isFAQScreenOpen && <FAQScreen onClose={() => setIsFAQScreenOpen(false)} />}

      {isSettingsScreenOpen && <SettingsScreen onClose={() => setIsSettingsScreenOpen(false)} currentUser={currentUser} gifts={allGifts} updateUser={updateUserEverywhere} addToast={addToast} onOpenPipModal={() => setIsPipSettingsModalOpen(true)} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />}

      {isGiftAdminOpen && <GiftAdminPanel onClose={() => setIsGiftAdminOpen(false)} />}

      <PipSettingsModal isOpen={isPipSettingsModalOpen} onClose={() => setIsPipSettingsModalOpen(false)} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />

      <LanguageSelectionModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} currentLanguage={language} onSave={(lang) => { setLanguage(lang); setIsLanguageModalOpen(false); }} />

      {isSearchScreenOpen && <SearchScreen onClose={() => setIsSearchScreenOpen(false)} onViewProfile={handleViewProfile} allUsers={allUsers} onFollowUser={handleFollowUser} />}

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

      

      {/* Notificações de mensagens */}

      {messageNotifications.map((notification) => (

        <MessageNotification

          key={notification.id}

          message={notification}

          onClose={() => {

            setMessageNotifications(prev => prev.filter(n => n.id !== notification.id));

          }}

        />

      ))}

      

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

      <div className="absolute top-4 right-4 left-4 sm:left-auto space-y-2 z-[9999] pointer-events-none">

        {toasts.map(toast => (

          <div key={toast.id} className="pointer-events-auto">

            <Toast data={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />

          </div>

        ))}

      </div>

    </div>

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



