import React, { useRef, useEffect, useState } from 'react';
import { Streamer } from '../types';
import { SrsPlayerEngine } from '../services/SrsPlayerEngine';

interface FloatingPlayerProps {
  streamer: Streamer;
  onClose: () => void;
  onRestore: () => void;
}

const FloatingPlayer: React.FC<FloatingPlayerProps> = ({ streamer, onClose, onRestore }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: window.innerWidth - 170, y: window.innerHeight - 240 });

  // Iniciar player SRS (mesma lógica do LivePlayer para espectadores)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamer.id) return;

    const streamId = streamer.streamKey || streamer.id;
    console.log(`[FloatingPlayer] Iniciando player PiP para stream: ${streamId}`);

    const engine = new SrsPlayerEngine({
      hlsFallback: true,
      autoMuteRetry: true,
      reconnectRetries: 3
    });

    const unsubState = engine.on('stateChanged', (prev: string, next: string) => {
      console.log(`[FloatingPlayer] Estado: ${prev} -> ${next}`);
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
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 160, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.current.y));
    posRef.current = { x: newX, y: newY };
    containerRef.current.style.left = `${newX}px`;
    containerRef.current.style.top = `${newY}px`;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[99999] w-[150px] sm:w-[180px] aspect-video rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-grab active:cursor-grabbing select-none"
      style={{
        left: posRef.current.x,
        top: posRef.current.y,
        transition: isDragging ? 'none' : 'left 0.2s ease, top 0.2s ease',
      }}
    >
      {/* Video player */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Top bar with streamer name and close button */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="text-white text-[10px] font-bold truncate max-w-[100px] drop-shadow-lg">
          {streamer.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-xs transition-all hover:scale-110"
        >
          ✕
        </button>
      </div>

      {/* Tap to restore indicator */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRestore();
        }}
        className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 text-white text-[9px] px-2 py-0.5 rounded-full transition-all pointer-events-auto"
      >
        ▢ Abrir
      </button>
    </div>
  );
};

export default FloatingPlayer;
