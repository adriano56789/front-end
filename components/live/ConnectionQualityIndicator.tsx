import React from 'react';

/** Valores numéricos de qualidade de conexão (REST/SRS). */
export const ConnectionQuality = {
  UNKNOWN: 0,
  POOR: 1,
  GOOD: 2,
  EXCELLENT: 3,
  LOST: 4,
} as const;

export type ConnectionQualityValue = number;

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQualityValue | undefined;
  className?: string;
}

const qualityConfig: Record<number, { bars: number; color: string; label: string }> = {
  [ConnectionQuality.EXCELLENT]: { bars: 4, color: '#22c55e', label: 'Excelente' },
  [ConnectionQuality.GOOD]:      { bars: 3, color: '#eab308', label: 'Boa' },
  [ConnectionQuality.POOR]:      { bars: 2, color: '#f97316', label: 'Ruim' },
  [ConnectionQuality.LOST]:      { bars: 1, color: '#ef4444', label: 'Reconectando' },
  [ConnectionQuality.UNKNOWN]:   { bars: 0, color: '#6b7280', label: '' },
};

const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({ quality, className = '' }) => {
  if (quality === undefined || quality === ConnectionQuality.UNKNOWN) return null;

  const config = qualityConfig[quality] ?? qualityConfig[ConnectionQuality.UNKNOWN];
  const isLost = quality === ConnectionQuality.LOST;

  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        {[0, 1, 2, 3].map((i) => {
          const h = 3 + i * 2.5;
          const active = i < config.bars;
          return (
            <rect
              key={i}
              x={i * 4}
              y={12 - h}
              width="3"
              height={h}
              rx="0.8"
              fill={active ? config.color : 'rgba(255,255,255,0.25)'}
            />
          );
        })}
      </svg>
      {isLost && (
        <span className="text-[10px] font-semibold text-red-400 animate-pulse">
          Reconectando
        </span>
      )}
    </div>
  );
};

export default ConnectionQualityIndicator;
