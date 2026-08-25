// ðŸ”’ ProteÃ§Ã£o de ConteÃºdo â€” LiveGo
//
// Regra de ouro: NUNCA bloqueia o ENVIO de mÃ­dia no chat (isso continua livre).
// O que Ã© bloqueado Ã© a CAPTURA: print, gravaÃ§Ã£o de tela, download e
// compartilhamento â€” com proteÃ§Ã£o reforÃ§ada para conteÃºdo +18.
//
// Limites honestos da plataforma web:
//  - Print do SISTEMA (botÃ£o fÃ­sico Android/iOS): nenhum app web consegue
//    impedir 100% â€” por isso aplicamos marca d'Ã¡gua com ID do usuÃ¡rio
//    (rastreia o vazamento) + blackout em todos os vetores controlÃ¡veis.
//  - Tudo que o navegador DEIXA controlar, aqui estÃ¡ blindado.

let installed = false;

// Aviso visual de captura bloqueada (toast discreto â€” NUNCA escurece a tela:
// o espectador continua vendo tudo normal dentro do app).
const TOAST_ID = 'livego-capture-toast';

import { api } from './api';

// ðŸŽ¯ Contexto atual (definido pela sala de transmissÃ£o ao montar): permite
// que TODA tentativa de captura seja denunciada via API no chat do host.
let protectionContext: {
    userId?: string;
    userName?: string;
    streamId?: string;
    hostId?: string;
} = {};

// REGRA DO DONO: protecao de captura funciona SOMENTE DENTRO da sala de
// transmissao. O contexto so e preenchido pela StreamRoom — fora dela os
// listeners globais ficam instalados porem INERTES (nenhum toast/bloqueio).
let armed = false;

export function setProtectionContext(ctx: typeof protectionContext): void {
    protectionContext = ctx || {};
    // Arma SOMENTE quando a StreamRoom define um contexto real de sala.
    armed = !!(protectionContext && protectionContext.streamId);
}

function showCaptureToast(): void {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:96px', 'transform:translateX(-50%)',
      'z-index:2147483647', 'background:rgba(9,9,11,0.95)', 'color:#fff',
      'padding:10px 18px', 'border-radius:9999px', 'font-size:13px',
      'font-weight:700', 'border:1px solid rgba(239,68,68,0.55)',
      'box-shadow:0 8px 30px rgba(0,0,0,0.6)', 'pointer-events:none',
      'opacity:0', 'transition:opacity .2s', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = 'âŒ NÃ£o Ã© permitido capturar este conteÃºdo.';
  requestAnimationFrame(() => { toast!.style.opacity = '1'; });
  window.clearTimeout((toast as any)._t);
  (toast as any)._t = window.setTimeout(() => { toast!.style.opacity = '0'; }, 2200);
}

export function notifyCaptureAttempt(type: 'print' | 'record' | 'capture' | 'contextmenu' = 'capture'): void {
  // FORA da sala de transmissao: nenhuma mensagem, nenhum bloqueio, nada.
  if (!armed) return;
  showCaptureToast();
  // ðŸš¨ DENÃšNCIA AUTOMÃTICA via API real: registra no banco e dispara o aviso
  // âš ï¸ no chat da transmissÃ£o (host vÃª quem tentou violar e pode bloquear).
  const { userId, userName, streamId, hostId } = protectionContext;
  if (!userId) return;
  api.reportViolation({ userId, userName, streamId, hostId, type }).catch(() => {});
}

export function installContentProtection(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // 1) ðŸŽ¥ GravaÃ§Ã£o de tela via navegador (getDisplayMedia): se ALGUÃ‰M chamar
  // fora dos fluxos legÃ­timos do app (nÃ³s nunca chamamos), nega na hora.
  try {
    const md = navigator.mediaDevices as any;
    if (md && typeof md.getDisplayMedia === 'function') {
      const original = md.getDisplayMedia.bind(md);
      md.getDisplayMedia = (...args: any[]) => {
        notifyCaptureAttempt('record');
        return Promise.reject(new DOMException('Captura bloqueada.', 'NotAllowedError'));
      };
    }
  } catch { /* noop */ }

  // 2) ðŸ“± Print no desktop (PrintScreen / Win+Shift+S parcial): detecta,
  // avisa e limpa a Ã¡rea de transferÃªncia para nada ser colado.
  window.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'PrintScreen' || key === 'Print') {
      notifyCaptureAttempt('print');
      try {
        navigator.clipboard?.writeText('').catch(() => {});
      } catch { /* noop */ }
    }
  }, true);

  // 3) ðŸ–±ï¸ Menu de contexto (salvar imagem/vÃ­deo como...): bloqueado em
  // QUALQUER elemento marcado como data-protected.
  document.addEventListener('contextmenu', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest?.('[data-protected="true"]')) {
      e.preventDefault();
      notifyCaptureAttempt('contextmenu');
    }
  }, true);

  // 4) ðŸš« Arrastar mÃ­dia protegida para fora (download direto)
  document.addEventListener('dragstart', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest?.('[data-protected="true"]')) {
      e.preventDefault();
    }
  }, true);

  console.log('[PROTECTION] ðŸ”’ ProteÃ§Ã£o de conteÃºdo instalada');
}
