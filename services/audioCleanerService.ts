// 🔇 Serviço de limpeza de áudio da transmissão — remove "chiado" (hiss),
// zumbido/rumor de fundo e nivelamento dinâmico, usando Web Audio API.
//
// Cadeia aplicada antes de publicar no WebRTC (WHIP):
//   mic → HighPass(110Hz) → LowPass(13kHz) → Compressor → Noise Gate → destino
//
// - HighPass: corta rumble/zumbido de 60Hz/50Hz.
// - LowPass: atenua o "sibilar"/chiado agudo (airband).
// - Compressor: uniformiza volume (sem pump agressivo).
// - Noise Gate (AudioWorklet): silencia o chiado de fundo nas pausas da fala.
//
// Se qualquer etapa falhar, o serviço devolve `null` e o PublishEngine mantém o
// track original — a live nunca deixa de publicar por causa da limpeza.

class AudioCleanerService {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private gateNode: AudioWorkletNode | null = null;
  private fallbackNode: ScriptProcessorNode | null = null;
  private _active = false;

  get active(): boolean {
    return this._active;
  }

  /**
   * Processa o áudio de `mediaStream` e retorna um track de áudio limpo.
   * Retorna `null` se não houver áudio ou se o processamento não for possível.
   */
  async process(mediaStream: MediaStream): Promise<MediaStreamTrack | null> {
    if (typeof window === 'undefined' || !mediaStream) return null;

    const rawTrack = mediaStream.getAudioTracks()[0];
    if (!rawTrack || rawTrack.readyState !== 'live' || rawTrack.enabled === false) {
      return null;
    }

    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;

    try {
      this.destroy();

      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      this.source = ctx.createMediaStreamSource(mediaStream);
      this.destination = ctx.createMediaStreamDestination();

      // 1. High-pass — remove zumbido/rumble (50/60Hz e microfonoquias).
      //    Q=1.0 (mais agressivo que 0.707) para cortar melhor o grave indesejado.
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 120;
      highpass.Q.value = 1.0;

      // 2. Low-pass — corta o chiado/sibilo agudo do microfone.
      //    8kHz remove chiado agudo (hiss 6-12kHz) sem afetar a voz (300Hz-4kHz).
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 8000;
      lowpass.Q.value = 0.7;

      // 3. Compressor — uniformiza dinâmica sem espremer a voz.
      //    Threshold mais alto (-20) para não comprimir tanto e amplificar ruído.
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.15;

      this.source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);

      // 4. Noise Gate — silencia o fundo (chiado) nas pausas.
      const gateOut = await this._connectNoiseGate(compressor);
      if (!gateOut) return null;

      gateOut.connect(this.destination);

      const outTrack = this.destination.stream.getAudioTracks()[0];
      if (!outTrack) return null;

      this._active = true;
      console.log('[AUDIO_CLEANER] ✅ Áudio processado (redução de chiado) ativo');
      return outTrack;
    } catch (err) {
      console.warn('[AUDIO_CLEANER] ⚠️ Não foi possível processar áudio, usando original:', err);
      this.destroy();
      return null;
    }
  }

  /**
   * Conecta o noise gate à cadeia. Usa AudioWorklet (thread dedicada) quando
   * disponível; senão cai para ScriptProcessorNode (fallback universal).
   */
  private async _connectNoiseGate(input: AudioNode): Promise<AudioNode | null> {
    const ctx = this.ctx;
    if (!ctx) return null;

    // 🎯 Caminho principal: AudioWorklet (Safari 14.1+, Chrome, Edge, Firefox).
    if (ctx.audioWorklet) {
      try {
        const moduleUrl = this._getWorkletUrl();
        if (moduleUrl) {
          await ctx.audioWorklet.addModule(moduleUrl);
        }
        const node = new AudioWorkletNode(ctx, 'noise-gate-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          processorOptions: {
            threshold: 0.035,
            attackMs: 4,
            releaseMs: 180,
            holdMs: 60,
          },
        });
        input.connect(node);
        this.gateNode = node;
        return node;
      } catch (err) {
        console.warn('[AUDIO_CLEANER] ⚠️ Worklet indisponível, usando fallback ScriptProcessor:', err);
        this.gateNode = null;
      }
    }

    // 🛟 Fallback universal: ScriptProcessorNode com gate equivalente.
    try {
      const sp = ctx.createScriptProcessor(2048, 1, 1);
      let gain = 1;
      let open = true;
      let hold = 0;
      const threshold = 0.035;
      const attack = 0.3;
      const release = 0.05;
      const holdFrames = 2;

      sp.onaudioprocess = (e: AudioProcessingEvent) => {
        const inData = e.inputBuffer.getChannelData(0);
        const outData = e.outputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inData.length; i++) sum += inData[i] * inData[i];
        const rms = Math.sqrt(sum / inData.length);

        if (rms >= threshold) {
          open = true;
          hold = holdFrames;
        } else if (hold > 0) {
          hold--;
        } else {
          open = false;
        }

        const target = open ? 1 : 0;
        const coeff = target >= gain ? attack : release;
        gain = target + (gain - target) * coeff;

        for (let i = 0; i < inData.length; i++) {
          outData[i] = inData[i] * gain;
        }
      };

      input.connect(sp);
      this.fallbackNode = sp;
      return sp;
    } catch (err) {
      console.warn('[AUDIO_CLEANER] ⚠️ Gate indisponível, seguindo sem gate:', err);
      return input;
    }
  }

  /**
   * Resolve a URL do módulo do worklet. O arquivo vive em public/audio/ e é
   * copiado para a raiz do dist — servido em /audio/noise-gate-processor.js.
   */
  private _getWorkletUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const base = document.querySelector('base')?.getAttribute('href') || '';
    const root = base && base !== './' ? base : '/';
    return `${root}audio/noise-gate-processor.js`;
  }

  destroy(): void {
    this._active = false;

    if (this.fallbackNode) {
      try { this.fallbackNode.onaudioprocess = null; this.fallbackNode.disconnect(); } catch { /* ignore */ }
      this.fallbackNode = null;
    }
    if (this.gateNode) {
      try { this.gateNode.disconnect(); } catch { /* ignore */ }
      this.gateNode = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch { /* ignore */ }
      this.source = null;
    }
    if (this.destination) {
      try { this.destination.stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      try { this.destination.disconnect(); } catch { /* ignore */ }
      this.destination = null;
    }
    if (this.ctx) {
      try { this.ctx.close().catch(() => {}); } catch { /* ignore */ }
      this.ctx = null;
    }
  }
}

export const audioCleaner = new AudioCleanerService();
