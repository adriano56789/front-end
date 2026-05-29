import React from 'react';
import { BookOpenIcon, SparklesIcon, PKIcon, LockIcon, ChevronRightIcon } from '../icons';
import { useTranslation } from '../../i18n';

interface StreamToolsPanelProps {
  onOpenManual: () => void;
  onOpenBeautyPanel: () => void;
  isPrivate: boolean;
  onTogglePrivate: () => void;
  isInviteMode?: boolean;
}

export const StreamToolsPanel: React.FC<StreamToolsPanelProps> = ({
  onOpenManual,
  onOpenBeautyPanel,
  isPrivate,
  onTogglePrivate,
  isInviteMode = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-0">
      <button 
        onClick={onOpenManual} 
        className="flex items-center justify-between py-2 border-t border-b border-gray-700/50 w-full"
      >
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="w-5 h-5 text-gray-400" />
          <span>{t('goLive.liveManual')}</span>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
      </button>

      <button 
        onClick={onOpenBeautyPanel} 
        className="flex items-center justify-between py-2 w-full"
      >
        <div className="flex items-center space-x-3">
          <SparklesIcon className="w-5 h-5 text-gray-400" />
          <span>{t('goLive.beautyEffects')}</span>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
      </button>

      {!isInviteMode && (
        <>
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <div className="flex items-center space-x-3">
              <PKIcon className="w-5 h-5" />
              <span>{t('goLive.pkBattle')}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <div className="flex items-center space-x-3">
              <LockIcon className="w-5 h-5 text-gray-400" />
              <span>Sala Privada</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isPrivate} 
                onChange={onTogglePrivate} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </>
      )}
    </div>
  );
};
