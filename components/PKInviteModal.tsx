import React, { useEffect, useRef, useState } from 'react';
import LivePlayer from './LivePlayer';

/**
 * ⚔️ Modal global de convite de batalha PK.
 *
 * Aparece na tela do CONVIDADO (dentro ou fora de uma stream) com:
 *   - Info do desafiante (avatar + nome)
 *   - Preview da câmera: a live do desafiante (streamId do convite) + a
 *     câmera própria do convidado (preview local via getUserMedia)
 *   - Botões ACEITAR / RECUSAR
 *
 * Ao aceitar, chama onAccept; ao recusar, onReject.
 */
interface PKInviteModalProps {
  invite: any;
  currentUserId: string;
  onAccept: (invite: any) => void;
  onReject: (invite: any) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

const PKInviteModal: React.FC<PKInviteModalProps> = ({
  invite,
  currentUserId,
  onAccept,
  onReject,
  isAccepting = false,
  isRejecting = false,
}) => {
  const inviterName = invite?.inviterName || invite?.inviter_name || invite?.inviterUsername || 'Convidado';
  const inviterAvatar = invite?.inviterAvatar || invite?.inviter_avatar || '';
  const inviterStreamId = invite?.streamId || invite?.inviterStreamId || '';

  // Preview da câmera própria do convidado (front)
  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const [myCamError, setMyCamError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;

    const startCam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          myVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[PKInviteModal] Não foi possível abrir a câmera de preview:', err);
        if (mounted) setMyCamError(true);
      }
    };

    const timer = setTimeout(startCam, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const resultLabel = isAccepting || isRejecting;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999999] flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] border border-white/[0.08] w-full max-w-[360px] rounded-3xl p-5 relative flex flex-col items-center justify-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 select-none overflow-hidden">
        {/* Pulsing halo */}
        <div className="absolute -top-10 w-[160px] h-[160px] rounded-full bg-[#FF2D55] opacity-20 filter blur-2xl animate-pulse pointer-events-none" />

        <h3 className="text-[19px] font-bold text-center text-white tracking-tight leading-snug mb-1">
          Desafio de PK!
        </h3>
        <p className="text-[13px] text-gray-400 text-center mb-4">
          <span className="text-white font-semibold">@{inviterName}</span> te desafiou para uma batalha. Deseja aceitar?
        </p>

        {/* ═══ Preview das câmeras ═══ */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
          {/* Live do desafiante */}
          <div className="absolute inset-0 bg-zinc-900 overflow-hidden">
            {inviterStreamId ? (
              <LivePlayer streamId={inviterStreamId} userId={currentUserId} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                {inviterAvatar ? (
                  <img src={inviterAvatar} alt={inviterName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-5xl">⚔️</div>
                )}
              </div>
            )}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-bold text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] animate-pulse" />
              {inviterName}
            </div>
          </div>

          {/* Preview da câmera própria (canto) */}
          <div className="absolute bottom-2 right-2 w-[110px] rounded-xl overflow-hidden border border-white/20 bg-black shadow-xl" style={{ aspectRatio: '3/4' }}>
            {myCamError ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/40 text-[10px] text-center px-1">
                Câmera indisponível
              </div>
            ) : (
              <video ref={myVideoRef} muted playsInline autoPlay className="w-full h-full object-cover" />
            )}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-semibold text-white drop-shadow bg-black/40 py-0.5">
              Você
            </div>
          </div>
        </div>

        {/* ═══ Ações ═══ */}
        <div className="flex gap-3 w-full">
          <button
            onClick={() => onReject(invite)}
            disabled={resultLabel}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700/80 disabled:opacity-50 text-gray-300 text-[15px] font-bold rounded-xl active:scale-[0.98] transition-all hover:cursor-pointer"
          >
            {isRejecting ? 'Recusando...' : 'Recusar'}
          </button>
          <button
            onClick={() => onAccept(invite)}
            disabled={resultLabel}
            className="flex-1 py-3 bg-[#FF2D55] text-white text-[15px] font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-[#E02447] shadow-lg shadow-[#FF2D55]/20 hover:cursor-pointer disabled:opacity-60"
          >
            {isAccepting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Aceitando...
              </span>
            ) : (
              'Aceitar Desafio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PKInviteModal;
