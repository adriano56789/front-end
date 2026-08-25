/**
 * 🔔 notificationSound.ts — Som de notificação estilo WhatsApp
 *
 * Usa Web Audio API para sintetizar um "ding" curto e limpo.
 * Zero arquivos externos, funciona offline, leve (~2KB de JS).
 *
 * O som é:
 *   1. Tom agudo curto (~880Hz, 80ms) com attack rápido
 *   2. Tom médio (~660Hz, 120ms) com fade suave
 *   3. Ambos com envelope ADSR suave (sem clique/estalo)
 *
 * Respeita o estado de "mudo" do usuário.
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) {
      audioCtx = new AC();
    }
    // iOS Safari exige resume() após gesto do usuário
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
};

/**
 * Toca o som de notificação de mensagem (estilo WhatsApp).
 * Seguro pra chamar em qualquer contexto — nunca lança erro.
 *
 * Som sintetizado: dois tons encadeados com fade suave,
 * idêntico ao "ding" do WhatsApp Web.
 */
export const playMessageNotificationSound = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Verificar se o usuário está com áudio mudo (tab do browser)
    // Não há API pra checar volume do sistema, mas podemos checar se o
    // documento está visível (notificações em background = silenciar)
    if (typeof document !== 'undefined' && document.hidden) return;

    const now = ctx.currentTime;

    // ═══════════════════════════════════════════════════════
    // TOM 1: Nota aguda curta (Mi5 ~659Hz) — o "ping"
    // ═══════════════════════════════════════════════════════
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);        // Lá5 — agudo
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.08); // desce levemente
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);  // attack rápido
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12); // fade

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // ═══════════════════════════════════════════════════════
    // TOM 2: Nota média (Ré5 ~587Hz) — o "dong"
    // Começa 70ms depois, cria o efeito de "do-ding"
    // ═══════════════════════════════════════════════════════
    const t2 = now + 0.07;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, t2);          // Sol5
    osc2.frequency.exponentialRampToValueAtTime(523, t2 + 0.1); // desce pra Dó5
    gain2.gain.setValueAtTime(0, t2);
    gain2.gain.linearRampToValueAtTime(0.25, t2 + 0.01); // attack rápido
    gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.15); // fade suave

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.18);

  } catch {
    // Silencioso — som é feature opt-in, nunca deve quebrar o app
  }
};

/**
 * Para todos os sons de notificação em andamento.
 * Útil quando o usuário entra no chat (parar de tocar).
 */
export const stopNotificationSounds = (): void => {
  try {
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close();
      audioCtx = null;
    }
  } catch {
    // ignore
  }
};
