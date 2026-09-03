import React, { useState, useEffect } from 'react';
import { User, RankedUser } from '../types';
import { BackIcon } from './icons';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import AvatarWithFrame from './ui/AvatarWithFrame';
import { RealisticTop1CrownIcon } from './icons/RealisticTop1CrownIcon';
import { RealisticRank2CrownIcon } from './icons/RealisticRank2CrownIcon';
import { RealisticRank3CrownIcon } from './icons/RealisticRank3CrownIcon';

const formatContribution = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
};

const getDiamondIcon = (rank: number) => {
    const r = rank % 3;
    if (r === 1) { // 1, 4, 7...
        return (
            <svg className="w-5 h-5 text-yellow-500 drop-shadow-[0_1px_4px_rgba(234,179,8,0.52)]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12,2 4,10 12,22 20,10" />
            </svg>
        );
    } else if (r === 2) { // 2, 5, 8...
        return (
            <svg className="w-5 h-5 text-slate-300 drop-shadow-[0_1px_4px_rgba(203,213,225,0.52)]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12,2 4,10 12,22 20,10" />
            </svg>
        );
    } else { // 3, 6, 9...
        return (
            <svg className="w-5 h-5 text-amber-700 drop-shadow-[0_1px_4px_rgba(180,83,9,0.52)]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12,2 4,10 12,22 20,10" />
            </svg>
        );
    }
};

const TopFansScreen: React.FC<{ onBack: () => void; onViewProfile: (user: User) => void; currentUser?: User | null; hostId?: string | null }> = ({ onBack, onViewProfile, currentUser, hostId }) => {
    const { t } = useTranslation();
    const [fans, setFans] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const targetId = hostId || currentUser?.id;
        if (!targetId) return;
        
        api.getRankingForPeriod('monthly', targetId, 'fans')
            .then(data => {
                setFans(data || []);
                setIsLoading(false);
            })
            .catch(err => {
                setIsLoading(false);
            });
    }, [hostId, currentUser?.id]);

    const topUser = fans[0];
    const secondUser = fans[1];
    const thirdUser = fans[2];
    const otherUsers = fans.slice(3);

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col text-white">
            {/* Header */}
            <header className="flex items-center p-4 border-b border-white/5 flex-shrink-0 relative">
                <button onClick={onBack} className="absolute left-4 p-1 active:scale-95 transition-transform">
                    <BackIcon className="w-6 h-6 text-white" />
                </button>
                <div className="flex-grow text-center">
                    <h1 className="text-xl font-bold tracking-tight text-white">Top Fãs</h1>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                    </div>
                ) : (
                    fans.length > 0 ? (
                        <div className="flex flex-col space-y-4">
                            
                            {/* --- RANK 1: GOLDEN CARD --- */}
                            {topUser && (
                                <div 
                                    onClick={() => onViewProfile(topUser)}
                                    className="relative bg-gradient-to-r from-amber-600/30 via-yellow-400/20 to-amber-700/30 border-2 border-yellow-400/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(234,179,8,0.25)] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform overflow-visible mt-8"
                                >
                                    <div className="flex items-center space-x-3">
                                        {/* Rank Number */}
                                        <span className="w-6 text-center text-3xl font-extrabold text-yellow-500 italic">1</span>
                                        
                                        <div className="relative">
                                            {/* Beautiful Golden Crown styled at the top */}
                                            <div className="absolute -top-[2.8rem] left-1/2 -translate-x-1/2 z-20 scale-[1.3]">
                                                <RealisticTop1CrownIcon className="w-16 h-16 filter drop-shadow-md" />
                                            </div>
                                            
                                            {/* Golden Avatar Ring - size should perfectly match user avatar size="lg" (80px) */}
                                            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.35)] relative z-10 flex items-center justify-center">
                                                <AvatarWithFrame 
                                                    user={topUser} 
                                                    size="lg" 
                                                    showFrame={false}
                                                    className="w-full h-full rounded-full border-2 border-black"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-extrabold text-base text-white flex items-center space-x-1">
                                                <span>{topUser.name || 'Usuário'}</span>
                                                <span className="text-sm">👑</span>
                                            </h3>
                                            <p className="text-xs text-yellow-300/60 font-semibold mt-0.5">@{topUser.name || 'usuario'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-yellow-500/20">
                                        <span className="font-bold text-lg text-yellow-400 italic">
                                            {formatContribution(topUser.contribution || 0)}
                                        </span>
                                        {getDiamondIcon(1)}
                                    </div>
                                </div>
                            )}

                            {/* --- RANK 2: SILVER CARD --- */}
                            {secondUser && (
                                <div 
                                    onClick={() => onViewProfile(secondUser)}
                                    className="relative bg-gradient-to-r from-zinc-700/20 via-zinc-400/10 to-zinc-800/20 border-2 border-zinc-400/40 rounded-2xl p-4 shadow-[0_0_15px_rgba(228,228,231,0.12)] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform overflow-visible mt-6"
                                >
                                    <div className="flex items-center space-x-3">
                                        {/* Rank Number */}
                                        <span className="w-6 text-center text-2xl font-black text-slate-300 italic">2</span>
                                        
                                        <div className="relative">
                                            {/* Silver Crown on top of avatar */}
                                            <div className="absolute -top-[2.2rem] left-1/2 -translate-x-1/2 z-20">
                                                <RealisticRank2CrownIcon className="w-12 h-12 filter drop-shadow-md" />
                                            </div>
                                            
                                            {/* Silver Avatar Ring - perfectly matches user avatar size="md" (64px) */}
                                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-b from-slate-200 via-slate-400 to-slate-500 shadow-[0_0_10px_rgba(148,163,184,0.25)] relative z-10 flex items-center justify-center">
                                                <AvatarWithFrame 
                                                    user={secondUser} 
                                                    size="md" 
                                                    showFrame={false}
                                                    className="w-full h-full rounded-full border border-black"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-1">
                                                <span>{secondUser.name || 'Usuário'}</span>
                                                <span className="text-xs text-zinc-400">👑</span>
                                            </h3>
                                            <p className="text-xs text-zinc-400/60 mt-0.5">@{secondUser.name || 'usuario'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1.5 bg-black/30 px-3 py-1 rounded-full border border-zinc-500/10">
                                        <span className="font-bold text-base text-zinc-300">
                                            {formatContribution(secondUser.contribution || 0)}
                                        </span>
                                        {getDiamondIcon(2)}
                                    </div>
                                </div>
                            )}

                            {/* --- RANK 3: BRONZE CARD --- */}
                            {thirdUser && (
                                <div 
                                    onClick={() => onViewProfile(thirdUser)}
                                    className="relative bg-gradient-to-r from-amber-900/25 via-amber-700/10 to-amber-950/25 border-2 border-amber-700/40 rounded-2xl p-4 shadow-[0_0_15px_rgba(180,83,9,0.12)] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform overflow-visible mt-6"
                                >
                                    <div className="flex items-center space-x-3">
                                        {/* Rank Number */}
                                        <span className="w-6 text-center text-2xl font-black text-amber-600 italic">3</span>
                                        
                                        <div className="relative">
                                            {/* Bronze Crown on top of avatar */}
                                            <div className="absolute -top-[2.2rem] left-1/2 -translate-x-1/2 z-20">
                                                <RealisticRank3CrownIcon className="w-12 h-12 filter drop-shadow-md" />
                                            </div>
                                            
                                            {/* Bronze Avatar Ring - perfectly matches user avatar size="md" (64px) */}
                                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 shadow-[0_0_10px_rgba(217,119,6,0.25)] relative z-10 flex items-center justify-center">
                                                <AvatarWithFrame 
                                                    user={thirdUser} 
                                                    size="md" 
                                                    showFrame={false}
                                                    className="w-full h-full rounded-full border border-black"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-1">
                                                <span>{thirdUser.name || 'Usuário'}</span>
                                                <span className="text-xs text-amber-600">👑</span>
                                            </h3>
                                            <p className="text-xs text-zinc-400/60 mt-0.5">@{thirdUser.name || 'usuario'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1.5 bg-black/30 px-3 py-1 rounded-full border border-amber-800/10">
                                        <span className="font-bold text-base text-zinc-300">
                                            {formatContribution(thirdUser.contribution || 0)}
                                        </span>
                                        {getDiamondIcon(3)}
                                    </div>
                                </div>
                            )}

                            {/* --- LIST: RANKS 4+ --- */}
                            {otherUsers.length > 0 && (
                                <div className="flex flex-col space-y-1.5 pt-4">
                                    {otherUsers.map((user, index) => {
                                        const rank = index + 4;
                                        return (
                                            <div 
                                                key={user.id}
                                                onClick={() => onViewProfile(user)}
                                                className="flex items-center justify-between p-3 border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer rounded-xl active:scale-[0.99] transition-all"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <span className="w-8 text-center text-sm font-bold text-zinc-500">{rank}</span>
                                                    
                                                    <AvatarWithFrame 
                                                        user={user} 
                                                        size="sm" 
                                                        showFrame={false}
                                                        className="rounded-full border border-zinc-800"
                                                    />
                                                    
                                                    <div>
                                                        <h3 className="font-bold text-sm text-zinc-100">{user.name || 'Usuário'}</h3>
                                                        <p className="text-xs text-zinc-500 mt-0.5">@{user.id || user.name || 'usuario'}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center space-x-1.5">
                                                    <span className="font-black text-sm text-zinc-300">
                                                        {formatContribution(user.contribution || 0)}
                                                    </span>
                                                    {getDiamondIcon(rank)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12">
                            <svg className="w-16 h-16 text-zinc-700 mb-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            <p className="font-medium text-zinc-400">Nenhum fã principal ainda.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default TopFansScreen;
