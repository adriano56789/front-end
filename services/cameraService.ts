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
   * Capturar stream com validação completa
   */
  async captureStream(): Promise<MediaStream> {
    try {
      console.log('📷 [Camera] Capturando stream...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error('Nenhuma track de vídeo capturada');
      }

      // Log de sucesso com detalhes
      const videoSettings = videoTracks[0]?.getSettings();
      console.log('✅ [Camera] Stream capturado:', {
        video: videoTracks.length + ' track(s)',
        audio: audioTracks.length + ' track(s)',
        resolution: videoSettings?.width + 'x' + videoSettings?.height,
        frameRate: videoSettings?.frameRate + ' fps'
      });

      return stream;

    } catch (error: any) {
      console.error('❌ [Camera] Erro ao capturar:', error?.message);
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
