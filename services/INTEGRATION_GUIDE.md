# 🚀 Guia de Integração — Rodadas 2, 3, 4

## Arquitetura da VPS
```
/var/www/livego.store/     ← Frontend (Nginx serve direto, NÃO Docker)
/app/frontend/             ← Backend (roda em Docker)
/app/nginx/                ← Configuração Nginx
/root/srs/                 ← Servidor SRS
```

## Módulos Criados (copiar para /app/frontend/services/)

| Arquivo | Rodada | Função |
|---------|--------|--------|
| `StreamLifecycleManager.ts` | 2a + 2b | Anti-duplicidade + Máquina de estados |
| `StreamEndConsolidator.ts` | 3a | 10 rotas → 1 central + wrappers |
| `ViewerCountManager.ts` | 3b | Unificar contagem de espectadores |
| `SRSReconciler.ts` | 4 | Reconciliar banco vs SRS |

---

## Passo 1: Copiar módulos para o container Docker

```bash
# Na VPS (2.25.192.154)
cd /app/frontend

# Copiar os 4 arquivos
docker cp services/StreamLifecycleManager.ts <container>:/app/services/
docker cp services/StreamEndConsolidator.ts <container>:/app/services/
docker cp services/ViewerCountManager.ts <container>:/app/services/
docker cp services/SRSReconciler.ts <container>:/app/services/
```

## Passo 2: Integrar no server.ts

```typescript
// No topo do server.ts, adicionar imports:
import { StreamLifecycleManager } from './services/StreamLifecycleManager';
import { StreamEndConsolidator } from './services/StreamEndConsolidator';
import { ViewerCountManager } from './services/ViewerCountManager';
import { SRSReconciler } from './services/SRSReconciler';

// Após inicializar o socket (io), criar instâncias:
const lifecycle = new StreamLifecycleManager(io);
const endConsolidator = new StreamEndConsolidator(io, lifecycle);
const viewerManager = new ViewerCountManager(io, onlineUsers, socketToUser);
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);

// Iniciar reconciliação periódica (a cada 60s):
reconciler.start(60000);
```

## Passo 3: Substituir criação de live (Rodada 2a)

```typescript
// ANTES (POST /api/streams):
app.post('/api/streams', async (req, res) => {
  // ... lógica antiga com possibilidade de duplicata
});

// DEPOIS:
app.post('/api/streams', async (req, res) => {
  const result = await lifecycle.createStream(req.body.hostId, req.body);
  res.json(result);
});
```

## Passo 4: Integrar on_publish (Rodada 2a)

```typescript
// Na rota on_publish do SRS:
app.post('/api/srs/on_publish', async (req, res) => {
  const { stream_key } = req.body;
  const result = await lifecycle.onPublish(stream_key, req.body);
  res.json(result);
});
```

## Passo 5: Substituir rotas de encerramento (Rodada 3a)

```typescript
// ANTES — 10+ rotas duplicadas
// DEPOIS — todas delegam para endConsolidator:

app.post('/api/streams/:id/end', async (req, res) => {
  const result = await endConsolidator.handleEndRoute(req.params.id, req.body.userId);
  res.json(result);
});

app.post('/api/streams/:id/end-session', async (req, res) => {
  const result = await endConsolidator.handleEndSession(req.params.id, req.body);
  res.json(result);
});

app.post('/api/streams/:id/leave', async (req, res) => {
  const result = await endConsolidator.handleLeave(req.params.id, req.body.userId);
  res.json(result);
});

app.post('/api/pk/end', async (req, res) => {
  const result = await endConsolidator.handleEndPK(req.body.streamId, req.body.userId);
  res.json(result);
});

app.post('/api/lives/:id/end', async (req, res) => {
  // Alias para compatibilidade
  const result = await endConsolidator.handleEndRoute(req.params.id, req.body.userId);
  res.json(result);
});
```

## Passo 6: Integrar contagem de espectadores (Rodada 3b)

```typescript
// No handleJoinStream (socket join_stream):
async function handleJoinStream(streamId: string) {
  // ... código existente de validação ...
  const counts = await viewerManager.userJoin(streamId, userId, {
    name: userName,
    avatar: userAvatar,
    role: 'visitor',
  });
}

// No disconnect:
socket.on('disconnect', async () => {
  // ... código existente ...
  if (userEntry.streamId) {
    await viewerManager.userLeave(userEntry.streamId, userId);
  }
});

// Substituir onlineUsers.filter() por viewerManager:
// ANTES:
const onlineCount = Array.from(onlineUsers.values())
  .filter(u => u.streamId === streamId).length;

// DEPOIS:
const counts = await viewerManager.getCounts(streamId);
```

## Passo 7: Iniciar reconciliação SRS (Rodada 4)

```typescript
// Após connectDB:
reconciler.start(60000); // a cada 60 segundos

// Endpoint de debug (opcional):
app.get('/api/debug/reconcile', async (req, res) => {
  const result = await reconciler.reconcileNow();
  res.json(result);
});
```

---

## Frontend — api.ts

**NÃO MUDA NADA** no frontend. As rotas antigas continuam funcionando
porque os wrappers delegam para a função central.

O único update no frontend é adicionar o endpoint de status:
```typescript
// Em api.ts (adição, não substituição):
getStreamStatus: (streamId: string) =>
  callApi<{ status: string }>('GET', `/api/streams/${streamId}/status`),
```

---

## Validação Pós-Deploy

```bash
# 1. Verificar se o container compilou sem erros
docker logs <container> --tail 50

# 2. Testar criação de live (anti-duplicidade)
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"hostId":"test123","name":"Test Live"}'

# Chamar novamente — deve retornar a mesma live (reused: true)

# 3. Testar reconciliação
curl http://localhost:3000/api/debug/reconcile

# 4. Verificar logs de reconciliação
docker logs <container> --tail 20 | grep SRS-RECONCILER
```
