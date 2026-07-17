import React from 'react';

interface LiveCallInvitationProps {
  streamId: string;
  isHost: boolean;
  onGuestJoined?: (guest: any) => void;
  onGuestLeft?: () => void;
}

const LiveCallInvitation: React.FC<LiveCallInvitationProps> = ({
  streamId,
  isHost,
  onGuestJoined,
  onGuestLeft,
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">📞 Gerenciador de Chamadas</h3>
        <span className="h-2.5 w-2.5 rounded-full bg-gray-600" />
      </div>
      <div className="text-center py-6 bg-gray-950/50 rounded-md border border-dashed border-gray-800">
        <p className="text-xs text-gray-400">
          Convidados conectados à transmissão aparecerão aqui.
        </p>
      </div>
    </div>
  );
};

export default LiveCallInvitation;
