import React from 'react';
import { PlusIcon, SettingsIcon, IdBadgeIcon, MaleIcon, FemaleIcon } from '../icons';
import { User } from '../../types';

interface ChatMessageProps {
    userObject: User;
    message: string | React.ReactNode;
    onAvatarClick: () => void;
    onFollow?: () => void;
    isFollowed?: boolean;
    onModerationClick?: () => void;
    isModerator?: boolean;
}

const AgeBadge: React.FC<{ gender?: 'male' | 'female' | 'not_specified'; age?: number }> = ({ gender = 'female', age }) => {
    const isMale = gender === 'male';
    const displayAge = age && age > 0 ? age : 18;
    return (
        <span className={`text-white text-[8px] font-black px-1 py-0.5 rounded flex items-center space-x-0.5 select-none shadow-[0_1px_1.5px_rgba(0,0,0,0.35)] h-[13px] shrink-0 font-sans ${isMale ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
            {isMale ? <MaleIcon className="h-2.5 w-2.5 text-white" /> : <FemaleIcon className="h-2.5 w-2.5 text-white" />}
            <span>{displayAge}</span>
        </span>
    );
};

// Generate highly visible neon color codes based on username hash to mimic the image text
const getUsernameColor = (username: string, level?: number) => {
    if (username === 'Sistema' || (level && level >= 4)) return '#fbbf24'; // System or Level 4+ is gold/yellow
    const colors = [
        '#38bdf8', // Neon Sky Blue (like Alex in image)
        '#f472b6', // Neon Pink (like Mia in image)
        '#34d399', // Neon Mint Green (like Liam in image)
        '#c084fc', // Neon Violet/Purple
        '#fb923c', // Neon Orange
        '#22d3ee', // Neon Cyan
        '#ff7185', // Neon Rose
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const ChatMessage: React.FC<ChatMessageProps> = ({ userObject, message, onAvatarClick, onFollow, isFollowed, onModerationClick, isModerator }) => {
    const { name: user, level } = userObject;

    const isSystemMessage = user === 'Sistema';
    
    // We check if it is a transaction/gift message (with gold coins or purple system indicators)
    const messageStr = typeof message === 'string' ? message : '';
    const isPurpleSystem = isSystemMessage && (
        (typeof message === 'string' && (
            message.includes('enviou') || 
            message.includes('moedas') || 
            message.includes('moeda') || 
            message.includes('presente') || 
            message.includes('Sent a') || 
            message.includes('Enviou')
        )) || 
        (React.isValidElement(message)) // Gift JSX messages are always the purple transactional type
    );

    const nameColor = getUsernameColor(user, level);

    // Render system alerts with glorious background glows (golden aura or purple nebula) and 3D shadows of the style from user picture
    if (isSystemMessage) {
        if (isPurpleSystem) {
            return (
                <div 
                    onClick={onAvatarClick}
                    className="flex items-center gap-1.5 text-[10px] bg-purple-950/30 backdrop-blur-md border border-purple-500/50 rounded-[14px] px-2 py-0.5 my-0.5 max-w-[95%] self-start animate-chat-message cursor-pointer select-none shadow-[0_0_15px_rgba(168,85,247,0.35),_inset_0_1px_2px_rgba(168,85,247,0.15)] hover:bg-purple-900/40 transition-all duration-200"
                >
                    <span className="font-extrabold text-[#c084fc] font-sans tracking-wide text-[10px]">Sistema:</span>
                    <span className="text-purple-100 font-sans font-semibold tracking-wide flex items-center gap-1 leading-relaxed text-[10px]">{message}</span>
                </div>
            );
        } else {
            return (
                <div 
                    onClick={onAvatarClick}
                    className="flex items-center gap-1.5 text-[10px] bg-amber-950/30 backdrop-blur-md border border-amber-500/50 rounded-[14px] px-2 py-0.5 my-0.5 max-w-[95%] self-start animate-chat-message cursor-pointer select-none shadow-[0_0_15px_rgba(245,158,11,0.35),_inset_0_1px_2px_rgba(245,158,11,0.15)] hover:bg-amber-900/40 transition-all duration-200"
                >
                    <span className="font-extrabold text-[#fbbf24] font-sans tracking-wide text-[10px]">Sistema:</span>
                    <span className="text-amber-100 font-sans font-semibold tracking-wide flex items-center gap-1 leading-relaxed text-[10px]">{message}</span>
                </div>
            );
        }
    }

    // Standard Chat Message formatted as an ultra-sleek, semi-transparent capsule exactly like the user's reference image
    return (
        <div 
            onClick={onAvatarClick}
            className="flex items-center gap-1.5 text-[10px] bg-transparent rounded-[14px] px-2 py-0.5 my-0.5 max-w-[95%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-black/10 hover:scale-[1.01] active:scale-[0.98] animate-chat-message whitespace-normal break-words flex flex-wrap"
        >
            <span 
                className="font-extrabold tracking-wide shrink-0 font-sans text-[10px] pr-0.5"
                style={{ 
                    color: nameColor,
                    textShadow: '0 1px 1.5px rgba(0,0,0,0.85)'
                }}
            >
                {user}:
            </span>

            {/* ADM/Moderator badge - positioned above level */}
            {isModerator && (
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[8px] font-black px-1 py-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans flex items-center h-[13px] leading-none shrink-0 scale-[0.95]">
                    Adm
                </span>
            )}
            
            {/* Glossy Silver metal level badge matching the screenshot */}
            <span className="bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[8px] font-black px-1 py-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans flex items-center h-[13px]">
                Lvl. {level || 1}
            </span>

            {/* Age/Gender Icon badge */}
            <AgeBadge gender={userObject.gender} age={userObject.age} />

            <span 
                className="text-white font-sans font-semibold break-words leading-relaxed ml-0.5 tracking-wide text-[10px]"
                style={{ 
                    textShadow: '0 1px 1.5px rgba(0,0,0,0.85)'
                }}
            >
                {message}
            </span>

            {onModerationClick && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onModerationClick(); }} 
                    className="text-white/40 hover:text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                    aria-label={`Moderar ${user}`}
                >
                    <SettingsIcon className="w-3 h-3" />
                </button>
            )}

            {onFollow && !isFollowed && !onModerationClick && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onFollow(); }} 
                    className="bg-gradient-to-br from-[#bd00ff] to-[#ecb2ff] text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:opacity-90 transition-all cursor-pointer shadow-[0_0_6px_rgba(189,0,255,0.15)] shrink-0"
                    aria-label={`Seguir ${user}`}
                >
                    <PlusIcon className="w-2.5 h-2.5" />
                </button>
            )}
        </div>
    );
};

export default ChatMessage;
