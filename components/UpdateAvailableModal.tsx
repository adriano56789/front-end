import React from 'react';
import { useTranslation } from '../i18n';

interface UpdateAvailableModalProps {
    open: boolean;
    latestVersion: string;
}

// 🔄 Modal de nova versão: bloqueia o uso da versão antiga até o usuário
// clicar em "Atualizar agora", que recarrega a página com o build novo.
const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({ open, latestVersion }) => {
    const { t } = useTranslation();
    if (!open) return null;

    const reload = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 p-6">
            <div className="w-full max-w-sm rounded-3xl bg-[#1C1F26] border border-white/[0.08] p-6 text-center shadow-2xl">
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="text-lg font-bold text-white mb-1">
                    {t('appUpdate.title')}
                </h2>
                <p className="text-sm text-zinc-400 mb-1">
                    {t('appUpdate.description')}
                </p>
                {latestVersion && (
                    <p className="text-xs text-zinc-500 mb-4">v{latestVersion}</p>
                )}
                <button
                    onClick={reload}
                    className="w-full py-3 rounded-xl bg-[#911eff] hover:bg-[#a33bff] active:scale-[0.98] text-white font-semibold transition-all"
                >
                    {t('appUpdate.updateNow')}
                </button>
            </div>
        </div>
    );
};

export default UpdateAvailableModal;
