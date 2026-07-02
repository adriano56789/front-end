
import React, { useState } from 'react';
import { Streamer } from '../types';
import { ClockIcon, PlayIcon, PlusIcon, LiveIndicatorIcon } from './icons';
import { useTranslation } from '../i18n';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStream: (streamer: Streamer) => void;
  streamers: Streamer[];
  onOpenLiveHistory: () => void;
}

interface StreamerItemProps {
    streamer: Streamer;
    isFollowed: boolean;
    onFollow: (streamerId: string) => void;
    onSelectStream: (streamer: Streamer) => void;
}

const StreamerItem: React.FC<StreamerItemProps> = ({ streamer, isFollowed, onFollow, onSelectStream }) => (
  <div 
    className="flex items-center p-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0 group relative" 
    onClick={() => onSelectStream(streamer)}
  >
    {/* Avatar / Thumbnail */}
    <div className="relative flex-shrink-0 mr-4">
      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors bg-gray-800">
        <img 
            src={streamer.avatar} 
            alt={streamer.name} 
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" 
        />
      </div>
      
      {/* Live Badge */}
      {streamer.isHot ? (
         <span className="absolute -top-1 -left-1 bg-gradient-to-r from-red-600 to-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg shadow-sm z-10 tracking-wide uppercase">
            HOT
         </span>
      ) : (
         <div className="absolute -top-1 -left-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg shadow-sm z-10 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            <span>AO VIVO</span>
         </div>
      )}
    </div>

    {/* Content */}
    <div className="flex-grow min-w-0 flex flex-col justify-center h-16 py-1">
      <div className="flex justify-between items-start mb-1">
        <div className="min-w-0 pr-2">
            <h3 className="text-gray-100 font-bold text-sm truncate leading-tight group-hover:text-blue-400 transition-colors">
                {streamer.name}
            </h3>
            <div className="flex items-center text-xs text-gray-500 mt-1 space-x-1">
                 <span className="truncate max-w-[100px]">{streamer.location || 'Em algum lugar'}</span>
                 <span>•</span>
                 <span>{streamer.time || 'Agora'}</span>
            </div>
        </div>
        
        {/* Follow Button */}
        {!isFollowed && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onFollow(streamer.id);
                }}
                className="w-8 h-8 rounded-full bg-[#29B6F6] hover:bg-[#0288D1] flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 flex-shrink-0"
                aria-label={`Seguir ${streamer.name}`}
            >
                <PlusIcon className="w-5 h-5"/>
            </button>
        )}
      </div>
      
      {streamer.message && (
         <div className="flex items-center w-full">
             <div className="flex items-center text-gray-400 text-[10px] bg-[#2b2b2d] rounded px-2 py-0.5 max-w-full truncate group-hover:bg-[#353538] transition-colors">
                <PlayIcon className="w-2.5 h-2.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{streamer.message}</span>
             </div>
         </div>
       )}
    </div>
  </div>
);


const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSelectStream, streamers, onOpenLiveHistory }) => {
  const [followedStreamers, setFollowedStreamers] = useState<string[]>([]);
  const { t } = useTranslation();

  const handleFollow = (streamerId: string) => {
    setFollowedStreamers(prev => [...prev, streamerId]);
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[85vw] max-w-[380px] bg-black shadow-2xl z-50 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col h-full text-white font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-black flex-shrink-0">
                <h2 className="text-[28px] font-bold tracking-tight text-white">{t('reminder.title') || 'Lembrete'}</h2>
                <div className="flex items-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenLiveHistory(); }} 
                        className="text-white hover:text-gray-300 transition-colors p-1"
                        title="Histórico de Lives"
                    >
                        {/* Custom alarm clock SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] text-white">
                          <circle cx="12" cy="13" r="8" />
                          <path d="M12 9v4l2 2" />
                          <path d="M5 3 2 6" />
                          <path d="M19 3l3 3" />
                          <path d="M6.38 18.7l-.4 1.4" />
                          <path d="M17.62 18.7l.4 1.4" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-grow overflow-y-auto no-scrollbar pb-6 relative bg-black">
                {/* Section Header */}
                <div className="px-5 py-3 sticky top-0 bg-black z-20 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">RECOMENDADO</h3>
                    <span className="text-[11px] bg-zinc-900 px-2.5 py-1 rounded-full text-zinc-400 font-medium tracking-wide">
                        {streamers.length} Online
                    </span>
                </div>

                <div className="space-y-0 px-2">
                    {streamers.map(streamer => (
                        <StreamerItem 
                            key={streamer.id} 
                            streamer={streamer} 
                            isFollowed={followedStreamers.includes(streamer.id)}
                            onFollow={handleFollow}
                            onSelectStream={onSelectStream}
                        />
                    ))}
                    
                    {streamers.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
                            {/* Multi-layered voice soundwave visualizer circle */}
                            <div className="w-[85px] h-[85px] rounded-full flex items-center justify-center bg-[#131215]/90 border border-[#212025] shadow-[0_8px_32px_rgba(0,0,0,0.8),_inset_0_1px_2px_rgba(255,255,255,0.05)] relative mb-6">
                                <div className="absolute inset-1.5 rounded-full border border-[#2d2c32]/50"></div>
                                <div className="absolute inset-3.5 rounded-full bg-gradient-to-b from-[#1c1b1f] to-[#0c0b0d]"></div>
                                {/* Center Equalizer Bars with soft cream-blue gradient */}
                                <div className="flex items-end justify-center space-x-[4px] z-10 h-7">
                                    <div 
                                        className="w-[3px] h-3 bg-gradient-to-t from-[#ffdfd1] via-[#d6c7ff] to-[#fff3ed] rounded-full opacity-90"
                                        style={{ animation: 'pulse 1.2s infinite ease-in-out' }}
                                    ></div>
                                    <div 
                                        className="w-[3px] h-6 bg-gradient-to-t from-[#ffdfd1] via-[#d6c7ff] to-[#fff3ed] rounded-full opacity-95"
                                        style={{ animation: 'pulse 0.9s infinite ease-in-out 150ms' }}
                                    ></div>
                                    <div 
                                        className="w-[3px] h-4.5 bg-gradient-to-t from-[#ffdfd1] via-[#d6c7ff] to-[#fff3ed] rounded-full opacity-95"
                                        style={{ animation: 'pulse 1.1s infinite ease-in-out 300ms' }}
                                    ></div>
                                    <div 
                                        className="w-[3px] h-3 bg-gradient-to-t from-[#ffdfd1] via-[#d6c7ff] to-[#fff3ed] rounded-full opacity-90"
                                        style={{ animation: 'pulse 1s infinite ease-in-out 450ms' }}
                                    ></div>
                                </div>
                            </div>
                            
                            <h3 className="text-[19px] font-bold text-white tracking-wide">
                                Nenhuma transmissão encontrada
                            </h3>
                            <p className="text-[14px] mt-2.5 text-zinc-500 leading-relaxed max-w-[210px]">
                                As lives que você segue aparecerão aqui.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
