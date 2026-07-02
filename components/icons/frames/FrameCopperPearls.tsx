import React from 'react';

export const FrameCopperPearls: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="emeraldGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#A16207" />
        <stop offset="100%" stopColor="#FDE047" />
      </linearGradient>
      <filter id="emeraldGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .emerald-pulse { animation: emerald-shine 2s ease-in-out infinite alternate; }
          .gold-frame { animation: rotate-gold 6s linear infinite; transform-origin: center; transform-box: fill-box;}
          @keyframes emerald-shine { 0% { filter: brightness(1) drop-shadow(0 0 4px #059669); } 100% { filter: brightness(1.3) drop-shadow(0 0 10px #10B981); } }
        `}
      </style>
    </defs>
    
    <g>
      {/* Ornate Gold Frame Border */}
      <rect x="6" y="6" width="88" height="88" rx="8" fill="none" stroke="url(#emeraldGold)" strokeWidth="4"/>
      <rect x="12" y="12" width="76" height="76" rx="4" fill="none" stroke="url(#emeraldGold)" strokeWidth="1" strokeDasharray="4 2"/>
      <rect x="18" y="18" width="64" height="64" rx="2" fill="none" stroke="url(#emeraldGold)" strokeWidth="2"/>
    </g>

    {/* Emerald Gems on the sides & corners */}
    {[
      {x: 6, y: 6}, {x: 82, y: 6}, {x: 6, y: 82}, {x: 82, y: 82},
      {x: 44, y: 2}, {x: 44, y: 86}, {x: 2, y: 44}, {x: 86, y: 44}
    ].map((pos, i) => (
      <g key={i} transform={`translate(${pos.x}, ${pos.y})`} className="emerald-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
        <path d="M6,0 L12,6 L6,12 L0,6 Z" fill="#10B981" stroke="#047857" strokeWidth="1" filter="url(#emeraldGlow)"/>
        <path d="M6,2 L10,6 L6,10 L2,6 Z" fill="#6EE7B7" />
      </g>
    ))}
  </svg>
);
