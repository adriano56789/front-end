import React, { useState, useEffect } from 'react';
import { BackIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { GoogleAccount, User, ToastType } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../Loading';
import AvatarWithFrame from '../ui/AvatarWithFrame';

interface ConnectedAccountsScreenProps {
  onBack: () => void;
  currentUser: User;
  addToast: (type: ToastType, message: string) => void;
  onLogout: () => void;
}

const ConnectedAccountsScreen: React.FC<ConnectedAccountsScreenProps> = ({ onBack, currentUser, addToast, onLogout }) => {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAccounts = React.useCallback(() => {
        setIsLoading(true);
        api.getConnectedGoogleAccounts()
            .then(data => setAccounts(data || []))
            .catch(err => {
                addToast(ToastType.Error, "Falha ao carregar contas conectadas.");
            })
            .finally(() => setIsLoading(false));
    }, [addToast]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleDisconnect = async (accountEmail: string) => {
        try {
            const { success } = await api.disconnectGoogleAccount(accountEmail);
            if (success) {
                addToast(ToastType.Success, "Conta desconectada com sucesso.");
                onLogout();
            } else {
                throw new Error("Falha ao desconectar conta.");
            }
        } catch (error) {
            addToast(ToastType.Error, (error as Error).message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white font-sans max-w-md mx-auto relative overflow-hidden select-none">
            {/* Header section matching exact design */}
            <header className="flex items-center p-6 pb-2 pt-8 flex-shrink-0 z-10">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"
                >
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className="text-[22px] font-bold text-white ml-5 tracking-tight font-sans">
                    {t('settings.connected.title') || "Contas Conectadas"}
                </h1>
            </header>

            {/* Main view content */}
            <main className="flex-grow px-6 py-4 flex flex-col items-center z-10 space-y-6">
                
                {/* Real-time styled description matching screenshot */}
                <div className="px-2">
                    <p className="text-[#8e8e93] text-[15px] leading-relaxed text-center max-w-[315px] mx-auto font-medium">
                        {(t('settings.connected.description') || "Esta é uma conta do Google que você usou para acessar o LiveGo. Você pode desconectar para entrar com outra conta.")}
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center pt-12"><LoadingSpinner /></div>
                ) : accounts.length > 0 ? (
                    <div className="w-full max-w-[340px] space-y-4">
                        {accounts.map(account => (
                            <div 
                                key={account.id} 
                                className="bg-gradient-to-b from-[#1F1F21] to-[#141416] border border-[#2d2d30] rounded-[28px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.55)] w-full flex flex-col gap-6"
                            >
                                <div className="flex items-center space-x-5">
                                    {/* Double ring metallic silver/chrome border with lens flare glow shadow wrapper */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-[74px] h-[74px] rounded-full p-[2.2px] bg-gradient-to-b from-[#ffffff] via-[#a8a8ad] to-[#555559] shadow-[0_0_14px_rgba(255,255,255,0.45),inset_0_0_8px_rgba(255,255,255,0.5)] flex items-center justify-center">
                                            <div className="w-full h-full rounded-full p-[1.5px] bg-[#000000] flex items-center justify-center">
                                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                                                    <img 
                                                        src={currentUser?.avatarUrl || "https://avatar.iran.liara.run/public/boy?username=adriano"} 
                                                        alt="Você" 
                                                        className="w-full h-full object-cover scale-105"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[21px] font-bold text-white tracking-wide leading-none">Você</p>
                                    </div>
                                </div>
                                
                                {/* 3D high-contrast red gel-styled pill disconnect button */}
                                <button 
                                    onClick={() => handleDisconnect(account.email)} 
                                    className="w-full py-[15px] font-bold text-white text-[18px] rounded-[18px] bg-gradient-to-b from-[#b91c1c] via-[#941c1c] to-[#711616] shadow-[0_6px_20px_rgba(185,28,28,0.4),0_1.5px_2px_rgba(255,255,255,0.25)_inset,0_-1px_3px_rgba(0,0,0,0.5)_inset] border-none active:scale-[0.98] transition-all hover:brightness-110 tracking-wide"
                                >
                                    {t('settings.connected.disconnect') || "Desconectar"}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full max-w-[340px] space-y-4">
                        {/* Fallback mock account visual if API response is empty in local developer profile */}
                        <div 
                            className="bg-gradient-to-b from-[#1F1F21] to-[#141416] border border-[#2d2d30] rounded-[28px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.55)] w-full flex flex-col gap-6"
                        >
                            <div className="flex items-center space-x-5">
                                <div className="relative flex-shrink-0">
                                    <div className="w-[74px] h-[74px] rounded-full p-[2.2px] bg-gradient-to-b from-[#ffffff] via-[#a8a8ad] to-[#555559] shadow-[0_0_14px_rgba(255,255,255,0.45),inset_0_0_8px_rgba(255,255,255,0.5)] flex items-center justify-center">
                                        <div className="w-full h-full rounded-full p-[1.5px] bg-[#000000] flex items-center justify-center">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                                                <img 
                                                    src={currentUser?.avatarUrl || "https://avatar.iran.liara.run/public/boy?username=adriano"} 
                                                    alt="Você" 
                                                    className="w-full h-full object-cover scale-105"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[21px] font-bold text-white tracking-wide leading-none">Você</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={onLogout} 
                                className="w-full py-[15px] font-bold text-white text-[18px] rounded-[18px] bg-gradient-to-b from-[#b91c1c] via-[#941c1c] to-[#711616] shadow-[0_6px_20px_rgba(185,28,28,0.4),0_1.5px_2px_rgba(255,255,255,0.25)_inset,0_-1px_3px_rgba(0,0,0,0.5)_inset] border-none active:scale-[0.98] transition-all hover:brightness-110 tracking-wide"
                            >
                                {t('settings.connected.disconnect') || "Desconectar"}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ConnectedAccountsScreen;
