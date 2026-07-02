import React from 'react';

export const FrameRoseGarden: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4D9BFF" />
        <stop offset="50%" stopColor="#9C6BFF" />
        <stop offset="100%" stopColor="#FF4DDE" />
      </linearGradient>
      <filter id="neonGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .neon-pulse { animation: neon-throb 1.5s ease-in-out infinite alternate; }
          .corner-spin { transform-origin: 50% 50%; animation: corner-blink 2s infinite linear; }
          @keyframes neon-throb { 0% { opacity: 0.8; filter: drop-shadow(0 0 2px #4D9BFF); } 100% { opacity: 1; filter: drop-shadow(0 0 8px #FF4DDE); } }
          @keyframes corner-blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        `}
      </style>
    </defs>
    
    <g className="neon-pulse">
      {/* Outer rounded box */}
      <rect x="4" y="4" width="92" height="92" rx="16" fill="none" stroke="url(#neonGradient)" strokeWidth="3" filter="url(#neonGlow)"/>
      {/* Inner precise lines */}
      <rect x="12" y="12" width="76" height="76" rx="10" fill="none" stroke="#4D9BFF" strokeWidth="1" strokeDasharray="15 10"/>
      <rect x="16" y="16" width="68" height="68" rx="8" fill="none" stroke="#9C6BFF" strokeWidth="1" strokeDasharray="20 5"/>
    </g>

    {/* Sci-fi tech corners */}
    <g className="corner-spin text-[#FF4DDE]" filter="url(#neonGlow)">
      <path d="M 4 20 L 4 16 C 4 9 9 4 16 4 L 20 4" fill="none" stroke="currentColor" strokeWidth="5"/>
      <path d="M 80 4 L 84 4 C 91 4 96 9 96 16 L 96 20" fill="none" stroke="#4D9BFF" strokeWidth="5"/>
      <path d="M 96 80 L 96 84 C 96 91 91 96 84 96 L 80 96" fill="none" stroke="currentColor" strokeWidth="5"/>
      <path d="M 20 96 L 16 96 C 9 96 4 91 4 84 L 4 80" fill="none" stroke="#4D9BFF" strokeWidth="5"/>
    </g>
  </svg>
);
