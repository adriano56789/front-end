import React from 'react';

export const FrameOrnateMagenta: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="galaxyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="30%" stopColor="#3B82F6" />
        <stop offset="70%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#111827" />
      </linearGradient>
      <filter id="galaxyGlow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .galaxy-spin { transform-origin: 50px 50px; animation: spin-galaxy 15s linear infinite; }
          .star-flicker { animation: flicker-star 2s infinite alternate; }
          @keyframes spin-galaxy { 100% { transform: rotate(360deg); } }
          @keyframes flicker-star { 0% { opacity: 0.2; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1.5); } }
        `}
      </style>
    </defs>
    
    <g className="galaxy-spin">
      {/* Deep Space Ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#galaxyGrad)" strokeWidth="8" filter="url(#galaxyGlow)"/>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.5"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="#A78BFA" strokeWidth="1" opacity="0.5"/>
      
      {/* Stars on the ring */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 50 50) translate(50, 6)`} className="star-flicker" style={{ animationDelay: `${i * 0.3}s` }}>
          <circle cx="0" cy="0" r="2" fill="#DBEAFE" filter="url(#galaxyGlow)"/>
          <path d="M-4,0 L4,0 M0,-4 L0,4" stroke="#FFFFFF" strokeWidth="0.5"/>
        </g>
      ))}
      <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" filter="url(#galaxyGlow)" className="star-flicker"/>
      <circle cx="80" cy="30" r="1" fill="#FFFFFF" filter="url(#galaxyGlow)" className="star-flicker" style={{animationDelay: "1s"}}/>
      <circle cx="30" cy="80" r="1.5" fill="#FFFFFF" filter="url(#galaxyGlow)" className="star-flicker" style={{animationDelay: "0.5s"}}/>
    </g>
  </svg>
);
