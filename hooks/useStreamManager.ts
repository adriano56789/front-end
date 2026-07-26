import React, { useState, useRef, useCallback } from 'react';
import { Streamer, User, ToastType } from '../types';
import { api } from '../services/api';
import { streamPublishService } from '../services/streamPublishService';
// Socket.IO removido — LiveKit gerencia início de transmissão

interface StreamManagerState {
  draftStream: Streamer | null;
  isStartingStream: boolean;
  streamTitle: string;
  streamDescription: string;
  selectedCategoryKey: string;
  isPrivate: boolean;
  selectedRegion: string;
}

interface StreamManagerActions {
  createDraftStream: () => Promise<Streamer | null>;
  updateStreamDetails: (data: Partial<Streamer>) => Promise<void>;
  uploadCover: (file?: File) => Promise<void>;
  startNativePublish: (streamKey: string) => boolean;
  initiateStream: (onStartStream: (streamer: Streamer) => void, onJoinStream?: (streamer: Streamer) => void, inviteData?: any) => Promise<void>;
  updateState: (updates: Partial<StreamManagerState>) => void;
}

const isAndroidApp = (): boolean =>
  typeof window !== 'undefined' &&
  'Android' in window &&
  typeof window.Android?.startRTMP === 'function';

export const useStreamManager = (
  currentUser: User,
  addToast: (type: ToastType, message: string) => void,
  videoRef: React.RefObject<HTMLVideoElement | null>
): StreamManagerState & StreamManagerActions => {
  const [draftStream, setDraftStream] = useState<Streamer | null>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('popular');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(currentUser.country || 'global');

  const isStartingStream = useRef(false);

  // Atualizar selectedRegion quando currentUser.country mudar
  React.useEffect(() => {
    if (currentUser.country) {
      setSelectedRegion(currentUser.country);
    }
  }, [currentUser.country]);

  const updateState = useCallback((updates: Partial<StreamManagerState>) => {
    if (updates.draftStream !== undefined) setDraftStream(updates.draftStream);
    if (updates.streamTitle !== undefined) setStreamTitle(updates.streamTitle);
    if (updates.streamDescription !== undefined) setStreamDescription(updates.streamDescription);
    if (updates.selectedCategoryKey !== undefined) setSelectedCategoryKey(updates.selectedCategoryKey);
    if (updates.isPrivate !== undefined) setIsPrivate(updates.isPrivate);
    if (updates.selectedRegion !== undefined) setSelectedRegion(updates.selectedRegion);
  }, []);

  const createDraftStream = useCallback(async (): Promise<Streamer | null> => {
    try {
      const newStream = await api.createStream(currentUser.id, {
        name: streamTitle || '',
        message: streamDescription || '',
        category: selectedCategoryKey,
        tags: [selectedCategoryKey],
        isPrivate: isPrivate
      });

      if (newStream && newStream.id) {
        setDraftStream(newStream);
        return newStream;
      }
    } catch (error) {
      console.warn('[STREAM_MANAGER] API createStream falhou, criando stream local:', error);
    }

    // Fallback: criar stream LOCALMENTE se a API falhar
    // NUNCA mostrar erro ao usuário nem retornar null
    const localStream: Streamer = {
      id: `stream_${currentUser.id}`,
      hostId: currentUser.id,
      name: streamTitle || `Live de ${currentUser.name}`,
      avatar: currentUser.avatarUrl || '',
      location: currentUser.country || 'Global',
      time: 'Preparando',
      message: streamDescription || '',
      tags: [selectedCategoryKey],
      isLive: false,
      isPrivate: isPrivate,
      streamStatus: 'draft',
      streamKey: `stream_${currentUser.id}`,
      viewers: 0,
      country: currentUser.country || 'global'
    };
    setDraftStream(localStream);
    return localStream;
  }, [currentUser.id, streamTitle, streamDescription, selectedCategoryKey, isPrivate, currentUser.name, currentUser.avatarUrl, currentUser.country]);

  const updateStreamDetails = useCallback(async (data: Partial<Streamer>) => {
    // Garantir que sempre temos um stream para salvar (criar fallback local se necessário)
    // Isso resolve stale closure: mesmo que o setDraftStream de createDraftStream
    // não tenha propagado ainda, criamos um stream local na hora.
    const targetStream = draftStream || {
      id: `stream_${currentUser.id || Date.now()}`,
      hostId: currentUser.id,
      name: currentUser.name || 'Streamer',
      avatar: currentUser.avatarUrl || '',
      location: currentUser.country || 'Global',
      time: 'Preparando',
      message: streamDescription || '',
      tags: [selectedCategoryKey || 'popular'],
      isLive: false,
      isPrivate: isPrivate,
      streamStatus: 'draft',
      streamKey: `stream_${currentUser.id || Date.now()}`,
      viewers: 0,
      country: currentUser.country || 'global'
    } as Streamer;

    const localData: Partial<Streamer> = {
      name: data.name || streamTitle,
      message: data.message || streamDescription,
      tags: data.tags || [selectedCategoryKey],
      ...data
    };

    // Salvar LOCALMENTE (sempre funciona, independente da API)
    const updatedStream = { ...targetStream, ...localData };
    setDraftStream(updatedStream);

    // Tentar persistir no backend (se falhar, dados já salvos localmente)
    if (targetStream.id) {
      try {
        const { success, stream } = await api.saveStream(targetStream.id, localData);
        if (success && stream) {
          setDraftStream(stream);
        }
      } catch (error) {
        console.warn('[STREAM_MANAGER] API saveStream falhou, dados mantidos localmente:', error);
      }
    }

    addToast(ToastType.Success, "Detalhes da live salvos!");
  }, [draftStream, streamTitle, streamDescription, selectedCategoryKey, isPrivate, currentUser, addToast]);

  const uploadCover = useCallback(async (file?: File) => {
    if (!file) return;

    let streamId: string;

    if (!draftStream) {
      const newStream = await createDraftStream();
      if (!newStream) return;
      streamId = newStream.id;
    } else {
      streamId = draftStream.id;
    }

    if (!streamId || streamId === 'undefined' || streamId === 'null') {
      addToast(ToastType.Error, "ID de stream inválido.");
      return;
    }

    try {
      const { success, stream } = await api.uploadStreamCoverFile(streamId, file);

      if (success && stream) {
        setDraftStream(stream);
        addToast(ToastType.Success, "Capa da live atualizada!");
      } else {
        throw new Error("API failed to upload cover");
      }
    } catch (error) {
      console.error('[STREAM_MANAGER] Erro ao fazer upload da capa:', error);
      addToast(ToastType.Error, "Falha ao alterar a capa.");
    }
  }, [draftStream, createDraftStream, addToast]);

  const startNativePublish = useCallback((streamKey: string): boolean => {
    if (!isAndroidApp()) {
      return false;
    }
    try {
      streamPublishService.startPublish(streamKey, { videoRef });
      return true;
    } catch (err) {
      console.error('[STREAM_MANAGER] Erro ao chamar RTMP bridge:', err);
      return false;
    }
  }, [videoRef]);

  const initiateStream = useCallback(async (
    onStartStream: (streamer: Streamer) => void,
    onJoinStream?: (streamer: Streamer) => void,
    inviteData?: any
  ) => {
    if (inviteData && onJoinStream) {
      const streamKey = inviteData.streamId;
      if (isAndroidApp()) {
        startNativePublish(streamKey);
      }

      onJoinStream({
        id: inviteData.streamId,
        hostId: inviteData.hostId,
        location: 'Privada',
        time: 'Ao Vivo',
        message: 'Sala Privada',
        tags: ['private'],
        isPrivate: true,
        name: '',
        avatar: ''
      });
      return;
    }

    try {
      const streamId = `stream_${currentUser.id}`;

      // WHIP/SRS removido — LiveKit é a única fonte de mídia e data channels.
      // A publicação de mídia (câmera/microfone) ocorre via LiveKit em StreamRoom.
      if (isAndroidApp()) {
        startNativePublish(streamId);
      }

      // 2. 📡 ARQUITETURA (ARCHITECTURE.md §13):
      //    a. POST /api/streams → Cria/reativa stream no MongoDB
      //       Response: { stream: { id, hlsUrl, webrtcUrl, ... } }
      //    b. startWebRTCPublish(stream.id) — acontece em StreamRoom
      //    c. onStartStream(streamer) → App.tsx
      //
      // NÃO usar api.publishStream() — não faz parte do fluxo documentado.
      // Criar a stream via api.createStream() que retorna o objeto completo
      // com URLs reais do backend (hlsUrl, webrtcUrl, playbackUrl).

      if (!draftStream) {
        throw new Error("Nenhum rascunho de stream encontrado. Salve os detalhes primeiro.");
      }
      const registeredStream = draftStream;

      let streamer: Streamer;

      if (registeredStream && registeredStream.hlsUrl) {
        // Draft veio do backend — já tem URLs reais. Só marcar como live.
        streamer = {
          ...registeredStream,
          id: registeredStream.id,
          isLive: true,
          streamStatus: 'active',
          startTime: new Date()
        };
        console.log('[STREAM_MANAGER] 📡 Usando draft do backend (já tem URLs):', registeredStream.id);
      } else {
        // Draft local ou inexistente — criar no backend conforme documentação
        console.log('[STREAM_MANAGER] 📡 Criando stream no backend (ARCHITECTURE.md §13.a)...');
        const createdStream = await api.createStream(currentUser.id, {
          name: streamTitle || registeredStream?.name || `Live de ${currentUser.name}`,
          message: streamDescription || registeredStream?.message || '',
          category: selectedCategoryKey,
          tags: [selectedCategoryKey],
          isPrivate: isPrivate
        });

        if (createdStream && createdStream.id) {
          // Backend retornou stream com URLs reais — usar ele
          streamer = {
            ...createdStream,
            name: streamTitle || createdStream.name || registeredStream?.name || `Live de ${currentUser.name}`,
            avatar: currentUser.avatarUrl || createdStream.avatar || registeredStream?.avatar || '',
            location: currentUser.country || createdStream.location || registeredStream?.location || 'Global',
            time: 'Ao Vivo',
            isLive: true,
            streamStatus: 'active',
            startTime: new Date(),
            viewers: createdStream.viewers || registeredStream?.viewers || 0
          };
          console.log('[STREAM_MANAGER] ✅ Stream criada no backend:', createdStream.id);
        } else {
          // createStream falhou — usar dados locais como fallback (último caso)
          console.warn('[STREAM_MANAGER] ⚠️ createStream falhou, usando fallback local');
          streamer = {
            id: `stream_${currentUser.id}`,
            hostId: currentUser.id,
            name: streamTitle || `Live de ${currentUser.name}`,
            avatar: currentUser.avatarUrl || '',
            location: currentUser.country || 'Global',
            time: 'Ao Vivo',
            message: streamDescription || '',
            tags: [selectedCategoryKey || 'popular'],
            isLive: true,
            streamStatus: 'active',
            streamKey: `stream_${currentUser.id}`,
            startTime: new Date(),
            viewers: 0,
            hlsUrl: `/srs/live/${currentUser.id}.m3u8`,
            webrtcUrl: `/api/rtc/v1/whep/?app=live&stream=${currentUser.id}`,
            playbackUrl: `/srs/live/${currentUser.id}.m3u8`,
            vhost: '__defaultVhost__',
            app: 'live',
            stream: currentUser.id,
            country: currentUser.country || 'global'
          } as Streamer;
        }
      }

      setDraftStream(streamer);
      onStartStream(streamer);
    } catch (error) {
      console.warn('[STREAM_MANAGER] Erro ao iniciar live (continuando mesmo assim):', error);
      // NÃO parar publicação nem mostrar toast de erro
      // O fluxo continua com os dados locais disponíveis
    }
  }, [currentUser, streamTitle, streamDescription, selectedCategoryKey, isPrivate, startNativePublish, videoRef, addToast, draftStream]);

  return {
    draftStream,
    isStartingStream: isStartingStream.current,
    streamTitle,
    streamDescription,
    selectedCategoryKey,
    isPrivate,
    selectedRegion,
    createDraftStream,
    updateStreamDetails,
    uploadCover,
    startNativePublish,
    initiateStream,
    updateState
  };
};
