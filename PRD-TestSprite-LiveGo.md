# PRD / Descrição do Produto - LiveGo

## 1) Visao geral do produto

O **LiveGo** e uma plataforma de transmissao ao vivo com foco em:
- criacao e publicacao de lives por criadores;
- visualizacao em tempo real por espectadores;
- chat e eventos em tempo real durante a live;
- suporte a publicacao por navegador (WHIP/WebRTC) e Android (RTMP).

O objetivo principal e permitir transmissao de baixa latencia, com estabilidade de conexao e monitoramento de sessao de live.

## 2) Objetivos de negocio

- Permitir que criadores iniciem lives com confiabilidade.
- Garantir playback consistente para espectadores (HLS/FLV).
- Oferecer interacao em tempo real via WebSocket (chat/eventos).
- Reduzir quedas de transmissao com reconexao automatica no publish browser.

## 3) Perfis de usuario

- **Criador (publisher)**: inicia live, transmite audio/video e acompanha estado da transmissao.
- **Espectador (viewer)**: entra em live ativa e assiste o conteudo.
- **Sistema/Backend**: valida inicio de live, recebe callbacks do SRS e distribui eventos.

## 4) Escopo funcional (MVP atual)

### 4.1 Publicacao de live (browser)
- Captura de camera/microfone via `getUserMedia`.
- Fluxo obrigatorio: **Preview -> API StartLive -> WHIP Publish**.
- Publicacao via `RTCPeerConnection` para endpoint WHIP (`/rtc/v1/whip/`).
- Monitoramento de ICE e reconexao automatica (tentativas progressivas).
- Coleta de metricas de conexao (bitrate, packet loss, frames dropped).

### 4.2 Publicacao de live (Android)
- Publicacao via RTMP (HaishinKit) para SRS.

### 4.3 Playback de live (viewer)
- Reproducao por HLS (`.m3u8`) e FLV (`.flv`) via rotas de proxy da API.
- Video servido pelo SRS; backend nao carrega stream de video.

### 4.4 Chat e eventos em tempo real
- WebSocket dedicado para chat e notificacoes de atividade.
- Serializacao binaria com protobuf para eventos de live.

### 4.5 Integracao com SRS
- Callback endpoints em `/api/srs/*` para eventos de publish/play.
- Proxy de `/rtc/` para API HTTP do SRS, evitando problemas de mixed content.

## 5) Fluxos principais de usuario

### Fluxo A - Criador inicia live no navegador
1. Usuario autenticado abre tela de transmissao.
2. Permite camera/microfone e visualiza preview.
3. Clica em iniciar live (StartLive API).
4. Cliente cria oferta SDP e envia para endpoint WHIP.
5. Recebe SDP answer e estabelece conexao WebRTC.
6. ICE conecta e transmissao entra em estado ativo.
7. Em falhas de ICE, sistema tenta reconectar automaticamente.

### Fluxo B - Espectador assiste live
1. Usuario abre pagina da live ativa.
2. Player solicita playlist HLS (ou fallback FLV).
3. Conteudo e reproduzido continuamente.
4. Usuario envia/recebe mensagens de chat em tempo real.

### Fluxo C - Encerramento
1. Criador encerra live pela interface.
2. Backend registra encerramento e atualiza estado.
3. Playback para espectadores e finalizado com feedback de encerramento.

## 6) Requisitos funcionais

- RF-01: Sistema deve permitir iniciar live apenas apos sucesso no StartLive.
- RF-02: Sistema deve publicar stream browser via WHIP.
- RF-03: Sistema deve publicar stream Android via RTMP.
- RF-04: Sistema deve disponibilizar playback HLS e FLV para viewers.
- RF-05: Sistema deve manter chat em tempo real via WebSocket.
- RF-06: Sistema deve receber callbacks do SRS em rotas `/api/srs/*`.
- RF-07: Sistema deve realizar reconexao automatica no publish browser em falhas de ICE.
- RF-08: Sistema deve expor metricas tecnicas basicas de qualidade da transmissao.

## 7) Requisitos nao funcionais

- RNF-01: Baixa latencia para publicacao e visualizacao (dentro das limitacoes de protocolo).
- RNF-02: Alta disponibilidade dos endpoints de API, SRS e WebSocket.
- RNF-03: Seguranca de autenticacao com token em memoria no frontend.
- RNF-04: Escalabilidade para multiplas lives simultaneas (dependente da infra SRS/backend).

## 8) Regras e restricoes relevantes

- Nao usar `_id` de MongoDB como ID publico; usar campo `id`.
- Nao publicar stream antes da API de StartLive.
- ICE servers no cliente podem estar vazios (resolucao de candidatos via SRS).
- Rotas de callback SRS devem permanecer permitidas no middleware de seguranca.
- Nao criar mocks para validacao final; testes devem usar dados e fluxos reais.

## 9) Dependencias tecnicas criticas

- Frontend React + Vite + TypeScript.
- Backend Node/Express + MongoDB.
- SRS (API HTTP, WebRTC/WHIP, RTMP, HLS/FLV).
- WebSocket para chat/eventos.

## 10) Criterios de aceite por fluxo

### CA-A (Publicacao browser)
- Dado preview valido e StartLive aprovado,
- quando usuario inicia transmissao,
- entao stream deve ficar ativa no SRS e visivel para viewers em ate 10 segundos.

### CA-B (Reconexao)
- Dada uma desconexao de rede temporaria,
- quando ICE falhar/desconectar,
- entao sistema deve tentar reconectar automaticamente sem travar a UI.

### CA-C (Playback viewer)
- Dada uma live ativa,
- quando viewer abrir a pagina,
- entao player deve iniciar por HLS ou fallback FLV sem erro fatal.

### CA-D (Chat real-time)
- Dado viewer conectado a live,
- quando enviar mensagem,
- entao participantes devem receber evento em tempo real.

## 11) Casos de teste recomendados para o TestSprite

Use os cenarios abaixo para gerar testes end-to-end e de API:

1. **Login e acesso a tela de transmissao**
   - Validar autenticacao e permissoes.
2. **Preview de camera/mic**
   - Permissao concedida/negada e tratamento de erro.
3. **StartLive + WHIP publish (browser)**
   - Sucesso completo de SDP offer/answer.
4. **Falha de rede durante publish**
   - Validar reconexao (1s/2s/4s) e recuperacao.
5. **Playback HLS**
   - Verificar carregamento de `.m3u8` e reproducao.
6. **Fallback FLV**
   - Forcar falha HLS e validar fallback funcional.
7. **Chat WebSocket**
   - Envio/recebimento, reconexao de socket e ordenacao de mensagens.
8. **Encerramento de live**
   - Encerrar no publisher e validar impacto no viewer.
9. **Callbacks SRS**
   - Confirmar que `/api/srs/*` recebe eventos esperados.
10. **Seguranca basica**
   - Validar bloqueio de payloads/URLs indevidas e autenticao nas rotas protegidas.

## 12) Evidencias para confirmar "funcionando de verdade"

Para considerar o app funcional em ambiente real:
- Taxa de sucesso >= 95% nos fluxos A e B em 20 execucoes.
- Sem erro bloqueante (P0/P1) em StartLive, Publish ou Playback.
- Reconexao funcional em pelo menos 1 cenario de queda de rede.
- Chat operacional durante toda a duracao da live de teste.

## 13) Dados para configurar o teste automatizado

- **Base URL frontend (staging/producao):** preencher no TestSprite
- **Base URL API backend:** preencher no TestSprite
- **Usuario criador de teste:** fornecer credenciais validas
- **Usuario viewer de teste:** fornecer credenciais validas
- **Stream ID/canal de teste:** definir identificador fixo para repetibilidade

## 14) Fora de escopo (neste PRD)

- Novas features de produto.
- Mudancas arquiteturais grandes (ex.: troca de media server).
- Testes de carga extrema (podem virar fase 2).

---

## Texto curto para colar no campo "Descricao do Produto" (opcional)

O LiveGo e uma plataforma de live streaming com publicacao por navegador via WHIP/WebRTC e por Android via RTMP, playback por HLS/FLV e chat em tempo real por WebSocket. O fluxo critico e: preview de camera/microfone, StartLive via API e inicio da publicacao. Queremos validar ponta a ponta os cenarios de iniciar live, assistir live, reconectar apos falha de rede e interagir no chat sem erros bloqueantes.
