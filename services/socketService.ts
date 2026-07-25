// ═══════════════════════════════════════════════════════════════════════
// Socket.IO Service — Conexão única com JWT auth
// Usado APENAS para eventos de entrada/saída de transmissão (join_stream)
// Todo o resto (chat, presente, etc) vai via LiveKit WebSocket
// ═══════════════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;
let connected = false;

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

/** Conecta ao Socket.IO e retorna uma Promise que resolve quando conectar */
export function connectSocket(): Promise<Socket | null> {
  return new Promise((resolve) => {
    if (socket?.connected) {
      resolve(socket);
      return;
    }
    if (socket) {
      // Já existe mas não conectou ainda — aguardar
      const check = setInterval(() => {
        if (socket?.connected) {
          clearInterval(check);
          resolve(socket);
        }
      }, 100);
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
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        connected = true;
        console.log('[SocketIO] Conectado');
        resolve(socket);
      });

      socket.on('disconnect', () => {
        connected = false;
        console.log('[SocketIO] Desconectado');
      });

      socket.on('connect_error', (err) => {
        console.warn('[SocketIO] Erro de conexão:', err.message);
      });

      // Timeout: se não conectar em 5s, resolve com null
      setTimeout(() => {
        if (!connected) {
          resolve(null);
        }
      }, 5000);
    } catch (err) {
      console.error('[SocketIO] Erro ao criar conexão:', err);
      resolve(null);
    }
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
  }
}

/** Emite join_stream e retorna Promise que resolve quando conectado */
export async function emitJoinStream(streamId: string): Promise<boolean> {
  const s = await connectSocket();
  if (!s?.connected || !s.active) {
    console.warn('[SocketIO] Não conectado — não foi possível emitir join_stream');
    return false;
  }
  try {
    s.emit('join_stream', { streamId });
    console.log('[SocketIO] join_stream emitido:', streamId);
    return true;
  } catch (err) {
    console.warn('[SocketIO] Erro ao emitir join_stream:', err);
    return false;
  }
}
