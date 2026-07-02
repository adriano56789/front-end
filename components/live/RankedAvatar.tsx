import React from 'react';
import { User } from '../../types';

const RankedAvatarBadge: React.FC<{ rank: number }> = ({ rank }) => {
    // Only show badges for top 3
    if (rank > 3) {
        return null;
    }

    // User requested specific colors: 1st black, 2nd blue, 3rd other.
    const badgeColor =
        rank === 1 ? 'bg-black' :
        rank === 2 ? 'bg-blue-500' :
        'bg-slate-600';

    // Use a white border for the black badge for contrast
    const borderColor = rank === 1 ? 'border-white/50' : 'border-black';

    // Positioned on top of the avatar's head.
    return (
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center border ${badgeColor} ${borderColor} z-10`}>
            <span 
                className="text-white text-[9px] font-bold leading-none"
                style={{ textShadow: '0 0 2px black' }}
            >
                {rank}
            </span>
        </div>
    );
};


interface RankedAvatarProps {
    user: User;
    rank: number;
    onClick: (user: User) => void;
}

export const RankedAvatar: React.FC<RankedAvatarProps> = ({ user, rank, onClick }) => {
    const frameGlowClass = '';

    return (
        <button onClick={(e) => { e.stopPropagation(); onClick(user); }} className="relative shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-700">
            <img 
                src={user.avatarUrl || (user as any).avatar || `https://picsum.photos/seed/${user.id || 'default'}/200/200.jpg`} 
                alt={user.name} 
                className="absolute inset-0 w-full h-full object-cover block rounded-full" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <RankedAvatarBadge rank={rank} />
        </button>
    );
};