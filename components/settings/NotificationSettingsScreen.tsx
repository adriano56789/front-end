import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { User, NotificationSettings } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../Loading';
import { requestNotificationPermission, NotifPermissionStatus } from '../../services/notificationService';

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
    strokeWidth={1.8} 
    stroke="currentColor" 
    className="w-[18px] h-[18px] text-zinc-500"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

// Switches matching the exact colors of the screenshot
const CustomSwitch: React.FC<CustomSwitchProps> = ({ checked, onChange, id }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-in-out outline-none focus:outline-none ${
        checked 
          ? 'bg-[#00DADE] shadow-[0_0_12px_rgba(0,218,222,0.65)]' 
          : 'bg-[#3E4146] border border-white/[0.02]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition duration-300 ease-in-out mt-[4px] ${
          checked ? 'translate-x-[24px]' : 'translate-x-[4px]'
        }`}
      />
    </button>
  );
};

interface NotificationSettingsScreenProps {
  onBack: () => void;
  navigateTo: (page: string) => void;
  currentUser: User;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ onBack, navigateTo, currentUser }) => {
  const { t } = useTranslation();
  const [toggles, setToggles] = useState<NotificationSettings | null>(null);
  // 🔔 Status da permissão de notificação do navegador (PWA)
  const [permStatus, setPermStatus] = useState<NotifPermissionStatus | 'unknown'>('unknown');

  useEffect(() => {
    if (currentUser) {
      api.getNotificationSettings(currentUser.id)
        .then(setToggles)
        .catch(err => {
          // Set to default values on error to prevent UI from being stuck in loading
          setToggles({
            newMessages: false,
            streamerLive: false,
            followedPosts: false,
            pedido: false,
            interactive: false,
          });
        });
    }
  }, [currentUser]);

  // Lê a permissão atual do navegador (PWA)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermStatus('unsupported');
    } else {
      setPermStatus(Notification.permission);
    }
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    if (!currentUser || !toggles) return;
    
    const newToggles = { ...toggles, [key]: !toggles[key] };
    setToggles(newToggles); // Optimistic UI update

    api.updateNotificationSettings(currentUser.id, { [key]: newToggles[key] })
      .catch(() => {
        // Revert on failure
        setToggles(toggles);
      });
  };

  // 🔔 Pede permissão de notificação dentro do gesto do usuário (obrigatório no celular)
  const handleEnableNotifications = async () => {
    if (!currentUser) return;
    const status = await requestNotificationPermission(currentUser.id);
    setPermStatus(status);
  };

  return (
    <div className="flex flex-col h-full bg-black select-none text-white relative font-sans overflow-hidden min-h-screen">
      {/* Modern Compact Header with crisp single-chevron back button */}
      <header className="flex items-center px-4 py-5 z-10 flex-shrink-0 relative">
        <button 
          id="btn_notif_back"
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] active:scale-95 transition-all text-white"
          title="Voltar"
        >
          <ChevronLeftIcon />
        </button>
        <span className="ml-[10px] text-[18px] font-semibold text-white tracking-wide">
          {t('settings.notifications.title') || 'Configurações de notificação'}
        </span>
      </header>

      {/* Main Form Fields Container */}
      <main className="flex-grow overflow-y-auto no-scrollbar px-4 py-2 z-10">
        {/* 🔔 Status da permissão de notificação (PWA) */}
        <div className="mb-5">
          {permStatus === 'granted' ? (
            <div className="flex items-center gap-3 bg-green-500/[0.08] border border-green-500/20 rounded-2xl px-4 py-3">
              <span className="text-lg">✅</span>
              <p className="text-[13px] text-green-200 leading-snug">Notificações ativadas neste dispositivo. Você recebe avisos de live mesmo com o app fechado.</p>
            </div>
          ) : permStatus === 'denied' ? (
            <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-4 py-3">
              <span className="text-lg">🔕</span>
              <p className="text-[13px] text-red-200 leading-snug flex-1">Permissão negada no navegador. Para ativar: toque no 🔒 do endereço → Permissões → Notificações → Permitir.</p>
            </div>
          ) : permStatus === 'unsupported' ? (
            <div className="flex items-start gap-3 bg-zinc-500/[0.08] border border-white/10 rounded-2xl px-4 py-3">
              <span className="text-lg">📲</span>
              <p className="text-[13px] text-zinc-300 leading-snug flex-1">Seu navegador não suporta notificações. Instale o app pela tela de início (Adicionar à tela de início) para recebê-las.</p>
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-3 bg-[#26e3ff]/[0.1] border border-[#26e3ff]/25 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#26e3ff]/25 to-purple-500/25 flex items-center justify-center text-lg">🔔</span>
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-white">Ativar notificações neste dispositivo</span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">Saiba quando seus streamers entram ao vivo</span>
              </span>
              <span className="text-[#26e3ff] text-xs font-bold">Ativar</span>
            </button>
          )}
        </div>
        {!toggles ? (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1: RECEBER NOTIFICAÇÕES */}
            <div>
              <h2 className="text-[14px] font-normal text-zinc-500 mb-2.5 px-1 tracking-wide">
                {t('settings.notifications.receive') || 'Receber notificações'}
              </h2>
              
              {/* Card Container styled exactly like the screenshot with subtle border & dark gradient bg */}
              <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-lg">
                
                {/* Row 1: Novas mensagens */}
                <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.03]">
                  <span className="text-[15px] font-normal text-zinc-100">
                    {t('settings.notifications.newMessages') || 'Novas mensagens'}
                  </span>
                  <CustomSwitch 
                    id="switch_new_messages"
                    checked={toggles.newMessages} 
                    onChange={() => handleToggle('newMessages')} 
                  />
                </div>

                {/* Row 2: Início ao vivo do streamer seguido */}
                <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.03]">
                  <span className="text-[15px] font-normal text-zinc-100 max-w-[70%] leading-snug">
                    {t('settings.notifications.streamerLive') || 'Início ao vivo do streamer seguido'}
                  </span>
                  <CustomSwitch 
                    id="switch_streamer_live"
                    checked={toggles.streamerLive} 
                    onChange={() => handleToggle('streamerLive')} 
                  />
                </div>

                {/* Row 3: Iniciar configurações de push - NOW IN ROW 3! */}
                <button 
                  id="btn_push_settings_trigger"
                  onClick={() => navigateTo('push_settings')}
                  className="w-full flex items-center justify-between px-5 py-[18px] text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all border-b border-white/[0.03]"
                >
                  <span className="text-[15px] font-normal text-zinc-100">
                    {t('settings.notifications.pushSettings') || 'Iniciar configurações de push'}
                  </span>
                  <RightArrowIcon />
                </button>

                {/* Row 4: Pessoa em seguida postou um vídeo LiveGo - NOW IN ROW 4! */}
                <div className="flex items-center justify-between px-5 py-[18px]">
                  <span className="text-[15px] font-normal text-zinc-100 max-w-[70%] leading-snug">
                    {t('settings.notifications.followedPosts') || 'Pessoa em seguida postou um vídeo LiveGo'}
                  </span>
                  <CustomSwitch 
                    id="switch_person_posted_video"
                    checked={toggles.followedPosts} 
                    onChange={() => handleToggle('followedPosts')} 
                  />
                </div>

              </div>
            </div>

            {/* SECTION 2: NOTIFICAÇÕES INTERATIVAS */}
            <div className="pb-8">
              <h2 className="text-[14px] font-normal text-zinc-500 mb-2.5 px-1 tracking-wide">
                {t('settings.notifications.interactiveHeading') || 'Notificações interativas'}
              </h2>
              
              {/* Card Container */}
              <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-lg">
                
                {/* Row 1: Pedido */}
                <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/[0.03]">
                  <span className="text-[15px] font-normal text-zinc-100">
                    {t('settings.notifications.request') || 'Pedido'}
                  </span>
                  <CustomSwitch 
                    id="switch_presents"
                    checked={toggles.pedido} 
                    onChange={() => handleToggle('pedido')} 
                  />
                </div>

                {/* Row 2: Notificações interativas */}
                <div className="flex items-center justify-between px-5 py-[18px]">
                  <span className="text-[15px] font-normal text-zinc-100">
                    {t('settings.notifications.interactive') || 'Notificações interativas'}
                  </span>
                  <CustomSwitch 
                    id="switch_interactive_news"
                    checked={toggles.interactive} 
                    onChange={() => handleToggle('interactive')} 
                  />
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationSettingsScreen;
