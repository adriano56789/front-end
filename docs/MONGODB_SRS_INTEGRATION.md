# Integração MongoDB, Mongoose e SRS SFU WebRTC (LiveGo)

Este guia ensina como integrar o banco MongoDB (via Mongoose) ao seu servidor SRS (Simple Realtime Server) para gerenciar os **usuários na live, convites de co-host / batalha PK e links de transmissão WebRTC**.

---

## 1. Estrutura do Banco no MongoDB (Mongoose)

Adicione as definições abaixo no seu diretório de modelos do backend (ex: `backend/src/models/LiveInvite.ts`):

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

// ==========================================
// 1. INTERFACE & SCHEMA DEFINITION: LIVE USER
// ==========================================

export interface ILiveUser extends Document {
    userId: string;
    username: string; // O identificador único por nome do usuário
    name: string;
    avatarUrl: string;
    status: "idle" | "broadcasting" | "viewing" | "co-host" | "pk-battle";
    currentStreamId: string | null;
    socketId: string | null;
    isMuted: boolean;
    joinedAt: Date;
    lastActive: Date;
}

const LiveUserSchema: Schema<ILiveUser> = new Schema(
    {
        userId: { type: String, required: true, index: true },
        username: { type: String, required: true, index: true },
        name: { type: String, required: true },
        avatarUrl: { type: String, default: "" },
        status: { 
            type: String, 
            enum: ["idle", "broadcasting", "viewing", "co-host", "pk-battle"], 
            default: "idle" 
        },
        currentStreamId: { type: String, default: null, index: true },
        socketId: { type: String, default: null },
        isMuted: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now },
        lastActive: { type: Date, default: Date.now, index: true } // Utilizado para limpezas automáticas
    },
    { timestamps: true }
);

// Limpeza automática de usuários inativos por mais de 2 horas (TTL Index do MongoDB)
LiveUserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 7200 });


// ==========================================
// 2. INTERFACE & SCHEMA DEFINITION: LIVE INVITE
// ==========================================

export interface ISrsSfuConfig {
    whipUrl: string;       // Endpoint WHIP para Publish (WebRTC SRS)
    whepUrl: string;       // Endpoint WHEP para Play (WebRTC SRS)
    streamKey: string;     // Chave única de transmissão gerada
    rtcRoomId: string;     // ID único da sala RTC no SRS SFU
}

export interface ILiveInvite extends Document {
    inviterUsername: string; // Usuário que convidou
    inviterName: string;
    inviteeUsername: string; // Usuário convidado
    inviteeName: string;
    inviteType: "co-host" | "pk-battle" | "guest_mic";
    status: "pending" | "accepted" | "declined" | "expired";
    streamId: string;       // ID da live ativa
    inviteLink: string;     // Link dinâmico de convite de ingresso
    srsSfuConfig: ISrsSfuConfig; // Configuração WebRTC para o SRS SFU
    createdAt: Date;
}

const SrsSfuConfigSchema = new Schema<ISrsSfuConfig>({
    whipUrl: { type: String, required: true },
    whepUrl: { type: String, required: true },
    streamKey: { type: String, required: true },
    rtcRoomId: { type: String, required: true }
}, { _id: false });

const LiveInviteSchema: Schema<ILiveInvite> = new Schema(
    {
        inviterUsername: { type: String, required: true, index: true },
        inviterName: { type: String, required: true },
        inviteeUsername: { type: String, required: true, index: true },
        inviteeName: { type: String, required: true },
        inviteType: { 
            type: String, 
            enum: ["co-host", "pk-battle", "guest_mic"], 
            required: true 
        },
        status: { 
            type: String, 
            enum: ["pending", "accepted", "declined", "expired"], 
            default: "pending",
            index: true
        },
        streamId: { type: String, required: true, index: true },
        inviteLink: { type: String, required: true },
        srsSfuConfig: { type: SrsSfuConfigSchema, required: true },
        createdAt: { type: Date, default: Date.now, index: true }
    },
    { timestamps: true }
);

// Convites expiram e somem do banco após 10 minutos automaticamente (TTL)
LiveInviteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

export const LiveUser: Model<ILiveUser> = 
    mongoose.models.LiveUser || mongoose.model<ILiveUser>("LiveUser", LiveUserSchema);

export const LiveInvite: Model<ILiveInvite> = 
    mongoose.models.LiveInvite || mongoose.model<ILiveInvite>("LiveInvite", LiveInviteSchema);
```

---

## 2. Fluxo Completo de Operação

```
[ Usuário entra na Live ] ──(Express API)──> [ Registra na Coleção 'LiveUser' ]
                                                      │
[ Modal de Convite Abre ] <──(GET /api/live/users)─────┘ (Puxa usuários na live)
       │
[ Envia Convite Co-host ] ──(POST /api/live/invite)─> [ Salva na Coleção 'LiveInvite' ]
                                                      │ (Contém WHIP/WHEP do SRS)
                                                      v
                                        [ Real-time push via Socket.IO ]
                                                      │
[ Convidado Aceita ] <─────────────────────────────────┘
       │
       v
[ Inicializa WebRTC Publisher (WHIP & WHEP) com SRS SFU ]
```

---

## 3. Endpoints de Express (Controladora de Exemplo)

Abaixo estão os templates de rotas que você deve adicionar ao seu `backend/src/routes/liveRoutes.ts` de produção para integrar com o banco:

```typescript
import express from "express";
import { LiveUser, LiveInvite } from "../models/mongoInviteSchema"; // Seu arquivo importado

const router = express.Router();

/**
 * 1. REGISTRAR ENTRADA NA LIVE
 * Chamado pelo frontend assim que um usuário abre a live.
 */
router.post("/api/live/join", async (req, res) => {
    try {
        const { userId, username, name, avatarUrl, streamId, socketId } = req.body;

        // Atualiza ou insere o usuário ativo na live
        const liveUser = await LiveUser.findOneAndUpdate(
            { username },
            {
                userId,
                username,
                name,
                avatarUrl,
                status: "viewing",
                currentStreamId: streamId,
                socketId,
                lastActive: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, user: liveUser });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 2. LISTAR USUÁRIOS ATIVOS NA LIVE
 * Puxado pelo modal para listar as pessoas disponíveis que podemos convidar.
 */
router.get("/api/live/online-users", async (req, res) => {
    try {
        const { streamId } = req.query;

        // Busca usuários que estão ativamente assistindo ou nessa live
        const users = await LiveUser.find({
            currentStreamId: streamId,
            status: "viewing"
        }).sort({ lastActive: -1 });

        res.status(200).json({ success: true, users });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 3. CRIAR CONVITE COM CONFIGURAÇÃO SRS SFU (WEBRTC)
 * Chamado quando você seleciona um usuário e envia o convite para Co-host / Batalha.
 */
router.post("/api/live/invite", async (req, res) => {
    try {
        const { 
            inviterUsername, 
            inviterName, 
            inviteeUsername, 
            inviteeName, 
            inviteType, 
            streamId 
        } = req.body;

        // Configurações WebRTC automatizadas apontando para o seu SRS Server
        const srsHost = process.env.SRS_HOST || "api.livego.store";
        const streamKey = `cohost_${inviterUsername}_${inviteeUsername}_${Date.now().toString().slice(-4)}`;
        
        const whipUrl = `webrtc://${srsHost}/rtc/v1/publish/live/${streamKey}`;
        const whepUrl = `webrtc://${srsHost}/rtc/v1/play/live/${streamKey}`;
        const inviteLink = `https://livego.store/live/${streamId}?invite=${streamKey}`;

        const newInvite = await LiveInvite.create({
            inviterUsername,
            inviterName,
            inviteeUsername,
            inviteeName,
            inviteType,
            status: "pending",
            streamId,
            inviteLink,
            srsSfuConfig: {
                whipUrl,
                whepUrl,
                streamKey,
                rtcRoomId: streamId
            }
        });

        // NOTA: Disparar evento WebSocket em tempo real para o inviteeUsername usando Socket.IO
        // io.to(inviteeSocketId).emit("cohost_invite_received", newInvite);

        res.status(201).json({ success: true, invite: newInvite });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 4. RESPONDER AO CONVITE (ACEITAR / RECUSAR)
 * Se aceito, o convidado obtém as URLs de WHIP para começar a transmitir de volta para o SRS.
 */
router.post("/api/live/invite/respond", async (req, res) => {
    try {
        const { inviteId, status } = req.body; // status: 'accepted' | 'declined'

        const invite = await LiveInvite.findById(inviteId);
        if (!invite) {
            return res.status(404).json({ success: false, message: "Convite não localizado ou expirado." });
        }

        invite.status = status;
        await invite.save();

        if (status === "accepted") {
            // Atualiza status do convidado para Co-host no banco
            await LiveUser.findOneAndUpdate(
                { username: invite.inviteeUsername },
                { status: "co-host" }
            );
            await LiveUser.findOneAndUpdate(
                { username: invite.inviterUsername },
                { status: "co-host" }
            );
        }

        // Emitir WebSocket comunicando a resposta de volta ao criador original
        // io.to(inviterSocketId).emit("cohost_invite_response", invite);

        res.status(200).json({ success: true, invite });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 5. LIMPEZA / DESCONEXÃO (SAÍDA DA LIVE)
 * Remove ou limpa registro do usuário ao fechar a stream.
 */
router.post("/api/live/leave", async (req, res) => {
    try {
        const { username } = req.body;
        await LiveUser.deleteOne({ username });
        res.status(200).json({ success: true, message: "Usuário removido da lista ao vivo." });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
```

---

## 4. Integração no Frontend (Modal de Convite)

Ao abrir o modal de Co-host no seu aplicativo frontend, em vez de dados simulados, você pode agora puxar a lista em tempo real do banco de dados:

```typescript
// Exemplo de chamada no fetch do seu Modal de Convidados:
api.get(`/api/live/online-users?streamId=${streamer.hostId}`)
   .then(res => {
       if (res.data.success) {
           updateOnlineUsersList(res.data.users);
       }
   });
```

E no momento de realizar o convite:
```typescript
const handleSendInvite = async (friendUsername) => {
    const invitePayload = {
        inviterUsername: currentUser.name, // Nome transformado em identificador único
        inviterName: currentUser.name,
        inviteeUsername: friendUsername,
        inviteeName: friendUsername,
        inviteType: "co-host",
        streamId: streamer.hostId
    };
    
    const res = await api.post('/api/live/invite', invitePayload);
    if(res.data.success) {
        addToast(ToastType.Success, "Convite enviado com sucesso!");
    }
};
```
