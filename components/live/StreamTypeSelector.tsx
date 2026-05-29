import React from 'react';

interface StreamTypeSelectorProps {
  streamType: string;
  onStreamTypeChange: (type: string) => void;
  isInviteMode?: boolean;
}

export const StreamTypeSelector: React.FC<StreamTypeSelectorProps> = ({
  streamType,
  onStreamTypeChange,
  isInviteMode = false
}) => {
  if (isInviteMode) return null;

  const StreamTypeButton: React.FC<{ type: string }> = ({ type }) => (
    <button
      onClick={() => onStreamTypeChange(type)}
      className={`px-4 py-1 rounded-full text-sm transition-colors ${
        streamType === type 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50'
      }`}
    >
      {type}
    </button>
  );

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">Tipo de Transmissão</span>
      <div className="flex items-center space-x-2">
        <StreamTypeButton type="WebRTC" />
        <StreamTypeButton type="RTMP" />
        <StreamTypeButton type="SRT" />
      </div>
    </div>
  );
};
