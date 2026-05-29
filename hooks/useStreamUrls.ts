import { useState, useCallback } from 'react';
import { Streamer, ToastType } from '../types';
import { api } from '../services/api';

interface StreamUrlsState {
  isEditingUrls: boolean;
  editRtmpUrl: string;
  editStreamKey: string;
  editSrtUrl: string;
  editPlaybackUrl: string;
  editWhipUrl: string;
}

interface StreamUrlsActions {
  toggleEditMode: () => void;
  saveUrls: (stream: Streamer | null) => Promise<Streamer | undefined>;
  updateUrl: (field: keyof StreamUrlsState, value: string) => void;
  copyToClipboard: (text?: string) => void;
}

export const useStreamUrls = (
  addToast: (type: ToastType, message: string) => void
): StreamUrlsState & StreamUrlsActions => {
  const [isEditingUrls, setIsEditingUrls] = useState(false);
  const [editRtmpUrl, setEditRtmpUrl] = useState('');
  const [editStreamKey, setEditStreamKey] = useState('');
  const [editSrtUrl, setEditSrtUrl] = useState('');
  const [editPlaybackUrl, setEditPlaybackUrl] = useState('');
  const [editWhipUrl, setEditWhipUrl] = useState('');

  const toggleEditMode = useCallback(() => {
    setIsEditingUrls(prev => !prev);
  }, []);

  const updateUrl = useCallback((field: keyof StreamUrlsState, value: string) => {
    switch (field) {
      case 'editRtmpUrl':
        setEditRtmpUrl(value);
        break;
      case 'editStreamKey':
        setEditStreamKey(value);
        break;
      case 'editSrtUrl':
        setEditSrtUrl(value);
        break;
      case 'editPlaybackUrl':
        setEditPlaybackUrl(value);
        break;
      case 'editWhipUrl':
        setEditWhipUrl(value);
        break;
    }
  }, []);

  const saveUrls = useCallback(async (stream: Streamer | null) => {
    if (!stream || !stream.id) {
      addToast(ToastType.Error, "Nenhuma stream encontrada para salvar URLs.");
      return undefined;
    }

    try {
      const urlsData = {
        rtmpIngestUrl: editRtmpUrl || '',
        streamKey: editStreamKey || '',
        srtIngestUrl: editSrtUrl || '',
        playbackUrl: editPlaybackUrl || ''
      };

      console.log('[URLS] Salvando configurações de URLs:', urlsData);

      const { success, stream: updatedStream, message } = await api.saveStreamUrls(stream.id, urlsData);

      if (success && updatedStream) {
        addToast(ToastType.Success, message || "URLs salvas com sucesso!");
        setIsEditingUrls(false);
        return updatedStream;
      } else {
        throw new Error("API failed to save URLs");
      }

    } catch (error) {
      console.error('[URLS] Erro ao salvar URLs:', error);
      
      // Fallback: update locally even if API fails
      if (stream) {
        const merged = {
          ...stream,
          rtmpIngestUrl: editRtmpUrl || '',
          streamKey: editStreamKey || '',
          srtIngestUrl: editSrtUrl || '',
          playbackUrl: editPlaybackUrl || '',
        };
        addToast(ToastType.Success, "URLs atualizadas localmente!");
        setIsEditingUrls(false);
        return merged;
      } else {
        addToast(ToastType.Error, "Falha ao salvar URLs.");
      }
    }
  }, [editRtmpUrl, editStreamKey, editSrtUrl, editPlaybackUrl, addToast]);

  const copyToClipboard = useCallback((text?: string) => {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      addToast(ToastType.Success, "Copiado!");
    }).catch(() => {
      addToast(ToastType.Error, "Falha ao copiar.");
    });
  }, [addToast]);

  return {
    isEditingUrls,
    editRtmpUrl,
    editStreamKey,
    editSrtUrl,
    editPlaybackUrl,
    editWhipUrl,
    toggleEditMode,
    saveUrls,
    updateUrl,
    copyToClipboard
  };
};
