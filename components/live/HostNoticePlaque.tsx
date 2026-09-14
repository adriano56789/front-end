import React from 'react';
import { HostNoticeState } from '../../types';

// 🪧 Plaquinha de Notificação do Host — balão de aviso que nasce SEMPRE no
// FINAL do chat (é o último elemento da lista, como uma mensagem nova).
// Gradiente exclusivo (âmbar → rosa → roxo), avatar do host + selo "AVISO oficial".
// A animação de entrada é acionada a cada `pulse` (reprise automática a cada 15s
// enquanto a plaquinha estiver ativa). Cada atualização SUBSTITUI a anterior
// (nunca empilha — renderiza sempre a versão mais recente do estado).
interface HostNoticePlaqueProps {
  notice: HostNoticeState | null;
  pulse?: number;
  showTitle?: boolean;
}

const HostNoticePlaque: React.FC<HostNoticePlaqueProps> = ({ notice, pulse = 0, showTitle = true }) => {
  if (!notice || !notice.active || !notice.text) return null;

  const hostName = notice.hostName || 'Host';
  const avatar = notice.hostAvatar || '';

  return (
    <>
      <style>{`
        @keyframes hostNoticeIn {
          0% { opacity: 0; transform: translateY(12px) scale(0.95); filter: blur(2px); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .host-notice-in {
          animation: hostNoticeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
      `}</style>
      <div key={`host-notice-${pulse}`} className="w-full my-1 select-none host-notice-in">
        <div
          className="rounded-2xl px-4 py-3 shadow-lg border border-white/25"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #a855f7 100%)' }}
        >
          {showTitle && (
            <div className="flex items-center gap-2 mb-1.5">
              {avatar ? (
                <img src={avatar} alt={hostName} className="w-7 h-7 rounded-full object-cover border-2 border-white/50 shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] font-bold text-white/95 tracking-wide uppercase truncate">{hostName}</span>
              <span className="ml-auto text-[9px] font-black text-white bg-black/30 rounded-full px-2 py-0.5 tracking-widest shrink-0">AVISO</span>
            </div>
          )}
          <p className="text-[13px] leading-snug text-white font-semibold break-words">{notice.text}</p>
        </div>
      </div>
    </>
  );
};

export default HostNoticePlaque;