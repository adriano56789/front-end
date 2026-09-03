/**
 * VoiceAudioService — WebRTC mesh audio para salas de voz.
 * Cada participante no palco captura microfone e conecta RTCPeerConnection
 * com TODOS os outros participantes (mesh, máx. 7 pessoas).
 *
 * Fluxo:
 *   1. Usuário sobe no palco → start() → captura microfone
 *   2. Para cada par existente no palco → connectToPeer() → offer/answer/ICE
 *   3. Usuário novo sobe → recebe offers de todos os existentes
 *   4. Mute → desabilita track local (outros veem "mudo" mas não perdem conn)
 *   5. Desce do palco → stop() → fecha tudo
 */

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

interface VoiceAudioCallbacks {
    onRemoteAudio?: (peerId: string, stream: MediaStream) => void;
    onRemoteAudioRemoved?: (peerId: string) => void;
    onSpeakingChange?: (speaking: boolean) => void;
}

export class VoiceAudioService {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private remoteStreams: Map<string, MediaStream> = new Map();
    private audioContext: AudioContext | null = null;
    private speakingInterval: ReturnType<typeof setInterval> | null = null;
    private _isMuted = false;
    private roomId = '';
    private userId = '';
    private emitFn: ((event: string, data: any) => void) | null = null;
    private onEventFn: ((event: string, handler: (data: any) => void) => (() => void)) | null = null;
    private cleanupFns: (() => void)[] = [];
    private callbacks: VoiceAudioCallbacks = {};

    get isMuted() { return this._isMuted; }
    get hasLocalStream() { return !!this.localStream; }

    setCallbacks(cb: VoiceAudioCallbacks) {
        this.callbacks = cb;
    }

    /**
     * Iniciar captura de microfone e preparar socket para sinalização.
     * Não conecta a ninguém — chame connectToPeer() para cada par.
     */
    async start(
        roomId: string,
        userId: string,
        emitFn: (event: string, data: any) => void,
        onEventFn: (event: string, handler: (data: any) => void) => (() => void),
    ): Promise<MediaStream> {
        this.roomId = roomId;
        this.userId = userId;
        this.emitFn = emitFn;
        this.onEventFn = onEventFn;

        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 48000,
            },
            video: false,
        });

        this._isMuted = false;
        this.startSpeakingDetection();
        this.setupSignalingListeners();

        return this.localStream;
    }

    /**
     * Conectar a um par específico (cria offer e envia).
     */
    async connectToPeer(peerId: string): Promise<void> {
        if (peerId === this.userId) return;
        if (this.peerConnections.has(peerId)) return;
        if (!this.localStream || !this.emitFn) return;

        const pc = this.createPC(peerId);
        this.peerConnections.set(peerId, pc);

        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream!);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.emitFn('voice_webrtc_offer', {
            roomId: this.roomId,
            from: this.userId,
            to: peerId,
            sdp: offer,
        });
    }

    /**
     * Desconectar de um par específico.
     */
    disconnectFromPeer(peerId: string): void {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(peerId);
        }
        const stream = this.remoteStreams.get(peerId);
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            this.remoteStreams.delete(peerId);
            this.callbacks.onRemoteAudioRemoved?.(peerId);
        }
    }

    /**
     * Toggle mute do microfone local.
     */
    setMuted(muted: boolean): void {
        this._isMuted = muted;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }

    /**
     * Parar tudo: fechar microfone, connections, listeners.
     */
    stop(): void {
        this.stopSpeakingDetection();

        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        this.remoteStreams.forEach(stream => {
            stream.getTracks().forEach(t => t.stop());
        });
        this.remoteStreams.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        this.cleanupFns.forEach(fn => fn());
        this.cleanupFns = [];
        this._isMuted = false;
    }

    // ─── Internos ───

    private createPC(peerId: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate && this.emitFn) {
                this.emitFn('voice_webrtc_ice', {
                    roomId: this.roomId,
                    from: this.userId,
                    to: peerId,
                    candidate: event.candidate,
                });
            }
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                let remoteStream = this.remoteStreams.get(peerId);
                if (!remoteStream) {
                    remoteStream = new MediaStream();
                    this.remoteStreams.set(peerId, remoteStream);
                }
                event.streams[0].getAudioTracks().forEach(track => {
                    if (!remoteStream!.getTracks().find(t => t.id === track.id)) {
                        remoteStream!.addTrack(track);
                    }
                });
                this.callbacks.onRemoteAudio?.(peerId, remoteStream);
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn(`[VoiceAudio] Connection to ${peerId} ${pc.iceConnectionState}`);
            }
        };

        return pc;
    }

    private setupSignalingListeners(): void {
        if (!this.onEventFn) return;

        const offOffer = this.onEventFn('voice_webrtc_offer', async (data: any) => {
            if (data.roomId !== this.roomId || data.to !== this.userId) return;
            if (!this.localStream || !this.emitFn) return;

            const peerId = data.from;
            let pc = this.peerConnections.get(peerId);
            if (!pc) {
                pc = this.createPC(peerId);
                this.peerConnections.set(peerId, pc);

                this.localStream.getTracks().forEach(track => {
                    pc!.addTrack(track, this.localStream!);
                });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            this.emitFn('voice_webrtc_answer', {
                roomId: this.roomId,
                from: this.userId,
                to: peerId,
                sdp: answer,
            });
        });

        const offAnswer = this.onEventFn('voice_webrtc_answer', async (data: any) => {
            if (data.roomId !== this.roomId || data.to !== this.userId) return;
            const pc = this.peerConnections.get(data.from);
            if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
        });

        const offIce = this.onEventFn('voice_webrtc_ice', async (data: any) => {
            if (data.roomId !== this.roomId || data.to !== this.userId) return;
            const pc = this.peerConnections.get(data.from);
            if (pc && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        this.cleanupFns.push(offOffer, offAnswer, offIce);
    }

    private startSpeakingDetection(): void {
        if (!this.localStream) return;

        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let wasSpeaking = false;

        this.speakingInterval = setInterval(() => {
            if (this._isMuted || !this.localStream) {
                if (wasSpeaking) {
                    wasSpeaking = false;
                    this.callbacks.onSpeakingChange?.(false);
                }
                return;
            }
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const speaking = avg > 15;
            if (speaking !== wasSpeaking) {
                wasSpeaking = speaking;
                this.callbacks.onSpeakingChange?.(speaking);
            }
        }, 200);
    }

    private stopSpeakingDetection(): void {
        if (this.speakingInterval) {
            clearInterval(this.speakingInterval);
            this.speakingInterval = null;
        }
    }
}

export default VoiceAudioService;
