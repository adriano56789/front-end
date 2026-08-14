
import React, { useRef, useEffect, useState } from 'react';
import Header from './Header';
import { Streamer } from '../types';
import { useTranslation } from '../i18n';
import { LoadingSpinner } from './Loading';
import { ViewerIcon, LockIcon, ChevronRightIcon, LocationPinIcon } from './icons';
import { calculateDistanceInKm, formatDistance } from '../utils/location';
import { SrsPlayerEngine } from '../services/SrsPlayerEngine';

// ─── Prévia de transmissão nos cards ────────────────────────────────────
// Limita conexões WHEP simultâneas para não estourar banda/CPU com uma grade
// cheia de lives. Cards fora da tela param a prévia e liberam a vaga.
const MAX_PREVIEWS = 4;
let previewSlots = 0;
const previewWaitQueue: Array<() => void> = [];

function acquirePreviewSlot(): boolean {
  if (previewSlots < MAX_PREVIEWS) {
    previewSlots++;
    return true;
  }
  return false;
}

function releasePreviewSlot() {
  if (previewSlots > 0) previewSlots--;
  const next = previewWaitQueue.shift();
  if (next) next();
}

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => setInView(e.isIntersecting));
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const StreamPreviewVideo: React.FC<{ streamId: string; visible: boolean }> = ({ streamId, visible }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<SrsPlayerEngine | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!visible || !streamId) return;
    let cancelled = false;

    const tryStart = () => {
      if (cancelled || !mountedRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      if (!acquirePreviewSlot()) {
        previewWaitQueue.push(tryStart);
        return;
      }
      const engine = new SrsPlayerEngine({ autoMuteRetry: true, userMuted: true });
      engineRef.current = engine;
      engine.start(streamId, video).catch(() => {});
    };
    tryStart();

    return () => {
      cancelled = true;
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        releasePreviewSlot();
      }
    };
  }, [visible, streamId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
    />
  );
};

interface MainScreenProps {
  onOpenReminderModal: () => void;
  onOpenRegionModal: () => void;
  onSelectStream: (streamer: Streamer) => void;
  onOpenSearch: () => void;
  streamers: Streamer[];
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  showLocationBanner: boolean;
  unreadCount?: number;
  invitedStreamIds?: string[];

}

const StreamerCard: React.FC<{streamer: Streamer; onSelect: (streamer: Streamer) => void; invited: boolean}> = ({ streamer, onSelect, invited }) => {
    const loggedInUser = (window as any).currentUser;
    
    // Prévia ao vivo: se o usuário ativou 'Mostrar prévia das transmissões',
    // o card mostra a transmissão passando direto (sem entrar na sala).
    const previewEnabled = !!(loggedInUser && loggedInUser.streamPreviewEnabled);
    const { ref: cardRef, inView } = useInView<HTMLDivElement>();
    const previewStreamId = streamer.streamKey || streamer.id;
    
    // Get country code from streamer profile (always lowercase for flagcdn)
    const countryCode = streamer.country ? streamer.country.toLowerCase() : '';
    
    // Map common country codes to display names
    const countryNames: Record<string, string> = {
        br: 'Brasil', us: 'Estados Unidos', pt: 'Portugal', ar: 'Argentina',
        mx: 'México', co: 'Colômbia', cl: 'Chile', pe: 'Peru', ve: 'Venezuela',
        es: 'Espanha', it: 'Itália', fr: 'França', de: 'Alemanha', gb: 'Reino Unido',
        ca: 'Canadá', jp: 'Japão', kr: 'Coreia do Sul', in: 'Índia',
        ao: 'Angola', mz: 'Moçambique', cv: 'Cabo Verde',
    };
    const countryName = countryCode ? (countryNames[countryCode] || countryCode.toUpperCase()) : '';

    // Capture standard title message or fallback gracefully
    const streamTitle = streamer.message && streamer.message.trim() !== '' 
        ? streamer.message 
        : "Acabei de chegar aqui";

    // 🔒 Cadeado só para quem foi convidado a uma sala privada
    const isInvitedToPrivate = !!streamer.isPrivate && invited;

    return (
        <div 
            ref={cardRef}
            className="relative aspect-[1/1.1] rounded-2xl overflow-hidden cursor-pointer group bg-zinc-950/40 select-none shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-white/[0.03]" 
            onClick={() => onSelect(streamer)}
        >
            {/* Main background poster */}
            <img 
                src={streamer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(streamer.name || "Streamer")}&background=random`} 
                alt={streamer.name} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            />
            {/* Prévia ao vivo (opcional): transmissão passando direto no card */}
            {previewEnabled && previewStreamId && (
                <StreamPreviewVideo streamId={previewStreamId} visible={inView} />
            )}
            {/* Dynamic black-transparent gradient layers */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30"></div>

            {/* 🔒 Padlock Badge for invited private rooms (ao lado do nome/ícone do usuário) */}
            {isInvitedToPrivate && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-1.5 py-1 border border-[#e1ba72]/30 shadow-lg shadow-black/60">
                    <LockIcon className="w-3 h-3 text-[#f2d7a2] drop-shadow" />
                </div>
            )}

            {/* Stream Info Overlay */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-2.5 pb-3 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
                {/* Title */}
                <p className="text-[13px] sm:text-[14px] font-medium text-white truncate drop-shadow-md leading-tight mb-1.5 px-0.5">
                    {streamTitle}
                </p>

                {/* Subinfo Row */}
                <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-zinc-300 font-medium">
                    {/* Country flag label */}
                    <div className="flex items-center min-w-0 flex-1 pr-1">
                        {countryCode ? (
                            <img
                                src={`https://flagcdn.com/w20/${countryCode}.png`}
                                alt={countryName}
                                className="w-3.5 h-3.5 rounded-sm object-cover mr-1 flex-shrink-0"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <svg className="w-3.5 h-3.5 text-white mr-1 flex-shrink-0 fill-current opacity-90" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                        )}
                        <span className="truncate font-medium text-[11px] sm:text-[12px] text-[#f2d7a2]">
                            {countryName || 'Global'}
                        </span>
                    </div>

                    {/* Viewer Signal indicator label */}
                    <div className="flex items-center flex-shrink-0 space-x-1 pl-1">
                        {/* Audio/Video Connection strength styling indicator */}
                        <div className="flex items-end gap-[1px] h-[8px] pb-[1px] mr-1 opacity-90">
                            <span className="w-[1.5px] h-[3px] bg-[#dfc38f] rounded-[0.3px]"></span>
                            <span className="w-[1.5px] h-[4.5px] bg-[#dfc38f] rounded-[0.3px]"></span>
                            <span className="w-[1.5px] h-[6px] bg-[#dfc38f] rounded-[0.3px]"></span>
                            <span className="w-[1.5px] h-[7.5px] bg-zinc-600 rounded-[0.3px]"></span>
                        </div>
                        <span className="font-sans text-[11px] sm:text-[12px] text-zinc-200 font-semibold">
                            {(streamer.onlineTotal ?? streamer.viewers)?.toLocaleString('pt-BR') || '0'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const MainScreen: React.FC<MainScreenProps> = ({ onOpenReminderModal, onOpenRegionModal, onSelectStream, onOpenSearch, streamers, isLoading, activeTab, onTabChange, showLocationBanner, unreadCount = 0, invitedStreamIds = [] }) => {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const wasDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    wasDragging.current = false;
    if (navRef.current) {
      startX.current = e.pageX;
      scrollLeft.current = navRef.current.scrollLeft;
      navRef.current.style.scrollBehavior = 'auto';
    }
  };

  const handleMouseLeave = () => {
    isDown.current = false;
    if (navRef.current) {
      navRef.current.style.scrollBehavior = '';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !navRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) {
        wasDragging.current = true;
        navRef.current.classList.add('is-dragging');
    }
    navRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDown.current = false;
    if (navRef.current) {
      navRef.current.style.scrollBehavior = '';
    }
    setTimeout(() => {
        if(navRef.current) navRef.current.classList.remove('is-dragging');
    }, 50);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDown.current = true;
    wasDragging.current = false;
    if (navRef.current) {
      startX.current = e.touches[0].pageX;
      scrollLeft.current = navRef.current.scrollLeft;
      navRef.current.style.scrollBehavior = 'auto';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDown.current || !navRef.current) return;
    const x = e.touches[0].pageX;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) {
        wasDragging.current = true;
        navRef.current.classList.add('is-dragging');
    }
    navRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleTouchEnd = () => {
    isDown.current = false;
    if (navRef.current) {
      navRef.current.style.scrollBehavior = '';
    }
    setTimeout(() => {
        if(navRef.current) navRef.current.classList.remove('is-dragging');
    }, 50);
  };

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const tabs = [
    { key: 'popular', label: t('main.popular') },
    { key: 'followed', label: t('main.followed') },
    { key: 'nearby', label: t('main.nearby') },
    { key: 'pk', label: t('main.pk') },
    { key: 'new', label: t('main.new') },
    { key: 'music', label: t('main.music') },
    { key: 'dance', label: t('main.dance') },
    { key: 'party', label: t('main.party') },
    { key: 'private', label: t('main.private') },
  ];
  
  return (
    <div className="flex flex-col w-full min-w-0 h-full bg-[#000000] select-none overflow-hidden">
      <Header onOpenReminderModal={onOpenReminderModal} onOpenRegionModal={onOpenRegionModal} onOpenSearch={onOpenSearch} unreadCount={unreadCount} currentCountry={(window as any).currentUser?.country} />
      
      <nav className="flex-shrink-0 w-full relative z-10 border-b border-white/[0.02]">
        <div 
          ref={navRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex gap-6 overflow-x-auto overflow-y-hidden whitespace-nowrap py-3.5 px-4 w-full touch-pan-x cursor-grab active:cursor-grabbing select-none"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .overflow-x-auto::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={(e) => {
                if(wasDragging.current || navRef.current?.classList.contains('is-dragging')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                onTabChange(tab.key);
              }}
              className={`text-[15px] transition-all flex-shrink-0 cursor-pointer border-none bg-transparent focus:outline-none tracking-wide pb-0.5 ${
                activeTab === tab.key
                  ? 'text-white font-medium'
                  : 'text-[#7d7e83] hover:text-zinc-200 font-light'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Espaçador flex no final para garantir que o último item não fique grudado */}
          <div className="w-2 flex-shrink-0"></div>
        </div>
      </nav>

      {activeTab === 'nearby' && showLocationBanner && (
        <div className="p-2 flex-shrink-0">
            <button className="w-full bg-[#121214] border border-white/[0.04] p-3 rounded-xl flex justify-between items-center text-left cursor-pointer" onClick={() => onTabChange('nearby')}>
                <div className="flex items-center gap-3">
                    <LocationPinIcon className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs text-zinc-200">{t('locationPermission.bannerText')}</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-zinc-500" />
            </button>
        </div>
      )}      <main ref={mainRef} className="flex-grow p-1.5 pb-24 overflow-y-auto no-scrollbar">
        {isLoading ? (
            <div className="h-full flex items-center justify-center">
                <LoadingSpinner />
            </div>
        ) : (
            <>
                {(!Array.isArray(streamers) || streamers.filter(streamer =>
                    streamer && 
                    streamer.id && 
                    streamer.name && 
                    streamer.name.trim() !== '' &&
                    streamer.avatar && 
                    streamer.avatar.trim() !== '' &&
                    streamer.hostId &&
                    streamer.hostId.trim() !== '' &&
                    streamer.isLive === true
                ).length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="flex flex-col items-center max-w-xs mt-10">
                            {/* Visual matching TV live outline icon with user inside */}
                            <div className="w-20 h-16 mb-5 text-zinc-700 flex items-center justify-center">
                                <svg className="w-full h-full stroke-current fill-none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="3" />
                                    <path d="M12 17v4" />
                                    <path d="M9 21h6" />
                                    <circle cx="12" cy="8.5" r="2.5" />
                                    <path d="M6.5 14c0-2 2-3 5.5-3s5.5 1 5.5 3" />
                                </svg>
                            </div>
                            
                            <h3 className="text-base font-medium text-zinc-200 mb-1.5 tracking-tight">Nenhuma live ao vivo encontrada</h3>
                            <p className="text-xs text-zinc-500 font-light leading-relaxed">
                                Quando alguém iniciar uma transmissão, aparecerá aqui
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 px-1 pb-24 max-w-7xl mx-auto">
                        {(() => {
                            // Deduplicar streamers por ID para evitar chaves duplicadas no React
                            const seen = new Set<string>();
                            const unique = streamers.filter(streamer => {
                                if (!streamer || !streamer.id || !streamer.name || streamer.name.trim() === '' ||
                                    !streamer.avatar || streamer.avatar.trim() === '' ||
                                    !streamer.hostId || streamer.hostId.trim() === '' ||
                                    streamer.isLive !== true) {
                                    return false;
                                }
                                if (seen.has(streamer.id)) {
                                    return false; // Já vimos esse ID, ignorar duplicata
                                }
                                seen.add(streamer.id);
                                return true;
                            });
                            return unique.map(streamer => (
                                <StreamerCard key={streamer.id} streamer={streamer} onSelect={onSelectStream} invited={invitedStreamIds.includes(streamer.id)} />
                            ));
                        })()}
                    </div>
                )}
            </>
        )}
      </main>
    </div>
  );
};

export default MainScreen;
