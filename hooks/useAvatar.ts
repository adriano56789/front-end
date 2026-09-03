/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useAvatar — Hook React para gerenciamento de avatares virtuais.
 *
 * Inspirado no Tencent doc 51231:
 *   - sdk.getAvatarList('AR' | 'VR')
 *   - ar.setAvatar({ mode, effectId, backgroundUrl })
 *   - ar.removeAvatar()
 *   - ArSdk.isAvatarSupported()
 *
 * Uso:
 *   const { isActive, mode, model, setAvatar, removeAvatar, isSupported } = useAvatar();
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
  avatarService,
  AvatarService,
  AvatarModel,
  AvatarState,
  AvatarMode,
  isAvatarSupported,
} from '../services/AvatarService';

interface UseAvatarReturn {
  /** Se WebGL2 é suportado */
  isSupported: boolean;
  /** Se avatar está ativo */
  isActive: boolean;
  /** Modo atual (AR/VR/null) */
  mode: AvatarMode;
  /** Modelo ativo */
  model: AvatarModel | null;
  /** URL do fundo (modo VR) */
  backgroundUrl: string | null;
  /** Ativar avatar */
  setAvatar: (model: AvatarModel, backgroundUrl?: string) => boolean;
  /** Remover avatar */
  removeAvatar: () => void;
  /** Buscar lista de avatares */
  getAvatarList: (mode: 'AR' | 'VR') => Promise<AvatarModel[]>;
}

export function useAvatar(): UseAvatarReturn {
  const [state, setState] = useState<AvatarState>(avatarService.getState());
  const [isSupported] = useState(() => isAvatarSupported());

  // Escutar mudanças de estado
  useEffect(() => {
    const unsub = avatarService.onStateChange((s) => {
      setState(s);
    });
    return unsub;
  }, []);

  const setAvatar = useCallback((model: AvatarModel, backgroundUrl?: string) => {
    return avatarService.setAvatar(model, backgroundUrl);
  }, []);

  /**
   * Ativar avatar com callback (equivalente ao ar.setAvatar({}, callback)).
   */
  const setAvatarWithCallback = useCallback((
    model: AvatarModel,
    callback?: (success: boolean) => void,
    backgroundUrl?: string,
  ) => {
    avatarService.setAvatarWithCallback(model, callback, backgroundUrl);
  }, []);

  const removeAvatar = useCallback(() => {
    avatarService.removeAvatar();
  }, []);

  const getAvatarList = useCallback(async (mode: 'AR' | 'VR') => {
    return avatarService.getAvatarList(mode);
  }, []);

  return {
    isSupported,
    isActive: state.active,
    mode: state.mode,
    model: state.model,
    backgroundUrl: state.backgroundUrl,
    setAvatar,
    setAvatarWithCallback,
    removeAvatar,
    getAvatarList,
  };
}
