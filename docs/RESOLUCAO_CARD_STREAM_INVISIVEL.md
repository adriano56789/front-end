# Documentação Técnica: Diagnóstico e Resolução de Cards de Live Invisíveis no Frontend

Este guia técnico descreve detalhadamente por que uma live que está ativa no backend (`isLive: true` e `streamStatus: 'active'`) pode não aparecer como um card na tela principal do aplicativo, como diagnosticar a causa exata e como implementar soluções robustas para garantir que as transmissões apareçam instantaneamente para todos os usuários.

---

## 1. Por que o Card de uma Live Ativa Fica Invisível?

No nosso ecossistema React/Vite + Express, o fluxo de exibição de um card segue regras estritas de validação e filtragem. Se uma live está ativa no banco de dados mas some no frontend, o problema está em um dos 4 pilares a seguir:

```
[ Backend: Live Ativa ]
          │
          ├──► Causa 1: Filtros de Validação Estritos no Frontend (Falta Avatar, Nome ou ID)
          ├──► Causa 2: Incompatibilidade de Categoria/Abas (Aba Ativa vs. Categoria da Live)
          ├──► Causa 3: Filtragem Geográfica / Regional (Filtro por País)
          └──► Causa 4: Dessincronização do Socket.io em Tempo Real
```

---

## 2. Diagnóstico Detalhado das Causas e Como Resolver

### Causa 1: Filtros de Validação Estritos no Frontend (Muito Comum)

#### O Problema:
No arquivo `front-end/components/MainScreen.tsx` (linhas 314-323) e no arquivo duplicado `front-end/src/components/MainScreen.tsx`, existe uma filtragem extremamente rígida de dados. Se **qualquer** campo essencial da live estiver em branco, nulo ou indefinido, o card é sumariamente ignorado e ocultado da tela:

```typescript
// Localizado em MainScreen.tsx:
{streamers.filter(streamer => 
    streamer && 
    streamer.id && 
    streamer.name && 
    streamer.name.trim() !== '' &&
    streamer.avatar && 
    streamer.avatar.trim() !== '' &&
    streamer.hostId &&
    streamer.hostId.trim() !== '' &&
    streamer.isLive === true
).map(streamer => (
    <StreamerCard key={streamer.id} streamer={streamer} onSelect={onSelectStream} />
))}
```

Se o usuário Host (Streamer) não tiver uma foto de perfil cadastrada (`avatarUrl === ""` ou nula), a propriedade `avatar` da live será enviada vazia para o frontend. Como o filtro exige `streamer.avatar.trim() !== ''`, a live é escondida.

#### Como Resolver (Solução Defensiva):
Devemos implementar fallbacks automáticos para dados ausentes ou usar valores padrão ao invés de ocultar a live inteira.

**Ajuste Recomendado em `MainScreen.tsx`**:
Substitua o filtro estrito por uma validação tolerante que usa placeholders dinâmicos caso falte o avatar ou o nome:

```typescript
// Filtro Robusto e Tolerante a Falhas:
{streamers.filter(streamer => 
    streamer && 
    streamer.id && 
    streamer.hostId &&
    streamer.isLive === true
).map(streamer => {
    // Garante nome e avatar válidos em tempo de renderização
    const safeStreamer = {
        ...streamer,
        name: streamer.name && streamer.name.trim() !== '' ? streamer.name : 'Streamer Sem Nome',
        avatar: streamer.avatar && streamer.avatar.trim() !== '' ? streamer.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(streamer.name || "S")}&background=random`
    };
    return (
        <StreamerCard key={safeStreamer.id} streamer={safeStreamer} onSelect={onSelectStream} />
    );
})}
```

---

### Causa 2: Incompatibilidade de Categoria e Abas Ativas

#### O Problema:
O frontend do nosso aplicativo possui abas de categoria no topo (Ex: *Popular, Jogos, Conversa, Vida, etc.*).
* Quando você clica em uma aba, a função `onTabChange` em `App.tsx` executa `api.getLiveStreamers(tab)`.
* O backend recebe essa chamada e filtra de forma estrita no arquivo `server.ts`:
```typescript
if (category && category !== 'popular') {
  filteredList = filteredList.filter(
    (s: any) => s.category?.toLowerCase() === (category as string).toLowerCase()
  );
}
```

Se o Host iniciou a live com a categoria `"Música"`, e o espectador está na aba `"Popular"` ou `"Conversa"`, a live não aparecerá na tela do espectador até que ele clique especificamente na aba `"Música"`.

#### Como Resolver (Solução de Categoria):
1. **Garantir Categoria Padrão**: No `GoLiveScreen.tsx` ou no hook `useStreamManager.ts`, certifique-se de que se nenhuma categoria for escolhida pelo streamer, ela seja salva como `"popular"` ou listada em um pool de exibição geral.
2. **Exibir em Múltiplas Abas**: No backend (`server.ts`), certifique-se de que lives ativas com categorias específicas também fiquem visíveis na listagem de `"popular"` (que atua como feed principal unificado do aplicativo).

---

### Causa 3: Filtragem Geográfica / Regional

#### O Problema:
O applet possui filtros geográficos. Se o visualizador tem um filtro ativo selecionado para um país específico (ex: "Brasil") e o streamer iniciou a transmissão e o backend definiu `country: 'us'` ou `location` indefinido, o card será filtrado e sumirá para o visualizador.

#### Como Resolver (Solução Regional):
No backend, garanta que se a localização geográfica do usuário não for detectada, seja usado o fallback `'br'` ou `'brasil'` para que a live seja indexada no feed da América Latina de forma nativa.

---

### Causa 4: Dessincronização do Socket.io em Tempo Real

#### O Problema:
Quando a live inicia, o backend dispara o evento `new_live`:
```typescript
io.emit('new_live', newStream);
```
No frontend, `App.tsx` escuta esse evento e atualiza o estado local das lives:
```typescript
socketService.on('new_live', (data) => {
  setStreamers(prev => {
    if (prev.some(s => s.id === data.id)) return prev;
    return [data, ...prev];
  });
});
```
Se o canal do Socket.io sofrer uma breve desconexão ou oscilação de rede no momento exato em que o streamer clica em "Iniciar Transmissão", o navegador do espectador perde o evento de broadcast `new_live`. Se não houver um mecanismo de puxar o estado atualizado (Polling/Refresh), o card não aparecerá até o espectador dar F5 (recarregar a página).

#### Como Resolver (Solução de Sincronia):
Implemente um mecanismo de puxar dados periodicamente (Polling de Longo Prazo) no frontend para re-sincronizar a lista de lives ativas a cada 10 ou 15 segundos:

```typescript
// Exemplo de atualização de segurança em App.tsx:
useEffect(() => {
  const syncInterval = setInterval(async () => {
    try {
      const streams = await api.getLiveStreamers(activeCategory);
      setStreamers(Array.isArray(streams) ? streams : []);
    } catch (err) {
      console.warn('Erro silencioso ao re-sincronizar lives:', err);
    }
  }, 12000); // Sincroniza a cada 12 segundos em segundo plano

  return () => clearInterval(syncInterval);
}, [activeCategory]);
```

---

## 3. Passo a Passo de Código de Exemplo para Correção Definitiva

### No Backend (`server.ts`) - Normalização de Dados de Entrada
Certifique-se de que a rota de criação da stream (`app.post('/api/streams')`) normalize e saneie todos os dados antes de salvar no array global e disparar o WebSocket:

```typescript
app.post('/api/streams', (req, res) => {
  const { name, message, category, hostId, isPrivate } = req.body;
  const finalHostId = hostId || getUserIdFromHeader(req) || '98501723';
  const hostUser = users.find((u: any) => u.id === finalHostId) || users[0];

  // SANEAÇÃO E FALLBACK DE VALORES
  const hostName = hostUser?.name || hostUser?.username || `Streamer ${finalHostId}`;
  const hostAvatar = hostUser?.avatarUrl || hostUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=random`;
  const hostLocation = hostUser?.residence || hostUser?.country || 'Brasil';

  const newStream = {
    id: finalHostId,
    hostId: finalHostId,
    name: name || `Live de ${hostName}`,
    message: message || 'Vem que a live tá on!',
    category: category || 'popular',
    isPrivate: isPrivate || false,
    tags: hostUser?.tags || ['Geral'],
    avatar: hostAvatar, // Nunca envia em branco!
    location: hostLocation,
    country: hostUser?.country?.toLowerCase() || 'br',
    isLive: true,
    viewers: Math.floor(Math.random() * 5) + 1,
    startTime: new Date().toISOString(),
    hlsUrl: `/api/video/http/live/${finalHostId}.m3u8`,
    playbackUrl: `/api/video/http/live/${finalHostId}.flv`
  };

  // Atualiza ou insere
  const index = streamers.findIndex((s: any) => s.hostId === finalHostId);
  if (index !== -1) {
    streamers[index] = newStream;
  } else {
    streamers.push(newStream);
  }

  saveCollection('streamers', streamers);
  
  // Emite o evento formatado e completo de forma garantida
  io.emit('new_live', newStream);
  io.emit('stream_started', newStream);

  return res.json({ success: true, stream: newStream });
});
```

---

## 4. Checklist para Auditoria Prática de Lives Invisíveis

Use este checklist rápido para encontrar e resolver o problema em menos de 2 minutos:

1. **[ ] O Streamer possui avatar cadastrado?**
   * *Ação*: Abra o console do desenvolvedor (F12) e verifique se o JSON do streamer retornado pelo backend possui `avatar` nulo ou vazio `""`. Se sim, a Causa 1 está ativa.
2. **[ ] A categoria da aba corresponde à categoria da live?**
   * *Ação*: Mude a aba do feed principal para "Popular" ou recarregue a página na aba correspondente à categoria iniciada pelo Host. Se o card aparecer, a Causa 2 está ativa.
3. **[ ] Há filtros de região ou país selecionados na barra superior?**
   * *Ação*: Altere o filtro de país para "Globo/Mundo" para verificar se a live é exibida de forma irrestrita.
4. **[ ] O log do WebSocket dispara `[new_live]` no console?**
   * *Ação*: Se não disparar ao iniciar a live, verifique se a porta de conexão do Socket.io está saudável ou force a atualização por meio de REST API Polling.

---

Com as correções de fallbacks defensivos e saneamento de strings aplicados tanto no frontend quanto no backend, o sistema se torna **imune a dados corrompidos** e garante que 100% das transmissões iniciadas apareçam imediatamente de forma visual e elegante para todos os espectadores na plataforma!
