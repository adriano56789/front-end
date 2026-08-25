import { api } from './api';
import { cameraService } from './cameraService';
import { audioCleaner } from './audioCleanerService';
import { WhepClient } from './WhepClient';
import { getWhipPublishUrl } from './mediaConfig';

export type CallState = 'idle' | 'requesting' | 'ringing' | 'connecting' | 'active' | 'ending';

export interface CallInfo {
  invitationId: string;
  hostId: string;
  guestId: string;
  guestName?: string;
  guestAvatar?: string;
  guestStreamKey: string;
  hostStreamKey: string;
  roomId: string;
  streamId: string;
}

interface CallListeners {
  stateChanged?: (prev: CallState, next: CallState) => void;
  error?: (code: string, message: string) => void;
}

class CallService {
  private _state: CallState = 'idle';
  private _callInfo: CallInfo | null = null;
  private _publishPC: RTCPeerConnection | null = null;
  private _playPC: RTCPeerConnection | null = null;
  private _localStream: MediaStream | null = null;
  private _remoteStream: MediaStream | null = null;
  private _listeners: CallListeners = {};
  private _destroyed = false;

  get state(): CallState { return this._state; }
  get callInfo(): CallInfo | null { return this._callInfo; }
  get localStream(): MediaStream | null { return this._localStream; }
  get remoteStream(): MediaStream | null { return this._remoteStream; }

  on(listeners: CallListeners) {
    this._listeners = { ...this._listeners, ...listeners };
    return () => {
      this._listeners = {};
    };
  }

  private _setState(next: CallState) {
    if (this._state === next) return;
    const prev = this._state;
    this._state = next;
    this._listeners.stateChanged?.(prev, next);
  }

  private _emitError(code: string, msg: string) {
    console.error(`[CallService] ${code}: ${msg}`);
    this._listeners.error?.(code, msg);
  }

  async requestCall(hostId: string, streamId: string): Promise<void> {
    if (this._destroyed || this._state !== 'idle') return;
    this._setState('requesting');

    try {
      const res = await api.call.request(hostId, streamId);
      if (!res || !res.success) {
        throw new Error('Falha ao solicitar chamada');
      }

      this._callInfo = {
        invitationId: res.invitationId,
        hostId,
        guestId: '',
        guestStreamKey: res.guestStreamKey,
        hostStreamKey: `stream_${hostId}`,
        roomId: streamId,
        streamId,
      };
      this._setState('ringing');
    } catch (err: any) {
      this._setState('idle');
      this._emitError('REQUEST_FAILED', err?.message || 'Erro ao solicitar chamada');
      throw err;
    }
  }

  async respondToCall(invitationId: string, accept: boolean, guestStreamKey?: string): Promise<void> {
    try {
      const res = await api.call.respond(invitationId, accept ? 'accept' : 'decline');
      if (!res || !res.success) {
        throw new Error('Falha ao responder chamada');
      }
      const streamKey = guestStreamKey || res.guestStreamKey || '';
      if (accept && this._callInfo) {
        this._callInfo.guestStreamKey = streamKey;
      }
    } catch (err: any) {
      this._emitError('RESPOND_FAILED', err?.message || 'Erro ao responder chamada');
      throw err;
    }
  }

  async startCall(callInfo: CallInfo): Promise<void> {
    if (this._destroyed) return;
    this._callInfo = callInfo;
    this._setState('connecting');

    try {
      await Promise.all([
        this._publishGuestStream(callInfo.guestStreamKey),
        this._playHostStream(callInfo.hostStreamKey),
      ]);
      this._setState('active');
    } catch (err: any) {
      this._emitError('CONNECT_FAILED', err?.message || 'Falha ao conectar chamada');
      await this.endCall();
    }
  }

  async joinAsHost(callInfo: CallInfo): Promise<void> {
    if (this._destroyed) return;
    this._callInfo = callInfo;
    this._setState('connecting');

    try {
      await this._playGuestStream(callInfo.guestStreamKey);
      this._setState('active');
    } catch (err: any) {
      this._emitError('CONNECT_FAILED', err?.message || 'Falha ao conectar como host');
      await this.endCall();
    }
  }

  async endCall(): Promise<void> {
    if (this._state === 'idle') return;
    this._setState('ending');

    if (this._callInfo?.invitationId) {
      try {
        await api.call.end(this._callInfo.invitationId);
      } catch {
        /* best effort */
      }
    }

    this._cleanup();
    this._setState('idle');
  }

  private async _publishGuestStream(streamKey: string): Promise<void> {
    const stream = await cameraService.captureStream('user');
    if (this._destroyed) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    this._localStream = stream;

    let cleanedAudio: MediaStreamTrack | null = null;
    try {
      cleanedAudio = await audioCleaner.process(stream);
    } catch { /* use raw */ }

    const pc = new RTCPeerConnection(null);
    this._publishPC = pc;

    stream.getTracks().forEach(track => {
      if (track.kind === 'audio' && cleanedAudio) {
        pc.addTrack(cleanedAudio, stream);
      } else {
        pc.addTrack(track, stream);
      }
    });

    try {
      const caps = (RTCRtpSender as any).getCapabilities?.('video');
      if (caps?.codecs) {
        const h264 = caps.codecs.filter((c: any) => (c.mimeType || '').toLowerCase() === 'video/h264');
        if (h264.length > 0) {
          const tx = pc.getTransceivers().find(t => t.sender?.track?.kind === 'video');
          if (tx && typeof tx.setCodecPreferences === 'function') {
            tx.setCodecPreferences(h264);
          }
        }
      }
    } catch { /* ignore */ }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this._waitForIceGathering(pc);

    const whipUrl = getWhipPublishUrl(streamKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const token = localStorage.getItem('livego_auth_token') || '';
      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: pc.localDescription?.sdp || '',
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`WHIP rejeitou (HTTP ${res.status})`);
      await pc.setRemoteDescription({ type: 'answer', sdp: text });
    } finally {
      clearTimeout(timer);
    }
  }

  private async _playHostStream(streamKey: string): Promise<void> {
    const { pc, stream } = await WhepClient.connect(streamKey);
    if (this._destroyed) {
      pc.close();
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    this._playPC = pc;
    this._remoteStream = stream;
  }

  private async _playGuestStream(streamKey: string): Promise<void> {
    const { pc, stream } = await WhepClient.connect(streamKey);
    if (this._destroyed) {
      pc.close();
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    this._playPC = pc;
    this._remoteStream = stream;
  }

  private _waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise(resolve => {
      if (!pc || pc.iceGatheringState === 'complete') { resolve(); return; }
      const timer = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', onGather);
        resolve();
      }, 5000);
      const onGather = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          pc.removeEventListener('icegatheringstatechange', onGather);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', onGather);
    });
  }

  private _cleanup() {
    if (this._publishPC) {
      try { this._publishPC.close(); } catch {}
      this._publishPC = null;
    }
    if (this._playPC) {
      try { this._playPC.close(); } catch {}
      this._playPC = null;
    }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    if (this._remoteStream) {
      this._remoteStream.getTracks().forEach(t => t.stop());
      this._remoteStream = null;
    }
    this._callInfo = null;
  }

  destroy() {
    this._destroyed = true;
    this._cleanup();
    this._listeners = {};
    this._state = 'idle';
  }
}

export const callService = new CallService();
