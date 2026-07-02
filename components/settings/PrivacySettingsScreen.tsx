import React from 'react';
import { useTranslation } from '../../i18n';
import { User, ToastType } from '../../types';
import { api } from '../../services/api';

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

// Small delicate simple `>` Right Arrow Icon matching the screenshot
const RightArrowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2} 
    stroke="currentColor" 
    className="w-4 h-4 text-zinc-500 ml-1 flex-shrink-0"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// Eye Icon matching the screenshot precisely
const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.8} 
    stroke="currentColor" 
    className="w-7 h-7 text-white"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Custom Switch with cyan glowing effect matching the screenshot
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
          : 'bg-[#3E4146] border border-white/[0.02]'
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

interface PrivacySettingsScreenProps { 
    onBack: () => void; 
    navigateTo: (page: string) => void; 
    onOpenPipModal: () => void; 
    currentUser: User; 
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
}

const PrivacySettingsScreen: React.FC<PrivacySettingsScreenProps> = ({ onBack, navigateTo, onOpenPipModal, currentUser, updateUser, addToast }) => {
    const { t } = useTranslation();

    const handleToggleActiveStatus = async () => {
        const newVisibility = !(currentUser.showActivityStatus ?? true);
        const originalUser = { ...currentUser };
        updateUser({ ...currentUser, showActivityStatus: newVisibility, isOnline: newVisibility });

        try {
            const { success, user } = await api.updateActivityPreference(currentUser.id, newVisibility);
            if (success && user) {
                updateUser(user);
                addToast(ToastType.Success, "Status de atividade atualizado.");
            } else {
                throw new Error("Falha ao atualizar status de atividade.");
            }
        } catch (error) {
            updateUser(originalUser);
            addToast(ToastType.Error, (error as Error).message);
        }
    };

    const handleToggleLocationVisibility = async () => {
        const newVisibility = !(currentUser.showLocation ?? true);
        const originalUser = { ...currentUser };
        updateUser({ ...currentUser, showLocation: newVisibility });

        try {
            const { success, user } = await api.updateLocationVisibility(currentUser.id, newVisibility);
            if (success && user) {
                updateUser(user);
                addToast(ToastType.Success, "Visibilidade da localização atualizada.");
            } else {
                throw new Error("Falha ao atualizar visibilidade da localização.");
            }
        } catch (error) {
            updateUser(originalUser);
            addToast(ToastType.Error, (error as Error).message);
        }
    };

    const getChatPermissionText = () => {
        if (currentUser.chatPermission === 'followers') {
            return t('common.followers') || 'Apenas seguidores';
        }
        if (currentUser.chatPermission === 'none') {
            return t('settings.whoCanMessageScreen.none') || 'Ninguém';
        }
        return t('common.all') || 'Todos';
    };

    return (
        <div className="flex flex-col h-full bg-black select-none text-white relative font-sans overflow-hidden min-h-screen">
            {/* Header with back icon at top left */}
            <header className="flex flex-col px-4 pt-5 pb-3 z-10 flex-shrink-0 relative">
                <button 
                    onClick={onBack} 
                    className="p-2 -ml-2 self-start rounded-full hover:bg-white/[0.05] active:scale-95 transition-all text-white"
                    title="Voltar"
                >
                    <ChevronLeftIcon />
                </button>
                <h1 className="text-[28px] font-bold text-white tracking-normal mt-5 mb-2 leading-tight">
                    {t('settings.privacy.title') || 'Configuração de privacidade'}
                </h1>
            </header>

            {/* Scrollable layout inside the Card */}
            <main className="flex-grow overflow-y-auto no-scrollbar px-4 pb-12 z-10">
                <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-lg">
                    
                    {/* Row 1: Quem pode me enviar uma mensagem? */}
                    <button 
                        onClick={() => navigateTo('who_can_message')} 
                        className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all border-b border-white/[0.03]"
                    >
                        <span className="text-[15px] font-normal text-zinc-100 max-w-[65%] leading-snug">
                            {t('settings.privacy.whoCanMessage') || 'Quem pode me enviar uma mensagem?'}
                        </span>
                        <div className="flex items-center text-[15px] text-zinc-500 font-normal">
                            <span>{getChatPermissionText()}</span>
                            <RightArrowIcon />
                        </div>
                    </button>

                    {/* Row 2: Proteção de avatar */}
                    <button 
                        onClick={() => navigateTo('avatar_protection')} 
                        className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all border-b border-white/[0.03]"
                    >
                        <span className="text-[15px] font-normal text-zinc-100 uppercase-none leading-snug">
                            Proteção de avatar
                        </span>
                        <div className="flex items-center text-[15px] text-zinc-500 font-normal">
                            <span>{currentUser.isAvatarProtected ? "Ativado" : "Desativado"}</span>
                            <RightArrowIcon />
                        </div>
                    </button>

                    {/* Row 3: Mostrar local */}
                    <div className="flex items-start justify-between px-5 py-5 border-b border-white/[0.03]">
                        <div className="flex flex-col pr-4">
                            <span className="text-[15px] font-normal text-zinc-100 leading-snug">
                                {t('settings.privacy.showLocation') || 'Mostrar local'}
                            </span>
                            <span className="text-[13px] text-zinc-500 mt-1.5 leading-snug font-light">
                                {t('settings.privacy.showLocationDesc') || 'Desligar irá ocultar sua localização de outros.'}
                            </span>
                        </div>
                        <div className="flex-shrink-0 pt-0.5">
                            <CustomSwitch 
                                id="switch_show_location"
                                checked={currentUser.showLocation ?? true}
                                onChange={handleToggleLocationVisibility}
                            />
                        </div>
                    </div>

                    {/* Row 4: Mostrar estado ativo */}
                    <div className="flex items-start justify-between px-5 py-5 border-b border-white/[0.03]">
                        <div className="flex flex-col pr-4">
                            <span className="text-[15px] font-normal text-zinc-100 leading-snug">
                                {t('settings.privacy.showActive') || 'Mostrar estado ativo'}
                            </span>
                            <span className="text-[13px] text-zinc-500 mt-1.5 leading-snug font-light">
                                {t('settings.privacy.showActiveDesc') || 'Desligar a atividade de ocultação de outros.'}
                            </span>
                        </div>
                        <div className="flex-shrink-0 pt-0.5">
                            <CustomSwitch 
                                id="switch_show_active"
                                checked={currentUser.showActivityStatus ?? true}
                                onChange={handleToggleActiveStatus}
                            />
                        </div>
                    </div>

                    {/* Row 5: Picture-in-Picture Visualizador */}
                    <button 
                        onClick={onOpenPipModal} 
                        className="w-full flex items-start justify-between px-5 py-5 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all"
                    >
                        <div className="flex items-start space-x-3.5 pr-4 flex-grow">
                            <div className="pt-0.5 text-zinc-300">
                                <EyeIcon />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-normal text-zinc-100 leading-snug">
                                    {t('settings.privacy.pip') || 'Picture-in-Picture Visualizador'}
                                </span>
                                <span className="text-[13px] text-zinc-500 mt-1.5 leading-snug font-light">
                                    {t('settings.privacy.pipDesc') || 'Ative para usar o visualizador em modo Picture-in-Picture.'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center text-[15px] text-zinc-500 font-normal pt-1.5 flex-shrink-0">
                            <span>{currentUser.pipEnabled ? t('settings.privacy.pipStatusEnabled') || 'Ativado' : t('settings.privacy.pipStatusDisabled') || 'Desativado'}</span>
                            <RightArrowIcon />
                        </div>
                    </button>

                </div>
            </main>
        </div>
    );
};

export default PrivacySettingsScreen;
