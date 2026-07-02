import React, { useState } from 'react';

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
  const [isActive, setIsActive] = useState(false);
  const [guestUser, setGuestUser] = useState<any | null>(null);

  const simulateGuestJoin = () => {
    const mockGuest = {
      id: 'mock_guest_' + Math.floor(Math.random() * 1000),
      name: 'Simulated Guest 🎤',
      avatarUrl: 'https://picsum.photos/seed/guest/200.jpg',
    };
    setGuestUser(mockGuest);
    setIsActive(true);
    if (onGuestJoined) {
      onGuestJoined(mockGuest);
    }
  };

  const simulateGuestLeave = () => {
    setGuestUser(null);
    setIsActive(false);
    if (onGuestLeft) {
      onGuestLeft();
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">📞 Gerenciador de Chamadas</h3>
        <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
      </div>
      
      {isActive && guestUser ? (
        <div className="flex items-center justify-between bg-gray-800/80 p-3 rounded-md">
          <div className="flex items-center space-x-3">
            <img src={guestUser.avatarUrl} alt={guestUser.name} className="w-8 h-8 rounded-full border border-green-500" />
            <div>
              <p className="text-sm font-medium text-white">{guestUser.name}</p>
              <p className="text-xs text-green-400">Em conferência</p>
            </div>
          </div>
          <button
            onClick={simulateGuestLeave}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded transition-colors"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="text-center py-3 bg-gray-950/50 rounded-md border border-dashed border-gray-800">
          <p className="text-xs text-gray-400 mb-2">Nenhum convidado conectado à transmissão.</p>
          <button
            onClick={simulateGuestJoin}
            className="bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 text-xs px-3 py-1.5 rounded transition-colors"
          >
            ⚡ Simular Entrada de Convidado
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveCallInvitation;
