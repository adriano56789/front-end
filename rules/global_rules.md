
---

## 📋 Etapa 3: Fluxo de Streaming (ORDEM OBRIGATÓRIA)

### 3.1 Sequência Exata do Processo
O processo de transmissão ao vivo DEVE seguir exatamente esta sequência:

1. **API de Início da Live (Backend)**
   - Acionada quando o usuário clica em "Iniciar Live"
   - Responsável por gerar as credenciais da transmissão (ex: push URL)

2. **Publicação (SRS)**
   - Executada APÓS receber os dados da API de Start Live
   - Responsável por iniciar a transmissão WebRTC para o SRS

### 3.2 Regras Críticas de Fluxo
- **Proibido**: NUNCA chamar a publicação no SRS antes da API de Start Live
- **Proibido**: NUNCA pular etapas do fluxo

---

## 📋 Etapa 4: Integridade do Código

### 4.1 Regra de Preservação
- **Arquitetura**: Preserve a arquitetura e lógica existentes
- **Alterações**: Evite alterações desnecessárias
- **Intencionalidade**: Toda modificação deve ser intencional e mínima

### 4.2 Consequências de Quebra de Regras
⚠️ Quebrar essas regras pode resultar em:
- Falha na transmissão
- Inconsistência na API
- Erros difíceis de depurar  segue rules\srs_sdk_rules.md

---

## 🔄 Etapa 5: Fluxo de Transmissão ao Vivo (SRS / WebRTC)

### 5.1 Visão Geral do Fluxo (OBRIGATÓRIO)
O processo de transmissão ao vivo DEVE seguir exatamente esta sequência:

1. Usuário clica em "Iniciar Live"
2. Cliente abre câmera/microfone (Preview)
3. Cliente chama a API de Start Live (Backend)
4. Backend valida o usuário e gera credenciais
5. Backend retorna pushUrl + dados da live
6. Cliente inicia publicação via WebRTC
7. A live entra no ar quando o servidor recebe os primeiros dados

### 5.2 Etapa de Preview (Pré-live) – OBRIGATÓRIO
Antes de chamar qualquer API, o cliente DEVE:
- Solicitar permissão de câmera e microfone
- Exibir o preview (pré-visualização) local

**IMPORTANTE**: Nesse momento NÃO existe transmissão ainda, é apenas visualização local

### 5.3 API de Início da Live (PRIMEIRA API – OBRIGATÓRIO)
**Exemplo**: `POST /startLive`

**Responsabilidades**:
- Validar o usuário (banimento, permissões, etc.)
- Criar sessão da live (liveId)
- Gerar streamId
- Gerar pushUrl segura

**Deve retornar**:
- liveId
- streamId
- pushUrl
- Token/segurança (se aplicável)

**REGRA**: NUNCA iniciar transmissão sem chamar essa API primeiro

---

## 📋 Etapa 6: pushUrl (CRÍTICO)

### 6.1 Formato e Estrutura
**Exemplo**: `webrtc://livego/app/stream?token=xxx`

- **Função**: É o endereço para onde o vídeo será enviado
- **Segurança**: Contém autenticação (token, tempo, etc.)
- **Regra**: NÃO pode ser alterado manualmente

---

## 📋 Etapa 7: Etapa de Publicação (WebRTC / SRS)

### 7.1 Responsabilidades do Cliente
Após receber o pushUrl, o cliente DEVE:
- Capturar vídeo e áudio
- Iniciar conexão WebRTC
- Enviar o stream para o servidor

### 7.2 Regras de Publicação
- **Proibido**: NUNCA publicar antes da API Start
- **Proibido**: NUNCA pular etapas

---

## 📋 Etapa 8: Protocolo e Autenticação

### 8.1 Regra de Protocolo
Se o pushUrl for:
- `webrtc://` → usar WebRTC
- `rtmp://` → usar RTMP

**REGRA**: O protocolo DEVE ser seguido exatamente, NÃO misturar implementações

### 8.2 Regra de Autenticação
pushUrl contém:
- token
- expiração

**REGRAS**:
- NUNCA hardcodar token
- SEMPRE usar o retorno da API
- NÃO reutilizar token expirado

---

## 📋 Etapa 9: Conexão WebRTC

### 9.1 Processo Obrigatório
O cliente DEVE executar:
- ICE
- DTLS
- Envio de mídia

**REGRA**: Seguir documentação oficial do SRS/WebRTC, NÃO inventar fluxo

---

## 📋 Etapa 10: Status da Live

### 10.1 Quando a Live Está Ativa
A live só está ativa quando:
- O servidor recebe os primeiros pacotes de áudio/vídeo

**IMPORTANTE**: API respondeu OK ≠ live no ar, só está no ar quando está transmitindo

---

## 📋 Etapa 11: Responsabilidades Divididas

### 11.1 Backend
- Criar liveId
- Gerar streamId
- Gerar pushUrl
- Salvar dados da live
- Validar usuário

### 11.2 Cliente
- Fazer preview
- Chamar API
- Receber pushUrl
- Iniciar transmissão
- Tratar erros

---

## 🚫 Etapa 12: Erros Críticos (PROIBIDO)

### 12.1 Lista Proibida
❌ Publicar antes da API  
❌ Ignorar preview  
❌ Alterar pushUrl manualmente  
❌ Não seguir SRS/WebRTC  
❌ Implementar sem entender  

---

## 📋 Etapa 13: Regra Principal

### 13.1 Regra de Ouro
**SE NÃO ENTENDER → PERGUNTE**

---

## 📋 Etapa 14: Exemplo Real (Baseado no Buzzcast)

### 14.1 Resposta da API
```
pushUrl: webrtc://xxx.livepush.myqcloud.com/stream?txSecret=xxx&txTime=xxx
liveId: 3805999
streamId: 23331_8b9k010
```

### 14.2 Fluxo Completo
1. Clica em "Iniciar Live"
2. Abre preview
3. Chama API
4. Recebe pushUrl
5. Inicia WebRTC
6. Live entra no ar

---

## 📋 Etapa 15: Estrutura de Resposta API

### 15.1 Formato Padrão
```json
{
  "code": 1,
  "result": {
    "pushUrl": "webrtc://seu-dominio.com/live/stream_key_unica",
    "streamId": "stream_key_unica",
    "iceServers": [
      { "urls": "stun:seu-servidor-stun.com:3478" },
      { "urls": "turn:seu-servidor-turn.com:3478", "username": "user", "credential": "password" }
    ]
  }
}
```

---

## 📋 Etapa 16: Arquitetura de Três Camadas

### 16.1 Backend (Sinalização)
- API startLive
- Geração de credenciais dinâmicas
- Validação de usuário

### 16.2 Frontend (Navegador)
- Captura de mídia
- Handshake WebRTC (SDP)
- Conexão com SRS

### 16.3 Servidor SRS (Media)
- Recebimento de stream
- Transformação para RTMP/HLS
- Distribuição para viewers

---

## 📋 Etapa 17: Configuração SRS Obrigatória

### 17.1 rtc_server
```
rtc_server {
    enabled on;
    listen 8000; # Porta UDP para o tráfego de vídeo
    # IMPORTANTE: Se o SRS estiver atrás de NAT (Cloud), coloque o IP Público aqui
    candidate $hostname; 
}
```

### 17.2 vhost Configuration
```
vhost __defaultVhost__ {
    rtc {
        enabled     on;
        rtmp_to_rtc off;
        rtc_to_rtmp on;
    }
}
```

---

## 📋 Etapa 18: Fluxo WebRTC Detalhado

### 18.1 Handshake SDP (OBRIGATÓRIO)
👉 WebRTC NÃO conecta só com URL, tem que ter:
- offer
- answer
- ICE

**Se você não implementou isso → não vai funcionar**

### 18.2 Processo Completo
1. Captura de Mídia: `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
2. Criação do PeerConnection: Use configurações de STUN/TURN da API
3. SDP Offer: Navegador cria oferta
4. Troca com SRS: POST para `http://seu-srs:1985/rtc/v1/publish/`
5. SDP Answer: SRS responde, configura no `setRemoteDescription`

---

## 📋 Etapa 19: STUN/TURN Vital

### 19.1 Importância Crítica
- Diferente do Buzzcast que usa infraestrutura global da Tencent
- Seu servidor SRS provavelmente está em datacenter fixo
- Usuário em Wi-Fi corporativo ou 4G vai falhar sem TURN

### 19.2 Recomendação
- Use Coturn para servidor TURN
- Configure no handshake WebRTC

---

## 📋 Etapa 20: SDK Oficial SRS

### 20.1 Recomendação
- Use SDK oficial do SRS (srs.sdk.js)
- Automatiza troca de SDP
- Facilita implementação

---

## 🚫 Etapa 21: Proibição de Criação Sem Autorização

### 21.1 Estritamente Proibido
É **estritamente proibido**:
- Criar novas APIs
- Criar novos componentes
- Criar novos serviços, controllers ou models

🔴 **Sem exceções**: Antes de qualquer criação, você **DEVE perguntar e obter aprovação explícita do usuário**

---

## 📢 Etapa 22: Consulta Obrigatória ao Usuário

### 22.1 Antes de Qualquer Decisão
Antes de qualquer decisão estrutural ou implementação:
- Você **DEVE consultar o usuário**
- Você **DEVE explicar o que pretende fazer**
- Você **DEVE aguardar confirmação**

❌ Nunca tomar decisões sozinho
❌ Nunca assumir arquitetura

---

## 🔍 Etapa 23: Auditoria Completa Antes de Implementar

### 23.1 Backend
Revisar **100% do backend existente**:
- Identificar o que já existe
- Identificar o que já está implementado
- Identificar o que já resolve o problema

### 23.2 Banco de Dados
Comparar:
- Estrutura do app
- Estrutura das coleções do banco

Validar:
- O que já existe
- O que precisa ser criado

---

## 🧱 Etapa 24: Criação Controlada (1 por vez)

### 24.1 Regra de Uma Criação
É proibido criar múltiplas coisas de uma vez

✔ Criar **apenas 1 item por vez**:
- 1 collection
- 1 endpoint
- 1 ajuste

### 24.2 Após Cada Criação
- Parar
- Solicitar validação do usuário

---

## 🆔 Etapa 25: Regra Crítica de IDs

### 25.1 Proibição
**NUNCA usar `_id` do MongoDB diretamente**

### 25.2 Obrigatório
✔ Sempre usar:
- ID vindo da API
- ID definido pela regra de negócio

❌ Proibido:
- Usar `_id` como ID principal
- Misturar IDs

---

## 📚 Etapa 26: Implementação Baseada em Documentação Oficial

### 26.1 Obrigatório
Toda implementação **DEVE ser baseada em documentação oficial**:
- Consultar documentação real
- Seguir padrões oficiais

### 26.2 Proibido
❌ Proibido:
- Código inventado
- Código baseado em suposição
- Código "exemplo" ou mock

---

## 🚫 Etapa 27: Proibição de Código Fake ou Simulado

### 27.1 Nunca Implementar
Nunca implementar:
- Dados fake
- Respostas simuladas
- Mock sem autorização

### 27.2 Tudo Deve Ser
✔ Tudo deve ser:
- Real
- Funcional
- Integrado ao sistema

---

## 🛑 Etapa 28: Regra de Segurança Máxima

### 28.1 Se Houver Qualquer Dúvida
✔ Você DEVE:
- Parar imediatamente
- Perguntar ao usuário

### 28.2 Nunca
❌ Nunca:
- "Tentar resolver sozinho"
- "Adivinhar"
- "Improvisar"

---

## ✅ Etapa 29: Fluxo Obrigatório de Trabalho

### 29.1 Sequência Exata
1. Analisar backend
2. Analisar banco
3. Identificar lacunas
4. Consultar usuário
5. Obter aprovação
6. Implementar **UMA única coisa**
7. Parar e validar

---

## 🔒 Etapa 30: Prioridade Absoluta

### 30.1 Sobre as Regras
Essas regras têm prioridade sobre:
- Performance
- Velocidade
- Conveniência

### 30.2 Foco Principal
✔ O foco é:
**Controle, precisão e segurança**

---

## 📝 Etapa 31: Verificação de Instalação

### 31.1 Verificação Obrigató
Antes de implementar, verifique se não está instalado:
- SRS
- STUN/TURN
- Dependências necessárias

### 31.2 Checklist
- [ ] SRS instalado e configurado
- [ ] STUN/TURN configurado
- [ ] Portas abertas
- [ ] Firewall configurado

---

## 🎯 Etapa 32: Resumo Final

### 32.1 Princípios Fundamentais
1. **Controle de Escopo**: Modificar apenas o solicitado
2. **Documentação Oficial**: Seguir SRS/WebRTC padrões
3. **Fluxo Obrigatório**: Preview → API → WebRTC
4. **Segurança**: Nunca implementar sem entender
5. **Validação**: Perguntar antes de criar

### 32.2 Consequências
Quebrar regras = Falha na transmissão + Erros difíceis de depurar

---

**🔴 ESTE DOCUMENTO É OBRIGATÓRIO E TEM PRIORIDADE MÁXIMA SOBRE TODAS AS DECISÕES**
