# Guia de Integração Técnica: SFU LiveKit & SRS no Sistema de Transmissão

Este documento serve como um guia arquitetural e técnico de engenharia de software para a implementação, ajuste e homologação da transmissão de vídeo e áudio utilizando o conceito de **SFU (Selective Forwarding Unit)** via **SRS (Simple Realtime Server) com WHIP/WHEP** ou através de uma transição para o ecossistema **LiveKit**.

---

## 1. Visão Geral da Arquitetura e Fluxo de Transmissão

Para que a live funcione em tempo real com baixa latência (< 500ms), a arquitetura utiliza o protocolo **WebRTC** gerenciado por um servidor **SFU**.

### Diagrama de Fluxo de Mídia (FFmpeg, SRS, SFU)
```
  [ Câmera / Mic ] ──(WebRTC/WHIP)──► [ SRS SFU Gateway (Porta 1985/8000) ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼ (Transmídia Local)                        ▼ (Distribuição)
               [ RTMP / FFmpeg Ingest ]                    [ WHEP / WebRTC Playback ]
                       │                                           │
                       ▼                                           ▼
             [ HLS/FLV Gravado ]                            [ Espectadores ]
```

1. **Quem Publica (Publish)**: O navegador do *Host* captura a mídia local (câmera e microfone), estabelece uma conexão WebRTC utilizando o protocolo padronizado **WHIP (WebRTC HTTP Ingestion Protocol)** e envia as tracks de vídeo/áudio codificadas em H.264/Opus diretamente para o **SRS SFU**.
2. **Quem Recebe e Distribui**: O **SRS SFU** recebe esse fluxo de entrada. Ele atua como um repetidor seletivo de pacotes de mídia (SFU) retransmitindo a mesma mídia de forma nativa para centenas de espectadores sem necessidade de re-encodar no servidor, garantindo consumo de CPU levíssimo no container.
3. **Quem Assiste (Play)**: Os navegadores dos espectadores se conectam ao SRS através do protocolo **WHEP (WebRTC HTTP Egress Protocol)** e recebem a transmissão via WebRTC de forma quase instantânea.
4. **Papel do FFmpeg (Ingestão Sintética / Fallback)**: Quando o Host inicia a transmissão, o backend inicia um processo FFmpeg sintético que publica um feed de backup/teste no formato RTMP para o SRS na porta `1935`. Isso garante que a live sempre tenha um stream ativo na rede CDN do provedor mesmo se a conexão WebRTC local sofrer oscilações de banda.

---

## 2. Fluxo Completo do Botão "Iniciar Transmissão"

```
[ Usuário clica ] ──► [ Captura Câmera/Mic ] ──► [ API /api/streams (POST) ]
                                                            │
  ┌─────────────────────────────────────────────────────────┴────────────────────────┐
  ▼ (Frontend)                                                                       ▼ (Backend)
[ WHIP Conexão Local ]                                                       [ FFmpeg Ingest Inicia ]
[ Seta isLive = true ]                                                       [ Seta stream status = 'live' ]
[ Obtém WHEP url ]                                                           [ Registra LiveUser na collection ]
```

### Passo 1: Captura e Permissões de Mídia (Navegador)
Ao clicar em "Iniciar Transmissão", o frontend invoca a API do navegador para solicitar acesso à câmera e microfone do usuário com restrições otimizadas de resolução para transmissão mobile estável:
```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true
  }
});
```

### Passo 2: Criação da Sala e Registro no Banco de Dados
O frontend envia uma requisição POST ao backend express (`/api/streams`) para registrar que uma nova transmissão está ativa:
```typescript
const streamData = await api.createStream({
  title: "Minha Live Show",
  category: "Música",
  hostId: currentUser.id
});
```
O backend salva a live no banco e gera a chave de transmissão (`streamKey`) e as URLs de reprodução (`playbackUrl` / WHEP).

### Passo 3: Conexão WebRTC WHIP (Início da Publicação)
O frontend cria uma instância de `RTCPeerConnection` local, adiciona as tracks do `mediaStream` capturado anteriormente e envia uma oferta SDP para a rota proxy WHIP do servidor:
```typescript
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Envia a oferta SDP via WHIP POST
const response = await fetch(`/api/rtc/v1/whip/?app=live&stream=${streamKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/sdp' },
  body: pc.localDescription.sdp
});
const answerSdp = await response.text();
await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
```

---

## 3. Estrutura e Responsabilidade dos Componentes do Frontend

A lógica de transmissão está modularizada e desacoplada em arquivos específicos para evitar gargalos de performance e manter o código manutenível:

| Componente / Arquivo | Caminho do Arquivo | Responsabilidade Principal |
| :--- | :--- | :--- |
| **GoLiveScreen** | `front-end/components/GoLiveScreen.tsx` | UI de configuração inicial da live (Título, Capa, Filtros). Dispara o fluxo chamando o `streamManager`. |
| **StreamRoom** | `front-end/components/StreamRoom.tsx` | Tela principal do streamer e espectadores. Exibe o player de vídeo, chat, presentes, likes e controle de moderação. |
| **useStreamManager** | `front-end/hooks/useStreamManager.ts` | Hook de estado que gerencia o ciclo de vida da live (início, suspensão, reconexão e finalização). |
| **streamPublishService**| `front-end/services/streamPublishService.ts` | Serviço de baixo nível de WebRTC responsável por se conectar com a câmera, aplicar filtros de beleza no Canvas WebGL e enviar as tracks via WHIP. |
| **whipPublishService** | `front-end/services/whipPublishService.ts` | Gateway dedicado à negociação SDP utilizando o protocolo padrão WHIP com o gateway SRS. |
| **whepPlaybackService** | `front-end/services/whepPlaybackService.ts` | Gateway dedicado à recepção de mídias via WebRTC WHEP para espectadores reproduzirem com zero latência. |
| **SrsPlayerEngine** | `front-end/services/SrsPlayerEngine.ts` | Orquestrador inteligente de player. Tenta reproduzir via WHEP (WebRTC) e, caso falhe, faz fallback silencioso para HLS (`.m3u8`). |

---

## 4. O Fluxo de Autenticação e Autorização

### Como funciona a segurança dos tokens WebRTC?
Para evitar que usuários mal-intencionados sequestrem ou transmitam em salas alheias, o sistema implementa um fluxo de autenticação baseado em assinaturas criptográficas **JWT (JSON Web Token)**.

1. **Geração do Token de Transmissão**: Ao fazer login, o usuário recebe um JWT contendo seu `userId`.
2. **Autorização na API**: Todas as chamadas para `/api/streams` exigem o header `Authorization: Bearer <token>`.
3. **Validação do Proxy WHIP/WHEP**: No backend (`server.ts`), quando uma requisição chega para `/api/rtc/v1/whip` ou `/api/rtc/v1/whep`, o servidor extrai o token JWT, valida se o participante realmente é o host ou se tem permissão de entrar na sala, e somente após validar a identidade ele faz o proxy do SDP para o servidor SRS SFU.

---

## 5. Eventos e Logs do Sistema (Logs Esperados)

### Eventos do Socket.io de Tempo Real
Tanto o frontend quanto o backend se comunicam via Socket.io para manter o estado sincronizado em tempo real:
* `stream_started`: Notifica a todos os usuários da plataforma que uma nova live iniciou. Adiciona o card da live imediatamente no carrossel da tela principal.
* `new_live`: Sincroniza a criação física do stream.
* `user_joined_stream`: Notifica que um novo espectador entrou, atualizando a lista de visualizadores no cabeçalho.
* `stream_ended` / `card_removed`: Remove o card do carrossel quando o streamer desliga a câmera.

### Logs de Auditoria Esperados (Console)
#### 1. Ao Publicar (Streamer Host)
```bash
[STREAM_MANAGER] Iniciando processo de publicação...
[CAMERA_SERVICE] Câmera e microfone capturados com sucesso. Resolução: 1280x720.
[BEAUTY_PROCESSOR] WebGL Beauty Filter ativo e renderizando no Canvas.
[WHIP_PUBLISH] Enviando oferta SDP WebRTC para o SRS...
[WHIP_PUBLISH] Resposta SDP Answer recebida com sucesso. Estado da conexão ICE: connected.
[BACKEND] FFmpeg sintético de backup iniciado para o canal: stream_98501723. (PID: 34091)
```

#### 2. Ao Assistir (Espectador)
```bash
[SRS_PLAYER] Tentando reproduzir canal via WebRTC/WHEP...
[WHEP_CLIENT] Conectando ao endpoint /api/rtc/v1/whep/?app=live&stream=stream_98501723
[WHEP_CLIENT] SDP Offer negociada com sucesso. Track de vídeo H.264 adicionada ao elemento <video>.
[SRS_PLAYER] WebRTC conectado! Latência medida: 120ms. Player carregado.
```

---

## 6. O que ainda falta implementar para atingir 100% de Funcionalidade?

Atualmente, o projeto possui o encadeamento de arquivos prontos para suportar WebRTC, mas há pequenos ajustes de protocolo a serem refinados para garantir estabilidade e resiliência em produção. Abaixo estão os passos para refinar e tornar o sistema de SFU indestrutível:

### Ajuste 1: Autoclose do processo FFmpeg no Backend
Quando uma transmissão cai de forma abrupta por perda de conexão de internet do celular do streamer, o FFmpeg de fallback no backend pode continuar rodando indefinidamente se não houver um timeout ativo. 
**Solução a ser implementada**: Adicionar um timer de monitoramento de ping via Socket.io que encerra o processo do FFmpeg se o streamer ficar inativo (sem enviar ping) por mais de 30 segundos.

```typescript
// Exemplo de monitoramento no server.ts:
let inactiveTimer = setTimeout(() => {
  stopFfmpegStream(streamId);
  console.log(`[FFMPEG] Streamer inativo. Forçando encerramento do FFmpeg.`);
}, 30000);
```

### Ajuste 2: Otimização de ICE Candidates no Iframe do Navegador
Como o applet roda dentro do iframe do AI Studio Preview, o navegador bloqueia por padrão certas portas UDP altas usadas pelo WebRTC por segurança se as permissões de Sandbox não forem explícitas.
**Solução**: O player de vídeo (`LivePlayer.tsx`) deve usar o fallback automático de protocolo para reproduzir via HLS (`/api/video/http/live/{id}.m3u8`) caso as portas do WebRTC WHEP estejam bloqueadas pela rede corporativa ou pelo sandbox do iframe. (O motor `SrsPlayerEngine.ts` já suporta isso de forma automática).

### Ajuste 3: Codec Negociação de Áudio (Opus vs AAC)
O WebRTC utiliza nativamente o codec de áudio **Opus**, enquanto players de vídeo HLS clássicos em navegadores móveis preferem **AAC**.
**Como resolver**: No backend, configurar o SRS com a diretiva de conversão de áudio (`transcode`) habilitada no arquivo de configuração `srs.conf`, para que ele faça o empacotamento simultâneo do codec de áudio de forma nativa e sem latência adicional.

---

Com este guia, os desenvolvedores de engenharia de software têm o mapa completo de como a mídia transita, como depurar problemas de conexão e como escalar o sistema para suportar transmissões de vídeo interativas e ultra-rápidas!
