import React, { useState, useRef, useCallback } from 'react';
import { Streamer, User, ToastType } from '../types';
import { api } from '../services/api';
import { streamPublishService } from '../services/streamPublishService';
import { socketService } from '../services/socket';

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
      location: currentUser.country || 'BR',
      time: 'Preparando',
      message: streamDescription || '',
      tags: [selectedCategoryKey],
      isLive: false,
      isPrivate: isPrivate,
      streamStatus: 'draft',
      streamKey: `stream_${currentUser.id}`,
      viewers: 0,
      country: currentUser.country || 'br'
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
      location: currentUser.country || 'BR',
      time: 'Preparando',
      message: streamDescription || '',
      tags: [selectedCategoryKey || 'popular'],
      isLive: false,
      isPrivate: isPrivate,
      streamStatus: 'draft',
      streamKey: `stream_${currentUser.id || Date.now()}`,
      viewers: 0,
      country: currentUser.country || 'br'
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
      console.log('[STREAM_MANAGER] 🚀 Iniciando fluxo WebRTC WHIP diretamente para o SRS...');

      const streamId = `stream_${currentUser.id}`;

      // 1. Start WHIP Publish (WebRTC publication flow to SRS) first
      if (!isAndroidApp()) {
        console.log('[STREAM_MANAGER] 📡 1. Publicando transmissão via WebRTC WHIP diretamente no SRS:', streamId);
        try {
          await streamPublishService.startPublish(streamId, { videoRef });
          console.log('[STREAM_MANAGER] ✅ 2. Publicação WebRTC WHIP estabelecida com sucesso no SRS!');
        } catch (whipErr) {
          console.error('[STREAM_MANAGER] ❌ Erro ao iniciar publicação WebRTC WHIP no SRS:', whipErr);
          throw whipErr;
        }
      } else {
        startNativePublish(streamId);
      }

      // 2. Usar OBRIGATORIAMENTE o draftStream já existente (criado pelo GoLiveScreen)
      // NUNCA chama api.createStream() aqui - isso causava 401 e redirect ao login
      if (!draftStream) {
        throw new Error("Nenhum rascunho de stream encontrado. Salve os detalhes primeiro.");
      }
      const registeredStream = draftStream;
      console.log('[STREAM_MANAGER] 📡 3. Usando draft existente, sem nova chamada createStream.');

      // 3. Marcar stream como live no backend (cria LiveCard)
      try {
        await api.publishStream(streamId);
        console.log('[STREAM_MANAGER] ✅ Transmissão publicada com sucesso no backend!');
      } catch (publishErr) {
        console.warn('[STREAM_MANAGER] ⚠️ Falha ao publicar transmissão:', publishErr);
      }

      // 4. Construct final streamer object
      const streamer: Streamer = {
        ...registeredStream,
        id: streamId,
        hostId: currentUser.id,
        name: streamTitle || registeredStream?.name || `Live de ${currentUser.name}`,
        avatar: currentUser.avatarUrl || registeredStream?.avatar || '',
        location: currentUser.country || registeredStream?.location || 'BR',
        time: 'Ao Vivo',
        message: streamDescription || registeredStream?.message || '',
        tags: [selectedCategoryKey || 'popular'],
        isLive: true,
        streamStatus: 'active',
        streamKey: streamId,
        startTime: new Date(),
        viewers: registeredStream?.viewers || 0,
        hlsUrl: `/api/video/http/live/${streamId}.m3u8`,
        webrtcUrl: `/api/rtc/v1/whep/?app=live&stream=${streamId}`,
        playbackUrl: `/api/video/http/live/${streamId}.m3u8`,
        vhost: '__defaultVhost__',
        app: 'live',
        stream: streamId
      };

      setDraftStream(streamer);

      // 4. Emit live_started via socket
      try {
        socketService.getSocket()?.emit('live_started', streamer);
        console.log('[STREAM_MANAGER] 📡 live_started emitido via socket');
      } catch (socketErr) {
        console.warn('[STREAM_MANAGER] Erro ao emitir live_started:', socketErr);
      }

      localStorage.setItem('currentStreamId', streamer.id);
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
