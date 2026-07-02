import React, { useState, useEffect } from 'react';
import { User, ToastType, Visitor } from '../types';
import { BackIcon } from './icons';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import AvatarWithFrame from './ui/AvatarWithFrame';

interface VisitorsScreenProps {
  onBack: () => void;
  onViewProfile: (user: User) => void;
  currentUser: User;
  addToast: (type: ToastType, message: string) => void;
}

const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if same day
    const isToday = date.toDateString() === now.toDateString();
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `Hoje, ${timeStr}`;
    }
    if (isYesterday) {
        return `Ontem, ${timeStr}`;
    }
    
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${month}, ${timeStr}`;
};

const VisitorItem: React.FC<{ visitor: Visitor; onClick: () => void }> = ({ visitor, onClick }) => {
    const { t } = useTranslation();
    return (
        <div 
            className="relative border border-white/[0.08] bg-[#000000] hover:bg-[#070709] rounded-[22px] px-5 py-[18px] flex items-center justify-between cursor-pointer transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
            onClick={onClick}
        >
            <div className="flex items-center space-x-5">
                {/* Premium Silver-White Glowing Ring around Avatar */}
                <div className="relative w-[78px] h-[78px] p-[1.5px] rounded-full bg-gradient-to-b from-white/60 via-white/10 to-transparent flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.22)] flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-[#000000] p-[2.5px] flex items-center justify-center ring-[2.5px] ring-white/55">
                        <AvatarWithFrame 
                            user={visitor} 
                            size="lg" 
                            className="w-full h-full pointer-events-none rounded-full"
                            showFrame={false}
                        />
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <h3 className="font-bold text-white text-[18px] tracking-tight leading-tight">{visitor.name}</h3>
                    <p className="text-[13px] text-[#8E8E93] mt-[5px] font-medium tracking-wide">
                        {t('profile.id') || 'Identificação'}: <span className="text-[#AEAEB2]">{visitor.name}</span>
                    </p>
                </div>
            </div>
            <span className="absolute top-[18px] right-5 text-[12px] text-[#8E8E93] font-medium tracking-tight">
                {formatTimestamp(visitor.visitTimestamp)}
            </span>
        </div>
    );
};

const VisitorsScreen: React.FC<VisitorsScreenProps> = ({ onBack, onViewProfile, currentUser, addToast }) => {
    const { t } = useTranslation();
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;
        
        setIsLoading(true);
        api.getVisitors(currentUser.id)
            .then(data => {
                const valid = (data || []).filter((v: Visitor) => v && v.name && v.identification && v.visitTimestamp);
                setVisitors(valid);
            })
            .catch(() => addToast(ToastType.Error, 'Falha ao carregar visitantes.'))
            .finally(() => setIsLoading(false));
    }, [currentUser?.id, addToast]);
    
    const handleClear = async () => {
        try {
            await api.clearVisitors(currentUser.id);
            setVisitors([]);
            addToast(ToastType.Success, 'Histórico de visitantes limpo.');
        } catch {
            addToast(ToastType.Error, 'Falha ao limpar histórico.');
        }
    };

    return (
        <div className="absolute inset-0 bg-[#000000] z-50 flex flex-col text-white">
            <header className="flex items-center justify-between px-4 py-5 mt-1 flex-shrink-0 relative">
                <button 
                    onClick={onBack} 
                    className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all text-white cursor-pointer"
                >
                    <BackIcon className="w-5 h-5" />
                </button>
                <h1 className="text-[20px] font-bold text-white tracking-wide absolute left-1/2 -translate-x-1/2">
                    {t('userLists.visitors.title') || "Visitantes"}
                </h1>
                <button 
                    onClick={handleClear} 
                    className="px-5 py-1.5 rounded-full text-[13px] font-semibold text-white bg-gradient-to-b from-white/30 via-white/15 to-transparent border border-white/15 hover:bg-white/10 shadow-[0_2px_12px_rgba(255,255,255,0.05)] active:scale-95 cursor-pointer backdrop-blur-md transition-all duration-200"
                >
                    Limpar
                </button>
            </header>
            
            <main className="flex-grow overflow-y-auto no-scrollbar px-4 py-3 pb-8">
                 {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                    </div>
                ) : visitors.length > 0 ? (
                    <div className="flex flex-col space-y-3">
                        {visitors.map(user => (
                            <VisitorItem 
                                key={`${user.id}-${user.visitTimestamp}`} 
                                visitor={user} 
                                onClick={() => onViewProfile(user)} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>{t('userLists.visitors.noUsers') || "Nenhum visitante recente"}</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VisitorsScreen;
