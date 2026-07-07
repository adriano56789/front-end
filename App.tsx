

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

// Adicionar tratamento de erros globais para extensões (fora do ErrorBoundary)
window.addEventListener('error', (event) => {
  // Ignorar erros de extensões de navegador
  if (event.filename && (event.filename.includes('content.js') || event.filename.includes('polyfill.js'))) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Ignorar rejeições de extensões
  if (event.reason && typeof event.reason === 'string' && 
      (event.reason.includes('useCache') || event.reason.includes('Receiving end does not exist'))) {
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

import { ToastType, ToastData, Streamer, User, Gift, StreamSummaryData, LiveSessionState, RankedUser, Conversation, Country, NotificationSettings, BeautySettings, FeedPhoto, StreamHistoryEntry, Visitor, PurchaseRecord, Message, EndStreamSummary } from './types';

import Toast from './components/Toast';

import MessageNotification from './components/MessageNotification';

import { socketService } from './services/socket';

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

import SearchScreen from './components/SearchScreen';

import CameraPermissionModal from './components/CameraPermissionModal';

import LocationPermissionModal from './components/LocationPermissionModal';

import EndStreamConfirmationModal from './components/live/EndStreamConfirmationModal';

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

import LiveHistoryScreen from './components/LiveHistoryScreen';

import LanguageSelectionModal from './components/settings/LanguageSelectionModal';

import VIPCenterScreen from './components/VIPCenterScreen';

import PaymentSuccessScreen from './components/PaymentSuccessScreen';

import LiveNotificationModal from './components/live/LiveNotificationModal';

import { api } from './services/api';



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

};



// Event emitter simples para navegação

class SimpleEventEmitter {

  private events: Map<string, Function[]> = new Map();



  on(event: string, listener: Function) {

    if (!this.events.has(event)) {

      this.events.set(event, []);

    }

    this.events.get(event)!.push(listener);

  }



  off(event: string, listener: Function) {

    if (this.events.has(event)) {

      const listeners = this.events.get(event)!.filter(l => l !== listener);

      this.events.set(event, listeners);

    }

  }



  emit(event: string, payload: any) {

    if (this.events.has(event)) {

      this.events.get(event)!.forEach(listener => listener(payload));

    }

  }



  connect() { /* No-op */ }

  disconnect() { /* No-op */ }

}



const simpleEventManager = new SimpleEventEmitter();



interface StreamRoomData {

  gifts: Gift[];

  receivedGifts: (Gift & { count: number })[];

}



interface PaymentSuccessData {

  price: number;

  diamonds: number;

  method?: 'pix' | 'credit_card';

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

  const [permissionStep, setPermissionStep] = useState<'idle' | 'camera' | 'microphone'>('idle');

  const [isLocationPermissionModalOpen, setIsLocationPermissionModalOpen] = useState(false);

  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const [showLocationBanner, setShowLocationBanner] = useState(false);

  const [toasts, setToasts] = useState<ToastData[]>([]);

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

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  const [isWalletScreenOpen, setIsWalletScreenOpen] = useState<boolean>(false);

  const [walletInitialTab, setWalletInitialTab] = useState<'Diamante' | 'Ganhos'>('Diamante');

  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState<boolean>(false);

  const [selectedPackage, setSelectedPackage] = useState<{ diamonds: number; price: number; } | null>(null);

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



  // Dados críticos devem vir sempre da API - não usar estado estático

  const [streamers, setStreamers] = useState<Streamer[]>([]);

  const [isLoadingStreamers, setIsLoadingStreamers] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [friends, setFriends] = useState<User[]>([]);

  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  const [fans, setFans] = useState<User[]>([]);

  const [allGifts, setAllGifts] = useState<Gift[]>([]);

  const [reminderStreamers, setReminderStreamers] = useState<Streamer[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<string>('ICON_GLOBE');

  const [activeCategory, setActiveCategory] = useState('popular');

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

  // Adiciona a conversa vazia na lista de conversas imediatamente ao iniciar um chat
  useEffect(() => {
    if (!chattingWith || !currentUser || chattingWith.id === currentUser.id) return;
    
    setConversations(prev => {
      const exists = prev.some(c => c.friend && c.friend.id === chattingWith.id);
      if (exists) return prev;
      
      const newEmptyConvo: Conversation = {
        id: `chat_private_${currentUser.id < chattingWith.id ? currentUser.id + '_' + chattingWith.id : chattingWith.id + '_' + currentUser.id}`,
        friend: chattingWith,
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unreadCount: 0
      };
      return [newEmptyConvo, ...prev];
    });
    
    // Dispara chamada assíncrona ao backend para registrar de forma persistente a conversa
    (api.getChatMessages(chattingWith.id) as any).catch?.(() => {});
  }, [chattingWith?.id, currentUser?.id]);

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

        // Tentar buscar usuário atual da API

        const user = await api.getCurrentUser();

        if (user) {

          setCurrentUser(user);
          (window as any).currentUser = user;

          setIsAuthenticated(true);

        } else {

          setIsAuthenticated(false);

          setCurrentUser(null);

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



    const handleVisibilityChange = () => {
      // Não fazer nada quando aba fica oculta - usuário ainda está online
      // Apenas atualizar quando volta para online
      if (!document.hidden && isAuthenticated && currentUser?.id) {
        setUserOnline();
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



  // Carregar dados da API na inicialização (Streams, Países, Gifts)
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const loadInitialData = async () => {
      setIsLoadingStreamers(true);
      try {
        console.log('📦 [App] Carregando dados iniciais...');

        // Carregar dados em paralelo para maior performance
        const [streams, countries, gifts] = await Promise.all([
          api.getLiveStreamers('popular'),
          api.getRegions(),
          api.getGifts()
        ]);

        setStreamers(Array.isArray(streams) ? streams : []);
        setCountries(countries);
        setAllGifts(enrichGiftsWithComponents(gifts));

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

  // Auto-load stream from URL /live/:streamId
  useEffect(() => {
    if (!isAuthenticated) return;
    const match = location.pathname.match(/^\/live\/(.+)$/);
    if (!match || activeStream) return;
    const streamId = decodeURIComponent(match[1]);
    const found = streamers.find(s => s.id === streamId);
    if (found) {
      handleSelectStream(found);
      return;
    }
    // If not in local list, fetch from API
    (async () => {
      try {
        const data = await api.getLiveDetails(streamId);
        if (data) handleSelectStream(data);
      } catch {
        // Stream not found, stay on page
      }
    })();
  }, [location.pathname, isAuthenticated]);



  // Carregar gifts da API

  useEffect(() => {

    const loadGifts = async () => {

      try {

        const gifts = await api.getGifts();

        setAllGifts(enrichGiftsWithComponents(gifts));

      } catch (error) {

      }

    };



    loadGifts();

  }, []);



  // Carregar dados do usuário logado (conversas, amigos, fãs, seguindo)

  useEffect(() => {

    if (!currentUser?.id) return;



    const loadUserData = async () => {

      try {

        const [convs, friendList] = await Promise.allSettled([

          api.getConversations(currentUser.id),

          api.getFriends(currentUser.id),

        ]);



        if (convs.status === 'fulfilled' && Array.isArray(convs.value)) {

          setConversations(convs.value);

        }

        if (friendList.status === 'fulfilled' && Array.isArray(friendList.value)) {

          setFriends(friendList.value);

        }

        
      } catch (error) {

      }

    };



    loadUserData();

  }, [currentUser?.id]);



  // Listener para notificações de novas mensagens

  useEffect(() => {

    const handleNewMessage = (event: CustomEvent) => {

      const message = event.detail;

      

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
            setPkOpponent(opponentUser);
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
    };
  }, [currentUser, activeStream, streamers]);

  const [rankingData, setRankingData] = useState<Record<string, RankedUser[]>>(INITIAL_DATA.rankingData);

  const [listScreenUsers, setListScreenUsers] = useState<User[]>([]);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(INITIAL_DATA.notificationSettings);

  const [lastPhotoLikeUpdate, setLastPhotoLikeUpdate] = useState<number>(0);

  // Refs para evitar loops no useEffect dos sockets
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const [streamHistory, setStreamHistory] = useState<StreamHistoryEntry[]>(INITIAL_DATA.streamHistory);

  const [visitors, setVisitors] = useState<Visitor[]>(INITIAL_DATA.visitors);

  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>(INITIAL_DATA.purchaseHistory);



  const { t, language, setLanguage } = useTranslation();



  // Calculate total unread messages for footer badge

  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);



  const addToast = useCallback((type: ToastType, message: string) => {

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => [...prev, { id, type, message }]);

    setTimeout(() => {

      setToasts(prev => prev.filter(t => t.id !== id));

    }, 3000);

  }, []);

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
      const profileFields: (keyof User)[] = ['name', 'displayName', 'avatarUrl', 'coverUrl', 'bio', 'gender', 'birthday', 'residence', 'profession', 'emotional_status', 'tags', 'city', 'state', 'country', 'age', 'isAvatarProtected', 'chatPermission', 'pipEnabled', 'locationPermission', 'showActivityStatus', 'showLocation', 'privateStreamSettings', 'activeFrameId', 'obras'];
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



  const handleLeaveStreamView = useCallback(() => {

    setActiveStream(null);

    setIsPKBattleActive(false);

    setPkOpponent(null);

    setLiveSession(null);

    setStreamRoomData(null);

    navigate('/');

  }, [activeStream, navigate]);



  const handleLogout = async () => {

    simpleEventManager.disconnect();

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



  // WebSocket events simplificados

  useEffect(() => {

    const handleKicked = (payload: { roomId: string }) => {

      if (activeStream?.id === payload.roomId) {

        handleLeaveStreamView();

        addToast(ToastType.Error, "Você foi expulso desta sala e não pode mais entrar.");

      }

    };

    const handleJoinDenied = (payload: { roomId: string }) => {

      addToast(ToastType.Error, "Você foi expulso desta sala e não pode mais entrar.");

    };

    simpleEventManager.on('kicked', handleKicked);

    simpleEventManager.on('joinDenied', handleJoinDenied);

    return () => {

      simpleEventManager.off('kicked', handleKicked);

      simpleEventManager.off('joinDenied', handleJoinDenied);

    };

  }, [activeStream, addToast, handleLeaveStreamView]);



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



    simpleEventManager.on('streamerLive', handleStreamerLive);

    simpleEventManager.on('privateStreamInvite', handlePrivateInvite);



    return () => {

      simpleEventManager.off('streamerLive', handleStreamerLive);

      simpleEventManager.off('privateStreamInvite', handlePrivateInvite);

    };

  }, [addToast, notificationSettings, allUsers, updateUserEverywhere]);



  // Removido - dados estáticos já inicializados



  // Removido - dados estáticos já inicializados



  // Removido - dados estáticos já inicializados



  // Conectar ao WebSocket para atualizações de presença

  useEffect(() => {

    if (currentUserRef.current) {

      // Socket conectado globalmente para receber atualizações de presença e novos eventos de transmissão em tempo real
      socketService.connect();

      if (currentUserRef.current?.id) {
        socketService.joinRoom(currentUserRef.current.id);
      }

      // Inicializar Firebase Cloud Messaging para notificações push
      if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js').then(() => {
          console.log('[FCM] Service Worker registrado');
        }).catch((err) => {
          console.warn('[FCM] Erro ao registrar Service Worker:', err);
        });
        import('./services/notificationService').then(({ initNotifications }) => {
          initNotifications(currentUserRef.current.id);
        });
        import('./services/firebase').then(({ onForegroundMessage }) => {
          onForegroundMessage((payload) => {
            const title = payload.notification?.title || payload.data?.title || 'Nova notificação';
            const body = payload.notification?.body || payload.data?.body || '';
            const type = payload.data?.type;
            if (type === 'new_message') {
              addToast(ToastType.Info, `${title}: ${body}`);
            } else if (type === 'live_started') {
              addToast(ToastType.Info, `🔴 ${title} está ao vivo!`);
            } else if (body) {
              addToast(ToastType.Info, `${title}: ${body}`);
            }
          });
        });
      }



      // Escutar atualizações de presença

      socketService.on('user_status_updated', (data: { userId: string; isOnline: boolean }) => {

        if (data.userId === currentUserRef.current.id) {

          const updatedUser = { ...currentUserRef.current, isOnline: data.isOnline };

          updateUserEverywhere(updatedUser);

        }

      });



      // Avatar atualizado - sincronizar em tempo real em todo o app

      socketService.on('avatar_updated', (data: { userId: string; avatarUrl: string }) => {

        if (data.userId === currentUserRef.current.id) {

          const updatedUser = { ...currentUserRef.current, avatarUrl: data.avatarUrl };

          updateUserEverywhere(updatedUser);

        }

      });



      // Escutar atualizações de diamantes em tempo real (remetente de presente)

      socketService.on('diamonds_updated', (data: { userId: string; diamonds: number; enviados?: number; change: number; timestamp: string; source?: string }) => {

        

        if (data.userId === currentUserRef.current.id) {

          // 🔧 SINCRONIZAÇÃO: Atualiza diamonds E enviados do remetente com dados reais da API

          const updatedUser: any = { ...currentUserRef.current, diamonds: data.diamonds };

          if (data.enviados !== undefined) {

            updatedUser.enviados = data.enviados;

          }

          updateUserEverywhere(updatedUser);

          

          // Atualizar contador da live se estiver em transmissão como host

          if (liveSession && activeStream && activeStream.hostId === data.userId) {

            updateLiveSession({ coins: data.diamonds });

          }

        }

      });



      // Escutar atualizações de earnings em tempo real (receptor de presente)

      socketService.on('earnings_updated', (data: { userId: string; diamonds: number; totalEarnings: number; totalReceptores?: number; timestamp: string; source: string }) => {

        

        if (data.userId === currentUserRef.current.id) {

          // 🔧 SINCRONIZAÇÃO: Atualiza earnings e receptores com dados reais do banco de dados

          const updatedUser: any = { 

            ...currentUser, 

            earnings: data.totalEarnings

          };

          // totalReceptores vem do banco de dados real (campo receptores do usuário)

          if (data.totalReceptores !== undefined) {

            updatedUser.receptores = data.totalReceptores;

          }

          

          updateUserEverywhere(updatedUser);

        }

      });



      // 🔧 SINCRONIZAÇÃO: Escutar atualizações de saque em tempo real

      // Quando um saque é realizado, diamonds, receptores e streamDiamonds devem ser zerados

      socketService.on('earnings_withdrawn', (data: { userId: string; amount: number; newEarnings: number; diamonds?: number; receptores?: number; streamDiamonds?: number; timestamp: string }) => {

        

        if (data.userId === currentUserRef.current.id) {

          // Atualizar usuário com dados completos do saque

          const updatedUser = { 

            ...currentUser, 

            earnings: data.newEarnings,

            diamonds: data.diamonds || 0, // Zerar carteira

            receptores: data.receptores || 0 // Zerar receptores

          };

          updateUserEverywhere(updatedUser);

          

          // Atualizar contador da live se estiver em transmissão como host

          if (liveSession && activeStream && activeStream.hostId === data.userId) {

            updateLiveSession({ coins: data.streamDiamonds || 0 });

          }

        }

      });



      // 🔧 SINCRONIZAÇÃO: Escutar atualizações da carteira ADM em tempo real

      // Quando um saque é feito, a taxa de 20% vai para a carteira ADM

      socketService.on('platform_earnings_updated', (data: { userId: string; added_fee: number; total_platform_earnings: number; from_user?: string; timestamp: string }) => {

        if (data.userId === currentUserRef.current.id) {

          // Atualizar platformEarnings do usuário ADM com dados reais do banco

          const updatedUser = { ...currentUserRef.current, platformEarnings: data.total_platform_earnings };

          updateUserEverywhere(updatedUser);

        }

      });



      // 🔧 SINCRONIZAÇÃO: Escutar atualizações de moedas da live em tempo real

      // O contador de moedas deve refletir o banco de dados real (Streamer.diamonds)

      socketService.on('live_coins_updated', (data: { streamId: string; coins: number; totalCoins: number; timestamp: string; fromUser?: string; giftName?: string }) => {

        if (activeStream && activeStream.id === data.streamId && liveSession) {

          // Usar totalCoins (valor real do banco) para garantir sincronização

          updateLiveSession({ coins: data.totalCoins });

        }

      });



      // 🚀 Escutar quando lives são encerradas para remover cards em tempo real

      socketService.onStreamEnded((data: { streamId: string; hostId: string; timestamp: string }) => {



        // Remover o card da lista de streamers

        setStreamers(prev => (Array.isArray(prev) ? prev.filter(streamer => streamer.id !== data.streamId) : []));



        // Se o usuário está assistindo esta live, redirecionar para tela principal

        if (activeStream && activeStream.id === data.streamId) {

          setActiveStream(null);

          setLiveSession(null);

          setStreamRoomData(null);

          setIsPKBattleActive(false);

          setPkOpponent(null);



          addToast(ToastType.Info, 'Esta transmissão foi encerrada');

          navigate('/');

        }

      });



      // Escutar se o usuário atual precisa sair de uma live encerrada

      socketService.onLiveStreamEnded((data: { streamId: string; message: string; timestamp: string }) => {



        // Se o usuário está assistindo esta live, redirecionar

        if (activeStream && activeStream.id === data.streamId) {

          setActiveStream(null);

          setLiveSession(null);

          setStreamRoomData(null);

          setIsPKBattleActive(false);

          setPkOpponent(null);



          addToast(ToastType.Info, data.message);

          navigate('/');

        }

      });



      // Escutar novas lives em tempo real

      socketService.on('new_live', (data: { id: string; hostId: string; name: string; avatar: string; isLive: boolean; streamStatus: string; country: string; viewers: number; }) => {

        console.log('[new_live] Nova live recebida:', data.id, data.name);

        setStreamers(prev => {

          const list = Array.isArray(prev) ? prev : [];
          if (list.some(s => s.id === data.id)) {
            return list.map(s => s.id === data.id ? { ...s, ...data, isLive: true } : s);
          }

          return [data, ...list] as any;

        });

      });



      // Escutar novas lives via evento stream_started em tempo real

      socketService.onStreamStarted((data: any) => {

        console.log('[stream_started] Nova live recebida:', data.id, data.name);

        setStreamers(prev => {

          const list = Array.isArray(prev) ? prev : [];
          if (list.some(s => s.id === data.id)) {
            return list.map(s => s.id === data.id ? { ...s, ...data, isLive: true } : s);
          }

          return [data, ...list];

        });

      });



      // Escutar quando cards são removidos

      socketService.on('card_removed', (data: { streamId: string; hostId: string; timestamp: string }) => {



        // Remover o card da lista de streamers

        setStreamers(prev => (Array.isArray(prev) ? prev.filter(streamer => streamer.id !== data.streamId) : []));



        // Se o usuário está assistindo esta live, redirecionar para tela principal

        if (activeStream && activeStream.id === data.streamId) {

          setActiveStream(null);

          setLiveSession(null);

          setStreamRoomData(null);

          setIsPKBattleActive(false);

          setPkOpponent(null);



          addToast(ToastType.Info, 'Esta transmissão foi encerrada');

          navigate('/');

        }

      });



      // Escutar quando cards são removidos via evento stream_stopped em tempo real

      socketService.onStreamStopped((data: { streamId: string; hostId?: string; timestamp?: string }) => {



        // Remover o card da lista de streamers

        setStreamers(prev => (Array.isArray(prev) ? prev.filter(streamer => streamer.id !== data.streamId) : []));



        // Se o usuário está assistindo esta live, redirecionar para tela principal

        if (activeStream && activeStream.id === data.streamId) {

          setActiveStream(null);

          setLiveSession(null);

          setStreamRoomData(null);

          setIsPKBattleActive(false);

          setPkOpponent(null);



          addToast(ToastType.Info, 'Esta transmissão foi encerrada');

          navigate('/');

        }

      });

    }



    return () => {

      socketService.off('user_status_updated');

      socketService.off('avatar_updated');

      socketService.off('diamonds_updated');

      socketService.off('earnings_updated');

      socketService.off('platform_earnings_updated');

      socketService.off('live_coins_updated');

      socketService.off('new_live');

      socketService.off('stream_started');

      socketService.off('stream_stopped');

      socketService.off('stream_ended');

      socketService.off('live_stream_ended');

      socketService.off('stream_ended');

      socketService.off('card_removed');

    };

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



      // If we are currently chatting with this user, we assume it's read immediately by ChatScreen component

      if (chattingWith && chattingWith.id === message.from) {

        return;

      }



      // Otherwise, update the conversation list to increment badge

      setConversations(prevConversations => {

        const index = prevConversations.findIndex(c => c.friend.id === message.from);



        if (index > -1) {

          const updated = [...prevConversations];

          const oldConv = updated[index];

          updated[index] = {

            ...oldConv,

            lastMessage: message.text || (message.imageUrl ? 'Imagem' : ''),

            timestamp: message.timestamp,

            unreadCount: (oldConv.unreadCount || 0) + 1

          };

          // Move to top

          updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return updated;

        } else {

          // Para dados estáticos, apenas retorna o estado anterior

          return prevConversations;

        }

      });

    };



    simpleEventManager.on('followUpdate', handleFollowUpdate);

    simpleEventManager.on('newFollower', handleNewFollower);

    simpleEventManager.on('micStateUpdate', handleMicStateUpdate);

    simpleEventManager.on('soundStateUpdate', handleSoundStateUpdate);

    simpleEventManager.on('userUpdate', handleUserUpdate);

    simpleEventManager.on('transactionUpdate', handleTransactionUpdate);

    simpleEventManager.on('newMessage', handleNewMessage);



    return () => {

      simpleEventManager.off('followUpdate', handleFollowUpdate);

      simpleEventManager.off('newFollower', handleNewFollower);

      simpleEventManager.off('micStateUpdate', handleMicStateUpdate);

      simpleEventManager.off('soundStateUpdate', handleSoundStateUpdate);

      simpleEventManager.off('userUpdate', handleUserUpdate);

      simpleEventManager.off('transactionUpdate', handleTransactionUpdate);

      simpleEventManager.off('newMessage', handleNewMessage);

    };

  }, [currentUser, updateUserEverywhere, activeStream, updateLiveSession, addToast, chattingWith]);



  const startLiveSession = async (streamer: Streamer) => {

    try {

      // 🔧 SINCRONIZAÇÃO: Buscar dados reais da stream da API (diamonds acumulados)

      // O contador de moedas deve refletir o banco de dados, nunca estado temporário

      let streamDiamonds = streamer.diamonds || 0;

      let streamViewers = streamer.viewers || 1;

      try {

        const streamDetails = await api.getLiveDetails(streamer.id);

        if (streamDetails) {

          streamDiamonds = (streamDetails as any).diamonds || 0;

          streamViewers = (streamDetails as any).viewers || 1;

        }

      } catch {

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

        viewers: streamer.viewers || 1,

        peakViewers: streamer.viewers || 1,

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

    setSelectedCountry(countryCode);

    setIsRegionModalOpen(false);



    // Se não for Global, buscar streams da região

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

      const streams = await api.getLiveStreamers('popular');
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

        const streams = await api.getLiveStreamers(tab);
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
      let finalCountry = ipLoc.country;
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

      console.log('🌍 [LOCATION] Salvando localização na API:', finalLat, finalLng, finalCity, finalState);
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



  const checkMicrophonePermission = async () => {
    setPermissionStep('microphone');
    // A navegação já foi feita ou será feita pelo chamador
  };



  const checkCameraPermission = async () => {
    setPermissionStep('camera');
  };



  const handleOpenGoLive = async () => {
    // Iniciamos o fluxo de permissões primeiro na tela atual (ex: MainScreen)
    await checkCameraPermission();
  };



  const handlePermissionAllow = async () => {

    if (permissionStep === 'camera') {

      try {

        await navigator.mediaDevices.getUserMedia({ video: true });

        await checkMicrophonePermission();

      } catch (err) {

        addToast(ToastType.Error, t('toasts.permissionsNeeded'));

        setPermissionStep('idle');

      }

    } else if (permissionStep === 'microphone') {

      try {

        await navigator.mediaDevices.getUserMedia({ audio: true });

        navigate('/golive');

        setPermissionStep('idle');

      } catch (err) {

        addToast(ToastType.Error, t('toasts.permissionsNeeded'));

        setPermissionStep('idle');

      }

    }

  };



  const handlePermissionDeny = async () => {

    addToast(ToastType.Error, t('toasts.permissionsNeeded'));

    setPermissionStep('idle');

  };



  const handleSelectStream = async (streamer: Streamer) => {

    if (!currentUser) return;

    

    // Validate that streamer.id is a string

    if (typeof streamer.id !== 'string' || streamer.id === '[object Object]') {

      // Invalid stream ID

      addToast(ToastType.Error, "ID da stream inválido. Não foi possível entrar na live.");

      return;

    }

    

    setIsEnteringStream(true);

    try {

      if (streamer.isPrivate && streamer.hostId !== currentUser.id) {

        addToast(ToastType.Error, "Você não tem permissão para entrar nesta sala privada.");

        setIsEnteringStream(false);

        return;

      }



      setStreamRoomData({

        gifts: allGifts,

        receivedGifts: []

      });

      setActiveStream(streamer);

      startLiveSession(streamer);

      simpleEventManager.connect();

      navigate(`/live/${streamer.id}`);

    } catch (error) {

      addToast(ToastType.Error, "Falha ao carregar dados da live.");

    } finally {

      setIsEnteringStream(false);

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

    simpleEventManager.connect();

    

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

    try {
      (window as any).Android?.stopRTMP?.();
    } catch (error) {
      console.warn('[LIVE-END] Falha ao parar RTMP nativo:', error);
    }

    try {
      const { streamPublishService } = await import('./services/streamPublishService');
      streamPublishService.stopPublish();
    } catch (error) {
      console.warn('[LIVE-END] Falha ao parar publicação:', error);
    }



    if (activeStream && liveSession) {

      // Validate that activeStream.id is a string

      if (typeof activeStream.id !== 'string' || activeStream.id === '[object Object]') {

        // Invalid stream ID

        addToast(ToastType.Error, "ID da stream inválido. Não foi possível encerrar a transmissão.");

        setActiveStream(null);

        setIsPKBattleActive(false);

        setPkOpponent(null);

        setLiveSession(null);

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

      // Limpar estado da stream imediatamente para desmontar StreamRoom
      setActiveStream(null);
      setIsPKBattleActive(false);
      setPkOpponent(null);
      setLiveSession(null);
      setStreamRoomData(null);
      navigate('/');

      try {

        if (!liveSession) {

          throw new Error('Sessão da live não encontrada');

        }

        // 1. Chamar backend para registrar fim da live (controle de status)
        try {
          console.log('[LIVE-END] Encerrando live - chamando backend...');
          const endResponse = await api.endLive();
          if (endResponse.success) {
            console.log('[LIVE-END] Live encerrada no backend');
          } else {
            console.warn('[LIVE-END] Falha ao encerrar live no backend');
          }
        } catch (backendError) {
          console.warn('[LIVE-END] Erro ao chamar endLiveStream:', backendError);
          // Continuar mesmo se falhar o backend, pois o encerramento local é mais importante
        }

        const response = await api.endLiveSession(activeStream.id, liveSession);



        // 2. Remover o card especificamente

        const removeResponse = await api.removeLiveCard(activeStream.id, currentUser?.id || '');

        

        // Verificar se o card foi removido com sucesso

        if (!removeResponse.success) {

          // Card da live não foi removido

        }



        // 3. Recarregar a lista de streams para atualizar os cards

        await loadStreams();

      } catch (error) {

        addToast(ToastType.Error, 'Erro ao encerrar transmissão');

      }

    }



    setActiveStream(null);

    setIsPKBattleActive(false);

    setPkOpponent(null);

    setLiveSession(null);

    setStreamRoomData(null);

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

    setChattingWith(user);
  };

  const handleStartChat = async (user: User) => {
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



    try {

      const response = await api.followUser(currentUser.id, userToFollow.id, streamId);



      if (response.success) {

        const isNowFollowing = !userToFollow.isFollowed;

        const updatedFollowed = { ...userToFollow, isFollowed: isNowFollowing };

        const updatedFollower = { ...currentUserRef.current, following: (currentUser.following || 0) + (isNowFollowing ? 1 : -1) };



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



  const handlePurchase = (pkg: { diamonds: number; price: number }) => {

    setSelectedPackage(pkg);

    setIsWalletScreenOpen(false);

    setIsConfirmingPurchase(true);

  };



  const handleConfirmPurchase = async (pkg: { diamonds: number; price: number }) => {

    if (!currentUser) return;



    const updatedUser = { ...currentUserRef.current, diamonds: currentUser.diamonds + pkg.diamonds };

    updateUserEverywhere(updatedUser);



    setPaymentSuccessData({

      price: pkg.price,

      diamonds: pkg.diamonds,

      method: 'pix',

      timestamp: new Date()

    });

    setIsConfirmingPurchase(false);

    setIsPaymentSuccessOpen(true);

    setSelectedPackage(null);

  };



  const handlePurchaseFrame = async (frameId: string) => {

    if (!currentUser) return;



    if (currentUser.diamonds < 100) {

      addToast(ToastType.Error, "Diamantes insuficientes.");

      return;

    }



    const updatedUser = { ...currentUserRef.current, diamonds: currentUser.diamonds - 100 };

    updateUserEverywhere(updatedUser);

    addToast(ToastType.Success, "Moldura comprada com sucesso!");

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

    const updatedUser = { ...currentUserRef.current, isVIP: true };

    updateUserEverywhere(updatedUser);

    addToast(ToastType.Success, t('toasts.vipSuccess'));

    setIsVIPCenterOpen(false);

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

        country: 'br',

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
  }, []);



  // Mostrar loading enquanto restaura sessão
  if (isLoadingCurrentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  if (!currentUser) return <div className="h-full w-full bg-black flex items-center justify-center"><LoadingSpinner /></div>;



  return (
    <div className="app-container bg-black text-white font-sans">

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
                      setPkOpponent(opponentUser);
                      setIsPKBattleActive(true);
                      if (!activeStream) {
                        handleSelectStream(opponentUser as Streamer);
                      }
                    } else {
                      // Fallback: create mock opponent profile
                      const mockOpponent: User = {
                        id: activePKInvite.inviterId || activePKInvite.inviter_id || '98501724',
                        identification: '100099',
                        name: activePKInvite.inviterName || activePKInvite.inviter_name || 'Oponente',
                        avatarUrl: activePKInvite.inviterAvatar || 'https://picsum.photos/seed/pkopp/400/600.jpg',
                        age: 24,
                        gender: 'female',
                        level: 10,
                        diamonds: 300,
                        earnings: 150,
                        fans: 120,
                        following: 95,
                        receptores: 80,
                        enviados: 40,
                        earnings_withdrawn: 0,
                        isVIP: true,
                        location: 'São Paulo, SP',
                        ownedFrames: []
                      };
                      setPkOpponent(mockOpponent);
                      setIsPKBattleActive(true);
                      if (!activeStream) {
                        handleSelectStream(mockOpponent as any);
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

        <div className="fixed inset-0 z-[999999]">

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
              {location.pathname === '/' || location.pathname === '/live' ? (
                <MainScreen 
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
                />
              ) : location.pathname.startsWith('/live/') && location.pathname !== '/live' ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p>Carregando transmissão...</p>
                  </div>
                </div>
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



      <ReminderModal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} onSelectStream={handleSelectStream} streamers={reminderStreamers} onOpenLiveHistory={() => setIsLiveHistoryOpen(true)} />

      <RegionModal isOpen={isRegionModalOpen} onClose={() => setIsRegionModalOpen(false)} countries={countries} onSelectRegion={handleSelectRegion} selectedCountryCode={selectedCountry} />

      {/* Updated GoLiveScreen usage to accept inviteData */}

      <CameraPermissionModal isOpen={permissionStep !== 'idle'} permissionType={permissionStep} onAllowAlways={handlePermissionAllow} onAllowOnce={handlePermissionAllow} onDeny={handlePermissionDeny} onClose={() => setPermissionStep('idle')} />

      <LocationPermissionModal isOpen={isLocationPermissionModalOpen} onAllow={handleAllowLocation} onAllowOnce={handleAllowLocation} onDeny={handleDenyLocation} permissionStatus={locationPermissionStatus} />

      {isEndStreamConfirmOpen && <EndStreamConfirmationModal onCancel={() => setIsEndStreamConfirmOpen(false)} onConfirm={handleConfirmEndStream} isPK={isPKBattleActive} />}

      {isEndStreamSummaryOpen && streamSummaryData && <EndStreamSummaryScreen data={streamSummaryData} currentUser={currentUser} onClose={() => { setIsEndStreamSummaryOpen(false); setStreamSummaryData(null); navigate('/'); }} />}

      {viewingProfile && <UserProfileScreen user={viewingProfile} isCurrentUser={viewingProfile.id === currentUser?.id} onBack={() => setViewingProfile(null)} onEdit={handleEditProfile} onOpenTopFans={() => { setViewingProfile(null); handleOpenListScreen('topFans'); }} onOpenFollowing={() => { setViewingProfile(null); handleOpenListScreen('following'); }} onOpenFans={() => { setViewingProfile(null); handleOpenListScreen('fans'); }} onFollow={handleFollowUser} onStartChat={handleStartChat} onBlockUser={handleBlockUser} onReportUser={handleReportUser} onOpenPhotoViewer={(photos, index) => setPhotoViewerData({ photos, initialIndex: index })} lastPhotoLikeUpdate={lastPhotoLikeUpdate} onPhotoLiked={() => setLastPhotoLikeUpdate(Date.now())} onPhotoRemoved={(u) => { updateUserEverywhere(u); setViewingProfile(u); }} />}

      {isEditingProfile && <EditProfileScreen user={currentUser} onBack={() => setIsEditingProfile(false)} onSave={handleSaveProfile} />}

      {isWalletScreenOpen && <WalletScreen onClose={() => setIsWalletScreenOpen(false)} onPurchase={handlePurchase} initialTab={walletInitialTab} isBroadcaster={true} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} purchaseHistory={purchaseHistory} />}

      {isConfirmingPurchase && selectedPackage && <ConfirmPurchaseScreen onClose={() => setIsConfirmingPurchase(false)} packageDetails={selectedPackage} onConfirmPurchase={handleConfirmPurchase} addToast={addToast} currentUser={currentUser} />}

      {isFollowingScreenOpen && <FollowingScreen onBack={() => setIsFollowingScreenOpen(false)} onViewProfile={handleViewProfile} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFansScreenOpen && <FansScreen onBack={() => setIsFansScreenOpen(false)} onViewProfile={handleViewProfile} users={listScreenUsers} onFollowUser={handleFollowUser} currentUser={currentUser} />}

      {isFriendRequestsScreenOpen && <FriendRequestsScreen onBack={() => setIsFriendRequestsScreenOpen(false)} onViewProfile={handleViewProfile} users={(followingUsers || []).filter(followed => followed && (fans || []).some(fan => fan && fan.id === followed.id))} onFollowUser={handleFollowUser} />}

      {isVisitorsScreenOpen && <VisitorsScreen onBack={() => setIsVisitorsScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} addToast={addToast} />}

      {isTopFansScreenOpen && <TopFansScreen onBack={() => setIsTopFansScreenOpen(false)} onViewProfile={handleViewProfile} currentUser={currentUser} />}

      {isMyLevelScreenOpen && <MyLevelScreen onClose={() => setIsMyLevelScreenOpen(false)} currentUser={currentUser} />}

      {isBlockListScreenOpen && <BlockListScreen onClose={() => setIsBlockListScreenOpen(false)} onUnblockUser={handleUnblockUser} onViewProfile={handleViewProfile} />}

      {isAvatarProtectionScreenOpen && <AvatarProtectionScreen onClose={() => setIsAvatarProtectionScreenOpen(false)} currentUser={currentUser} updateUser={updateUserEverywhere} addToast={addToast} />}

      {isMarketScreenOpen && currentUser && <MarketScreen onClose={() => setIsMarketScreenOpen(false)} user={currentUser} updateUser={updateUserEverywhere} onPurchaseFrame={handlePurchaseFrame} addToast={addToast} onOpenWallet={(initialTab) => handleNavigation('wallet')} />}

      {isFAQScreenOpen && <FAQScreen onClose={() => setIsFAQScreenOpen(false)} />}

      {isSettingsScreenOpen && <SettingsScreen onClose={() => setIsSettingsScreenOpen(false)} currentUser={currentUser} gifts={allGifts} updateUser={updateUserEverywhere} addToast={addToast} onOpenPipModal={() => setIsPipSettingsModalOpen(true)} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onOpenLanguageModal={() => setIsLanguageModalOpen(true)} />}

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



      {/* LiveNotificationModal rendered for standard notifications, but private invite uses GoLiveScreen directly */}

      <LiveNotificationModal

        isOpen={!!liveNotification}

        onClose={() => setLiveNotification(null)}

        onWatch={handleWatchLiveNotification}

        data={liveNotification}

      />



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

const App: React.FC = () => {

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContentWithRouter />} />
            <Route path="/live" element={<AppContentWithRouter />} />
            <Route path="/live/:streamId" element={<AppContentWithRouter />} />
            <Route path="/video" element={<AppContentWithRouter />} />
            <Route path="/messages" element={<AppContentWithRouter />} />
            <Route path="/golive" element={<AppContentWithRouter />} />
            <Route path="/profile" element={<AppContentWithRouter />} />
            <Route path="/profile/*" element={<AppContentWithRouter />} />
            <Route path="/wallet" element={<AppContentWithRouter />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );

};



export default App;



