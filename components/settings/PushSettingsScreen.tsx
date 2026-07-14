import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTranslation } from '../../i18n';
import { User } from '../../types';
import { LoadingSpinner } from '../Loading';

interface PushSettingsScreenProps {
  onBack: () => void;
  currentUser: User;
}

// Chevron back button matching the design precisely
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

// Switch Component
const CustomSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => {
  return (
    <button
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

const PushSettingsScreen: React.FC<PushSettingsScreenProps> = ({ onBack, currentUser }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [pushToggles, setPushToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Get followed users from the API
        const users = await api.getFollowingUsers(currentUser.id);
        setFollowedUsers(users || []);
        
        // Migrar dados do localStorage para API (única vez)
        const stored = localStorage.getItem(`push_settings_${currentUser.id}`);
        if (stored) {
          try {
            const legacy = JSON.parse(stored);
            if (Object.keys(legacy).length > 0) {
              await api.updatePushSettings(currentUser.id, legacy);
            }
          } catch (_) {}
          localStorage.removeItem(`push_settings_${currentUser.id}`);
        }

        // Load toggle states from API (persistido no MongoDB)
        try {
          const response = await api.getPushSettings(currentUser.id);
          const saved = response?.settings || {};
          if (Object.keys(saved).length > 0) {
            setPushToggles(saved);
          } else {
            // Default all to true (enabled)
            const initialToggles: Record<string, boolean> = {};
            (users || []).forEach(u => {
              initialToggles[u.id] = true;
            });
            setPushToggles(initialToggles);
          }
        } catch (err) {
          console.error('Failed to load push settings from API:', err);
          // Fallback: default all to true
          const initialToggles: Record<string, boolean> = {};
          (users || []).forEach(u => {
            initialToggles[u.id] = true;
          });
          setPushToggles(initialToggles);
        }
      } catch (error) {
        console.error('Failed to load followed users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleToggle = (userId: string) => {
    const updated = { ...pushToggles, [userId]: !pushToggles[userId] };
    setPushToggles(updated);
    // Persistir no MongoDB via API
    api.updatePushSettings(currentUser.id, updated).catch(err => {
      console.error('Failed to save push settings:', err);
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
          {t('settings.notifications.pushSettings') || 'Configurações de push'}
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-y-auto no-scrollbar px-4 py-2 z-10">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner />
          </div>
        ) : followedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-zinc-300">Nenhum streamer seguido</p>
            <p className="text-[13px] text-zinc-500 mt-2">
              Siga streamers na plataforma para poder ativar ou desativar as notificações push individuais.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-[14px] font-normal text-zinc-500 mb-2.5 px-1 tracking-wide">
                Streamers que você segue
              </h2>
              
              <div className="bg-[#1C1F26]/60 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-lg">
                {followedUsers.map((user, idx) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between px-5 py-4 ${
                      idx !== followedUsers.length - 1 ? 'border-b border-white/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="relative">
                        <img 
                          src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover border border-white/[0.08]"
                          referrerPolicy="no-referrer"
                        />
                        {user.isLive && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-black rounded-full" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-medium text-zinc-100 leading-snug">
                          {user.name}
                        </span>
                        {user.isLive && (
                          <span className="text-[11px] text-red-500 font-semibold uppercase tracking-wider mt-0.5 animate-pulse">
                            Ao Vivo
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <CustomSwitch 
                      checked={pushToggles[user.id] !== false} 
                      onChange={() => handleToggle(user.id)} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PushSettingsScreen;
