import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { BackIcon } from './icons';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import LiveBadge from './ui/LiveBadge';

interface FansScreenProps {
  onBack: () => void;
  onViewProfile: (user: User) => void;
  onOpenLive?: (user: User) => void;
  users: User[];
  onFollowUser: (user: User) => void;
  currentUser?: { id: string };
}

const UserItem: React.FC<{ 
  user: User; 
  onRowClick: () => void; 
  onFollowClick: () => void; 
  onOpenLive?: (user: User) => void; 
}> = ({ user, onRowClick, onFollowClick, onOpenLive }) => {
    const { t } = useTranslation();
    const handleTag = user.name.toLowerCase().replace(/\s+/g, '');
    
    return (
        <div 
            className="flex items-center justify-between py-3.5 px-4 hover:bg-white/[0.02] active:bg-white/[0.04] cursor-pointer transition-colors" 
            onClick={onRowClick}
        >
            <div className="flex items-center space-x-4">
                <div className="relative flex-shrink-0">
                    <div className="rounded-full p-[2px] bg-gradient-to-b from-[#e1ba72] via-[#ead098] to-[#ab873c] shadow-md shadow-black/20">
                        <div className="rounded-full p-[1.5px] bg-[#000000]">
                            <img src={user.avatarUrl} alt={user.name} className="w-[48px] h-[48px] rounded-full object-cover" />
                        </div>
                    </div>
                    {user.isLive && (
                        <LiveBadge label="" showLabel={false} iconClassName="w-[13px] h-[13px]" className="absolute -bottom-1 -right-1 rounded-full p-[2px]" onClick={(e) => { e.stopPropagation(); onOpenLive?.(user); }} />
                    )}
                </div>
                <div>
                    <h3 className="font-normal text-[#dfc38f] flex items-center gap-1.5 text-[16px] tracking-wide">
                        {user.name.toLowerCase()}
                        {user.isVIP && (
                            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full scale-90">
                                VIP
                            </span>
                        )}
                    </h3>
                    <p className="text-[13px] text-zinc-500 font-light mt-0.5">@{handleTag}</p>
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onFollowClick(); }}
                className={`text-[13px] font-medium text-white px-6 py-2.5 rounded-full transition-all duration-150 active:scale-95 ${
                    user.isFollowed 
                        ? 'bg-[#1c1d21] hover:bg-[#25272d]' 
                        : 'bg-purple-600 hover:bg-purple-700'
                }`}
            >
                {user.isFollowed ? t('common.following') : t('common.follow')}
            </button>
        </div>
    );
};


const FansScreen: React.FC<FansScreenProps> = ({ onBack, onViewProfile, onOpenLive, users, onFollowUser, currentUser }) => {
    const { t } = useTranslation();
    const [localUsers, setLocalUsers] = useState<User[]>(users);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const hasLoadedRef = useRef(false);

    // Carregar dados da API quando o componente é montado (apenas uma vez)
    useEffect(() => {
        if (currentUser?.id && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadFansData();
        }
    }, [currentUser?.id]);

    const loadFansData = async () => {
        if (!currentUser?.id) return;
        try {
            setIsLoading(true);
            const fansData = await api.getFansUsers(currentUser.id);
            setLocalUsers(fansData);
        } catch (error) {
            console.error('❌ [FANS-SCREEN] Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFollowClick = async (user: User) => {
        try {
            await onFollowUser(user);
            setLocalUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFollowed: !u.isFollowed } : u));
        } catch (error) {
            console.error('Erro ao alternar seguimento:', error);
        }
    };

    const handleSheetFollowToggle = async (user: User) => {
        try {
            await onFollowUser(user);
            setLocalUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFollowed: !u.isFollowed } : u));
        } catch (error) {
            console.error('Erro ao alternar seguimento do fã:', error);
        } finally {
            setIsSheetOpen(false);
            setSelectedUser(null);
        }
    };

    const handleItemClick = (user: User) => {
        onViewProfile(user);
    };

    return (
        <div className="absolute inset-0 bg-[#000000] z-50 flex flex-col text-white">
            <header className="relative flex items-center justify-center p-4 h-16 flex-shrink-0">
                <button onClick={onBack} className="absolute left-4">
                    <BackIcon className="w-6 h-6 text-white hover:opacity-80 active:scale-95 transition-all" />
                </button>
                <h1 className="text-lg font-medium text-white tracking-wide">
                    {t('userLists.fans.title')}
                </h1>
            </header>
            
            <main className="flex-grow overflow-y-auto no-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-zinc-500 text-sm">Carregando...</p>
                    </div>
                ) : localUsers.length > 0 ? (
                    <div className="flex flex-col py-2">
                        {localUsers.map(user => (
                            <UserItem 
                                key={user.id} 
                                user={user} 
                                onRowClick={() => handleItemClick(user)} 
                                onFollowClick={() => handleFollowClick(user)} 
                                onOpenLive={onOpenLive} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                        <p>{t('userLists.fans.noUsers')}</p>
                    </div>
                )}
            </main>

            {/* Bottom Option Sheet / Modal de Confirmação */}
            {isSheetOpen && selectedUser && (
                <div 
                    className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end justify-center transition-opacity duration-300"
                    onClick={() => {
                        setIsSheetOpen(false);
                        setSelectedUser(null);
                    }}
                >
                    <div 
                        className="w-full max-w-sm bg-[#121214] rounded-t-3xl p-6 pb-10 space-y-5 shadow-2xl border-t border-white/[0.04]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2"></div>
                        
                        {/* User Summary Info */}
                        <div className="flex flex-col items-center text-center space-y-3 pb-3">
                            <div className="rounded-full p-[2px] bg-gradient-to-b from-[#e1ba72] via-[#ead098] to-[#ab873c]">
                                <div className="rounded-full p-[1.5px] bg-[#121214]">
                                    <img 
                                        src={selectedUser.avatarUrl} 
                                        alt={selectedUser.name} 
                                        className="w-[64px] h-[64px] rounded-full object-cover" 
                                    />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-[#dfc38f] text-base">{selectedUser.name.toLowerCase()}</h3>
                                <p className="text-xs text-zinc-500">@{selectedUser.name.toLowerCase().replace(/\s+/g, '')}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <button
                                onClick={() => handleSheetFollowToggle(selectedUser)}
                                className={`w-full py-3.5 active:scale-[0.98] text-white font-semibold text-sm rounded-full transition-all ${
                                    selectedUser.isFollowed 
                                        ? 'bg-red-600 hover:bg-red-700' 
                                        : 'bg-[#dcb974] text-black hover:bg-[#ebd09a]'
                                }`}
                            >
                                {selectedUser.isFollowed ? 'Deixar de Seguir' : 'Seguir de Volta'}
                            </button>
                            
                            <button
                                onClick={() => {
                                    setIsSheetOpen(false);
                                    onViewProfile(selectedUser);
                                    setSelectedUser(null);
                                }}
                                className="w-full py-3.5 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white font-medium text-sm rounded-full transition-all"
                            >
                                Ver Perfil Completo
                            </button>
                            
                            <button
                                onClick={() => {
                                    setIsSheetOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="w-full py-3.5 bg-zinc-800 hover:bg-[#252723] active:scale-[0.98] text-zinc-300 font-medium text-sm rounded-full transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FansScreen;