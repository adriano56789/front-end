import React, { useState, useRef, useCallback } from 'react';
import { Streamer, User, ToastType } from '../types';
import { api } from '../services/api';
import { streamPublishService } from '../services/streamPublishService';

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

      if (newStream) {
        const streamResponse = newStream.stream || newStream;
        const stream = streamResponse as Streamer;

        if (!stream || !stream.id) {
          throw new Error("Stream criado sem ID válido");
        }

        setDraftStream(stream);
        return stream;
      }

      throw new Error("Falha ao criar stream");
    } catch (error) {
      console.error('[STREAM_MANAGER] Erro ao criar draft:', error);
      addToast(ToastType.Error, "Falha ao preparar stream.");
      return null;
    }
  }, [currentUser.id, streamTitle, streamDescription, selectedCategoryKey, isPrivate, addToast]);

  const updateStreamDetails = useCallback(async (data: Partial<Streamer>) => {
    if (!draftStream || !draftStream.id) {
      addToast(ToastType.Error, "Nenhuma stream encontrada para salvar.");
      return;
    }

    try {
      const streamData = {
        name: data.name || streamTitle,
        message: data.message || streamDescription,
        tags: data.tags || [selectedCategoryKey],
        ...data
      };

      const { success, stream } = await api.saveStream(draftStream.id, streamData);

      if (success && stream) {
        setDraftStream(stream);
        addToast(ToastType.Success, "Detalhes da live salvos!");
      } else {
        throw new Error("API failed to save");
      }
    } catch (error) {
      console.error('[STREAM_MANAGER] Erro ao salvar detalhes:', error);
      addToast(ToastType.Error, "Falha ao salvar detalhes.");
    }
  }, [draftStream, streamTitle, streamDescription, selectedCategoryKey, addToast]);

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
      // 1. Create stream via API (minimal data, como no simulado)
      const streamData = await api.createStream(currentUser.id, {
        name: streamTitle || '',
        message: streamDescription || '',
        category: selectedCategoryKey || 'popular',
        isPrivate: isPrivate
      });

      const streamResponse = streamData.stream || streamData;

      if (typeof streamResponse === 'string') {
        throw new Error('Resposta inválida do backend: esperado objeto stream');
      }

      const stream = streamResponse as Streamer;

      if (!stream?.id || stream.id === 'undefined' || stream.id === null) {
        throw new Error('ID da stream inválido retornado pelo backend.');
      }

      setDraftStream(stream);

      // 2. Save stream details (como no simulado: api.saveStream depois de create)
      try {
        const { success } = await api.saveStream(stream.id, {
          name: streamTitle,
          message: streamDescription,
          tags: [selectedCategoryKey],
          isPrivate: isPrivate
        });
        if (!success) {
          console.warn('[STREAM_MANAGER] saveStream success=false, continuando...');
        }
      } catch (saveErr) {
        console.warn('[STREAM_MANAGER] saveStream não fatal:', saveErr);
      }

      // 2.5 Persistir streamKey no banco para o callback on_publish do SRS encontrar
      try {
        await api.patchStream(stream.id, { streamKey: stream.id });
      } catch (patchErr) {
        console.warn('[STREAM_MANAGER] patchStream não fatal:', patchErr);
      }

      // 3. Start WebRTC publish (usa streamPublishService que chama webrtcService)
      const streamKey = stream.streamKey || stream.id;
      await streamPublishService.startPublish(streamKey, {
        videoRef,
        previewStream: videoRef.current?.srcObject as MediaStream | null,
      });

      // 4. Construct streamer e notifica parent (só depois do publish OK)
      const streamer: Streamer = {
        id: stream.id,
        hostId: currentUser.id,
        name: stream.name,
        avatar: stream.avatar || currentUser.avatarUrl || '',
        location: currentUser.country || 'BR',
        time: 'Ao Vivo',
        message: stream.message || '',
        tags: stream.tags || [selectedCategoryKey],
        isLive: true,
        streamStatus: 'active',
        streamKey: streamKey,
        startTime: new Date(stream.startTime) || new Date(),
        viewers: stream.viewers || 0,
        rtmpIngestUrl: stream.rtmpIngestUrl,
        playbackUrl: stream.playbackUrl,
        hlsUrl: stream.hlsUrl,
        flvUrl: stream.flvUrl,
        vhost: stream.vhost || '__defaultVhost__',
        app: stream.app || 'live',
        stream: stream.id
      };

      localStorage.setItem('currentStreamId', streamer.id);
      onStartStream(streamer);
    } catch (error) {
      console.error('[STREAM_MANAGER] Erro ao iniciar live:', error);
      streamPublishService.stopPublish();
      addToast(ToastType.Error, "Falha ao iniciar transmissão.");
    }
  }, [currentUser, streamTitle, streamDescription, selectedCategoryKey, isPrivate, startNativePublish, videoRef, addToast]);

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
