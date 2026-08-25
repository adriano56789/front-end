
import React from 'react';
import { HomeIcon, VideoIcon, MessageIcon, PlayIcon } from './icons';
import { useTranslation } from '../i18n';
import { User } from '../types';

interface FooterNavProps {
  currentUser: User;
  onOpenGoLive: () => void;
  activeTab: 'main' | 'profile' | 'messages' | 'video';
  onNavigate: (tab: 'main' | 'profile' | 'messages' | 'video') => void;
  onOpenChat?: () => void;
  unreadCount?: number;
}

const FooterNav: React.FC<FooterNavProps> = ({ currentUser, onOpenGoLive, activeTab, onNavigate, unreadCount = 0 }) => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex-shrink-0 bg-black border-t border-white/5 select-none-all">
      <div className="flex items-end justify-around h-16 pb-2 text-gray-500 relative">
        {/* AO VIVO (Main) */}
        <button 
          onClick={() => onNavigate('main')} 
          className={`flex flex-col items-center w-1/5 focus:outline-none cursor-pointer border-none bg-transparent ${
            activeTab === 'main' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6 stroke-current fill-none mb-1" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {/* Espaço invisível: mantém a casinha alinhada com os ícones das outras abas */}
          <span className="text-[10px] leading-none opacity-0 select-none">.</span>
        </button>

        {/* VÍDEO */}
        <button 
          onClick={() => onNavigate('video')} 
          className={`flex flex-col items-center w-1/5 focus:outline-none cursor-pointer border-none bg-transparent ${
            activeTab === 'video' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6 stroke-current fill-none mb-1" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">VÍDEO</span>
        </button>

        {/* GO LIVE Play Button (Center) */}
        <div className="w-1/5 flex flex-col items-center justify-end -translate-y-2">
          {/* ✨ Efeito "vivo": pulso vermelho respirando */}
          <style>{`
            @keyframes aovivo-dot {
              0%, 100% { transform: scale(1); box-shadow: 0 0 5px rgba(239,68,68,.9); opacity: 1; }
              50% { transform: scale(1.35); box-shadow: 0 0 11px rgba(239,68,68,1); opacity: .85; }
            }
            @keyframes aovivo-ring {
              0% { transform: scale(1); opacity: .55; }
              100% { transform: scale(2.1); opacity: 0; }
            }
            @keyframes aovivo-halo {
              0%, 100% { transform: scale(.85); opacity: .45; }
              50% { transform: scale(1.3); opacity: .9; }
            }
            @keyframes aovivo-glow {
              0%, 100% { text-shadow: 0 0 6px rgba(239,68,68,.85), 0 0 14px rgba(239,68,68,.45); }
              50% { text-shadow: 0 0 11px rgba(239,68,68,1), 0 0 24px rgba(239,68,68,.7); }
            }
          `}</style>
          {/* Nome AO VIVO EM CIMA do botão GoLive */}
          <span
            className="text-[9px] font-extrabold tracking-[0.14em] leading-none mb-1 select-none"
            style={{
              animation: 'aovivo-glow 1.6s ease-in-out infinite',
              backgroundImage: 'linear-gradient(90deg,#f87171,#fda4af,#f87171)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            AO VIVO
          </span>
          <button
            onClick={onOpenGoLive}
            className="relative w-14 h-14 bg-gradient-to-tr from-[#9c27b0] to-[#e040fb] rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-90 transition-transform cursor-pointer border-none focus:outline-none"
          >
            <svg className="w-6 h-6 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          {/* Bolinha pulsando abaixo do botão */}
          <span className="relative flex items-center justify-center h-2.5 mt-0.5 select-none">
            <span
              className="absolute w-7 h-7 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,.38) 0%, rgba(239,68,68,.12) 55%, transparent 72%)', animation: 'aovivo-halo 1.6s ease-in-out infinite' }}
            />
            <span className="absolute w-[7px] h-[7px] rounded-full bg-red-500/75" style={{ animation: 'aovivo-ring 1.5s ease-out infinite' }} />
            <span className="absolute w-[7px] h-[7px] rounded-full bg-red-500/75" style={{ animation: 'aovivo-ring 1.5s ease-out .55s infinite' }} />
            <span className="w-[5px] h-[5px] rounded-full bg-red-500 relative" style={{ animation: 'aovivo-dot 1.2s ease-in-out infinite' }} />
          </span>
        </div>

        {/* CHAT (Messages) */}
        <button 
          onClick={() => onNavigate('messages')} 
          className={`flex flex-col items-center w-1/5 relative focus:outline-none cursor-pointer border-none bg-transparent ${
            activeTab === 'messages' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6 stroke-current fill-none mb-1" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-1/2 translate-x-3.5 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
          )}
          <span className="text-[10px] font-bold tracking-wider">CHAT</span>
        </button>

        {/* PERFIL (Profile) */}
        <button 
          onClick={() => onNavigate('profile')} 
          className={`flex flex-col items-center w-1/5 focus:outline-none cursor-pointer border-none bg-transparent ${
            activeTab === 'profile' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className={`relative w-6 h-6 mb-1 rounded-full p-[1px] border ${activeTab === 'profile' ? 'border-white' : 'border-gray-500'}`}>
            {currentUser.avatarUrl ? (
              <img key={currentUser.avatarUrl} src={currentUser.avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">
                  {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-wider">PERFIL</span>
        </button>
      </div>
    </footer>
  );
};

export default FooterNav;
