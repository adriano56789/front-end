import React, { useState, useEffect } from 'react';

import { 

    BrazilFlagIcon,

    MaleIcon,

    FemaleIcon,

    CopyIcon,

    WalletIcon,

    YellowDiamondIcon,

    GoldCoinIcon,

    MarketIcon,

    RankIcon,

    FansIcon,

    BlockIcon,

    AvatarProtectIcon,

    EnvelopeIcon,

    FAQIcon,

    SettingsIcon,

    ChevronRightIcon,

    VIPIcon,

    VIPBadgeIcon,

    ShieldIcon,

    LiveIndicatorIcon,

    BankIcon

} from './icons';

import { User } from '../types';

import { useTranslation } from '../i18n';

import { api } from '../services/api';

import AvatarWithFrame from './ui/AvatarWithFrame';

// Modern, premium 3D-gradient custom icons
const CustomWalletIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(245,158,11,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="wallet_primary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEE88" />
                <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="wallet_secondary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="100%" stopColor="#FCD34D" />
            </linearGradient>
        </defs>
        <rect x="2" y="5" width="20" height="14" rx="4" fill="url(#wallet_primary)" stroke="#78350F" strokeWidth="1" />
        <path d="M2 9.5C2 9.5 6 11.5 12 11.5C18 11.5 22 9.5 22 9.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
        <rect x="12" y="8.5" width="8" height="7" rx="1.5" fill="url(#wallet_secondary)" stroke="#78350F" strokeWidth="1" />
        <circle cx="15.5" cy="12" r="1.2" fill="#78350F" />
    </svg>
);

const CustomMarketIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(14,165,233,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="market_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="diamond_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
        </defs>
        <path d="M3 9V11C3 11.55 3.45 12 4 12H20C20.55 12 21 11.55 21 11V9M3 9L5 4H19L21 9M3 9H21" stroke="#0369A1" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M7 4L8 9M12 4L12 9M17 4L16 9" stroke="#0369A1" strokeWidth="1" />
        <path d="M4 12V19C4 19.55 4.45 20 5 20H19C19.55 20 20 19.55 20 19V12" fill="url(#market_grad)" stroke="#0284C7" strokeWidth="1.2" opacity="0.95" />
        <polygon points="12,14 14.5,16.5 12,19 9.5,16.5" fill="url(#diamond_grad)" stroke="#0369A1" strokeWidth="0.8" />
    </svg>
);

const CustomRankIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2.5px_5px_rgba(245,158,11,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="star_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#star_grad)" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M12 4.1L13.8 9.5L19.4 10.1L15.2 14.1L16.4 19.5L12 16.8V4.1Z" fill="#FFFFFF" fillOpacity="0.25" />
    </svg>
);

const CustomFansIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(52,211,153,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="fans_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#059669" />
            </linearGradient>
        </defs>
        <path d="M17 21v-2a3 3 0 0 0-3-3l-1.5 0" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="9" r="3" fill="url(#fans_grad)" stroke="#047857" strokeWidth="1" />
        <path d="M7 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" fill="url(#fans_grad)" stroke="#047857" strokeWidth="1.2" />
        <circle cx="10" cy="7" r="4" fill="url(#fans_grad)" stroke="#047857" strokeWidth="1.2" />
    </svg>
);

const CustomBlockIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(239,68,68,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="block_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F87171" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="url(#block_grad)" strokeWidth="2.5" />
        <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" stroke="url(#block_grad)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const CustomAvatarProtectIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(167,139,250,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="shield_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#5B21B6" />
            </linearGradient>
        </defs>
        <path d="M12 2L4 5V11C4 16.55 7.38 20.38 12 22C16.62 20.38 20 16.55 20 11V5L12 2Z" fill="url(#shield_grad)" stroke="#5B21B6" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M12 3.5L5.5 6V11C5.5 15.4 8.2 18.6 12 19.8V3.5Z" fill="#FFFFFF" fillOpacity="0.22" />
    </svg>
);

const CustomEnvelopeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(148,163,184,0.25)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="env_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="60%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
            </linearGradient>
        </defs>
        <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="url(#env_grad)" stroke="#1E293B" strokeWidth="1" />
        <path d="M3 6L12 13L21 6" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 18L10.5 11.5" stroke="#1E293B" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M21 18L13.5 11.5" stroke="#1E293B" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
);

const CustomUserLevelIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(236,72,153,0.45)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="user_level_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FB7185" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#D946EF" />
            </linearGradient>
            <linearGradient id="user_level_star" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
        </defs>
        <path d="M12 2L4 5V11C4 16.55 7.38 20.38 12 22C16.62 20.38 20 16.55 20 11V5L12 2Z" fill="url(#user_level_grad)" stroke="#C084FC" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 6.5l1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.3L12 6.5z" fill="url(#user_level_star)" stroke="#EA580C" strokeWidth="0.5" />
        <circle cx="12" cy="18" r="1.5" fill="#FFFFFF" />
    </svg>
);

const CustomFAQIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_5px_rgba(59,130,246,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="faq_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="url(#faq_grad)" strokeWidth="2.5" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" stroke="url(#faq_grad)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.5" fill="#2563EB" />
    </svg>
);

const CustomSettingsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(100,116,139,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="gear_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F1F5F9" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="5" fill="none" stroke="url(#gear_grad)" strokeWidth="2" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="url(#gear_grad)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.2" fill="#111111" stroke="url(#gear_grad)" strokeWidth="1" />
    </svg>
);

const CustomYellowDiamondIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-[0_0_4px_rgba(251,191,36,0.55)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="diamond_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
        </defs>
        <polygon points="12,2 19,8 12,22 5,8" fill="url(#diamond_inner)" stroke="#A16207" strokeWidth="0.8" />
        <polygon points="12,2 15,8 12,22 9,8" fill="#FFFFFF" fillOpacity="0.25" stroke="#A16207" strokeWidth="0.5" />
    </svg>
);

const CustomGoldCoinIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-[0_0_3px_rgba(249,115,22,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="coin_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF8F00" />
                <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#coin_grad)" stroke="#9A3412" strokeWidth="1" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#FFedd5" strokeWidth="1.2" strokeDasharray="3 1" />
    </svg>
);

const CustomGoldCoinIconLarge = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(249,115,22,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="coin_large_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF9800" />
                <stop offset="50%" stopColor="#F57C00" />
                <stop offset="100%" stopColor="#D84315" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.5" fill="url(#coin_large_grad)" stroke="#9A3412" strokeWidth="1.2" />
        <circle cx="12" cy="12" r="5.5" fill="none" stroke="#FFE082" strokeWidth="1.5" />
        <path d="M12 7v10M10 8.5h4M10 15.5h4" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

interface ProfileScreenProps {

    currentUser: User | null;

    onOpenProfile: () => void;

    onEnterMyStream: () => void;

    onOpenWallet: (initialTab?: 'Diamante' | 'Ganhos') => void;

    onOpenFollowing: () => void;

    onOpenFans: () => void;

    onOpenVisitors: () => void;

    onOpenTopFans: () => void;

    onNavigateToMessages: () => void;

    onOpenMarket: () => void;

    onOpenMyLevel: () => void;

    onOpenBlockList: () => void;

    onOpenAvatarProtection: () => void;

    onOpenFAQ: () => void;

    onOpenSettings: () => void;

    onOpenVIPCenter?: () => void;

    onOpenAdminWallet: () => void;

    visitors: User[];

    onOpenUserLevels?: () => void;

}

const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)';
    let textCol = '#374151'; // dark silver-grey text for silver levels
    let borderColor = '#9ca3af'; // silver border
    let glow = '0 0 6px rgba(156, 163, 175, 0.3)';
    let starColor = 'text-slate-500 fill-current';

    if (level >= 41) {
        // Red/rose profile level style matching UserLevelsScreen for top levels
        bgGrad = 'linear-gradient(135deg, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fca5a5';
        glow = '0 0 10px rgba(244, 63, 94, 0.6)';
        starColor = 'text-rose-200 fill-current';
    } else if (level >= 21) {
        // Gold style
        bgGrad = 'linear-gradient(135deg, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
        glow = '0 0 10px rgba(245, 158, 11, 0.6)';
        starColor = 'text-amber-200 fill-current';
    } else if (level >= 11) {
        // Bronze style
        bgGrad = 'linear-gradient(135deg, #ffedd5 0%, #d97706 50%, #7c2d12 100%)';
        textCol = '#ffffff';
        borderColor = '#fed7aa';
        glow = '0 0 8px rgba(217, 119, 6, 0.5)';
        starColor = 'text-orange-200 fill-current';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: `${glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`
            }}
            className="relative inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold font-sans tracking-tight h-[18px] select-none space-x-0.5 overflow-hidden"
        >
            {/* Glass reflection shine overlay */}
            <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
            <RankIcon className={`w-2.5 h-2.5 relative z-10 ${starColor}`} />
            <span className="relative z-10 leading-none">Lvl. {level}</span>
        </span>
    );
};

const AgeBadge: React.FC<{ gender?: 'male' | 'female' | 'not_specified'; age?: number }> = ({ gender = 'female', age }) => {
    const isMale = gender === 'male';
    const displayAge = age && age > 0 ? age : 18;
    return (
        <span className={`text-white text-[11px] font-black px-1.5 py-0.5 rounded flex items-center space-x-1 select-none shadow-[0_1px_2px_rgba(0,0,0,0.3)] h-[18px] ${isMale ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
            {isMale ? <MaleIcon className="h-3 w-3 text-white" /> : <FemaleIcon className="h-3 w-3 text-white" />}
            <span>{displayAge}</span>
        </span>
    );
};

const formatNumber = (num: any): string => {

    const numericValue = Number(num);

    if (num === null || num === undefined || isNaN(numericValue)) {

        return '0';

    }

    if (numericValue >= 1000000) {

        return (numericValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';

    }

    if (numericValue >= 1000) {

        return (numericValue / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

    }

    return String(numericValue);

};



const ProfileScreen: React.FC<ProfileScreenProps> = ({ 

    currentUser,

    onOpenProfile,

    onEnterMyStream, 

    onOpenWallet,

    onOpenFollowing, 

    onOpenFans, 

    onOpenVisitors,

    onOpenTopFans,

    onNavigateToMessages,

    onOpenMarket,

    onOpenMyLevel,

    onOpenBlockList,

    onOpenAvatarProtection,

    onOpenFAQ,

    onOpenSettings,

    onOpenAdminWallet,

    visitors,

    onOpenUserLevels

}) => {

    if (!currentUser) return null;

    const { t } = useTranslation();

    const [freshUserData, setFreshUserData] = useState<User | null>(null);
    const [flagError, setFlagError] = useState(false);

    

    // Buscar dados frescos do usuário da API ao montar o componente

    useEffect(() => {

        let isMounted = true;

        

        const fetchFreshUserData = async () => {

            try {

                const userData = await api.getUser(currentUser.id);

                if (isMounted && userData) {

                    setFreshUserData(userData);

                }

            } catch (error) {

                // Erro ao buscar dados frescos do usuário

                if (isMounted) {

                    setFreshUserData(currentUser); // Fallback para dados existentes

                }

            }

        };

        

        fetchFreshUserData();

        

        return () => { isMounted = false; };

    }, [currentUser.id]);



    // Usar dados frescos se disponíveis, senão usar currentUser
    const displayUser = freshUserData || currentUser;

    // Simplificar ação do avatar para sempre abrir o perfil
    const avatarAction = onOpenProfile;
    const avatarAriaLabel = "Ver perfil detalhado";



    const menuItems = [

        { icon: <CustomMarketIcon />, label: t('profile.menu.market'), action: onOpenMarket },

        { icon: <CustomRankIcon />, label: t('profile.menu.myLevel'), action: onOpenMyLevel },

        { icon: <CustomFansIcon />, label: t('profile.menu.myFans'), action: onOpenTopFans },

        { icon: <CustomBlockIcon />, label: t('profile.menu.blockList'), action: onOpenBlockList },

        { icon: <CustomAvatarProtectIcon />, label: t('profile.menu.avatarProtection'), action: onOpenAvatarProtection },

        { icon: <CustomUserLevelIcon />, label: "Nível", action: onOpenUserLevels },

        { icon: <CustomFAQIcon />, label: t('profile.menu.faq'), action: onOpenFAQ },

        { icon: <CustomSettingsIcon />, label: t('profile.menu.settings'), action: onOpenSettings },

    ];



    // Simplificado - sem frames para navegação isolada

    const frameGlowClass = '';



    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {

        const file = event.target.files?.[0];

        if (!file) return;



        try {

            // Usar método centralizado de upload de avatar

            const result = await api.uploadAvatar(displayUser.id, file);



            if (result.success && result.avatarUrl) {

                // Atualizar avatar do usuário usando API existente

                await api.updateProfile(displayUser.id, {

                    avatarUrl: result.avatarUrl

                });



                // Atualizar dados frescos para mostrar nova imagem imediatamente

                const updatedUserData = await api.getUser(displayUser.id);

                if (updatedUserData) {

                    setFreshUserData(updatedUserData);

                }

            } else {

                console.error('Erro no upload: resposta inválida');

            }

        } catch (error) {

            console.error('Erro ao fazer upload do avatar:', error);

        }



        // Limpar input para permitir upload do mesmo arquivo novamente

        event.target.value = '';

    };



  return (

    <div className="bg-[#111111] h-full text-white overflow-y-auto no-scrollbar pb-24 flex flex-col">

      <div className="my-auto">

        {/* Profile Header */}

        <div className="flex flex-col items-center pt-8 pb-4 px-4 bg-[#111111]">
          <div className="relative mb-4 group cursor-pointer" onClick={avatarAction}>
            <div className="relative">
              <AvatarWithFrame
                user={displayUser}
                size="xl"
                className="mb-1"
                showFrame={true}
              />

              {displayUser.isAvatarProtected && (
                <div className="absolute top-0 right-0 bg-black/50 rounded-full p-1 z-20 pointer-events-none">
                  <ShieldIcon className="w-5 h-5 text-blue-400" />
                </div>
              )}

              {displayUser.isLive && ((displayUser as any).streamStatus === 'active' || displayUser.currentStreamId) ? (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 rounded-md px-2 py-1 flex items-center space-x-1.5 backdrop-blur-sm z-20 pointer-events-none">
                    <LiveIndicatorIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{t('footer.live')}</span>
                  </div>
              ) : (displayUser.isOnline || (displayUser as any).is_online) ? (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black z-20 pointer-events-none shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Online"></div>
              ) : null}

              <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full p-0.5 z-20">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                    {!flagError && displayUser.country && displayUser.country !== 'global' ? (
                      <img
                        src={`https://flagcdn.com/${displayUser.country.toLowerCase()}.svg`}
                        alt={displayUser.country}
                        className="w-full h-full object-cover"
                        onError={() => setFlagError(true)}
                      />
                    ) : (
                      <BrazilFlagIcon />
                    )}
                  </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-1 text-center cursor-pointer" onClick={avatarAction}>
              <h1 className="text-2xl font-bold flex items-center justify-center space-x-2">
                <span>{displayUser.name}</span>
                {displayUser.isVIP && (
                    <VIPBadgeIcon className="w-6 h-6" />
                )}
              </h1>
          </div>



          <div className="flex items-center space-x-2 my-2">
              <AgeBadge gender={displayUser.gender} age={displayUser.age} />
              <LevelBadge level={displayUser.level || 1} />
          </div>



          <div className="text-center text-gray-400 text-sm cursor-pointer" onClick={avatarAction}>
              <div className="flex items-center justify-center space-x-2">
                  <span>{t('profile.id')}: {displayUser.id}</span>
                  <button className="text-gray-500 hover:text-white" onClick={(e) => { e.stopPropagation(); /* copy logic here if needed */ }}><CopyIcon className="h-4 w-4" /></button>
              </div>
              <p>
                   {displayUser.city && displayUser.state ? `${displayUser.city}, ${displayUser.state}` : (typeof displayUser.location === 'string' && displayUser.location !== 'desconhecido' ? displayUser.location : 'Brasil')}
              </p>
          </div>



          <div className="flex justify-around w-full mt-6">

              <button onClick={onOpenFollowing} className="text-center p-2 rounded-lg hover:bg-gray-800/50 transition-colors focus:outline-none">

                  <p className="text-xl font-bold">{formatNumber(displayUser.following)}</p>

                  <p className="text-sm text-gray-400">{t('profile.following')}</p>

              </button>

              <button onClick={onOpenFans} className="text-center p-2 rounded-lg hover:bg-gray-800/50 transition-colors focus:outline-none">

                  <p className="text-xl font-bold">{formatNumber(displayUser.fans)}</p>

                  <p className="text-sm text-gray-400">{t('profile.fans')}</p>

              </button>

              <button onClick={onOpenVisitors} className="text-center p-2 rounded-lg hover:bg-gray-800/50 transition-colors focus:outline-none">

                  <p className="text-xl font-bold">{formatNumber(visitors.length)}</p>

                  <p className="text-sm text-gray-400">{t('profile.visitors')}</p>

              </button>

          </div>

        </div>

        

        {/* Main Content */}

        <div className="px-2 sm:px-4 py-4 space-y-2">

          {/* Earnings - Apenas para streamers */}

          {currentUser.isBroadcaster && (

            <div className="flex items-center justify-between p-4 bg-[#111111] rounded-lg w-full">

              <div className="flex items-center space-x-3">

                <CustomGoldCoinIconLarge />

                <span className="font-semibold">{t('profile.earnings')}</span>

              </div>

              <div className="flex items-center space-x-2">

                <span className="text-sm text-orange-400 font-bold">

                  R$ {displayUser.earnings?.toFixed(2).replace('.', ',') || '0,00'}

                </span>

                <ChevronRightIcon className="h-5 w-5 text-gray-500" />

              </div>

            </div>

          )}

          

          {/* Wallet */}

          <div className="flex items-center justify-between p-4 bg-[#111111] rounded-lg w-full">

              <button onClick={() => onOpenWallet()} className="flex items-center space-x-3 text-left hover:opacity-80 transition-opacity">

                  <CustomWalletIcon />

                  <span className="font-semibold">{t('profile.wallet')}</span>

              </button>

              <div className="flex items-center space-x-4">

                  <button onClick={() => onOpenWallet('Diamante')} className="flex items-center space-x-1 hover:opacity-80 transition-opacity">

                      <CustomYellowDiamondIcon />

                      <span className="text-sm text-yellow-500 font-bold">{displayUser.diamonds?.toLocaleString('pt-BR')}</span>

                  </button>

                  <button onClick={() => onOpenWallet('Ganhos')} className="flex items-center space-x-1 hover:opacity-80 transition-opacity">

                      <CustomGoldCoinIcon />

                           <span className="text-sm text-orange-400 font-bold">{displayUser.earnings?.toLocaleString('pt-BR')}</span>

                  </button>

                  <button onClick={() => onOpenWallet()} className="hover:opacity-80 transition-opacity">

                      <ChevronRightIcon className="h-5 w-5 text-gray-500" />

                  </button>

              </div>

          </div>

          

          {/* Menu List */}

          <div className="bg-[#111111] rounded-lg overflow-hidden">

              {menuItems.map((item, index) => {

                  // if ((item as any).isAdminOnly && displayUser.platformEarnings === undefined) {

                  //     return null;

                  return (

                      <button key={index} onClick={item.action} disabled={!item.action} className="flex items-center justify-between p-4 hover:bg-[#2c2c2e] transition-colors w-full text-left disabled:opacity-60 disabled:cursor-not-allowed border-b border-gray-800/50 last:border-none">

                          <div className="flex items-center space-x-3">

                              {item.icon}

                              <span className="text-gray-200">{item.label}</span>

                          </div>

                          <ChevronRightIcon className="h-5 w-5 text-gray-500" />

                      </button>

                  )

              })}

          </div>

        </div>

      </div>

    </div>

  );

};



export default ProfileScreen;