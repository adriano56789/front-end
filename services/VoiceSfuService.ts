/**
 * VoiceSfuService — Áudio da sala de voz via SRS (SFU) WebRTC.
 *
 * Substitui o antigo mesh P2P (VoiceAudioService), que falhava atrás de
 * NAT simétrico/redes móveis porque dependia de STUN puro e peer-to-peer.
 *
 * Aqui cada pessoa no palco PUBLICA o microfone via WHIP como um stream
 * único `voice_{roomId}_{userId}` no SRS, e todos que precisam ouvir fazem
 * WHEP play desse stream. O SRS tem `rtc_server.candidate` público
 * configurado, então o tráfego passa pelo servidor central e funciona em
 * qualquer rede (sem TURN, sem P2P).
 *
 *  - Quem fala (host + co-hosts):  WHIP publica o microfone.
 *  - Todos (falantes e plateia):   WHEP reproduz o áudio dos outros falantes
 *    (cada falante NÃO ouve a própria voz para evitar eco).
 */

import { audioCleaner } from './audioCleanerService';

const WHIP_HTTP_TIMEOUT = 20000;
const ICE_GATHER_TIMEOUT = 5000;

interface VoiceSfuCallbacks {
    onSpeakingChange?: (speaking: boolean) => void;
    onRemoteAudio?: (peerId: string, stream: MediaStream) => void;
    onRemoteAudioRemoved?: (peerId: string) => void;
}

export class VoiceSfuService {
    private callbacks: VoiceSfuCallbacks = {};

    private roomId = '';
    private userId = '';
    private streamKey = '';

    private localStream: MediaStream | null = null;
    private localAudioTrack: MediaStreamTrack | null = null;

    /** WHIP (publish) — 1 conexão para publicar a própria voz */
    private whipPC: RTCPeerConnection | null = null;
    private whipSessionId = '';

    /** WHEP (play) — 1 conexão por stream de outro falante */
    private whepMap: Map<string, { pc: RTCPeerConnection; stream: MediaStream; el: HTMLAudioElement | null }> = new Map();

    private audioContext: AudioContext | null = null;
    private speakingInterval: ReturnType<typeof setInterval> | null = null;
    private _isMuted = false;

    private containerEl: HTMLElement | null = null;

    get isMuted() { return this._isMuted; }
    get hasLocalStream() { return !!this.localStream; }

    setCallbacks(cb: VoiceSfuCallbacks) {
        this.callbacks = cb;
    }

    /**
     * Captura o microfone (só se `publish=true`, ou seja, quem está no palco)
     * e, se for o caso, publica via WHIP no SRS como `voice_{roomId}_{userId}`.
     * Quem está na plateia também chama start() com publish=false para poder
     * reproduzir o áudio dos falantes (WHEP), sem publicar a própria voz.
     */
    async start(roomId: string, userId: string, publish: boolean): Promise<MediaStream | null> {
        this.roomId = roomId;
        this.userId = userId;
        this.streamKey = this.buildStreamKey(roomId, userId);

        this.ensureContainer();

        if (!publish) {
            return null;
        }

        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                // 🔊 AEC3 (Acoustic Echo Cancellation) — cancela o eco do
                // alto-falante captado pelo microfone. Constraints em modo
                // { ideal:true } para o engine ativar e manter ligado.
                echoCancellation: { ideal: true },
                noiseSuppression: { ideal: true },
                autoGainControl: { ideal: true },
                channelCount: { ideal: 1 },
                sampleRate: { ideal: 48000 },
            },
            video: false,
        });

        // 🔍 Diagnóstico: confirmar que o AEC realmente está ativo no track
        try {
            const tr = this.localStream.getAudioTracks()[0];
            const s = tr?.getSettings?.();
            console.log(
                `[VoiceSFU] AEC track: echoCancellation=${s?.echoCancellation} ` +
                `noiseSuppression=${s?.noiseSuppression} autoGainControl=${s?.autoGainControl} ` +
                `deviceId=${s?.deviceId ? '' + s.deviceId : 'default'}`
            );
        } catch { /* settings indisponíveis */ }

        this._isMuted = false;
        this.startSpeakingDetection();

        await this.publish();

        return this.localStream;
    }

    /**
     * Reproduz o áudio de outro falante do palco via WHEP (SFU).
     * Ignora a própria voz (evita eco).
     */
    async playPeerStream(peerId: string): Promise<void> {
        if (!peerId || peerId === this.userId) return;
        if (this.whepMap.has(peerId)) return;

        const peerKey = this.buildStreamKey(this.roomId, peerId);
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            bundlePolicy: 'max-bundle',
        } as RTCConfiguration);
        const stream = new MediaStream();
        const entry = { pc, stream, el: null as HTMLAudioElement | null };
        this.whepMap.set(peerId, entry);

        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
            const s = event.streams && event.streams[0] ? event.streams[0] : stream;
            if (typeof this.callbacks.onRemoteAudio === 'function') {
                this.callbacks.onRemoteAudio(peerId, s);
            }
            this.attachAudio(peerId, s);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitForIceGathering(pc);

        const wheelUrl = this.getWhepUrl(peerKey);
        const answer = await this.postWhep(wheelUrl, pc.localDescription?.sdp || '');
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn(`[VoiceSFU] WHEP ${peerId} ${pc.iceConnectionState}`);
            }
        };
    }

    stopPeerStream(peerId: string): void {
        const entry = this.whepMap.get(peerId);
        if (!entry) return;
        if (entry.pc && entry.pc.connectionState !== 'closed') {
            entry.pc.ontrack = null;
            entry.pc.close();
        }
        entry.stream.getTracks().forEach(t => t.stop());
        if (entry.el) {
            entry.el.pause();
            entry.el.srcObject = null;
            entry.el.remove();
        }
        this.whepMap.delete(peerId);
        this.callbacks.onRemoteAudioRemoved?.(peerId);
    }

    setMuted(muted: boolean): void {
        this._isMuted = muted;
        if (this.localAudioTrack) {
            this.localAudioTrack.enabled = !muted;
        }
    }

    async stop(): Promise<void> {
        this.stopSpeakingDetection();

        // WHEP plays
        this.whepMap.forEach(entry => {
            if (entry.pc && entry.pc.connectionState !== 'closed') {
                entry.pc.ontrack = null;
                entry.pc.close();
            }
            entry.stream.getTracks().forEach(t => t.stop());
            if (entry.el) {
                entry.el.pause();
                entry.el.srcObject = null;
                entry.el.remove();
            }
        });
        this.whepMap.clear();

        // WHIP publish — stop() no SRS (on_unpublish/delete session)
        if (this.whipPC && this.whipPC.connectionState !== 'closed') {
            try { this.whipPC.close(); } catch { /* ignore */ }
        }
        this.whipPC = null;
        if (this.whipSessionId) {
            try { await this.deleteWhip(this.whipSessionId); } catch { /* ignore */ }
        }
        this.whipSessionId = '';

        // microfone
        if (this.localAudioTrack) {
            this.localAudioTrack.stop();
            this.localAudioTrack = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        this.cleanupContainer();
        this._isMuted = false;
    }

    // ─── WHIP (publish) ───

    private async publish(): Promise<void> {
        if (!this.localStream) return;
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) return;

        // 🔇 Limpa o microfone (highpass/lowpass/compressor + noise gate) antes
        // de publicar — mesmo processamento da transmissão. Reduz a captação de
        // eco/ruído ambiente, o que diminui a realimentação quando há mais de um
        // aparelho próximo na mesma sala.
        let trackToPublish = audioTracks[0];
        try {
            const cleaned = await audioCleaner.process(this.localStream);
            if (cleaned) trackToPublish = cleaned;
        } catch { /* mantém original */ }
        this.localAudioTrack = trackToPublish;

        const pc = new RTCPeerConnection({ iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ] } as RTCConfiguration);
        this.whipPC = pc;

        pc.addTrack(this.localAudioTrack, this.localStream);
        // apenas áudio — sem track de vídeo permite publicar mudo/eco-livre

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitForIceGathering(pc);

        const whipUrl = this.getWhipUrl(this.streamKey);
        const result = await this.postWhip(whipUrl, pc.localDescription?.sdp || '');
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: result.sdp }));
        this.whipSessionId = result.sessionId || '';

        console.log(`[VoiceSFU] ✅ WHIP publicado ${this.streamKey} (session=${this.whipSessionId})`);

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn(`[VoiceSFU] WHIP ${pc.iceConnectionState} (publish pode ter caído)`);
            }
        };
    }

    // ─── Helpers de áudio ───

    private attachAudio(peerId: string, stream: MediaStream): void {
        const entry = this.whepMap.get(peerId);
        let el = entry?.el ?? null;
        if (!el && this.containerEl) {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.playsInline = true;
            audio.style.display = 'none';
            // 🔊 Volume de saída moderado — reduz a realimentação (eco) quando
            // há dois aparelhos próximos na mesma sala, sem prejudicar a audição.
            audio.volume = 0.8;
            this.containerEl.appendChild(audio);
            el = audio;
            if (entry) entry.el = audio;
        }
        if (el) {
            el.srcObject = stream;
            el.play().catch(() => {});
        }
    }

    private ensureContainer(): void {
        if (this.containerEl) return;
        const div = document.createElement('div');
        div.id = 'voice-sfu-audio-out';
        div.style.display = 'none';
        document.body.appendChild(div);
        this.containerEl = div;
    }

    private cleanupContainer(): void {
        if (this.containerEl) {
            this.containerEl.remove();
            this.containerEl = null;
        }
    }

    // ─── Detecção de fala (local) ───

    private startSpeakingDetection(): void {
        if (!this.localStream) return;
        try {
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
                    if (wasSpeaking) { wasSpeaking = false; this.callbacks.onSpeakingChange?.(false); }
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
        } catch (err) {
            console.warn('[VoiceSFU] Falha na detecção de fala:', err);
        }
    }

    private stopSpeakingDetection(): void {
        if (this.speakingInterval) {
            clearInterval(this.speakingInterval);
            this.speakingInterval = null;
        }
    }

    // ─── URL builders / HTTP ───

    private buildStreamKey(roomId: string, userId: string): string {
        return `voice_${roomId}_${userId}`;
    }

    private getWhipUrl(streamKey: string): string {
        const normalized = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
        const base = import.meta.env.VITE_SRS_WHIP_URL || `/api/rtc/v1/whip`;
        return `${base.replace(/\/+$/, '')}/?app=live&stream=${encodeURIComponent(normalized)}`;
    }

    private getWhepUrl(streamKey: string): string {
        const normalized = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
        const base = import.meta.env.VITE_SRS_WHEP_URL || `/api/rtc/v1/whep`;
        return `${base.replace(/\/+$/, '')}/?app=live&stream=${encodeURIComponent(normalized)}`;
    }

    private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
        return new Promise(resolve => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const timer = setTimeout(() => {
                pc.removeEventListener('icegatheringstatechange', onGather);
                resolve();
            }, ICE_GATHER_TIMEOUT);
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

    private async postWhip(url: string, sdp: string): Promise<{ code: number; sdp: string; sessionId: string }> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WHIP_HTTP_TIMEOUT);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: sdp,
                signal: controller.signal,
            });
            const text = await res.text();
            if (!res.ok || res.status < 200 || res.status >= 300) {
                throw new Error(`WHIP rejeitou (HTTP ${res.status})${text ? ': ' + text.slice(0, 200) : ''}`);
            }
            let sessionId = '';
            const location = res.headers.get('location');
            if (location) {
                const parts = location.split('/');
                sessionId = parts[parts.length - 1] || '';
            }
            return { code: 0, sdp: text, sessionId };
        } catch (err: any) {
            if (err?.name === 'AbortError') throw new Error('WHIP timeout');
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    private async postWhep(url: string, sdp: string): Promise<string> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WHIP_HTTP_TIMEOUT);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: sdp,
                signal: controller.signal,
            });
            const text = await res.text();
            if (res.status < 200 || res.status >= 300) {
                throw new Error(`WHEP rejeitou (HTTP ${res.status})${text ? ': ' + text.slice(0, 200) : ''}`);
            }
            return text;
        } catch (err: any) {
            if (err?.name === 'AbortError') throw new Error('WHEP timeout');
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    private async deleteWhip(sessionId: string): Promise<void> {
        const url = `/api/rtc/v1/whip/${encodeURIComponent(sessionId)}`;
        await fetch(url, { method: 'DELETE' }).catch(() => {});
    }
}

export default VoiceSfuService;
