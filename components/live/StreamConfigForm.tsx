import React from 'react';
import { useTranslation } from '../../i18n';
import { User } from '../../types';

interface StreamConfigFormProps {
  streamTitle: string;
  streamDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onAddCover: () => void;
  draftStream?: any;
  isInviteMode?: boolean;
  currentUser: User;
}

export const StreamConfigForm: React.FC<StreamConfigFormProps> = ({
  streamTitle,
  streamDescription,
  onTitleChange,
  onDescriptionChange,
  onSave,
  onAddCover,
  draftStream,
  isInviteMode = false,
  currentUser
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-start space-x-3">
      <button
        onClick={onAddCover}
        disabled={isInviteMode}
        className="w-16 h-16 bg-gray-800/80 rounded-lg flex flex-col items-center justify-center text-gray-300 text-xs flex-shrink-0 overflow-hidden relative"
      >
        {draftStream?.avatar && <img src={draftStream.avatar} alt="Capa da Live" className="absolute inset-0 w-full h-full object-cover" />}
        <>
          <span className="relative text-2xl font-light">+</span>
          <span className="relative">{t('goLive.addCover')}</span>
        </>
      </button>
      
      <div className="flex-grow space-y-2">
        <input
          type="text"
          placeholder={t('goLive.titlePlaceholder')}
          value={streamTitle}
          onChange={e => !isInviteMode && onTitleChange(e.target.value)}
          readOnly={isInviteMode}
          className="w-full bg-transparent border-b border-gray-600 p-1 text-white focus:outline-none focus:border-white font-bold text-lg"
        />
        
        <input
          type="text"
          placeholder={t('goLive.descriptionPlaceholder')}
          value={streamDescription}
          onChange={e => !isInviteMode && onDescriptionChange(e.target.value)}
          readOnly={isInviteMode}
          className="w-full bg-transparent border-b border-gray-600 p-1 text-white focus:outline-none focus:border-white text-sm"
        />
      </div>
      
      <button onClick={onSave} className="bg-gray-700/80 text-white px-5 py-2 rounded-full text-sm self-end">
        {t('goLive.save')}
      </button>
    </div>
  );
};
