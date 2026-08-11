import React, { useState, useEffect } from 'react';
import { BackIcon, YellowDiamondIcon, HeadphonesIcon, PlusIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, ToastType } from '../types';
import { shopAPI, ShopItem, UserInventory, UserAvatar } from '../services/shopAPI';
import { api } from '../services/api';
// Importar os frames novos
import { avatarFrames, getRemainingDays, getRemainingDaysLabel } from '../utils/chatUtils';

// FIX: Add missing props to interface
interface MarketScreenProps {
  onClose: () => void;
  user: User;
  updateUser: (user: User) => void;
  onOpenWallet: (initialTab: 'Diamante' | 'Ganhos') => void;
  onPurchaseFrame: (frameId: string) => void;
  addToast: (type: ToastType, message: string) => void;
}

const tabs = ['Quadro de avatar', 'Carro', 'Bolha', 'Anel'];

const MarketScreen: React.FC<MarketScreenProps> = ({ onClose, user, updateUser, onOpenWallet, onPurchaseFrame, addToast }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [avatarFrames, setAvatarFrames] = useState<any[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);

  // Early return if user is not available
  if (!user) {
    return (
      <div className="absolute inset-0 bg-[#212134] z-[70] flex items-center justify-center text-white">
        <div className="text-gray-400">Carregando dados do usuário...</div>
      </div>
    );
  }

  // Fetch avatar frames from API
  useEffect(() => {
    const fetchFrames = async () => {
      if (!user) return;
      
      setIsLoadingFrames(true);
      try {
        const frames = await shopAPI.frames.getAll();
        // Import frame components and map them
        const frameIcons = await import('./icons/frames');
        const framesWithComponents = frames.map(frame => ({
          ...frame,
          component: frameIcons[frame.id as keyof typeof frameIcons] || null
        }));
        setAvatarFrames(framesWithComponents);
      } catch (error) {
        console.error('Failed to fetch avatar frames:', error);
        setAvatarFrames([]);
      } finally {
        setIsLoadingFrames(false);
      }
    };
    fetchFrames();
  }, [user]);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Set initial selected item after frames are loaded
  useEffect(() => {
    if (avatarFrames.length > 0) {
      const activeFrame = avatarFrames.find(f => 
        f.id === (user as any).activeFrameId && 
        getRemainingDays(((user as any).ownedFrames || []).find((owned: any) => owned.frameId === f.id)?.expirationDate) > 0
      );
      setSelectedItem(activeFrame || avatarFrames[0]);
    }
  }, [avatarFrames, user]);

  const handlePurchase = async () => {
    if (!selectedItem || isActionLoading) return;
    
    // Verificar se já possui o frame antes de tentar comprar
    if (isFrameOwned) {
      addToast(ToastType.Error, 'Você já possui este frame');
      return;
    }
    
    setIsActionLoading(true);

    try {
      const response = await api.buyFrame(user.id, selectedItem.id, selectedItem.price, selectedItem.duration);
      if (response.success) {
        // Atualizar dados do usuário com os frames
        const updatedUser = { ...user, ...response.user };
        if (updatedUser) {
          updateUser(updatedUser);
          addToast(ToastType.Success, 'Quadro comprado com sucesso!');
        }
      }
    } catch (error: any) {
      addToast(ToastType.Error, error.message || 'Erro ao comprar quadro');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEquipFrame = async (frameId: string | null) => {
    setIsActionLoading(true);
    try {
      const response = await api.equipFrame(user.id, frameId);
      if (response.success) {
        updateUser(response.user);
        addToast(ToastType.Success, frameId ? 'Moldura equipada!' : 'Moldura desequipada.');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const SelectedFrameComponent = selectedItem ? (selectedItem as any).component : null;
  const isFrameOwned = selectedItem && ((user as any).ownedFrames || []).some((f: any) => f.frameId === selectedItem.id && getRemainingDays(f.expirationDate) > 0);
  const isSelectedFrameEquipped = isFrameOwned && selectedItem && (user as any).activeFrameId === selectedItem.id;
  const selectedOwnedFrame = selectedItem && ((user as any).ownedFrames || []).find((f: any) => f.frameId === selectedItem.id);
  const remainingDays = getRemainingDays(selectedOwnedFrame?.expirationDate);
  // Rótulo derivado dos dias (um único parse da data): Permanente > 365 dias.
  const remainingLabel = remainingDays > 365
    ? 'Permanente'
    : remainingDays > 0
      ? remainingDays === 1 ? '1 dia' : `${remainingDays} dias`
      : '';

  let buttonText: string = '';
  let buttonAction: (() => void) | undefined = undefined;
  let buttonDisabled: boolean = isActionLoading;
  let buttonClass = 'bg-green-500 hover:bg-green-600';

  if (activeTab === 'Quadro de avatar') {
    if (isSelectedFrameEquipped) {
      buttonText = `Desequipar`;
      buttonAction = () => handleEquipFrame(null);
      buttonClass = 'bg-gray-600 hover:bg-gray-700';
    } else if (isFrameOwned) {
      buttonText = 'Equipar';
      buttonAction = () => handleEquipFrame(selectedItem?.id);
      buttonClass = 'bg-blue-500 hover:bg-blue-700';
    } else { // Not owned
      if (selectedItem && user.diamonds < selectedItem.price) {
        buttonText = 'Recarregar';
        buttonAction = () => onOpenWallet('Diamante');
        buttonClass = 'bg-yellow-500 hover:bg-yellow-600';
        buttonDisabled = false;
      } else {
        buttonText = `Comprar (${selectedItem?.price || 0})`;
        buttonAction = handlePurchase;
      }
    }
  }

  return (
    <div className="absolute inset-0 bg-[#000000] z-[70] flex flex-col text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="relative flex items-center justify-between px-4 py-3 flex-shrink-0 z-20">
        <button onClick={onClose} className="p-1 -ml-1">
          <BackIcon className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-base font-semibold">Loja</h1>
        <button className="flex items-center space-x-1.5 p-1 text-gray-400">
          <HeadphonesIcon className="w-4 h-4" />
          <span className="text-[13px] font-medium">Mochila</span>
        </button>
      </header>

      {/* Avatar Preview Section - Ensures no top cutoff */}
      <div className="flex-shrink-0 pt-4 pb-4 px-4 flex flex-col items-center justify-center relative w-full z-10 min-h-[100px]">
         {/* Subtle background glow mimicking the reference */}
         {SelectedFrameComponent && activeTab === 'Quadro de avatar' && (
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[60px] bg-yellow-500/20 blur-3xl opacity-50 rounded-full pointer-events-none"></div>
         )}
         
         <div className="relative w-[70px] h-[70px] flex-shrink-0 z-10 mt-2">
           {user.avatarUrl && user.avatarUrl.trim() ? (
              <img key={user.avatarUrl} src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="#4B5563"/></svg>'); }} />
           ) : (
             <div className="w-full h-full rounded-full bg-[#1c1c1e] flex items-center justify-center text-white text-2xl font-bold">{user.name?.[0] || '?'}</div>
           )}
           
           {SelectedFrameComponent && activeTab === 'Quadro de avatar' && (
             <div className="absolute -top-[35%] -left-[35%] w-[170%] h-[170%] pointer-events-none">
               <SelectedFrameComponent className="w-full h-full drop-shadow-[0_0_15px_rgba(255,215,0,0.2)]" />
             </div>
           )}
         </div>
      </div>

      {/* Tabs */}
      <nav className="px-4 pb-4 flex-shrink-0 z-10">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab 
                  ? 'bg-white text-black font-semibold' 
                  : 'bg-[#1c1c1e] text-gray-400 font-medium border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Grid Area - Forced to 3x3 layout fitting available space */}
      <main className="flex-1 min-h-0 px-4 z-10 flex flex-col">
        {activeTab === 'Quadro de avatar' ? (
           <div className="flex-1 flex flex-col min-h-0">
             {isLoadingFrames ? (
               <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
             ) : avatarFrames.length === 0 ? (
               <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Nenhum frame.</div>
             ) : (
               <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-3 gap-2.5 overflow-hidden pb-2">
                 {avatarFrames.slice(0, 9).map(frame => {
                   const isOwned = ((user as any).ownedFrames || []).some((f: any) => f.frameId === frame.id && getRemainingDays(f.expirationDate) > 0);
                   const isEquipped = isOwned && (user as any).activeFrameId === frame.id;
                   const isSelected = selectedItem?.id === frame.id;
                   const frameOwnedEntry = ((user as any).ownedFrames || []).find((f: any) => f.frameId === frame.id);
                   const frameRemainingLabel = getRemainingDaysLabel(frameOwnedEntry?.expirationDate);

                   return (
                     <button
                       key={frame.id}
                       onClick={() => setSelectedItem(frame as any)}
                       className={`relative w-full h-full min-h-0 bg-[#161618] rounded-[18px] flex flex-col items-center justify-start py-2 px-1 transition-colors ${
                         isSelected ? 'bg-[#222226]' : 'hover:bg-[#1a1a1d]'
                       }`}
                     >
                       {/* Top: Frame Icon container */}
                       <div className="w-[55%] aspect-square flex items-center justify-center relative mb-1.5 flex-shrink-0">
                         {frame.component ? (
                           <frame.component className="w-full h-full drop-shadow-md" />
                         ) : (
                           <div className="w-full h-full bg-[#2a2a2e] rounded-full" />
                         )}
                       </div>
                       
                       {/* Bottom: Text and Price */}
                       <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 px-1 hover:min-h-0">
                         <span className="text-[#d4d4d8] text-[10px] font-medium leading-[1.2] text-center line-clamp-1 w-full mb-[3px]">
                           {frame.name}
                         </span>
                         <div className="flex items-center justify-center space-x-1 w-full">
                           <YellowDiamondIcon className="w-[11px] h-[11px] text-white drop-shadow-sm flex-shrink-0" />
                           <span className="text-[#a1a1aa] text-[11px] font-medium leading-none">
                             {frame.price}
                           </span>
                         </div>
                       </div>
                       
                       {/* Optional Indicators */}
                       {isEquipped && (
                         <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#2ebc5b]" />
                       )}

                       {/* ⏳ Validade: dias restantes do frame (3 dias após a compra) */}
                       {isOwned && frameRemainingLabel && (
                         <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-semibold px-1.5 py-[1px] rounded-full whitespace-nowrap ${
                           frameRemainingLabel === 'Permanente'
                             ? 'bg-[#2ebc5b]/20 text-[#2ebc5b]'
                             : 'bg-amber-500/20 text-amber-400'
                         }`}>
                           {frameRemainingLabel}
                         </span>
                       )}
                     </button>
                   );
                 })}
               </div>
             )}
           </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Em breve...</div>
        )}
      </main>

      {/* Footer Area */}
      {activeTab === 'Quadro de avatar' && (
        <footer className="flex-shrink-0 px-4 pt-3 pb-8 z-20 bg-gradient-to-t from-black via-black to-transparent">
          {/* ⏳ Validade do quadro selecionado (3 dias após a compra; dono = permanente) */}
          {isFrameOwned && remainingLabel && (
            <div className="flex items-center justify-center mb-2">
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                remainingLabel === 'Permanente'
                  ? 'bg-[#2ebc5b]/15 text-[#2ebc5b]'
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {remainingLabel === 'Permanente' ? '♾️ Uso permanente (dono)' : `⏳ Expira em ${remainingLabel}`}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            {/* Diamond Balance */}
            <div className="flex items-center space-x-2 bg-transparent">
              <YellowDiamondIcon className="w-5 h-5 text-white" />
              <span className="text-[17px] font-bold text-white mr-1 opacity-90 tracking-tight">
                {user.diamonds > 0 ? user.diamonds.toLocaleString('pt-BR') : '0'}
              </span>
              <button
                onClick={() => onOpenWallet('Diamante')}
                className="bg-[#eab308] w-6 h-6 rounded-full flex items-center justify-center ml-1"
              >
                <PlusIcon className="w-[14px] h-[14px] text-black" />
              </button>
            </div>
            
            {/* Action Button */}
            <button
              onClick={buttonAction}
              disabled={buttonDisabled}
              className={`font-semibold text-[15px] px-8 py-3 rounded-full transition-colors disabled:opacity-50 ${
                buttonClass === 'bg-green-500 hover:bg-green-600' ? 'bg-[#3fb862] text-white hover:bg-[#38a657]' : buttonClass
              }`}
            >
              {isActionLoading ? 'Processando...' : buttonText}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default MarketScreen;
