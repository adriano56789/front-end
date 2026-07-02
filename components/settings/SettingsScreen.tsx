import React, { useState } from 'react';
import { 
    BackIcon, 
    ChevronRightIcon
} from '../icons';
import ConnectedAccountsScreen from './ConnectedAccountsScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';
import PrivacySettingsScreen from './PrivacySettingsScreen';
import PushSettingsScreen from './PushSettingsScreen';
import WhoCanMessageScreen from './WhoCanMessageScreen';
import AvatarProtectionScreen from './AvatarProtectionScreen';
import PrivateLiveSettingsScreen from './PrivateLiveSettingsScreen';
import { GiftNotificationSettingsScreen } from './GiftNotificationSettingsScreen';
import ZoomSettingsScreen from './ZoomSettingsScreen';
import AppVersionScreen from './AppVersionScreen';
import EarningsInfoScreen from './EarningsInfoScreen';
import CopyrightScreen from './CopyrightScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import { useTranslation } from '../../i18n';
import { User, Gift, ToastType } from '../../types';

// Custom, highly polished SVG icons matching the screenshot's precise thin-line design
const CustomLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
);

const CustomBellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const CustomGiftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625A2.625 2.625 0 1114.625 7.5H12m0-2.625V21m-9-13.5h18" />
    </svg>
);

const CustomEnvelopeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const CustomLockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 11V7a4 4 0 118 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomEarningsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 12h.01M18 12h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomGlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 12h19M12 2.5a15.3 15.3 0 014 9.5 15.3 15.3 0 01-4 9.5 15.3 15.3 0 01-4-9.5 15.3 15.3 0 014-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomCopyrightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
    </svg>
);

const CustomSmartphoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <rect x="5" y="2" width="14" height="20" rx="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomZoomIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomTrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

interface SettingsListItemProps {
    label: string; 
    icon: React.ReactNode; 
    onClick: () => void; 
    isDestructive?: boolean;
}

const SettingsListItem: React.FC<SettingsListItemProps> = ({ label, icon, onClick, isDestructive = false }) => (
    <button 
        onClick={onClick} 
        className="flex items-center justify-between w-full px-5 py-4 bg-transparent hover:bg-zinc-900/30 active:bg-zinc-900/65 transition-colors duration-150"
    >
        <div className="flex items-center space-x-4">
            <div className={`w-5 h-5 flex items-center justify-center ${isDestructive ? 'text-red-500' : 'text-gray-300'}`}>
                {icon}
            </div>
            <span className={`text-[15px] font-normal tracking-wide ${isDestructive ? 'text-red-500 font-medium' : 'text-white'}`}>
                {label}
            </span>
        </div>
        {!isDestructive && (
            <ChevronRightIcon className="w-5 h-5 text-zinc-600 font-light" />
        )}
    </button>
);

const MainSettingsPage: React.FC<{ navigateTo: (page: string) => void; onLogout: () => void; onOpenLanguageModal: () => void; }> = ({ navigateTo, onLogout, onOpenLanguageModal }) => {
    const { t } = useTranslation();

    const menuItems = [
        { icon: <CustomLinkIcon />, label: t('settings.main.connectedAccounts'), action: () => navigateTo('connected_accounts') },
        { icon: <CustomBellIcon />, label: t('settings.main.notificationSettings'), action: () => navigateTo('notifications') },
        { icon: <CustomGiftIcon />, label: t('settings.main.giftNotifications'), action: () => navigateTo('gift_notifications') },
        { icon: <CustomEnvelopeIcon />, label: t('settings.main.privateLiveInvite'), action: () => navigateTo('private_live') },
        { icon: <CustomLockIcon />, label: t('settings.main.privacySettings'), action: () => navigateTo('privacy') },
        { icon: <CustomEarningsIcon />, label: t('settings.main.earningsInfo'), action: () => navigateTo('earnings_info') },
        { icon: <CustomGlobeIcon />, label: t('settings.main.language'), action: onOpenLanguageModal },
        { icon: <CustomCopyrightIcon />, label: t('settings.main.copyright'), action: () => navigateTo('copyright') },
        { icon: <CustomSmartphoneIcon />, label: t('settings.main.appVersion'), action: () => navigateTo('app_version') },
        { icon: <CustomZoomIcon />, label: t('settings.main.zoomAdjustment'), action: () => navigateTo('zoom') },
        { icon: <CustomTrashIcon />, label: t('settings.main.deleteAccount'), action: () => navigateTo('delete_account'), isDestructive: true },
    ];

    return (
        <>
            <div className="flex-grow overflow-y-auto no-scrollbar pt-2">
                <div className="space-y-0.5">
                    {menuItems.map((item) => (
                        <SettingsListItem 
                            key={item.label}
                            label={item.label} 
                            icon={item.icon} 
                            onClick={item.action} 
                            isDestructive={item.isDestructive} 
                        />
                    ))}
                </div>
            </div>
             <footer className="px-6 py-6 pb-8 flex-shrink-0">
                  <button 
                      onClick={onLogout} 
                      className="w-full bg-[#EA334D] hover:bg-[#ff3b30]/90 active:scale-[0.98] text-white font-semibold py-3.5 rounded-[1.5rem] transition-all duration-150 text-[16px] tracking-wide shadow-md"
                  >
                     {t('settings.main.logout')}
                 </button>
             </footer>
        </>
    );
};

interface SettingsScreenProps {
    onClose: () => void; 
    currentUser: User; 
    gifts: Gift[]; 
    updateUser: (user: User) => void; 
    addToast: (type: ToastType, message: string) => void; 
    onOpenPipModal: () => void;
    onLogout: () => void;
    onDeleteAccount: () => void;
    onOpenLanguageModal: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose, currentUser, gifts, updateUser, addToast, onOpenPipModal, onLogout, onDeleteAccount, onOpenLanguageModal }) => {
    const [page, setPage] = useState('main');
    const { t } = useTranslation();

    const navigateTo = (pageName: string) => setPage(pageName);

    const renderPage = () => {
        switch (page) {
            case 'connected_accounts':
                return <ConnectedAccountsScreen onBack={() => setPage('main')} currentUser={currentUser} addToast={addToast} onLogout={onLogout} />;
            case 'notifications':
                return <NotificationSettingsScreen onBack={() => setPage('main')} navigateTo={navigateTo} currentUser={currentUser} />;
            case 'push_settings':
                return <PushSettingsScreen onBack={() => setPage('notifications')} currentUser={currentUser} />;
            case 'privacy':
                return <PrivacySettingsScreen onBack={() => setPage('main')} navigateTo={navigateTo} onOpenPipModal={onOpenPipModal} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />;
            case 'who_can_message':
                return <WhoCanMessageScreen onBack={() => setPage('privacy')} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />;
            case 'avatar_protection':
                return <AvatarProtectionScreen onBack={() => setPage('privacy')} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />;
            case 'private_live':
                return <PrivateLiveSettingsScreen onBack={() => setPage('main')} currentUser={currentUser} updateUser={updateUser} addToast={addToast} />;
            case 'gift_notifications':
                return <GiftNotificationSettingsScreen onBack={() => setPage('main')} user={currentUser} gifts={gifts} />;
            case 'zoom':
                return <ZoomSettingsScreen onBack={() => setPage('main')} currentUser={currentUser} />;
            case 'app_version':
                return <AppVersionScreen onBack={() => setPage('main')} />;
            case 'earnings_info': 
                return <EarningsInfoScreen onBack={() => setPage('main')} />;
            case 'copyright': 
                return <CopyrightScreen onBack={() => setPage('main')} />;
            case 'delete_account': 
                return <DeleteAccountScreen onBack={() => setPage('main')} onDelete={onDeleteAccount} />;
            default:
                return <MainSettingsPage navigateTo={navigateTo} onLogout={onLogout} onOpenLanguageModal={onOpenLanguageModal} />;
        }
    };
    
    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col text-white font-sans">
          {page === 'main' && (
             <header className="flex items-center p-4 py-5 flex-shrink-0 relative">
                <button 
                    onClick={onClose} 
                    className="absolute left-4 p-1 text-gray-300 hover:text-white transition-colors"
                >
                     <BackIcon className="w-6 h-6" />
                </button>
                <div className="flex-grow text-center">
                     <h1 className="text-lg font-bold tracking-wide text-gray-100">{t('settings.title')}</h1>
                </div>
             </header>
          )}
          {renderPage()}
        </div>
    );
};

export default SettingsScreen;
