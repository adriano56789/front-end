import React from 'react';
import { User } from '../../types';
import * as FrameIcons from '../icons/frames';

interface AvatarWithFrameProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFrame?: boolean;
  onClick?: () => void;
}

// Mapeamento dos frames para seus componentes
const frameComponentMap: Record<string, React.ComponentType<any>> = {
  'FrameBlueCrystal': FrameIcons.FrameBlueCrystal,
  'FrameRoseGarden': FrameIcons.FrameRoseGarden,
  'FrameCopperPearls': FrameIcons.FrameCopperPearls,
  'FrameOrnateMagenta': FrameIcons.FrameOrnateMagenta,
  'FrameNeonFeathers': FrameIcons.FrameNeonFeathers,
  'FrameBaroqueElegance': FrameIcons.FrameBaroqueElegance,
  'FrameMysticalWings': FrameIcons.FrameMysticalWings,
  'FrameCosmicFire': FrameIcons.FrameCosmicFire,
  'FrameCelestialCrown': FrameIcons.FrameCelestialCrown,
};

// Função para verificar se o frame ainda é válido
const isFrameValid = (user: User): boolean => {
  if (!user) return false;
  
  // Se o usuário for adriano ou contiver "adriano" no nome/id,
  // permitimos que a espetacular moldura de dragão fique ativa e equipada por padrão!
  const key = (user.name || user.id || '').toLowerCase();
  if (key.includes('adriano')) {
    if (!user.activeFrameId) {
      user.activeFrameId = 'FrameNeonFeathers';
    }
    return true;
  }
  
  if (!user.activeFrameId) return false;
  
  const ownedFrames = (user as any).ownedFrames || [];
  const activeFrame = ownedFrames.find((f: any) => f.frameId === user.activeFrameId);
  
  if (!activeFrame) return false;
  
  const expirationDate = new Date(activeFrame.expirationDate);
  const now = new Date();
  return expirationDate > now;
};

// Fallback SVG local (evita via.placeholder que causa ERR_NAME_NOT_RESOLVED)
const AVATAR_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="#4B5563"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="48">?</text></svg>');

const avatarSrc = (avatarUrl: string | undefined, _name: string): string => {
  if (!avatarUrl || avatarUrl.trim() === '') return AVATAR_PLACEHOLDER_SVG;
  return avatarUrl;
};

// Função para obter o componente do frame
const getFrameComponent = (frameId: string | null): React.ComponentType<any> | null => {
  if (!frameId) return null;
  return frameComponentMap[frameId] || null;
};

// Tamanhos predefinidos
const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24'
};

const sizePixels = {
  sm: 48,
  md: 64,
  lg: 80,
  xl: 96
};

const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  showFrame = true,
  onClick 
}) => {
  if (!user) {
    const sizePx = sizePixels[size] || 64;
    return (
      <div 
        className={`relative inline-block rounded-full flex-shrink-0 ${className}`}
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          aspectRatio: '1/1',
          backgroundColor: '#374151'
        }}
      />
    );
  }

  const hasValidFrame = showFrame && isFrameValid(user);
  const FrameComponent = getFrameComponent(user.activeFrameId);

  const avatarSize = sizeClasses[size];
  const sizePx = sizePixels[size];

  return (
    <div 
      className={`relative inline-block rounded-full flex-shrink-0 ${avatarSize} ${className}`}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        aspectRatio: '1/1',
        overflow: 'visible'
      }}
    >
      {/* Frame - perfeitamente centralizado */}
      {hasValidFrame && FrameComponent && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-auto z-10`} onClick={onClick}>
          <FrameComponent 
            className="w-full h-full pointer-events-none" 
            style={{ 
              transform: 'scale(1.4)',
              transformOrigin: 'center'
            }}
          />
        </div>
      )}
      
      {/* Avatar */}
      <div 
        className="perfect-avatar-wrapper cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200 z-0 relative p-0 m-0"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'block',
          backgroundColor: '#111111',
          aspectRatio: '1/1',
          transform: hasValidFrame ? 'scale(1.3)' : 'none',
          transformOrigin: 'center'
        }}
        onClick={onClick}
      >
        <img
          key={user.avatarUrl || 'empty'}
          src={avatarSrc(user.avatarUrl || (user as any).avatar, user.name)}
          alt={user.name || 'User'}
          className="perfect-avatar-image"
          style={{
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = AVATAR_PLACEHOLDER_SVG;
          }}
        />
      </div>
    </div>
  );
};

export default AvatarWithFrame;
