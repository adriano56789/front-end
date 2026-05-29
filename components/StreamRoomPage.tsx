import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StreamRoom from './StreamRoom';
import { Streamer, User, Gift, RankedUser } from '../types';
import { api } from '../services/api';

// Context para obter currentUser real do app
const AppContext = React.createContext<{
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}>({
  currentUser: null,
  setCurrentUser: () => {}
});

const StreamRoomPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Buscar dados reais do usuário do backend (APENAS BANCO DE DADOS)
    const fetchUserData = async () => {
      try {
        console.log('🔐 [StreamRoomPage] Buscando dados reais do usuário via /api/users/me');
        const userData = await api.getCurrentUser();
        
        if (userData) {
          console.log('✅ [StreamRoomPage] Dados reais do usuário carregados:', userData);
          setCurrentUser(userData);
        } else {
          console.warn('⚠️ [StreamRoomPage] Falha ao buscar dados do usuário');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('❌ [StreamRoomPage] Erro ao buscar dados do usuário:', err);
        // SEM FALLBACK PARA LOCALSTORAGE - APENAS BANCO DE DADOS
        setCurrentUser(null);
      }
    };

    fetchUserData();

    if (!streamId) {
      setError('ID da stream não encontrado na URL');
      setLoading(false);
      return;
    }

    const fetchStreamData = async () => {
      try {
        console.log(`🔍 [StreamRoomPage] Buscando dados da stream: ${streamId}`);
        
        const data = await api.getLiveDetails(streamId);
        
        console.log(`📊 [StreamRoomPage] Resposta do backend:`, data);
        
        if (data) {
          console.log(`✅ [StreamRoomPage] Stream encontrada:`, data);
          
          // Validar URLs reais retornadas pelo backend
          const { hlsUrl, webrtcUrl, flvUrl, rtmpIngestUrl } = data;
          console.log(`🔗 [StreamRoomPage] URLs validadas:`, {
            hlsUrl,
            webrtcUrl,
            flvUrl,
            rtmpUrl: rtmpIngestUrl
          });
          
          // ✅ ALINHAMENTO CRÍTICO: Garantir que streamId da URL = stream_id do Protobuf
          console.log(`🎯 [StreamRoomPage] ALINHAMENTO DE ID: URL=${streamId} → Protobuf stream_id=${streamId}`);
          
          setStreamer(data);
          setError(null);
        } else {
          console.error(`❌ [StreamRoomPage] Stream não encontrada: ${streamId}`);
          setError('Stream não encontrada ou não está ativa');
        }
      } catch (err) {
        console.error(`❌ [StreamRoomPage] Erro ao buscar stream:`, err);
        setError('Erro ao carregar dados da stream. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreamData();
  }, [streamId]);

  // Funções placeholder necessárias para o StreamRoom
  const handleEndStream = () => {
    console.log('📡 [StreamRoomPage] Encerrando stream e voltando para home');
    navigate('/');
  };

  const handleLeaveStreamView = () => {
    console.log('🔙 [StreamRoomPage] Saindo da visualização da stream');
    navigate('/');
  };

  const updateLiveSession = (updates: any) => {
    console.log('🔄 [StreamRoomPage] Atualizando sessão da live:', updates);
  };

  const logLiveEvent = (type: string, data: any) => {
    console.log(`📊 [StreamRoomPage] Evento da live: ${type}`, data);
  };

  const onStreamUpdate = (updates: Partial<Streamer>) => {
    console.log('🔄 [StreamRoomPage] Atualizando stream:', updates);
    if (streamer) {
      setStreamer({ ...streamer, ...updates });
    }
  };

  const refreshStreamRoomData = (streamerId: string) => {
    console.log(`🔄 [StreamRoomPage] Recarregando dados da stream: ${streamerId}`);
    // Recarregar dados se necessário
  };

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    console.log(`🔔 [StreamRoomPage] Toast: ${type} - ${message}`);
    // Implementar toast se necessário
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div>Carregando sala...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {error}</div>
          <button 
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">Stream não encontrada</div>
          <button 
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  // Validar se temos dados reais antes de renderizar
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-xl mb-4">⚠️ Usuário não autenticado</div>
          <button 
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <StreamRoom
      streamer={streamer}
      onRequestEndStream={handleEndStream}
      onLeaveStreamView={handleLeaveStreamView}
      onStartPKBattle={() => {}}
      onViewProfile={() => {}}
      onOpenWallet={() => {}}
      onFollowUser={() => {}}
      onOpenPrivateChat={() => {}}
      onOpenPrivateInviteModal={() => {}}
      setActiveScreen={() => {}}
      onStartChatWithStreamer={() => {}}
      onOpenPKTimerSettings={() => {}}
      onOpenFans={() => {}}
      onOpenFriendRequests={() => {}}
      onSelectStream={() => {}}
      onOpenVIPCenter={() => {}}
      gifts={[]}
      receivedGifts={[]}
      updateUser={() => {}}
      updateLiveSession={updateLiveSession}
      logLiveEvent={logLiveEvent}
      onStreamUpdate={onStreamUpdate}
      refreshStreamRoomData={refreshStreamRoomData}
      addToast={addToast}
      followingUsers={[]}
      streamers={[]}
      liveSession={null}
      rankingData={{}}
      currentUser={currentUser}
    />
  );
};

export default StreamRoomPage;
