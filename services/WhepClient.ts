import { api } from './api';

export interface WhepResult {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

/**
 * Cliente WHEP de play seguindo o fluxo oficial do SRS (srs.sdk.js):
 * 1. addTransceiver audio+video recvonly
 * 2. createOffer + setLocalDescription
 * 3. POST /rtc/v1/whep/?app=live&stream=X com Content-type application/sdp
 * 4. Aceitar 200/201 (o SRS responde 201 com o SDP answer)
 * 5. setRemoteDescription e resolver na hora — as tracks chegam via ontrack
 *    quando o publisher estiver ativo (o SRS responde 201 mesmo sem publisher).
 *
 * Docs: https://ossrs.net/lts/en-us/docs/v5/doc/http-api#webrtc-play
 *       https://github.com/ossrs/srs/blob/develop/trunk/research/players/js/srs.sdk.js
 */
export class WhepClient {
  static async connect(
    streamKey: string,
    signal?: AbortSignal,
  ): Promise<WhepResult> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      bundlePolicy: 'max-bundle',
    } as RTCConfiguration);
    const stream = new MediaStream();

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(t => {
          if (!stream.getTracks().includes(t)) {
            stream.addTrack(t);
          }
        });
      } else {
        stream.addTrack(event.track);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (signal?.aborted) {
      pc.close();
      throw new DOMException('Aborted', 'AbortError');
    }

    const finalOffer = pc.localDescription?.sdp;
    if (!finalOffer) throw new Error('SDP offer could not be generated');

    let result;
    try {
      result = await api.rtc.whep(streamKey, finalOffer, signal);
    } catch (err: any) {
      pc.close();
      throw err;
    }

    if (!result.ok) {
      const srsMsg = result.sdp || `SRS returned code ${result.status}`;
      pc.close();
      throw new Error(`WHEP play failed: ${srsMsg}`);
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });

    return { pc, stream };
  }
}
