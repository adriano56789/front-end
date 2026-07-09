import { getWhepEndpointUrl } from './mediaConfig';
import { api } from './api';

export class WhepPlaybackService {
  private pc: RTCPeerConnection | null = null;
  private iceUrl: string | null = null;
  private eTag: string | null = null;
  private iceUfrag: string | null = null;
  private icePwd: string | null = null;
  private mediaMids: string[] = [];

  async start(streamKey: string, video: HTMLVideoElement): Promise<void> {
    this.stop();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceTransportPolicy: 'relay' as RTCIceTransportPolicy,
    });
    this.pc = pc;
    this.mediaMids = [];

    const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' });
    const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdp = offer.sdp!;
    this.iceUfrag = (sdp.match(/a=ice-ufrag:(.+)/)?.[1] ?? '').trim();
    this.icePwd = (sdp.match(/a=ice-pwd:(.+)/)?.[1] ?? '').trim();
    if (videoTransceiver.mid) this.mediaMids.push(videoTransceiver.mid);
    if (audioTransceiver.mid) this.mediaMids.push(audioTransceiver.mid);

    console.log(`[WHEP] ICE ufrag=${this.iceUfrag}, mids=${this.mediaMids.join(',')}`);

    const result = await api.rtc.whep(streamKey, sdp);
    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });

    this.iceUrl = result.location;
    this.eTag = result.eTag;

    if (this.iceUrl) {
      pc.onicecandidate = (event) => {
        if (event.candidate && pc.connectionState !== 'closed') {
          this.sendIceCandidate(event.candidate).catch(err =>
            console.warn('[WHEP] ICE candidate send failed:', err)
          );
        }
      };
    }

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        video.srcObject = event.streams[0];
      }
    };

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WHEP connection timeout')), 15000);

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          clearTimeout(timeout);
          resolve();
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          clearTimeout(timeout);
          reject(new Error(`WHEP ICE failed: ${pc.iceConnectionState}`));
        }
      };
    });
  }

  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.iceUrl || !this.iceUfrag || !this.icePwd || !this.mediaMids.length || !this.eTag) {
      return;
    }

    let frag = `a=ice-ufrag:${this.iceUfrag}\r\na=ice-pwd:${this.icePwd}\r\n`;
    for (const mid of this.mediaMids) {
      frag += `m=audio 9 RTP/AVP 0\r\na=mid:${mid}\r\na=${candidate.candidate}\r\n`;
    }

    try {
      await api.rtc.patchTrickleIce(this.iceUrl, this.eTag, frag);
    } catch (err) {
      console.warn('[WHEP] ICE candidate PATCH failed:', err);
    }
  }

  stop(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.iceUrl = null;
    this.eTag = null;
    this.iceUfrag = null;
    this.icePwd = null;
    this.mediaMids = [];
  }
}

export const whepPlaybackService = new WhepPlaybackService();
