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

    useEffect(() => {
        // 🔥 CORREÇÃO: Forçar a remoção após exatamente 4.5 segundos
        // (um pouco antes dos 5s da animação CSS para garantir que o componente suma do DOM)
        const timer = setTimeout(() => {
            if (!hasEnded.current) {
                hasEnded.current = true;
                onAnimationEnd(giftPayload.id);
            }
        }, 4800);

        return () => {
            clearTimeout(timer);
            // Garantir que notifica o pai se for desmontado inesperadamente
            if (!hasEnded.current) {
                onAnimationEnd(giftPayload.id);
            }
        };
    }, [giftPayload.id, onAnimationEnd]);
    
    const { fromUser, toUser, gift, quantity } = giftPayload;

    return (
        <div className="gift-animation-base p-2 bg-black/60 rounded-full inline-flex items-center space-x-3 shadow-[0_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-md mt-2 border border-white/10">
            <div className="w-10 h-10 rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                <img src={fromUser.avatarUrl} alt={fromUser.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col text-left">
                <p className="text-white font-bold text-sm leading-tight">{fromUser.name}</p>
                <p className="text-gray-300 text-[10px] leading-tight">enviou para {toUser.name}</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center gift-anim-pulse">
                 {gift.component ? React.cloneElement(gift.component as React.ReactElement<any>, { className: "w-10 h-10" }) : <span className="text-3xl">{gift.icon}</span>}
            </div>
            <p className="text-yellow-400 font-black text-2xl italic pr-2">x{quantity}</p>
        </div>
    );
};

export default GiftAnimationOverlay;
