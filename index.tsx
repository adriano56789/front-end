/**
 * ═══════════════════════════════════════════════════════
 * 🛡️ GLOBAL ERROR SUPPRESSION PARA EXTENSÕES DO CHROME
 * ═══════════════════════════════════════════════════════
 * Erros de extensões (Grammarly, LastPass, etc.) ocorrem
 * quando o content script tenta se comunicar com o background
 * script da extensão e este não está disponível.
 *
 * Estes handlers DEVEM estar no topo do entry point para
 * capturar os erros ANTES de qualquer outro código carregar,
 * garantindo que não poluam o console nem interrompam fluxos
 * como GoLive (getUserMedia).
 *
 * Erros suprimidos:
 * - Receiving end does not exist → extensão sem background
 * - content.js / polyfill.js → scripts injetados por extensões
 * - useCache → erro comum do Grammarly
 * ═══════════════════════════════════════════════════════
 */

// 🛡️ Handler global de erros não capturados (ErrorEvent)
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  const filename = event.filename || '';
  if (
    msg.includes('Receiving end does not exist') ||
    msg.includes('useCache') ||
    filename.includes('content.js') ||
    filename.includes('polyfill.js') ||
    msg.includes('content.js') ||
    msg.includes('polyfill.js')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
}, true); // ← capture phase para interceptar antes de qualquer handler da página

// 🛡️ Handler global de promessas rejeitadas não capturadas
window.addEventListener('unhandledrejection', (event) => {
  // Normalizar o reason para string
  let reasonStr = '';
  try {
    if (event.reason) {
      reasonStr = typeof event.reason === 'string' ? event.reason :
                  event.reason instanceof Error ? event.reason.message :
                  event.reason.message || String(event.reason);
    }
  } catch {
    reasonStr = String(event.reason || '');
  }
  
  if (
    reasonStr.includes('Receiving end does not exist') ||
    reasonStr.includes('useCache') ||
    reasonStr.includes('content.js') ||
    reasonStr.includes('polyfill.js')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
}, true); // ← capture phase

// ═══════════════════════════════════════════════════════
// React entry point
// ═══════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
