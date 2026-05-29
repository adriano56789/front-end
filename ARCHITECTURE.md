# Arquitetura LiveGo — Documentação Completa

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Estrutura do Repositório](#2-estrutura-do-repositório)
3. [Docker & Containers](#3-docker--containers)
4. [Nginx & Proxy Reverso](#4-nginx--proxy-reverso)
5. [SRS — Media Server](#5-srs--media-server)
6. [Coturn — STUN/TURN](#6-coturn--stunturn)
7. [MongoDB & Bootstrap](#7-mongodb--bootstrap)
8. [Backend — Express API](#8-backend--express-api)
9. [Frontend — React/Vite](#9-frontend--reactvite)
10. [WebRTC — Fluxo Completo](#10-webrtc--fluxo-completo)
11. [HLS & HTTP-FLV](#11-hls--http-flv)
12. [Player Interno (LivePlayer)](#12-player-interno-liveplayer)
13. [Fluxo Broadcaster](#13-fluxo-broadcaster)
14. [Fluxo Espectador](#14-fluxo-espectador)
15. [APIs da Plataforma](#15-apis-da-plataforma)
16. [WebSocket & Realtime](#16-websocket--realtime)
17. [Callbacks do SRS](#17-callbacks-do-srs)
18. [Autenticação](#18-autenticação)
19. [Uploads & Avatares](#19-uploads--avatares)
20. [Variáveis de Ambiente](#20-variáveis-de-ambiente)
21. [Volumes & Persistência](#21-volumes--persistência)
22. [Deploy na VPS](#22-deploy-na-vps)
23. [SSL & Certbot](#23-ssl--certbot)
24. [Firewall & Portas](#24-firewall--portas)
25. [Monitoramento & Logs](#25-monitoramento--logs)
26. [Troubleshooting](#26-troubleshooting)
27. [Comandos Úteis](#27-comandos-úteis)

---

## 1. Visão Geral

LiveGo é uma plataforma completa de live streaming com:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + MongoDB
- **Mídia**: SRS (Simple Realtime Server) para WebRTC/RTMP/HLS/FLV
- **NAT**: Coturn para STUN/TURN
- **Proxy**: Nginx como reverso + SSL
- **Infra**: Docker Compose com 6 containers

### Domínios

| Domínio | Função | SSL |
|---|---|---|
| `livego.store` | Frontend (React) + assets | Let's Encrypt |
| `api.livego.store` | Backend API + WebSocket + uploads | Let's Encrypt |

### IP do Servidor

`72.60.249.175` — VPS principal, todos os serviços.

### Portas Públicas

| Porta | Serviço | Protocolo | Finalidade |
|---|---|---|---|
| 80 | nginx | TCP | Redireciona para HTTPS |
| 443 | nginx | TCP | Frontend + API + WebSocket |
| 1935 | SRS | TCP | RTMP ingest (OBS/FFmpeg) |
| 1985 | SRS | TCP | HTTP API (WebRTC signaling) |
| 8080 | SRS | TCP | HLS/FLV direto (uso interno) |
| 8000 | SRS | UDP | WebRTC media |
| 3478 | coturn | TCP+UDP | STUN/TURN |
| 49152-65535 | coturn | UDP | Relay TURN |
| 3000 | backend | TCP | API (via nginx) |
| 3001 | backend | TCP | WebSocket (via nginx) |
| 27017 | mongodb | TCP | Banco (interno Docker) |

---

## 2. Estrutura do Repositório

```
livego/
├── docker-compose.yml       # Orquestração de 6 containers
├── .env                     # Variáveis de desenvolvimento local
├── .env.prod                # Variáveis de produção
├── .dockerignore            # Exclusões do build Docker
├── Dockerfile               # (removido — o nginx cobre frontend)
├── DEPLOY.md                # Guia de deploy
├── deploy.sh                # Script de deploy automático
├── AGENTS.md                # Instruções para IA
├── ARCHITECTURE.md          # Esta documentação
│
├── backend/                 # Express API (TypeScript → CommonJS)
│   ├── Dockerfile           # Multi-stage: build → runtime
│   ├── docker-entrypoint.sh # Init uploads + start server
│   ├── .dockerignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts        # Entrypoint Express + WebSocket
│   │   ├── config/db.ts     # Conexão MongoDB
│   │   ├── routes/          # 52 arquivos de rota
│   │   │   ├── liveRoutes.ts        # Streaming (10k linhas)
│   │   │   ├── videoStreamRoutes.ts # Proxy HLS/FLV
│   │   │   ├── srsRoutes.ts         # Callbacks SRS
│   │   │   └── (49 outros)
│   │   ├── services/
│   │   │   ├── srsService.ts        # Comunicação SRS API
│   │   │   ├── protobuf/            # Serialização binária
│   │   │   └── VirtualIPManager.ts
│   │   ├── models/
│   │   │   ├── Streamer.ts          # Modelo de stream
│   │   │   └── User.ts              # Modelo de usuário
│   │   └── middleware/
│   │       ├── auth.ts              # JWT
│   │       └── blockBase64.ts       # Base64 blocker
│   ├── uploads/             # Avatares (copiado para o container)
│   └── scripts/
│       └── init-db.sh       # Bootstrap do MongoDB
│
├── nginx/                   # (submódulo)
│   ├── Dockerfile           # Multi-stage: frontend build + nginx
│   └── conf/
│       ├── livego-integrated.conf  # Config principal
│       ├── frontend.conf           # Config alternativa
│       └── mime.types              # Tipos MIME
│
├── srs/                     # (submódulo — github.com/adriano56789/srs)
│   ├── Dockerfile           # Build SRS do código fonte
│   └── trunk/conf/
│       └── docker.conf      # Config SRS LiveGo
│
├── coturn/                  # (submódulo — github.com/adriano56789/coturn)
│   └── docker/coturn/
│       └── turnserver.conf  # Config Coturn
│
├── coturn.conf              # Montado no container Coturn
│
├── api.json/                # Seed data do MongoDB
│   ├── api.users.json
│   ├── api.streamers.json
│   ├── api.gifts.json
│   └── (20 arquivos no total)
│
├── services/                # Frontend services
│   ├── api.ts               # Cliente HTTP (~1935 linhas)
│   ├── webrtcService.ts     # WebRTC PeerConnection
│   ├── srsService.ts        # URL helpers
│   ├── iceManagerService.ts # STUN/TURN config
│   ├── socket.ts            # Socket.IO client
│   ├── stunService.ts       # STUN test
│   └── turnService.ts       # TURN test
│
├── components/              # Frontend React components
│   ├── LivePlayer.tsx       # Player HLS + WebRTC fallback
│   ├── StreamRoom.tsx       # Sala da live
│   └── (60+ componentes)
│
└── src/                     # Frontend source
    ├── components/StreamRoom.tsx
    ├── config/environment.ts # Detecção de ambiente
    └── services/protobuf/   # Protobuf frontend
```

---

## 3. Docker & Containers

### docker-compose.yml — 6 serviços

```yaml
services:
  mongodb:    # Banco de dados
  init-db:    # Bootstrap one-shot (só executa uma vez)
  backend:    # API Express
  nginx:      # Proxy reverso + frontend
  srs:        # Media server (build local)
  coturn:     # STUN/TURN (imagem oficial)
```

### Dockerfiles

| Dockerfile | Base | O que faz |
|---|---|---|
| `backend/Dockerfile` | `node:20-alpine` | Compila TypeScript → CommonJS, copia uploads, entrypoint |
| `nginx/Dockerfile` | `node:20-alpine` + `nginx:alpine` | Stage 1: build React. Stage 2: nginx + config + dist |
| `srs/Dockerfile` | `ossrs/srs:ubuntu20` + `ubuntu:focal` | Build SRS do código fonte |
| `coturn` | `coturn/coturn:latest` (imagem oficial) | Imagem pronta, usa `coturn.conf` montado |

### Rede Docker

Todos os serviços compartilham a rede `livego-network` (bridge). A comunicação interna usa nomes dos serviços:

```
nginx    → backend:3000   (API)
nginx    → backend:3001   (WebSocket)
backend  → mongodb:27017  (banco)
backend  → srs:1985       (WebRTC signaling)
srs      → coturn:3478    (TURN relay)
```

### Inicialização (dependências)

```
mongodb (healthy)
    ↓
init-db (service_completed_successfully)
    ↓
backend (healthy)
    ↓
nginx
```

O SRS e Coturn sobem em paralelo (sem dependência do backend).

---

## 4. Nginx & Proxy Reverso

### Config: `nginx/conf/livego-integrated.conf`

**Servidor HTTP (porta 80):**
- Todos os domínios → redireciona 301 para HTTPS

**Servidor `livego.store` (porta 443):**
- `/` → serve frontend React de `/var/www/livego/dist`
- `/uploads/` → proxy para `backend:3000`
- `/health` → health check

**Servidor `api.livego.store` (porta 443):**
- `/api/` → proxy para `backend:3000` (inclui `/api/video/http/live/*`)
- `/socket.io/` → proxy WebSocket para `backend:3001`
- `/uploads/` → proxy para `backend:3000` (express.static)
- `/health` → health check

### Content-Security-Policy

```
default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';
img-src 'self' https: data: blob:;
style-src 'self' https: 'unsafe-inline';
script-src 'self' https: 'unsafe-inline' 'unsafe-eval';
connect-src 'self' https: ws: wss:;
```

### Editar config sem rebuild

```bash
nano nginx/conf/livego-integrated.conf
docker compose exec nginx nginx -s reload
```

---

## 5. SRS — Media Server

### Repositório

`https://github.com/adriano56789/srs.git` (branch `develop`) — submódulo em `srs/`

### Config: `srs/trunk/conf/docker.conf`

| Módulo | Status | Detalhes |
|---|---|---|
| `rtmp` | ✅ Porta 1935 | Chunk size 60000 |
| `http_api` | ✅ Porta 1985 | CORS on, sem auth (protegido por firewall) |
| `http_server` | ✅ Porta 8080 | CORS on, serve HLS/FLV |
| `rtc_server` | ✅ Porta 8000/udp | `candidate $CANDIDATE`, `api_as_candidates on` |
| `turn_server` | ✅ | `turn:72.60.249.175:3478`, user `turnuser` |
| HLS | ✅ | Fragmentos 10s, janela 60s, cleanup on |
| HTTP FLV | ✅ | Mount `/live/[stream].flv`, fast cache 30 |
| WebRTC | ✅ | `rtmp_to_rtc on`, `rtc_to_rtmp on` (bidirecional) |
| Callbacks | ✅ | 7 hooks: publish, unpublish, play, stop, connect, close, hls |

### Como o SRS é built

```dockerfile
FROM ossrs/srs:ubuntu20 AS build
COPY . /srs
WORKDIR /srs/trunk
RUN ./configure && make && make install

FROM ubuntu:focal
COPY --from=build /usr/local/srs /usr/local/srs
COPY --from=build /usr/local/bin/ffmpeg /usr/local/srs/objs/ffmpeg/bin/ffmpeg
CMD ["./objs/srs", "-c", "conf/docker.conf"]
```

A primeira build demora ~15 minutos (compila C do zero). Depois o cache do Docker acelera.

### CANDIDATE (ICE)

O SRS usa `candidate $CANDIDATE` que lê da env var `CANDIDATE=72.60.249.175`. Este é o IP público que o navegador usa para conectar via WebRTC. Também configurado:

- `api_as_candidates on` — oferece o hostname da API como candidate extra
- `turn_server` — relay TURN via Coturn se UDP direto falhar

### Editar config sem rebuild

```bash
nano srs/trunk/conf/docker.conf
docker compose restart srs
```

---

## 6. Coturn — STUN/TURN

### Config: `coturn.conf`

```
listening-port=3478
relay-ip=72.60.249.175
external-ip=72.60.249.175
realm=livego
static-auth-secret=cduPU3djAxZ1pyyg
fingerprint
lt-cred-mech
```

Usa a imagem oficial `coturn/coturn:latest`. Config montada como volume.

### Como o ICE é configurado no frontend

`services/iceManagerService.ts` gera a configuração:

```javascript
iceServers: [
  { urls: 'stun:72.60.249.175:3478' },
  { urls: 'turn:72.60.249.175:3478', username: 'turnuser', credential: 'cduPU3djAxZ1pyyg' }
]
```

Política de transporte:
- Mobile (Android/iOS): `relay` (força TURN)
- Firefox: `relay` (força TURN)
- Chrome desktop: `all` (tenta UDP direto primeiro)

---

## 7. MongoDB & Bootstrap

### Container

Imagem `mongo:7` com volume `mongodb-data` para persistência.

### Credenciais

| Usuário | Senha | Database | Finalidade |
|---|---|---|---|
| `admin` (root) | `adriano123` | `admin` | Apenas init-db |
| `livego` (app) | `adriano123` | `api` | Backend (sempre) |

### Bootstrap (init-db)

Serviço one-shot `init-db` que executa `backend/scripts/init-db.sh`:

1. Conecta como root usando `mongosh`
2. Verifica se o usuário `livego` já existe no database `api`
3. Se não existe:
   a. Cria o usuário `livego` com role `readWrite` + `dbAdmin` no database `api`
   b. Importa todos os arquivos `api.json/*.json` via `mongoimport`
4. Se já existe: sai imediatamente (pula importação)

### Seed Data (`api.json/`)

20 arquivos JSON no formato de array MongoDB:

| Arquivo | Collection | Conteúdo |
|---|---|---|
| `api.users.json` | `users` | Usuário `98501723` (adriano) |
| `api.streamers.json` | `streamers` | Streams do usuário |
| `api.gifts.json` | `gifts` | 200 gifts |
| `api.orders.json` | `orders` | 44 pedidos |
| `api.gifttransactions.json` | `gifttransactions` | 22 transações |
| `api.frames.json` | `frames` | 9 frames de avatar |
| `api.beautyeffects.json` | `beautyeffects` | Efeitos de beleza |
| `api.profilephotos.json` | `profilephotos` | Fotos de perfil |
| ... (12 arquivos menores) | ... | Configs diversas |

---

## 8. Backend — Express API

### Tecnologias

- Node.js 20 + TypeScript (compilado para CommonJS)
- Express 4
- Mongoose 8
- Socket.IO 4
- JWT (jsonwebtoken)
- Helmet (segurança)
- Protobuf.js (serialização binária)

### Estrutura

```
backend/src/
├── server.ts              # Entrypoint (1447 linhas)
├── config/db.ts           # Conexão MongoDB
├── routes/                # 52 roteadores
│   ├── liveRoutes.ts      # Streaming (~10060 linhas)
│   ├── videoStreamRoutes.ts # Proxy HLS/FLV
│   ├── srsRoutes.ts       # Callbacks SRS
│   ├── userRoutes.ts      # Usuários
│   ├── authRoutes.ts      # Autenticação
│   └── (47 outros)
├── services/              # 13 serviços
│   ├── srsService.ts      # Comunicação SRS
│   ├── protobuf/          # Protobuf
│   ├── VirtualIPManager.ts
│   ├── ActivityEventService.ts
│   └── CrudService.ts
├── models/                # Schemas Mongoose
│   ├── Streamer.ts        # Stream
│   ├── User.ts            # Usuário
│   └── (40+ modelos)
├── middleware/
│   ├── auth.ts            # JWT verification
│   └── blockBase64.ts     # Base64 blocker
└── scripts/               # Scripts de manutenção
    ├── init-db.sh         # Bootstrap banco
    └── update-stream-urls.js # Atualizar URLs
```

### Proxy HLS/FLV

`backend/src/routes/videoStreamRoutes.ts` — Rota `GET /api/video/http/live/:filename`

```
Requisição: GET https://api.livego.store/api/video/http/live/98501723.m3u8
  → Backend fetch http://72.60.249.175:8080/live/98501723.m3u8
  → Re-escreve URLs .ts no playlist para passarem pelo proxy
  → Responde com Content-Type correto e CORS headers
```

Isso resolve Mixed Content (browser bloqueia HTTP vindo de HTTPS).

### Serviço SRS (backend)

`backend/src/services/srsService.ts` — Singleton `srsService`:

| Método | Endpoint SRS | Descrição |
|---|---|---|
| `publish(streamUrl, sdp)` | `POST :1985/rtc/v1/publish` | WebRTC publish |
| `play(streamUrl, sdp)` | `POST :1985/rtc/v1/play` | WebRTC play |
| `stop(sessionId)` | `DELETE :1985/rtc/v1/stop` | Encerrar sessão |

Usa `process.env.SRS_HOST` (configurável), sanitiza SDP removendo apenas `extmap-allow-mixed`.

---

## 9. Frontend — React/Vite

### Tecnologias

- React 19 + TypeScript
- Vite 6 (bundler)
- hls.js (player HLS)
- Socket.IO Client
- Styled Components
- React Router DOM 7
- Axios + Fetch

### Serviços do Frontend (`services/`)

| Arquivo | Linhas | Responsabilidade |
|---|---|---|
| `api.ts` | ~1935 | Cliente HTTP central |
| `webrtcService.ts` | 329 | PeerConnection WebRTC |
| `srsService.ts` | 174 | URL helpers |
| `iceManagerService.ts` | 275 | ICE config |
| `socket.ts` | - | Socket.IO client |
| `stunService.ts` | 185 | STUN test |
| `turnService.ts` | 217 | TURN test |
| `streamService.ts` | - | Gerenciamento de stream |

### Componentes Principais

| Componente | Caminho | Função |
|---|---|---|
| `LivePlayer` | `components/LivePlayer.tsx` | Player HLS + WebRTC fallback |
| `StreamRoom` | `components/StreamRoom.tsx` | Sala da live (broadcaster/viewer) |
| `MainScreen` | `components/MainScreen.tsx` | Lista de streams |
| `FooterNav` | `components/FooterNav.tsx` | Navegação inferior |
| `GoLiveScreen` | `components/GoLiveScreen.tsx` | Tela de iniciar live |

---

## 10. WebRTC — Fluxo Completo

### Publish (Broadcaster → SRS)

```
1. Browser: getUserMedia({ video, audio }) → localStream
2. new RTCPeerConnection(iceConfig)   # ICE do iceManagerService
3. pc.addTrack(localStream tracks)
4. pc.createOffer() → SDP offer
5. api.srsPublish(streamUrl, sdp, streamId, userId)
   → POST /api/streams/rtc/v1/publish
   Body: { streamId, userId, sdp, type: "offer" }
6. Backend: srsService.publish(webrtc://srs/live/{streamId}, sdp)
   → POST http://72.60.249.175:1985/rtc/v1/publish
7. SRS responde SDP answer
8. pc.setRemoteDescription(answer) → WebRTC UP
```

### Play (Espectador ← SRS)

```
1. new RTCPeerConnection(iceConfig)
2. pc.addTransceiver('audio'), pc.addTransceiver('video')
3. pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
4. api.srsPlay(streamUrl, sdp, streamId, userId)
   → POST /api/streams/rtc/v1/play
5. Backend: srsService.play(webrtc://srs/live/{streamId}, sdp)
   → POST http://72.60.249.175:1985/rtc/v1/play
6. SRS responde SDP answer
7. pc.setRemoteDescription(answer) → WebRTC UP
8. Retorna MediaStream → video.srcObject = stream
```

### ICE Candidates

O SRS responde no SDP answer com:
- `candidate 72.60.249.175 8000 typ host` (UDP direto)
- Candidates do TURN se UDP falhar
- `api_as_candidates on` adiciona `api.livego.store` como candidate extra

---

## 11. HLS & HTTP-FLV

### Geração (SRS)

Quando um stream é publicado via WebRTC/RTMP, o SRS gera automaticamente:

```
HLS: http://72.60.249.175:8080/live/{streamId}.m3u8
     + segmentos .ts em http://72.60.249.175:8080/live/{streamId}-{seq}.ts

FLV: http://72.60.249.175:8080/live/{streamId}.flv
```

### Proxy (Backend → Navegador)

Para evitar mixed content, o backend faz proxy:

```
Navegador HTTPS:
  https://api.livego.store/api/video/http/live/{streamId}.m3u8
  ↓
Backend GET /api/video/http/live/:filename
  ↓ fetch
SRS HTTP: http://72.60.249.175:8080/live/{filename}
  ↓
Backend reescreve URLs .ts no .m3u8 para passarem pelo proxy
  ↓
Resposta HTTPS com headers CORS
```

### URLs no Banco

```javascript
hlsUrl:      "https://api.livego.store/api/video/http/live/98501723.m3u8"
flvUrl:      "https://api.livego.store/api/video/http/live/98501723.flv"
playbackUrl: "https://api.livego.store/api/video/http/live/98501723.flv"
webrtcUrl:   "webrtc://72.60.249.175:8000/live/98501723"
```

---

## 12. Player Interno (LivePlayer)

### Componente: `components/LivePlayer.tsx`

Estratégia de reprodução:

```
playStreamWithFallback():
  1. Tenta HLS:
     a. Safari/iOS: player nativo (video.src = url)
     b. Chrome/Firefox/Android: hls.js
        - enableWorker: true
        - lowLatencyMode: true
        - manifestLoadingMaxRetry: 10
     c. Se MANIFEST_PARSED → video.play() → resolve Promise

  2. Se HLS falhar (Promise rejeitada) → WebRTC:
     a. Extrai streamId da URL HLS
     b. Importa webRTCService singleton
     c. svc.playStream(streamId)
     d. video.srcObject = stream
     e. video.play()
```

### Props

```typescript
interface LivePlayerProps {
  url?: string;              // URL HLS
  isBroadcaster?: boolean;   // Se é o próprio broadcaster
  userId?: string;           // ID do usuário (para WebRTC)
  onPlaying?: () => void;    // Callback quando começar a tocar
  onError?: () => void;      // Callback quando falhar
}
```

### Eventos

- `onPlaying` → StreamRoom chama `setIsVideoPlaying(true)` (esconde cover)
- `onError` → StreamRoom chama `setIsVideoPlaying(false)` (mostra cover)

---

## 13. Fluxo Broadcaster

### "Iniciar Transmissão" — Passo a passo

```
1. [FooterNav] Usuário clica "Go Live"
2. [App.tsx] handleOpenGoLive() → setIsGoLiveOpen(true)
3. [GoLiveScreen] Renderiza com preview da câmera (getUserMedia)
4. [GoLiveScreen] Usuário preenche título, categoria, etc.
5. [GoLiveScreen] Clica "Iniciar Transmissão"
6. [useStreamManager.initiateStream()]
   a. POST /api/streams → Cria/reativa stream no MongoDB
      Response: { stream: { id, hlsUrl, webrtcUrl, ... } }
   b. startWebRTCPublish(stream.id)
      - Pega MediaStream da câmera
      - Cria PeerConnection com ICE do Coturn
      - Cria SDP offer
      - api.srsPublish() → POST /api/streams/rtc/v1/publish
      - Backend proxy → SRS :1985/rtc/v1/publish
      - SDP answer → setRemoteDescription
      - WebRTC UP
   c. onStartStream(streamer) → App.tsx
7. [App.tsx] handleStartStream()
   - setIsGoLiveOpen(false)
   - setActiveStream(streamer) → renderiza StreamRoom
   - StreamRoom mostra LivePlayer com hlsUrl
8. [SRS] Gera HLS em /live/{streamId}.m3u8
9. [SRS] Dispara callback on_publish → POST /api/srs/publish
```

---

## 14. Fluxo Espectador

### "Assistir Live" — Passo a passo

```
1. [MainScreen] Usuário clica no card da live
2. [App.tsx] handleSelectStream(streamer)
   - setActiveStream(streamer)
   - startLiveSession(streamer)
3. [StreamRoom] Renderiza com LivePlayer
   - getStreamUrl(): usa hlsUrl do streamer (prioridade) ou constrói fallback
   - <LivePlayer url={hlsUrl} userId={currentUser.id} />
4. [LivePlayer] playStreamWithFallback()
   a. Tenta HLS via hls.js
      → https://api.livego.store/api/video/http/live/{id}.m3u8
      → Backend proxy → SRS :8080
   b. Se falhar → fallback WebRTC
      → api.srsPlay() → POST /api/streams/rtc/v1/play
      → Backend proxy → SRS :1985/rtc/v1/play
      → video.srcObject = MediaStream
5. [StreamRoom] onPlaying → setIsVideoPlaying(true) → esconde cover
```

---

## 15. APIs da Plataforma

### Streaming

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/streams` | Criar/reativar stream |
| POST | `/api/streams/:id/start` | Iniciar transmissão |
| POST | `/api/streams/:id/end` | Encerrar transmissão |
| POST | `/api/streams/rtc/v1/publish` | WebRTC publish (proxy SRS) |
| POST | `/api/streams/rtc/v1/play` | WebRTC play (proxy SRS) |
| DELETE | `/api/streams/rtc/v1/stop` | Parar sessão WebRTC |
| POST | `/api/streams/:id/heartbeat` | Heartbeat |
| POST | `/api/streams/:id/like` | Like |
| POST | `/api/streams/:id/gift` | Enviar gift |
| POST | `/api/streams/:id/join` | Entrar na stream |
| POST | `/api/streams/:id/leave` | Sair da stream |
| GET | `/api/video/http/live/:filename` | Proxy HLS/FLV |

### SRS Callbacks

| Método | Rota | Evento SRS |
|---|---|---|
| POST | `/api/srs/publish` | `on_publish` — publisher iniciou |
| POST | `/api/srs/unpublish` | `on_unpublish` — publisher parou |
| POST | `/api/srs/play` | `on_play` — espectador começou |
| POST | `/api/srs/stop` | `on_stop` — espectador parou |
| POST | `/api/srs/connect` | `on_connect` — conexão estabelecida |
| POST | `/api/srs/close` | `on_close` — conexão fechada |
| POST | `/api/srs/hls` | `on_hls` — fragmento HLS gerado |
| POST | `/api/srs/start` | Preparação pré-live com JWT |

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/users/:id` | Perfil do usuário |
| PUT | `/api/users/:id` | Atualizar perfil |

### Saúde

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Health check da API |
| GET | `/health` | Health check do Nginx |

---

## 16. WebSocket & Realtime

### Socket.IO (porta 3001)

Dois servidores WebSocket separados:

1. **Principal** (porta 3000, mesmo processo HTTP):
   - `join_stream` — entrar na stream
   - `send_chat_message` — enviar mensagem
   - `send_gift` — enviar gift
   - `user_followed` / `user_unfollowed` — follow
   - `heartbeat` — keepalive
   - Eventos de sala virtual

2. **Separado** (porta 3001, Socket.IO puro):
   - Eventos binários (protobuf)
   - `binfo` — informações da stream (resposta binária)

### Conexão

```
Browser → wss://api.livego.store/socket.io/
  → Nginx upgrade → backend:3001
```

---

## 17. Callbacks do SRS

O SRS notifica o backend sobre eventos via HTTP POST em `/api/srs/*`.

### Middleware de exceção

Em `server.ts` (linha 146-149):

```javascript
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/srs/')) {
        return next();  // Pula blockBase64
    }
    blockBase64Middleware(req, res, (err) => {
        if (err) return next(err);
        next();
    });
});
```

Rotas `/api/srs/*` têm exceção no middleware de bloqueio Base64 porque o SRS pode enviar payloads com dados binários.

### Formato do callback SRS

```json
POST /api/srs/publish
{
  "action": "on_publish",
  "client_id": "xxx",
  "ip": "72.60.249.175",
  "vhost": "__defaultVhost__",
  "app": "live",
  "stream": "98501723",
  "param": "",
  "tcUrl": "rtmp://72.60.249.175:1935/live"
}

Resposta esperada: { "code": 0 }
```

---

## 18. Autenticação

### JWT

- Token armazenado APENAS em memória (variável `authToken` em `api.ts`)
- Sem localStorage ou cookies
- Gerado no login via `POST /api/auth/login`
- Enviado no header `Authorization: Bearer <token>`

### Middleware

`getUserIdFromToken(req)` extrai o `id` do payload JWT. Usado em todas as rotas protegidas.

---

## 19. Uploads & Avatares

### Diretório

`backend/uploads/avatars/` — 31 arquivos `.avif` de avatar.

### Persistência (Docker)

Dentro do container, o volume `uploads-data` é montado em `/app/uploads` no backend e em `/var/www/livego/uploads` no nginx.

### Entrypoint

No primeiro start com volume vazio, `docker-entrypoint.sh` copia os avatares de `/app/uploads-backup/` (built-in da imagem) para `/app/uploads/volume` (volume persistente). Em reinicializações, mantém os dados existentes.

### URLs

```
https://api.livego.store/uploads/avatars/avatar_xxx.avif
  → Nginx proxy → backend:3000
  → express.static → /app/uploads/avatars/avatar_xxx.avif
```

---

## 20. Variáveis de Ambiente

### `.env.prod`

| Variável | Valor | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Ambiente |
| `PORT` | `3000` | Porta da API |
| `MONGODB_URI` | `mongodb://livego:...@mongodb:27017/api?authSource=api` | Conexão MongoDB |
| `MONGODB_USER` | `livego` | Usuário do banco |
| `MONGODB_PASSWORD` | `adriano123` | Senha do banco |
| `MONGODB_ROOT_USER` | `admin` | Root do banco (init apenas) |
| `MONGODB_ROOT_PASSWORD` | `adriano123` | Senha root |
| `SRS_HOST` | `72.60.249.175` | IP do SRS |
| `CANDIDATE` | `72.60.249.175` | IP para ICE candidates |
| `BACKEND_URL` | `https://api.livego.store` | URL pública da API |
| `FRONTEND_URL` | `https://livego.store` | URL pública do frontend |
| `VITE_SRS_HTTP_URL` | `https://api.livego.store/api/video/http` | URL do proxy HLS (frontend) |
| `JWT_SECRET` | `livego_jwt_secret_...` | Chave JWT |
| `TURN_USERNAME` | `turnuser` | Usuário TURN |
| `TURN_PASSWORD` | `cduPU3djAxZ1pyyg` | Senha TURN |

---

## 21. Volumes & Persistência

### Volumes nomeados

| Volume | Montado em | Persiste |
|---|---|---|
| `mongodb-data` | `mongodb:/data/db` | Dados do MongoDB |
| `uploads-data` | `backend:/app/uploads`, `nginx:/var/www/livego/uploads` | Avatares e uploads |

### Volumes bind mount

| Host | Container | Serviço | Finalidade |
|---|---|---|---|
| `./nginx/conf/livego-integrated.conf` | `/etc/nginx/conf.d/default.conf` | nginx | Config Nginx (`:ro`) |
| `./srs/trunk/conf/docker.conf` | `/usr/local/srs/conf/docker.conf` | srs | Config SRS (`:ro`) |
| `./coturn.conf` | `/etc/coturn/turnserver.conf` | coturn | Config Coturn |
| `/etc/letsencrypt` | `/etc/letsencrypt` | nginx | SSL (`:ro`) |
| `./api.json/` | `/data/api.json/` | init-db | Seed data (`:ro`) |
| `./backend/scripts/init-db.sh` | `/scripts/init-db.sh` | init-db | Script init (`:ro`) |

---

## 22. Deploy na VPS

### Pré-requisitos

```bash
# Ubuntu 20.04+
apt update && apt install -y git docker.io docker-compose-v2 certbot
```

### Passo a passo

```bash
# 1. Clonar
cd /var/www
git clone --recurse-submodules https://github.com/adriano56789/livego.git
cd livego

# 2. Diretório de uploads
mkdir -p /var/www/livego/uploads

# 3. SSL (se não existir)
certbot certonly --standalone -d livego.store -d www.livego.store \
  --email admin@livego.store --agree-tos --non-interactive
certbot certonly --standalone -d api.livego.store \
  --email admin@livego.store --agree-tos --non-interactive

# 4. Subir tudo
docker compose up -d --build
```

### Usando o script automático

```bash
bash deploy.sh
```

O script:
1. Clona/atualiza o repositório
2. Cria diretórios
3. Verifica SSL
4. Builda e sobe containers
5. Aguarda init-db completar
6. Verifica todos os serviços

### Atualizar após git pull

```bash
git pull
git submodule update --recursive
docker compose build --parallel
docker compose up -d
```

---

## 23. SSL & Certbot

### Certificados

```bash
/etc/letsencrypt/live/livego.store/fullchain.pem
/etc/letsencrypt/live/livego.store/privkey.pem
/etc/letsencrypt/live/api.livego.store/fullchain.pem
/etc/letsencrypt/live/api.livego.store/privkey.pem
```

### Renovação automática

O Certbot cria um timer systemd que renova automaticamente. Para testar:

```bash
certbot renew --dry-run
```

Após renovar, recarregar o nginx:

```bash
docker compose exec nginx nginx -s reload
```

---

## 24. Firewall & Portas

### Liberar no firewall (UFW)

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1935/tcp
ufw allow 1985/tcp
ufw allow 8080/tcp
ufw allow 8000/udp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 49152:65535/udp
```

### Portas internas (não precisam de firewall)

- 3000 (backend) — acesso apenas via nginx
- 3001 (WebSocket) — acesso apenas via nginx
- 27017 (MongoDB) — acesso apenas via rede Docker

---

## 25. Monitoramento & Logs

### Logs dos containers

```bash
# Todos os serviços
docker compose logs -f

# Serviço específico
docker compose logs -f backend
docker compose logs -f srs
docker compose logs -f nginx

# Últimas N linhas
docker compose logs --tail=100 backend
```

### Health checks

```bash
# API
curl https://api.livego.store/api/health
# → {"status":"ok","timestamp":"...","uptime":123,"environment":"production"}

# SRS
curl http://localhost:1985/api/v1/versions
# → {"code":0,"server":18029,"version":"7.0.147"}

# Nginx
curl -I https://livego.store
# → 200 OK
```

### Status dos containers

```bash
docker compose ps
docker stats
```

---

## 26. Troubleshooting

### API retorna 404

**Causa**: Backend na VPS não foi rebuildado com as últimas alterações.

**Solução**:
```bash
cd /var/www/livego/backend
git pull
npm run build
pm2 restart livego-backend  # Se estiver rodando via pm2
# OU se estiver rodando via Docker:
docker compose build backend
docker compose up -d backend
```

### WebRTC não conecta (ICE falha)

**Causa**: CANDIDATE incorreto ou porta 8000 bloqueada.

**Solução**:
```bash
# Verificar se o candidate está correto
docker compose exec srs env | grep CANDIDATE
# Deve mostrar: CANDIDATE=72.60.249.175

# Verificar se a porta UDP está aberta
nc -uvz 72.60.249.175 8000

# Verificar logs do SRS
docker compose logs srs | grep -i candidate
```

### HLS não carrega (mixed content)

**Causa**: URL HTTP direta do SRS sendo usada em página HTTPS.

**Solução**: Usar a URL do proxy: `https://api.livego.store/api/video/http/live/{id}.m3u8`

### Conexão MongoDB recusada

**Causa**: MongoDB não iniciou ou credenciais erradas.

**Solução**:
```bash
docker compose logs mongodb
docker compose exec mongodb mongosh mongodb://admin:adriano123@localhost:27017/admin
```

### init-db falha

**Causa**: MongoDB não está saudável ou script com erro.

**Solução**:
```bash
docker compose logs init-db
docker compose exec mongodb mongosh mongodb://admin:adriano123@localhost:27017/admin
# Verificar se o usuário livego foi criado
use api
db.getUsers()
```

### Upload de avatar não funciona

**Causa**: Volume `uploads-data` vazio ou entrypoint não copiou.

**Solução**:
```bash
docker compose exec backend ls -la /app/uploads/avatars/
docker compose logs backend | grep -i upload
```

---

## 27. Comandos Úteis

### Containers

```bash
# Status
docker compose ps

# Logs
docker compose logs -f [serviço]

# Rebuild específico
docker compose build --no-cache srs
docker compose up -d srs

# Reiniciar
docker compose restart nginx

# Recarregar config (sem restart)
docker compose exec nginx nginx -s reload

# Acessar container
docker exec -it livego-backend sh
docker exec -it livego-srs bash
docker exec -it livego-mongodb mongosh mongodb://admin:adriano123@localhost:27017/admin

# Parar tudo
docker compose down

# Parar e limpar volumes
docker compose down -v
```

### Banco

```bash
# Conectar como app user
docker exec -it livego-mongodb mongosh mongodb://livego:adriano123@localhost:27017/api?authSource=api

# Listar coleções
show collections

# Contar documentos
db.users.countDocuments()
db.streamers.countDocuments()

# Verificar usuários do banco
db.getUsers()
```

### SRS

```bash
# Health check
curl http://localhost:1985/api/v1/versions

# Sumário de streams ativas
curl http://localhost:1985/api/v1/summaries

# Verificar candidatos configurados
docker compose logs srs | grep candidate
```

### Git (com submódulos)

```bash
# Clonar com submódulos
git clone --recurse-submodules https://github.com/adriano56789/livego.git

# Atualizar submódulos
git submodule update --init --recursive

# Atualizar submódulos para última versão remota
git submodule update --remote
```

---

## Nota sobre WhatsApp

Não há integração com WhatsApp implementada atualmente no LiveGo. O projeto foca em live streaming via WebRTC/HLS/FLV com SRS. Não foram encontrados serviços, webhooks, APIs ou containers relacionados a WhatsApp no código-fonte. Caso seja necessário adicionar, será uma nova funcionalidade a ser implementada.

---

*Documentação gerada em Maio/2026 — LiveGo v1.0*
