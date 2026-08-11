import React, { useEffect } from 'react';
import { Gift } from '../types';
import { streamPublishService } from '../services/streamPublishService';

// Custom high-fidelity SVGs matching the mockup screenshots perfectly
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CoHostIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const BatalhaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        {/* Crossed Swords Blade 1 */}
        <line x1="4" y1="20" x2="20" y2="4" />
        {/* Crossed Swords Blade 2 */}
        <line x1="20" y1="20" x2="4" y2="4" />
        {/* Hilt / Guard 1 */}
        <line x1="6" y1="14" x2="10" y2="18" />
        {/* Hilt / Guard 2 */}
        <line x1="14" y1="18" x2="18" y2="14" />
    </svg>
);

const ConvidarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
);

const ChamadaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const TrocarCamIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

const EmbelezarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m15 4-2-2M17 7l2-2M12 2h2M19 9l2-2M19 2l-2 2M2.27 21.73a2.38 2.38 0 0 0 3.36 0l16.1-16.1a2.38 2.38 0 0 0-3.36-3.36l-16.1 16.1a2.38 2.38 0 0 0 0 3.36Z" />
        <path d="m18 10 2 2" />
    </svg>
);

const MicrophoneIconCustom: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const MicrophoneOffIconCustom: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 11a6.97 6.97 0 0 1-1.5 4.5M12 19V23M8 23h8" />
        <path d="M19 10v2a7 7 0 0 1-8.5 6.5M5 10v2" />
    </svg>
);

const SoundOnIconCustom: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const SoundOffIconCustom: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);

const ModerarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20a10 10 0 0 1 0-20z" fill="currentColor" />
    </svg>
);

const ClarezaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor" />
    </svg>
);

const ChatBubbleIconCustom: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const ShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186l5.572 3.142m-5.572-3.142l5.572-3.142m0 0a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185zm0 8.411a2.25 2.25 0 1 0 3.933 2.185 2.25 2.25 0 0 0-3.933-2.185z" />
    </svg>
);

const DenunciarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a1.125 1.125 0 0 0 .818-1.088V5.008c0-.6-.441-1.112-1.037-1.18l-3.166-.363a9 9 0 0 0-5.68 1.256l-.161.098a9 9 0 0 1-5.11 1.285L3 6v9z" />
    </svg>
);

const HelpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCoHostModal: (e: React.MouseEvent, mode?: 'cohost' | 'battle') => void;
  onOpenPrivateInviteModal: (e: React.MouseEvent) => void;
  isPKBattleActive?: boolean;
  onEndPKBattle?: (e: React.MouseEvent) => void;
  onOpenBeautyPanel?: (e: React.MouseEvent) => void;
  onOpenPrivateChat?: (e: React.MouseEvent) => void;
  onOpenClarityPanel?: (e: React.MouseEvent) => void;
  isModerationActive?: boolean;
  onToggleModeration?: (e: React.MouseEvent) => void;
  isPrivateStream?: boolean;
  isMicrophoneMuted?: boolean;
  onToggleMicrophone?: (e: React.MouseEvent) => void;
  isSoundMuted?: boolean;
  onToggleSound?: (e: React.MouseEvent) => void;
  isAutoFollowEnabled?: boolean;
  onToggleAutoFollow?: (e: React.MouseEvent) => void;
  isAutoPrivateInviteEnabled?: boolean;
  onToggleAutoPrivateInvite?: (e: React.MouseEvent) => void;
  onOpenVideoCall?: (e: React.MouseEvent) => void;
  isHost?: boolean;
  addToast?: (type: any, message: string) => void;
  gifts?: Gift[];
  pinnedGift?: Gift | null;
  onSavePinnedGift?: (gift: Gift | null, label?: string) => void;
}

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    hasDot?: boolean;
    isActive?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, hasDot, isActive, onClick, disabled }) => (
    <div className="flex flex-col items-center space-y-2 text-center w-[76px] select-none">
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 outline-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive 
                    ? 'bg-gradient-to-br from-[#00e5ff] to-[#bd00ff] shadow-[0_4px_16px_rgba(0,229,255,0.4)] text-white' 
                    : 'bg-transparent text-[#9ea3b5] hover:text-white hover:bg-white/[0.06]'
            }`}
        >
            {icon}
            {hasDot && (
                <div className="absolute top-2.5 right-2.5 w-[11px] h-[11px] bg-[#FC10B8] rounded-full ring-2 ring-[#131124]" />
            )}
        </button>
        <span className="text-[12px] font-medium text-gray-400 leading-tight block truncate w-full px-1">{label}</span>
    </div>
);

const ToolsModal: React.FC<ToolsModalProps> = ({ 
    isOpen, 
    onClose, 
    onOpenCoHostModal, 
    onOpenPrivateInviteModal, 
    isPKBattleActive, 
    onEndPKBattle, 
    onOpenBeautyPanel, 
    onOpenPrivateChat, 
    onOpenClarityPanel, 
    isModerationActive, 
    onToggleModeration, 
    isPrivateStream, 
    isMicrophoneMuted, 
    onToggleMicrophone, 
    isSoundMuted, 
    onToggleSound, 
    isAutoFollowEnabled, 
    onToggleAutoFollow, 
    isAutoPrivateInviteEnabled, 
    onToggleAutoPrivateInvite, 
    onOpenVideoCall,
    isHost = true,
    addToast,
    gifts = [],
    pinnedGift = null,
    onSavePinnedGift
}) => {
    
    const [selectedPinnedGift, setSelectedPinnedGift] = React.useState<Gift | null>(null);
    const [pinnedGiftLabel, setPinnedGiftLabel] = React.useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedPinnedGift(pinnedGift);
            setPinnedGiftLabel(pinnedGift?.name || '');
        }
    }, [isOpen, pinnedGift]);

    const renderGiftVisual = (gift: any) => {
        if (gift.component) return gift.component;
        if (typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/'))) {
            return <img src={gift.icon} alt={gift.name} className="w-10 h-10 object-cover rounded-lg" />;
        }
        return <span className="text-3xl">{gift.icon}</span>;
    };

    const handleSavePinnedGift = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedPinnedGift) {
            if (addToast) addToast('error', 'Selecione um presente para fixar na tela.');
            return;
        }
        const label = pinnedGiftLabel.trim() || selectedPinnedGift.name;
        if (onSavePinnedGift) onSavePinnedGift(selectedPinnedGift, label);
        if (addToast) addToast('success', `Presente "${label}" fixado na tela!`);
        onClose();
    };

    const handleRemovePinnedGift = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSavePinnedGift) onSavePinnedGift(null);
        setSelectedPinnedGift(null);
        setPinnedGiftLabel('');
        if (addToast) addToast('info', 'Presente fixado removido da tela.');
        onClose();
    };

    const createAndCloseHandler = (action?: (e: React.MouseEvent) => void) => {
        if (!action) return undefined;
        return (e: React.MouseEvent) => {
            e.stopPropagation();
            action(e);
            // Do not close for toggle actions that just change state
            if (action !== onToggleModeration && action !== onToggleMicrophone && action !== onToggleSound && action !== onToggleAutoFollow && action !== onToggleAutoPrivateInvite) {
                onClose();
            }
        };
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            navigator.clipboard.writeText(window.location.href);
            if (addToast) {
                addToast('success', 'Link da transmissão copiado para a área de transferência!');
            }
        } catch (err) {
            if (addToast) {
                addToast('error', 'Falha ao copiar o link da transmissão.');
            }
        }
        onClose();
    };

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (addToast) {
            addToast('success', 'Denúncia enviada com sucesso! Analisaremos o conteúdo desta transmissão para garantir a conformidade.');
        }
        onClose();
    };

    const handleHelp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (addToast) {
            addToast('info', 'Toque duas vezes na tela para curtir a live e clique no botão de presente para enviar diamantes.');
        }
        onClose();
    };

    const cohostTools = [
        { 
            icon: <CoHostIcon className="w-7 h-7" />, 
            label: 'Co-host', 
            hasDot: false, 
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onOpenCoHostModal(e, 'cohost');
                onClose();
            }
        },
        { 
            icon: <BatalhaIcon className="w-7 h-7" />, 
            label: isPKBattleActive ? 'Fim da Batalha' : 'Batalha', 
            hasDot: false, 
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isPKBattleActive && onEndPKBattle) {
                    onEndPKBattle(e);
                } else {
                    onOpenCoHostModal(e, 'battle');
                }
                onClose();
            }
        },
        { icon: <ConvidarIcon className="w-7 h-7" />, label: 'Convidar', hasDot: false, onClick: createAndCloseHandler(onOpenPrivateInviteModal) },
        { icon: <ChamadaIcon className="w-7 h-7" />, label: 'Chamada', hasDot: true, onClick: createAndCloseHandler(onOpenVideoCall) },
        { 
            icon: <TrocarCamIcon className="w-7 h-7" />, 
            label: 'Trocar Câm', 
            hasDot: false, 
            onClick: async (e: React.MouseEvent) => { 
                e.stopPropagation(); 
                try {
                    await streamPublishService.switchCamera();
                    if (addToast) {
                        addToast('success', 'Câmera alterada com sucesso! 🔄');
                    }
                } catch (err) {
                    console.error('Failed to switch camera from ToolsModal:', err);
                    if (addToast) {
                        addToast('error', 'Não foi possível alternar a câmera.');
                    }
                }
                onClose();
            } 
        },
    ];

    const anchorTools = [
        { icon: <EmbelezarIcon className="w-7 h-7" />, label: 'Embelezar', hasDot: true, onClick: createAndCloseHandler(onOpenBeautyPanel) },
        { icon: isMicrophoneMuted ? <MicrophoneOffIconCustom className="w-7 h-7" /> : <MicrophoneIconCustom className="w-7 h-7" />, label: 'Microfone', hasDot: false, isActive: !isMicrophoneMuted, onClick: onToggleMicrophone },
        { icon: isSoundMuted ? <SoundOffIconCustom className="w-7 h-7" /> : <SoundOnIconCustom className="w-7 h-7" />, label: 'Som', hasDot: false, isActive: !isSoundMuted, onClick: onToggleSound },
        { icon: <ModerarIcon className="w-7 h-7" />, label: 'Moderar', hasDot: false, isActive: isModerationActive, onClick: onToggleModeration },
        { icon: <ClarezaIcon className="w-7 h-7" />, label: 'Clareza', hasDot: false, onClick: createAndCloseHandler(onOpenClarityPanel) },
        { icon: <ChatBubbleIconCustom className="w-7 h-7" />, label: 'Chat', hasDot: true, onClick: createAndCloseHandler(onOpenPrivateChat) },
        { icon: <ConvidarIcon className="w-7 h-7" />, label: 'Seguir Auto', hasDot: false, isActive: isAutoFollowEnabled, onClick: onToggleAutoFollow },
        { icon: <ConvidarIcon className="w-7 h-7" />, label: 'Auto Convite', hasDot: false, isActive: isAutoPrivateInviteEnabled, onClick: onToggleAutoPrivateInvite },
    ];

    const spectatorTools = [
        { icon: <ShareIcon className="w-7 h-7" />, label: 'Compartilhar', hasDot: false, onClick: handleShare },
        { icon: isSoundMuted ? <SoundOffIconCustom className="w-7 h-7" /> : <SoundOnIconCustom className="w-7 h-7" />, label: 'Som', hasDot: false, isActive: !isSoundMuted, onClick: onToggleSound },
        { icon: <ChatBubbleIconCustom className="w-7 h-7" />, label: 'Chat', hasDot: true, onClick: createAndCloseHandler(onOpenPrivateChat) },
        { icon: <DenunciarIcon className="w-7 h-7" />, label: 'Denunciar', hasDot: false, onClick: handleReport },
        { icon: <HelpIcon className="w-7 h-7" />, label: 'Ajuda', hasDot: false, onClick: handleHelp },
    ];

    // 🔧 Abre igual o painel do presente: bottom sheet parcial, overlay
    // transparente — a transmissão continua visível/clara.
    return (
        <div 
          className={`fixed inset-0 z-[100] flex items-end justify-center bg-transparent transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        >
            <div
                className={`bg-[#131124] w-full max-h-[88vh] rounded-t-3xl p-6 space-y-6 transform transition-all duration-300 ease-in-out border border-white/10 shadow-2xl pb-8 overflow-y-auto ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-bold text-white tracking-wide">Ferramentas</h2>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>

                {isHost ? (
                    <>
                        <div className="bg-white/[0.02] p-[14px] rounded-[22px] border border-white/[0.02] shadow-sm">
                            <h3 className="text-[13px] font-semibold text-gray-400 mb-4 px-1.5 tracking-wide">Ferramentas de Interação</h3>
                            <div className="grid grid-cols-5 gap-y-4 gap-x-1.5 justify-items-center">
                                {cohostTools.map(tool => <ToolButton key={tool.label} {...tool} />)}
                            </div>
                        </div>

                        <div className="bg-white/[0.02] p-[14px] rounded-[22px] border border-white/[0.02] shadow-sm">
                            <h3 className="text-[13px] font-semibold text-gray-400 mb-4 px-1.5 tracking-wide">Ferramentas de Âncora</h3>
                            <div className="grid grid-cols-4 gap-y-5 gap-x-2.5 justify-items-center">
                                {anchorTools.map(tool => <ToolButton key={tool.label} {...tool} />)}
                            </div>
                        </div>

                        <div className="bg-white/[0.02] p-[14px] rounded-[22px] border border-white/[0.02] shadow-sm">
                            <h3 className="text-[13px] font-semibold text-gray-400 mb-1 px-1.5 tracking-wide">Presente Fixado na Tela</h3>
                            <p className="text-[11px] text-gray-500 px-1.5 mb-3">Selecione um presente para fixá-lo no canto da transmissão, como no Guzzcast.</p>
                            {gifts.length === 0 ? (
                                <p className="text-[11px] text-gray-500 px-1.5 py-2">Nenhum presente disponível.</p>
                            ) : (
                                <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1 no-scrollbar">
                                    {gifts.map(gift => {
                                        const isSelected = selectedPinnedGift && (selectedPinnedGift.id || selectedPinnedGift.name) === (gift.id || gift.name);
                                        const isPinned = pinnedGift && (pinnedGift.id || pinnedGift.name) === (gift.id || gift.name);
                                        return (
                                            <button
                                                key={gift.id || gift.name}
                                                onClick={(e) => { e.stopPropagation(); setSelectedPinnedGift(gift); setPinnedGiftLabel(prev => (prev && prev !== (selectedPinnedGift?.name || '')) ? prev : gift.name); }}
                                                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all border outline-none cursor-pointer ${isSelected ? 'border-[#00e5ff] bg-[#00e5ff]/5 shadow-[0_0_12px_rgba(0,229,255,0.2)] scale-[1.02]' : 'border-transparent bg-transparent hover:bg-white/[0.03]'}`}
                                            >
                                                <div className="w-11 h-11 flex items-center justify-center">
                                                    {renderGiftVisual(gift)}
                                                </div>
                                                <p className="w-full text-[10px] text-gray-300 text-center truncate font-medium mt-1">{gift.name}</p>
                                                {isPinned && (
                                                    <span className="absolute top-0.5 right-0.5 text-[9px]">📌</span>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#00e5ff] rounded-full flex items-center justify-center shadow-md">
                                                        <svg className="w-2 h-2 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <input
                                type="text"
                                value={pinnedGiftLabel}
                                onChange={(e) => setPinnedGiftLabel(e.target.value)}
                                placeholder={selectedPinnedGift ? `Nome: ${selectedPinnedGift.name}` : 'Nome do presente fixado'}
                                maxLength={40}
                                className="w-full h-10 rounded-xl bg-white/[0.06] border border-white/10 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00e5ff]"
                            />
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    onClick={handleSavePinnedGift}
                                    disabled={!selectedPinnedGift}
                                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#bd00ff] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wide uppercase transition-all active:scale-95 cursor-pointer"
                                >
                                    Fixar na Tela
                                </button>
                                <button
                                    onClick={handleRemovePinnedGift}
                                    disabled={!pinnedGift}
                                    className="h-10 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white/[0.02] p-[14px] rounded-[22px] border border-white/[0.02] shadow-sm">
                        <h3 className="text-[13px] font-semibold text-gray-400 mb-4 px-1.5 tracking-wide">Ações do Espectador</h3>
                        <div className="grid grid-cols-5 gap-y-4 gap-x-1.5 justify-items-center">
                            {spectatorTools.map(tool => <ToolButton key={tool.label} {...tool} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolsModal;