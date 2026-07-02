import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { User, ToastType } from '../../types';
import { api } from '../../services/api';

// Chevron left back icon matching standard design precisely
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

interface AvatarProtectionScreenProps {
    onBack: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
}

const AvatarProtectionScreen: React.FC<AvatarProtectionScreenProps> = ({ 
    onBack, 
    currentUser, 
    updateUser, 
    addToast 
}) => {
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const isProtected = currentUser.isAvatarProtected ?? false;

    const handleToggle = async () => {
        if (isSaving) return;
        setIsSaving(true);
        const originalUser = { ...currentUser };
        const newProtectedState = !isProtected;
        
        // Optimistically update
        updateUser({ ...currentUser, isAvatarProtected: newProtectedState });

        try {
            const response = await api.updateProfile(currentUser.id, { 
                isAvatarProtected: newProtectedState 
            });

            if (response.success && response.user) {
                updateUser(response.user);
                addToast(ToastType.Success, newProtectedState ? "Proteção de avatar ativada!" : "Proteção de avatar desativada!");
            } else {
                throw new Error("Resposta inválida do servidor.");
            }
        } catch (error) {
            // Revert state on error
            updateUser(originalUser);
            addToast(ToastType.Error, "Falha ao salvar a proteção de avatar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black select-none text-white relative font-sans overflow-hidden min-h-screen">
            {/* Header with back icon and name */}
            <header className="flex items-center px-4 py-5 z-10 flex-shrink-0 relative">
                <button 
                    onClick={onBack} 
                    className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] active:scale-95 transition-all text-white"
                    title="Voltar"
                >
                    <ChevronLeftIcon />
                </button>
                <span className="ml-[10px] text-[20px] font-semibold text-white tracking-wide">
                    Proteção de Avatar
                </span>
            </header>

            {/* Scrollable Layout */}
            <main className="flex-grow overflow-y-auto no-scrollbar px-4 py-2 z-10 space-y-4">
                {/* Notice text box */}
                <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl p-5 backdrop-blur-2xl shadow-lg">
                    <p className="text-[15px] text-zinc-300 leading-relaxed font-light">
                        A proteção de avatar impede que outros usuários utilizem sua imagem de perfil sem permissão.
                    </p>
                </div>

                {/* Status Toggle Box */}
                <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl p-5 flex items-center justify-between backdrop-blur-2xl shadow-lg">
                    <div className="flex flex-col">
                        <span className="text-[16px] font-normal text-zinc-100">
                            Status de Proteção
                        </span>
                        <span className="text-[13px] text-zinc-500 mt-1 leading-snug">
                            {isProtected ? "Proteção ativada" : "Proteção desativada"}
                        </span>
                    </div>
                    <div className="flex-shrink-0">
                        <CustomSwitch 
                            id="switch_avatar_protection"
                            checked={isProtected}
                            onChange={handleToggle}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AvatarProtectionScreen;
