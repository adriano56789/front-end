// 🔇 Noise Gate AudioWorklet — corta o chiado/fundo quando ninguém está falando.
// Processa em thread separada (não trava a UI nem o WebRTC).
// Algoritmo: RMS de 10ms com hold + attack/release suavizados (sem clique).
class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.threshold = opts.threshold != null ? opts.threshold : 0.035;
    this.attackMs = opts.attackMs != null ? opts.attackMs : 4;
    this.releaseMs = opts.releaseMs != null ? opts.releaseMs : 180;
    this.holdMs = opts.holdMs != null ? opts.holdMs : 60;

    this.gain = 1.0;
    this.open = true;
    this.holdCount = 0;

    this.attackCoeff = Math.exp(-1 / ((this.attackMs / 1000) * sampleRate));
    this.releaseCoeff = Math.exp(-1 / ((this.releaseMs / 1000) * sampleRate));
    this.holdFrames = Math.max(0, Math.round((this.holdMs / 1000) * sampleRate));
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output || input.length === 0 || output.length === 0) return true;

    const frames = Math.min(input[0].length, output[0].length);
    const numChannels = Math.min(input.length, output.length);

    let rms = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const inCh = input[ch];
      if (!inCh) continue;
      let sum = 0;
      for (let i = 0; i < frames; i++) sum += inCh[i] * inCh[i];
      rms = Math.max(rms, Math.sqrt(sum / frames));
    }

    if (rms >= this.threshold) {
      this.open = true;
      this.holdCount = this.holdFrames;
    } else if (this.holdCount > 0) {
      this.holdCount--;
    } else {
      this.open = false;
    }

    const target = this.open ? 1.0 : 0.0;
    const coeff = target >= this.gain ? this.attackCoeff : this.releaseCoeff;
    this.gain = target + (this.gain - target) * coeff;

    for (let ch = 0; ch < numChannels; ch++) {
      const inCh = input[ch];
      const outCh = output[ch];
      if (!inCh || !outCh) continue;
      for (let i = 0; i < frames; i++) {
        outCh[i] = inCh[i] * this.gain;
      }
    }

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
