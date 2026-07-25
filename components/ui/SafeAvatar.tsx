import React, { useState, useCallback, useMemo } from 'react';

interface SafeAvatarProps {
  user?: { avatarUrl?: string; avatar?: string; name?: string; id?: string } | null;
  src?: string;
  name?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const SIZE_MAP: Record<string, number> = { sm: 40, md: 56, lg: 80, xl: 96 };

const COLORS = [
  '#6D28D9', '#2563EB', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#0284C7', '#0D9488', '#16A34A',
  '#CA8A04', '#E11D48', '#9333EA', '#2DD4BF', '#F59E0B',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarUrl(user?: { avatarUrl?: string; avatar?: string } | null, src?: string): string | undefined {
  if (src && src.trim()) return src;
  if (user?.avatarUrl && user.avatarUrl.trim()) return user.avatarUrl;
  if (user?.avatar && (user as any).avatar.trim()) return (user as any).avatar;
  return undefined;
}

const SafeAvatar: React.FC<SafeAvatarProps> = ({ user, src, name, size = 'md', className = '', onClick, style }) => {
  const [hasError, setHasError] = useState(false);

  const url = getAvatarUrl(user, src);
  const displayName = name || user?.name || user?.id || '?';
  const sizePx = typeof size === 'number' ? size : SIZE_MAP[size] || 56;
  const bgColor = useMemo(() => getColor(displayName), [displayName]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const showImage = url && !hasError;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: showImage ? 'transparent' : bgColor,
        ...style,
      }}
      onClick={onClick}
    >
      {showImage ? (
        <img
          key={url}
          src={url}
          alt={displayName}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
        />
      ) : (
        <span
          style={{
            color: '#fff',
            fontSize: sizePx * 0.38,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default SafeAvatar;
