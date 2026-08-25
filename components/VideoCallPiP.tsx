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
 * Shows a SINGLE small floating window with the REMOTE user's video.
 * Each participant sees their own stream full-screen + this PiP with the other person.
 * NOT a split screen — that would be PK.
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

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '140px',
        height: '210px',
        transition: isDragging ? 'none' : 'all 0.3s ease-out',
      }}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_8px_40px_rgba(0,0,0,0.6)] bg-black/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-r from-green-500/20 to-green-600/10 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-[8px] font-bold tracking-wide">CHAMADA</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all cursor-pointer border-none"
          >
            <CloseIcon className="w-2.5 h-2.5 text-white" />
          </button>
        </div>

        {/* Remote user video — the ONLY video shown */}
        <div className="flex-1 relative overflow-hidden bg-zinc-900">
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
    </div>
  );
}
