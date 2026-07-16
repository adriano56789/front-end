import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CloseIcon, PlusIcon, GiftIcon } from './icons';
import { User, ToastType, EligibleUser, Gift } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
// Socket.IO removido — convites gerenciados via REST API

interface PrivateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  currentUser: User;
  addToast: (type: ToastType, message: string) => void;
  followingUsers: User[];
  onFollowUser: (user: User, streamId?: string) => void;
  allGifts: Gift[];
}

type AggregatedGift = EligibleUser['giftsSent'][0] & { price: number };

const PrivateInviteModal: React.FC<PrivateInviteModalProps> = ({ isOpen, onClose, streamId, currentUser, addToast, followingUsers, onFollowUser, allGifts }) => {
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [isInvitingAll, setIsInvitingAll] = useState(false);
  const [isFollowingAll, setIsFollowingAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.getGiftSendersForStream(streamId)
        .then(data => {
          
          if (!data || !data.gifts) {
            setEligibleUsers([]);
            return;
          }
          
          
          // Converter novo formato da API para o formato esperado pelo componente
          const convertedData = (data.gifts || []).map((user: any) => ({
            id: user.userId,
            name: user.userName || 'Usuário',
            avatarUrl: user.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName || 'User')}&background=random`,
            giftsSent: (user.gifts || []).map((gift: any) => ({
              name: gift.giftName || 'Presente',
              icon: gift.giftIcon || '🎁',
              quantity: gift.quantity || 1,
              price: gift.giftPrice || 0
            }))
          }));
          
          setEligibleUsers(convertedData);
        })
        .catch(err => {
          addToast(ToastType.Error, "Falha ao carregar usuários elegíveis.");
        })
        .finally(() => setIsLoading(false));
    } else {
      // Reset state on close
      setEligibleUsers([]);
      setInvitedUsers(new Set());
      setInvitingUserId(null);
      setIsInvitingAll(false);
      setIsFollowingAll(false);
    }
  }, [isOpen, streamId, addToast]);

  // Socket.IO removido — atualização em tempo real via API polling
  
  const hasUnfollowedUsers = useMemo(() => {
    if (isLoading) return false;
    return eligibleUsers.some(u => !followingUsers.some(f => f.id === u.id));
  }, [eligibleUsers, followingUsers, isLoading]);

  const requiredGift = useMemo(() => {
    if (!eligibleUsers.length || !allGifts.length) return null;
    let mostExpensiveGift: Gift | null = null;
    let maxPrice = -1;

    for (const user of eligibleUsers) {
      for (const sentGift of user.giftsSent) {
        const giftInfo = allGifts.find(g => g.name === sentGift.name);
        if (giftInfo && (giftInfo.price || 0) > maxPrice) {
          maxPrice = giftInfo.price || 0;
          mostExpensiveGift = giftInfo;
        }
      }
    }
    return mostExpensiveGift;
  }, [eligibleUsers, allGifts]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleInvite = async (userToInvite: User, isBulkAction = false) => {
    if (invitedUsers.has(userToInvite.id) || invitingUserId === userToInvite.id) return;

    if (!isBulkAction) setInvitingUserId(userToInvite.id);
    try {
      await api.sendPrivateInviteToGifter(streamId, userToInvite.id);
      if (!isBulkAction) addToast(ToastType.Success, `Convite enviado para ${userToInvite.name}.`);
      setInvitedUsers(prev => new Set(prev).add(userToInvite.id));
    } catch (error) {
      const message = (error as Error).message || "Falha ao enviar convite.";
      if (!isBulkAction) addToast(ToastType.Error, message);
    } finally {
      if (!isBulkAction) setInvitingUserId(null);
    }
  };
  
  const handleInviteAll = async () => {
    setIsInvitingAll(true);
    const usersToInvite = eligibleUsers.filter(u => !invitedUsers.has(u.id));

    for (const user of usersToInvite) {
        await handleInvite(user, true);
        await delay(200); 
    }
    
    setIsInvitingAll(false);
    if (usersToInvite.length > 0) {
        addToast(ToastType.Success, 'Todos os usuários elegíveis foram convidados.');
    }
  };

  const handleFollowAll = async () => {
    setIsFollowingAll(true);
    const usersToFollow = eligibleUsers.filter(u => !followingUsers.some(f => f.id === u.id));

    for (const user of usersToFollow) {
        onFollowUser(user, streamId);
        await delay(200);
    }

    setIsFollowingAll(false);
    if(usersToFollow.length > 0) {
        addToast(ToastType.Success, 'Seguindo todos os usuários elegíveis.');
    }
  };

  const getButtonState = (userId: string) => {
      if (invitingUserId === userId || isInvitingAll) {
          return { 
              text: "CONVIDANDO...", 
              disabled: true, 
              className: "bg-[#1d2026] text-[#d4c0d7]/40 border border-white/5 cursor-wait" 
          };
      }
      if (invitedUsers.has(userId)) {
          return { 
              text: "CONVIDADO", 
              disabled: true, 
              className: "bg-[#1d2026] text-[#d4c0d7]/40 border border-white/5 cursor-not-allowed" 
          };
      }
      return { 
          text: "CONVIDAR", 
          disabled: false, 
          className: "bg-gradient-to-r from-[#e7006e] to-[#ffb1c3] text-white hover:opacity-90 active:scale-95 shadow-[0_0_12px_rgba(231,0,110,0.25)]" 
      };
  };

  return (
    <div className={`absolute inset-0 z-40 flex items-end justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
      <div className={`bg-[#0f1115] w-full max-w-md h-[75%] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.8)] border-t border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
        
        {/* Header Block exactly matching image 2 */}
        <header className="relative flex items-center justify-between p-4 flex-shrink-0">
          <button 
            onClick={onClose} 
            className="text-white hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-1"
          >
            <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <h2 className="text-md font-bold text-white tracking-wide absolute left-1/2 -translate-x-1/2">
            Convidar para Sala Privada
          </h2>
          
          <div className="w-5"></div> {/* Spacer for symmetry */}
        </header>

        {/* Action Buttons: Seguir Todos & Convidar Todos in a single flex-row */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 flex-shrink-0">
          <button 
            onClick={handleFollowAll} 
            disabled={isFollowingAll || !hasUnfollowedUsers}
            className="py-2.5 rounded-2xl font-bold text-sm bg-[#6d28d9] disabled:opacity-50 text-white transition-all transform active:scale-95 cursor-pointer border-none focus:outline-none shadow-md shadow-purple-900/20"
          >
            {isFollowingAll ? 'Seguindo...' : 'Seguir Todos'}
          </button>
          
          <button 
            onClick={handleInviteAll} 
            disabled={isInvitingAll || eligibleUsers.every(u => invitedUsers.has(u.id))}
            className="py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#e11d48] to-[#f43f5e] disabled:opacity-50 text-white transition-all transform active:scale-95 cursor-pointer border-none focus:outline-none shadow-md shadow-pink-900/20"
          >
            {isInvitingAll ? 'Convidando...' : 'Convidar Todos'}
          </button>
        </div>

        {/* User List scroll area */}
        <div className="flex-grow px-4 overflow-y-auto no-scrollbar space-y-3 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : eligibleUsers.length > 0 ? (
            eligibleUsers.map(user => {
              const buttonState = getButtonState(user.id);
              const isFollowed = followingUsers.some(f => f.id === user.id);
              
              const aggregatedGiftsWithPrice = user.giftsSent.reduce((acc, gift) => {
                if (acc[gift.name]) {
                  acc[gift.name].quantity += gift.quantity;
                } else {
                  const fullGiftInfo = allGifts.find(g => g.name === gift.name);
                  acc[gift.name] = { ...gift, price: fullGiftInfo?.price || 0 };
                }
                return acc;
              }, {} as Record<string, AggregatedGift>);

              const uniqueGifts: AggregatedGift[] = Object.values(aggregatedGiftsWithPrice);

              const mostExpensiveUserGift = uniqueGifts.length > 0
                ? uniqueGifts.reduce((max, gift) => (gift.price > max.price) ? gift : max)
                : null;

              return (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#14161d] border border-white/[0.02]">
                  
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} 
                        alt={user.name} 
                        className="w-11 h-11 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`;
                        }}
                      />
                      {/* Online state indicator matching image */}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#14161d]"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm tracking-wide truncate">{user.name}</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {/* Custom Badge containing the indicator hand/thumb and quantity */}
                        <div className="flex items-center gap-1 bg-[#2e261f] text-[#f59e0b] px-2 py-0.5 rounded-full border border-yellow-600/20">
                          <span className="text-[10px]">🌭</span>
                          <span className="text-[10px] font-extrabold font-mono">x{mostExpensiveUserGift?.quantity || 1}</span>
                        </div>
                        {uniqueGifts.length > 1 && (
                          <span className="text-[10px] text-gray-500 font-medium">+{uniqueGifts.length - 1} outros</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Follow invite control section containing inline plus followed symbol & "Convidar" button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!isFollowed && (
                      <button 
                        onClick={() => onFollowUser(user, streamId)}
                        className="p-1 text-[#8b5cf6] hover:opacity-85 transition-opacity cursor-pointer border-none bg-transparent flex items-center justify-center"
                        aria-label={`Seguir ${user.name}`}
                      >
                        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" viewBox="0 0 24 24">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleInvite(user)} 
                      disabled={buttonState.disabled}
                      className={`font-bold px-5 py-2 rounded-full transition-all text-sm text-center border-none cursor-pointer ${
                        buttonState.disabled 
                          ? 'bg-[#1e2025] text-gray-600 cursor-not-allowed'
                          : 'bg-[#ec4899] hover:bg-[#db2777] text-white shadow-sm'
                      }`}
                    >
                      Convidar
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-[#14161d] flex items-center justify-center mb-4">
                <GiftIcon className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-400">Ninguém enviou presentes</p>
              <p className="text-xs text-gray-600 mt-1.5 max-w-xs">Os apoiadores que enviarem presentes aparecerão aqui para poderem ser convidados.</p>
            </div>
          )}
        </div>

        {/* Footer info: LUMINA STREAM DESIGN SYSTEM */}
        <div className="text-center py-4 bg-[#0a0b0e] flex-shrink-0 tracking-widest text-[9px] font-bold text-gray-600 select-none">
          LUMINA STREAM DESIGN SYSTEM
        </div>

      </div>
    </div>
  );
};

export default PrivateInviteModal;