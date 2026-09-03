import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallBanner: React.FC = () => {
  const { showBanner, promptInstall, dismissBanner, isMobile } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  // O banner só renderiza quando showBanner = true, que ocorre APENAS quando:
  // beforeinstallprompt foi capturado + é mobile + não instalado + não dispensado
  if (!showBanner || !isMobile) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up">
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 25px rgba(139, 92, 246, 0.6); }
        }
        .pwa-banner {
          animation: slide-up 0.5s ease-out, pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="pwa-banner bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-5 shadow-2xl border border-white/10 backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={dismissBanner}
          className="absolute -top-2 -right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors border border-white/10 z-10"
          aria-label="Fechar"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
          </svg>
        </button>

        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base leading-tight mb-1">
              📲 Instalar Aplicativo
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              Instale o LiveGo na sua tela inicial e tenha acesso rápido com notificações em tempo real!
            </p>

            {/* Benefits row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded-full">
                ⚡ Rápido
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded-full">
                📺 Tela cheia
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded-full">
                🔔 Notificações
              </span>
            </div>

            {/* Install Button - sempre disponível porque o banner só aparece quando beforeinstallprompt foi capturado */}
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {installing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Instalando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                  </svg>
                  Instalar Agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
