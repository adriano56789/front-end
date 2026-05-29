# EMQX Distributed Realtime Architecture

## Visão Geral

EMQX atua como **message broker central** para distribuir eventos em tempo real entre múltiplas instâncias do backend LiveGo. Cada instância se conecta via MQTT (TLS ou plain), publica todos os Socket.IO events no broker e consome eventos de outras instâncias.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instância A  │     │   EMQX      │     │ Instância B  │
│ (BR-SP)      │◄───►│  (MQTT)    │◄───►│ (US-EAST)    │
│              │     │             │     │              │
│ io.emit() ───┤────►│ livego/    │◄────├─── io.emit() │
│ io.to()  ───┤────►│ room/+     │◄────├─── io.to()   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Topologia

- **EMQX** roda como container Docker (`livego-emqx`)
- **Backend** conecta via MQTT (porta 1883 plain / 8883 TLS)
- **Nginx** faz proxy WebSocket `/mqtt/` → EMQX `:8083` para clientes externos que queiram MQTT-over-WS
- **Frontend** continua usando Socket.IO (`/socket.io/` → backend `:3001`) — sem mudanças no cliente

## Monkey-Patch (Proxy Automático)

Em `server.ts`, os métodos `io.emit()` e `io.to().emit()` são substituídos para publicar automaticamente no MQTT:

```typescript
io.emit = (event, ...args) => {
  if (mqttBridge.isConnected()) {
    mqttBridge.publish('livego/global', { event, data: args });
  }
  return origEmit(event, ...args);
};
```

Isso garante que **qualquer** código que chame `io.emit()` ou `io.to().emit()` publique no MQTT — sem necessidade de modificar cada handler individualmente.

### Cobertura do Monkey-Patch

| Método | Coberto? | Notas |
|---|---|---|
| `io.emit(...)` | ✅ | Publica em `livego/global` |
| `io.to(room).emit(...)` | ✅ | Publica em `livego/room/{room}` |
| `socket.emit(...)` | ❌ | Apenas para o socket atual — não precisa distribuir |
| `socket.to(room).emit(...)` | ❌ | Exclui sender; deve publicar explicitamente via `mqttBridge.publish()` |
| `io.except(...).emit(...)` | ❌ | Não implementado |
| `io.to(room).except(...).emit(...)` | ❌ | Não implementado |

## Tópicos MQTT

| Tópico | Direção | Propósito |
|---|---|---|
| `livego/global` | backend → EMQX → backends | Eventos globais (ex.: usuário ficou online) |
| `livego/room/{streamId}` | backend → EMQX → backends | Eventos de sala (chat, gift, join, follow) |
| `livego/user/{userId}` | *futuro* | Eventos direcionados a um usuário específico |
| `livego/health/instance/{instanceId}` | backend → EMQX | Heartbeat (retain, QoS 0) |

## Formato da Mensagem

```json
{
  "topic": "livego/room/abc123",
  "payload": {
    "event": "binary_data",
    "data": [...],
    "binaryBase64": "AAAA..." // se ArrayBuffer
  },
  "instanceId": "livego-backend-a1b2c3d4",
  "timestamp": 1716470400000
}
```

O campo `instanceId` é usado para **deduplicação**: cada instância ignora mensagens que ela própria publicou.

## Deduplicação

```typescript
mqttBridge.subscribe('livego/room/+', (msg) => {
  if (msg.instanceId === mqttBridge.instanceId) return; // ← skip próprio
  io.to(room).emit(msg.payload.event, ...);
});
```

## Dados Binários (Protobuf)

Eventos Protobuf (ArrayBuffer) são convertidos para base64 no MQTT e reconvertidos para Buffer no destino:

```typescript
// Publisher (monkey-patch)
const b64 = Buffer.from(new Uint8Array(args[0])).toString('base64');
mqttBridge.publish(`livego/room/${room}`, { event, binaryBase64: b64, _room: room });

// Consumer (subscribe handler)
const buf = Buffer.from(payload.binaryBase64, 'base64');
io.to(room).emit(payload.event, buf);
```

## Autenticação EMQX

- **Mecanismo**: JWT (HMAC-SHA256)
- **Secret**: `EMQX_JWT_SECRET` (compartilhado entre EMQX e backend)
- **Backend**: gera JWT com `sub: livego-backend`, expiração de 1 ano
- **EMQX**: verifica assinatura do JWT no campo `password` da conexão MQTT

### Configuração EMQX (via env vars)

```yaml
EMQX_AUTHENTICATION__1__ENABLE: "true"
EMQX_AUTHENTICATION__1__MECHANISM: jwt
EMQX_AUTHENTICATION__1__USE_USERNAME_AS_CLIENTID: "true"
EMQX_AUTHENTICATION__1__SECRET: ${EMQX_JWT_SECRET}
EMQX_AUTHENTICATION__1__SECRET_ORIGIN: config
```

## Env Vars

| Variável | Default | Dev | Prod |
|---|---|---|---|
| `EMQX_HOST` | `emqx` | `localhost` | `emqx` |
| `EMQX_TLS` | `false` | `false` | `true` |
| `EMQX_PORT` | `1883` | `1883` | — |
| `EMQX_TLS_PORT` | `8883` | — | `8883` |
| `EMQX_SERVICE_TOKEN` | `livego_mqtt_service_token` | mesmo | mesmo |
| `EMQX_JWT_SECRET` | `livego_mqtt_service_token` | mesmo (`.env`) | mesmo (`.env.prod`) |
| `MQTT_LOG_LEVEL` | `info` | `debug` | `info` |

## Healthcheck

A cada 15s, o backend publica no tópico `livego/health/instance/{instanceId}`:

```json
{
  "status": "alive",
  "uptime": 3600,
  "memory": 209715200
}
```

Mensagem com `retain: true` para que novas instâncias vejam o status das demais.

## Reconnect

Exponential backoff: 1s → 30s (base 1s, multiplicador 2x, max 30s).

## Nginx Proxy (MQTT over WebSocket)

Localização: `/mqtt/` → `http://livego-emqx:8083/mqtt/`

```nginx
location /mqtt/ {
    proxy_pass http://livego-emqx:8083/mqtt/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

## Deploy

### Desenvolvimento (Docker Compose)

```bash
docker compose up -d
```

EMQX sobe com certs auto-assinados (`backend/cert.pem`, `backend/key.pem`), TLS desligado no backend (`EMQX_TLS=false`).

### Produção

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

EMQX usa certs Let's Encrypt, TLS ligado no backend (`EMQX_TLS=true`).

## Verificação

```bash
# EMQX Dashboard
curl -u admin:livego_emqx_prod http://localhost:18083/api/v5/status

# Ver conexão MQTT
docker logs livego-backend | grep MQTT

# Ver healthcheck
docker logs livego-backend | grep heartbeat

# Ver EMQX conexões
docker exec livego-emqx emqx ctl clients show livego-backend
```

## Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| `Cannot publish: not connected` | Backend não conectou ao EMQX | Verificar `docker logs livego-backend \| grep MQTT` |
| `Connection refused` | EMQX não está rodando | `docker compose ps emqx` |
| `JWT verification failed` | Secrets diferentes | Checar `EMQX_JWT_SECRET` no `.env` vs EMQX config |
| Conexões WebSocket `/mqtt/` falham | EMQX WS listener desligado | Verificar `EMQX_LISTENERS__WS__DEFAULT__ENABLE` |
