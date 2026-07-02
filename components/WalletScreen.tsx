import React, { useState, useEffect } from 'react';
import GanhosTab from './GanhosTab';
import PurchaseHistoryScreen from './PurchaseHistoryScreen';
import ConfigureWithdrawalMethodScreen from './ConfigureWithdrawalMethodScreen';
import { useTranslation } from '../i18n';
import { User, ToastType, PurchaseRecord } from '../types';
import DiamanteDisplay from './DiamanteDisplay';
import { api } from '../services/api';

interface WalletScreenProps {
  onClose: () => void;
  onPurchase: (pkg: { diamonds: number; price: number }) => void;
  initialTab?: 'Diamante' | 'Ganhos';
  isBroadcaster?: boolean;
  currentUser: User;
  updateUser: (user: User) => void;
  addToast: (type: ToastType, message: string) => void;
  purchaseHistory: PurchaseRecord[];
}

const diamondPackages = [
  { diamonds: 800, price: 7.00 },
  { diamonds: 3000, price: 25.00 },
  { diamonds: 6000, price: 60.00 },
  { diamonds: 20000, price: 180.00 },
  { diamonds: 36000, price: 350.00 },
  { diamonds: 65000, price: 600.00 },
  { diamonds: 100000, price: 0.00, isFreeDev: true }
];

const BackArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-white">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const HamburgerMenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-white">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const Golden3DIdDiamondMini = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] drop-shadow-[0_2px_6px_rgba(234,179,8,0.4)]" xmlns="http://www.w3.org/2000/svg">
    <g>
      <polygon points="12,2 5,9 12,22" fill="url(#goldFaceL-m)" />
      <polygon points="12,2 19,9 12,22" fill="url(#goldFaceR-m)" />
      <polygon points="12,2 8.5,9 12,9" fill="#fef08a" />
      <polygon points="12,2 15.5,9 12,9" fill="#fde047" />
    </g>
    <defs>
      <linearGradient id="goldFaceL-m" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
      <linearGradient id="goldFaceR-m" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
  </svg>
);

const DiamanteTab: React.FC<{ onPurchase: (pkg: { diamonds: number; price: number; isFreeDev?: boolean }) => void; currentUser: User; }> = ({ onPurchase, currentUser }) => {
  const [freshDiamonds, setFreshDiamonds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.diamonds !== undefined && typeof currentUser.diamonds === 'number') {
      setFreshDiamonds(currentUser.diamonds);
      setError(null);
    } else {
      setFreshDiamonds(null);
      setError('dados do usuário descarregados');
    }
    setIsLoading(false);
  }, [currentUser?.diamonds]);

  const displayDiamonds = freshDiamonds !== null ? freshDiamonds : 0;
  
  return (
    <>
      {error ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-red-400 text-center mb-4">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#8a3ffc] text-white px-4 py-2 rounded-lg hover:bg-[#7c32eb] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <DiamanteDisplay diamonds={displayDiamonds} />
          {isLoading && (
            <div className="text-center text-gray-500 text-xs mb-2">
              Atualizando dados...
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            {diamondPackages.map((pkg) => (
              <div 
                key={pkg.diamonds} 
                onClick={() => onPurchase(pkg)} 
                className="bg-[#17181c] border border-white/[0.03] rounded-xl p-4 flex flex-col items-center justify-center space-y-3.5 cursor-pointer hover:bg-[#1e2025] active:scale-[0.98] transition-all"
                id={`pkg-${pkg.diamonds}`}
              >
                <div className="flex items-center space-x-2">
                  <Golden3DIdDiamondMini />
                  <span className="text-white font-bold text-[18px] tracking-tight">
                    {pkg.diamonds.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className={`w-full ${pkg.isFreeDev ? 'bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 border-white/20 animate-pulse' : 'bg-gradient-to-r from-[#2c1d17] to-[#251510] border border-[#d97706]/20'} rounded-lg py-1.5 flex items-center justify-center text-[14px] text-white font-extrabold shadow-sm active:opacity-90`}>
                  {pkg.isFreeDev ? 'GRÁTIS (DEV)' : `R$ ${pkg.price.toFixed(2).replace('.', ',')}`}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-[12px] text-gray-600 font-medium py-10 pb-4">
            Transações seguras e criptografadas
          </div>
        </>
      )}
    </>
  );
};

type WalletView = 'main' | 'history' | 'configure_withdrawal';

const WalletScreen: React.FC<WalletScreenProps> = ({ onClose, onPurchase, initialTab, isBroadcaster, currentUser, updateUser, addToast, purchaseHistory }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'Diamante');
  const [view, setView] = useState<WalletView>('main');

  const handleWalletPurchase = async (pkg: { diamonds: number; price: number; isFreeDev?: boolean }) => {
    if (pkg.isFreeDev) {
      try {
        addToast(ToastType.Info, "Processando recarga gratuita de 100.000 diamantes...");
        const response = await api.addDiamonds(currentUser.id, 100000);
        if (response && response.success) {
          const updatedUser = { ...currentUser, diamonds: response.diamonds };
          updateUser(updatedUser);
          addToast(ToastType.Success, "100.000 diamantes adicionados com sucesso! 💎🚀");
        } else {
          addToast(ToastType.Error, "Erro ao recarregar diamantes de teste.");
        }
      } catch (err) {
        console.error("Erro ao adicionar diamantes:", err);
        addToast(ToastType.Error, "Erro de rede ao adicionar diamantes.");
      }
    } else {
      onPurchase(pkg);
    }
  };

  if (view === 'history') {
    return <PurchaseHistoryScreen onClose={() => setView('main')} history={purchaseHistory} />;
  }
  
  if (view === 'configure_withdrawal') {
    return <ConfigureWithdrawalMethodScreen onClose={() => setView('main')} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />;
  }

  return (
    <div className="absolute inset-0 bg-[#09080b] z-50 flex flex-col text-[#e1e2eb] font-sans overflow-x-hidden select-text">
      
      {/* Centered tabs inside the header itself, exactly matching reference */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#09080b] flex-shrink-0 border-b border-white/[0.02]">
        <button onClick={onClose} className="p-1 hover:opacity-85 active:scale-95 transition-all outline-none" id="wallet-back-btn">
          <BackArrowIcon />
        </button>
        
        <div className="flex items-center space-x-7">
          <button
            onClick={() => setActiveTab('Diamante')}
            className={`text-[15px] font-bold relative py-1 transition-all outline-none cursor-pointer ${activeTab === 'Diamante' ? 'text-white font-extrabold' : 'text-[#8a8894] hover:text-gray-400'}`}
            id="tab-diamante"
          >
            Diamante
            {activeTab === 'Diamante' && (
              <div className="absolute bottom-[-10px] left-0 right-0 h-[2.5px] bg-[#823fe6] rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('Ganhos')}
            className={`text-[15px] font-bold relative py-1 transition-all outline-none cursor-pointer ${activeTab === 'Ganhos' ? 'text-white font-extrabold' : 'text-[#8a8894] hover:text-gray-400'}`}
            id="tab-ganhos"
          >
            Ganhos
            {activeTab === 'Ganhos' && (
              <div className="absolute bottom-[-10px] left-0 right-0 h-[2.5px] bg-[#823fe6] rounded-full"></div>
            )}
          </button>
        </div>

        <button onClick={() => setView('history')} className="p-1 hover:opacity-85 active:scale-95 transition-all outline-none" id="wallet-menu-btn">
          <HamburgerMenuIcon />
        </button>
      </header>
      
      <main className="flex-grow overflow-y-auto px-4 py-3 pb-8 w-full max-w-md mx-auto space-y-4 no-scrollbar">
        {activeTab === 'Diamante' && <DiamanteTab onPurchase={handleWalletPurchase} currentUser={currentUser} />}
        {activeTab === 'Ganhos' && <GanhosTab onConfigure={() => setView('configure_withdrawal')} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />}
      </main>
    </div>
  );
};

export default WalletScreen;
