import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'livego_download_app_banner_shown';
const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || 'https://livego.store/download/app.apk';

/**
 * Detecta se o app já está instalado no dispositivo
 * - iOS: navigator.standalone (PWA salvo na tela inicial)
 * - Android: display-mode: standalone
 * - Se roda em app nativo (WebView), as APIs de instalação existem
 */
function isAppInstalled(): boolean {
  // iOS PWA salvo na tela inicial
  if ((window.navigator as any).standalone === true) return true;
  // Android / Chrome PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Rodando dentro de WebView (wrapper nativo)
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('livego') || ua.includes('webview') || ua.includes('wv')) return true;
  // Se já está em um contexto de aplicativo instalado (Android)
  if ((window as any).Android !== undefined) return true;
  return false;
}

const DownloadAppBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Injetar animação slide-up dinamicamente
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-slide-up {
        animation: slide-up 0.5s ease-out;
      }
    `;
    document.head.appendChild(styleEl);

    const hasSeenBanner = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenBanner && !isAppInstalled()) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => {
        clearTimeout(timer);
        styleEl.remove();
      };
    }

    return () => styleEl.remove();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleDownload = () => {
    window.open(APK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-slide-up">
      <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-5 shadow-2xl border border-white/10 backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors border border-white/10"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
          </svg>
        </button>

        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-2xl font-black text-white">L</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base leading-tight mb-1">
              Baixe o App Oficial
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              Tenha a melhor experiência no seu celular! Notificações em tempo real, transmissão com mais qualidade e muito mais.
            </p>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
              Baixar APK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadAppBanner;
