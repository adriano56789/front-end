import React, { useState } from 'react';
import LivePlayer from './LivePlayer';
import { CloseIcon } from './icons';

interface VideoCallPiPProps {
  isOpen: boolean;
  onClose: () => void;
  localStreamId: string;
  remoteStreamId: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  localUserId: string;
}

/**
 * VideoCallPiP — Picture-in-Picture overlay for video calls.
 * Shows two small video windows (local + remote) floating on screen
 * when two users are in a live call.
 * 
 * This component is used INSIDE the call (chamada), in the interaction tools.
 * It is NOT part of the PK battle screen.
 */
export default function VideoCallPiP({
  isOpen,
  onClose,
  localStreamId,
  remoteStreamId,
  remoteUserName,
  remoteUserAvatar,
  localUserId,
}: VideoCallPiPProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 12, y: 100 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(false);
    setDragStart({ x: clientX, y: clientY, posX: position.x, posY: position.y });
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
      setPosition({ x: dragStart.posX + dx, y: dragStart.posY + dy });
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsDragging(false), 50);
  };

  const pipWidth = isExpanded ? 280 : 200;
  const pipHeight = isExpanded ? 420 : 300;

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${pipWidth}px`,
        height: `${pipHeight}px`,
        transition: isDragging ? 'none' : 'all 0.3s ease-out',
      }}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main container with glassmorphism */}
      <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_8px_40px_rgba(0,0,0,0.6)] bg-black/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-green-500/20 to-green-600/10 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-[10px] font-bold tracking-wide">CHAMADA ATIVA</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer border-none"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isExpanded ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all cursor-pointer border-none"
            >
              <CloseIcon className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>

        {/* Videos area */}
        <div className="flex-1 flex gap-[2px] p-1 min-h-0">
          {/* Local video (self) */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-zinc-900">
            <LivePlayer
              streamId={localStreamId}
              userId={localUserId}
              muted
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-1 px-1.5">
              <span className="text-white text-[7px] font-bold">VOCÊ</span>
            </div>
          </div>

          {/* Remote video */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-zinc-900">
            <LivePlayer
              streamId={remoteStreamId}
              userId={localUserId}
            />
            {/* Remote user badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-1 px-1.5">
              <div className="flex items-center gap-1">
                {remoteUserAvatar && (
                  <div className="w-3 h-3 rounded-full overflow-hidden flex-shrink-0">
                    <img src={remoteUserAvatar} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="text-white text-[7px] font-bold truncate">{remoteUserName || 'Parceiro'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-center gap-3 py-2 px-3 bg-gradient-to-t from-black/50 to-transparent">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer border-none shadow-lg shadow-red-500/30"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
