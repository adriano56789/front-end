import React, { useState, useEffect } from 'react';
import { BackIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { User, ToastType } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../Loading';

type MessagePreference = 'all' | 'followers' | 'none';

interface WhoCanMessageScreenProps {
    onBack: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => {
    return (
        <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`w-[51px] h-[31px] rounded-full transition-colors duration-200 relative focus:outline-none flex-shrink-0 ${
                checked ? 'bg-[#18f3f3]' : 'bg-[#2f3035]'
            }`}
        >
            <div 
                className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-all duration-200 ${
                    checked ? 'left-[22px]' : 'left-[2px]'
                }`}
            />
        </button>
    );
};

const WhoCanMessageScreen: React.FC<WhoCanMessageScreenProps> = ({ onBack, currentUser, updateUser, addToast }) => {
    const { t } = useTranslation();
    const [preference, setPreference] = useState<MessagePreference | null>(null);
    const [selectedPref, setSelectedPref] = useState<MessagePreference>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        api.getChatPermissionStatus(currentUser.id)
            .then(data => {
                const fetchedPref = data.permission as MessagePreference;
                setPreference(fetchedPref);
                setSelectedPref(fetchedPref);
            })
            .catch(() => {
                addToast(ToastType.Error, "Falha ao carregar configuração de mensagens.");
                setPreference('all'); // fallback
                setSelectedPref('all');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [currentUser.id, addToast]);

    const handleSave = async () => {
        setIsSaving(true);
        const originalUser = { ...currentUser };
        updateUser({ ...currentUser, chatPermission: selectedPref });

        try {
            const { success, user } = await api.updateChatPermission(currentUser.id, selectedPref);
            if (success && user) {
                updateUser(user);
                addToast(ToastType.Success, "Configuração de mensagem salva!");
                onBack();
            } else {
                throw new Error("Falha ao salvar configuração.");
            }
        } catch (error) {
            updateUser(originalUser);
            addToast(ToastType.Error, (error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#000000] text-white">
            <header className="relative flex items-center justify-between px-4 h-16 flex-shrink-0 border-b border-white/[0.04]">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 active:scale-95 transition-all"
                >
                    <BackIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-[17px] font-medium text-white tracking-wide">
                    {t('settings.whoCanMessageScreen.title')}
                </h1>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving || isLoading} 
                    className="text-[#9654ff] hover:text-[#b183ff] font-medium text-[16px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 pr-2"
                >
                    {isSaving ? "Aguarde..." : "Salvar"}
                </button>
            </header>

            <main className="flex-grow overflow-y-auto no-scrollbar py-6 px-4">
                {isLoading || preference === null ? (
                    <div className="flex items-center justify-center h-48">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="rounded-2xl bg-[#121214] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                        {/* Option: Everyone */}
                        <div 
                            onClick={() => setSelectedPref('all')} 
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                        >
                            <span className="text-base text-zinc-100 font-normal">
                                {t('settings.whoCanMessageScreen.everyone')}
                            </span>
                            <ToggleSwitch 
                                checked={selectedPref === 'all'} 
                                onChange={() => setSelectedPref('all')} 
                            />
                        </div>

                        {/* Option: Followers Only */}
                        <div 
                            onClick={() => setSelectedPref('followers')} 
                            className="flex justify-between items-start p-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex-grow pr-4">
                                <span className="text-base text-zinc-100 font-normal block">
                                    {t('settings.whoCanMessageScreen.followersOnly')}
                                </span>
                                <span className="text-[13px] text-zinc-500 font-light leading-relaxed mt-1 block">
                                    {t('settings.whoCanMessageScreen.followersOnlyDesc')}
                                </span>
                            </div>
                            <ToggleSwitch 
                                checked={selectedPref === 'followers'} 
                                onChange={() => setSelectedPref('followers')} 
                            />
                        </div>

                        {/* Option: None */}
                        <div 
                            onClick={() => setSelectedPref('none')} 
                            className="flex justify-between items-start p-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex-grow pr-4">
                                <span className="text-base text-zinc-100 font-normal block">
                                    {t('settings.whoCanMessageScreen.none')}
                                </span>
                                <span className="text-[13px] text-zinc-500 font-light leading-relaxed mt-1 block">
                                    {t('settings.whoCanMessageScreen.noneDesc')}
                                </span>
                            </div>
                            <ToggleSwitch 
                                checked={selectedPref === 'none'} 
                                onChange={() => setSelectedPref('none')} 
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WhoCanMessageScreen;
