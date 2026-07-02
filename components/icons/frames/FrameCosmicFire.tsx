import React from 'react';

export const FrameCosmicFire: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="roseGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#Fecdd3" />
        <stop offset="50%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#9f1239" />
      </linearGradient>
      <filter id="sakuraGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .sakura-branch { transform-origin: 50px 50px; animation: sway-branch 6s ease-in-out infinite alternate; }
          .petal-fall { transform-origin: 50px 50px; animation: spin-petals 25s linear infinite; }
          @keyframes sway-branch { 0% { transform: rotate(-5deg); } 100% { transform: rotate(5deg); } }
          @keyframes spin-petals { 100% { transform: rotate(360deg); } }
        `}
      </style>
    </defs>

    <g className="petal-fall">
       <circle cx="50" cy="50" r="44" fill="none" stroke="url(#roseGold)" strokeWidth="1" strokeDasharray="15 30"/>
       <circle cx="50" cy="50" r="40" fill="none" stroke="url(#roseGold)" strokeWidth="1" strokeDasharray="30 15" opacity="0.5"/>
    </g>
    
    <g className="sakura-branch">
      {/* Woven Ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="#fecdd3" strokeWidth="2" filter="url(#sakuraGlow)" />
      
      {/* Sakura Flowers */}
      {[10, 80, 160, 250, 310].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 50 50) translate(50, 8) scale(1.${i%3})`} filter="url(#sakuraGlow)">
          <path d="M0,0 C-4,-4 -6,-10 0,-12 C6,-10 4,-4 0,0" fill="#fbcfe8" />
          <path d="M0,0 C4,4 10,6 12,0 C10,-6 4,-4 0,0" fill="#f9a8d4" />
          <path d="M0,0 C4,-4 10,-6 12,0 C10,6 4,4 0,0" fill="#f472b6" transform="scale(-1, 1)"/>
          <circle cx="0" cy="-4" r="1.5" fill="#fde047" />
        </g>
      ))}
      
      {/* Drifting Petals */}
      <path d="M70,20 Q75,15 80,22 Q75,25 70,20 Z" fill="#fbcfe8" filter="url(#sakuraGlow)" transform="rotate(20 75 20)"/>
      <path d="M20,80 Q15,75 10,82 Q15,85 20,80 Z" fill="#f9a8d4" filter="url(#sakuraGlow)" transform="rotate(40 15 80)"/>
    </g>
  </svg>
);
