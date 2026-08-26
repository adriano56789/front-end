
import React from 'react';
import { ToastData, ToastType } from '../types';
import { CloseIcon, InfoIcon, CheckCircleIcon, WarningTriangleIcon } from './icons';

interface ToastProps {
  data: ToastData;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ data, onClose }) => {
  const config = {
    [ToastType.Error]: {
      bgColor: 'bg-red-800/80 border-red-700/80',
      textColor: 'text-red-200',
      icon: <WarningTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
    },
    [ToastType.Success]: {
      bgColor: 'bg-green-800/80 border-green-700/80',
      textColor: 'text-green-200',
      icon: <CheckCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
    },
    [ToastType.Info]: {
      bgColor: 'bg-blue-800/80 border-blue-700/80',
      textColor: 'text-blue-200',
      icon: <InfoIcon className="w-5 h-5 mr-3 flex-shrink-0" />
    },
  }[data.type] ?? {
    bgColor: 'bg-blue-800/80 border-blue-700/80',
    textColor: 'text-blue-200',
    icon: <InfoIcon className="w-5 h-5 mr-3 flex-shrink-0" />
  };

  // 🖼️ Notificação com foto de perfil (ex.: "X entrou na sala") — estilo app de
  // mensagens: avatar circular + título em destaque + corpo. Usa o fundo escuro
  // translúcido do banner in-app em vez do card colorido padrão.
  if (data.avatar || data.title) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-[#121218]/95 backdrop-blur-xl shadow-[0_10px_36px_rgba(0,0,0,0.5)] min-w-[260px] max-w-sm">
        {data.avatar ? (
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-black ring-2 ring-white/15">
              <img
                src={data.avatar}
                alt={data.title || 'Usuário'}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget).style.display = 'none'; }}
              />
            </div>
            {/* Pontinho verde de "entrou agora" */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#121218] animate-pulse" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 flex-shrink-0 overflow-hidden">
            <img src="/android-chrome-192x192.png" alt="" className="w-7 h-7 object-cover rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {data.title && (
            <p className="text-white font-semibold text-sm leading-tight truncate">{data.title}</p>
          )}
          <p className={`text-[13px] leading-snug ${data.title ? 'text-white/70' : config.textColor}`}>
            {data.message}
          </p>
        </div>

        <button onClick={onClose} className="ml-1 text-gray-400/70 hover:text-gray-200 flex-shrink-0 p-0.5 rounded-full hover:bg-white/10 transition-colors">
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border backdrop-blur-sm ${config.bgColor} ${config.textColor}`}>
      <div className="flex items-center">
        {config.icon}
        <p className="text-sm">{data.message}</p>
      </div>
      <button onClick={onClose} className="ml-4 text-gray-400/70 hover:text-gray-200">
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;