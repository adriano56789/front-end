# AGENTS.md — LiveGo

LiveGo é uma plataforma de live streaming com frontend React (Vite, TypeScript), backend Node/Express/MongoDB, wrapper Android WebView e container Docker para SRS (mídia).

## Estrutura do repositório

- **Raiz** — frontend React (Vite, TypeScript, ESNext/bundler). `tsconfig.json` com `noEmit: true`, path alias `@/*` e `@services/*`.
- **`backend/`** — servidor Express (CommonJS, TypeScript compilado com `tsc`). `tsconfig.json` próprio com `module: CommonJS`, `outDir: ./dist`.
- **`android/`** — wrapper WebView do APK. Não misturar código com web/backend.
- **`services/`** — serviços do frontend (api.ts, whipPublishService.ts, webrtcService.ts, socket.ts).
- **`src/services/`** — serviços auxiliares do frontend (config, protobuf).
- **`srs/`** — Dockerfile + `conf/docker.conf` do SRS media server.
- **`rules/`** — regras de desenvolvimento (consultar antes de criar componentes/APIs/coleções novas).

## Comandos essenciais

| Comando | Local | O que faz |
|---|---|---|
| `npm run dev` | raiz | Vite dev server (porta 5173, HMR desligado) |
| `npm run dev` | `backend/` | nodemon + ts-node (porta 3000) |
| `npm run build` | `backend/` | tsc → CommonJS para `dist/` |
| `npm start` | `backend/` | node `dist/server.js` (produção) |
| `npm run dev:fast` | `backend/` | alternativa via `dev.js` |
| `docker compose up -d` | raiz | Sobe SRS |

Não há comandos de lint, typecheck ou teste configurados em `package.json`.

## Arquitetura de streaming (WHIP + RTMP + HLS)

### Publicação (Publisher)

| Plataforma | Protocolo | Destino |
|---|---|---|
| **Browser** | WHIP (WebRTC-HTTP Ingestion) via `RTCPeerConnection` | SRS UDP (`:8000`) |
| **Android** | RTMP via HaishinKit | SRS RTMP (`:1935`) |

Fluxo browser:

```
Browser getUserMedia → PublishEngine (headless WHIP) → POST /api/rtc/v1/whip/ (nginx → SRS :1985)
  → SRS responde HTTP 201 + SDP answer + resourceUrl
    → RTCPeerConnection envia media via SRTP/UDP direto para SRS :8000
    → ICE monitor (disconnected 3s/failed/immediate) + reconnect (3 retries 1s/2s/4s)
    → Metrics monitor (bitrate, packet loss, frames dropped)
```

Nginx faz proxy de `/rtc/` → SRS HTTP API (`:1985`) para evitar mixed content.

### Playback (Viewer)

O espectador assiste via `components/LivePlayer.tsx`:

```
HLS: /api/video/http/live/{streamId}.m3u8 → backend proxy → SRS :8080
FLV: /api/video/http/live/{streamId}.flv → backend proxy → SRS :8080
```

Backend WebSocket usado **apenas** para chat, eventos, protobuf e notificações — vídeo nunca passa pelo backend.

Callbacks do SRS batem em `/api/srs/*` (ex.: `/api/srs/publish`, `/api/srs/play`) — estas rotas têm exceção no middleware global de bloqueio Base64.

## Configurações de rede

- **SRS HTTP API**: `72.60.249.175:1985`
- **SRS WebRTC (UDP)**: `72.60.249.175:8000`
- **SRS RTMP**: porta 1935
- **SRS HLS/FLV (HTTP)**: porta 8080
- **Backend**: porta 3000 (API) e 3001 (WebSocket separado)
- **Frontend**: porta 5173

## Middleware importantes

- Middleware global em `/api` bloqueia URLs Base64, **exceto** rotas começando com `/api/srs/` (necessário para callbacks do SRS).
- `validateIdsStrictly` está **desabilitado globalmente** (comentado) — causa falso positivo `MONGODB_ID_EXPOSED`.
- CORS configurado para múltiplas origens incluindo `https://livego.store` e IPs locais.

## Serviços do frontend (`services/`)

| Arquivo | Responsabilidade |
|---|---|
| `api.ts` | ~1935 linhas. Cliente HTTP central com fetch + axios. Contém todas as chamadas de API. |
| `webrtcService.ts` | Gerencia PeerConnection, SDP offer/answer, ICE (apenas playback). |
| `PublishEngine.ts` | Engine headless de publish WHIP com state machine, ICE monitor, reconnect, metrics. |
| `whipPublishService.ts` | Adaptador público que wrappa PublishEngine (API compatível com fluxo anterior). |
| `socket.ts` | Conexão Socket.IO-client. |
| `streamService.ts` | Lógica de gerenciamento de stream. |

## Serviços do backend (`backend/src/services/`)

| Arquivo | Responsabilidade |
|---|---|
| `srsService.ts` | Comunica com SRS HTTP API (`:1985/rtc/v1/publish`, `:1985/rtc/v1/play`, `:1985/rtc/v1/stop`). |
| `protobuf/ProtobufService.ts` | Serialização binária (protobufjs) no backend. |
| `VirtualIPManager.ts` | Salas virtuais e IPs virtuais para streams. |
| `ActivityEventService.ts` | Eventos de atividade em tempo real. |

## Convenções e restrições

- **Não criar** novos componentes, APIs, services, controllers ou models sem aprovação explícita.
- **Não usar** `_id` do MongoDB como ID público — usar sempre o campo `id` customizado.
- **Não misturar** código entre `android/` e o resto do projeto. A comunicação é exclusivamente via API HTTP.
- **Dados reais apenas**: sem mocks, sem dados fake, sem respostas simuladas.
- **Sempre seguir** documentação oficial do SRS para endpoints e payloads (`/rtc/v1/whip/`, `/rtc/v1/whep/`).
- **Fluxo obrigatório**: Preview → API StartLive → WHIP Publish. Nunca publicar antes da API.
- **ICE servers** vazio — SRS resolve candidatos via `candidate` no `rtc_server`.
- **Protobuf** é usado para serialização binária de eventos de live (tanto frontend quanto backend).
- **Token de autenticação** fica apenas em memória (`api.ts:authToken`), sem localStorage.
- Variáveis de ambiente: `.env` (dev), `.env.development`, `.env.prod`.

## Protocolo de trabalho

1. Analisar backend → banco → identificar lacunas
2. Consultar usuário antes de criar qualquer coisa nova
3. Implementar **uma única coisa** por vez
4. Parar e validar antes de continuar
5. Se houver dúvida: **perguntar antes de implementar**
