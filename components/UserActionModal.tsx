import React from 'react';
import { User } from '../types';
import { UserIcon, StarIcon, BlockIcon, ShieldIcon, UserPlusIcon, RankIcon } from './icons';
import AvatarWithFrame from './ui/AvatarWithFrame';

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser: User | null;
  streamer: User | null;
  onViewProfile: (user: User) => void;
  onMention: (user: User) => void;
  onMakeModerator: (user: User) => void;
  onKick: (user: User) => void;
  isAlreadyModerator?: boolean;
}

const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)';
    let textCol = '#374151'; // dark silver-grey text for silver levels
    let borderColor = '#9ca3af'; // silver border
    let glow = '0 0 6px rgba(156, 163, 175, 0.3)';
    let starColor = 'text-slate-500 fill-current';

    if (level >= 41) {
        bgGrad = 'linear-gradient(135deg, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fca5a5';
        glow = '0 0 10px rgba(244, 63, 94, 0.6)';
        starColor = 'text-rose-200 fill-current';
    } else if (level >= 21) {
        bgGrad = 'linear-gradient(135deg, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
        glow = '0 0 10px rgba(245, 158, 11, 0.6)';
        starColor = 'text-amber-200 fill-current';
    } else if (level >= 11) {
        bgGrad = 'linear-gradient(135deg, #ffedd5 0%, #d97706 50%, #7c2d12 100%)';
        textCol = '#ffffff';
        borderColor = '#fed7aa';
        glow = '0 0 8px rgba(217, 119, 6, 0.5)';
        starColor = 'text-orange-200 fill-current';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: `${glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`
            }}
            className="relative inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold font-sans tracking-tight h-[18px] select-none space-x-0.5 overflow-hidden"
        >
            <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
            <RankIcon className={`w-2.5 h-2.5 relative z-10 ${starColor}`} />
            <span className="relative z-10 leading-none">Lvl. {level}</span>
        </span>
    );
};

const UserActionModal: React.FC<UserActionModalProps> = ({ 
    isOpen, 
    onClose, 
    user, 
    currentUser, 
    streamer,
    onViewProfile, 
    onMention, 
    onMakeModerator, 
    onKick,
    isAlreadyModerator = false
}) => {
    if (!isOpen || !user) return null;

    // ID DO DONO DO APLICATIVO - PROTEÇÃO MÁXIMA
    const APP_OWNER_ID = 'adriano';
    
    // VERIFICAÇÕES DE PROTEÇÃO
    const isAppOwner = user.id === APP_OWNER_ID || user.id === '98501723' || user.name?.toLowerCase() === 'adriano';
    const isCurrentUserOwner = currentUser?.id === APP_OWNER_ID || currentUser?.id === '98501723' || currentUser?.name?.toLowerCase() === 'adriano';
    const isStreamer = user.id === streamer?.id || isAppOwner;
    const isCurrentUserStreamer = currentUser?.id === streamer?.id;
    
    // REGRAS DE PROTEÇÃO
    const canKick = !isAppOwner && !isStreamer && (isCurrentUserOwner || isCurrentUserStreamer);
    // Let's keep canMakeModerator true for the 2x2 grid layout display so it always aligns beautifully
    const canMakeModerator = true;

    // Se o usuário clicado for adriano (ou ID correspondente), o nível exibido será o nível real do usuário ou padrão 5
    const displayLevel = isAppOwner ? (user.level || 5) : (user.level || 1);

    const handleAction = (action: (user: User) => void) => {
        action(user);
        onClose();
    };

    const getKickButtonContent = () => {
        if (isAppOwner || isStreamer) {
            return {
                icon: <ShieldIcon className="w-5 h-5 text-cyan-400 stroke-[2]" />,
                text: "Host",
                bgColor: "bg-white/[0.03]", 
                hoverColor: "hover:bg-white/[0.08]",
                textColor: "text-white font-medium",
                disabled: true,
                title: "Host da transmissão"
            };
        }

        return {
            icon: <BlockIcon className="w-5 h-5 text-red-400" />,
            text: "Expulsar",
            bgColor: "bg-white/[0.03]",
            hoverColor: "hover:bg-red-500/20", 
            textColor: "text-white font-medium",
            disabled: false,
            title: "Expulsar usuário da transmissão"
        };
    };

    const kickButton = getKickButtonContent();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent animate-fade-in" onClick={onClose}>
            {/* Overlay transparente: NÃO tampar a transmissão com fundo preto.
                O painel compacto cobre só o centro; o vídeo ao redor fica visível. */}
            <div className="bg-[#07050f]/90 backdrop-blur-md rounded-[20px] w-[240px] p-4 text-center border border-white/[0.08] shadow-[0_16px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                
                {/* Purplish Glowing Avatar Frame wrapper */}
                <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[3px] border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.7)]" />
                    <div className="w-[56px] h-[56px] rounded-full overflow-hidden relative z-10 p-[1px] bg-black">
                        <AvatarWithFrame 
                            user={user} 
                            size="sm" 
                            showFrame={false}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-white tracking-tight leading-normal mb-0.5 truncate">{user.name}</h2>
                
                {/* User handle */}
                <span className="text-[10px] text-zinc-500 block mb-3 font-mono truncate">@{user.id}</span>
                
                {/* User stats & details */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 mb-4 text-left text-xs space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-medium text-[10px]">Nível atual</span>
                        <LevelBadge level={displayLevel} />
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-medium text-[10px]">Seguidores</span>
                        <span className="text-zinc-200 font-semibold text-[11px]">{user.fans ?? 0}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-medium text-[10px]">Cargo na Sala</span>
                        {isStreamer ? (
                            <span className="bg-[#26e3ff] text-zinc-950 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 tracking-wider uppercase">
                                <span>Host / Admin</span>
                            </span>
                        ) : isAlreadyModerator ? (
                            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_12px_rgba(59,130,246,0.6)] tracking-wider uppercase flex items-center h-[16px]">
                                Moderador
                            </span>
                        ) : (
                            <span className="text-zinc-300 font-medium text-[11px]">Usuário</span>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-medium text-[10px]">Distintivos</span>
                        <div className="flex gap-1.5">
                            <LevelBadge level={displayLevel} />
                            {/* VIP gold badge if user is VIP */}
                            {user.isVIP && (
                                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(250,204,21,0.5)] uppercase tracking-wide flex items-center">
                                    👑 VIP
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2x2 Bento Action Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. Ver Perfil */}
                    <button onClick={() => handleAction(onViewProfile)} className="bg-white/[0.03] border border-white/[0.01] hover:bg-white/[0.08] active:scale-[0.98] transition-all p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 min-h-[64px]">
                        <UserIcon className="w-5 h-5 text-zinc-300" />
                        <span className="text-[11px] text-zinc-300 font-medium">Ver Perfil</span>
                    </button>

                    {/* 2. Mencionar */}
                    <button onClick={() => handleAction(onMention)} className="bg-white/[0.03] border border-white/[0.01] hover:bg-white/[0.08] active:scale-[0.98] transition-all p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 min-h-[64px]">
                        <span className="text-lg font-black text-zinc-300">@</span>
                        <span className="text-[11px] text-zinc-300 font-medium">Mencionar</span>
                    </button>

                    {/* 3. Tornar Mod (Always visible to preserve beautiful 2x2 symmetry) */}
                    <button 
                        onClick={() => handleAction(onMakeModerator)} 
                        className="bg-white/[0.03] border border-white/[0.01] hover:bg-white/[0.08] active:scale-[0.98] transition-all p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 min-h-[64px]"
                    >
                        {isAlreadyModerator ? (
                            <>
                                <StarIcon className="w-5 h-5 text-purple-400 fill-purple-400" />
                                <span className="text-[11px] text-purple-400 font-bold whitespace-nowrap">Remover Mod</span>
                            </>
                        ) : (
                            <>
                                <StarIcon className="w-5 h-5 text-amber-400 animate-pulse" />
                                <span className="text-[11px] text-zinc-300 font-medium whitespace-nowrap">Tornar Mod</span>
                            </>
                        )}
                    </button>

                    {/* 4. Host or Expulsar Action Button */}
                    <button 
                        onClick={() => !kickButton.disabled && canKick && handleAction(onKick)} 
                        className={`border border-white/[0.01] active:scale-[0.98] transition-all p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 min-h-[64px] ${kickButton.disabled ? 'cursor-default opacity-85 bg-white/[0.03]' : `${kickButton.bgColor} hover:bg-red-500/10`}`}
                        disabled={kickButton.disabled}
                        title={kickButton.title}
                    >
                        {kickButton.icon}
                        <span className={`text-[11px] font-medium text-zinc-300`}>{kickButton.text}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserActionModal;