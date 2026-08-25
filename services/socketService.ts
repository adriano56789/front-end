// ═══════════════════════════════════════════════════════════════════════
// Socket.IO Service — Conexão única com JWT auth
//
// Usado para eventos em tempo real da live:
//   - live_gift_received / gift_received → presentes em tempo real
//   - diamonds_updated / earnings_updated / live_coins_updated → saldos
//
// O backend (server.js → socket.js) expõe o Socket.IO no MESMO servidor
// Express (porta 3000, rota /socket.io). O nginx e o proxy do Vite
// encaminham /socket.io/ com Upgrade para websocket.
// ═══════════════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;
let connected = false;
let listeners = new Set<() => void>(); // callbacks de mudança de estado
let chatBridgeRegistered = false; // ponte do chat privado registrada (idempotente)

// Usa a mesma URL base da API (mesmo servidor Express do backend)
const API_BASE = import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE;

export function getSocket(): Socket | null {
    return socket;
}

export function isSocketConnected(): boolean {
    return connected;
}

/** Conecta ao Socket.IO (idempotente) e resolve quando conectado ou falha */
export function connectSocket(): Promise<Socket | null> {
    return new Promise((resolve) => {
        if (socket?.connected) {
            resolve(socket);
            return;
        }
        if (socket) {
            // Já existe mas não conectou ainda — aguardar (com timeout)
            const check = setInterval(() => {
                if (socket?.connected) {
                    clearInterval(check);
                    resolve(socket);
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                if (!socket?.connected) resolve(null); // timeout: não travar await
            }, 8000);
            return;
        }

        const token = getAuthToken();
        if (!token) {
            console.warn('[SocketIO] Sem token JWT — não foi possível conectar');
            resolve(null);
            return;
        }

        try {
            socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 10000,
                randomizationFactor: 0.5,
                timeout: 10000,
            });

            socket.on('connect', () => {
                connected = true;
                console.log('[SocketIO] Conectado');
                initPrivateChatSocket();
                listeners.forEach(cb => cb());
                resolve(socket);
            });

            socket.on('disconnect', (reason) => {
                connected = false;
                console.log('[SocketIO] Desconectado:', reason);
            });

            socket.on('connect_error', (err) => {
                console.warn('[SocketIO] Erro de conexão:', err.message);
            });
        } catch (err) {
            console.error('[SocketIO] Erro ao criar conexão:', err);
            resolve(null);
        }

        // Timeout de segurança: se não conectar em 8s, resolve null para não pendurar
        setTimeout(() => {
            if (!socket?.connected) resolve(null);
        }, 8000);
    });
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
        connected = false;
    }
}

/**
 * Entra na sala da stream (user_joined no backend → socket.join(streamId)).
 * Necessário para receber broadcasts como live_gift_received da sala.
 */
export async function emitUserJoined(payload: {
    streamId: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    userLevel?: number;
}): Promise<boolean> {
    const s = await connectSocket();
    if (!s?.connected) {
        console.warn('[SocketIO] Não conectado — não foi possível emitir user_joined');
        return false;
    }
    try {
        s.emit('user_joined', {
            streamId: payload.streamId,
            userId: payload.userId,
            userName: payload.userName || payload.userId,
            userAvatar: payload.userAvatar || '',
            userLevel: payload.userLevel || 1,
        });
        return true;
    } catch (err) {
        console.warn('[SocketIO] Erro ao emitir user_joined:', err);
        return false;
    }
}

/**
 * join_stream — dispara o handler handleJoinStream do backend (server.js),
 * que: (1) marca o usuário como online na stream no banco (isOnline + currentStreamId),
 * (2) faz socket.join(streamId), (3) emite os eventos JSON de entrada da sala:
 *   user_joined_stream / user:join / user_joined_chat / online_users_updated
 *
 * Esse é o ÚNICO caminho que gera eventos de entrada visíveis para o host,
 * pois o caminho protobuf (user_joined → binary_data) está quebrado no backend
 * (encodeUserJoinedEvent produz 0 bytes — verificado com teste de round-trip).
 */
export async function emitJoinStream(payload: {
    streamId: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
}): Promise<boolean> {
    const s = await connectSocket();
    if (!s?.connected) {
        console.warn('[SocketIO] Não conectado — não foi possível emitir join_stream');
        return false;
    }
    try {
        s.emit('join_stream', {
            streamId: payload.streamId,
            userId: payload.userId,
            userName: payload.userName || payload.userId,
            userAvatar: payload.userAvatar || '',
        });
        return true;
    } catch (err) {
        console.warn('[SocketIO] Erro ao emitir join_stream:', err);
        return false;
    }
}

/**
 * 💬 Ponte do CHAT PRIVADO (exclusivamente WebSocket):
 * recebe o evento `newChatMessage` que o backend emite para a sala
 * `user_{id}` (chatRoutes.ts) e o repassa como CustomEvent no `window`.
 * App.tsx e ChatScreen.tsx já escutam esse evento para atualizar o chat e
 * mostrar o banner de notificação em tempo real.
 *
 * O usuário é inserido automaticamente na sala `user_{id}` ao conectar
 * (backend/src/socket.ts), então basta o socket estar conectado enquanto o
 * app está aberto/logado. Idempotente e re-registrado a cada reconnect.
 */
export function initPrivateChatSocket(): void {
    const s = getSocket();
    if (!s) return;
    if (!chatBridgeRegistered) {
        chatBridgeRegistered = true;
        s.on('newChatMessage', (data: any) => {
            window.dispatchEvent(new CustomEvent('newChatMessage', { detail: data }));
        });
        // ⌨️ Indicador "digitando..." (estilo WhatsApp)
        s.on('chat_typing', (data: any) => {
            window.dispatchEvent(new CustomEvent('chat_typing', { detail: data }));
        });
        // 🔵 Confirmação de leitura em tempo real (✓✓ azul)
        s.on('messages_read', (data: any) => {
            window.dispatchEvent(new CustomEvent('messages_read', { detail: data }));
        });
        // 🗑️ Mensagem apagada pelo outro lado
        s.on('message_deleted', (data: any) => {
            window.dispatchEvent(new CustomEvent('message_deleted', { detail: data }));
        });
        console.log('[SocketIO] Ponte do chat privado conectada (newChatMessage | chat_typing | messages_read → window)');
    }
}

/** ⌨️ Emite para o backend que o usuário está digitando (debounce é feito no caller) */
export function emitChatTyping(to: string, typing: boolean): void {
    const s = getSocket();
    if (!s?.connected) return;
    s.emit('chat_typing', { to, typing });
}

/** Escuta um evento do socket; retorna função para cancelar */
export function onSocketEvent<T = any>(event: string, handler: (data: T) => void): () => void {
    const s = getSocket();
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
}


