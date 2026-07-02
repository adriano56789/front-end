import React from 'react';

export const FrameMysticalWings: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D4AF37" />
        <stop offset="25%" stopColor="#8B4513" />
        <stop offset="50%" stopColor="#CD7F32" />
        <stop offset="75%" stopColor="#8B4513" />
        <stop offset="100%" stopColor="#B87333" />
      </linearGradient>
      <filter id="gearShadow">
        <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.8"/>
      </filter>
      <style>
        {`
          .gear-spin { transform-origin: 50px 50px; animation: spin-gear 12s linear infinite; }
          .gear-reverse { transform-origin: 50px 50px; animation: spin-gear 18s linear infinite reverse; }
          @keyframes spin-gear { 100% { transform: rotate(360deg); } }
        `}
      </style>
    </defs>
    
    <g className="gear-reverse">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#5C4033" strokeWidth="2" strokeDasharray="6 3"/>
    </g>

    <g className="gear-spin">
      {/* Gear Teeth */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <rect key={i} x="44" y="2" width="12" height="12" fill="url(#bronzeGrad)" transform={`rotate(${angle} 50 50)`} filter="url(#gearShadow)" rx="2"/>
      ))}
      
      {/* Gear Body */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#bronzeGrad)" strokeWidth="8" filter="url(#gearShadow)"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#FDE047" strokeWidth="1" opacity="0.4"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FDE047" strokeWidth="1" opacity="0.4"/>
      
      {/* Screws/Rivets */}
      {[15, 75, 135, 195, 255, 315].map((angle, i) => (
        <circle key={`rivet-${i}`} cx="50" cy="10" r="2" fill="#78350F" transform={`rotate(${angle} 50 50)`} />
      ))}
    </g>
  </svg>
);
