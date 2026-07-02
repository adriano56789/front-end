import React from 'react';
import { User } from '../types';
import { BackIcon, BrazilFlagIcon, MaleIcon, FemaleIcon, RankIcon } from './icons';
import { useTranslation } from '../i18n';

// Badges as seen in the screenshot
const AgeBadge: React.FC<{ user: User }> = ({ user }) => (
    <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 ${user.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
        {user.gender === 'male' ? <MaleIcon className="h-3 w-3" /> : <FemaleIcon className="h-3 w-3" />}
        <span>{user.age}</span>
    </span>
);

const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)';
    let textCol = '#374151'; // dark silver-grey text for silver levels
    let borderColor = '#9ca3af'; // silver border
    let glow = '0 0 6px rgba(156, 163, 175, 0.3)';
    let starColor = 'text-slate-500 fill-current';

    if (level >= 41) {
        // Red/rose profile level style matching UserLevelsScreen for top levels
        bgGrad = 'linear-gradient(135deg, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fca5a5';
        glow = '0 0 10px rgba(244, 63, 94, 0.6)';
        starColor = 'text-rose-200 fill-current';
    } else if (level >= 21) {
        // Gold style
        bgGrad = 'linear-gradient(135deg, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
        glow = '0 0 10px rgba(245, 158, 11, 0.6)';
        starColor = 'text-amber-200 fill-current';
    } else if (level >= 11) {
        // Bronze style
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
            className="relative inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold font-sans tracking-tight h-[16px] select-none space-x-0.5 overflow-hidden"
        >
            {/* Glass reflection shine overlay */}
            <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
            <RankIcon className={`w-2 h-2 relative z-10 ${starColor}`} />
            <span className="relative z-10 leading-none">Lvl. {level}</span>
        </span>
    );
};

const UserItem: React.FC<{ user: User; onClick: () => void; onFollow: (user: User) => void; }> = ({ user, onClick, onFollow }) => {
    const { t } = useTranslation();
    
    // Placeholder date as it's not in the model
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-800" onClick={onClick}>
            <div className="flex items-center space-x-4 cursor-pointer">
                <div className="relative">
                    <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1">
                        <BrazilFlagIcon className="w-5 h-5 rounded-full" />
                    </div>
                </div>
                <div className="flex flex-col space-y-1">
                    <h3 className="font-semibold text-white">{user.name}</h3>
                    <div className="flex items-center space-x-1.5">
                        {user.age && <AgeBadge user={user} />}
                        <LevelBadge level={user.level} />
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                 <span className="text-sm text-gray-500">{formattedDate}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); onFollow(user); }}
                    className="text-sm font-semibold px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                   {t('common.following')}
                </button>
            </div>
        </div>
    );
};


interface FriendRequestsScreenProps {
  onBack: () => void;
  onViewProfile: (user: User) => void;
  users: User[];
  onFollowUser: (user: User) => void;
}

const FriendRequestsScreen: React.FC<FriendRequestsScreenProps> = ({ onBack, onViewProfile, users, onFollowUser }) => {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 bg-[#111] z-50 flex flex-col text-white">
            <header className="flex items-center p-4 border-b border-gray-800 flex-shrink-0">
                <button onClick={onBack} className="absolute">
                    <BackIcon className="w-6 h-6" />
                </button>
                <div className="flex-grow text-center">
                    <h1 className="text-lg font-semibold">Pedido de amizade</h1>
                </div>
                <div className="w-6"/> {/* Spacer */}
            </header>
            <main className="flex-grow overflow-y-auto no-scrollbar">
                {users && users.length > 0 ? (
                    users.map(user => <UserItem key={user.id} user={user} onClick={() => onViewProfile(user)} onFollow={onFollowUser} />)
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Nenhum pedido de amizade enviado.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FriendRequestsScreen;