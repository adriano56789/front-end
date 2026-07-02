import { getWhepEndpointUrl } from './mediaConfig';
import { api } from './api';

export interface WhepResult {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

const PC_CONFIG: any = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle',
};

export class WhepClient {
  static async connect(
    streamKey: string,
    signal?: AbortSignal,
  ): Promise<WhepResult> {
    console.log('📡 [WebRTC-WHEP] Iniciando fluxo de reprodução WebRTC (WHEP)...');
    console.log('📡 [WebRTC-WHEP] Buscando servidores STUN/TURN atualizados do backend...');

    const defaultIceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    let dynamicIceServers = defaultIceServers;

    try {
      const response = await api.getIceServers();
      const respAny = response as any;
      if (response && Array.isArray(response.iceServers)) {
        dynamicIceServers = response.iceServers;
      } else if (response && Array.isArray(response)) {
        dynamicIceServers = response;
      } else if (respAny && respAny.result && Array.isArray(respAny.result.iceServers)) {
        dynamicIceServers = respAny.result.iceServers;
      } else {
        console.warn('⚠️ [WebRTC-WHEP] Resposta de servidores ICE inválida ou ausente:', response);
      }
    } catch (e) {
      console.warn('⚠️ [WebRTC-WHEP] Falha ao carregar servidores ICE dinâmicos, usando backup:', e);
    }

    if (!Array.isArray(dynamicIceServers)) {
      console.warn('⚠️ [WebRTC-WHEP] dynamicIceServers não é um array. Revertendo para backup...');
      dynamicIceServers = defaultIceServers;
    }

    const config: any = {
      iceServers: dynamicIceServers,
      sdpSemantics: 'unified-plan',
      bundlePolicy: 'max-bundle',
    };

    console.log('📡 [WebRTC-WHEP] Criando instância de RTCPeerConnection...');
    console.log('📡 [WebRTC-WHEP] Configuração dos servidores STUN/TURN utilizados:', JSON.stringify(config.iceServers));

    const pc = new RTCPeerConnection(config);
    const stream = new MediaStream();

    console.log(`📡 [WebRTC-WHEP] Estado inicial da sinalização (signalingState): ${pc.signalingState}`);
    console.log(`📡 [WebRTC-WHEP] Estado inicial da conexão ICE (iceConnectionState): ${pc.iceConnectionState}`);
    console.log(`📡 [WebRTC-WHEP] Estado inicial da conexão (connectionState): ${pc.connectionState}`);
    console.log(`📡 [WebRTC-WHEP] Estado inicial da coleta de ICE (iceGatheringState): ${pc.iceGatheringState}`);

    pc.addEventListener('signalingstatechange', () => {
      console.log(`📡 [WebRTC-WHEP] signalingState mudou: ${pc.signalingState}`);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      console.log(`📡 [WebRTC-WHEP] iceConnectionState mudou: ${pc.iceConnectionState}`);
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log(`📡 [WebRTC-WHEP] connectionState mudou: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log('✅ [WebRTC-WHEP] Conexão estabelecida com sucesso! Player conectado.');
      }
    });

    pc.addEventListener('icegatheringstatechange', () => {
      console.log(`📡 [WebRTC-WHEP] iceGatheringState mudou: ${pc.iceGatheringState}`);
    });

    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        const candStr = event.candidate.candidate;
        let type = 'unknown';
        if (candStr.includes('typ host')) type = 'host';
        else if (candStr.includes('typ srflx')) type = 'srflx';
        else if (candStr.includes('typ relay')) type = 'relay';

        console.log(`📡 [WebRTC-WHEP] ICE Candidate gerado: tipo=${type}, candidate=${candStr}`);

        if (type === 'relay') {
          console.log('⚠️ [WebRTC-WHEP] Candidato TURN (relay) detectado! Fallback para TURN disponível.');
        }
      } else {
        console.log('📡 [WebRTC-WHEP] Coleta de ICE candidates finalizada (null candidate).');
      }
    });

    if ('onicecandidateerror' in pc) {
      (pc as any).onicecandidateerror = (event: any) => {
        console.error('❌ [WebRTC-WHEP] Erro de ICE Candidate:', event.errorCode, event.errorText, 'URL:', event.url);
      };
    }

    console.log('📡 [WebRTC-WHEP] Configurando transceivers de recebimento...');
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      const track = event.track;
      console.log(`📡 [WebRTC-WHEP] Evento ontrack disparado: kind=${track.kind}, id=${track.id}`);
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(t => {
          if (!stream.getTracks().includes(t)) {
            console.log(`📡 [WebRTC-WHEP] Adicionando track da stream recebida: kind=${t.kind}`);
            stream.addTrack(t);
          }
        });
      } else {
        console.log(`📡 [WebRTC-WHEP] Adicionando track avulsa recebida: kind=${track.kind}`);
        stream.addTrack(track);
      }
    };

    console.log('📡 [WebRTC-WHEP] Criando SDP offer...');
    const offer = await pc.createOffer();
    console.log('📡 [WebRTC-WHEP] Configurando local description (offer SDP)...');
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete or at least gather some candidates before sending offer!
    if (pc.iceGatheringState !== 'complete') {
      console.log('📡 [WebRTC-WHEP] Aguardando a conclusão da coleta de ICE...');
      await new Promise<void>(resolve => {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(() => {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }, 2000); // 2 seconds timeout fallback
      });
    }

    if (signal?.aborted) {
      pc.close();
      throw new DOMException('Aborted', 'AbortError');
    }

    const finalOffer = pc.localDescription?.sdp;
    if (!finalOffer) throw new Error('SDP offer could not be generated');

    console.log(`📡 [WebRTC-WHEP] Enviando requisição HTTP POST (WHEP Play) para o SRS...`);
    console.log(`📡 [WebRTC-WHEP] Endpoint de reprodução: /api/rtc/v1/whep/?app=live&stream=${streamKey}`);
    console.log(`📡 [WebRTC-WHEP] Offer SDP enviada:\n`, finalOffer);

    let result;
    try {
      result = await api.rtc.whep(streamKey, finalOffer);
      console.log(`✅ [WebRTC-WHEP] Resposta HTTP recebida com sucesso! Status: 201 Created`);
      console.log(`📡 [WebRTC-WHEP] Answer SDP recebida:\n`, result.sdp);
    } catch (err: any) {
      console.error(`❌ [WebRTC-WHEP] Falha na requisição HTTP de sinalização para /rtc/v1/play:`, err);
      throw err;
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });
    console.log(`📡 [WebRTC-WHEP] setRemoteDescription concluído. signalingState atual: ${pc.signalingState}`);

    const iceUrl = result.location;
    const eTag = result.eTag;

    if (iceUrl && eTag) {
      const iceUfrag = result.sdp.match(/a=ice-ufrag:(.+)/)?.[1] ?? '';
      const icePwd = result.sdp.match(/a=ice-pwd:(.+)/)?.[1] ?? '';

      pc.onicecandidate = (event) => {
        if (event.candidate && pc.connectionState !== 'closed') {
          this._sendIceCandidate(iceUrl, eTag, iceUfrag, icePwd, event.candidate)
            .catch(() => {});
        }
      };
    }

    return new Promise<WhepResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pc.close();
        reject(new Error('WHEP track timeout'));
      }, 15000);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          pc.close();
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }

      const onIce = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          if (stream.getTracks().length > 0) {
            clearTimeout(timeout);
            console.log('✅ [WebRTC-WHEP] Player conectado e recebendo mídia!');
            resolve({ pc, stream });
          }
        } else if (pc.iceConnectionState === 'failed') {
          clearTimeout(timeout);
          pc.close();
          reject(new Error('WHEP ICE connection failed'));
        }
      };

      pc.addEventListener('iceconnectionstatechange', onIce);
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'connected') {
          if (stream.getTracks().length > 0) {
            clearTimeout(timeout);
            console.log('✅ [WebRTC-WHEP] Player conectado e recebendo mídia!');
            resolve({ pc, stream });
          }
        } else if (pc.connectionState === 'failed') {
          clearTimeout(timeout);
          pc.close();
          reject(new Error('WHEP connection failed'));
        }
      });
    });
  }

  private static async _sendIceCandidate(
    iceUrl: string,
    eTag: string,
    iceUfrag: string,
    icePwd: string,
    candidate: RTCIceCandidate,
  ): Promise<void> {
    const frag = [
      `a=ice-ufrag:${iceUfrag}`,
      `a=ice-pwd:${icePwd}`,
      `m=audio 9 RTP/AVP 0`,
      `a=mid:0`,
      `a=${candidate.candidate}`,
    ].join('\r\n') + '\r\n';

    try {
      await api.rtc.patchTrickleIce(iceUrl, eTag, frag);
    } catch (err) {
      console.warn('[WhepClient] ICE candidate PATCH failed:', err);
    }
  }
}
