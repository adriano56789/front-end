import React from 'react';
import { User } from '../../types';
import { PlusIcon, RankIcon, MaleIcon, FemaleIcon } from '../icons';

interface EntryChatMessageProps {
    user: User;
    currentUser: User;
    onClick: (user: User) => void;
    onFollow: (user: User) => void;
    isFollowed: boolean;
    isBroadcaster?: boolean;
    isModerator?: boolean;
    timestamp?: string | number;
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

const EntryChatMessage: React.FC<EntryChatMessageProps> = ({ user, currentUser, onClick, onFollow, isFollowed, isBroadcaster, isModerator }) => {
    const showFollowButton = !isBroadcaster && !isFollowed;

    return (
        <div 
            onClick={() => onClick(user)}
            className="flex items-center gap-1.5 text-[10px] bg-transparent rounded-[14px] px-2 py-0.5 my-0.5 max-w-[95%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-black/10 hover:scale-[1.01] active:scale-[0.98] animate-chat-message whitespace-normal break-words flex flex-wrap"
            data-purpose="system-notification"
        >
            <span 
                className="text-[#fbbf24] font-extrabold tracking-wide font-sans text-[10px]"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {user.name}
            </span>
            
            {/* Glossy Silver metal level badge matching the screenshot */}
            <span className="bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[8px] font-black px-1 py-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans flex items-center h-[13px]">
                Lvl. {user.level || 1}
            </span>

            {/* Age/Gender Icon badge */}
            <AgeBadge gender={user.gender} age={user.age} />

            {isModerator && (
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[8px] font-black px-1 py-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans flex items-center h-[13px] leading-none shrink-0 scale-[0.95]">
                    Adm
                </span>
            )}

            <span 
                className="text-zinc-300 font-sans font-semibold text-[10px] ml-0.5 tracking-wide"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                entrou na sala.
            </span>

            {showFollowButton && (
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFollow(user);
                    }}
                    className="ml-1 w-4.5 h-4.5 bg-[#a855f7] hover:bg-[#b055f7] text-white rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-sm active:scale-95"
                    aria-label={`Seguir ${user.name}`}
                >
                    <PlusIcon className="w-2.5 h-2.5" />
                </button>
            )}
        </div>
    );
};

export default EntryChatMessage;