// Front-end utilities - NO database operations
// All data should come from API
import React from 'react';

export const createChatKey = (userId1: string, userId2: string): string => {
    // Create a consistent chat key for UI purposes only
    return [userId1, userId2].sort().join('_');
};

// Avatar frame utilities - data should come from API
export interface AvatarFrame {
    id: string;
    name: string;
    price: number;
    duration: number;
    component?: React.ComponentType<any>; // React component for the frame
}

export interface OwnedFrame {
    frameId: string;
    expirationDate?: string;
}

// These should come from API calls via api.getAvatarFrames()
export const avatarFrames: AvatarFrame[] = [];

// ⏳ REGRA: todo quadro de avatar comprado vale EXATAMENTE 3 dias de uso.
// Dias restantes reais (arredondados para cima) até a data de expiração.
// Retorna 0 se expirado/sem data. Valores > 365 = permanente (dono).
export const getRemainingDays = (expirationDate?: string): number => {
    if (!expirationDate) return 0;
    const exp = new Date(expirationDate);
    if (isNaN(exp.getTime())) return 0;
    const ms = exp.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

// Rótulo curto de validade para a UI: "2 dias", "1 dia", "Permanente" (dono).
export const getRemainingDaysLabel = (expirationDate?: string): string => {
    const days = getRemainingDays(expirationDate);
    if (days <= 0) return '';
    if (days > 365) return 'Permanente';
    return days === 1 ? '1 dia' : `${days} dias`;
};

export const getFrameGlowClass = (activeFrameId?: string | null): string => {
    if (!activeFrameId) return '';
    
    const frameGlowMap: Record<string, string> = {
        'vip': 'glow-vip',
        'premium': 'glow-premium',
        'legendary': 'glow-legendary',
    };
    
    return frameGlowMap[activeFrameId] || 'glow-default';
};
