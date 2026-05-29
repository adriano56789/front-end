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

}



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

    visitors

}) => {

    if (!currentUser) return null;

    const { t } = useTranslation();

    const [freshUserData, setFreshUserData] = useState<User | null>(null);

    

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

        { icon: <MarketIcon className="h-6 w-6 text-blue-400" />, label: t('profile.menu.market'), action: onOpenMarket },

        { icon: <RankIcon className="h-6 w-6 text-yellow-500" />, label: t('profile.menu.myLevel'), action: onOpenMyLevel },

        { icon: <FansIcon className="h-6 w-6 text-green-400" />, label: t('profile.menu.myFans'), action: onOpenTopFans },

        { icon: <BlockIcon className="h-6 w-6 text-red-500" />, label: t('profile.menu.blockList'), action: onOpenBlockList },

        { icon: <AvatarProtectIcon className="h-6 w-6 text-purple-400" />, label: t('profile.menu.avatarProtection'), action: onOpenAvatarProtection },

        { icon: <EnvelopeIcon className="h-6 w-6 text-gray-400" />, label: t('profile.menu.messages'), action: onNavigateToMessages },

        { icon: <FAQIcon className="h-6 w-6 text-gray-400" />, label: t('profile.menu.faq'), action: onOpenFAQ },

        { icon: <SettingsIcon className="h-6 w-6 text-gray-400" />, label: t('profile.menu.settings'), action: onOpenSettings },

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

              {displayUser.isLive && (displayUser.streamStatus === 'active' || displayUser.currentStreamId) ? (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 rounded-md px-2 py-1 flex items-center space-x-1.5 backdrop-blur-sm z-20 pointer-events-none">
                    <LiveIndicatorIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{t('footer.live')}</span>
                  </div>
              ) : (displayUser.isOnline || (displayUser as any).is_online) ? (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black z-20 pointer-events-none shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Online"></div>
              ) : null}

              <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full p-0.5 z-20">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                      <BrazilFlagIcon />
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

              {displayUser.age && (

                <span className={`text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 ${displayUser.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>

                    {displayUser.gender === 'male' ? <MaleIcon className="h-3 w-3" /> : <FemaleIcon className="h-3 w-3" />}

                    <span>{displayUser.age}</span>

                </span>

              )}

               <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1">

                  <RankIcon className="h-3 w-3" />

                  <span>{displayUser.level}</span>

              </span>

          </div>



          <div className="text-center text-gray-400 text-sm cursor-pointer" onClick={avatarAction}>
              <div className="flex items-center justify-center space-x-2">
                  <span>{t('profile.id')}: {displayUser.identification}</span>
                  <button className="text-gray-500 hover:text-white" onClick={(e) => { e.stopPropagation(); /* copy logic here if needed */ }}><CopyIcon className="h-4 w-4" /></button>
              </div>
              <p>Brasil | desconhecido</p>
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

                <GoldCoinIcon className="h-6 w-6 text-orange-400" />

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

                  <WalletIcon className="h-6 w-6 text-yellow-400" />

                  <span className="font-semibold">{t('profile.wallet')}</span>

              </button>

              <div className="flex items-center space-x-4">

                  <button onClick={() => onOpenWallet('Diamante')} className="flex items-center space-x-1 hover:opacity-80 transition-opacity">

                      <YellowDiamondIcon className="h-4 w-4" />

                      <span className="text-sm text-yellow-500 font-bold">{displayUser.diamonds?.toLocaleString('pt-BR')}</span>

                  </button>

                  <button onClick={() => onOpenWallet('Ganhos')} className="flex items-center space-x-1 hover:opacity-80 transition-opacity">

                      <GoldCoinIcon className="h-4 w-4 text-orange-400" />

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