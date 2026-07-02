/**
 * Serviço de Câmera - Diagnóstico e Captura
 * Valida se câmera e microfone estão funcionando
 */

export interface CameraStatus {
  available: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  videoTracks: number;
  audioTracks: number;
  videoResolution?: { width: number; height: number };
  error?: string;
}

export class CameraService {
  private testStream: MediaStream | null = null;

  /**
   * Testar se câmera está disponível e funcionando
   */
  async testCamera(): Promise<CameraStatus> {
    const status: CameraStatus = {
      available: false,
      hasVideo: false,
      hasAudio: false,
      videoTracks: 0,
      audioTracks: 0
    };

    try {
      console.log('📷 [Camera] Testando câmera...');

      // Tentar acessar câmera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      this.testStream = stream;
      status.available = true;

      // Verificar tracks de vídeo
      const videoTracks = stream.getVideoTracks();
      status.videoTracks = videoTracks.length;
      status.hasVideo = videoTracks.length > 0;

      if (status.hasVideo) {
        const settings = videoTracks[0]?.getSettings();
        if (settings) {
          status.videoResolution = {
            width: settings.width || 1280,
            height: settings.height || 720
          };
          console.log('✅ [Camera] Vídeo: ' + settings.width + 'x' + settings.height);
        }
      }

      // Verificar tracks de áudio
      const audioTracks = stream.getAudioTracks();
      status.audioTracks = audioTracks.length;
      status.hasAudio = audioTracks.length > 0;

      if (status.hasAudio) {
        console.log('✅ [Camera] Áudio: ' + audioTracks.length + ' track(s)');
      }

      if (!status.hasVideo) {
        status.error = 'Câmera não encontrada ou bloqueada';
      }
      if (!status.hasAudio) {
        console.warn('⚠️  [Camera] Microfone não encontrado');
      }

      console.log('✅ [Camera] Teste concluído:', status);
      return status;

    } catch (error: any) {
      status.available = false;
      status.error = error?.message || 'Erro ao acessar câmera';

      // Classificar erro específico
      if (error.name === 'NotFoundError') {
        status.error = 'Câmera/Microfone não encontrados no sistema';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        status.error = 'Permissão negada para acessar câmera/microfone';
      } else if (error.name === 'NotReadableError') {
        status.error = 'Câmera está sendo usada por outro aplicativo';
      } else if (error.name === 'SecurityError') {
        status.error = 'Contexto de segurança inválido (HTTP sem HTTPS)';
      }

      console.error('❌ [Camera] Erro:', status.error);
      return status;
    }
  }

  /**
   * Parar teste e liberar recursos
   */
  stopTest(): void {
    if (this.testStream) {
      this.testStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 [Camera] Track parado:', track.kind);
      });
      this.testStream = null;
    }
  }

  /**
   * Capturar stream com validação completa e máxima resiliência (tiered fallbacks + separate media capture + track merging)
   */
  async captureStream(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    try {
      console.log(`📷 [Camera] Iniciando captura de stream (facingMode: ${facingMode})...`);

      let stream: MediaStream | null = null;
      const baseVideoConfig = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };

      // Tenta Capturar Vídeo e Áudio Juntos com restrições ideais
      try {
        console.log('[Camera] Tentativa 1: Vídeo e áudio combinados (ideal)');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...baseVideoConfig,
            facingMode: facingMode
          },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      } catch (err1) {
        console.warn('[Camera] Tentativa 1 falhou. Tentando captura separada ou restrições simplificadas...', err1);
      }

      // Se falhou, tenta capturar vídeo separado do áudio para evitar que a falta de um bloqueie o outro
      if (!stream) {
        let videoStream: MediaStream | null = null;
        let audioStream: MediaStream | null = null;

        // Captura do Vídeo com fallbacks de restrição sucessivos
        const videoTiers = [
          { video: { ...baseVideoConfig, facingMode: { ideal: facingMode } } },
          { video: { facingMode: facingMode } },
          { video: { ...baseVideoConfig } },
          { video: true }
        ];

        for (let i = 0; i < videoTiers.length; i++) {
          try {
            console.log(`[Camera] Tentando capturar vídeo tier ${i + 1}:`, videoTiers[i]);
            videoStream = await navigator.mediaDevices.getUserMedia(videoTiers[i]);
            if (videoStream && videoStream.getVideoTracks().length > 0) {
              console.log(`✅ [Camera] Vídeo capturado com sucesso no tier ${i + 1}`);
              break;
            }
          } catch (vidErr) {
            console.warn(`[Camera] Falha no vídeo tier ${i + 1}:`, vidErr);
          }
        }

        // Captura do Áudio se possível
        try {
          console.log('[Camera] Tentando capturar áudio separadamente...');
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          console.log('✅ [Camera] Áudio capturado separadamente com sucesso');
        } catch (audErr) {
          try {
            console.log('[Camera] Tentando áudio simples como fallback...');
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ [Camera] Áudio simples capturado com sucesso');
          } catch (audErr2) {
            console.warn('⚠️ [Camera] Não foi possível obter nenhuma track de áudio:', audErr2);
          }
        }

        // Junta as tracks reais capturadas
        if (videoStream) {
          stream = new MediaStream();
          videoStream.getVideoTracks().forEach(track => {
            track.enabled = true;
            stream?.addTrack(track);
          });
          if (audioStream) {
            audioStream.getAudioTracks().forEach(track => {
              track.enabled = true;
              stream?.addTrack(track);
            });
          }
        }
      }

      // Se tudo falhou, tenta o fallback absoluto: qualquer mídia de vídeo disponível
      if (!stream) {
        console.log('[Camera] Tentando fallback absoluto para qualquer câmera/microfone...');
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      // Validação detalhada das tracks retornadas
      if (!stream) {
        throw new Error('Nenhuma MediaStream foi gerada.');
      }

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error('Nenhuma track de vídeo capturada');
      }

      // Certificar que todas as tracks de vídeo estão ativas e habilitadas
      videoTracks.forEach(track => {
        track.enabled = true;
        if (track.readyState !== 'live') {
          console.warn(`⚠️ [Camera] Track de vídeo em estado não ativo: ${track.readyState}`);
        } else {
          console.log(`✅ [Camera] Track de vídeo ativa e pronta: ${track.label}`);
        }
      });

      // Certificar que todas as tracks de áudio estão habilitadas
      audioTracks.forEach(track => {
        track.enabled = true;
        console.log(`✅ [Camera] Track de áudio ativa e pronta: ${track.label}`);
      });

      // Log de sucesso com detalhes reais
      const videoSettings = videoTracks[0]?.getSettings();
      console.log('✅ [Camera] Captura finalizada com sucesso:', {
        videoTracksCount: videoTracks.length,
        audioTracksCount: audioTracks.length,
        resolution: `${videoSettings?.width || 'unknown'}x${videoSettings?.height || 'unknown'}`,
        frameRate: `${videoSettings?.frameRate || 'unknown'} fps`,
        facingMode: videoSettings?.facingMode || facingMode
      });

      return stream;

    } catch (error: any) {
      console.error('❌ [Camera] Falha crítica de captura:', error?.message);
      throw error;
    }
  }

  /**
   * Verificar se está em contexto seguro (HTTPS ou localhost)
   */
  isSecureContext(): boolean {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    const isSecure = isLocal || isHttps;

    console.log('[Camera] Contexto de segurança:', {
      isLocal,
      isHttps,
      isSecure,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    });

    return isSecure;
  }
}

export const cameraService = new CameraService();
