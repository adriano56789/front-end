import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon, ClockIcon, FilterIcon, SearchIcon, BellOffIcon, QuestionMarkIcon, UserIcon, LiveIndicatorIcon } from './icons';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import { useTranslation } from '../i18n';
// Socket.IO removido — convites gerenciados via REST API

interface LiveUserEntry {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string;
  status: string;
}

interface CoHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (friend: User) => void;
  onOpenTimerSettings: () => void;
  currentUser: User;
  addToast: (type: ToastType, message: string) => void;
  streamId: string;
  mode?: 'cohost' | 'battle';
  /** 📡 LiveKit RPC: substitui a chamada REST API para enviar convite direto ao participante */
  onRpcInvite?: (friend: User) => Promise<{success: boolean; error?: string; message?: string}>;
}

const CoHostModal: React.FC<CoHostModalProps> = ({ 
  isOpen, 
  onClose, 
  onInvite, 
  onOpenTimerSettings, 
  currentUser, 
  addToast, 
  streamId,
  mode = 'cohost'
}) => {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<User[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveUserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);
  const [acceptFriendsOnly, setAcceptFriendsOnly] = useState(true);

  // Atualiza lista de live users
  const fetchLiveUsers = useCallback(async () => {
    if (!streamId) return;
    try {
      const res = await api.getLiveBattleUsers(streamId);
      console.log(`[CoHostModal] LiveUsers atualizados: ${res?.users?.length || 0}`);
      
      let users = res?.users || [];
      
      // Se API retornou zero, buscar fallback da lista de streamers ativos
      if (users.length === 0) {
        try {
          const streams = await api.getLiveStreamers('popular');
          const activeStreamers = (Array.isArray(streams) ? streams : [])
            .filter(s => s.isLive && s.hostId !== currentUser?.id)
            .map(s => ({
              userId: s.hostId,
              username: s.name,
              name: s.name,
              avatarUrl: s.avatar || '',
              status: s.streamStatus || 'broadcasting'
            }));
          if (activeStreamers.length > 0) {
            console.log(`[CoHostModal] Fallback: ${activeStreamers.length} streamers ativos encontrados na lista`);
            users = activeStreamers;
          }
        } catch (fallbackErr) {
          console.warn('[CoHostModal] Fallback fetchStreamers falhou:', fallbackErr);
        }
      }
      
      setLiveUsers(users);
    } catch (err) {
      console.error('[CoHostModal] Erro ao atualizar live users:', err);
    }
  }, [streamId, currentUser?.id]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setIsLoading(true);
      console.log(`[CoHostModal] Aberto mode=${mode} streamId=${streamId} currentUser.id=${currentUser.id}`);

      const fetchFriends = api.getFriends(currentUser.id)
        .then(data => {
          console.log(`[CoHostModal] Amigos carregados: ${data?.length || 0}`);
          setFriends(data || []);
        })
        .catch(() => setFriends([]));

      const fetchLive = mode === 'battle'
        ? api.getLiveBattleUsers(streamId)
            .then(res => {
              console.log(`[CoHostModal] LiveUsers resposta inicial:`, res);
              console.log(`[CoHostModal] LiveUsers carregados: ${res?.users?.length || 0}`);
              if (res?.users?.length > 0) {
                console.log(`[CoHostModal] LiveUsers:`, res.users.map((u: any) => ({ userId: u.userId, name: u.name, status: u.status })));
              }
              setLiveUsers(res?.users || []);
            })
            .catch((err) => {
              console.error(`[CoHostModal] Erro ao buscar live users:`, err);
              setLiveUsers([]);
            })
        : Promise.resolve();

      Promise.all([fetchFriends, fetchLive])
        .finally(() => setIsLoading(false));
    } else if (!isOpen) {
      setInvitedFriends(new Set());
      setSearchTerm('');
      setInvitingFriendId(null);
      setLiveUsers([]);
    }
  }, [isOpen, currentUser, streamId, mode, fetchLiveUsers]);

  // Socket.IO listeners removidos — fetchLiveUsers() é chamado manualmente ou via polling

  // Merge live users into a User-like format, deduplicating with friends
  const allUsers: User[] = React.useMemo(() => {
    const friendMap = new Map<string, User>();
    friends.forEach(f => friendMap.set(f.id, f));

    const merged: User[] = [...friends];
    liveUsers.forEach(lu => {
      if (!friendMap.has(lu.userId)) {
        merged.push({
          avatar: '',
          id: lu.userId,
          identification: lu.userId,
          name: lu.name,
          avatarUrl: lu.avatarUrl,
          username: lu.username,
          isLive: lu.status === 'broadcasting',
          isOnline: true,
          level: 1,
          fans: 0,
          following: 0,
          receptores: 0,
          enviados: 0,
          diamonds: 0,
          earnings: 0,
          earnings_withdrawn: 0,
          ownedFrames: [],
        } as User);
      }
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return merged.filter(u => u.name?.toLowerCase().includes(term) || u.id?.toLowerCase().includes(term));
    }
    return merged;
  }, [friends, liveUsers, searchTerm]);

  const handleInviteClick = async (friend: User) => {
    if (invitedFriends.has(friend.id) || invitingFriendId === friend.id) return;
    
    setInvitingFriendId(friend.id);
    const inviteTypeLabel = mode === 'battle' ? 'desafio de batalha' : 'co-host';
    addToast(ToastType.Info, `Convidando ${friend.name} para ${inviteTypeLabel}...`);

    try {
      // 📡 Usar RPC se disponivel (LiveKit), fallback para REST API
      if (typeof onRpcInvite === 'function') {
        const result = await onRpcInvite(friend);
        if (result.success) {
          addToast(ToastType.Success, result.message || `Convite para ${friend.name} enviado.`);
          setInvitedFriends(prev => new Set(prev).add(friend.id));
          onInvite(friend);
        } else {
          addToast(ToastType.Error, result.error || 'Falha ao enviar convite via RPC.');
        }
      } else {
        // Fallback: REST API
        const inviteType = mode === 'battle' ? 'pk-battle' : 'co-host';
        const { success, message, error } = await api.inviteFriendForCoHost(streamId, friend.id, inviteType);
        if (success) {
          addToast(ToastType.Success, message || `Convite para ${friend.name} enviado.`);
          setInvitedFriends(prev => new Set(prev).add(friend.id));
          onInvite(friend); 
        } else {
          addToast(ToastType.Error, error || 'Falha ao enviar convite.');
        }
      }
    } catch(err) {
      addToast(ToastType.Error, (err as Error).message || 'Erro de rede ao enviar convite.');
    } finally {
      setInvitingFriendId(null);
    }
  };

  const handleQuickInvite = () => {
    const liveNow = allUsers.filter(u => (u as any).isLive || liveUsers.some(lu => lu.userId === u.id && lu.status === 'broadcasting'));
    const candidates = acceptFriendsOnly ? liveNow.filter(u => friends.some(f => f.id === u.id)) : liveNow;
    if (candidates.length > 0) {
      const randomUser = candidates[Math.floor(Math.random() * candidates.length)];
      handleInviteClick(randomUser);
    } else {
      addToast(ToastType.Info, mode === 'battle' ? 'Procurando oponentes rápidos para Batalha PK...' : 'Procurando novos criadores para Co-host...');
      setTimeout(() => {
        addToast(ToastType.Error, 'Nenhum parceiro de live online no momento. Tente novamente mais tarde.');
      }, 1500);
    }
  };

  const getButtonState = (friendId: string) => {
      if (invitingFriendId === friendId) {
          return { text: "Convidando", disabled: true, className: "bg-gray-800 text-gray-500 cursor-wait" };
      }
      if (invitedFriends.has(friendId)) {
          return { text: t('common.invited') || "Convidado", disabled: true, className: "bg-gray-800 text-gray-500 cursor-not-allowed" };
      }
      return { 
          text: mode === 'battle' ? 'Batalha' : 'Convidar', 
          disabled: false, 
          className: "bg-[#FF2D55] text-white hover:bg-[#E02447] active:scale-95" 
      };
  };

  const isUserLive = (userId: string): boolean => {
    return liveUsers.some(lu => lu.userId === userId && lu.status === 'broadcasting');
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex items-end justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100 bg-transparent' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`bg-[#131124] w-full max-w-md h-[75%] rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-white/[0.03] flex-shrink-0 bg-[#131124] rounded-t-2xl">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/[0.04] transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center text-center justify-center">
            <h2 className="text-[17px] font-bold text-white tracking-wide leading-snug">
              {mode === 'battle' ? 'Batalha PK com' : 'Co-apresentador com'}
            </h2>
            <h2 className="text-[17px] font-bold text-white tracking-wide leading-none">
              {mode === 'battle' ? 'criadores' : 'criadores'}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={onOpenTimerSettings} 
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/[0.04] transition-colors" 
              title="Configurações de Tempo"
            >
              <ClockIcon className="w-[20px] h-[20px]" />
            </button>
            <button className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/[0.04] transition-colors" title="Filtrar">
              <FilterIcon className="w-[20px] h-[20px]" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto no-scrollbar font-sans">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
            <input
              type="text"
              placeholder={t('cohost.searchPlaceholder') || "Pesquisar por nome ou usuário"}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] text-white placeholder-gray-500 rounded-full py-2.5 pl-10 pr-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-700 border border-white/[0.02]"
            />
          </div>

          {/* Toggle Block */}
          <div className="flex items-center justify-between bg-white/[0.03] p-4 rounded-xl border border-white/[0.02]">
            <span className="text-white font-medium text-[15px]">
              {mode === 'battle' ? 'Aceitar apenas convites de batalha de amigos' : 'Aceitar apenas convites de amigos'}
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="accept-friends-only" 
                checked={acceptFriendsOnly} 
                onChange={(e) => setAcceptFriendsOnly(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd00ff]"></div>
            </div>
          </div>
          
          {/* Quick Invite Banner */}
          <div className="flex items-center justify-between bg-white/[0.03] p-4 rounded-xl border border-white/[0.02]">
            <div className="flex items-center space-x-3.5">
              <div className="flex -space-x-2.5 relative flex-row items-center">
                <div className="relative w-[38px] h-[38px] flex-shrink-0">
                  <img className="w-[38px] h-[38px] rounded-full ring-2 ring-[#131124] object-cover flex-shrink-0" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt=""/>
                  <div className="absolute -bottom-1 -right-1 bg-black rounded-full w-[16px] h-[16px] flex items-center justify-center ring-1 ring-[#131124] flex-shrink-0">
                    <svg className="w-[11px] h-[11px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <img className="inline-block w-[38px] h-[38px] rounded-full ring-2 ring-[#131124] object-cover flex-shrink-0" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt=""/>
                <img className="inline-block w-[38px] h-[38px] rounded-full ring-2 ring-[#131124] object-cover flex-shrink-0" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt=""/>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-white font-semibold text-[14px]">
                  {mode === 'battle' ? 'Batalha Rápida' : 'Faça novos amigos'}
                </span>
                <span className="text-gray-400 text-xs mt-0.5 font-medium">
                  {mode === 'battle' ? 'com convites rápidos' : 'com convites rápidos'}
                </span>
              </div>
            </div>
            <button 
              onClick={handleQuickInvite}
              className="bg-[#FF2D55] text-white font-bold px-[18px] py-[6px] rounded-lg text-sm hover:bg-[#E02447] active:scale-95 transition-all outline-none"
            >
              {mode === 'battle' ? 'Batalha' : 'Convidar'}
            </button>
          </div>

          {/* Live Users Count (battle mode) */}
          {mode === 'battle' && liveUsers.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl">
              <p className="text-green-400 text-sm font-semibold text-center">
                {liveUsers.length} criador(es) ao vivo disponíve(is) para batalha!
              </p>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2">
            <div className="px-1 pt-1">
              <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                {mode === 'battle' ? 'Criadores Disponíveis' : 'Amigos'} ({allUsers.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : allUsers.length > 0 ? (
              <div className="space-y-1">
                {allUsers.map(user => {
                  const buttonState = getButtonState(user.id);
                  const isLive = isUserLive(user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-800" />
                          {isLive ? (
                            <div className="absolute -bottom-1 -right-1 bg-black p-0.5 rounded-full ring-1 ring-[#131124]">
                              <LiveIndicatorIcon className="w-[14px] h-[14px] text-red-500 animate-pulse" />
                            </div>
                          ) : (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-[#131124]"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-[14px]">{user.name}</p>
                          <div className="flex items-center space-x-1 text-gray-400 text-xs font-medium mt-0.5">
                            <UserIcon className="w-3 h-3 text-gray-500"/>
                            <span>@{user.name}</span>
                            {isLive && <span className="text-red-400 ml-1">● AO VIVO</span>}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleInviteClick(user)} 
                        disabled={buttonState.disabled}
                        className={`font-semibold px-4 py-1.5 rounded-full transition-all text-sm w-24 text-center ${buttonState.className}`}
                      >
                        {buttonState.text}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-500 text-[14px] font-medium">
                  {searchTerm ? 'Nenhum usuário corresponde à sua busca.' : mode === 'battle' ? 'Nenhum criador ao vivo no momento.' : 'Nenhum amigo encontrado.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoHostModal;