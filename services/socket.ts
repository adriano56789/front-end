import { io, Socket } from 'socket.io-client';
import { env } from '../src/config/environment';
import { ProtobufService } from '../src/services/protobuf/ProtobufService';
import { LiveGoParamsParser, ParsedLiveGoParams } from '../src/services/LiveGoParamsParser';
import { getCurrentUserId, api, getAuthToken } from './api';

// URL do WebSocket baseada na configuração automática do ambiente
const WS_URL = env.wsUrl;

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    async connect() {
        if (this.socket?.connected) {
            console.log(`🔄 [SOCKET] Already connected to ${WS_URL}`);
            return;
        }
        
        console.log(`🚀 [SOCKET] Connecting to ${WS_URL}...`);
        
        // Inicializar Protobuf antes de conectar
        await ProtobufService.init();

        // Add cache-busting timestamp to avoid browser caching
        const cacheBust = Date.now();
        const wsUrlWithCache = `${WS_URL}?_cb=${cacheBust}`;
        
        const token = getAuthToken();
        this.socket = io(wsUrlWithCache, {
            transports: ['websocket', 'polling'], // WebSocket com polling como fallback
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
                'Origin': window.location.origin,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        } as any);

        this.socket.on('connect', () => {
            console.log(`✅ [SOCKET] Connected to ${WS_URL}`);
            console.log(`📊 [SOCKET] Transport: ${this.socket?.io.engine.transport.name}`);
            
            // Enviar evento binfo como Buzzcast
            this.sendBinfo();
            
            // Iniciar heartbeat
            this.startHeartbeat();
        });

        this.socket.on('connect_error', (err) => {
            console.error(`❌ [SOCKET] Connection error:`, err);
            console.error(`❌ [SOCKET] URL being attempted: ${WS_URL}`);
            
            // Tentar URL alternativa se a principal falhar
            if (WS_URL.includes('https://livego.store')) {
                console.log(`🔄 [SOCKET] Tentando URL alternativa...`);
                this.tryAlternativeConnection();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`🔌 [SOCKET] Disconnected: ${reason}`);
            this.stopHeartbeat();
        });
        
        // Eventos como LiveGo
        this.socket.on('binfo_response', (data) => {
            console.log(`📊 [LIVEGO-BINFO] Response:`, data);
        });
        
        this.socket.on('stream_joined', (data) => {
            console.log(`🎥 [STREAM] Joined:`, data);
        });
        
        this.socket.on('stream_left', (data) => {
            console.log(`🎥 [STREAM] Left:`, data);
        });
        
        this.socket.on('pong', (data) => {
            console.log(`🏓 [HEARTBEAT] Pong received:`, data);
        });
        
        // Processar eventos Protobuf (serialização binária real)
        this.socket.on('binary_data', (data) => {
            console.log(`📦 [PROTOBUF] Binary data received`);

            if (data instanceof ArrayBuffer) {
                const uint8Array = new Uint8Array(data);
                console.log(`📦 [PROTOBUF] HEX:`, ProtobufService.bufferToHex(uint8Array));

                const decodedEvent = ProtobufService.decodeEvent(uint8Array);
                if (decodedEvent) {
                    this.dispatchProtobufEvent(decodedEvent);
                }
            }
        });
        
        // Eventos processados apenas via transporte binário (binary_data)
        // Removidos eventos JSON redundantes para garantir transporte binário exclusivo

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

                console.log('📦 [PROTOBUF] Heartbeat sent as binary:', arrayBuffer.byteLength, 'bytes');
            }
        }, 30000); // Heartbeat a cada 30 segundos
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private tryAlternativeConnection() {
        const alternativeUrls = [
            'https://72.60.249.175:3001',
            'http://72.60.249.175:3001',
            'https://www.livego.store:3001',
            'http://www.livego.store:3001'
        ];
        
        for (const url of alternativeUrls) {
            console.log(`🔄 [SOCKET] Tentando URL alternativa: ${url}`);
            
            const alternativeSocket = io(url, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 3,
                reconnectionDelay: 1000,
                timeout: 10000,
                forceNew: true,
                withCredentials: true
            });
            
            alternativeSocket.on('connect', () => {
                console.log(`✅ [SOCKET] Conectado via URL alternativa: ${url}`);
                // Usar esta conexão como principal
                this.socket = alternativeSocket;
                this.setupSocketEvents();
            });
            
            alternativeSocket.on('connect_error', (err) => {
                console.error(`❌ [SOCKET] Falha na URL alternativa ${url}:`, err);
            });
        }
    }
    
    private setupSocketEvents() {
        if (!this.socket) return;
        
        this.socket.on('connect', () => {
            console.log(`✅ [SOCKET] Connected to ${WS_URL}`);
            console.log(`📊 [SOCKET] Transport: ${this.socket?.io.engine.transport.name}`);
            this.sendBinfo();
            this.startHeartbeat();
        });
        
        this.socket.on('connect_error', (err) => {
            console.error(`❌ [SOCKET] Connection error:`, err);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log(`🔌 [SOCKET] Disconnected: ${reason}`);
            this.stopHeartbeat();
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
        
        // Enviar join_stream como binário via Protobuf
        // Usar ID dinâmico do usuário logado (buscar do banco via API)
        const currentUserId = getCurrentUserId(); // APENAS do banco/API
        this.sendProtobufJoinStream(roomId, currentUserId); // ID real do usuário
        
        console.log(`🎥 [LIVE] Joined stream ${roomId} (binary)`);
    }

    leaveRoom(roomId: string) {
        if (!this.socket?.connected) return;
        
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
        this.socket?.emit('binary_data', arrayBuffer);
        
        console.log('📦 [PROTOBUF] Leave room sent as binary:', arrayBuffer.byteLength, 'bytes');
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
        
        console.log(`📊 [LIVEGO-BINFO] Sending binfo:`, binfoData);
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
        } else if (event.heartbeat) {
            // heartbeat — não logar como erro
        } else {
            console.debug(`📦 [PROTOBUF-DISPATCHER] Evento ignorado`);
        }
    }
    
    private handleProtobufChat(chatEvent: any) {
        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:chat_message', {
            detail: {
                userId: chatEvent.chat?.user_id,
                userName: chatEvent.chat?.user_name,
                userAvatar: chatEvent.chat?.user_avatar,
                message: chatEvent.chat?.message,
                timestamp: chatEvent.chat?.timestamp,
                streamId: chatEvent.base?.stream_id
            }
        }));
    }
    
    private handleProtobufGift(giftEvent: any) {
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
    }
    
    private handleProtobufUserJoined(userJoinedEvent: any) {
        
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
    }
    
    private handleProtobufUserLeft(userLeftEvent: any) {
        
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
        
        // Disparar evento global para UI components
        window.dispatchEvent(new CustomEvent('livego:user_left_room', {
            detail: {
                roomId: leaveRoomEvent.room_id,
                timestamp: leaveRoomEvent.timestamp
            }
        }));
    }
    
    // --- Métodos Protobuf com Serialização Binária Real ---
    sendProtobufChatMessage(streamId: string, userId: string, userName: string, userAvatar: string, message: string) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = ProtobufService.encodeChatEvent(streamId, userId, userName, userAvatar, message);
        
        if (buffer) {
            // Enviar via WebSocket como binário real
            this.socket?.emit('binary_data', buffer.buffer);
            console.log(`📦 [PROTOBUF] Chat message sent:`, buffer.length, 'bytes');
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
        const buffer = ProtobufService.encodeGiftEvent(
            streamId, fromUserId, fromUserName, fromUserAvatar,
            toUserId, toUserName, toUserAvatar,
            giftId, giftName, giftIcon, giftPrice, quantity
        );
        
        if (buffer) {
            // Enviar via WebSocket como binário real
            this.socket?.emit('binary_data', buffer.buffer);
            console.log(`📦 [PROTOBUF] Gift sent:`, buffer.length, 'bytes');
        }
    }
    
    sendProtobufUserJoined(streamId: string, userId: string, userName: string, userAvatar: string, userLevel: number = 1) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = ProtobufService.encodeUserJoinedEvent(streamId, userId, userName, userAvatar, userLevel);
        
        if (buffer) {
            // Enviar via WebSocket como binário real
            this.socket?.emit('binary_data', buffer.buffer);
            console.log(`📦 [PROTOBUF] User joined sent:`, buffer.length, 'bytes');
        }
    }
    
    sendProtobufStreamStatus(streamId: string, status: string, viewers: number = 0, hostId: string = '', hostName: string = '') {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = ProtobufService.encodeStreamStatusEvent(streamId, status, viewers, hostId, hostName);
        
        if (buffer) {
            // Enviar via WebSocket como binário real
            this.socket?.emit('binary_data', buffer.buffer);
            console.log(`📦 [PROTOBUF] Stream status sent:`, buffer.length, 'bytes');
        }
    }
    
    sendProtobufJoinStream(streamId: string, userId: string) {
        if (!this.socket?.connected) return;
        
        // Codificar usando Protobuf
        const buffer = ProtobufService.encodeJoinStreamEvent(streamId, userId);
        
        if (buffer) {
            // Enviar via WebSocket como binário real
            this.socket?.emit('binary_data', buffer.buffer);
            console.log(`📦 [PROTOBUF] Join stream sent:`, buffer.length, 'bytes');
        }
    }
    
    sendProtobufUserOffline(userId: string, userName: string = 'LiveGo User', userAvatar: string = 'https://via.placeholder.com/40') {
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
        const arrayBuffer = uint8Array.buffer;

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer);
        
        console.log('📦 [PROTOBUF] User offline sent as binary:', arrayBuffer.byteLength, 'bytes');
    }
    
    sendUserOnline(userId: string, userName: string = 'LiveGo User', userAvatar: string = 'https://via.placeholder.com/40') {
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
        const arrayBuffer = uint8Array.buffer;

        // Enviar como binário real
        this.socket?.emit('binary_data', arrayBuffer);
        
        console.log('📦 [PROTOBUF] User online sent as binary:', arrayBuffer.byteLength, 'bytes');
    }
    sendChatMessage(streamId: string, userId: string, userName: string, userAvatar: string, message: string) {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufChatMessage(streamId, userId, userName, userAvatar, message);
    }
    
    sendGift(streamId: string, fromUserId: string, fromUserName: string, fromUserAvatar: string, toUserId: string, toUserName: string, giftId: string, giftName: string, giftIcon: string, giftPrice: number, quantity: number = 1) {
        if (!this.socket?.connected) return;
        
        // Enviar diretamente como binário via Protobuf
        this.sendProtobufGift(
            streamId, fromUserId, fromUserName, fromUserAvatar,
            toUserId, toUserName, fromUserAvatar,
            giftId, giftName, giftIcon, giftPrice, quantity
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
        // Enviar como binário via Protobuf
        const protobufData = {
            chat: {
                base: {
                    type: 'chat',
                    timestamp: Date.now(),
                    stream_id: roomId
                },
                chat: {
                    user_id: getCurrentUserId(), // APENAS do banco/API
                    user_name: 'LiveGo User', // Buscar do banco via API se necessário
                    user_avatar: 'https://via.placeholder.com/40', // Buscar do banco via API se necessário
                    message: message,
                    timestamp: Date.now()
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
        
        console.log('📦 [BINARY] Chat message sent as binary:', arrayBuffer.byteLength, 'bytes');
    }

    // Eventos de presença online
    onUserJoined(callback: (data: { userId: string; userName: string; userAvatar: string; userLevel: number; streamId: string; timestamp: string }) => void) {
        this.on('user_joined_stream', callback);
    }

    onUserLeft(callback: (data: { userId: string; userName: string; streamId: string; timestamp: string }) => void) {
        this.on('user_left_stream', callback);
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
