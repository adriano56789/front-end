import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Streamer } from '../types';
import { SrsPlayerEngine } from '../services/SrsPlayerEngine';
import LiveBadge from './ui/LiveBadge';

interface FloatingPlayerProps {
  streamer: Streamer;
  onClose: () => void;
  onRestore: () => void;
}

const FloatingPlayer: React.FC<FloatingPlayerProps> = ({ streamer, onClose, onRestore }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: window.innerWidth - 190, y: window.innerHeight - 290 });

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Iniciar player SRS para o vídeo da live
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamer.id) return;

    const streamId = streamer.streamKey || streamer.id;
    console.log(`[FloatingPlayer] Iniciando player PiP para stream: ${streamId}`);

    const engine = new SrsPlayerEngine({
      autoMuteRetry: true,
      reconnectRetries: 2
    } as any);

    const unsubState = engine.on('stateChanged', (prev: string, next: string) => {
      if (next === 'playing') {
        setIsVideoReady(true);
      }
    });

    engine.start(streamId, video).catch(err => {
      console.error('[FloatingPlayer] Erro no SrsPlayerEngine:', err);
    });

    return () => {
      unsubState();
      engine.destroy();
    };
  }, [streamer.id, streamer.streamKey]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 170, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 240, e.clientY - dragOffset.current.y));
    posRef.current = { x: newX, y: newY };
    containerRef.current.style.left = `${newX}px`;
    containerRef.current.style.top = `${newY}px`;
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Tap-to-restore on the video area (not on buttons)
  const handleTapRestore = useCallback((e: React.MouseEvent) => {
    // Only restore if not dragging and not clicking a button
    if (!isDragging) {
      onRestore();
    }
  }, [isDragging, onRestore]);

  return (
    <>
      {/* Floating Player Card */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`fixed z-[99999] select-none transition-all duration-300 ease-out group ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        } ${isDragging ? '' : 'hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]'}`}
        style={{
          left: posRef.current.x,
          top: posRef.current.y,
          transition: isDragging
            ? 'none'
            : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Main Card Container */}
        <div
          className="relative w-[160px] sm:w-[180px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 cursor-grab active:cursor-grabbing"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Video Player */}
          <div className="aspect-[9/16] max-h-[300px] bg-black relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Loading overlay */}
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Top bar: streamer avatar + name + live badge + close */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Streamer info */}
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30 flex-shrink-0 bg-purple-900">
                  {streamer.avatar ? (
                    <img
                      src={streamer.avatar}
                      alt={streamer.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(streamer.name)}&background=7c3aed&color=fff&size=48`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                      {streamer.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Name */}
                <span className="text-white text-[10px] font-bold truncate max-w-[70px] drop-shadow-lg">
                  {streamer.name}
                </span>
                {/* Live Badge — MESMO LiveBadge verde de todos os lugares */}
                <LiveBadge label="LIVE" className="px-1.5 py-0.5 shadow-lg" />
              </div>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-5 h-5 bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-[10px] transition-all hover:scale-110 active:scale-90"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Tap anywhere to restore overlay */}
            <div
              className="absolute inset-0 pointer-events-auto"
              onClick={handleTapRestore}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Bottom restore indicator - always slightly visible, full on hover */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <div className="bg-black/40 backdrop-blur-sm text-white text-[8px] font-medium px-2.5 py-1 rounded-full border border-white/10 opacity-40 group-hover:opacity-100 transition-opacity">
                  Toque para abrir
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingPlayer;
