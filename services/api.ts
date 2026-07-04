

/// <reference types="vite/client" />



import { User, Gift, Streamer, Message, RankedUser, Country, Conversation, NotificationSettings, BeautySettings, BeautyEffectsData, PurchaseRecord, EligibleUser, FeedPhoto, Obra, GoogleAccount, LiveSessionState, StreamHistoryEntry, Visitor, LevelInfo, Order, DiamondPackage, LiveNotification, Invitation, PixPaymentResponse, CreditCardPaymentRequest, SRSResponse, SRSPlayResponse, SRSStreamInfo } from '../types';
import axios, { Method } from 'axios';
import { env } from '../src/config/environment';
import { safeLog, safeError } from '../utils/maskSensitiveData';
import { getAuthToken as getDbAuthToken } from '../components/utils/TokenStorage';



const getApiBaseUrl = () => {return env.apiBaseUrl;
};



const API_BASE_URL = getApiBaseUrl();

const getOryxApiBaseUrl = () => {
    // REMOVIDO: Oryx não é mais utilizado
    return null;
};



// Gerenciamento de token - APENAS MEMÓRIA (SEM LOCALSTORAGE)
// Removido armazenamento local - tudo via API

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
    authToken = token;
};

export const getAuthToken = (): string | null => {
    return authToken;
};

export const removeAuthToken = () => {
    authToken = null;
};



// Função para mascarar dados sensíveis em logs
const maskSensitiveData = (data: any): any => {
    if (!data) return data;

    // Se for string, verificar se contém dados sensíveis
    if (typeof data === 'string') {
        // Mascarar email - ocultar completamente o nome do usuário
        if (data.includes('@')) {
            const emailMatch = data.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
            if (emailMatch) {
                const domain = emailMatch[2];
                return `*********@${domain}`;
            }
        }

        // Mascarar userId (padrão: sequência de números)
        const userIdMatch = data.match(/\b(\d{8,})\b/);
        if (userIdMatch) {
            const userId = userIdMatch[1];
            return data.replace(userId, userId.substring(0, 2) + '*'.repeat(userId.length - 2));
        }

        return data;
    }

    // Se for objeto, mascarar campos específicos
    if (typeof data === 'object') {
        const masked = { ...data };

        // Mascarar campos sensíveis
        if (masked.userId) {
            masked.userId = typeof masked.userId === 'string' && masked.userId.length > 2
                ? masked.userId.substring(0, 2) + '*'.repeat(masked.userId.length - 2)
                : '***';
        }

        if (masked.email) {
            const emailMatch = masked.email.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
            if (emailMatch) {
                const domain = emailMatch[2];
                masked.email = `*********@${domain}`;
            }
        }

        if (masked.pixKey || masked.pix_key) {
            const key = masked.pixKey || masked.pix_key;
            if (typeof key === 'string' && key.includes('@')) {
                const emailMatch = key.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
                if (emailMatch) {
                    const domain = emailMatch[2];
                    const maskedKey = `*********@${domain}`;
                    if (masked.pixKey) masked.pixKey = maskedKey;
                    if (masked.pix_key) masked.pix_key = maskedKey;
                }
            } else {
                // Para chaves que não são email (CPF, telefone, etc)
                const maskedKey = typeof key === 'string' && key.length > 4
                    ? key.substring(0, 2) + '*'.repeat(key.length - 4) + key.substring(key.length - 2)
                    : '***';
                if (masked.pixKey) masked.pixKey = maskedKey;
                if (masked.pix_key) masked.pix_key = maskedKey;
            }
        }

        return masked;
    }

    return data;
};

const getCurrentUserId = (): string | null => {
    try {
        // Tentar do currentUser global (estado do React)
        if (typeof window !== 'undefined' && (window as any).currentUser?.id) {
            // Log mascarado
            const userId = (window as any).currentUser.id;
            console.log('[API] User ID from window.currentUser:', maskSensitiveData(userId));
            return userId;
        }

        console.error('[API] getCurrentUserId: No user ID available');
        return null;
    } catch (e) {
        console.error('[API] Error in getCurrentUserId:', e);
        return null;
    }
};



const inFlightRequests = new Map<string, Promise<any>>();



/**
 * Core API Caller
 * Performs real HTTP requests to the backend.
 */
interface CallApiOptions {
    customHeaders?: Record<string, string>;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
    returnFullResponse?: boolean;
    signal?: AbortSignal;
}

const callApi = async <T = any>(method: Method, url: string, data?: any, customHeaders?: Record<string, string>): Promise<T> => {
    return callApiWithOptions<T>(method, url, data, { customHeaders });
};

const callApiWithOptions = async <T = any>(
    method: Method,
    url: string,
    data?: any,
    options?: CallApiOptions
): Promise<T> => {
    try {
        // Se a URL já for absoluta (ex: SRS externo), usa diretamente; senão, prefixa com API_BASE_URL
        const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
        const fullUrl = isAbsolute ? url : `${API_BASE_URL}${url}`;

        // Usar token do banco de dados
        const token = await getDbAuthToken();

        const config: any = {
            method,
            url: fullUrl,
            responseType: options?.responseType || 'json',
            signal: options?.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(options?.customHeaders || {}),
                ...(token && { Authorization: `Bearer ${token}` })
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
            config.data = data;
        }

        const response = await axios(config);

        // Check for HTML response (only for JSON responses)
        if ((options?.responseType || 'json') === 'json') {
            const contentType = response.headers['content-type'];
            if (contentType && typeof contentType === 'string' && contentType.includes('text/html')) {
                throw new Error('API returned HTML instead of JSON');
            }

            if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
                throw new Error('API returned HTML-like string instead of JSON');
            }
        }

        // Tratar status 304 Not Modified - dados não modificados
        if (response.status === 304) {
            return response.data as T;
        }

        if (options?.returnFullResponse) {
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                data: response.data,
                headers: response.headers,
            } as T;
        }

        return response.data as T;
    } catch (error: any) {
        // Ignorar erros específicos de extensões
        if (error.message &&
            (error.message.includes('useCache') ||
                error.message.includes('Receiving end does not exist') ||
                error.message.includes('content.js'))) {
            console.warn('Ignorando erro de extensão:', error.message);
            throw error;
        }

        // Tratamento detalhado para erro 400 (Bad Request)
        if (error.response?.status === 400) {
            console.error('🚨 [API-ERROR] Erro 400 - Bad Request');
            console.error('🔍 [API-ERROR] URL:', error.config?.url);
            console.error('🔍 [API-ERROR] Method:', error.config?.method?.toUpperCase());
            console.error('🔍 [API-ERROR] Data sent:', maskSensitiveData(error.config?.data));
            console.error('🔍 [API-ERROR] Response:', error.response?.data);

            // Extrair mensagens específicas de validação
            const responseData = error.response?.data;
            if (responseData) {
                // Se for erro de validação do Zod
                if (responseData.errors && Array.isArray(responseData.errors)) {
                    console.error('❌ [VALIDATION-ERROR] Erros de validação:');
                    responseData.errors.forEach((err: any, index: number) => {
                        console.error(`  ${index + 1}. Campo: ${err.field}, Erro: ${err.message}`);
                    });

                    // Criar mensagem amigável para o usuário
                    const firstError = responseData.errors[0];
                    const userFriendlyMessage = `Erro no campo "${firstError.field}": ${firstError.message}`;

                    throw new Error(userFriendlyMessage);
                }

                // Se for mensagem simples de erro
                if (responseData.error) {
                    console.error('❌ [VALIDATION-ERROR] Erro simples:', responseData.error);

                    // Se tiver informações adicionais
                    if (responseData.currentStream) {
                        console.error('❌ [VALIDATION-ERROR] Stream ativa existente:', responseData.currentStream);
                        throw new Error(`${responseData.error}. Stream atual: ${responseData.currentStream.id} - ${responseData.currentStream.name}`);
                    }

                    throw new Error(responseData.error);
                }

                // Se tiver mensagem
                if (responseData.message) {
                    console.error('❌ [VALIDATION-ERROR] Mensagem:', responseData.message);
                    throw new Error(responseData.message);
                }
            }

            // Mensagem genérica se não conseguir extrair detalhes
            throw new Error('Dados inválidos na requisição. Verifique os campos obrigatórios.');
        }

        // Tratamento padrão de outros erros
        if (error.response?.status === 401) {
            // Token expirado ou inválido
            removeAuthToken();
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        throw error;
    }
};

// Exportar callApi para uso em outros serviços
export { callApi, getCurrentUserId };



export const api = {

    // --- Auth & Accounts ---

    login: (credentials: any) => callApi<{ success: boolean, token: string, user: User }>('POST', '/api/auth/login', credentials),

    register: (userData: any) => callApi<{ success: boolean, token: string, user: User }>('POST', '/api/auth/register', userData),

    logout: (userId?: string) => callApi<{ success: boolean }>('POST', '/api/auth/logout', { id: userId }),

    getGoogleAccounts: () => callApi<GoogleAccount[]>('GET', '/api/accounts/google'),

    getConnectedGoogleAccounts: () => callApi<GoogleAccount[]>('GET', '/api/accounts/google/connected'),

    disconnectGoogleAccount: (email: string) => callApi<{ success: boolean }>('POST', '/api/accounts/google/disconnect', { email }),



    // --- Users ---

    getCurrentUser: () => callApi<User>('GET', '/api/users/me'),

    getAllUsers: () => callApi<User[]>('GET', '/api/users'),

    getUser: (userId: string) => callApi<User>('GET', `/api/users/${userId}`),

    deleteAccount: (userId: string) => callApi<{ success: boolean }>('DELETE', `/api/users/${userId}`),

    updateProfile: (userId: string, updates: Partial<User>) => callApi<{ success: boolean, user: User }>('PATCH', `/api/users/${userId}`, updates),

    followUser: (followerId: string, followedId: string, streamId?: string) => callApi<{ success: boolean, updatedFollower: User, updatedFollowed: User, isFriendship?: boolean }>('POST', `/api/users/${followedId}/toggle-follow`, { streamId }),

    blockUser: (userIdToBlock: string) => callApi<{ success: boolean }>('POST', `/api/users/${userIdToBlock}/block`),

    unblockUser: (userIdToUnblock: string) => callApi<{ success: boolean }>('DELETE', `/api/users/${userIdToUnblock}/unblock`),

    reportUser: (userIdToReport: string, reason: string) => callApi<{ success: boolean }>('POST', `/api/users/${userIdToReport}/report`, { reason }),

    getFansUsers: (userId: string) => callApi<User[]>('GET', `/api/users/${userId}/fans`),

    getFollowingUsers: (userId: string) => callApi<User[]>('GET', `/api/users/${userId}/following`),

    getFriends: (userId: string) => callApi<User[]>('GET', `/api/users/${userId}/friends`),

    getConversations: (userId: string) => callApi<Conversation[]>('GET', `/api/users/${userId}/messages`),

    getBlockedUsers: () => callApi<User[]>('GET', '/api/users/me/blocklist'),

    getUserPhotos: (userId: string) => callApi<{success: boolean; data: FeedPhoto[]}>('GET', `/api/users/${userId}/photos/gallery`),

    reorderPhotos: (userId: string, photoOrders: Array<{ obraId: string; order: number }>) => callApi<{ success: boolean; message: string }>('PUT', `/api/users/${userId}/photos/reorder`, { photoOrders }),

    deletePhoto: (userId: string, obraId: string) => callApi<{ success: boolean; message: string }>('DELETE', `/api/users/${userId}/photos/${obraId}`),

    getLikedPhotos: (userId: string) => callApi<FeedPhoto[]>('GET', `/api/users/${userId}/liked-photos`),

    getLevelInfo: (userId: string) => callApi<LevelInfo>('GET', `/api/users/${userId}/level-info`),

    recordVisit: (profileId: string, visitorId: string) => callApi<void>('POST', `/api/users/${profileId}/visit`, { userId: visitorId }),



    // --- Sistema de Nível (NOVO) ---

    level: {

        // Obter informações completas do nível

        getLevelInfo: (userId: string) => callApi<{

            level: number;

            currentExp: number;

            expForNextLevel: number;

            totalExp: number;

            progress: number;

            expNeeded: number;

            lastGain: { amount: number; reason: string; timestamp: string };

            levelHistory: Array<{ level: number; reachedAt: string; expRequired: number }>;

            rank: string;

        }>('GET', `/api/level/${userId}`),



        // Adicionar EXP ao usuário

        addExp: (userId: string, amount: number, reason?: string) => callApi<{

            leveledUp: boolean;

            newLevels: number[];

            currentLevel: number;

            currentExp: number;

            expForNextLevel: number;

            totalExp: number;

            progress: number;

        }>('POST', `/api/level/${userId}/add-exp`, { amount, reason }),



        // Adicionar EXP múltiplas vezes (batch)

        addMultipleExp: (userId: string, expGains: Array<{ amount: number; reason: string }>) => callApi<{

            leveledUp: boolean;

            newLevels: number[];

            currentLevel: number;

            currentExp: number;

            expForNextLevel: number;

            totalExp: number;

            progress: number;

            totalGained: number;

            levelUps: number[];

        }>('POST', `/api/level/${userId}/multi-add`, { expGains }),



        // Obter ranking de usuários

        getLeaderboard: (limit?: number, offset?: number) => callApi<Array<{

            rank: number;

            user: User;

            level: number;

            totalExp: number;

            currentExp: number;

            expForNextLevel: number;

            progress: number;

        }>>('GET', `/api/level/leaderboard?limit=${limit || 50}&offset=${offset || 0}`),



        // Calcular EXP necessária para um nível específico

        calculateExpForLevel: (level: number) => callApi<{

            level: number;

            expForLevel: number;

            totalExpNeeded: number;

            difficulty: string;

        }>('GET', `/api/level/calculate/${level}`),



        // Adicionar EXP por ações específicas

        addExpForAction: async (userId: string, action: 'login' | 'message' | 'gift' | 'follow' | 'stream_start' | 'stream_end', metadata?: any) => {

            const expValues = {

                login: { amount: 5, reason: 'Login diário' },

                message: { amount: 2, reason: 'Mensagem enviada' },

                gift: { amount: 10, reason: 'Presente enviado' },

                follow: { amount: 15, reason: 'Seguiu usuário' },

                stream_start: { amount: 25, reason: 'Iniciou transmissão' },

                stream_end: { amount: 50, reason: 'Finalizou transmissão' }

            };



            const expConfig = expValues[action];

            if (!expConfig) return null;



            return api.level.addExp(userId, expConfig.amount, expConfig.reason);

        }

    },



    // --- Profile Management (Correct Routes) ---

    profile: {

        getImages: (userId?: string) => callApi<FeedPhoto[]>('GET', userId ? `/api/users/${userId}/photos` : '/api/users/me/photos'),

        deleteImage: (id: string, userId?: string) => callApi<{ success: boolean }>('DELETE', userId ? `/api/users/${userId}/photos/${id}` : `/api/users/me/photos/${id}`),

        setMainImage: (id: string, userId?: string) => callApi<{ success: boolean }>('PUT', userId ? `/api/users/${userId}/photos/${id}/set-main` : `/api/users/me/photos/${id}/set-main`),

        


        getNickname: () => callApi<{ value: string }>('GET', '/api/perfil/apelido'),

        updateNickname: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/apelido', { value }),



        getGender: () => callApi<{ value: User['gender'] }>('GET', '/api/perfil/genero'),

        updateGender: (value: User['gender']) => callApi<{ success: boolean }>('PUT', '/api/perfil/genero', { value }),



        getBirthday: () => callApi<{ value: string }>('GET', '/api/perfil/aniversario'),

        updateBirthday: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/aniversario', { value }),



        getBio: () => callApi<{ value: string }>('GET', '/api/perfil/apresentacao'),

        updateBio: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/apresentacao', { value }),



        getResidence: () => callApi<{ value: string }>('GET', '/api/perfil/residencia'),

        updateResidence: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/residencia', { value }),



        getEmotionalStatus: () => callApi<{ value: string }>('GET', '/api/perfil/estado-emocional'),

        updateEmotionalStatus: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/estado-emocional', { value }),



        getTags: () => callApi<{ value: string }>('GET', '/api/perfil/tags'),

        updateTags: (value: string) => callApi<{ success: boolean }>('PUT', '/api/perfil/tags', { value }),

    },



    // --- Wallet & Earnings ---

    getEarnings: (userId: string) => callApi<{

        withdrawal_method: { method: string; details: any } | null;

        available_diamonds: number;

        brl_value: number;

        conversion_rate: string;

        diamonds_purchased: number;

        earnings_withdrawn: number;

        enviados: number;

        receptores: number;

        lastSeen: string;

        createdAt: string;

    }>('GET', `/api/wallet/earnings/get/${userId}`),

    // Dados do usuário sempre frescos da API (sem cache)
    // Consolidado: getUser já retorna dados frescos da API

    // REMOVIDO: getFreshUserData - usar getUser diretamente
    // getUser já retorna dados frescos da API

    calculateWithdrawal: (amount: number, userId: string) => {
        // ⚠️ REMOVIDO: Logs duplicados que causam confusão
        // safeLog('[API] calculateWithdrawal called with amount: ' + amount);
        // safeLog('[API] Calculating withdrawal for amount: ' + amount + ' diamonds');
        return callApi<{ diamonds: number; gross_brl: number; platform_fee_brl: number; net_brl: number; breakdown: { conversion: string; fee: string; final: string; } }>('POST', '/api/wallet/earnings/calculate', { amount, userId });
    },

    confirmWithdrawal: (userId: string, amount: number) => {

        return callApi<{ success: boolean, amount: number, newEarnings: number, brl_amount: number, platform_fee: number, message: string }>('POST', `/api/wallet/withdraw/${userId}`, { amount });

    },

    setWithdrawalMethod: (method: string, details: any) => {
        const userId = getCurrentUserId();

        if (!userId) {
            safeLog('[API] setWithdrawalMethod: No userId available');
            return Promise.reject(new Error('Usuário não encontrado. Faça login novamente.'));
        }

        // Log mascarado - userId e details sensíveis ocultos
        safeLog('[API] setWithdrawalMethod:', { userId, method, details });

        return callApi<{ success: boolean, user: User }>('POST', `/api/wallet/earnings/method/set/${userId}`, { method, details });
    },

    // ... (rest of the code remains the same)

    // --- Gift Counters ---

    validateGiftCounters: (userId: string) => callApi<{ userId: any; current: any; real: any; differences: any; needsUpdate: boolean; transactions: any; details: any; }>('GET', `/api/wallet/gifts/validate/${userId}`),

    syncGiftCounters: (userId: string) => callApi<{ success: boolean; userId: string; updated: any; previous: any; changes: any; transactions: any; }>('POST', `/api/wallet/gifts/sync/${userId}`),

    syncAllGiftCounters: () => callApi<{ success: boolean; totalUsers: number; updated: number; totalDifferences: any; }>('POST', '/api/wallet/gifts/sync-all'),



    // --- Checkout & Payments (New) ---

    getDiamondPackages: () => {

        return callApi<DiamondPackage[]>('GET', '/api/checkout/pack');

    },

    createOrder: (userId: string, packageId: string, amount: number, diamonds: number) => {

        return callApi<Order>('POST', '/api/checkout/order', { userId, packageId, amount, diamonds });

    },

    processPixPayment: (orderId: string) => {

        return callApi<PixPaymentResponse>('POST', '/api/checkout/pix', { orderId });

    },

    processCreditCardPayment: (data: CreditCardPaymentRequest) => {

        return callApi<{ success: boolean, message: string, orderId: string }>('POST', '/api/checkout/credit-card', data);

    },

    confirmPurchase: (orderId: string) => {

        return callApi<{ success: boolean, user: User, order: Order }>('POST', '/api/purchase/confirm', { orderId });

    },

    checkPixPaymentStatus: (orderId: string) => {

        return callApi<{ success: boolean, status: string, order: Order, payment?: any }>('GET', `/api/payments/pix/status/${orderId}`);

    },



    // --- Admin Control ---

    saveAdminWithdrawalMethod: (email: string) => {

        return callApi<{ success: boolean, user: User }>('POST', '/api/admin/withdrawal-method', { email });

    },

    requestAdminWithdrawal: () => {

        return callApi<{ success: boolean, message: string }>('POST', '/api/admin/withdraw');

    },

    getAdminWithdrawalHistory: (status: string) => {

        return callApi<PurchaseRecord[]>('GET', `/api/admin/history?status=${status}`);

    },



    // --- Metadata & Catalog ---

    getRankingForPeriod: async (period: string, userId?: string): Promise<RankedUser[]> => {

        try {

            if (!period) {

                return [];

            }



            // Forçar cache-busting adicionando timestamp

            const timestamp = Date.now();

            const url = userId

                ? `/api/ranking/${period}?userId=${userId}&_t=${timestamp}`

                : `/api/ranking/${period}?_t=${timestamp}`;

            const response = await callApi<RankedUser[]>(`GET`, url);



            // Garantir que sempre retorne um array válido

            if (!response) {

                return [];

            }



            if (!Array.isArray(response)) {

                return [];

            }



            // Validar e filtrar usuários

            const validUsers = response.filter(user => {

                const isValid = user &&

                    typeof user === 'object' &&

                    user.id &&

                    user.name &&

                    typeof user.contribution === 'number' &&

                    user.contribution >= 0;



                return isValid;

            });



            return validUsers;



        } catch (error) {

            return []; // Sempre retornar array vazio em caso de erro

        }

    },

    getGifts: async () => {
        const response = await callApi<any>('GET', '/api/gifts');
        // Handle both direct array and wrapped format
        return Array.isArray(response) ? response : (response?.data || []);
    },

    getCategories: () => callApi<{ key: string; label: string }[]>('GET', '/api/categories'),
    getGiftsByCategory: (category: string) => callApi<Gift[]>('GET', `/api/gifts/category/${category}`),

    getReceivedGifts: (userId: string) => callApi<Gift[]>('GET', `/api/gifts/received/${userId}`),

    getRegions: () => callApi<Country[]>('GET', '/api/regions'),

    getReminders: () => callApi<Streamer[]>('GET', '/api/reminders'),

    getStreamHistory: () => callApi<StreamHistoryEntry[]>('GET', '/api/history/streams'),

    addStreamToHistory: (entry: StreamHistoryEntry) => callApi<{ success: boolean }>('POST', '/api/history/streams', entry),



    // --- Settings & Preferences ---

    getNotificationSettings: (userId: string) => callApi<NotificationSettings>('GET', `/api/notifications/settings/${userId}`),

    updateNotificationSettings: (userId: string, settings: Partial<NotificationSettings>) => callApi<{ settings: NotificationSettings }>('POST', `/api/notifications/settings/${userId}`, settings),

    getGiftNotificationSettings: (userId: string) => callApi<{ settings: Record<string, boolean> }>('GET', `/api/settings/gift-notifications/${userId}`),

    updateGiftNotificationSettings: (userId: string, settings: Record<string, boolean>) => callApi<{ success: boolean }>('POST', `/api/settings/gift-notifications/${userId}`, { settings }),

    getBeautySettings: (userId: string) => callApi<BeautySettings>('GET', `/api/settings/beauty/${userId}`),

    updateBeautySettings: (userId: string, settings: BeautySettings) => callApi<{ success: boolean }>('POST', `/api/settings/beauty/${userId}`, { settings }),

    getPrivateStreamSettings: (userId: string) => callApi<{ settings: User['privateStreamSettings'] }>('GET', `/api/settings/private-stream/${userId}`),

    updatePrivateStreamSettings: (userId: string, settings: Partial<User['privateStreamSettings']>) => callApi<{ success: boolean, user: User }>('POST', `/api/settings/private-stream/${userId}`, { settings }),

    togglePip: (userId: string, enabled: boolean) => callApi<{ success: boolean, user: User }>('POST', `/api/settings/pip/toggle/${userId}`, { enabled }),

    updateActivityPreference: (userId: string, show: boolean) => callApi<{ success: boolean, user: User }>('POST', `/api/users/${userId}/privacy/activity`, { show }),

    updateLocationVisibility: (userId: string, show: boolean) => callApi<{ success: boolean, user: User }>('POST', `/api/users/${userId}/privacy/location`, { show }),



    // --- Location ---

    updateLocation: (latitude: number, longitude: number, city?: string, state?: string, country?: string, locationName?: string) => callApi<{ success: boolean, user: User }>('POST', '/api/location/update', { latitude, longitude, city, state, country, locationName }),

    getNearbyUsers: (latitude: number, longitude: number) => callApi<User[]>('GET', `/api/location/nearby?latitude=${latitude}&longitude=${longitude}`),

    getUserLocation: () => callApi<{ success: boolean; location: any; permission: string; showLocation: boolean }>('GET', '/api/location/user'),



    // --- Permissions ---

    // Camera Permission API
    camera: {
        request: (purpose: string = 'live_streaming') => callApi<{
            success: boolean;
            permission: {
                type: string;
                purpose: string;
                status: string;
                requestId: string;
                message: string;
            };
        }>('POST', '/api/permissions/camera/request', { purpose }),

        grant: (requestId: string, permanent: boolean = false) => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: string;
                permanent: boolean;
                grantedAt: string;
                message: string;
            };
        }>('POST', '/api/permissions/camera/grant', { requestId, permanent }),

        deny: (requestId: string) => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: string;
                deniedAt: string;
                message: string;
            };
        }>('POST', '/api/permissions/camera/deny', { requestId }),

        status: () => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: 'pending' | 'granted' | 'denied';
                permanent: boolean;
                grantedAt?: string;
                deniedAt?: string;
                message: string;
            };
        }>('GET', '/api/permissions/camera/status')
    },

    // Audio/Microphone Permission API
    audio: {
        request: (purpose: string = 'live_streaming') => callApi<{
            success: boolean;
            permission: {
                type: string;
                purpose: string;
                status: string;
                requestId: string;
                message: string;
            };
        }>('POST', '/api/permissions/audio/request', { purpose }),

        grant: (requestId: string, permanent: boolean = false) => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: string;
                permanent: boolean;
                grantedAt: string;
                message: string;
            };
        }>('POST', '/api/permissions/audio/grant', { requestId, permanent }),

        deny: (requestId: string) => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: string;
                deniedAt: string;
                message: string;
            };
        }>('POST', '/api/permissions/audio/deny', { requestId }),

        status: () => callApi<{
            success: boolean;
            permission: {
                type: string;
                status: 'pending' | 'granted' | 'denied';
                permanent: boolean;
                grantedAt?: string;
                deniedAt?: string;
                message: string;
            };
        }>('GET', '/api/permissions/audio/status')
    },

    // Legacy permission methods (keep for compatibility)
    getCameraPermission: (userId: string) => callApi<{ status: 'granted' | 'denied' | 'prompt' }>('GET', `/api/permissions/camera/${userId}`),

    updateCameraPermission: (userId: string, status: string) => callApi<void>('POST', `/api/permissions/camera/${userId}`, { status }),

    getMicrophonePermission: (userId: string) => callApi<{ status: 'granted' | 'denied' | 'prompt' }>('GET', `/api/permissions/microphone/${userId}`),

    updateMicrophonePermission: (userId: string, status: string) => callApi<void>('POST', `/api/permissions/microphone/${userId}`, { status }),

    getLocationPermission: (userId: string) => callApi<{ status: 'granted' | 'denied' | 'prompt' }>('GET', `/api/users/${userId}/location-permission`),

    updateLocationPermission: (userId: string, status: string) => callApi<{ success: boolean, user: User }>('POST', `/api/users/${userId}/location-permission`, { status }),

    getChatPermissionStatus: (userId: string) => callApi<{ permission: 'all' | 'followers' | 'none' }>('GET', `/api/chat-permission/status/${userId}`),

    updateChatPermission: (userId: string, permission: string) => callApi<{ success: boolean, user: User }>('POST', `/api/chat-permission/update/${userId}`, { permission }),



    // --- Stream Likes ---

    likeStream: async (streamId: string, userId: string) => {
        try {
            const response = await callApi<{ success: boolean; totalLikes: number; liked: boolean }>('POST', `/api/streams/${streamId}/like`, { userId });
            return response;
        } catch (error) {
            console.error('Error liking stream:', error);
            throw error;
        }
    },

    unlikeStream: async (streamId: string, userId: string) => {
        try {
            const response = await callApi<{ success: boolean; totalLikes: number; liked: boolean }>('DELETE', `/api/streams/${streamId}/like`, { userId });
            return response;
        } catch (error) {
            console.error('Error unliking stream:', error);
            throw error;
        }
    },

    getStreamLikes: async (streamId: string) => {
        try {
            const response = await callApi<{ streamId: string; totalLikes: number; isLive: boolean }>('GET', `/api/streams/${streamId}/likes`);
            return response;
        } catch (error: any) {
            console.error('Error getting stream likes:', error);
            // Propagar erro 404 para que o frontend possa tratar
            throw error;
        }
    },


    // --- Live Stream & Online Users ---

    // Iniciar live - Backend controla status e gera streamKey
    startLive: async (title: string, description?: string, category?: string) => {
        return callApi<any>('POST', '/api/live/start', { title, description, category });
    },

    // REMOVIDO: oryxStartLive - Oryx não é mais utilizado

    // Encerrar live - Backend controla status
    endLive: () => callApi<{ success: boolean }>('POST', '/api/live/end'),

    joinStream: async (streamId: string, userId: string) => {
        try {
            const response = await callApi<{ success: boolean }>('POST', `/api/streams/${streamId}/join`);
            return response?.success || false;
        } catch (error: any) {
            console.error('Error joining stream:', error);
            // Propagar erro 404 para que o frontend possa tratar
            throw error;
        }
    },



    leaveStream: async (streamId: string, userId: string) => {

        try {

            const response = await callApi<{ success: boolean }>('POST', `/api/streams/${streamId}/leave`, { userId });

            return response?.success || false;

        } catch (error) {

            return false;

        }

    },



    getLiveStreamers: async (category: string, country?: string, userId?: string) => {
        const params = new URLSearchParams({ category });
        if (country && country !== 'ICON_GLOBE') params.set('country', country);
        if (userId) params.set('userId', userId);
        const response = await callApi<{ code: number, msg: string, data: { streams: Streamer[] } }>('GET', `/api/streams?${params}`);
        return response?.data?.streams || [];
    },

    createStream: async (userId: string, options: any) => {
        const payload = {
            name: options.name || options.title || `Live de ${userId}`,
            message: options.message || options.description || '',
            category: options.category || 'popular',
            hostId: userId,
            streamId: options.streamId || options.streamKey
        };
        const response = await callApi<{ success: boolean, stream: Streamer }>('POST', `/api/streams`, payload);
        return response?.stream;
    },

    publishStream: async (streamId: string) => {
        const response = await callApi<{ success: boolean, stream: Streamer }>('POST', `/api/streams/${streamId}/publish`);
        return response?.stream;
    },

    updateStream: async (streamId: string, updates: Partial<Streamer>) => {
        const response = await callApi<any>('PUT', `/api/streams/${streamId}`, updates);
        // Handle both direct object and wrapped responses
        return response?.data || response;
    },

    patchStream: (streamId: string, updates: Partial<Streamer>) => callApi<{ success: boolean, stream: Streamer }>('PATCH', `/api/streams/${streamId}`, updates),

    saveStream: (streamId: string, updates: any) => callApi<{ success: boolean, stream: Streamer }>('POST', `/api/streams/${streamId}/save`, updates),

    saveStreamUrls: (streamId: string, urls: { rtmpIngestUrl?: string, srtIngestUrl?: string, playbackUrl?: string, streamKey?: string }) => callApi<{ success: boolean, stream: Streamer, message: string }>('POST', `/api/streams/${streamId}/urls`, urls),

    uploadStreamCover: (streamId: string, coverData: any) => callApi<{ success: boolean, stream: Streamer }>('POST', `/api/streams/${streamId}/cover`, coverData),

    uploadStreamCoverFile: async (streamId: string, file: File): Promise<{ success: boolean; stream: Streamer; coverUrl: string }> => {
        const formData = new FormData();
        formData.append('cover', file);
        const response = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/api/upload/cover/${streamId}`,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getStreamManual: () => callApi<any[]>('GET', '/api/streams/manual'),

    getBeautyEffects: () => callApi<BeautyEffectsData>('GET', '/api/interactions/effects/beauty'),

    endLiveSession: async (streamId: string, sessionData: LiveSessionState) => {
        const response = await callApi<any>('POST', `/api/streams/${streamId}/end-session`, { session: sessionData });
        return response?.success ? response : { success: true, ...response };
    },

    endStream: async (streamId: string) => {
        const response = await callApi<any>('POST', `/api/streams/${streamId}/end`);
        return response?.success ? response : { success: true, ...response };
    },

    removeLiveCard: (streamId: string, userId: string) => callApi<{ success: boolean }>('DELETE', `/api/cards/${streamId}?userId=${userId}`),

    sendGift: async (fromUserId: string, toUserId: string, streamId: string, giftName: string, amount: number) => {
        if (!fromUserId || !toUserId || !streamId || !giftName || !amount) {
            return { success: false, error: 'Parâmetros inválidos para envio de presente.' };
        }
        const response = await callApi<{ success: boolean; error?: string; updatedSender?: any; updatedReceiver?: any }>('POST', `/api/streams/${streamId}/gift`, { fromUserId, toUserId, giftName, amount });
        return response;
    },

    updateSimStatus: (isOnline: boolean) => callApi<{ success: boolean, user: User }>('POST', '/api/sim/status', { isOnline }),

    // --- BuzzCast Style APIs (Carregamento Progressivo) ---

    // sourceDataNew - Configurações iniciais do usuário e do app
    getSourceData: async () => {
        const response = await callApi<any>('GET', '/api/live/source-data');
        return response?.sourceData;
    },

    // --- SRS WebRTC (substituição ao Oryx) ---
    // --- PK & Interaction ---

    getPKConfig: () => callApi<{ duration: number }>('GET', '/api/pk/config'),

    updatePKConfig: (duration: number) => callApi<{ success: boolean, config: any }>('POST', '/api/pk/config', { duration }),

    startPKBattle: (userId: string, streamId: string, opponentId: string) => callApi<{ success: boolean }>('POST', `/api/pk/start`, { userId, streamId, opponentId }),

    endPKBattle: (userId: string, streamId: string) => callApi<{ success: boolean }>('POST', `/api/pk/end`, { userId, streamId }),

    sendPKHeart: (roomId: string, team: 'A' | 'B') => callApi<{ success: boolean }>('POST', '/api/pk/heart', { roomId, team }),

    getPendingPKInvites: (userId: string) => callApi<{ success: boolean, invites: any[] }>('GET', `/api/pk/invites/pending/${userId}`),

    respondToPKInvite: (inviteId: string, status: 'accepted' | 'declined') => callApi<{ success: boolean, invite: any }>('POST', `/api/pk/invites/${inviteId}/respond`, { status }),


    getGiftSendersForStream: (streamId: string) => callApi<any>('GET', `/api/interactions/presents/live/${streamId}`),

    sendPrivateInviteToGifter: (streamId: string, gifterId: string) => callApi<void>('POST', `/api/interactions/streams/${streamId}/private-invite`, { userId: gifterId }),

    inviteUserToPrivateStream: (streamId: string, userId: string) => callApi<{ success: boolean }>('POST', `/api/interactions/streams/${streamId}/private-invite`, { userId }),

    checkPrivateStreamAccess: (streamId: string, userId: string) => callApi<{ canJoin: boolean }>('GET', `/api/streams/${streamId}/access-check?userId=${userId}`),

    inviteFriendForCoHost: (streamId: string, inviteeId: string) => callApi<{ success: boolean, message?: string, error?: string }>('POST', '/api/friends/invite', { streamId, inviteeId }),

    sendStreamInteraction: (streamId: string, type: string, data: any) => callApi<{ success: boolean }>('POST', `/api/streams/${streamId}/interactions`, { type, ...data }),



    // --- Stream Controls ---

    toggleStreamSound: (streamId: string) => callApi<{ success?: boolean }>('POST', `/api/streams/${streamId}/toggle-sound`),



    // --- Private Room Invitations ---

    sendInvitation: (roomId: string, userId: string) => callApi<{ success: boolean }>('POST', '/api/invitations/send', { roomId, userId }),

    getReceivedInvitations: () => callApi<Invitation[]>('GET', '/api/invitations/received'),

    getRoomDetails: (roomId: string) => callApi<Streamer>('GET', `/api/rooms/${roomId}`),

    getPrivateRooms: (userId?: string) => callApi<Streamer[]>('GET', `/api/rooms?category=private&userId=${userId || getCurrentUserId()}`),

    getStreamMessages: (streamId: string) => callApi<Message[]>('GET', `/api/streams/${streamId}/messages`),



    // --- Feed & Photos ---

    getPhotoFeed: (userId?: string) => callApi<FeedPhoto[]>('GET', `/api/interactions/feed/photos${userId ? `?userId=${userId}` : ''}`),

    likePhoto: (photoId: string, userId?: string, photoUrl?: string) => callApi<{ success: boolean; likes: number; isLiked: boolean; }>('POST', `/api/photos/${photoId}/like`, { userId: userId || getCurrentUserId(), photoUrl }),

    uploadChatPhoto: (userId: string, base64Image: string) => callApi<{ success: boolean; url: string; photo: { id: string; url: string; } }>('POST', `/api/interactions/photos/upload/${userId}`, { image: base64Image }),

    // NOVO: Upload de imagem para chat usando FormData
    uploadChatImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        const token = getAuthToken(); // Removido await - agora é síncrono
        
        return axios.post(`${API_BASE_URL}/api/upload/chat`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }).then(response => response.data);
    },



    // Upload de avatar (arquivo) - retorna URL persistida, evita bloqueio de Base64

    uploadAvatar: async (userId: string, file: File): Promise<{ success: boolean; avatarUrl: string }> => {
        // Validar userId
        if (!userId || userId === 'undefined') {
            throw new Error('User ID is required for avatar upload');
        }

        if (!file) {
            throw new Error('File is required for avatar upload');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        // Usar API_BASE_URL para manter consistência
        const response = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/api/upload/avatar/${userId}`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },



    // --- Search ---

    searchUsers: (query: string, limit?: number) => callApi<{ success: boolean; users: User[]; count: number }>('GET', `/api/search/users?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`),



    // --- Chat & Messages ---

    getChatMessages: (userId: string, currentUserId?: string) => {
        try {
            const resolvedUserId = currentUserId || getCurrentUserId();
            return callApi<{ success: boolean, messages: Message[], total: number }>('GET', `/api/messages/chats/${userId}/messages?currentUserId=${resolvedUserId}`).then(res => res ? res.messages : []);
        } catch (error) {
            console.error('[API] getChatMessages error:', error);
            return [];
        }
    },

    sendChatMessage: (from: string, to: string, text?: string, imageUrl?: string, tempId?: string): Promise<{ success: boolean; message: Message }> => callApi<{ success: boolean; message: Message }>('POST', '/api/chats/send', { from, to, text, imageUrl, tempId }) as Promise<{ success: boolean; message: Message }>,

    deleteMessage: (messageId: string, userId?: string): Promise<{ success: boolean }> => {
        try {
            const resolvedUserId = userId || getCurrentUserId();
            return callApi<{ success: boolean }>('DELETE', `/api/messages/${messageId}?userId=${resolvedUserId}`);
        } catch (error) {
            console.error('[API] deleteMessage error:', error);
            return Promise.resolve({ success: false });
        }
    },

    markMessagesAsRead: (messageIds: string[], userId: string) => callApi<{ success: boolean }>('PUT', `/api/messages/messages/${messageIds[0]}/read`, { userId }),

    getVisitors: (userId: string) => callApi<Visitor[]>('GET', `/api/interactions/visitors/list/${userId}`),

    clearVisitors: (userId: string) => callApi<{ success: boolean }>('DELETE', `/api/interactions/visitors/clear/${userId}`),

    updateVideoQuality: (streamId: string, quality: string, userId?: string) => {
        try {
            const resolvedUserId = userId || getCurrentUserId();
            return callApi<{ success: boolean, stream: Streamer }>('PUT', `/api/streams/${streamId}/quality`, { quality, userId: resolvedUserId });
        } catch (error) {
            console.error('[API] updateVideoQuality error:', error);
            return { success: false, stream: {} as Streamer };
        }
    },

    toggleMicrophone: (streamId: string) => callApi<{ success?: boolean }>('POST', `/api/streams/${streamId}/toggle-mic`),

    toggleAutoFollow: (streamId: string, isEnabled: boolean) => callApi<void>('POST', `/api/streams/${streamId}/toggle-auto-follow`, { isEnabled }),

    toggleAutoPrivateInvite: (streamId: string, isEnabled: boolean) => callApi<void>('POST', `/api/streams/${streamId}/toggle-auto-invite`, { isEnabled }),

    purchaseFrame: (userId: string, frameId: string) => callApi<{ success: boolean, user: User }>('POST', `/api/effects/purchase-frame/${userId}`, { frameId }),

    setActiveFrame: (userId: string, frameId: string | null) => callApi<{ success: boolean, user: User }>('POST', `/api/users/${userId}/set-active-frame`, { frameId }),

    buyFrame: async (userId: string, frameId: string, price: number, duration: number) => {

        return callApi<{ success: boolean; user: any }>('POST', `/api/users/${userId}/frames/buy`, {

            frameId,

            price,

            duration

        });

    },

    equipFrame: async (userId: string, frameId: string | null) => {

        if (frameId) {

            return callApi<{ success: boolean; user: any }>('POST', `/api/users/${userId}/frames/equip`, {

                frameId

            });

        } else {

            return callApi<{ success: boolean; user: any }>('POST', `/api/users/${userId}/frames/unequip`);

        }

    },

    getUserFrames: async (userId: string) => {

        return callApi<{ ownedFrames: any[]; activeFrameId: string; diamonds: number }>('GET', `/api/users/${userId}/frames`);

    },

    getAvatarFrames: () => callApi<Array<{ id: string, name: string, price: number, duration: number }>>('GET', '/api/interactions/effects/frames'),

    // --- Avatar & Profile APIs ---

    getUserAvatar: (userId: string) => callApi<{ photoUrl: string }>('GET', `/api/users/${userId}/photos/avatar`),

    getUserStream: (userId: string) => callApi<{ streamId: string, isLive: boolean, streamUrl?: string }>('GET', `/api/lives/${userId}/stream`),

    subscribeToVIP: (userId: string) => callApi<{ success: boolean, user: User }>('POST', `/api/vip/subscribe/${userId}`),

    purchaseEffect: (userId: string, gift: Gift) => callApi<{ success: boolean, user: User }>('POST', `/api/effects/purchase/${userId}`, { giftId: gift.name }),

    getAvatarProtectionStatus: (userId: string) => callApi<{ isEnabled: boolean }>('GET', `/api/users/${userId}/avatar-protection`),

    toggleAvatarProtection: (userId: string, isEnabled: boolean) => callApi<{ success: boolean, user: User }>('POST', `/api/users/${userId}/avatar-protection`, { isEnabled }),

    kickUser: (streamId: string, userId: string, kickerId: string) => callApi<void>('POST', `/api/streams/${streamId}/kick`, { userId, kickerId }),

    makeModerator: (streamId: string, userId: string, hostId: string) => callApi<void>('POST', `/api/streams/${streamId}/moderator`, { userId, hostId }),

    endLiveStream: (streamId: string) => callApi<{ success: boolean }>('POST', `/api/lives/${streamId}/end`),



    // --- Manual de Transmissão ---

    getManualTransmissao: () => callApi<{ success: boolean, data: { titulo: string; secoes: Array<{ titulo: string; itens: string[] }> } }>('GET', '/api/manual-transmissao'),



    // --- Live Notifications ---

    startLiveStream: (streamId: string) => callApi<{ success: boolean }>('POST', '/api/lives/start', { streamId }),

    getNotifications: () => callApi<LiveNotification[]>('GET', '/api/notifications'),

    markNotificationRead: (id: string) => callApi<{ success: boolean }>('PATCH', `/api/notifications/${id}/read`),

    getLiveDetails: async (liveId: string) => {
        const response = await callApi<any>('GET', `/api/lives/${liveId}`);
        return response?.stream || response?.data?.stream || response;
    },



    // --- Withdrawal via Pix (cash-out) ---

    withdrawViaPix: (userId: string, amount: number, pixKey: string, pixKeyType: string) => {

        return callApi<any>('POST', '/api/withdrawals/pix', { userId, amount, pixKey, pixKeyType });

    },



    // Get withdrawal status

    getWithdrawalStatus: (transferId: string) => {

        return callApi<any>('GET', `/api/withdrawals/status/${transferId}`);

    },



    // Get withdrawal history

    getWithdrawalHistory: (userId: string, limit?: number, offset?: number) => {

        const params = new URLSearchParams();

        if (limit) params.append('limit', limit.toString());

        if (offset) params.append('offset', offset.toString());

        const url = `/api/withdrawals/history/${userId}${params.toString() ? '?' + params.toString() : ''}`;

        return callApi<any>('GET', url);

    },






    // --- User Status (Online/Offline) ---

    getUserStatus: async (userId: string) => {
        try {
            return await callApi<{ user_id: string; isOnline: boolean; last_seen: string; updated_at: string }>('GET', `/api/users/${userId}/status`);
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return {
                    user_id: userId,
                    isOnline: false,
                    last_seen: new Date(0).toISOString(),
                    updated_at: new Date(0).toISOString()
                };
            }
            throw error;
        }
    },

    setUserOnline: (userId: string) => callApi<{ success: boolean; message: string }>('POST', `/api/users/${userId}/online`),

    setUserOffline: (userId: string) => callApi<{ success: boolean; message: string }>('POST', `/api/users/${userId}/offline`),

    updateUserStatus: (userId: string, isOnline: boolean) => callApi<{ success: boolean; message: string }>('PUT', `/api/users/${userId}/status`, { isOnline: isOnline }),

    getOnlineUsers: (limit = 50, offset = 0) => callApi<{ users: Array<{ user_id: string; last_seen: string; updated_at: string }>; total: number; limit: number; offset: number }>('GET', `/api/online?limit=${limit}&offset=${offset}`),

    getStreamOnlineUsers: async (streamId: string) => {
        try {
            return await callApi<Array<User & { value: number }>>('GET', `/api/streams/${streamId}/online-users`);
        } catch (error: any) {
            console.error('Error getting stream online users:', error);
            // Propagar erro 404 para que o frontend possa tratar
            throw error;
        }
    },

    getBatchUserStatus: (userIds: string[]) => callApi<{ users: Array<{ user_id: string; isOnline: boolean; last_seen: string; updated_at: string }>; total: number }>('POST', `/api/batch-status`, { user_ids: userIds }),



    // --- Transaction Protection (Anti-Blocking Abuse) ---

    checkBlockStatus: (userId: string, targetUserId: string) => callApi<{

        success: boolean;

        canBlock: boolean;

        reason: string;

        restrictions: string[];

        message: string

    }>('GET', `/api/transaction-protection/check-block-status/${userId}/${targetUserId}`),



    registerBlockAttempt: (userId: string, targetUserId: string, reason?: string, success?: boolean) => callApi<{ success: boolean }>('POST', '/api/transaction-protection/register-block-attempt', {

        userId,

        targetUserId,

        reason,

        success

    }),

    // --- Zoom Settings API ---
    getZoomSettings: (userId: string) => callApi<{
        userId: string;
        zoomLevel: number;
        isDefault: boolean;
        updatedAt: string;
    }>('GET', `/api/zoom/user/${userId}`),

    updateZoomSettings: (userId: string, zoomLevel: number) => callApi<{
        success: boolean;
        zoomSettings: {
            userId: string;
            zoomLevel: number;
            isDefault: boolean;
            updatedAt: string;
        };
        message: string;
    }>('PUT', `/api/zoom/user/${userId}`, { zoomLevel }),

    resetZoomSettings: (userId: string) => callApi<{
        success: boolean;
        zoomSettings: {
            userId: string;
            zoomLevel: number;
            isDefault: boolean;
            updatedAt: string;
        };
        message: string;
    }>('POST', `/api/zoom/user/${userId}/reset`),

    // --- CRUD COMPLETO INTEGRADO AO MONGODB ---
    // Operações CRUD genéricas para qualquer coleção MongoDB

    crud: {

        // === CREATE (Criar) ===

        /**
         * Criar um novo documento em qualquer coleção
         * @param collection Nome da coleção MongoDB
         * @param data Dados do documento a ser criado
         * @returns Documento criado com ID gerado
         */
        create: <T = any>(collection: string, data: Partial<T>) => {
            console.log(`[CRUD-CREATE] Criando documento na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T;
                insertedId: string;
                message: string;
            }>('POST', `/api/crud/${collection}`, data);
        },

        /**
         * Criar múltiplos documentos de uma vez
         * @param collection Nome da coleção MongoDB
         * @param documents Array de documentos a serem criados
         * @returns Resultado da operação em lote
         */
        createMany: <T = any>(collection: string, documents: Partial<T>[]) => {
            console.log(`[CRUD-CREATE] Criando ${documents.length} documentos na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T[];
                insertedIds: string[];
                insertedCount: number;
                message: string;
            }>('POST', `/api/crud/${collection}/many`, { documents });
        },

        // === READ (Ler/Buscar) ===

        /**
         * Buscar um documento por ID
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @returns Documento encontrado ou null
         */
        findById: <T = any>(collection: string, id: string) => {
            console.log(`[CRUD-READ] Buscando documento por ID na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T | null;
                message: string;
            }>('GET', `/api/crud/${collection}/${id}`);
        },

        /**
         * Buscar todos os documentos de uma coleção (com paginação)
         * @param collection Nome da coleção MongoDB
         * @param options Opções de busca (paginação, filtros, ordenação)
         * @returns Lista de documentos e metadados
         */
        findAll: <T = any>(collection: string, options?: {
            page?: number;
            limit?: number;
            sort?: Record<string, 1 | -1>;
            filter?: Record<string, any>;
            select?: string[];
        }) => {
            const params = new URLSearchParams();
            if (options?.page) params.append('page', options.page.toString());
            if (options?.limit) params.append('limit', options.limit.toString());
            if (options?.sort) params.append('sort', JSON.stringify(options.sort));
            if (options?.filter) params.append('filter', JSON.stringify(options.filter));
            if (options?.select) params.append('select', JSON.stringify(options.select));

            const url = `/api/crud/${collection}${params.toString() ? '?' + params.toString() : ''}`;
            console.log(`[CRUD-READ] Buscando todos os documentos na coleção: ${collection}`);

            return callApi<{
                success: boolean;
                data: T[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
                message: string;
            }>('GET', url);
        },

        /**
         * Buscar documentos com filtros avançados
         * @param collection Nome da coleção MongoDB
         * @param filter Filtro MongoDB
         * @param options Opções adicionais
         * @returns Documentos que correspondem ao filtro
         */
        find: <T = any>(collection: string, filter: Record<string, any>, options?: {
            limit?: number;
            sort?: Record<string, 1 | -1>;
            select?: string[];
            skip?: number;
        }) => {
            const params = new URLSearchParams();
            params.append('filter', JSON.stringify(filter));
            if (options?.limit) params.append('limit', options.limit.toString());
            if (options?.sort) params.append('sort', JSON.stringify(options.sort));
            if (options?.select) params.append('select', JSON.stringify(options.select));
            if (options?.skip) params.append('skip', options.skip.toString());

            const url = `/api/crud/${collection}/find${params.toString() ? '?' + params.toString() : ''}`;
            console.log(`[CRUD-READ] Buscando com filtro na coleção: ${collection}`);

            return callApi<{
                success: boolean;
                data: T[];
                count: number;
                message: string;
            }>('GET', url);
        },

        /**
         * Contar documentos em uma coleção
         * @param collection Nome da coleção MongoDB
         * @param filter Filtro opcional para contagem
         * @returns Número de documentos
         */
        count: (collection: string, filter?: Record<string, any>) => {
            const params = new URLSearchParams();
            if (filter) params.append('filter', JSON.stringify(filter));

            const url = `/api/crud/${collection}/count${params.toString() ? '?' + params.toString() : ''}`;
            console.log(`[CRUD-READ] Contando documentos na coleção: ${collection}`);

            return callApi<{
                success: boolean;
                count: number;
                message: string;
            }>('GET', url);
        },

        /**
         * Buscar um documento por campo específico
         * @param collection Nome da coleção MongoDB
         * @param field Nome do campo
         * @param value Valor do campo
         * @returns Documento encontrado ou null
         */
        findOne: <T = any>(collection: string, field: string, value: any) => {
            const params = new URLSearchParams();
            params.append('field', field);
            params.append('value', JSON.stringify(value));

            const url = `/api/crud/${collection}/findOne${params.toString() ? '?' + params.toString() : ''}`;
            console.log(`[CRUD-READ] Buscando por campo na coleção: ${collection}`);

            return callApi<{
                success: boolean;
                data: T | null;
                message: string;
            }>('GET', url);
        },

        // === UPDATE (Atualizar) ===

        /**
         * Atualizar um documento por ID
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @param data Dados a serem atualizados
         * @returns Documento atualizado
         */
        updateById: <T = any>(collection: string, id: string, data: Partial<T>) => {
            console.log(`[CRUD-UPDATE] Atualizando documento por ID na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T | null;
                modifiedCount: number;
                message: string;
            }>('PUT', `/api/crud/${collection}/${id}`, data);
        },

        /**
         * Atualizar múltiplos documentos que correspondem a um filtro
         * @param collection Nome da coleção MongoDB
         * @param filter Filtro para selecionar documentos
         * @param data Dados a serem atualizados
         * @returns Resultado da atualização em lote
         */
        updateMany: <T = any>(collection: string, filter: Record<string, any>, data: Partial<T>) => {
            console.log(`[CRUD-UPDATE] Atualizando múltiplos documentos na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                modifiedCount: number;
                matchedCount: number;
                message: string;
            }>('PUT', `/api/crud/${collection}/many`, { filter, update: data });
        },

        /**
         * Atualizar um documento ou criar se não existir (upsert)
         * @param collection Nome da coleção MongoDB
         * @param filter Filtro para encontrar o documento
         * @param data Dados a serem atualizados/inseridos
         * @returns Resultado da operação upsert
         */
        upsert: <T = any>(collection: string, filter: Record<string, any>, data: Partial<T>) => {
            console.log(`[CRUD-UPDATE] Upsert na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T;
                upsertedId?: string;
                modifiedCount: number;
                upsertedCount: number;
                message: string;
            }>('POST', `/api/crud/${collection}/upsert`, { filter, update: data });
        },

        /**
         * Incrementar um campo numérico
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @param field Nome do campo a ser incrementado
         * @param value Valor a ser incrementado (padrão: 1)
         * @returns Documento atualizado
         */
        increment: <T = any>(collection: string, id: string, field: string, value: number = 1) => {
            console.log(`[CRUD-UPDATE] Incrementando campo na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T | null;
                message: string;
            }>('POST', `/api/crud/${collection}/${id}/increment`, { field, value });
        },

        /**
         * Adicionar item a um array
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @param field Nome do campo array
         * @param item Item a ser adicionado
         * @returns Documento atualizado
         */
        pushToArray: <T = any>(collection: string, id: string, field: string, item: any) => {
            console.log(`[CRUD-UPDATE] Adicionando item ao array na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T | null;
                message: string;
            }>('POST', `/api/crud/${collection}/${id}/push`, { field, item });
        },

        /**
         * Remover item de um array
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @param field Nome do campo array
         * @param item Item a ser removido
         * @returns Documento atualizado
         */
        pullFromArray: <T = any>(collection: string, id: string, field: string, item: any) => {
            console.log(`[CRUD-UPDATE] Removendo item do array na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T | null;
                message: string;
            }>('POST', `/api/crud/${collection}/${id}/pull`, { field, item });
        },

        // === DELETE (Excluir) ===

        /**
         * Excluir um documento por ID
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @returns Resultado da exclusão
         */
        deleteById: (collection: string, id: string) => {
            console.log(`[CRUD-DELETE] Excluindo documento por ID na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                deletedCount: number;
                message: string;
            }>('DELETE', `/api/crud/${collection}/${id}`);
        },

        /**
         * Excluir múltiplos documentos que correspondem a um filtro
         * @param collection Nome da coleção MongoDB
         * @param filter Filtro para selecionar documentos
         * @returns Resultado da exclusão em lote
         */
        deleteMany: (collection: string, filter: Record<string, any>) => {
            console.log(`[CRUD-DELETE] Excluindo múltiplos documentos na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                deletedCount: number;
                message: string;
            }>('DELETE', `/api/crud/${collection}/many`, { filter });
        },

        /**
         * Excluir todos os documentos de uma coleção (cuidado!)
         * @param collection Nome da coleção MongoDB
         * @returns Resultado da exclusão completa
         */
        deleteAll: (collection: string) => {
            console.log(`[CRUD-DELETE] Excluindo todos os documentos da coleção: ${collection}`);
            return callApi<{
                success: boolean;
                deletedCount: number;
                message: string;
            }>('DELETE', `/api/crud/${collection}/all`);
        },

        // === OPERAÇÕES ESPECIAIS ===

        /**
         * Buscar com agregação MongoDB (pipeline)
         * @param collection Nome da coleção MongoDB
         * @param pipeline Pipeline de agregação
         * @returns Resultado da agregação
         */
        aggregate: <T = any>(collection: string, pipeline: Record<string, any>[]) => {
            console.log(`[CRUD-AGGREGATE] Executando agregação na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: T[];
                message: string;
            }>('POST', `/api/crud/${collection}/aggregate`, { pipeline });
        },

        /**
         * Buscar distintos valores de um campo
         * @param collection Nome da coleção MongoDB
         * @param field Nome do campo
         * @param filter Filtro opcional
         * @returns Valores distintos
         */
        distinct: (collection: string, field: string, filter?: Record<string, any>) => {
            const params = new URLSearchParams();
            params.append('field', field);
            if (filter) params.append('filter', JSON.stringify(filter));

            const url = `/api/crud/${collection}/distinct${params.toString() ? '?' + params.toString() : ''}`;
            console.log(`[CRUD-DISTINCT] Buscando valores distintos na coleção: ${collection}`);

            return callApi<{
                success: boolean;
                data: any[];
                message: string;
            }>('GET', url);
        },

        /**
         * Verificar se documento existe
         * @param collection Nome da coleção MongoDB
         * @param id ID do documento
         * @returns Boolean indicando existência
         */
        exists: (collection: string, id: string) => {
            console.log(`[CRUD-EXISTS] Verificando existência na coleção: ${collection}`);
            return callApi<{
                success: boolean;
                exists: boolean;
                message: string;
            }>('GET', `/api/crud/${collection}/${id}/exists`);
        },

        /**
         * Buscar estatísticas da coleção
         * @param collection Nome da coleção MongoDB
         * @returns Estatísticas detalhadas
         */
        stats: (collection: string) => {
            console.log(`[CRUD-STATS] Buscando estatísticas da coleção: ${collection}`);
            return callApi<{
                success: boolean;
                data: {
                    count: number;
                    size: number;
                    avgObjSize: number;
                    storageSize: number;
                    indexes: number;
                    indexSizes: Record<string, number>;
                };
                message: string;
            }>('GET', `/api/crud/${collection}/stats`);
        }
    },

    // --- WebRTC Signaling ---

    publishWebRTC: async (streamUrl: string, sdp: string): Promise<{ code: number; sdp: string; sessionId: string }> => {
        const result = await callApi<any>('POST', '/api/rtc/v1/publish', { streamUrl, sdp });
        if (!result.success) throw new Error(`Publish failed: ${result.error}`);
        return result.data;
    },

    playWebRTC: async (streamUrl: string, sdp: string): Promise<{ code: number; sdp: string; sessionId: string }> => {
        const result = await callApi<any>('POST', '/api/rtc/v1/play', { streamUrl, sdp });
        if (!result.success) throw new Error(`Play failed: ${result.error}`);
        return result.data;
    },

    stopWebRTC: async (sessionId: string): Promise<void> => {
        await callApi('DELETE', `/api/rtc/v1/stop/${sessionId}`);
    },

    // --- WHIP/WHEP (comunicação direta com SRS via axios centralizado) ---

    whipPublish: async (endpoint: string, sdp: string): Promise<{ ok: boolean; status: number; sdp: string; location: string | null }> => {
        const result = await callApiWithOptions<{ ok: boolean; status: number; data: string; headers: any }>('POST', endpoint, sdp, {
            customHeaders: { 'Content-Type': 'application/sdp' },
            responseType: 'text',
            returnFullResponse: true,
        });
        return {
            ok: result.ok,
            status: result.status,
            sdp: result.data,
            location: result.headers?.location || null,
        };
    },

    whipStop: async (resourceUrl: string): Promise<void> => {
        await callApiWithOptions('DELETE', resourceUrl, undefined, {
            responseType: 'text',
        });
    },

    whepPlay: async (endpoint: string, sdp: string, signal?: AbortSignal): Promise<{ ok: boolean; status: number; sdp: string; location: string | null; eTag: string | null }> => {
        const result = await callApiWithOptions<{ ok: boolean; status: number; data: string; headers: any }>('POST', endpoint, sdp, {
            customHeaders: { 'Content-Type': 'application/sdp' },
            responseType: 'text',
            returnFullResponse: true,
            signal,
        });
        return {
            ok: result.ok,
            status: result.status,
            sdp: result.data,
            location: result.headers?.location || null,
            eTag: result.headers?.etag || null,
        };
    },

    whepSendIceCandidate: async (iceUrl: string, eTag: string, frag: string): Promise<{ ok: boolean; status: number }> => {
        const result = await callApiWithOptions<{ ok: boolean; status: number; headers: any }>('PATCH', iceUrl, frag, {
            customHeaders: {
                'Content-Type': 'application/trickle-ice-sdpfrag',
                ETag: eTag,
            },
            responseType: 'text',
            returnFullResponse: true,
        });
        return { ok: result.ok, status: result.status };
    },

    sfuCallJoin: (roomId: string) => callApi<{ success: boolean; signalingUrl: string }>('POST', '/api/call-invitation/sfu/join', { roomId }),

    // --- LiveKit APIs ---

    getLiveKitToken: (roomOrIdentity: string, identityOrRoom: string, metadataOrIsPublisher?: string | boolean) => {
      let identity: string;
      let room: string;
      let isPub = false;

      if (typeof metadataOrIsPublisher === 'boolean') {
        isPub = metadataOrIsPublisher;
        room = roomOrIdentity;
        identity = identityOrRoom;
      } else {
        identity = roomOrIdentity;
        room = identityOrRoom;
        if (typeof metadataOrIsPublisher === 'string') {
          isPub = (metadataOrIsPublisher === 'publisher');
        } else {
          isPub = !!(identity && identity.startsWith('streamer_'));
        }
      }

      return callApi<{ success: boolean; token: string; serverUrl: string; livekitUrl: string }>(
        'GET', `/api/lives/${encodeURIComponent(room)}/livekit-token?identity=${encodeURIComponent(identity)}&publisher=${isPub ? 'true' : 'false'}`
      ).then(res => ({
        ...res,
        identity,
        room,
        livekitUrl: res.serverUrl || 'wss://sfu.livego.store',
        serverUrl: res.serverUrl || 'wss://sfu.livego.store'
      }));
    },

    createLiveKitRoom: (name: string, emptyTimeout?: number, maxParticipants?: number) =>
      callApi<{ success: boolean; room: { name: string; emptyTimeout: number; maxParticipants: number; createdAt: string } }>(
        'POST', '/api/livekit/rooms', { name, emptyTimeout, maxParticipants }
      ),

    listLiveKitRooms: () =>
      callApi<{ success: boolean; rooms: Array<{ name: string; emptyTimeout: number; maxParticipants: number; createdAt: string; participantCount: number }>; source: string }>(
        'GET', '/api/livekit/rooms'
      ),

    deleteLiveKitRoom: (roomName: string) =>
      callApi<{ success: boolean; source: string }>('DELETE', `/api/livekit/rooms/${encodeURIComponent(roomName)}`),

    getLiveKitParticipants: (roomName: string) =>
      callApi<{ success: boolean; participants: Array<{ identity: string; name: string; joinedAt: string; trackCount: number }>; source: string }>(
        'GET', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants`
      ),

    joinLiveKitRoom: (roomName: string, identity: string, name?: string, role?: string) =>
      callApi<{ success: boolean; room: { name: string; participantCount: number }; participant: { identity: string; name: string; role: string }; token: string; livekitUrl: string }>(
        'POST', `/api/livekit/rooms/${encodeURIComponent(roomName)}/join`, { identity, name, role }
      ),

    kickLiveKitParticipant: (roomName: string, identity: string) =>
      callApi<{ success: boolean; source: string }>(
        'POST', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/kick`
      ),

    // --- LiveKit namespace (aliases for compat with room.ts) ---

    livekit: {
      getToken: (identity: string, room: string, metadata?: string) =>
        api.getLiveKitToken(identity, room, metadata),

      createRoom: (name: string, emptyTimeout?: number, maxParticipants?: number) =>
        callApi<{ success: boolean; room: { name: string; emptyTimeout: number; maxParticipants: number; createdAt: string } }>(
          'POST', '/api/livekit/rooms', { name, emptyTimeout, maxParticipants }
        ),

      listRooms: () =>
        callApi<{ success: boolean; rooms: Array<{ name: string; emptyTimeout: number; maxParticipants: number; createdAt: string; participantCount: number }>; source: string }>(
          'GET', '/api/livekit/rooms'
        ),

      deleteRoom: (roomName: string) =>
        callApi<{ success: boolean; source: string }>('DELETE', `/api/livekit/rooms/${encodeURIComponent(roomName)}`),

      getParticipants: (roomName: string) =>
        callApi<{ success: boolean; participants: Array<{ identity: string; name: string; joinedAt: string; trackCount: number }>; source: string }>(
          'GET', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants`
        ),

      listParticipants: (roomName: string) =>
        callApi<{ success: boolean; participants: Array<{ identity: string; name: string; joinedAt: string; trackCount: number }>; source: string }>(
          'GET', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants`
        ),

      joinRoom: (roomName: string, identity: string, name?: string, role?: string) =>
        callApi<{ success: boolean; room: { name: string; participantCount: number }; participant: { identity: string; name: string; role: string }; token: string; livekitUrl: string }>(
          'POST', `/api/livekit/rooms/${encodeURIComponent(roomName)}/join`, { identity, name, role }
        ),

      kickParticipant: (roomName: string, identity: string) =>
        callApi<{ success: boolean; source: string }>(
          'POST', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/kick`
        ),

      publishTrack: (roomName: string, identity: string, trackSid: string, source: string, muted: boolean) =>
        callApi<{ success: boolean; track: { sid: string; source: string; muted: boolean } }>(
          'POST', `/api/livekit/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/tracks`, { trackSid, source, muted }
        ),
    },

    rtc: {
      whip: (streamKey: string, sdp: string) => {
        const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
        const url = `/api/rtc/v1/whip/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
        return api.whipPublish(url, sdp);
      },
      whep: (streamKey: string, sdp: string) => {
        const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
        const url = `/api/rtc/v1/whep/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
        return api.whepPlay(url, sdp);
      },
      deleteWhip: (resourceUrl: string) => {
        return api.whipStop(resourceUrl);
      },
      patchTrickleIce: (iceUrl: string, eTag: string, frag: string) => {
        return api.whepSendIceCandidate(iceUrl, eTag, frag);
      }
    },

    getIceServers: () =>
      callApi<{ iceServers: any[] }>('GET', '/api/rtc/ice-servers'),

    getIPLocation: () =>
      callApi<any>('GET', '/api/location/ip-lookup'),

    addDiamonds: (userId: string, amount: number) =>
      callApi<{ success: boolean; diamonds: number }>('POST', '/api/users/add-diamonds', { userId, amount }),

    fetchAssetBlob: (url: string) =>
      callApiWithOptions<Blob>('GET', url, undefined, { responseType: 'blob' }),
    
    validateStreamAccess: (streamId: string, action: 'publish' | 'play') =>
      callApi<{ allowed: boolean; reason?: string }>(
        'POST', '/api/streams/validate-access', { streamId, action }
      ),
    
};





