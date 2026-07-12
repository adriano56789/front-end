import React, { useEffect, useRef } from 'react';
import { Gift, User } from '../../types';

export interface GiftPayload {
    fromUser: User & { 
        id: string; 
        name: string; 
        avatarUrl?: string; 
        level?: number;
    };
    toUser: { 
        id: string; 
        name: string; 
    };
    gift: Gift;
    quantity: number;
    roomId: string;
    id: number; // Forçar ID obrigatório para controle de remoção
}

interface GiftAnimationOverlayProps {
    giftPayload: GiftPayload;
    onAnimationEnd: (id: number) => void;
}

const GiftAnimationOverlay: React.FC<GiftAnimationOverlayProps> = ({ giftPayload, onAnimationEnd }) => {
    // 🛡️ Prevenção de fechamento múltiplo
    const hasEnded = useRef(false);

    // 🔥 Tocar som ao receber o presente na fila lateral
    useEffect(() => {
        try {
            // Um som suave de recompensa/chime curto para presentes na fila lateral
            const audio = new Audio(giftPayload.gift.audioUrl || '');
            if (audio.src) {
                audio.volume = 0.25;
                audio.play().catch(() => {});
            }
        } catch (error) {
            // Ignorar
        }
    }, [giftPayload.id]);

    useEffect(() => {
        // Reset status on id or quantity change to support live coalesced combo updates
        hasEnded.current = false;

        const timer = setTimeout(() => {
            if (!hasEnded.current) {
                hasEnded.current = true;
                onAnimationEnd(giftPayload.id);
            }
        }, 4800);

        return () => {
            clearTimeout(timer);
        };
    }, [giftPayload.id, giftPayload.quantity, onAnimationEnd]);
    
    const { fromUser, toUser, gift, quantity } = giftPayload;

    // Determinar se o presente possui um loop de vídeo ou animação especial
    const isPremium = gift.category === 'VIP' || gift.category === 'Luxo' || gift.category === 'Efeito';

    return (
        <div className={`gift-animation-base p-2 rounded-full inline-flex items-center space-x-3 shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-xl mt-2 border transition-all duration-300 ${
            isPremium 
                ? 'bg-gradient-to-r from-purple-950/80 via-black/85 to-indigo-950/80 border-yellow-400/50 shadow-yellow-500/10' 
                : 'bg-black/80 border-white/10'
        } animate-slide-in relative overflow-hidden group`}>
            
            {/* Brilho animado de fundo para presentes premium */}
            {isPremium && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-purple-500/15 to-transparent w-[200%] animate-pulse pointer-events-none" style={{ animationDuration: '3s' }}></div>
            )}

            <div className={`w-10 h-10 rounded-full overflow-hidden bg-gray-800 relative z-10 ${
                isPremium ? 'border-2 border-yellow-400 animate-pulse' : 'border border-gray-700'
            }`}>
                <img 
                    src={fromUser.avatarUrl || (fromUser as any).avatar || `https://picsum.photos/seed/${fromUser.id || 'default'}/200/200.jpg`} 
                    alt={fromUser.name} 
                    className="absolute inset-0 w-full h-full object-cover block rounded-full" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
            
            <div className="flex flex-col text-left relative z-10 pr-1">
                <p className="text-white font-extrabold text-xs leading-tight tracking-wide truncate max-w-[120px]">
                    {fromUser.name}
                </p>
                <p className="text-zinc-300 text-[9px] leading-tight font-medium">
                    enviou <span className="text-yellow-300 font-bold">{gift.name}</span>
                </p>
            </div>

            {/* Conteúdo de Animação de Vídeo ou Loop de Mídia */}
            <div className="w-12 h-12 flex items-center justify-center relative z-10 shrink-0 transform group-hover:scale-110 transition-transform duration-200">
                {gift.animationUrl || gift.videoUrl ? (
                    <video 
                        src={gift.animationUrl || gift.videoUrl} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="w-12 h-12 object-contain mix-blend-screen filter drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]"
                    />
                ) : gift.component ? (
                    React.cloneElement(gift.component as React.ReactElement<any>, { className: `w-10 h-10 ${isPremium ? 'animate-bounce drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]' : ''}` })
                ) : (
                    <span className={`text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${isPremium ? 'animate-bounce' : ''}`}>
                        {gift.icon}
                    </span>
                )}
            </div>

            {/* Multiplicador com efeito de impacto visual de presente */}
            <div className="relative z-10 font-sans pr-3.5 flex items-center">
                <p className="text-yellow-400 font-black text-2xl italic tracking-tighter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-shadow-glow">
                    x{quantity}
                </p>
            </div>

            {/* CSS inline para o efeito premium e animações do baner se necessário */}
            <style>{`
                .text-shadow-glow {
                    text-shadow: 0 0 10px rgba(250, 204, 21, 0.6), 0 2px 4px rgba(0,0,0,0.9);
                }
            `}</style>
        </div>
    );
};

export default GiftAnimationOverlay;
