import React, { useState, useEffect } from 'react';
import { CloseIcon, ActionIcon, YellowDiamondIcon, CrownIcon, UserIcon, RankIcon } from '../icons';
import ConnectionQualityIndicator, { ConnectionQualityValue } from './ConnectionQualityIndicator';
import { User } from '../../types';
import { api } from '../../services/api';
// Socket.IO removido — eventos via API REST + polling
import { LoadingSpinner } from '../Loading';

interface OnlineUsersModalProps {
    onClose: () => void;
    streamId: string;
    userId: string;
    currentUser?: User | null; // Para sincronizar avatar do usuário atual em tempo real
    onSelectUser?: (user: User) => void;
    moderatorIds?: string[];
    connectionQualities?: Record<string, ConnectionQualityValue>;
}

const UserItem: React.FC<{ user: User & { value: number }; rank: number; onClick?: () => void; isModerator?: boolean; quality?: ConnectionQualityValue }> = ({ user, rank, onClick, isModerator, quality }) => {
    // Proteção contra dados inválidos
    if (!user || !user.id) {
        return null;
    }
    
    return (
        <div 
            onClick={onClick}
            className={`flex items-center gap-4 p-4 mx-4 my-2 rounded-2xl bg-[#14161d] border border-white/[0.02] ${onClick ? 'cursor-pointer hover:bg-white/[0.04] active:scale-[0.99] transition-all' : ''}`}
        >
            {/* Crown or Rank Rank Display */}
            <div className="flex-shrink-0 flex items-center justify-center">
                {rank === 1 ? (
                    <span className="text-xl">👑</span>
                ) : (
                    <span className="text-sm font-bold text-gray-500 w-6 text-center">{rank}</span>
                )}
            </div>

            {/* Glowing avatar with indicators */}
            <div className="relative flex-shrink-0 p-[2px] rounded-full bg-gradient-to-tr from-[#9c27b0] to-[#e040fb]">
                <div className="rounded-full bg-black p-[2px]">
                    <img 
                        src={user.avatarUrl && user.avatarUrl.trim() ? `${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${user.avatarUrl.slice(-12)}` : 'https://picsum.photos/seed/default-avatar/200/200.jpg'} 
                        alt={user.name || 'Usuário'} 
                        className="w-10 h-10 rounded-full object-cover bg-gray-900"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback-avatar/200/200.jpg';
                        }}
                    />
                </div>
                {/* Online indicator green dot */}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#14161d]"></span>
            </div>

            {/* User details & Badges */}
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="font-bold text-white tracking-wide truncate">{user.name || 'Usuário'}</p>
                    <ConnectionQualityIndicator quality={quality} />
                    {isModerator && (
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans flex items-center h-[16px] leading-none shrink-0">
                            Adm
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                    {/* Orange Capsule Value Badge */}
                    <div className="flex items-center gap-1 bg-[#2b1f13] text-[#f59e0b] px-2.5 py-0.5 rounded-full border border-yellow-700/20 text-[10px] font-extrabold font-mono">
                        <span>▼</span>
                        <span>{user.value || 77}</span>
                    </div>

                    {/* Glossy Silver metal level badge matching the screenshot */}
                    <span className="bg-gradient-to-b from-zinc-200 via-white to-zinc-400 text-zinc-900 border border-zinc-200 text-[10px] font-black px-2 py-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans flex items-center h-[18px] leading-none">
                        Lvl. {user.level || 1}
                    </span>
                </div>
            </div>
        </div>
    );
};


const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({ onClose, streamId, userId, currentUser, onSelectUser, moderatorIds = [], connectionQualities = {} }) => {
    const [users, setUsers] = useState<(User & { value: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mesclar avatar atualizado do usuário logado (sincronização em tempo real)
    // 🚫 Usuário simulado REMOVIDO — apenas usuários reais aparecem na lista
    const usersWithFreshAvatar = (users || []).map(u =>
        currentUser && u.id === currentUser.id ? { ...u, avatarUrl: currentUser.avatarUrl || u.avatarUrl } : u
    );

    useEffect(() => {
        // Conectar à sala da stream para receber atualizações em tempo real
        // Socket.IO joinRoom removido — presença via API

        // Handler para quando presente é enviado para a stream
        const handleGiftSent = async (data: { streamId: string; gift: { fromUserId: string; totalValue: number } }) => {
            if (data.streamId === streamId) {
                // Recarregar usuários da API para pegar valores atualizados
                try {
                    const updatedUsers = await api.getStreamOnlineUsers(streamId);
                    if (Array.isArray(updatedUsers)) {
                        setUsers(updatedUsers);
                    }
                } catch (error) {
                    console.log('Erro ao recarregar usuários após presente:', error);
                }
            }
        };

        // Handler para quando live é encerrada (remover todos os usuários)
        const handleStreamEnded = (data: { streamId: string }) => {
            if (data.streamId === streamId) {
                // Remover todos os usuários
                setUsers([]);
            }
        };

        // Handler para quando usuário é forçado a sair da live
        const handleLiveStreamEnded = (data: { streamId: string }) => {
            if (data.streamId === streamId) {
                // Limpar usuários quando a live termina
                setUsers([]);
            }
        };

        // Socket.IO listeners removidos — eventos via API + REST polling

        // Initial fetch - APENAS UMA CHAMADA
        const fetchUsers = async () => {
            try {
                if (!streamId || typeof streamId !== 'string') {
                    throw new Error('ID da stream inválido');
                }
                
                const data = await api.getStreamOnlineUsers(streamId);
                
                console.log('🔍 [ONLINE USERS MODAL] API retornou:', data);
                
                if (Array.isArray(data)) {
                    // A API já retorna usuários únicos e válidos, não precisa filtrar duplicados
                    setUsers(data);
                } else {
                    setUsers([]);
                }
                
                setError(null);
            } catch (err) {
                setError('Não foi possível carregar os usuários');
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
        
        return () => {
            // Cleanup: Socket.IO removido
        };
    }, [streamId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-[#0f1115] w-full max-h-[92vh] h-auto rounded-t-3xl flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.8)] border border-white/5"
                onClick={e => e.stopPropagation()}
            >
                <header className="relative flex items-center justify-between p-4 flex-shrink-0 select-none">
                    <button onClick={onClose} className="text-white hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-1">
                        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <h2 className="text-md font-bold text-white tracking-wide absolute left-1/2 -translate-x-1/2">
                        Usuários Online ({users.length})
                    </h2>
                    
                    <button className="text-white hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-1">
                        {/* Chain Link Icon matching screenshot 3 header on the right */}
                        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto no-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-4">
                            <UserIcon className="w-16 h-16 mb-4" />
                            <p className="font-semibold text-red-400">Erro ao carregar</p>
                            <p className="text-sm">{error}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : usersWithFreshAvatar.length > 0 ? (
                        usersWithFreshAvatar.map((user, index) => (
                            <UserItem 
                                key={user.id || `user-${index}`} 
                                user={user} 
                                rank={index + 1} 
                                onClick={onSelectUser ? () => onSelectUser(user) : undefined}
                                isModerator={moderatorIds.includes(user.id)}
                                quality={connectionQualities[user.id]}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-4">
                            <UserIcon className="w-16 h-16 mb-4" />
                            <p className="font-semibold">Nenhum usuário encontrado</p>
                            <p className="text-sm">Tente novamente mais tarde</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default OnlineUsersModal;