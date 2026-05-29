import { getWhepEndpointUrl } from './mediaConfig';

export interface WhepResult {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

const PC_CONFIG: RTCConfiguration = {
  iceServers: [],
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle',
};

export class WhepClient {
  static async connect(
    streamKey: string,
    signal?: AbortSignal,
  ): Promise<WhepResult> {
    const endpoint = getWhepEndpointUrl(streamKey);

    const pc = new RTCPeerConnection(PC_CONFIG);
    const stream = new MediaStream();

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(t => stream.addTrack(t));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (signal?.aborted) {
      pc.close();
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offer.sdp,
      signal,
    });

    if (!response.ok) {
      pc.close();
      throw new Error(`WHEP POST failed: ${response.status}`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    const iceUrl = response.headers.get('location');
    const eTag = response.headers.get('ETag');

    if (iceUrl && eTag) {
      const iceUfrag = answerSdp.match(/a=ice-ufrag:(.+)/)?.[1] ?? '';
      const icePwd = answerSdp.match(/a=ice-pwd:(.+)/)?.[1] ?? '';

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
        }
      };

      pc.addEventListener('iceconnectionstatechange', onIce);
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'connected' && stream.getTracks().length > 0) {
          clearTimeout(timeout);
          resolve({ pc, stream });
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

    await fetch(iceUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag',
        ETag: eTag,
      },
      body: frag,
    });
  }
}
