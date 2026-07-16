import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
// Socket.IO removido — status gerenciado via REST API + LiveKit participantes

export interface UserStatus {
    user_id: string;
    is_online: boolean;
    last_seen: string;
    updated_at: string;
}

export const useUserStatus = (userId?: string) => {
    const [status, setStatus] = useState<UserStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Carregar status do usuário
    const loadUserStatus = useCallback(async () => {
        if (!userId) return;
        
        try {
            setIsLoading(true);
            const userStatus = await api.getUserStatus(userId);
            if (userStatus) {
                setStatus(userStatus as unknown as UserStatus);
            }
        } catch (error) {
            console.error('Erro ao carregar status do usuário:', error);
            // Em caso de erro, definir um status padrão offline
            setStatus({
                user_id: userId,
                is_online: false,
                isOnline: false,
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as any);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Marcar usuário como online
    const setUserOnline = useCallback(async () => {
        if (!userId) return;
        
        try {
            await api.setUserOnline(userId);
        } catch (error) {
            console.error('Erro ao marcar usuário como online:', error);
        }
    }, [userId]);

    // Marcar usuário como offline
    const setUserOffline = useCallback(async () => {
        if (!userId) return;
        
        try {
            await api.setUserOffline(userId);
        } catch (error) {
            console.error('Erro ao marcar usuário como offline:', error);
        }
    }, [userId]);

    // Atualizar status (unificado)
    const updateUserStatus = useCallback(async (isOnline: boolean) => {
        if (!userId) return;
        
        try {
            await api.updateUserStatus(userId, isOnline);
        } catch (error) {
            console.error('Erro ao atualizar status do usuário:', error);
        }
    }, [userId]);

    // Carregar status quando o userId mudar
    useEffect(() => {
        if (userId) {
            // Adicionar timeout para garantir que não fique preso em loading
            const loadingTimeout = setTimeout(() => {
                setIsLoading(false);
            }, 3000); // 3 segundos máximo de loading
            
            loadUserStatus();
            
            return () => {
                clearTimeout(loadingTimeout);
            };
        }
    }, [userId, loadUserStatus]);

    // Socket.IO listeners removidos — status gerenciado via REST API

    return {
        status,
        isLoading,
        loadUserStatus,
        setUserOnline,
        setUserOffline,
        updateUserStatus
    };
};

// Hook para gerenciar múltiplos status de usuários
export const useBatchUserStatus = (userIds: string[]) => {
    const [statuses, setStatuses] = useState<Map<string, UserStatus>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    const loadBatchStatus = useCallback(async () => {
        if (userIds.length === 0) return;
        
        try {
            setIsLoading(true);
            const response = await api.getBatchUserStatus(userIds);
            
            const statusMap = new Map<string, UserStatus>();
            response.users.forEach(userStatus => {
                const mappedStatus: any = {
                    user_id: userStatus.user_id,
                    is_online: (userStatus as any).isOnline ?? (userStatus as any).is_online,
                    isOnline: (userStatus as any).isOnline ?? (userStatus as any).is_online,
                    last_seen: userStatus.last_seen,
                    updated_at: userStatus.updated_at
                };
                statusMap.set(userStatus.user_id, mappedStatus);
            });
            
            setStatuses(statusMap);
        } catch (error) {
            console.error('Erro ao carregar status em lote:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userIds]);

    const getUserStatus = useCallback((userId: string) => {
        return statuses.get(userId);
    }, [statuses]);

    // Carregar status quando a lista de usuários mudar
    useEffect(() => {
        if (userIds.length > 0) {
            loadBatchStatus();
        }
    }, [userIds, loadBatchStatus]);

    // Socket.IO listeners removidos — use loadBatchStatus() para atualizações

    return {
        statuses,
        isLoading,
        loadBatchStatus,
        getUserStatus
    };
};

// Função utilitária para formatar texto de "última vez visto"
export const formatLastSeen = (lastSeen: string): string => {
    const diffMs = new Date().getTime() - new Date(lastSeen).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Online agora";
    if (diffMinutes < 60) return `Online há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Online há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Online há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
};
