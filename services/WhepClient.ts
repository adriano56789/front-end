import { getWhepEndpointUrl } from './mediaConfig';
import { api } from './api';

export interface WhepResult {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

export class WhepClient {
  static async connect(
    streamKey: string,
    signal?: AbortSignal,
  ): Promise<WhepResult> {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const pc = new RTCPeerConnection({
      iceServers,
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

    if (pc.iceGatheringState !== 'complete') {
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
        }, 2000);
      });
    }

    if (signal?.aborted) {
      pc.close();
      throw new DOMException('Aborted', 'AbortError');
    }

    const finalOffer = pc.localDescription?.sdp;
    if (!finalOffer) throw new Error('SDP offer could not be generated');

    let result;
    try {
      result = await api.rtc.whep(streamKey, finalOffer);
    } catch (err: any) {
      throw err;
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });

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
