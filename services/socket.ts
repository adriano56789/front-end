import { io, Socket } from 'socket.io-client';
import { env } from '../src/config/environment';
import { LiveGoParamsParser, ParsedLiveGoParams } from '../src/services/LiveGoParamsParser';
import { getCurrentUserId, api, getAuthToken } from './api';

// URL do WebSocket baseada na configuração automática do ambiente
const WS_URL = env.wsUrl;

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private _connecting: boolean = false;
    private _connectPromise: Promise<void> | null = null;

    async connect() {
        if (this.socket?.connected) return;
        if (this._connecting) {
            return this._connectPromise;
        }

        this._connecting = true;
        this._connectPromise = this._doConnect();
        try {
            await this._connectPromise;
        } finally {
            this._connecting = false;
            this._connectPromise = null;
        }
    }

    private async _doConnect() {
        // Inicializar Protobuf antes de conectar
        // Protobuf init removed
        // Add cache-busting timestamp to avoid browser caching
        const cacheBust = Date.now();
        const wsUrlWithCache = `${WS_URL}?_cb=${cacheBust}`;
        
        const token = getAuthToken();
        this.socket = io(wsUrlWithCache, {
            transports: ['polling', 'websocket'], // Polling first as fallback to prevent WebSocket closed without opened error
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            autoConnect: true,
            // Autenticação JWT - socket rejeitado se token inválido
            auth: { token },
            // Configurações para protocolo binário como Buzzcast
            forceNew: true,
            binaryType: 'arraybuffer', // Receber dados como ArrayBuffer
            maxHttpBufferSize: 1e8, // 100 MB
            upgrade: true,
            rememberUpgrade: true,
            timeout: 20000,
            // Desabilitar compressão para evitar placeholders
            perMessageDeflate: false,
            // Forçar transporte binário puro sem parser customizado
            // Remover parser para usar comportamento nativo do Socket.IO
            forceJSON: false,
            // CORS e headers adicionais
            withCredentials: true,
            extraHeaders: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        } as any);

        this.socket.on('connect', () => {
            console.log('✅ Servidor de sinalização conectado.');
            
            // Enviar evento binfo como Buzzcast
            this.sendBinfo();
            
            // Iniciar heartbeat
            this.startHeartbeat();
        });

        // ─── Eventos de convite (disparam CustomEvent para o app) ───
        this.socket.on('live_invite', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite', { detail: data }));
        });
        this.socket.on('live_invite_response', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite_response', { detail: data }));
        });
        this.socket.on('live_invite_timeout', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite_timeout', { detail: data }));
        });
        this.socket.on('private_stream_invite', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:private_stream_invite', { detail: data }));
        });
        this.socket.on('invite_sent', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:invite_sent', { detail: data }));
        });
        this.socket.on('call_invitation', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:call_invitation', { detail: data }));
        });

        this.socket.on('connect_error', (err) => {
            // Tentar URL alternativa se a principal falhar
            if (WS_URL.includes('https://livego.store')) {
                this.tryAlternativeConnection();
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.stopHeartbeat();
        });
        
        // Eventos como LiveGo - Silenciados
        this.socket.on('binfo_response', (data) => {
        });
        
        this.socket.on('stream_joined', (data) => {
        });
        
        this.socket.on('stream_left', (data) => {
        });
        
        this.socket.on('pong', (data) => {
        });
        
                
        // Eventos processados apenas via transporte binário (binary_data)
        // Removidos eventos JSON redundantes para garantir transporte binário exclusivo

        // Listener para mensagens de chat privado em tempo real
        this.socket.on('newChatMessage', (payload) => {
            window.dispatchEvent(new CustomEvent('newChatMessage', { detail: payload }));
        });

        // Re-attach general dynamic listeners
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(cb => {
                this.socket?.on(event, cb as any);
            });
        });
    }

    private startHeartbeat() {
        this.stopHeartbeat(); // Limpar heartbeat anterior
        
        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.connected) {
                // Enviar heartbeat como binário via Protobuf
                const protobufData = {
                    heartbeat: {
                        base: {
                            type: 'heartbeat',
                            timestamp: Date.now(),
                            stream_id: 'system'
                        },
                        timestamp: Date.now()
                    }
                };

                // Codificar manualmente para binário (simulando Protobuf)
                const jsonString = JSON.stringify(protobufData);
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(jsonString);
                const arrayBuffer = uint8Array.buffer;

                // Enviar como binário real
                this.socket?.emit('binary_data', arrayBuffer);
            }
        }, 30000); // Heartbeat a cada 30 segundos
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private tryAlternativeConnection(urlIndex = 0) {
        if (this.socket?.connected) return;
        
        const alternativeUrls = [
            `${env.apiBaseUrl.replace(':3000', ':3001')}`,
            `https://${env.srs.host}:3001`,
            `http://${env.srs.host}:3001`,
            'https://www.livego.store:3001',
            'http://www.livego.store:3001'
        ];
        
        if (urlIndex >= alternativeUrls.length) return;
        
        // Desconectar socket anterior se existir
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }
        
        const url = alternativeUrls[urlIndex];
        const alternativeSocket = io(url, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 2,
            reconnectionDelay: 1000,
            timeout: 10000,
            forceNew: true,
            withCredentials: true
        });
        
        alternativeSocket.on('connect', () => {
            this.socket = alternativeSocket;
            this.setupSocketEvents();
        });
        
        alternativeSocket.on('connect_error', () => {
            alternativeSocket.removeAllListeners();
            alternativeSocket.disconnect();
            // Tentar próxima URL
            this.tryAlternativeConnection(urlIndex + 1);
        });
    }
    
    private setupSocketEvents() {
        if (!this.socket) return;
        
        this.socket.on('connect', () => {
            this.sendBinfo();
            this.startHeartbeat();
        });
        
        this.socket.on('connect_error', (err) => {
        });
        
        this.socket.on('disconnect', (reason) => {
            this.stopHeartbeat();
        });

        // ─── Eventos de convite ───
        this.socket.on('live_invite', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite', { detail: data }));
        });
        this.socket.on('live_invite_response', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite_response', { detail: data }));
        });
        this.socket.on('live_invite_timeout', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:live_invite_timeout', { detail: data }));
        });
        this.socket.on('private_stream_invite', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:private_stream_invite', { detail: data }));
        });
        this.socket.on('invite_sent', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:invite_sent', { detail: data }));
        });
        this.socket.on('call_invitation', (data: any) => {
            window.dispatchEvent(new CustomEvent('livego:call_invitation', { detail: data }));
        });
    }

    disconnect() {
        this.stopHeartbeat(); // Parar heartbeat
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinRoom(roomId: string) {
        if (!this.socket?.connected) this.connect();
        
        const currentUserId = getCurrentUserId();
        
        // Enviar join_room_direct para sincronizar o Socket.IO room na sessão do Express
        this.socket?.emit('join_room_direct', { roomId, userId: currentUserId });
        
        // Enviar join_stream como binário via Protobuf para compatibilidade reversa
        this.sendProtobufJoinStream(roomId, currentUserId);
    }

    leaveRoom(roomId: string) {
        if (!this.socket?.connected) return;
        
        // Chamar leave_room_direct para sair imediatamente do Socket.IO room
        this.socket?.emit('leave_room_direct', { roomId });
        
        // Enviar leave_room como binário via Protobuf
        const protobufData = {
            leave_room: {
                base: {
                    type: 'leave_room',
                    timestamp: Date.now(),
                    stream_id: roomId
                },
                room_id: roomId,
                timestamp: Date.now()
            }
        };

        // Codificar manualmente para binário (simulando Protobuf)
        const jsonString = JSON.stringify(protobufData);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(jsonString);
        const arrayBuffer = uint8Array.buffer;

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer, roomId);
    }

    updateUserStatus(userId: string, isOnline: boolean) {
        this.getSocket()?.emit('user_status_update', { userId, isOnline });
    }

    // --- Eventos para atualização de perfil
    onUserProfileUpdated(callback: (data: any) => void) {
        this.on('user_profile_updated', callback);
    }

    // --- Eventos para atualização de token
    onUserTokenUpdated(callback: (data: any) => void) {
        this.on('user_token_updated', callback);
    }

    // --- Eventos para atualização de avatar protection
    onUserAvatarProtectionUpdated(callback: (data: any) => void) {
        this.on('user_avatar_protection_updated', callback);
    }

    // --- Eventos para mensagens de chat
    onNewChatMessage(callback: (message: any) => void) {
        this.on('new_chat_message', callback);
    }

    onUserStatusChanged(callback: (data: any) => void) {
        this.on('user_status_changed', callback);
    }

    // --- Métodos LiveGo-style (baseado na documentação do backend) ---
    sendBinfo() {
        if (!this.socket?.connected) return;
        
        // Dados binfo conforme documentação do backend
        const binfoData = {
            sdkappid: '1400088004',
            instanceid: 'default', // A definir pelo backend
            random: Math.random().toString(),
            platform: 7,
            host: 'windows',
            version: '-1',
            sdkversion: '3.5.9',
            compress: 'gzip',
            timestamp: Date.now(),
            app: 'LiveGo'
        };
        
        this.socket.emit('binfo', binfoData);
    }
    
    // --- Dispatcher de Eventos Protobuf ---
    private dispatchProtobufEvent(event: any) {
        // Processing Protobuf event
        
        // Verificar tipo de evento e despachar para handler apropriado
        if (event.chat) {
            this.handleProtobufChat(event.chat);
        } else if (event.gift) {
            this.handleProtobufGift(event.gift);
        } else if (event.user_joined) {
            this.handleProtobufUserJoined(event.user_joined);
        } else if (event.user_left) {
            this.handleProtobufUserLeft(event.user_left);
        } else if (event.leave_room) {
            this.handleProtobufLeaveRoom(event.leave_room);
        } else if (event.stream_status) {
            this.handleProtobufStreamStatus(event.stream_status);
        } else if (event.stream_info) {
            this.handleProtobufStreamInfo(event.stream_info);
        } else if (event.pk_invite) {
            window.dispatchEvent(new CustomEvent('livego:pk_invite', { detail: event.pk_invite }));
        } else if (event.pk_invite_response) {
            window.dispatchEvent(new CustomEvent('livego:pk_invite_response', { detail: event.pk_invite_response }));
        } else if (event.pk_heart) {
            window.dispatchEvent(new CustomEvent('livego:pk_heart', { detail: event.pk_heart }));
        } else if (event.pk_battle_started) {
            window.dispatchEvent(new CustomEvent('livego:pk_battle_started', { detail: event.pk_battle_started }));
        } else if (event.pk_battle_ended) {
            window.dispatchEvent(new CustomEvent('livego:pk_battle_ended', { detail: event.pk_battle_ended }));
        } else if (event.pk_score_update) {
            window.dispatchEvent(new CustomEvent('livego:pk_score_update', { detail: event.pk_score_update }));
        } else if (event.pk_timer_sync) {
            window.dispatchEvent(new CustomEvent('livego:pk_timer_sync', { detail: event.pk_timer_sync }));
        } else if (event.heartbeat) {
            // heartbeat — não logar como erro
        } else {
            console.debug(`📦 [PROTOBUF-DISPATCHER] Evento ignorado`);
        }
    }
    
    private handleProtobufChat(chatEvent: any) {
        // Obter mensagem textual real e metadados adicionais de forma robusta
        const rawMsg = chatEvent.chat?.message;
        const messageText = typeof rawMsg === 'object' && rawMsg !== null ? (rawMsg.message || '') : (rawMsg || '');
        const messageLevel = chatEvent.chat?.user_level || (typeof rawMsg === 'object' && rawMsg !== null ? rawMsg.level : 1);
        const userGender = typeof rawMsg === 'object' && rawMsg !== null ? rawMsg.gender : 'not_specified';
        const userAge = typeof rawMsg === 'object' && rawMsg !== null ? rawMsg.age : 18;
        const activeFrameId = typeof rawMsg === 'object' && rawMsg !== null ? rawMsg.activeFrameId : undefined;
        const frameExpiration = typeof rawMsg === 'object' && rawMsg !== null ? rawMsg.frameExpiration : undefined;

        // Disparar evento global para UI components (como LiveEventsDisplay) com texto puro no campo message
        window.dispatchEvent(new CustomEvent('livego:chat_message', {
            detail: {
                userId: chatEvent.chat?.user_id,
                userName: chatEvent.chat?.user_name,
                userAvatar: chatEvent.chat?.user_avatar,
                userLevel: messageLevel,
                message: messageText,
                timestamp: chatEvent.chat?.timestamp || Date.now(),
                streamId: chatEvent.base?.stream_id
            }
        }));

        // Construir um objeto de mensagem compatível com ChatMessageType
        const messagePayloadData = {
            id: chatEvent.chat?.id || chatEvent.chat?.timestamp || Date.now() + Math.random(),
            type: 'chat',
            user: chatEvent.chat?.user_name,
            level: messageLevel,
            message: messageText,
            avatar: chatEvent.chat?.user_avatar,
            gender: userGender,
            age: userAge,
            activeFrameId: activeFrameId,
            frameExpiration: frameExpiration,
            fullUser: chatEvent.chat?.fullUser || (typeof rawMsg === 'object' ? rawMsg.fullUser : {
                id: chatEvent.chat?.user_id?.toString(),
                name: chatEvent.chat?.user_name,
                avatarUrl: chatEvent.chat?.user_avatar,
                level: messageLevel,
                gender: userGender,
                age: userAge,
            })
        };

        // Evitar adicionar duas vezes caso seja a mensagem enviada pelo próprio usuário local (que já adicionou de forma otimista)
        const currentUserId = getCurrentUserId();
        if (chatEvent.chat?.user_id !== currentUserId) {
            const receiveMessageCallbacks = this.listeners.get('receive_message') || [];
            receiveMessageCallbacks.forEach(cb => {
                try {
                    cb(messagePayloadData);
                } catch (e) {
                    console.error('❌ Error triggering receive_message listener:', e);
                }
            });
        }
    }
    
    private handleProtobufGift(giftEvent: any) {
        const payload = {
            from: {
                id: giftEvent.from_user?.user_id,
                identification: giftEvent.from_user?.user_id || '',
                name: giftEvent.from_user?.user_name || 'Usuário',
                avatarUrl: giftEvent.from_user?.user_avatar || 'https://placehold.co/40',
                diamonds: 0,
                earnings: 0,
                level: giftEvent.from_user?.user_level || 1,
                xp: 0,
                followingList: [],
                followersList: [],
                friendsList: []
            },
            fromUser: {
                id: giftEvent.from_user?.user_id,
                name: giftEvent.from_user?.user_name || 'Usuário',
                avatarUrl: giftEvent.from_user?.user_avatar || 'https://placehold.co/40',
                level: giftEvent.from_user?.user_level || 1
            },
            to: {
                id: giftEvent.to_user?.user_id || 'host',
                name: giftEvent.to_user?.user_name || 'Host'
            },
            toUser: {
                id: giftEvent.to_user?.user_id || 'host',
                name: giftEvent.to_user?.user_name || 'Host'
            },
            gift: {
                name: giftEvent.gift?.gift_name,
                price: giftEvent.gift?.gift_price || 0,
                icon: giftEvent.gift?.gift_icon || '🎁',
                category: giftEvent.gift?.category || 'Popular'
            },
            quantity: giftEvent.gift?.quantity || 1,
            roomId: giftEvent.base?.stream_id || ''
        };

        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:gift_received', {
            detail: {
                fromUserId: giftEvent.from_user?.user_id,
                fromUserName: giftEvent.from_user?.user_name,
                fromUserAvatar: giftEvent.from_user?.user_avatar,
                toUserId: giftEvent.to_user?.user_id,
                toUserName: giftEvent.to_user?.user_name,
                toUserAvatar: giftEvent.to_user?.user_avatar,
                giftId: giftEvent.gift?.gift_id,
                giftName: giftEvent.gift?.gift_name,
                giftIcon: giftEvent.gift?.gift_icon,
                giftPrice: giftEvent.gift?.gift_price,
                quantity: giftEvent.gift?.quantity,
                totalValue: giftEvent.gift?.total_value,
                timestamp: giftEvent.timestamp,
                streamId: giftEvent.base?.stream_id
            }
        }));

        // SINCRONIZAÇÃO EM TEMPO REAL: Notificar componentes que usam socket.on('gift_received' o 'live_gift_received')
        const currentUserId = getCurrentUserId();
        if (giftEvent.from_user?.user_id !== currentUserId) {
            const giftCallbacks = this.listeners.get('gift_received') || [];
            giftCallbacks.forEach(cb => {
                try { cb(payload); } catch (e) { console.error('❌ Error in gift_received listener:', e); }
            });

            const liveGiftCallbacks = this.listeners.get('live_gift_received') || [];
            liveGiftCallbacks.forEach(cb => {
                try { cb(payload); } catch (e) { console.error('❌ Error in live_gift_received listener:', e); }
            });
        }
    }
    
    private handleProtobufUserJoined(userJoinedEvent: any) {
        const payload = {
            userId: userJoinedEvent.user?.user_id,
            userName: userJoinedEvent.user?.user_name || 'LiveGo User',
            userAvatar: userJoinedEvent.user?.user_avatar || 'https://placehold.co/40',
            userLevel: userJoinedEvent.user?.user_level || 1,
            streamId: userJoinedEvent.base?.stream_id,
            timestamp: (userJoinedEvent.timestamp || Date.now()).toString()
        };

        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:user_joined', {
            detail: {
                userId: userJoinedEvent.user?.user_id,
                userName: userJoinedEvent.user?.user_name,
                userAvatar: userJoinedEvent.user?.user_avatar,
                userLevel: userJoinedEvent.user?.user_level,
                timestamp: userJoinedEvent.timestamp,
                streamId: userJoinedEvent.base?.stream_id
            }
        }));

        // SINCRONIZAÇÃO EM TEMPO REAL: Notificar componentes usando socket.on('user_joined_stream')
        const joinCallbacks = this.listeners.get('user_joined_stream') || [];
        joinCallbacks.forEach(cb => {
            try { cb(payload); } catch (e) { console.error('❌ Error in user_joined_stream listener:', e); }
        });
    }
    
    private handleProtobufUserLeft(userLeftEvent: any) {
        const payload = {
            userId: userLeftEvent.user?.user_id,
            streamId: userLeftEvent.base?.stream_id,
            timestamp: (userLeftEvent.timestamp || Date.now()).toString()
        };

        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:user_left', {
            detail: {
                userId: userLeftEvent.user?.user_id,
                userName: userLeftEvent.user?.user_name,
                userAvatar: userLeftEvent.user?.user_avatar,
                userLevel: userLeftEvent.user?.user_level,
                timestamp: userLeftEvent.timestamp,
                streamId: userLeftEvent.base?.stream_id
            }
        }));

        // SINCRONIZAÇÃO EM TEMPO REAL: Notificar componentes usando socket.on('user_left_stream')
        const leaveCallbacks = this.listeners.get('user_left_stream') || [];
        leaveCallbacks.forEach(cb => {
            try { cb(payload); } catch (e) { console.error('❌ Error in user_left_stream listener:', e); }
        });
    }
    
    private handleProtobufStreamStatus(streamStatusEvent: any) {
        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:stream_status', {
            detail: {
                streamId: streamStatusEvent.base?.stream_id,
                status: streamStatusEvent.status?.status,
                viewers: streamStatusEvent.status?.viewers,
                hostId: streamStatusEvent.status?.host_id,
                hostName: streamStatusEvent.status?.host_name,
                timestamp: streamStatusEvent.timestamp
            }
        }));

        // SINCRONIZAÇÃO EM TEMPO REAL: Notificar componentes usando socket.on('viewers_count_updated')
        const viewersCallbacks = this.listeners.get('viewers_count_updated') || [];
        viewersCallbacks.forEach(cb => {
            try {
                cb({
                    streamId: streamStatusEvent.base?.stream_id,
                    viewersCount: streamStatusEvent.status?.viewers || 0,
                    count: streamStatusEvent.status?.viewers || 0
                });
            } catch (e) {
                console.error('❌ Error in viewers_count_updated listener:', e);
            }
        });
    }
    
    private handleProtobufStreamInfo(streamInfoEvent: any) {
        
        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:stream_info', {
            detail: {
                streamId: streamInfoEvent.info?.stream_id,
                streamTitle: streamInfoEvent.info?.stream_title,
                streamDescription: streamInfoEvent.info?.stream_description,
                hostId: streamInfoEvent.info?.host_id,
                hostName: streamInfoEvent.info?.host_name,
                hostAvatar: streamInfoEvent.info?.host_avatar,
                viewers: streamInfoEvent.info?.viewers,
                coins: streamInfoEvent.info?.coins,
                status: streamInfoEvent.info?.status,
                startTime: streamInfoEvent.info?.start_time,
                timestamp: streamInfoEvent.timestamp
            }
        }));
    }
    
    private handleProtobufLeaveRoom(leaveRoomEvent: any) {
        const payload = {
            userId: leaveRoomEvent.user_id,
            streamId: leaveRoomEvent.room_id,
            timestamp: (leaveRoomEvent.timestamp || Date.now()).toString()
        };

        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:user_left_room', {
            detail: {
                roomId: leaveRoomEvent.room_id,
                timestamp: leaveRoomEvent.timestamp
            }
        }));

        // SINCRONIZAÇÃO EM TEMPO REAL: Notificar componentes usando socket.on('user_left_stream')
        const leaveCallbacks = this.listeners.get('user_left_stream') || [];
        leaveCallbacks.forEach(cb => {
            try { cb(payload); } catch (e) { console.error('❌ Error in user_left_stream listener:', e); }
        });
    }
    
    // --- Métodos Protobuf com Serialização Binária Real ---
    sendProtobufChatMessage(streamId: string, userId: string, userName: string, userAvatar: string, message: string) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = null; // Protobuf removed
        if (buffer) {
            // Enviar via WebSocket como binário real fatiado de forma precisa
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.socket?.emit('binary_data', arrayBuffer, streamId);
        }
    }
    
    sendProtobufGift(
        streamId: string,
        fromUserId: string, fromUserName: string, fromUserAvatar: string,
        toUserId: string, toUserName: string, toUserAvatar: string,
        giftId: string, giftName: string, giftIcon: string,
        giftPrice: number, quantity: number = 1
    ) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = null; // Protobuf removed
        if (buffer) {
            // Enviar via WebSocket como binário real fatiado de forma precisa
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.socket?.emit('binary_data', arrayBuffer, streamId);
        }
    }
    
    sendProtobufUserJoined(streamId: string, userId: string, userName: string, userAvatar: string, userLevel: number = 1) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = null; // Protobuf removed
        if (buffer) {
            // Enviar via WebSocket como binário real fatiado de forma precisa
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.socket?.emit('binary_data', arrayBuffer);
        }
    }
    
    sendProtobufStreamStatus(streamId: string, status: string, viewers: number = 0, hostId: string = '', hostName: string = '') {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = null; // Protobuf removed
        if (buffer) {
            // Enviar via WebSocket como binário real fatiado de forma precisa
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.socket?.emit('binary_data', arrayBuffer);
        }
    }
    
    sendProtobufJoinStream(streamId: string, userId: string) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = null; // Protobuf removed
        if (buffer) {
            // Enviar via WebSocket como binário real fatiado de forma precisa
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.socket?.emit('binary_data', arrayBuffer);
        }
    }
    
    sendProtobufUserOffline(userId: string, userName: string = 'LiveGo User', userAvatar: string = 'https://placehold.co/40') {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const protobufData = {
            user_offline: {
                base: {
                    type: 'user_offline',
                    timestamp: Date.now(),
                    stream_id: 'system'
                },
                user: {
                    user_id: userId,
                    user_name: userName,
                    user_avatar: userAvatar,
                    user_level: 1
                },
                timestamp: Date.now()
            }
        };

        // Codificar manualmente para binário (simulando Protobuf)
        const jsonString = JSON.stringify(protobufData);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(jsonString);
        const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer);
    }
    
    sendUserOnline(userId: string, userName: string = 'LiveGo User', userAvatar: string = 'https://placehold.co/40') {
        if (!this.socket?.connected) return;
        
        // Enviar user_online como binário via Protobuf
        const protobufData = {
            user_online: {
                base: {
                    type: 'user_online',
                    timestamp: Date.now(),
                    stream_id: 'system'
                },
                user: {
                    user_id: userId,
                    user_name: userName,
                    user_avatar: userAvatar,
                    user_level: 1
                },
                timestamp: Date.now()
            }
        };

        // Codificar manualmente para binário (simulando Protobuf)
        const jsonString = JSON.stringify(protobufData);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(jsonString);
        const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer);
    }
    sendChatMessage(streamId: string, userId: string, userName: string, userAvatar: string, message: string) {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufChatMessage(streamId, userId, userName, userAvatar, message);
    }
    
    sendGift(
        streamId: string,
        fromUserId: string,
        fromUserName: string,
        fromUserAvatar: string,
        toUserId: string,
        toUserName: string,
        toUserAvatar: string,
        giftId: string,
        giftName: string,
        giftIcon: string,
        giftPrice: number,
        quantity: number = 1
    ) {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufGift(
            streamId,
            fromUserId,
            fromUserName,
            fromUserAvatar,
            toUserId,
            toUserName,
            toUserAvatar,
            giftId,
            giftName,
            giftIcon,
            giftPrice,
            quantity
        );
    }
    
    sendStreamStatus(streamId: string, status: 'starting' | 'live' | 'paused' | 'ended', viewers: number = 0, hostId: string = '', hostName: string = '') {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufStreamStatus(streamId, status, viewers, hostId, hostName);
    }
    
    sendUserJoined(streamId: string, userId: string, userName: string, userAvatar: string, userLevel: number = 1) {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufUserJoined(streamId, userId, userName, userAvatar, userLevel);
    }
    
    // --- Métodos para eventos reais baseados no banco ---
    async sendRealChatMessage(streamId: string, userId: string, message: string) {
        try {
            // Buscar dados reais do usuário com ID numérico real
            const user = await api.getUser(userId);
            
            // Usar ID numérico real (ex: 98501723)
            const realUserId = user.identification || userId;
            
            this.sendChatMessage(
                streamId,
                realUserId, // ID numérico real
                user.name,
                user.avatarUrl,
                message
            );
        } catch (error) {
            console.error(`❌ [LIVEGO-CHAT] Error sending real message:`, error);
        }
    }
    
    async sendRealGift(streamId: string, fromUserId: string, toUserId: string, giftId: string, quantity: number = 1) {
        try {
            // Buscar dados reais dos usuários com IDs numéricos reais
            const [fromUser, toUser, gifts] = await Promise.all([
                api.getUser(fromUserId),
                api.getUser(toUserId),
                api.getGifts()
            ]);
            
            const gift = gifts.find(g => g.name === giftId);
            
            // Usar IDs numéricos reais (ex: 98501723)
            const realFromUserId = fromUser.identification || fromUserId;
            const realToUserId = toUser.identification || toUserId;
            
            this.sendGift(
                streamId,
                realFromUserId, // ID numérico real
                fromUser.name,
                fromUser.avatarUrl,
                realToUserId, // ID numérico real
                toUser.name,
                gift.name,
                gift.name,
                gift.icon,
                gift.price,
                quantity
            );
        } catch (error) {
            console.error(`❌ [LIVEGO-GIFT] Error sending real gift:`, error);
        }
    }
    
    updateRealStreamStatus(streamId: string) {
        try {
            // Buscar dados reais do stream
            api.getLiveDetails(streamId).then(stream => {
                this.sendStreamStatus(
                        stream.id,
                        stream.isLive ? 'live' : 'ended',
                        stream.viewers || 0
                    );
                })
                .catch(error => {
                    console.error(`❌ [LIVEGO-STREAM] Error updating real status:`, error);
                });
        } catch (error) {
            console.error(`❌ [LIVEGO-STREAM] Error updating real status:`, error);
        }
    }
    
    sendPing() {
        if (!this.socket?.connected) return;
        this.socket?.emit('ping');
    }
    
    // --- Métodos existentes (mantidos para compatibilidade) ---
    sendMessage(roomId: string, message: any) {
        // Enviar como binário via Protobuf de forma dinâmica com dados reais da conta do usuário
        let userId = getCurrentUserId();
        let userName = 'LiveGo User';
        let userAvatar = 'https://placehold.co/40';
        let userLevel = 1;
        let actualMessage = message;

        if (message && typeof message === 'object') {
            userName = message.user || message.userName || userName;
            userAvatar = message.avatar || message.avatarUrl || userAvatar;
            userLevel = message.level || message.userLevel || userLevel;
            actualMessage = message.message || '';
        }

        const protobufData = {
            chat: {
                base: {
                    type: 'chat',
                    timestamp: Date.now(),
                    stream_id: roomId
                },
                chat: {
                    user_id: userId,
                    user_name: userName,
                    user_avatar: userAvatar,
                    user_level: userLevel,
                    message: actualMessage,
                    timestamp: Date.now(),
                    fullUser: message && typeof message === 'object' ? message.fullUser : undefined
                }
            }
        };

        // Codificar manualmente para binário (simulando Protobuf)
        const jsonString = JSON.stringify(protobufData);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(jsonString);
        const arrayBuffer = uint8Array.buffer;

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer);
    }

    // Eventos de presença online
    onUserJoined(callback: (data: { userId: string; userName: string; userAvatar: string; userLevel: number; streamId: string; timestamp: string }) => void) {
        this.on('user_joined_stream', callback);
    }

    onUserJoinedDirect(callback: (data: { userId: string; userName: string; userAvatar: string; userLevel: number; timestamp: string }) => void) {
        this.on('user_joined', callback);
    }

    onUserLeft(callback: (data: { userId: string; userName: string; streamId: string; timestamp: string }) => void) {
        this.on('user_left_stream', callback);
    }

    onUserLeftDirect(callback: (data: { userId: string; userName: string; timestamp: string }) => void) {
        this.on('user_left', callback);
    }

    // Eventos para status online/offline
    onUserOnline(callback: (data: { userId: string; isOnline: boolean; timestamp: string }) => void) {
        this.on('user_online', callback);
    }

    onUserOffline(callback: (data: { userId: string; isOnline: false; lastSeen: string; timestamp: string }) => void) {
        this.on('user_offline', callback);
    }

    // Evento para quando um presente é enviado para a stream
    onGiftSentToStream(callback: (data: { streamId: string; gift: { fromUserId: string; fromUserName: string; fromUserAvatar: string; giftName: string; giftIcon: string; giftPrice: number; quantity: number; totalValue: number }; timestamp: string }) => void) {
        this.on('gift_sent_to_stream', callback);
    }

    // Evento para quando um presente é recebido
    onGiftReceived(callback: (data: { from: { id: string; name: string; avatarUrl: string }; gift: { id: string; name: string; icon: string; price: number }; quantity: number; totalValue: number; streamId: string; timestamp: string }) => void) {
        this.on('gift_received', callback);
    }

    // Evento para quando os contadores de moedas da live são atualizados
    onLiveCoinsUpdated(callback: (data: { streamId: string; coins: number; totalCoins: number }) => void) {
        this.on('live_coins_updated', callback);
    }

    // Eventos para mensagens de chat
    onNewMessage(callback: (message: any) => void) {
        this.on('new_message', callback);
    }

    onViewersCountUpdated(callback: (data: { count: number; streamId: string }) => void) {
        this.on('viewers_count_updated', callback);
    }

    // Evento para quando uma live é encerrada
    onStreamEnded(callback: (data: { streamId: string; hostId: string; timestamp: string }) => void) {
        this.on('stream_ended', callback);
    }

    // Evento para quando o usuário atual precisa sair de uma live encerrada
    onLiveStreamEnded(callback: (data: { streamId: string; message: string; timestamp: string }) => void) {
        this.on('live_stream_ended', callback);
    }

    // Evento para quando um card é removido
    onCardRemoved(callback: (data: { streamId: string; hostId: string; timestamp: string }) => void) {
        this.on('card_removed', callback);
    }

    // Eventos específicos para início/término de transmissão em tempo real
    onStreamStarted(callback: (stream: any) => void) {
        this.on('stream_started', callback);
    }

    onStreamStopped(callback: (data: { streamId: string; hostId?: string; timestamp?: string }) => void) {
        this.on('stream_stopped', callback);
    }

    // --- Métodos auxiliares ---
    getSocket() {
        return this.socket;
    }
    
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);

        if (this.socket) {
            this.socket.on(event, callback as any);
        }
    }

    off(event: string, callback?: Function) {
        if (callback) {
            const callbacks = this.listeners.get(event) || [];
            this.listeners.set(event, callbacks.filter(cb => cb !== callback));
            if (this.socket) {
                this.socket.off(event, callback as any);
            }
        } else {
            this.listeners.delete(event);
            if (this.socket) {
                this.socket.off(event);
            }
        }
    }
}

export const socketService = new SocketService();
