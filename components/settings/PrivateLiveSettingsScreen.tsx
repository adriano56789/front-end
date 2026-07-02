
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { User, ToastType } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../Loading';

// Crisp `<` Chevron Left Back Icon matching the screenshot exactly
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2.4} 
    stroke="currentColor" 
    className="w-5 h-5 text-white"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// Switch Component with elegant cyan glow aligned exactly like the screenshot
interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ checked, onChange, id }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out outline-none focus:outline-none ${
        checked 
          ? 'bg-[#00DADE] shadow-[0_0_12px_rgba(0,218,222,0.65)]' 
          : 'bg-[#3E4146]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition duration-300 ease-in-out ${
          checked ? 'translate-x-[24px]' : 'translate-x-[4px]'
        }`}
      />
    </button>
  );
};

interface PrivateLiveSettingsScreenProps {
    onBack: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
}

const PrivateLiveSettingsScreen: React.FC<PrivateLiveSettingsScreenProps> = ({ onBack, currentUser, updateUser, addToast }) => {
    const { t } = useTranslation();
    const [toggles, setToggles] = useState<User['privateStreamSettings'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        api.getPrivateStreamSettings(currentUser.id)
            .then(data => {
                setToggles(data.settings || { privateInvite: true, followersOnly: true, fansOnly: false, friendsOnly: false });
            })
            .catch(() => {
                addToast(ToastType.Error, "Falha ao carregar configurações.");
                setToggles({ privateInvite: true, followersOnly: true, fansOnly: false, friendsOnly: false });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [currentUser.id, addToast]);

    const handleToggle = (key: keyof NonNullable<User['privateStreamSettings']>) => {
        if (!toggles) return;

        const newToggles = { ...toggles, [key]: !toggles[key] };
        setToggles(newToggles); // Optimistic update

        api.updatePrivateStreamSettings(currentUser.id, { [key]: newToggles[key] })
            .then(response => {
                if (response.success && response.user) {
                    updateUser(response.user);
                    addToast(ToastType.Success, 'Configuração salva!');
                } else {
                    throw new Error(); // Trigger catch block to revert
                }
            })
            .catch(() => {
                setToggles(toggles); // Revert on failure
                addToast(ToastType.Error, "Falha ao salvar a configuração.");
            });
    };

    return (
        <div className="flex flex-col h-full bg-black select-none text-white relative font-sans overflow-hidden min-h-screen">
            {/* Header with back chevron */}
            <header className="flex items-center px-4 py-5 z-10 flex-shrink-0 relative">
                <button 
                    onClick={onBack} 
                    className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] active:scale-95 transition-all text-white"
                    title="Voltar"
                >
                    <ChevronLeftIcon />
                </button>
                <span className="ml-[10px] text-[18px] font-semibold text-white tracking-wide">
                    {t('settings.privateLive.title') || 'Convite privado ao vivo'}
                </span>
            </header>

            {/* Main scrollable view inside */}
            <main className="flex-grow overflow-y-auto no-scrollbar px-4 py-2 z-10">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <LoadingSpinner />
                    </div>
                ) : toggles ? (
                    <div className="space-y-6">
                        {/* Unified dark Card mirroring the screenshot exactly */}
                        <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-lg">
                            
                            {/* Row 1: Convite privado ao vivo + description */}
                            <div className="flex items-start justify-between px-5 py-5 border-b border-white/[0.03]">
                                <div className="flex flex-col pr-4">
                                    <span className="text-[15px] font-normal text-zinc-100">
                                        {t('settings.privateLive.mainToggleLabel') || 'Convite privado ao vivo'}
                                    </span>
                                    <span className="text-[13px] text-zinc-500 mt-1.5 leading-snug">
                                        {t('settings.privateLive.mainToggleDesc') || 'Você recebe um convite privado ao vivo quando o liga.'}
                                    </span>
                                </div>
                                <div className="flex-shrink-0 pt-0.5">
                                    <CustomSwitch 
                                        id="switch_private_invite"
                                        checked={toggles.privateInvite} 
                                        onChange={() => handleToggle('privateInvite')} 
                                    />
                                </div>
                            </div>

                            {/* Row 2: Após a abertura, só aceito usuários que sigo */}
                            <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.03]">
                                <span className="text-[15px] font-normal text-zinc-100 pr-4 leading-snug">
                                    {t('settings.privateLive.followersOnly') || 'Após a abertura, só aceito usuários que sigo.'}
                                </span>
                                <div className="flex-shrink-0">
                                    <CustomSwitch 
                                        id="switch_followers_only"
                                        checked={toggles.followersOnly} 
                                        onChange={() => handleToggle('followersOnly')} 
                                    />
                                </div>
                            </div>

                            {/* Row 3: Após a abertura, apenas meus fãs são aceitos */}
                            <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.03]">
                                <span className="text-[15px] font-normal text-zinc-100 pr-4 leading-snug">
                                    {t('settings.privateLive.fansOnly') || 'Após a abertura, apenas meus fãs são aceitos.'}
                                </span>
                                <div className="flex-shrink-0">
                                    <CustomSwitch 
                                        id="switch_fans_only"
                                        checked={toggles.fansOnly} 
                                        onChange={() => handleToggle('fansOnly')} 
                                    />
                                </div>
                            </div>

                            {/* Row 4: Após a abertura, só aceito meus amigos */}
                            <div className="flex items-center justify-between px-5 py-[18px]">
                                <span className="text-[15px] font-normal text-zinc-100 pr-4 leading-snug">
                                    {t('settings.privateLive.friendsOnly') || 'Após a abertura, só aceito meus amigos.'}
                                </span>
                                <div className="flex-shrink-0">
                                    <CustomSwitch 
                                        id="switch_friends_only"
                                        checked={toggles.friendsOnly} 
                                        onChange={() => handleToggle('friendsOnly')} 
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="text-center text-zinc-500 pt-10">
                        Não foi possível carregar as configurações.
                    </div>
                )}
            </main>
        </div>
    );
};

export default PrivateLiveSettingsScreen;