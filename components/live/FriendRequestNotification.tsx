
import React from 'react';
import { UserIcon } from '../icons';
import { useTranslation } from '../../i18n';

interface FriendRequestNotificationProps {
  followerName: string;
  onClick: () => void;
}

const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({ followerName, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="bg-purple-500/30 rounded-full p-1 px-2 flex items-center self-start text-[9px] cursor-pointer hover:bg-purple-500/40"
    >
      <UserIcon className="w-3.5 h-3.5 text-purple-300 mr-1.5" />
      <span className="text-gray-200">{t('chat.newFriendRequestWithName', { name: followerName })}</span>
    </button>
  );
};

export default FriendRequestNotification;