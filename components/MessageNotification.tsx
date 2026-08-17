import React, { useEffect, useState } from 'react';
import { CloseIcon } from './icons';

export interface MessageNotificationData {
    senderName: string;
    senderAvatar: string;
    text: string;
    timestamp: string;
    // 🔑 Para abrir o chat ao tocar (mesmo remetente)
    from?: string;
    senderUser?: any;
    id?: string;
}

interface MessageNotificationProps {
    message: MessageNotificationData;
    onClose: () => void;
    onOpen?: (message: MessageNotificationData) => void;
    index?: number;
}

// 💬 Aviso de mensagem do CHAT PRIVADO — estilo WhatsApp:
//   • NÃO some sozinho (fica na tela até o usuário tocar ou fechar);
//   • flutua POR CIMA de tudo (z máx);
//   • mostra QUEM mandou e O QUE escreveu, com botão "Responder";
//   • tocar no aviso abre o chat direto com a pessoa.
const MessageNotification: React.FC<MessageNotificationProps> = ({ message, onClose, onOpen, index = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);

    // Entra suave ao montar (slide + fade)
    useEffect(() => {
        const t = setTimeout(() => setIsVisible(true), 30);
        return () => clearTimeout(t);
    }, []);

    const close = () => {
        if (leaving) return;
        setLeaving(true);
        setIsVisible(false);
        setTimeout(onClose, 250);
    };

    const open = () => {
        if (leaving) return;
        if (onOpen) {
            setLeaving(true);
            setIsVisible(false);
            setTimeout(() => onOpen(message), 200);
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
            className={`fixed right-3 left-3 sm:left-auto sm:w-[360px] z-[9999999] bg-[#0f2027]/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl border border-emerald-400/30 cursor-pointer select-none transform transition-all duration-300 ease-out ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
            }`}
            style={{ top: `${84 + index * 96}px` }}
        >
            <div className="flex items-start gap-3">
                {/* Avatar com anel verde (status online, estilo WhatsApp) */}
                <div className="relative flex-shrink-0">
                    <img
                        src={message.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || '?')}&background=a855f7&color=fff&size=96`}
                        alt={message.senderName}
                        className="w-11 h-11 rounded-full object-cover"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0f2027]" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-white font-bold text-sm truncate">{message.senderName || 'Usuário'}</h4>
                        <button
                            onClick={(e) => { e.stopPropagation(); close(); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label="Fechar"
                            className="text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 shrink-0"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-white/85 text-[13px] leading-snug mt-0.5 line-clamp-2 break-words">
                        {message.text || 'Enviou uma mensagem'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            Responder
                        </span>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-white/50 text-[11px]">Nova mensagem</span>
                    </div>
                </div>
            </div>

            {/* Barra de destaque verde inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
        </div>
    );
};

export default MessageNotification;
