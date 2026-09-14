import React, { useState, useEffect, useRef } from 'react';
import { Streamer } from '../types';
import { LockIcon } from './icons';

interface PrivateRoomEntryModalProps {
  isOpen: boolean;
  entryFee: number;
  userDiamonds: number;
  streamerName: string;
  streamerAvatar?: string;
  onPay: () => void;
  onCancel: () => void;
  isPaying?: boolean;
}

const PrivateRoomEntryModal: React.FC<PrivateRoomEntryModalProps> = ({
  isOpen,
  entryFee,
  userDiamonds,
  streamerName,
  streamerAvatar,
  onPay,
  onCancel,
  isPaying = false,
}) => {
  const [show, setShow] = useState(false);
  const [pulseLock, setPulseLock] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setShow(true));
      const t = setTimeout(() => setPulseLock(true), 600);
      return () => clearTimeout(t);
    } else {
      setShow(false);
      setPulseLock(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canAfford = userDiamonds >= entryFee;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center"
      style={{ opacity: show ? 1 : 0, transition: 'opacity 0.25s ease' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full sm:max-w-sm mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#12082a] to-[#0a0612]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#9747FF]/15 rounded-full blur-[80px]" />

        {/* Content */}
        <div className="relative px-6 pt-8 pb-6">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <div
              className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center
                bg-gradient-to-br from-[#9747FF]/30 to-[#bd00ff]/20
                border border-[#9747FF]/40 shadow-[0_0_40px_rgba(151,71,255,0.35)]
                ${pulseLock ? 'scale-100' : 'scale-75'}
              `}
              style={{ transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
              <LockIcon className="w-8 h-8 text-[#e1ba72]" />
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#e1ba72]/30 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-white text-[20px] font-extrabold tracking-tight mb-1">
            Sala Privada
          </h2>
          <p className="text-center text-[#8b8b9e] text-[13px] font-medium mb-6">
            Esta transmissão cobra taxa de entrada
          </p>

          {/* Streamer info */}
          <div className="flex items-center justify-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
            {streamerAvatar ? (
              <img src={streamerAvatar} alt={streamerName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#9747FF]/30 flex items-center justify-center">
                <LockIcon className="w-5 h-5 text-[#e1ba72]" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-white text-[14px] font-bold truncate">{streamerName}</span>
              <span className="text-[#8b8b9e] text-[11px] font-medium">Sala Privada</span>
            </div>
          </div>

          {/* Price card */}
          <div className="rounded-2xl bg-black/40 border border-white/[0.06] overflow-hidden mb-6">
            {/* Entry fee */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-[#8b8b9e] text-[13px] font-medium">Taxa de entrada</span>
              <div className="flex items-center gap-2">
                <span className="text-[22px]">💎</span>
                <span className="text-white text-[24px] font-extrabold tabular-nums">{entryFee}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" />

            {/* User balance */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[#6b6b80] text-[12px] font-medium">Seu saldo</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💎</span>
                <span className={`text-[14px] font-bold tabular-nums ${canAfford ? 'text-[#a78bfa]' : 'text-red-400'}`}>
                  {userDiamonds.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient warning */}
          {!canAfford && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <span className="text-red-400 text-[12px] font-semibold">
                Diamantes insuficientes — você precisa de mais {entryFee - userDiamonds} 💎
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isPaying}
              className="flex-1 py-3.5 rounded-2xl bg-white/[0.06] text-[#8b8b9e] font-bold text-[14px]
                active:scale-[0.97] transition-all disabled:opacity-40
                border border-white/[0.06] hover:bg-white/[0.1]"
            >
              Sair
            </button>
            <button
              onClick={onPay}
              disabled={!canAfford || isPaying}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] text-white
                bg-gradient-to-r from-[#9747FF] to-[#bd00ff]
                shadow-[0_4px_20px_rgba(151,71,255,0.4)]
                active:scale-[0.97] transition-all
                disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
                hover:shadow-[0_6px_30px_rgba(151,71,255,0.55)]"
            >
              {isPaying ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Pagando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  💎 Pagar & Entrar
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateRoomEntryModal;
